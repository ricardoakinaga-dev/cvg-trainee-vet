import { ApplicationError } from "@cvg/application";
import type { ModuleAssessmentBlueprint } from "@cvg/curriculum";
import {
  assertPublishedCurriculumCapture,
  type PublishedCurriculumCaptureInput,
} from "./curriculum-attempt-capture-validation.js";
import {
  assertCurriculumPublicationProvenance,
  type CurriculumPublicationDecision,
} from "./curriculum-publication-provenance.js";

type Approval = Readonly<{
  decisionId: string;
  actorId: string;
  at: Date;
}>;
type ItemMembership = Readonly<{
  canonicalItemId: string;
  contentVersionId: string;
  contentId: string;
  contentVersion: number;
  ordinal: number;
}>;
type Obligation = Readonly<{
  id: string;
  activityId: string;
  formVersionId: string;
  formVersion: number;
  blueprintVersionId: string;
  blueprintVersion: number;
  evidenceKind: "CURRICULUM_ATTEMPT";
  items: readonly ItemMembership[];
}>;
type Context = Readonly<{
  assignmentId: string;
  participantId: string;
  scopeId: string;
  moduleId: string;
}>;

/**
 * Proposed internal seam, not an existing native producer or public DTO.
 * The caller must authenticate immutable approvals, complete upstream inventory,
 * assignment ownership and snapshot origin in one authoritative transaction.
 * Readonly describes the contract; it cannot establish database immutability.
 */
export type ApprovedModuleObligationCaptureInput = Readonly<{
  expected: Context;
  now: Date;
  blueprint: Readonly<{
    id: string;
    blueprintId: string;
    version: number;
    scopeId: string;
    moduleId: string;
    approval: Approval;
    snapshot: Pick<
      ModuleAssessmentBlueprint,
      | "questionCountsBySession"
      | "questionTotal"
      | "openResponseCount"
      | "objectiveIds"
    >;
    itemManifest: PublishedCurriculumCaptureInput["blueprint"]["manifest"]["itemManifest"];
  }>;
  manifest: Readonly<{
    id: string;
    version: number;
    scopeId: string;
    moduleId: string;
    blueprintVersionId: string;
    blueprintVersion: number;
    approval: Approval;
    obligations: readonly Obligation[];
  }>;
  // Proposed future audit action/resource pairs are checked by the helper.
  approvals: readonly CurriculumPublicationDecision[];
  binding: Context &
    Readonly<{
      manifestId: string;
      manifestVersion: number;
      blueprintVersionId: string;
      blueprintVersion: number;
      boundAt: Date;
    }>;
  captures: readonly Readonly<{
    activityId: string;
    assignmentId: string;
    activityStatus: "PUBLISHED";
    capture: PublishedCurriculumCaptureInput;
    decisions: readonly CurriculumPublicationDecision[];
  }>[];
}>;

type Input = ApprovedModuleObligationCaptureInput;
type Capture = Input["captures"][number];
type BlueprintItem = Input["blueprint"]["itemManifest"][number];

/**
 * Publication half of the capture contract: the whole approved inventory with
 * no assignment, capture or binding. Still a consistency check, never an
 * approval or completion authority.
 */
export type ApprovedModuleInventoryInput = Readonly<{
  now: Date;
  blueprint: Input["blueprint"];
  manifest: Input["manifest"];
  approvals: readonly CurriculumPublicationDecision[];
}>;

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const contextKeys = ["assignmentId", "participantId", "scopeId", "moduleId"];

