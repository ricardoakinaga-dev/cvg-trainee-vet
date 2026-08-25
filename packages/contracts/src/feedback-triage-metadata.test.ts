import { describe, expect, it } from "vitest";

import {
  feedbackTriageMetadataProjectionSchema,
  feedbackTriageMetadataRequestSchema,
} from "./feedback-triage-metadata.js";

const ids = {
  ticketId: "33333333-3333-4333-8333-333333333333",
  scopeId: "44444444-4444-4444-8444-444444444444",
  assigneeId: "55555555-5555-4555-8555-555555555555",
};

describe("feedback triage metadata contracts", () => {
  it("accepts a strict priority and self-assignment command", () => {
    expect(
      feedbackTriageMetadataRequestSchema.parse({
        expectedVersion: 4,
        priority: "ALTA",
        assignment: "ASSUMIR",
      }),
    ).toEqual({
      expectedVersion: 4,
      priority: "ALTA",
      assignment: "ASSUMIR",
    });
  });

  it("rejects client identity, arbitrary assignees and unsupported priority", () => {
    expect(() =>
      feedbackTriageMetadataRequestSchema.parse({
        expectedVersion: 0,
        priority: "URGENTE",
        assignment: "MANTER",
        participantId: ids.assigneeId,
        assigneeId: ids.assigneeId,
      }),
    ).toThrow();
    expect(() =>
      feedbackTriageMetadataRequestSchema.parse({
        expectedVersion: 0,
        priority: "CRITICA",
        assignment: "MANTER",
      }),
    ).toThrow();
  });

  it("keeps the internal projection allowlisted and validates optional assignment", () => {
    expect(
      feedbackTriageMetadataProjectionSchema.parse({
        ticketId: ids.ticketId,
        scopeId: ids.scopeId,
        status: "TRIADO",
        version: 5,
        priority: "URGENTE",
        assigneeId: ids.assigneeId,
      }),
    ).toMatchObject({ priority: "URGENTE", assigneeId: ids.assigneeId });
    expect(() =>
      feedbackTriageMetadataProjectionSchema.parse({
        ticketId: ids.ticketId,
        scopeId: ids.scopeId,
        status: "TRIADO",
        version: 5,
        priority: "URGENTE",
        participantId: ids.assigneeId,
      }),
    ).toThrow();
  });
});
