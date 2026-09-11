import { describe, expect, it } from "vitest";

import { AttemptDomainError, type AttemptState } from "@cvg/domain";

import {
  startAttempt,
  submitAttempt,
  type AttemptTransactionalOperations,
  type AttemptUseCaseDependencies,
  type IdempotencyRecord,
} from "./attempt-use-cases.js";
import { ApplicationError } from "./errors.js";

/**
 * AAA-FINAL-002 — Mutation Assurance Closure (attempt lifecycle +
 * idempotency). Killer tests comportamentais: códigos de erro públicos,
 * replay idempotente, conflito de chave, guardas de estado, contexto de
 * transação e evento publicado. Riscos: duplo start, submit alheio,
 * perda de idempotência, mascaramento de erro.
 */

const ids = {
  participantId: "participant-1",
  activityId: "activity-1",
  scopeId: "scope-1",
};

function dependencies(): AttemptUseCaseDependencies & {
  ports: typeof mutable;
  attempts: AttemptState[];
  idempotencies: Map<string, IdempotencyRecord>;
  events: Array<Record<string, unknown>>;
  audits: Array<Record<string, unknown>>;
  contexts: Array<unknown>;
} {
  const attempts: AttemptState[] = [];
  const idempotencies = new Map<string, IdempotencyRecord>();
  const events: Array<Record<string, unknown>> = [];
  const audits: Array<Record<string, unknown>> = [];
  const contexts: Array<unknown> = [];
  let counter = 0;
  const mutable = {
    activity: { isAvailable: async () => true },
    attemptsPort: {
      findOpenByParticipantAndActivity: async () =>
        attempts.find((attempt) => attempt.status === "EM_ANDAMENTO") ?? null,
      findById: async (attemptId: string) =>
        attempts.find((attempt) => attempt.attemptId === attemptId) ?? null,
      insert: async (attempt: AttemptState) => {
        attempts.push(attempt);
      },
      update: async (attempt: AttemptState) => {
        const index = attempts.findIndex(
          (item) => item.attemptId === attempt.attemptId,
        );
        attempts.splice(index, 1, attempt);
      },
    },
    idempotency: {
      find: async (key: string) => idempotencies.get(key) ?? null,
      store: async (key: string, record: IdempotencyRecord) => {
        idempotencies.set(key, record);
      },
    },
    eventPublisher: {
      publish: async (event: {
        eventId: string;
        eventType: "attempt.submitted.v1";
        aggregateType: "attempt";
        aggregateId: string;
        occurredAt: string;
        schemaVersion: 1;
        correlationId: string;
        payload: Record<string, string>;
      }) => {
        events.push(event as unknown as Record<string, unknown>);
      },
    },
    audit: {
      append: async (entry: Record<string, unknown>) => {
        audits.push(entry);
      },
    },
  };
  const operations = mutable as unknown as AttemptTransactionalOperations;
  return {
    ...mutable,
    ports: mutable,
    attempts,
    idempotencies,
    events,
    audits,
    contexts,
    idFactory: () => `attempt-${(counter += 1)}`,
    transaction: {
      run: async <Result>(
        work: (ops: AttemptTransactionalOperations) => Promise<Result>,
        context?: unknown,
      ) => {
        contexts.push(context);
        return work(operations);
      },
    },
  };
}

const startCommand = (overrides = {}) => ({
  participantId: ids.participantId,
  activityId: ids.activityId,
  scopeId: ids.scopeId,
  idempotencyKey: "key-start-1",
  correlationId: "corr-1",
  ...overrides,
});

describe("attempt mutation closure — idempotent start", () => {
  it("replays the same command without inserting twice", async () => {
    const deps = dependencies();
    const first = await startAttempt(startCommand(), deps);
    const second = await startAttempt(startCommand(), deps);
    expect(second).toEqual(first);
    expect(deps.attempts).toHaveLength(1);
  });

  it("rejects a reused key with a different command", async () => {
    const deps = dependencies();
    await startAttempt(startCommand(), deps);
    await expect(
      startAttempt(startCommand({ activityId: "activity-2" }), deps),
    ).rejects.toMatchObject({ code: "idempotency_conflict" });
  });

  it("rejects a second open attempt for the same activity", async () => {
    const deps = dependencies();
    await startAttempt(startCommand(), deps);
    await expect(
      startAttempt(startCommand({ idempotencyKey: "key-start-2" }), deps),
    ).rejects.toMatchObject({ code: "state_conflict" });
  });

  it("runs the transaction scoped to participant and scope", async () => {
    const deps = dependencies();
    await startAttempt(startCommand(), deps);
    expect(deps.contexts).toEqual([
      { participantId: ids.participantId, scopeId: ids.scopeId },
    ]);
  });

  it("audits the start with SUCCESS outcome", async () => {
    const deps = dependencies();
    await startAttempt(startCommand(), deps);
    expect(deps.audits[0]).toMatchObject({
      action: "ATTEMPT_STARTED",
      outcome: "SUCCESS",
      scopeId: ids.scopeId,
    });
  });
});

