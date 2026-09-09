import { describe, expect, it } from "vitest";

import type { AnswerState, AttemptState } from "@cvg/domain";

import {
  saveAnswer,
  type AnswerIdempotencyRecord,
  type AnswerTransactionalOperations,
  type AnswerUseCaseDependencies,
} from "./answer-use-cases.js";

const currentAttempt: AttemptState = {
  attemptId: "attempt-1",
  participantId: "participant-1",
  activityId: "activity-1",
  status: "EM_ANDAMENTO",
  version: 1,
};

function dependencies(
  itemBelongsToActivity = true,
): AnswerUseCaseDependencies & {
  attempts: AttemptState[];
  answers: AnswerState[];
  events: unknown[];
  audits: unknown[];
  idempotencies: Map<string, AnswerIdempotencyRecord>;
} {
  const attempts = [currentAttempt];
  const answers: AnswerState[] = [];
  const events: unknown[] = [];
  const audits: unknown[] = [];
  const idempotencies = new Map<string, AnswerIdempotencyRecord>();
  const operations = {
    hasActivityItem: async () => itemBelongsToActivity,
    attemptsPort: {
      findById: async (attemptId: string) =>
        attempts.find((attempt) => attempt.attemptId === attemptId) ?? null,
      update: async (attempt: AttemptState) => {
        attempts.splice(0, 1, attempt);
      },
    },
    answersPort: {
      findByAttemptAndItem: async (attemptId: string, itemId: string) =>
        answers.find(
          (answer) =>
            answer.attemptId === attemptId && answer.itemId === itemId,
        ) ?? null,
      save: async (answer: AnswerState) => {
        answers.push(answer);
      },
    },
    idempotency: {
      find: async (key: string) => idempotencies.get(key) ?? null,
      store: async (key: string, record: AnswerIdempotencyRecord) => {
        idempotencies.set(key, record);
      },
    },
    eventPublisher: {
      publish: async (event: unknown) => {
        events.push(event);
      },
    },
    audit: {
      append: async (entry: unknown) => {
        audits.push(entry);
      },
    },
  };

  return {
    ...operations,
    attempts,
    answers,
    events,
    audits,
    idempotencies,
    idFactory: () => "answer-1",
    transaction: { run: async (work) => work(operations) },
  };
}

