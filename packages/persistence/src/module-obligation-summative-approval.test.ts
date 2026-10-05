import { ApplicationError } from "@cvg/application";
import { describe, expect, it, vi } from "vitest";
import type { SummativeApprovalRequest } from "./module-obligation-completion-trigger.js";
import {
  composeApprovedSummativeGradePolicy,
  createProductionSummativeApproval,
} from "./module-obligation-summative-approval.js";
import type { ApprovedModuleObligationCaptureInput } from "./module-obligation-validation.js";
import { approvedModuleFixture } from "./test-support/module-obligation-fixture.js";

const requestNow = new Date("2026-09-30T12:00:00.000Z");

function approvalRequest(
  capture: ApprovedModuleObligationCaptureInput = approvedModuleFixture(),
): SummativeApprovalRequest {
  return {
    capture,
    now: requestNow,
    obligations: capture.manifest.obligations.map((obligation, index) => ({
      obligationId: obligation.id,
      activityId: obligation.activityId,
      assessmentResultId: `00000000-0000-4000-8000-${String(900 + index).padStart(12, "0")}`,
      correctionOutcome: "APROVADO" as const,
    })),
  };
}

describe("composeApprovedSummativeGradePolicy", () => {
  it("composes the approved RN-022/RN-023 policy from the manifest approval", () => {
    const capture = approvedModuleFixture();

    expect(composeApprovedSummativeGradePolicy(capture)).toEqual({
      decisionId: capture.manifest.approval.decisionId,
      approvedBy: capture.manifest.approval.actorId,
      approvedAt: capture.manifest.approval.at,
      version: capture.manifest.version,
      scopeId: capture.manifest.scopeId,
      moduleId: capture.manifest.moduleId,
      blueprintVersionId: capture.manifest.blueprintVersionId,
      blueprintVersion: capture.manifest.blueprintVersion,
      composition: [
        { kind: "CASO", weightPercent: 30 },
        { kind: "EXAME", weightPercent: 70 },
      ],
      minimumOverallPercent: 70,
      minimumCriticalPercent: 80,
    });
  });

  it("denies a capture whose blueprint and manifest contexts diverge", () => {
    const capture = approvedModuleFixture();
    capture.blueprint.version = capture.manifest.blueprintVersion + 1;

    expect(() => composeApprovedSummativeGradePolicy(capture)).toThrow(
      ApplicationError,
    );
  });

  it("denies approval provenance that is not an authenticated UUID decision", () => {
    const capture = approvedModuleFixture();
    capture.manifest.approval.decisionId = "not-a-uuid";

    expect(() => composeApprovedSummativeGradePolicy(capture)).toThrow(
      ApplicationError,
    );
  });
});

describe("createProductionSummativeApproval", () => {
  it("returns null for a well-formed capture until authenticated grade evidence exists", () => {
    const source = createProductionSummativeApproval();

    expect(source(approvalRequest())).toBeNull();
  });

  it("composes the approved policy before gating on grade evidence", () => {
    const compose = vi.fn((capture: ApprovedModuleObligationCaptureInput) =>
      composeApprovedSummativeGradePolicy(capture),
    );
    const source = createProductionSummativeApproval(compose);

    expect(source(approvalRequest())).toBeNull();
    expect(compose).toHaveBeenCalledTimes(1);
  });

  it("fails closed instead of throwing when the capture cannot compose", () => {
    const source = createProductionSummativeApproval();
    const malformed: SummativeApprovalRequest = {
      ...approvalRequest(),
      capture: {} as unknown as ApprovedModuleObligationCaptureInput,
    };

    expect(source(malformed)).toBeNull();
  });
});
