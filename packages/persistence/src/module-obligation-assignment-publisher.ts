import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { DatabaseExecutor } from "./database-executor.js";
import type { CurriculumPublicationDecision } from "./curriculum-publication-provenance.js";
import {
  publishModuleInventoryIn,
  type ModuleInventoryIdentity,
} from "./module-obligation-publisher.js";
import type { ApprovedModuleInventoryInput } from "./module-obligation-validation.js";
import * as schema from "./schema.js";
import { setDatabaseSecurityContext } from "./security-context.js";

const BLUEPRINT_APPROVAL_ACTION = "CURRICULUM_MODULE_BLUEPRINT_APPROVED";
const OBLIGATIONS_APPROVAL_ACTION = "CURRICULUM_MODULE_OBLIGATIONS_APPROVED";
const BLUEPRINT_RESOURCE_TYPE = "curriculum_module_blueprint_version";
const MANIFEST_RESOURCE_TYPE = "curriculum_module_obligation_manifest";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export type ModuleInventoryAssignmentPublishInput = Readonly<{
  readonly scopeId: string;
  readonly moduleId: string;
  readonly idFactory: () => string;
}>;

export type ModuleApproval = Readonly<{
  decisionId: string;
  actorId: string;
  at: Date;
  resourceId: string;
  decision: CurriculumPublicationDecision;
}>;

type InventorySources = Readonly<{
  forms: readonly (typeof schema.curriculumFormVersions.$inferSelect)[];
  blueprints: readonly (typeof schema.curriculumBlueprintVersions.$inferSelect)[];
  activityForms: readonly (typeof schema.curriculumActivityForms.$inferSelect)[];
  activities: readonly (typeof schema.learningActivities.$inferSelect)[];
  items: readonly (typeof schema.curriculumFormItems.$inferSelect)[];
}>;

type BlueprintItemEntry = Readonly<{
  itemId: string;
  objectiveId: string;
  responseMode: "CHOICE" | "TEXT";
  critical: boolean;
  sessionId: string;
}>;

type WholeBlueprint = Readonly<{
  itemManifest: readonly BlueprintItemEntry[];
  snapshot: Readonly<{
    questionCountsBySession: readonly [number, number, number, number];
    questionTotal: number;
    openResponseCount: number;
    objectiveIds: string[];
  }>;
}>;

type AssemblyInput = Readonly<{
  sources: InventorySources;
  approvals: readonly [ModuleApproval, ModuleApproval];
  scopeId: string;
  moduleId: string;
  now: Date;
  idFactory: () => string;
}>;

function validDate(value: unknown): value is Date {
  return value instanceof Date && Number.isFinite(value.getTime());
}

function decision(
  row: typeof schema.auditEntries.$inferSelect,
): CurriculumPublicationDecision {
  return {
    id: row.id,
    actorKind: row.actorKind,
    principalId: row.principalId,
    scopeId: row.scopeId,
    action: row.action,
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    outcome: row.outcome,
    occurredAt: row.occurredAt,
  };
}

function approval(
  row: typeof schema.auditEntries.$inferSelect,
): ModuleApproval {
  return {
    decisionId: row.id,
    actorId: row.principalId as string,
    at: row.occurredAt,
    resourceId: row.resourceId as string,
    decision: decision(row),
  };
}

/**
 * True when this scope and module already carry a published inventory. A
 * half-published state (blueprint without manifest or the reverse) also counts:
 * publication is skipped and binding stays dormant instead of guessing.
 */
async function inventoryPublished(
  tx: DatabaseExecutor,
  scopeId: string,
  moduleId: string,
): Promise<boolean> {
  const manifests = await tx
    .select({ id: schema.curriculumModuleObligationManifests.id })
    .from(schema.curriculumModuleObligationManifests)
    .where(
      and(
        eq(schema.curriculumModuleObligationManifests.scopeId, scopeId),
        eq(schema.curriculumModuleObligationManifests.moduleId, moduleId),
      ),
    )
    .limit(1);
  if (manifests[0] !== undefined) return true;
  const blueprints = await tx
    .select({ id: schema.curriculumModuleBlueprintVersions.id })
    .from(schema.curriculumModuleBlueprintVersions)
    .where(
      and(
        eq(schema.curriculumModuleBlueprintVersions.scopeId, scopeId),
        eq(schema.curriculumModuleBlueprintVersions.moduleId, moduleId),
      ),
    )
    .limit(1);
  return blueprints[0] !== undefined;
}