describe("SaveAnswer application command", () => {
  it("saves a draft answer, transitions the attempt, and publishes a redacted event", async () => {
    const deps = dependencies();
    const result = await saveAnswer(
      {
        attemptId: "attempt-1",
        participantId: "participant-1",
        activityId: "activity-1",
        scopeId: "scope-1",
        itemId: "item-1",
        response: "  resposta do participante  ",
        idempotencyKey: "answer-key-2026-08-09",
        correlationId: "correlation-1",
        savedAt: "2026-08-09T17:00:00.000Z",
      },
      deps,
    );

    expect(result.attempt.status).toBe("SALVA");
    expect(result.answer.response).toBe("resposta do participante");
    expect(deps.answers).toHaveLength(1);
    expect(deps.events).toEqual([
      expect.objectContaining({
        eventType: "answer.saved.v1",
        payload: {
          attempt_id: "attempt-1",
          item_id: "item-1",
          status: "SALVA",
        },
      }),
    ]);
    expect(deps.audits).toHaveLength(1);
    expect(JSON.stringify(deps.events)).not.toContain(
      "resposta do participante",
    );
  });

  it("replays the same answer command without duplicating answer or event", async () => {
    const deps = dependencies();
    const command = {
      attemptId: "attempt-1",
      participantId: "participant-1",
      activityId: "activity-1",
      scopeId: "scope-1",
      itemId: "item-1",
      response: "resposta",
      idempotencyKey: "answer-key-2026-08-09",
      correlationId: "correlation-1",
      savedAt: "2026-08-09T17:00:00.000Z",
    } as const;

    const first = await saveAnswer(command, deps);
    const replay = await saveAnswer(command, deps);

    expect(replay).toEqual(first);
    expect(deps.answers).toHaveLength(1);
    expect(deps.events).toHaveLength(1);
  });

  it("rejects a cross-participant or cross-activity command", async () => {
    const deps = dependencies();

    await expect(
      saveAnswer(
        {
          attemptId: "attempt-1",
          participantId: "participant-2",
          activityId: "activity-1",
          scopeId: "scope-1",
          itemId: "item-1",
          response: "resposta",
          idempotencyKey: "answer-key-2026-08-09",
          correlationId: "correlation-1",
          savedAt: "2026-08-09T17:00:00.000Z",
        },
        deps,
      ),
    ).rejects.toMatchObject({ code: "forbidden", status: 403 });

    await expect(
      saveAnswer(
        {
          attemptId: "attempt-1",
          participantId: "participant-1",
          activityId: "activity-other",
          scopeId: "scope-1",
          itemId: "item-1",
          response: "resposta",
          idempotencyKey: "answer-key-2026-08-10",
          correlationId: "correlation-1",
          savedAt: "2026-08-09T17:00:00.000Z",
        },
        deps,
      ),
    ).rejects.toMatchObject({ code: "forbidden", status: 403 });
  });

  it("rejects an item outside the participant's published activity", async () => {
    const deps = dependencies(false);

    await expect(
      saveAnswer(
        {
          attemptId: "attempt-1",
          participantId: "participant-1",
          activityId: "activity-1",
          scopeId: "scope-1",
          itemId: "item-from-another-activity",
          response: "resposta",
          idempotencyKey: "answer-key-item-outside-activity",
          correlationId: "correlation-1",
          savedAt: "2026-08-09T17:00:00.000Z",
        },
        deps,
      ),
    ).rejects.toMatchObject({ code: "not_found", status: 404 });
    expect(deps.answers).toHaveLength(0);
    expect(deps.events).toHaveLength(0);
  });

  it("maps a submitted attempt to a state conflict", async () => {
    const deps = dependencies();
    deps.attempts.splice(0, 1, { ...currentAttempt, status: "SUBMETIDA" });

    await expect(
      saveAnswer(
        {
          attemptId: "attempt-1",
          participantId: "participant-1",
          activityId: "activity-1",
          scopeId: "scope-1",
          itemId: "item-1",
          response: "resposta",
          idempotencyKey: "answer-key-2026-08-09",
          correlationId: "correlation-1",
          savedAt: "2026-08-09T17:00:00.000Z",
        },
        deps,
      ),
    ).rejects.toMatchObject({ code: "state_conflict", status: 409 });
  });

  it("rejects missing command metadata before opening a transaction", async () => {
    const deps = dependencies();

    await expect(
      saveAnswer(
        {
          attemptId: " ",
          participantId: "participant-1",
          activityId: "activity-1",
          scopeId: "scope-1",
          itemId: "item-1",
          response: "resposta",
          idempotencyKey: "answer-key-2026-08-09",
          correlationId: "correlation-1",
          savedAt: "2026-08-09T17:00:00.000Z",
        },
        deps,
      ),
    ).rejects.toMatchObject({ code: "validation_error", status: 422 });
  });

  it("rejects idempotency reuse and invalid answer content", async () => {
    const deps = dependencies();
    const command = {
      attemptId: "attempt-1",
      participantId: "participant-1",
      activityId: "activity-1",
      scopeId: "scope-1",
      itemId: "item-1",
      response: "resposta",
      idempotencyKey: "answer-key-2026-08-09",
      correlationId: "correlation-1",
      savedAt: "2026-08-09T17:00:00.000Z",
    } as const;

    await saveAnswer(command, deps);
    await expect(
      saveAnswer({ ...command, response: "outra resposta" }, deps),
    ).rejects.toMatchObject({ code: "idempotency_conflict", status: 409 });
    await expect(
      saveAnswer(
        {
          ...command,
          idempotencyKey: "answer-key-2026-08-10",
          response: "<script>blocked</script>",
        },
        deps,
      ),
    ).rejects.toMatchObject({ code: "validation_error", status: 422 });
  });

  it("maps a persistence idempotency race to a public 409 conflict", async () => {
    const base = dependencies();
    const conflictIdempotency = {
      ...base.idempotency,
      store: async () => {
        const conflict = new Error(
          "answer idempotency key has another fingerprint",
        );
        conflict.name = "PersistenceConflictError";
        throw conflict;
      },
    };
    const conflictDependencies: AnswerUseCaseDependencies = {
      ...base,
      idempotency: conflictIdempotency,
      transaction: {
        run: async (work) =>
          work({ ...base, idempotency: conflictIdempotency }),
      },
    };

    await expect(
      saveAnswer(
        {
          attemptId: "attempt-1",
          participantId: "participant-1",
          activityId: "activity-1",
          scopeId: "scope-1",
          itemId: "item-1",
          response: "resposta",
          idempotencyKey: "answer-key-persistence-race",
          correlationId: "correlation-persistence-race",
          savedAt: "2026-08-09T17:00:00.000Z",
        },
        conflictDependencies,
      ),
    ).rejects.toMatchObject({ code: "idempotency_conflict", status: 409 });
  });

  it("maps a persistence compare-and-set race to a state 409", async () => {
    const base = dependencies();
    const conflictedAttemptsPort = {
      ...base.attemptsPort,
      update: async () => {
        const conflict = new Error("attempt version changed concurrently");
        conflict.name = "PersistenceStateConflictError";
        throw conflict;
      },
    };
    const conflictDependencies: AnswerUseCaseDependencies = {
      ...base,
      attemptsPort: conflictedAttemptsPort,
      transaction: {
        run: async (work) =>
          work({ ...base, attemptsPort: conflictedAttemptsPort }),
      },
    };

    await expect(
      saveAnswer(
        {
          attemptId: "attempt-1",
          participantId: "participant-1",
          activityId: "activity-1",
          scopeId: "scope-1",
          itemId: "item-1",
          response: "resposta",
          idempotencyKey: "answer-key-state-race",
          correlationId: "correlation-state-race",
          savedAt: "2026-08-09T17:00:00.000Z",
        },
        conflictDependencies,
      ),
    ).rejects.toMatchObject({ code: "state_conflict", status: 409 });
  });

  it("updates an existing answer and hides persistence failures", async () => {
    const deps = dependencies();
    await saveAnswer(
      {
        attemptId: "attempt-1",
        participantId: "participant-1",
        activityId: "activity-1",
        scopeId: "scope-1",
        itemId: "item-1",
        response: "primeira resposta",
        idempotencyKey: "answer-key-2026-08-09",
        correlationId: "correlation-1",
        savedAt: "2026-08-09T17:00:00.000Z",
      },
      deps,
    );
    const updated = await saveAnswer(
      {
        attemptId: "attempt-1",
        participantId: "participant-1",
        activityId: "activity-1",
        scopeId: "scope-1",
        itemId: "item-1",
        response: "segunda resposta",
        idempotencyKey: "answer-key-2026-08-11",
        correlationId: "correlation-1",
        savedAt: "2026-08-09T17:01:00.000Z",
      },
      deps,
    );
    expect(updated.answer.answerId).toBe("answer-1");

    const base = dependencies();
    const brokenAnswersPort = {
      ...base.answersPort,
      findByAttemptAndItem: async () => {
        throw new Error("database password=secret");
      },
    };
    const broken = {
      ...base,
      answersPort: brokenAnswersPort,
      transaction: {
        run: async <Result>(
          work: (operations: AnswerTransactionalOperations) => Promise<Result>,
        ): Promise<Result> => work({ ...base, answersPort: brokenAnswersPort }),
      },
    };
    await expect(
      saveAnswer(
        {
          attemptId: "attempt-1",
          participantId: "participant-1",
          activityId: "activity-1",
          scopeId: "scope-1",
          itemId: "item-1",
          response: "resposta",
          idempotencyKey: "answer-key-2026-08-09",
          correlationId: "correlation-1",
          savedAt: "2026-08-09T17:00:00.000Z",
        },
        broken,
      ),
    ).rejects.toMatchObject({ code: "internal_error", status: 500 });
  });
});
