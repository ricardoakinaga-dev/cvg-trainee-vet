import { describe, expect, it } from "vitest";

import {
  diagnosticResultRowToState,
  diagnosticResultStateToRow,
  DiagnosticResultMappingError,
} from "./diagnostic-result-repository.js";

const input = {
  participantId: "11111111-1111-4111-8111-111111111111",
  scopeId: "22222222-2222-4222-8222-222222222222",
  completedAt: "2026-08-23T12:00:00.000Z",
  result: {
    diagnosticId: "B07-DIAGNOSTIC-V1" as const,
    version: "0.1.0" as const,
    notPunitive: true as const,
    noGlobalPassFail: true as const,
    totalItemCount: 120,
    answeredItemCount: 0,
    themeResults: [
      {
        themeId: "B07-S1" as const,
        itemCount: 40,
        answeredItemCount: 0,
        earnedPoints: 0,
        possiblePoints: 0,
        percent: 0,
        recommendedModuleIds: ["M01"],
      },
      {
        themeId: "B07-S2" as const,
        itemCount: 40,
        answeredItemCount: 0,
        earnedPoints: 0,
        possiblePoints: 0,
        percent: 0,
        recommendedModuleIds: ["M02"],
      },
      {
        themeId: "B07-S3" as const,
        itemCount: 40,
        answeredItemCount: 0,
        earnedPoints: 0,
        possiblePoints: 0,
        percent: 0,
        recommendedModuleIds: ["M11"],
      },
    ],
    recommendedModuleIds: ["M01", "M02", "M11"],
    remediationObjectiveIds: ["M01-OBJ-01"],
  },
} as const;

describe("diagnostic result persistence mapping", () => {
  it("round-trips an aggregate result and keeps internal objectives out of public mapping", () => {
    const row = diagnosticResultStateToRow(
      input,
      "33333333-3333-4333-8333-333333333333",
    );
    const state = diagnosticResultRowToState({
      ...row,
      diagnosticId: row.diagnosticId,
      diagnosticVersion: row.diagnosticVersion,
    });

    expect(state).toMatchObject({
      resultId: row.id,
      participantId: input.participantId,
      scopeId: input.scopeId,
      diagnosticId: "B07-DIAGNOSTIC-V1",
    });
    expect(state.result.remediationObjectiveIds).toEqual(["M01-OBJ-01"]);
    expect(Object.isFrozen(state.result)).toBe(true);
  });

  it("rejects malformed diagnostic versions", () => {
    expect(() =>
      diagnosticResultRowToState({
        id: "33333333-3333-4333-8333-333333333333",
        participantId: input.participantId,
        scopeId: input.scopeId,
        diagnosticId: "B07-DIAGNOSTIC-V1",
        diagnosticVersion: "9.9.9",
        result: input.result,
        completedAt: new Date(input.completedAt),
      }),
    ).toThrow(DiagnosticResultMappingError);
  });
});

import { createFakeDatabase } from "./test-support/fake-database.js";
import { createDiagnosticResultRepository } from "./diagnostic-result-repository.js";

