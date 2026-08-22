import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type {
  InternalKnowledgeMetadata,
  PersistedAuthoringItem,
  PublicChoiceMetadata,
} from "./schema-types.js";
import type {
  PublicAssessmentInteraction,
  PublicDigitalCaseStage,
} from "@cvg/curriculum";
import type { AuthoringPreflight } from "@cvg/application";

export const knowledgeDocuments = pgTable("knowledge_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  internalContent: text("internal_content").notNull(),
  status: text("status").notNull(),
  revision: integer("revision").notNull().default(1),
  metadata: jsonb("metadata").$type<InternalKnowledgeMetadata>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    professionalEmail: text("professional_email").notNull().unique(),
    status: text("status").notNull().default("INVITED"),
    passwordHash: text("password_hash"),
    roles: jsonb("roles")
      .$type<readonly string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    scopes: jsonb("scopes")
      .$type<readonly string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    sessionGeneration: integer("session_generation").notNull().default(0),
    version: integer("version").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "accounts_status_check",
      sql`${table.status} in ('INVITED', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED')`,
    ),
    check("accounts_version_check", sql`${table.version} >= 0`),
    check(
      "accounts_session_generation_check",
      sql`${table.sessionGeneration} >= 0`,
    ),
  ],
);

export const accountInvitations = pgTable(
  "account_invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    tokenHash: text("token_hash").notNull().unique(),
    roles: jsonb("roles").$type<readonly string[]>().notNull(),
    scopes: jsonb("scopes").$type<readonly string[]>().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("account_invitations_active_idx").on(
      table.expiresAt,
      table.acceptedAt,
    ),
    index("account_invitations_account_idx").on(table.accountId),
    check(
      "account_invitations_token_hash_check",
      sql`${table.tokenHash} ~ '^[a-f0-9]{64}$'`,
    ),
  ],
);

export const contentVersions = pgTable(
  "content_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contentId: uuid("content_id").notNull(),
    scopeId: uuid("scope_id").notNull(),
    version: integer("version").notNull(),
    status: text("status").notNull(),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    participantText: text("participant_text").notNull(),
    responseMode: text("response_mode").notNull(),
    participantOptions: jsonb("participant_options").$type<
      readonly PublicChoiceMetadata[]
    >(),
    participantSelectionMode: text("participant_selection_mode"),
    participantInteraction: jsonb(
      "participant_interaction",
    ).$type<PublicAssessmentInteraction>(),
    digitalCaseStage:
      jsonb("digital_case_stage").$type<PublicDigitalCaseStage>(),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    nextReviewAt: timestamp("next_review_at", { withTimezone: true }),
    withdrawalReasonCode: text("withdrawal_reason_code"),
    withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("content_versions_content_version_idx").on(
      table.contentId,
      table.version,
    ),
    index("content_versions_scope_status_idx").on(table.scopeId, table.status),
    index("content_versions_expiry_idx").on(
      table.status,
      table.validUntil,
      table.scopeId,
    ),
    check(
      "content_versions_status_check",
      sql`${table.status} in ('RASCUNHO', 'AUTOVERIFICADO', 'EM_REVISAO_CLINICA', 'AJUSTES_SOLICITADOS', 'APROVADO_CLINICAMENTE', 'PROJECAO_VERIFICADA', 'AUTORIZADO_PARA_PUBLICACAO', 'PUBLICADO', 'RETIRADO', 'VENCIDO')`,
    ),
    check(
      "content_versions_kind_check",
      sql`${table.kind} in ('LEITURA', 'QUESTAO', 'CASO', 'REFLEXAO')`,
    ),
    check(
      "content_versions_response_mode_check",
      sql`${table.responseMode} in ('TEXT', 'CHOICE', 'STRUCTURED_FIELDS', 'DOSE_INFUSION', 'NONE')`,
    ),
    check(
      "content_versions_selection_mode_check",
      sql`${table.participantSelectionMode} is null or ${table.participantSelectionMode} in ('SINGLE', 'MULTIPLE')`,
    ),
    check(
      "content_versions_withdrawal_reason_check",
      sql`${table.withdrawalReasonCode} is null or ${table.withdrawalReasonCode} in ('ERRO_CLINICO', 'ERRO_CONTEUDO', 'RISCO_SEGURANCA')`,
    ),
    check("content_versions_version_check", sql`${table.version} >= 1`),
  ],
);

export const contentEditorialRecords = pgTable(
  "content_editorial_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contentVersionId: uuid("content_version_id")
      .notNull()
      .references(() => contentVersions.id, { onDelete: "restrict" }),
    contentId: uuid("content_id").notNull(),
    scopeId: uuid("scope_id").notNull(),
    version: integer("version").notNull(),
    moduleId: text("module_id").notNull(),
    sessionId: text("session_id").notNull(),
    objectiveId: text("objective_id").notNull(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    item: jsonb("item").$type<PersistedAuthoringItem>().notNull(),
    preflight: jsonb("preflight").$type<AuthoringPreflight>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("content_editorial_records_content_version_idx").on(
      table.contentId,
      table.version,
    ),
    uniqueIndex("content_editorial_records_version_row_idx").on(
      table.contentVersionId,
    ),
    index("content_editorial_records_scope_idx").on(
      table.scopeId,
      table.moduleId,
    ),
    check(
      "content_editorial_records_version_check",
      sql`${table.version} >= 1`,
    ),
  ],
);

