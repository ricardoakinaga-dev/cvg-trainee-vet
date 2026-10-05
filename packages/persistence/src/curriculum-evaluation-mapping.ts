import type { InferSelectModel } from "drizzle-orm";
import {
  ApplicationError,
  type CurriculumEvaluationAttempt,
  type EvaluateCurriculumModuleCommand,
} from "@cvg/application";
import type * as schema from "./schema.js";
import { hasCanonicalChoiceResponseEncoding } from "./published-choice-response.js";
import {
  decodeNativeAttemptAnswers,
  type NativeAttemptAnswerBinding,
} from "./curriculum-attempt-answers.js";

export type NativeCurriculumEvaluationRows = Readonly<{
  attempt: InferSelectModel<typeof schema.attempts>;
  activity: InferSelectModel<typeof schema.learningActivities>;
  binding: InferSelectModel<typeof schema.curriculumAttemptForms>;
  form: InferSelectModel<typeof schema.curriculumFormVersions>;
  blueprint: InferSelectModel<typeof schema.curriculumBlueprintVersions>;
  items: readonly InferSelectModel<typeof schema.curriculumAttemptItems>[];
  formItems: readonly InferSelectModel<typeof schema.curriculumFormItems>[];
  contentVersions: readonly InferSelectModel<typeof schema.contentVersions>[];
  answers: readonly InferSelectModel<typeof schema.answers>[];
  now: Date;
}>;
type FrozenItem = NativeCurriculumEvaluationRows["formItems"][number];
type CatalogItem = FrozenItem["catalogItem"];
type SubmittedStatus = CurriculumEvaluationAttempt["status"];
const submittedStatuses = new Set<SubmittedStatus>([
  "SUBMETIDA",
  "AGUARDA_CORRECAO_HUMANA",
  "CORRIGIDA_AUTOMATICAMENTE",
  "CORRIGIDA_HUMANAMENTE",
]);
function submittedStatus(value: unknown): value is SubmittedStatus {
  return (
    typeof value === "string" && submittedStatuses.has(value as SubmittedStatus)
  );
}
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const sourceCodes = new Set([
  "F-01",
  "F-02",
  "F-03",
  "AAHA-2024",
  "RECOVER-2024",
  "WSAVA-2022",
  "AVHTM-TRACS-2021",
]);
const itemKinds = new Set([
  "RECUPERACAO_ATIVA",
  "CASO_PROGRESSIVO",
  "SIMULACAO_DIGITAL",
  "DEBRIEFING",
  "RETENCAO_ESPACADA",
]);

function requireConsistent(condition: unknown): asserts condition {
  if (!condition)
    throw new ApplicationError(
      "state_conflict",
      "Captured curriculum evaluation is inconsistent",
    );
}
function isText(value: unknown, max = 20_000): value is string {
  return (
    typeof value === "string" && value.trim().length > 0 && value.length <= max
  );
}
// Mirror learning.ts public field constraints without normalizing the snapshot.
function canonicalPublicText(
  value: unknown,
  max: number,
  plain = true,
): value is string {
  return (
    isText(value, max) &&
    value === value.trim() &&
    (!plain || !/<[^>]*>/u.test(value))
  );
}
function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}
function positiveInteger(
  value: unknown,
  max = Number.MAX_SAFE_INTEGER,
): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 1 &&
    value <= max
  );
}
function validDate(value: unknown): value is Date {
  return value instanceof Date && Number.isFinite(value.getTime());
}
function record(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}
function exactKeys(value: unknown, keys: readonly string[]): boolean {
  return (
    record(value) &&
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}
// JSON object key order is not significant; array order and every value are.
function sameJson(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      Array.from({ length: left.length }, (_, i) => i).every(
        (i) =>
          Object.hasOwn(left, i) &&
          Object.hasOwn(right, i) &&
          sameJson(left[i], right[i]),
      )
    );
  }
  if (!record(left) || !record(right)) return false;
  const keys = Object.keys(left);
  return (
    exactKeys(right, keys) &&
    keys.every((key) => sameJson(left[key], right[key]))
  );
}
function uniqueStrings(
  values: unknown,
  max = 100,
  maxText = 200,
): values is string[] {
  return (
    Array.isArray(values) &&
    values.length > 0 &&
    values.length <= max &&
    Array.from(values).every((value) => isText(value, maxText)) &&
    new Set(values).size === values.length
  );
}

