import { describe, expect, it } from "vitest";
import {
  createAppeal,
  createAssessmentResult,
  transitionAppeal,
} from "@cvg/domain";

import { createAppealRecalculationRepository } from "./appeal-recalculation-repository.js";
import { appealReviewHistory, appeals, assessmentResults } from "./schema.js";

const scopeId = "11111111-1111-4111-8111-111111111111";
const participantId = "22222222-2222-4222-8222-222222222222";
const appealId = "33333333-3333-4333-8333-333333333333";
const attemptId = "44444444-4444-4444-8444-444444444444";
const itemId = "55555555-5555-4555-8555-555555555555";
const reviewerId = "66666666-6666-4666-8666-666666666666";
const correlationId = "77777777-7777-4777-8777-777777777777";
const now = "2026-08-24T12:00:00.000Z";

function pendingAppeal() {
  const opened = createAppeal({
    appealId,
    participantId,
    attemptId,
    itemId,
    justification: "Justificativa sintética.",
    createdAt: now,
  });
  const assigned = transitionAppeal(opened, {
    type: "ATRIBUIR_REVISOR",
    reviewerId,
  });
  const decided = transitionAppeal(assigned, {
    type: "DECIDIR",
    decision: "MANTER_RESULTADO",
    rationale: "A decisão sintética mantém o resultado.",
    decidedAt: now,
    correlationId,
  });
  return transitionAppeal(decided, { type: "SOLICITAR_RECALCULO" });
}

function appealRow(status: string, version: number) {
  const state = pendingAppeal();
  return {
    id: state.appealId,
    participantId: state.participantId,
    scopeId,
    attemptId: state.attemptId,
    itemId: state.itemId,
    justification: state.justification,
    createdAt: new Date(state.createdAt),
    dueAt: new Date(state.dueAt),
    version,
    status,
    reviewerId,
    decision: "MANTER_RESULTADO",
    decisionRationale: state.decisionRationale ?? null,
    decisionAt: new Date(state.decisionAt ?? now),
    decisionCorrelationId: state.decisionCorrelationId ?? correlationId,
    updatedAt: new Date(now),
  };
}

describe("appeal recalculation persistence", () => {
  it("binds the transaction to reviewer scope, inserts a result and appends history", async () => {
    let currentStatus = "RECALCULO_PENDENTE";
    let currentVersion = 3;
    let updateValues: Record<string, unknown> | undefined;
    const inserted: Array<{ table: object; values: unknown }> = [];
    const executor = {
      execute: async () => [],
      select: (selection: unknown) => {
        let table: object | undefined;
        const builder = {
          from(source: object) {
            table = source;
            return builder;
          },
          where() {
            return builder;
          },
          orderBy() {
            return builder;
          },
          limit: async () => {
            if (table === appeals)
              return [appealRow(currentStatus, currentVersion)];
            if (table === assessmentResults) {
              return [
                {
                  id: "88888888-8888-4888-8888-888888888888",
                  attemptId,
                  version: 1,
                  kind: "HUMANA",
                  score: 82,
                  outcome: "APROVADO",
                  feedback: "Feedback sintético.",
                  ruleVersion: "rubrica-sintetica-v1",
                  correctedBy: reviewerId,
                  correctedAt: new Date(now),
                },
              ];
            }
            return [];
          },
        };
        void selection;
        return builder;
      },
      insert: (table: object) => ({
        values: async (values: unknown) => {
          inserted.push({ table, values });
        },
      }),
      update: () => {
        const builder = {
          set(values: Record<string, unknown>) {
            updateValues = values;
            currentStatus = String(values.status);
            currentVersion = Number(values.version);
            return builder;
          },
          where() {
            return builder;
          },
          returning: async () => [{ id: appealId }],
        };
        return builder;
      },
      transaction: async (work: (value: unknown) => Promise<unknown>) =>
        work(executor),
    };
    const repository = createAppealRecalculationRepository(executor as never);
    const closed = transitionAppeal(pendingAppeal(), {
      type: "CONCLUIR_RECALCULO",
    });
    const result = createAssessmentResult({
      resultId: "99999999-9999-4999-8999-999999999999",
      attemptId,
      version: 2,
      kind: "AUTOMATICA",
      score: 82,
      outcome: "APROVADO",
      feedback: "Feedback sintético.",
      ruleVersion: "appeal-recalculation-v1",
      correctedBy: reviewerId,
      correctedAt: now,
    });

    const saved = await repository.run(async (operations) => {
      await operations.findAppeal({ scopeId }, appealId);
      await operations.findLatestResult(attemptId);
      await operations.insertResult(result);
      return operations.saveAppeal({ scopeId }, closed);
    });

    expect(saved).toMatchObject({ status: "ENCERRADA", version: 4 });
    expect(updateValues).toMatchObject({ status: "ENCERRADA", version: 4 });
    expect(updateValues).not.toHaveProperty("participantId");
    expect(inserted.map(({ table }) => table)).toEqual([
      assessmentResults,
      appealReviewHistory,
    ]);
  });
});
