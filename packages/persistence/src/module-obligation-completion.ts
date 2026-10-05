import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { and, eq, inArray, isNotNull, ne, sql } from "drizzle-orm";
import { ApplicationError } from "@cvg/application";
import type { DatabaseExecutor } from "./database-executor.js";
import {
  validateFinalizedModuleObligations,
  type FinalizedModuleObligation,
  type ModuleObligationTerminalWitness,
} from "./module-obligation-finalization.js";
import {
  decideSummativeGrade,
  type ApprovedSummativeGradeEvidence,
  type SummativeGradePolicy,
} from "./module-obligation-grade-policy.js";
import type { ApprovedModuleObligationCaptureInput } from "./module-obligation-validation.js";
import { setDatabaseSecurityContext } from "./security-context.js";
import * as schema from "./schema.js";

export type ModuleCompletionCommand = Readonly<{
  actor: Readonly<{
    actorId: string;
    requestId: string;
    correlationId: string;
  }>;
  expectedAssignmentVersion: number;
  capture: ApprovedModuleObligationCaptureInput;
  witnesses: readonly ModuleObligationTerminalWitness[];
  grade: Readonly<{
    policy: SummativeGradePolicy | null;
    evidence: ApprovedSummativeGradeEvidence;
  }>;
}>;

export type RecordedModuleCompletion = Readonly<{
  assignmentId: string;
  participantId: string;
  scopeId: string;
  moduleId: string;
  status: "CONCLUIDO";
  completedAssignmentVersion: number;
  completedAt: Date;
  manifestId: string;
  manifestVersion: number;
  blueprintVersionId: string;
  blueprintVersion: number;
  witnessCount: number;
}>;

type DatabaseTransaction = Parameters<
  Parameters<DatabaseExecutor["transaction"]>[0]
>[0];

type CompletionContext = Readonly<{
  assignmentId: string;
  participantId: string;
  scopeId: string;
  moduleId: string;
}>;

type AssignmentRow = Readonly<{
  id: string;
  participantId: string;
  scopeId: string;
  moduleId: string;
  status: string;
  version: number;
}>;

type BindingRow = Readonly<{
  manifestId: string;
  manifestVersion: number;
  blueprintVersionId: string;
  blueprintVersion: number;
  boundAt: Date;
  assignmentVersion: number;
}>;

type ManifestRow = Readonly<{
  id: string;
  version: number;
  blueprintVersionId: string;
  blueprintVersion: number;
  approvedAt: Date;
  obligations: ApprovedModuleObligationCaptureInput["manifest"]["obligations"];
}>;

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const modulePattern = /^M(0[1-9]|1[0-9]|2[0-4])$/u;
// A receipt closes the assignment, so a closed, blocked, paused or
// never-assigned row can neither be completed nor backfilled (RN-032).
const completableStatuses: ReadonlySet<string> = new Set([
  "ATRIBUIDO",
  "DISPONIVEL",
  "EM_ANDAMENTO",
  "EM_REFORCO",
  "CONCLUIDO_COM_RETENCAO_PENDENTE",
]);
const syncableActivityStatuses: readonly string[] = [
  "CONCLUIDO",
  "EM_ANDAMENTO",
  "EM_REFORCO",
  "CONCLUIDO_COM_RETENCAO_PENDENTE",
];

function conflict(message: string): never {
  throw new ApplicationError("state_conflict", message);
}

function requireUuid(value: unknown, field: string): string {
  if (typeof value !== "string" || !uuid.test(value))
    conflict(`module completion ${field} is unavailable`);
  return value;
}

function contextOf(
  capture: ApprovedModuleObligationCaptureInput,
): CompletionContext {
  const expected = capture.expected;
  if (!modulePattern.test(expected.moduleId))
    conflict("module completion module is unavailable");
  return Object.freeze({
    assignmentId: requireUuid(expected.assignmentId, "assignment"),
    participantId: requireUuid(expected.participantId, "participant"),
    scopeId: requireUuid(expected.scopeId, "scope"),
    moduleId: expected.moduleId,
  });
}

