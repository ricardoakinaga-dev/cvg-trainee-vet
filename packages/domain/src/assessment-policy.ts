import { isValidIsoTimestamp } from "./timestamp.js";

export type AssessmentDataStatus =
  "RESPONDIDO" | "DADO_INCOMPLETO" | "NAO_APLICAVEL";

export type AssessmentComponent = Readonly<{
  readonly kind: "CASO" | "PROVA";
  readonly status: AssessmentDataStatus;
  readonly scorePercent?: number;
}>;

export type ObjectiveAssessmentInput = Readonly<{
  readonly objectiveId: string;
  readonly percent?: number;
  readonly critical: boolean;
  readonly status?: AssessmentDataStatus;
}>;

export type SummativeAssessmentStatus =
  "APROVADO" | "REFORCO" | "PENDENTE_DADOS";

export type SummativeAssessmentDecision = Readonly<{
  readonly status: SummativeAssessmentStatus;
  readonly scorePercent?: number;
  readonly quizWeightPercent: 0;
  readonly caseWeightPercent: 30;
  readonly examWeightPercent: 70;
  readonly criticalObjectiveIdsBelowThreshold: readonly string[];
  readonly pendingObjectiveIds: readonly string[];
}>;

export class AssessmentPolicyError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "AssessmentPolicyError";
  }
}

function freeze<T>(value: T): Readonly<T> {
  return Object.freeze(value);
}

function assertNonEmpty(
  value: unknown,
  field: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AssessmentPolicyError(`${field} must not be empty`);
  }
}

function assertPercent(value: unknown, field: string): asserts value is number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > 100
  ) {
    throw new AssessmentPolicyError(
      `${field} must be an integer from 0 to 100`,
    );
  }
}

function normalizeComponent(
  component: AssessmentComponent,
  field: string,
): AssessmentComponent {
  if (component === null || typeof component !== "object") {
    throw new AssessmentPolicyError(`${field} must be an assessment component`);
  }
  if (component.status === "RESPONDIDO") {
    assertPercent(component.scorePercent, `${field}.scorePercent`);
  } else if (
    component.status !== "DADO_INCOMPLETO" &&
    component.status !== "NAO_APLICAVEL"
  ) {
    throw new AssessmentPolicyError(`${field}.status is not supported`);
  } else if (component.scorePercent !== undefined) {
    throw new AssessmentPolicyError(
      `${field}.scorePercent is not allowed for incomplete or non-applicable data`,
    );
  }
  return component;
}

function objectiveStatus(
  objective: ObjectiveAssessmentInput,
): AssessmentDataStatus {
  if (objective.status !== undefined) return objective.status;
  return objective.percent === undefined ? "DADO_INCOMPLETO" : "RESPONDIDO";
}

type SummativeAssessmentInput = Readonly<{
  readonly caseComponent: AssessmentComponent;
  readonly examComponent: AssessmentComponent;
  readonly quizPercent?: number;
  readonly objectives: readonly ObjectiveAssessmentInput[];
}>;

type ObjectiveSignals = Readonly<{
  readonly criticalObjectiveIdsBelowThreshold: readonly string[];
  readonly pendingObjectiveIds: readonly string[];
}>;

function normalizeSummativeComponents(input: SummativeAssessmentInput) {
  const caseComponent = normalizeComponent(
    input.caseComponent,
    "caseComponent",
  );
  const examComponent = normalizeComponent(
    input.examComponent,
    "examComponent",
  );
  if (caseComponent.kind !== "CASO") {
    throw new AssessmentPolicyError("caseComponent must have kind CASO");
  }
  if (examComponent.kind !== "PROVA") {
    throw new AssessmentPolicyError("examComponent must have kind PROVA");
  }
  if (input.quizPercent !== undefined) {
    assertPercent(input.quizPercent, "quizPercent");
  }
  return Object.freeze({ caseComponent, examComponent });
}

function collectObjectiveSignals(
  objectives: readonly ObjectiveAssessmentInput[],
): ObjectiveSignals {
  const seenObjectives = new Set<string>();
  const criticalObjectiveIdsBelowThreshold: string[] = [];
  const pendingObjectiveIds: string[] = [];
  for (const objective of objectives) {
    assertNonEmpty(objective.objectiveId, "objectiveId");
    if (seenObjectives.has(objective.objectiveId)) {
      throw new AssessmentPolicyError("objectiveId must be unique");
    }
    seenObjectives.add(objective.objectiveId);
    const status = objectiveStatus(objective);
    if (
      status !== "RESPONDIDO" &&
      status !== "DADO_INCOMPLETO" &&
      status !== "NAO_APLICAVEL"
    ) {
      throw new AssessmentPolicyError("objective status is not supported");
    }
    if (status === "RESPONDIDO") {
      assertPercent(objective.percent, "objective.percent");
      if (objective.critical && objective.percent < 80) {
        criticalObjectiveIdsBelowThreshold.push(objective.objectiveId);
      }
    } else if (objective.percent !== undefined) {
      throw new AssessmentPolicyError(
        "objective.percent is not allowed for incomplete or non-applicable data",
      );
    } else if (status === "DADO_INCOMPLETO") {
      pendingObjectiveIds.push(objective.objectiveId);
    }
  }
  return Object.freeze({
    criticalObjectiveIdsBelowThreshold: Object.freeze([
      ...criticalObjectiveIdsBelowThreshold,
    ]),
    pendingObjectiveIds: Object.freeze([...pendingObjectiveIds]),
  });
}

