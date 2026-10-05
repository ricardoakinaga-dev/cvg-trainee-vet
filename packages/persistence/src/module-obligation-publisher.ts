import { and, eq, or, sql } from "drizzle-orm";
import { ApplicationError } from "@cvg/application";
import type { DatabaseExecutor } from "./database-executor.js";
import {
  assertApprovedModuleInventory,
  type ApprovedModuleInventoryInput,
} from "./module-obligation-validation.js";
import * as schema from "./schema.js";
import { setDatabaseSecurityContext } from "./security-context.js";

export type ModuleInventoryIdentity = Readonly<{
  blueprintVersionId: string;
  blueprintVersion: number;
  manifestId: string;
  manifestVersion: number;
  scopeId: string;
  moduleId: string;
}>;

function conflict(message: string): never {
  throw new ApplicationError("state_conflict", message);
}

/**
 * Transaction half of the publication seam: duplicate checks and both inserts
 * on an executor whose security and audit contexts are already configured.
 * It never binds an assignment, never records completion and never approves
 * anything: both rows already carry the authenticated approval decisions the
 * guards re-read. Both identities are checked before either row is written, so
 * a rejected publication never leaves half an inventory behind.
 */
export async function publishModuleInventoryIn(
  tx: DatabaseExecutor,
  input: ApprovedModuleInventoryInput,
): Promise<ModuleInventoryIdentity> {
  assertApprovedModuleInventory(input);
  const { blueprint: b, manifest: m } = input;
  const blueprints = await tx
    .select({ id: schema.curriculumModuleBlueprintVersions.id })
    .from(schema.curriculumModuleBlueprintVersions)
    .where(
      or(
        eq(schema.curriculumModuleBlueprintVersions.id, b.id),
        and(
          eq(schema.curriculumModuleBlueprintVersions.scopeId, b.scopeId),
          eq(
            schema.curriculumModuleBlueprintVersions.blueprintId,
            b.blueprintId,
          ),
          eq(schema.curriculumModuleBlueprintVersions.version, b.version),
        ),
      ),
    )
    .limit(1);
  if (blueprints[0] !== undefined)
    conflict("module blueprint version is already published");
  const manifests = await tx
    .select({ id: schema.curriculumModuleObligationManifests.id })
    .from(schema.curriculumModuleObligationManifests)
    .where(
      or(
        eq(schema.curriculumModuleObligationManifests.id, m.id),
        and(
          eq(schema.curriculumModuleObligationManifests.scopeId, m.scopeId),
          eq(schema.curriculumModuleObligationManifests.moduleId, m.moduleId),
          eq(schema.curriculumModuleObligationManifests.version, m.version),
        ),
      ),
    )
    .limit(1);
  if (manifests[0] !== undefined)
    conflict("module obligation manifest is already published");
  await tx.insert(schema.curriculumModuleBlueprintVersions).values({
    id: b.id,
    blueprintId: b.blueprintId,
    version: b.version,
    scopeId: b.scopeId,
    moduleId: b.moduleId,
    approvalDecisionId: b.approval.decisionId,
    approvedBy: b.approval.actorId,
    approvedAt: b.approval.at,
    snapshot: { ...b.snapshot, itemManifest: b.itemManifest },
  });
  await tx.insert(schema.curriculumModuleObligationManifests).values({
    id: m.id,
    version: m.version,
    scopeId: m.scopeId,
    moduleId: m.moduleId,
    blueprintVersionId: m.blueprintVersionId,
    blueprintVersion: m.blueprintVersion,
    approvalDecisionId: m.approval.decisionId,
    approvedBy: m.approval.actorId,
    approvedAt: m.approval.at,
    obligations: m.obligations,
  });
  return Object.freeze({
    blueprintVersionId: b.id,
    blueprintVersion: b.version,
    manifestId: m.id,
    manifestVersion: m.version,
    scopeId: b.scopeId,
    moduleId: b.moduleId,
  });
}

/**
 * Publication seam for the whole approved inventory. It never binds an
 * assignment, never records completion and never approves anything: both rows
 * already carry the authenticated approval decisions the guards re-read.
 * Both identities are checked before either row is written, so a rejected
 * publication never leaves half an inventory behind.
 */
export async function publishModuleInventory(
  db: DatabaseExecutor,
  input: ApprovedModuleInventoryInput,
): Promise<ModuleInventoryIdentity> {
  assertApprovedModuleInventory(input);
  const { blueprint: b } = input,
    scopeId = b.scopeId;
  return db.transaction(async (tx) => {
    await setDatabaseSecurityContext(tx, { scopeId });
    await tx.execute(
      sql`select set_config('cvg.audit_read', 'on', true), set_config('cvg.audit_scope_id', ${scopeId}, true)`,
    );
    return publishModuleInventoryIn(tx, input);
  });
}
