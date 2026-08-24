import { randomUUID } from "node:crypto";

import { and, eq, inArray } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { getReflectionManagementReport } from "../../packages/application/src/index.js";
import { createReflectionManagementReadRepository } from "../../packages/persistence/src/index.js";
import {
  accountInvitations,
  accounts,
  activityAssignments,
  answers,
  attempts,
  contentEditorialRecords,
  contentVersions,
  learningActivities,
  learningActivityItems,
} from "../../packages/persistence/src/schema.js";
import {
  closeLivePostgresHarness,
  hasAdministrativeCleanupCapability,
  liveAdminCapabilityMessage,
  liveDatabaseUrl,
  openLivePostgresHarness,
} from "./live-postgres-harness.js";

const runLiveDatabaseTests = process.env.CVG_RUN_LIVE_DB_TESTS === "true";

describe.skipIf(!runLiveDatabaseTests || liveDatabaseUrl === undefined)(
  "PostgreSQL reflection management integration",
  () => {
    it("aggregates only scoped digital reflection states and never returns response text", async ({
      skip,
    }) => {
      const harness = await openLivePostgresHarness();
      if (!hasAdministrativeCleanupCapability(harness.adminRole)) {
        await closeLivePostgresHarness(harness);
        skip(liveAdminCapabilityMessage);
        return;
      }
      const { application: database, admin } = harness;
      const adminId = randomUUID();
      const scopeId = randomUUID();
      const otherScopeId = randomUUID();
      const participantIds = [randomUUID(), randomUUID(), randomUUID()];
      const invitationIds = [randomUUID(), randomUUID(), randomUUID()];
      const activityId = randomUUID();
      const contentIds = [randomUUID(), randomUUID()];
      const contentVersionIds = [randomUUID(), randomUUID()];
      const editorialIds = [randomUUID(), randomUUID()];
      const attemptIds = [randomUUID(), randomUUID(), randomUUID()];
      const answerIds = [
        randomUUID(),
        randomUUID(),
        randomUUID(),
        randomUUID(),
      ];

      const reflectionItem = (id: string, ordinal: number) => ({
        title: `Reflexão sintética ${ordinal}`,
        prompt: "Registre a próxima ação de aprendizagem.",
        responseMode: "TEXT" as const,
        feedback: "Feedback formativo sintético.",
        critical: false,
        remediationTargetObjectiveId: "M02-OBJ-01",
        sourceRefs: [],
        participant: {
          id,
          ordinal,
          kind: "QUESTAO" as const,
          title: `Reflexão sintética ${ordinal}`,
          prompt: "Registre a próxima ação de aprendizagem.",
          responseMode: "TEXT" as const,
        },
      });

      try {
        await admin.db.insert(accounts).values([
          {
            id: adminId,
            professionalEmail: `reflection-admin-${adminId}@example.invalid`,
            status: "ACTIVE",
          },
          ...participantIds.map((participantId, index) => ({
            id: participantId,
            professionalEmail: `reflection-participant-${index}-${participantId}@example.invalid`,
            status: "ACTIVE" as const,
          })),
        ]);
        await admin.db.insert(accountInvitations).values(
          participantIds.map((participantId, index) => ({
            id: invitationIds[index]!,
            accountId: participantId,
            tokenHash: String.fromCharCode(97 + index).repeat(64),
            roles: ["PARTICIPANT"],
            scopes: [scopeId],
            expiresAt: new Date("2027-08-23T12:00:00.000Z"),
            acceptedAt: new Date("2026-08-23T10:00:00.000Z"),
            createdBy: adminId,
          })),
        );
        await admin.db.insert(contentVersions).values(
          contentVersionIds.map((contentVersionId, index) => ({
            id: contentVersionId,
            contentId: contentIds[index]!,
            scopeId,
            version: 1,
            status: "PUBLICADO" as const,
            kind: "REFLEXAO" as const,
            title: `Reflexão sintética ${index + 1}`,
            participantText: "Texto reflexivo sintético.",
            responseMode: "TEXT" as const,
          })),
        );
        await admin.db.insert(contentEditorialRecords).values(
          contentVersionIds.map((contentVersionId, index) => ({
            id: editorialIds[index]!,
            contentVersionId,
            contentId: contentIds[index]!,
            scopeId,
            version: 1,
            moduleId: "M02",
            sessionId: "M02-S1",
            objectiveId: "M02-OBJ-01",
            authorId: adminId,
            item: reflectionItem(contentIds[index]!, index + 1),
            preflight: {
              ruleVersion: "authoring-preflight-v1" as const,
              technicalChecksPassed: true,
              readyForClinicalReview: true,
              readyForPublication: true,
              checks: {
                requiredFields: true,
                correctionMetadata: true,
                publicBoundary: true,
                sourceTraceability: true,
                publicationBlocked: false,
              },
              checkedAt: "2026-08-23T10:00:00.000Z",
            },
          })),
        );
        await admin.db.insert(learningActivities).values({
          id: activityId,
          scopeId,
          slug: `reflection-management-${activityId}`,
          title: "Atividade de reflexão sintética",
          status: "PUBLISHED",
        });
        await admin.db.insert(learningActivityItems).values([
          { activityId, contentVersionId: contentVersionIds[0]!, ordinal: 1 },
          { activityId, contentVersionId: contentVersionIds[1]!, ordinal: 2 },
        ]);
        await admin.db.insert(activityAssignments).values(
          participantIds.map((participantId) => ({
            participantId,
            activityId,
            status: "DISPONIVEL" as const,
          })),
        );
        await admin.db.insert(attempts).values([
          {
            id: attemptIds[0]!,
            participantId: participantIds[1]!,
            activityId,
            status: "EM_ANDAMENTO",
            version: 1,
            createdAt: new Date("2026-08-23T10:00:00.000Z"),
            updatedAt: new Date("2026-08-23T10:00:00.000Z"),
          },
          {
            id: attemptIds[1]!,
            participantId: participantIds[2]!,
            activityId,
            status: "ANULADA",
            version: 1,
            createdAt: new Date("2026-08-23T09:00:00.000Z"),
            updatedAt: new Date("2026-08-23T09:00:00.000Z"),
          },
          {
            id: attemptIds[2]!,
            participantId: participantIds[2]!,
            activityId,
            status: "SUBMETIDA",
            version: 2,
            submittedAt: new Date("2026-08-23T11:00:00.000Z"),
            createdAt: new Date("2026-08-23T11:00:00.000Z"),
            updatedAt: new Date("2026-08-23T11:00:00.000Z"),
          },
        ]);
        await admin.db.insert(answers).values([
          {
            id: answerIds[0]!,
            attemptId: attemptIds[0]!,
            itemId: contentVersionIds[0]!,
            response: "texto privado em andamento",
            savedAt: new Date("2026-08-23T10:30:00.000Z"),
          },
          {
            id: answerIds[1]!,
            attemptId: attemptIds[1]!,
            itemId: contentVersionIds[0]!,
            response: "texto privado antigo",
            savedAt: new Date("2026-08-23T09:30:00.000Z"),
          },
          {
            id: answerIds[2]!,
            attemptId: attemptIds[2]!,
            itemId: contentVersionIds[0]!,
            response: "texto privado atual um",
            savedAt: new Date("2026-08-23T11:30:00.000Z"),
          },
          {
            id: answerIds[3]!,
            attemptId: attemptIds[2]!,
            itemId: contentVersionIds[1]!,
            response: "texto privado atual dois",
            savedAt: new Date("2026-08-23T11:31:00.000Z"),
          },
        ]);

        const report = await getReflectionManagementReport(
          {
            principalId: adminId,
            query: { scopeId },
          },
          createReflectionManagementReadRepository(database.db, {
            now: () => new Date("2026-08-23T12:00:00.000Z"),
          }),
        );

        expect(report).toMatchObject({
          scopeId,
          modules: [
            {
              moduleId: "M02",
              totalAssignments: 3,
              counts: {
                NAO_INICIADA: 1,
                EM_ANDAMENTO: 1,
                CONCLUIDA: 1,
              },
            },
          ],
        });
        expect(JSON.stringify(report)).not.toContain("texto privado");

        const otherScopeReport = await getReflectionManagementReport(
          { principalId: adminId, query: { scopeId: otherScopeId } },
          createReflectionManagementReadRepository(database.db),
        );
        expect(otherScopeReport.modules).toEqual([]);
      } finally {
        await admin.db.delete(answers).where(inArray(answers.id, answerIds));
        await admin.db.delete(attempts).where(inArray(attempts.id, attemptIds));
        await admin.db
          .delete(activityAssignments)
          .where(eq(activityAssignments.activityId, activityId));
        await admin.db
          .delete(learningActivityItems)
          .where(eq(learningActivityItems.activityId, activityId));
        await admin.db
          .delete(contentEditorialRecords)
          .where(inArray(contentEditorialRecords.id, editorialIds));
        await admin.db
          .delete(learningActivities)
          .where(eq(learningActivities.id, activityId));
        await admin.db
          .delete(contentVersions)
          .where(
            and(
              eq(contentVersions.scopeId, scopeId),
              inArray(contentVersions.id, contentVersionIds),
            ),
          );
        await admin.db
          .delete(accountInvitations)
          .where(inArray(accountInvitations.id, invitationIds));
        await admin.db
          .delete(accounts)
          .where(inArray(accounts.id, [adminId, ...participantIds]));
        await closeLivePostgresHarness(harness);
      }
    });
  },
);