function assertServerIdentity(
  input: NativeCurriculumEvaluationRows,
  command: EvaluateCurriculumModuleCommand,
): void {
  const { attempt, activity, binding, form, blueprint, now } = input;
  requireConsistent(
    exactKeys(command, [
      "participantId",
      "scopeId",
      "moduleId",
      "attemptId",
      "attemptVersion",
      "formVersion",
    ]),
  );
  requireConsistent(
    isUuid(command.participantId) &&
      isUuid(command.scopeId) &&
      isUuid(command.attemptId),
  );
  requireConsistent(
    typeof command.moduleId === "string" &&
      /^M(0[1-9]|1[0-9]|2[0-4])$/u.test(command.moduleId),
  );
  requireConsistent(
    Number.isSafeInteger(command.attemptVersion) &&
      command.attemptVersion >= 0 &&
      positiveInteger(command.formVersion),
  );
  requireConsistent(
    attempt.id === command.attemptId &&
      attempt.participantId === command.participantId &&
      attempt.version === command.attemptVersion &&
      submittedStatus(attempt.status),
  );
  requireConsistent(
    isUuid(activity.id) &&
      attempt.activityId === activity.id &&
      activity.status === "PUBLISHED",
  );
  requireConsistent(
    binding.attemptId === attempt.id &&
      binding.participantId === attempt.participantId &&
      binding.formVersionId === form.id,
  );
  requireConsistent(
    [activity, binding, form, blueprint].every(
      (row) =>
        row.scopeId === command.scopeId && row.moduleId === command.moduleId,
    ),
  );
  requireConsistent(
    isUuid(form.id) &&
      isUuid(blueprint.id) &&
      form.blueprintVersionId === blueprint.id,
  );
  requireConsistent(
    isText(form.formId, 200) &&
      isText(blueprint.blueprintId, 200) &&
      form.version === command.formVersion &&
      positiveInteger(blueprint.version),
  );
  requireConsistent(
    form.status === "PUBLICADO" &&
      (form.mode === "MODULE_COMPLETION" || form.mode === "FORMATIVE_CHOICE"),
  );
  requireConsistent(
    isUuid(form.publicationDecisionId) &&
      isUuid(form.publishedBy) &&
      isUuid(blueprint.approvalDecisionId) &&
      isUuid(blueprint.approvedBy),
  );
  requireConsistent(
    validDate(now) &&
      validDate(attempt.submittedAt) &&
      validDate(form.publishedAt) &&
      validDate(blueprint.approvedAt) &&
      validDate(binding.capturedAt),
  );
  requireConsistent(
    blueprint.approvedAt.getTime() <= form.publishedAt.getTime() &&
      form.publishedAt.getTime() <= binding.capturedAt.getTime() &&
      binding.capturedAt.getTime() <= attempt.submittedAt.getTime() &&
      attempt.submittedAt.getTime() <= now.getTime(),
  );
}
function manifestEntries(
  m: NativeCurriculumEvaluationRows["blueprint"]["manifest"],
  moduleId: string,
) {
  return new Map(
    m.itemManifest.map((item) => {
      requireConsistent(
        exactKeys(item, [
          "itemId",
          "objectiveId",
          "responseMode",
          "critical",
          "sessionId",
        ]),
      );
      requireConsistent(
        isText(item.itemId, 200) && m.objectiveIds.includes(item.objectiveId),
      );
      requireConsistent(
        (item.responseMode === "CHOICE" || item.responseMode === "TEXT") &&
          typeof item.critical === "boolean",
      );
      requireConsistent(
        isText(item.sessionId, 200) &&
          new RegExp(`^${moduleId}-S[1-4]$`, "u").test(item.sessionId),
      );
      return [item.itemId, item] as const;
    }),
  );
}