/**
 * Fail-closed reader for the two pre-allocated F02 approval rows. Exactly one
 * successful blueprint approval and one obligations approval may exist for the
 * scope; anything ambiguous, structurally invalid or out of order publishes
 * nothing and throws no error, so assignment creation is never held hostage by
 * a missing or noisy approval trail. There is no inventory-approval flow yet:
 * this reader is the documented production prerequisite.
 */
export async function readModuleApprovals(
  tx: DatabaseExecutor,
  scopeId: string,
  now: Date,
): Promise<readonly [ModuleApproval, ModuleApproval] | null> {
  await tx.execute(
    sql`select set_config('cvg.audit_read', 'on', true), set_config('cvg.audit_scope_id', ${scopeId}, true)`,
  );
  const rows = await tx
    .select()
    .from(schema.auditEntries)
    .where(
      and(
        eq(schema.auditEntries.scopeId, scopeId),
        inArray(schema.auditEntries.action, [
          BLUEPRINT_APPROVAL_ACTION,
          OBLIGATIONS_APPROVAL_ACTION,
        ]),
        eq(schema.auditEntries.outcome, "SUCCESS"),
      ),
    )
    .orderBy(asc(schema.auditEntries.occurredAt))
    .limit(16);
  const blueprintRows = rows.filter(
    (row) => row.action === BLUEPRINT_APPROVAL_ACTION,
  );
  const manifestRows = rows.filter(
    (row) => row.action === OBLIGATIONS_APPROVAL_ACTION,
  );
  if (blueprintRows.length !== 1 || manifestRows.length !== 1) return null;
  const blueprint = blueprintRows[0]!;
  const manifest = manifestRows[0]!;
  if (
    blueprint.resourceType !== BLUEPRINT_RESOURCE_TYPE ||
    manifest.resourceType !== MANIFEST_RESOURCE_TYPE ||
    blueprint.actorKind !== "AUTHENTICATED" ||
    manifest.actorKind !== "AUTHENTICATED" ||
    blueprint.scopeId !== scopeId ||
    manifest.scopeId !== scopeId
  )
    return null;
  if (
    typeof blueprint.resourceId !== "string" ||
    !uuid.test(blueprint.resourceId) ||
    typeof manifest.resourceId !== "string" ||
    !uuid.test(manifest.resourceId) ||
    blueprint.resourceId === manifest.resourceId ||
    typeof blueprint.principalId !== "string" ||
    !uuid.test(blueprint.principalId) ||
    typeof manifest.principalId !== "string" ||
    !uuid.test(manifest.principalId)
  )
    return null;
  if (!validDate(blueprint.occurredAt) || !validDate(manifest.occurredAt))
    return null;
  if (blueprint.occurredAt > manifest.occurredAt) return null;
  if (manifest.occurredAt > now) return null;
  return [approval(blueprint), approval(manifest)];
}

/**
 * Source catalogs for the whole-module inventory: published module-completion
 * forms with their blueprints, the activity-to-form bindings, the published
 * module activities and the frozen form items. Every query is scope-bound.
 */
