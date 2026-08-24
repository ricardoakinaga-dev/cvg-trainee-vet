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
  CurriculumDiagnosticResult,
  ModuleEvaluationResult,
} from "@cvg/curriculum";
import type {
  AuthoringChoice,
  AuthoringParticipantItem,
  AuthoringPreflight,
  AuthoringRubric,
  AuthoringSourceRef,
} from "@cvg/application";

export type InternalKnowledgeMetadata = Readonly<{
  curriculumArea: string;
  protocolVersion: string;
  contentHash: string;
}>;

export type PublicChoiceMetadata = Readonly<{
  readonly id: string;
  readonly label: string;
  readonly text: string;
}>;

export type PersistedAttemptSnapshot = Readonly<{
  attemptId: string;
  participantId: string;
  activityId: string;
  status: string;
  version: number;
  submittedAt?: string;
}>;

export type PersistedAnswerSnapshot = Readonly<{
  readonly attempt: PersistedAttemptSnapshot;
  readonly answer: Readonly<{
    readonly answerId: string;
    readonly attemptId: string;
    readonly itemId: string;
    readonly response: string;
    readonly savedAt: string;
  }>;
}>;

export type PersistedCorrectionSnapshot = Readonly<{
  readonly attempt: PersistedAttemptSnapshot;
  readonly result: Readonly<{
    readonly resultId: string;
    readonly attemptId: string;
    readonly version: number;
    readonly kind: string;
    readonly score: number;
    readonly outcome: string;
    readonly feedback: string;
    readonly ruleVersion: string;
    readonly correctedBy: string;
    readonly correctedAt: string;
  }>;
}>;

export type PersistedCurriculumRuntimeState = ModuleEvaluationResult;

export type PersistedDiagnosticResult = CurriculumDiagnosticResult;

export type PersistedAuthoringItem = Readonly<{
  readonly title: string;
  readonly prompt: string;
  readonly responseMode: "CHOICE" | "TEXT" | "NONE";
  readonly choices?: readonly AuthoringChoice[];
  readonly correctChoiceIds?: readonly string[];
  readonly rubric?: AuthoringRubric;
  readonly feedback: string;
  readonly critical: boolean;
  readonly remediationTargetObjectiveId: string;
  readonly sourceRefs: readonly AuthoringSourceRef[];
  readonly participant: AuthoringParticipantItem;
}>;

export type PersistedContentReviewDecision = Readonly<{
  readonly reviewerId: string;
  readonly decision: "APROVAR_CLINICAMENTE" | "SOLICITAR_AJUSTES";
  readonly rationale: string;
  readonly reviewedAt: string;
  readonly correlationId: string;
}>;

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

export const accountRecoveryRequests = pgTable(
  "account_recovery_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    scopeId: uuid("scope_id").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    roles: jsonb("roles").$type<readonly string[]>().notNull(),
    scopes: jsonb("scopes").$type<readonly string[]>().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("account_recovery_requests_active_idx").on(
      table.expiresAt,
      table.consumedAt,
      table.revokedAt,
    ),
    index("account_recovery_requests_account_idx").on(
      table.accountId,
      table.scopeId,
      table.createdAt,
    ),
    check(
      "account_recovery_requests_token_hash_check",
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
      sql`${table.responseMode} in ('TEXT', 'CHOICE', 'NONE')`,
    ),
    check(
      "content_versions_selection_mode_check",
      sql`${table.participantSelectionMode} is null or ${table.participantSelectionMode} in ('SINGLE', 'MULTIPLE')`,
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

export const curriculumRuntimeStates = pgTable(
  "curriculum_runtime_states",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    scopeId: uuid("scope_id").notNull(),
    moduleId: text("module_id").notNull(),
    version: integer("version").notNull().default(1),
    state: jsonb("state").$type<PersistedCurriculumRuntimeState>().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("curriculum_runtime_participant_scope_module_idx").on(
      table.participantId,
      table.scopeId,
      table.moduleId,
    ),
    index("curriculum_runtime_participant_scope_idx").on(
      table.participantId,
      table.scopeId,
    ),
    check(
      "curriculum_runtime_module_id_check",
      sql`${table.moduleId} ~ '^M(0[1-9]|1[0-9]|2[0-4])$'`,
    ),
    check("curriculum_runtime_version_check", sql`${table.version} >= 1`),
  ],
);

export const diagnosticResults = pgTable(
  "diagnostic_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    scopeId: uuid("scope_id").notNull(),
    diagnosticId: text("diagnostic_id").notNull(),
    diagnosticVersion: text("diagnostic_version").notNull(),
    result: jsonb("result").$type<PersistedDiagnosticResult>().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("diagnostic_results_participant_scope_idx").on(
      table.participantId,
      table.scopeId,
      table.diagnosticId,
      table.completedAt,
    ),
    index("diagnostic_results_scope_completed_idx").on(
      table.scopeId,
      table.completedAt,
    ),
    check(
      "diagnostic_results_diagnostic_id_check",
      sql`${table.diagnosticId} = 'B07-DIAGNOSTIC-V1'`,
    ),
    check(
      "diagnostic_results_diagnostic_version_check",
      sql`${table.diagnosticVersion} = '0.1.0'`,
    ),
  ],
);

