import { describe, expect, it, vi } from "vitest";
import {
  createAppeal,
  createAssessmentResult,
  transitionAppeal,
  type AppealState,
  type AssessmentResultState,
} from "@cvg/domain";

import {
  recalculateAppealResult,
  type AppealRecalculationTransactionPort,
  type AppealRecalculationTransactionalOperations,
} from "./appeal-recalculation-use-cases.js";

const ids = {
  appealId: "11111111-1111-4111-8111-111111111111",
  participantId: "22222222-2222-4222-8222-222222222222",
  scopeId: "33333333-3333-4333-8333-333333333333",
  attemptId: "44444444-4444-4444-8444-444444444444",
  itemId: "55555555-5555-4555-8555-555555555555",
  reviewerId: "66666666-6666-4666-8666-666666666666",
  correlationId: "77777777-7777-4777-8777-777777777777",
};

function pendingAppeal(): AppealState {
  const opened = createAppeal({
    appealId: ids.appealId,
    participantId: ids.participantId,
    attemptId: ids.attemptId,
    itemId: ids.itemId,
    justification: "Justificativa sintética.",
    createdAt: "2026-08-24T12:00:00.000Z",
  });
  const assigned = transitionAppeal(opened, {
    type: "ATRIBUIR_REVISOR",
    reviewerId: ids.reviewerId,
  });
  const decided = transitionAppeal(assigned, {
    type: "DECIDIR",
    decision: "MANTER_RESULTADO",
    rationale: "A decisão sintética mantém o resultado.",
    decidedAt: "2026-08-24T12:01:00.000Z",
    correlationId: ids.correlationId,
  });
  return transitionAppeal(decided, { type: "SOLICITAR_RECALCULO" });
}

function result(version = 1): AssessmentResultState {
  return createAssessmentResult({
    resultId: "88888888-8888-4888-8888-888888888888",
    attemptId: ids.attemptId,
    version,
    kind: "HUMANA",
    score: 82,
    outcome: "APROVADO",
    feedback: "Feedback sintético.",
    ruleVersion: "rubrica-sintetica-v1",
    correctedBy: ids.reviewerId,
    correctedAt: "2026-08-24T12:02:00.000Z",
  });
}

function transaction(
  seedAppeal: AppealState,
  seedResult: AssessmentResultState,
) {
  let appeal = seedAppeal;
  const results = [seedResult];
  const operations: AppealRecalculationTransactionalOperations = {
    findAppeal: vi.fn(async () => appeal),
    findLatestResult: vi.fn(async () => results.at(-1) ?? null),
    insertResult: vi.fn(async (next) => {
      results.push(next);
    }),
    saveAppeal: vi.fn(async (_context, next) => {
      appeal = next;
      return next;
    }),
  };
  const port: AppealRecalculationTransactionPort = {
    run: async (work) => work(operations),
  };
  return {
    operations,
    port,
    getAppeal: () => appeal,
    getResults: () => results,
  };
}

const command = {
  appealId: ids.appealId,
  scopeId: ids.scopeId,
  attemptId: ids.attemptId,
  appealVersion: 3,
  correlationId: ids.correlationId,
  now: "2026-08-24T12:03:00.000Z",
};

describe("bounded appeal recalculation", () => {
  it("preserves the previous result, inserts one immutable version, and closes after success", async () => {
    const dependency = transaction(pendingAppeal(), result());

    const completed = await recalculateAppealResult(command, dependency.port);

    expect(completed).toMatchObject({
      status: "COMPLETED",
      appeal: { status: "ENCERRADA", version: 4 },
      result: {
        version: 2,
        kind: "AUTOMATICA",
        score: 82,
        outcome: "APROVADO",
        feedback: "Feedback sintético.",
        ruleVersion: "appeal-recalculation-v1",
      },
    });
    expect(dependency.getResults()).toHaveLength(2);
    expect(dependency.getResults()[0]).toMatchObject({ version: 1 });
    expect(dependency.operations.saveAppeal).toHaveBeenCalledTimes(1);
    expect(Object.isFrozen(completed)).toBe(true);
  });

  it("is replay-safe after the first completion and does not insert another version", async () => {
    const dependency = transaction(pendingAppeal(), result());

    await recalculateAppealResult(command, dependency.port);
    const replay = await recalculateAppealResult(command, dependency.port);

    expect(replay.status).toBe("ALREADY_COMPLETED");
    expect(dependency.getResults()).toHaveLength(2);
    expect(dependency.operations.insertResult).toHaveBeenCalledTimes(1);
    expect(dependency.operations.saveAppeal).toHaveBeenCalledTimes(1);
  });

  it("fails closed for a mismatched version, missing result, or unsupported decision", async () => {
    const stale = transaction(pendingAppeal(), result());
    await expect(
      recalculateAppealResult({ ...command, appealVersion: 2 }, stale.port),
    ).rejects.toMatchObject({ code: "state_conflict" });

    const missing = transaction(pendingAppeal(), result());
    vi.mocked(missing.operations.findLatestResult).mockResolvedValue(null);
    await expect(
      recalculateAppealResult(command, missing.port),
    ).rejects.toMatchObject({
      code: "state_conflict",
    });
    expect(missing.operations.insertResult).not.toHaveBeenCalled();

    const unsupported = transaction(
      Object.freeze({
        ...pendingAppeal(),
        decision: "ANULAR_ITEM" as const,
      }),
      result(),
    );
    await expect(
      recalculateAppealResult(command, unsupported.port),
    ).rejects.toMatchObject({
      code: "state_conflict",
    });
  });
});
