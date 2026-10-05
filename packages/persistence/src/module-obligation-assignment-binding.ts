import { and, desc, eq } from "drizzle-orm";
import { ApplicationError } from "@cvg/application";
import type { DatabaseExecutor } from "./database-executor.js";
import {
  bindModuleObligationIn,
  type BoundModuleObligation,
  type ModuleObligationBindingCommand,
} from "./module-obligation-binding.js";
import * as schema from "./schema.js";

export type AssignmentObligationBindingInput = Readonly<{
  readonly assignmentId: string;
  readonly participantId: string;
  readonly scopeId: string;
  readonly moduleId: string;
  readonly expectedAssignmentVersion: number;
}>;

function conflict(message: string): never {
  throw new ApplicationError("state_conflict", message);
}

/**
 * Step B: bind the published manifest at the original INICIAR, after the
 * assignment update was read back and activity statuses were synced, inside
 * the same transaction. The latest manifest for this scope and module is read
 * once; when none exists the start proceeds without a binding (dormant), and a
 * manifest observed under another scope is rejected rather than bound. The
 * caller already carries the participant and scope security context.
 */
export async function bindAssignmentObligations(
  tx: DatabaseExecutor,
  input: AssignmentObligationBindingInput,
): Promise<BoundModuleObligation | null> {
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
        eq(schema.curriculumModuleObligationManifests.moduleId, input.moduleId),
        eq(schema.curriculumModuleObligationManifests.scopeId, input.scopeId),
      ),
    )
    .orderBy(desc(schema.curriculumModuleObligationManifests.version))
    .limit(1);
  const stored = manifests[0];
  if (stored === undefined) return null;
  if (stored.scopeId !== input.scopeId || stored.moduleId !== input.moduleId)
    conflict("module obligation manifest is not published for this scope");
  const command: ModuleObligationBindingCommand = {
    now: new Date(),
    expectedAssignmentVersion: input.expectedAssignmentVersion,
    assignment: {
      assignmentId: input.assignmentId,
      participantId: input.participantId,
      scopeId: input.scopeId,
      moduleId: input.moduleId,
    },
    manifest: {
      id: stored.id,
      version: stored.version,
      blueprintVersionId: stored.blueprintVersionId,
      blueprintVersion: stored.blueprintVersion,
    },
  };
  return bindModuleObligationIn(tx, command, () =>
    Promise.resolve({
      id: stored.id,
      version: stored.version,
      scopeId: stored.scopeId,
      moduleId: stored.moduleId,
      blueprintVersionId: stored.blueprintVersionId,
      blueprintVersion: stored.blueprintVersion,
      approvedAt: stored.approvedAt,
    }),
  );
}
