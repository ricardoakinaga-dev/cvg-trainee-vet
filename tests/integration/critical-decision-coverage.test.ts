import { describe, expect, it } from "vitest";

import { canAccess } from "../../packages/application/src/authorization.js";
import {
  startAttempt,
  type AttemptTransactionalOperations,
  type AttemptUseCaseDependencies,
} from "../../packages/application/src/attempt-use-cases.js";
import { parseParticipantAttempt } from "../../packages/contracts/src/assessment.js";
import {
  criticalDecisionMatrix,
  validateCriticalDecisionMatrix,
} from "../../packages/domain/src/critical-decision-matrix.js";
import {
  createContent,
  transitionContent,
} from "../../packages/domain/src/content.js";
import {
  createLearningAssignment,
  transitionLearningAssignment,
} from "../../packages/domain/src/learning-state.js";
import type { AttemptState } from "../../packages/domain/src/attempt.js";
import { evaluateSummativeAssessment } from "../../packages/domain/src/assessment-policy.js";

const ids = {
  attemptId: "11111111-1111-4111-8111-111111111111",
  activityId: "33333333-3333-4333-8333-333333333333",
  itemId: "55555555-5555-4555-8555-555555555555",
  contentId: "77777777-7777-4777-8777-777777777777",
};

function publishableContent() {
  let state = createContent({ contentId: ids.contentId, version: 1 });
  state = transitionContent(state, { type: "AUTOVERIFICAR" });
  state = transitionContent(state, { type: "VERIFICAR_PROJECAO" });
  state = transitionContent(state, {
    type: "ENVIAR_PARA_REVISAO_CLINICA",
  });
  state = transitionContent(state, { type: "APROVAR_CLINICAMENTE" });
  state = transitionContent(state, { type: "AUTORIZAR_PUBLICACAO" });
  return transitionContent(state, { type: "PUBLICAR" });
}

function idempotencyDependencies(): AttemptUseCaseDependencies {
  const attempts: AttemptState[] = [];
  const idempotencies = new Map<
    string,
    { fingerprint: string; attempt: AttemptState }
  >();
  const operations: AttemptTransactionalOperations = {
    activity: { isAvailable: async () => true },
    attemptsPort: {
      findOpenByParticipantAndActivity: async (participantId, activityId) =>
        attempts.find(
          (attempt) =>
            attempt.participantId === participantId &&
            attempt.activityId === activityId &&
            ![
              "SUBMETIDA",
              "CORRIGIDA_AUTOMATICAMENTE",
              "CORRIGIDA_HUMANAMENTE",
              "ANULADA",
            ].includes(attempt.status),
        ) ?? null,
      findById: async (attemptId) =>
        attempts.find((attempt) => attempt.attemptId === attemptId) ?? null,
      insert: async (attempt) => {
        attempts.push(attempt);
      },
      update: async (attempt) => {
        const index = attempts.findIndex(
          (stored) => stored.attemptId === attempt.attemptId,
        );
        attempts.splice(index, 1, attempt);
      },
    },
    idempotency: {
      find: async (key) => idempotencies.get(key) ?? null,
      store: async (key, record) => {
        idempotencies.set(key, record);
      },
    },
    eventPublisher: { publish: async () => undefined },
    audit: { append: async () => undefined },
  };
  return {
    ...operations,
    idFactory: () => `attempt-${attempts.length + 1}`,
    transaction: { run: async (work) => work(operations) },
  };
}

