import { describe, expect, it } from "vitest";
import type { DatabaseExecutor } from "./adaptive-assignment-repository.js";
import { PersistenceMappingError } from "./persistence-errors.js";
import { readBoundAssignmentIds } from "./module-obligation-binding-reader.js";
import { createFakeDatabase } from "./test-support/fake-database.js";

const participantId = "11111111-1111-4111-8111-111111111111";
const scopeId = "22222222-2222-4222-8222-222222222222";
const otherScopeId = "22222222-2222-4222-8222-222222222223";
const otherParticipantId = "11111111-1111-4111-8111-111111111112";
const assignmentId = "33333333-3333-4333-8333-333333333333";

function row(overrides: Record<string, unknown> = {}) {
  return {
    assignmentId,
    participantId,
    scopeId,
    moduleId: "M02",
    manifestId: "33333333-3333-4333-8333-333333333334",
    manifestVersion: 1,
    blueprintVersionId: "33333333-3333-4333-8333-333333333335",
    blueprintVersion: 1,
    boundAt: new Date("2026-09-30T12:00:00.000Z"),
    assignmentVersion: 4,
    ...overrides,
  };
}

function fake(
  options?: Parameters<typeof createFakeDatabase>[0],
): DatabaseExecutor {
  return createFakeDatabase(options) as unknown as DatabaseExecutor;
}

describe("module obligation binding reader", () => {
  it("returns only the bound assignment identity as a frozen list", async () => {
    const db = fake({ rows: [[row()]] });

    const ids = await readBoundAssignmentIds(db, { participantId, scopeId });

    expect(ids).toEqual([assignmentId]);
    expect(Object.isFrozen(ids)).toBe(true);
  });

  it("never projects manifest, approval or binding internals", async () => {
    const db = fake({ rows: [[row()]] });

    const ids = await readBoundAssignmentIds(db, { participantId, scopeId });

    expect(typeof ids[0]).toBe("string");
    expect(ids).toEqual([assignmentId]);
  });

  it("rejects a binding row addressed to a foreign participant or scope", async () => {
    const foreignScope = fake({ rows: [[row({ scopeId: otherScopeId })]] });
    const foreignParticipant = fake({
      rows: [[row({ participantId: otherParticipantId })]],
    });

    await expect(
      readBoundAssignmentIds(foreignScope, { participantId, scopeId }),
    ).rejects.toThrow(PersistenceMappingError);
    await expect(
      readBoundAssignmentIds(foreignParticipant, { participantId, scopeId }),
    ).rejects.toThrow(PersistenceMappingError);
  });

  it("rejects a binding row without an assignment identity", async () => {
    const missing = fake({ rows: [[row({ assignmentId: "" })]] });

    await expect(
      readBoundAssignmentIds(missing, { participantId, scopeId }),
    ).rejects.toThrow(PersistenceMappingError);
  });

  it("returns an empty frozen list when the assignment has no binding", async () => {
    const db = fake({ rows: [[]] });

    const ids = await readBoundAssignmentIds(db, { participantId, scopeId });

    expect(ids).toEqual([]);
    expect(Object.isFrozen(ids)).toBe(true);
  });

  it("requires a participant and a scope context", async () => {
    const db = fake();

    await expect(
      readBoundAssignmentIds(db, { participantId: "", scopeId }),
    ).rejects.toThrow(PersistenceMappingError);
    await expect(
      readBoundAssignmentIds(db, { participantId, scopeId: " " }),
    ).rejects.toThrow(PersistenceMappingError);
  });
});
