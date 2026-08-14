import { describe, expect, it } from "vitest";

import {
  feedbackTechnicalContextSchema,
  feedbackTicketParticipantCreateRequestSchema,
  participantFeedbackTicketProjectionSchema,
} from "./learning-state.js";

const ids = {
  ticketId: "33333333-3333-4333-8333-333333333333",
};

const context = {
  logicalPage: "/dashboard",
  appVersion: "web-0.1.0",
  occurredAt: "2026-08-14T08:00:00.000Z",
  errorCode: "FEEDBACK_TIMEOUT",
} as const;

describe("feedback technical context contract", () => {
  it("accepts only the minimal diagnostic context on create and projection", () => {
    expect(feedbackTechnicalContextSchema.parse(context)).toEqual(context);
    expect(
      feedbackTicketParticipantCreateRequestSchema.parse({
        type: "BUG_TECNICO",
        description: "Falha sintética de teste.",
        technicalContext: context,
      }),
    ).toMatchObject({ technicalContext: context });
    expect(
      participantFeedbackTicketProjectionSchema.parse({
        ticketId: ids.ticketId,
        type: "BUG_TECNICO",
        description: "Falha sintética de teste.",
        createdAt: "2026-08-14T08:00:00.000Z",
        status: "NOVO",
        version: 0,
        technicalContext: context,
      }),
    ).toMatchObject({ technicalContext: context });
  });

  it("rejects query strings and fields outside the allowlist", () => {
    expect(() =>
      feedbackTechnicalContextSchema.parse({
        ...context,
        logicalPage: "/dashboard?token=secret",
      }),
    ).toThrow();
    expect(() =>
      feedbackTechnicalContextSchema.parse({
        ...context,
        patientId: ids.ticketId,
      }),
    ).toThrow();
  });
});
