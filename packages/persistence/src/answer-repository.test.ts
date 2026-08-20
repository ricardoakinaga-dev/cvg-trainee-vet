import { describe, expect, it, vi } from "vitest";

import type { AnswerSavedEvent } from "@cvg/application";
import type { AnswerState, AttemptState } from "@cvg/domain";

import {
  PersistenceMappingError,
  answerIdempotencyRowToRecord,
  answerRowToState,
  answerStateToRow,
  createAnswerOperationsMethods,
  createAnswerUseCaseDependencies,
} from "./answer-repository.js";
import { PersistenceConflictError } from "./attempt-repository.js";
import { answerIdempotency, answers } from "./schema.js";

const answer: AnswerState = {
  answerId: "66666666-6666-4666-8666-666666666666",
  attemptId: "11111111-1111-4111-8111-111111111111",
  itemId: "33333333-3333-4333-8333-333333333333",
  response: "resposta interna do participante",
  savedAt: "2026-08-09T17:00:00.000Z",
};

const attempt: AttemptState = {
  attemptId: answer.attemptId,
  participantId: "22222222-2222-4222-8222-222222222222",
  activityId: "44444444-4444-4444-8444-444444444444",
  status: "SALVA",
  version: 2,
};

const answerRow = {
  id: answer.answerId,
  attemptId: answer.attemptId,
  itemId: answer.itemId,
  response: answer.response,
  savedAt: new Date(answer.savedAt),
};

const attemptRow = {
  id: attempt.attemptId,
  participantId: attempt.participantId,
  activityId: attempt.activityId,
  status: attempt.status,
  version: attempt.version,
  submittedAt: null,
};

function fakeDatabase(input?: {
  readonly selectResults?: readonly unknown[][];
  readonly updateResults?: readonly unknown[][];
  readonly insertResults?: readonly unknown[][];
  readonly insertErrors?: readonly unknown[];
}) {
  const selectResults = [...(input?.selectResults ?? [])];
  const updateResults = [...(input?.updateResults ?? [])];
  const insertResults = [...(input?.insertResults ?? [])];
  const insertErrors = [...(input?.insertErrors ?? [])];
  const inserted: unknown[] = [];

  const createQuery = (result: readonly unknown[]) => {
    const query = {
      from: vi.fn(),
      where: vi.fn(),
      limit: vi.fn(),
      then: (
        resolve: (value: readonly unknown[]) => unknown,
        reject: (reason: unknown) => unknown,
      ) => Promise.resolve(result).then(resolve, reject),
    };
    query.from.mockReturnValue(query);
    query.where.mockReturnValue(query);
    query.limit.mockResolvedValue(result);
    return query;
  };

  const createInsertQuery = () => {
    const insertQuery = {
      values: vi.fn((value: unknown) => {
        inserted.push(value);
        return insertQuery;
      }),
      onConflictDoUpdate: vi.fn(),
      onConflictDoNothing: vi.fn(),
      returning: vi.fn(async () => updateResults.shift() ?? []),
      then: (
        resolve: (value: readonly unknown[]) => unknown,
        reject: (reason: unknown) => unknown,
      ) => {
        const error = insertErrors.shift();
        if (error !== undefined)
          return Promise.reject(error).then(resolve, reject);
        return Promise.resolve(insertResults.shift() ?? []).then(
          resolve,
          reject,
        );
      },
    };
    insertQuery.onConflictDoUpdate.mockReturnValue(insertQuery);
    insertQuery.onConflictDoNothing.mockReturnValue(insertQuery);
    return insertQuery;
  };

  const executor = {
    execute: vi.fn(async () => undefined),
    select: vi.fn(() => createQuery(selectResults.shift() ?? [])),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(async () => updateResults.shift() ?? []),
        })),
      })),
    })),
    insert: vi.fn(createInsertQuery),
  };
  return { executor, inserted };
}

