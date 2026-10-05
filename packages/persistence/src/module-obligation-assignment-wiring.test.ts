import { ApplicationError } from "@cvg/application";
import { describe, expect, it } from "vitest";
import type { DatabaseExecutor } from "./adaptive-assignment-repository.js";
import {
  createLearningStateRepository,
  LearningStatePersistenceConflictError,
} from "./learning-state-repository.js";
import { approvedModuleFixture } from "./test-support/module-obligation-fixture.js";
import {
  createTableRoutedFakeDatabase,
  type TableRoutedFakeDatabase,
} from "./test-support/table-routed-fake-database.js";

const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const scopeId = uuid(1);
const participantId = uuid(3);
const staffId = uuid(4);
const assignmentId = uuid(2);
const moduleId = "M02";
const context = { participantId, scopeId } as const;

function auditRow(
  id: string,
  action: string,
  resourceType: string,
  resourceId: string | null,
  occurredAt: Date,
) {
  return {
    id,
    actorKind: "AUTHENTICATED",
    principalId: staffId,
    action,
    resourceType,
    resourceId,
    scopeId,
    outcome: "SUCCESS",
    reasonCode: null,
    requestId: uuid(600),
    correlationId: uuid(601),
    beforeHash: null,
    afterHash: null,
    occurredAt,
  };
}

function assignmentRow(status: string, version: number) {
  return {
    id: assignmentId,
    participantId,
    scopeId,
    moduleId,
    sourceDiagnosticResultId: null,
    availableAt: new Date("2026-09-01T12:00:00.000Z"),
    status,
    version,
    blockReason: null,
    pausedFrom: null,
    createdAt: new Date("2026-09-01T12:00:00.000Z"),
    updatedAt: new Date("2026-09-01T12:00:00.000Z"),
  };
}

