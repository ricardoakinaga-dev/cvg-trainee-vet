import { describe, expect, it } from "vitest";

import {
  advanceParticipantDigitalCase,
  getParticipantDigitalCase,
  type DigitalCaseRuntimeRepositoryPort,
} from "./digital-case-use-cases.js";

const participantId = "11111111-1111-4111-8111-111111111111";
const scopeId = "22222222-2222-4222-8222-222222222222";
const now = "2026-08-14T09:00:00.000Z";

describe("digital case application flow", () => {
  it("creates, advances, and persists a participant case with an optimistic version", async () => {
    let stored: Awaited<
      ReturnType<DigitalCaseRuntimeRepositoryPort["findDigitalCaseRuntime"]>
    > = null;
    const repository: DigitalCaseRuntimeRepositoryPort = {
      findDigitalCaseRuntime: async () => stored,
      saveDigitalCaseRuntime: async (input) => {
        expect(input.expectedVersion).toBe(stored?.state.version ?? 0);
        stored = Object.freeze({
          participantId: input.participantId,
          scopeId: input.scopeId,
          moduleId: input.moduleId,
          state: input.state,
        });
        return stored;
      },
    };

    const first = await advanceParticipantDigitalCase(
      {
        participantId,
        scopeId,
        moduleId: "M24",
        selectedChoiceIds: ["a"],
        expectedVersion: 0,
        now,
      },
      repository,
    );

    expect(first.state).toMatchObject({
      caseId: "M24-DIGITAL-CASE-V1",
      version: 1,
      currentStage: 2,
      state: { path: "ESTABILIZACAO" },
    });
    expect(first.state.revealedExamSeriesIds).toContain("RADIOGRAFIA-SERIES");

    await expect(
      advanceParticipantDigitalCase(
        {
          participantId,
          scopeId,
          moduleId: "M24",
          selectedChoiceIds: ["b"],
          expectedVersion: 0,
          now,
        },
        repository,
      ),
    ).rejects.toMatchObject({ code: "state_conflict" });
  });

  it("returns an initial non-persisted state for a participant in the right scope", async () => {
    const result = await getParticipantDigitalCase(
      { participantId, scopeId, moduleId: "M24", now },
      { findDigitalCaseRuntime: async () => null },
    );

    expect(result).toMatchObject({
      participantId,
      scopeId,
      moduleId: "M24",
      state: { caseId: "M24-DIGITAL-CASE-V1", version: 0, currentStage: 1 },
    });
  });

  it("rejects malformed versions and empty participant context", async () => {
    const repository: DigitalCaseRuntimeRepositoryPort = {
      findDigitalCaseRuntime: async () => null,
      saveDigitalCaseRuntime: async () => {
        throw new Error("must not save");
      },
    };

    await expect(
      advanceParticipantDigitalCase(
        {
          participantId: "",
          scopeId,
          moduleId: "M24",
          selectedChoiceIds: ["a"],
          expectedVersion: 0,
          now,
        },
        repository,
      ),
    ).rejects.toMatchObject({ code: "validation_error" });

    await expect(
      advanceParticipantDigitalCase(
        {
          participantId,
          scopeId,
          moduleId: "M24",
          selectedChoiceIds: ["a"],
          expectedVersion: -1,
          now,
        },
        repository,
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
  });
});
