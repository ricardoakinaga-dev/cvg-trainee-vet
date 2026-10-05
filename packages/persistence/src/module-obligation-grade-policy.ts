import { ApplicationError } from "@cvg/application";

/**
 * D-102 seam: progress, summative assessment and competence domain are separate
 * decisions. Finalizing every mandatory activity never approves a summative
 * result by itself, and a REFORCO correction can finalize an activity without
 * approving anything.
 *
 * This is a pure seam over caller-supplied, natively authenticated evidence. It
 * is not an existing producer, not a public DTO, and it never decides clinical
 * publication, practical autonomy, retention or human approval.
 */
export type SummativeGradePolicy = Readonly<{
  decisionId: string;
  version: number;
  scopeId: string;
  moduleId: string;
  blueprintVersionId: string;
  blueprintVersion: number;
  approvedBy: string;
  approvedAt: Date;
  composition: readonly Readonly<{
    kind: "CASO" | "EXAME";
    weightPercent: number;
  }>[];
  minimumOverallPercent: number;
  minimumCriticalPercent: number;
}>;

export type ApprovedSummativeGradeEvidence = Readonly<{
  expected: Readonly<{
    assignmentId: string;
    participantId: string;
    scopeId: string;
    moduleId: string;
    blueprintVersionId: string;
    blueprintVersion: number;
  }>;
  now: Date;
  obligations: readonly Readonly<{
    obligationId: string;
    activityId: string;
    assessmentResultId: string;
    correctionOutcome: "APROVADO" | "REFORCO";
  }>[];
  results: readonly Readonly<{
    obligationId: string;
    assessmentResultId: string;
    modality: "CASO" | "EXAME";
    overallPercent: number;
    criticalPercent: number;
    itemCount: number;
    criticalItemCount: number;
    recordedAt: Date;
    correctionOutcome: "APROVADO" | "REFORCO";
  }>[];
}>;

type Result = ApprovedSummativeGradeEvidence["results"][number];
type Obligation = ApprovedSummativeGradeEvidence["obligations"][number];

export type SummativeGradeDecision =
  | Readonly<{
      outcome: "APROVADO_SOMATIVO";
      policyDecisionId: string;
      policyVersion: number;
      overallPercent: number;
      components: readonly Readonly<{
        obligationId: string;
        modality: "CASO" | "EXAME";
        weightPercent: number;
      }>[];
      minimumCriticalPercent: number;
    }>
  | Readonly<{
      outcome: "NAO_APLICAVEL";
      reason: "SEM_POLITICA_APROVADA" | "COMPONENTE_SEM_EVIDENCIA";
    }>
  | Readonly<{
      outcome: "REPROVADO";
      reason: "GERAL_ABAIXO_DO_LIMIAR" | "CRITICO_ABAIXO_DO_LIMIAR";
      overallPercent: number;
      minimumOverallPercent: number;
    }>;

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const modalities = ["CASO", "EXAME"] as const;

function unavailable(): never {
  throw new ApplicationError(
    "state_conflict",
    "Module summative grade is unavailable",
  );
}
function requireGrade(condition: unknown): asserts condition {
  if (!condition) unavailable();
}
function validDate(value: unknown): value is Date {
  return value instanceof Date && Number.isFinite(value.getTime());
}
function validPercent(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100
  );
}
function validWeight(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 100
  );
}

function assertPolicy(
  policy: SummativeGradePolicy,
  evidence: ApprovedSummativeGradeEvidence,
): void {
  const { expected } = evidence;
  requireGrade(
    uuidPattern.test(policy.decisionId) &&
      uuidPattern.test(policy.approvedBy) &&
      Number.isSafeInteger(policy.version) &&
      policy.version >= 1 &&
      validDate(policy.approvedAt) &&
      policy.approvedAt <= evidence.now,
  );
  // A policy frozen for another scope, module or blueprint never applies.
  requireGrade(
    policy.scopeId === expected.scopeId &&
      policy.moduleId === expected.moduleId &&
      policy.blueprintVersionId === expected.blueprintVersionId &&
      policy.blueprintVersion === expected.blueprintVersion,
  );
  requireGrade(
    validPercent(policy.minimumOverallPercent) &&
      validPercent(policy.minimumCriticalPercent) &&
      policy.minimumOverallPercent > 0 &&
      policy.minimumCriticalPercent > 0,
  );
  const kinds = policy.composition.map((entry) => entry.kind);
  requireGrade(
    Array.isArray(policy.composition) &&
      policy.composition.length > 0 &&
      policy.composition.length <= modalities.length &&
      new Set(kinds).size === kinds.length &&
      kinds.every((kind) => (modalities as readonly string[]).includes(kind)) &&
      policy.composition.every((entry) => validWeight(entry.weightPercent)) &&
      policy.composition.reduce(
        (total, entry) => total + entry.weightPercent,
        0,
      ) === 100,
  );
}

function assertObligations(evidence: ApprovedSummativeGradeEvidence): void {
  const obligations = evidence.obligations;
  requireGrade(
    validDate(evidence.now) &&
      Array.isArray(obligations) &&
      obligations.length > 0 &&
      obligations.length <= 100 &&
      new Set(obligations.map((o) => o.obligationId)).size ===
        obligations.length &&
      new Set(obligations.map((o) => o.assessmentResultId)).size ===
        obligations.length &&
      obligations.every(
        (o: Obligation) =>
          typeof o.obligationId === "string" &&
          o.obligationId.length > 0 &&
          uuidPattern.test(o.activityId) &&
          uuidPattern.test(o.assessmentResultId) &&
          (o.correctionOutcome === "APROVADO" ||
            o.correctionOutcome === "REFORCO"),
      ),
  );
}