async function readInventorySources(
  tx: DatabaseExecutor,
  scopeId: string,
  moduleId: string,
): Promise<InventorySources | null> {
  const forms = await tx
    .select()
    .from(schema.curriculumFormVersions)
    .where(
      and(
        eq(schema.curriculumFormVersions.scopeId, scopeId),
        eq(schema.curriculumFormVersions.moduleId, moduleId),
        eq(schema.curriculumFormVersions.status, "PUBLICADO"),
        eq(schema.curriculumFormVersions.mode, "MODULE_COMPLETION"),
      ),
    )
    .orderBy(asc(schema.curriculumFormVersions.id))
    .limit(100);
  if (forms.length === 0) return null;
  const blueprintIds = [
    ...new Set(forms.map((form) => form.blueprintVersionId)),
  ];
  const blueprints = await tx
    .select()
    .from(schema.curriculumBlueprintVersions)
    .where(
      and(
        eq(schema.curriculumBlueprintVersions.scopeId, scopeId),
        inArray(schema.curriculumBlueprintVersions.id, blueprintIds),
      ),
    )
    .limit(101);
  const activityForms = await tx
    .select()
    .from(schema.curriculumActivityForms)
    .where(
      and(
        eq(schema.curriculumActivityForms.scopeId, scopeId),
        eq(schema.curriculumActivityForms.moduleId, moduleId),
      ),
    )
    .limit(101);
  const activities = await tx
    .select()
    .from(schema.learningActivities)
    .where(
      and(
        eq(schema.learningActivities.scopeId, scopeId),
        eq(schema.learningActivities.moduleId, moduleId),
        eq(schema.learningActivities.status, "PUBLISHED"),
      ),
    )
    .orderBy(asc(schema.learningActivities.id))
    .limit(101);
  if (activities.length === 0 || activities.length > 100) return null;
  const items = await tx
    .select()
    .from(schema.curriculumFormItems)
    .where(
      and(
        eq(schema.curriculumFormItems.scopeId, scopeId),
        inArray(
          schema.curriculumFormItems.formVersionId,
          forms.map((form) => form.id),
        ),
      ),
    )
    .orderBy(
      asc(schema.curriculumFormItems.formVersionId),
      asc(schema.curriculumFormItems.ordinal),
    )
    .limit(101);
  if (items.length > 100) return null;
  return { forms, blueprints, activityForms, activities, items };
}

/**
 * Derive the whole-module snapshot and item manifest from the frozen form
 * items, validating every field the inventory assertion would reject so a bad
 * source row publishes nothing instead of failing assignment creation.
 */
function buildWholeBlueprint(
  items: readonly (typeof schema.curriculumFormItems.$inferSelect)[],
  moduleId: string,
): WholeBlueprint | null {
  const sessions = [1, 2, 3, 4].map((n) => `${moduleId}-S${n}`);
  const counts = [0, 0, 0, 0];
  const objectives = new Set<string>();
  const canonicalIds = new Set<string>();
  const contentVersionIds = new Set<string>();
  const itemManifest: BlueprintItemEntry[] = [];
  let open = 0;
  for (const item of items) {
    const catalog = item.catalogItem;
    if (
      typeof catalog?.id !== "string" ||
      catalog.id !== item.canonicalItemId ||
      typeof catalog.objectiveId !== "string" ||
      catalog.objectiveId !== catalog.objectiveId.trim() ||
      catalog.objectiveId.length === 0 ||
      typeof catalog.critical !== "boolean"
    )
      return null;
    const responseMode =
      catalog.responseMode === "CHOICE" || catalog.responseMode === "TEXT"
        ? catalog.responseMode
        : null;
    const session =
      responseMode === null ? -1 : sessions.indexOf(catalog.sessionId);
    if (responseMode === null || session < 0) return null;
    if (canonicalIds.has(item.canonicalItemId)) return null;
    if (contentVersionIds.has(item.contentVersionId)) return null;
    canonicalIds.add(item.canonicalItemId);
    contentVersionIds.add(item.contentVersionId);
    if (responseMode === "CHOICE") counts[session] = counts[session]! + 1;
    else open += 1;
    objectives.add(catalog.objectiveId);
    itemManifest.push({
      itemId: catalog.id,
      objectiveId: catalog.objectiveId,
      responseMode,
      critical: catalog.critical,
      sessionId: catalog.sessionId,
    });
  }
  const questionTotal = counts.reduce((sum, count) => sum + count, 0);
  const sessionCounts = counts as [number, number, number, number];
  if (
    counts.some((count) => count < 1) ||
    open < 1 ||
    questionTotal > 100 ||
    questionTotal + open > 100 ||
    objectives.size === 0
  )
    return null;
  return {
    itemManifest,
    snapshot: {
      questionCountsBySession: sessionCounts,
      questionTotal,
      openResponseCount: open,
      objectiveIds: [...objectives],
    },
  };
}

/**
 * Assemble the approved inventory from the observed approvals and source
 * catalogs, or return null when any source is missing, ambiguous or
 * inconsistent. Idempotent obligation ids come from the injected factory.
 */
