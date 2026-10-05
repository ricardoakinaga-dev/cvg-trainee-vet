import { and, asc, eq, inArray } from "drizzle-orm";

import type { DatabaseExecutor } from "./database-executor.js";
import type { CurriculumPublicationDecision } from "./curriculum-publication-provenance.js";
import type { ApprovedModuleObligationCaptureInput } from "./module-obligation-validation.js";
import * as schema from "./schema.js";

export type AttemptRow = typeof schema.attempts.$inferSelect;
export type ResultRow = typeof schema.assessmentResults.$inferSelect;
export type AssignmentRow = typeof schema.learningAssignments.$inferSelect;
export type BindingRow =
  typeof schema.curriculumAssignmentObligations.$inferSelect;
export type ManifestRow =
  typeof schema.curriculumModuleObligationManifests.$inferSelect;
export type BlueprintRow =
  typeof schema.curriculumModuleBlueprintVersions.$inferSelect;
export type ActivityRow = typeof schema.learningActivities.$inferSelect;
export type FormRow = typeof schema.curriculumFormVersions.$inferSelect;
export type FormBlueprintRow =
  typeof schema.curriculumBlueprintVersions.$inferSelect;
export type FormItemRow = typeof schema.curriculumFormItems.$inferSelect;
export type ActivityItemRow = typeof schema.learningActivityItems.$inferSelect;
export type ContentRow = typeof schema.contentVersions.$inferSelect;
export type AnswerRow = typeof schema.answers.$inferSelect;
export type Obligation =
  ApprovedModuleObligationCaptureInput["manifest"]["obligations"][number];

export type ModuleCompletionTriggerInput = Readonly<{
  readonly attemptId: string;
  readonly participantId: string;
  readonly scopeId: string;
  readonly actor: Readonly<{
    readonly actorId: string;
    readonly requestId: string;
    readonly correlationId: string;
  }>;
}>;

export type Identity = Readonly<{
  attempt: AttemptRow;
  assignment: AssignmentRow;
  binding: BindingRow;
  manifest: ManifestRow;
  blueprint: BlueprintRow;
}>;

export type TerminalSource = Readonly<{
  obligation: Obligation;
  attempt: AttemptRow;
  result: ResultRow;
  capturedAt: Date;
}>;

export type CaptureSources = Readonly<{
  activities: ReadonlyMap<string, ActivityRow>;
  forms: ReadonlyMap<string, FormRow>;
  formBlueprints: ReadonlyMap<string, FormBlueprintRow>;
  itemsByForm: ReadonlyMap<string, readonly FormItemRow[]>;
  activityItems: ReadonlyMap<string, readonly ActivityItemRow[]>;
  contents: ReadonlyMap<string, ContentRow>;
  answersByAttempt: ReadonlyMap<string, readonly AnswerRow[]>;
}>;

export type Decisions = Readonly<{
  provenance: readonly CurriculumPublicationDecision[];
  corrections: readonly CurriculumPublicationDecision[];
}>;

const PROVENANCE_ACTIONS = [
  "CURRICULUM_BLUEPRINT_APPROVED",
  "CURRICULUM_FORM_PUBLISHED",
] as const;

function newerAttempt(left: AttemptRow, right: AttemptRow): AttemptRow {
  const at = (row: AttemptRow) => row.updatedAt.getTime();
  if (at(left) !== at(right)) return at(left) > at(right) ? left : right;
  return left.version >= right.version ? left : right;
}

