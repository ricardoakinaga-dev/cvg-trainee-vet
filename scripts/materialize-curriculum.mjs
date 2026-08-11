import { createHash } from "node:crypto";

import { inArray } from "drizzle-orm";

import { runAuthoringPreflight } from "../packages/application/dist/index.js";
import { createCurriculumMaterializationPlan } from "../packages/curriculum/dist/index.js";
import { createPostgresDatabase } from "../packages/persistence/dist/database.js";
import {
  accounts,
  contentEditorialRecords,
  contentVersions,
  curriculumRuntimeStates,
  learningActivities,
  learningActivityItems,
  learningAssignments,
} from "../packages/persistence/dist/schema.js";

const databaseUrl =
  process.env.CVG_CURRICULUM_ADMIN_DATABASE_URL ?? process.env.DATABASE_URL;
const scopeId = process.env.CVG_CURRICULUM_SCOPE_ID;
const authorId = process.env.CVG_CURRICULUM_AUTHOR_ID;
const participantId = process.env.CVG_CURRICULUM_PARTICIPANT_ID;
const availableAt =
  process.env.CVG_CURRICULUM_AVAILABLE_AT ?? new Date().toISOString();

if (databaseUrl === undefined) {
  throw new Error(
    "CVG_CURRICULUM_ADMIN_DATABASE_URL or DATABASE_URL is required",
  );
}
if (
  scopeId === undefined ||
  authorId === undefined ||
  participantId === undefined
) {
  throw new Error(
    "CVG_CURRICULUM_SCOPE_ID, CVG_CURRICULUM_AUTHOR_ID and CVG_CURRICULUM_PARTICIPANT_ID are required",
  );
}

