import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName, type SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { EvaluateCurriculumModuleCommand } from "@cvg/application";
import type * as ApplicationExports from "@cvg/application";
import type * as schema from "./schema.js";
import { createCurriculumModuleEvaluationUseCase } from "./curriculum-evaluation-repository.js";

const mocks = vi.hoisted(() => ({
  map: vi.fn(),
  writer: vi.fn(),
  repository: vi.fn(),
}));
vi.mock("./curriculum-evaluation-mapping.js", () => ({
  mapCapturedCurriculumEvaluation: mocks.map,
}));
vi.mock("./curriculum-runtime-repository.js", () => ({
  createCurriculumRuntimeRepository: mocks.repository,
}));
vi.mock("@cvg/application", async (importOriginal) => {
  const original = await importOriginal<typeof ApplicationExports>();
  return {
    ...original,
    evaluateAndPersistCurriculumModule: async (
      command: EvaluateCurriculumModuleCommand,
      repository: { saveCurriculumRuntime: typeof mocks.writer },
      reader?: {
        findEvaluationAttempt: (
          command: EvaluateCurriculumModuleCommand,
        ) => Promise<unknown>;
      },
    ) => {
      const proof = await reader?.findEvaluationAttempt(command);
      if (!proof)
        throw new original.ApplicationError(
          "state_conflict",
          "Missing native binding",
        );
      return repository.saveCurriculumRuntime(proof);
    },
  };
});

const command: EvaluateCurriculumModuleCommand = {
  participantId: "11111111-1111-4111-8111-111111111111",
  scopeId: "22222222-2222-4222-8222-222222222222",
  moduleId: "M02",
  attemptId: "33333333-3333-4333-8333-333333333333",
  attemptVersion: 2,
  formVersion: 1,
};
const activityId = "44444444-4444-4444-8444-444444444444";
const formVersionId = "55555555-5555-4555-8555-555555555555";
const publisherId = "66666666-6666-4666-8666-666666666666";
const approvalDecisionId = "77777777-7777-4777-8777-777777777777";
const publicationDecisionId = "88888888-8888-4888-8888-888888888888";
const approvedAt = new Date("2026-10-01T12:00:00Z");
const publishedAt = new Date("2026-10-02T12:00:00Z");
function provenanceRows() {
  return [
    {
      id: approvalDecisionId,
      actorKind: "AUTHENTICATED",
      principalId: publisherId,
      scopeId: command.scopeId,
      action: "CURRICULUM_BLUEPRINT_APPROVED",
      resourceType: "curriculum_blueprint_version",
      resourceId: activityId,
      outcome: "SUCCESS",
      occurredAt: approvedAt,
      exactSnapshotTime: true,
    },
    {
      id: publicationDecisionId,
      actorKind: "AUTHENTICATED",
      principalId: publisherId,
      scopeId: command.scopeId,
      action: "CURRICULUM_FORM_PUBLISHED",
      resourceType: "curriculum_form_version",
      resourceId: formVersionId,
      outcome: "SUCCESS",
      occurredAt: publishedAt,
      exactSnapshotTime: true,
    },
  ];
}

function database(overrides: Record<string, readonly unknown[]> = {}) {
  const calls: { kind: string; value: unknown }[] = [];
  const tables: Record<string, readonly unknown[]> = {
    attempts: [
      {
        id: command.attemptId,
        participantId: command.participantId,
        activityId,
        version: 2,
        status: "SUBMETIDA",
        submittedAt: new Date("2026-10-03T12:00:00Z"),
      },
    ],
    learning_activities: [
      {
        id: activityId,
        scopeId: command.scopeId,
        moduleId: "M02",
        status: "PUBLISHED",
      },
    ],
    curriculum_attempt_forms: [
      {
        attemptId: command.attemptId,
        participantId: command.participantId,
        scopeId: command.scopeId,
        moduleId: "M02",
        formVersionId,
      },
    ],
    curriculum_form_versions: [
      {
        id: formVersionId,
        version: 1,
        status: "PUBLICADO",
        blueprintVersionId: activityId,
        scopeId: command.scopeId,
        moduleId: command.moduleId,
        publicationDecisionId,
        publishedBy: publisherId,
        publishedAt,
      },
    ],
    curriculum_blueprint_versions: [
      {
        id: activityId,
        scopeId: command.scopeId,
        moduleId: command.moduleId,
        approvalDecisionId,
        approvedBy: publisherId,
        approvedAt,
      },
    ],
    audit_entries: provenanceRows(),
    curriculum_attempt_items: [],
    curriculum_form_items: [{ contentVersionId: activityId, ordinal: 1 }],
    content_versions: [],
    answers: [],
    ...overrides,
  };
  const tx = {
    execute: vi.fn(async (query: SQL) => {
      const text = new PgDialect().sqlToQuery(query).sql;
      calls.push({ kind: "execute", value: text });
      if (text.includes("current_setting"))
        return [{ auditRead: "", auditScopeId: "" }];
      return text.includes("from activity_assignments")
        ? [{ authorized: true }]
        : [];
    }),
    select: vi.fn(() => {
      let table = "";
      const builder = {
        from(value: Parameters<typeof getTableName>[0]) {
          table = getTableName(value);
          calls.push({ kind: "select", value: table });
          return builder;
        },
        where() {
          return builder;
        },
        orderBy() {
          return builder;
        },
        for(kind: string) {
          calls.push({ kind: "lock", value: `${table}:${kind}` });
          return builder;
        },
        limit: async () => tables[table] ?? [],
        then(resolve: (rows: readonly unknown[]) => unknown) {
          return Promise.resolve(tables[table] ?? []).then(resolve);
        },
      };
      return builder;
    }),
  };
  const transaction = vi.fn(
    async (work: (executor: unknown) => Promise<unknown>) => work(tx),
  );
  const db = { transaction } as unknown as PostgresJsDatabase<typeof schema>;
  return { db, tx, calls, transaction };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.map.mockReturnValue({ syntheticNativeProof: true });
  mocks.writer.mockResolvedValue({ version: 1 });
  mocks.repository.mockReturnValue({ saveCurriculumRuntime: mocks.writer });
});

