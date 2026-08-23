import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { createDashboardReadRepository } from "../../packages/persistence/src/index.js";
import {
  accountInvitations,
  accounts,
  activityAssignments,
  attempts,
  contentVersions,
  diagnosticResults,
  learningActivities,
  learningAssignments,
  sessions,
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
  "PostgreSQL staff dashboard integration",
  () => {
    it("aggregates scoped synthetic progress without crossing the staff scope", async ({
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
      const participantId = randomUUID();
      const scopeId = randomUUID();
      const activityId = randomUUID();
      const attemptId = randomUUID();
      const assignmentId = randomUUID();
      const invitationId = randomUUID();
      const sessionId = randomUUID();
      const contentId = randomUUID();
      const contentVersionId = randomUUID();
      const reviewContentId = randomUUID();
      const reviewVersionId = randomUUID();
      const diagnosticResultId = randomUUID();

      try {
        await admin.db.insert(accounts).values([
          {
            id: adminId,
            professionalEmail: `dashboard-admin-${adminId}@example.invalid`,
            status: "ACTIVE",
          },
          {
            id: participantId,
            professionalEmail: `dashboard-participant-${participantId}@example.invalid`,
            status: "ACTIVE",
          },
        ]);
        await admin.db.insert(accountInvitations).values({
          id: invitationId,
          accountId: participantId,
          tokenHash: "a".repeat(64),
          roles: ["PARTICIPANT"],
          scopes: [scopeId],
          expiresAt: new Date("2027-08-23T12:00:00.000Z"),
          acceptedAt: new Date("2026-08-23T10:00:00.000Z"),
          createdBy: adminId,
        });
        await admin.db.insert(sessions).values({
          id: sessionId,
          accountId: participantId,
          tokenHash: "b".repeat(64),
          roles: ["PARTICIPANT"],
          scopes: [scopeId],
          expiresAt: new Date("2027-08-23T12:00:00.000Z"),
          lastSeenAt: new Date("2026-08-23T11:00:00.000Z"),
        });
        await admin.db.insert(contentVersions).values([
          {
            id: contentVersionId,
            contentId,
            scopeId,
            version: 1,
            status: "PUBLICADO",
            kind: "LEITURA",
            title: "Conteúdo sintético publicado",
            participantText: "Texto sintético de dashboard.",
            responseMode: "NONE",
          },
          {
            id: reviewVersionId,
            contentId: reviewContentId,
            scopeId,
            version: 1,
            status: "EM_REVISAO_CLINICA",
            kind: "CASO",
            title: "Conteúdo sintético em revisão",
            participantText: "Caso sintético de revisão.",
            responseMode: "TEXT",
          },
        ]);
        await admin.db.insert(learningActivities).values({
          id: activityId,
          scopeId,
          slug: `dashboard-activity-${activityId}`,
          title: "Atividade sintética do dashboard",
          status: "PUBLISHED",
        });
        await admin.db.insert(activityAssignments).values({
          participantId,
          activityId,
          status: "CONCLUIDO",
        });
        await admin.db.insert(learningAssignments).values({
          id: assignmentId,
          participantId,
          scopeId,
          moduleId: "M02",
          availableAt: new Date("2026-08-20T12:00:00.000Z"),
          status: "CONCLUIDO",
          version: 1,
        });
        await admin.db.insert(attempts).values({
          id: attemptId,
          participantId,
          activityId,
          status: "SUBMETIDA",
          version: 1,
          submittedAt: new Date("2026-08-23T11:30:00.000Z"),
        });
        await admin.db.insert(diagnosticResults).values({
          id: diagnosticResultId,
          participantId,
          scopeId,
          diagnosticId: "B07-DIAGNOSTIC-V1",
          diagnosticVersion: "0.1.0",
          result: {
            diagnosticId: "B07-DIAGNOSTIC-V1",
            version: "0.1.0",
            notPunitive: true,
            noGlobalPassFail: true,
            totalItemCount: 120,
            answeredItemCount: 30,
            themeResults: [
              {
                themeId: "B07-S1",
                itemCount: 40,
                answeredItemCount: 30,
                earnedPoints: 30,
                possiblePoints: 40,
                percent: 75,
                recommendedModuleIds: ["M01", "M11"],
              },
              {
                themeId: "B07-S2",
                itemCount: 40,
                answeredItemCount: 0,
                earnedPoints: 0,
                possiblePoints: 0,
                percent: 0,
                recommendedModuleIds: ["M02"],
              },
              {
                themeId: "B07-S3",
                itemCount: 40,
                answeredItemCount: 0,
                earnedPoints: 0,
                possiblePoints: 0,
                percent: 0,
                recommendedModuleIds: ["M11"],
              },
            ],
            recommendedModuleIds: ["M01", "M02", "M11"],
            remediationObjectiveIds: ["M01-OBJ-01"],
          },
          completedAt: new Date("2026-08-23T11:45:00.000Z"),
        });

        const dashboard = await createDashboardReadRepository(database.db, {
          now: () => new Date("2026-08-23T12:00:00.000Z"),
        }).findStaffDashboard([scopeId]);

        expect(dashboard.scopes).toEqual([scopeId]);
        expect(dashboard.metrics).toMatchObject({
          invitedParticipants: 0,
          activeParticipants: 1,
          assignedModules: 1,
          completedModules: 1,
          completionRatePercent: 100,
          medianProgressPercent: 100,
          pendingCorrections: 1,
          content: { published: 1, inReview: 1 },
        });
        expect(dashboard.participants).toEqual([
          expect.objectContaining({
            participantId,
            professionalEmail: `dashboard-participant-${participantId}@example.invalid`,
            nextAction: "AGUARDAR_CORRECAO_HUMANA",
            progress: {
              assignedModules: 1,
              completedModules: 1,
              progressPercent: 100,
              remediationModules: 0,
              retentionReviewsPending: 0,
            },
            diagnosticProfile: expect.arrayContaining([
              expect.objectContaining({
                themeId: "B07-S1",
                status: "BASELINE_REGISTRADA",
                scorePercent: 75,
              }),
            ]),
          }),
        ]);
        expect(JSON.stringify(dashboard.participants)).not.toContain(
          "M01-OBJ-01",
        );

        const otherScope = randomUUID();
        const otherDashboard = await createDashboardReadRepository(
          database.db,
        ).findStaffDashboard([otherScope]);
        expect(otherDashboard.participants).toEqual([]);
        expect(otherDashboard.metrics.activeParticipants).toBe(0);
      } finally {
        await admin.db
          .delete(diagnosticResults)
          .where(eq(diagnosticResults.id, diagnosticResultId));
        await admin.db.delete(attempts).where(eq(attempts.id, attemptId));
        await admin.db
          .delete(activityAssignments)
          .where(eq(activityAssignments.activityId, activityId));
        await admin.db
          .delete(learningAssignments)
          .where(eq(learningAssignments.id, assignmentId));
        await admin.db
          .delete(learningActivities)
          .where(eq(learningActivities.id, activityId));
        await admin.db
          .delete(contentVersions)
          .where(
            and(
              eq(contentVersions.scopeId, scopeId),
              eq(contentVersions.contentId, contentId),
            ),
          );
        await admin.db
          .delete(contentVersions)
          .where(
            and(
              eq(contentVersions.scopeId, scopeId),
              eq(contentVersions.contentId, reviewContentId),
            ),
          );
        await admin.db.delete(sessions).where(eq(sessions.id, sessionId));
        await admin.db
          .delete(accountInvitations)
          .where(eq(accountInvitations.id, invitationId));
        await admin.db.delete(accounts).where(eq(accounts.id, participantId));
        await admin.db.delete(accounts).where(eq(accounts.id, adminId));
        await closeLivePostgresHarness(harness);
      }
    });
  },
);
