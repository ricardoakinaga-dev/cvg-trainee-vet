import { describe, expect, it } from "vitest";

import { appeals, assessmentResults, attempts } from "./schema.js";
import { createAppealDecisionImpactRepository } from "./appeal-decision-impact-repository.js";

const scopeId = "11111111-1111-4111-8111-111111111111";
const appealId = "22222222-2222-4222-8222-222222222222";
const participantId = "33333333-3333-4333-8333-333333333333";
const attemptId = "44444444-4444-4444-8444-444444444444";
const itemId = "55555555-5555-4555-8555-555555555555";

const appealRow = {
  id: appealId,
  participantId,
  scopeId,
  attemptId,
  itemId,
  justification: "Justificativa sintética.",
  createdAt: new Date("2026-08-24T12:00:00.000Z"),
  dueAt: new Date("2026-08-30T12:00:00.000Z"),
  version: 1,
  status: "EM_REVISAO",
  reviewerId: "66666666-6666-4666-8666-666666666666",
  decision: null,
  decisionRationale: null,
  decisionAt: null,
  decisionCorrelationId: null,
  updatedAt: new Date("2026-08-24T12:00:00.000Z"),
};

const attemptRow = {
  id: attemptId,
  participantId,
  activityId: "77777777-7777-4777-8777-777777777777",
  status: "CORRIGIDA_AUTOMATICAMENTE",
  version: 3,
  submittedAt: new Date("2026-08-24T11:00:00.000Z"),
};

describe("appeal decision impact persistence", () => {
  it("sets review context and reads only target/result metadata", async () => {
    const calls: string[] = [];
    const executor = {
      execute: async () => {
        calls.push(
          calls.length === 0 ? "transaction-isolation" : "reviewer-context",
        );
        return [];
      },
      select: () => {
        let table: object | undefined;
        const builder = {
          from(source: object) {
            table = source;
            return builder;
          },
          innerJoin() {
            return builder;
          },
          where() {
            return builder;
          },
          orderBy() {
            return builder;
          },
          limit: async () => {
            if (table === appeals) {
              calls.push("appeal-query");
              return [appealRow];
            }
            if (table === attempts) {
              calls.push("attempt-query");
              return [attemptRow];
            }
            if (table === assessmentResults) {
              calls.push("result-query");
              return [
                {
                  resultId: "88888888-8888-4888-8888-888888888888",
                  attemptId,
                  version: 2,
                },
              ];
            }
            throw new Error("unexpected table");
          },
        };
        return builder;
      },
      transaction: async (work: (current: unknown) => Promise<unknown>) =>
        work(executor),
    };

    const result = await createAppealDecisionImpactRepository(
      executor as never,
    ).getAppealDecisionImpact(appealId, [scopeId], "ANULAR_ITEM");

    expect(result).toMatchObject({
      appealExists: true,
      scopeId,
      appeal: { appealId, attemptId, itemId },
      attempt: { attemptId, participantId, version: 3 },
      latestResult: { attemptId, version: 2 },
    });
    expect(result.latestResult).not.toHaveProperty("score");
    expect(calls).toEqual([
      "transaction-isolation",
      "reviewer-context",
      "appeal-query",
      "attempt-query",
      "result-query",
    ]);
  });

  it("returns no data for a cross-scope appeal and rejects unsafe queries", async () => {
    const executor = {
      execute: async () => [],
      select: () => {
        const builder = {
          from: () => builder,
          where: () => builder,
          orderBy: () => builder,
          limit: async () => [],
        };
        return builder;
      },
      transaction: async (work: (current: unknown) => Promise<unknown>) =>
        work(executor),
    };
    const repository = createAppealDecisionImpactRepository(executor as never);

    await expect(
      repository.getAppealDecisionImpact(appealId, [scopeId], "ANULAR_ITEM"),
    ).resolves.toMatchObject({ appealExists: false, latestResult: null });
    await expect(
      repository.getAppealDecisionImpact(" ", [scopeId], "ANULAR_ITEM"),
    ).rejects.toThrow("appealId");
    await expect(
      repository.getAppealDecisionImpact(appealId, [], "ANULAR_ITEM"),
    ).rejects.toThrow("scopeIds");
    await expect(
      repository.getAppealDecisionImpact(
        appealId,
        [scopeId],
        "MANTER_RESULTADO" as never,
      ),
    ).rejects.toThrow("decision");
  });
});
