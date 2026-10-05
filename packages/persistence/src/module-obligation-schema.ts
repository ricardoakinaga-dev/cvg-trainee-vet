import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
  type ExtraConfigColumn,
} from "drizzle-orm/pg-core";
import type { ModuleAssessmentBlueprint } from "@cvg/curriculum";

type Identity = Readonly<{ id: AnyPgColumn }>;
type AssignmentIdentity = Identity &
  Readonly<{
    participantId: AnyPgColumn;
    scopeId: AnyPgColumn;
    moduleId: AnyPgColumn;
  }>;
type Refs = Readonly<{
  accounts: Identity;
  audit: Identity;
  assignments: AssignmentIdentity;
}>;
// Compile-time tests establish structural equality with sealed M1. Importing
// M1 here would create a static schema/storage/capture cycle via type edges.
type ModuleSnapshot = Pick<
  ModuleAssessmentBlueprint,
  | "questionCountsBySession"
  | "questionTotal"
  | "openResponseCount"
  | "objectiveIds"
> &
  Readonly<{
    itemManifest: readonly Readonly<{
      itemId: string;
      objectiveId: string;
      responseMode: "CHOICE" | "TEXT";
      critical: boolean;
      sessionId: string;
    }>[];
  }>;
type Obligations = readonly Readonly<{
  id: string;
  activityId: string;
  formVersionId: string;
  formVersion: number;
  blueprintVersionId: string;
  blueprintVersion: number;
  evidenceKind: "CURRICULUM_ATTEMPT";
  items: readonly Readonly<{
    canonicalItemId: string;
    contentVersionId: string;
    contentId: string;
    contentVersion: number;
    ordinal: number;
  }>[];
}>[];

/** Internal immutable witnesses; human correction requires assessmentResultId upstream. */
export type ModuleCompletionWitness = Readonly<{
  activityId: string;
  attemptId: string;
  attemptVersion: number;
  formVersionId: string;
  formVersion: number;
  correctedAt: string;
  assessmentResultId?: string;
}>;

