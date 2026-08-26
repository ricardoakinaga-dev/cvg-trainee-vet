import { describe, expect, it, vi } from "vitest";

import {
  createB07DiagnosticSessionCatalog,
  finalizeDiagnosticSession,
  getDiagnosticSession,
  saveDiagnosticSessionAnswer,
  startDiagnosticSession,
  toDiagnosticSessionProjection,
  type DiagnosticSessionAggregate,
  type DiagnosticSessionFinalizationState,
  type DiagnosticSessionRepositoryPort,
} from "./diagnostic-session-use-cases.js";

const participantId = "11111111-1111-4111-8111-111111111111";
const scopeId = "22222222-2222-4222-8222-222222222222";
const sessionId = "33333333-3333-4333-8333-333333333333";
const resultId = "44444444-4444-4444-8444-444444444444";
const startedAt = "2026-08-26T14:00:00.000Z";
const catalog = createB07DiagnosticSessionCatalog();

const aggregate: DiagnosticSessionAggregate = {
  session: {
    sessionId,
    participantId,
    scopeId,
    diagnosticId: "B07-DIAGNOSTIC-V1",
    diagnosticVersion: "0.1.0",
    startedAt,
    status: "EM_ANDAMENTO",
    version: 0,
  },
  catalog: catalog.snapshot,
  answers: [],
};

const finalization: DiagnosticSessionFinalizationState = {
  aggregate: {
    ...aggregate,
    session: {
      ...aggregate.session,
      status: "FINALIZADA",
      version: 1,
      finalizedAt: "2026-08-26T14:05:00.000Z",
    },
    result: {
      resultId,
      participantId,
      scopeId,
      diagnosticId: "B07-DIAGNOSTIC-V1",
      version: "0.1.0",
      completedAt: "2026-08-26T14:05:00.000Z",
      result: {
        diagnosticId: "B07-DIAGNOSTIC-V1",
        version: "0.1.0",
        notPunitive: true,
        noGlobalPassFail: true,
        totalItemCount: 120,
        answeredItemCount: 1,
        themeResults: [
          {
            themeId: "B07-S1",
            itemCount: 40,
            answeredItemCount: 1,
            earnedPoints: 1,
            possiblePoints: 1,
            percent: 100,
            recommendedModuleIds: ["M01"],
          },
          {
            themeId: "B07-S2",
            itemCount: 40,
            answeredItemCount: 0,
            earnedPoints: 0,
            possiblePoints: 0,
            percent: 0,
            recommendedModuleIds: ["M02"],
          },
          {
            themeId: "B07-S3",
            itemCount: 40,
            answeredItemCount: 0,
            earnedPoints: 0,
            possiblePoints: 0,
            percent: 0,
            recommendedModuleIds: ["M11"],
          },
        ],
        recommendedModuleIds: ["M01", "M02", "M11"],
        remediationObjectiveIds: ["M01-OBJ-01"],
      },
    },
  },
  assignments: {
    diagnosticResultId: resultId,
    participantId,
    scopeId,
    assignments: [],
  },
};

function namedError(name: string): Error {
  const error = new Error("synthetic repository failure");
  error.name = name;
  return error;
}

function repository(
  overrides: Partial<DiagnosticSessionRepositoryPort> = {},
): DiagnosticSessionRepositoryPort {
  return {
    start: vi.fn(async () => aggregate),
    findCurrent: vi.fn(async () => aggregate),
    findById: vi.fn(async () => aggregate),
    saveAnswer: vi.fn(async () => aggregate),
    finalize: vi.fn(async () => finalization),
    ...overrides,
  };
}