function assertEvidence(
  command: ModuleCompletionCommand,
  context: CompletionContext,
): void {
  const expected = command.grade.evidence.expected;
  const manifest = command.capture.manifest;
  if (
    expected.assignmentId !== context.assignmentId ||
    expected.participantId !== context.participantId ||
    expected.scopeId !== context.scopeId ||
    expected.moduleId !== context.moduleId ||
    expected.blueprintVersionId !== manifest.blueprintVersionId ||
    expected.blueprintVersion !== manifest.blueprintVersion
  )
    conflict("summative evidence identity is unavailable");
  const graded = new Set(
    command.grade.evidence.obligations.map((entry) => entry.obligationId),
  );
  const inventory = new Set(manifest.obligations.map((entry) => entry.id));
  if (
    graded.size !== inventory.size ||
    [...inventory].some((obligationId) => !graded.has(obligationId))
  )
    conflict("summative evidence inventory is unavailable");
}

/**
 * Every prerequisite is decided before the transaction opens: a denied command
 * never sets a security context, never locks a row and never writes an audit
 * proof. The summative grade stays a separate, explicit approval input (D-102);
 * finishing every mandatory activity alone can never approve a module.
 */
function assertCommand(command: ModuleCompletionCommand): Readonly<{
  context: CompletionContext;
  finalized: readonly FinalizedModuleObligation[];
}> {
  const finalized = validateFinalizedModuleObligations(
    command.capture,
    command.witnesses,
  );
  const context = contextOf(command.capture);
  requireUuid(command.actor.actorId, "actor");
  requireUuid(command.actor.requestId, "request");
  requireUuid(command.actor.correlationId, "correlation");
  if (
    !Number.isSafeInteger(command.expectedAssignmentVersion) ||
    command.expectedAssignmentVersion < 1
  )
    conflict("expected assignment version is unavailable");
  const now = command.capture.now;
  if (
    !(now instanceof Date) ||
    !Number.isFinite(now.getTime()) ||
    now.getTime() > Date.now()
  )
    conflict("module completion time is unavailable");
  const decision = decideSummativeGrade(
    command.grade.policy,
    command.grade.evidence,
  );
  if (decision.outcome !== "APROVADO_SOMATIVO")
    conflict("summative approval is unavailable");
  assertEvidence(command, context);
  return Object.freeze({ context, finalized });
}

async function readAssignment(
  tx: DatabaseTransaction,
  context: CompletionContext,
  expectedVersion: number,
): Promise<AssignmentRow> {
  const assignments = await tx
    .select({
      id: schema.learningAssignments.id,
      participantId: schema.learningAssignments.participantId,
      scopeId: schema.learningAssignments.scopeId,
      moduleId: schema.learningAssignments.moduleId,
      status: schema.learningAssignments.status,
      version: schema.learningAssignments.version,
    })
    .from(schema.learningAssignments)
    .where(
      and(
        eq(schema.learningAssignments.id, context.assignmentId),
        eq(schema.learningAssignments.participantId, context.participantId),
        eq(schema.learningAssignments.scopeId, context.scopeId),
        eq(schema.learningAssignments.moduleId, context.moduleId),
      ),
    )
    .for("update")
    .limit(1);
  const assignment = assignments[0];
  if (assignment === undefined)
    conflict("module assignment is unavailable for completion");
  if (assignment.version !== expectedVersion)
    conflict("module assignment version changed before completion");
  if (!completableStatuses.has(assignment.status))
    conflict("module assignment status does not allow completion");
  return assignment;
}

