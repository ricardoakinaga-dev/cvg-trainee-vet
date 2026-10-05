import { describe, expect, it } from "vitest";
import type { DatabaseExecutor } from "./adaptive-assignment-repository.js";
import { PersistenceMappingError } from "./persistence-errors.js";
import { readModuleCompletionReceipts } from "./module-obligation-receipt-reader.js";
import { createFakeDatabase } from "./test-support/fake-database.js";

const participantId = "11111111-1111-4111-8111-111111111111";
const scopeId = "22222222-2222-4222-8222-222222222222";
const otherScopeId = "22222222-2222-4222-8222-222222222223";
const otherParticipantId = "11111111-1111-4111-8111-111111111112";
const assignmentId = "33333333-3333-4333-8333-333333333333";
const completedAt = new Date("2026-09-30T12:00:00.000Z");

function row(overrides: Record<string, unknown> = {}) {
  return {
    assignmentId,
    participantId,
    scopeId,
    moduleId: "M02",
    completedAt,
    completedAssignmentVersion: 4,
    ...overrides,
  };
}

function fake(
  options?: Parameters<typeof createFakeDatabase>[0],
): DatabaseExecutor {
  return createFakeDatabase(options) as unknown as DatabaseExecutor;
}

describe("module completion receipt reader", () => {
  it("returns minimal participant-scoped facts as frozen ISO records", async () => {
    const db = fake({ rows: [[row()]] });

    const facts = await readModuleCompletionReceipts(db, {
      participantId,
      scopeId,
    });

    expect(facts).toEqual([
      {
        participantId,
        scopeId,
        moduleId: "M02",
        assignmentId,
        completedAt: "2026-09-30T12:00:00.000Z",
        completedAssignmentVersion: 4,
      },
    ]);
    expect(Object.isFrozen(facts)).toBe(true);
    expect(Object.isFrozen(facts[0])).toBe(true);
  });

  it("never projects approval, audit, request, hash or witness internals", async () => {
    const db = fake({
      rows: [
        [
          row({
            auditEntryId: "33333333-3333-4333-8333-333333333334",
            requestId: "33333333-3333-4333-8333-333333333335",
            correlationId: "33333333-3333-4333-8333-333333333336",
            manifestId: "33333333-3333-4333-8333-333333333337",
            witnesses: [{ activityId: "33333333-3333-4333-8333-333333333338" }],
          }),
        ],
      ],
    });

    const facts = await readModuleCompletionReceipts(db, {
      participantId,
      scopeId,
    });

    expect(Object.keys(facts[0] ?? {}).sort()).toEqual([
      "assignmentId",
      "completedAssignmentVersion",
      "completedAt",
      "moduleId",
      "participantId",
      "scopeId",
    ]);
  });

  it("rejects a receipt row addressed to a foreign participant or scope", async () => {
    const foreignScope = fake({
      rows: [[row({ scopeId: otherScopeId })]],
    });
    const foreignParticipant = fake({
      rows: [[row({ participantId: otherParticipantId })]],
    });

    await expect(
      readModuleCompletionReceipts(foreignScope, { participantId, scopeId }),
    ).rejects.toThrow(PersistenceMappingError);
    await expect(
      readModuleCompletionReceipts(foreignParticipant, {
        participantId,
        scopeId,
      }),
    ).rejects.toThrow(PersistenceMappingError);
  });

  it("rejects a receipt row with an unknown module or an invalid timestamp", async () => {
    const wrongModule = fake({
      rows: [[row({ moduleId: "M99" })]],
    });
    const wrongDate = fake({
      rows: [[row({ completedAt: "not-a-date" })]],
    });

    await expect(
      readModuleCompletionReceipts(wrongModule, { participantId, scopeId }),
    ).rejects.toThrow(PersistenceMappingError);
    await expect(
      readModuleCompletionReceipts(wrongDate, { participantId, scopeId }),
    ).rejects.toThrow(PersistenceMappingError);
  });

  it("returns an empty frozen list when the participant has no receipt", async () => {
    const db = fake({ rows: [[]] });

    const facts = await readModuleCompletionReceipts(db, {
      participantId,
      scopeId,
    });

    expect(facts).toEqual([]);
    expect(Object.isFrozen(facts)).toBe(true);
  });

  it("requires a participant and a scope context", async () => {
    const db = fake();

    await expect(
      readModuleCompletionReceipts(db, { participantId: "", scopeId }),
    ).rejects.toThrow(PersistenceMappingError);
    await expect(
      readModuleCompletionReceipts(db, { participantId, scopeId: " " }),
    ).rejects.toThrow(PersistenceMappingError);
  });
});
