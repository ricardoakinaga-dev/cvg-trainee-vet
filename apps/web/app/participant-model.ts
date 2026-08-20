export type ActivityItem = Readonly<{
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

export type ActivityProjection = Readonly<{
  readonly activityId: string;
  readonly slug: string;
  readonly title: string;
  readonly items: readonly ActivityItem[];
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

export type CurriculumRuntimeProjection = Readonly<{
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

export type DigitalCaseRuntimeProjection = Readonly<{
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
}>;

export type ApiRecord = Readonly<Record<string, unknown>>;

export type SessionProjection = Readonly<{
  readonly status: "active";
  readonly canAccessAdmin: boolean;
}>;

const apiBase = process.env.NEXT_PUBLIC_CVG_API_BASE_URL ?? "";

export type ExperienceState = "idle" | "loading" | "ready" | "empty" | "error";
export type RetryAction = "login" | "journey" | "activity" | null;

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

export function isSessionProjection(
  value: unknown,
): value is SessionProjection {
  return (
    isRecord(value) &&
    value.status === "active" &&
    typeof value.canAccessAdmin === "boolean"
  );
}

export function isString(value: unknown): value is string {
  return typeof value === "string";
}

export function isChoice(value: unknown): value is Readonly<{
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

export function isStructuredInteraction(
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

export function isDigitalCaseStage(
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

export function isActivity(value: unknown): value is ActivityProjection {
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

export function isAttempt(value: unknown): value is AttemptProjection {
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

export function isRuntime(
  value: unknown,
): value is CurriculumRuntimeProjection {
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

export function isJourneyActivity(
  value: unknown,
): value is JourneyActivityProjection {
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

export function isDigitalCaseRuntime(
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

export function isJourney(value: unknown): value is LearningJourneyProjection {
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

export function nextActionLabel(value: string): string {
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

export function moduleIdFromActivity(
  activity: Readonly<{ readonly slug: string }>,
): string | null {
  const match = /(?:^|-)m(0[1-9]|1[0-9]|2[0-4])(?:-|$)/iu.exec(activity.slug);
  return match?.[1] === undefined ? null : `M${match[1]}`;
}

export function journeyActivityOrder(
  activity: JourneyActivityProjection,
): number {
  const moduleId = moduleIdFromActivity(activity);
  if (moduleId === null) return Number.POSITIVE_INFINITY;
  return Number(moduleId.slice(1));
}

export function orderedJourneyActivities(
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

export function canAutoOpenJourneyActivity(
  journey: LearningJourneyProjection,
): boolean {
  return (
    journey.nextAction === "INICIAR_ATIVIDADE" ||
    journey.nextAction === "RETOMAR_ATIVIDADE" ||
    journey.nextAction === "AGUARDAR_CORRECAO" ||
    journey.nextAction === "REVISAR_PROXIMO_CONTEUDO"
  );
}

export function publicErrorMessage(error: unknown): string {
  if (error instanceof PublicApiError && error.code === "unauthenticated") {
    return "Login ou senha inválidos.";
  }
  if (error instanceof PublicApiError && error.code === "validation_error") {
    return "Informe um e-mail profissional e uma senha válida.";
  }
  return "Não foi possível concluir a operação. Tente novamente.";
}

export function idempotencyKey(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function selectedChoiceIds(
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

export type StructuredAnswerValue = string | number | boolean;

export function structuredValues(
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

export function structuredAnswerValue(
  value: string | undefined,
  fieldId: string,
): StructuredAnswerValue | undefined {
  return structuredValues(value)[fieldId];
}

export function updateStructuredAnswer(
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

export const ITEMS_PER_BLOCK = 3;
export type PageSaveState = "idle" | "saving" | "saved";
export type FeedbackType =
  "BUG_TECNICO" | "USABILIDADE" | "ERRO_CONTEUDO" | "MELHORIA" | "CONTESTACAO";
export type FeedbackState = "idle" | "sending" | "sent";

export function answersFromAttempt(
  attempt: AttemptProjection | null,
): Readonly<Record<string, string>> {
  if (attempt === null) return {};
  return Object.fromEntries(
    attempt.answers.map((answer) => [answer.itemId, answer.response]),
  );
}

export function mergeAttemptProjection(
  previous: AttemptProjection | null,
  next: AttemptProjection,
): AttemptProjection {
  const answerByItem = new Map(
    (previous?.answers ?? []).map((answer) => [answer.itemId, answer]),
  );
  for (const answer of next.answers) answerByItem.set(answer.itemId, answer);
  return { ...next, answers: Array.from(answerByItem.values()) };
}

export function isAnswerComplete(
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

export function attemptFromJourneyActivity(
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

export async function requestJson(
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

export function initialActivityId(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("activityId") ?? "";
}
