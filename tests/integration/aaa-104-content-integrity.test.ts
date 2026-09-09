import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

import { inArray } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  readMigrationManifest,
  validateMigrationManifest,
} from "../../scripts/verify-migrations.mjs";
import {
  aiSuggestions,
  contentVersions,
} from "../../packages/persistence/src/schema.js";
import { setDatabaseSecurityContext } from "../../packages/persistence/src/security-context.js";
import {
  closeLivePostgresHarness,
  hasAdministrativeCleanupCapability,
  liveAdminCapabilityMessage,
  liveDatabaseUrl,
  openLivePostgresHarness,
} from "./live-postgres-harness.js";

const runLiveDatabaseTests = process.env.CVG_RUN_LIVE_DB_TESTS === "true";

const migrationPath = fileURLToPath(
  new URL(
    "../../packages/persistence/drizzle/0053_aaa_content_integrity.sql",
    import.meta.url,
  ),
);
const schemaPath = fileURLToPath(
  new URL("../../packages/persistence/src/schema.ts", import.meta.url),
);

describe("AAA-104 content persistence boundaries", () => {
  it("keeps the forward-only migration contiguous and fail-closed for orphans", async () => {
    const manifest = await readMigrationManifest();
    expect(validateMigrationManifest(manifest)).toMatchObject({
      lastIndex: 54,
      latestTag: "0054_aaa_content_indexer_service",
    });

    const migration = await readFile(migrationPath, "utf8");
    expect(migration).toContain(
      "content_editorial_records_version_identity_fk",
    );
    expect(migration).toContain("content_review_decisions_version_identity_fk");
    expect(migration).toContain(
      "content_review_decisions_editorial_identity_fk",
    );
    expect(migration).toContain("ai_suggestions_content_version_fk");
    expect(migration).toContain("AAA-104 orphan content editorial record");
    expect(migration).toContain("AAA-104 orphan content review decision");
    expect(migration).toContain("AAA-104 orphan AI suggestion");
    expect(migration).not.toContain("NOT VALID");
  });

  it("requires scoped RLS for published participant content and internal AI drafts", async () => {
    const migration = await readFile(migrationPath, "utf8");
    expect(migration).toContain(
      'ALTER TABLE "content_versions" FORCE ROW LEVEL SECURITY',
    );
    expect(migration).toContain(
      'CREATE POLICY "content_versions_scope_policy"',
    );
    expect(migration).toContain(
      'CREATE POLICY "content_versions_participant_select_policy"',
    );
    expect(migration).toContain("\"status\" = 'PUBLICADO'");
    expect(migration).toContain(
      'ALTER TABLE "ai_suggestions" FORCE ROW LEVEL SECURITY',
    );
    expect(migration).toContain('CREATE POLICY "ai_suggestions_scope_policy"');
    expect(migration).toContain(
      "current_setting('cvg.participant_id', true) = ''",
    );
  });

  it("keeps Drizzle identity relations aligned with the SQL boundary", async () => {
    const schema = await readFile(schemaPath, "utf8");
    expect(schema).toContain(
      'name: "content_editorial_records_version_identity_fk"',
    );
    expect(schema).toContain(
      'name: "content_review_decisions_version_identity_fk"',
    );
    expect(schema).toContain(
      'name: "content_review_decisions_editorial_identity_fk"',
    );
    expect(schema).toContain('name: "ai_suggestions_content_version_fk"');
    expect(schema).toContain("contentVersions.contentId");
    expect(schema).toContain("contentVersions.version");
  });
});

describe.skipIf(!runLiveDatabaseTests || liveDatabaseUrl === undefined)(
  "AAA-104 PostgreSQL content integrity",
  () => {
    it("rejects orphan AI suggestions and cross-scope writes while hiding other scopes", async ({
      skip,
    }) => {
      const harness = await openLivePostgresHarness();
      if (!hasAdministrativeCleanupCapability(harness.adminRole)) {
        await closeLivePostgresHarness(harness);
        skip(liveAdminCapabilityMessage);
        return;
      }

      const scopeId = randomUUID();
      const otherScopeId = randomUUID();
      const contentId = randomUUID();
      const otherContentId = randomUUID();
      const contentVersionId = randomUUID();
      const otherContentVersionId = randomUUID();
      const orphanContentId = randomUUID();
      const suggestionId = randomUUID();

      try {
        await harness.admin.db.insert(contentVersions).values([
          {
            id: contentVersionId,
            contentId,
            scopeId,
            version: 1,
            status: "PUBLICADO",
            kind: "QUESTAO",
            title: "Conteúdo sintético AAA-104",
            participantText: "Texto sintético de teste.",
            responseMode: "TEXT",
          },
          {
            id: otherContentVersionId,
            contentId: otherContentId,
            scopeId: otherScopeId,
            version: 1,
            status: "PUBLICADO",
            kind: "QUESTAO",
            title: "Conteúdo sintético de outro escopo",
            participantText: "Texto sintético de outro escopo.",
            responseMode: "TEXT",
          },
        ]);

        const visibleContentVersions = await harness.application.db.transaction(
          async (transaction) => {
            await setDatabaseSecurityContext(transaction, { scopeId });
            return transaction
              .select({ id: contentVersions.id })
              .from(contentVersions)
              .where(
                inArray(contentVersions.id, [
                  contentVersionId,
                  otherContentVersionId,
                ]),
              );
          },
        );
        expect(visibleContentVersions).toEqual([{ id: contentVersionId }]);

        await expect(
          harness.application.db.transaction(async (transaction) => {
            await setDatabaseSecurityContext(transaction, { scopeId });
            await transaction.insert(aiSuggestions).values({
              id: suggestionId,
              contentId: otherContentId,
              version: 1,
              draftText: "Sugestão sintética cross-scope.",
              warnings: ["synthetic_scope_boundary"],
            });
          }),
        ).rejects.toThrow();

        await expect(
          harness.admin.db.insert(aiSuggestions).values({
            id: suggestionId,
            contentId: orphanContentId,
            version: 1,
            draftText: "Sugestão sintética órfã.",
            warnings: ["synthetic_orphan"],
          }),
        ).rejects.toThrow();
      } finally {
        await harness.admin.db
          .delete(aiSuggestions)
          .where(inArray(aiSuggestions.id, [suggestionId]));
        await harness.admin.db
          .delete(contentVersions)
          .where(
            inArray(contentVersions.id, [
              contentVersionId,
              otherContentVersionId,
            ]),
          );
        await closeLivePostgresHarness(harness);
      }
    });
  },
);
