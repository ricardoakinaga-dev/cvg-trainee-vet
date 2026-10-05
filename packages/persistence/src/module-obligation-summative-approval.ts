import { ApplicationError } from "@cvg/application";
import type { SummativeApprovalSource } from "./module-obligation-completion-trigger.js";
import type { SummativeGradePolicy } from "./module-obligation-grade-policy.js";
import type { ApprovedModuleObligationCaptureInput } from "./module-obligation-validation.js";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

function inconsistent(): never {
  throw new ApplicationError(
    "state_conflict",
    "Module summative grade policy provenance is inconsistent",
  );
}

function requireProvenance(condition: unknown): asserts condition {
  if (!condition) inconsistent();
}

function validDate(value: unknown): value is Date {
  return value instanceof Date && Number.isFinite(value.getTime());
}

/**
 * P3: composes the approved summative grade policy of a finished module
 * directly from its authenticated manifest approval. Composition follows
 * RN-022 (CASO 30%, EXAME 70%, quiz 0%) and the RN-023/D-103 thresholds
 * (70% overall, 80% critical). It never derives weights, thresholds or
 * provenance from participants, corrections, AI or mutable runtime state.
 */
export function composeApprovedSummativeGradePolicy(
  capture: ApprovedModuleObligationCaptureInput,
): SummativeGradePolicy {
  const { blueprint, manifest, approvals } = capture;
  const { approval } = manifest;
  requireProvenance(
    Number.isSafeInteger(manifest.version) &&
      manifest.version >= 1 &&
      uuidPattern.test(approval.decisionId) &&
      uuidPattern.test(approval.actorId) &&
      validDate(approval.at),
  );
  requireProvenance(
    manifest.scopeId === blueprint.scopeId &&
      manifest.moduleId === blueprint.moduleId &&
      manifest.blueprintVersionId === blueprint.id &&
      manifest.blueprintVersion === blueprint.version,
  );
  const rows = approvals.filter(
    (decision) => decision.id === approval.decisionId,
  );
  requireProvenance(rows.length === 1);
  const decision = rows[0]!;
  requireProvenance(
    decision.actorKind === "AUTHENTICATED" &&
      decision.outcome === "SUCCESS" &&
      decision.principalId === approval.actorId &&
      decision.scopeId === manifest.scopeId &&
      decision.action === "CURRICULUM_MODULE_OBLIGATIONS_APPROVED" &&
      decision.resourceType === "curriculum_module_obligation_manifest" &&
      decision.resourceId === manifest.id &&
      decision.occurredAt.getTime() === approval.at.getTime(),
  );
  const policy: SummativeGradePolicy = {
    decisionId: approval.decisionId,
    version: manifest.version,
    scopeId: manifest.scopeId,
    moduleId: manifest.moduleId,
    blueprintVersionId: manifest.blueprintVersionId,
    blueprintVersion: manifest.blueprintVersion,
    approvedBy: approval.actorId,
    approvedAt: approval.at,
    composition: [
      { kind: "CASO", weightPercent: 30 },
      { kind: "EXAME", weightPercent: 70 },
    ],
    minimumOverallPercent: 70,
    minimumCriticalPercent: 80,
  };
  return Object.freeze(policy);
}

function composeOrNull(
  compose: (
    capture: ApprovedModuleObligationCaptureInput,
  ) => SummativeGradePolicy,
  capture: ApprovedModuleObligationCaptureInput,
): SummativeGradePolicy | null {
  try {
    return compose(capture);
  } catch {
    return null;
  }
}

/**
 * P2 production approval source: composes the approved policy (P3), then
 * fails closed. The correction contract carries no natively authenticated
 * per-obligation critical evidence (criticalPercent and criticalItemCount),
 * so no summative approval is produced yet. It never throws into the
 * correction transaction; any failure fails closed.
 */
export function createProductionSummativeApproval(
  compose: (
    capture: ApprovedModuleObligationCaptureInput,
  ) => SummativeGradePolicy = composeApprovedSummativeGradePolicy,
): SummativeApprovalSource {
  return (request) => {
    const policy = composeOrNull(compose, request.capture);
    if (policy === null) return null;
    // The policy composed above is approved provenance, but the gate stays
    // closed until authenticated grade evidence exists in the contract.
    return null;
  };
}