function requireCapture(condition: unknown): asserts condition {
  if (!condition)
    throw new ApplicationError(
      "state_conflict",
      "Module obligation capture is inconsistent",
    );
}
function exactKeys(value: unknown, keys: readonly string[]): void {
  requireCapture(
    value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.getPrototypeOf(value) === Object.prototype &&
      Object.keys(value).length === keys.length &&
      keys.every((key) => Object.hasOwn(value, key)),
  );
}
function uuid(value: unknown): void {
  requireCapture(typeof value === "string" && uuidPattern.test(value));
}
function text(value: unknown): void {
  requireCapture(
    typeof value === "string" &&
      value === value.trim() &&
      value.length > 0 &&
      value.length <= 200,
  );
}
function positiveInteger(value: unknown, max = Number.MAX_SAFE_INTEGER): void {
  requireCapture(
    typeof value === "number" &&
      Number.isSafeInteger(value) &&
      value > 0 &&
      value <= max,
  );
}
function validDate(value: unknown): asserts value is Date {
  requireCapture(value instanceof Date && Number.isFinite(value.getTime()));
}
function denseList(value: unknown, max = 100): asserts value is unknown[] {
  requireCapture(
    Array.isArray(value) && value.length > 0 && value.length <= max,
  );
  for (let index = 0; index < value.length; index++)
    requireCapture(Object.hasOwn(value, index));
}
function unique<T>(values: readonly T[]): void {
  requireCapture(new Set(values).size === values.length);
}
function assertContext(expected: Context, actual: Context): void {
  for (const key of ["assignmentId", "participantId", "scopeId"] as const) {
    uuid(expected[key]);
    requireCapture(actual[key] === expected[key]);
  }
  requireCapture(
    typeof expected.moduleId === "string" &&
      /^M(0[1-9]|1[0-9]|2[0-4])$/u.test(expected.moduleId),
  );
  requireCapture(actual.moduleId === expected.moduleId);
}

function assertEnvelope(input: Input): void {
  exactKeys(input, [
    "expected",
    "now",
    "blueprint",
    "manifest",
    "approvals",
    "binding",
    "captures",
  ]);
  exactKeys(input.expected, contextKeys);
  validDate(input.now);
  const { blueprint: b, manifest: m, binding } = input;
  exactKeys(b, [
    "id",
    "blueprintId",
    "version",
    "scopeId",
    "moduleId",
    "approval",
    "snapshot",
    "itemManifest",
  ]);
  exactKeys(m, [
    "id",
    "version",
    "scopeId",
    "moduleId",
    "blueprintVersionId",
    "blueprintVersion",
    "approval",
    "obligations",
  ]);
  exactKeys(binding, [
    ...contextKeys,
    "manifestId",
    "manifestVersion",
    "blueprintVersionId",
    "blueprintVersion",
    "boundAt",
  ]);
  assertContext(input.expected, binding);
  text(b.blueprintId);
  for (const version of [b, m]) {
    uuid(version.id);
    positiveInteger(version.version);
    requireCapture(
      version.scopeId === input.expected.scopeId &&
        version.moduleId === input.expected.moduleId,
    );
  }
  requireCapture(
    b.id !== m.id &&
      m.blueprintVersionId === b.id &&
      binding.blueprintVersionId === b.id &&
      m.blueprintVersion === b.version &&
      binding.blueprintVersion === b.version,
  );
  requireCapture(
    binding.manifestId === m.id && binding.manifestVersion === m.version,
  );
  denseList(m.obligations);
  denseList(input.captures);
  requireCapture(m.obligations.length === input.captures.length);
}

function assertApproval(
  approval: Approval,
  resource: Readonly<{ id: string; scopeId: string }>,
  decisions: readonly CurriculumPublicationDecision[],
  action: string,
  resourceType: string,
): void {
  exactKeys(approval, ["decisionId", "actorId", "at"]);
  uuid(approval.decisionId);
  uuid(approval.actorId);
  validDate(approval.at);
  const rows = decisions.filter((d) => d.id === approval.decisionId);
  requireCapture(rows.length === 1);
  const decision = rows[0]!;
  exactKeys(decision, [
    "id",
    "actorKind",
    "principalId",
    "scopeId",
    "action",
    "resourceType",
    "resourceId",
    "outcome",
    "occurredAt",
  ]);
  validDate(decision.occurredAt);
  requireCapture(
    decision.actorKind === "AUTHENTICATED" &&
      decision.outcome === "SUCCESS" &&
      decision.principalId === approval.actorId &&
      decision.scopeId === resource.scopeId &&
      decision.action === action &&
      decision.resourceType === resourceType &&
      decision.resourceId === resource.id &&
      decision.occurredAt.getTime() === approval.at.getTime(),
  );
}

