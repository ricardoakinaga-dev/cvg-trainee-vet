import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { setTimeout } from "node:timers/promises";
import { eq, inArray, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  authenticateSessionCookie,
  hashSessionToken,
  rotateSession,
  type Role,
  type SessionRecord,
} from "../../packages/application/src/index.js";
import { createSessionRepository } from "../../packages/persistence/src/session-repository.js";
import { accounts, sessions } from "../../packages/persistence/src/schema.js";
import {
  closeLivePostgresHarness,
  openLivePostgresHarness,
  type LivePostgresHarness,
} from "./live-postgres-harness.js";

const live = process.env.CVG_RUN_LIVE_DB_TESTS === "true";
const hour = 60 * 60 * 1_000;

describe.skipIf(!live)(
  "PostgreSQL D-091 session expiry and concurrency",
  () => {
    let harness: LivePostgresHarness;
    const accountIds: string[] = [];
    const observations: Record<string, unknown>[] = [];

    beforeAll(async () => {
      harness = await openLivePostgresHarness();
      expect(harness.applicationRole.isSuperuser).toBe(false);
      expect(harness.applicationRole.bypassesRls).toBe(false);
      expect(harness.applicationRole.canCreateRoles).toBe(false);
      expect(harness.applicationRole.canCreateDatabases).toBe(false);
      expect(harness.adminRole.isSuperuser).toBe(false);
      expect(harness.adminRole.bypassesRls).toBe(true);
      await harness.application.healthcheck();
    });

    async function fixture(
      roles: readonly Role[],
      override: Partial<SessionRecord> = {},
    ) {
      const now = new Date();
      const accountId = randomUUID();
      accountIds.push(accountId);
      await harness.admin.db.insert(accounts).values({
        id: accountId,
        professionalEmail: `r7-session-${accountId}@example.test`,
        status: "ACTIVE",
      });
      const token = `r7-session-${randomUUID().replaceAll("-", "")}`;
      const record: SessionRecord = {
        sessionId: randomUUID(),
        accountId,
        accountStatus: "ACTIVE",
        roles,
        scopes: [randomUUID()],
        tokenHash: hashSessionToken(token),
        createdAt: now,
        lastSeenAt: now,
        expiresAt: new Date(now.getTime() + 12 * hour),
        revokedAt: null,
        ...override,
      };
      await createSessionRepository(harness.application.db).create(record);
      return { record, token, cookie: `__Host-cvg_session=${token}` };
    }

    async function stored(id: string) {
      const [row] = await harness.admin.db
        .select()
        .from(sessions)
        .where(eq(sessions.id, id));
      if (row === undefined) throw new Error("synthetic session missing");
      return row;
    }

    async function waitForBlocked(count: number) {
      const deadline = Date.now() + 5_000;
      while (Date.now() < deadline) {
        // The application role can observe its own connections without granting
        // pg_read_all_stats to either disposable role.
        const [row] = await harness.application.db.execute<{
          blocked: number;
        }>(sql`
        select count(*)::integer as blocked from pg_stat_activity
        where usename = ${harness.applicationRole.roleName} and datname = current_database()
          and wait_event_type = 'Lock' and state = 'active'`);
        if (row !== undefined && row.blocked >= count) return row.blocked;
        await setTimeout(20);
      }
      throw new Error("actual PostgreSQL row-lock overlap was not observed");
    }

    it.each([
      { roles: ["ADMIN"], idle: 30 * 60 * 1_000 },
      { roles: ["MODERATOR"], idle: 30 * 60 * 1_000 },
      { roles: ["PARTICIPANT"], idle: 8 * hour },
      { roles: ["PARTICIPANT", "MODERATOR", "AUTHOR"], idle: 30 * 60 * 1_000 },
    ] satisfies readonly { roles: Role[]; idle: number }[])(
      "accepts one millisecond before idle and denies equality/after without refresh: $roles",
      async ({ roles, idle }) => {
        const { record } = await fixture(roles);
        const repository = createSessionRepository(harness.application.db);
        const cutoff = record.createdAt.getTime() + idle;
        expect(
          await repository.findActive(record.tokenHash, new Date(cutoff - 1)),
        ).not.toBeNull();
        expect((await stored(record.sessionId)).lastSeenAt.getTime()).toBe(
          cutoff - 1,
        );
        // Restore the actual persisted original activity, not a mocked read result.
        await harness.admin.db
          .update(sessions)
          .set({ lastSeenAt: record.lastSeenAt })
          .where(eq(sessions.id, record.sessionId));
        expect(
          await repository.findActive(record.tokenHash, new Date(cutoff)),
        ).toBeNull();
        expect(
          await repository.findActive(record.tokenHash, new Date(cutoff + 1)),
        ).toBeNull();
        expect((await stored(record.sessionId)).lastSeenAt).toEqual(
          record.lastSeenAt,
        );
        observations.push({
          kind: "idle-boundary",
          roles,
          cutoff,
          deniedAtEquality: true,
          deniedAfter: true,
          unchangedAfterDeny: true,
        });
      },
    );

    it("honors absolute and stored expiry despite recent activity, including legacy issued sessions", async () => {
      const start = new Date();
      const deadline = new Date(start.getTime() + 12 * hour);
      const { record } = await fixture(["PARTICIPANT"], {
        createdAt: start,
        lastSeenAt: new Date(deadline.getTime() - 2),
        expiresAt: new Date(start.getTime() + 7 * 24 * hour),
      });
      const repository = createSessionRepository(harness.application.db);
      expect(
        await repository.findActive(
          record.tokenHash,
          new Date(deadline.getTime() - 1),
        ),
      ).not.toBeNull();
      const before = (await stored(record.sessionId)).lastSeenAt;
      expect(
        await repository.findActive(record.tokenHash, deadline),
      ).toBeNull();
      expect(
        await repository.findActive(
          record.tokenHash,
          new Date(deadline.getTime() + 1),
        ),
      ).toBeNull();
      expect((await stored(record.sessionId)).lastSeenAt).toEqual(before);
      const shorter = await fixture(["PARTICIPANT"], {
        createdAt: start,
        lastSeenAt: start,
        expiresAt: new Date(start.getTime() + 60_000),
      });
      expect(
        await repository.findActive(
          shorter.record.tokenHash,
          shorter.record.expiresAt,
        ),
      ).toBeNull();
      observations.push({
        kind: "absolute-and-stored-expiry",
        originalDeadline: deadline.toISOString(),
        legacyExpiry: record.expiresAt.toISOString(),
        deniedAtEquality: true,
        unchangedAfterDeny: true,
      });
    });

    it("denies capability-only, future, inconsistent, revoked and suspended sessions", async () => {
      const now = new Date();
      const cases: readonly {
        roles: readonly Role[];
        override?: Partial<SessionRecord>;
        suspend?: boolean;
      }[] = [
        { roles: ["AUTHOR"] },
        { roles: ["AUDITOR"] },
        { roles: ["CLINICAL_APPROVER"] },
        { roles: [] },
        {
          roles: ["PARTICIPANT"],
          override: {
            createdAt: new Date(now.getTime() + 1_000),
            lastSeenAt: new Date(now.getTime() + 1_000),
          },
        },
        {
          roles: ["PARTICIPANT"],
          override: {
            createdAt: now,
            lastSeenAt: new Date(now.getTime() + 1_000),
          },
        },
        {
          roles: ["PARTICIPANT"],
          override: { createdAt: now, lastSeenAt: new Date(now.getTime() - 1) },
        },
        { roles: ["PARTICIPANT"], override: { revokedAt: now } },
        { roles: ["PARTICIPANT"], suspend: true },
      ];
      for (const scenario of cases) {
        const { record } = await fixture(scenario.roles, scenario.override);
        if (scenario.suspend === true)
          await harness.admin.db
            .update(accounts)
            .set({ status: "SUSPENDED" })
            .where(eq(accounts.id, record.accountId));
        const before = (await stored(record.sessionId)).lastSeenAt;
        const checkAt =
          scenario.override === undefined ? record.createdAt : now;
        expect(
          await createSessionRepository(harness.application.db).findActive(
            record.tokenHash,
            checkAt,
          ),
        ).toBeNull();
        expect((await stored(record.sessionId)).lastSeenAt).toEqual(before);
      }
      observations.push({
        kind: "negative-clock-role-revocation",
        cases: cases.length,
        allDeniedWithoutRefresh: true,
      });
    });

    it("rotates without restarting the absolute clock, invalidates the old hash and hides internal proof", async () => {
      const start = new Date();
      const nearDeadline = new Date(start.getTime() + 12 * hour - 60_000);
      const { record, cookie } = await fixture(["PARTICIPANT"], {
        createdAt: start,
        lastSeenAt: nearDeadline,
      });
      const repository = createSessionRepository(harness.application.db);
      const rotated = await rotateSession(
        cookie,
        { expiresInSeconds: 3600 },
        repository,
        nearDeadline,
      );
      expect(rotated).not.toBeNull();
      if (rotated === null) throw new Error("rotation required");
      expect(rotated.expiresAt.getTime()).toBe(start.getTime() + 12 * hour);
      expect(rotated.cookie).toContain("Max-Age=60");
      const next = await stored(rotated.sessionId);
      expect(next.createdAt).toEqual(start);
      expect(next.tokenHash).toBe(hashSessionToken(rotated.token));
      expect(next.roles).toEqual(record.roles);
      expect(next.scopes).toEqual(record.scopes);
      expect((await stored(record.sessionId)).revokedAt).toEqual(nearDeadline);
      expect(
        await authenticateSessionCookie(cookie, repository, nearDeadline),
      ).toBeNull();
      const principal = await authenticateSessionCookie(
        rotated.cookie,
        repository,
        nearDeadline,
      );
      expect(principal).toEqual({
        sessionId: rotated.sessionId,
        accountId: record.accountId,
        accountStatus: "ACTIVE",
        roles: record.roles,
        scopes: record.scopes,
      });
      expect(principal).not.toHaveProperty("sessionLifetime");
      expect(principal).not.toHaveProperty("createdAt");
      expect(principal).not.toHaveProperty("tokenHash");
      expect(
        await authenticateSessionCookie(
          rotated.cookie,
          repository,
          rotated.expiresAt,
        ),
      ).toBeNull();
      expect(
        await rotateSession(
          rotated.cookie,
          { expiresInSeconds: 60 },
          repository,
          rotated.expiresAt,
        ),
      ).toBeNull();
      observations.push({
        kind: "rotation",
        originalCreatedAt: start.toISOString(),
        absoluteDeadline: rotated.expiresAt.toISOString(),
        oldHashDenied: true,
        publicClockProofAbsent: true,
      });
    });

    it("serializes overlapping refreshes and never moves activity backwards", async () => {
      const { record } = await fixture(["PARTICIPANT"]);
      const repository = createSessionRepository(harness.application.db);
      const newer = new Date(record.createdAt.getTime() + 20_000);
      const older = new Date(record.createdAt.getTime() + 10_000);
      let pending:
        | Promise<
            PromiseSettledResult<
              Awaited<ReturnType<typeof repository.findActive>>
            >[]
          >
        | undefined;
      let blocked = 0;
      await harness.admin.db.transaction(async (transaction) => {
        await transaction
          .select()
          .from(sessions)
          .where(eq(sessions.id, record.sessionId))
          .for("update");
        pending = Promise.allSettled([
          repository.findActive(record.tokenHash, newer),
          repository.findActive(record.tokenHash, older),
        ]);
        blocked = await waitForBlocked(2);
      });
      if (pending === undefined)
        throw new Error("concurrent requests were not launched");
      const outcomes = await pending;
      expect(outcomes.every((outcome) => outcome.status === "fulfilled")).toBe(
        true,
      );
      expect(outcomes[0]).toMatchObject({
        status: "fulfilled",
        value: { accountId: record.accountId },
      });
      expect((await stored(record.sessionId)).lastSeenAt).toEqual(newer);
      expect(await repository.findActive(record.tokenHash, older)).toBeNull();
      expect((await stored(record.sessionId)).lastSeenAt).toEqual(newer);
      observations.push({
        kind: "concurrent-refresh",
        blockedRequestsObserved: blocked,
        newestActivity: newer.toISOString(),
        backwardsRequestDenied: true,
      });
    });

    it("rechecks revocation after waiting for the row lock and does not revive or rotate", async () => {
      const { record } = await fixture(["PARTICIPANT"]);
      const repository = createSessionRepository(harness.application.db);
      const now = new Date(record.createdAt.getTime() + 1_000);
      const next: SessionRecord = {
        ...record,
        sessionId: randomUUID(),
        tokenHash: hashSessionToken(randomUUID()),
        lastSeenAt: now,
      };
      let pending: Promise<PromiseSettledResult<unknown>[]> | undefined;
      let blocked = 0;
      await harness.admin.db.transaction(async (transaction) => {
        await transaction
          .select()
          .from(sessions)
          .where(eq(sessions.id, record.sessionId))
          .for("update");
        pending = Promise.allSettled([
          repository.findActive(record.tokenHash, now),
          repository.rotate!(record.tokenHash, next, now),
        ]);
        blocked = await waitForBlocked(2);
        await transaction
          .update(sessions)
          .set({ revokedAt: now })
          .where(eq(sessions.id, record.sessionId));
      });
      if (pending === undefined)
        throw new Error("concurrent requests were not launched");
      const outcomes = await pending;
      expect(outcomes[0]).toEqual({ status: "fulfilled", value: null });
      expect(outcomes[1]).toMatchObject({
        status: "rejected",
        reason: { message: "session is no longer active" },
      });
      expect((await stored(record.sessionId)).lastSeenAt).toEqual(
        record.lastSeenAt,
      );
      expect(
        await harness.admin.db
          .select()
          .from(sessions)
          .where(eq(sessions.id, next.sessionId)),
      ).toEqual([]);
      observations.push({
        kind: "revocation-race",
        blockedRequestsObserved: blocked,
        authenticationDenied: true,
        rotationDenied: true,
        replacementRows: 0,
      });
    });

    it("does not refresh or rotate an idle-expired session after lock contention", async () => {
      const { record } = await fixture(["MODERATOR"]);
      const repository = createSessionRepository(harness.application.db);
      const cutoff = new Date(record.createdAt.getTime() + 30 * 60 * 1_000);
      const next: SessionRecord = {
        ...record,
        sessionId: randomUUID(),
        tokenHash: hashSessionToken(randomUUID()),
        lastSeenAt: cutoff,
      };
      let pending: Promise<PromiseSettledResult<unknown>[]> | undefined;
      let blocked = 0;
      await harness.admin.db.transaction(async (transaction) => {
        await transaction
          .select()
          .from(sessions)
          .where(eq(sessions.id, record.sessionId))
          .for("update");
        pending = Promise.allSettled([
          repository.findActive(record.tokenHash, cutoff),
          repository.rotate!(record.tokenHash, next, cutoff),
        ]);
        blocked = await waitForBlocked(2);
      });
      if (pending === undefined)
        throw new Error("concurrent requests were not launched");
      const outcomes = await pending;
      expect(outcomes[0]).toEqual({ status: "fulfilled", value: null });
      expect(outcomes[1]).toMatchObject({
        status: "rejected",
        reason: { message: "session is no longer active" },
      });
      const unchanged = await stored(record.sessionId);
      expect(unchanged.lastSeenAt).toEqual(record.lastSeenAt);
      expect(unchanged.revokedAt).toBeNull();
      expect(
        await harness.admin.db
          .select()
          .from(sessions)
          .where(eq(sessions.id, next.sessionId)),
      ).toEqual([]);
      observations.push({
        kind: "expired-lock-contention",
        blockedRequestsObserved: blocked,
        refreshDenied: true,
        rotationDenied: true,
        replacementRows: 0,
      });
    });

    it("permits exactly one concurrent rotation and preserves the winning session binding", async () => {
      const { record } = await fixture(["PARTICIPANT", "AUTHOR"]);
      const repository = createSessionRepository(harness.application.db);
      const now = new Date(record.createdAt.getTime() + 1_000);
      const replacements = [0, 1].map((): SessionRecord => ({
        ...record,
        sessionId: randomUUID(),
        tokenHash: hashSessionToken(randomUUID()),
        lastSeenAt: now,
      }));
      let pending: Promise<PromiseSettledResult<void>[]> | undefined;
      let blocked = 0;
      await harness.admin.db.transaction(async (transaction) => {
        await transaction
          .select()
          .from(sessions)
          .where(eq(sessions.id, record.sessionId))
          .for("update");
        pending = Promise.allSettled(
          replacements.map((next) =>
            repository.rotate!(record.tokenHash, next, now),
          ),
        );
        blocked = await waitForBlocked(2);
      });
      if (pending === undefined)
        throw new Error("concurrent rotations were not launched");
      const outcomes = await pending;
      expect(
        outcomes.filter((outcome) => outcome.status === "fulfilled"),
      ).toHaveLength(1);
      expect(
        outcomes.filter((outcome) => outcome.status === "rejected"),
      ).toHaveLength(1);
      const rows = await harness.admin.db
        .select()
        .from(sessions)
        .where(eq(sessions.accountId, record.accountId));
      expect(rows).toHaveLength(2);
      const active = rows.filter((row) => row.revokedAt === null);
      expect(active).toHaveLength(1);
      expect(active[0]).toMatchObject({
        createdAt: record.createdAt,
        expiresAt: record.expiresAt,
        roles: record.roles,
        scopes: record.scopes,
        lastSeenAt: now,
      });
      expect((await stored(record.sessionId)).revokedAt).toEqual(now);
      expect(await repository.findActive(record.tokenHash, now)).toBeNull();
      observations.push({
        kind: "concurrent-rotation",
        blockedRequestsObserved: blocked,
        accepted: 1,
        denied: 1,
        replacements: 1,
        originalBindingPreserved: true,
      });
    });

    afterAll(async () => {
      if (harness === undefined) return;
      try {
        if (accountIds.length > 0) {
          await harness.admin.db
            .delete(sessions)
            .where(inArray(sessions.accountId, accountIds));
          await harness.admin.db
            .delete(accounts)
            .where(inArray(accounts.id, accountIds));
        }
        const sessionRows =
          accountIds.length === 0
            ? []
            : await harness.admin.db
                .select()
                .from(sessions)
                .where(inArray(sessions.accountId, accountIds));
        const accountRows =
          accountIds.length === 0
            ? []
            : await harness.admin.db
                .select()
                .from(accounts)
                .where(inArray(accounts.id, accountIds));
        expect(sessionRows).toHaveLength(0);
        expect(accountRows).toHaveLength(0);
        const path = process.env.CVG_R7_SESSION_PROOF_PATH;
        if (path !== undefined)
          await writeFile(
            path,
            JSON.stringify(
              {
                applicationRole: harness.applicationRole,
                adminRole: harness.adminRole,
                observations,
                cleanup: {
                  sessions: sessionRows.length,
                  accounts: accountRows.length,
                },
              },
              null,
              2,
            ) + "\n",
            { flag: "wx" },
          );
      } finally {
        await closeLivePostgresHarness(harness);
      }
    });
  },
);
