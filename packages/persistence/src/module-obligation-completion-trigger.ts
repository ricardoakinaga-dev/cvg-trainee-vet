import type { CurriculumEvaluationAttempt } from "@cvg/application";
import { decodePersistedModuleAnswer } from "@cvg/curriculum";

import type { DatabaseExecutor } from "./database-executor.js";
import type { CurriculumPublicationDecision } from "./curriculum-publication-provenance.js";
import { readModuleApprovals } from "./module-obligation-assignment-publisher.js";
import { recordModuleCompletion } from "./module-obligation-completion.js";
import {
  type CaptureSources,
  type ContentRow,
  type Decisions,
  type FormItemRow,
  type Identity,
  type ModuleCompletionTriggerInput,
  readCaptureSources,
  readDecisions,
  readIdentity,
  readTerminal,
  type TerminalSource,
} from "./module-obligation-completion-evidence.js";
import {
  expectedFrozenForm,
  type ModuleObligationTerminalWitness,
} from "./module-obligation-finalization.js";
import {
  decideSummativeGrade,
  type ApprovedSummativeGradeEvidence,
  type SummativeGradePolicy,
} from "./module-obligation-grade-policy.js";
import type { ApprovedModuleObligationCaptureInput } from "./module-obligation-validation.js";
import { setDatabaseSecurityContext } from "./security-context.js";

export type { ModuleCompletionTriggerInput } from "./module-obligation-completion-evidence.js";

type BoundCapture = ApprovedModuleObligationCaptureInput["captures"][number];
type FrozenAnswer = CurriculumEvaluationAttempt["answers"][number];

export type SummativeApprovalRequest = Readonly<{
  readonly capture: ApprovedModuleObligationCaptureInput;
  readonly obligations: ApprovedSummativeGradeEvidence["obligations"];
  readonly now: Date;
}>;

export type ApprovedSummativeGrade = Readonly<{
  readonly policy: SummativeGradePolicy;
  readonly results: ApprovedSummativeGradeEvidence["results"];
}>;

export type SummativeApprovalSource = (
  request: SummativeApprovalRequest,
) => ApprovedSummativeGrade | null | undefined;

export type ModuleCompletionTriggerOptions = Readonly<{
  readonly summativeApproval?: SummativeApprovalSource;
}>;

type Assembled = Readonly<{
  capture: ApprovedModuleObligationCaptureInput;
  witnesses: readonly ModuleObligationTerminalWitness[];
  gradeObligations: ApprovedSummativeGradeEvidence["obligations"];
}>;

function decodeAnswer(
  item: FormItemRow,
  response: string,
): FrozenAnswer["answer"] | null {
  const publicItem = item.publicItem;
  try {
    if (publicItem.responseMode === "TEXT")
      return decodePersistedModuleAnswer(
        { itemId: item.canonicalItemId, responseMode: "TEXT" },
        response,
      );
    const selectionMode = publicItem.selectionMode;
    const choices = publicItem.choices;
    if (selectionMode == null || choices == null) return null;
    return decodePersistedModuleAnswer(
      {
        itemId: item.canonicalItemId,
        responseMode: "CHOICE",
        selectionMode,
        choices,
      },
      response,
    );
  } catch {
    return null;
  }
}

