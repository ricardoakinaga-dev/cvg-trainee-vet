import { describe, expect, it } from "vitest";

import { feedbackTickets } from "./schema.js";
import { createFeedbackTicketReadRepository } from "./feedback-ticket-read-repository.js";

const participantId = "11111111-1111-4111-8111-111111111111";
const scopeId = "22222222-2222-4222-8222-222222222222";
const ticketId = "33333333-3333-4333-8333-333333333333";

describe("feedback ticket read persistence", () => {
  it("sets participant and scope context before the bounded query", async () => {
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
                type: "MELHORIA",
                description: "Relato sintético.",
                createdAt: new Date("2026-08-24T12:00:00.000Z"),
                version: 0,
                status: "NOVO",
                updatedAt: new Date("2026-08-24T12:00:00.000Z"),
              },
            ];
          },
        };
        return builder;
      },
      transaction: async (work: (current: unknown) => Promise<unknown>) =>
        work(executor),
    };

    const result = await createFeedbackTicketReadRepository(
      executor as never,
    ).listFeedbackTickets(participantId, [scopeId]);

    expect(result).toMatchObject([
      { scopeId, state: { ticketId, participantId, type: "MELHORIA" } },
    ]);
    expect(calls).toEqual(["security-context", "feedback-query"]);
  });
});