function assertResults(
  evidence: ApprovedSummativeGradeEvidence,
  obligations: readonly Obligation[],
): void {
  const results = evidence.results;
  requireGrade(
    Array.isArray(results) &&
      results.length > 0 &&
      results.length <= 100 &&
      new Set(results.map((r) => r.obligationId)).size === results.length &&
      new Set(results.map((r) => r.assessmentResultId)).size === results.length,
  );
  const byId = new Map(obligations.map((o) => [o.obligationId, o]));
  for (const result of results) {
    const obligation = byId.get(result.obligationId);
    requireGrade(obligation !== undefined);
    requireGrade(
      // A REFORCO correction may finalize the activity but never approves the
      // summative component, so it cannot carry a graded result.
      result.correctionOutcome === "APROVADO" &&
        obligation.correctionOutcome === "APROVADO" &&
        result.assessmentResultId === obligation.assessmentResultId &&
        (modalities as readonly string[]).includes(result.modality) &&
        validPercent(result.overallPercent) &&
        validPercent(result.criticalPercent) &&
        Number.isSafeInteger(result.itemCount) &&
        result.itemCount > 0 &&
        Number.isSafeInteger(result.criticalItemCount) &&
        result.criticalItemCount > 0 &&
        result.criticalItemCount <= result.itemCount &&
        validDate(result.recordedAt) &&
        result.recordedAt <= evidence.now,
    );
  }
}

function decideComponents(
  policy: SummativeGradePolicy,
  evidence: ApprovedSummativeGradeEvidence,
):
  | Readonly<{ applicable: false }>
  | Readonly<{
      applicable: true;
      components: readonly Readonly<{
        obligationId: string;
        modality: "CASO" | "EXAME";
        weightPercent: number;
        result: Result;
      }>[];
    }> {
  const byId = new Map(evidence.results.map((r) => [r.obligationId, r]));
  const components = policy.composition.map((entry) => {
    const result = evidence.results.find((r) => r.modality === entry.kind);
    // Every approved component needs its own proven result; no scalar shortcut.
    if (result === undefined) return null;
    return Object.freeze({
      obligationId: result.obligationId,
      modality: entry.kind,
      weightPercent: entry.weightPercent,
      result: byId.get(result.obligationId) ?? null,
    });
  });
  if (
    components.some(
      (component) => component === null || component.result === null,
    )
  )
    return Object.freeze({ applicable: false });
  return Object.freeze({
    applicable: true,
    components: Object.freeze(
      components as readonly Readonly<{
        obligationId: string;
        modality: "CASO" | "EXAME";
        weightPercent: number;
        result: Result;
      }>[],
    ),
  });
}

/**
 * Decides only the applicable summative outcome. A missing approved policy or a
 * component without proven evidence is not applicable, never an approval.
 */
export function decideSummativeGrade(
  policy: SummativeGradePolicy | null,
  evidence: ApprovedSummativeGradeEvidence,
): SummativeGradeDecision {
  try {
    assertObligations(evidence);
    if (policy === null)
      return Object.freeze({
        outcome: "NAO_APLICAVEL",
        reason: "SEM_POLITICA_APROVADA",
      });
    assertPolicy(policy, evidence);
    assertResults(evidence, evidence.obligations);
    // The policy must predate every graded result it is applied to.
    requireGrade(
      evidence.results.every(
        (result) => result.recordedAt >= policy.approvedAt,
      ),
    );
    const decided = decideComponents(policy, evidence);
    if (!decided.applicable)
      return Object.freeze({
        outcome: "NAO_APLICAVEL",
        reason: "COMPONENTE_SEM_EVIDENCIA",
      });
    const components = decided.components;
    // Weights are percentages, so the weighted mean divides by their total.
    const overallPercent = Number(
      (
        components.reduce(
          (total, component) =>
            total + component.weightPercent * component.result.overallPercent,
          0,
        ) / 100
      ).toFixed(4),
    );
    const belowCritical = components.some(
      (component) =>
        component.result.criticalPercent < policy.minimumCriticalPercent,
    );
    if (belowCritical)
      return Object.freeze({
        outcome: "REPROVADO",
        reason: "CRITICO_ABAIXO_DO_LIMIAR",
        overallPercent,
        minimumOverallPercent: policy.minimumOverallPercent,
      });
    if (overallPercent < policy.minimumOverallPercent)
      return Object.freeze({
        outcome: "REPROVADO",
        reason: "GERAL_ABAIXO_DO_LIMIAR",
        overallPercent,
        minimumOverallPercent: policy.minimumOverallPercent,
      });
    return Object.freeze({
      outcome: "APROVADO_SOMATIVO",
      policyDecisionId: policy.decisionId,
      policyVersion: policy.version,
      overallPercent,
      components: Object.freeze(
        components.map((component) =>
          Object.freeze({
            obligationId: component.obligationId,
            modality: component.modality,
            weightPercent: component.weightPercent,
          }),
        ),
      ),
      minimumCriticalPercent: policy.minimumCriticalPercent,
    });
  } catch (error) {
    if (error instanceof ApplicationError) throw error;
    unavailable();
  }
}
