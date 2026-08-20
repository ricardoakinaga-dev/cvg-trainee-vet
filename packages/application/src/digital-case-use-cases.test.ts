import { describe, expect, it } from "vitest";

import {
  advanceParticipantDigitalCase,
  getParticipantDigitalCase,
  projectParticipantDigitalCaseRuntime,
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

  it("fails closed for invalid context, unavailable definitions and choices", async () => {
    const repository: DigitalCaseRuntimeRepositoryPort = {
      findDigitalCaseRuntime: async () => null,
      saveDigitalCaseRuntime: async () => {
        throw new Error("must not save");
      },
    };
    const getInvalidCommands = [
      { participantId: " ", scopeId, moduleId: "M24", now },
      { participantId, scopeId: " ", moduleId: "M24", now },
      { participantId, scopeId, moduleId: "M00", now },
      { participantId, scopeId, moduleId: "M24", now: "not-a-date" },
      { participantId, scopeId, moduleId: "M25", now },
    ] as const;
    for (const command of getInvalidCommands) {
      await expect(
        getParticipantDigitalCase(command, repository),
      ).rejects.toMatchObject({ code: "validation_error" });
    }

    const advanceInvalidCommands = [
      { participantId, scopeId: " ", moduleId: "M24" },
      { participantId, scopeId, moduleId: "M00" },
      { participantId, scopeId, moduleId: "M24", now: "invalid" },
      { participantId, scopeId, moduleId: "M24", expectedVersion: 101 },
      { participantId, scopeId, moduleId: "M24", expectedVersion: 1.5 },
      { participantId, scopeId, moduleId: "M24", selectedChoiceIds: [] },
      {
        participantId,
        scopeId,
        moduleId: "M24",
        selectedChoiceIds: Array.from({ length: 9 }, (_, index) =>
          String(index),
        ),
      },
      {
        participantId,
        scopeId,
        moduleId: "M24",
        selectedChoiceIds: [" "] as const,
      },
      {
        participantId,
        scopeId,
        moduleId: "M24",
        selectedChoiceIds: ["a", "a"] as const,
      },
      { participantId, scopeId, moduleId: "M25" },
    ] as const;
    for (const partial of advanceInvalidCommands) {
      await expect(
        advanceParticipantDigitalCase(
          Object.assign(
            {
              participantId,
              scopeId,
              moduleId: "M24",
              selectedChoiceIds: ["a"],
              expectedVersion: 0,
              now,
            },
            partial,
          ),
          repository,
        ),
      ).rejects.toMatchObject({ code: "validation_error" });
    }

    await expect(
      advanceParticipantDigitalCase(
        {
          participantId,
          scopeId,
          moduleId: "M24",
          selectedChoiceIds: ["unknown"],
          expectedVersion: 0,
          now,
        },
        repository,
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
  });

  it("enforces persisted scope, projection boundaries and persistence conflicts", async () => {
    const initial = await getParticipantDigitalCase(
      { participantId, scopeId, moduleId: "M24", now },
      { findDigitalCaseRuntime: async () => null },
    );
    const foreign = {
      ...initial,
      participantId: "other-participant",
    };
    await expect(
      getParticipantDigitalCase(
        { participantId, scopeId, moduleId: "M24", now },
        { findDigitalCaseRuntime: async () => foreign },
      ),
    ).rejects.toMatchObject({ code: "forbidden" });

    expect(() =>
      projectParticipantDigitalCaseRuntime({
        ...initial,
        state: { ...initial.state, caseId: "M24-DIGITAL-CASE-V1" },
      }),
    ).not.toThrow();
    expect(Object.isFrozen(initial)).toBe(true);

    const persistedForeign = {
      ...initial,
      scopeId: "other-scope",
    };
    await expect(
      advanceParticipantDigitalCase(
        {
          participantId,
          scopeId,
          moduleId: "M24",
          selectedChoiceIds: ["a"],
          expectedVersion: 0,
          now,
        },
        {
          findDigitalCaseRuntime: async () => persistedForeign,
          saveDigitalCaseRuntime: async () => persistedForeign,
        },
      ),
    ).rejects.toMatchObject({ code: "forbidden" });

    const persisted = {
      ...initial,
      state: { ...initial.state, currentStage: "CONCLUIDO" },
    } as typeof initial;
    await expect(
      advanceParticipantDigitalCase(
        {
          participantId,
          scopeId,
          moduleId: "M24",
          selectedChoiceIds: ["a"],
          expectedVersion: 0,
          now,
        },
        {
          findDigitalCaseRuntime: async () => persisted,
          saveDigitalCaseRuntime: async () => persisted,
        },
      ),
    ).rejects.toMatchObject({ code: "state_conflict" });

    const applicationError = new Error("application conflict");
    applicationError.name = "ApplicationError";
    await expect(
      advanceParticipantDigitalCase(
        {
          participantId,
          scopeId,
          moduleId: "M24",
          selectedChoiceIds: ["a"],
          expectedVersion: 0,
          now,
        },
        {
          findDigitalCaseRuntime: async () => null,
          saveDigitalCaseRuntime: async () => {
            throw applicationError;
          },
        },
      ),
    ).rejects.toBe(applicationError);

    const versionConflict = new Error("version conflict");
    versionConflict.name = "VersionConflict";
    await expect(
      advanceParticipantDigitalCase(
        {
          participantId,
          scopeId,
          moduleId: "M24",
          selectedChoiceIds: ["a"],
          expectedVersion: 0,
          now,
        },
        {
          findDigitalCaseRuntime: async () => null,
          saveDigitalCaseRuntime: async () => {
            throw versionConflict;
          },
        },
      ),
    ).rejects.toMatchObject({ code: "state_conflict" });

    const unknownFailure = new Error("database unavailable");
    await expect(
      advanceParticipantDigitalCase(
        {
          participantId,
          scopeId,
          moduleId: "M24",
          selectedChoiceIds: ["a"],
          expectedVersion: 0,
          now,
        },
        {
          findDigitalCaseRuntime: async () => null,
          saveDigitalCaseRuntime: async () => {
            throw unknownFailure;
          },
        },
      ),
    ).rejects.toBe(unknownFailure);

    const savedForeign = { ...initial, state: initial.state };
    await expect(
      advanceParticipantDigitalCase(
        {
          participantId,
          scopeId,
          moduleId: "M24",
          selectedChoiceIds: ["a"],
          expectedVersion: 0,
          now,
        },
        {
          findDigitalCaseRuntime: async () => null,
          saveDigitalCaseRuntime: async () => ({
            ...savedForeign,
            participantId: "other-participant",
          }),
        },
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
  });
});
