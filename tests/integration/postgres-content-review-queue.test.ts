import { randomUUID } from "node:crypto";

import { and, eq, inArray } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { createContentReviewQueueRepository } from "../../packages/persistence/src/index.js";
import {
  accounts,
  contentEditorialRecords,
  contentReviewDecisions,
  contentVersions,
} from "../../packages/persistence/src/schema.js";
import {
  closeLivePostgresHarness,
  hasAdministrativeCleanupCapability,
  liveAdminCapabilityMessage,
  liveDatabaseUrl,
  openLivePostgresHarness,
} from "./live-postgres-harness.js";

const runLiveDatabaseTests = process.env.CVG_RUN_LIVE_DB_TESTS === "true";

function syntheticItem(contentId: string, title: string) {
  return {
    title,
    prompt: "Escolha a próxima ação segura em um cenário fictício.",
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
        code: "F-SYNTHETIC-02",
        locator: "localizador interno sintético",
        updateRequired: true,
      },
    ],
    participant: {
      id: contentId,
      ordinal: 1,
      kind: "QUESTAO" as const,
      title,
      prompt: "Escolha a próxima ação segura em um cenário fictício.",
      responseMode: "CHOICE" as const,
      choices: [
        { id: "a", label: "A", text: "Priorizar e reavaliar." },
        { id: "b", label: "B", text: "Aguardar sem meta." },
      ],
      selectionMode: "SINGLE" as const,
    },
  };
}

function syntheticPreflight() {
  return {
    ruleVersion: "authoring-preflight-v1" as const,
    technicalChecksPassed: true,
    readyForClinicalReview: true,
    readyForPublication: false,
    checks: {
      requiredFields: true,
      correctionMetadata: true,
      publicBoundary: true,
      sourceTraceability: true,
      publicationBlocked: true,
    },
    checkedAt: new Date("2026-08-23T17:00:00.000Z"),
  };
}

