import { correctOpenResponse } from "@cvg/application";
import { describe, expect, it } from "vitest";
import { createCorrectionUseCaseDependencies } from "./correction-repository.js";
import type { SummativeApprovalSource } from "./module-obligation-completion-trigger.js";
import { createProductionSummativeApproval } from "./module-obligation-summative-approval.js";
import { approvedModuleFixture } from "./test-support/module-obligation-fixture.js";
import {
  createTableRoutedFakeDatabase,
  type TableRoutedFakeDatabase,
} from "./test-support/table-routed-fake-database.js";

const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const fixture = approvedModuleFixture();
const scopeId = fixture.expected.scopeId;
const participantId = fixture.expected.participantId;
const assignmentId = fixture.expected.assignmentId;
const staffId = uuid(4);
const moduleId = "M02";
const submittedAt = new Date("2026-09-29T12:00:00.000Z");
const attemptCapturedAt = new Date("2026-09-28T13:00:00.000Z");
const otherCorrectedAt = new Date("2026-09-30T11:00:00.000Z");
const triggerAttemptId = uuid(900);
const otherAttemptId = uuid(901);

type Row = Readonly<Record<string, unknown>>;

function activityRow(index: number): Row {
  const capture = fixture.captures[index]!;
  return {
    id: capture.activityId,
    scopeId,
    slug: `synthetic-activity-${capture.activityId}`,
    moduleId,
    sessionId: null,
    title: "Synthetic activity",
    status: "PUBLISHED",
    createdAt: new Date("2026-09-01T12:00:00.000Z"),
  };
}

function attemptRow(
  id: string,
  index: number,
  status: string,
  version: number,
): Row {
  return {
    id,
    participantId,
    activityId: fixture.captures[index]!.activityId,
    status,
    version,
    submittedAt,
    createdAt: new Date("2026-09-28T13:00:00.000Z"),
    updatedAt: new Date("2026-09-30T11:00:00.000Z"),
  };
}

function attemptFormRow(id: string, index: number): Row {
  const capture = fixture.captures[index]!;
  return {
    attemptId: id,
    participantId,
    scopeId,
    moduleId,
    formVersionId: capture.capture.form.id,
    capturedAt: attemptCapturedAt,
  };
}

function attemptItemRows(id: string, index: number): readonly Row[] {
  return fixture.captures[index]!.capture.items.map((item) => ({
    attemptId: id,
    itemId: item.contentVersionId,
    canonicalItemId: item.canonicalItemId,
    formVersionId: item.formVersionId,
    ordinal: item.ordinal,
    catalogItem: item.catalogItem,
    publicItem: item.publicItem,
  }));
}

function answerRows(id: string, index: number): readonly Row[] {
  return fixture.captures[index]!.capture.items.map((item, position) => ({
    id: uuid(400 + index * 100 + position),
    attemptId: id,
    itemId: item.contentVersionId,
    response:
      item.catalogItem.responseMode === "TEXT"
        ? "Synthetic technical response"
        : "a",
    savedAt: submittedAt,
    createdAt: submittedAt,
    updatedAt: submittedAt,
  }));
}

function otherResultRow(): Row {
  return {
    id: uuid(951),
    attemptId: otherAttemptId,
    version: 1,
    kind: "HUMANA",
    score: 80,
    outcome: "APROVADO",
    feedback: "Synthetic technical feedback",
    ruleVersion: "rubrica-v1",
    correctedBy: staffId,
    correctedAt: otherCorrectedAt,
    createdAt: otherCorrectedAt,
    updatedAt: otherCorrectedAt,
  };
}

function decisionRow(
  id: string,
  action: string,
  resourceType: string,
  resourceId: string,
  occurredAt: Date,
  principalId = staffId,
): Row {
  return {
    id,
    actorKind: "AUTHENTICATED",
    principalId,
    scopeId,
    action,
    resourceType,
    resourceId,
    outcome: "SUCCESS",
    occurredAt,
  };
}

function otherCorrectionDecision(): Row {
  return decisionRow(
    uuid(971),
    "ATTEMPT_CORRECTED",
    "attempt",
    otherAttemptId,
    otherCorrectedAt,
  );
}

function assignmentRow(version: number): Row {
  return {
    id: assignmentId,
    participantId,
    scopeId,
    moduleId,
    sourceDiagnosticResultId: null,
    availableAt: new Date("2026-09-01T12:00:00.000Z"),
    status: "EM_ANDAMENTO",
    version,
    blockReason: null,
    pausedFrom: null,
    createdAt: new Date("2026-09-01T12:00:00.000Z"),
    updatedAt: new Date("2026-09-28T12:00:00.000Z"),
  };
}

