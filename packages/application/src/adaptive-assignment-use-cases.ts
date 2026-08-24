import { curriculumV3, type CurriculumDiagnosticResult } from "@cvg/curriculum";

import { ApplicationError } from "./errors.js";
import type { DiagnosticResultState } from "./diagnostic-use-cases.js";
import type { ScopedLearningAssignment } from "./learning-state-use-cases.js";

/**
 * The first pilot wave keeps the common diagnostic/clinical, emergency and
 * inpatient foundations assigned. The diagnostic can add reinforcement
 * modules, but it can never remove this allowlist.
 */
export const pilotMandatoryModuleIds = Object.freeze([
  "M01",
  "M02",
  "M11",
] as const);

export type AssignCurriculumFromDiagnosticCommand = Readonly<{
  readonly diagnosticResultId: string;
  readonly scopeId: string;
}>;

export type MaterializeCurriculumAssignmentsInput = Readonly<{
  readonly diagnosticResultId: string;
  readonly scopeId: string;
  readonly moduleIds: readonly string[];
}>;

export type MaterializedCurriculumAssignments = Readonly<{
  readonly diagnosticResultId: string;
  readonly participantId: string;
  readonly scopeId: string;
  readonly assignments: readonly ScopedLearningAssignment[];
}>;

export interface DiagnosticResultByIdReadPort {
  readonly findDiagnosticResultById: (
    diagnosticResultId: string,
    scopeId: string,
  ) => Promise<DiagnosticResultState | null>;
}

export interface AdaptiveCurriculumAssignmentPort {
  readonly materializeCurriculumAssignments: (
    input: MaterializeCurriculumAssignmentsInput,
  ) => Promise<MaterializedCurriculumAssignments>;
}

const curriculumModuleOrder = new Map(
  curriculumV3.modules.map((module, index) => [module.id, index]),
);

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new ApplicationError("validation_error", `${field} is required`);
  }
}

function assertDiagnosticResultSafety(result: DiagnosticResultState): void {
  if (
    result.diagnosticId !== "B07-DIAGNOSTIC-V1" ||
    result.version !== "0.1.0" ||
    result.result.notPunitive !== true ||
    result.result.noGlobalPassFail !== true
  ) {
    throw new ApplicationError(
      "validation_error",
      "diagnostic result is not eligible for curriculum assignment",
    );
  }
}

function orderedAssignedModuleIds(
  result: CurriculumDiagnosticResult,
): readonly string[] {
  const requested = new Set([
    ...pilotMandatoryModuleIds,
    ...result.recommendedModuleIds,
  ]);
  for (const moduleId of requested) {
    if (!curriculumModuleOrder.has(moduleId)) {
      throw new ApplicationError(
        "validation_error",
        "diagnostic result contains an unsupported module",
      );
    }
  }
  return Object.freeze(
    [...requested].sort(
      (left, right) =>
        curriculumModuleOrder.get(left)! - curriculumModuleOrder.get(right)!,
    ),
  );
}

export async function assignCurriculumFromDiagnostic(
  command: AssignCurriculumFromDiagnosticCommand,
  diagnosticResults: DiagnosticResultByIdReadPort,
  assignments: AdaptiveCurriculumAssignmentPort,
): Promise<MaterializedCurriculumAssignments> {
  assertNonEmpty(command.diagnosticResultId, "diagnosticResultId");
  assertNonEmpty(command.scopeId, "scopeId");

  const result = await diagnosticResults.findDiagnosticResultById(
    command.diagnosticResultId,
    command.scopeId,
  );
  if (result === null) {
    throw new ApplicationError(
      "not_found",
      "Diagnostic result not found in the requested scope",
    );
  }
  if (result.scopeId !== command.scopeId) {
    throw new ApplicationError(
      "forbidden",
      "Diagnostic result is outside the requested scope",
    );
  }
  assertDiagnosticResultSafety(result);

  try {
    return await assignments.materializeCurriculumAssignments({
      diagnosticResultId: result.resultId,
      scopeId: result.scopeId,
      moduleIds: orderedAssignedModuleIds(result.result),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AdaptiveAssignmentNotFoundError"
    ) {
      throw new ApplicationError(
        "not_found",
        "Diagnostic result not found in the requested scope",
      );
    }
    if (
      error instanceof Error &&
      error.name === "AdaptiveAssignmentConflictError"
    ) {
      throw new ApplicationError(
        "state_conflict",
        "Curriculum assignment changed",
      );
    }
    throw error;
  }
}
