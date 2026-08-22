import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { createPostgresDatabase } from "../../packages/persistence/src/database.js";
import {
  createSessionRepository,
  type SessionRecord,
} from "../../packages/persistence/src/session-repository.js";
import {
  accounts,
  sessions as sessionRows,
} from "../../packages/persistence/src/schema.js";

const runLiveDatabaseTests = process.env.CVG_RUN_LIVE_DB_TESTS === "true";
const databaseUrl = process.env.CVG_TEST_DATABASE_URL;

describe.skipIf(!runLiveDatabaseTests || databaseUrl === undefined)(
  "PostgreSQL session generation (RH02)",
  () => {
    it("invalidates a live session after bulk revocation via sessionGeneration increment", async () => {
      if (databaseUrl === undefined) {
        throw new Error("test database URL is required");
      }
      const database = createPostgresDatabase(databaseUrl);
      const sessions = createSessionRepository(database.db);
      const accountId = randomUUID();
      const tokenHash = `${"a".repeat(64)}`;
      const concurrentTokenHash = `${"b".repeat(64)}`;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 3600_000);

      const record: SessionRecord = {
        sessionId: randomUUID(),
        accountId,
        sessionGeneration: 0,
        accountStatus: "ACTIVE",
        roles: ["PARTICIPANT"],
        scopes: [randomUUID()],
        tokenHash,
        expiresAt,
        revokedAt: null,
        createdAt: now,
        lastSeenAt: now,
      };

      try {
        // Insert the account with generation 0 and a matching session.
        await accountManagementRepositoryInsert(database, accountId, 0);
        await sessions.create(record);

        // Concurrently: a fresh session is inserted with the OLD generation
        // while bulk revocation advances the account generation. The read
        // below must reject both stale-generation sessions regardless of
        // ordering; the tokens remain distinct because token_hash is unique.
        await Promise.all([
          sessions.create({
            ...record,
            sessionId: randomUUID(),
            tokenHash: concurrentTokenHash,
            sessionGeneration: 0,
          }),
          sessions.revokeAll(accountId, now),
        ]);

        await expect(
          sessions.findActive(tokenHash, new Date()),
        ).resolves.toBeNull();
        await expect(
          sessions.findActive(concurrentTokenHash, new Date()),
        ).resolves.toBeNull();
      } finally {
        await database.db
          .delete(sessionRows)
          .where(eq(sessionRows.accountId, accountId));
        await database.db.delete(accounts).where(eq(accounts.id, accountId));
        await database.close();
      }
    });
  },
);

async function accountManagementRepositoryInsert(
  database: ReturnType<typeof createPostgresDatabase>,
  accountId: string,
  generation: number,
): Promise<void> {
  await database.db
    .insert(accounts)
    .values({
      id: accountId,
      professionalEmail: `${accountId}@cvg.example.invalid`,
      status: "ACTIVE",
      sessionGeneration: generation,
      roles: ["PARTICIPANT"],
      scopes: [randomUUID()],
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();
}
