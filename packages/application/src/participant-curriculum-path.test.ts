import { describe, expect, it } from "vitest";
import {
  createLearningAssignment,
  transitionLearningAssignment,
  type LearningAssignmentState,
} from "@cvg/domain";
import { evaluateModuleAttempt } from "@cvg/curriculum";
import { buildParticipantCurriculumPath } from "./participant-curriculum-path.js";
import {
  deriveJourneyNextAction,
  deriveJourneyNextActionTarget,
  type ParticipantLearningJourneyState,
} from "./journey-use-cases.js";
describe("scoped curriculum prerequisites", () => {
  it.each([false, true])(
    "cannot use completion in another scope to unlock M03; reversed=%s",
    (reverse) => {
      const participantId = "synthetic-participant";
      const assignments: ParticipantLearningJourneyState["assignments"] = [
        {
          scopeId: "scope-one",
          state: {
            assignmentId: "completed",
            participantId,
            moduleId: "M02",
            status: "CONCLUIDO",
            version: 1,
            availableAt: "2026-09-01T00:00:00.000Z",
          },
        },
        {
          scopeId: "scope-two",
          state: {
            assignmentId: "dependent",
            participantId,
            moduleId: "M03",
            status: "ATRIBUIDO",
            version: 1,
            availableAt: "2026-09-01T00:00:00.000Z",
          },
        },
      ];
      const path = buildParticipantCurriculumPath({
        participantId,
        assignments: reverse ? [...assignments].reverse() : assignments,
        activities: [],
        runtimes: [],
        results: [],
      });
      expect(path.find((item) => item.moduleId === "M03")?.status).toBe(
        "BLOQUEADO_PRE_REQUISITO",
      );
    },
  );
});

const participantId = "11111111-1111-4111-8111-111111111111";
const scopeId = "22222222-2222-4222-8222-222222222222";
const availableAt = "2026-09-01T00:00:00.000Z";

function startedAssignment(): LearningAssignmentState {
  let state = createLearningAssignment({
    assignmentId: "33333333-3333-4333-8333-333333333333",
    participantId,
    moduleId: "M01",
    availableAt,
  });
  state = transitionLearningAssignment(state, { type: "ATRIBUIR" });
  state = transitionLearningAssignment(state, {
    type: "DISPONIBILIZAR",
    now: availableAt,
  });
  return transitionLearningAssignment(state, { type: "INICIAR" });
}

function operationalJourney(
  assignment: LearningAssignmentState,
  staleActivity: boolean,
  remediation: boolean,
): ParticipantLearningJourneyState {
  const evaluation = evaluateModuleAttempt({
    moduleId: "M01",
    completedAt: availableAt,
    mode: "FORMATIVE_CHOICE",
    catalog: {
      moduleId: "M01",
      items: [
        {
          id: "synthetic-choice",
          moduleId: "M01",
          sessionId: "S1",
          objectiveId: "synthetic-objective",
          kind: "RECUPERACAO_ATIVA",
          ordinal: 1,
          title: "Synthetic technical item",
          responseMode: "CHOICE",
          prompt: "Synthetic technical item",
          critical: false,
          remediationTargetObjectiveId: "synthetic-objective",
          feedback: "Synthetic technical feedback",
          sourceRefs: [
            { code: "F-01", locator: "synthetic", updateRequired: false },
          ],
          choices: [
            { id: "yes", label: "A", text: "Yes" },
            { id: "no", label: "B", text: "No" },
          ],
          correctChoiceIds: ["yes"],
        },
      ],
    },
    answers: [{ itemId: "synthetic-choice", selectedChoiceIds: ["no"] }],
  });
  return {
    participantId,
    assignments: [{ scopeId, state: assignment }],
    activities: [
      {
        scopeId,
        activityId: "44444444-4444-4444-8444-444444444444",
        moduleId: "M01",
        learningAssignmentId: assignment.assignmentId,
        slug: "synthetic-operational",
        title: "Synthetic activity",
        status: staleActivity
          ? "EM_ANDAMENTO"
          : assignment.status === "PAUSADO"
            ? "PAUSADO"
            : "BLOQUEADO",
        nextAction: staleActivity
          ? "RETOMAR_ATIVIDADE"
          : "CONSULTAR_PROXIMO_PASSO",
        attemptId: "55555555-5555-4555-8555-555555555555",
        attemptStatus: "SALVA",
        attemptVersion: 2,
      },
    ],
    runtimes: remediation
      ? [
          {
            participantId,
            scopeId,
            version: 1,
            updatedAt: availableAt,
            evaluation,
          },
        ]
      : [],
    results: [],
  };
}

