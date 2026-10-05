import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createLearningAssignment,
  createAttempt,
  transitionAttempt,
  transitionLearningAssignment,
  type LearningAssignmentEvent,
} from "@cvg/domain";
import {
  parseDashboardProjection,
  parseParticipantLearningJourney,
} from "@cvg/contracts";
import {
  getParticipantLearningJourney,
  deriveProgressNextAction,
  type CurriculumRuntimeState,
  type ModuleCompletionReceiptFact,
  type ParticipantJourneyActivity,
  type ParticipantLearningJourneyState,
  type ScopedLearningAssignment,
} from "@cvg/application";
import { handleApiRequest, type ApiHttpDependencies } from "../http.js";
import { dependencies as httpDependencies } from "./fixtures.js";

const participantId = "11111111-1111-4111-8111-111111111111";
const scopeId = "22222222-2222-4222-8222-222222222222";
const otherScope = "22222222-2222-4222-8222-222222222223";
const now = "2026-10-04T08:00:00.000Z";
const ids = (value: number) =>
  `33333333-3333-4333-8333-${String(value).padStart(12, "0")}`;

function assignment(
  moduleId: string,
  events: readonly LearningAssignmentEvent[],
  scope = scopeId,
): ScopedLearningAssignment {
  return {
    scopeId: scope,
    state: events.reduce(
      transitionLearningAssignment,
      createLearningAssignment({
        assignmentId: ids(moduleId === "M01" ? 1 : 2),
        participantId,
        moduleId,
        availableAt: now,
      }),
    ),
  };
}
const available: readonly LearningAssignmentEvent[] = [
  { type: "ATRIBUIR" },
  { type: "DISPONIBILIZAR", now },
];
function activity(bound: ScopedLearningAssignment): ParticipantJourneyActivity {
  if (bound.state.status === "NAO_ATRIBUIDO")
    throw new Error("The technical activity requires an assigned module");
  const activityId = ids(bound.state.moduleId === "M01" ? 10 : 20);
  const attempt = ["EM_ANDAMENTO", "EM_REFORCO"].includes(bound.state.status)
    ? transitionAttempt(
        transitionAttempt(
          createAttempt({ attemptId: ids(30), participantId, activityId }),
          { type: "INICIAR" },
        ),
        { type: "SALVAR" },
      )
    : undefined;
  return {
    scopeId: bound.scopeId,
    activityId,
    moduleId: bound.state.moduleId,
    learningAssignmentId: bound.state.assignmentId,
    slug: `synthetic-${bound.state.moduleId}`,
    title: "Synthetic technical activity",
    status: bound.state.status,
    ...(attempt === undefined
      ? {}
      : {
          attemptId: attempt.attemptId,
          attemptStatus: attempt.status,
          attemptVersion: attempt.version,
        }),
    nextAction: deriveProgressNextAction(bound.state.status, attempt?.status),
  };
}
function runtime(
  moduleId: string,
  action:
    "EXECUTAR_REMEDIACAO" | "REVISAR_RETENCAO" | "AGUARDAR_CORRECAO_HUMANA",
  scope = scopeId,
): CurriculumRuntimeState {
  return {
    participantId,
    scopeId: scope,
    version: 1,
    updatedAt: now,
    evaluation: {
      moduleId,
      nextAction: action,
      status:
        action === "EXECUTAR_REMEDIACAO"
          ? "EM_REMEDIACAO"
          : action === "REVISAR_RETENCAO"
            ? "DOMINIO_DIGITAL"
            : "AGUARDA_CORRECAO_HUMANA",
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
function completionReceipt(
  assignment: ScopedLearningAssignment,
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
function journey(
  assignments: readonly ScopedLearningAssignment[],
  runtimes: readonly CurriculumRuntimeState[],
  activities = assignments.map(activity),
  completionReceipts: readonly ModuleCompletionReceiptFact[] = [],
): ParticipantLearningJourneyState {
  return {
    participantId,
    assignments,
    runtimes,
    activities,
    results: [],
    completionReceipts,
  };
}
async function publicViews(value: ParticipantLearningJourneyState) {
  const dependencies: ApiHttpDependencies = httpDependencies({
    requestIdFactory: () => ids(90),
    authenticate: async () => ({
      principalId: participantId,
      accountStatus: "ACTIVE",
      roles: ["PARTICIPANT"],
      scopes: [scopeId, otherScope],
    }),
    getParticipantLearningJourney: (id, scopes) =>
      getParticipantLearningJourney(
        { participantId: id, scopeIds: scopes },
        { findParticipantLearningJourney: async () => value },
      ),
  });
  const get = async (path: string) => {
    const response = await handleApiRequest(
      { method: "GET", path, body: undefined },
      dependencies,
    );
    expect(response.status).toBe(200);
    return (response.body as Readonly<{ data: unknown }>).data;
  };
  const dashboard = parseDashboardProjection(await get("/api/v1/dashboard"));
  if (dashboard.kind !== "participant")
    throw new Error(
      "The participant request must yield its participant dashboard",
    );
  return {
    journey: parseParticipantLearningJourney(
      await get("/api/v1/learning-path"),
    ),
    dashboard,
  };
}

describe("connected runtime guidance respects unstarted module prerequisites", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(now));
  });
  afterEach(() => vi.useRealTimers());
  it.each([
    "EXECUTAR_REMEDIACAO",
    "REVISAR_RETENCAO",
    "AGUARDAR_CORRECAO_HUMANA",
  ] as const)(
    "does not recommend %s when the module path is prerequisite blocked",
    async (action) => {
      const next = assignment("M02", available);
      const views = await publicViews(
        journey([next], [runtime("M02", action)]),
      );
      expect(
        views.dashboard.path.find((item) => item.moduleId === "M02"),
      ).toMatchObject({
        status: "BLOQUEADO_PRE_REQUISITO",
        nextAction: "CONCLUIR_PRE_REQUISITO",
      });
      expect(views.journey.nextAction).toBe("CONSULTAR_PROXIMO_PASSO");
      expect(views.dashboard.nextAction).toBe(views.journey.nextAction);
      expect(views.journey.nextActionTarget).toBeUndefined();
    },
  );
  it("does not borrow completion from another authorized scope", async () => {
    const predecessor = assignment(
      "M01",
      [...available, { type: "INICIAR" }, { type: "CONCLUIR" }],
      otherScope,
    );
    const next = assignment("M02", available);
    const views = await publicViews(
      journey([predecessor, next], [runtime("M02", "EXECUTAR_REMEDIACAO")]),
    );
    expect(views.journey.nextAction).toBe("CONSULTAR_PROXIMO_PASSO");
    expect(views.journey.nextActionTarget).toBeUndefined();
    expect(
      views.dashboard.path.find((item) => item.moduleId === "M02")?.status,
    ).toBe("BLOQUEADO_PRE_REQUISITO");
  });
  it("retains remediation and its exact target after same-scope coherent predecessor completion", async () => {
    const predecessor = assignment("M01", [
      ...available,
      { type: "INICIAR" },
      { type: "CONCLUIR" },
    ]);
    const next = assignment("M02", available);
    const views = await publicViews(
      journey(
        [predecessor, next],
        [runtime("M02", "EXECUTAR_REMEDIACAO")],
        [predecessor, next].map(activity),
        [completionReceipt(predecessor)],
      ),
    );
    expect(views.journey.nextAction).toBe("EXECUTAR_REMEDIACAO");
    expect(views.journey.nextActionTarget).toEqual({
      kind: "ACTIVITY",
      activityId: activity(next).activityId,
    });
    expect(
      views.dashboard.path.find((item) => item.moduleId === "M02")?.status,
    ).toBe("EM_REMEDIACAO");
  });
  it("preserves a legitimately started module when the prior prerequisite projection changes", async () => {
    const next = assignment("M02", [...available, { type: "INICIAR" }]);
    const views = await publicViews(
      journey([next], [runtime("M02", "EXECUTAR_REMEDIACAO")]),
    );
    expect(views.journey.nextAction).toBe("EXECUTAR_REMEDIACAO");
    expect(views.journey.nextActionTarget?.activityId).toBe(
      activity(next).activityId,
    );
    expect(
      views.dashboard.path.find((item) => item.moduleId === "M02")?.status,
    ).toBe("EM_REMEDIACAO");
  });
  it.each([false, true])(
    "selects an eligible module instead of a blocked higher-priority runtime; reversed=%s",
    async (reversed) => {
      const first = assignment("M01", available),
        next = assignment("M02", available);
      const runtimes = [
        runtime("M02", "EXECUTAR_REMEDIACAO"),
        runtime("M01", "REVISAR_RETENCAO"),
      ];
      const views = await publicViews(
        journey([next, first], reversed ? runtimes.reverse() : runtimes),
      );
      expect(views.journey.nextAction).toBe("INICIAR_ATIVIDADE");
      expect(views.journey.nextActionTarget?.activityId).toBe(
        activity(first).activityId,
      );
      expect(
        views.dashboard.path.find((item) => item.moduleId === "M02")?.status,
      ).toBe("BLOQUEADO_PRE_REQUISITO");
    },
  );
});
