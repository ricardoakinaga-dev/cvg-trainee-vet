import {
  digitalCaseBranches,
  digitalCaseExamSeries,
} from "./learning-case-definition-data.js";

export type StructuredScalar = string | number | boolean;

export type StructuredFieldValueType = "NUMBER" | "TEXT" | "BOOLEAN";

export type StructuredFieldDefinition = Readonly<{
  readonly id: string;
  readonly label: string;
  readonly valueType: StructuredFieldValueType;
  readonly unit?: string;
  readonly required: true;
  readonly min?: number;
  readonly max?: number;
}>;

export type StructuredRubricCriterion = Readonly<{
  readonly fieldId: string;
  readonly expectedValue: StructuredScalar;
  readonly tolerance?: number;
  readonly points: number;
}>;

export type StructuredResponseSpec = Readonly<{
  readonly kind: "STRUCTURED_FIELDS";
  readonly fields: readonly StructuredFieldDefinition[];
  readonly rubric: Readonly<{
    readonly criteria: readonly StructuredRubricCriterion[];
    readonly passScore: number;
  }>;
}>;

export type DoseInfusionInputs = Readonly<{
  readonly weightKg: number;
  readonly doseMgPerKg: number;
  readonly concentrationMgPerMl: number;
  readonly durationHours: number;
}>;

export type DoseInfusionResponseSpec = Readonly<{
  readonly kind: "DOSE_INFUSION";
  readonly fields: readonly StructuredFieldDefinition[];
  readonly calculationInputs: DoseInfusionInputs;
  readonly formulaLabel: string;
  readonly tolerance: number;
}>;

export type InternalAssessmentInteraction =
  StructuredResponseSpec | DoseInfusionResponseSpec;

export type PublicAssessmentInteraction = Readonly<
  | {
      readonly kind: "STRUCTURED_FIELDS";
      readonly evaluationMode: "AUTOMATIC";
      readonly fields: readonly StructuredFieldDefinition[];
    }
  | {
      readonly kind: "DOSE_INFUSION";
      readonly evaluationMode: "AUTOMATIC";
      readonly fields: readonly StructuredFieldDefinition[];
      readonly calculationInputs: DoseInfusionInputs;
      readonly formulaLabel: string;
    }
>;

export type StructuredFieldValues = Readonly<
  Record<string, StructuredScalar | undefined>
>;

export type StructuredEvaluationResult = Readonly<{
  readonly earnedPoints: number;
  readonly totalPoints: number;
  readonly percent: number;
  readonly passed: boolean;
  readonly missingFieldIds: readonly string[];
  readonly invalidFieldIds: readonly string[];
}>;

export type CaseStage = 1 | 2 | 3;
export type DigitalCaseCurrentStage = CaseStage | "CONCLUIDO";
export type CaseExamModality = "RADIOGRAFIA" | "POCUS" | "ECG";
export type CaseStateValue = string | number | boolean;

export type DigitalCaseExamObservation = Readonly<{
  readonly sequence: number;
  readonly availableAtStage: CaseStage;
  readonly syntheticSummary: string;
}>;

export type DigitalCaseExamSeries = Readonly<{
  readonly id: string;
  readonly modality: CaseExamModality;
  readonly label: string;
  readonly observations: readonly DigitalCaseExamObservation[];
}>;

export type DigitalCaseStatePatch = Readonly<{
  readonly key: string;
  readonly value: CaseStateValue;
}>;

export type DigitalCaseBranch = Readonly<{
  readonly id: string;
  readonly fromStage: CaseStage;
  readonly selectedChoiceIds: readonly string[];
  readonly nextStage: CaseStage | "CONCLUIDO";
  readonly statePatch: readonly DigitalCaseStatePatch[];
  readonly consequence: string;
  readonly revealExamSeriesIds: readonly string[];
}>;

export type DigitalCaseDefinition = Readonly<{
  readonly id: string;
  readonly version: "digital-case-v1";
  readonly stageItemIds: readonly [string, string, string];
  readonly initialState: Readonly<Record<string, CaseStateValue>>;
  readonly branches: readonly DigitalCaseBranch[];
  readonly examSeries: readonly DigitalCaseExamSeries[];
}>;

