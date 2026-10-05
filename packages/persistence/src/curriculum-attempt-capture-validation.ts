import type { InferSelectModel } from "drizzle-orm";
import { ApplicationError } from "@cvg/application";
import type * as schema from "./schema.js";
import { hasCanonicalChoiceResponseEncoding } from "./published-choice-response.js";

export type PublishedCurriculumCaptureInput = Readonly<{
  form: InferSelectModel<typeof schema.curriculumFormVersions>;
  blueprint: InferSelectModel<typeof schema.curriculumBlueprintVersions>;
  items: readonly InferSelectModel<typeof schema.curriculumFormItems>[];
  activity: Readonly<{ scopeId: string; moduleId: string | null }>;
  activityItems: readonly Readonly<{
    contentVersionId: string;
    ordinal: number;
  }>[];
  contentVersions: readonly InferSelectModel<typeof schema.contentVersions>[];
  expectedScopeId: string;
  now: Date;
}>;

type FrozenItem = PublishedCurriculumCaptureInput["items"][number];
type CatalogItem = FrozenItem["catalogItem"];
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

function requireCapture(condition: unknown): asserts condition {
  if (!condition)
    throw new ApplicationError(
      "state_conflict",
      "Published curriculum capture is inconsistent",
    );
}
function isText(value: unknown, max = 20_000): value is string {
  return (
    typeof value === "string" && value.trim().length > 0 && value.length <= max
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
function canonicalPublicText(
  value: unknown,
  max: number,
  plain = false,
): value is string {
  return (
    isText(value, max) &&
    value === value.trim() &&
    (!plain || !/<[^>]*>/u.test(value))
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

function assertPublicationIdentity(
  input: PublishedCurriculumCaptureInput,
): void {
  const { form, blueprint, activity, expectedScopeId, now } = input;
  requireCapture(
    isUuid(expectedScopeId) &&
      form.scopeId === expectedScopeId &&
      blueprint.scopeId === expectedScopeId &&
      activity.scopeId === expectedScopeId,
  );
  requireCapture(
    isUuid(form.id) &&
      isUuid(blueprint.id) &&
      form.blueprintVersionId === blueprint.id,
  );
  requireCapture(
    isText(form.formId, 200) && isText(blueprint.blueprintId, 200),
  );
  requireCapture(
    positiveInteger(form.version) && positiveInteger(blueprint.version),
  );
  requireCapture(
    typeof form.moduleId === "string" &&
      /^M(0[1-9]|1[0-9]|2[0-4])$/u.test(form.moduleId) &&
      blueprint.moduleId === form.moduleId &&
      activity.moduleId === form.moduleId,
  );
  requireCapture(
    form.status === "PUBLICADO" &&
      (form.mode === "MODULE_COMPLETION" || form.mode === "FORMATIVE_CHOICE"),
  );
  requireCapture(
    isUuid(form.publicationDecisionId) &&
      isUuid(form.publishedBy) &&
      isUuid(blueprint.approvalDecisionId) &&
      isUuid(blueprint.approvedBy),
  );
  requireCapture(
    validDate(now) &&
      validDate(form.publishedAt) &&
      validDate(blueprint.approvedAt),
  );
  requireCapture(
    blueprint.approvedAt.getTime() <= form.publishedAt.getTime() &&
      form.publishedAt.getTime() <= now.getTime(),
  );
}

function manifestEntries(
  m: PublishedCurriculumCaptureInput["blueprint"]["manifest"],
  moduleId: string,
) {
  return new Map(
    m.itemManifest.map((item) => {
      requireCapture(
        exactKeys(item, [
          "itemId",
          "objectiveId",
          "responseMode",
          "critical",
          "sessionId",
        ]),
      );
      requireCapture(
        isText(item.itemId, 200) && m.objectiveIds.includes(item.objectiveId),
      );
      requireCapture(
        (item.responseMode === "CHOICE" || item.responseMode === "TEXT") &&
          typeof item.critical === "boolean",
      );
      requireCapture(
        new RegExp(`^${moduleId}-S[1-4]$`, "u").test(item.sessionId),
      );
      return [item.itemId, item] as const;
    }),
  );
}

function assertManifest(input: PublishedCurriculumCaptureInput): void {
  const { form, blueprint, items } = input;
  const m = blueprint.manifest;
  requireCapture(
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
  requireCapture(
    m.version === blueprint.version &&
      m.approvalDecisionId === blueprint.approvalDecisionId &&
      m.moduleId === form.moduleId,
  );
  requireCapture(
    positiveInteger(m.questionTotal, 100) &&
      positiveInteger(m.openResponseCount, 100) &&
      m.questionTotal + m.openResponseCount <= 100,
  );
  requireCapture(
    uniqueStrings(m.objectiveIds) &&
      Array.isArray(m.itemManifest) &&
      Array.isArray(items),
  );
  requireCapture(
    items.length === m.questionTotal + m.openResponseCount &&
      m.itemManifest.length === items.length,
  );
  const manifest = manifestEntries(m, form.moduleId);
  requireCapture(
    manifest.size === items.length &&
      new Set(items.map((item) => item.canonicalItemId)).size === items.length,
  );
  for (const item of items) {
    const c = item.catalogItem,
      expected = manifest.get(item.canonicalItemId);
    requireCapture(
      expected !== undefined &&
        c.id === item.canonicalItemId &&
        c.moduleId === form.moduleId,
    );
    requireCapture(
      c.objectiveId === expected.objectiveId &&
        c.responseMode === expected.responseMode &&
        c.critical === expected.critical &&
        c.sessionId === expected.sessionId,
    );
    requireCapture(m.objectiveIds.includes(c.remediationTargetObjectiveId));
  }
  requireCapture(
    items.filter((item) => item.catalogItem.responseMode === "CHOICE")
      .length === m.questionTotal,
  );
  requireCapture(
    items.filter((item) => item.catalogItem.responseMode === "TEXT").length ===
      m.openResponseCount,
  );
  requireCapture(
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
  requireCapture(exactKeys(c, [...baseKeys, ...modeKeys]));
  requireCapture(
    isText(c.title) &&
      isText(c.prompt) &&
      isText(c.feedback) &&
      itemKinds.has(c.kind),
  );
  requireCapture(
    Array.isArray(c.sourceRefs) &&
      c.sourceRefs.length > 0 &&
      c.sourceRefs.length <= 20,
  );
  for (const source of c.sourceRefs) {
    requireCapture(exactKeys(source, ["code", "locator", "updateRequired"]));
    requireCapture(
      sourceCodes.has(source.code) &&
        isText(source.locator) &&
        typeof source.updateRequired === "boolean",
    );
  }
  if (c.responseMode === "TEXT") assertRubric(c.rubric);
}

function assertRubric(value: CatalogItem["rubric"]): void {
  requireCapture(
    exactKeys(value, ["dimensions", "passScore", "criticalErrors"]),
  );
  requireCapture(
    value !== undefined &&
      Number.isFinite(value.passScore) &&
      value.passScore > 0 &&
      value.passScore <= 100,
  );
  requireCapture(uniqueStrings(value.criticalErrors, 100, 20_000));
  requireCapture(
    Array.isArray(value.dimensions) &&
      value.dimensions.length > 0 &&
      value.dimensions.length <= 100,
  );
  const ids = new Set<string>();
  for (const dimension of value.dimensions) {
    requireCapture(
      exactKeys(dimension, ["id", "label", "description", "maxPoints"]),
    );
    requireCapture(
      isText(dimension.id, 200) &&
        isText(dimension.label) &&
        isText(dimension.description),
    );
    requireCapture(
      Number.isFinite(dimension.maxPoints) &&
        dimension.maxPoints > 0 &&
        !ids.has(dimension.id),
    );
    ids.add(dimension.id);
  }
}

function assertChoiceMetadata(
  item: FrozenItem,
  content: PublishedCurriculumCaptureInput["contentVersions"][number],
): void {
  const { catalogItem: c, publicItem: p } = item;
  requireCapture(
    Array.isArray(c.choices) && c.choices.length >= 2 && c.choices.length <= 12,
  );
  const ids = new Set<string>();
  for (const choice of c.choices) {
    requireCapture(exactKeys(choice, ["id", "label", "text"]));
    requireCapture(
      canonicalPublicText(choice.id, 32, true) &&
        canonicalPublicText(choice.label, 16) &&
        canonicalPublicText(choice.text, 2_000, true) &&
        !ids.has(choice.id),
    );
    ids.add(choice.id);
  }
  requireCapture(
    uniqueStrings(c.correctChoiceIds, 12) &&
      c.correctChoiceIds.every((id) => ids.has(id)),
  );
  requireCapture(
    p.selectionMode === "SINGLE" || p.selectionMode === "MULTIPLE",
  );
  requireCapture(hasCanonicalChoiceResponseEncoding([...ids], p.selectionMode));
  requireCapture(
    content.participantSelectionMode === p.selectionMode &&
      (p.selectionMode !== "SINGLE" || c.correctChoiceIds.length === 1),
  );
  requireCapture(
    sameJson(p.choices, c.choices) &&
      sameJson(content.participantOptions, c.choices),
  );
}

function assertFrozenItem(
  input: PublishedCurriculumCaptureInput,
  item: FrozenItem,
  content: PublishedCurriculumCaptureInput["contentVersions"][number],
): void {
  const { form, expectedScopeId } = input,
    { catalogItem: c, publicItem: p } = item;
  requireCapture(
    item.formVersionId === form.id && item.scopeId === expectedScopeId,
  );
  requireCapture(
    isUuid(item.contentVersionId) &&
      isUuid(item.contentId) &&
      positiveInteger(item.contentVersion) &&
      positiveInteger(item.ordinal, 100),
  );
  requireCapture(c.ordinal === item.ordinal);
  requireCapture(
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
  requireCapture(exactKeys(p, publicKeys));
  requireCapture(
    p.itemId === item.contentVersionId &&
      p.ordinal === item.ordinal &&
      (p.kind === "QUESTAO" || p.kind === "CASO"),
  );
  requireCapture(
    canonicalPublicText(p.title, 300, true) &&
      canonicalPublicText(p.text, 20_000, true) &&
      p.title === c.title &&
      p.text === c.prompt &&
      p.responseMode === c.responseMode,
  );
  requireCapture(
    content.kind === p.kind &&
      content.title === p.title &&
      content.participantText === p.text &&
      content.responseMode === p.responseMode,
  );
  if (c.responseMode === "CHOICE") assertChoiceMetadata(item, content);
  else
    requireCapture(
      content.participantOptions === null &&
        content.participantSelectionMode === null,
    );
}

function assertCompleteBindings(input: PublishedCurriculumCaptureInput): void {
  const { items, activityItems, contentVersions } = input;
  requireCapture(
    Array.isArray(activityItems) && Array.isArray(contentVersions),
  );
  requireCapture(
    activityItems.length === items.length &&
      contentVersions.length === items.length,
  );
  const activity = new Map(
    activityItems.map((item) => {
      requireCapture(
        exactKeys(item, ["contentVersionId", "ordinal"]) &&
          isUuid(item.contentVersionId) &&
          positiveInteger(item.ordinal, 100),
      );
      return [item.contentVersionId, item.ordinal] as const;
    }),
  );
  const content = new Map(contentVersions.map((row) => [row.id, row]));
  requireCapture(
    activity.size === items.length && content.size === items.length,
  );
  requireCapture(
    new Set(items.map((item) => item.contentVersionId)).size === items.length &&
      new Set(items.map((item) => item.ordinal)).size === items.length,
  );
  for (const item of items) {
    const row = content.get(item.contentVersionId);
    requireCapture(
      row !== undefined && activity.get(item.contentVersionId) === item.ordinal,
    );
    assertFrozenItem(input, item, row);
  }
}

/** Validates trusted server rows; does not establish audit authorization or clinical approval. */
export function assertPublishedCurriculumCapture(
  input: PublishedCurriculumCaptureInput,
): void {
  try {
    assertPublicationIdentity(input);
    assertManifest(input);
    assertCompleteBindings(input);
  } catch {
    // Malformed persisted JSON and inconsistent metadata share one fail-closed result.
    throw new ApplicationError(
      "state_conflict",
      "Published curriculum capture is inconsistent",
    );
  }
}
