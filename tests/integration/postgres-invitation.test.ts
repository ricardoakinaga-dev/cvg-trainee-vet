import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  acceptInvitation,
  createInvitation,
  hashSessionToken,
  type CreateInvitationCommand,
} from "../../packages/application/src/index.js";
import { createPostgresDatabase } from "../../packages/persistence/src/database.js";
import {
  accountInvitations,
  accounts,
  createInvitationUseCaseDependencies,
  sessions,
} from "../../packages/persistence/src/index.js";

const runLiveDatabaseTests = process.env.CVG_RUN_LIVE_DB_TESTS === "true";
const databaseUrl = process.env.CVG_TEST_DATABASE_URL;
const invitationCredential = ["Acesso", "CVG", "2026!Seguro"].join("-");

describe.skipIf(!runLiveDatabaseTests || databaseUrl === undefined)(
  "PostgreSQL invitation integration",
  () => {
    it("stores only a token hash, activates once, and creates a session", async () => {
      if (databaseUrl === undefined)
        throw new Error("test database URL is required");

      const database = createPostgresDatabase(databaseUrl);
      const adminId = randomUUID();
      const scopeId = randomUUID();
      const invitedEmail = `trainee-${randomUUID()}@cvg.example`;
      const sessionToken = "s".repeat(32);
      const sessionId = randomUUID();
      let accountId: string | undefined;

      try {
        await database.db.insert(accounts).values({
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
          database.db,
          randomUUID,
        );
        const created = await createInvitation(command, dependencies);
        accountId = created.accountId;

        const storedInvitation = await database.db
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
            password: invitationCredential,
            sessionExpiresInSeconds: 3600,
            correlationId: randomUUID(),
            sessionTokenFactory: () => sessionToken,
            sessionIdFactory: () => sessionId,
          },
          dependencies,
        );
        expect(accepted.accountId).toBe(accountId);
        expect(accepted.session.cookie).toContain("HttpOnly");

        const storedAccount = await database.db
          .select({ status: accounts.status })
          .from(accounts)
          .where(eq(accounts.id, created.accountId));
        const storedSession = await database.db
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
              password: invitationCredential,
              sessionExpiresInSeconds: 3600,
              correlationId: randomUUID(),
            },
            dependencies,
          ),
        ).rejects.toMatchObject({ code: "not_found" });
      } finally {
        if (accountId !== undefined) {
          await database.db
            .delete(sessions)
            .where(eq(sessions.accountId, accountId));
          await database.db
            .delete(accountInvitations)
            .where(eq(accountInvitations.accountId, accountId));
          await database.db.delete(accounts).where(eq(accounts.id, accountId));
        }
        await database.db.delete(accounts).where(eq(accounts.id, adminId));
        await database.close();
      }
    });
  },
);