describe("diagnostic result mapping validation", () => {
  const base = {
    id: "33333333-3333-4333-8333-333333333333",
    participantId: input.participantId,
    scopeId: input.scopeId,
    diagnosticId: "B07-DIAGNOSTIC-V1",
    diagnosticVersion: "0.1.0",
    result: input.result,
    completedAt: new Date(input.completedAt),
  };

  it("rejects rows with empty identities or invalid timestamps", () => {
    expect(() => diagnosticResultRowToState({ ...base, id: "  " })).toThrow(
      DiagnosticResultMappingError,
    );
    expect(() =>
      diagnosticResultRowToState({ ...base, participantId: "" }),
    ).toThrow(DiagnosticResultMappingError);
    expect(() => diagnosticResultRowToState({ ...base, scopeId: "" })).toThrow(
      DiagnosticResultMappingError,
    );
    expect(() =>
      diagnosticResultRowToState({
        ...base,
        completedAt: new Date("invalid"),
      }),
    ).toThrow(DiagnosticResultMappingError);
    expect(() =>
      diagnosticResultStateToRow({ ...input, completedAt: "not-a-date" }, "id"),
    ).toThrow(DiagnosticResultMappingError);
    expect(() => diagnosticResultStateToRow(input, "")).toThrow(
      DiagnosticResultMappingError,
    );
    expect(() =>
      diagnosticResultStateToRow({ ...input, participantId: " " }, "id"),
    ).toThrow(DiagnosticResultMappingError);
    expect(() =>
      diagnosticResultStateToRow({ ...input, scopeId: " " }, "id"),
    ).toThrow(DiagnosticResultMappingError);
  });

  it("rejects invalid stored diagnostic identifiers", () => {
    expect(() =>
      diagnosticResultRowToState({
        ...base,
        diagnosticId: "B07-OTHER",
      }),
    ).toThrow(DiagnosticResultMappingError);
    expect(() =>
      diagnosticResultRowToState({
        ...base,
        diagnosticVersion: "0.2.0",
      }),
    ).toThrow(DiagnosticResultMappingError);
  });

  it("rejects unsafe or malformed result payloads", () => {
    expect(() =>
      diagnosticResultStateToRow(
        {
          ...input,
          result: { ...input.result, notPunitive: false } as never,
        },
        "id",
      ),
    ).toThrow(DiagnosticResultMappingError);
    expect(() =>
      diagnosticResultStateToRow(
        {
          ...input,
          result: { ...input.result, noGlobalPassFail: false } as never,
        },
        "id",
      ),
    ).toThrow(DiagnosticResultMappingError);
    expect(() =>
      diagnosticResultStateToRow(
        {
          ...input,
          result: {
            ...input.result,
            themeResults: input.result.themeResults.slice(0, 2),
          },
        },
        "id",
      ),
    ).toThrow(DiagnosticResultMappingError);
    expect(() =>
      diagnosticResultStateToRow(
        {
          ...input,
          result: {
            ...input.result,
            themeResults: [
              ...input.result.themeResults,
              { ...input.result.themeResults[0]!, themeId: "B07-S9" },
            ],
          } as never,
        },
        "id",
      ),
    ).toThrow(DiagnosticResultMappingError);
  });
});

describe("diagnostic result repository", () => {
  function repository(db: ReturnType<typeof createFakeDatabase>) {
    return createDiagnosticResultRepository(
      db as unknown as Parameters<typeof createDiagnosticResultRepository>[0],
      () => "fixed-id",
    );
  }

  const row = {
    id: "33333333-3333-4333-8333-333333333333",
    participantId: input.participantId,
    scopeId: input.scopeId,
    diagnosticId: "B07-DIAGNOSTIC-V1",
    diagnosticVersion: "0.1.0",
    result: input.result,
    completedAt: new Date(input.completedAt),
  };

  it("finds diagnostic results for a participant", async () => {
    const db = createFakeDatabase({ rows: [[], [row]] });
    const found = await repository(db).findDiagnosticResults(
      input.participantId,
      [" scope-1 ", "scope-1", " ", "scope-2"],
    );
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ resultId: row.id });
  });

  it("returns an empty list when no scopes are provided", async () => {
    const db = createFakeDatabase();
    const found = await repository(db).findDiagnosticResults(
      input.participantId,
      ["  "],
    );
    expect(found).toEqual([]);
  });

  it("rejects an empty participant id", async () => {
    const db = createFakeDatabase();
    await expect(
      repository(db).findDiagnosticResults(" ", ["scope-1"]),
    ).rejects.toThrow(DiagnosticResultMappingError);
  });

  it("finds a diagnostic result by id", async () => {
    const db = createFakeDatabase({ rows: [[], [row]] });
    const found = await repository(db).findDiagnosticResultById(
      row.id,
      input.scopeId,
    );
    expect(found).toMatchObject({ resultId: row.id });
    const empty = createFakeDatabase({ rows: [[], []] });
    expect(
      await repository(empty).findDiagnosticResultById(row.id, input.scopeId),
    ).toBeNull();
  });

  it("saves a diagnostic result and reads it back", async () => {
    const db = createFakeDatabase({ rows: [[], [], [row]] });
    const saved = await repository(db).saveDiagnosticResult(input);
    expect(saved).toMatchObject({ resultId: row.id });
  });

  it("fails when the saved diagnostic result cannot be read back", async () => {
    const db = createFakeDatabase({ rows: [[], []] });
    await expect(repository(db).saveDiagnosticResult(input)).rejects.toThrow(
      "not found",
    );
  });
});
