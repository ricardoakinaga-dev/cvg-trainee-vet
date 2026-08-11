import { describe, expect, it } from "vitest";

import { createCurriculumMaterializationPlan } from "./materialization-plan.js";

const input = {
  scopeId: "11111111-1111-4111-8111-111111111111",
  authorId: "22222222-2222-4222-8222-222222222222",
  participantId: "33333333-3333-4333-8333-333333333333",
  availableAt: "2026-08-11T10:00:00.000Z",
} as const;

describe("curriculum materialization plan", () => {
  it("plans all 24 modules as draft, withdrawn and not started", () => {
    const plan = createCurriculumMaterializationPlan(input);

    expect(plan.modules).toHaveLength(24);
    expect(plan.modules.map((module) => module.moduleId)).toEqual(
      Array.from(
        { length: 24 },
        (_, index) => `M${String(index + 1).padStart(2, "0")}`,
      ),
    );
    expect(
      plan.modules.every(
        (module) =>
          module.activityStatus === "WITHDRAWN" &&
          module.contentStatus === "PROJECAO_VERIFICADA" &&
          module.assignmentStatus === "NAO_ATRIBUIDO" &&
          module.runtimeState.status === "PENDENTE" &&
          module.runtimeState.nextAction === "INICIAR_BASELINE",
      ),
    ).toBe(true);
    expect(plan.modules.every((module) => module.items.length <= 100)).toBe(
      true,
    );
    expect(
      plan.modules.every((module) =>
        module.items.every(
          (item) =>
            item.contentId !== item.authoringItem.contentId &&
            item.authoringItem.sourceRefs.length > 0 &&
            item.authoringItem.participant.id === item.authoringItem.contentId,
        ),
      ),
    ).toBe(true);
  });

  it("rejects identities or timestamps that could cross the materialization boundary", () => {
    expect(() =>
      createCurriculumMaterializationPlan({ ...input, scopeId: "scope" }),
    ).toThrow("scopeId must be a UUID");
    expect(() =>
      createCurriculumMaterializationPlan({
        ...input,
        availableAt: "not-a-timestamp",
      }),
    ).toThrow("availableAt must be an ISO timestamp");
  });
});