describe("native curriculum evaluation transaction", () => {
  it("keeps the native reader and runtime writer on the same outer transaction", async () => {
    const fixture = database();
    await expect(
      createCurriculumModuleEvaluationUseCase(fixture.db)(command),
    ).resolves.toEqual({ version: 1 });
    expect(fixture.transaction).toHaveBeenCalledOnce();
    expect(mocks.repository.mock.calls[0]![0]).toBe(fixture.tx);
    expect(mocks.map).toHaveBeenCalledOnce();
    expect(fixture.calls).toContainEqual({
      kind: "lock",
      value: "attempts:update",
    });
    expect(fixture.calls).toContainEqual({
      kind: "lock",
      value: "content_versions:share",
    });
    expect(
      fixture.calls.some((call) =>
        String(call.value).includes("pg_advisory_xact_lock_shared"),
      ),
    ).toBe(true);
    expect(
      fixture.calls.some((call) =>
        String(call.value).includes(
          "FOR SHARE OF assignment, activity, learning",
        ),
      ),
    ).toBe(true);
  });

  it.each(["participantId", "scopeId", "attemptId"] as const)(
    "rejects malformed %s before opening SQL transaction",
    async (field) => {
      const fixture = database();
      await expect(
        createCurriculumModuleEvaluationUseCase(fixture.db)({
          ...command,
          [field]: "not-a-uuid",
        }),
      ).rejects.toMatchObject({ code: "validation_error" });
      expect(fixture.transaction).not.toHaveBeenCalled();
      expect(mocks.writer).not.toHaveBeenCalled();
    },
  );

  it.each([
    "attempts",
    "curriculum_attempt_forms",
    "curriculum_form_versions",
    "curriculum_blueprint_versions",
  ])("denies missing %s without a partial runtime write", async (table) => {
    const fixture = database({ [table]: [] });
    await expect(
      createCurriculumModuleEvaluationUseCase(fixture.db)(command),
    ).rejects.toMatchObject({ code: "state_conflict" });
    expect(mocks.writer).not.toHaveBeenCalled();
  });

  it("restores ordinary participant context when immutable mapping rejects", async () => {
    const fixture = database();
    mocks.map.mockImplementationOnce(() => {
      throw new Error("synthetic mapping denial");
    });
    await expect(
      createCurriculumModuleEvaluationUseCase(fixture.db)(command),
    ).rejects.toThrow("synthetic mapping denial");
    expect(mocks.writer).not.toHaveBeenCalled();
    expect(fixture.calls.at(-1)?.value).toContain(
      "set_config('cvg.curriculum_attempt_id', '', true)",
    );
  });

  it.each(
    [0, 1].flatMap((index) =>
      [
        "action",
        "resourceType",
        "resourceId",
        "principalId",
        "scopeId",
        "outcome",
        "occurredAt",
        "id",
        "actorKind",
      ].map((field) => [index, field] as const),
    ),
  )(
    "rejects historical decision %s with wrong %s before mapping or writing runtime",
    async (index, field) => {
      const rows = provenanceRows();
      const values: Record<string, unknown> = {
        action: "SYNTHETIC_UNRELATED_ACTION",
        resourceType: "synthetic_technical_form",
        resourceId: command.attemptId,
        principalId: command.participantId,
        scopeId: command.participantId,
        outcome: "FAILURE",
        occurredAt: new Date("2026-09-01T00:00:00Z"),
        id: command.attemptId,
        actorKind: "ANONYMOUS",
      };
      const fixture = database({
        audit_entries: rows.map((row, i) =>
          i === index ? { ...row, [field]: values[field] } : row,
        ),
      });
      await expect(
        createCurriculumModuleEvaluationUseCase(fixture.db)(command),
      ).rejects.toMatchObject({ code: "state_conflict" });
      expect(mocks.map).not.toHaveBeenCalled();
      expect(mocks.writer).not.toHaveBeenCalled();
      expect(fixture.calls.at(-1)?.value).toContain(
        "set_config('cvg.curriculum_attempt_id', '', true)",
      );
    },
  );
  it("denies missing audit proof without a current draft fallback", async () => {
    const fixture = database({ audit_entries: [] });
    await expect(
      createCurriculumModuleEvaluationUseCase(fixture.db)(command),
    ).rejects.toMatchObject({ code: "state_conflict" });
    expect(mocks.map).not.toHaveBeenCalled();
    expect(mocks.writer).not.toHaveBeenCalled();
  });
});
