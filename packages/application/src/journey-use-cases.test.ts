import { describe, expect, it } from "vitest";

import {
  deriveJourneyNextAction,
  deriveJourneyNextActionTarget,
  getParticipantLearningJourney,
  type ParticipantJourneyActivity,
  type ParticipantLearningJourneyState,
  type ParticipantJourneyReadPort,
} from "./journey-use-cases.js";

const participantId = "11111111-1111-4111-8111-111111111111";
const scopeId = "22222222-2222-4222-8222-222222222222";
const assignmentId = "33333333-3333-4333-8333-333333333333";
const activityId = "44444444-4444-4444-8444-444444444444";

const state: ParticipantLearningJourneyState = {
  participantId,
  assignments: [
    {
      scopeId,
      state: {
        assignmentId,
        participantId,
        moduleId: "M02",
        availableAt: "2026-08-10T05:00:00.000Z",
        status: "EM_ANDAMENTO",
        version: 1,
      },
    },
  ],
  activities: [
    {
      scopeId,
      activityId,
      moduleId: "M02",
      learningAssignmentId: assignmentId,
      slug: "emergencia-m02-v1",
      title: "Emergência",
      status: "EM_ANDAMENTO",
      attemptId: "55555555-5555-4555-8555-555555555555",
      attemptStatus: "SALVA",
      attemptVersion: 2,
      nextAction: "RETOMAR_ATIVIDADE",
    },
  ],
  results: [],
  runtimes: [],
};

const assignment = state.assignments[0];
const activity = state.activities[0];

if (assignment === undefined || activity === undefined) {
  throw new Error("journey fixture must contain an assignment and activity");
}

function repository(
  value: ParticipantLearningJourneyState,
): ParticipantJourneyReadPort {
  return {
    findParticipantLearningJourney: async () => value,
  };
}

