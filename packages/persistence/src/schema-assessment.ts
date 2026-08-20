import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { accounts, learningActivities } from "./schema-content.js";
import type {
  PersistedAnswerSnapshot,
  PersistedAttemptSnapshot,
  PersistedCorrectionSnapshot,
  PersistedCurriculumRuntimeState,
  PersistedDigitalCaseRuntimeState,
} from "./schema-types.js";
import type {
  DistractorObservation,
  ItemAnomalyCode,
  SourceConflictDecision,
} from "@cvg/domain";

export const itemStatistics = pgTable(
  "item_statistics",
  {
    id: text("id").primaryKey(),
    itemId: text("item_id").notNull(),
    scopeId: text("scope_id").notNull(),
    contentVersion: integer("content_version").notNull(),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
    sampleSize: integer("sample_size").notNull(),
    correctCount: integer("correct_count").notNull(),
    appealCount: integer("appeal_count").notNull(),
    difficulty: real("difficulty").notNull(),
    appealRate: real("appeal_rate").notNull(),
    discrimination: real("discrimination"),
    distractorCounts: jsonb("distractor_counts")
      .$type<readonly DistractorObservation[]>()
      .notNull(),
    anomalyCodes: jsonb("anomaly_codes")
      .$type<readonly ItemAnomalyCode[]>()
      .notNull(),
    requiresHumanReview: boolean("requires_human_review").notNull(),
    automaticDecision: text("automatic_decision").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("item_statistics_scope_item_idx").on(
      table.scopeId,
      table.itemId,
      table.contentVersion,
      table.observedAt,
    ),
    check(
      "item_statistics_content_version_check",
      sql`${table.contentVersion} >= 1`,
    ),
    check("item_statistics_sample_size_check", sql`${table.sampleSize} >= 1`),
    check(
      "item_statistics_correct_count_check",
      sql`${table.correctCount} >= 0 and ${table.correctCount} <= ${table.sampleSize}`,
    ),
    check(
      "item_statistics_appeal_count_check",
      sql`${table.appealCount} >= 0 and ${table.appealCount} <= ${table.sampleSize}`,
    ),
    check(
      "item_statistics_difficulty_check",
      sql`${table.difficulty} >= 0 and ${table.difficulty} <= 1`,
    ),
    check(
      "item_statistics_appeal_rate_check",
      sql`${table.appealRate} >= 0 and ${table.appealRate} <= 1`,
    ),
    check(
      "item_statistics_discrimination_check",
      sql`${table.discrimination} is null or (${table.discrimination} >= -1 and ${table.discrimination} <= 1)`,
    ),
    check(
      "item_statistics_decision_check",
      sql`${table.automaticDecision} = 'NONE'`,
    ),
    check(
      "item_statistics_distractors_object_check",
      sql`jsonb_typeof(${table.distractorCounts}) = 'array'`,
    ),
    check(
      "item_statistics_anomalies_object_check",
      sql`jsonb_typeof(${table.anomalyCodes}) = 'array'`,
    ),
  ],
);