export const contentReviewDecisions = pgTable(
  "content_review_decisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contentEditorialRecordId: uuid("content_editorial_record_id")
      .notNull()
      .references(() => contentEditorialRecords.id, { onDelete: "restrict" }),
    contentVersionId: uuid("content_version_id")
      .notNull()
      .references(() => contentVersions.id, { onDelete: "restrict" }),
    contentId: uuid("content_id").notNull(),
    version: integer("version").notNull(),
    scopeId: uuid("scope_id").notNull(),
    reviewerId: uuid("reviewer_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    decision: text("decision").notNull(),
    rationale: text("rationale").notNull(),
    correlationId: text("correlation_id").notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("content_review_decisions_content_version_idx").on(
      table.contentId,
      table.version,
      table.reviewedAt,
    ),
    index("content_review_decisions_scope_idx").on(
      table.scopeId,
      table.reviewedAt,
    ),
    check(
      "content_review_decisions_decision_check",
      sql`${table.decision} in ('APROVAR_CLINICAMENTE', 'SOLICITAR_AJUSTES')`,
    ),
    check("content_review_decisions_version_check", sql`${table.version} >= 1`),
  ],
);

export const learningActivities = pgTable(
  "learning_activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scopeId: uuid("scope_id").notNull(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull().default("Atividade"),
    status: text("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("learning_activities_scope_status_idx").on(
      table.scopeId,
      table.status,
    ),
    check(
      "learning_activities_status_check",
      sql`${table.status} in ('PUBLISHED', 'WITHDRAWN', 'EXPIRED')`,
    ),
  ],
);

export const learningActivityItems = pgTable(
  "learning_activity_items",
  {
    activityId: uuid("activity_id")
      .notNull()
      .references(() => learningActivities.id, { onDelete: "restrict" }),
    contentVersionId: uuid("content_version_id")
      .notNull()
      .references(() => contentVersions.id, { onDelete: "restrict" }),
    ordinal: integer("ordinal").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.activityId, table.contentVersionId] }),
    uniqueIndex("learning_activity_items_ordinal_idx").on(
      table.activityId,
      table.ordinal,
    ),
    index("learning_activity_items_content_idx").on(table.contentVersionId),
    check(
      "learning_activity_items_ordinal_check",
      sql`${table.ordinal} >= 1 and ${table.ordinal} <= 100`,
    ),
  ],
);

export const aiSuggestions = pgTable(
  "ai_suggestions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contentId: uuid("content_id").notNull(),
    version: integer("version").notNull(),
    sourceEventId: uuid("source_event_id"),
    status: text("status").notNull().default("DRAFT_AI"),
    draftText: text("draft_text").notNull(),
    warnings: jsonb("warnings").$type<readonly string[]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("ai_suggestions_content_version_idx").on(
      table.contentId,
      table.version,
    ),
    uniqueIndex("ai_suggestions_source_event_id_idx").on(table.sourceEventId),
    check("ai_suggestions_status_check", sql`${table.status} = 'DRAFT_AI'`),
    check("ai_suggestions_version_check", sql`${table.version} >= 1`),
  ],
);

export const activityAssignments = pgTable(
  "activity_assignments",
  {
    participantId: uuid("participant_id").notNull(),
    activityId: uuid("activity_id")
      .notNull()
      .references(() => learningActivities.id, { onDelete: "restrict" }),
    status: text("status").notNull(),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.participantId, table.activityId] }),
    index("activity_assignments_participant_status_idx").on(
      table.participantId,
      table.status,
    ),
    check(
      "activity_assignments_status_check",
      sql`${table.status} in ('ATRIBUIDO', 'DISPONIVEL', 'EM_ANDAMENTO', 'CONCLUIDO', 'EM_REFORCO', 'CONCLUIDO_COM_RETENCAO_PENDENTE', 'PAUSADO', 'BLOQUEADO')`,
    ),
  ],
);

export const contentWithdrawalAffected = pgTable(
  "content_withdrawal_affected",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contentVersionId: uuid("content_version_id")
      .notNull()
      .references(() => contentVersions.id, { onDelete: "restrict" }),
    contentId: uuid("content_id").notNull(),
    version: integer("version").notNull(),
    scopeId: uuid("scope_id").notNull(),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }).notNull(),
    correlationId: text("correlation_id").notNull(),
  },
  (table) => [
    uniqueIndex("content_withdrawal_affected_version_participant_idx").on(
      table.contentVersionId,
      table.participantId,
    ),
    index("content_withdrawal_affected_scope_idx").on(
      table.scopeId,
      table.withdrawnAt,
    ),
    check(
      "content_withdrawal_affected_version_check",
      sql`${table.version} >= 1`,
    ),
  ],
);

export type KnowledgeDocument = typeof knowledgeDocuments.$inferSelect;
export type NewKnowledgeDocument = typeof knowledgeDocuments.$inferInsert;
