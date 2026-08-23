import { ApplicationError } from "./errors.js";

export type ContinuingEducationReportQuery = Readonly<{
  readonly scopeId: string;
  readonly moduleId?: string | undefined;
  readonly accountStatus?:
    "INVITED" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED" | undefined;
}>;

export type ContinuingEducationReportParticipant = Readonly<{
  readonly participantId: string;
  readonly professionalEmail: string;
  readonly accountStatus: "INVITED" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
  readonly assignedModules: number;
  readonly completedModules: number;
  readonly progressPercent: number | null;
  readonly completedDigitalMinutes: number;
  readonly completedDigitalHours: number;
  readonly lastSeenAt?: string;
}>;

export type ContinuingEducationReportState = Readonly<{
  readonly kind: "continuing_education_report";
  readonly scopeId: string;
  readonly generatedAt: string;
  readonly filters: ContinuingEducationReportQuery;
  readonly summary: Readonly<{
    readonly participantCount: number;
    readonly invitedParticipants: number;
    readonly activeParticipants: number;
    readonly suspendedParticipants: number;
    readonly deactivatedParticipants: number;
    readonly assignedModules: number;
    readonly completedModules: number;
    readonly completionRatePercent: number | null;
    readonly completedDigitalMinutes: number;
    readonly completedDigitalHours: number;
  }>;
  readonly participants: readonly ContinuingEducationReportParticipant[];
  readonly modules: readonly Readonly<{
    readonly moduleId: string;
    readonly month: number;
    readonly scheduledMinutes: number;
    readonly assignedParticipants: number;
    readonly completedParticipants: number;
    readonly completionRatePercent: number | null;
  }>[];
  readonly learningEvidence: "ATIVIDADE_MODULAR_DIGITAL";
  readonly hoursClaim: "NAO_CREDENCIADAS";
  readonly practicalCompetenceClaim: "PROIBIDO_MVP";
}>;

export type GetContinuingEducationReportCommand = Readonly<{
  readonly principalId: string;
  readonly query: ContinuingEducationReportQuery;
}>;

export interface ContinuingEducationReportReadPort {
  readonly findContinuingEducationReport: (
    query: ContinuingEducationReportQuery,
  ) => Promise<ContinuingEducationReportState>;
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const modulePattern = /^M(?:0[1-9]|1[0-9]|2[0-4])$/u;
const accountStatuses = new Set([
  "INVITED",
  "ACTIVE",
  "SUSPENDED",
  "DEACTIVATED",
] as const);

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new ApplicationError("validation_error", `${field} is required`);
  }
}

function normalizeQuery(
  query: ContinuingEducationReportQuery,
): ContinuingEducationReportQuery {
  assertNonEmpty(query.scopeId, "scopeId");
  const scopeId = query.scopeId.trim();
  if (!uuidPattern.test(scopeId)) {
    throw new ApplicationError("validation_error", "scopeId is invalid");
  }
  const moduleId = query.moduleId?.trim();
  if (moduleId !== undefined && !modulePattern.test(moduleId)) {
    throw new ApplicationError("validation_error", "moduleId is invalid");
  }
  if (
    query.accountStatus !== undefined &&
    !accountStatuses.has(query.accountStatus)
  ) {
    throw new ApplicationError("validation_error", "accountStatus is invalid");
  }
  return Object.freeze({
    scopeId,
    ...(moduleId === undefined ? {} : { moduleId }),
    ...(query.accountStatus === undefined
      ? {}
      : { accountStatus: query.accountStatus }),
  });
}

function freezeState(
  state: ContinuingEducationReportState,
  query: ContinuingEducationReportQuery,
): ContinuingEducationReportState {
  if (state.scopeId !== query.scopeId) {
    throw new ApplicationError(
      "forbidden",
      "Report contains data outside the current scope",
    );
  }
  if (state.filters.scopeId !== query.scopeId) {
    throw new ApplicationError(
      "forbidden",
      "Report filters do not match the current scope",
    );
  }
  if (
    state.filters.moduleId !== query.moduleId ||
    state.filters.accountStatus !== query.accountStatus
  ) {
    throw new ApplicationError(
      "forbidden",
      "Report filters do not match the requested query",
    );
  }
  return Object.freeze({
    ...state,
    filters: Object.freeze({ ...state.filters }),
    summary: Object.freeze({ ...state.summary }),
    participants: Object.freeze(
      state.participants.map((participant) =>
        Object.freeze({ ...participant }),
      ),
    ),
    modules: Object.freeze(
      state.modules.map((module) => Object.freeze({ ...module })),
    ),
  });
}

export async function getContinuingEducationReport(
  command: GetContinuingEducationReportCommand,
  repository: ContinuingEducationReportReadPort,
): Promise<ContinuingEducationReportState> {
  assertNonEmpty(command.principalId, "principalId");
  const query = normalizeQuery(command.query);
  const state = await repository.findContinuingEducationReport(query);
  return freezeState(state, query);
}
