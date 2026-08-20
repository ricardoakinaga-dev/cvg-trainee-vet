import { describe, expect, it, vi } from "vitest";

import type { AssessmentCorrectedEvent } from "@cvg/application";
import type { AssessmentResultState, AttemptState } from "@cvg/domain";

import {
  AssessmentMappingError,
  assessmentIdempotencyRowToRecord,
  assessmentResultRowToState,
  assessmentResultStateToRow,
  createCorrectionOperationsMethods,
  createCorrectionReadRepository,
  createCorrectionUseCaseDependencies,
} from "./correction-repository.js";
import { assessmentIdempotency, assessmentResults } from "./schema.js";

const result: AssessmentResultState = {
  resultId: "11111111-1111-4111-8111-111111111111",
  attemptId: "22222222-2222-4222-8222-222222222222",
  version: 1,
  kind: "HUMANA",
  score: 82,
  outcome: "APROVADO",
  feedback: "Feedback interno de teste.",
  ruleVersion: "rubrica-v1",
  correctedBy: "33333333-3333-4333-8333-333333333333",
  correctedAt: "2026-08-09T17:00:00.000Z",
};

const attempt: AttemptState = {
  attemptId: result.attemptId,
  participantId: "44444444-4444-4444-8444-444444444444",
  activityId: "55555555-5555-4555-8555-555555555555",
  status: "CORRIGIDA_HUMANAMENTE",
  version: 5,
};

const attemptRow = {
  id: attempt.attemptId,
  participantId: attempt.participantId,
  activityId: attempt.activityId,
  status: attempt.status,
  version: attempt.version,
  submittedAt: null,
};

const resultRow = {
  id: result.resultId,
  attemptId: result.attemptId,
  version: result.version,
  kind: result.kind,
  score: result.score,
  outcome: result.outcome,
  feedback: result.feedback,
  ruleVersion: result.ruleVersion,
  correctedBy: result.correctedBy,
  correctedAt: new Date(result.correctedAt),
};

function createFakeExecutor(input?: {
  readonly selectResults?: readonly unknown[][];
  readonly updateResults?: readonly unknown[][];
}) {
  const selectResults = [...(input?.selectResults ?? [])];
  const updateResults = [...(input?.updateResults ?? [])];
  const inserted: unknown[] = [];
  const query = {
    from: vi.fn(),
    leftJoin: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
  };
  query.from.mockReturnValue(query);
  query.leftJoin.mockReturnValue(query);
  query.where.mockReturnValue(query);
  query.orderBy.mockReturnValue(query);
  query.limit.mockImplementation(async () => selectResults.shift() ?? []);

  const returning = vi.fn(
    async () => updateResults.shift() ?? [{ id: attempt.attemptId }],
  );
  const values = vi.fn(async (value: unknown) => {
    inserted.push(value);
  });
  const executor = {
    execute: vi.fn(async () => undefined),
    select: vi.fn(() => query),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({ returning })),
      })),
    })),
    insert: vi.fn(() => ({ values })),
  };

  return { executor, inserted, returning };
}

