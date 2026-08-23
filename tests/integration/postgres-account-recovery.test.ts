import { randomUUID } from "node:crypto";

import { eq, inArray, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  acceptAccountRecovery,
  authenticateSessionCookie,
  hashSessionToken,
  issueAccountRecovery,
} from "../../packages/application/src/index.js";
import {
  accountInvitations,
  accountRecoveryRequests,
  accounts,
  auditEntries,
  createAuditRepository,
  createAccountRecoveryTransaction,
  createSessionRepository,
  setDatabaseSecurityContext,
  sessions,
} from "../../packages/persistence/src/index.js";
import {
  closeLivePostgresHarness,
  hasAdministrativeCleanupCapability,
  liveAdminCapabilityMessage,
  liveDatabaseUrl,
  openLivePostgresHarness,
} from "./live-postgres-harness.js";

const runLiveDatabaseTests = process.env.CVG_RUN_LIVE_DB_TESTS === "true";

describe.skipIf(!runLiveDatabaseTests || liveDatabaseUrl === undefined)(
  "PostgreSQL controlled account recovery",
  () => {
    it("persists anonymous rejection metadata without a fake principal", async ({
      skip,
    }) => {
      const harness = await openLivePostgresHarness();
      if (!hasAdministrativeCleanupCapability(harness.adminRole)) {
        await closeLivePostgresHarness(harness);
        skip(liveAdminCapabilityMessage);
        return;
      }
      const { application, admin } = harness;
      const auditId = randomUUID();

      try {
        await createAuditRepository(application.db).append({
          auditId,
          actorKind: "ANONYMOUS",
          action: "HTTP_REQUEST_REJECTED",
          resourceType: "http_route",
          resourceId: "/api/v1/attempts/:attemptId/submit",
          outcome: "DENIED",
          reasonCode: "api_unauthenticated",
          requestId: randomUUID(),
          correlationId: randomUUID(),
          occurredAt: new Date().toISOString(),
        });

        const rows = await admin.db
          .select({
            actorKind: auditEntries.actorKind,
            principalId: auditEntries.principalId,
            resourceId: auditEntries.resourceId,
            outcome: auditEntries.outcome,
          })
          .from(auditEntries)
          .where(eq(auditEntries.id, auditId));

        expect(rows).toEqual([
          {
            actorKind: "ANONYMOUS",
            principalId: null,
            resourceId: "/api/v1/attempts/:attemptId/submit",
            outcome: "DENIED",
          },
        ]);
      } finally {
        // The append-only trigger intentionally prevents fixture deletion;
        // this test runs only against a disposable database.
        await closeLivePostgresHarness(harness);
      }
    });

    it("issues, revokes, consumes and cannot reuse a scoped recovery link", async ({
      skip,
    }) => {
      const harness = await openLivePostgresHarness();
      if (!hasAdministrativeCleanupCapability(harness.adminRole)) {
        await closeLivePostgresHarness(harness);
        skip(liveAdminCapabilityMessage);
        return;
      }
      expect(harness.applicationRole.bypassesRls).toBe(false);
      const { application, admin } = harness;
      const transaction = createAccountRecoveryTransaction(application.db);
      const repository = createSessionRepository(application.db);
      const adminId = randomUUID();
      const accountId = randomUUID();
      const scopeId = randomUUID();
      const invitationId = randomUUID();
      const oldSessionId = randomUUID();
      const recoveryId = randomUUID();
      const correlationId = randomUUID();
      const token = "r".repeat(32);
      const oldToken = "o".repeat(32);
      const createdIds = [adminId, accountId];

      try {
        await admin.db.insert(accounts).values([
          {
            id: adminId,
            professionalEmail: `recovery-admin-${adminId}@example.invalid`,
            status: "ACTIVE",
          },
          {
            id: accountId,
            professionalEmail: `recovery-target-${accountId}@example.invalid`,
            status: "ACTIVE",
          },
        ]);
        await admin.db.insert(accountInvitations).values({
          id: invitationId,
          accountId,
          tokenHash: "a".repeat(64),
          roles: ["PARTICIPANT"],
          scopes: [scopeId],
          expiresAt: new Date("2027-08-23T12:00:00.000Z"),
          acceptedAt: new Date("2026-08-22T12:00:00.000Z"),
          createdBy: adminId,
        });
        await admin.db.insert(sessions).values({
          id: oldSessionId,
          accountId,
          tokenHash: hashSessionToken(oldToken),
          roles: ["PARTICIPANT"],
          scopes: [scopeId],
          expiresAt: new Date("2027-08-23T12:00:00.000Z"),
          lastSeenAt: new Date("2026-08-23T11:00:00.000Z"),
        });

        const issued = await issueAccountRecovery(
          {
            principalId: adminId,
            accountStatus: "ACTIVE",
            roles: ["ADMIN"],
            scopes: [scopeId],
            targetAccountId: accountId,
            scopeId,
            expiresInSeconds: 1800,
            correlationId,
            now: new Date("2026-08-23T12:00:00.000Z"),
            tokenFactory: () => token,
            recoveryIdFactory: () => recoveryId,
          },
          { transaction, idFactory: randomUUID },
        );
        expect(issued).toMatchObject({
          accountId,
          professionalEmail: `recovery-target-${accountId}@example.invalid`,
          token,
          revokedSessions: 1,
        });

        const noContextRows = await application.db
          .select({ id: accountRecoveryRequests.id })
          .from(accountRecoveryRequests)
          .where(eq(accountRecoveryRequests.id, recoveryId));
        expect(noContextRows).toHaveLength(0);
        const noContextIdentityRows = await Promise.all([
          application.db
            .select({ id: accounts.id })
            .from(accounts)
            .where(eq(accounts.id, accountId)),
          application.db
            .select({ id: sessions.id })
            .from(sessions)
            .where(eq(sessions.accountId, accountId)),
        ]);
        expect(noContextIdentityRows).toEqual([[], []]);
        await expect(
          application.db.insert(accounts).values({
            id: randomUUID(),
            professionalEmail: `blocked-${randomUUID()}@example.invalid`,
            status: "INVITED",
          }),
        ).rejects.toMatchObject({ cause: { code: "42501" } });
        await expect(
          application.db.insert(sessions).values({
            id: randomUUID(),
            accountId,
            tokenHash: hashSessionToken(`blocked-${randomUUID()}`),
            roles: ["PARTICIPANT"],
            scopes: [scopeId],
            expiresAt: new Date("2027-08-23T12:00:00.000Z"),
            lastSeenAt: new Date("2026-08-23T12:00:00.000Z"),
          }),
        ).rejects.toMatchObject({ cause: { code: "42501" } });
        const scopedRows = await application.db.transaction(async (tx) => {
          await setDatabaseSecurityContext(tx, { scopeId });
          return tx
            .select({ id: accountRecoveryRequests.id })
            .from(accountRecoveryRequests)
            .where(eq(accountRecoveryRequests.id, recoveryId));
        });
        expect(scopedRows).toEqual([{ id: recoveryId }]);

        const persisted = await admin.db
          .select({
            tokenHash: accountRecoveryRequests.tokenHash,
            consumedAt: accountRecoveryRequests.consumedAt,
            revokedAt: accountRecoveryRequests.revokedAt,
          })
          .from(accountRecoveryRequests)
          .where(eq(accountRecoveryRequests.id, recoveryId));
        expect(persisted).toEqual([
          expect.objectContaining({
            tokenHash: hashSessionToken(token),
            consumedAt: null,
            revokedAt: null,
          }),
        ]);
        expect(JSON.stringify(issued)).not.toContain("tokenHash");
        await expect(
          authenticateSessionCookie(
            `__Host-cvg_session=${oldToken}`,
            repository,
            new Date("2026-08-23T12:01:00.000Z"),
          ),
        ).resolves.toBeNull();

        const accepted = await acceptAccountRecovery(
          {
            token,
            sessionExpiresInSeconds: 3600,
            correlationId: randomUUID(),
            now: new Date("2026-08-23T12:05:00.000Z"),
            sessionTokenFactory: () => "s".repeat(32),
            sessionIdFactory: () => randomUUID(),
          },
          { transaction, idFactory: randomUUID },
        );
        expect(accepted.accountId).toBe(accountId);
        await expect(
          authenticateSessionCookie(
            accepted.session.cookie,
            repository,
            new Date("2026-08-23T12:06:00.000Z"),
          ),
        ).resolves.toMatchObject({ accountId, scopes: [scopeId] });
        await expect(
          acceptAccountRecovery(
            {
              token,
              sessionExpiresInSeconds: 3600,
              correlationId: randomUUID(),
            },
            { transaction, idFactory: randomUUID },
          ),
        ).rejects.toMatchObject({ code: "not_found" });

        const audit = await admin.db
          .select({ action: auditEntries.action })
          .from(auditEntries)
          .where(eq(auditEntries.correlationId, correlationId));
        expect(audit).toEqual([
          expect.objectContaining({ action: "account.recovery.issued" }),
        ]);

        const policyRows = await admin.db.execute(sql`
          select c.relname as table_name, c.relrowsecurity, c.relforcerowsecurity
          from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public'
            and c.relname in ('accounts', 'sessions', 'account_invitations', 'account_recovery_requests')
          order by c.relname
        `);
        expect(policyRows).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              table_name: "account_invitations",
              relrowsecurity: true,
              relforcerowsecurity: true,
            }),
            expect.objectContaining({
              table_name: "account_recovery_requests",
              relrowsecurity: true,
              relforcerowsecurity: true,
            }),
            expect.objectContaining({
              table_name: "accounts",
              relrowsecurity: true,
              relforcerowsecurity: true,
            }),
            expect.objectContaining({
              table_name: "sessions",
              relrowsecurity: true,
              relforcerowsecurity: true,
            }),
          ]),
        );
      } finally {
        await admin.db
          .delete(accountRecoveryRequests)
          .where(inArray(accountRecoveryRequests.accountId, createdIds));
        await admin.db
          .delete(sessions)
          .where(inArray(sessions.accountId, createdIds));
        await admin.db
          .delete(accountInvitations)
          .where(inArray(accountInvitations.accountId, createdIds));
        await admin.db.delete(accounts).where(inArray(accounts.id, createdIds));
        await closeLivePostgresHarness(harness);
      }
    });
  },
);