async function assertNoReceipt(
  tx: DatabaseTransaction,
  context: CompletionContext,
): Promise<void> {
  const receipts = await tx
    .select({
      assignmentId: schema.curriculumModuleCompletionReceipts.assignmentId,
    })
    .from(schema.curriculumModuleCompletionReceipts)
    .where(
      and(
        eq(
          schema.curriculumModuleCompletionReceipts.assignmentId,
          context.assignmentId,
        ),
        eq(
          schema.curriculumModuleCompletionReceipts.participantId,
          context.participantId,
        ),
        eq(schema.curriculumModuleCompletionReceipts.scopeId, context.scopeId),
      ),
    )
    .limit(1);
  if (receipts[0] !== undefined)
    conflict("module assignment already carries a completion receipt");
}

async function readBinding(
  tx: DatabaseTransaction,
  context: CompletionContext,
  capture: ApprovedModuleObligationCaptureInput,
  assignmentVersion: number,
): Promise<BindingRow> {
  const bindings = await tx
    .select({
      manifestId: schema.curriculumAssignmentObligations.manifestId,
      manifestVersion: schema.curriculumAssignmentObligations.manifestVersion,
      blueprintVersionId:
        schema.curriculumAssignmentObligations.blueprintVersionId,
      blueprintVersion: schema.curriculumAssignmentObligations.blueprintVersion,
      boundAt: schema.curriculumAssignmentObligations.boundAt,
      assignmentVersion:
        schema.curriculumAssignmentObligations.assignmentVersion,
    })
    .from(schema.curriculumAssignmentObligations)
    .where(
      and(
        eq(
          schema.curriculumAssignmentObligations.assignmentId,
          context.assignmentId,
        ),
        eq(
          schema.curriculumAssignmentObligations.participantId,
          context.participantId,
        ),
        eq(schema.curriculumAssignmentObligations.scopeId, context.scopeId),
        eq(schema.curriculumAssignmentObligations.moduleId, context.moduleId),
      ),
    )
    .for("update")
    .limit(1);
  const binding = bindings[0];
  const manifest = capture.manifest;
  if (binding === undefined)
    conflict("module obligation binding is unavailable");
  if (
    binding.manifestId !== manifest.id ||
    binding.manifestVersion !== manifest.version ||
    binding.blueprintVersionId !== manifest.blueprintVersionId ||
    binding.blueprintVersion !== manifest.blueprintVersion
  )
    conflict("module obligation binding identity changed before completion");
  if (
    !(binding.boundAt instanceof Date) ||
    !Number.isFinite(binding.boundAt.getTime()) ||
    binding.boundAt.getTime() !== capture.binding.boundAt.getTime() ||
    binding.boundAt > capture.now
  )
    conflict("module obligation binding is not settled before completion");
  if (binding.assignmentVersion > assignmentVersion)
    conflict("module obligation binding observed a later assignment version");
  return binding;
}

async function readManifest(
  tx: DatabaseTransaction,
  context: CompletionContext,
  capture: ApprovedModuleObligationCaptureInput,
): Promise<ManifestRow> {
  const manifests = await tx
    .select({
      id: schema.curriculumModuleObligationManifests.id,
      version: schema.curriculumModuleObligationManifests.version,
      blueprintVersionId:
        schema.curriculumModuleObligationManifests.blueprintVersionId,
      blueprintVersion:
        schema.curriculumModuleObligationManifests.blueprintVersion,
      approvedAt: schema.curriculumModuleObligationManifests.approvedAt,
      obligations: schema.curriculumModuleObligationManifests.obligations,
    })
    .from(schema.curriculumModuleObligationManifests)
    .where(
      and(
        eq(schema.curriculumModuleObligationManifests.scopeId, context.scopeId),
        eq(
          schema.curriculumModuleObligationManifests.moduleId,
          context.moduleId,
        ),
        eq(
          schema.curriculumModuleObligationManifests.version,
          capture.manifest.version,
        ),
      ),
    )
    .limit(1);
  const manifest = manifests[0];
  const stored = capture.manifest;
  if (manifest === undefined)
    conflict("module obligation manifest is not published for this scope");
  if (
    manifest.id !== stored.id ||
    manifest.blueprintVersionId !== stored.blueprintVersionId ||
    manifest.blueprintVersion !== stored.blueprintVersion
  )
    conflict("module obligation manifest identity changed before completion");
  if (
    !(manifest.approvedAt instanceof Date) ||
    !Number.isFinite(manifest.approvedAt.getTime()) ||
    manifest.approvedAt > capture.now
  )
    conflict("module obligation manifest is not approved before completion");
  if (!isDeepStrictEqual(manifest.obligations, stored.obligations))
    conflict("module obligation inventory changed after capture validation");
  return manifest;
}

