import { describe, expect, it } from "vitest";
import type { AttemptStatus, LearningAssignmentStatus } from "@cvg/domain";
import {
  createAttempt,
  createLearningAssignment,
  transitionAttempt,
  transitionLearningAssignment,
} from "@cvg/domain";
import type { AttemptEvent, LearningAssignmentEvent } from "@cvg/domain";
import { deriveProgressNextAction } from "./progress-use-cases.js";
import {
  deriveJourneyNextAction,
  deriveJourneyNextActionTarget,
  hasCoherentModuleCompletion,
  type ParticipantLearningJourneyState,
} from "./journey-use-cases.js";
import type { ModuleCompletionReceiptFact } from "./journey-module-authority.js";
import { deriveParticipantDashboard } from "./dashboard-use-cases.js";

const participantId = "11111111-1111-4111-8111-111111111111";
const scopeId = "22222222-2222-4222-8222-222222222222";
const assignmentId = "33333333-3333-4333-8333-333333333333";
const activityId = "44444444-4444-4444-8444-444444444444";
const attemptId = "55555555-5555-4555-8555-555555555555";
const otherScope = "22222222-2222-4222-8222-222222222223";

const now = "2026-10-03T12:00:00.000Z";
function producedAssignment(
  moduleId: string,
  events: readonly LearningAssignmentEvent[],
) {
  return {
    scopeId,
    state: events.reduce(
      transitionLearningAssignment,
      createLearningAssignment({
        assignmentId:
          moduleId === "M02"
            ? assignmentId
            : "33333333-3333-4333-8333-333333333334",
        participantId,
        moduleId,
        availableAt: now,
      }),
    ),
  };
}
const completedEvents: readonly LearningAssignmentEvent[] = [
  { type: "ATRIBUIR" },
  { type: "DISPONIBILIZAR", now },
  { type: "INICIAR" },
  { type: "CONCLUIR" },
];
function producedActivity(
  assignment: ParticipantLearningJourneyState["assignments"][number],
  status: ParticipantLearningJourneyState["activities"][number]["status"],
  correction?:
    | "CORRIGIDA_AUTOMATICAMENTE"
    | "CORRIGIDA_HUMANAMENTE"
    | "AGUARDA_CORRECAO_HUMANA"
    | "SALVA",
  id?: string,
): ParticipantLearningJourneyState["activities"][number] {
  const producedActivityId =
    id ??
    (assignment.state.moduleId === "M02"
      ? "44444444-4444-4444-8444-444444444445"
      : activityId);
  const events: AttemptEvent[] = [{ type: "INICIAR" }, { type: "SALVAR" }];
  if (correction !== undefined && correction !== "SALVA") {
    events.push({ type: "SUBMETER", submittedAt: now });
    if (correction === "CORRIGIDA_AUTOMATICAMENTE")
      events.push({ type: "CORRIGIR_AUTOMATICAMENTE" });
    else {
      events.push({ type: "AGUARDAR_CORRECAO_HUMANA" });
      if (correction === "CORRIGIDA_HUMANAMENTE")
        events.push({ type: "CORRIGIR_HUMANAMENTE" });
    }
  }
  const attempt =
    correction === undefined
      ? undefined
      : events.reduce(
          transitionAttempt,
          createAttempt({
            participantId,
            activityId: producedActivityId,
            attemptId: producedActivityId.replace(
              /^44444444-4444-4444-8444/u,
              "55555555-5555-4555-8555",
            ),
          }),
        );
  return {
    scopeId: assignment.scopeId,
    moduleId: assignment.state.moduleId,
    learningAssignmentId: assignment.state.assignmentId,
    activityId: producedActivityId,
    slug: "synthetic-producer",
    title: "Synthetic producer",
    status,
    ...(attempt === undefined
      ? {}
      : {
          attemptId: attempt.attemptId,
          attemptStatus: attempt.status,
          attemptVersion: attempt.version,
        }),
    nextAction: deriveProgressNextAction(status, attempt?.status),
  };
}

