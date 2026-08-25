import { describe, expect, it, vi } from "vitest";

import { ApplicationError } from "./errors.js";
import {
  FeedbackTriageMetadataConflictError,
  updateFeedbackTriageMetadata,
  type FeedbackTriageMetadataReadPort,
} from "./feedback-triage-metadata-use-cases.js";

const ids = {
  principalId: "11111111-1111-4111-8111-111111111111",
  scopeId: "22222222-2222-4222-8222-222222222222",
  ticketId: "33333333-3333-4333-8333-333333333333",
};

const command = {
  principalId: ids.principalId,
  accountStatus: "ACTIVE" as const,
  roles: ["MODERATOR"] as const,
  scopes: [ids.scopeId],
  ticketId: ids.ticketId,
  expectedVersion: 2,
  priority: "ALTA" as const,
  assignment: "ASSUMIR" as const,
  requestId: "44444444-4444-4444-8444-444444444444",
  correlationId: "55555555-5555-4555-8555-555555555555",
};

function port(
  result: Awaited<ReturnType<FeedbackTriageMetadataReadPort["update"]>>,
): FeedbackTriageMetadataReadPort {
  return { update: vi.fn(async () => result) };
}

describe("feedback triage metadata use case", () => {
  it("derives the assignee from the authenticated principal", async () => {
    const repository = port({
      ticketId: ids.ticketId,
      scopeId: ids.scopeId,
      status: "TRIADO",
      version: 3,
      priority: "ALTA",
      assigneeId: ids.principalId,
    });

    const result = await updateFeedbackTriageMetadata(command, repository);

    expect(result.assigneeId).toBe(ids.principalId);
    expect(repository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        ticketId: ids.ticketId,
        scopeIds: [ids.scopeId],
        expectedVersion: 2,
        actorId: ids.principalId,
        assignment: "ASSUMIR",
      }),
    );
  });

  it("allows release but denies a participant before persistence", async () => {
    const repository = port(null);
    await expect(
      updateFeedbackTriageMetadata(
        { ...command, roles: ["PARTICIPANT"] as const },
        repository,
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("maps missing tickets and optimistic conflicts without leaking persistence detail", async () => {
    await expect(
      updateFeedbackTriageMetadata(command, port(null)),
    ).rejects.toMatchObject({ code: "not_found" });
    const conflicting = {
      update: vi.fn(async () => {
        throw new FeedbackTriageMetadataConflictError("stale");
      }),
    } satisfies FeedbackTriageMetadataReadPort;
    await expect(
      updateFeedbackTriageMetadata(command, conflicting),
    ).rejects.toMatchObject({ code: "state_conflict" });
    await expect(
      updateFeedbackTriageMetadata(
        { ...command, scopes: [ids.ticketId] },
        port(null),
      ),
    ).rejects.toBeInstanceOf(ApplicationError);
  });
});