async function assertBoundActivities(
  tx: DatabaseTransaction,
  context: CompletionContext,
): Promise<void> {
  const inconsistent = await tx
    .select({ activityId: schema.activityAssignments.activityId })
    .from(schema.activityAssignments)
    .innerJoin(
      schema.learningActivities,
      eq(schema.activityAssignments.activityId, schema.learningActivities.id),
    )
    .innerJoin(
      schema.learningAssignments,
      eq(
        schema.activityAssignments.learningAssignmentId,
        schema.learningAssignments.id,
      ),
    )
    .where(
      and(
        eq(schema.activityAssignments.participantId, context.participantId),
        eq(
          schema.activityAssignments.learningAssignmentId,
          context.assignmentId,
        ),
        eq(schema.learningAssignments.participantId, context.participantId),
        eq(schema.learningAssignments.scopeId, context.scopeId),
        eq(schema.learningActivities.scopeId, context.scopeId),
        eq(schema.learningActivities.status, "PUBLISHED"),
        isNotNull(schema.learningActivities.moduleId),
        ne(schema.learningActivities.moduleId, context.moduleId),
      ),
    )
    .limit(1);
  if (inconsistent[0] !== undefined)
    conflict("bound activity module does not match the completed module");
}

async function transitionAssignment(
  tx: DatabaseTransaction,
  context: CompletionContext,
  expectedVersion: number,
  completedAt: Date,
): Promise<number> {
  const updated = await tx
    .update(schema.learningAssignments)
    .set({
      status: "CONCLUIDO",
      version: expectedVersion + 1,
      blockReason: null,
      pausedFrom: null,
      updatedAt: completedAt,
    })
    .where(
      and(
        eq(schema.learningAssignments.id, context.assignmentId),
        eq(schema.learningAssignments.participantId, context.participantId),
        eq(schema.learningAssignments.scopeId, context.scopeId),
        eq(schema.learningAssignments.moduleId, context.moduleId),
        eq(schema.learningAssignments.version, expectedVersion),
      ),
    )
    .returning({
      status: schema.learningAssignments.status,
      version: schema.learningAssignments.version,
    });
  const assignment = updated[0];
  if (assignment === undefined)
    conflict("module assignment cannot be transitioned to CONCLUIDO");
  if (
    assignment.status !== "CONCLUIDO" ||
    assignment.version !== expectedVersion + 1
  )
    conflict("module assignment transition was not recorded");
  return assignment.version;
}

async function syncBoundActivities(
  tx: DatabaseTransaction,
  context: CompletionContext,
): Promise<void> {
  const publishedActivityIds = tx
    .select({ id: schema.learningActivities.id })
    .from(schema.learningActivities)
    .where(
      and(
        eq(schema.learningActivities.scopeId, context.scopeId),
        eq(schema.learningActivities.status, "PUBLISHED"),
      ),
    );
  await tx
    .update(schema.activityAssignments)
    .set({ status: "CONCLUIDO" })
    .where(
      and(
        eq(schema.activityAssignments.participantId, context.participantId),
        eq(
          schema.activityAssignments.learningAssignmentId,
          context.assignmentId,
        ),
        inArray(schema.activityAssignments.status, syncableActivityStatuses),
        inArray(schema.activityAssignments.activityId, publishedActivityIds),
      ),
    );
}