function bindingRow(): Row {
  return {
    assignmentId,
    participantId,
    scopeId,
    moduleId,
    manifestId: fixture.manifest.id,
    manifestVersion: fixture.manifest.version,
    blueprintVersionId: fixture.manifest.blueprintVersionId,
    blueprintVersion: fixture.manifest.blueprintVersion,
    boundAt: fixture.binding.boundAt,
    assignmentVersion: 3,
  };
}

function manifestRow(): Row {
  return {
    id: fixture.manifest.id,
    version: fixture.manifest.version,
    scopeId,
    moduleId,
    blueprintVersionId: fixture.manifest.blueprintVersionId,
    blueprintVersion: fixture.manifest.blueprintVersion,
    approvalDecisionId: fixture.manifest.approval.decisionId,
    approvedBy: fixture.manifest.approval.actorId,
    approvedAt: fixture.manifest.approval.at,
    obligations: fixture.manifest.obligations,
  };
}

function moduleBlueprintRow(): Row {
  return {
    id: fixture.blueprint.id,
    blueprintId: fixture.blueprint.blueprintId,
    version: fixture.blueprint.version,
    scopeId,
    moduleId,
    approvalDecisionId: fixture.blueprint.approval.decisionId,
    approvedBy: fixture.blueprint.approval.actorId,
    approvedAt: fixture.blueprint.approval.at,
    snapshot: {
      ...structuredClone(fixture.blueprint.snapshot),
      itemManifest: structuredClone(fixture.blueprint.itemManifest),
    },
  };
}

function captureDecisions(): readonly Row[] {
  return fixture.captures.flatMap((capture) => capture.decisions);
}

function activityItemRows(index: number): readonly Row[] {
  const capture = fixture.captures[index]!;
  return capture.capture.activityItems.map((item) => ({
    activityId: capture.activityId,
    contentVersionId: item.contentVersionId,
    ordinal: item.ordinal,
  }));
}

const summativeApproval: SummativeApprovalSource = (input) => ({
  policy: {
    decisionId: uuid(800),
    version: 1,
    scopeId,
    moduleId,
    blueprintVersionId: fixture.blueprint.id,
    blueprintVersion: fixture.blueprint.version,
    approvedBy: staffId,
    approvedAt: fixture.manifest.approval.at,
    composition: [{ kind: "CASO" as const, weightPercent: 100 }],
    minimumOverallPercent: 70,
    minimumCriticalPercent: 70,
  },
  results: input.obligations.map((obligation) => ({
    obligationId: obligation.obligationId,
    assessmentResultId: obligation.assessmentResultId,
    modality: "CASO" as const,
    overallPercent: 85,
    criticalPercent: 90,
    itemCount: 10,
    criticalItemCount: 5,
    recordedAt: input.now,
    correctionOutcome: obligation.correctionOutcome,
  })),
});

type Scenario = Readonly<{
  staleAssignment?: boolean;
  partialInventory?: boolean;
  summativeApproval?: SummativeApprovalSource;
  idempotencyConflict?: boolean;
}>;

