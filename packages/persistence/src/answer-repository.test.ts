import { describe, expect, it, vi } from "vitest";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import type { AnswerState, AttemptState } from "@cvg/domain";

import {
  createAnswerUseCaseDependencies,
  PersistenceMappingError,
  answerIdempotencyRowToRecord,
  answerRowToState,
  answerStateToRow,
} from "./answer-repository.js";
import { createFakeDatabase } from "./test-support/fake-database.js";
import { answerIdempotency, answers } from "./schema.js";
import type * as schema from "./schema.js";

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

type StoredIdempotencyRow = Readonly<{
  readonly fingerprint: string;
  readonly response: unknown;
}>;

function createAnswerIdempotencyDatabase(): {
  readonly db: PostgresJsDatabase<typeof schema>;
  readonly onConflictDoNothing: ReturnType<typeof vi.fn>;
  readonly storedRows: () => readonly StoredIdempotencyRow[];
} {
  let pending: StoredIdempotencyRow | undefined;
  let stored: StoredIdempotencyRow | undefined;

  const onConflictDoNothing = vi.fn(async () => {
    if (stored === undefined && pending !== undefined) {
      stored = pending;
    }
  });
  const values = vi.fn((row: Record<string, unknown>) => {
    if (typeof row.fingerprint !== "string") {
      throw new Error("synthetic fingerprint is required");
    }
    pending = { fingerprint: row.fingerprint, response: row.response };
    return { onConflictDoNothing };
  });
  const insert = vi.fn(() => ({ values }));
  const limit = vi.fn(async () => (stored === undefined ? [] : [stored]));
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));

  return {
    db: { insert, select } as unknown as PostgresJsDatabase<typeof schema>,
    onConflictDoNothing,
    storedRows: () => (stored === undefined ? [] : [stored]),
  };
}

describe("PostgreSQL answer mapping", () => {
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

  it("keeps answer and idempotency tables explicit", () => {
    expect(answers).toBeDefined();
    expect(answerIdempotency).toBeDefined();
  });
});

