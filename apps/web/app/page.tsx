"use client";

import { type FormEvent, useEffect, useState } from "react";
import { LoginMascot } from "./login-mascot";
import {
  operationalNotice,
  operationalNoticeTitle,
} from "./operational-notice";

type ActivityItem = Readonly<{
  readonly itemId: string;
  readonly ordinal: number;
  readonly kind: string;
  readonly title: string;
  readonly text: string;
  readonly responseMode:
    "TEXT" | "CHOICE" | "STRUCTURED_FIELDS" | "DOSE_INFUSION" | "NONE";
  readonly choices?: readonly Readonly<{
    readonly id: string;
    readonly label: string;
    readonly text: string;
  }>[];
  readonly selectionMode?: "SINGLE" | "MULTIPLE";
  readonly interaction?: Readonly<{
    readonly kind: "STRUCTURED_FIELDS" | "DOSE_INFUSION";
    readonly evaluationMode: "AUTOMATIC";
    readonly fields: readonly Readonly<{
      readonly id: string;
      readonly label: string;
      readonly valueType: "NUMBER" | "TEXT" | "BOOLEAN";
      readonly unit?: string;
      readonly required: true;
      readonly min?: number;
      readonly max?: number;
    }>[];
    readonly calculationInputs?: Readonly<{
      readonly weightKg: number;
      readonly doseMgPerKg: number;
      readonly concentrationMgPerMl: number;
      readonly durationHours: number;
    }>;
    readonly formulaLabel?: string;
  }>;
  readonly digitalCaseStage?: Readonly<{
    readonly caseId: string;
    readonly stage: 1 | 2 | 3;
    readonly examSeries: readonly Readonly<{
      readonly id: string;
      readonly modality: "RADIOGRAFIA" | "POCUS" | "ECG";
      readonly label: string;
      readonly observationCount: number;
    }>[];
  }>;
}>;

type ActivityProjection = Readonly<{
  readonly activityId: string;
  readonly slug: string;
  readonly title: string;
  readonly items: readonly ActivityItem[];
}>;

type AttemptProjection = Readonly<{
  readonly attemptId: string;
  readonly activityId: string;
  readonly status: string;
  readonly version: number;
  readonly answers: readonly Readonly<{
    readonly itemId: string;
    readonly response: string;
  }>[];
}>;

type CurriculumRuntimeProjection = Readonly<{
  readonly moduleId: string;
  readonly version: number;
  readonly status:
    | "PENDENTE"
    | "DOMINIO_DIGITAL"
    | "EM_REMEDIACAO"
    | "AGUARDA_CORRECAO_HUMANA";
  readonly nextAction:
    | "INICIAR_BASELINE"
    | "REVISAR_RETENCAO"
    | "EXECUTAR_REMEDIACAO"
    | "AGUARDAR_CORRECAO_HUMANA";
  readonly scorePercent?: number;
  readonly remediationCount: number;
  readonly retentionReviews: readonly Readonly<{
    readonly day: 7 | 30 | 90;
    readonly dueAt: string;
    readonly status: "PENDENTE";
  }>[];
  readonly practicalCompetenceClaim: "PROIBIDO_MVP";
}>;

type DigitalCaseRuntimeProjection = Readonly<{
  readonly moduleId: string;
  readonly caseId: string;
  readonly version: number;
  readonly currentStage: 1 | 2 | 3 | "CONCLUIDO";
  readonly state: Readonly<Record<string, string | number | boolean>>;
  readonly revealedExamSeries: readonly Readonly<{
    readonly id: string;
    readonly modality: "RADIOGRAFIA" | "POCUS" | "ECG";
    readonly label: string;
    readonly observations: readonly Readonly<{
      readonly sequence: number;
      readonly syntheticSummary: string;
    }>[];
  }>[];
  readonly consequences: readonly Readonly<{
    readonly branchId: string;
    readonly consequence: string;
    readonly recordedAt: string;
  }>[];
  readonly updatedAt: string;
}>;

type JourneyActivityProjection = Readonly<{
  readonly activityId: string;
  readonly slug: string;
  readonly title: string;
  readonly status: string;
  readonly attemptId?: string;
  readonly attemptStatus?: string;
  readonly attemptVersion?: number;
  readonly nextAction: string;
}>;

type LearningJourneyProjection = Readonly<{
  readonly assignments: readonly ApiRecord[];
  readonly activities: readonly JourneyActivityProjection[];
  readonly results: readonly ApiRecord[];
  readonly runtimes: readonly CurriculumRuntimeProjection[];
  readonly nextAction: string;
}>;

type ApiRecord = Readonly<Record<string, unknown>>;

const apiBase = process.env.NEXT_PUBLIC_CVG_API_BASE_URL ?? "";

type ExperienceState = "idle" | "loading" | "ready" | "empty" | "error";
type RetryAction = "login" | "journey" | "activity" | null;

class PublicApiError extends Error {
  public constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "PublicApiError";
  }
}

function isRecord(value: unknown): value is ApiRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isChoice(value: unknown): value is Readonly<{
  readonly id: string;
  readonly label: string;
  readonly text: string;
}> {
  if (!isRecord(value)) return false;
  return (
    isString(value.id) &&
    isString(value.label) &&
    isString(value.text) &&
    value.id.trim().length > 0 &&
    value.label.trim().length > 0 &&
    value.text.trim().length > 0
  );
}

function isStructuredInteraction(
  value: unknown,
): value is NonNullable<ActivityItem["interaction"]> {
  if (!isRecord(value)) return false;
  if (
    (value.kind !== "STRUCTURED_FIELDS" && value.kind !== "DOSE_INFUSION") ||
    value.evaluationMode !== "AUTOMATIC" ||
    !Array.isArray(value.fields) ||
    value.fields.length === 0
  ) {
    return false;
  }
  const fieldsValid = value.fields.every((field) => {
    if (!isRecord(field)) return false;
    return (
      isString(field.id) &&
      isString(field.label) &&
      (field.valueType === "NUMBER" ||
        field.valueType === "TEXT" ||
        field.valueType === "BOOLEAN") &&
      field.required === true &&
      (field.min === undefined || typeof field.min === "number") &&
      (field.max === undefined || typeof field.max === "number")
    );
  });
  if (!fieldsValid) return false;
  if (value.kind === "STRUCTURED_FIELDS") return true;
  return (
    isRecord(value.calculationInputs) &&
    typeof value.calculationInputs.weightKg === "number" &&
    typeof value.calculationInputs.doseMgPerKg === "number" &&
    typeof value.calculationInputs.concentrationMgPerMl === "number" &&
    typeof value.calculationInputs.durationHours === "number" &&
    isString(value.formulaLabel)
  );
}

function isDigitalCaseStage(
  value: unknown,
): value is NonNullable<ActivityItem["digitalCaseStage"]> {
  if (!isRecord(value)) return false;
  return (
    isString(value.caseId) &&
    (value.stage === 1 || value.stage === 2 || value.stage === 3) &&
    Array.isArray(value.examSeries) &&
    value.examSeries.length === 3 &&
    value.examSeries.every(
      (exam) =>
        isRecord(exam) &&
        isString(exam.id) &&
        isString(exam.label) &&
        (exam.modality === "RADIOGRAFIA" ||
          exam.modality === "POCUS" ||
          exam.modality === "ECG") &&
        typeof exam.observationCount === "number" &&
        Number.isInteger(exam.observationCount) &&
        exam.observationCount >= 2,
    )
  );
}

