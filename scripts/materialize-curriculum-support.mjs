import { createHash } from "node:crypto";

export function stableUuid(key) {
  const digest = createHash("sha256").update(key).digest("hex");
  const variant = `8${digest.slice(17, 20)}`;
  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-4${digest.slice(13, 16)}-${variant}-${digest.slice(20, 32)}`;
}

export function authoringItemForPersistence(item) {
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

export function assertMembership(account, expectedId, field, scopeId) {
  if (account === undefined || account.id !== expectedId) {
    throw new Error(`${field} account was not found`);
  }
  if (!account.scopes.includes(scopeId)) {
    throw new Error(`${field} account is outside the requested scope`);
  }
}

export function createMaterializationReport(plan, counts) {
  return Object.freeze({
    success: true,
    modules: plan.modules.length,
    contentInserted: counts.contentCount,
    editorialInserted: counts.editorialCount,
    activitiesInserted: counts.activityCount,
    activityItemsInserted: counts.activityItemCount,
    assignmentsInserted: counts.assignmentCount,
    runtimeStatesInserted: counts.runtimeCount,
    contentStatus: "PROJECAO_VERIFICADA",
    activityStatus: "WITHDRAWN",
    assignmentStatus: "NAO_ATRIBUIDO",
    runtimeStatus: "PENDENTE",
  });
}
