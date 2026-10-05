import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import type {
  CurriculumEvaluationAttempt,
  ParticipantActivityState,
} from "@cvg/application";
import type { ModuleEvaluationMode } from "@cvg/curriculum";

type IdentityTable = Readonly<{ id: AnyPgColumn }>;
type SourceTables = Readonly<{
  accounts: IdentityTable;
  auditEntries: IdentityTable;
  contentVersions: IdentityTable &
    Readonly<{
      contentId: AnyPgColumn;
      version: AnyPgColumn;
      scopeId: AnyPgColumn;
    }>;
  learningActivities: IdentityTable;
  attempts: IdentityTable;
}>;
type BlueprintManifest = CurriculumEvaluationAttempt["form"]["blueprint"];
type FrozenCatalogItem =
  CurriculumEvaluationAttempt["form"]["catalog"]["items"][number];
type PublicItem = ParticipantActivityState["items"][number];

function createBlueprintVersions(refs: SourceTables) {
  return pgTable(
    "curriculum_blueprint_versions",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      blueprintId: text("blueprint_id").notNull(),
      version: integer("version").notNull(),
      scopeId: uuid("scope_id").notNull(),
      moduleId: text("module_id").notNull(),
      approvalDecisionId: uuid("approval_decision_id")
        .notNull()
        .references(() => refs.auditEntries.id, { onDelete: "restrict" }),
      approvedBy: uuid("approved_by")
        .notNull()
        .references(() => refs.accounts.id, { onDelete: "restrict" }),
      approvedAt: timestamp("approved_at", { withTimezone: true }).notNull(),
      manifest: jsonb("manifest").$type<BlueprintManifest>().notNull(),
    },
    (table) => [
      uniqueIndex("curriculum_blueprint_version_idx").on(
        table.scopeId,
        table.blueprintId,
        table.version,
      ),
      check("curriculum_blueprint_version_check", sql`${table.version} >= 1`),
      check(
        "curriculum_blueprint_module_check",
        sql`${table.moduleId} ~ '^M(0[1-9]|1[0-9]|2[0-4])$'`,
      ),
      check(
        "curriculum_blueprint_manifest_check",
        sql`
      coalesce((jsonb_typeof(${table.manifest}) = 'object'
      and ${table.manifest}->>'moduleId' = ${table.moduleId}
      and ${table.manifest}->>'version' = ${table.version}::text
      and ${table.manifest}->>'approvalDecisionId' = ${table.approvalDecisionId}::text
      and jsonb_typeof(${table.manifest}->'objectiveIds') = 'array'
      and jsonb_array_length(${table.manifest}->'objectiveIds') > 0
      and jsonb_typeof(${table.manifest}->'itemManifest') = 'array'
      and jsonb_array_length(${table.manifest}->'itemManifest') between 1 and 100
      and (${table.manifest}->>'questionTotal')::integer > 0
      and (${table.manifest}->>'openResponseCount')::integer >= 0
      and (${table.manifest}->>'questionTotal')::integer + (${table.manifest}->>'openResponseCount')::integer
        = jsonb_array_length(${table.manifest}->'itemManifest')), false)`,
      ),
    ],
  );
}

function createFormVersions(
  refs: SourceTables,
  blueprints: ReturnType<typeof createBlueprintVersions>,
) {
  return pgTable(
    "curriculum_form_versions",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      formId: text("form_id").notNull(),
      version: integer("version").notNull(),
      scopeId: uuid("scope_id").notNull(),
      moduleId: text("module_id").notNull(),
      blueprintVersionId: uuid("blueprint_version_id")
        .notNull()
        .references(() => blueprints.id, { onDelete: "restrict" }),
      mode: text("mode").$type<ModuleEvaluationMode>().notNull(),
      status: text("status").notNull(),
      publicationDecisionId: uuid("publication_decision_id")
        .notNull()
        .references(() => refs.auditEntries.id, { onDelete: "restrict" }),
      publishedBy: uuid("published_by")
        .notNull()
        .references(() => refs.accounts.id, { onDelete: "restrict" }),
      publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    },
    (table) => [
      uniqueIndex("curriculum_form_version_idx").on(
        table.scopeId,
        table.formId,
        table.version,
      ),
      check("curriculum_form_version_check", sql`${table.version} >= 1`),
      check(
        "curriculum_form_status_check",
        sql`${table.status} in ('PUBLICADO', 'RETIRADO')`,
      ),
      check(
        "curriculum_form_mode_check",
        sql`${table.mode} in ('FORMATIVE_CHOICE', 'MODULE_COMPLETION')`,
      ),
      check(
        "curriculum_form_module_check",
        sql`${table.moduleId} ~ '^M(0[1-9]|1[0-9]|2[0-4])$'`,
      ),
      check(
        "curriculum_form_identity_check",
        sql`length(trim(${table.formId})) between 1 and 200`,
      ),
    ],
  );
}