function isActivity(value: unknown): value is ActivityProjection {
  if (!isRecord(value)) return false;
  if (
    !isString(value.activityId) ||
    !isString(value.slug) ||
    !isString(value.title) ||
    !Array.isArray(value.items)
  ) {
    return false;
  }

  return value.items.every((item) => {
    if (!isRecord(item)) return false;
    const basicShape =
      isString(item.itemId) &&
      typeof item.ordinal === "number" &&
      isString(item.kind) &&
      isString(item.title) &&
      isString(item.text) &&
      (item.responseMode === "TEXT" ||
        item.responseMode === "CHOICE" ||
        item.responseMode === "STRUCTURED_FIELDS" ||
        item.responseMode === "DOSE_INFUSION" ||
        item.responseMode === "NONE");
    if (!basicShape) return false;
    if (
      item.selectionMode !== undefined &&
      item.selectionMode !== "SINGLE" &&
      item.selectionMode !== "MULTIPLE"
    ) {
      return false;
    }
    if (item.choices !== undefined) {
      if (!Array.isArray(item.choices) || !item.choices.every(isChoice)) {
        return false;
      }
    }
    if (
      item.responseMode === "STRUCTURED_FIELDS" ||
      item.responseMode === "DOSE_INFUSION"
    ) {
      if (!isStructuredInteraction(item.interaction)) return false;
      if (item.interaction.kind !== item.responseMode) return false;
      if (item.choices !== undefined || item.selectionMode !== undefined) {
        return false;
      }
    }
    if (
      item.digitalCaseStage !== undefined &&
      !isDigitalCaseStage(item.digitalCaseStage)
    ) {
      return false;
    }
    return (
      item.responseMode !== "CHOICE" ||
      (Array.isArray(item.choices) &&
        item.choices.length >= 2 &&
        item.selectionMode !== undefined)
    );
  });
}

function isAttempt(value: unknown): value is AttemptProjection {
  if (!isRecord(value)) return false;
  return (
    isString(value.attemptId) &&
    isString(value.activityId) &&
    isString(value.status) &&
    typeof value.version === "number" &&
    Array.isArray(value.answers) &&
    value.answers.every(
      (answer) =>
        isRecord(answer) &&
        isString(answer.itemId) &&
        isString(answer.response),
    )
  );
}

function isRuntime(value: unknown): value is CurriculumRuntimeProjection {
  if (!isRecord(value)) return false;
  const status =
    value.status === "PENDENTE" ||
    value.status === "DOMINIO_DIGITAL" ||
    value.status === "EM_REMEDIACAO" ||
    value.status === "AGUARDA_CORRECAO_HUMANA";
  const nextAction =
    value.nextAction === "INICIAR_BASELINE" ||
    value.nextAction === "REVISAR_RETENCAO" ||
    value.nextAction === "EXECUTAR_REMEDIACAO" ||
    value.nextAction === "AGUARDAR_CORRECAO_HUMANA";
  return (
    isString(value.moduleId) &&
    /^M(?:0[1-9]|1[0-9]|2[0-4])$/u.test(value.moduleId) &&
    typeof value.version === "number" &&
    Number.isInteger(value.version) &&
    value.version >= 1 &&
    status &&
    nextAction &&
    (value.scorePercent === undefined ||
      (typeof value.scorePercent === "number" &&
        Number.isInteger(value.scorePercent) &&
        value.scorePercent >= 0 &&
        value.scorePercent <= 100)) &&
    typeof value.remediationCount === "number" &&
    Number.isInteger(value.remediationCount) &&
    value.remediationCount >= 0 &&
    Array.isArray(value.retentionReviews) &&
    value.retentionReviews.every(
      (review) =>
        isRecord(review) &&
        (review.day === 7 || review.day === 30 || review.day === 90) &&
        isString(review.dueAt) &&
        review.status === "PENDENTE",
    ) &&
    value.practicalCompetenceClaim === "PROIBIDO_MVP"
  );
}

function isJourneyActivity(value: unknown): value is JourneyActivityProjection {
  if (!isRecord(value)) return false;
  return (
    isString(value.activityId) &&
    isString(value.slug) &&
    isString(value.title) &&
    isString(value.status) &&
    isString(value.nextAction) &&
    (value.attemptId === undefined || isString(value.attemptId)) &&
    (value.attemptStatus === undefined || isString(value.attemptStatus)) &&
    (value.attemptVersion === undefined ||
      (typeof value.attemptVersion === "number" &&
        Number.isInteger(value.attemptVersion) &&
        value.attemptVersion >= 0))
  );
}

function isDigitalCaseRuntime(
  value: unknown,
): value is DigitalCaseRuntimeProjection {
  if (!isRecord(value)) return false;
  if (
    !isString(value.moduleId) ||
    !/^M(?:0[1-9]|1[0-9]|2[0-4])$/u.test(value.moduleId) ||
    !isString(value.caseId) ||
    typeof value.version !== "number" ||
    !Number.isInteger(value.version) ||
    value.version < 0 ||
    (value.currentStage !== 1 &&
      value.currentStage !== 2 &&
      value.currentStage !== 3 &&
      value.currentStage !== "CONCLUIDO") ||
    !isRecord(value.state) ||
    !Array.isArray(value.revealedExamSeries) ||
    !Array.isArray(value.consequences) ||
    !isString(value.updatedAt)
  ) {
    return false;
  }
  const stateValid = Object.entries(value.state).every(
    ([key, candidate]) =>
      key.trim().length > 0 &&
      (isString(candidate) ||
        typeof candidate === "number" ||
        typeof candidate === "boolean"),
  );
  const examsValid = value.revealedExamSeries.every(
    (exam) =>
      isRecord(exam) &&
      isString(exam.id) &&
      isString(exam.label) &&
      (exam.modality === "RADIOGRAFIA" ||
        exam.modality === "POCUS" ||
        exam.modality === "ECG") &&
      Array.isArray(exam.observations) &&
      exam.observations.every(
        (observation) =>
          isRecord(observation) &&
          typeof observation.sequence === "number" &&
          Number.isInteger(observation.sequence) &&
          isString(observation.syntheticSummary),
      ),
  );
  const consequencesValid = value.consequences.every(
    (consequence) =>
      isRecord(consequence) &&
      isString(consequence.branchId) &&
      isString(consequence.consequence) &&
      isString(consequence.recordedAt),
  );
  return stateValid && examsValid && consequencesValid;
}

function isJourney(value: unknown): value is LearningJourneyProjection {
  if (!isRecord(value)) return false;
  return (
    Array.isArray(value.assignments) &&
    value.assignments.every(isRecord) &&
    Array.isArray(value.activities) &&
    value.activities.every(isJourneyActivity) &&
    Array.isArray(value.results) &&
    value.results.every(isRecord) &&
    Array.isArray(value.runtimes) &&
    value.runtimes.every(isRuntime) &&
    isString(value.nextAction)
  );
}

function nextActionLabel(value: string): string {
  const labels: Readonly<Record<string, string>> = {
    INICIAR_ATIVIDADE: "Iniciar atividade",
    RETOMAR_ATIVIDADE: "Retomar atividade",
    AGUARDAR_CORRECAO: "Aguardar correção",
    REVISAR_PROXIMO_CONTEUDO: "Revisar próximo conteúdo",
    CONSULTAR_PROXIMO_PASSO: "Consultar próximo passo",
    EXECUTAR_REMEDIACAO: "Executar remediação",
    REVISAR_RETENCAO: "Revisar retenção",
    INICIAR_BASELINE: "Iniciar baseline",
    AGUARDAR_CORRECAO_HUMANA: "Aguardar correção humana",
    AGUARDAR_PUBLICACAO: "Aguardar publicação clínica",
  };
  return labels[value] ?? value;
}