async function writeProof(
  tx: DatabaseTransaction,
  command: ModuleCompletionCommand,
  context: CompletionContext,
  finalized: readonly FinalizedModuleObligation[],
  completedAssignmentVersion: number,
): Promise<string> {
  const { actor } = command;
  const completedAt = command.capture.now;
  const auditEntryId = randomUUID();
  await tx.insert(schema.auditEntries).values({
    id: auditEntryId,
    actorKind: "AUTHENTICATED",
    principalId: actor.actorId,
    action: "MODULE_COMPLETION_RECORDED",
    resourceType: "curriculum_module_completion_receipt",
    resourceId: context.assignmentId,
    scopeId: context.scopeId,
    outcome: "SUCCESS",
    reasonCode: "module_completion_recorded",
    requestId: actor.requestId,
    correlationId: actor.correlationId,
    beforeHash: null,
    afterHash: null,
    occurredAt: completedAt,
  });
  const manifest = command.capture.manifest;
  await tx.insert(schema.curriculumModuleCompletionReceipts).values({
    assignmentId: context.assignmentId,
    participantId: context.participantId,
    scopeId: context.scopeId,
    moduleId: context.moduleId,
    manifestId: manifest.id,
    manifestVersion: manifest.version,
    blueprintVersionId: manifest.blueprintVersionId,
    blueprintVersion: manifest.blueprintVersion,
    completedAssignmentVersion,
    completedAt,
    actorId: actor.actorId,
    requestId: actor.requestId,
    correlationId: actor.correlationId,
    auditEntryId,
    witnesses: finalized.map((witness) => ({
      activityId: witness.activityId,
      attemptId: witness.attemptId,
      attemptVersion: witness.attemptVersion,
      formVersionId: witness.formVersionId,
      formVersion: witness.formVersion,
      correctedAt: witness.correctedAt.toISOString(),
      assessmentResultId: witness.assessmentResultId,
    })),
  });
  return auditEntryId;
}

/**
 * Single writer for the immutable module completion receipt (F02). One
 * transaction locks the assignment, re-reads the binding and the published
 * inventory against the validated capture, proves the separate summative
 * approval, transitions the assignment once, writes exactly one audit proof
 * and one receipt, and mirrors the bound activity status. Nothing is written
 * before every prerequisite has been decided, so a denial leaves no half
 * completion behind.
 */
export async function recordModuleCompletion(
  db: DatabaseExecutor,
  command: ModuleCompletionCommand,
): Promise<RecordedModuleCompletion> {
  const { context, finalized } = assertCommand(command);
  const expectedVersion = command.expectedAssignmentVersion;
  const completedAt = command.capture.now;
  return db.transaction(async (tx) => {
    await setDatabaseSecurityContext(tx, {
      participantId: context.participantId,
      scopeId: context.scopeId,
    });
    const assignment = await readAssignment(tx, context, expectedVersion);
    await assertNoReceipt(tx, context);
    await readBinding(tx, context, command.capture, assignment.version);
    await readManifest(tx, context, command.capture);
    await assertBoundActivities(tx, context);
    await tx.execute(
      sql`select
        set_config('cvg.audit_write', 'on', true),
        set_config('cvg.audit_read', 'on', true),
        set_config('cvg.audit_scope_id', ${context.scopeId}, true)`,
    );
    const completedAssignmentVersion = await transitionAssignment(
      tx,
      context,
      expectedVersion,
      completedAt,
    );
    await syncBoundActivities(tx, context);
    await writeProof(
      tx,
      command,
      context,
      finalized,
      completedAssignmentVersion,
    );
    const manifest = command.capture.manifest;
    return Object.freeze({
      assignmentId: context.assignmentId,
      participantId: context.participantId,
      scopeId: context.scopeId,
      moduleId: context.moduleId,
      status: "CONCLUIDO" as const,
      completedAssignmentVersion,
      completedAt,
      manifestId: manifest.id,
      manifestVersion: manifest.version,
      blueprintVersionId: manifest.blueprintVersionId,
      blueprintVersion: manifest.blueprintVersion,
      witnessCount: finalized.length,
    });
  });
}
