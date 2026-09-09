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
