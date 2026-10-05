import { and, eq } from "drizzle-orm";
import { ApplicationError } from "@cvg/application";
import type { DatabaseExecutor } from "./database-executor.js";
import * as schema from "./schema.js";
import { setDatabaseSecurityContext } from "./security-context.js";

export type ModuleObligationBindingCommand = Readonly<{
  now: Date;
  expectedAssignmentVersion: number;
  assignment: Readonly<{
    assignmentId: string;
    participantId: string;
    scopeId: string;
    moduleId: string;
  }>;
  manifest: Readonly<{
    id: string;
    version: number;
    blueprintVersionId: string;
    blueprintVersion: number;
  }>;
}>;

export type BoundModuleObligation = Readonly<{
  assignmentId: string;
  participantId: string;
  scopeId: string;
  moduleId: string;
  manifestId: string;
  manifestVersion: number;
  blueprintVersionId: string;
  blueprintVersion: number;
  boundAt: Date;
  assignmentVersion: number;
}>;

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

function conflict(message: string): never {
  throw new ApplicationError("state_conflict", message);
}
function positive(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}
function identity(command: ModuleObligationBindingCommand): void {
  const { assignment: a, manifest: m } = command;
  for (const value of [a.assignmentId, a.participantId, a.scopeId])
    if (!uuid.test(value)) conflict("module binding identity is unavailable");
  if (!/^M(0[1-9]|1[0-9]|2[0-4])$/u.test(a.moduleId))
    conflict("module binding identity is unavailable");
  if (!uuid.test(m.id) || !uuid.test(m.blueprintVersionId))
    conflict("module binding identity is unavailable");
  if (!positive(m.version) || !positive(m.blueprintVersion))
    conflict("module binding identity is unavailable");
  if (!positive(command.expectedAssignmentVersion))
    conflict("module binding identity is unavailable");
}

/**
 * Immutable manifest identity as stored, as observed by the binding seam.
 */
export type StoredModuleManifest = Readonly<{
  id: string;
  version: number;
  scopeId: string;
  moduleId: string;
  blueprintVersionId: string;
  blueprintVersion: number;
  approvedAt: Date;
}>;

export function assertBindingCommand(
  command: ModuleObligationBindingCommand,
): void {
  identity(command);
  if (!(command.now instanceof Date) || !Number.isFinite(command.now.getTime()))
    conflict("module binding time is unavailable");
  if (command.now.getTime() > Date.now())
    conflict("module binding time is unavailable");
}

/**
 * Transaction half of the assignment binding seam. The immutable inventory is
 * published first; this records which manifest this assignment is held to, at
 * the observed assignment version, without touching any completion fact. The
 * stored manifest is read through the callback so a caller that already
 * observed it (for example the assignment-creation flow) can reuse that row.
 */
export async function bindModuleObligationIn(
  tx: DatabaseExecutor,
  command: ModuleObligationBindingCommand,
  readStoredManifest: () => Promise<StoredModuleManifest | null>,
): Promise<BoundModuleObligation> {
  assertBindingCommand(command);
  const { assignment: a, manifest: m } = command;
  const assignments = await tx
    .select({
      id: schema.learningAssignments.id,
      version: schema.learningAssignments.version,
    })
    .from(schema.learningAssignments)
    .where(
      and(
        eq(schema.learningAssignments.id, a.assignmentId),
        eq(schema.learningAssignments.participantId, a.participantId),
        eq(schema.learningAssignments.scopeId, a.scopeId),
        eq(schema.learningAssignments.moduleId, a.moduleId),
      ),
    )
    .for("update")
    .limit(1);
  const assignment = assignments[0];
  if (assignment === undefined)
    conflict("learning assignment is not available for binding");
  if (assignment.version !== command.expectedAssignmentVersion)
    conflict("learning assignment version changed before binding");
  const bindings = await tx
    .select({
      assignmentId: schema.curriculumAssignmentObligations.assignmentId,
    })
    .from(schema.curriculumAssignmentObligations)
    .where(
      and(
        eq(schema.curriculumAssignmentObligations.assignmentId, a.assignmentId),
        eq(
          schema.curriculumAssignmentObligations.participantId,
          a.participantId,
        ),
        eq(schema.curriculumAssignmentObligations.scopeId, a.scopeId),
        eq(schema.curriculumAssignmentObligations.moduleId, a.moduleId),
      ),
    )
    .limit(1);
  if (bindings[0] !== undefined)
    conflict("learning assignment already carries an obligation binding");
  const manifest = await readStoredManifest();
  if (manifest === null)
    conflict("module obligation manifest is not published for this scope");
  if (
    manifest.scopeId !== a.scopeId ||
    manifest.moduleId !== a.moduleId ||
    manifest.version !== m.version ||
    manifest.id !== m.id ||
    manifest.blueprintVersionId !== m.blueprintVersionId ||
    manifest.blueprintVersion !== m.blueprintVersion
  )
    conflict("module obligation manifest identity changed before binding");
  if (
    !(manifest.approvedAt instanceof Date) ||
    !Number.isFinite(manifest.approvedAt.getTime()) ||
    manifest.approvedAt > command.now
  )
    conflict("module obligation manifest is not approved before binding");
  await tx.insert(schema.curriculumAssignmentObligations).values({
    assignmentId: a.assignmentId,
    participantId: a.participantId,
    scopeId: a.scopeId,
    moduleId: a.moduleId,
    manifestId: m.id,
    manifestVersion: m.version,
    blueprintVersionId: m.blueprintVersionId,
    blueprintVersion: m.blueprintVersion,
    boundAt: command.now,
    assignmentVersion: assignment.version,
  });
  return Object.freeze({
    assignmentId: a.assignmentId,
    participantId: a.participantId,
    scopeId: a.scopeId,
    moduleId: a.moduleId,
    manifestId: m.id,
    manifestVersion: m.version,
    blueprintVersionId: m.blueprintVersionId,
    blueprintVersion: m.blueprintVersion,
    boundAt: command.now,
    assignmentVersion: assignment.version,
  });
}

/**
 * Assignment binding seam. The immutable inventory is published first; this
 * records which manifest this assignment is held to, at the observed assignment
 * version, without touching any completion fact.
 */
export async function bindModuleObligation(
  db: DatabaseExecutor,
  command: ModuleObligationBindingCommand,
): Promise<BoundModuleObligation> {
  assertBindingCommand(command);
  const { assignment: a, manifest: m } = command;
  return db.transaction(async (tx) => {
    await setDatabaseSecurityContext(tx, {
      participantId: a.participantId,
      scopeId: a.scopeId,
    });
    return bindModuleObligationIn(tx, command, async () => {
      const manifests = await tx
        .select({
          id: schema.curriculumModuleObligationManifests.id,
          version: schema.curriculumModuleObligationManifests.version,
          scopeId: schema.curriculumModuleObligationManifests.scopeId,
          moduleId: schema.curriculumModuleObligationManifests.moduleId,
          blueprintVersionId:
            schema.curriculumModuleObligationManifests.blueprintVersionId,
          blueprintVersion:
            schema.curriculumModuleObligationManifests.blueprintVersion,
          approvedAt: schema.curriculumModuleObligationManifests.approvedAt,
        })
        .from(schema.curriculumModuleObligationManifests)
        .where(
          and(
            eq(schema.curriculumModuleObligationManifests.scopeId, a.scopeId),
            eq(schema.curriculumModuleObligationManifests.moduleId, a.moduleId),
            eq(schema.curriculumModuleObligationManifests.version, m.version),
          ),
        )
        .limit(1);
      return manifests[0] ?? null;
    });
  });
}