function createFake(scenario: Scenario): {
  readonly fake: TableRoutedFakeDatabase;
  readonly dependencies: Parameters<typeof correctOpenResponse>[1];
} {
  const inserted: {
    result?: Record<string, unknown>;
    correctionAudit?: Record<string, unknown>;
  } = {};
  const fake = createTableRoutedFakeDatabase({
    onInsert: (table, values) => {
      const row = values as Record<string, unknown>;
      if (table === "assessment_results") inserted.result = row;
      if (table === "audit_entries" && row.action === "ATTEMPT_CORRECTED") {
        inserted.correctionAudit = row;
      }
    },
    selects: {
      // 1. correction idempotency find, later store find (conflict scenario).
      assessment_idempotency: [
        [],
        scenario.idempotencyConflict === true
          ? [
              {
                key: "unused",
                fingerprint: "different",
                response: {
                  attempt: {
                    attemptId: otherAttemptId,
                    participantId,
                    activityId: fixture.captures[1]!.activityId,
                    status: "CORRIGIDA_HUMANAMENTE",
                    version: 5,
                    submittedAt: submittedAt.toISOString(),
                  },
                  result: {
                    resultId: uuid(951),
                    attemptId: otherAttemptId,
                    version: 1,
                    kind: "HUMANA",
                    score: 80,
                    outcome: "APROVADO",
                    feedback: "Synthetic technical feedback",
                    ruleVersion: "rubrica-v1",
                    correctedBy: staffId,
                    correctedAt: otherCorrectedAt.toISOString(),
                  },
                },
              },
            ]
          : [],
      ],
      // 2. correction attempt lookup, recorder A1, recorder obligations scan.
      attempts: [
        [attemptRow(triggerAttemptId, 0, "SUBMETIDA", 4)],
        [attemptRow(triggerAttemptId, 0, "CORRIGIDA_HUMANAMENTE", 6)],
        scenario.partialInventory === true
          ? [attemptRow(triggerAttemptId, 0, "CORRIGIDA_HUMANAMENTE", 6)]
          : [
              attemptRow(triggerAttemptId, 0, "CORRIGIDA_HUMANAMENTE", 6),
              attemptRow(otherAttemptId, 1, "CORRIGIDA_HUMANAMENTE", 5),
            ],
      ],
      // 3. recorder assignment resolution, then completion CAS re-read.
      learning_assignments: [
        [assignmentRow(5)],
        [assignmentRow(scenario.staleAssignment === true ? 6 : 5)],
      ],
      // 4. recorder binding lookup, then completion binding re-read.
      curriculum_assignment_obligations: [[bindingRow()], [bindingRow()]],
      curriculum_module_obligation_manifests: [
        [manifestRow()],
        [manifestRow()],
      ],
      curriculum_module_blueprint_versions: [[moduleBlueprintRow()]],
      // 5. recorder per-attempt capture rows.
      curriculum_attempt_forms: [
        [
          attemptFormRow(triggerAttemptId, 0),
          attemptFormRow(otherAttemptId, 1),
        ],
      ],
      curriculum_attempt_items: [
        [
          ...attemptItemRows(triggerAttemptId, 0),
          ...attemptItemRows(otherAttemptId, 1),
        ],
      ],
      answers: [
        [...answerRows(triggerAttemptId, 0), ...answerRows(otherAttemptId, 1)],
      ],
      assessment_results: [
        [],
        () => {
          const trigger = inserted.result;
          if (trigger === undefined) {
            throw new Error("trigger correction result was not inserted");
          }
          return [trigger, otherResultRow()];
        },
      ],
      curriculum_form_versions: [
        fixture.captures.map((capture) => capture.capture.form),
      ],
      curriculum_blueprint_versions: [
        fixture.captures.map((capture) => capture.capture.blueprint),
      ],
      curriculum_form_items: [
        fixture.captures.flatMap((capture) => capture.capture.items),
      ],
      learning_activities: [[activityRow(0), activityRow(1)]],
      learning_activity_items: [
        [...activityItemRows(0), ...activityItemRows(1)],
      ],
      content_versions: [
        fixture.captures.flatMap((capture) => capture.capture.contentVersions),
      ],
      // 6. audit reads: module approvals, capture provenance, corrections.
      audit_entries: [
        [fixture.approvals[0]!, fixture.approvals[1]!],
        captureDecisions(),
        () => {
          const audit = inserted.correctionAudit;
          if (audit === undefined) {
            throw new Error("trigger correction audit was not inserted");
          }
          return [
            decisionRow(
              audit.id as string,
              audit.action as string,
              audit.resourceType as string,
              audit.resourceId as string,
              audit.occurredAt as Date,
              audit.principalId as string,
            ),
            otherCorrectionDecision(),
          ];
        },
      ],
      // 7. completion receipt assertion (must find none).
      curriculum_module_completion_receipts: [[]],
      // 8. activity assignment resolution, then completion consistency check.
      activity_assignments: [[{ learningAssignmentId: assignmentId }], []],
    },
    returning: {
      attempts: [[{ id: triggerAttemptId }], [{ id: triggerAttemptId }]],
      learning_assignments: [[{ status: "CONCLUIDO", version: 6 }]],
    },
  });
  const dependencies = createCorrectionUseCaseDependencies(
    fake.executor as unknown as Parameters<
      typeof createCorrectionUseCaseDependencies
    >[0],
    (() => {
      let sequence = 0;
      return () => uuid(500 + sequence++);
    })(),
    {
      ...(scenario.summativeApproval === undefined
        ? {}
        : { summativeApproval: scenario.summativeApproval }),
    },
  );
  return { fake, dependencies };
}

function command() {
  return {
    principalId: staffId,
    accountStatus: "ACTIVE" as const,
    roles: ["CLINICAL_APPROVER"] as const,
    scopes: [scopeId],
    approvedClinicalApproverId: staffId,
    scopeId,
    attemptId: triggerAttemptId,
    idempotencyKey: `module-completion-${uuid(700)}`,
    correlationId: uuid(701),
    score: 85,
    outcome: "APROVADO" as const,
    feedback: "Synthetic technical feedback",
    ruleVersion: "rubrica-v1",
  };
}

