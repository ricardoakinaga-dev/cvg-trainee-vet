import { describe, expect, it } from "vitest";

import type { AssessmentResultState, AttemptState } from "@cvg/domain";

import {
  correctOpenResponse,
  type CorrectionTransactionalOperations,
  type CorrectionUseCaseDependencies,
} from "./correction-use-cases.js";

const submitted: AttemptState = {
  attemptId: "11111111-1111-4111-8111-111111111111",
  participantId: "22222222-2222-4222-8222-222222222222",
  activityId: "33333333-3333-4333-8333-333333333333",
  status: "SUBMETIDA",
  version: 3,
};

function dependencies(
  initial: AttemptState = submitted,
  approverOverride?: CorrectionTransactionalOperations["approver"],
): CorrectionUseCaseDependencies & {
  readonly attemptStates: AttemptState[];
  readonly resultStates: AssessmentResultState[];
  readonly idempotencies: Map<
    string,
    { readonly fingerprint: string; readonly result: unknown }
  >;
  readonly events: unknown[];
  readonly audits: unknown[];
} {
  const attempts = [initial];
  const results: AssessmentResultState[] = [];
  const idempotencies = new Map<
    string,
    { readonly fingerprint: string; readonly result: unknown }
  >();
  const events: unknown[] = [];
  const audits: unknown[] = [];
  const operations: CorrectionTransactionalOperations = {
    attempts: {
      findById: async (attemptId) =>
        attempts.find((attempt) => attempt.attemptId === attemptId) ?? null,
      update: async (attempt) => {
        const index = attempts.findIndex(
          (stored) => stored.attemptId === attempt.attemptId,
        );
        attempts.splice(index, 1, attempt);
      },
    },
    results: {
      findLatest: async (attemptId) =>
        results
          .filter((result) => result.attemptId === attemptId)
          .sort((left, right) => right.version - left.version)[0] ?? null,
      insert: async (result) => {
        results.push(result);
      },
    },
    idempotency: {
      find: async (key) => (idempotencies.get(key) as never) ?? null,
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
    approver: approverOverride ?? {
      findById: async (accountId) => ({
        accountId,
        accountStatus: "ACTIVE",
        roles: ["CLINICAL_APPROVER"],
        scopes: ["55555555-5555-4555-8555-555555555555"],
      }),
    },
  };

  let sequence = 0;
  return {
    ...operations,
    attemptStates: attempts,
    resultStates: results,
    idempotencies,
    events,
    audits,
    idFactory: () => `generated-${++sequence}`,
    transaction: { run: async (work) => work(operations) },
  };
}

const command = {
  principalId: "44444444-4444-4444-8444-444444444444",
  accountStatus: "ACTIVE" as const,
  roles: ["CLINICAL_APPROVER"] as const,
  scopes: ["55555555-5555-4555-8555-555555555555"],
  approvedClinicalApproverId: "44444444-4444-4444-8444-444444444444",
  scopeId: "55555555-5555-4555-8555-555555555555",
  attemptId: submitted.attemptId,
  idempotencyKey: "correct-attempt-2026-08-09",
  correlationId: "66666666-6666-4666-8666-666666666666",
  score: 82,
  outcome: "APROVADO" as const,
  feedback: "Boa justificativa; revise a priorização.",
  ruleVersion: "rubrica-v1",
};

describe("official correction application command", () => {
  it("corrects a submitted attempt, emits metadata-only event, and replays idempotently", async () => {
    const deps = dependencies();

    const corrected = await correctOpenResponse(command, deps);
    const replay = await correctOpenResponse(command, deps);

    expect(corrected.attempt).toMatchObject({
      status: "CORRIGIDA_HUMANAMENTE",
      version: 5,
    });
    expect(corrected.result).toMatchObject({
      version: 1,
      score: 82,
      outcome: "APROVADO",
    });
    expect(replay).toEqual(corrected);
    expect(deps.resultStates).toHaveLength(1);
    expect(deps.events).toHaveLength(1);
    expect(JSON.stringify(deps.events)).not.toContain(command.feedback);
    expect(deps.audits).toHaveLength(1);
  });

  it("denies a non-approved actor, cross-scope command, and invalid state", async () => {
    await expect(
      correctOpenResponse(
        { ...command, approvedClinicalApproverId: "other" },
        dependencies(),
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      correctOpenResponse(
        { ...command, scopeId: "other", scopes: [...command.scopes] },
        dependencies(),
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      correctOpenResponse(
        {
          ...command,
          attemptId: submitted.attemptId,
        },
        dependencies({ ...submitted, status: "CORRIGIDA_HUMANAMENTE" }),
      ),
    ).rejects.toMatchObject({ code: "state_conflict" });
  });

  it("rejects idempotency reuse with a different correction", async () => {
    const deps = dependencies();
    await correctOpenResponse(command, deps);

    await expect(
      correctOpenResponse({ ...command, score: 20 }, deps),
    ).rejects.toMatchObject({ code: "idempotency_conflict" });
  });

  it("revalidates the current corrector identity instead of the static approver id", async () => {
    const suspended = dependencies(submitted, {
      findById: async () => ({
        accountId: command.principalId,
        accountStatus: "SUSPENDED",
        roles: ["CLINICAL_APPROVER"],
        scopes: command.scopes,
      }),
    });

    await expect(correctOpenResponse(command, suspended)).rejects.toMatchObject(
      { code: "forbidden" },
    );
    expect(
      suspended.attemptStates.some((a) => a.status === "CORRIGIDA_HUMANAMENTE"),
    ).toBe(false);
  });
});
