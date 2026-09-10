import { describe, expect, it } from "vitest";

import type { AssessmentResultState, AttemptState } from "@cvg/domain";

import { createFakeDatabase } from "./test-support/fake-database.js";
import {
  AssessmentMappingError,
  assessmentIdempotencyRowToRecord,
  assessmentResultRowToState,
  assessmentResultStateToRow,
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

describe("assessment persistence mapping", () => {
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
});

describe("assessment mapping validation", () => {
  it("rejects rows with empty identifiers or invalid timestamps", () => {
    expect(() =>
      assessmentResultRowToState({
        id: "",
        attemptId: result.attemptId,
        version: 1,
        kind: result.kind,
        score: 80,
        outcome: result.outcome,
        feedback: "x",
        ruleVersion: "rubrica-v1",
        correctedBy: result.correctedBy,
        correctedAt: new Date(result.correctedAt),
      }),
    ).toThrow(AssessmentMappingError);
    expect(() =>
      assessmentResultRowToState({
        id: result.resultId,
        attemptId: "",
        version: 1,
        kind: result.kind,
        score: 80,
        outcome: result.outcome,
        feedback: "x",
        ruleVersion: "rubrica-v1",
        correctedBy: result.correctedBy,
        correctedAt: new Date(result.correctedAt),
      }),
    ).toThrow(AssessmentMappingError);
    expect(() =>
      assessmentResultRowToState({
        id: result.resultId,
        attemptId: result.attemptId,
        version: 1,
        kind: result.kind,
        score: 80,
        outcome: result.outcome,
        feedback: "x",
        ruleVersion: "rubrica-v1",
        correctedBy: result.correctedBy,
        correctedAt: "not-a-date",
      }),
    ).toThrow(AssessmentMappingError);
  });

  it("rejects invalid domain values wrapped as mapping errors", () => {
    for (const overrides of [
      { kind: "MAQUINA" },
      { outcome: "REPROVADO_AGORA" },
      { score: 101 },
      { version: 0 },
    ] as const) {
      expect(() =>
        assessmentResultRowToState({
          id: result.resultId,
          attemptId: result.attemptId,
          version: 1,
          kind: result.kind,
          score: 80,
          outcome: result.outcome,
          feedback: "x",
          ruleVersion: "rubrica-v1",
          correctedBy: result.correctedBy,
          correctedAt: new Date(result.correctedAt),
          ...overrides,
        }),
      ).toThrow(AssessmentMappingError);
    }
  });

  it("rejects malformed idempotency snapshots", () => {
    expect(() =>
      assessmentIdempotencyRowToRecord({
        fingerprint: "f",
        response: null,
      }),
    ).toThrow(AssessmentMappingError);
    expect(() =>
      assessmentIdempotencyRowToRecord({
        fingerprint: 42,
        response: {},
      }),
    ).toThrow(AssessmentMappingError);
    expect(() =>
      assessmentIdempotencyRowToRecord({
        fingerprint: "f",
        response: { attempt: null, result },
      }),
    ).toThrow(AssessmentMappingError);
    expect(() =>
      assessmentIdempotencyRowToRecord({
        fingerprint: "f",
        response: { attempt: { ...attempt, status: "INVALIDA" }, result },
      }),
    ).toThrow(AssessmentMappingError);
    expect(() =>
      assessmentIdempotencyRowToRecord({
        fingerprint: "f",
        response: { attempt, result: { ...result, version: -1 } },
      }),
    ).toThrow(AssessmentMappingError);
  });
});

describe("correction dependencies operations", () => {
  const attemptRow = {
    id: attempt.attemptId,
    participantId: attempt.participantId,
    activityId: attempt.activityId,
    status: attempt.status,
    version: attempt.version,
    submittedAt: null,
  };

  function deps(db: ReturnType<typeof createFakeDatabase>) {
    return createCorrectionUseCaseDependencies(
      db as unknown as Parameters<typeof createCorrectionUseCaseDependencies>[0],
      () => "id-factory",
    );
  }

  it("finds an attempt by id", async () => {
    const db = createFakeDatabase({ rows: [[attemptRow]] });
    const found = await deps(db).attempts.findById(attempt.attemptId);
    expect(found).toMatchObject({ attemptId: attempt.attemptId });
  });

  it("returns null when no attempt matches", async () => {
    const db = createFakeDatabase({ rows: [[]] });
    const found = await deps(db).attempts.findById(attempt.attemptId);
    expect(found).toBeNull();
  });

  it("updates an attempt and conflicts on stale versions", async () => {
    const ok = createFakeDatabase({ rows: [[{ id: attempt.attemptId }]] });
    await expect(deps(ok).attempts.update(attempt)).resolves.toBeUndefined();
    const stale = createFakeDatabase({ rows: [[]] });
    await expect(deps(stale).attempts.update(attempt)).rejects.toThrow(
      "version changed",
    );
  });

  it("finds the latest assessment result", async () => {
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
    const db = createFakeDatabase({ rows: [[resultRow]] });
    const found = await deps(db).results.findLatest(result.attemptId);
    expect(found).toMatchObject({ resultId: result.resultId });
    const empty = createFakeDatabase({ rows: [[]] });
    expect(await deps(empty).results.findLatest(result.attemptId)).toBeNull();
  });

  it("inserts an assessment result", async () => {
    const db = createFakeDatabase();
    await expect(deps(db).results.insert(result)).resolves.toBeUndefined();
  });

  it("finds and stores idempotency records", async () => {
    const idempotencyRecord = {
      fingerprint: "f",
      result: { attempt, result },
    };
    const found = createFakeDatabase({
      rows: [[{ fingerprint: "f", response: { attempt, result } }]],
    });
    expect(await deps(found).idempotency.find("key")).toEqual(idempotencyRecord);
    const missing = createFakeDatabase({ rows: [[]] });
    expect(await deps(missing).idempotency.find("key")).toBeNull();
    const store = createFakeDatabase({ rows: [[]] });
    await expect(
      deps(store).idempotency.store("key", idempotencyRecord),
    ).resolves.toBeUndefined();
    const same = createFakeDatabase({ rows: [[{ fingerprint: "f" }]] });
    await expect(
      deps(same).idempotency.store("key", idempotencyRecord),
    ).resolves.toBeUndefined();
    const different = createFakeDatabase({ rows: [[{ fingerprint: "other" }]] });
    await expect(
      deps(different).idempotency.store("key", idempotencyRecord),
    ).rejects.toThrow("fingerprint");
  });

  it("publishes outbox events through the executor", async () => {
    const db = createFakeDatabase();
    await expect(
      deps(db).eventPublisher.publish({
        eventId: "outbox-1",
        eventType: "assessment.corrected.v1",
        aggregateType: "attempt",
        aggregateId: attempt.attemptId,
        payload: { resultId: result.resultId },
        occurredAt: "2026-08-09T17:00:00.000Z",
        schemaVersion: 1,
        correlationId: "corr-outbox-1",
      }),
    ).resolves.toBeUndefined();
  });

  it("runs transactional work with and without a security context", async () => {
    const db = createFakeDatabase({
      rows: [[], [attemptRow], [attemptRow]],
    });
    const instance = deps(db);
    const found = await instance.transaction.run(
      async (operations) => operations.attempts.findById(attempt.attemptId),
      { participantId: attempt.participantId },
    );
    expect(found).toMatchObject({ attemptId: attempt.attemptId });
    const foundPlain = await instance.transaction.run(
      async (operations) => operations.attempts.findById(attempt.attemptId),
    );
    expect(foundPlain).toMatchObject({ attemptId: attempt.attemptId });
  });
});

describe("correction read repository", () => {
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

  function readRepository(db: ReturnType<typeof createFakeDatabase>) {
    return createCorrectionReadRepository(
      db as unknown as Parameters<typeof createCorrectionReadRepository>[0],
    );
  }

  it("returns the correction for a participant attempt", async () => {
    const db = createFakeDatabase({ rows: [[], [readRow]] });
    const correction = await readRepository(db).findByParticipantAndAttempt(
      attempt.participantId,
      attempt.attemptId,
    );
    expect(correction).toMatchObject({
      attempt: { attemptId: attempt.attemptId },
      result: { resultId: result.resultId },
    });
  });

  it("returns null when the attempt is absent or uncorrected", async () => {
    const missing = createFakeDatabase({ rows: [[], []] });
    expect(
      await readRepository(missing).findByParticipantAndAttempt(
        attempt.participantId,
        attempt.attemptId,
      ),
    ).toBeNull();
    const uncorrected = createFakeDatabase({ rows: [[], [{ ...readRow, resultId: null }]] });
    expect(
      await readRepository(uncorrected).findByParticipantAndAttempt(
        attempt.participantId,
        attempt.attemptId,
      ),
    ).toBeNull();
  });

  it("propagates mapping errors for malformed rows", async () => {
    const db = createFakeDatabase({ rows: [[], [{ ...readRow, resultKind: "MAQUINA" }]] });
    await expect(
      readRepository(db).findByParticipantAndAttempt(
        attempt.participantId,
        attempt.attemptId,
      ),
    ).rejects.toThrow();
  });
});
