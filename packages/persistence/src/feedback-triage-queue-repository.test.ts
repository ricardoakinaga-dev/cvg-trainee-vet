import { describe, expect, it } from "vitest";

import { feedbackTickets } from "./schema.js";
import {
  createFeedbackTriageQueueRepository,
  decodeFeedbackTriageQueueCursor,
} from "./feedback-triage-queue-repository.js";

const scopeId = "11111111-1111-4111-8111-111111111111";
const participantId = "22222222-2222-4222-8222-222222222222";
const ticketId = "33333333-3333-4333-8333-333333333333";
const secondTicketId = "44444444-4444-4444-8444-444444444444";
const cursorKey = "cvg-test-feedback-queue-key-v1-32-bytes";

describe("feedback triage queue persistence", () => {
  it("sets scope context before the bounded status query", async () => {
    const calls: string[] = [];
    let listCalls = 0;
    const rows = [
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
      {
        id: secondTicketId,
        participantId,
        scopeId,
        type: "MELHORIA",
        description: "Segundo relato sintético para triagem.",
        createdAt: new Date("2026-08-24T10:00:00.000Z"),
        version: 0,
        status: "NOVO",
        updatedAt: new Date("2026-08-24T10:00:00.000Z"),
      },
    ];
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
          limit: async (requested: number) => {
            calls.push(
              table === feedbackTickets ? "feedback-query" : "unexpected",
            );
            if (table !== feedbackTickets) return [];
            if (requested === 1) return [rows[0]];
            listCalls += 1;
            return listCalls === 1 ? rows : [rows[1]];
          },
        };
        return builder;
      },
      transaction: async (work: (current: unknown) => Promise<unknown>) =>
        work(executor),
    };

    const repository = createFeedbackTriageQueueRepository(executor as never, {
      now: () => new Date("2026-08-24T12:00:00.000Z"),
      cursorSecret: cursorKey,
    });
    const result = await repository.listFeedbackTickets({
      scopeId,
      status: "NOVO",
      limit: 1,
    });

    expect(result).toMatchObject({
      kind: "feedback_triage_queue",
      scopeId,
      filters: { scopeId, status: "NOVO", limit: 1 },
      items: [{ ticketId, status: "NOVO" }],
      hasNext: true,
    });
    expect(result.nextCursor).toEqual(expect.any(String));
    expect(
      decodeFeedbackTriageQueueCursor(result.nextCursor as string, cursorKey),
    ).toMatchObject({ ticketId, scopeId });
    const encodedCursor = result.nextCursor as string;
    const tamperedCursor = `${encodedCursor.slice(0, -1)}${
      encodedCursor.endsWith("A") ? "B" : "A"
    }`;
    expect(() =>
      decodeFeedbackTriageQueueCursor(tamperedCursor, cursorKey),
    ).toThrow();
    expect(() =>
      decodeFeedbackTriageQueueCursor(
        result.nextCursor as string,
        "another-feedback-queue-key-v1-32-bytes",
      ),
    ).toThrow();
    await expect(
      repository.listFeedbackTickets({
        scopeId,
        status: "TRIADO",
        limit: 1,
        cursor: encodedCursor,
      }),
    ).rejects.toThrow("cursor does not belong to this query");

    const secondPage = await repository.listFeedbackTickets({
      scopeId,
      status: "NOVO",
      limit: 1,
      cursor: result.nextCursor as string,
    });
    expect(secondPage).toMatchObject({
      hasNext: false,
      items: [{ ticketId: secondTicketId }],
    });
    expect(calls).toEqual([
      "security-context",
      "feedback-query",
      "security-context",
      "feedback-query",
    ]);

    const resolvedParticipant = await repository.findFeedbackTicketParticipant(
      ticketId,
      scopeId,
    );
    expect(resolvedParticipant).toBe(participantId);
    expect(calls).toEqual([
      "security-context",
      "feedback-query",
      "security-context",
      "feedback-query",
      "security-context",
      "feedback-query",
    ]);
  });
});