function assembleInventory(
  input: AssemblyInput,
): ApprovedModuleInventoryInput | null {
  const { forms, blueprints, activityForms, activities, items } = input.sources;
  const formById = new Map(forms.map((form) => [form.id, form]));
  const blueprintById = new Map(blueprints.map((row) => [row.id, row]));
  const bindingByActivity = new Map(
    activityForms.map((binding) => [binding.activityId, binding.formVersionId]),
  );
  const usedFormIds: string[] = [];
  for (const activity of activities) {
    const formVersionId = bindingByActivity.get(activity.id);
    if (formVersionId === undefined) return null;
    if (!formById.has(formVersionId)) return null;
    if (usedFormIds.includes(formVersionId)) return null;
    usedFormIds.push(formVersionId);
  }
  const itemsByForm = new Map<
    string,
    (typeof schema.curriculumFormItems.$inferSelect)[]
  >();
  for (const item of items) {
    const list = itemsByForm.get(item.formVersionId);
    if (list === undefined) itemsByForm.set(item.formVersionId, [item]);
    else list.push(item);
  }
  const usedItems = usedFormIds.flatMap(
    (formVersionId) => itemsByForm.get(formVersionId) ?? [],
  );
  for (const formVersionId of usedFormIds) {
    const form = formById.get(formVersionId)!;
    const blueprint = blueprintById.get(form.blueprintVersionId);
    if (blueprint === undefined) return null;
    if ((itemsByForm.get(formVersionId) ?? []).length === 0) return null;
  }
  const whole = buildWholeBlueprint(usedItems, input.moduleId);
  if (whole === null) return null;
  const [blueprintApproval, manifestApproval] = input.approvals;
  const obligations = activities.map((activity, index) => {
    const formVersionId = usedFormIds[index]!;
    const form = formById.get(formVersionId)!;
    const blueprint = blueprintById.get(form.blueprintVersionId)!;
    return {
      id: input.idFactory(),
      activityId: activity.id,
      formVersionId,
      formVersion: form.version,
      blueprintVersionId: form.blueprintVersionId,
      blueprintVersion: blueprint.version,
      evidenceKind: "CURRICULUM_ATTEMPT" as const,
      items: (itemsByForm.get(formVersionId) ?? []).map((item) => ({
        canonicalItemId: item.canonicalItemId,
        contentVersionId: item.contentVersionId,
        contentId: item.contentId,
        contentVersion: item.contentVersion,
        ordinal: item.ordinal,
      })),
    };
  });
  return {
    now: input.now,
    blueprint: {
      id: blueprintApproval.resourceId,
      blueprintId: `module-blueprint-${input.moduleId}`,
      version: 1,
      scopeId: input.scopeId,
      moduleId: input.moduleId,
      approval: {
        decisionId: blueprintApproval.decisionId,
        actorId: blueprintApproval.actorId,
        at: blueprintApproval.at,
      },
      snapshot: whole.snapshot,
      itemManifest: whole.itemManifest,
    },
    manifest: {
      id: manifestApproval.resourceId,
      version: 1,
      scopeId: input.scopeId,
      moduleId: input.moduleId,
      blueprintVersionId: blueprintApproval.resourceId,
      blueprintVersion: 1,
      approval: {
        decisionId: manifestApproval.decisionId,
        actorId: manifestApproval.actorId,
        at: manifestApproval.at,
      },
      obligations,
    },
    approvals: [blueprintApproval.decision, manifestApproval.decision],
  };
}

/**
 * Step A: publish the approved module inventory during assignment creation,
 * after the assignment itself was read back, inside the same transaction. It
 * runs scope-bound (participant-free), reads the pre-allocated F02 approval
 * identity fail-closed and publishes nothing when approvals or sources are
 * absent, ambiguous or inconsistent. It never binds and never completes.
 */
export async function publishModuleInventoryForAssignment(
  tx: DatabaseExecutor,
  input: ModuleInventoryAssignmentPublishInput,
): Promise<ModuleInventoryIdentity | null> {
  const now = new Date();
  await setDatabaseSecurityContext(tx, { scopeId: input.scopeId });
  if (await inventoryPublished(tx, input.scopeId, input.moduleId)) return null;
  const approvals = await readModuleApprovals(tx, input.scopeId, now);
  if (approvals === null) return null;
  const sources = await readInventorySources(tx, input.scopeId, input.moduleId);
  if (sources === null) return null;
  const inventory = assembleInventory({
    sources,
    approvals,
    scopeId: input.scopeId,
    moduleId: input.moduleId,
    now,
    idFactory: input.idFactory,
  });
  if (inventory === null) return null;
  return publishModuleInventoryIn(tx, inventory);
}