function pendingDecision(
  signals: ObjectiveSignals,
): SummativeAssessmentDecision {
  return freeze({
    status: "PENDENTE_DADOS",
    quizWeightPercent: 0,
    caseWeightPercent: 30,
    examWeightPercent: 70,
    criticalObjectiveIdsBelowThreshold: freeze([
      ...signals.criticalObjectiveIdsBelowThreshold,
    ]),
    pendingObjectiveIds: freeze([...signals.pendingObjectiveIds]),
  });
}

function scoreSummativeComponents(
  components: readonly Readonly<{
    readonly component: AssessmentComponent;
    readonly weight: number;
  }>[],
  signals: ObjectiveSignals,
): SummativeAssessmentDecision {
  if (
    components.some(({ component }) => component.status === "DADO_INCOMPLETO")
  ) {
    return pendingDecision(signals);
  }
  const applicable = components.filter(
    ({ component }) => component.status === "RESPONDIDO",
  );
  const totalWeight = applicable.reduce(
    (total, item) => total + item.weight,
    0,
  );
  if (totalWeight === 0 || signals.pendingObjectiveIds.length > 0) {
    return pendingDecision(signals);
  }

  const weightedScore = applicable.reduce(
    (total, { component, weight }) =>
      total + (component.scorePercent as number) * weight,
    0,
  );
  const scorePercent = Math.round(weightedScore / totalWeight);
  return freeze({
    status:
      scorePercent >= 70 &&
      signals.criticalObjectiveIdsBelowThreshold.length === 0
        ? "APROVADO"
        : "REFORCO",
    scorePercent,
    quizWeightPercent: 0,
    caseWeightPercent: 30,
    examWeightPercent: 70,
    criticalObjectiveIdsBelowThreshold: freeze([
      ...signals.criticalObjectiveIdsBelowThreshold,
    ]),
    pendingObjectiveIds: freeze([...signals.pendingObjectiveIds]),
  });
}

export function evaluateSummativeAssessment(
  input: SummativeAssessmentInput,
): SummativeAssessmentDecision {
  const normalized = normalizeSummativeComponents(input);
  const signals = collectObjectiveSignals(input.objectives);
  const components = [
    { component: normalized.caseComponent, weight: 30 },
    { component: normalized.examComponent, weight: 70 },
  ] as const;
  return scoreSummativeComponents(components, signals);
}

export type SummativeAttemptHistory = Readonly<{
  readonly attemptCount: number;
  readonly lastSubmittedAt?: string;
  readonly remediationCompleted: boolean;
  readonly previousItemIds: readonly (readonly string[])[];
}>;

export type SummativeAttemptEligibility = Readonly<
  | { readonly eligible: true; readonly reason: "ELIGIBLE" }
  | {
      readonly eligible: false;
      readonly reason:
        "REMEDIACAO_OBRIGATORIA" | "INTERVALO_MINIMO" | "ITENS_REPETIDOS";
      readonly nextAllowedAt?: string;
    }
>;

function assertUniqueItemIds(itemIds: readonly string[], field: string): void {
  if (itemIds.length === 0) {
    throw new AssessmentPolicyError(`${field} must not be empty`);
  }
  const seen = new Set<string>();
  for (const itemId of itemIds) {
    assertNonEmpty(itemId, `${field} itemId`);
    if (seen.has(itemId)) {
      throw new AssessmentPolicyError(`${field} itemIds must be unique`);
    }
    seen.add(itemId);
  }
}

export function evaluateSummativeAttemptEligibility(
  input: Readonly<{
    readonly now: string;
    readonly itemIds: readonly string[];
    readonly history: SummativeAttemptHistory;
  }>,
): SummativeAttemptEligibility {
  if (!isValidIsoTimestamp(input.now)) {
    throw new AssessmentPolicyError("now must be a valid timestamp");
  }
  assertUniqueItemIds(input.itemIds, "itemIds");
  if (
    !Number.isInteger(input.history.attemptCount) ||
    input.history.attemptCount < 0
  ) {
    throw new AssessmentPolicyError(
      "attemptCount must be a non-negative integer",
    );
  }
  if (typeof input.history.remediationCompleted !== "boolean") {
    throw new AssessmentPolicyError("remediationCompleted must be boolean");
  }
  if (
    input.history.attemptCount > 0 &&
    !isValidIsoTimestamp(input.history.lastSubmittedAt)
  ) {
    throw new AssessmentPolicyError(
      "lastSubmittedAt is required for previous attempts",
    );
  }

  for (const previousItemIds of input.history.previousItemIds) {
    assertUniqueItemIds(previousItemIds, "previousItemIds");
    if (previousItemIds.some((itemId) => input.itemIds.includes(itemId))) {
      return freeze({ eligible: false, reason: "ITENS_REPETIDOS" });
    }
  }

  if (input.history.attemptCount >= 2 && !input.history.remediationCompleted) {
    return freeze({ eligible: false, reason: "REMEDIACAO_OBRIGATORIA" });
  }

  if (input.history.lastSubmittedAt !== undefined) {
    const nextAllowedAt = new Date(
      Date.parse(input.history.lastSubmittedAt) + 7 * 24 * 60 * 60 * 1_000,
    ).toISOString();
    if (Date.parse(input.now) < Date.parse(nextAllowedAt)) {
      return freeze({
        eligible: false,
        reason: "INTERVALO_MINIMO",
        nextAllowedAt,
      });
    }
  }

  return freeze({ eligible: true, reason: "ELIGIBLE" });
}
