import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import { createPostgresDatabase } from "../../packages/persistence/src/database.js";
import {
  createSessionRepository,
  type SessionRecord,
} from "../../packages/persistence/src/session-repository.js";

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

      // Insert the account with generation 0 and a matching session.
      await accountManagementRepositoryInsert(database, accountId, 0);
      await sessions.create(record);

      // Concurrently: a fresh session is inserted with the OLD generation
      // while bulk revocation advances the account generation. The read below
      // must reject the stale-generation session regardless of ordering.
      await Promise.all([
        sessions.create({
          ...record,
          sessionId: randomUUID(),
          sessionGeneration: 0,
        }),
        sessions.revokeAll(accountId, now),
      ]);

      // After revocation, the account generation is 1; any session with
      // generation 0 must no longer resolve as active.
      const active = await sessions.findActive(tokenHash, new Date());
      expect(active).toBeNull();
    });
  },
);

async function accountManagementRepositoryInsert(
  database: ReturnType<typeof createPostgresDatabase>,
  accountId: string,
  generation: number,
): Promise<void> {
  const { accounts } = await import("../../packages/persistence/src/schema.js");
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