export const sourceConflictDecisions = pgTable(
  "source_conflict_decisions",
  {
    id: text("id").primaryKey(),
    contentId: text("content_id").notNull(),
    contentVersion: integer("content_version").notNull(),
    scopeId: text("scope_id").notNull(),
    sourceCodes: jsonb("source_codes").$type<readonly string[]>().notNull(),
    description: text("description").notNull(),
    decision: text("decision").$type<SourceConflictDecision>().notNull(),
    rationale: text("rationale").notNull(),
    decidedBy: text("decided_by").notNull(),
    decidedAt: timestamp("decided_at", { withTimezone: true }).notNull(),
    humanReviewRequired: boolean("human_review_required").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("source_conflict_decisions_scope_content_idx").on(
      table.scopeId,
      table.contentId,
      table.contentVersion,
      table.decidedAt,
    ),
    check(
      "source_conflict_decisions_version_check",
      sql`${table.contentVersion} >= 1`,
    ),
    check(
      "source_conflict_decisions_decision_check",
      sql`${table.decision} in ('ACCEPT_SOURCE_A', 'ACCEPT_SOURCE_B', 'ESCALATE_CLINICAL_REVIEW', 'DEFER_PUBLICATION')`,
    ),
    check(
      "source_conflict_decisions_sources_array_check",
      sql`jsonb_typeof(${table.sourceCodes}) = 'array' and jsonb_array_length(${table.sourceCodes}) >= 2`,
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

export const digitalCaseRuntimeStates = pgTable(
  "digital_case_runtime_states",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    scopeId: uuid("scope_id").notNull(),
    moduleId: text("module_id").notNull(),
    caseId: text("case_id").notNull(),
    version: integer("version").notNull().default(0),
    state: jsonb("state").$type<PersistedDigitalCaseRuntimeState>().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("digital_case_runtime_participant_scope_module_idx").on(
      table.participantId,
      table.scopeId,
      table.moduleId,
    ),
    index("digital_case_runtime_participant_scope_idx").on(
      table.participantId,
      table.scopeId,
    ),
    check(
      "digital_case_runtime_module_id_check",
      sql`${table.moduleId} ~ '^M(0[1-9]|1[0-9]|2[0-4])$'`,
    ),
    check("digital_case_runtime_version_check", sql`${table.version} >= 0`),
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

export const assessmentRecalculationCandidates = pgTable(
  "assessment_recalculation_candidates",
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
    previousVersion: integer("previous_version").notNull(),
    previousScore: integer("previous_score").notNull(),
    previousOutcome: text("previous_outcome").notNull(),
    correctCount: integer("correct_count").notNull(),
    eligibleItemCount: integer("eligible_item_count").notNull(),
    triggerReason: text("trigger_reason").notNull(),
    status: text("status").notNull().default("PENDING"),
    recalculatedVersion: integer("recalculated_version"),
    recalculatedScore: integer("recalculated_score"),
    recalculatedOutcome: text("recalculated_outcome"),
    recalculatedAt: timestamp("recalculated_at", { withTimezone: true }),
    notificationQueuedAt: timestamp("notification_queued_at", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("assessment_recalculation_scope_item_status_idx").on(
      table.scopeId,
      table.itemId,
      table.status,
    ),
    index("assessment_recalculation_attempt_idx").on(
      table.attemptId,
      table.previousVersion,
    ),
    check(
      "assessment_recalculation_previous_version_check",
      sql`${table.previousVersion} >= 1`,
    ),
    check(
      "assessment_recalculation_previous_score_check",
      sql`${table.previousScore} >= 0 and ${table.previousScore} <= 100`,
    ),
    check(
      "assessment_recalculation_counts_check",
      sql`${table.correctCount} >= 0 and ${table.correctCount} <= ${table.eligibleItemCount} and ${table.eligibleItemCount} >= 1`,
    ),
    check(
      "assessment_recalculation_outcome_check",
      sql`${table.previousOutcome} in ('APROVADO', 'REFORCO')`,
    ),
    check(
      "assessment_recalculation_reason_check",
      sql`${table.triggerReason} in ('ITEM_ANNULLED', 'ANSWER_KEY_CHANGED')`,
    ),
    check(
      "assessment_recalculation_status_check",
      sql`${table.status} in ('PENDING', 'CALCULATED', 'NOTIFICATION_QUEUED')`,
    ),
    check(
      "assessment_recalculation_processed_fields_check",
      sql`(
        (${table.status} = 'PENDING' and ${table.recalculatedVersion} is null and ${table.recalculatedScore} is null and ${table.recalculatedOutcome} is null and ${table.recalculatedAt} is null and ${table.notificationQueuedAt} is null)
        or
        (${table.status} in ('CALCULATED', 'NOTIFICATION_QUEUED') and ${table.recalculatedVersion} is not null and ${table.recalculatedScore} is not null and ${table.recalculatedOutcome} is not null and ${table.recalculatedAt} is not null)
      )`,
    ),
    check(
      "assessment_recalculation_score_check",
      sql`${table.recalculatedScore} is null or (${table.recalculatedScore} >= 0 and ${table.recalculatedScore} <= 100)`,
    ),
    check(
      "assessment_recalculation_result_outcome_check",
      sql`${table.recalculatedOutcome} is null or ${table.recalculatedOutcome} in ('APROVADO', 'REFORCO')`,
    ),
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