describe("operational assignment authority precedes curriculum guidance", () => {
  it.each(["PAUSADO", "BLOQUEADO"] as const)(
    "%s suppresses synchronized and stale activity actions without erasing digital evidence",
    (status) => {
      const assignment = transitionLearningAssignment(
        startedAssignment(),
        status === "PAUSADO"
          ? { type: "PAUSAR" }
          : { type: "BLOQUEAR", reason: "CONTEUDO_RETIRADO" },
      );
      for (const stale of [false, true]) {
        for (const remediation of [false, true]) {
          const journey = operationalJourney(assignment, stale, remediation);
          const before = JSON.stringify(journey);
          expect(
            buildParticipantCurriculumPath(journey).find(
              (item) => item.moduleId === "M01",
            ),
          ).toMatchObject({ status, nextAction: "CONSULTAR_PROXIMO_PASSO" });
          expect(deriveJourneyNextAction(journey)).toBe(
            "CONSULTAR_PROXIMO_PASSO",
          );
          expect(deriveJourneyNextActionTarget(journey)).toBeUndefined();
          expect(JSON.stringify(journey)).toBe(before);
        }
      }
    },
  );

  it.each([false, true])(
    "selects an available authorized scope ahead of a suspended scope; reversed=%s",
    (reversed) => {
      const paused = operationalJourney(
        transitionLearningAssignment(startedAssignment(), { type: "PAUSAR" }),
        true,
        true,
      );
      const activeScope = "22222222-2222-4222-8222-222222222223";
      const activeAssignment = {
        ...startedAssignment(),
        assignmentId: "33333333-3333-4333-8333-333333333334",
      };
      const activeActivity = {
        scopeId: activeScope,
        activityId: "44444444-4444-4444-8444-444444444445",
        moduleId: "M01",
        learningAssignmentId: activeAssignment.assignmentId,
        slug: "synthetic-active",
        title: "Synthetic active activity",
        status: "EM_ANDAMENTO" as const,
        nextAction: "RETOMAR_ATIVIDADE" as const,
        attemptId: "55555555-5555-4555-8555-555555555556",
        attemptStatus: "SALVA" as const,
        attemptVersion: 2,
      };
      const assignments = [
        ...paused.assignments,
        { scopeId: activeScope, state: activeAssignment },
      ];
      const journey = {
        ...paused,
        assignments: reversed ? assignments.reverse() : assignments,
        activities: [...paused.activities, activeActivity],
      };
      expect(
        buildParticipantCurriculumPath(journey).find(
          (item) => item.moduleId === "M01",
        ),
      ).toMatchObject({ status: "EM_ANDAMENTO", nextAction: "RETOMAR_MODULO" });
      expect(deriveJourneyNextAction(journey)).toBe("RETOMAR_ATIVIDADE");
      expect(deriveJourneyNextActionTarget(journey)?.activityId).toBe(
        activeActivity.activityId,
      );
    },
  );

  it("restores guidance only after an authorized resume", () => {
    const paused = transitionLearningAssignment(startedAssignment(), {
      type: "PAUSAR",
    });
    const resumed = transitionLearningAssignment(paused, { type: "RETOMAR" });
    const journey = operationalJourney(resumed, true, false);
    expect(
      buildParticipantCurriculumPath(journey).find(
        (item) => item.moduleId === "M01",
      )?.nextAction,
    ).toBe("RETOMAR_MODULO");
    expect(deriveJourneyNextAction(journey)).toBe("RETOMAR_ATIVIDADE");
    expect(deriveJourneyNextActionTarget(journey)).toBeDefined();
  });
});
