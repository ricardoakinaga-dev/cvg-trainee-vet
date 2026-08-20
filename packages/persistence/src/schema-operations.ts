import {
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { accounts, contentEditorialRecords } from "./schema-content.js";
import { attempts } from "./schema-assessment.js";
import type {
  AuthoringPreflight,
  ClinicalReviewRecord,
} from "@cvg/application";
import type { ContentStatus } from "@cvg/domain";

type AuthoringWorkflowReplayPayload = Readonly<{
  readonly schemaVersion: 1;
  readonly contentId: string;
  readonly version: number;
  readonly contentStatus: ContentStatus;
  readonly preflight: AuthoringPreflight;
  readonly recordHash: string;
  readonly review?: ClinicalReviewRecord;
}>;
import type { FeedbackTicketHistoryEntry } from "@cvg/domain";

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    tokenHash: text("token_hash").notNull().unique(),
    roles: jsonb("roles").$type<readonly string[]>().notNull(),
    scopes: jsonb("scopes").$type<readonly string[]>().notNull(),
    sessionGeneration: integer("session_generation").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP + interval '24 hours'`),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("sessions_account_idx").on(table.accountId),
    index("sessions_account_generation_idx").on(
      table.accountId,
      table.sessionGeneration,
    ),
    index("sessions_active_idx").on(table.expiresAt, table.revokedAt),
    check(
      "sessions_session_generation_check",
      sql`${table.sessionGeneration} >= 0`,
    ),
  ],
);

export const rateLimitBuckets = pgTable(
  "rate_limit_buckets",
  {
    key: text("key").primaryKey(),
    windowStartedAt: timestamp("window_started_at", {
      withTimezone: true,
    }).notNull(),
    count: integer("count").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    check("rate_limit_buckets_key_check", sql`${table.key} <> ''`),
    check("rate_limit_buckets_count_check", sql`${table.count} >= 0`),
    index("rate_limit_buckets_expires_at_idx").on(table.expiresAt),
  ],
);

export const outboxEvents = pgTable(
  "outbox_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventType: text("event_type").notNull(),
    aggregateType: text("aggregate_type").notNull(),
    aggregateId: uuid("aggregate_id").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    schemaVersion: integer("schema_version").notNull(),
    correlationId: uuid("correlation_id").notNull(),
    payload: jsonb("payload")
      .$type<Readonly<Record<string, unknown>>>()
      .notNull(),
    status: text("status").notNull().default("PENDING"),
    attempts: integer("attempts").notNull().default(0),
    availableAt: timestamp("available_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    lastErrorCode: text("last_error_code"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("outbox_events_pending_idx").on(
      table.status,
      table.availableAt,
      table.createdAt,
    ),
    check(
      "outbox_events_status_check",
      sql`${table.status} in ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED')`,
    ),
    check("outbox_events_attempts_check", sql`${table.attempts} >= 0`),
  ],
);