export type DigitalCaseConsequence = Readonly<{
  readonly branchId: string;
  readonly consequence: string;
  readonly recordedAt: string;
}>;

export type DigitalCaseRuntimeState = Readonly<{
  readonly caseId: string;
  readonly version: number;
  readonly currentStage: DigitalCaseCurrentStage;
  readonly state: Readonly<Record<string, CaseStateValue>>;
  readonly revealedExamSeriesIds: readonly string[];
  readonly consequences: readonly DigitalCaseConsequence[];
  readonly updatedAt: string;
}>;

export type AdvanceDigitalCaseInput = Readonly<{
  readonly selectedChoiceIds: readonly string[];
  readonly expectedVersion: number;
  readonly now: string;
}>;

export type PublicDigitalCaseStage = Readonly<{
  readonly caseId: string;
  readonly stage: CaseStage;
  readonly examSeries: readonly Readonly<{
    readonly id: string;
    readonly modality: CaseExamModality;
    readonly label: string;
    readonly observationCount: number;
  }>[];
}>;

export type PublicDigitalCaseRuntimeState = Readonly<{
  readonly caseId: string;
  readonly version: number;
  readonly currentStage: DigitalCaseCurrentStage;
  readonly state: Readonly<Record<string, CaseStateValue>>;
  readonly revealedExamSeries: readonly Readonly<{
    readonly id: string;
    readonly modality: CaseExamModality;
    readonly label: string;
    readonly observations: readonly Readonly<{
      readonly sequence: number;
      readonly syntheticSummary: string;
    }>[];
  }>[];
  readonly consequences: readonly DigitalCaseConsequence[];
  readonly updatedAt: string;
}>;

export class LearningInteractionError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "LearningInteractionError";
  }
}

function freeze<T>(value: T): Readonly<T> {
  return Object.freeze(value);
}

function assertNonEmpty(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new LearningInteractionError(`${field} must not be empty`);
  }
}

function assertTimestamp(value: string): void {
  if (Number.isNaN(new Date(value).getTime())) {
    throw new LearningInteractionError("timestamp must be valid");
  }
}

function assertChoiceIds(choiceIds: readonly string[]): readonly string[] {
  const normalized = choiceIds.map((value) => value.trim());
  if (
    normalized.some((value) => value.length === 0) ||
    new Set(normalized).size !== normalized.length
  ) {
    throw new LearningInteractionError("case choice ids are invalid");
  }
  return freeze([...normalized].sort());
}

function sameChoiceSet(
  left: readonly string[],
  right: readonly string[],
): boolean {
  const normalizedLeft = assertChoiceIds(left);
  const normalizedRight = assertChoiceIds(right);
  return (
    normalizedLeft.length === normalizedRight.length &&
    normalizedLeft.every((value, index) => value === normalizedRight[index])
  );
}

function assertFinitePositive(value: number, field: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new LearningInteractionError(`${field} must be positive`);
  }
}

function assertCaseDefinition(definition: DigitalCaseDefinition): void {
  assertNonEmpty(definition.id, "case id");
  if (definition.stageItemIds.length !== 3) {
    throw new LearningInteractionError(
      "digital case must contain three stages",
    );
  }
  const examIds = new Set<string>();
  for (const exam of definition.examSeries) {
    assertNonEmpty(exam.id, "exam series id");
    if (examIds.has(exam.id)) {
      throw new LearningInteractionError("exam series ids must be unique");
    }
    examIds.add(exam.id);
    if (exam.observations.length < 2) {
      throw new LearningInteractionError(
        "exam series must contain serial observations",
      );
    }
  }
  for (const branch of definition.branches) {
    assertNonEmpty(branch.id, "branch id");
    assertChoiceIds(branch.selectedChoiceIds);
    if (branch.revealExamSeriesIds.some((id) => !examIds.has(id))) {
      throw new LearningInteractionError(
        "branch reveals an unknown exam series",
      );
    }
  }
}