function assertInventoryApprovalsAndTiming(
  input: ApprovedModuleInventoryInput,
): void {
  const { blueprint: b, manifest: m, approvals, now } = input;
  denseList(approvals, 2);
  requireCapture(approvals.length === 2);
  assertApproval(
    b.approval,
    b,
    approvals,
    "CURRICULUM_MODULE_BLUEPRINT_APPROVED",
    "curriculum_module_blueprint_version",
  );
  assertApproval(
    m.approval,
    m,
    approvals,
    "CURRICULUM_MODULE_OBLIGATIONS_APPROVED",
    "curriculum_module_obligation_manifest",
  );
  requireCapture(b.approval.decisionId !== m.approval.decisionId);
  validDate(now);
  requireCapture(b.approval.at <= m.approval.at && m.approval.at <= now);
}

function assertApprovalsAndBinding(input: Input): void {
  const { blueprint: b, manifest: m, binding, now } = input;
  assertInventoryApprovalsAndTiming({
    now,
    blueprint: b,
    manifest: m,
    approvals: input.approvals,
  });
  validDate(binding.boundAt);
  requireCapture(m.approval.at <= binding.boundAt && binding.boundAt <= now);
}

function assertInventoryEnvelope(input: ApprovedModuleInventoryInput): void {
  exactKeys(input, ["now", "blueprint", "manifest", "approvals"]);
  const { blueprint: b, manifest: m } = input;
  exactKeys(b, [
    "id",
    "blueprintId",
    "version",
    "scopeId",
    "moduleId",
    "approval",
    "snapshot",
    "itemManifest",
  ]);
  exactKeys(m, [
    "id",
    "version",
    "scopeId",
    "moduleId",
    "blueprintVersionId",
    "blueprintVersion",
    "approval",
    "obligations",
  ]);
  text(b.blueprintId);
  uuid(b.scopeId);
  requireCapture(
    typeof b.moduleId === "string" &&
      /^M(0[1-9]|1[0-9]|2[0-4])$/u.test(b.moduleId),
  );
  for (const version of [b, m]) {
    uuid(version.id);
    positiveInteger(version.version);
    requireCapture(
      version.scopeId === b.scopeId && version.moduleId === b.moduleId,
    );
  }
  requireCapture(
    b.id !== m.id &&
      m.blueprintVersionId === b.id &&
      m.blueprintVersion === b.version,
  );
  denseList(m.obligations);
  denseList(input.approvals, 2);
  requireCapture(input.approvals.length === 2);
}

function assertInventoryMembership(
  input: ApprovedModuleInventoryInput,
  wholeItems: ReadonlyMap<string, BlueprintItem>,
): void {
  const obligations = input.manifest.obligations;
  obligations.forEach(assertObligationShape);
  for (const key of ["id", "activityId", "formVersionId"] as const)
    unique(obligations.map((o) => o[key]));
  const allItems = obligations.flatMap((o) => o.items);
  requireCapture(allItems.length === wholeItems.size);
  unique(allItems.map((i) => i.canonicalItemId));
  unique(allItems.map((i) => i.contentVersionId));
  for (const member of allItems)
    requireCapture(wholeItems.has(member.canonicalItemId));
}