function stableUuid(key) {
  const digest = createHash("sha256").update(key).digest("hex");
  const variant = `8${digest.slice(17, 20)}`;
  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-4${digest.slice(13, 16)}-${variant}-${digest.slice(20, 32)}`;
}

function authoringItemForPersistence(item) {
  return {
    title: item.title,
    prompt: item.prompt,
    responseMode: item.responseMode,
    ...(item.choices === undefined ? {} : { choices: item.choices }),
    ...(item.correctChoiceIds === undefined
      ? {}
      : { correctChoiceIds: item.correctChoiceIds }),
    ...(item.rubric === undefined ? {} : { rubric: item.rubric }),
    feedback: item.feedback,
    critical: item.critical,
    remediationTargetObjectiveId: item.remediationTargetObjectiveId,
    sourceRefs: item.sourceRefs,
    participant: item.participant,
  };
}

function assertMembership(account, expectedId, field) {
  if (account === undefined || account.id !== expectedId) {
    throw new Error(`${field} account was not found`);
  }
  if (!account.scopes.includes(scopeId)) {
    throw new Error(`${field} account is outside the requested scope`);
  }
}

async function main() {
  const database = createPostgresDatabase(databaseUrl, {
    maxConnections: 2,
    requireLeastPrivilege: false,
  });
  try {
    await database.healthcheck();
    const plan = createCurriculumMaterializationPlan({
      scopeId,
      authorId,
      participantId,
      availableAt,
    });
    const identityRows = await database.db
      .select({
        id: accounts.id,
        roles: accounts.roles,
        scopes: accounts.scopes,
      })
      .from(accounts)
      .where(inArray(accounts.id, [authorId, participantId]));
    const author = identityRows.find((account) => account.id === authorId);
    const participant = identityRows.find(
      (account) => account.id === participantId,
    );
    assertMembership(author, authorId, "author");
    assertMembership(participant, participantId, "participant");

    let contentCount = 0;
    let editorialCount = 0;
    let activityCount = 0;
    let activityItemCount = 0;
    let assignmentCount = 0;
    let runtimeCount = 0;

    await database.db.transaction(async (transaction) => {
      for (const module of plan.modules) {
        const activityInserted = await transaction
          .insert(learningActivities)
          .values({
            id: module.activityId,
            scopeId: plan.scopeId,
            slug: module.slug,
            title: module.title,
            status: module.activityStatus,
          })
          .onConflictDoNothing()
          .returning({ id: learningActivities.id });
        activityCount += activityInserted.length;

        const assignmentInserted = await transaction
          .insert(learningAssignments)
          .values({
            id: stableUuid(
              `curriculum-assignment:${plan.participantId}:${plan.scopeId}:${module.moduleId}`,
            ),
            participantId: plan.participantId,
            scopeId: plan.scopeId,
            moduleId: module.moduleId,
            availableAt: new Date(module.availableAt),
            status: module.assignmentStatus,
            version: 0,
            blockReason: null,
            pausedFrom: null,
          })
          .onConflictDoNothing()
          .returning({ id: learningAssignments.id });
        assignmentCount += assignmentInserted.length;

        const runtimeInserted = await transaction
          .insert(curriculumRuntimeStates)
          .values({
            id: stableUuid(
              `curriculum-runtime:${plan.participantId}:${plan.scopeId}:${module.moduleId}`,
            ),
            participantId: plan.participantId,
            scopeId: plan.scopeId,
            moduleId: module.moduleId,
            version: 1,
            state: module.runtimeState,
          })
          .onConflictDoNothing()
          .returning({ id: curriculumRuntimeStates.id });
        runtimeCount += runtimeInserted.length;

        for (const item of module.items) {
          const contentInserted = await transaction
            .insert(contentVersions)
            .values({
              id: item.contentId,
              contentId: item.contentId,
              scopeId: plan.scopeId,
              version: 1,
              status: module.contentStatus,
              kind: item.responseMode === "TEXT" ? "CASO" : "QUESTAO",
              title: item.title,
              participantText: item.participantText,
              responseMode: item.responseMode,
              ...(item.participantOptions === undefined
                ? {}
                : { participantOptions: item.participantOptions }),
              ...(item.participantSelectionMode === undefined
                ? {}
                : { participantSelectionMode: item.participantSelectionMode }),
            })
            .onConflictDoNothing()
            .returning({ id: contentVersions.id });
          contentCount += contentInserted.length;

          const editorialRecordId = stableUuid(
            `curriculum-editorial:${plan.scopeId}:${item.contentId}`,
          );
          const authoringRecord = {
            editorialRecordId,
            contentId: item.contentId,
            version: 1,
            contentVersionId: item.contentId,
            scopeId: plan.scopeId,
            moduleId: item.moduleId,
            sessionId: item.sessionId,
            objectiveId: item.objectiveId,
            authorId: plan.authorId,
            ...item.authoringItem,
            contentStatus: module.contentStatus,
          };
          const preflight = runAuthoringPreflight(authoringRecord);
          const editorialInserted = await transaction
            .insert(contentEditorialRecords)
            .values({
              id: editorialRecordId,
              contentVersionId: item.contentId,
              contentId: item.contentId,
              scopeId: plan.scopeId,
              version: 1,
              moduleId: item.moduleId,
              sessionId: item.sessionId,
              objectiveId: item.objectiveId,
              authorId: plan.authorId,
              item: authoringItemForPersistence(item.authoringItem),
              preflight,
            })
            .onConflictDoNothing()
            .returning({ id: contentEditorialRecords.id });
          editorialCount += editorialInserted.length;

          const activityItemInserted = await transaction
            .insert(learningActivityItems)
            .values({
              activityId: module.activityId,
              contentVersionId: item.contentId,
              ordinal: item.ordinal,
            })
            .onConflictDoNothing()
            .returning({ activityId: learningActivityItems.activityId });
          activityItemCount += activityItemInserted.length;
        }
      }
    });

    console.log(
      JSON.stringify({
        success: true,
        modules: plan.modules.length,
        contentInserted: contentCount,
        editorialInserted: editorialCount,
        activitiesInserted: activityCount,
        activityItemsInserted: activityItemCount,
        assignmentsInserted: assignmentCount,
        runtimeStatesInserted: runtimeCount,
        contentStatus: "PROJECAO_VERIFICADA",
        activityStatus: "WITHDRAWN",
        assignmentStatus: "NAO_ATRIBUIDO",
        runtimeStatus: "PENDENTE",
      }),
    );
  } finally {
    await database.close();
  }
}

await main();