describe("module obligation wiring: automatic completion receipt on correction", () => {
  it("keeps the correction but records no receipt while an obligation is not terminal", async () => {
    const { fake, dependencies } = createFake({ partialInventory: true });

    const result = await correctOpenResponse(command(), dependencies);

    expect(result.attempt.status).toBe("CORRIGIDA_HUMANAMENTE");
    expect(fake.inserts("curriculum_module_completion_receipts")).toEqual([]);
    expect(
      fake
        .inserts("audit_entries")
        .filter(
          (op) =>
            (op.values as { action?: string }).action ===
            "MODULE_COMPLETION_RECORDED",
        ),
    ).toEqual([]);
  });

  it("records the receipt and its audit proof in the correction transaction", async () => {
    const { fake, dependencies } = createFake({
      summativeApproval: summativeApproval,
    });

    await correctOpenResponse(command(), dependencies);

    const receipts = fake.inserts("curriculum_module_completion_receipts");
    expect(receipts).toHaveLength(1);
    expect(receipts[0]!.values).toMatchObject({
      assignmentId,
      participantId,
      scopeId,
      moduleId,
      manifestId: fixture.manifest.id,
      manifestVersion: fixture.manifest.version,
      blueprintVersionId: fixture.blueprint.id,
      completedAssignmentVersion: 6,
    });
    const values = receipts[0]!.values as { witnesses: readonly unknown[] };
    expect(values.witnesses).toHaveLength(2);
    const completionAudit = fake
      .inserts("audit_entries")
      .filter(
        (op) =>
          (op.values as { action?: string }).action ===
          "MODULE_COMPLETION_RECORDED",
      );
    expect(completionAudit).toHaveLength(1);
    const correctionAudit = fake
      .inserts("audit_entries")
      .filter(
        (op) =>
          (op.values as { action?: string }).action === "ATTEMPT_CORRECTED",
      );
    expect(correctionAudit).toHaveLength(1);
  });

  it("leaves no receipt and no audit proof when the transaction aborts", async () => {
    const { fake, dependencies } = createFake({
      summativeApproval: summativeApproval,
      idempotencyConflict: true,
    });

    await expect(
      correctOpenResponse(command(), dependencies),
    ).rejects.toBeDefined();

    expect(fake.inserts("curriculum_module_completion_receipts")).toEqual([]);
    expect(fake.inserts("audit_entries")).toEqual([]);
    expect(fake.inserts("assessment_results")).toEqual([]);
    expect(fake.committed).toEqual([]);
  });

  it("rolls back on a stale assignment version and records no receipt", async () => {
    const { fake, dependencies } = createFake({
      summativeApproval: summativeApproval,
      staleAssignment: true,
    });

    await expect(
      correctOpenResponse(command(), dependencies),
    ).rejects.toMatchObject({
      code: "state_conflict",
      status: 409,
    });

    expect(fake.inserts("curriculum_module_completion_receipts")).toEqual([]);
    expect(fake.inserts("audit_entries")).toEqual([]);
    expect(fake.committed).toEqual([]);
  });

  it("skips the receipt while no summative policy is approved", async () => {
    const { fake, dependencies } = createFake({});

    const result = await correctOpenResponse(command(), dependencies);

    expect(result.attempt.status).toBe("CORRIGIDA_HUMANAMENTE");
    expect(fake.inserts("curriculum_module_completion_receipts")).toEqual([]);
    expect(
      fake
        .inserts("audit_entries")
        .filter(
          (op) =>
            (op.values as { action?: string }).action === "ATTEMPT_CORRECTED",
        ),
    ).toHaveLength(1);
  });

  it("keeps the production approval provider fail-closed without a receipt", async () => {
    const { fake, dependencies } = createFake({
      summativeApproval: createProductionSummativeApproval(),
    });

    const result = await correctOpenResponse(command(), dependencies);

    expect(result.attempt.status).toBe("CORRIGIDA_HUMANAMENTE");
    expect(fake.inserts("curriculum_module_completion_receipts")).toEqual([]);
    expect(
      fake
        .inserts("audit_entries")
        .filter(
          (op) =>
            (op.values as { action?: string }).action ===
            "MODULE_COMPLETION_RECORDED",
        ),
    ).toEqual([]);
    expect(
      fake
        .inserts("audit_entries")
        .filter(
          (op) =>
            (op.values as { action?: string }).action === "ATTEMPT_CORRECTED",
        ),
    ).toHaveLength(1);
  });
});