describe("PostgreSQL answer mapping", () => {
  it("composes frozen answer transaction operations", () => {
    const methods = createAnswerOperationsMethods({} as never);

    expect(Object.isFrozen(methods)).toBe(true);
    expect(Object.keys(methods).sort()).toEqual([
      "answersPort",
      "attemptsPort",
      "audit",
      "eventPublisher",
      "idempotency",
    ]);
  });

  it("maps a plain-text answer to a row without exposing event metadata", () => {
    const row = answerStateToRow(answer);

    expect(row).toMatchObject({
      id: answer.answerId,
      attemptId: answer.attemptId,
      itemId: answer.itemId,
      response: answer.response,
      savedAt: new Date(answer.savedAt),
    });
    expect(row).not.toHaveProperty("source");
    expect(row).not.toHaveProperty("photo");
  });

  it("maps a database answer back to an immutable domain state", () => {
    expect(
      answerRowToState({
        id: answer.answerId,
        attemptId: answer.attemptId,
        itemId: answer.itemId,
        response: answer.response,
        savedAt: new Date(answer.savedAt),
      }),
    ).toEqual(answer);
  });

  it("rejects malformed database answers", () => {
    expect(() =>
      answerRowToState({
        id: answer.answerId,
        attemptId: answer.attemptId,
        itemId: answer.itemId,
        response: "<img src=x>",
        savedAt: new Date(answer.savedAt),
      }),
    ).toThrow(PersistenceMappingError);
    expect(() =>
      answerRowToState({
        id: answer.answerId,
        attemptId: answer.attemptId,
        itemId: answer.itemId,
        response: answer.response,
        savedAt: new Date("invalid"),
      }),
    ).toThrow("savedAt");
  });

  it("rejects malformed answer and replay snapshots at the persistence boundary", () => {
    expect(() => answerStateToRow({ ...answer, response: " " })).toThrow(
      PersistenceMappingError,
    );
    expect(() => answerStateToRow({ ...answer, savedAt: "invalid" })).toThrow(
      PersistenceMappingError,
    );
    expect(() => answerRowToState({ ...answerRow, id: " " })).toThrow(
      PersistenceMappingError,
    );
    expect(() =>
      answerIdempotencyRowToRecord({ fingerprint: " ", response: {} }),
    ).toThrow(PersistenceMappingError);
    expect(() =>
      answerIdempotencyRowToRecord({ fingerprint: "fp", response: null }),
    ).toThrow(PersistenceMappingError);
    expect(() =>
      answerIdempotencyRowToRecord({
        fingerprint: "fp",
        response: {
          attempt: { ...attempt, submittedAt: 42 },
          answer,
        },
      }),
    ).toThrow(PersistenceMappingError);
    expect(() =>
      answerIdempotencyRowToRecord({
        fingerprint: "fp",
        response: {
          attempt: { ...attempt, status: "UNKNOWN" },
          answer,
        },
      }),
    ).toThrow(PersistenceMappingError);
  });

  it("keeps answer and idempotency tables explicit", () => {
    expect(answers).toBeDefined();
    expect(answerIdempotency).toBeDefined();
  });

  it("maps an optimistic attempt update miss to a persistence conflict", async () => {
    const database = {
      update: () => ({
        set: () => ({
          where: () => ({
            returning: async () => [],
          }),
        }),
      }),
    } as never;

    await expect(
      createAnswerOperationsMethods(database).attemptsPort.update(attempt),
    ).rejects.toBeInstanceOf(PersistenceConflictError);
  });

  it("maps a concurrent answer idempotency insert to a persistence conflict", async () => {
    const duplicate = Object.assign(new Error("duplicate idempotency key"), {
      code: "23505",
    });
    const database = {
      execute: vi.fn(async () => undefined),
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [],
          }),
        }),
      }),
      insert: () => ({
        values: async () => {
          throw duplicate;
        },
      }),
    };

    await expect(
      createAnswerOperationsMethods(database as never).idempotency.store(
        "key-2026-08-20-000001",
        {
          fingerprint: "fingerprint",
          result: { attempt, answer },
        },
      ),
    ).rejects.toBeInstanceOf(PersistenceConflictError);
    expect(database.execute).toHaveBeenCalled();
  });

  it("executes answer, attempt, idempotency and event operations", async () => {
    const database = fakeDatabase({
      selectResults: [
        [answerRow],
        [],
        [attemptRow],
        [],
        [{ fingerprint: "fp", response: { attempt, answer } }],
        [{ fingerprint: "stored-fingerprint" }],
        [{ fingerprint: "fp" }],
        [],
      ],
      updateResults: [[{ id: attempt.attemptId }], []],
      insertResults: [[], [], [{ id: "idempotency-row" }]],
    });
    const methods = createAnswerOperationsMethods(database.executor as never);

    await expect(
      methods.answersPort.findByAttemptAndItem(
        attempt.attemptId,
        answer.itemId,
      ),
    ).resolves.toEqual(answer);
    await expect(
      methods.answersPort.findByAttemptAndItem("missing", answer.itemId),
    ).resolves.toBeNull();
    await methods.answersPort.save(answer);

    await expect(
      methods.attemptsPort.findById(attempt.attemptId),
    ).resolves.toEqual(attempt);
    await expect(methods.attemptsPort.findById("missing")).resolves.toBeNull();
    await methods.attemptsPort.update({
      ...attempt,
      version: attempt.version + 1,
    });
    await expect(
      methods.attemptsPort.update({ ...attempt, version: attempt.version + 1 }),
    ).rejects.toBeInstanceOf(PersistenceConflictError);

    await expect(
      methods.idempotency.find("answer-key-2026-01"),
    ).resolves.toEqual({
      fingerprint: "fp",
      result: { attempt, answer },
    });
    const record = { fingerprint: "fp", result: { attempt, answer } };
    await expect(
      methods.idempotency.store("answer-key-2026-01", {
        ...record,
        fingerprint: "new-fingerprint",
      }),
    ).rejects.toThrow("another fingerprint");
    await methods.idempotency.store("answer-key-2026-01", record);
    await methods.idempotency.store("new-answer-key-2026", record);

    const idempotencyRows = database.inserted.filter(
      (value): value is Record<string, unknown> =>
        typeof value === "object" && value !== null && "key" in value,
    );
    expect(idempotencyRows).not.toHaveLength(0);
    expect(idempotencyRows.every((value) => !("expiresAt" in value))).toBe(
      true,
    );

    const event: AnswerSavedEvent = {
      eventId: "77777777-7777-4777-8777-777777777777",
      eventType: "answer.saved.v1",
      aggregateType: "attempt",
      aggregateId: attempt.attemptId,
      occurredAt: "2026-08-09T17:00:00.000Z",
      schemaVersion: 1,
      correlationId: "88888888-8888-4888-8888-888888888888",
      payload: {
        attempt_id: attempt.attemptId,
        item_id: answer.itemId,
        status: "SALVA",
      },
    };
    await methods.eventPublisher.publish(event);

    expect(database.inserted.length).toBeGreaterThanOrEqual(3);
    expect(database.inserted.at(-1)).toMatchObject({
      eventType: event.eventType,
      status: "PENDING",
    });
  });

  it("maps a non-duplicate idempotency insert error and applies transaction security context", async () => {
    const unexpected = new Error("database unavailable");
    const duplicate = Object.assign(new Error("duplicate"), { code: "23505" });
    const database = fakeDatabase({
      selectResults: [[], []],
      insertErrors: [unexpected, duplicate],
    });
    const methods = createAnswerOperationsMethods(database.executor as never);
    const record = { fingerprint: "fp", result: { attempt, answer } };

    await expect(
      methods.idempotency.store("unexpected-key-2026", record),
    ).rejects.toBe(unexpected);
    await expect(
      methods.idempotency.store("duplicate-key-2026", record),
    ).rejects.toBeInstanceOf(PersistenceConflictError);

    const db = {
      transaction: vi.fn(async (work: (executor: unknown) => unknown) =>
        work(database.executor),
      ),
    };
    const dependencies = createAnswerUseCaseDependencies(
      db as never,
      () => "generated-id",
    );
    database.executor.execute.mockClear();
    await dependencies.transaction.run(
      async (operations) => Object.keys(operations).sort(),
      { participantId: attempt.participantId },
    );
    expect(database.executor.execute).toHaveBeenCalledTimes(1);
  });
});

describe("answer idempotency mapping", () => {
  it("round-trips a replay snapshot without dropping the response", () => {
    const record = answerIdempotencyRowToRecord({
      fingerprint: "answer-fingerprint-1",
      response: { attempt, answer },
    });

    expect(record).toEqual({
      fingerprint: "answer-fingerprint-1",
      result: { attempt, answer },
    });
  });

  it("rejects malformed replay snapshots", () => {
    expect(() =>
      answerIdempotencyRowToRecord({ fingerprint: "", response: {} }),
    ).toThrow(PersistenceMappingError);
  });
});