export async function readIdentity(
  tx: DatabaseExecutor,
  input: ModuleCompletionTriggerInput,
): Promise<Identity | null> {
  const attempts = await tx
    .select()
    .from(schema.attempts)
    .where(
      and(
        eq(schema.attempts.id, input.attemptId),
        eq(schema.attempts.participantId, input.participantId),
      ),
    )
    .limit(1);
  const attempt = attempts[0];
  if (
    attempt === undefined ||
    attempt.status !== "CORRIGIDA_HUMANAMENTE" ||
    attempt.submittedAt === null
  )
    return null;
  const links = await tx
    .select({
      learningAssignmentId: schema.activityAssignments.learningAssignmentId,
    })
    .from(schema.activityAssignments)
    .where(
      and(
        eq(schema.activityAssignments.activityId, attempt.activityId),
        eq(schema.activityAssignments.participantId, input.participantId),
      ),
    )
    .limit(1);
  const link = links[0];
  if (link === undefined || link.learningAssignmentId === null) return null;
  const assignments = await tx
    .select()
    .from(schema.learningAssignments)
    .where(
      and(
        eq(schema.learningAssignments.id, link.learningAssignmentId),
        eq(schema.learningAssignments.participantId, input.participantId),
        eq(schema.learningAssignments.scopeId, input.scopeId),
      ),
    )
    .limit(1);
  const assignment = assignments[0];
  if (assignment === undefined) return null;
  const bindings = await tx
    .select()
    .from(schema.curriculumAssignmentObligations)
    .where(
      and(
        eq(schema.curriculumAssignmentObligations.assignmentId, assignment.id),
        eq(
          schema.curriculumAssignmentObligations.participantId,
          input.participantId,
        ),
        eq(schema.curriculumAssignmentObligations.scopeId, input.scopeId),
        eq(
          schema.curriculumAssignmentObligations.moduleId,
          assignment.moduleId,
        ),
      ),
    )
    .limit(1);
  const binding = bindings[0];
  if (binding === undefined) return null;
  const manifests = await tx
    .select()
    .from(schema.curriculumModuleObligationManifests)
    .where(
      and(
        eq(schema.curriculumModuleObligationManifests.id, binding.manifestId),
        eq(schema.curriculumModuleObligationManifests.scopeId, input.scopeId),
      ),
    )
    .limit(1);
  const manifest = manifests[0];
  if (
    manifest === undefined ||
    manifest.version !== binding.manifestVersion ||
    manifest.blueprintVersionId !== binding.blueprintVersionId ||
    manifest.blueprintVersion !== binding.blueprintVersion ||
    manifest.moduleId !== assignment.moduleId
  )
    return null;
  const blueprints = await tx
    .select()
    .from(schema.curriculumModuleBlueprintVersions)
    .where(
      and(
        eq(
          schema.curriculumModuleBlueprintVersions.id,
          manifest.blueprintVersionId,
        ),
        eq(schema.curriculumModuleBlueprintVersions.scopeId, input.scopeId),
      ),
    )
    .limit(1);
  const blueprint = blueprints[0];
  if (blueprint === undefined) return null;
  return { attempt, assignment, binding, manifest, blueprint };
}

/**
 * One terminal human correction per manifest obligation, with its latest
 * assessment result and capture moment. A missing or non-terminal obligation
 * records nothing instead of failing the correction.
 */
