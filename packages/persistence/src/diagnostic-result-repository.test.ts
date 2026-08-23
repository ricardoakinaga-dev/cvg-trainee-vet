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
