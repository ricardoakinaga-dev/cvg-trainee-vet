import { describe, expect, it } from "vitest";

import { parseAdminDashboard } from "./admin-dashboard.js";

const scopeId = "11111111-1111-4111-8111-111111111111";
const participantId = "22222222-2222-4222-8222-222222222222";

const trainingCatalog = Array.from({ length: 24 }, (_, index) => ({
  moduleId: `M${String(index + 1).padStart(2, "0")}`,
  month: index + 1,
  title: index === 0 ? "Fundamentos" : `Módulo ${index + 1}`,
  competence: "Raciocínio clínico digital seguro.",
  assignedParticipants: index === 0 ? 1 : 0,
  activeParticipants: 0,
  completedParticipants: index === 0 ? 1 : 0,
}));

describe("admin dashboard contract", () => {
  it("accepts the internal training dashboard projection", () => {
    const dashboard = parseAdminDashboard({
      curriculumId: "CVG-CURRICULUM-24M",
      curriculumVersion: "3.0.0",
      summary: {
        participantsTotal: 1,
        activeParticipants: 1,
        invitedParticipants: 0,
        participantsInProgress: 0,
        averageProgressPercent: 4,
        assignedModules: 1,
        completedModules: 1,
      },
      participants: [
        {
          participantId,
          professionalEmail: "vet@example.test",
          accountStatus: "ACTIVE",
          scopeIds: [scopeId],
          assignedModules: 1,
          completedModules: 1,
          progressPercent: 4,
          activeModuleId: "M02",
          activeModuleTitle: "Próximo passo",
          nextAction: "REVISAR_PROXIMO_MODULO",
        },
      ],
      trainingCatalog,
    });

    expect(dashboard.participants[0]?.professionalEmail).toBe(
      "vet@example.test",
    );
    expect(dashboard.trainingCatalog).toHaveLength(24);
  });

  it("rejects fields outside the minimum internal admin projection", () => {
    expect(() =>
      parseAdminDashboard({
        curriculumId: "CVG-CURRICULUM-24M",
        curriculumVersion: "3.0.0",
        summary: {
          participantsTotal: 0,
          activeParticipants: 0,
          invitedParticipants: 0,
          participantsInProgress: 0,
          averageProgressPercent: 0,
          assignedModules: 0,
          completedModules: 0,
        },
        participants: [],
        trainingCatalog,
        sourceRefs: ["BOOK_ETTINGER_9E"],
      }),
    ).toThrow();
  });
});