export async function readTerminal(
  tx: DatabaseExecutor,
  input: ModuleCompletionTriggerInput,
  manifest: ManifestRow,
): Promise<readonly TerminalSource[] | null> {
  const obligations = manifest.obligations;
  const activityIds = obligations.map((obligation) => obligation.activityId);
  const attemptRows = await tx
    .select()
    .from(schema.attempts)
    .where(
      and(
        eq(schema.attempts.participantId, input.participantId),
        inArray(schema.attempts.activityId, activityIds),
      ),
    )
    .limit(101);
  const latest = new Map<string, AttemptRow>();
  for (const row of attemptRows) {
    if (row.status !== "CORRIGIDA_HUMANAMENTE" || row.submittedAt === null)
      continue;
    const current = latest.get(row.activityId);
    latest.set(
      row.activityId,
      current === undefined ? row : newerAttempt(row, current),
    );
  }
  const attemptIds: string[] = [];
  for (const obligation of obligations) {
    const attempt = latest.get(obligation.activityId);
    if (attempt === undefined) return null;
    attemptIds.push(attempt.id);
  }
  const resultRows = await tx
    .select()
    .from(schema.assessmentResults)
    .where(inArray(schema.assessmentResults.attemptId, attemptIds))
    .orderBy(asc(schema.assessmentResults.version))
    .limit(101);
  const results = new Map<string, ResultRow>();
  for (const row of resultRows) {
    const current = results.get(row.attemptId);
    if (current === undefined || row.version > current.version)
      results.set(row.attemptId, row);
  }
  const attemptFormRows = await tx
    .select()
    .from(schema.curriculumAttemptForms)
    .where(inArray(schema.curriculumAttemptForms.attemptId, attemptIds))
    .limit(101);
  const attemptForms = new Map(
    attemptFormRows.map((row) => [row.attemptId, row] as const),
  );
  const sources: TerminalSource[] = [];
  for (const obligation of obligations) {
    const attempt = latest.get(obligation.activityId);
    const result = attempt === undefined ? undefined : results.get(attempt.id);
    const attemptForm =
      attempt === undefined ? undefined : attemptForms.get(attempt.id);
    if (
      attempt === undefined ||
      result === undefined ||
      attemptForm === undefined ||
      result.kind !== "HUMANA" ||
      (result.outcome !== "APROVADO" && result.outcome !== "REFORCO")
    )
      return null;
    sources.push({
      obligation,
      attempt,
      result,
      capturedAt: attemptForm.capturedAt,
    });
  }
  return sources;
}

export async function readCaptureSources(
  tx: DatabaseExecutor,
  input: ModuleCompletionTriggerInput,
  terminal: readonly TerminalSource[],
): Promise<CaptureSources | null> {
  const activityIds = terminal.map((source) => source.obligation.activityId);
  const formVersionIds = terminal.map(
    (source) => source.obligation.formVersionId,
  );
  const attemptIds = terminal.map((source) => source.attempt.id);
  const activityRows = await tx
    .select()
    .from(schema.learningActivities)
    .where(
      and(
        eq(schema.learningActivities.scopeId, input.scopeId),
        inArray(schema.learningActivities.id, activityIds),
      ),
    )
    .limit(101);
  const activities = new Map(activityRows.map((row) => [row.id, row] as const));
  const formRows = await tx
    .select()
    .from(schema.curriculumFormVersions)
    .where(
      and(
        eq(schema.curriculumFormVersions.scopeId, input.scopeId),
        inArray(schema.curriculumFormVersions.id, formVersionIds),
      ),
    )
    .limit(101);
  const forms = new Map(formRows.map((row) => [row.id, row] as const));
  const formBlueprintRows = await tx
    .select()
    .from(schema.curriculumBlueprintVersions)
    .where(
      and(
        eq(schema.curriculumBlueprintVersions.scopeId, input.scopeId),
        inArray(
          schema.curriculumBlueprintVersions.id,
          formRows.map((row) => row.blueprintVersionId),
        ),
      ),
    )
    .limit(101);
  const formBlueprints = new Map(
    formBlueprintRows.map((row) => [row.id, row] as const),
  );
  const itemRows = await tx
    .select()
    .from(schema.curriculumFormItems)
    .where(
      and(
        eq(schema.curriculumFormItems.scopeId, input.scopeId),
        inArray(schema.curriculumFormItems.formVersionId, formVersionIds),
      ),
    )
    .orderBy(
      asc(schema.curriculumFormItems.formVersionId),
      asc(schema.curriculumFormItems.ordinal),
    )
    .limit(101);
  const itemsByForm = new Map<string, readonly FormItemRow[]>();
  for (const row of itemRows) {
    const list = itemsByForm.get(row.formVersionId);
    if (list === undefined) itemsByForm.set(row.formVersionId, [row]);
    else itemsByForm.set(row.formVersionId, [...list, row]);
  }
  const activityItemRows = await tx
    .select()
    .from(schema.learningActivityItems)
    .where(inArray(schema.learningActivityItems.activityId, activityIds))
    .orderBy(asc(schema.learningActivityItems.ordinal))
    .limit(101);
  const activityItems = new Map<string, readonly ActivityItemRow[]>();
  for (const row of activityItemRows) {
    const list = activityItems.get(row.activityId);
    if (list === undefined) activityItems.set(row.activityId, [row]);
    else activityItems.set(row.activityId, [...list, row]);
  }
  const contentRows = await tx
    .select()
    .from(schema.contentVersions)
    .where(
      and(
        eq(schema.contentVersions.scopeId, input.scopeId),
        inArray(
          schema.contentVersions.id,
          itemRows.map((row) => row.contentVersionId),
        ),
      ),
    )
    .limit(101);
  const contents = new Map(contentRows.map((row) => [row.id, row] as const));
  const answerRows = await tx
    .select()
    .from(schema.answers)
    .where(inArray(schema.answers.attemptId, attemptIds))
    .limit(101);
  const answersByAttempt = new Map<string, readonly AnswerRow[]>();
  for (const row of answerRows) {
    const list = answersByAttempt.get(row.attemptId);
    if (list === undefined) answersByAttempt.set(row.attemptId, [row]);
    else answersByAttempt.set(row.attemptId, [...list, row]);
  }
  if (
    activities.size !== activityIds.length ||
    forms.size !== formVersionIds.length ||
    formBlueprints.size !== formRows.length ||
    contents.size === 0
  )
    return null;
  return {
    activities,
    forms,
    formBlueprints,
    itemsByForm,
    activityItems,
    contents,
    answersByAttempt,
  };
}