function assertWholeBlueprint(
  b: Input["blueprint"],
): Map<string, BlueprintItem> {
  const s = b.snapshot;
  exactKeys(s, [
    "questionCountsBySession",
    "questionTotal",
    "openResponseCount",
    "objectiveIds",
  ]);
  denseList(s.questionCountsBySession, 4);
  requireCapture(s.questionCountsBySession.length === 4);
  s.questionCountsBySession.forEach((count) => positiveInteger(count, 100));
  positiveInteger(s.questionTotal, 100);
  positiveInteger(s.openResponseCount, 100);
  requireCapture(
    s.questionCountsBySession.reduce((sum, count) => sum + count, 0) ===
      s.questionTotal,
  );
  requireCapture(s.questionTotal + s.openResponseCount <= 100);
  denseList(s.objectiveIds);
  s.objectiveIds.forEach(text);
  unique(s.objectiveIds);
  denseList(b.itemManifest);
  requireCapture(
    b.itemManifest.length === s.questionTotal + s.openResponseCount,
  );
  const counts = [0, 0, 0, 0],
    objectives = new Set<string>();
  let openCount = 0;
  for (const item of b.itemManifest) {
    exactKeys(item, [
      "itemId",
      "objectiveId",
      "responseMode",
      "critical",
      "sessionId",
    ]);
    text(item.itemId);
    requireCapture(
      s.objectiveIds.includes(item.objectiveId) &&
        typeof item.critical === "boolean",
    );
    requireCapture(
      item.responseMode === "CHOICE" || item.responseMode === "TEXT",
    );
    const sessions = [1, 2, 3, 4].map((n) => `${b.moduleId}-S${n}`);
    const session = sessions.indexOf(item.sessionId);
    requireCapture(session >= 0);
    if (item.responseMode === "CHOICE") counts[session] = counts[session]! + 1;
    else openCount++;
    objectives.add(item.objectiveId);
  }
  requireCapture(
    counts.every((count, index) => count === s.questionCountsBySession[index]),
  );
  requireCapture(
    openCount === s.openResponseCount &&
      objectives.size === s.objectiveIds.length,
  );
  unique(b.itemManifest.map((i) => i.itemId));
  return new Map(b.itemManifest.map((i) => [i.itemId, i]));
}

function assertObligationShape(obligation: Obligation): void {
  exactKeys(obligation, [
    "id",
    "activityId",
    "formVersionId",
    "formVersion",
    "blueprintVersionId",
    "blueprintVersion",
    "evidenceKind",
    "items",
  ]);
  for (const id of [
    obligation.id,
    obligation.activityId,
    obligation.formVersionId,
    obligation.blueprintVersionId,
  ])
    uuid(id);
  positiveInteger(obligation.formVersion);
  positiveInteger(obligation.blueprintVersion);
  // No known producer exists for reading/reflection/NONE witnesses. Deny them.
  requireCapture(obligation.evidenceKind === "CURRICULUM_ATTEMPT");
  denseList(obligation.items);
  for (const item of obligation.items) {
    exactKeys(item, [
      "canonicalItemId",
      "contentVersionId",
      "contentId",
      "contentVersion",
      "ordinal",
    ]);
    text(item.canonicalItemId);
    uuid(item.contentVersionId);
    uuid(item.contentId);
    positiveInteger(item.contentVersion);
    positiveInteger(item.ordinal, 100);
  }
  unique(obligation.items.map((i) => i.canonicalItemId));
  unique(obligation.items.map((i) => i.contentVersionId));
  unique(obligation.items.map((i) => i.ordinal));
}

function assertBoundCapture(
  input: Input,
  obligation: Obligation,
  bound: Capture,
): void {
  exactKeys(bound, [
    "activityId",
    "assignmentId",
    "activityStatus",
    "capture",
    "decisions",
  ]);
  requireCapture(
    bound.activityId === obligation.activityId &&
      bound.assignmentId === input.expected.assignmentId &&
      bound.activityStatus === "PUBLISHED",
  );
  const capture = bound.capture,
    { form, blueprint } = capture;
  requireCapture(
    capture.expectedScopeId === input.expected.scopeId &&
      form.moduleId === input.expected.moduleId,
  );
  validDate(capture.now);
  requireCapture(capture.now.getTime() === input.now.getTime());
  requireCapture(
    form.id === obligation.formVersionId &&
      form.version === obligation.formVersion &&
      blueprint.id === obligation.blueprintVersionId &&
      blueprint.version === obligation.blueprintVersion &&
      form.mode === "MODULE_COMPLETION",
  );
  assertPublishedCurriculumCapture(capture);
  assertCurriculumPublicationProvenance(capture, bound.decisions);
  requireCapture(form.publishedAt <= input.manifest.approval.at);
}

