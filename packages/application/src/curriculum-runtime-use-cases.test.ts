import { describe, expect, it } from "vitest";

import {
  evaluateAndPersistCurriculumModule,
  getParticipantCurriculumRuntime,
  type CurriculumRuntimeState,
  type CurriculumRuntimeWritePort,
} from "./curriculum-runtime-use-cases.js";
import { getModuleDraftPack, type ModuleAnswer } from "@cvg/curriculum";

const participantId = "11111111-1111-4111-8111-111111111111";
const scopeId = "22222222-2222-4222-8222-222222222222";

function allChoiceAnswers(moduleId: string): readonly ModuleAnswer[] {
  return getModuleDraftPack(moduleId)
    .items.filter((item) => item.responseMode === "CHOICE")
    .map((item) => ({
      itemId: item.id,
      selectedChoiceIds: item.correctChoiceIds ?? [],
    }));
}

describe("curriculum runtime application integration", () => {
  it("evaluates a module and persists the server-side learning state", async () => {
    let stored: CurriculumRuntimeState | null = null;
    const repository: CurriculumRuntimeWritePort = {
      saveCurriculumRuntime: async (input) => {
        stored = Object.freeze({
          participantId: input.participantId,
          scopeId: input.scopeId,
          version: 1,
          updatedAt: "2026-08-10T01:00:00.000Z",
          evaluation: input.evaluation,
        });
        return stored;
      },
    };

    const state = await evaluateAndPersistCurriculumModule(
      {
        participantId,
        scopeId,
        moduleId: "M03",
        answers: allChoiceAnswers("M03"),
        completedAt: "2026-08-10T01:00:00.000Z",
        mode: "FORMATIVE_CHOICE",
      },
      repository,
    );

    expect(state).toMatchObject({
      participantId,
      scopeId,
      version: 1,
      evaluation: {
        moduleId: "M03",
        status: "DOMINIO_DIGITAL",
        nextAction: "REVISAR_RETENCAO",
        practicalCompetenceClaim: "PROIBIDO_MVP",
      },
    });
    expect(stored).not.toBeNull();
    expect(
      (stored as unknown as CurriculumRuntimeState).evaluation.scorePercent,
    ).toBe(100);
  });

  it("keeps open responses pending human correction when integrated", async () => {
    const repository: CurriculumRuntimeWritePort = {
      saveCurriculumRuntime: async (input) =>
        Object.freeze({
          participantId: input.participantId,
          scopeId: input.scopeId,
          version: 1,
          updatedAt: "2026-08-10T01:00:00.000Z",
          evaluation: input.evaluation,
        }),
    };
    const pack = getModuleDraftPack("M03");
    const state = await evaluateAndPersistCurriculumModule(
      {
        participantId,
        scopeId,
        moduleId: "M03",
        answers: pack.items.map((item) =>
          item.responseMode === "CHOICE"
            ? {
                itemId: item.id,
                selectedChoiceIds: item.correctChoiceIds ?? [],
              }
            : { itemId: item.id, text: "Plano fictício para correção humana." },
        ),
        completedAt: "2026-08-10T01:00:00.000Z",
        mode: "MODULE_COMPLETION",
      },
      repository,
    );

    expect(state.evaluation.status).toBe("AGUARDA_CORRECAO_HUMANA");
    expect(state.evaluation.scorePercent).toBeUndefined();
  });

  it("reads a participant state without exposing another participant's state", async () => {
    const state: CurriculumRuntimeState = {
      participantId,
      scopeId,
      version: 2,
      updatedAt: "2026-08-10T01:00:00.000Z",
      evaluation: {
        moduleId: "M03",
        status: "DOMINIO_DIGITAL",
        nextAction: "REVISAR_RETENCAO",
        objectiveResults: [],
        remediationObjectiveIds: [],
        criticalErrorItemIds: [],
        invalidAnswerItemIds: [],
        unansweredChoiceItemIds: [],
        openResponseItemIds: [],
        retentionReviews: [],
        practicalCompetenceClaim: "PROIBIDO_MVP",
        scorePercent: 100,
      },
    };
    const result = await getParticipantCurriculumRuntime(
      { participantId, moduleId: "M03" },
      { findCurriculumRuntime: async () => state },
    );

    expect(result).toEqual(state);
    await expect(
      getParticipantCurriculumRuntime(
        { participantId: "", moduleId: "M03" },
        { findCurriculumRuntime: async () => state },
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
  });
});
