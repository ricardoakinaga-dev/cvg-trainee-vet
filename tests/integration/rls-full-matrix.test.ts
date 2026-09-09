import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  createPostgresDatabase,
  type DatabaseHandle,
} from "../../packages/persistence/src/database.js";
import {
  setDatabaseSecurityContext,
  setDatabaseServiceContext,
} from "../../packages/persistence/src/security-context.js";

import {
  closeLivePostgresHarness,
  liveDatabaseUrl,
  openLivePostgresHarness,
} from "./live-postgres-harness.js";

const runLiveDatabaseTests = process.env.CVG_RUN_LIVE_DB_TESTS === "true";

type AttemptRow = Readonly<{
  readonly id: string;
  readonly participantId: string;
}>;

async function seedMatrix(admin: DatabaseHandle) {
  const db = admin.db;
  const scopeA = randomUUID();
  const scopeB = randomUUID();
  const participantA = randomUUID();
  const participantB = randomUUID();
  const activityA = randomUUID();
  const activityB = randomUUID();
  const slugA = `rls-matrix-a-${randomUUID()}`;
  const slugB = `rls-matrix-b-${randomUUID()}`;
  await db.execute(
    sql`insert into "learning_activities" ("id", "scope_id", "slug", "status") values (${activityA}::uuid, ${scopeA}::uuid, ${slugA}, 'PUBLISHED'), (${activityB}::uuid, ${scopeB}::uuid, ${slugB}, 'PUBLISHED')`,
  );
  const attemptA = randomUUID();
  const attemptB = randomUUID();
  await db.execute(
    sql`insert into "attempts" ("id", "participant_id", "activity_id", "status", "version") values (${attemptA}::uuid, ${participantA}::uuid, ${activityA}::uuid, 'EM_ANDAMENTO', 1), (${attemptB}::uuid, ${participantB}::uuid, ${activityB}::uuid, 'EM_ANDAMENTO', 1)`,
  );
  return {
    scopeA,
    scopeB,
    participantA,
    participantB,
    activityA,
    activityB,
    attemptA,
    attemptB,
  };
}

async function selectAttemptIds(
  handle: DatabaseHandle,
  context: { participantId?: string; scopeId?: string },
): Promise<string[]> {
  return handle.db.transaction(async (tx) => {
    if (context.participantId !== undefined || context.scopeId !== undefined) {
      await setDatabaseSecurityContext(tx, context);
    }
    const rows = await tx.execute<{ id: string }>(
      sql`select "id" from "attempts"`,
    );
    return rows.map((row) => row.id);
  });
}