describe("participant learning journey use case", () => {
  it.each([false, true])(
    "prioritizes unevaluated mandatory work over completed-module retention; reversed=%s",
    async (reversed) => {
      const nextAssignmentId = "33333333-3333-4333-8333-333333333334";
      const nextActivityId = "44444444-4444-4444-8444-444444444445";
      const old = partialMastery("ATIVIDADES_PENDENTES");
      const runtime = old.runtimes[0];
      if (runtime === undefined) throw new Error("Missing retention fixture");
      const evaluation = { ...runtime.evaluation };
      delete evaluation.activityProgress;
      const activities: readonly ParticipantJourneyActivity[] = [
        {
          ...activity,
          status: "CONCLUIDO",
          attemptStatus: "CORRIGIDA_HUMANAMENTE",
          nextAction: "CONSULTAR_PROXIMO_PASSO",
        },
        {
          ...activity,
          activityId: nextActivityId,
          moduleId: "M03",
          learningAssignmentId: nextAssignmentId,
          status: "DISPONIVEL",
          nextAction: "INICIAR_ATIVIDADE",
        },
      ];
      const value: ParticipantLearningJourneyState = {
        ...state,
        assignments: [
          {
            ...assignment,
            state: { ...assignment.state, status: "CONCLUIDO" },
          },
          {
            ...assignment,
            state: {
              ...assignment.state,
              assignmentId: nextAssignmentId,
              moduleId: "M03",
              status: "DISPONIVEL",
            },
          },
        ],
        activities: reversed ? [...activities].reverse() : activities,
        runtimes: [{ ...runtime, evaluation }],
        completionReceipts: [
          {
            participantId,
            scopeId,
            moduleId: "M02",
            assignmentId,
            completedAt: "2026-08-10T12:00:00.000Z",
            completedAssignmentVersion: 1,
          },
        ],
      };
      await expect(
        getParticipantLearningJourney(
          { participantId, scopeIds: [scopeId] },
          repository(value),
        ),
      ).resolves.toMatchObject({
        nextAction: "INICIAR_ATIVIDADE",
        nextActionTarget: { kind: "ACTIVITY", activityId: nextActivityId },
      });
    },
  );

  function partialMastery(
    progress: "ATIVIDADES_PENDENTES" | "AGUARDA_CORRECAO_HUMANA",
  ): ParticipantLearningJourneyState {
    return {
      ...state,
      runtimes: [
        {
          participantId,
          scopeId,
          version: 1,
          updatedAt: "2026-08-10T05:00:00.000Z",
          evaluation: {
            moduleId: "M02",
            status: "DOMINIO_DIGITAL",
            nextAction: "REVISAR_RETENCAO",
            activityProgress: progress,
            objectiveResults: [],
            remediationObjectiveIds: [],
            criticalErrorItemIds: [],
            invalidAnswerItemIds: [],
            unansweredChoiceItemIds: [],
            openResponseItemIds: ["synthetic-mandatory-case"],
            retentionReviews: [],
            practicalCompetenceClaim: "PROIBIDO_MVP",
          },
        },
      ],
    };
  }

  it("keeps independently assigned work in another authorized scope ahead of retention without creating a runtime", async () => {
    const otherScope = "22222222-2222-4222-8222-222222222223";
    const nextAssignmentId = "33333333-3333-4333-8333-333333333335";
    const nextActivityId = "44444444-4444-4444-8444-444444444446";
    const runtime = partialMastery("ATIVIDADES_PENDENTES").runtimes[0];
    if (runtime === undefined) throw new Error("Missing retention fixture");
    const evaluation = { ...runtime.evaluation };
    delete evaluation.activityProgress;
    const value: ParticipantLearningJourneyState = {
      ...state,
      assignments: [
        { ...assignment, state: { ...assignment.state, status: "CONCLUIDO" } },
        {
          scopeId: otherScope,
          state: {
            ...assignment.state,
            assignmentId: nextAssignmentId,
            moduleId: "M01",
            status: "DISPONIVEL",
          },
        },
      ],
      activities: [
        {
          ...activity,
          status: "CONCLUIDO",
          attemptStatus: "CORRIGIDA_HUMANAMENTE",
          nextAction: "CONSULTAR_PROXIMO_PASSO",
        },
        {
          ...activity,
          scopeId: otherScope,
          moduleId: "M01",
          learningAssignmentId: nextAssignmentId,
          activityId: nextActivityId,
          status: "DISPONIVEL",
          nextAction: "INICIAR_ATIVIDADE",
        },
      ],
      runtimes: [{ ...runtime, evaluation }],
    };
    await expect(
      getParticipantLearningJourney(
        { participantId, scopeIds: [scopeId, otherScope] },
        repository(value),
      ),
    ).resolves.toMatchObject({
      nextAction: "INICIAR_ATIVIDADE",
      nextActionTarget: { kind: "ACTIVITY", activityId: nextActivityId },
    });
    await expect(
      getParticipantLearningJourney(
        { participantId, scopeIds: [scopeId] },
        repository(value),
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it.each(["ATIVIDADES_PENDENTES", "AGUARDA_CORRECAO_HUMANA"] as const)(
    "derives actual %s work when a legacy runtime omits its optional progress hint",
    (progress) => {
      const pending = partialMastery(progress);
      const runtime = pending.runtimes[0];
      if (runtime === undefined) throw new Error("Missing runtime fixture");
      const evaluation = { ...runtime.evaluation };
      delete evaluation.activityProgress;
      const legacy: ParticipantLearningJourneyState = {
        ...pending,
        activities: pending.activities.map((item) => ({
          ...item,
          attemptStatus:
            progress === "ATIVIDADES_PENDENTES"
              ? "SALVA"
              : "AGUARDA_CORRECAO_HUMANA",
          nextAction:
            progress === "ATIVIDADES_PENDENTES"
              ? "RETOMAR_ATIVIDADE"
              : "AGUARDAR_CORRECAO",
        })),
        runtimes: [{ ...runtime, evaluation }],
      };
      expect(deriveJourneyNextAction(legacy)).toBe(
        progress === "ATIVIDADES_PENDENTES"
          ? "RETOMAR_ATIVIDADE"
          : "AGUARDAR_CORRECAO_HUMANA",
      );
      expect(deriveJourneyNextActionTarget(legacy)).toEqual(
        progress === "ATIVIDADES_PENDENTES"
          ? { kind: "ACTIVITY", activityId }
          : undefined,
      );
    },
  );

  it("prioritizes the assigned pending case over future retention after quiz mastery", () => {
    const pending = partialMastery("ATIVIDADES_PENDENTES");
    expect(deriveJourneyNextAction(pending)).toBe("RETOMAR_ATIVIDADE");
    expect(deriveJourneyNextActionTarget(pending)).toEqual({
      kind: "ACTIVITY",
      activityId,
    });
  });

  it("keeps pending human correction ahead of retention without inventing a target", () => {
    const pending = partialMastery("AGUARDA_CORRECAO_HUMANA");
    expect(deriveJourneyNextAction(pending)).toBe("AGUARDAR_CORRECAO_HUMANA");
    expect(deriveJourneyNextActionTarget(pending)).toBeUndefined();
  });

  it.each([false, true])(
    "prioritizes mandatory work across runtime order: reversed=%s",
    (reversed) => {
      const pending = partialMastery("ATIVIDADES_PENDENTES");
      const current = pending.runtimes[0];
      if (current === undefined) throw new Error("Missing runtime fixture");
      const { activityProgress, ...evaluation } = current.evaluation;
      void activityProgress;
      const retention = {
        ...current,
        evaluation: { ...evaluation, moduleId: "M01" },
      };
      const journey = {
        ...pending,
        runtimes: reversed ? [current, retention] : [retention, current],
      };
      expect(deriveJourneyNextAction(journey)).toBe("RETOMAR_ATIVIDADE");
      expect(deriveJourneyNextActionTarget(journey)).toEqual({
        kind: "ACTIVITY",
        activityId,
      });
    },
  );

  it.each(["CONCLUIDO", "CONCLUIDO_COM_RETENCAO_PENDENTE"] as const)(
    "reconciles stale human-pending runtime with authoritative %s",
    (status) => {
      const pending = partialMastery("AGUARDA_CORRECAO_HUMANA");
      const completed = {
        ...pending,
        assignments: [
          { ...assignment, state: { ...assignment.state, status } },
        ],
        activities: [
          {
            ...activity,
            status: "CONCLUIDO" as const,
            attemptStatus: "CORRIGIDA_HUMANAMENTE" as const,
            nextAction: "CONSULTAR_PROXIMO_PASSO" as const,
          },
        ],
        completionReceipts: [
          {
            participantId,
            scopeId,
            moduleId: "M02",
            assignmentId,
            completedAt: "2026-08-10T12:00:00.000Z",
            completedAssignmentVersion: 1,
          },
        ],
      };
      expect(deriveJourneyNextAction(completed)).toBe("REVISAR_RETENCAO");
      expect(deriveJourneyNextActionTarget(completed)).toBeUndefined();
    },
  );

  it.each(["assignment", "participant", "status"])(
    "rejects remediation targets with mismatched assignment %s",
    (mismatch) => {
      const pending = partialMastery("ATIVIDADES_PENDENTES");
      const current = pending.runtimes[0];
      if (current === undefined) throw new Error("Missing runtime fixture");
      const { activityProgress: _progress, ...evaluation } = current.evaluation;
      void _progress;
      const remediation = {
        ...pending,
        runtimes: [
          {
            ...current,
            evaluation: {
              ...evaluation,
              status: "EM_REMEDIACAO" as const,
              nextAction: "EXECUTAR_REMEDIACAO" as const,
            },
          },
        ],
        activities: [
          {
            ...activity,
            status: "EM_REFORCO" as const,
            ...(mismatch === "assignment"
              ? { learningAssignmentId: "66666666-6666-4666-8666-666666666666" }
              : {}),
          },
        ],
        assignments: [
          {
            ...assignment,
            state: {
              ...assignment.state,
              ...(mismatch === "participant"
                ? { participantId: "66666666-6666-4666-8666-666666666666" }
                : {}),
              ...(mismatch === "status"
                ? { status: "CONCLUIDO" as const }
                : {}),
            },
          },
        ],
      };
      expect(deriveJourneyNextActionTarget(remediation)).toBeUndefined();
    },
  );

  it.each(["ATIVIDADES_PENDENTES", "AGUARDA_CORRECAO_HUMANA"] as const)(
    "does not let completed assignment metadata hide actual %s",
    (progress) => {
      const pending = partialMastery(progress);
      const human = progress === "AGUARDA_CORRECAO_HUMANA";
      const contradictory: ParticipantLearningJourneyState = {
        ...pending,
        assignments: [
          {
            ...assignment,
            state: { ...assignment.state, status: "CONCLUIDO" },
          },
        ],
        activities: [
          {
            ...activity,
            nextAction: human ? "AGUARDAR_CORRECAO" : "RETOMAR_ATIVIDADE",
            attemptStatus: human ? "AGUARDA_CORRECAO_HUMANA" : "SALVA",
          },
        ],
      };
      expect(deriveJourneyNextAction(contradictory)).toBe(
        human ? "AGUARDAR_CORRECAO_HUMANA" : "RETOMAR_ATIVIDADE",
      );
      expect(deriveJourneyNextActionTarget(contradictory)).toEqual(
        human ? undefined : { kind: "ACTIVITY", activityId },
      );
    },
  );

  it("does not let a completed sibling assignment suppress a bound active assignment", () => {
    const pending = partialMastery("ATIVIDADES_PENDENTES");
    const sibling: ParticipantLearningJourneyState = {
      ...pending,
      assignments: [
        {
          ...assignment,
          state: {
            ...assignment.state,
            assignmentId: "99999999-9999-4999-8999-999999999999",
            status: "CONCLUIDO",
          },
        },
        assignment,
      ],
    };
    expect(deriveJourneyNextAction(sibling)).toBe("RETOMAR_ATIVIDADE");
    expect(deriveJourneyNextActionTarget(sibling)).toEqual({
      kind: "ACTIVITY",
      activityId,
    });
  });

  it.each(["scope", "module", "assignment", "noActivity"])(
    "does not suggest an unrelated pending case: %s",
    (mismatch) => {
      const pending = partialMastery("ATIVIDADES_PENDENTES");
      const unrelated = {
        ...pending,
        activities:
          mismatch === "noActivity"
            ? []
            : [
                {
                  ...activity,
                  ...(mismatch === "scope"
                    ? { scopeId: "66666666-6666-4666-8666-666666666666" }
                    : {}),
                  ...(mismatch === "module" ? { moduleId: "M03" } : {}),
                  ...(mismatch === "assignment"
                    ? {
                        learningAssignmentId:
                          "66666666-6666-4666-8666-666666666666",
                      }
                    : {}),
                },
              ],
      };
      expect(deriveJourneyNextAction(unrelated)).toBe(
        "CONSULTAR_PROXIMO_PASSO",
      );
      expect(deriveJourneyNextActionTarget(unrelated)).toBeUndefined();
    },
  );

  it("prioritizes an available assignment, a pending result, then consultation", () => {
    const availableAssignment = {
      ...assignment,
      // The first module is available without an unmet previous-module prerequisite.
      state: {
        ...assignment.state,
        moduleId: "M01",
        status: "DISPONIVEL" as const,
      },
    } satisfies ParticipantLearningJourneyState["assignments"][number];
    const noActionActivity = {
      scopeId: activity.scopeId,
      activityId: activity.activityId,
      slug: activity.slug,
      title: activity.title,
      status: activity.status,
      nextAction: "CONSULTAR_PROXIMO_PASSO" as const,
    } satisfies ParticipantJourneyActivity;
    const pendingResult = {
      scopeId,
      participantId,
      state: {
        resultId: "88888888-8888-4888-8888-888888888888",
        attemptId: "99999999-9999-4999-8999-999999999999",
        ruleVersion: "synthetic-v1",
        version: 0,
        status: "RESULTADO_EM_PROCESSAMENTO" as const,
      },
    };

    expect(
      deriveJourneyNextAction({
        ...state,
        assignments: [availableAssignment],
        activities: [noActionActivity],
        results: [],
      }),
    ).toBe("INICIAR_ATIVIDADE");
    expect(
      deriveJourneyNextAction({
        ...state,
        assignments: [],
        activities: [noActionActivity],
        results: [pendingResult],
      }),
    ).toBe("AGUARDAR_CORRECAO_HUMANA");
    expect(
      deriveJourneyNextAction({
        ...state,
        assignments: [],
        activities: [noActionActivity],
        results: [],
      }),
    ).toBe("CONSULTAR_PROXIMO_PASSO");
  });

  it("fails closed for empty identity and data returned outside requested scopes", async () => {
    await expect(
      getParticipantLearningJourney(
        { participantId: "", scopeIds: [scopeId] },
        repository(state),
      ),
    ).rejects.toMatchObject({ code: "validation_error" });

    await expect(
      getParticipantLearningJourney(
        { participantId, scopeIds: [scopeId] },
        repository({
          ...state,
          activities: [
            {
              ...activity,
              scopeId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            },
          ],
        }),
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("returns an immutable journey with the resumable next action", async () => {
    const result = await getParticipantLearningJourney(
      { participantId, scopeIds: [scopeId] },
      repository(state),
    );

    expect(result.nextAction).toBe("RETOMAR_ATIVIDADE");
    expect(result.nextActionTarget).toEqual({
      kind: "ACTIVITY",
      activityId,
    });
    expect(result).toMatchObject(state);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.activities)).toBe(true);
    expect(Object.isFrozen(result.nextActionTarget)).toBe(true);
  });

  it("prioritizes remediation and rejects a repository identity mismatch", async () => {
    const remediationRuntime = {
      participantId,
      scopeId,
      version: 1,
      updatedAt: "2026-08-10T05:00:00.000Z",
      evaluation: {
        moduleId: "M02",
        status: "EM_REMEDIACAO" as const,
        nextAction: "EXECUTAR_REMEDIACAO" as const,
        objectiveResults: [],
        remediationObjectiveIds: ["OBJ-1"],
        criticalErrorItemIds: [],
        invalidAnswerItemIds: [],
        unansweredChoiceItemIds: [],
        openResponseItemIds: [],
        retentionReviews: [],
        practicalCompetenceClaim: "PROIBIDO_MVP" as const,
      },
    };

    expect(
      deriveJourneyNextActionTarget({
        ...state,
        activities: [
          {
            ...activity,
            status: "EM_REFORCO",
            nextAction: "INICIAR_ATIVIDADE",
          },
        ],
        runtimes: [remediationRuntime],
      }),
    ).toEqual({ kind: "ACTIVITY", activityId });

    await expect(
      getParticipantLearningJourney(
        { participantId, scopeIds: [scopeId] },
        repository({
          ...state,
          activities: [
            {
              ...activity,
              status: "EM_REFORCO",
              nextAction: "INICIAR_ATIVIDADE",
            },
          ],
          runtimes: [remediationRuntime],
        }),
      ),
    ).resolves.toMatchObject({
      nextAction: "EXECUTAR_REMEDIACAO",
      nextActionTarget: { kind: "ACTIVITY", activityId },
    });

    expect(
      deriveJourneyNextActionTarget({
        ...state,
        runtimes: [
          {
            ...remediationRuntime,
            evaluation: {
              ...remediationRuntime.evaluation,
              nextAction: "REVISAR_RETENCAO",
              status: "DOMINIO_DIGITAL",
              remediationObjectiveIds: [],
              retentionReviews: [
                {
                  day: 30,
                  dueAt: "2026-09-09T05:00:00.000Z",
                  status: "PENDENTE",
                },
              ],
            },
          },
        ],
        assignments: [
          {
            ...assignment,
            state: { ...assignment.state, status: "CONCLUIDO" },
          },
        ],
        activities: [
          {
            ...activity,
            status: "CONCLUIDO",
            attemptStatus: "CORRIGIDA_HUMANAMENTE",
            nextAction: "CONSULTAR_PROXIMO_PASSO",
          },
        ],
      }),
    ).toBeUndefined();

    expect(
      deriveJourneyNextActionTarget({
        ...state,
        activities: [
          {
            scopeId: activity.scopeId,
            activityId: activity.activityId,
            moduleId: "M02",
            slug: activity.slug,
            title: activity.title,
            status: "EM_REFORCO",
            nextAction: "INICIAR_ATIVIDADE",
          },
        ],
        runtimes: [remediationRuntime],
      }),
    ).toBeUndefined();

    expect(
      deriveJourneyNextActionTarget({
        ...state,
        activities: [
          {
            scopeId: activity.scopeId,
            activityId: activity.activityId,
            slug: activity.slug,
            title: activity.title,
            status: "EM_REFORCO",
            nextAction: "INICIAR_ATIVIDADE",
          },
        ],
        runtimes: [remediationRuntime],
      }),
    ).toBeUndefined();

    expect(
      deriveJourneyNextActionTarget({
        ...state,
        activities: [
          {
            ...activity,
            scopeId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            status: "EM_REFORCO",
            nextAction: "INICIAR_ATIVIDADE",
          },
        ],
        runtimes: [remediationRuntime],
      }),
    ).toBeUndefined();

    await expect(
      getParticipantLearningJourney(
        { participantId, scopeIds: [scopeId] },
        repository({
          ...state,
          participantId: "66666666-6666-4666-8666-666666666666",
        }),
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
  });
});