export const authoringWorkflowIdempotency = pgTable(
  "authoring_workflow_idempotency",
  {
    key: text("key").primaryKey(),
    operation: text("operation").notNull(),
    fingerprint: text("fingerprint").notNull(),
    contentId: uuid("content_id").notNull(),
    version: integer("version").notNull(),
    response: jsonb("response")
      .$type<AuthoringWorkflowReplayPayload>()
      .notNull(),
    responseHash: text("response_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP + interval '24 hours'`),
  },
  (table) => [
    index("authoring_workflow_idempotency_expires_at_idx").on(table.expiresAt),
    index("authoring_workflow_idempotency_content_idx").on(
      table.contentId,
      table.version,
    ),
    check(
      "authoring_workflow_idempotency_operation_check",
      sql`${table.operation} in ('clinical_review', 'publication')`,
    ),
    check(
      "authoring_workflow_idempotency_version_check",
      sql`${table.version} >= 1`,
    ),
    check(
      "authoring_workflow_idempotency_key_check",
      sql`${table.key} ~ '^[A-Za-z0-9][A-Za-z0-9._~:-]{0,127}$'`,
    ),
    check(
      "authoring_workflow_idempotency_key_entropy_check",
      sql`${table.key} ~ '^[A-Za-z0-9][A-Za-z0-9._~:-]{15,127}$'`,
    ),
    check(
      "authoring_workflow_idempotency_fingerprint_check",
      sql`${table.fingerprint} ~ '^sha256:[0-9a-f]{64}$'`,
    ),
    check(
      "authoring_workflow_idempotency_response_schema_check",
      sql`${table.response}->>'schemaVersion' = '1'`,
    ),
    check(
      "authoring_workflow_idempotency_response_hash_sha256_check",
      sql`${table.responseHash} ~ '^sha256:[0-9a-f]{64}$'`,
    ),
    check(
      "authoring_workflow_idempotency_expiry_check",
      sql`${table.expiresAt} > ${table.createdAt}`,
    ),
    foreignKey({
      columns: [table.contentId, table.version],
      foreignColumns: [
        contentEditorialRecords.contentId,
        contentEditorialRecords.version,
      ],
      name: "authoring_workflow_idempotency_content_version_fk",
    }).onDelete("restrict"),
  ],
);

export const auditEntries = pgTable(
  "audit_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    principalId: uuid("principal_id").notNull(),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: uuid("resource_id").notNull(),
    scopeId: uuid("scope_id"),
    outcome: text("outcome").notNull(),
    reasonCode: text("reason_code"),
    requestId: uuid("request_id").notNull(),
    correlationId: uuid("correlation_id").notNull(),
    beforeHash: text("before_hash"),
    afterHash: text("after_hash"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("audit_entries_resource_idx").on(
      table.resourceType,
      table.resourceId,
      table.occurredAt,
    ),
    index("audit_entries_principal_idx").on(
      table.principalId,
      table.occurredAt,
    ),
    check(
      "audit_entries_outcome_check",
      sql`${table.outcome} in ('SUCCESS', 'DENIED', 'FAILURE')`,
    ),
  ],
);

export const learningAssignments = pgTable(
  "learning_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    scopeId: uuid("scope_id").notNull(),
    moduleId: text("module_id").notNull(),
    availableAt: timestamp("available_at", { withTimezone: true }).notNull(),
    status: text("status").notNull(),
    version: integer("version").notNull().default(0),
    blockReason: text("block_reason"),
    pausedFrom: text("paused_from"),
    pauseReason: text("pause_reason"),
    resumeAt: timestamp("resume_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("learning_assignments_participant_scope_module_idx").on(
      table.participantId,
      table.scopeId,
      table.moduleId,
    ),
    index("learning_assignments_participant_scope_status_idx").on(
      table.participantId,
      table.scopeId,
      table.status,
    ),
    check(
      "learning_assignments_module_id_check",
      sql`${table.moduleId} ~ '^M(0[1-9]|1[0-9]|2[0-4])$'`,
    ),
    check(
      "learning_assignments_status_check",
      sql`${table.status} in ('NAO_ATRIBUIDO', 'ATRIBUIDO', 'DISPONIVEL', 'EM_ANDAMENTO', 'CONCLUIDO', 'EM_REFORCO', 'CONCLUIDO_COM_RETENCAO_PENDENTE', 'PAUSADO', 'BLOQUEADO')`,
    ),
    check("learning_assignments_version_check", sql`${table.version} >= 0`),
    check(
      "learning_assignments_block_reason_check",
      sql`((${table.status} = 'BLOQUEADO' and ${table.blockReason} is not null and ${table.blockReason} in ('PRE_REQUISITO', 'CONTEUDO_RETIRADO', 'OBJETIVO_EM_REMEDIACAO')) or (${table.status} <> 'BLOQUEADO' and ${table.blockReason} is null))`,
    ),
    check(
      "learning_assignments_paused_from_check",
      sql`((${table.status} = 'PAUSADO' and ${table.pausedFrom} is not null and ${table.pausedFrom} in ('NAO_ATRIBUIDO', 'ATRIBUIDO', 'DISPONIVEL', 'EM_ANDAMENTO', 'CONCLUIDO', 'EM_REFORCO', 'CONCLUIDO_COM_RETENCAO_PENDENTE', 'BLOQUEADO')) or (${table.status} <> 'PAUSADO' and ${table.pausedFrom} is null))`,
    ),
    check(
      "learning_assignments_pause_context_check",
      sql`((${table.status} = 'PAUSADO' and ${table.pauseReason} is not null and ${table.pauseReason} in ('AFASTAMENTO', 'ACOMODACAO', 'JANELA_OPERACIONAL')) or (${table.status} <> 'PAUSADO' and ${table.pauseReason} is null and ${table.resumeAt} is null))`,
    ),
  ],
);

export const assessmentWorkflows = pgTable(
  "assessment_workflows",
  {
    resultId: uuid("result_id").primaryKey(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => attempts.id, { onDelete: "restrict" }),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    scopeId: uuid("scope_id").notNull(),
    ruleVersion: text("rule_version").notNull(),
    version: integer("version").notNull().default(0),
    status: text("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("assessment_workflows_attempt_version_idx").on(
      table.attemptId,
      table.version,
    ),
    index("assessment_workflows_participant_scope_status_idx").on(
      table.participantId,
      table.scopeId,
      table.status,
    ),
    check(
      "assessment_workflows_status_check",
      sql`${table.status} in ('RESULTADO_EM_PROCESSAMENTO', 'RESULTADO_DISPONIVEL', 'RESULTADO_EM_REVISAO', 'RESULTADO_CORRIGIDO', 'RESULTADO_ANULADO')`,
    ),
    check(
      "assessment_workflows_rule_version_check",
      sql`length(trim(${table.ruleVersion})) between 1 and 128`,
    ),
    check("assessment_workflows_version_check", sql`${table.version} >= 0`),
  ],
);