describe.skipIf(!runLiveDatabaseTests || liveDatabaseUrl === undefined)(
  "full live RLS scope matrix on real PostgreSQL",
  () => {
    it("denies participant A any read of participant B rows", async () => {
      const harness = await openLivePostgresHarness();
      try {
        const seed = await seedMatrix(harness.admin);
        const seenByA = await selectAttemptIds(harness.application, {
          participantId: seed.participantA,
        });
        expect(seenByA).toEqual([seed.attemptA]);
        const seenByB = await selectAttemptIds(harness.application, {
          participantId: seed.participantB,
        });
        expect(seenByB).toEqual([seed.attemptB]);
      } finally {
        await closeLivePostgresHarness(harness);
      }
    });

    it("denies participant writes outside their own identity", async () => {
      const harness = await openLivePostgresHarness();
      try {
        const seed = await seedMatrix(harness.admin);
        // INSERT as B while authenticated as A violates WITH CHECK.
        await expect(
          harness.application.db.transaction(async (tx) => {
            await setDatabaseSecurityContext(tx, {
              participantId: seed.participantA,
            });
            await tx.execute(
              sql`insert into "attempts" ("id", "participant_id", "activity_id", "status", "version") values (${randomUUID()}::uuid, ${seed.participantB}::uuid, ${seed.activityA}::uuid, 'EM_ANDAMENTO', 1)`,
            );
          }),
        ).rejects.toThrow();
        // UPDATE of B's row affects zero rows (silently filtered).
        const updated = await harness.application.db.transaction(async (tx) => {
          await setDatabaseSecurityContext(tx, {
            participantId: seed.participantA,
          });
          return tx.execute<{ id: string }>(
            sql`update "attempts" set "status" = 'SUBMETIDA' where "id" = ${seed.attemptB}::uuid returning "id"`,
          );
        });
        expect(updated).toEqual([]);
        // DELETE of B's row affects zero rows.
        const deleted = await harness.application.db.transaction(async (tx) => {
          await setDatabaseSecurityContext(tx, {
            participantId: seed.participantA,
          });
          return tx.execute<{ id: string }>(
            sql`delete from "attempts" where "id" = ${seed.attemptB}::uuid returning "id"`,
          );
        });
        expect(deleted).toEqual([]);
        // B's row is untouched.
        const seenByB = await selectAttemptIds(harness.application, {
          participantId: seed.participantB,
        });
        expect(seenByB).toEqual([seed.attemptB]);
      } finally {
        await closeLivePostgresHarness(harness);
      }
    });

    it("isolates staff reads by scope membership", async () => {
      const harness = await openLivePostgresHarness();
      try {
        const seed = await seedMatrix(harness.admin);
        const seenByStaffA = await selectAttemptIds(harness.application, {
          scopeId: seed.scopeA,
        });
        expect(seenByStaffA).toEqual([seed.attemptA]);
        const seenByStaffB = await selectAttemptIds(harness.application, {
          scopeId: seed.scopeB,
        });
        expect(seenByStaffB).toEqual([seed.attemptB]);
      } finally {
        await closeLivePostgresHarness(harness);
      }
    });

    it("confines the content-indexer service identity to its contract", async () => {
      const harness = await openLivePostgresHarness();
      try {
        const seed = await seedMatrix(harness.admin);
        const seen: AttemptRow[] = await harness.application.db.transaction(
          async (tx) => {
            await setDatabaseServiceContext(tx, {
              serviceRole: "content-indexer",
            });
            return (await tx.execute(
              sql`select "id", "participant_id" as "participantId" from "attempts"`,
            )) as AttemptRow[];
          },
        );
        expect(seen).toEqual([]);
        await expect(
          harness.application.db.transaction(async (tx) => {
            await setDatabaseServiceContext(tx, {
              serviceRole: "content-indexer",
            });
            await tx.execute(
              sql`insert into "attempts" ("id", "participant_id", "activity_id", "status", "version") values (${randomUUID()}::uuid, ${seed.participantA}::uuid, ${seed.activityA}::uuid, 'EM_ANDAMENTO', 1)`,
            );
          }),
        ).rejects.toThrow();
      } finally {
        await closeLivePostgresHarness(harness);
      }
    });

    it("denies anonymous access to protected rows", async () => {
      const harness = await openLivePostgresHarness();
      try {
        await seedMatrix(harness.admin);
        const seen = await selectAttemptIds(harness.application, {});
        expect(seen).toEqual([]);
        await expect(
          harness.application.db.transaction(async (tx) => {
            await tx.execute(
              sql`insert into "attempts" ("id", "participant_id", "activity_id", "status", "version") values (${randomUUID()}::uuid, ${randomUUID()}::uuid, ${randomUUID()}::uuid, 'EM_ANDAMENTO', 1)`,
            );
          }),
        ).rejects.toThrow();
      } finally {
        await closeLivePostgresHarness(harness);
      }
    });

    it("never leaks pooled RLS context across ten alternating checkouts on one pooled connection", async () => {
      const harness = await openLivePostgresHarness();
      const singleConnection = createPostgresDatabase(
        process.env.CVG_TEST_DATABASE_URL as string,
        { maxConnections: 1 },
      );
      try {
        const seed = await seedMatrix(harness.admin);
        for (let round = 0; round < 10; round += 1) {
          const seenByA = await selectAttemptIds(singleConnection, {
            participantId: seed.participantA,
          });
          expect(seenByA).toEqual([seed.attemptA]);
          const seenByB = await selectAttemptIds(singleConnection, {
            participantId: seed.participantB,
          });
          expect(seenByB).toEqual([seed.attemptB]);
        }
      } finally {
        await singleConnection.close();
        await closeLivePostgresHarness(harness);
      }
    });

    it("audits owner, grants, RLS enforcement and least privilege live", async () => {
      const harness = await openLivePostgresHarness();
      try {
        expect(harness.applicationRole.isSuperuser).toBe(false);
        expect(harness.applicationRole.bypassesRls).toBe(false);
        const tables = await harness.admin.db.execute<{
          readonly table: string;
          readonly rls: boolean;
          readonly force: boolean;
          readonly owner: string;
        }>(
          sql`select "c"."relname" as "table", "c"."relrowsecurity" as "rls", "c"."relforcerowsecurity" as "force", "pg_get_userbyid"("c"."relowner") as "owner" from "pg_class" as "c" join "pg_namespace" as "n" on "n"."oid" = "c"."relnamespace" where "n"."nspname" = 'public' and "c"."relname" in ('attempts', 'answers', 'learning_activities')`,
        );
        expect(tables).toHaveLength(3);
        for (const table of tables) {
          expect(table.rls).toBe(true);
          expect(table.force).toBe(true);
          expect(table.owner).not.toBe(harness.applicationRole.roleName);
        }
      } finally {
        await closeLivePostgresHarness(harness);
      }
    });
  },
);
