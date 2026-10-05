import {
  participantActivityProjectionSchema,
  participantCurriculumRuntimeProjectionSchema,
} from "@cvg/contracts";
import {
  participantAttemptProjectionSchema,
  saveAnswerRequestSchema,
} from "@cvg/contracts";
import { participantLearningJourneyProjectionSchema } from "@cvg/contracts";
import { correctionResultProjectionSchema } from "@cvg/contracts";
import {
  participantAppealProjectionSchema,
  participantAppealsProjectionSchema,
  participantFeedbackTicketProjectionSchema,
  participantFeedbackTicketsProjectionSchema,
  type ParticipantAppealProjection,
  type ParticipantAppealsProjection,
  type ParticipantFeedbackTicketProjection,
  type ParticipantFeedbackTicketsProjection,
} from "@cvg/contracts";
import type { ActivityItem } from "./participant-answer-list";
import {
  dashboardProjectionSchema,
  type ParticipantDashboardProjection,
} from "@cvg/contracts";

export type {
  ParticipantDashboardProjection,
  ParticipantAppealProjection,
  ParticipantFeedbackTicketProjection,
};

export type ReflectionProjection = Readonly<{
  readonly status: "NAO_INICIADA" | "EM_ANDAMENTO" | "CONCLUIDA";
  readonly nextAction:
    | "INICIAR_REFLEXAO"
    | "RETOMAR_REFLEXAO"
    | "ENVIAR_REFLEXAO"
    | "PROXIMA_ACAO";
  readonly itemCount: number;
  readonly answeredItemCount: number;
  readonly answers: readonly Readonly<{
    readonly itemId: string;
    readonly response: string;
    readonly savedAt: string;
  }>[];
  readonly evidence: "REFLEXAO_DIGITAL";
  readonly practicalCompetenceClaim: "PROIBIDO_MVP";
}>;

export type ActivityProjection = Readonly<{
  readonly activityId: string;
  readonly slug: string;
  readonly title: string;
  readonly items: readonly ActivityItem[];
  readonly reflection?: ReflectionProjection;
}>;

export type AttemptProjection = Readonly<{
  readonly attemptId: string;
  readonly activityId: string;
  readonly status: string;
  readonly version: number;
  readonly answers: readonly Readonly<{
    readonly itemId: string;
    readonly response: string;
  }>[];
}>;

export type FeedbackTicketType = ParticipantFeedbackTicketProjection["type"];

export type CurriculumRuntimeProjection = Readonly<{
  readonly moduleId: string;
  readonly version: number;
  readonly status:
    "DOMINIO_DIGITAL" | "EM_REMEDIACAO" | "AGUARDA_CORRECAO_HUMANA";
  readonly nextAction:
    "REVISAR_RETENCAO" | "EXECUTAR_REMEDIACAO" | "AGUARDAR_CORRECAO_HUMANA";
  readonly scorePercent?: number;
  readonly remediationCount: number;
  readonly retentionReviews: readonly Readonly<{
    readonly day: 30 | 60 | 90;
    readonly dueAt: string;
    readonly status: "PENDENTE";
  }>[];
  readonly practicalCompetenceClaim: "PROIBIDO_MVP";
}>;

export type JourneyActivityProjection = Readonly<{
  readonly activityId: string;
  readonly slug: string;
  readonly title: string;
  readonly status: string;
  readonly attemptId?: string;
  readonly attemptStatus?: string;
  readonly attemptVersion?: number;
  readonly nextAction: string;
}>;

export type LearningJourneyProjection = Readonly<{
  readonly assignments: readonly ApiRecord[];
  readonly activities: readonly JourneyActivityProjection[];
  readonly results: readonly ApiRecord[];
  readonly runtimes: readonly CurriculumRuntimeProjection[];
  readonly nextAction: string;
  readonly nextActionTarget?: Readonly<{
    readonly kind: "ACTIVITY";
    readonly activityId: string;
  }>;
}>;

export type CorrectionProjection = Readonly<{
  readonly attemptStatus: "CORRIGIDA_AUTOMATICAMENTE" | "CORRIGIDA_HUMANAMENTE";
  readonly attemptVersion: number;
  readonly resultVersion: number;
  readonly score: number;
  readonly outcome: "APROVADO" | "REFORCO";
  readonly feedback: string;
}>;

export type ApiRecord = Readonly<Record<string, unknown>>;

export const apiBase = process.env.NEXT_PUBLIC_CVG_API_BASE_URL ?? "";

export type ExperienceState = "idle" | "loading" | "ready" | "empty" | "error";
export type RetryAction =
  | "access"
  | "journey"
  | "activity"
  | "appeals"
  | "feedback"
  | "correction"
  | null;

export class PublicApiError extends Error {
  public constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "PublicApiError";
  }
}

export function isRecord(value: unknown): value is ApiRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isString(value: unknown): value is string {
  return typeof value === "string";
}

/** Use the public parser's normalization only for semantic comparison, never wire replay. */
export function canonicalParticipantResponse(value: string): string | null {
  const result = saveAnswerRequestSchema.shape.response.safeParse(value);
  return result.success ? result.data : null;
}
export function sameParticipantResponse(left: string, right: string): boolean {
  return (
    (canonicalParticipantResponse(left) ?? left) ===
    (canonicalParticipantResponse(right) ?? right)
  );
}
export function isActivity(value: unknown): value is ActivityProjection {
  return participantActivityProjectionSchema.safeParse(value).success;
}
export function isAttempt(value: unknown): value is AttemptProjection {
  return participantAttemptProjectionSchema.safeParse(value).success;
}
export function isCorrection(value: unknown): value is CorrectionProjection {
  return correctionResultProjectionSchema.safeParse(value).success;
}

export function isParticipantAppeal(
  value: unknown,
): value is ParticipantAppealProjection {
  return participantAppealProjectionSchema.safeParse(value).success;
}

export function isParticipantAppeals(
  value: unknown,
): value is ParticipantAppealsProjection {
  return participantAppealsProjectionSchema.safeParse(value).success;
}

export function isParticipantFeedbackTicket(
  value: unknown,
): value is ParticipantFeedbackTicketProjection {
  return participantFeedbackTicketProjectionSchema.safeParse(value).success;
}

export function isParticipantFeedback(
  value: unknown,
): value is ParticipantFeedbackTicketsProjection {
  return participantFeedbackTicketsProjectionSchema.safeParse(value).success;
}

export function isRuntime(
  value: unknown,
): value is CurriculumRuntimeProjection {
  return participantCurriculumRuntimeProjectionSchema.safeParse(value).success;
}

export function isTerminalAttemptStatus(value: string | undefined): boolean {
  return (
    value === "CORRIGIDA_AUTOMATICAMENTE" ||
    value === "CORRIGIDA_HUMANAMENTE" ||
    value === "ANULADA"
  );
}

export function isEditableAttemptStatus(value: string | undefined): boolean {
  return value === "CRIADA" || value === "EM_ANDAMENTO" || value === "SALVA";
}

export function isRemediationStartableActivityStatus(
  value: string | undefined,
): boolean {
  return (
    value === "DISPONIVEL" || value === "EM_ANDAMENTO" || value === "EM_REFORCO"
  );
}

export function isJourney(value: unknown): value is LearningJourneyProjection {
  return participantLearningJourneyProjectionSchema.safeParse(value).success;
}

export function isParticipantDashboard(
  value: unknown,
): value is ParticipantDashboardProjection {
  const result = dashboardProjectionSchema.safeParse(value);
  return result.success && result.data.kind === "participant";
}