function moduleIdFromActivity(
  activity: Readonly<{ readonly slug: string }>,
): string | null {
  const match = /(?:^|-)m(0[1-9]|1[0-9]|2[0-4])(?:-|$)/iu.exec(activity.slug);
  return match?.[1] === undefined ? null : `M${match[1]}`;
}

function journeyActivityOrder(activity: JourneyActivityProjection): number {
  const moduleId = moduleIdFromActivity(activity);
  if (moduleId === null) return Number.POSITIVE_INFINITY;
  return Number(moduleId.slice(1));
}

function orderedJourneyActivities(
  activities: readonly JourneyActivityProjection[],
): readonly JourneyActivityProjection[] {
  return [...activities].sort((left, right) => {
    const moduleDifference =
      journeyActivityOrder(left) - journeyActivityOrder(right);
    if (moduleDifference !== 0) return moduleDifference;
    const slugDifference = left.slug.localeCompare(right.slug);
    if (slugDifference !== 0) return slugDifference;
    return left.activityId.localeCompare(right.activityId);
  });
}

function canAutoOpenJourneyActivity(
  journey: LearningJourneyProjection,
): boolean {
  return (
    journey.nextAction === "INICIAR_ATIVIDADE" ||
    journey.nextAction === "RETOMAR_ATIVIDADE" ||
    journey.nextAction === "AGUARDAR_CORRECAO" ||
    journey.nextAction === "REVISAR_PROXIMO_CONTEUDO"
  );
}

function publicErrorMessage(error: unknown): string {
  if (error instanceof PublicApiError && error.code === "unauthenticated") {
    return "Login ou senha inválidos.";
  }
  if (error instanceof PublicApiError && error.code === "validation_error") {
    return "Informe um e-mail profissional e uma senha válida.";
  }
  return "Não foi possível concluir a operação. Tente novamente.";
}

function idempotencyKey(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function selectedChoiceIds(
  item: ActivityItem,
  value: string | undefined,
): readonly string[] {
  if (value === undefined || value.length === 0) return [];
  if (item.selectionMode !== "MULTIPLE") return [value];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(isString) : [];
  } catch {
    return [];
  }
}

type StructuredAnswerValue = string | number | boolean;

function structuredValues(
  value: string | undefined,
): Readonly<Record<string, StructuredAnswerValue>> {
  if (value === undefined || value.trim().length === 0) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed)) return {};
    const entries: [string, StructuredAnswerValue][] = [];
    for (const [key, candidate] of Object.entries(parsed)) {
      if (
        typeof candidate === "string" ||
        typeof candidate === "number" ||
        typeof candidate === "boolean"
      ) {
        entries.push([key, candidate]);
      }
    }
    return Object.fromEntries(entries);
  } catch {
    return {};
  }
}

function structuredAnswerValue(
  value: string | undefined,
  fieldId: string,
): StructuredAnswerValue | undefined {
  return structuredValues(value)[fieldId];
}

function updateStructuredAnswer(
  current: string | undefined,
  fieldId: string,
  value: StructuredAnswerValue | undefined,
): string {
  const previous = structuredValues(current);
  const next =
    value === undefined
      ? Object.fromEntries(
          Object.entries(previous).filter(([key]) => key !== fieldId),
        )
      : { ...previous, [fieldId]: value };
  return JSON.stringify(next);
}

const ITEMS_PER_BLOCK = 3;
type PageSaveState = "idle" | "saving" | "saved";
type FeedbackType =
  "BUG_TECNICO" | "USABILIDADE" | "ERRO_CONTEUDO" | "MELHORIA" | "CONTESTACAO";
type FeedbackState = "idle" | "sending" | "sent";

function answersFromAttempt(
  attempt: AttemptProjection | null,
): Readonly<Record<string, string>> {
  if (attempt === null) return {};
  return Object.fromEntries(
    attempt.answers.map((answer) => [answer.itemId, answer.response]),
  );
}

function mergeAttemptProjection(
  previous: AttemptProjection | null,
  next: AttemptProjection,
): AttemptProjection {
  const answerByItem = new Map(
    (previous?.answers ?? []).map((answer) => [answer.itemId, answer]),
  );
  for (const answer of next.answers) answerByItem.set(answer.itemId, answer);
  return { ...next, answers: Array.from(answerByItem.values()) };
}

function isAnswerComplete(
  item: ActivityItem,
  value: string | undefined,
): boolean {
  if (item.responseMode === "NONE") return true;
  if (item.responseMode === "CHOICE") {
    return selectedChoiceIds(item, value).length > 0;
  }
  if (
    item.responseMode === "STRUCTURED_FIELDS" ||
    item.responseMode === "DOSE_INFUSION"
  ) {
    if (item.interaction === undefined) return false;
    const values = structuredValues(value);
    return item.interaction.fields.every((field) => {
      const candidate = values[field.id];
      if (candidate === undefined) return false;
      if (field.valueType === "NUMBER") {
        return typeof candidate === "number" && Number.isFinite(candidate);
      }
      if (field.valueType === "BOOLEAN") return typeof candidate === "boolean";
      return typeof candidate === "string" && candidate.trim().length > 0;
    });
  }
  return typeof value === "string" && value.trim().length > 0;
}

function attemptFromJourneyActivity(
  activity: JourneyActivityProjection | undefined,
): AttemptProjection | null {
  if (activity?.attemptId === undefined) return null;
  return {
    attemptId: activity.attemptId,
    activityId: activity.activityId,
    status: activity.attemptStatus ?? "EM_ANDAMENTO",
    version: activity.attemptVersion ?? 0,
    answers: [],
  };
}