export function createDigitalCaseDefinition(
  input: Readonly<{
    readonly caseId: string;
    readonly stageItemIds: readonly [string, string, string];
  }>,
): DigitalCaseDefinition {
  assertNonEmpty(input.caseId, "caseId");
  if (
    input.stageItemIds.some((itemId) => itemId.trim().length === 0) ||
    new Set(input.stageItemIds).size !== input.stageItemIds.length
  ) {
    throw new LearningInteractionError(
      "digital case stage item ids are invalid",
    );
  }

  const examSeries = digitalCaseExamSeries;
  const branches = digitalCaseBranches;
  const definition = freeze({
    id: input.caseId,
    version: "digital-case-v1" as const,
    stageItemIds: freeze([...input.stageItemIds]) as unknown as readonly [
      string,
      string,
      string,
    ],
    initialState: freeze({}),
    branches,
    examSeries,
  });
  assertCaseDefinition(definition);
  return definition;
}

export function createInitialDigitalCaseState(
  definition: DigitalCaseDefinition,
  now: string,
): DigitalCaseRuntimeState {
  assertCaseDefinition(definition);
  assertTimestamp(now);
  return freeze({
    caseId: definition.id,
    version: 0,
    currentStage: 1,
    state: freeze({ ...definition.initialState }),
    revealedExamSeriesIds: freeze([]),
    consequences: freeze([]),
    updatedAt: now,
  });
}

export function advanceDigitalCase(
  definition: DigitalCaseDefinition,
  current: DigitalCaseRuntimeState,
  input: AdvanceDigitalCaseInput,
): DigitalCaseRuntimeState {
  assertCaseDefinition(definition);
  assertTimestamp(input.now);
  if (current.caseId !== definition.id) {
    throw new LearningInteractionError("case state belongs to another case");
  }
  if (current.version !== input.expectedVersion) {
    throw new LearningInteractionError("case state version is stale");
  }
  if (current.currentStage === "CONCLUIDO") {
    throw new LearningInteractionError("digital case is already completed");
  }
  const branch = definition.branches.find(
    (candidate) =>
      candidate.fromStage === current.currentStage &&
      sameChoiceSet(candidate.selectedChoiceIds, input.selectedChoiceIds),
  );
  if (branch === undefined) {
    throw new LearningInteractionError("case branch is not available");
  }
  const nextState = branch.statePatch.reduce<Record<string, CaseStateValue>>(
    (state, patch) => ({ ...state, [patch.key]: patch.value }),
    { ...current.state },
  );
  const revealedExamSeriesIds = freeze(
    Array.from(
      new Set([
        ...current.revealedExamSeriesIds,
        ...branch.revealExamSeriesIds,
      ]),
    ),
  );
  return freeze({
    caseId: current.caseId,
    version: current.version + 1,
    currentStage: branch.nextStage,
    state: freeze(nextState),
    revealedExamSeriesIds,
    consequences: freeze([
      ...current.consequences,
      freeze({
        branchId: branch.id,
        consequence: branch.consequence,
        recordedAt: input.now,
      }),
    ]),
    updatedAt: input.now,
  });
}

export function getVisibleDigitalCaseExams(
  definition: DigitalCaseDefinition,
  state: DigitalCaseRuntimeState,
): readonly DigitalCaseExamSeries[] {
  const currentStage =
    state.currentStage === "CONCLUIDO" ? 3 : state.currentStage;
  return freeze(
    definition.examSeries
      .filter((exam) => state.revealedExamSeriesIds.includes(exam.id))
      .map((exam) =>
        freeze({
          ...exam,
          observations: freeze(
            exam.observations.filter(
              (observation) => observation.availableAtStage <= currentStage,
            ),
          ),
        }),
      ),
  );
}

