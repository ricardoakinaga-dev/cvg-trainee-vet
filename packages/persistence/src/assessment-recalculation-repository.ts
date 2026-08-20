import { randomUUID } from "node:crypto";

import { and, asc, eq, sql } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  AssessmentRecalculationCandidate,
  AssessmentRecalculationCandidateWritePort,
  AssessmentRecalculationNotification,
  AssessmentRecalculationPort,
} from "@cvg/application";
import type {
  AssessmentRecalculationReason,
  AssessmentRecalculationState,
} from "@cvg/domain";

import { assessmentRecalculationCandidates, outboxEvents } from "./schema.js";
import type * as schema from "./schema.js";
import {
  createOutboxInsert,
  PersistenceConflictError,
} from "./attempt-repository.js";
import { setDatabaseSecurityContext } from "./security-context.js";

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;

export class AssessmentRecalculationMappingError extends Error {
  public override readonly name = "AssessmentRecalculationMappingError";

  public constructor(message: string) {
    super(message);
  }
}

export type AssessmentRecalculationCandidateRowShape = Readonly<{
  readonly id: string;
  readonly participantId: string;
  readonly scopeId: string;
  readonly attemptId: string;
  readonly itemId: string;
  readonly previousVersion: number;
  readonly previousScore: number;
  readonly previousOutcome: string;
  readonly correctCount: number;
  readonly eligibleItemCount: number;
  readonly triggerReason: string;
  readonly status: string;
  readonly createdAt: Date | string;
  readonly updatedAt: Date | string;
}>;

function nonEmpty(value: string, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AssessmentRecalculationMappingError(`${field} is required`);
  }
  return value;
}

function integer(value: number, field: string): number {
  if (!Number.isInteger(value)) {
    throw new AssessmentRecalculationMappingError(`${field} is invalid`);
  }
  return value;
}

export function assessmentRecalculationCandidateRowToCandidate(
  row: AssessmentRecalculationCandidateRowShape,
): AssessmentRecalculationCandidate {
  nonEmpty(row.id, "id");
  nonEmpty(row.participantId, "participantId");
  nonEmpty(row.scopeId, "scopeId");
  nonEmpty(row.attemptId, "attemptId");
  nonEmpty(row.itemId, "itemId");
  if (row.status !== "PENDING") {
    throw new AssessmentRecalculationMappingError(
      "candidate status must be PENDING",
    );
  }
  if (row.previousOutcome !== "APROVADO" && row.previousOutcome !== "REFORCO") {
    throw new AssessmentRecalculationMappingError("previousOutcome is invalid");
  }
  if (
    row.triggerReason !== "ITEM_ANNULLED" &&
    row.triggerReason !== "ANSWER_KEY_CHANGED"
  ) {
    throw new AssessmentRecalculationMappingError("triggerReason is invalid");
  }
  const previousVersion = integer(row.previousVersion, "previousVersion");
  const previousScore = integer(row.previousScore, "previousScore");
  const correctCount = integer(row.correctCount, "correctCount");
  const eligibleItemCount = integer(row.eligibleItemCount, "eligibleItemCount");
  if (previousVersion < 1 || previousScore < 0 || previousScore > 100) {
    throw new AssessmentRecalculationMappingError(
      "previous assessment values are invalid",
    );
  }
  if (
    eligibleItemCount < 1 ||
    correctCount < 0 ||
    correctCount > eligibleItemCount
  ) {
    throw new AssessmentRecalculationMappingError(
      "assessment counts are invalid",
    );
  }
  return Object.freeze({
    candidateId: row.id,
    participantId: row.participantId,
    scopeId: row.scopeId,
    attemptId: row.attemptId,
    itemId: row.itemId,
    previousVersion,
    previousScore,
    previousOutcome: row.previousOutcome,
    correctCount,
    eligibleItemCount,
  });
}

export function assessmentRecalculationStateToUpdate(
  state: AssessmentRecalculationState,
) {
  const updatedAt = new Date(state.recalculatedAt);
  if (Number.isNaN(updatedAt.getTime())) {
    throw new AssessmentRecalculationMappingError("recalculatedAt is invalid");
  }
  return Object.freeze({
    status: "CALCULATED" as const,
    recalculatedVersion: state.recalculatedVersion,
    recalculatedScore: state.recalculatedScore,
    recalculatedOutcome: state.recalculatedOutcome,
    recalculatedAt: updatedAt,
    updatedAt: new Date(),
  });
}

function setRecalculationContext(
  executor: DatabaseExecutor,
  mode: "read" | "write",
): Promise<unknown> {
  const setting =
    mode === "read" ? "cvg.recalculation_read" : "cvg.recalculation_write";
  return executor.execute(sql`select set_config(${setting}, 'true', true)`);
}

type AssessmentRecalculationOperations = AssessmentRecalculationPort &
  AssessmentRecalculationCandidateWritePort;

function createRegisterOperation(
  db: DatabaseExecutor,
): AssessmentRecalculationOperations["register"] {
  return async (
    candidate: AssessmentRecalculationCandidate,
    reason: AssessmentRecalculationReason,
  ): Promise<void> => {
    await db.transaction(async (transaction) => {
      const executor = transaction;
      await setDatabaseSecurityContext(executor, {
        scopeId: candidate.scopeId,
      });
      await setRecalculationContext(executor, "write");
      await executor.insert(assessmentRecalculationCandidates).values({
        id: candidate.candidateId,
        participantId: candidate.participantId,
        scopeId: candidate.scopeId,
        attemptId: candidate.attemptId,
        itemId: candidate.itemId,
        previousVersion: candidate.previousVersion,
        previousScore: candidate.previousScore,
        previousOutcome: candidate.previousOutcome,
        correctCount: candidate.correctCount,
        eligibleItemCount: candidate.eligibleItemCount,
        triggerReason: reason,
        status: "PENDING",
      });
    });
  };
}