function receipt(
  assignment: ParticipantLearningJourneyState["assignments"][number],
): ModuleCompletionReceiptFact {
  return {
    participantId,
    scopeId: assignment.scopeId,
    moduleId: assignment.state.moduleId,
    assignmentId: assignment.state.assignmentId,
    completedAt: now,
    completedAssignmentVersion: assignment.state.version,
  };
}

describe("R19 real producer and independent prerequisite authority", () => {
  it.each([
    "EXECUTAR_REMEDIACAO",
    "REVISAR_RETENCAO",
    "AGUARDAR_CORRECAO_HUMANA",
  ] as const)(
    "R23 future assignment cannot expose stale runtime action %s",
    (nextAction) => {
      const assigned = producedAssignment("M01", [{ type: "ATRIBUIR" }]);
      const future = {
        ...assigned,
        state: { ...assigned.state, availableAt: "2099-10-05T12:00:00.000Z" },
      };
      const previous = runtime();
      const value = {
        participantId,
        assignments: [future],
        activities: [],
        results: [],
        runtimes: [
          {
            ...previous,
            evaluation: { ...previous.evaluation, moduleId: "M01", nextAction },
          },
        ],
      };
      expect(deriveJourneyNextAction(value)).toBe("CONSULTAR_PROXIMO_PASSO");
      expect(deriveJourneyNextActionTarget(value)).toBeUndefined();
      expect(deriveParticipantDashboard(value).nextAction).toBe(
        "CONSULTAR_PROXIMO_PASSO",
      );
    },
  );
  it("R23 started work keeps runtime continuity despite a future availability date", () => {
    const assigned = producedAssignment("M01", completedEvents.slice(0, 3));
    const ongoing = {
      ...assigned,
      state: { ...assigned.state, availableAt: "2099-10-05T12:00:00.000Z" },
    };
    const previous = runtime();
    const value = {
      participantId,
      assignments: [ongoing],
      activities: [],
      results: [],
      runtimes: [
        {
          ...previous,
          evaluation: { ...previous.evaluation, moduleId: "M01" },
        },
      ],
    };
    expect(ongoing.state.status).toBe("EM_ANDAMENTO");
    expect(deriveJourneyNextAction(value)).toBe("EXECUTAR_REMEDIACAO");
  });
  it.each(["CORRIGIDA_AUTOMATICAMENTE", "CORRIGIDA_HUMANAMENTE"] as const)(
    "R23 retention keeps completed progress after legal %s transition",
    (correction) => {
      const completed = producedAssignment("M02", [
        ...completedEvents,
        { type: "AGENDAR_RETENCAO" },
      ]);
      const value = {
        participantId,
        assignments: [completed],
        activities: [
          producedActivity(
            completed,
            "CONCLUIDO_COM_RETENCAO_PENDENTE",
            correction,
          ),
        ],
        runtimes: [],
        results: [],
        completionReceipts: [receipt(completed)],
      };
      const dashboard = deriveParticipantDashboard(value);
      expect(dashboard.progress).toMatchObject({
        assignedActivities: 1,
        completedActivities: 1,
        progressPercent: 100,
        pendingCorrections: 0,
      });
      expect(
        dashboard.path.find((item) => item.moduleId === "M02")?.status,
      ).toBe("CONCLUIDO");
    },
  );
  it.each(["ATRIBUIDO", "DISPONIVEL"] as const)(
    "R23 future %s cannot become actionable or available via stale activity",
    (status) => {
      const assigned = producedAssignment("M01", [{ type: "ATRIBUIR" }]);
      const future = {
        ...assigned,
        state: {
          ...assigned.state,
          status,
          availableAt: "2099-10-05T12:00:00.000Z",
        },
      };
      const value = {
        participantId,
        assignments: [future],
        activities: [producedActivity(future, "DISPONIVEL")],
        runtimes: [],
        results: [],
      };
      expect(deriveJourneyNextAction(value)).toBe("CONSULTAR_PROXIMO_PASSO");
      expect(deriveJourneyNextActionTarget(value)).toBeUndefined();
      expect(
        deriveParticipantDashboard(value).path.find(
          (item) => item.moduleId === "M01",
        )?.status,
      ).not.toBe("DISPONIVEL");
    },
  );
  it.each(["CORRIGIDA_AUTOMATICAMENTE", "CORRIGIDA_HUMANAMENTE"] as const)(
    "permits the next module after legitimate %s producer completion",
    (correction) => {
      const predecessor = producedAssignment("M02", completedEvents);
      const dependent = producedAssignment("M03", completedEvents.slice(0, 2));
      const completed = producedActivity(predecessor, "CONCLUIDO", correction);
      const available = producedActivity(dependent, "DISPONIVEL");
      const value = {
        participantId,
        assignments: [predecessor, dependent],
        activities: [completed, available],
        runtimes: [],
        results: [],
        completionReceipts: [receipt(predecessor)],
      };
      expect(completed.attemptStatus).toBe(correction);
      expect(completed.nextAction).toBe("REVISAR_PROXIMO_CONTEUDO");
      expect(hasCoherentModuleCompletion(value, scopeId, "M02")).toBe(true);
      expect(deriveJourneyNextActionTarget(value)).toEqual({
        kind: "ACTIVITY",
        activityId,
      });
      expect(
        deriveParticipantDashboard(value).path.find(
          (item) => item.moduleId === "M03",
        )?.status,
      ).toBe("DISPONIVEL");
    },
  );
  it.each(["EM_ANDAMENTO", "EM_REFORCO"] as const)(
    "denies a stale bound %s activity while its dependent assignment remains assigned",
    (status) => {
      const predecessor = producedAssignment("M02", [{ type: "ATRIBUIR" }]);
      const dependent = producedAssignment("M03", [{ type: "ATRIBUIR" }]);
      const value = {
        participantId,
        assignments: [predecessor, dependent],
        activities: [producedActivity(dependent, status, "SALVA")],
        runtimes: [],
        results: [],
      };
      expect(dependent.state.status).toBe("ATRIBUIDO");
      expect(hasCoherentModuleCompletion(value, scopeId, "M02")).toBe(false);
      expect(deriveJourneyNextActionTarget(value)).toBeUndefined();
      expect(deriveJourneyNextAction(value)).toBe("CONSULTAR_PROXIMO_PASSO");
      expect(
        deriveParticipantDashboard(value).path.find(
          (item) => item.moduleId === "M03",
        )?.status,
      ).toBe("BLOQUEADO_PRE_REQUISITO");
    },
  );
  it.each([false, true])(
    "permits started dependent continuity after predecessor retention changes; reinforcement=%s",
    (reinforcement) => {
      const previous = producedAssignment("M02", completedEvents);
      const dependent = producedAssignment("M03", [
        ...completedEvents.slice(0, 3),
        ...(reinforcement ? [{ type: "INICIAR_REFORCO" } as const] : []),
      ]);
      const predecessor = {
        ...previous,
        state: transitionLearningAssignment(
          transitionLearningAssignment(previous.state, {
            type: "AGENDAR_RETENCAO",
          }),
          { type: "RETENCAO_REFORCO" },
        ),
      };
      const value = {
        participantId,
        assignments: [predecessor, dependent],
        activities: [
          producedActivity(
            dependent,
            reinforcement ? "EM_REFORCO" : "EM_ANDAMENTO",
            "SALVA",
          ),
        ],
        runtimes: [],
        results: [],
      };
      expect(predecessor.state.status).toBe("EM_REFORCO");
      expect(hasCoherentModuleCompletion(value, scopeId, "M02")).toBe(false);
      expect(deriveJourneyNextActionTarget(value)).toEqual({
        kind: "ACTIVITY",
        activityId,
      });
      expect(deriveJourneyNextAction(value)).toBe("RETOMAR_ATIVIDADE");
      expect(
        deriveParticipantDashboard(value).path.find(
          (item) => item.moduleId === "M03",
        )?.status,
      ).toBe(reinforcement ? "EM_REMEDIACAO" : "EM_ANDAMENTO");
    },
  );
  it.each(["CONCLUIDO", "CONCLUIDO_COM_RETENCAO_PENDENTE"] as const)(
    "accepts the actual %s producer without an attempt",
    (status) => {
      const previous = producedAssignment("M02", completedEvents);
      const predecessor =
        status === "CONCLUIDO"
          ? previous
          : {
              ...previous,
              state: transitionLearningAssignment(previous.state, {
                type: "AGENDAR_RETENCAO",
              }),
            };
      const dependent = producedAssignment("M03", [{ type: "ATRIBUIR" }]);
      const value = {
        participantId,
        assignments: [predecessor, dependent],
        activities: [
          producedActivity(predecessor, status),
          producedActivity(dependent, "DISPONIVEL"),
        ],
        runtimes: [],
        results: [],
        completionReceipts: [receipt(predecessor)],
      };
      expect(hasCoherentModuleCompletion(value, scopeId, "M02")).toBe(true);
      expect(deriveJourneyNextActionTarget(value)).toEqual({
        kind: "ACTIVITY",
        activityId,
      });
    },
  );
  it.each(["EM_ANDAMENTO", "EM_REFORCO"] as const)(
    "blocks stale %s even when runtime display claims mastery/remediation",
    (status) => {
      const predecessor = producedAssignment("M02", [{ type: "ATRIBUIR" }]);
      const dependent = producedAssignment("M03", completedEvents.slice(0, 2));
      const current = runtime(2);
      const value = {
        participantId,
        assignments: [predecessor, dependent],
        activities: [producedActivity(dependent, status, "SALVA")],
        runtimes: [
          {
            ...current,
            evaluation: { ...current.evaluation, moduleId: "M03" },
          },
        ],
        results: [],
      };
      expect(dependent.state.status).toBe("DISPONIVEL");
      expect(deriveJourneyNextActionTarget(value)).toBeUndefined();
      expect(
        deriveParticipantDashboard(value).path.find(
          (item) => item.moduleId === "M03",
        )?.status,
      ).toBe("BLOQUEADO_PRE_REQUISITO");
    },
  );
  it.each(["participant", "scope", "module", "assignment", "pending-activity"])(
    "rejects %s evidence with real corrected predecessor metadata",
    (mismatch) => {
      const previous = producedAssignment("M02", completedEvents);
      const dependent = producedAssignment("M03", [{ type: "ATRIBUIR" }]);
      const predecessor = {
        ...previous,
        scopeId: mismatch === "scope" ? otherScope : scopeId,
        state: {
          ...previous.state,
          participantId: mismatch === "participant" ? "foreign" : participantId,
          moduleId: mismatch === "module" ? "M01" : "M02",
        },
      };
      const corrected = producedActivity(
        previous,
        "CONCLUIDO",
        "CORRIGIDA_HUMANAMENTE",
      );
      const activities: ParticipantLearningJourneyState["activities"] = [
        {
          ...corrected,
          learningAssignmentId:
            mismatch === "assignment"
              ? "foreign"
              : corrected.learningAssignmentId!,
        },
        ...(mismatch === "pending-activity"
          ? [
              producedActivity(
                previous,
                "EM_ANDAMENTO",
                "AGUARDA_CORRECAO_HUMANA",
                "44444444-4444-4444-8444-444444444446",
              ),
            ]
          : []),
        producedActivity(dependent, "EM_ANDAMENTO", "SALVA"),
      ];
      const value = {
        participantId,
        assignments: [predecessor, dependent],
        activities,
        runtimes: [],
        results: [],
      };
      expect(hasCoherentModuleCompletion(value, scopeId, "M02")).toBe(false);
      expect(deriveJourneyNextActionTarget(value)).toBeUndefined();
      expect(
        deriveParticipantDashboard(value).path.find(
          (item) => item.moduleId === "M03",
        )?.status,
      ).toBe("BLOQUEADO_PRE_REQUISITO");
    },
  );
  it("uses only the current completion in the dependent scope", () => {
    const previous = producedAssignment("M02", completedEvents);
    const dependent = producedAssignment("M03", [{ type: "ATRIBUIR" }]);
    const foreign = {
      ...previous,
      scopeId: otherScope,
      state: { ...previous.state, assignmentId: "foreign-completion" },
    };
    const value = {
      participantId,
      assignments: [previous, foreign, dependent],
      activities: [
        producedActivity(previous, "CONCLUIDO", "CORRIGIDA_HUMANAMENTE"),
        producedActivity(dependent, "EM_ANDAMENTO", "SALVA"),
      ],
      runtimes: [],
      results: [],
      completionReceipts: [receipt(previous), receipt(foreign)],
    };
    expect(deriveJourneyNextActionTarget(value)).toEqual({
      kind: "ACTIVITY",
      activityId,
    });
    const changed = {
      ...value,
      assignments: value.assignments.map((item) =>
        item.state.assignmentId === previous.state.assignmentId
          ? {
              ...item,
              state: transitionLearningAssignment(
                transitionLearningAssignment(item.state, {
                  type: "AGENDAR_RETENCAO",
                }),
                { type: "RETENCAO_REFORCO" },
              ),
            }
          : item,
      ),
    };
    expect(hasCoherentModuleCompletion(changed, otherScope, "M02")).toBe(true);
    expect(hasCoherentModuleCompletion(changed, scopeId, "M02")).toBe(false);
    expect(deriveJourneyNextActionTarget(changed)).toBeUndefined();
  });
});