export function assignmentIdentity(
  table: Readonly<Record<keyof AssignmentIdentity, ExtraConfigColumn>>,
) {
  return uniqueIndex("learning_assignments_identity_idx").on(
    table.id,
    table.participantId,
    table.scopeId,
    table.moduleId,
  );
}
function approvals(refs: Refs) {
  return {
    approvalDecisionId: uuid("approval_decision_id")
      .notNull()
      .references(() => refs.audit.id, { onDelete: "restrict" }),
    approvedBy: uuid("approved_by")
      .notNull()
      .references(() => refs.accounts.id, { onDelete: "restrict" }),
    approvedAt: timestamp("approved_at", { withTimezone: true }).notNull(),
  };
}
function context() {
  return {
    assignmentId: uuid("assignment_id").primaryKey(),
    participantId: uuid("participant_id").notNull(),
    scopeId: uuid("scope_id").notNull(),
    moduleId: text("module_id").notNull(),
  };
}
function inventory() {
  return {
    manifestId: uuid("manifest_id").notNull(),
    manifestVersion: integer("manifest_version").notNull(),
    blueprintVersionId: uuid("blueprint_version_id").notNull(),
    blueprintVersion: integer("blueprint_version").notNull(),
  };
}
function createBlueprints(refs: Refs) {
  return pgTable(
    "curriculum_module_blueprint_versions",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      blueprintId: text("blueprint_id").notNull(),
      version: integer("version").notNull(),
      scopeId: uuid("scope_id").notNull(),
      moduleId: text("module_id").notNull(),
      ...approvals(refs),
      snapshot: jsonb("snapshot").$type<ModuleSnapshot>().notNull(),
    },
    (t) => [
      uniqueIndex("module_blueprint_version_idx").on(
        t.scopeId,
        t.blueprintId,
        t.version,
      ),
      uniqueIndex("module_blueprint_identity_idx").on(
        t.id,
        t.version,
        t.scopeId,
        t.moduleId,
      ),
      check("module_blueprint_version_check", sql`${t.version} >= 1`),
      check(
        "module_blueprint_module_check",
        sql`${t.moduleId} ~ '^M(0[1-9]|1[0-9]|2[0-4])$'`,
      ),
      check(
        "module_blueprint_name_check",
        sql`length(trim(${t.blueprintId})) between 1 and 200`,
      ),
      check(
        "module_blueprint_snapshot_check",
        sql`coalesce(
      jsonb_typeof(${t.snapshot}) = 'object'
      and jsonb_typeof(${t.snapshot}->'questionCountsBySession') = 'array'
      and jsonb_array_length(${t.snapshot}->'questionCountsBySession') = 4
      and jsonb_typeof(${t.snapshot}->'objectiveIds') = 'array'
      and jsonb_array_length(${t.snapshot}->'objectiveIds') between 1 and 100
      and jsonb_typeof(${t.snapshot}->'itemManifest') = 'array'
      and jsonb_array_length(${t.snapshot}->'itemManifest') between 1 and 100
      and jsonb_typeof(${t.snapshot}->'questionTotal') = 'number'
      and (${t.snapshot}->>'questionTotal')::integer > 0
      and jsonb_typeof(${t.snapshot}->'openResponseCount') = 'number'
      and (${t.snapshot}->>'openResponseCount')::integer > 0
      and (${t.snapshot}->>'questionTotal')::integer + (${t.snapshot}->>'openResponseCount')::integer
        = jsonb_array_length(${t.snapshot}->'itemManifest')
      and not jsonb_path_exists(${t.snapshot}, '$.itemManifest[*] ? (@.type() != "object")'), false)`,
      ),
    ],
  ).enableRLS();
}
function createManifests(
  refs: Refs,
  blueprints: ReturnType<typeof createBlueprints>,
) {
  return pgTable(
    "curriculum_module_obligation_manifests",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      version: integer("version").notNull(),
      scopeId: uuid("scope_id").notNull(),
      moduleId: text("module_id").notNull(),
      blueprintVersionId: uuid("blueprint_version_id").notNull(),
      blueprintVersion: integer("blueprint_version").notNull(),
      ...approvals(refs),
      obligations: jsonb("obligations").$type<Obligations>().notNull(),
    },
    (t) => [
      uniqueIndex("module_manifest_identity_idx").on(
        t.id,
        t.version,
        t.blueprintVersionId,
        t.blueprintVersion,
        t.scopeId,
        t.moduleId,
      ),
      foreignKey({
        name: "module_manifest_blueprint_fk",
        columns: [
          t.blueprintVersionId,
          t.blueprintVersion,
          t.scopeId,
          t.moduleId,
        ],
        foreignColumns: [
          blueprints.id,
          blueprints.version,
          blueprints.scopeId,
          blueprints.moduleId,
        ],
      }).onDelete("restrict"),
      check(
        "module_manifest_version_check",
        sql`${t.version} >= 1 and ${t.blueprintVersion} >= 1`,
      ),
      check(
        "module_manifest_module_check",
        sql`${t.moduleId} ~ '^M(0[1-9]|1[0-9]|2[0-4])$'`,
      ),
      check(
        "module_obligations_json_check",
        sql`coalesce(jsonb_typeof(${t.obligations}) = 'array'
      and jsonb_array_length(${t.obligations}) between 1 and 100
      and not jsonb_path_exists(${t.obligations}, '$[*] ? (@.type() != "object" || !exists(@.evidenceKind) || @.evidenceKind.type() != "string" || @.evidenceKind != "CURRICULUM_ATTEMPT" || !exists(@.items) || @.items.type() != "array" || @.items.size() < 1 || @.items.size() > 100)')
      and not jsonb_path_exists(${t.obligations}, '$[*].items[*] ? (@.type() != "object")'), false)`,
      ),
    ],
  ).enableRLS();
}
function createBindings(
  refs: Refs,
  manifests: ReturnType<typeof createManifests>,
) {
  return pgTable(
    "curriculum_assignment_obligations",
    {
      ...context(),
      ...inventory(),
      boundAt: timestamp("bound_at", { withTimezone: true }).notNull(),
      assignmentVersion: integer("assignment_version").notNull(),
    },
    (t) => [
      uniqueIndex("module_assignment_binding_identity_idx").on(
        t.assignmentId,
        t.participantId,
        t.scopeId,
        t.moduleId,
        t.manifestId,
        t.manifestVersion,
        t.blueprintVersionId,
        t.blueprintVersion,
      ),
      foreignKey({
        name: "module_binding_assignment_fk",
        columns: [t.assignmentId, t.participantId, t.scopeId, t.moduleId],
        foreignColumns: [
          refs.assignments.id,
          refs.assignments.participantId,
          refs.assignments.scopeId,
          refs.assignments.moduleId,
        ],
      }).onDelete("restrict"),
      foreignKey({
        name: "module_binding_manifest_fk",
        columns: [
          t.manifestId,
          t.manifestVersion,
          t.blueprintVersionId,
          t.blueprintVersion,
          t.scopeId,
          t.moduleId,
        ],
        foreignColumns: [
          manifests.id,
          manifests.version,
          manifests.blueprintVersionId,
          manifests.blueprintVersion,
          manifests.scopeId,
          manifests.moduleId,
        ],
      }).onDelete("restrict"),
      check(
        "module_binding_version_check",
        sql`${t.assignmentVersion} >= 1 and ${t.manifestVersion} >= 1 and ${t.blueprintVersion} >= 1`,
      ),
    ],
  ).enableRLS();
}
function createReceipts(
  refs: Refs,
  bindings: ReturnType<typeof createBindings>,
) {
  return pgTable(
    "curriculum_module_completion_receipts",
    {
      ...context(),
      ...inventory(),
      completedAssignmentVersion: integer(
        "completed_assignment_version",
      ).notNull(),
      completedAt: timestamp("completed_at", { withTimezone: true }).notNull(),
      actorId: uuid("actor_id")
        .notNull()
        .references(() => refs.accounts.id, { onDelete: "restrict" }),
      requestId: uuid("request_id").notNull(),
      correlationId: uuid("correlation_id").notNull(),
      auditEntryId: uuid("audit_entry_id")
        .notNull()
        .references(() => refs.audit.id, { onDelete: "restrict" }),
      witnesses: jsonb("witnesses")
        .$type<readonly ModuleCompletionWitness[]>()
        .notNull(),
    },
    (t) => [
      foreignKey({
        name: "module_receipt_binding_fk",
        columns: [
          t.assignmentId,
          t.participantId,
          t.scopeId,
          t.moduleId,
          t.manifestId,
          t.manifestVersion,
          t.blueprintVersionId,
          t.blueprintVersion,
        ],
        foreignColumns: [
          bindings.assignmentId,
          bindings.participantId,
          bindings.scopeId,
          bindings.moduleId,
          bindings.manifestId,
          bindings.manifestVersion,
          bindings.blueprintVersionId,
          bindings.blueprintVersion,
        ],
      }).onDelete("restrict"),
      check(
        "module_receipt_version_check",
        sql`${t.completedAssignmentVersion} >= 2 and ${t.manifestVersion} >= 1 and ${t.blueprintVersion} >= 1`,
      ),
      check(
        "module_completion_witnesses_check",
        sql`coalesce(jsonb_typeof(${t.witnesses}) = 'array'
      and jsonb_array_length(${t.witnesses}) between 1 and 100
      and not jsonb_path_exists(${t.witnesses}, '$[*] ? (@.type() != "object" || !exists(@.activityId) || @.activityId.type() != "string" || !exists(@.attemptId) || @.attemptId.type() != "string" || !exists(@.attemptVersion) || @.attemptVersion.type() != "number" || @.attemptVersion < 1 || !exists(@.formVersionId) || @.formVersionId.type() != "string" || !exists(@.formVersion) || @.formVersion.type() != "number" || @.formVersion < 1 || !exists(@.correctedAt) || @.correctedAt.type() != "string" || (exists(@.assessmentResultId) && (@.assessmentResultId.type() != "string" || !(@.assessmentResultId like_regex "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"))))'), false)`,
      ),
    ],
  ).enableRLS();
}

/** Only CURRICULUM_ATTEMPT. No runtime import back to schema.ts.
 * Original-INICIAR binding, full membership and terminal outcomes require the
 * future trusted writer; current status and draft rows are never inferred proof.
 */
export function createSchema(
  accounts: Identity,
  audit: Identity,
  assignments: AssignmentIdentity,
) {
  const refs = { accounts, audit, assignments };
  const curriculumModuleBlueprintVersions = createBlueprints(refs);
  const curriculumModuleObligationManifests = createManifests(
    refs,
    curriculumModuleBlueprintVersions,
  );
  const curriculumAssignmentObligations = createBindings(
    refs,
    curriculumModuleObligationManifests,
  );
  const curriculumModuleCompletionReceipts = createReceipts(
    refs,
    curriculumAssignmentObligations,
  );
  return {
    curriculumModuleBlueprintVersions,
    curriculumModuleObligationManifests,
    curriculumAssignmentObligations,
    curriculumModuleCompletionReceipts,
  };
}