export const attempts = pgTable(
  "attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    participantId: uuid("participant_id").notNull(),
    activityId: uuid("activity_id")
      .notNull()
      .references(() => learningActivities.id, { onDelete: "restrict" }),
    status: text("status").notNull(),
    version: integer("version").notNull().default(0),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("attempts_participant_status_idx").on(
      table.participantId,
      table.status,
    ),
    index("attempts_activity_status_idx").on(table.activityId, table.status),
    uniqueIndex("attempts_open_participant_activity_idx")
      .on(table.participantId, table.activityId)
      .where(
        sql`${table.status} in ('CRIADA', 'EM_ANDAMENTO', 'SALVA', 'SUBMETIDA', 'AGUARDA_CORRECAO_HUMANA')`,
      ),
    check(
      "attempts_status_check",
      sql`${table.status} in ('CRIADA', 'EM_ANDAMENTO', 'SALVA', 'SUBMETIDA', 'CORRIGIDA_AUTOMATICAMENTE', 'AGUARDA_CORRECAO_HUMANA', 'CORRIGIDA_HUMANAMENTE', 'ANULADA')`,
    ),
    check("attempts_version_check", sql`${table.version} >= 0`),
  ],
);

export const assessmentResults = pgTable(
  "assessment_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => attempts.id, { onDelete: "restrict" }),
    version: integer("version").notNull(),
    kind: text("kind").notNull(),
    score: integer("score").notNull(),
    outcome: text("outcome").notNull(),
    feedback: text("feedback").notNull(),
    ruleVersion: text("rule_version").notNull(),
    correctedBy: uuid("corrected_by").notNull(),
    correctedAt: timestamp("corrected_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("assessment_results_attempt_version_idx").on(
      table.attemptId,
      table.version,
    ),
    index("assessment_results_attempt_idx").on(table.attemptId, table.version),
    check(
      "assessment_results_kind_check",
      sql`${table.kind} in ('HUMANA', 'AUTOMATICA')`,
    ),
    check(
      "assessment_results_outcome_check",
      sql`${table.outcome} in ('APROVADO', 'REFORCO')`,
    ),
    check(
      "assessment_results_score_check",
      sql`${table.score} >= 0 and ${table.score} <= 100`,
    ),
    check("assessment_results_version_check", sql`${table.version} >= 1`),
  ],
);

export const answers = pgTable(
  "answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => attempts.id, { onDelete: "restrict" }),
    itemId: uuid("item_id").notNull(),
    response: text("response").notNull(),
    savedAt: timestamp("saved_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("answers_attempt_item_idx").on(table.attemptId, table.itemId),
    index("answers_attempt_idx").on(table.attemptId),
  ],
);

export const attemptIdempotency = pgTable(
  "attempt_idempotency",
  {
    key: text("key").primaryKey(),
    operation: text("operation").notNull(),
    fingerprint: text("fingerprint").notNull(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => attempts.id, { onDelete: "restrict" }),
    response: jsonb("response").$type<PersistedAttemptSnapshot>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("attempt_idempotency_expires_at_idx").on(table.expiresAt)],
);

export const answerIdempotency = pgTable(
  "answer_idempotency",
  {
    key: text("key").primaryKey(),
    operation: text("operation").notNull(),
    fingerprint: text("fingerprint").notNull(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => attempts.id, { onDelete: "restrict" }),
    answerId: uuid("answer_id")
      .notNull()
      .references(() => answers.id, { onDelete: "restrict" }),
    response: jsonb("response").$type<PersistedAnswerSnapshot>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("answer_idempotency_expires_at_idx").on(table.expiresAt)],
);

export const assessmentIdempotency = pgTable(
  "assessment_idempotency",
  {
    key: text("key").primaryKey(),
    operation: text("operation").notNull(),
    fingerprint: text("fingerprint").notNull(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => attempts.id, { onDelete: "restrict" }),
    response: jsonb("response").$type<PersistedCorrectionSnapshot>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("assessment_idempotency_expires_at_idx").on(table.expiresAt),
  ],
);

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
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
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
    index("sessions_active_idx").on(table.expiresAt, table.revokedAt),
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

export const auditEntries = pgTable(
  "audit_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorKind: text("actor_kind").notNull().default("AUTHENTICATED"),
    principalId: uuid("principal_id"),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id"),
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
    check(
      "audit_entries_actor_check",
      sql`(
        ${table.actorKind} = 'AUTHENTICATED' and ${table.principalId} is not null
      ) or (
        ${table.actorKind} = 'ANONYMOUS' and ${table.principalId} is null
      )`,
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
    version: integer("version").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
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
      "feedback_tickets_description_check",
      sql`length(trim(${table.description})) between 1 and 10000 and ${table.description} not like '%<%>'`,
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
    decisionRationale: text("decision_rationale"),
    decisionAt: timestamp("decision_at", { withTimezone: true }),
    decisionCorrelationId: uuid("decision_correlation_id"),
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
    index("appeals_scope_status_due_idx").on(
      table.scopeId,
      table.status,
      table.dueAt,
      table.createdAt,
      table.id,
    ),
    check(
      "appeals_status_check",
      sql`${table.status} in ('ABERTA', 'EM_REVISAO', 'DECIDIDA', 'RECALCULO_PENDENTE', 'ENCERRADA')`,
    ),
    check(
      "appeals_decision_check",
      sql`((${table.status} in ('DECIDIDA', 'RECALCULO_PENDENTE', 'ENCERRADA') and ${table.decision} is not null and ${table.decision} in ('MANTER_RESULTADO', 'ANULAR_ITEM', 'ALTERAR_RESULTADO') and ${table.decisionRationale} is not null and length(trim(${table.decisionRationale})) between 1 and 10000 and ${table.decisionRationale} not like '%<%>%' and ${table.decisionAt} is not null and ${table.decisionCorrelationId} is not null) or (${table.status} in ('ABERTA', 'EM_REVISAO') and ${table.decision} is null and ${table.decisionRationale} is null and ${table.decisionAt} is null and ${table.decisionCorrelationId} is null))`,
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

export type KnowledgeDocument = typeof knowledgeDocuments.$inferSelect;
export type NewKnowledgeDocument = typeof knowledgeDocuments.$inferInsert;