function assertItemMembership(
  obligation: Obligation,
  capture: PublishedCurriculumCaptureInput,
  wholeItems: ReadonlyMap<string, BlueprintItem>,
): void {
  requireCapture(obligation.items.length === capture.items.length);
  const captured = new Map(capture.items.map((i) => [i.canonicalItemId, i]));
  for (const member of obligation.items) {
    const native = captured.get(member.canonicalItemId),
      whole = wholeItems.get(member.canonicalItemId);
    requireCapture(native !== undefined && whole !== undefined);
    requireCapture(
      native.contentVersionId === member.contentVersionId &&
        native.contentId === member.contentId &&
        native.contentVersion === member.contentVersion &&
        native.ordinal === member.ordinal,
    );
    const c = native.catalogItem;
    requireCapture(
      c.objectiveId === whole.objectiveId &&
        c.responseMode === whole.responseMode &&
        c.critical === whole.critical &&
        c.sessionId === whole.sessionId,
    );
  }
}

function assertFullMembership(
  input: Input,
  wholeItems: ReadonlyMap<string, BlueprintItem>,
): void {
  const obligations = input.manifest.obligations;
  obligations.forEach(assertObligationShape);
  for (const key of ["id", "activityId", "formVersionId"] as const)
    unique(obligations.map((o) => o[key]));
  input.captures.forEach((bound) => {
    exactKeys(bound, [
      "activityId",
      "assignmentId",
      "activityStatus",
      "capture",
      "decisions",
    ]);
    uuid(bound.activityId);
  });
  unique(input.captures.map((c) => c.activityId));
  const captures = new Map(input.captures.map((c) => [c.activityId, c]));
  const allItems = obligations.flatMap((o) => o.items);
  requireCapture(allItems.length === wholeItems.size);
  unique(allItems.map((i) => i.canonicalItemId));
  unique(allItems.map((i) => i.contentVersionId));
  for (const obligation of obligations) {
    const bound = captures.get(obligation.activityId);
    requireCapture(bound !== undefined);
    assertBoundCapture(input, obligation, bound);
    assertItemMembership(obligation, bound.capture, wholeItems);
  }
}

/**
 * Pure consistency check, not completion or approval authority. No return receipt.
 * Trust, immutability, DB timestamp precision, locks/CAS and complete upstream
 * inventory are caller obligations; coherently forged upstream data is undetectable.
 */
export function assertApprovedModuleObligationCapture(
  input: ApprovedModuleObligationCaptureInput,
): void {
  try {
    assertEnvelope(input);
    assertApprovalsAndBinding(input);
    const wholeItems = assertWholeBlueprint(input.blueprint);
    assertFullMembership(input, wholeItems);
  } catch {
    throw new ApplicationError(
      "state_conflict",
      "Module obligation capture is inconsistent",
    );
  }
}

/**
 * Whole-inventory publication check without assignment, capture or binding
 * proof. Never approves, never completes, never binds.
 */
export function assertApprovedModuleInventory(
  input: ApprovedModuleInventoryInput,
): void {
  try {
    assertInventoryEnvelope(input);
    assertInventoryApprovalsAndTiming(input);
    const wholeItems = assertWholeBlueprint(input.blueprint);
    assertInventoryMembership(input, wholeItems);
  } catch {
    throw new ApplicationError(
      "state_conflict",
      "Module obligation inventory is inconsistent",
    );
  }
}