describe("diagnostic session application", () => {
  it("creates a safe B-07 catalog from the draft without publishing it", () => {
    const catalog = createB07DiagnosticSessionCatalog();
    expect(catalog.items).toHaveLength(120);
    expect(catalog.publicationAuthorized).toBe(false);
    expect(catalog.clinicalReview).toBe("PENDENTE");
    expect(catalog.items[0]).not.toHaveProperty("correctChoiceIds");
    expect(catalog.items[0]).not.toHaveProperty("sourceRefs");
  });

  it("keeps start identity and scope in the server-side command", async () => {
    const repo = repository();
    await startDiagnosticSession(
      {
        participantId,
        scopeId,
        idempotencyKey: "diagnostic-start-2026-08-26-0001",
        correlationId: "55555555-5555-4555-8555-555555555555",
        startedAt,
      },
      repo,
    );

    expect(repo.start).toHaveBeenCalledWith(
      expect.objectContaining({ participantId, scopeId }),
    );
  });

  it("rejects a choice that is not in the server-owned catalog", async () => {
    const repo = repository();
    await expect(
      saveDiagnosticSessionAnswer(
        {
          participantId,
          scopeId,
          sessionId,
          itemId: "10000000-0000-4000-8000-000000000001",
          version: 0,
          selectedChoiceIds: ["not-in-item"],
          idempotencyKey: "diagnostic-answer-2026-08-26-0001",
          correlationId: "55555555-5555-4555-8555-555555555555",
          occurredAt: "2026-08-26T14:01:00.000Z",
        },
        repo,
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
    expect(repo.saveAnswer).not.toHaveBeenCalled();
  });

  it("evaluates canonical answers inside finalization and returns only the safe projection", async () => {
    let evaluatedAnswers: readonly unknown[] = [];
    const repo = repository({
      finalize: vi.fn(async (input) => {
        evaluatedAnswers = input.evaluate(
          [
            {
              itemId: "B07-S1-I001",
              selectedChoiceIds: ["a"],
            },
          ],
          finalization.aggregate.catalog,
        ).result
          ? [{ itemId: "B07-S1-I001" }]
          : [];
        return finalization;
      }),
    });
    const finalized = await finalizeDiagnosticSession(
      {
        participantId,
        scopeId,
        sessionId,
        version: 0,
        idempotencyKey: "diagnostic-finalize-2026-08-26-0001",
        correlationId: "55555555-5555-4555-8555-555555555555",
        completedAt: "2026-08-26T14:05:00.000Z",
      },
      repo,
    );
    const projection = toDiagnosticSessionProjection(finalized.aggregate);

    expect(evaluatedAnswers).toEqual([{ itemId: "B07-S1-I001" }]);
    expect(projection).not.toHaveProperty("resultId");
    expect(JSON.stringify(projection)).not.toContain("M01-OBJ-01");
    expect(JSON.stringify(projection)).not.toContain("correctChoiceIds");
  });

  it("fails closed for invalid start commands, catalogs and ownership", async () => {
    await expect(
      startDiagnosticSession(
        {
          participantId: "",
          scopeId,
          idempotencyKey: "diagnostic-start-2026-08-26-0001",
          correlationId: "55555555-5555-4555-8555-555555555555",
          startedAt,
        },
        repository(),
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      startDiagnosticSession(
        {
          participantId,
          scopeId,
          idempotencyKey: "diagnostic-start-2026-08-26-0001",
          correlationId: "55555555-5555-4555-8555-555555555555",
          startedAt: "not-a-date",
        },
        repository(),
      ),
    ).rejects.toMatchObject({ code: "validation_error" });

    const invalidCatalog = {
      ...catalog,
      status: "PUBLICADO",
    } as unknown as typeof catalog;
    await expect(
      startDiagnosticSession(
        {
          participantId,
          scopeId,
          idempotencyKey: "diagnostic-start-2026-08-26-0001",
          correlationId: "55555555-5555-4555-8555-555555555555",
          startedAt,
        },
        repository(),
        invalidCatalog,
      ),
    ).rejects.toMatchObject({ code: "validation_error" });

    const wrongAggregate: DiagnosticSessionAggregate = {
      ...aggregate,
      session: {
        ...aggregate.session,
        participantId: "99999999-9999-4999-8999-999999999999",
      },
    };
    await expect(
      startDiagnosticSession(
        {
          participantId,
          scopeId,
          idempotencyKey: "diagnostic-start-2026-08-26-0001",
          correlationId: "55555555-5555-4555-8555-555555555555",
          startedAt,
        },
        repository({ start: vi.fn(async () => wrongAggregate) }),
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("maps repository failures and supports current and id-based reads", async () => {
    await expect(
      getDiagnosticSession(
        { participantId, scopeId },
        repository({ findCurrent: vi.fn(async () => null) }),
      ),
    ).resolves.toBeNull();
    const findById = vi.fn(async () => aggregate);
    await expect(
      getDiagnosticSession(
        { participantId, scopeId, sessionId },
        repository({ findById }),
      ),
    ).resolves.toBe(aggregate);
    expect(findById).toHaveBeenCalledWith(sessionId, participantId, scopeId);

    for (const [name, code] of [
      ["DiagnosticSessionDomainError", "state_conflict"],
      ["DiagnosticSessionNotFoundError", "not_found"],
      ["DiagnosticSessionConflictError", "state_conflict"],
      ["DiagnosticSessionIdempotencyConflictError", "idempotency_conflict"],
      ["UnexpectedRepositoryError", "internal_error"],
    ] as const) {
      await expect(
        getDiagnosticSession(
          { participantId, scopeId },
          repository({
            findCurrent: vi.fn(async () => {
              throw namedError(name);
            }),
          }),
        ),
      ).rejects.toMatchObject({ code });
    }

    const wrongRead: DiagnosticSessionAggregate = {
      ...aggregate,
      session: {
        ...aggregate.session,
        scopeId: "88888888-8888-4888-8888-888888888888",
      },
    };
    await expect(
      getDiagnosticSession(
        { participantId, scopeId },
        repository({ findCurrent: vi.fn(async () => wrongRead) }),
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("validates answer commands before persistence and maps answer conflicts", async () => {
    const item = catalog.items[0];
    if (item === undefined) throw new Error("catalog item is missing");
    const baseCommand = {
      participantId,
      scopeId,
      sessionId,
      version: 0,
      itemId: item.publicItemId,
      idempotencyKey: "diagnostic-answer-2026-08-26-0001",
      correlationId: "55555555-5555-4555-8555-555555555555",
      occurredAt: "2026-08-26T14:01:00.000Z",
    } as const;

    await expect(
      saveDiagnosticSessionAnswer(
        { ...baseCommand, selectedChoiceIds: [" "] },
        repository(),
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      saveDiagnosticSessionAnswer(
        { ...baseCommand, selectedChoiceIds: ["a", "a"] },
        repository(),
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      saveDiagnosticSessionAnswer(
        { ...baseCommand, itemId: "missing-item", selectedChoiceIds: ["a"] },
        repository(),
      ),
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(
      saveDiagnosticSessionAnswer(
        { ...baseCommand, selectedChoiceIds: ["not-in-item"] },
        repository(),
      ),
    ).rejects.toMatchObject({ code: "validation_error" });

    const finalizedRepository = repository({
      findById: vi.fn(async () => finalization.aggregate),
      saveAnswer: vi.fn(async () => {
        throw namedError("DiagnosticSessionConflictError");
      }),
    });
    await expect(
      saveDiagnosticSessionAnswer(
        { ...baseCommand, selectedChoiceIds: ["a"] },
        finalizedRepository,
      ),
    ).rejects.toMatchObject({ code: "state_conflict" });

    for (const [name, code] of [
      ["DiagnosticSessionNotFoundError", "not_found"],
      ["DiagnosticSessionConflictError", "state_conflict"],
      ["DiagnosticSessionIdempotencyConflictError", "idempotency_conflict"],
      ["UnexpectedRepositoryError", "internal_error"],
    ] as const) {
      await expect(
        saveDiagnosticSessionAnswer(
          { ...baseCommand, selectedChoiceIds: ["a"] },
          repository({
            saveAnswer: vi.fn(async () => {
              throw namedError(name);
            }),
          }),
        ),
      ).rejects.toMatchObject({ code });
    }
  });

  it("lets persistence replay an answer key after finalization", async () => {
    const item = catalog.items[0];
    if (item === undefined) throw new Error("catalog item is missing");
    const saveAnswer = vi.fn(async () => finalization.aggregate);
    const repo = repository({
      findById: vi.fn(async () => finalization.aggregate),
      saveAnswer,
    });

    await expect(
      saveDiagnosticSessionAnswer(
        {
          participantId,
          scopeId,
          sessionId,
          version: 0,
          itemId: item.publicItemId,
          selectedChoiceIds: ["a"],
          idempotencyKey: "diagnostic-answer-replay-2026-08-26",
          correlationId: "55555555-5555-4555-8555-555555555555",
          occurredAt: "2026-08-26T14:06:00.000Z",
        },
        repo,
      ),
    ).resolves.toBe(finalization.aggregate);
    expect(saveAnswer).toHaveBeenCalledOnce();
  });

  it("maps finalization validation, repository errors and projection answer mapping", async () => {
    await expect(
      finalizeDiagnosticSession(
        {
          participantId,
          scopeId,
          sessionId,
          version: -1,
          idempotencyKey: "diagnostic-finalize-2026-08-26-0001",
          correlationId: "55555555-5555-4555-8555-555555555555",
          completedAt: "2026-08-26T14:05:00.000Z",
        },
        repository(),
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      finalizeDiagnosticSession(
        {
          participantId,
          scopeId,
          sessionId,
          version: 0,
          idempotencyKey: "diagnostic-finalize-2026-08-26-0001",
          correlationId: "55555555-5555-4555-8555-555555555555",
          completedAt: "not-a-date",
        },
        repository(),
      ),
    ).rejects.toMatchObject({ code: "validation_error" });

    for (const [name, code] of [
      ["DiagnosticSessionNotFoundError", "not_found"],
      ["DiagnosticSessionConflictError", "state_conflict"],
      ["DiagnosticSessionIdempotencyConflictError", "idempotency_conflict"],
      ["UnexpectedRepositoryError", "internal_error"],
    ] as const) {
      await expect(
        finalizeDiagnosticSession(
          {
            participantId,
            scopeId,
            sessionId,
            version: 0,
            idempotencyKey: "diagnostic-finalize-2026-08-26-0001",
            correlationId: "55555555-5555-4555-8555-555555555555",
            completedAt: "2026-08-26T14:05:00.000Z",
          },
          repository({
            finalize: vi.fn(async () => {
              throw namedError(name);
            }),
          }),
        ),
      ).rejects.toMatchObject({ code });
    }

    const firstItem = catalog.snapshot.items[0];
    if (firstItem === undefined) throw new Error("snapshot item is missing");
    const answerAggregate: DiagnosticSessionAggregate = {
      ...aggregate,
      session: {
        ...aggregate.session,
        lastCheckpointAt: "2026-08-26T14:02:00.000Z",
      },
      answers: [
        {
          canonicalItemId: firstItem.canonicalItemId,
          selectedChoiceIds: ["a"],
          savedAt: "2026-08-26T14:02:00.000Z",
        },
      ],
    };
    const projection = toDiagnosticSessionProjection(answerAggregate);
    expect(projection).toMatchObject({
      answeredItemCount: 1,
      lastCheckpointAt: "2026-08-26T14:02:00.000Z",
      answers: [{ itemId: firstItem.publicItemId, selectedChoiceIds: ["a"] }],
    });
    expect(() =>
      toDiagnosticSessionProjection({
        ...aggregate,
        answers: [
          {
            canonicalItemId: "unknown",
            selectedChoiceIds: ["a"],
            savedAt: "2026-08-26T14:02:00.000Z",
          },
        ],
      }),
    ).toThrow("unknown snapshot item");
  });
});
