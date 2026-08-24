import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  createAuthoringDraft,
  type AuditEntry,
  type AuthoringRecord,
} from "../../packages/application/src/index.js";
import {
  accounts,
  auditEntries,
  authoringDraftIdempotency,
  contentEditorialRecords,
  contentVersions,
  createAuthoringRepository,
  learningActivities,
  outboxEvents,
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
  "PostgreSQL authoring draft persistence",
  () => {
    it("persists one scoped RASCUNHO atomically and replays it idempotently", async ({
      skip,
    }) => {
      if (databaseUrl === undefined) {
        throw new Error("test database URL is required");
      }

      const harness = await openLivePostgresHarness();
      if (!hasAdministrativeCleanupCapability(harness.adminRole)) {
        await closeLivePostgresHarness(harness);
        skip(liveAdminCapabilityMessage);
        return;
      }

      const { application: database, admin } = harness;
      const authorId = randomUUID();
      const scopeId = randomUUID();
      const foreignScopeId = randomUUID();
      const idempotencyKey = `authoring-draft-live-${randomUUID().replaceAll(
        "-",
        "",
      )}`;
      const atomicFailureKey = `authoring-draft-failure-${randomUUID().replaceAll(
        "-",
        "",
      )}`;
      const repository = createAuthoringRepository(database.db);
      let created: AuthoringRecord | undefined;

      const command = {
        principalId: authorId,
        accountStatus: "ACTIVE" as const,
        roles: ["AUTHOR" as const],
        scopes: [scopeId],
        scopeId,
        moduleId: "M02",
        sessionId: "M02-S1",
        objectiveId: "M02-OBJ-01",
        ordinal: 1,
        title: "Prioridade sintética live",
        prompt: "Escolha a próxima ação segura em um caso fictício.",
        responseMode: "CHOICE" as const,
        choices: [
          { id: "a", label: "A", text: "Priorizar e reavaliar." },
          { id: "b", label: "B", text: "Aguardar sem meta." },
        ],
        correctChoiceIds: ["a"],
        feedback: "Defina uma meta e reavalie.",
        critical: true,
        remediationTargetObjectiveId: "M02-OBJ-01",
        sourceRefs: [
          {
            code: "F-02",
            locator: "localizador interno",
            updateRequired: true,
          },
        ],
        idempotencyKey,
        correlationId: randomUUID(),
      };

      try {
        await admin.db.insert(accounts).values({
          id: authorId,
          professionalEmail: `${authorId}@example.invalid`,
          status: "ACTIVE",
        });

        created = await createAuthoringDraft(command, {
          repository,
          idFactory: randomUUID,
          now: () => "2026-08-24T19:30:00.000Z",
        });

        expect(created).toMatchObject({
          contentStatus: "RASCUNHO",
          version: 1,
          scopeId,
          preflight: { readyForPublication: false },
        });
        expect(created.participant).not.toHaveProperty("correctChoiceIds");

        const replay = await createAuthoringDraft(command, {
          repository,
          idFactory: randomUUID,
          now: () => "2026-08-24T19:31:00.000Z",
        });
        expect(replay).toMatchObject({
          contentId: created.contentId,
          contentVersionId: created.contentVersionId,
          editorialRecordId: created.editorialRecordId,
        });

        await expect(
          createAuthoringDraft(
            { ...command, prompt: "Outro prompt sintético." },
            { repository, idFactory: randomUUID },
          ),
        ).rejects.toMatchObject({ code: "idempotency_conflict" });

        await expect(
          repository.find(created.contentId, created.version, scopeId),
        ).resolves.toMatchObject({ contentId: created.contentId });
        await expect(
          repository.find(created.contentId, created.version, foreignScopeId),
        ).resolves.toBeNull();

        await expect(
          admin.db
            .select({ id: contentVersions.id })
            .from(contentVersions)
            .where(eq(contentVersions.contentId, created.contentId)),
        ).resolves.toHaveLength(1);
        await expect(
          admin.db
            .select({ id: contentEditorialRecords.id })
            .from(contentEditorialRecords)
            .where(eq(contentEditorialRecords.contentId, created.contentId)),
        ).resolves.toHaveLength(1);
        await expect(
          admin.db
            .select({ key: authoringDraftIdempotency.key })
            .from(authoringDraftIdempotency)
            .where(eq(authoringDraftIdempotency.key, idempotencyKey)),
        ).resolves.toHaveLength(1);
        await expect(
          admin.db
            .select({ action: auditEntries.action })
            .from(auditEntries)
            .where(
              and(
                eq(auditEntries.resourceId, created.contentId),
                eq(auditEntries.action, "CONTENT_DRAFT_CREATED"),
              ),
            ),
        ).resolves.toHaveLength(1);
        await expect(
          database.db
            .update(authoringDraftIdempotency)
            .set({ fingerprint: "tampered" })
            .where(eq(authoringDraftIdempotency.key, idempotencyKey)),
        ).rejects.toBeDefined();
        await expect(
          database.db
            .delete(authoringDraftIdempotency)
            .where(eq(authoringDraftIdempotency.key, idempotencyKey)),
        ).rejects.toBeDefined();
        await expect(
          admin.db
            .select({ id: learningActivities.id })
            .from(learningActivities)
            .where(eq(learningActivities.scopeId, scopeId)),
        ).resolves.toHaveLength(0);
        await expect(
          admin.db
            .select({ id: outboxEvents.id })
            .from(outboxEvents)
            .where(eq(outboxEvents.aggregateId, created.contentId)),
        ).resolves.toHaveLength(0);

        const failedContentId = randomUUID();
        const failedRecord: AuthoringRecord = {
          ...created,
          contentId: failedContentId,
          contentVersionId: randomUUID(),
          editorialRecordId: randomUUID(),
          participant: { ...created.participant, id: failedContentId },
        };
        const invalidAudit: AuditEntry = {
          auditId: randomUUID(),
          actorKind: "AUTHENTICATED",
          principalId: authorId,
          action: "CONTENT_DRAFT_CREATED",
          resourceType: "content_version",
          resourceId: failedContentId,
          scopeId,
          outcome: "SUCCESS",
          reasonCode: "atomicity_probe",
          requestId: "not-a-uuid",
          correlationId: randomUUID(),
          occurredAt: "2026-08-24T19:32:00.000Z",
        };

        await expect(
          repository.createDraft(failedRecord, {
            idempotencyKey: atomicFailureKey,
            fingerprint: "atomicity-probe",
            audit: invalidAudit,
          }),
        ).rejects.toBeDefined();
        await expect(
          admin.db
            .select({ id: contentVersions.id })
            .from(contentVersions)
            .where(eq(contentVersions.contentId, failedContentId)),
        ).resolves.toHaveLength(0);
        await expect(
          admin.db
            .select({ key: authoringDraftIdempotency.key })
            .from(authoringDraftIdempotency)
            .where(eq(authoringDraftIdempotency.key, atomicFailureKey)),
        ).resolves.toHaveLength(0);
      } finally {
        if (created !== undefined) {
          await admin.db
            .delete(auditEntries)
            .where(eq(auditEntries.resourceId, created.contentId));
          await admin.db
            .delete(authoringDraftIdempotency)
            .where(eq(authoringDraftIdempotency.key, idempotencyKey));
          await admin.db
            .delete(contentEditorialRecords)
            .where(eq(contentEditorialRecords.id, created.editorialRecordId));
          await admin.db
            .delete(contentVersions)
            .where(eq(contentVersions.id, created.contentVersionId));
        }
        await admin.db.delete(accounts).where(eq(accounts.id, authorId));
        await closeLivePostgresHarness(harness);
      }
    });
  },
);
