import { describe, expect, it } from "vitest";

import {
  startAttempt,
  submitAttempt,
  type AttemptUseCaseDependencies,
  type AttemptTransactionalOperations,
} from "./attempt-use-cases.js";
import type { AttemptState } from "@cvg/domain";
import { ApplicationError } from "./errors.js";

const ids = {
  participantId: "participant-1",
  activityId: "activity-1",
};

function createDependencies(
  initial: AttemptState[] = [],
): AttemptUseCaseDependencies & {
  attempts: AttemptState[];
  idempotencies: Map<string, { fingerprint: string; attempt: AttemptState }>;
  events: unknown[];
  audits: unknown[];
} {
  const attempts = [...initial];
  const idempotencies = new Map<
    string,
    { fingerprint: string; attempt: AttemptState }
  >();
  const events: unknown[] = [];
  const audits: unknown[] = [];

  const operations: AttemptTransactionalOperations = {
    activity: {
      isAvailable: async (participantId, activityId) =>
        participantId === ids.participantId && activityId === ids.activityId,
    },
    attemptsPort: {
      findOpenByParticipantAndActivity: async (participantId, activityId) =>
        attempts.find(
          (attempt) =>
            attempt.participantId === participantId &&
            attempt.activityId === activityId &&
            ![
              "CORRIGIDA_AUTOMATICAMENTE",
              "CORRIGIDA_HUMANAMENTE",
              "ANULADA",
            ].includes(attempt.status),
        ) ?? null,
      findById: async (attemptId) =>
        attempts.find((attempt) => attempt.attemptId === attemptId) ?? null,
      insert: async (attempt) => {
        attempts.push(attempt);
      },
      update: async (attempt) => {
        const index = attempts.findIndex(
          (stored) => stored.attemptId === attempt.attemptId,
        );
        attempts.splice(index, 1, attempt);
      },
    },
    idempotency: {
      find: async (key) => idempotencies.get(key) ?? null,
      store: async (key, record) => {
        idempotencies.set(key, record);
      },
    },
    eventPublisher: {
      publish: async (event) => {
        events.push(event);
      },
    },
    audit: {
      append: async (entry) => {
        audits.push(entry);
      },
    },
  };

  return {
    ...operations,
    attempts,
    idempotencies,
    events,
    audits,
    idFactory: () => `attempt-${attempts.length + 1}`,
    transaction: {
      run: async (work) => work(operations),
    },
  };
}