function manifestRow() {
  const fixture = approvedModuleFixture();
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

function sourceRows() {
  const fixture = approvedModuleFixture();
  const forms = fixture.captures.map((bound) => bound.capture.form);
  const blueprints = fixture.captures.map((bound) => bound.capture.blueprint);
  const activityForms = fixture.captures.map((bound) => ({
    activityId: bound.activityId,
    formVersionId: bound.capture.form.id,
    scopeId,
    moduleId,
  }));
  const activities = fixture.captures.map((bound) => ({
    id: bound.activityId,
    scopeId,
    slug: `synthetic-activity-${bound.activityId}`,
    moduleId,
    sessionId: null,
    title: "Synthetic activity",
    status: "PUBLISHED",
    createdAt: new Date("2026-09-01T12:00:00.000Z"),
  }));
  const items = fixture.captures.flatMap((bound) => bound.capture.items);
  const decisions = fixture.captures.flatMap((bound) => bound.decisions);
  return {
    fixture,
    forms,
    blueprints,
    activityForms,
    activities,
    items,
    decisions,
  };
}

function createFake(options: {
  selects: Readonly<
    Record<string, ReadonlyArray<readonly Record<string, unknown>[]>>
  >;
  returning?: Readonly<
    Record<string, ReadonlyArray<readonly Record<string, unknown>[]>>
  >;
}): TableRoutedFakeDatabase {
  return createTableRoutedFakeDatabase({
    selects: options.selects,
    returning: {
      learning_assignments: [[{ id: assignmentId }]],
      ...options.returning,
    },
  });
}

function createAssignmentState() {
  return {
    assignmentId,
    participantId,
    scopeId,
    moduleId,
    availableAt: "2026-09-01T12:00:00.000Z",
    status: "NAO_ATRIBUIDO" as const,
    version: 0,
  };
}

function startedAssignmentState(version: number) {
  return {
    assignmentId,
    participantId,
    scopeId,
    moduleId,
    availableAt: "2026-09-01T12:00:00.000Z",
    status: "EM_ANDAMENTO" as const,
    version,
  };
}

function repository(fake: TableRoutedFakeDatabase) {
  let nextObligationId = 70;
  return createLearningStateRepository(
    fake.executor as unknown as DatabaseExecutor,
    {
      idFactory: () => uuid(nextObligationId++),
    },
  );
}

async function denied(action: () => Promise<unknown>): Promise<void> {
  const error = await action().then(
    () => null,
    (reason: unknown) => reason,
  );
  const isConflict =
    error instanceof LearningStatePersistenceConflictError ||
    (error instanceof ApplicationError &&
      error.code === "state_conflict" &&
      error.status === 409);
  expect(isConflict).toBe(true);
}

describe("module obligation wiring: publication at assignment creation", () => {
  it("does not publish an inventory when the F02 approval identity is missing", async () => {
    const fake = createFake({
      selects: {
        learning_assignments: [[assignmentRow("NAO_ATRIBUIDO", 0)]],
        curriculum_module_obligation_manifests: [[]],
        curriculum_module_blueprint_versions: [[]],
        audit_entries: [[]],
      },
    });

    await repository(fake).saveLearningAssignment(
      context,
      createAssignmentState(),
    );

    expect(fake.selects("audit_entries")).toHaveLength(1);
    expect(fake.selects("curriculum_module_obligation_manifests")).toHaveLength(
      1,
    );
    expect(fake.inserts("curriculum_module_blueprint_versions")).toEqual([]);
    expect(fake.inserts("curriculum_module_obligation_manifests")).toEqual([]);
  });

  it("publishes the approved inventory during assignment creation", async () => {
    const source = sourceRows();
    const fake = createFake({
      selects: {
        learning_assignments: [[assignmentRow("NAO_ATRIBUIDO", 0)]],
        curriculum_module_obligation_manifests: [[]],
        curriculum_module_blueprint_versions: [[]],
        audit_entries: [
          [
            auditRow(
              source.fixture.approvals[0]!.id,
              source.fixture.approvals[0]!.action,
              source.fixture.approvals[0]!.resourceType,
              source.fixture.approvals[0]!.resourceId,
              source.fixture.approvals[0]!.occurredAt,
            ),
            auditRow(
              source.fixture.approvals[1]!.id,
              source.fixture.approvals[1]!.action,
              source.fixture.approvals[1]!.resourceType,
              source.fixture.approvals[1]!.resourceId,
              source.fixture.approvals[1]!.occurredAt,
            ),
          ],
        ],
        curriculum_form_versions: [source.forms],
        curriculum_blueprint_versions: [source.blueprints],
        curriculum_activity_forms: [source.activityForms],
        learning_activities: [source.activities],
        curriculum_form_items: [source.items],
        audit_entries_provenance: [source.decisions],
      },
    });

    await repository(fake).saveLearningAssignment(
      context,
      createAssignmentState(),
    );

    const blueprints = fake.inserts("curriculum_module_blueprint_versions");
    const manifests = fake.inserts("curriculum_module_obligation_manifests");
    expect(blueprints).toHaveLength(1);
    expect(manifests).toHaveLength(1);
    expect(blueprints[0]!.values).toMatchObject({
      id: source.fixture.blueprint.id,
      scopeId,
      moduleId,
      approvalDecisionId: source.fixture.blueprint.approval.decisionId,
      approvedBy: source.fixture.blueprint.approval.actorId,
      snapshot: expect.objectContaining({
        questionCountsBySession: [11, 6, 8, 6],
        questionTotal: 31,
        openResponseCount: 2,
        objectiveIds: ["synthetic-objective"],
      }),
    });
    expect(manifests[0]!.values).toMatchObject({
      id: source.fixture.manifest.id,
      blueprintVersionId: source.fixture.blueprint.id,
      approvalDecisionId: source.fixture.manifest.approval.decisionId,
      obligations: source.fixture.manifest.obligations.map(
        (obligation) =>
          expect.objectContaining({
            id: obligation.id,
            activityId: obligation.activityId,
            formVersionId: obligation.formVersionId,
          }) as unknown,
      ),
    });
  });
});

describe("module obligation wiring: binding at the original INICIAR", () => {
  it("starts without a published manifest and records no binding", async () => {
    const fake = createFake({
      selects: {
        learning_assignments: [[assignmentRow("EM_ANDAMENTO", 3)]],
        activity_assignments: [[]],
        curriculum_module_obligation_manifests: [[]],
      },
    });

    await repository(fake).saveLearningAssignment(
      context,
      startedAssignmentState(3),
      { started: true },
    );

    expect(fake.selects("curriculum_module_obligation_manifests")).toHaveLength(
      1,
    );
    expect(fake.inserts("curriculum_assignment_obligations")).toEqual([]);
  });

  it("binds the published manifest at the original INICIAR", async () => {
    const fake = createFake({
      selects: {
        learning_assignments: [
          [assignmentRow("EM_ANDAMENTO", 3)],
          [assignmentRow("EM_ANDAMENTO", 3)],
        ],
        activity_assignments: [[]],
        curriculum_module_obligation_manifests: [[manifestRow()]],
        curriculum_assignment_obligations: [[]],
      },
    });

    await repository(fake).saveLearningAssignment(
      context,
      startedAssignmentState(3),
      { started: true },
    );

    const bindings = fake.inserts("curriculum_assignment_obligations");
    expect(bindings).toHaveLength(1);
    expect(bindings[0]!.values).toMatchObject({
      assignmentId,
      participantId,
      scopeId,
      moduleId,
      manifestId: approvedModuleFixture().manifest.id,
      manifestVersion: 1,
      blueprintVersionId: approvedModuleFixture().blueprint.id,
      blueprintVersion: 1,
      assignmentVersion: 3,
    });
  });

  it("rejects a second binding for the same assignment", async () => {
    const fake = createFake({
      selects: {
        learning_assignments: [
          [assignmentRow("EM_ANDAMENTO", 3)],
          [assignmentRow("EM_ANDAMENTO", 3)],
          [assignmentRow("EM_ANDAMENTO", 4)],
          [assignmentRow("EM_ANDAMENTO", 4)],
        ],
        activity_assignments: [[], []],
        curriculum_module_obligation_manifests: [
          [manifestRow()],
          [manifestRow()],
          [manifestRow()],
          [manifestRow()],
        ],
        curriculum_assignment_obligations: [
          [],
          [{ assignmentId, participantId, scopeId, moduleId }],
        ],
      },
      returning: {
        learning_assignments: [[{ id: assignmentId }], [{ id: assignmentId }]],
      },
    });
    const learningState = repository(fake);

    await learningState.saveLearningAssignment(
      context,
      startedAssignmentState(3),
      { started: true },
    );
    await denied(() =>
      learningState.saveLearningAssignment(context, startedAssignmentState(4), {
        started: true,
      }),
    );

    expect(fake.inserts("curriculum_assignment_obligations")).toHaveLength(1);
  });

  it("rejects a manifest published for another scope", async () => {
    const foreign = { ...manifestRow(), scopeId: uuid(900) };
    const fake = createFake({
      selects: {
        learning_assignments: [[assignmentRow("EM_ANDAMENTO", 3)]],
        activity_assignments: [[]],
        curriculum_module_obligation_manifests: [[foreign]],
      },
    });

    await denied(() =>
      repository(fake).saveLearningAssignment(
        context,
        startedAssignmentState(3),
        { started: true },
      ),
    );

    expect(fake.inserts("curriculum_assignment_obligations")).toEqual([]);
  });
});