function assertManifest(input: NativeCurriculumEvaluationRows): void {
  const { form, blueprint, formItems: items } = input;
  const m = blueprint.manifest;
  requireConsistent(
    exactKeys(m, [
      "version",
      "approvalDecisionId",
      "moduleId",
      "questionTotal",
      "openResponseCount",
      "objectiveIds",
      "itemManifest",
    ]),
  );
  requireConsistent(
    m.version === blueprint.version &&
      m.approvalDecisionId === blueprint.approvalDecisionId &&
      m.moduleId === form.moduleId,
  );
  requireConsistent(
    positiveInteger(m.questionTotal, 100) &&
      positiveInteger(m.openResponseCount, 100) &&
      m.questionTotal + m.openResponseCount <= 100,
  );
  // Both modes feed the existing application consumer's complete-module guard.
  requireConsistent(
    uniqueStrings(m.objectiveIds) &&
      Array.isArray(m.itemManifest) &&
      Array.isArray(items),
  );
  requireConsistent(
    items.length === m.questionTotal + m.openResponseCount &&
      m.itemManifest.length === items.length,
  );
  const manifest = manifestEntries(m, form.moduleId);
  requireConsistent(
    manifest.size === items.length &&
      new Set(items.map((item) => item.canonicalItemId)).size === items.length,
  );
  for (const item of items) {
    const c = item.catalogItem,
      expected = manifest.get(item.canonicalItemId);
    requireConsistent(
      expected !== undefined &&
        c.id === item.canonicalItemId &&
        c.moduleId === form.moduleId,
    );
    requireConsistent(
      c.objectiveId === expected.objectiveId &&
        c.responseMode === expected.responseMode &&
        c.critical === expected.critical &&
        c.sessionId === expected.sessionId,
    );
    requireConsistent(m.objectiveIds.includes(c.remediationTargetObjectiveId));
  }
  requireConsistent(
    items.filter((item) => item.catalogItem.responseMode === "CHOICE")
      .length === m.questionTotal,
  );
  requireConsistent(
    items.filter((item) => item.catalogItem.responseMode === "TEXT").length ===
      m.openResponseCount,
  );
  requireConsistent(
    m.objectiveIds.every((id) =>
      items.some((item) => item.catalogItem.objectiveId === id),
    ),
  );
}

function assertPrivateMetadata(c: CatalogItem): void {
  const baseKeys = [
    "id",
    "moduleId",
    "sessionId",
    "ordinal",
    "objectiveId",
    "kind",
    "responseMode",
    "title",
    "prompt",
    "feedback",
    "critical",
    "remediationTargetObjectiveId",
    "sourceRefs",
  ];
  const modeKeys =
    c.responseMode === "CHOICE" ? ["choices", "correctChoiceIds"] : ["rubric"];
  requireConsistent(exactKeys(c, [...baseKeys, ...modeKeys]));
  requireConsistent(
    canonicalPublicText(c.title, 300) &&
      canonicalPublicText(c.prompt, 20_000) &&
      isText(c.feedback) &&
      itemKinds.has(c.kind),
  );
  requireConsistent(
    Array.isArray(c.sourceRefs) &&
      c.sourceRefs.length > 0 &&
      c.sourceRefs.length <= 20,
  );
  for (const source of c.sourceRefs) {
    requireConsistent(exactKeys(source, ["code", "locator", "updateRequired"]));
    requireConsistent(
      sourceCodes.has(source.code) &&
        isText(source.locator) &&
        typeof source.updateRequired === "boolean",
    );
  }
  if (c.responseMode === "TEXT") assertRubric(c.rubric);
}

function assertRubric(value: CatalogItem["rubric"]): void {
  requireConsistent(
    exactKeys(value, ["dimensions", "passScore", "criticalErrors"]),
  );
  requireConsistent(
    value !== undefined &&
      Number.isFinite(value.passScore) &&
      value.passScore > 0 &&
      value.passScore <= 100,
  );
  requireConsistent(uniqueStrings(value.criticalErrors, 100, 20_000));
  requireConsistent(
    Array.isArray(value.dimensions) &&
      value.dimensions.length > 0 &&
      value.dimensions.length <= 100,
  );
  const ids = new Set<string>();
  for (const dimension of value.dimensions) {
    requireConsistent(
      exactKeys(dimension, ["id", "label", "description", "maxPoints"]),
    );
    requireConsistent(
      isText(dimension.id, 200) &&
        isText(dimension.label) &&
        isText(dimension.description),
    );
    requireConsistent(
      Number.isFinite(dimension.maxPoints) &&
        dimension.maxPoints > 0 &&
        !ids.has(dimension.id),
    );
    ids.add(dimension.id);
  }
}