describe("assessment persistence mapping", () => {
  it("composes frozen correction transaction operations", () => {
    const methods = createCorrectionOperationsMethods({} as never);

    expect(Object.isFrozen(methods)).toBe(true);
    expect(Object.keys(methods).sort()).toEqual([
      "approver",
      "attempts",
      "audit",
      "eventPublisher",
      "idempotency",
      "results",
    ]);
  });

  it("maps a versioned correction without putting feedback in an event row", () => {
    const row = assessmentResultStateToRow(result);

    expect(row).toMatchObject({
      id: result.resultId,
      attemptId: result.attemptId,
      version: result.version,
      score: result.score,
      outcome: result.outcome,
    });
    expect(row.feedback).toBe(result.feedback);
    expect(row).not.toHaveProperty("source");
    expect(row).not.toHaveProperty("photo");
  });

  it("round-trips a database correction and rejects unsafe values", () => {
    expect(
      assessmentResultRowToState({
        id: result.resultId,
        attemptId: result.attemptId,
        version: result.version,
        kind: result.kind,
        score: result.score,
        outcome: result.outcome,
        feedback: result.feedback,
        ruleVersion: result.ruleVersion,
        correctedBy: result.correctedBy,
        correctedAt: new Date(result.correctedAt),
      }),
    ).toEqual(result);
    expect(() =>
      assessmentResultRowToState({
        id: result.resultId,
        attemptId: result.attemptId,
        version: 0,
        kind: result.kind,
        score: 101,
        outcome: result.outcome,
        feedback: "<b>unsafe</b>",
        ruleVersion: result.ruleVersion,
        correctedBy: result.correctedBy,
        correctedAt: new Date("invalid"),
      }),
    ).toThrow(AssessmentMappingError);
  });

  it("round-trips an idempotency snapshot and keeps table contracts explicit", () => {
    expect(
      assessmentIdempotencyRowToRecord({
        fingerprint: "fingerprint-1",
        response: { attempt, result },
      }),
    ).toEqual({ fingerprint: "fingerprint-1", result: { attempt, result } });
    expect(() =>
      assessmentIdempotencyRowToRecord({ fingerprint: "", response: {} }),
    ).toThrow(AssessmentMappingError);
    expect(assessmentResults).toBeDefined();
    expect(assessmentIdempotency).toBeDefined();
  });

  it("rejects malformed nested correction snapshots and timestamps", () => {
    expect(() => assessmentIdempotencyRowToRecord(null)).toThrow(
      AssessmentMappingError,
    );
    expect(() =>
      assessmentIdempotencyRowToRecord({
        fingerprint: "fingerprint-1",
        response: { attempt: null, result },
      }),
    ).toThrow(AssessmentMappingError);
    expect(() =>
      assessmentIdempotencyRowToRecord({
        fingerprint: "fingerprint-1",
        response: { attempt, result: null },
      }),
    ).toThrow(AssessmentMappingError);
    expect(() =>
      assessmentResultRowToState({ ...resultRow, correctedAt: "invalid" }),
    ).toThrow(AssessmentMappingError);
  });

  it("executes correction attempts, results, idempotency and outbox operations", async () => {
    const fake = createFakeExecutor({
      selectResults: [
        [attemptRow],
        [],
        [resultRow],
        [],
        [{ fingerprint: "fingerprint-1", response: { attempt, result } }],
        [{ fingerprint: "stored-fingerprint" }],
        [{ fingerprint: "fingerprint-1" }],
        [],
      ],
      updateResults: [[{ id: attempt.attemptId }], []],
    });
    const methods = createCorrectionOperationsMethods(fake.executor as never);

    await expect(methods.attempts.findById(attempt.attemptId)).resolves.toEqual(
      attempt,
    );
    await expect(methods.attempts.findById("missing")).resolves.toBeNull();
    await methods.attempts.update({
      ...attempt,
      status: "CORRIGIDA_HUMANAMENTE",
      version: attempt.version + 1,
    });
    await expect(
      methods.attempts.update({ ...attempt, version: attempt.version + 1 }),
    ).rejects.toMatchObject({ name: "PersistenceConflictError" });

    await expect(
      methods.results.findLatest(attempt.attemptId),
    ).resolves.toEqual(result);
    await expect(methods.results.findLatest("missing")).resolves.toBeNull();
    await methods.results.insert(result);

    await expect(methods.idempotency.find("correction-key")).resolves.toEqual({
      fingerprint: "fingerprint-1",
      result: { attempt, result },
    });
    const record = {
      fingerprint: "fingerprint-1",
      result: { attempt, result },
    };
    await expect(
      methods.idempotency.store("correction-key", {
        ...record,
        fingerprint: "another-fingerprint",
      }),
    ).rejects.toMatchObject({ name: "PersistenceConflictError" });
    await methods.idempotency.store("correction-key", record);
    await methods.idempotency.store("new-correction-key", record);

    const event: AssessmentCorrectedEvent = {
      eventId: "66666666-6666-4666-8666-666666666666",
      eventType: "assessment.corrected.v1",
      aggregateType: "attempt",
      aggregateId: attempt.attemptId,
      occurredAt: "2026-08-09T17:00:00.000Z",
      schemaVersion: 1,
      correlationId: "77777777-7777-4777-8777-777777777777",
      payload: {
        attempt_id: attempt.attemptId,
        result_id: result.resultId,
        status: "CORRIGIDA_HUMANAMENTE",
        score: "82",
        outcome: "APROVADO",
        result_version: "1",
        rule_version: "rubrica-v1",
      },
    };
    await methods.eventPublisher.publish(event);

    expect(fake.inserted).toHaveLength(3);
    expect(fake.inserted.at(-1)).toMatchObject({
      eventType: event.eventType,
      aggregateId: event.aggregateId,
      status: "PENDING",
    });
  });

  it("runs correction transactions with an optional participant security context", async () => {
    const fake = createFakeExecutor();
    const db = {
      transaction: vi.fn(async (work: (executor: unknown) => unknown) =>
        work(fake.executor),
      ),
    };
    const dependencies = createCorrectionUseCaseDependencies(
      db as never,
      () => "generated-id",
    );

    await expect(
      dependencies.transaction.run(
        async (operations) => Object.keys(operations).sort(),
        { participantId: attempt.participantId },
      ),
    ).resolves.toEqual([
      "approver",
      "attempts",
      "audit",
      "eventPublisher",
      "idempotency",
      "results",
    ]);
    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(fake.executor.execute).toHaveBeenCalledTimes(1);
  });

  it("reads the latest correction in a participant-scoped transaction", async () => {
    const readRow = {
      attemptId: attempt.attemptId,
      participantId: attempt.participantId,
      activityId: attempt.activityId,
      attemptStatus: attempt.status,
      attemptVersion: attempt.version,
      submittedAt: null,
      resultId: result.resultId,
      resultAttemptId: result.attemptId,
      resultVersion: result.version,
      resultKind: result.kind,
      resultScore: result.score,
      resultOutcome: result.outcome,
      resultFeedback: result.feedback,
      resultRuleVersion: result.ruleVersion,
      resultCorrectedBy: result.correctedBy,
      resultCorrectedAt: new Date(result.correctedAt),
    };
    const fake = createFakeExecutor({ selectResults: [[readRow]] });
    const db = {
      transaction: vi.fn(async (work: (executor: unknown) => unknown) =>
        work(fake.executor),
      ),
    };
    const repository = createCorrectionReadRepository(db as never);

    await expect(
      repository.findByParticipantAndAttempt(
        attempt.participantId,
        attempt.attemptId,
      ),
    ).resolves.toEqual({ attempt, result });
    expect(fake.executor.execute).toHaveBeenCalledTimes(1);
  });

  it("fails closed when the feedback row or result is absent", async () => {
    const missing = createFakeExecutor({
      selectResults: [[], [{ resultId: null }]],
    });
    const db = {
      transaction: vi.fn(async (work: (executor: unknown) => unknown) =>
        work(missing.executor),
      ),
    };
    const repository = createCorrectionReadRepository(db as never);

    await expect(
      repository.findByParticipantAndAttempt(
        attempt.participantId,
        attempt.attemptId,
      ),
    ).resolves.toBeNull();
    await expect(
      repository.findByParticipantAndAttempt(
        attempt.participantId,
        attempt.attemptId,
      ),
    ).resolves.toBeNull();
  });
});