function assembleBound(
  input: ModuleCompletionTriggerInput,
  identity: Identity,
  source: TerminalSource,
  sources: CaptureSources,
  provenance: readonly CurriculumPublicationDecision[],
  corrections: readonly CurriculumPublicationDecision[],
  now: Date,
): Readonly<{
  bound: BoundCapture;
  witness: ModuleObligationTerminalWitness;
}> | null {
  const obligation = source.obligation;
  const activity = sources.activities.get(obligation.activityId);
  const form = sources.forms.get(obligation.formVersionId);
  if (activity === undefined || form === undefined) return null;
  const items = sources.itemsByForm.get(form.id);
  const activityItems = sources.activityItems.get(obligation.activityId);
  if (items === undefined || items.length === 0 || activityItems === undefined)
    return null;
  const activityStatus = activity.status;
  if (activityStatus !== "PUBLISHED" || form.status !== "PUBLICADO")
    return null;
  const formBlueprint = sources.formBlueprints.get(form.blueprintVersionId);
  if (formBlueprint === undefined) return null;
  const contents: ContentRow[] = [];
  for (const item of items) {
    const content = sources.contents.get(item.contentVersionId);
    if (content === undefined) return null;
    contents.push(content);
  }
  const formDecision = provenance.find(
    (row) => row.id === form.publicationDecisionId,
  );
  const blueprintDecision = provenance.find(
    (row) => row.id === formBlueprint.approvalDecisionId,
  );
  if (formDecision === undefined || blueprintDecision === undefined)
    return null;
  const bound: BoundCapture = {
    activityId: obligation.activityId,
    assignmentId: identity.assignment.id,
    activityStatus,
    capture: {
      form,
      blueprint: formBlueprint,
      items,
      activity: { scopeId: activity.scopeId, moduleId: activity.moduleId },
      activityItems: activityItems.map((row) => ({
        contentVersionId: row.contentVersionId,
        ordinal: row.ordinal,
      })),
      contentVersions: contents,
      expectedScopeId: input.scopeId,
      now,
    },
    decisions: [blueprintDecision, formDecision],
  };
  const answerRows = sources.answersByAttempt.get(source.attempt.id);
  if (answerRows === undefined) return null;
  const answers: FrozenAnswer[] = [];
  for (const item of items) {
    const answer = answerRows.find(
      (row) => row.itemId === item.contentVersionId,
    );
    if (answer === undefined) return null;
    const decoded = decodeAnswer(item, answer.response);
    if (decoded === null) return null;
    answers.push({
      attemptId: source.attempt.id,
      contentVersionId: item.contentVersionId,
      answer: decoded,
    });
  }
  const attemptStatus = source.attempt.status;
  const kind = source.result.kind;
  const outcome = source.result.outcome;
  const submittedAt = source.attempt.submittedAt;
  if (
    attemptStatus !== "CORRIGIDA_HUMANAMENTE" ||
    kind !== "HUMANA" ||
    (outcome !== "APROVADO" && outcome !== "REFORCO") ||
    submittedAt === null
  )
    return null;
  const boundAt = identity.binding.boundAt;
  if (
    boundAt.getTime() > source.capturedAt.getTime() ||
    source.capturedAt.getTime() > submittedAt.getTime() ||
    submittedAt.getTime() > source.result.correctedAt.getTime() ||
    source.result.correctedAt.getTime() > now.getTime()
  )
    return null;
  const correctionRows = corrections.filter(
    (row) =>
      row.resourceId === source.attempt.id &&
      row.principalId === source.result.correctedBy &&
      row.occurredAt.getTime() === source.result.correctedAt.getTime(),
  );
  if (correctionRows.length !== 1) return null;
  return {
    bound,
    witness: {
      activityId: obligation.activityId,
      learningAssignmentId: identity.assignment.id,
      formVersionId: form.id,
      capturedAt: source.capturedAt,
      terminalAt: source.result.correctedAt,
      attempt: {
        attemptId: source.attempt.id,
        participantId: input.participantId,
        scopeId: input.scopeId,
        moduleId: identity.manifest.moduleId,
        attemptVersion: source.attempt.version,
        status: attemptStatus,
        submittedAt: submittedAt.toISOString(),
        mode: form.mode,
        form: expectedFrozenForm(bound),
        answers,
      },
      correction: {
        id: source.result.id,
        attemptId: source.result.attemptId,
        version: source.result.version,
        kind,
        outcome,
        correctedBy: source.result.correctedBy,
        correctedAt: source.result.correctedAt,
      },
      correctionDecision: correctionRows[0]!,
    },
  };
}

function assemble(
  input: ModuleCompletionTriggerInput,
  identity: Identity,
  approvals: readonly CurriculumPublicationDecision[],
  terminal: readonly TerminalSource[],
  sources: CaptureSources,
  decisions: Decisions,
  now: Date,
): Assembled | null {
  const manifest = identity.manifest;
  const assignment = identity.assignment;
  if (assignment.moduleId !== manifest.moduleId) return null;
  const captures: BoundCapture[] = [];
  const witnesses: ModuleObligationTerminalWitness[] = [];
  for (const source of terminal) {
    const assembled = assembleBound(
      input,
      identity,
      source,
      sources,
      decisions.provenance,
      decisions.corrections,
      now,
    );
    if (assembled === null) return null;
    captures.push(assembled.bound);
    witnesses.push(assembled.witness);
  }
  const whole = identity.blueprint.snapshot;
  const gradeObligations = terminal.map((source) => ({
    obligationId: source.obligation.id,
    activityId: source.obligation.activityId,
    assessmentResultId: source.result.id,
    correctionOutcome: source.result.outcome as "APROVADO" | "REFORCO",
  }));
  return {
    capture: {
      expected: {
        assignmentId: assignment.id,
        participantId: input.participantId,
        scopeId: input.scopeId,
        moduleId: manifest.moduleId,
      },
      now,
      blueprint: {
        id: identity.blueprint.id,
        blueprintId: identity.blueprint.blueprintId,
        version: identity.blueprint.version,
        scopeId: identity.blueprint.scopeId,
        moduleId: identity.blueprint.moduleId,
        approval: {
          decisionId: identity.blueprint.approvalDecisionId,
          actorId: identity.blueprint.approvedBy,
          at: identity.blueprint.approvedAt,
        },
        snapshot: {
          questionCountsBySession: whole.questionCountsBySession,
          questionTotal: whole.questionTotal,
          openResponseCount: whole.openResponseCount,
          objectiveIds: whole.objectiveIds,
        },
        itemManifest: whole.itemManifest,
      },
      manifest: {
        id: manifest.id,
        version: manifest.version,
        scopeId: manifest.scopeId,
        moduleId: manifest.moduleId,
        blueprintVersionId: manifest.blueprintVersionId,
        blueprintVersion: manifest.blueprintVersion,
        approval: {
          decisionId: manifest.approvalDecisionId,
          actorId: manifest.approvedBy,
          at: manifest.approvedAt,
        },
        obligations: manifest.obligations,
      },
      approvals,
      binding: {
        assignmentId: identity.binding.assignmentId,
        participantId: identity.binding.participantId,
        scopeId: identity.binding.scopeId,
        moduleId: identity.binding.moduleId,
        manifestId: identity.binding.manifestId,
        manifestVersion: identity.binding.manifestVersion,
        blueprintVersionId: identity.binding.blueprintVersionId,
        blueprintVersion: identity.binding.blueprintVersion,
        boundAt: identity.binding.boundAt,
      },
      captures,
    },
    witnesses,
    gradeObligations,
  };
}