describe("attempt mutation closure — submit guards", () => {
  async function started() {
    const deps = dependencies();
    const attempt = (await startAttempt(startCommand(), deps)) as {
      attemptId: string;
      status: string;
    };
    const saved = { ...attempt, status: "SALVA", version: 2 };
    deps.attempts.splice(0, 1, saved as unknown as AttemptState);
    return { deps, attemptId: saved.attemptId };
  }

  const submitCommand = (attemptId: string, overrides = {}) => ({
    attemptId,
    participantId: ids.participantId,
    scopeId: ids.scopeId,
    idempotencyKey: "key-submit-1",
    correlationId: "corr-2",
    submittedAt: "2026-09-11T12:00:00.000Z",
    ...overrides,
  });

  it("rejects submit of an unknown attempt", async () => {
    const deps = dependencies();
    await expect(
      submitAttempt(submitCommand("missing"), deps),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("rejects submit of another participant attempt", async () => {
    const { deps, attemptId } = await started();
    await expect(
      submitAttempt(
        submitCommand(attemptId, { participantId: "participant-2" }),
        deps,
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("publishes the submitted event on the attempt aggregate", async () => {
    const { deps, attemptId } = await started();
    await submitAttempt(submitCommand(attemptId), deps);
    expect(deps.events[0]).toMatchObject({
      eventType: "attempt.submitted.v1",
      aggregateType: "attempt",
      aggregateId: attemptId,
    });
    expect(deps.contexts.at(-1)).toEqual({
      participantId: ids.participantId,
      scopeId: ids.scopeId,
    });
    const stored = deps.idempotencies.get("key-submit-1");
    expect(stored?.fingerprint).toBe(
      JSON.stringify({
        operation: "submit_attempt",
        attemptId,
        participantId: ids.participantId,
        scopeId: ids.scopeId,
        submittedAt: "2026-09-11T12:00:00.000Z",
      }),
    );
  });

  it("audits the submit with SUCCESS outcome", async () => {
    const { deps, attemptId } = await started();
    await submitAttempt(submitCommand(attemptId), deps);
    expect(deps.audits.at(-1)).toMatchObject({
      action: "ATTEMPT_SUBMITTED",
      outcome: "SUCCESS",
    });
  });

  it("keeps start and submit fingerprints apart on the same key", async () => {
    const { deps, attemptId } = await started();
    await expect(
      submitAttempt(
        submitCommand(attemptId, { idempotencyKey: "key-start-1" }),
        deps,
      ),
    ).rejects.toMatchObject({ code: "idempotency_conflict" });
  });
});

describe("attempt mutation closure — error mapping", () => {
  it("passes ApplicationError through unchanged", async () => {
    const deps = dependencies();
    deps.ports.activity.isAvailable = async () => {
      throw new ApplicationError("not_found", "gone");
    };
    await expect(startAttempt(startCommand(), deps)).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("maps domain errors to state_conflict", async () => {
    const deps = dependencies();
    deps.ports.attemptsPort.insert = async () => {
      throw new AttemptDomainError("bad transition");
    };
    await expect(startAttempt(startCommand(), deps)).rejects.toMatchObject({
      code: "state_conflict",
    });
  });

  it("maps persistence state conflicts to state_conflict", async () => {
    const deps = dependencies();
    const conflict = new Error("row version mismatch");
    conflict.name = "PersistenceStateConflictError";
    deps.ports.attemptsPort.insert = async () => {
      throw conflict;
    };
    await expect(startAttempt(startCommand(), deps)).rejects.toMatchObject({
      code: "state_conflict",
    });
  });

  it("maps non-idempotent persistence conflicts to state_conflict", async () => {
    const deps = dependencies();
    const conflict = new Error("row version mismatch");
    conflict.name = "PersistenceConflictError";
    deps.ports.attemptsPort.insert = async () => {
      throw conflict;
    };
    await expect(startAttempt(startCommand(), deps)).rejects.toMatchObject({
      code: "state_conflict",
    });
  });

  it("maps unknown failures to internal_error", async () => {
    const deps = dependencies();
    deps.ports.attemptsPort.insert = async () => {
      throw new Error("boom");
    };
    await expect(startAttempt(startCommand(), deps)).rejects.toMatchObject({
      code: "internal_error",
    });
  });

  it("conflicts when the same key resubmits a different instant", async () => {
    const deps = dependencies();
    const started = (await startAttempt(startCommand(), deps)) as {
      attemptId: string;
    };
    deps.attempts.splice(0, 1, {
      ...(deps.attempts[0] as AttemptState),
      status: "SALVA",
      version: 2,
    });
    const submit = (key: string, submittedAt: string) => ({
      attemptId: started.attemptId,
      participantId: ids.participantId,
      scopeId: ids.scopeId,
      idempotencyKey: key,
      correlationId: "corr-9",
      submittedAt,
    });
    await submitAttempt(submit("key-reuse", "2026-09-11T12:00:00.000Z"), deps);
    await expect(
      submitAttempt(submit("key-reuse", "2026-09-12T12:00:00.000Z"), deps),
    ).rejects.toMatchObject({ code: "idempotency_conflict" });
  });

  it("stores stable operation-namespaced fingerprints", async () => {
    const deps = dependencies();
    await startAttempt(startCommand({ idempotencyKey: "key-fp" }), deps);
    const stored = deps.idempotencies.get("key-fp");
    expect(stored?.fingerprint).toBe(
      JSON.stringify({
        operation: "start_attempt",
        participantId: ids.participantId,
        activityId: ids.activityId,
        scopeId: ids.scopeId,
      }),
    );
  });

  it("maps persistence conflicts mentioning idempotency", async () => {
    const deps = dependencies();
    const conflict = new Error("duplicate key idempotency_key");
    conflict.name = "PersistenceConflictError";
    deps.ports.attemptsPort.insert = async () => {
      throw conflict;
    };
    await expect(startAttempt(startCommand(), deps)).rejects.toMatchObject({
      code: "idempotency_conflict",
    });
  });
});
