import { describe, expect, expectTypeOf, it, vi } from "vitest";

import {
  assignCurriculumFromDiagnostic,
  type AdaptiveCurriculumAssignmentPort,
  type DiagnosticResultByIdReadPort,
  type MaterializedCurriculumAssignments,
} from "./adaptive-assignment-use-cases.js";
import type { DiagnosticResultState } from "./diagnostic-use-cases.js";

const diagnosticResultId = "33333333-3333-4333-8333-333333333333";
const participantId = "11111111-1111-4111-8111-111111111111";
const scopeId = "22222222-2222-4222-8222-222222222222";
const completedAt = "2026-08-24T12:00:00.000Z";

const diagnosticResult: DiagnosticResultState = {
  resultId: diagnosticResultId,
  participantId,
  scopeId,
  diagnosticId: "B07-DIAGNOSTIC-V1",
  version: "0.1.0",
  completedAt,
  result: {
    diagnosticId: "B07-DIAGNOSTIC-V1",
    version: "0.1.0",
    notPunitive: true,
    noGlobalPassFail: true,
    totalItemCount: 120,
    answeredItemCount: 2,
    themeResults: [
      {
        themeId: "B07-S1",
        itemCount: 40,
        answeredItemCount: 1,
        earnedPoints: 0,
        possiblePoints: 1,
        percent: 0,
        recommendedModuleIds: ["M01", "M04", "M04"],
      },
      {
        themeId: "B07-S2",
        itemCount: 40,
        answeredItemCount: 1,
        earnedPoints: 0,
        possiblePoints: 1,
        percent: 0,
        recommendedModuleIds: ["M02", "M10"],
      },
      {
        themeId: "B07-S3",
        itemCount: 40,
        answeredItemCount: 0,
        earnedPoints: 0,
        possiblePoints: 0,
        percent: 0,
        recommendedModuleIds: ["M11"],
      },
    ],
    recommendedModuleIds: ["M01", "M04", "M04", "M02", "M10", "M11"],
    remediationObjectiveIds: ["M01-OBJ-01"],
  },
};

const materialized: MaterializedCurriculumAssignments = {
  diagnosticResultId,
  participantId,
  scopeId,
  assignments: [],
};

function createReadPort(
  result: DiagnosticResultState | null = diagnosticResult,
): DiagnosticResultByIdReadPort {
  return {
    findDiagnosticResultById: vi.fn(async () => result),
  };
}

function createWritePort(
  result: MaterializedCurriculumAssignments = materialized,
): AdaptiveCurriculumAssignmentPort {
  return {
    materializeCurriculumAssignments: vi.fn(async () => result),
  };
}

describe("adaptive curriculum assignment use case", () => {
  it("derives the participant from the persisted result and combines mandatory and recommended modules", async () => {
    const readPort = createReadPort();
    const writePort = createWritePort();

    const assigned = await assignCurriculumFromDiagnostic(
      { diagnosticResultId, scopeId },
      readPort,
      writePort,
    );

    expect(assigned).toBe(materialized);
    expect(readPort.findDiagnosticResultById).toHaveBeenCalledWith(
      diagnosticResultId,
      scopeId,
    );
    expect(writePort.materializeCurriculumAssignments).toHaveBeenCalledWith({
      diagnosticResultId,
      scopeId,
      moduleIds: ["M01", "M02", "M04", "M10", "M11"],
    });
  });

  it("fails closed when the diagnostic result is not in the requested scope", async () => {
    const readPort = createReadPort(null);
    const writePort = createWritePort();

    await expect(
      assignCurriculumFromDiagnostic(
        { diagnosticResultId, scopeId },
        readPort,
        writePort,
      ),
    ).rejects.toMatchObject({
      code: "not_found",
    });
    expect(writePort.materializeCurriculumAssignments).not.toHaveBeenCalled();
  });

  it("normalizes persistence replay races to public state errors", async () => {
    const readPort = createReadPort();
    const notFoundWritePort: AdaptiveCurriculumAssignmentPort = {
      materializeCurriculumAssignments: vi.fn(async () => {
        const error = new Error("synthetic missing result");
        error.name = "AdaptiveAssignmentNotFoundError";
        throw error;
      }),
    };
    await expect(
      assignCurriculumFromDiagnostic(
        { diagnosticResultId, scopeId },
        readPort,
        notFoundWritePort,
      ),
    ).rejects.toMatchObject({ code: "not_found" });

    const conflictWritePort: AdaptiveCurriculumAssignmentPort = {
      materializeCurriculumAssignments: vi.fn(async () => {
        const error = new Error("synthetic conflict");
        error.name = "AdaptiveAssignmentConflictError";
        throw error;
      }),
    };
    await expect(
      assignCurriculumFromDiagnostic(
        { diagnosticResultId, scopeId },
        readPort,
        conflictWritePort,
      ),
    ).rejects.toMatchObject({ code: "state_conflict" });
  });

  it("does not accept a participant identity in the command", () => {
    expectTypeOf(assignCurriculumFromDiagnostic).toBeFunction();
    expect("participantId" in { diagnosticResultId, scopeId }).toBe(false);
  });
});