function journey(): ParticipantLearningJourneyState {
  return {
    participantId,
    assignments: [
      {
        scopeId,
        state: {
          assignmentId,
          participantId,
          moduleId: "M02",
          availableAt: "2026-10-01T00:00:00.000Z",
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
        slug: "synthetic-M02",
        title: "Synthetic activity",
        status: "EM_ANDAMENTO",
        attemptId,
        attemptStatus: "SALVA",
        attemptVersion: 2,
        nextAction: "RETOMAR_ATIVIDADE",
      },
    ],
    results: [],
    runtimes: [],
  };
}
function runtime(
  version = 1,
  human = false,
): ParticipantLearningJourneyState["runtimes"][number] {
  return {
    participantId,
    scopeId,
    version,
    updatedAt: "2026-10-03T00:00:00.000Z",
    evaluation: {
      moduleId: "M02",
      status: human ? "AGUARDA_CORRECAO_HUMANA" : "EM_REMEDIACAO",
      nextAction: human ? "AGUARDAR_CORRECAO_HUMANA" : "EXECUTAR_REMEDIACAO",
      objectiveResults: [],
      remediationObjectiveIds: [],
      criticalErrorItemIds: [],
      invalidAnswerItemIds: [],
      unansweredChoiceItemIds: [],
      openResponseItemIds: [],
      retentionReviews: [],
      practicalCompetenceClaim: "PROIBIDO_MVP",
    },
  };
}

describe("authoritative journey binding and completion", () => {
  it.each([false, true])(
    "chooses human pending work conservatively within one current module; reverse=%s",
    (reverse) => {
      const value = journey();
      const activities: ParticipantLearningJourneyState["activities"] = [
        ...value.activities,
        {
          ...value.activities[0]!,
          activityId: "44444444-4444-4444-8444-444444444445",
          attemptStatus: "AGUARDA_CORRECAO_HUMANA",
          nextAction: "AGUARDAR_CORRECAO",
        },
      ];
      const current = {
        ...value,
        activities: reverse ? [...activities].reverse() : activities,
        runtimes: [runtime(2)],
      };
      expect(deriveJourneyNextAction(current)).toBe("AGUARDAR_CORRECAO_HUMANA");
      expect(deriveJourneyNextActionTarget(current)).toBeUndefined();
      expect(deriveParticipantDashboard(current).nextAction).toBe(
        "AGUARDAR_CORRECAO_HUMANA",
      );
    },
  );
  it.each([false, true])(
    "does not advertise a dependent M03 target without scoped M02 completion; reverse=%s",
    (reverse) => {
      const value = journey();
      const assignments = [
        ...value.assignments,
        {
          scopeId,
          state: {
            assignmentId: "33333333-3333-4333-8333-333333333334",
            participantId,
            moduleId: "M03",
            status: "ATRIBUIDO" as const,
            version: 1,
            availableAt: "2026-10-01T00:00:00.000Z",
          },
        },
      ];
      const activities: ParticipantLearningJourneyState["activities"] = [
        {
          scopeId,
          activityId,
          moduleId: "M03",
          learningAssignmentId: assignments[1]!.state.assignmentId,
          slug: "dependent",
          title: "Synthetic dependent",
          status: "DISPONIVEL",
          nextAction: "INICIAR_ATIVIDADE",
        },
      ];
      const blocked = {
        ...value,
        assignments: reverse ? assignments.reverse() : assignments,
        activities,
      };
      expect(
        deriveParticipantDashboard(blocked).path.find(
          (item) => item.moduleId === "M03",
        )?.status,
      ).toBe("BLOQUEADO_PRE_REQUISITO");
      expect(deriveJourneyNextActionTarget(blocked)).toBeUndefined();
      expect(deriveJourneyNextAction(blocked)).toBe("CONSULTAR_PROXIMO_PASSO");
      const current = blocked.assignments.find(
        (item) => item.state.moduleId === "M02",
      )!;
      const completed = {
        ...blocked,
        assignments: blocked.assignments.map((item) =>
          item.state.moduleId === "M02"
            ? {
                ...item,
                state: { ...item.state, status: "CONCLUIDO" as const },
              }
            : item,
        ),
        completionReceipts: [receipt(current)],
      };
      expect(deriveJourneyNextActionTarget(completed)).toEqual({
        kind: "ACTIVITY",
        activityId,
      });
      const foreign = {
        ...completed,
        assignments: completed.assignments.map((item) =>
          item.state.moduleId === "M02"
            ? { ...item, scopeId: otherScope }
            : item,
        ),
      };
      expect(deriveJourneyNextActionTarget(foreign)).toBeUndefined();
    },
  );
  it.each([false, true])(
    "latest runtime wins independently of source order: reversed=%s",
    (reversed) => {
      const value = journey(),
        old = runtime(1, true),
        current = runtime(2);
      const latest = {
        ...current,
        evaluation: {
          ...current.evaluation,
          status: "DOMINIO_DIGITAL" as const,
          nextAction: "REVISAR_RETENCAO" as const,
          activityProgress: "ATIVIDADES_PENDENTES" as const,
        },
      };
      const state = {
        ...value,
        runtimes: reversed ? [latest, old] : [old, latest],
      };
      expect(deriveJourneyNextAction(state)).toBe("RETOMAR_ATIVIDADE");
      expect(deriveJourneyNextActionTarget(state)).toEqual({
        kind: "ACTIVITY",
        activityId,
      });
    },
  );
  it.each(["PAUSADO", "BLOQUEADO"] satisfies LearningAssignmentStatus[])(
    "does not advertise an executable fallback for %s assignment",
    (status) => {
      const value = journey();
      const assignments = value.assignments.map((entry) => ({
        ...entry,
        state: { ...entry.state, status },
      }));
      expect(
        deriveJourneyNextActionTarget({ ...value, assignments }),
      ).toBeUndefined();
      expect(deriveJourneyNextAction({ ...value, assignments })).toBe(
        "CONSULTAR_PROXIMO_PASSO",
      );
    },
  );
  it("requires exact assignment provenance even without a runtime", () => {
    const value = journey();
    expect(
      deriveJourneyNextActionTarget({ ...value, assignments: [] }),
    ).toBeUndefined();
    expect(
      deriveJourneyNextActionTarget({
        ...value,
        assignments: value.assignments.map((entry) => ({
          ...entry,
          state: {
            ...entry.state,
            assignmentId: "33333333-3333-4333-8333-333333333334",
          },
        })),
      }),
    ).toBeUndefined();
  });
  it("does not resume a submitted attempt even with a stale resume projection", () => {
    const value = journey();
    const activities = value.activities.map((entry) => ({
      ...entry,
      attemptStatus: "SUBMETIDA" as const,
    }));
    expect(
      deriveJourneyNextActionTarget({ ...value, activities }),
    ).toBeUndefined();
  });
  it("actual human correction wins over legacy remediation without an optional hint", () => {
    const value = journey();
    const activities = value.activities.map((entry) => ({
      ...entry,
      attemptStatus: "AGUARDA_CORRECAO_HUMANA" as const,
      nextAction: "AGUARDAR_CORRECAO" as const,
    }));
    const state = { ...value, activities, runtimes: [runtime()] };
    expect(deriveJourneyNextAction(state)).toBe("AGUARDAR_CORRECAO_HUMANA");
    expect(deriveJourneyNextActionTarget(state)).toBeUndefined();
  });
  it("missing actionable runtime activity does not hide real work in another scope", () => {
    const value = journey(),
      pending = runtime();
    const state: ParticipantLearningJourneyState = {
      ...value,
      runtimes: [
        {
          ...pending,
          evaluation: {
            ...pending.evaluation,
            activityProgress: "ATIVIDADES_PENDENTES",
          },
        },
      ],
      assignments: [
        ...value.assignments,
        {
          scopeId: otherScope,
          state: {
            assignmentId: "33333333-3333-4333-8333-333333333335",
            participantId,
            moduleId: "M01",
            status: "DISPONIVEL",
            version: 1,
            availableAt: "2026-10-01T00:00:00.000Z",
          },
        },
      ],
      activities: [
        {
          scopeId: otherScope,
          moduleId: "M01",
          activityId,
          learningAssignmentId: "33333333-3333-4333-8333-333333333335",
          slug: "synthetic-M01",
          title: "Synthetic eligible activity",
          status: "DISPONIVEL",
          nextAction: "INICIAR_ATIVIDADE",
        },
      ],
    };
    expect(deriveJourneyNextAction(state)).toBe("INICIAR_ATIVIDADE");
    expect(deriveJourneyNextActionTarget(state)).toEqual({
      kind: "ACTIVITY",
      activityId,
    });
  });
  it.each([
    "CRIADA",
    "EM_ANDAMENTO",
    "SALVA",
    "ANULADA",
  ] satisfies AttemptStatus[])(
    "completed metadata with %s attempt never proves module completion",
    (attemptStatus) => {
      const value = journey();
      const state = {
        ...value,
        assignments: value.assignments.map((entry) => ({
          ...entry,
          state: { ...entry.state, status: "CONCLUIDO" as const },
        })),
        activities: value.activities.map((entry) => ({
          ...entry,
          status: "CONCLUIDO" as const,
          nextAction: "CONSULTAR_PROXIMO_PASSO" as const,
          attemptStatus,
        })),
      };
      expect(hasCoherentModuleCompletion(state, scopeId, "M02")).toBe(false);
    },
  );
  it("available dependent activity does not elevate an unmet prerequisite to in progress", () => {
    const value = journey();
    const nextId = "33333333-3333-4333-8333-333333333335";
    const state: ParticipantLearningJourneyState = {
      ...value,
      assignments: [
        ...value.assignments,
        {
          scopeId,
          state: {
            assignmentId: nextId,
            participantId,
            moduleId: "M03",
            status: "ATRIBUIDO",
            version: 1,
            availableAt: "2026-10-01T00:00:00.000Z",
          },
        },
      ],
      activities: [
        {
          scopeId,
          activityId,
          moduleId: "M03",
          learningAssignmentId: nextId,
          slug: "synthetic-M03",
          title: "Synthetic dependent",
          status: "DISPONIVEL",
          nextAction: "INICIAR_ATIVIDADE",
        },
      ],
    };
    expect(
      deriveParticipantDashboard(state).path.find(
        (entry) => entry.moduleId === "M03",
      )?.status,
    ).toBe("BLOQUEADO_PRE_REQUISITO");
  });
});
