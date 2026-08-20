import { inArray } from "drizzle-orm";

import { runAuthoringPreflight } from "../packages/application/dist/index.js";
import {
  accounts,
  contentEditorialRecords,
  contentVersions,
  curriculumRuntimeStates,
  learningActivities,
  learningActivityItems,
  learningAssignments,
} from "../packages/persistence/dist/schema.js";
import {
  authoringItemForPersistence,
  stableUuid,
} from "./materialize-curriculum-support.mjs";

const EMPTY_COUNTS = Object.freeze({
  contentCount: 0,
  editorialCount: 0,
  activityCount: 0,
  activityItemCount: 0,
  assignmentCount: 0,
  runtimeCount: 0,
});

function addCounts(left, right) {
  return Object.freeze({
    contentCount: left.contentCount + right.contentCount,
    editorialCount: left.editorialCount + right.editorialCount,
    activityCount: left.activityCount + right.activityCount,
    activityItemCount: left.activityItemCount + right.activityItemCount,
    assignmentCount: left.assignmentCount + right.assignmentCount,
    runtimeCount: left.runtimeCount + right.runtimeCount,
  });
}

async function insertActivity(transaction, scopeId, module) {
  const inserted = await transaction
    .insert(learningActivities)
    .values({
      id: module.activityId,
      scopeId,
      slug: module.slug,
      title: module.title,
      status: module.activityStatus,
    })
    .onConflictDoNothing()
    .returning({ id: learningActivities.id });
  return inserted.length;
}

async function insertAssignment(transaction, plan, module) {
  const inserted = await transaction
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
  return inserted.length;
}

async function insertRuntimeState(transaction, plan, module) {
  const inserted = await transaction
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
  return inserted.length;
}

function createAuthoringRecord(plan, module, item, editorialRecordId) {
  return {
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
}

async function insertContentVersion(transaction, plan, module, item) {
  const inserted = await transaction
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
  return inserted.length;
}

async function insertEditorialRecord(transaction, plan, module, item) {
  const editorialRecordId = stableUuid(
    `curriculum-editorial:${plan.scopeId}:${item.contentId}`,
  );
  const authoringRecord = createAuthoringRecord(
    plan,
    module,
    item,
    editorialRecordId,
  );
  const inserted = await transaction
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
      preflight: runAuthoringPreflight(authoringRecord),
    })
    .onConflictDoNothing()
    .returning({ id: contentEditorialRecords.id });
  return inserted.length;
}

async function insertActivityItem(transaction, module, item) {
  const inserted = await transaction
    .insert(learningActivityItems)
    .values({
      activityId: module.activityId,
      contentVersionId: item.contentId,
      ordinal: item.ordinal,
    })
    .onConflictDoNothing()
    .returning({ activityId: learningActivityItems.activityId });
  return inserted.length;
}

async function materializeItem(transaction, plan, module, item) {
  const contentCount = await insertContentVersion(
    transaction,
    plan,
    module,
    item,
  );
  const editorialCount = await insertEditorialRecord(
    transaction,
    plan,
    module,
    item,
  );
  const activityItemCount = await insertActivityItem(transaction, module, item);
  return Object.freeze({
    ...EMPTY_COUNTS,
    contentCount,
    editorialCount,
    activityItemCount,
  });
}

async function materializeItems(transaction, plan, module) {
  let counts = EMPTY_COUNTS;
  for (const item of module.items) {
    counts = addCounts(
      counts,
      await materializeItem(transaction, plan, module, item),
    );
  }
  return counts;
}

async function materializeModule(transaction, plan, module) {
  const baseCounts = Object.freeze({
    ...EMPTY_COUNTS,
    activityCount: await insertActivity(transaction, plan.scopeId, module),
    assignmentCount: await insertAssignment(transaction, plan, module),
    runtimeCount: await insertRuntimeState(transaction, plan, module),
  });
  return addCounts(
    baseCounts,
    await materializeItems(transaction, plan, module),
  );
}

export async function materializeCurriculum(transaction, plan) {
  let counts = EMPTY_COUNTS;
  for (const module of plan.modules) {
    counts = addCounts(
      counts,
      await materializeModule(transaction, plan, module),
    );
  }
  return counts;
}

export async function loadCurriculumIdentities(database, plan) {
  const identityRows = await database.db
    .select({
      id: accounts.id,
      roles: accounts.roles,
      scopes: accounts.scopes,
    })
    .from(accounts)
    .where(inArray(accounts.id, [plan.authorId, plan.participantId]));
  return Object.freeze({
    author: identityRows.find((account) => account.id === plan.authorId),
    participant: identityRows.find(
      (account) => account.id === plan.participantId,
    ),
  });
}
