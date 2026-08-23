import { randomUUID } from "node:crypto";

import { and, eq, inArray } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  getParticipantActivity,
  getParticipantProgress,
} from "../../packages/application/src/index.js";
import {
  createActivityReadRepository,
  createContentIndexSourceRepository,
  createProgressReadRepository,
} from "../../packages/persistence/src/index.js";
import {
  activityAssignments,
  attempts,
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
  "PostgreSQL published activity integration",
  () => {
    it("reads only assigned published participant content in ordinal order", async ({
      skip,
    }) => {
      const harness = await openLivePostgresHarness();
      if (!hasAdministrativeCleanupCapability(harness.adminRole)) {
        await closeLivePostgresHarness(harness);
        skip(liveAdminCapabilityMessage);
        return;
      }
      const { application: database, admin } = harness;

      const participantId = randomUUID();
      const activityId = randomUUID();
      const scopeId = randomUUID();
      const attemptId = randomUUID();
      const firstContentId = randomUUID();
      const secondContentId = randomUUID();
      const thirdContentId = randomUUID();
      const firstVersionId = randomUUID();
      const secondVersionId = randomUUID();
      const thirdVersionId = randomUUID();

      try {
        await admin.db.insert(contentVersions).values([
          {
            id: firstVersionId,
            contentId: firstContentId,
            scopeId,
            version: 1,
            status: "PUBLICADO",
            kind: "LEITURA",
            title: "Prioridades clínicas",
            participantText: "Texto interno autoral de treinamento.",
            responseMode: "NONE",
          },
          {
            id: secondVersionId,
            contentId: secondContentId,
            scopeId,
            version: 1,
            status: "PUBLICADO",
            kind: "QUESTAO",
            title: "Questão de fixação",
            participantText: "Resposta textual própria.",
            responseMode: "TEXT",
          },
          {
            id: thirdVersionId,
            contentId: thirdContentId,
            scopeId,
            version: 1,
            status: "PUBLICADO",
            kind: "QUESTAO",
            title: "Escolha de segurança",
            participantText: "Selecione as ações seguras.",
            responseMode: "CHOICE",
            participantOptions: [
              { id: "a", label: "A", text: "Ação segura." },
              { id: "b", label: "B", text: "Outra ação segura." },
            ],
            participantSelectionMode: "MULTIPLE",
          },
        ]);
        await admin.db.insert(learningActivities).values({
          id: activityId,
          scopeId,
          slug: `synthetic-activity-${activityId}`,
          title: "Atividade sintética",
          status: "PUBLISHED",
        });
        await admin.db.insert(learningActivityItems).values([
          { activityId, contentVersionId: thirdVersionId, ordinal: 3 },
          { activityId, contentVersionId: secondVersionId, ordinal: 2 },
          { activityId, contentVersionId: firstVersionId, ordinal: 1 },
        ]);
        await admin.db.insert(activityAssignments).values({
          participantId,
          activityId,
          status: "DISPONIVEL",
        });
        await admin.db.insert(attempts).values({
          id: attemptId,
          participantId,
          activityId,
          status: "SALVA",
          version: 2,
        });

        const repository = createActivityReadRepository(database.db);
        const activity = await getParticipantActivity(
          { participantId, activityId },
          repository,
        );
        const progress = await getParticipantProgress(
          { participantId, activityId },
          createProgressReadRepository(database.db),
        );

        expect(activity).toMatchObject({
          activityId,
          scopeId,
          title: "Atividade sintética",
          items: [
            { ordinal: 1, title: "Prioridades clínicas", responseMode: "NONE" },
            { ordinal: 2, title: "Questão de fixação", responseMode: "TEXT" },
            {
              ordinal: 3,
              title: "Escolha de segurança",
              responseMode: "CHOICE",
              selectionMode: "MULTIPLE",
              choices: [
                { id: "a", label: "A", text: "Ação segura." },
                { id: "b", label: "B", text: "Outra ação segura." },
              ],
            },
          ],
        });
        expect(JSON.stringify(activity)).not.toContain("participantText");
        expect(JSON.stringify(activity)).not.toContain("internalContent");
        expect(progress).toMatchObject({
          activityId,
          assignmentStatus: "DISPONIVEL",
          attemptStatus: "SALVA",
          nextAction: "RETOMAR_ATIVIDADE",
        });
        const indexable = await createContentIndexSourceRepository(
          database.db,
        ).listPublishedIndexable();
        expect(indexable).toEqual(
          expect.arrayContaining([
            {
              contentId: firstContentId,
              version: 1,
              scopeId,
              text: "Texto interno autoral de treinamento.",
            },
            {
              contentId: secondContentId,
              version: 1,
              scopeId,
              text: "Resposta textual própria.",
            },
            {
              contentId: thirdContentId,
              version: 1,
              scopeId,
              text: "Selecione as ações seguras.",
            },
          ]),
        );
      } finally {
        await admin.db.delete(attempts).where(eq(attempts.id, attemptId));
        await admin.db
          .delete(activityAssignments)
          .where(eq(activityAssignments.activityId, activityId));
        await admin.db
          .delete(learningActivityItems)
          .where(eq(learningActivityItems.activityId, activityId));
        await admin.db
          .delete(learningActivities)
          .where(eq(learningActivities.id, activityId));
        await admin.db
          .delete(contentVersions)
          .where(
            and(
              eq(contentVersions.scopeId, scopeId),
              inArray(contentVersions.id, [
                firstVersionId,
                secondVersionId,
                thirdVersionId,
              ]),
            ),
          );
        await closeLivePostgresHarness(harness);
      }
    });
  },
);