export const feedbackTickets = pgTable(
  "feedback_tickets",
  {
    id: uuid("id").primaryKey(),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    scopeId: uuid("scope_id").notNull(),
    type: text("type").notNull(),
    description: text("description").notNull(),
    status: text("status").notNull(),
    priority: text("priority").notNull().default("NORMAL"),
    assigneeId: uuid("assignee_id").references(() => accounts.id, {
      onDelete: "restrict",
    }),
    response: text("response"),
    responseAt: timestamp("response_at", { withTimezone: true }),
    responseBy: uuid("response_by").references(() => accounts.id, {
      onDelete: "restrict",
    }),
    history: jsonb("history")
      .$type<readonly FeedbackTicketHistoryEntry[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    version: integer("version").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    logicalPage: text("logical_page"),
    appVersion: text("app_version"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }),
    errorCode: text("error_code"),
    alertedAt: timestamp("alerted_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("feedback_tickets_participant_scope_status_idx").on(
      table.participantId,
      table.scopeId,
      table.status,
    ),
    check(
      "feedback_tickets_type_check",
      sql`${table.type} in ('BUG_TECNICO', 'USABILIDADE', 'ERRO_CONTEUDO', 'MELHORIA', 'CONTESTACAO')`,
    ),
    check(
      "feedback_tickets_status_check",
      sql`${table.status} in ('NOVO', 'TRIADO', 'EM_TRATAMENTO', 'AGUARDA_USUARIO', 'RESOLVIDO', 'DUPLICADO', 'NAO_REPRODUZIDO', 'NAO_PLANEJADO')`,
    ),
    check(
      "feedback_tickets_priority_check",
      sql`${table.priority} in ('BAIXA', 'NORMAL', 'ALTA', 'URGENTE')`,
    ),
    check(
      "feedback_tickets_response_check",
      sql`((${table.response} is null and ${table.responseAt} is null and ${table.responseBy} is null) or (${table.response} is not null and ${table.responseAt} is not null))`,
    ),
    check(
      "feedback_tickets_description_check",
      sql`length(trim(${table.description})) between 1 and 10000 and ${table.description} not like '%<%>'`,
    ),
    check(
      "feedback_tickets_technical_context_check",
      sql`(
        (${table.logicalPage} is null and ${table.appVersion} is null and ${table.occurredAt} is null and ${table.errorCode} is null)
        or (
          ${table.logicalPage} is not null
          and ${table.appVersion} is not null
          and ${table.logicalPage} ~ '^/[A-Za-z0-9][A-Za-z0-9/_:-]{0,127}$'
          and ${table.appVersion} ~ '^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}$'
          and (${table.errorCode} is null or ${table.errorCode} ~ '^[A-Z0-9][A-Z0-9_.:-]{0,63}$')
        )
      )`,
    ),
    check("feedback_tickets_version_check", sql`${table.version} >= 0`),
  ],
);

export const appeals = pgTable(
  "appeals",
  {
    id: uuid("id").primaryKey(),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    scopeId: uuid("scope_id").notNull(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => attempts.id, { onDelete: "restrict" }),
    itemId: uuid("item_id").notNull(),
    justification: text("justification").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    version: integer("version").notNull().default(0),
    status: text("status").notNull(),
    reviewerId: uuid("reviewer_id").references(() => accounts.id, {
      onDelete: "restrict",
    }),
    decision: text("decision"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("appeals_open_attempt_item_idx")
      .on(table.participantId, table.attemptId, table.itemId)
      .where(sql`${table.status} <> 'ENCERRADA'`),
    index("appeals_participant_scope_status_idx").on(
      table.participantId,
      table.scopeId,
      table.status,
    ),
    check(
      "appeals_status_check",
      sql`${table.status} in ('ABERTA', 'EM_REVISAO', 'DECIDIDA', 'RECALCULO_PENDENTE', 'ENCERRADA')`,
    ),
    check(
      "appeals_decision_check",
      sql`((${table.status} in ('DECIDIDA', 'RECALCULO_PENDENTE', 'ENCERRADA') and ${table.decision} is not null and ${table.decision} in ('MANTER_RESULTADO', 'ANULAR_ITEM', 'ALTERAR_RESULTADO')) or (${table.status} in ('ABERTA', 'EM_REVISAO') and ${table.decision} is null))`,
    ),
    check(
      "appeals_reviewer_check",
      sql`(${table.reviewerId} is null or ${table.reviewerId} <> ${table.participantId})`,
    ),
    check(
      "appeals_justification_check",
      sql`length(trim(${table.justification})) between 1 and 10000 and ${table.justification} not like '%<%>'`,
    ),
    check("appeals_due_at_check", sql`${table.dueAt} >= ${table.createdAt}`),
    check("appeals_version_check", sql`${table.version} >= 0`),
  ],
);
