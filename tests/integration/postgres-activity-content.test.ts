import { randomUUID } from "node:crypto";

import { and, eq, inArray } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  getParticipantActivity,
  getParticipantProgress,
} from "../../packages/application/src/index.js";
import { createPostgresDatabase } from "../../packages/persistence/src/database.js";
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

const runLiveDatabaseTests = process.env.CVG_RUN_LIVE_DB_TESTS === "true";
const databaseUrl = process.env.CVG_TEST_DATABASE_URL;
const adminDatabaseUrl = process.env.CVG_TEST_ADMIN_DATABASE_URL;

describe.skipIf(
  !runLiveDatabaseTests ||
    databaseUrl === undefined ||
    adminDatabaseUrl === undefined,
)("PostgreSQL published activity integration", () => {
  it("reads only assigned published participant content in ordinal order", async () => {
    if (databaseUrl === undefined || adminDatabaseUrl === undefined)
      throw new Error("application and admin database URLs are required");

    const database = createPostgresDatabase(databaseUrl);
    const adminDatabase = createPostgresDatabase(adminDatabaseUrl);
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
      await adminDatabase.db.insert(contentVersions).values([
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
      await adminDatabase.db.insert(learningActivities).values({
        id: activityId,
        scopeId,
        slug: `synthetic-activity-${activityId}`,
        title: "Atividade sintética",
        status: "PUBLISHED",
      });
      await adminDatabase.db.insert(learningActivityItems).values([
        { activityId, contentVersionId: thirdVersionId, ordinal: 3 },
        { activityId, contentVersionId: secondVersionId, ordinal: 2 },
        { activityId, contentVersionId: firstVersionId, ordinal: 1 },
      ]);
      await adminDatabase.db.insert(activityAssignments).values({
        participantId,
        activityId,
        status: "DISPONIVEL",
      });
      await adminDatabase.db.insert(attempts).values({
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
      await adminDatabase.db.delete(attempts).where(eq(attempts.id, attemptId));
      await adminDatabase.db
        .delete(activityAssignments)
        .where(eq(activityAssignments.activityId, activityId));
      await adminDatabase.db
        .delete(learningActivityItems)
        .where(eq(learningActivityItems.activityId, activityId));
      await adminDatabase.db
        .delete(learningActivities)
        .where(eq(learningActivities.id, activityId));
      await adminDatabase.db
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
      await Promise.all([database.close(), adminDatabase.close()]);
    }
  });
});
