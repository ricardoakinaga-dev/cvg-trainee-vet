import {
  evaluateDiagnosticAttempt,
  type CurriculumDiagnosticResult,
  type DiagnosticSessionId,
  type ModuleAnswer,
} from "@cvg/curriculum";

import { ApplicationError } from "./errors.js";

export type DiagnosticResultState = Readonly<{
  readonly resultId: string;
  readonly participantId: string;
  readonly scopeId: string;
  readonly diagnosticId: "B07-DIAGNOSTIC-V1";
  readonly version: "0.1.0";
  readonly completedAt: string;
  readonly result: CurriculumDiagnosticResult;
}>;

export type DiagnosticResultWriteInput = Readonly<{
  readonly participantId: string;
  readonly scopeId: string;
  readonly completedAt: string;
  readonly result: CurriculumDiagnosticResult;
}>;

export interface DiagnosticResultWritePort {
  readonly saveDiagnosticResult: (
    input: DiagnosticResultWriteInput,
  ) => Promise<DiagnosticResultState>;
}

export interface DiagnosticResultReadPort {
  readonly findDiagnosticResults: (
    participantId: string,
    scopeIds: readonly string[],
  ) => Promise<readonly DiagnosticResultState[]>;
}

export type EvaluateDiagnosticDraftCommand = Readonly<{
  readonly participantId: string;
  readonly scopeId: string;
  readonly answers: readonly ModuleAnswer[];
  readonly completedAt: string;
}>;

export type ParticipantDiagnosticProfileItem = Readonly<{
  readonly themeId: DiagnosticSessionId;
  readonly themeLabel: string;
  readonly status: "SEM_EVIDENCIA_DIGITAL" | "BASELINE_REGISTRADA";
  readonly scorePercent: number | null;
  readonly answeredItemCount: number;
  readonly itemCount: number;
  readonly recommendedModuleIds: readonly string[];
  readonly lastEvaluatedAt?: string;
  readonly evidence: "DIAGNOSTICO_FORMATIVO_DIGITAL";
  readonly notPunitive: true;
  readonly noGlobalPassFail: true;
  readonly practicalCompetenceClaim: "PROIBIDO_MVP";
}>;

const themeMetadata: Readonly<
  Record<DiagnosticSessionId, Readonly<{ readonly label: string }>>
> = Object.freeze({
  "B07-S1": Object.freeze({ label: "Núcleo clínico e segurança" }),
  "B07-S2": Object.freeze({ label: "Emergência e priorização" }),
  "B07-S3": Object.freeze({
    label: "Internação, monitoramento e integração",
  }),
});

const themeIds: readonly DiagnosticSessionId[] = Object.freeze([
  "B07-S1",
  "B07-S2",
  "B07-S3",
]);

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new ApplicationError("validation_error", `${field} is required`);
  }
}

function assertCompletedAt(value: string): void {
  if (Number.isNaN(new Date(value).getTime())) {
    throw new ApplicationError(
      "validation_error",
      "completedAt must be a valid timestamp",
    );
  }
}

function freezeResult(
  result: CurriculumDiagnosticResult,
): CurriculumDiagnosticResult {
  return Object.freeze({
    ...result,
    themeResults: Object.freeze(
      result.themeResults.map((theme) =>
        Object.freeze({
          ...theme,
          recommendedModuleIds: Object.freeze([...theme.recommendedModuleIds]),
        }),
      ),
    ),
    recommendedModuleIds: Object.freeze([...result.recommendedModuleIds]),
    remediationObjectiveIds: Object.freeze([...result.remediationObjectiveIds]),
  });
}

function latestResultByTheme(
  results: readonly DiagnosticResultState[],
): ReadonlyMap<
  DiagnosticSessionId,
  Readonly<{
    result: DiagnosticResultState;
    theme: CurriculumDiagnosticResult["themeResults"][number];
  }>
> {
  const latest = new Map<
    DiagnosticSessionId,
    Readonly<{
      result: DiagnosticResultState;
      theme: CurriculumDiagnosticResult["themeResults"][number];
    }>
  >();
  for (const result of results) {
    for (const theme of result.result.themeResults) {
      const previous = latest.get(theme.themeId);
      if (
        previous === undefined ||
        new Date(result.completedAt).getTime() >=
          new Date(previous.result.completedAt).getTime()
      ) {
        latest.set(theme.themeId, Object.freeze({ result, theme }));
      }
    }
  }
  return latest;
}

export function deriveParticipantDiagnosticProfile(
  results: readonly DiagnosticResultState[],
): readonly ParticipantDiagnosticProfileItem[] {
  const latest = latestResultByTheme(results);
  return Object.freeze(
    themeIds.map((themeId) => {
      const metadata = themeMetadata[themeId];
      const current = latest.get(themeId);
      if (current === undefined) {
        return Object.freeze({
          themeId,
          themeLabel: metadata.label,
          status: "SEM_EVIDENCIA_DIGITAL" as const,
          scorePercent: null,
          answeredItemCount: 0,
          itemCount: 40,
          recommendedModuleIds: Object.freeze([]),
          evidence: "DIAGNOSTICO_FORMATIVO_DIGITAL" as const,
          notPunitive: true as const,
          noGlobalPassFail: true as const,
          practicalCompetenceClaim: "PROIBIDO_MVP" as const,
        });
      }
      return Object.freeze({
        themeId,
        themeLabel: metadata.label,
        status: "BASELINE_REGISTRADA" as const,
        scorePercent: current.theme.percent,
        answeredItemCount: current.theme.answeredItemCount,
        itemCount: current.theme.itemCount,
        recommendedModuleIds: Object.freeze([
          ...current.theme.recommendedModuleIds,
        ]),
        lastEvaluatedAt: current.result.completedAt,
        evidence: "DIAGNOSTICO_FORMATIVO_DIGITAL" as const,
        notPunitive: true as const,
        noGlobalPassFail: true as const,
        practicalCompetenceClaim: "PROIBIDO_MVP" as const,
      });
    }),
  );
}

export async function evaluateAndPersistDiagnosticDraft(
  command: EvaluateDiagnosticDraftCommand,
  repository: DiagnosticResultWritePort,
): Promise<DiagnosticResultState> {
  assertNonEmpty(command.participantId, "participantId");
  assertNonEmpty(command.scopeId, "scopeId");
  assertCompletedAt(command.completedAt);
  const result = freezeResult(
    evaluateDiagnosticAttempt({ answers: command.answers }),
  );
  return repository.saveDiagnosticResult(
    Object.freeze({
      participantId: command.participantId,
      scopeId: command.scopeId,
      completedAt: new Date(command.completedAt).toISOString(),
      result,
    }),
  );
}
