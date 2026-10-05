import {
  ApplicationError,
  type CurriculumEvaluationAttempt,
} from "@cvg/application";
import { decodePersistedModuleAnswer } from "@cvg/curriculum";
import type { CurriculumPublicationDecision } from "./curriculum-publication-provenance.js";
import {
  assertApprovedModuleObligationCapture,
  type ApprovedModuleObligationCaptureInput,
} from "./module-obligation-validation.js";

export type ModuleObligationTerminalWitness = Readonly<{
  activityId: string;
  learningAssignmentId: string;
  formVersionId: string;
  capturedAt: Date;
  terminalAt: Date;
  attempt: CurriculumEvaluationAttempt;
  correction: Readonly<{
    id: string;
    attemptId: string;
    version: number;
    kind: "HUMANA" | "AUTOMATICA";
    outcome: "APROVADO" | "REFORCO";
    correctedBy: string;
    correctedAt: Date;
  }>;
  correctionDecision: CurriculumPublicationDecision;
}>;

export type FinalizedModuleObligation = Readonly<{
  activityId: string;
  attemptId: string;
  attemptVersion: number;
  formVersionId: string;
  formVersion: number;
  assessmentResultId: string;
  correctedAt: Date;
}>;

type Capture = ApprovedModuleObligationCaptureInput["captures"][number];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
function requireFinalization(value: unknown): asserts value {
  if (!value)
    throw new ApplicationError(
      "state_conflict",
      "Module finalization is unavailable",
    );
}
function validDate(value: unknown): value is Date {
  return value instanceof Date && Number.isFinite(value.getTime());
}
function validId(value: unknown): value is string {
  return typeof value === "string" && uuid.test(value);
}
function sameJson(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (Array.isArray(left) && Array.isArray(right))
    return (
      left.length === right.length &&
      Array.from(
        { length: left.length },
        (_, i) =>
          Object.hasOwn(left, i) &&
          Object.hasOwn(right, i) &&
          sameJson(left[i], right[i]),
      ).every(Boolean)
    );
  if (
    left === null ||
    right === null ||
    typeof left !== "object" ||
    typeof right !== "object" ||
    Array.isArray(left) ||
    Array.isArray(right)
  )
    return false;
  const a = left as Record<string, unknown>,
    b = right as Record<string, unknown>;
  return (
    Object.keys(a).length === Object.keys(b).length &&
    Object.keys(a).every(
      (key) => Object.hasOwn(b, key) && sameJson(a[key], b[key]),
    )
  );
}

export function expectedFrozenForm(
  c: ApprovedModuleObligationCaptureInput["captures"][number],
): CurriculumEvaluationAttempt["form"] {
  const { form, blueprint, items } = c.capture;
  return {
    formId: form.formId,
    version: form.version,
    blueprintId: blueprint.blueprintId,
    status: "PUBLICADO",
    publication: {
      decisionId: form.publicationDecisionId,
      publishedAt: form.publishedAt.toISOString(),
    },
    blueprint: blueprint.manifest,
    catalog: {
      moduleId: form.moduleId,
      items: items.map((item) => item.catalogItem),
    },
    contentVersions: items.map((item) => ({
      itemId: item.canonicalItemId,
      contentVersionId: item.contentVersionId,
      version: item.contentVersion,
      sourceRefs: item.catalogItem.sourceRefs,
    })),
  };
}

function assertFrozenEvaluation(
  c: Capture,
  witness: ModuleObligationTerminalWitness,
): void {
  const { attempt } = witness,
    { form, items } = c.capture;
  requireFinalization(
    witness.formVersionId === form.id && attempt.mode === form.mode,
  );
  requireFinalization(sameJson(attempt.form, expectedFrozenForm(c)));
  const answers = attempt.answers;
  requireFinalization(
    Array.isArray(answers) &&
      answers.length === items.length &&
      new Set(answers.map((a) => a.contentVersionId)).size === items.length,
  );
  for (let index = 0; index < answers.length; index++)
    requireFinalization(Object.hasOwn(answers, index));
  for (const item of items) {
    const row = answers.find(
      (a) => a.contentVersionId === item.contentVersionId,
    );
    requireFinalization(
      row &&
        row.attemptId === attempt.attemptId &&
        row.answer.itemId === item.canonicalItemId,
    );
    const p = item.publicItem,
      a = row.answer;
    if (p.responseMode === "TEXT") {
      requireFinalization(
        sameJson(Object.keys(a).sort(), ["itemId", "text"]) &&
          typeof a.text === "string",
      );
      const decoded = decodePersistedModuleAnswer(
        { itemId: item.canonicalItemId, responseMode: "TEXT" },
        a.text,
      );
      requireFinalization(sameJson(decoded, a));
    } else {
      requireFinalization(
        sameJson(Object.keys(a).sort(), ["itemId", "selectedChoiceIds"]) &&
          Array.isArray(a.selectedChoiceIds),
      );
      requireFinalization(
        p.choices &&
          (p.selectionMode === "SINGLE" || p.selectionMode === "MULTIPLE"),
      );
      if (p.selectionMode === "SINGLE")
        requireFinalization(a.selectedChoiceIds.length === 1);
      const raw =
        p.selectionMode === "SINGLE"
          ? a.selectedChoiceIds[0]
          : JSON.stringify(a.selectedChoiceIds);
      requireFinalization(typeof raw === "string");
      const decoded = decodePersistedModuleAnswer(
        {
          itemId: item.canonicalItemId,
          responseMode: "CHOICE",
          selectionMode: p.selectionMode,
          choices: p.choices,
        },
        raw,
      );
      requireFinalization(sameJson(decoded, a));
    }
  }
}

