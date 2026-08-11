import { describe, expect, it } from "vitest";

import {
  buildCurriculumRuntimeExpectation,
  validateCurriculumRuntimeSnapshot,
} from "../../scripts/verify-curriculum-runtime.mjs";

const input = {
  scopeId: "11111111-1111-4111-8111-111111111111",
  authorId: "22222222-2222-4222-8222-222222222222",
  participantId: "450e95ed-452c-445a-a6e4-066fe771394c",
};

describe("curriculum runtime verifier", () => {
  it("derives the expected 24-module and 796-item shape from the catalog", () => {
    const expectation = buildCurriculumRuntimeExpectation(input);

    expect(expectation).toMatchObject({
      moduleCount: 24,
      contentCount: 796,
      moduleIds: expect.arrayContaining(["M01", "M12", "M24"]),
    });
    expect(expectation.moduleIds).toHaveLength(24);
  });

  it("distinguishes structurally complete runtime from unpublished clinical content", () => {
    const expectation = buildCurriculumRuntimeExpectation(input);
    const result = validateCurriculumRuntimeSnapshot(
      {
        aggregates: {
          activities: 24,
          content: 796,
          editorial: 796,
          items: 796,
          assignments: 24,
          runtime: 24,
        },
        contentStatuses: { PROJECAO_VERIFICADA: 763, PUBLICADO: 33 },
        assignmentStatuses: { NAO_ATRIBUIDO: 24 },
        runtimeStatuses: { PENDENTE: 24 },
        assignmentModules: expectation.moduleIds,
        runtimeModules: expectation.moduleIds,
      },
      expectation,
    );

    expect(result.status).toBe("PASS_WITH_GAPS");
    expect(result.unpublishedContent).toBe(763);
    expect(result.errors).toEqual([]);
    expect(
      validateCurriculumRuntimeSnapshot(
        {
          aggregates: {
            activities: 24,
            content: 796,
            editorial: 796,
            items: 796,
            assignments: 24,
            runtime: 24,
          },
          contentStatuses: { PROJECAO_VERIFICADA: 763, PUBLICADO: 33 },
          assignmentStatuses: { NAO_ATRIBUIDO: 24 },
          runtimeStatuses: { PENDENTE: 24 },
          assignmentModules: expectation.moduleIds,
          runtimeModules: expectation.moduleIds,
        },
        expectation,
        { requireClinicalPublication: true },
      ).status,
    ).toBe("FAIL");
  });

  it("rejects missing modules or fabricated assignment state", () => {
    const expectation = buildCurriculumRuntimeExpectation(input);
    const result = validateCurriculumRuntimeSnapshot(
      {
        aggregates: {
          activities: 24,
          content: 796,
          editorial: 796,
          items: 796,
          assignments: 23,
          runtime: 24,
        },
        contentStatuses: { PROJECAO_VERIFICADA: 796 },
        assignmentStatuses: { ATRIBUIDO: 23 },
        runtimeStatuses: { DOMINIO_DIGITAL: 24 },
        assignmentModules: expectation.moduleIds.slice(1),
        runtimeModules: expectation.moduleIds,
      },
      expectation,
    );

    expect(result.status).toBe("FAIL");
    expect(result.errors).toEqual(
      expect.arrayContaining([
        "assignments count must equal 24",
        "assignment status NAO_ATRIBUIDO must have count 24",
        "runtime status PENDENTE must have count 24",
        "assignment module set must contain exactly M01–M24",
      ]),
    );
  });
});
