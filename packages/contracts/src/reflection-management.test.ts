import { describe, expect, it } from "vitest";

import {
  parseReflectionManagementProjection,
  reflectionManagementProjectionSchema,
} from "./reflection-management.js";

const scopeId = "11111111-1111-4111-8111-111111111111";

const projection = {
  kind: "reflection_management_aggregate" as const,
  scopeId,
  generatedAt: "2026-08-23T12:00:00.000Z",
  modules: [
    {
      moduleId: "M02",
      totalAssignments: 3,
      counts: { NAO_INICIADA: 1, EM_ANDAMENTO: 1, CONCLUIDA: 1 },
    },
  ],
  evidence: "REFLEXAO_DIGITAL" as const,
  practicalCompetenceClaim: "PROIBIDO_MVP" as const,
};

describe("reflection management projection contract", () => {
  it("accepts only scoped state counts and preserves the safety claims", () => {
    expect(parseReflectionManagementProjection(projection)).toEqual(projection);
  });

  it("rejects free text, identities, inconsistent denominators, and invalid modules", () => {
    expect(() =>
      reflectionManagementProjectionSchema.parse({
        ...projection,
        modules: [
          {
            ...projection.modules[0],
            totalAssignments: 2,
          },
        ],
      }),
    ).toThrow();
    expect(() =>
      reflectionManagementProjectionSchema.parse({
        ...projection,
        participantId: "22222222-2222-4222-8222-222222222222",
      }),
    ).toThrow();
    expect(() =>
      reflectionManagementProjectionSchema.parse({
        ...projection,
        modules: [{ ...projection.modules[0], moduleId: "M99" }],
      }),
    ).toThrow();
    expect(() =>
      reflectionManagementProjectionSchema.parse({
        ...projection,
        modules: [
          {
            ...projection.modules[0],
            response: "texto privado",
          },
        ],
      }),
    ).toThrow();
    expect(() =>
      reflectionManagementProjectionSchema.parse({
        ...projection,
        modules: [projection.modules[0], projection.modules[0]],
      }),
    ).toThrow();
  });
});