describe("attempt application commands", () => {
  it("starts an eligible attempt and records an idempotent result", async () => {
    const dependencies = createDependencies();

    const result = await startAttempt(
      {
        ...ids,
        idempotencyKey: "start-attempt-2026-08-09",
        correlationId: "correlation-start-2026-08-09",
      },
      dependencies,
    );

    expect(result).toMatchObject({
      attemptId: "attempt-1",
      participantId: ids.participantId,
      activityId: ids.activityId,
      status: "EM_ANDAMENTO",
      version: 1,
    });
    expect(dependencies.attempts).toHaveLength(1);
    expect(dependencies.idempotencies.size).toBe(1);
    expect(dependencies.audits).toHaveLength(1);
  });

  it("replays the same start command without creating a duplicate", async () => {
    const dependencies = createDependencies();
    const command = {
      ...ids,
      idempotencyKey: "start-attempt-2026-08-09",
      correlationId: "correlation-start-2026-08-09",
    };

    const first = await startAttempt(command, dependencies);
    const replay = await startAttempt(command, dependencies);

    expect(replay).toEqual(first);
    expect(dependencies.attempts).toHaveLength(1);
  });

  it("rejects idempotency key reuse with a different command", async () => {
    const dependencies = createDependencies();
    const key = "start-attempt-2026-08-09";

    await startAttempt(
      { ...ids, idempotencyKey: key, correlationId: "correlation-start-1" },
      dependencies,
    );

    await expect(
      startAttempt(
        {
          ...ids,
          activityId: "another-activity",
          idempotencyKey: key,
          correlationId: "correlation-start-1",
        },
        dependencies,
      ),
    ).rejects.toMatchObject({ code: "idempotency_conflict", status: 409 });
  });

  it("rejects unavailable activities without touching persistence", async () => {
    const dependencies = createDependencies();

    await expect(
      startAttempt(
        {
          participantId: ids.participantId,
          activityId: "not-available",
          idempotencyKey: "start-attempt-2026-08-09",
          correlationId: "correlation-start-2026-08-09",
        },
        dependencies,
      ),
    ).rejects.toMatchObject({ code: "not_found", status: 404 });
    expect(dependencies.attempts).toHaveLength(0);
  });

  it("rejects a second open attempt for the same activity", async () => {
    const dependencies = createDependencies([
      {
        attemptId: "attempt-existing",
        participantId: ids.participantId,
        activityId: ids.activityId,
        status: "EM_ANDAMENTO",
        version: 1,
      },
    ]);

    await expect(
      startAttempt(
        {
          ...ids,
          idempotencyKey: "start-attempt-conflict",
          correlationId: "correlation-start-conflict",
        },
        dependencies,
      ),
    ).rejects.toMatchObject({ code: "state_conflict", status: 409 });
    expect(dependencies.attempts).toHaveLength(1);
  });

  it("normalizes a cross-package persistence conflict without exposing internals", async () => {
    const dependencies = createDependencies();
    const foreignConflict = Object.assign(
      new Error("synthetic persistence details"),
      {
        name: "PersistenceConflictError",
        code: "state_conflict",
        status: 409,
        details: Object.freeze([]),
      },
    );
    const failingDependencies = {
      ...dependencies,
      transaction: {
        run: async () => {
          throw foreignConflict;
        },
      },
    } satisfies AttemptUseCaseDependencies;

    await expect(
      startAttempt(
        {
          ...ids,
          idempotencyKey: "start-attempt-foreign-conflict",
          correlationId: "correlation-foreign-conflict",
        },
        failingDependencies,
      ),
    ).rejects.toMatchObject({
      code: "state_conflict",
      status: 409,
      message: "Attempt state conflict",
    });
  });

  it("submits only the owner's saved attempt and replays safely", async () => {
    const dependencies = createDependencies();
    const started = await startAttempt(
      {
        ...ids,
        idempotencyKey: "start-attempt-2026-08-09",
        correlationId: "correlation-start-2026-08-09",
      },
      dependencies,
    );
    const saved = { ...started, status: "SALVA" as const, version: 2 };
    dependencies.attempts.splice(0, 1, saved);
    const command = {
      attemptId: saved.attemptId,
      participantId: ids.participantId,
      idempotencyKey: "submit-attempt-2026-08-09",
      correlationId: "correlation-2026-08-09",
      submittedAt: "2026-08-09T17:00:00.000Z",
    };

    const submitted = await submitAttempt(command, dependencies);
    const replay = await submitAttempt(command, dependencies);

    expect(submitted.status).toBe("SUBMETIDA");
    expect(replay).toEqual(submitted);
    expect(dependencies.attempts).toHaveLength(1);
    expect(dependencies.events).toHaveLength(1);
    expect(dependencies.audits).toHaveLength(2);
    expect(dependencies.events[0]).toMatchObject({
      eventType: "attempt.submitted.v1",
      aggregateId: saved.attemptId,
      payload: { status: "SUBMETIDA" },
    });
  });

  it("denies cross-participant submission and preserves the attempt", async () => {
    const dependencies = createDependencies([
      {
        attemptId: "attempt-1",
        participantId: ids.participantId,
        activityId: ids.activityId,
        status: "SALVA",
        version: 2,
      },
    ]);

    await expect(
      submitAttempt(
        {
          attemptId: "attempt-1",
          participantId: "participant-2",
          idempotencyKey: "submit-attempt-2026-08-09",
          correlationId: "correlation-2026-08-09",
          submittedAt: "2026-08-09T17:00:00.000Z",
        },
        dependencies,
      ),
    ).rejects.toMatchObject({ code: "forbidden", status: 403 });
    expect(dependencies.attempts[0]?.status).toBe("SALVA");
  });

  it("maps a domain transition failure to a state conflict", async () => {
    const dependencies = createDependencies([
      {
        attemptId: "attempt-submitted",
        participantId: ids.participantId,
        activityId: ids.activityId,
        status: "SUBMETIDA",
        version: 3,
      },
    ]);

    await expect(
      submitAttempt(
        {
          attemptId: "attempt-submitted",
          participantId: ids.participantId,
          idempotencyKey: "submit-attempt-domain-conflict",
          correlationId: "correlation-domain-conflict",
          submittedAt: "2026-08-09T17:00:00.000Z",
        },
        dependencies,
      ),
    ).rejects.toMatchObject({ code: "state_conflict", status: 409 });
    expect(dependencies.events).toHaveLength(0);
  });

  it("rejects submission when the attempt is missing", async () => {
    const dependencies = createDependencies();

    await expect(
      submitAttempt(
        {
          attemptId: "missing-attempt",
          participantId: ids.participantId,
          idempotencyKey: "submit-attempt-missing",
          correlationId: "correlation-missing",
          submittedAt: "2026-08-09T17:00:00.000Z",
        },
        dependencies,
      ),
    ).rejects.toMatchObject({ code: "not_found", status: 404 });
  });

  it("maps malformed persistence outcomes to a stable application error", async () => {
    const dependencies = createDependencies();
    const brokenAttemptsPort = {
      ...dependencies.attemptsPort,
      findById: async () => {
        throw new Error("SQL password=secret");
      },
    };
    const brokenDependencies: AttemptUseCaseDependencies = {
      ...dependencies,
      attemptsPort: brokenAttemptsPort,
      transaction: {
        run: async (work) =>
          work({
            ...dependencies,
            attemptsPort: brokenAttemptsPort,
          }),
      },
    };

    await expect(
      submitAttempt(
        {
          attemptId: "attempt-1",
          participantId: ids.participantId,
          idempotencyKey: "submit-attempt-2026-08-09",
          correlationId: "correlation-2026-08-09",
          submittedAt: "2026-08-09T17:00:00.000Z",
        },
        brokenDependencies,
      ),
    ).rejects.toBeInstanceOf(ApplicationError);
  });
});