export function projectPublicDigitalCaseRuntime(
  definition: DigitalCaseDefinition,
  state: DigitalCaseRuntimeState,
): PublicDigitalCaseRuntimeState {
  assertCaseDefinition(definition);
  if (state.caseId !== definition.id) {
    throw new LearningInteractionError("case state belongs to another case");
  }
  assertTimestamp(state.updatedAt);
  const allowedStateKeys = new Set([
    ...Object.keys(definition.initialState),
    ...definition.branches.flatMap((branch) =>
      branch.statePatch.map((patch) => patch.key),
    ),
  ]);
  if (Object.keys(state.state).some((key) => !allowedStateKeys.has(key))) {
    throw new LearningInteractionError("case state contains an unknown key");
  }
  const visibleExamSeries = getVisibleDigitalCaseExams(definition, state);
  return freeze({
    caseId: state.caseId,
    version: state.version,
    currentStage: state.currentStage,
    state: freeze({ ...state.state }),
    revealedExamSeries: freeze(
      visibleExamSeries.map((exam) =>
        freeze({
          id: exam.id,
          modality: exam.modality,
          label: exam.label,
          observations: freeze(
            exam.observations.map((observation) =>
              freeze({
                sequence: observation.sequence,
                syntheticSummary: observation.syntheticSummary,
              }),
            ),
          ),
        }),
      ),
    ),
    consequences: freeze(
      state.consequences.map((consequence) => freeze({ ...consequence })),
    ),
    updatedAt: state.updatedAt,
  });
}

export function projectPublicDigitalCaseStage(
  definition: DigitalCaseDefinition,
  stage: CaseStage,
): PublicDigitalCaseStage {
  assertCaseDefinition(definition);
  return freeze({
    caseId: definition.id,
    stage,
    examSeries: freeze(
      definition.examSeries.map((exam) =>
        freeze({
          id: exam.id,
          modality: exam.modality,
          label: exam.label,
          observationCount: exam.observations.length,
        }),
      ),
    ),
  });
}

function assertFieldDefinition(field: StructuredFieldDefinition): void {
  assertNonEmpty(field.id, "structured field id");
  assertNonEmpty(field.label, "structured field label");
  if (field.min !== undefined && !Number.isFinite(field.min)) {
    throw new LearningInteractionError("structured field minimum is invalid");
  }
  if (field.max !== undefined && !Number.isFinite(field.max)) {
    throw new LearningInteractionError("structured field maximum is invalid");
  }
  if (
    field.min !== undefined &&
    field.max !== undefined &&
    field.min > field.max
  ) {
    throw new LearningInteractionError("structured field range is invalid");
  }
}

function valueMatchesType(
  value: StructuredScalar,
  field: StructuredFieldDefinition,
): boolean {
  if (field.valueType === "NUMBER") return typeof value === "number";
  if (field.valueType === "BOOLEAN") return typeof value === "boolean";
  return typeof value === "string";
}

function compareValue(
  actual: StructuredScalar,
  criterion: StructuredRubricCriterion,
): boolean {
  if (
    typeof actual === "number" &&
    typeof criterion.expectedValue === "number"
  ) {
    return (
      Math.abs(actual - criterion.expectedValue) <= (criterion.tolerance ?? 0)
    );
  }
  return actual === criterion.expectedValue;
}