/**
 * Step C: after a terminal human correction, re-read the bound inventory,
 * prove every mandatory activity with its terminal witness and, only when a
 * summative approval is authenticated, write the immutable completion receipt
 * inside the very same correction transaction. Unbound, unpublished,
 * non-terminal, unapproved or inconsistent states skip the receipt without
 * failing the correction; a writer conflict aborts the whole transaction.
 */
export async function triggerModuleCompletionOnCorrection(
  tx: DatabaseExecutor,
  input: ModuleCompletionTriggerInput,
  options: ModuleCompletionTriggerOptions = {},
): Promise<void> {
  await setDatabaseSecurityContext(tx, {
    participantId: input.participantId,
    scopeId: input.scopeId,
  });
  const identity = await readIdentity(tx, input);
  if (identity === null) return;
  const now = new Date();
  const moduleApprovals = await readModuleApprovals(tx, input.scopeId, now);
  if (moduleApprovals === null) return;
  const [blueprintApproval, manifestApproval] = moduleApprovals;
  if (
    blueprintApproval.resourceId !== identity.blueprint.id ||
    manifestApproval.resourceId !== identity.manifest.id ||
    blueprintApproval.decisionId !== identity.blueprint.approvalDecisionId ||
    manifestApproval.decisionId !== identity.manifest.approvalDecisionId ||
    blueprintApproval.actorId !== identity.blueprint.approvedBy ||
    manifestApproval.actorId !== identity.manifest.approvedBy ||
    blueprintApproval.at.getTime() !==
      identity.blueprint.approvedAt.getTime() ||
    manifestApproval.at.getTime() !== identity.manifest.approvedAt.getTime()
  )
    return;
  const terminal = await readTerminal(tx, input, identity.manifest);
  if (terminal === null) return;
  const sources = await readCaptureSources(tx, input, terminal);
  if (sources === null) return;
  const decisions = await readDecisions(tx, input, sources, terminal);
  if (decisions === null) return;
  const assembled = assemble(
    input,
    identity,
    [blueprintApproval.decision, manifestApproval.decision],
    terminal,
    sources,
    decisions,
    now,
  );
  if (assembled === null) return;
  const approval = options.summativeApproval?.({
    capture: assembled.capture,
    obligations: assembled.gradeObligations,
    now,
  });
  if (approval === null || approval === undefined) return;
  const evidence: ApprovedSummativeGradeEvidence = {
    expected: {
      assignmentId: assembled.capture.expected.assignmentId,
      participantId: assembled.capture.expected.participantId,
      scopeId: assembled.capture.expected.scopeId,
      moduleId: assembled.capture.expected.moduleId,
      blueprintVersionId: identity.manifest.blueprintVersionId,
      blueprintVersion: identity.manifest.blueprintVersion,
    },
    now,
    obligations: assembled.gradeObligations,
    results: approval.results,
  };
  if (
    decideSummativeGrade(approval.policy, evidence).outcome !==
    "APROVADO_SOMATIVO"
  )
    return;
  await recordModuleCompletion(tx, {
    actor: input.actor,
    expectedAssignmentVersion: identity.assignment.version,
    capture: assembled.capture,
    witnesses: assembled.witnesses,
    grade: { policy: approval.policy, evidence },
  });
}