describe.skipIf(!runLiveDatabaseTests || liveDatabaseUrl === undefined)(
  "PostgreSQL content review queue integration",
  () => {
    it("reads bounded metadata by scope, status and deterministic pagination", async ({
      skip,
    }) => {
      const harness = await openLivePostgresHarness();
      if (!hasAdministrativeCleanupCapability(harness.adminRole)) {
        await closeLivePostgresHarness(harness);
        skip(liveAdminCapabilityMessage);
        return;
      }

      const { application: database, admin } = harness;
      const authorId = randomUUID();
      const reviewerId = randomUUID();
      const scopeId = randomUUID();
      const otherScopeId = randomUUID();
      const contentIds = [randomUUID(), randomUUID(), randomUUID()];
      const contentVersionIds = [randomUUID(), randomUUID(), randomUUID()];
      const editorialRecordIds = [randomUUID(), randomUUID(), randomUUID()];

      try {
        await admin.db.insert(accounts).values([
          {
            id: authorId,
            professionalEmail: `queue-author-${authorId}@example.invalid`,
            status: "ACTIVE",
          },
          {
            id: reviewerId,
            professionalEmail: `queue-reviewer-${reviewerId}@example.invalid`,
            status: "ACTIVE",
          },
        ]);
        await admin.db.insert(contentVersions).values(
          contentIds.map((contentId, index) => ({
            id: contentVersionIds[index]!,
            contentId,
            scopeId: index === 2 ? otherScopeId : scopeId,
            version: 1,
            status:
              index === 1
                ? ("AJUSTES_SOLICITADOS" as const)
                : ("EM_REVISAO_CLINICA" as const),
            kind: "QUESTAO" as const,
            title: `Item de fila sintético ${index + 1}`,
            participantText:
              "Escolha a próxima ação segura em um cenário fictício.",
            responseMode: "CHOICE" as const,
            participantOptions: [
              { id: "a", label: "A", text: "Priorizar e reavaliar." },
              { id: "b", label: "B", text: "Aguardar sem meta." },
            ],
            participantSelectionMode: "SINGLE" as const,
          })),
        );
        await admin.db.insert(contentEditorialRecords).values(
          contentIds.map((contentId, index) => ({
            id: editorialRecordIds[index]!,
            contentVersionId: contentVersionIds[index]!,
            contentId,
            scopeId: index === 2 ? otherScopeId : scopeId,
            version: 1,
            moduleId: "M02",
            sessionId: `M02-S${index + 1}`,
            objectiveId: "M02-OBJ-01",
            authorId,
            item: syntheticItem(
              contentId,
              `Item de fila sintético ${index + 1}`,
            ),
            preflight: syntheticPreflight(),
            updatedAt: new Date(Date.UTC(2026, 7, 23, 17, 30 + index)),
          })),
        );
        await admin.db.insert(contentReviewDecisions).values({
          id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
          contentEditorialRecordId: editorialRecordIds[1]!,
          contentVersionId: contentVersionIds[1]!,
          contentId: contentIds[1]!,
          version: 1,
          scopeId,
          reviewerId,
          decision: "APROVAR_CLINICAMENTE",
          rationale: "Decisão anterior sintética.",
          correlationId: randomUUID(),
          reviewedAt: new Date("2026-08-23T18:00:00.000Z"),
          createdAt: new Date("2026-08-23T18:01:00.000Z"),
        });
        await admin.db.insert(contentReviewDecisions).values({
          id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
          contentEditorialRecordId: editorialRecordIds[1]!,
          contentVersionId: contentVersionIds[1]!,
          contentId: contentIds[1]!,
          version: 1,
          scopeId,
          reviewerId,
          decision: "SOLICITAR_AJUSTES",
          rationale: "Ajuste editorial sintético necessário.",
          correlationId: randomUUID(),
          reviewedAt: new Date("2026-08-23T18:00:00.000Z"),
          createdAt: new Date("2026-08-23T18:01:00.000Z"),
        });

        const repository = createContentReviewQueueRepository(database.db, {
          now: () => new Date("2026-08-23T20:00:00.000Z"),
        });
        const page = await repository.findContentReviewQueue({
          scopeId,
          limit: 1,
        });
        expect(page).toMatchObject({
          kind: "content_review_queue",
          scopeId,
          filters: { scopeId, limit: 1 },
        });
        expect(page.items).toHaveLength(1);
        expect(page.items[0]).toMatchObject({
          contentId: contentIds[1],
          status: "AJUSTES_SOLICITADOS",
          nextAction: "AGUARDAR_REENVIO_AUTOR",
          latestReview: { decision: "SOLICITAR_AJUSTES" },
        });
        expect(JSON.stringify(page)).not.toContain("prompt");
        expect(JSON.stringify(page)).not.toContain("sourceRefs");

        const clinicalReviewOnly = await repository.findContentReviewQueue({
          scopeId,
          status: "EM_REVISAO_CLINICA",
          limit: 50,
        });
        expect(clinicalReviewOnly.items).toHaveLength(1);
        expect(clinicalReviewOnly.items[0]?.contentId).toBe(contentIds[0]);

        const otherScope = await repository.findContentReviewQueue({
          scopeId: otherScopeId,
          limit: 50,
        });
        expect(otherScope.items).toHaveLength(1);
        expect(otherScope.items[0]?.contentId).toBe(contentIds[2]);
        expect(otherScope.items.some((item) => item.scopeId === scopeId)).toBe(
          false,
        );

        const unscopedEditorialRows = await database.db
          .select({ id: contentEditorialRecords.id })
          .from(contentEditorialRecords)
          .where(eq(contentEditorialRecords.scopeId, scopeId));
        expect(unscopedEditorialRows).toHaveLength(0);
        const unscopedReviewRows = await database.db
          .select({ id: contentReviewDecisions.id })
          .from(contentReviewDecisions)
          .where(eq(contentReviewDecisions.scopeId, scopeId));
        expect(unscopedReviewRows).toHaveLength(0);
      } finally {
        await admin.db
          .delete(contentReviewDecisions)
          .where(inArray(contentReviewDecisions.contentId, contentIds));
        await admin.db
          .delete(contentEditorialRecords)
          .where(inArray(contentEditorialRecords.id, editorialRecordIds));
        await admin.db
          .delete(contentVersions)
          .where(
            and(
              inArray(contentVersions.id, contentVersionIds),
              inArray(contentVersions.contentId, contentIds),
            ),
          );
        await admin.db.delete(accounts).where(eq(accounts.id, authorId));
        await admin.db.delete(accounts).where(eq(accounts.id, reviewerId));
        await closeLivePostgresHarness(harness);
      }
    });
  },
);