export function evaluateStructuredFields(
  spec: StructuredResponseSpec,
  values: StructuredFieldValues,
): StructuredEvaluationResult {
  const fields = spec.fields;
  const fieldById = new Map<string, StructuredFieldDefinition>();
  for (const field of fields) {
    assertFieldDefinition(field);
    if (fieldById.has(field.id)) {
      throw new LearningInteractionError("structured field ids must be unique");
    }
    fieldById.set(field.id, field);
  }
  const invalidFieldIds = new Set<string>();
  const missingFieldIds = fields
    .filter((field) => values[field.id] === undefined && field.required)
    .map((field) => field.id);
  for (const key of Object.keys(values)) {
    const field = fieldById.get(key);
    const value = values[key];
    if (field === undefined) {
      invalidFieldIds.add(key);
      continue;
    }
    if (value === undefined || !valueMatchesType(value, field)) {
      invalidFieldIds.add(key);
      continue;
    }
    if (typeof value === "number") {
      if (
        !Number.isFinite(value) ||
        (field.min !== undefined && value < field.min) ||
        (field.max !== undefined && value > field.max)
      ) {
        invalidFieldIds.add(key);
      }
    }
    if (
      typeof value === "string" &&
      (value.trim().length === 0 || /<[^>]*>/u.test(value))
    ) {
      invalidFieldIds.add(key);
    }
  }
  const totalPoints = spec.rubric.criteria.reduce(
    (total, criterion) => total + criterion.points,
    0,
  );
  let earnedPoints = 0;
  for (const criterion of spec.rubric.criteria) {
    const value = values[criterion.fieldId];
    if (
      value !== undefined &&
      !invalidFieldIds.has(criterion.fieldId) &&
      compareValue(value, criterion)
    ) {
      earnedPoints += criterion.points;
    }
  }
  const percent =
    totalPoints === 0 ? 0 : Math.round((earnedPoints / totalPoints) * 100);
  return freeze({
    earnedPoints,
    totalPoints,
    percent,
    passed:
      missingFieldIds.length === 0 &&
      invalidFieldIds.size === 0 &&
      earnedPoints >= spec.rubric.passScore,
    missingFieldIds: freeze([...missingFieldIds]),
    invalidFieldIds: freeze([...invalidFieldIds]),
  });
}

export function calculateDoseInfusion(inputs: DoseInfusionInputs): Readonly<{
  readonly doseMg: number;
  readonly volumeMl: number;
  readonly rateMlPerHour: number;
}> {
  assertFinitePositive(inputs.weightKg, "weightKg");
  if (!Number.isFinite(inputs.doseMgPerKg) || inputs.doseMgPerKg < 0) {
    throw new LearningInteractionError("doseMgPerKg must be non-negative");
  }
  assertFinitePositive(inputs.concentrationMgPerMl, "concentrationMgPerMl");
  assertFinitePositive(inputs.durationHours, "durationHours");
  const doseMg = inputs.weightKg * inputs.doseMgPerKg;
  const volumeMl = doseMg / inputs.concentrationMgPerMl;
  return freeze({
    doseMg,
    volumeMl,
    rateMlPerHour: volumeMl / inputs.durationHours,
  });
}

export function evaluateDoseInfusion(
  spec: DoseInfusionResponseSpec,
  values: StructuredFieldValues,
): StructuredEvaluationResult {
  const expected = calculateDoseInfusion(spec.calculationInputs);
  const structuredSpec: StructuredResponseSpec = {
    kind: "STRUCTURED_FIELDS",
    fields: spec.fields,
    rubric: {
      criteria: [
        {
          fieldId: "doseMg",
          expectedValue: expected.doseMg,
          tolerance: spec.tolerance,
          points: 1,
        },
        {
          fieldId: "volumeMl",
          expectedValue: expected.volumeMl,
          tolerance: spec.tolerance,
          points: 1,
        },
        {
          fieldId: "rateMlPerHour",
          expectedValue: expected.rateMlPerHour,
          tolerance: spec.tolerance,
          points: 1,
        },
      ],
      passScore: spec.fields.length,
    },
  };
  return evaluateStructuredFields(structuredSpec, values);
}

export function toPublicAssessmentInteraction(
  interaction: InternalAssessmentInteraction,
): PublicAssessmentInteraction {
  if (interaction.kind === "STRUCTURED_FIELDS") {
    return freeze({
      kind: interaction.kind,
      evaluationMode: "AUTOMATIC",
      fields: freeze(interaction.fields.map((field) => freeze({ ...field }))),
    });
  }
  return freeze({
    kind: interaction.kind,
    evaluationMode: "AUTOMATIC",
    fields: freeze(interaction.fields.map((field) => freeze({ ...field }))),
    calculationInputs: freeze({ ...interaction.calculationInputs }),
    formulaLabel: interaction.formulaLabel,
  });
}
