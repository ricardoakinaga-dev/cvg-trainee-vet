import { describe, expect, it } from "vitest";

import { feedbackTickets } from "./schema.js";
import { createFeedbackTriageQueueRepository } from "./feedback-triage-queue-repository.js";

const scopeId = "11111111-1111-4111-8111-111111111111";
const participantId = "22222222-2222-4222-8222-222222222222";
const ticketId = "33333333-3333-4333-8333-333333333333";

describe("feedback triage queue persistence", () => {
  it("sets scope context before the bounded status query", async () => {
    const calls: string[] = [];
    const executor = {
      execute: async () => {
        calls.push("security-context");
        return [];
      },
      select: () => {
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
            calls.push(
              table === feedbackTickets ? "feedback-query" : "unexpected",
            );
            return [
              {
                id: ticketId,
                participantId,
                scopeId,
                type: "BUG_TECNICO",
                description: "Relato sintético para triagem.",
                createdAt: new Date("2026-08-24T11:00:00.000Z"),
                version: 0,
                status: "NOVO",
                updatedAt: new Date("2026-08-24T11:00:00.000Z"),
              },
            ];
          },
        };
        return builder;
      },
      transaction: async (work: (current: unknown) => Promise<unknown>) =>
        work(executor),
    };

    const result = await createFeedbackTriageQueueRepository(
      executor as never,
      {
        now: () => new Date("2026-08-24T12:00:00.000Z"),
      },
    ).listFeedbackTickets({ scopeId, status: "NOVO", limit: 25 });

    expect(result).toMatchObject({
      kind: "feedback_triage_queue",
      scopeId,
      filters: { scopeId, status: "NOVO", limit: 25 },
      items: [{ ticketId, participantId, status: "NOVO" }],
    });
    expect(calls).toEqual(["security-context", "feedback-query"]);
  });
});