function createFormItems(
  refs: SourceTables,
  forms: ReturnType<typeof createFormVersions>,
) {
  return pgTable(
    "curriculum_form_items",
    {
      formVersionId: uuid("form_version_id")
        .notNull()
        .references(() => forms.id, { onDelete: "restrict" }),
      canonicalItemId: text("canonical_item_id").notNull(),
      scopeId: uuid("scope_id").notNull(),
      contentVersionId: uuid("content_version_id").notNull(),
      contentId: uuid("content_id").notNull(),
      contentVersion: integer("content_version").notNull(),
      ordinal: integer("ordinal").notNull(),
      catalogItem: jsonb("catalog_item").$type<FrozenCatalogItem>().notNull(),
      publicItem: jsonb("public_item").$type<PublicItem>().notNull(),
    },
    (table) => [
      primaryKey({ columns: [table.formVersionId, table.canonicalItemId] }),
      uniqueIndex("curriculum_form_item_content_idx").on(
        table.formVersionId,
        table.contentVersionId,
      ),
      uniqueIndex("curriculum_form_item_ordinal_idx").on(
        table.formVersionId,
        table.ordinal,
      ),
      foreignKey({
        columns: [
          table.contentVersionId,
          table.contentId,
          table.contentVersion,
          table.scopeId,
        ],
        foreignColumns: [
          refs.contentVersions.id,
          refs.contentVersions.contentId,
          refs.contentVersions.version,
          refs.contentVersions.scopeId,
        ],
        name: "curriculum_form_item_content_identity_fk",
      }).onDelete("restrict"),
      check(
        "curriculum_form_item_ordinal_check",
        sql`${table.ordinal} between 1 and 100`,
      ),
      check(
        "curriculum_form_item_version_check",
        sql`${table.contentVersion} >= 1`,
      ),
      check(
        "curriculum_form_item_identity_check",
        sql`
      coalesce((jsonb_typeof(${table.catalogItem}) = 'object'
      and ${table.catalogItem}->>'id' = ${table.canonicalItemId}
      and jsonb_typeof(${table.publicItem}) = 'object'
      and ${table.publicItem}->>'itemId' = ${table.contentVersionId}::text), false)`,
      ),
    ],
  );
}

function createActivityForms(
  refs: SourceTables,
  forms: ReturnType<typeof createFormVersions>,
) {
  return pgTable("curriculum_activity_forms", {
    activityId: uuid("activity_id")
      .primaryKey()
      .references(() => refs.learningActivities.id, { onDelete: "restrict" }),
    formVersionId: uuid("form_version_id")
      .notNull()
      .references(() => forms.id, { onDelete: "restrict" }),
    scopeId: uuid("scope_id").notNull(),
    moduleId: text("module_id").notNull(),
  });
}

function createAttemptForms(
  refs: SourceTables,
  forms: ReturnType<typeof createFormVersions>,
) {
  return pgTable("curriculum_attempt_forms", {
    attemptId: uuid("attempt_id")
      .primaryKey()
      .references(() => refs.attempts.id, { onDelete: "restrict" }),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => refs.accounts.id, { onDelete: "restrict" }),
    scopeId: uuid("scope_id").notNull(),
    moduleId: text("module_id").notNull(),
    formVersionId: uuid("form_version_id")
      .notNull()
      .references(() => forms.id, { onDelete: "restrict" }),
    capturedAt: timestamp("captured_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  });
}

function createAttemptItems(
  forms: ReturnType<typeof createAttemptForms>,
  items: ReturnType<typeof createFormItems>,
) {
  return pgTable(
    "curriculum_attempt_items",
    {
      attemptId: uuid("attempt_id")
        .notNull()
        .references(() => forms.attemptId, { onDelete: "restrict" }),
      itemId: uuid("item_id").notNull(),
      canonicalItemId: text("canonical_item_id").notNull(),
      formVersionId: uuid("form_version_id").notNull(),
      ordinal: integer("ordinal").notNull(),
      catalogItem: jsonb("catalog_item").$type<FrozenCatalogItem>().notNull(),
      publicItem: jsonb("public_item").$type<PublicItem>().notNull(),
    },
    (table) => [
      primaryKey({ columns: [table.attemptId, table.itemId] }),
      uniqueIndex("curriculum_attempt_item_canonical_idx").on(
        table.attemptId,
        table.canonicalItemId,
      ),
      uniqueIndex("curriculum_attempt_item_ordinal_idx").on(
        table.attemptId,
        table.ordinal,
      ),
      foreignKey({
        columns: [table.formVersionId, table.canonicalItemId],
        foreignColumns: [items.formVersionId, items.canonicalItemId],
        name: "curriculum_attempt_item_form_identity_fk",
      }).onDelete("restrict"),
      foreignKey({
        columns: [table.formVersionId, table.itemId],
        foreignColumns: [items.formVersionId, items.contentVersionId],
        name: "curriculum_attempt_item_content_identity_fk",
      }).onDelete("restrict"),
      check(
        "curriculum_attempt_item_ordinal_check",
        sql`${table.ordinal} between 1 and 100`,
      ),
      check(
        "curriculum_attempt_item_identity_check",
        sql`
      coalesce((jsonb_typeof(${table.catalogItem}) = 'object'
      and ${table.catalogItem}->>'id' = ${table.canonicalItemId}
      and jsonb_typeof(${table.publicItem}) = 'object'
      and ${table.publicItem}->>'itemId' = ${table.itemId}::text), false)`,
      ),
    ],
  );
}

/** No import back to schema.ts: callers supply the existing identity columns. */
export function createCurriculumAttemptSchema(refs: SourceTables) {
  const curriculumBlueprintVersions = createBlueprintVersions(refs);
  const curriculumFormVersions = createFormVersions(
    refs,
    curriculumBlueprintVersions,
  );
  const curriculumFormItems = createFormItems(refs, curriculumFormVersions);
  const curriculumActivityForms = createActivityForms(
    refs,
    curriculumFormVersions,
  );
  const curriculumAttemptForms = createAttemptForms(
    refs,
    curriculumFormVersions,
  );
  const curriculumAttemptItems = createAttemptItems(
    curriculumAttemptForms,
    curriculumFormItems,
  );
  return {
    curriculumBlueprintVersions,
    curriculumFormVersions,
    curriculumFormItems,
    curriculumActivityForms,
    curriculumAttemptForms,
    curriculumAttemptItems,
  };
}
