import { describe, expect, it } from "vitest";

import {
  aggregateReflectionManagement,
  getReflectionManagementReport,
  type ReflectionManagementReadPort,
  type ReflectionManagementState,
} from "./reflection-management-use-cases.js";

const scopeId = "11111111-1111-4111-8111-111111111111";

const base = {
  scopeId,
  generatedAt: "2026-08-23T12:00:00.000Z",
};

function instance(
  overrides: Partial<{
    readonly participantId: string;
    readonly activityId: string;
    readonly moduleId: string;
    readonly itemCount: number;
    readonly answeredItemCount: number;
    readonly attemptStatus: "EM_ANDAMENTO" | "SUBMETIDA";
  }> = {},
) {
  return {
    participantId: "22222222-2222-4222-8222-222222222222",
    activityId: "33333333-3333-4333-8333-333333333333",
    moduleId: "M02",
    itemCount: 2,
    answeredItemCount: 0,
    ...overrides,
  };
}

const report: ReflectionManagementState = {
  kind: "reflection_management_aggregate",
  scopeId,
  generatedAt: base.generatedAt,
  modules: [
    {
      moduleId: "M02",
      totalAssignments: 3,
      counts: {
        NAO_INICIADA: 1,
        EM_ANDAMENTO: 1,
        CONCLUIDA: 1,
      },
    },
  ],
  evidence: "REFLEXAO_DIGITAL",
  practicalCompetenceClaim: "PROIBIDO_MVP",
};

describe("reflection management aggregate", () => {
  it("groups each participant/activity once and derives the three digital states", () => {
    expect(
      aggregateReflectionManagement({
        ...base,
        instances: [
          instance(),
          instance({
            participantId: "44444444-4444-4444-8444-444444444444",
            activityId: "55555555-5555-4555-8555-555555555555",
            answeredItemCount: 1,
            attemptStatus: "EM_ANDAMENTO",
          }),
          instance({
            participantId: "66666666-6666-4666-8666-666666666666",
            activityId: "77777777-7777-4777-8777-777777777777",
            answeredItemCount: 2,
            attemptStatus: "SUBMETIDA",
          }),
        ],
      }),
    ).toEqual(report);
  });

  it("rejects duplicate instances and inconsistent answer counts", () => {
    expect(() =>
      aggregateReflectionManagement({
        ...base,
        instances: [instance(), instance()],
      }),
    ).toThrowError(/unique/u);

    expect(() =>
      aggregateReflectionManagement({
        ...base,
        instances: [instance({ answeredItemCount: 3 })],
      }),
    ).toThrowError(/answered/u);
  });

  it("rejects invalid scope, module, item, and timestamp inputs", () => {
    expect(() =>
      aggregateReflectionManagement({
        ...base,
        scopeId: "not-a-uuid",
        instances: [],
      }),
    ).toThrowError(/scopeId/u);
    expect(() =>
      aggregateReflectionManagement({
        ...base,
        instances: [instance({ moduleId: "M99" })],
      }),
    ).toThrowError(/moduleId/u);
    expect(() =>
      aggregateReflectionManagement({
        ...base,
        instances: [instance({ itemCount: 0 })],
      }),
    ).toThrowError(/itemCount/u);
    expect(() =>
      aggregateReflectionManagement({
        ...base,
        generatedAt: "",
        instances: [],
      }),
    ).toThrowError(/generatedAt/u);
  });

  it("freezes the report returned through the read port", async () => {
    const repository: ReflectionManagementReadPort = {
      findReflectionManagement: async () => report,
    };

    const result = await getReflectionManagementReport(
      {
        principalId: "88888888-8888-4888-8888-888888888888",
        query: { scopeId },
      },
      repository,
    );

    expect(result).toEqual(report);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.modules)).toBe(true);
    expect(Object.isFrozen(result.modules[0])).toBe(true);
    expect(Object.isFrozen(result.modules[0]?.counts)).toBe(true);
  });

  it("rejects an empty or malformed scope before reaching the repository", async () => {
    const repository: ReflectionManagementReadPort = {
      findReflectionManagement: async () => report,
    };

    await expect(
      getReflectionManagementReport(
        {
          principalId: "88888888-8888-4888-8888-888888888888",
          query: { scopeId: "" },
        },
        repository,
      ),
    ).rejects.toMatchObject({ code: "validation_error" });

    await expect(
      getReflectionManagementReport(
        {
          principalId: "88888888-8888-4888-8888-888888888888",
          query: { scopeId: "not-a-uuid" },
        },
        repository,
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
  });

  it("rejects a repository result that crosses scope or violates aggregate invariants", async () => {
    const mismatchedScope: ReflectionManagementReadPort = {
      findReflectionManagement: async () => ({
        ...report,
        scopeId: "44444444-4444-4444-8444-444444444444",
      }),
    };
    await expect(
      getReflectionManagementReport(
        {
          principalId: "88888888-8888-4888-8888-888888888888",
          query: { scopeId },
        },
        mismatchedScope,
      ),
    ).rejects.toMatchObject({ code: "forbidden" });

    const duplicateModules: ReflectionManagementReadPort = {
      findReflectionManagement: async () => ({
        ...report,
        modules: [...report.modules, report.modules[0]!],
      }),
    };
    await expect(
      getReflectionManagementReport(
        {
          principalId: "88888888-8888-4888-8888-888888888888",
          query: { scopeId },
        },
        duplicateModules,
      ),
    ).rejects.toMatchObject({ code: "forbidden" });

    const inconsistent: ReflectionManagementReadPort = {
      findReflectionManagement: async () => ({
        ...report,
        modules: [
          {
            ...report.modules[0]!,
            totalAssignments: 99,
          },
        ],
      }),
    };
    await expect(
      getReflectionManagementReport(
        {
          principalId: "88888888-8888-4888-8888-888888888888",
          query: { scopeId },
        },
        inconsistent,
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
  });
});