async function requestJson(
  path: string,
  init: Readonly<{
    readonly method: "GET" | "POST";
    readonly body?: unknown;
  }>,
): Promise<unknown> {
  const response = await fetch(`${apiBase}${path}`, {
    method: init.method,
    credentials: "include",
    headers: { "content-type": "application/json" },
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!isRecord(payload) || payload.success !== true) {
    const error = isRecord(payload)
      ? isRecord(payload.error)
        ? payload.error
        : ({} satisfies ApiRecord)
      : ({} satisfies ApiRecord);
    const code = isString(error.code) ? error.code : "internal_error";
    const message = isString(error.message)
      ? error.message
      : "A operação não foi concluída.";
    throw new PublicApiError(code, message);
  }
  return payload.data;
}

function initialActivityId(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("activityId") ?? "";
}

export default function HomePage() {
  const [activityId, setActivityId] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [activity, setActivity] = useState<ActivityProjection | null>(null);
  const [journey, setJourney] = useState<LearningJourneyProjection | null>(
    null,
  );
  const [runtime, setRuntime] = useState<CurriculumRuntimeProjection | null>(
    null,
  );
  const [digitalCase, setDigitalCase] =
    useState<DigitalCaseRuntimeProjection | null>(null);
  const [attempt, setAttempt] = useState<AttemptProjection | null>(null);
  const [answers, setAnswers] = useState<Readonly<Record<string, string>>>({});
  const [questionPage, setQuestionPage] = useState(0);
  const [pageSaveState, setPageSaveState] = useState<PageSaveState>("idle");
  const [authenticated, setAuthenticated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("BUG_TECNICO");
  const [feedbackDescription, setFeedbackDescription] = useState("");
  const [feedbackState, setFeedbackState] = useState<FeedbackState>("idle");
  const [journeyState, setJourneyState] = useState<ExperienceState>("idle");
  const [activityState, setActivityState] = useState<ExperienceState>("idle");
  const [retryAction, setRetryAction] = useState<RetryAction>(null);

  useEffect(() => {
    setActivityId(initialActivityId());
  }, []);

  async function loadActivity(
    nextActivityId: string,
    seedAttempt: AttemptProjection | null = null,
  ): Promise<void> {
    setActivityState("loading");
    setRetryAction("activity");
    try {
      const data = await requestJson(`/api/v1/activities/${nextActivityId}`, {
        method: "GET",
      });
      if (!isActivity(data))
        throw new PublicApiError("internal_error", "invalid projection");
      const isNewActivity = activity?.activityId !== data.activityId;
      setActivity(data);
      if (isNewActivity) {
        setAttempt(seedAttempt);
        setAnswers(answersFromAttempt(seedAttempt));
        setQuestionPage(0);
        setPageSaveState("idle");
      }
      const moduleId = moduleIdFromActivity(data);
      if (moduleId === null) {
        setRuntime(null);
        setDigitalCase(null);
        setActivityState("ready");
        setRetryAction(null);
        return;
      }
      try {
        const runtimeData = await requestJson(
          `/api/v1/curriculum/modules/${moduleId}/runtime`,
          { method: "GET" },
        );
        setRuntime(isRuntime(runtimeData) ? runtimeData : null);
      } catch (caught) {
        if (caught instanceof PublicApiError && caught.code === "not_found") {
          setRuntime(null);
        } else {
          throw caught;
        }
      }
      try {
        const digitalCaseData = await requestJson(
          `/api/v1/curriculum/modules/${moduleId}/case`,
          { method: "GET" },
        );
        setDigitalCase(
          isDigitalCaseRuntime(digitalCaseData) ? digitalCaseData : null,
        );
      } catch (caught) {
        if (caught instanceof PublicApiError && caught.code === "not_found") {
          setDigitalCase(null);
        } else {
          throw caught;
        }
      }
      setActivityState("ready");
      setRetryAction(null);
    } catch (caught) {
      setActivityState("error");
      throw caught;
    }
  }

  async function loadJourney(): Promise<LearningJourneyProjection> {
    setJourneyState("loading");
    setRetryAction("journey");
    try {
      const data = await requestJson("/api/v1/learning-path", {
        method: "GET",
      });
      if (!isJourney(data))
        throw new PublicApiError(
          "internal_error",
          "invalid journey projection",
        );
      setJourney(data);
      setJourneyState(data.activities.length === 0 ? "empty" : "ready");
      setRetryAction(null);
      return data;
    } catch (caught) {
      setJourneyState("error");
      throw caught;
    }
  }

  async function openJourneyActivity(
    loadedJourney: LearningJourneyProjection,
  ): Promise<void> {
    const requestedActivityId =
      activityId.trim().length > 0 ? activityId : initialActivityId();
    if (requestedActivityId.length > 0) {
      setActivityId(requestedActivityId);
      const requestedJourneyActivity = loadedJourney.activities.find(
        (item) => item.activityId === requestedActivityId,
      );
      await loadActivity(
        requestedActivityId,
        attemptFromJourneyActivity(requestedJourneyActivity),
      );
      return;
    }
    if (!canAutoOpenJourneyActivity(loadedJourney)) return;
    const nextActivity = orderedJourneyActivities(
      loadedJourney.activities,
    ).find((item) => item.nextAction !== "CONSULTAR_PROXIMO_PASSO");
    if (nextActivity !== undefined) {
      setActivityId(nextActivity.activityId);
      await loadActivity(
        nextActivity.activityId,
        attemptFromJourneyActivity(nextActivity),
      );
    }
  }

  async function signIn(): Promise<void> {
    setBusy(true);
    setError(null);
    setNotice(null);
    setRetryAction(null);
    try {
      await requestJson("/api/v1/auth/login", {
        method: "POST",
        body: { login, password, sessionExpiresInSeconds: 3600 },
      });
    } catch (caught) {
      setRetryAction("login");
      setError(publicErrorMessage(caught));
      setBusy(false);
      return;
    }

    setAuthenticated(true);
    setPassword("");
    setNotice("Login realizado.");
    try {
      const loadedJourney = await loadJourney();
      await openJourneyActivity(loadedJourney);
    } catch (caught) {
      setError(publicErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  function handleLogin(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void signIn();
  }

  async function handleFeedbackSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (feedbackDescription.trim().length === 0) {
      setError("Descreva o problema ou a melhoria antes de enviar.");
      return;
    }
    setFeedbackState("sending");
    setError(null);
    setNotice(null);
    try {
      await requestJson("/api/v1/feedback", {
        method: "POST",
        body: {
          type: feedbackType,
          description: feedbackDescription.trim(),
        },
      });
      setFeedbackDescription("");
      setFeedbackState("sent");
      setNotice("Relato registrado.");
    } catch (caught) {
      setFeedbackState("idle");
      setError(publicErrorMessage(caught));
    }
  }

  async function restoreSession(): Promise<void> {
    try {
      await requestJson("/api/v1/session", { method: "GET" });
    } catch {
      return;
    }

    setAuthenticated(true);
    try {
      const loadedJourney = await loadJourney();
      await openJourneyActivity(loadedJourney);
    } catch (caught) {
      setError(publicErrorMessage(caught));
    }
  }

  async function refreshJourney(): Promise<void> {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const loadedJourney = await loadJourney();
      const nextActivityId =
        activityId.trim().length > 0
          ? activityId
          : canAutoOpenJourneyActivity(loadedJourney)
            ? orderedJourneyActivities(loadedJourney.activities).find(
                (item) => item.nextAction !== "CONSULTAR_PROXIMO_PASSO",
              )?.activityId
            : undefined;
      if (nextActivityId !== undefined && nextActivityId.length > 0) {
        setActivityId(nextActivityId);
        const nextActivity = loadedJourney.activities.find(
          (item) => item.activityId === nextActivityId,
        );
        await loadActivity(
          nextActivityId,
          attemptFromJourneyActivity(nextActivity),
        );
      }
      setNotice("Jornada atualizada.");
    } catch (caught) {
      setError(publicErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function refreshActivity(): Promise<void> {
    if (activityId.trim().length === 0) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await loadActivity(activityId);
      setNotice("Atividade atualizada.");
    } catch (caught) {
      setError(publicErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  function handleRetry(): void {
    if (retryAction === "login") void signIn();
    if (retryAction === "journey") void refreshJourney();
    if (retryAction === "activity") void refreshActivity();
  }

  async function handleStartAttempt(): Promise<void> {
    if (activity === null) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const data = await requestJson("/api/v1/attempts", {
        method: "POST",
        body: {
          activityId: activity.activityId,
          idempotencyKey: idempotencyKey("start"),
        },
      });
      if (!isAttempt(data))
        throw new PublicApiError(
          "internal_error",
          "invalid attempt projection",
        );
      setAttempt(data);
      setAnswers((previous) => ({
        ...previous,
        ...answersFromAttempt(data),
      }));
      setQuestionPage(0);
      setPageSaveState("idle");
      setNotice("Tentativa iniciada.");
    } catch (caught) {
      setError(publicErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  function handleChoiceChange(
    item: ActivityItem,
    choiceId: string,
    checked: boolean,
  ): void {
    const current = selectedChoiceIds(item, answers[item.itemId]);
    const next =
      item.selectionMode === "MULTIPLE"
        ? checked
          ? [...current, choiceId].filter(
              (value, index, values) => values.indexOf(value) === index,
            )
          : current.filter((value) => value !== choiceId)
        : checked
          ? [choiceId]
          : [];
    setAnswers((previous) => ({
      ...previous,
      [item.itemId]:
        item.selectionMode === "MULTIPLE"
          ? JSON.stringify(next)
          : (next[0] ?? ""),
    }));
  }

  async function handleAdvanceDigitalCase(item: ActivityItem): Promise<void> {
    if (
      activity === null ||
      attempt === null ||
      item.responseMode !== "CHOICE" ||
      item.digitalCaseStage === undefined ||
      digitalCase === null
    ) {
      return;
    }
    if (
      digitalCase.caseId !== item.digitalCaseStage.caseId ||
      digitalCase.currentStage !== item.digitalCaseStage.stage
    ) {
      setError("Esta etapa já foi registrada ou ainda não está liberada.");
      return;
    }
    const selected = selectedChoiceIds(item, answers[item.itemId]);
    if (selected.length === 0) {
      setError("Selecione uma decisão antes de liberar a próxima etapa.");
      focusAnswer(item);
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const answerData = await persistAnswer(item, attempt);
      const nextAttempt = mergeAttemptProjection(attempt, answerData);
      setAttempt(nextAttempt);
      const data = await requestJson(
        `/api/v1/curriculum/modules/${digitalCase.moduleId}/case/advance`,
        {
          method: "POST",
          body: {
            selectedChoiceIds: [...selected],
            expectedVersion: digitalCase.version,
          },
        },
      );
      if (!isDigitalCaseRuntime(data)) {
        throw new PublicApiError("internal_error", "invalid case projection");
      }
      setDigitalCase(data);
      setNotice("Decisão registrada. A próxima informação foi liberada.");
    } catch (caught) {
      setError(publicErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  function currentBlockItems(): readonly ActivityItem[] {
    if (activity === null) return [];
    const start = questionPage * ITEMS_PER_BLOCK;
    return activity.items.slice(start, start + ITEMS_PER_BLOCK);
  }

  function focusAnswer(item: ActivityItem): void {
    const target =
      item.responseMode === "TEXT"
        ? document.getElementById("answer-" + item.itemId)
        : item.responseMode === "STRUCTURED_FIELDS" ||
            item.responseMode === "DOSE_INFUSION"
          ? document.querySelector<HTMLInputElement>(
              'input[name="answer-' + item.itemId + '"]',
            )
          : document.querySelector<HTMLInputElement>(
              'input[name="answer-' + item.itemId + '"]',
            );
    target?.focus();
  }

  async function persistAnswer(
    item: ActivityItem,
    currentAttempt: AttemptProjection,
  ): Promise<AttemptProjection> {
    const data = await requestJson(
      "/api/v1/attempts/" + currentAttempt.attemptId + "/answers",
      {
        method: "POST",
        body: {
          attemptId: currentAttempt.attemptId,
          activityId: activity?.activityId ?? "",
          itemId: item.itemId,
          response: answers[item.itemId] ?? "",
          idempotencyKey: idempotencyKey("answer"),
        },
      },
    );
    if (!isAttempt(data))
      throw new PublicApiError("internal_error", "invalid answer projection");
    return data;
  }

  async function handleSaveAnswer(item: ActivityItem): Promise<void> {
    if (activity === null || attempt === null) return;
    if (!isAnswerComplete(item, answers[item.itemId])) {
      setError("Responda esta questão antes de salvar.");
      focusAnswer(item);
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const data = await persistAnswer(item, attempt);
      setAttempt((previous) => mergeAttemptProjection(previous, data));
      setPageSaveState("saved");
      setNotice("Resposta salva.");
    } catch (caught) {
      setError(publicErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function saveCurrentBlock(): Promise<AttemptProjection | null> {
    if (activity === null || attempt === null) return null;
    const blockItems = currentBlockItems();
    const incomplete = blockItems.find(
      (item) => !isAnswerComplete(item, answers[item.itemId]),
    );
    if (incomplete !== undefined) {
      setPageSaveState("idle");
      setError("Responda todas as questões deste bloco antes de avançar.");
      focusAnswer(incomplete);
      return null;
    }

    setBusy(true);
    setError(null);
    setNotice(null);
    setPageSaveState("saving");
    let currentAttempt = attempt;
    try {
      for (const item of blockItems) {
        if (item.responseMode === "NONE") continue;
        const data = await persistAnswer(item, currentAttempt);
        currentAttempt = mergeAttemptProjection(currentAttempt, data);
      }
      setAttempt(currentAttempt);
      setPageSaveState("saved");
      setNotice("Bloco salvo.");
      return currentAttempt;
    } catch (caught) {
      setPageSaveState("idle");
      setError(publicErrorMessage(caught));
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function handleNextPage(): Promise<void> {
    const savedAttempt = await saveCurrentBlock();
    if (savedAttempt === null || activity === null) return;
    const totalBlocks = Math.max(
      1,
      Math.ceil(activity.items.length / ITEMS_PER_BLOCK),
    );
    if (questionPage >= totalBlocks - 1) return;
    setQuestionPage((previous) => previous + 1);
    setPageSaveState("idle");
    setNotice("Bloco salvo. Próximo bloco liberado.");
    window.requestAnimationFrame(() => {
      document.getElementById("question-block-title")?.focus();
    });
  }

  async function handleSubmitAttempt(): Promise<void> {
    if (attempt === null || activity === null) return;
    const incomplete = activity.items.find(
      (item) => !isAnswerComplete(item, answers[item.itemId]),
    );
    if (incomplete !== undefined) {
      setError("Responda todas as questões antes de enviar a tentativa.");
      setQuestionPage(
        Math.floor(activity.items.indexOf(incomplete) / ITEMS_PER_BLOCK),
      );
      focusAnswer(incomplete);
      return;
    }
    const savedAttempt = await saveCurrentBlock();
    if (savedAttempt === null) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const data = await requestJson(
        "/api/v1/attempts/" + savedAttempt.attemptId + "/submit",
        {
          method: "POST",
          body: { idempotencyKey: idempotencyKey("submit") },
        },
      );
      if (!isAttempt(data))
        throw new PublicApiError(
          "internal_error",
          "invalid submission projection",
        );
      setAttempt((previous) => mergeAttemptProjection(previous, data));
      setNotice("Tentativa submetida.");
    } catch (caught) {
      setError(publicErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void restoreSession();
  }, []);

  const answerableItems =
    activity?.items.filter((item) => item.responseMode !== "NONE") ?? [];
  const answeredItemCount = answerableItems.filter((item) =>
    isAnswerComplete(item, answers[item.itemId]),
  ).length;
  const progressPercent =
    answerableItems.length === 0
      ? 0
      : Math.round((answeredItemCount / answerableItems.length) * 100);
  const totalBlocks =
    activity === null
      ? 0
      : Math.max(1, Math.ceil(activity.items.length / ITEMS_PER_BLOCK));
  const visibleItems =
    attempt === null
      ? (activity?.items.slice(0, ITEMS_PER_BLOCK) ?? [])
      : currentBlockItems();
  const currentBlockAnswerableItems = visibleItems.filter(
    (item) => item.responseMode !== "NONE",
  );
  const currentBlockAnsweredCount = currentBlockAnswerableItems.filter((item) =>
    isAnswerComplete(item, answers[item.itemId]),
  ).length;
  const blockStartOrdinal = visibleItems[0]?.ordinal ?? 0;
  const blockEndOrdinal = visibleItems[visibleItems.length - 1]?.ordinal ?? 0;
  const hasNextPage = questionPage < totalBlocks - 1;

  return (
    <main className="shell" id="main-content" tabIndex={-1} aria-busy={busy}>
      <header
        className={authenticated ? "topbar" : "topbar login-topbar"}
        aria-label="Identificação do ambiente"
      >
        <div>
          <p className="eyebrow">CVG · academia interna</p>
          <span className="brand">Treinamento veterinário</span>
        </div>
        {authenticated ? (
          <a className="admin-nav-link" href="/admin">
            Centro de controle
          </a>
        ) : null}
      </header>

      {busy ? (
        <div
          className="feedback pending"
          data-testid="loading-state"
          role="status"
          aria-live="polite"
        >
          Atualizando seu treinamento…
        </div>
      ) : null}

      {!authenticated ? (
        <section className="login-card" aria-labelledby="access-title">
          <div className="login-visual">
            <div className="login-kicker">
              <span className="login-kicker-icon" aria-hidden="true">
                ✦
              </span>
              Jornada de desenvolvimento clínico
            </div>
            <h1 id="access-title">Entrar no treinamento</h1>
            <p className="login-lede">Sua missão começa aqui</p>
            <p className="login-description">
              Avance por desafios, perguntas e decisões que transformam estudo
              em prática segura — um passo de cada vez.
            </p>

            <div className="login-mascot-stage">
              <div className="mascot-orbit mascot-orbit-one" />
              <div className="mascot-orbit mascot-orbit-two" />
              <LoginMascot />
              <div className="mascot-message">
                <span className="mascot-message-tail" aria-hidden="true" />
                <strong>Oi, eu sou o Caju.</strong>
                <span>Vou te acompanhar nessa jornada.</span>
              </div>
            </div>

            <div className="login-trail-preview" aria-label="Prévia da trilha">
              <div className="trail-step is-active">
                <span className="trail-step-number">01</span>
                <span>
                  <strong>Fundamentos</strong>
                  <small>Comece por aqui</small>
                </span>
              </div>
              <div className="trail-connector" aria-hidden="true" />
              <div className="trail-step">
                <span className="trail-step-number">02</span>
                <span>
                  <strong>Raciocínio clínico</strong>
                  <small>Desafios práticos</small>
                </span>
              </div>
              <div className="trail-connector" aria-hidden="true" />
              <div className="trail-step">
                <span className="trail-step-number">03</span>
                <span>
                  <strong>Consolidação</strong>
                  <small>Seu próximo nível</small>
                </span>
              </div>
            </div>
          </div>

          <div className="login-form-panel">
            <div className="form-panel-meta">
              <span className="form-panel-label">Acesso interno</span>
            </div>
            <h2>Bem-vindo de volta</h2>
            <p className="form-panel-intro">
              Entre com o e-mail profissional e continue de onde parou.
            </p>

            <section
              className="operational-notice"
              aria-labelledby="operational-notice-title"
            >
              <h3 id="operational-notice-title">{operationalNoticeTitle}</h3>
              <div className="operational-notice-grid">
                {operationalNotice.map((notice) => (
                  <div className="operational-notice-item" key={notice.id}>
                    <h4>{notice.heading}</h4>
                    <p>{notice.text}</p>
                  </div>
                ))}
              </div>
            </section>

            <form className="access-form login-form" onSubmit={handleLogin}>
              <label htmlFor="login">E-mail profissional</label>
              <p id="login-help" className="field-help">
                Use o e-mail cadastrado pela operação do ambiente.
              </p>
              <input
                id="login"
                name="login"
                type="email"
                autoComplete="username"
                aria-describedby="login-help"
                value={login}
                onChange={(event) => setLogin(event.target.value)}
                maxLength={320}
                required
              />
              <div className="password-label-row">
                <label htmlFor="password">Senha</label>
                <span className="password-rule">Mínimo de 12 caracteres</span>
              </div>
              <p id="password-help" className="field-help">
                Use a senha recebida no convite da operação.
              </p>
              <div className="password-field">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  aria-describedby="password-help"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={12}
                  maxLength={128}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  aria-controls="password"
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? "Ocultar senha" : "Mostrar senha"}
                </button>
              </div>
              <button className="login-submit" type="submit" disabled={busy}>
                <span>{busy ? "Abrindo jornada…" : "Entrar"}</span>
                <span className="submit-arrow" aria-hidden="true">
                  →
                </span>
              </button>
            </form>

            <div className="login-support">
              <span className="support-icon" aria-hidden="true">
                ✦
              </span>
              <p>
                <strong>Primeiro acesso?</strong> O superadmin cria seu acesso e
                envia um link individual para você definir sua senha.
              </p>
            </div>
            <p className="login-footer">
              Conteúdo interno · acesso individual · sem cadastro público
            </p>
          </div>
        </section>
      ) : activity === null ? (
        journeyState === "empty" ? (
          <section
            className="hero-card empty-state"
            data-testid="empty-state"
            aria-labelledby="empty-title"
          >
            <div className="hero-copy">
              <p className="eyebrow">Sessão ativa</p>
              <h1 id="empty-title">Nenhuma atividade atribuída</h1>
              <p>
                Sua sessão está ativa, mas ainda não há um módulo disponível.
                Atualize a jornada quando a equipe liberar o próximo conteúdo.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refreshJourney()}
              disabled={busy}
            >
              Atualizar jornada
            </button>
          </section>
        ) : journeyState === "error" ? (
          <section className="hero-card" aria-labelledby="journey-error-title">
            <div className="hero-copy">
              <p className="eyebrow">Sessão ativa</p>
              <h1 id="journey-error-title">Jornada indisponível</h1>
              <p>
                Não conseguimos atualizar as atividades agora. Sua sessão
                permanece protegida; tente novamente em instantes.
              </p>
            </div>
            <button type="button" onClick={handleRetry} disabled={busy}>
              Tentar novamente
            </button>
          </section>
        ) : (
          <section className="hero-card" aria-labelledby="active-title">
            <div className="hero-copy">
              <p className="eyebrow">Sessão ativa</p>
              <h1 id="active-title">Acesso ativado</h1>
              <p>
                {journey === null
                  ? "Abra uma atividade atribuída para continuar seu treinamento."
                  : "Sua jornada está pronta para orientar o próximo passo."}
              </p>
            </div>
            {journey !== null ? (
              <div className="journey-summary" aria-label="Minha jornada">
                <p className="eyebrow">Minha jornada</p>
                <h2>{nextActionLabel(journey.nextAction)}</h2>
                {journey.activities.length === 0 ? (
                  <p className="journey-item">Nenhuma atividade atribuída.</p>
                ) : (
                  journey.activities.slice(0, 3).map((item) => (
                    <p className="journey-item" key={item.activityId}>
                      {item.title} · {nextActionLabel(item.nextAction)}
                    </p>
                  ))
                )}
              </div>
            ) : null}
          </section>
        )
      ) : (
        <section className="learning-layout" aria-labelledby="activity-title">
          <div className="content-column">
            {activityState === "error" ? (
              <p className="feedback warning" role="status">
                Esta é a última versão carregada. A atualização falhou; você
                pode tentar novamente.
              </p>
            ) : null}
            <div className="section-heading">
              <div>
                <p className="eyebrow">Atividade atribuída</p>
                <h1 id="activity-title">{activity.title}</h1>
              </div>
              <span className="status-pill">
                {attempt?.status ?? "Disponível"}
              </span>
            </div>
            <p className="intro">
              Responda no seu ritmo. O sistema salva apenas a sua projeção de
              aprendizagem e permite retomar depois.
            </p>
            {attempt === null ? (
              <section
                className="attempt-launch-card"
                data-testid="attempt-launch"
              >
                <div>
                  <p className="eyebrow">Primeiro passo</p>
                  <h2>Pronto para começar?</h2>
                  <p>
                    Você responderá a atividade em blocos de até três questões.
                    O progresso fica salvo a cada avanço.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleStartAttempt()}
                  disabled={busy}
                >
                  Iniciar tentativa <span aria-hidden="true">→</span>
                </button>
              </section>
            ) : (
              <section
                className="activity-progress"
                aria-label="Progresso da atividade"
              >
                <div className="progress-copy">
                  <div>
                    <p className="eyebrow">Progresso da atividade</p>
                    <strong>
                      {answeredItemCount} de {answerableItems.length}{" "}
                      respondidas
                    </strong>
                  </div>
                  <span className="progress-status">
                    {pageSaveState === "saving"
                      ? "Salvando…"
                      : pageSaveState === "saved"
                        ? "Salvo"
                        : progressPercent + "%"}
                  </span>
                </div>
                <div
                  className="progress-track"
                  role="progressbar"
                  aria-label="Progresso da atividade"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progressPercent}
                  aria-valuetext={
                    answeredItemCount +
                    " de " +
                    answerableItems.length +
                    " respondidas"
                  }
                >
                  <span style={{ width: progressPercent + "%" }} />
                </div>
              </section>
            )}
            {attempt !== null ? (
              <div className="question-block-heading">
                <div>
                  <p className="eyebrow">
                    Bloco {questionPage + 1} de {totalBlocks}
                  </p>
                  <h2 id="question-block-title" tabIndex={-1}>
                    Questões {blockStartOrdinal}–{blockEndOrdinal}
                  </h2>
                </div>
                <span>
                  {currentBlockAnsweredCount} de{" "}
                  {currentBlockAnswerableItems.length} respondidas
                </span>
              </div>
            ) : (
              <p className="activity-preview-note">
                Prévia da atividade · inicie a tentativa para liberar as
                respostas.
              </p>
            )}
            <div className="item-list">
              {visibleItems.map((item) => (
                <article
                  className={
                    attempt === null
                      ? "item-card item-card-preview"
                      : "item-card"
                  }
                  key={item.itemId}
                >
                  <div className="item-meta">
                    <span>Item {item.ordinal}</span>
                    <span>{item.kind}</span>
                  </div>
                  <h2>{item.title}</h2>
                  <p>{item.text}</p>
                  {item.digitalCaseStage !== undefined ? (
                    <aside
                      className="case-stage-note"
                      aria-label="Caso digital"
                    >
                      <strong>
                        Caso digital · etapa {item.digitalCaseStage.stage} de 3
                      </strong>
                      {digitalCase?.caseId === item.digitalCaseStage.caseId ? (
                        <span>
                          Estado salvo: etapa {digitalCase.currentStage} ·
                          versão {digitalCase.version}.
                        </span>
                      ) : null}
                      <span>Exames seriados disponíveis no cenário:</span>
                      <ul>
                        {item.digitalCaseStage.examSeries.map((exam) => (
                          <li key={exam.id}>
                            {exam.modality} · {exam.label} (
                            {exam.observationCount} leituras)
                          </li>
                        ))}
                      </ul>
                    </aside>
                  ) : null}
                  {item.responseMode === "CHOICE" &&
                  attempt !== null &&
                  item.choices !== undefined ? (
                    <fieldset className="answer-area">
                      <legend>Selecione sua resposta</legend>
                      {item.choices.map((choice) => {
                        const selected = selectedChoiceIds(
                          item,
                          answers[item.itemId],
                        ).includes(choice.id);
                        return (
                          <label className="answer-option" key={choice.id}>
                            <input
                              type={
                                item.selectionMode === "MULTIPLE"
                                  ? "checkbox"
                                  : "radio"
                              }
                              name={`answer-${item.itemId}`}
                              value={choice.id}
                              checked={selected}
                              onChange={(event) =>
                                handleChoiceChange(
                                  item,
                                  choice.id,
                                  event.target.checked,
                                )
                              }
                            />
                            <span>
                              <strong>{choice.label})</strong> {choice.text}
                            </span>
                          </label>
                        );
                      })}
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => void handleSaveAnswer(item)}
                        disabled={
                          busy ||
                          selectedChoiceIds(item, answers[item.itemId])
                            .length === 0
                        }
                      >
                        Salvar resposta
                      </button>
                      {item.digitalCaseStage !== undefined ? (
                        <button
                          type="button"
                          className="secondary-button case-advance-button"
                          onClick={() => void handleAdvanceDigitalCase(item)}
                          disabled={
                            busy ||
                            digitalCase === null ||
                            digitalCase.caseId !==
                              item.digitalCaseStage.caseId ||
                            digitalCase.currentStage !==
                              item.digitalCaseStage.stage ||
                            selectedChoiceIds(item, answers[item.itemId])
                              .length === 0
                          }
                        >
                          Registrar decisão e liberar próxima etapa
                        </button>
                      ) : null}
                    </fieldset>
                  ) : item.responseMode === "TEXT" && attempt !== null ? (
                    <div className="answer-area">
                      <label htmlFor={`answer-${item.itemId}`}>
                        Resposta — {item.title}
                      </label>
                      <textarea
                        id={`answer-${item.itemId}`}
                        value={answers[item.itemId] ?? ""}
                        onChange={(event) =>
                          setAnswers((previous) => ({
                            ...previous,
                            [item.itemId]: event.target.value,
                          }))
                        }
                        maxLength={10_000}
                        rows={5}
                      />
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => void handleSaveAnswer(item)}
                        disabled={
                          busy || !isAnswerComplete(item, answers[item.itemId])
                        }
                      >
                        Salvar resposta
                      </button>
                    </div>
                  ) : (item.responseMode === "STRUCTURED_FIELDS" ||
                      item.responseMode === "DOSE_INFUSION") &&
                    attempt !== null &&
                    item.interaction !== undefined ? (
                    <div className="answer-area structured-answer-area">
                      {item.interaction.kind === "DOSE_INFUSION" ? (
                        <p className="structured-formula">
                          Dados do exercício: peso{" "}
                          {item.interaction.calculationInputs?.weightKg} kg ·
                          dose/kg{" "}
                          {item.interaction.calculationInputs?.doseMgPerKg}{" "}
                          mg/kg · concentração{" "}
                          {
                            item.interaction.calculationInputs
                              ?.concentrationMgPerMl
                          }{" "}
                          mg/mL · tempo{" "}
                          {item.interaction.calculationInputs?.durationHours} h.
                          <br />
                          Fórmula: {item.interaction.formulaLabel}
                        </p>
                      ) : null}
                      {item.interaction.fields.map((field) => {
                        const currentValue = structuredAnswerValue(
                          answers[item.itemId],
                          field.id,
                        );
                        return (
                          <label
                            className="structured-field"
                            htmlFor={"answer-" + item.itemId + "-" + field.id}
                            key={field.id}
                          >
                            <span>
                              {field.label}
                              {field.unit === undefined
                                ? ""
                                : " (" + field.unit + ")"}
                            </span>
                            {field.valueType === "BOOLEAN" ? (
                              <input
                                id={"answer-" + item.itemId + "-" + field.id}
                                name={"answer-" + item.itemId}
                                type="checkbox"
                                checked={currentValue === true}
                                onChange={(event) =>
                                  setAnswers((previous) => ({
                                    ...previous,
                                    [item.itemId]: updateStructuredAnswer(
                                      previous[item.itemId],
                                      field.id,
                                      event.target.checked,
                                    ),
                                  }))
                                }
                              />
                            ) : (
                              <input
                                id={"answer-" + item.itemId + "-" + field.id}
                                name={"answer-" + item.itemId}
                                type={
                                  field.valueType === "NUMBER"
                                    ? "number"
                                    : "text"
                                }
                                value={
                                  currentValue === undefined
                                    ? ""
                                    : String(currentValue)
                                }
                                min={field.min}
                                max={field.max}
                                step={
                                  field.valueType === "NUMBER"
                                    ? "any"
                                    : undefined
                                }
                                onChange={(event) => {
                                  const rawValue = event.target.value;
                                  const parsedNumber = Number(rawValue);
                                  const nextValue =
                                    rawValue.trim().length === 0
                                      ? undefined
                                      : field.valueType === "NUMBER"
                                        ? Number.isFinite(parsedNumber)
                                          ? parsedNumber
                                          : undefined
                                        : rawValue;
                                  setAnswers((previous) => ({
                                    ...previous,
                                    [item.itemId]: updateStructuredAnswer(
                                      previous[item.itemId],
                                      field.id,
                                      nextValue,
                                    ),
                                  }));
                                }}
                              />
                            )}
                          </label>
                        );
                      })}
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => void handleSaveAnswer(item)}
                        disabled={
                          busy || !isAnswerComplete(item, answers[item.itemId])
                        }
                      >
                        Salvar resposta
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
            {attempt !== null ? (
              <div className="question-navigation">
                <button
                  type="button"
                  className="secondary-button navigation-back"
                  onClick={() => {
                    setQuestionPage((previous) => Math.max(0, previous - 1));
                    setPageSaveState("idle");
                  }}
                  disabled={busy || questionPage === 0}
                >
                  ← Voltar
                </button>
                <div className="question-navigation-main">
                  {hasNextPage ? (
                    <button
                      type="button"
                      onClick={() => void handleNextPage()}
                      disabled={busy}
                    >
                      {pageSaveState === "saving"
                        ? "Salvando…"
                        : "Salvar e avançar"}
                      <span aria-hidden="true">→</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void saveCurrentBlock()}
                      disabled={busy}
                    >
                      {pageSaveState === "saving"
                        ? "Salvando…"
                        : "Salvar bloco"}
                    </button>
                  )}
                  {!hasNextPage ? (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => void handleSubmitAttempt()}
                      disabled={busy || attempt.status === "SUBMETIDA"}
                    >
                      Enviar tentativa
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
          <aside className="privacy-card" aria-label="Proteção de dados">
            <p className="eyebrow">Superfície do participante</p>
            <h2>Somente o necessário</h2>
            <p>
              Fontes, fotos, PDFs, OCR, prompts e decisões internas ficam fora
              desta tela. A atividade chega como uma projeção autorizada.
            </p>
            {journey !== null ? (
              <div className="journey-card" aria-label="Minha jornada">
                <p className="eyebrow">Minha jornada</p>
                <h2>{nextActionLabel(journey.nextAction)}</h2>
                <p>
                  {journey.activities.length} atividade
                  {journey.activities.length === 1 ? "" : "s"} no caminho atual.
                </p>
              </div>
            ) : null}
            {runtime !== null ? (
              <div className="runtime-card" aria-label="Estado do módulo">
                <p className="eyebrow">Próxima ação</p>
                <h2>{runtime.nextAction}</h2>
                <p>
                  Estado digital: {runtime.status}
                  {runtime.scorePercent === undefined
                    ? ""
                    : ` · ${runtime.scorePercent}%`}
                </p>
                {runtime.remediationCount > 0 ? (
                  <p>Objetivos para reforço: {runtime.remediationCount}.</p>
                ) : null}
                {runtime.retentionReviews.length > 0 ? (
                  <p>Retenções pendentes: {runtime.retentionReviews.length}.</p>
                ) : null}
                <small>
                  Resultado digital não comprova competência prática nem
                  autoriza procedimento.
                </small>
              </div>
            ) : null}
          </aside>
        </section>
      )}

      {authenticated ? (
        <section
          className="feedback-report-card"
          aria-labelledby="feedback-report-title"
        >
          <div>
            <p className="eyebrow">Canal protegido</p>
            <h2 id="feedback-report-title">Relatar um problema ou melhoria</h2>
            <p>
              Envie somente contexto do treinamento. Não inclua prontuários,
              dados de tutores, fotos, PDFs, respostas ou outros dados reais.
            </p>
          </div>
          <form
            className="feedback-report-form"
            onSubmit={(event) => void handleFeedbackSubmit(event)}
          >
            <label htmlFor="feedback-type">Tipo do relato</label>
            <select
              id="feedback-type"
              value={feedbackType}
              onChange={(event) =>
                setFeedbackType(event.target.value as FeedbackType)
              }
              disabled={feedbackState === "sending"}
            >
              <option value="BUG_TECNICO">Bug técnico</option>
              <option value="USABILIDADE">Usabilidade</option>
              <option value="ERRO_CONTEUDO">Erro de conteúdo</option>
              <option value="MELHORIA">Melhoria</option>
              <option value="CONTESTACAO">Contestação</option>
            </select>
            <label htmlFor="feedback-description">Descrição</label>
            <textarea
              id="feedback-description"
              value={feedbackDescription}
              onChange={(event) => setFeedbackDescription(event.target.value)}
              maxLength={10_000}
              rows={4}
              placeholder="Descreva o que aconteceu ou o que poderia melhorar."
              disabled={feedbackState === "sending"}
              required
            />
            <button
              type="submit"
              className="secondary-button"
              disabled={feedbackState === "sending"}
            >
              {feedbackState === "sending" ? "Enviando…" : "Enviar relato"}
            </button>
            {feedbackState === "sent" ? (
              <p className="feedback success" role="status">
                Relato registrado.
              </p>
            ) : null}
          </form>
        </section>
      ) : null}

      {error !== null ? (
        <div className="feedback-group">
          <p className="feedback error" role="alert">
            {error}
          </p>
          {retryAction !== null ? (
            <button type="button" onClick={handleRetry} disabled={busy}>
              Tentar novamente
            </button>
          ) : null}
        </div>
      ) : null}
      {notice !== null ? (
        <p className="feedback success" role="status">
          {notice}
        </p>
      ) : null}
    </main>
  );
}