describe("answer idempotency mapping", () => {
  it("persists one winner when identical idempotency writes race", async () => {
    const database = createAnswerIdempotencyDatabase();
    const dependencies = createAnswerUseCaseDependencies(
      database.db,
      () => answer.answerId,
    );
    const record = {
      fingerprint: "answer-fingerprint-1",
      result: { attempt, answer },
    };

    await expect(
      Promise.all([
        dependencies.idempotency.store("answer-race-key", record),
        dependencies.idempotency.store("answer-race-key", record),
      ]),
    ).resolves.toEqual([undefined, undefined]);
    expect(database.onConflictDoNothing).toHaveBeenCalledTimes(2);
    expect(database.storedRows()).toHaveLength(1);
  });

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

describe("answer mapping validation", () => {
  it("rejects rows with empty fields or invalid timestamps", () => {
    expect(() => answerStateToRow({ ...answer, answerId: " " })).toThrow(
      PersistenceMappingError,
    );
    expect(() => answerStateToRow({ ...answer, attemptId: "" })).toThrow(
      PersistenceMappingError,
    );
    expect(() => answerStateToRow({ ...answer, itemId: "" })).toThrow(
      PersistenceMappingError,
    );
    expect(() => answerStateToRow({ ...answer, response: " " })).toThrow(
      PersistenceMappingError,
    );
    expect(() =>
      answerStateToRow({ ...answer, savedAt: "not-a-date" }),
    ).toThrow(PersistenceMappingError);
    expect(() =>
      answerRowToState({
        id: "",
        attemptId: answer.attemptId,
        itemId: answer.itemId,
        response: "x",
        savedAt: new Date(),
      }),
    ).toThrow(PersistenceMappingError);
    expect(() =>
      answerRowToState({
        id: answer.answerId,
        attemptId: answer.attemptId,
        itemId: answer.itemId,
        response: "x",
        savedAt: new Date("invalid"),
      }),
    ).toThrow(PersistenceMappingError);
  });

  it("rejects malformed idempotency snapshots", () => {
    expect(() =>
      answerIdempotencyRowToRecord({ fingerprint: "", response: {} }),
    ).toThrow(PersistenceMappingError);
    expect(() =>
      answerIdempotencyRowToRecord({ fingerprint: "f", response: null }),
    ).toThrow(PersistenceMappingError);
    expect(() =>
      answerIdempotencyRowToRecord({
        fingerprint: "f",
        response: { attempt: "x", answer: {} },
      }),
    ).toThrow(PersistenceMappingError);
    expect(() =>
      answerIdempotencyRowToRecord({
        fingerprint: "f",
        response: {
          attempt: {
            attemptId: "a",
            participantId: "p",
            activityId: "x",
            status: "DESCONHECIDO",
            version: 1,
          },
          answer: {},
        },
      }),
    ).toThrow(PersistenceMappingError);
    expect(() =>
      answerIdempotencyRowToRecord({
        fingerprint: "f",
        response: {
          attempt: {
            attemptId: "a",
            participantId: "p",
            activityId: "x",
            status: "SALVA",
            version: 1.5,
          },
          answer: {},
        },
      }),
    ).toThrow(PersistenceMappingError);
    expect(() =>
      answerIdempotencyRowToRecord({
        fingerprint: "f",
        response: {
          attempt: {
            attemptId: "a",
            participantId: "p",
            activityId: "x",
            status: "SALVA",
            version: 1,
          },
          answer: {
            answerId: "a",
            attemptId: "b",
            itemId: "c",
            response: "x",
            savedAt: 42,
          },
        },
      }),
    ).toThrow(PersistenceMappingError);
  });
});

describe("answer use case dependencies", () => {
  const attemptRow = {
    id: attempt.attemptId,
    participantId: attempt.participantId,
    activityId: attempt.activityId,
    status: attempt.status,
    version: attempt.version,
    submittedAt: null,
  };

  function deps(db: ReturnType<typeof createFakeDatabase>) {
    return createAnswerUseCaseDependencies(
      db as unknown as Parameters<typeof createAnswerUseCaseDependencies>[0],
      () => "id-factory",
    );
  }

  it("finds and saves answers", async () => {
    const answerRow = {
      id: answer.answerId,
      attemptId: answer.attemptId,
      itemId: answer.itemId,
      response: answer.response,
      savedAt: new Date(answer.savedAt),
    };
    const found = createFakeDatabase({ rows: [[answerRow]] });
    expect(
      await deps(found).answersPort.findByAttemptAndItem(
        answer.attemptId,
        answer.itemId,
      ),
    ).toMatchObject({ answerId: answer.answerId });
    const missing = createFakeDatabase({ rows: [[]] });
    expect(
      await deps(missing).answersPort.findByAttemptAndItem(
        answer.attemptId,
        answer.itemId,
      ),
    ).toBeNull();
    const saved = createFakeDatabase();
    await expect(deps(saved).answersPort.save(answer)).resolves.toBeUndefined();
  });

  it("checks activity item availability", async () => {
    const available = createFakeDatabase({
      rows: [[{ itemId: answer.itemId }]],
    });
    expect(
      await deps(available).hasActivityItem(
        attempt.participantId,
        attempt.activityId,
        "scope-1",
        answer.itemId,
      ),
    ).toBe(true);
    const unavailable = createFakeDatabase({ rows: [[]] });
    expect(
      await deps(unavailable).hasActivityItem(
        attempt.participantId,
        attempt.activityId,
        "scope-1",
        answer.itemId,
      ),
    ).toBe(false);
  });

  it("finds attempts and rejects unsupported statuses", async () => {
    const found = createFakeDatabase({ rows: [[attemptRow]] });
    expect(
      await deps(found).attemptsPort.findById(attempt.attemptId),
    ).toMatchObject({ attemptId: attempt.attemptId });
    const missing = createFakeDatabase({ rows: [[]] });
    expect(
      await deps(missing).attemptsPort.findById(attempt.attemptId),
    ).toBeNull();
    const invalid = createFakeDatabase({
      rows: [[{ ...attemptRow, status: "QUEBRADA" }]],
    });
    await expect(
      deps(invalid).attemptsPort.findById(attempt.attemptId),
    ).rejects.toThrow(PersistenceMappingError);
  });

  it("updates attempts and conflicts on stale versions", async () => {
    const ok = createFakeDatabase({ rows: [[{ id: attempt.attemptId }]] });
    await expect(
      deps(ok).attemptsPort.update(attempt),
    ).resolves.toBeUndefined();
    const stale = createFakeDatabase({ rows: [[]] });
    await expect(deps(stale).attemptsPort.update(attempt)).rejects.toThrow(
      "version changed",
    );
  });

  it("locks and finds idempotency records", async () => {
    const db = createFakeDatabase();
    await expect(deps(db).idempotency.lock?.("key-1")).resolves.toBeUndefined();
    const record = {
      fingerprint: "f",
      result: {
        attempt,
        answer,
      },
    };
    const found = createFakeDatabase({
      rows: [[{ fingerprint: "f", response: record.result }]],
    });
    expect(await deps(found).idempotency.find("key-1")).toMatchObject({
      fingerprint: "f",
    });
    const missing = createFakeDatabase({ rows: [[]] });
    expect(await deps(missing).idempotency.find("key-1")).toBeNull();
  });

  it("stores idempotency records and reports conflicts", async () => {
    const record = {
      fingerprint: "f",
      result: {
        attempt,
        answer,
      },
    };
    const stored = createFakeDatabase({ rows: [[], [{ fingerprint: "f" }]] });
    await expect(
      deps(stored).idempotency.store("key-1", record),
    ).resolves.toBeUndefined();
    const missing = createFakeDatabase({ rows: [[], []] });
    await expect(
      deps(missing).idempotency.store("key-1", record),
    ).rejects.toThrow("was not persisted");
    const different = createFakeDatabase({
      rows: [[], [{ fingerprint: "other" }]],
    });
    await expect(
      deps(different).idempotency.store("key-1", record),
    ).rejects.toThrow("fingerprint");
  });

  it("publishes outbox events and runs transactions", async () => {
    const db = createFakeDatabase({ rows: [[], [], [attemptRow]] });
    const instance = deps(db);
    await expect(
      instance.eventPublisher.publish({
        eventId: "outbox-1",
        eventType: "answer.saved.v1",
        aggregateType: "attempt",
        aggregateId: attempt.attemptId,
        occurredAt: "2026-08-09T17:00:00.000Z",
        schemaVersion: 1,
        correlationId: "corr-1",
        payload: {
          attempt_id: attempt.attemptId,
          item_id: answer.itemId,
          status: "SALVA",
        },
      }),
    ).resolves.toBeUndefined();
    const found = await instance.transaction.run(
      async (operations) => operations.attemptsPort.findById(attempt.attemptId),
      { participantId: attempt.participantId },
    );
    expect(found).toMatchObject({ attemptId: attempt.attemptId });
  });
});
