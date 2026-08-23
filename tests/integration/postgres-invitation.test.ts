import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  acceptInvitation,
  createInvitation,
  hashSessionToken,
  type CreateInvitationCommand,
} from "../../packages/application/src/index.js";
import {
  accountInvitations,
  accounts,
  createInvitationUseCaseDependencies,
  sessions,
} from "../../packages/persistence/src/index.js";
import {
  closeLivePostgresHarness,
  hasAdministrativeCleanupCapability,
  liveAdminCapabilityMessage,
  openLivePostgresHarness,
} from "./live-postgres-harness.js";

const runLiveDatabaseTests = process.env.CVG_RUN_LIVE_DB_TESTS === "true";
const databaseUrl = process.env.CVG_TEST_DATABASE_URL;

describe.skipIf(!runLiveDatabaseTests || databaseUrl === undefined)(
  "PostgreSQL invitation integration",
  () => {
    it("stores only a token hash, activates once, and creates a session", async ({
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
      const adminId = randomUUID();
      const scopeId = randomUUID();
      const invitedEmail = `trainee-${randomUUID()}@cvg.example`;
      const sessionToken = "s".repeat(32);
      const sessionId = randomUUID();
      let accountId: string | undefined;

      try {
        await admin.db.insert(accounts).values({
          id: adminId,
          professionalEmail: `admin-${randomUUID()}@cvg.example`,
          status: "ACTIVE",
        });

        const command: CreateInvitationCommand = {
          principalId: adminId,
          accountStatus: "ACTIVE",
          roles: ["ADMIN"],
          scopes: [scopeId],
          professionalEmail: invitedEmail,
          invitedRoles: ["PARTICIPANT"],
          invitedScopes: [scopeId],
          expiresInSeconds: 3600,
          correlationId: randomUUID(),
          tokenFactory: () => "i".repeat(32),
        };
        const dependencies = createInvitationUseCaseDependencies(
          application.db,
          randomUUID,
        );
        const created = await createInvitation(command, dependencies);
        accountId = created.accountId;

        const storedInvitation = await admin.db
          .select({
            tokenHash: accountInvitations.tokenHash,
            acceptedAt: accountInvitations.acceptedAt,
          })
          .from(accountInvitations)
          .where(eq(accountInvitations.id, created.invitationId));
        expect(storedInvitation).toEqual([
          { tokenHash: hashSessionToken("i".repeat(32)), acceptedAt: null },
        ]);

        const accepted = await acceptInvitation(
          {
            token: created.token,
            sessionExpiresInSeconds: 3600,
            correlationId: randomUUID(),
            sessionTokenFactory: () => sessionToken,
            sessionIdFactory: () => sessionId,
          },
          dependencies,
        );
        expect(accepted.accountId).toBe(accountId);
        expect(accepted.session.cookie).toContain("HttpOnly");

        const storedAccount = await admin.db
          .select({ status: accounts.status })
          .from(accounts)
          .where(eq(accounts.id, created.accountId));
        const storedSession = await admin.db
          .select({ tokenHash: sessions.tokenHash })
          .from(sessions)
          .where(eq(sessions.id, sessionId));
        expect(storedAccount).toEqual([{ status: "ACTIVE" }]);
        expect(storedSession).toEqual([
          { tokenHash: hashSessionToken(sessionToken) },
        ]);
        await expect(
          acceptInvitation(
            {
              token: created.token,
              sessionExpiresInSeconds: 3600,
              correlationId: randomUUID(),
            },
            dependencies,
          ),
        ).rejects.toMatchObject({ code: "not_found" });
      } finally {
        if (accountId !== undefined) {
          await admin.db
            .delete(sessions)
            .where(eq(sessions.accountId, accountId));
          await admin.db
            .delete(accountInvitations)
            .where(eq(accountInvitations.accountId, accountId));
          await admin.db.delete(accounts).where(eq(accounts.id, accountId));
        }
        await admin.db.delete(accounts).where(eq(accounts.id, adminId));
        await closeLivePostgresHarness(harness);
      }
    });
  },
);