function createListAffectedOperation(
  db: DatabaseExecutor,
): AssessmentRecalculationOperations["listAffected"] {
  return async (
    scopeId: string,
    itemId: string,
    reason?: AssessmentRecalculationReason,
  ): Promise<readonly AssessmentRecalculationCandidate[]> => {
    return db.transaction(async (transaction) => {
      const executor = transaction;
      await setDatabaseSecurityContext(executor, { scopeId });
      await setRecalculationContext(executor, "read");
      const rows = await executor
        .select({
          id: assessmentRecalculationCandidates.id,
          participantId: assessmentRecalculationCandidates.participantId,
          scopeId: assessmentRecalculationCandidates.scopeId,
          attemptId: assessmentRecalculationCandidates.attemptId,
          itemId: assessmentRecalculationCandidates.itemId,
          previousVersion: assessmentRecalculationCandidates.previousVersion,
          previousScore: assessmentRecalculationCandidates.previousScore,
          previousOutcome: assessmentRecalculationCandidates.previousOutcome,
          correctCount: assessmentRecalculationCandidates.correctCount,
          eligibleItemCount:
            assessmentRecalculationCandidates.eligibleItemCount,
          triggerReason: assessmentRecalculationCandidates.triggerReason,
          status: assessmentRecalculationCandidates.status,
          createdAt: assessmentRecalculationCandidates.createdAt,
          updatedAt: assessmentRecalculationCandidates.updatedAt,
        })
        .from(assessmentRecalculationCandidates)
        .where(
          and(
            eq(assessmentRecalculationCandidates.scopeId, scopeId),
            eq(assessmentRecalculationCandidates.itemId, itemId),
            eq(assessmentRecalculationCandidates.status, "PENDING"),
            ...(reason === undefined
              ? []
              : [eq(assessmentRecalculationCandidates.triggerReason, reason)]),
          ),
        )
        .orderBy(asc(assessmentRecalculationCandidates.createdAt));
      return Object.freeze(
        rows.map((row) => assessmentRecalculationCandidateRowToCandidate(row)),
      );
    });
  };
}

function createSaveOperation(
  db: DatabaseExecutor,
): AssessmentRecalculationOperations["save"] {
  return async (state: AssessmentRecalculationState): Promise<void> => {
    await db.transaction(async (transaction) => {
      const executor = transaction;
      await setDatabaseSecurityContext(executor, { scopeId: state.scopeId });
      await setRecalculationContext(executor, "write");
      const update = assessmentRecalculationStateToUpdate(state);
      const rows = await executor
        .update(assessmentRecalculationCandidates)
        .set(update)
        .where(
          and(
            eq(assessmentRecalculationCandidates.id, state.candidateId),
            eq(assessmentRecalculationCandidates.scopeId, state.scopeId),
            eq(assessmentRecalculationCandidates.status, "PENDING"),
            eq(
              assessmentRecalculationCandidates.previousVersion,
              state.previousVersion,
            ),
          ),
        )
        .returning({ id: assessmentRecalculationCandidates.id });
      if (rows.length === 0) {
        throw new PersistenceConflictError(
          "assessment recalculation candidate changed concurrently",
        );
      }
    });
  };
}

function createNotifyOperation(
  db: DatabaseExecutor,
): AssessmentRecalculationOperations["notify"] {
  return async (
    notification: AssessmentRecalculationNotification,
  ): Promise<void> => {
    await db.transaction(async (transaction) => {
      const executor = transaction;
      await setDatabaseSecurityContext(executor, {
        scopeId: notification.scopeId,
      });
      await setRecalculationContext(executor, "write");
      await executor.insert(outboxEvents).values(
        createOutboxInsert({
          eventId: randomUUID(),
          eventType: "assessment.recalculated.v1",
          aggregateType: "assessment_recalculation",
          aggregateId: notification.attemptId,
          occurredAt: notification.occurredAt,
          schemaVersion: 1,
          correlationId: randomUUID(),
          payload: {
            notification_id: notification.notificationId,
            candidate_id: notification.candidateId,
            participant_id: notification.participantId,
            scope_id: notification.scopeId,
            attempt_id: notification.attemptId,
            item_id: notification.itemId,
            recalculated_version: String(notification.recalculatedVersion),
          },
        }),
      );
      const updated = await executor
        .update(assessmentRecalculationCandidates)
        .set({
          status: "NOTIFICATION_QUEUED",
          notificationQueuedAt: new Date(notification.occurredAt),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(assessmentRecalculationCandidates.id, notification.candidateId),
            eq(assessmentRecalculationCandidates.status, "CALCULATED"),
            eq(
              assessmentRecalculationCandidates.recalculatedVersion,
              notification.recalculatedVersion,
            ),
          ),
        )
        .returning({ id: assessmentRecalculationCandidates.id });
      if (updated.length === 0) {
        throw new PersistenceConflictError(
          "assessment recalculation notification state changed concurrently",
        );
      }
    });
  };
}

export function createAssessmentRecalculationMethods(
  db: DatabaseExecutor,
): AssessmentRecalculationOperations {
  return Object.freeze({
    register: createRegisterOperation(db),
    listAffected: createListAffectedOperation(db),
    save: createSaveOperation(db),
    notify: createNotifyOperation(db),
  });
}

export function createAssessmentRecalculationRepository(
  db: DatabaseExecutor,
): AssessmentRecalculationOperations {
  return createAssessmentRecalculationMethods(db);
}