function assertTerminalWitness(
  input: ApprovedModuleObligationCaptureInput,
  witness: ModuleObligationTerminalWitness,
): void {
  const { attempt: a, correction: r, correctionDecision: d } = witness;
  const e = input.expected;
  requireFinalization(
    witness.learningAssignmentId === e.assignmentId &&
      a.participantId === e.participantId &&
      a.scopeId === e.scopeId &&
      a.moduleId === e.moduleId,
  );
  requireFinalization(
    validId(a.attemptId) &&
      Number.isSafeInteger(a.attemptVersion) &&
      a.attemptVersion >= 1,
  );
  const submittedAt = new Date(a.submittedAt);
  requireFinalization(
    validDate(witness.capturedAt) &&
      validDate(witness.terminalAt) &&
      validDate(submittedAt),
  );
  requireFinalization(
    input.binding.boundAt <= witness.capturedAt &&
      witness.capturedAt <= submittedAt &&
      submittedAt <= witness.terminalAt &&
      witness.terminalAt <= input.now,
  );
  // The published capture contract currently requires open responses in each
  // form. Automatic-only finalization has no supported native producer here.
  requireFinalization(a.status === "CORRIGIDA_HUMANAMENTE");
  requireFinalization(
    validId(r.id) &&
      r.attemptId === a.attemptId &&
      Number.isSafeInteger(r.version) &&
      r.version >= 1,
  );
  requireFinalization(
    r.kind === "HUMANA" && ["APROVADO", "REFORCO"].includes(r.outcome),
  );
  requireFinalization(
    validId(r.correctedBy) &&
      validDate(r.correctedAt) &&
      r.correctedAt.getTime() === witness.terminalAt.getTime(),
  );
  requireFinalization(
    validId(d.id) &&
      d.actorKind === "AUTHENTICATED" &&
      d.principalId === r.correctedBy &&
      d.scopeId === e.scopeId,
  );
  requireFinalization(
    d.action === "ATTEMPT_CORRECTED" &&
      d.resourceType === "attempt" &&
      d.resourceId === a.attemptId &&
      d.outcome === "SUCCESS",
  );
  requireFinalization(
    validDate(d.occurredAt) &&
      d.occurredAt.getTime() === r.correctedAt.getTime(),
  );
}

/**
 * Activity finalization only; REFORCO can be finalized without module approval.
 * D-102 summative approval remains a separate prerequisite for CONCLUIDO.
 * Caller owns native authorization, immutable rows, locks and timestamp precision.
 */
export function validateFinalizedModuleObligations(
  capture: ApprovedModuleObligationCaptureInput,
  witnesses: readonly ModuleObligationTerminalWitness[],
): readonly FinalizedModuleObligation[] {
  try {
    assertApprovedModuleObligationCapture(capture);
    requireFinalization(
      Array.isArray(witnesses) &&
        witnesses.length === capture.manifest.obligations.length,
    );
    requireFinalization(
      new Set(witnesses.map((w) => w.activityId)).size === witnesses.length &&
        new Set(witnesses.map((w) => w.attempt.attemptId)).size ===
          witnesses.length &&
        new Set(witnesses.map((w) => w.correction.id)).size ===
          witnesses.length &&
        new Set(witnesses.map((w) => w.correctionDecision.id)).size ===
          witnesses.length,
    );
    for (let i = 0; i < witnesses.length; i++)
      requireFinalization(Object.hasOwn(witnesses, i));
    return Object.freeze(
      capture.manifest.obligations.map((obligation) => {
        const witness = witnesses.find(
          (w) => w.activityId === obligation.activityId,
        );
        const original = capture.captures.find(
          (c) => c.activityId === obligation.activityId,
        );
        requireFinalization(witness && original);
        assertTerminalWitness(capture, witness);
        assertFrozenEvaluation(original, witness);
        return Object.freeze({
          activityId: witness.activityId,
          attemptId: witness.attempt.attemptId,
          attemptVersion: witness.attempt.attemptVersion,
          formVersionId: witness.formVersionId,
          formVersion: witness.attempt.form.version,
          assessmentResultId: witness.correction.id,
          correctedAt: new Date(witness.terminalAt),
        });
      }),
    );
  } catch {
    throw new ApplicationError(
      "state_conflict",
      "Module finalization is unavailable",
    );
  }
}