export async function readDecisions(
  tx: DatabaseExecutor,
  input: ModuleCompletionTriggerInput,
  sources: CaptureSources,
  terminal: readonly TerminalSource[],
): Promise<Decisions | null> {
  const resourceIds = new Set<string>();
  for (const source of terminal) {
    const form = sources.forms.get(source.obligation.formVersionId);
    if (form === undefined) return null;
    resourceIds.add(form.id);
    resourceIds.add(form.blueprintVersionId);
  }
  const provenance = await tx
    .select({
      id: schema.auditEntries.id,
      actorKind: schema.auditEntries.actorKind,
      principalId: schema.auditEntries.principalId,
      scopeId: schema.auditEntries.scopeId,
      action: schema.auditEntries.action,
      resourceType: schema.auditEntries.resourceType,
      resourceId: schema.auditEntries.resourceId,
      outcome: schema.auditEntries.outcome,
      occurredAt: schema.auditEntries.occurredAt,
    })
    .from(schema.auditEntries)
    .where(
      and(
        eq(schema.auditEntries.scopeId, input.scopeId),
        inArray(schema.auditEntries.action, [...PROVENANCE_ACTIONS]),
        eq(schema.auditEntries.outcome, "SUCCESS"),
        inArray(schema.auditEntries.resourceId, [...resourceIds]),
      ),
    )
    .limit(64);
  const corrections = await tx
    .select({
      id: schema.auditEntries.id,
      actorKind: schema.auditEntries.actorKind,
      principalId: schema.auditEntries.principalId,
      scopeId: schema.auditEntries.scopeId,
      action: schema.auditEntries.action,
      resourceType: schema.auditEntries.resourceType,
      resourceId: schema.auditEntries.resourceId,
      outcome: schema.auditEntries.outcome,
      occurredAt: schema.auditEntries.occurredAt,
    })
    .from(schema.auditEntries)
    .where(
      and(
        eq(schema.auditEntries.scopeId, input.scopeId),
        eq(schema.auditEntries.action, "ATTEMPT_CORRECTED"),
        eq(schema.auditEntries.outcome, "SUCCESS"),
        inArray(
          schema.auditEntries.resourceId,
          terminal.map((source) => source.attempt.id),
        ),
      ),
    )
    .limit(64);
  if (
    provenance.length !== terminal.length * 2 ||
    corrections.length !== terminal.length
  )
    return null;
  return { provenance, corrections };
}