async function evaluateCase(caseId: string): Promise<string> {
  switch (caseId) {
    case "NOTA-APROVADA":
      return evaluateSummativeAssessment({
        caseComponent: { kind: "CASO", status: "RESPONDIDO", scorePercent: 80 },
        examComponent: {
          kind: "PROVA",
          status: "RESPONDIDO",
          scorePercent: 80,
        },
        objectives: [{ objectiveId: "OBJ-1", percent: 80, critical: true }],
      }).status;
    case "NOTA-REFORCO":
      return evaluateSummativeAssessment({
        caseComponent: { kind: "CASO", status: "RESPONDIDO", scorePercent: 60 },
        examComponent: {
          kind: "PROVA",
          status: "RESPONDIDO",
          scorePercent: 60,
        },
        objectives: [],
      }).status;
    case "NOTA-PENDENTE":
      return evaluateSummativeAssessment({
        caseComponent: { kind: "CASO", status: "DADO_INCOMPLETO" },
        examComponent: {
          kind: "PROVA",
          status: "RESPONDIDO",
          scorePercent: 80,
        },
        objectives: [],
      }).status;
    case "GABARITO-PUBLICO-SEM-CHAVE":
      parseParticipantAttempt({
        attemptId: ids.attemptId,
        activityId: ids.activityId,
        status: "SUBMETIDA",
        version: 1,
        answers: [
          {
            itemId: ids.itemId,
            response: "Resposta sintética",
            savedAt: "2026-08-10T17:00:00.000Z",
          },
        ],
      });
      return "PUBLIC_PROJECTION";
    case "GABARITO-PUBLICO-COM-CHAVE":
      expect(() =>
        parseParticipantAttempt({
          attemptId: ids.attemptId,
          activityId: ids.activityId,
          status: "SUBMETIDA",
          version: 1,
          answers: [],
          answer_key: "interno",
        }),
      ).toThrow();
      return "PUBLIC_PROJECTION_REJECTED";
    case "PUBLICACAO-COM-REVISAO":
      return publishableContent().status;
    case "PUBLICACAO-SEM-GATE":
      expect(() =>
        transitionContent(
          createContent({ contentId: ids.contentId, version: 1 }),
          {
            type: "PUBLICAR",
          },
        ),
      ).toThrow();
      return "PUBLICATION_REJECTED";
    case "PERMISSAO-STAFF-SCOPED":
      return canAccess({
        principalId: "moderator-1",
        accountStatus: "ACTIVE",
        roles: ["MODERATOR"],
        capability: "MODERATE_CONTENT",
        resource: { scopeId: "scope-1" },
        scopes: ["scope-1"],
      })
        ? "AUTHORIZED"
        : "DENIED";
    case "PERMISSAO-PARTICIPANT-CROSS-SCOPE":
      return canAccess({
        principalId: "participant-1",
        accountStatus: "ACTIVE",
        roles: ["PARTICIPANT"],
        capability: "VIEW_OWN_ACTIVITY",
        resource: { ownerId: "participant-2", scopeId: "scope-2" },
        scopes: ["scope-1"],
      })
        ? "AUTHORIZED"
        : "DENIED";
    case "ESTADO-TRANSICAO-VALIDA":
      return transitionLearningAssignment(
        createLearningAssignment({
          assignmentId: "assignment-1",
          participantId: "participant-1",
          moduleId: "M01",
          availableAt: "2026-08-10T17:00:00.000Z",
        }),
        { type: "ATRIBUIR" },
      ).status;
    case "ESTADO-TRANSICAO-ILEGAL":
      expect(() =>
        transitionLearningAssignment(
          createLearningAssignment({
            assignmentId: "assignment-1",
            participantId: "participant-1",
            moduleId: "M01",
            availableAt: "2026-08-10T17:00:00.000Z",
          }),
          { type: "INICIAR" },
        ),
      ).toThrow();
      return "STATE_REJECTED";
    case "ESTADO-IDEMPOTENT-REPLAY": {
      const dependencies = idempotencyDependencies();
      const command = {
        participantId: "participant-1",
        activityId: "activity-1",
        idempotencyKey: "critical-replay-1",
        correlationId: "critical-replay-correlation",
      };
      const first = await startAttempt(command, dependencies);
      const replay = await startAttempt(command, dependencies);
      expect(replay).toEqual(first);
      return "IDEMPOTENT_REPLAY";
    }
    case "ESTADO-IDEMPOTENT-CONFLICT": {
      const dependencies = idempotencyDependencies();
      const command = {
        participantId: "participant-1",
        activityId: "activity-1",
        idempotencyKey: "critical-conflict-1",
        correlationId: "critical-conflict-correlation",
      };
      await startAttempt(command, dependencies);
      await expect(
        startAttempt({ ...command, activityId: "activity-2" }, dependencies),
      ).rejects.toMatchObject({ code: "idempotency_conflict" });
      return "IDEMPOTENCY_CONFLICT";
    }
    default:
      throw new Error("unmapped critical decision case " + caseId);
  }
}

describe("critical decision coverage", () => {
  it("executes every matrix case against the real domain/contract/authorization rules", async () => {
    expect(validateCriticalDecisionMatrix(criticalDecisionMatrix)).toEqual([]);

    for (const decisionCase of criticalDecisionMatrix) {
      await expect(evaluateCase(decisionCase.caseId)).resolves.toBe(
        decisionCase.expected,
      );
    }
  });
});