function assertChoiceMetadata(item: FrozenItem): void {
  const { catalogItem: c, publicItem: p } = item;
  requireConsistent(
    Array.isArray(c.choices) && c.choices.length >= 2 && c.choices.length <= 12,
  );
  const ids = new Set<string>();
  for (const choice of c.choices) {
    requireConsistent(exactKeys(choice, ["id", "label", "text"]));
    requireConsistent(
      canonicalPublicText(choice.id, 32) &&
        canonicalPublicText(choice.label, 16, false) &&
        canonicalPublicText(choice.text, 2_000) &&
        !ids.has(choice.id),
    );
    ids.add(choice.id);
  }
  requireConsistent(
    uniqueStrings(c.correctChoiceIds, 12) &&
      c.correctChoiceIds.every((id) => ids.has(id)),
  );
  requireConsistent(
    p.selectionMode === "SINGLE" || p.selectionMode === "MULTIPLE",
  );
  requireConsistent(
    hasCanonicalChoiceResponseEncoding([...ids], p.selectionMode),
  );
  requireConsistent(
    p.selectionMode !== "SINGLE" || c.correctChoiceIds.length === 1,
  );
  requireConsistent(sameJson(p.choices, c.choices));
}
function assertFrozenItem(
  input: NativeCurriculumEvaluationRows,
  item: FrozenItem,
  content: NativeCurriculumEvaluationRows["contentVersions"][number],
): void {
  const {
      form,
      binding: { scopeId: expectedScopeId },
    } = input,
    { catalogItem: c, publicItem: p } = item;
  requireConsistent(
    item.formVersionId === form.id && item.scopeId === expectedScopeId,
  );
  requireConsistent(
    isUuid(item.contentVersionId) &&
      isUuid(item.contentId) &&
      positiveInteger(item.contentVersion) &&
      positiveInteger(item.ordinal, 100),
  );
  requireConsistent(c.ordinal === item.ordinal);
  requireConsistent(
    content.id === item.contentVersionId &&
      content.contentId === item.contentId &&
      content.version === item.contentVersion &&
      content.scopeId === expectedScopeId &&
      content.status === "PUBLICADO",
  );
  assertPrivateMetadata(c);
  const publicKeys = [
    "itemId",
    "ordinal",
    "kind",
    "title",
    "text",
    "responseMode",
    ...(c.responseMode === "CHOICE" ? ["choices", "selectionMode"] : []),
  ];
  requireConsistent(exactKeys(p, publicKeys));
  requireConsistent(
    p.itemId === item.contentVersionId &&
      p.ordinal === item.ordinal &&
      (p.kind === "QUESTAO" || p.kind === "CASO"),
  );
  requireConsistent(
    p.title === c.title &&
      p.text === c.prompt &&
      p.responseMode === c.responseMode,
  );
  if (c.responseMode === "CHOICE") assertChoiceMetadata(item);
}
function assertCompleteCapture(input: NativeCurriculumEvaluationRows): void {
  const { items, formItems, contentVersions, answers, form, attempt } = input;
  requireConsistent(
    Array.isArray(items) &&
      Array.isArray(contentVersions) &&
      Array.isArray(answers),
  );
  requireConsistent(
    [items, formItems, contentVersions, answers].every((rows) =>
      Array.from({ length: rows.length }, (_, index) =>
        Object.hasOwn(rows, index),
      ).every(Boolean),
    ),
  );
  requireConsistent(
    answers.length <= items.length &&
      answers.every((answer) => isUuid(answer.id)) &&
      new Set(answers.map((answer) => answer.id)).size === answers.length,
  );
  requireConsistent(
    items.length === formItems.length &&
      contentVersions.length === formItems.length,
  );
  const captured = new Map(items.map((item) => [item.canonicalItemId, item]));
  const content = new Map(contentVersions.map((row) => [row.id, row]));
  requireConsistent(
    captured.size === formItems.length && content.size === formItems.length,
  );
  requireConsistent(
    new Set(formItems.map((item) => item.contentVersionId)).size ===
      formItems.length &&
      new Set(formItems.map((item) => item.ordinal)).size === formItems.length,
  );
  requireConsistent(
    new Set(items.map((item) => item.itemId)).size === items.length &&
      new Set(items.map((item) => item.ordinal)).size === items.length,
  );
  for (const item of formItems) {
    const row = content.get(item.contentVersionId);
    const copy = captured.get(item.canonicalItemId);
    requireConsistent(row !== undefined && copy !== undefined);
    assertFrozenItem(input, item, row);
    requireConsistent(
      copy.attemptId === attempt.id &&
        copy.formVersionId === form.id &&
        copy.itemId === item.contentVersionId &&
        copy.ordinal === item.ordinal,
    );
    requireConsistent(
      sameJson(copy.catalogItem, item.catalogItem) &&
        sameJson(copy.publicItem, item.publicItem),
    );
  }
}
function freezeTree<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) freezeTree(child);
    Object.freeze(value);
  }
  return value;
}
function capturedAnswerBinding(
  item: NativeCurriculumEvaluationRows["items"][number],
): NativeAttemptAnswerBinding {
  const p = item.publicItem;
  if (p.responseMode === "TEXT")
    return {
      itemId: item.canonicalItemId,
      contentVersionId: item.itemId,
      responseMode: "TEXT",
    };
  requireConsistent(
    p.responseMode === "CHOICE" &&
      p.choices !== undefined &&
      (p.selectionMode === "SINGLE" || p.selectionMode === "MULTIPLE"),
  );
  return {
    itemId: item.canonicalItemId,
    contentVersionId: item.itemId,
    responseMode: p.responseMode,
    choices: p.choices,
    selectionMode: p.selectionMode,
  };
}
function buildEvaluation(
  input: NativeCurriculumEvaluationRows,
): CurriculumEvaluationAttempt {
  const { attempt, binding, form, blueprint } = input;
  requireConsistent(
    submittedStatus(attempt.status) && validDate(attempt.submittedAt),
  );
  const items = [...input.items].sort(
    (left, right) => left.ordinal - right.ordinal,
  );
  const formItems = new Map(
    input.formItems.map((item) => [item.canonicalItemId, item]),
  );
  const catalogItems = items.map((item) => structuredClone(item.catalogItem));
  const versions = items.map((item, index) => {
    const original = formItems.get(item.canonicalItemId);
    const catalog = catalogItems[index];
    requireConsistent(original !== undefined && catalog !== undefined);
    return {
      itemId: item.canonicalItemId,
      contentVersionId: item.itemId,
      version: original.contentVersion,
      sourceRefs: structuredClone(catalog.sourceRefs),
    };
  });
  return freezeTree({
    attemptId: attempt.id,
    participantId: attempt.participantId,
    scopeId: binding.scopeId,
    moduleId: binding.moduleId,
    attemptVersion: attempt.version,
    status: attempt.status,
    submittedAt: attempt.submittedAt.toISOString(),
    mode: form.mode,
    form: {
      formId: form.formId,
      version: form.version,
      blueprintId: blueprint.blueprintId,
      status: "PUBLICADO",
      publication: {
        decisionId: form.publicationDecisionId,
        publishedAt: form.publishedAt.toISOString(),
      },
      blueprint: structuredClone(blueprint.manifest),
      catalog: { moduleId: form.moduleId, items: catalogItems },
      contentVersions: versions,
    },
    answers: decodeNativeAttemptAnswers(
      attempt.id,
      items.map(capturedAnswerBinding),
      input.answers,
    ),
  });
}
/**
 * Maps server-owned rows from an immutable attempt capture. No SQL, evaluation or save.
 * The caller owns authorization, locks and transaction consistency; this validates row consistency.
 * Current content versions are checked only for identity, version, namespace and publication.
 */
export function mapCapturedCurriculumEvaluation(
  input: NativeCurriculumEvaluationRows,
  command: EvaluateCurriculumModuleCommand,
): CurriculumEvaluationAttempt {
  try {
    assertServerIdentity(input, command);
    assertManifest(input);
    assertCompleteCapture(input);
    return buildEvaluation(input);
  } catch {
    throw new ApplicationError(
      "state_conflict",
      "Captured curriculum evaluation is inconsistent",
    );
  }
}
