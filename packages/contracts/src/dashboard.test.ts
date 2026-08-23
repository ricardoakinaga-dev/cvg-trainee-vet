import { describe, expect, it } from "vitest";

import {
  parseDashboardProjection,
  staffDashboardProjectionSchema,
} from "./dashboard.js";

const profileItem = {
  themeId: "B07-S1" as const,
  themeLabel: "Núcleo clínico e segurança",
  status: "BASELINE_REGISTRADA" as const,
  scorePercent: 75,
  answeredItemCount: 30,
  itemCount: 40,
  recommendedModuleIds: ["M01", "M11"],
  lastEvaluatedAt: "2026-08-23T12:00:00.000Z",
  evidence: "DIAGNOSTICO_FORMATIVO_DIGITAL" as const,
  notPunitive: true as const,
  noGlobalPassFail: true as const,
  practicalCompetenceClaim: "PROIBIDO_MVP" as const,
};

const participant = {
  kind: "participant" as const,
  nextAction: "RETOMAR_ATIVIDADE" as const,
  progress: {
    assignedActivities: 4,
    completedActivities: 2,
    progressPercent: 50,
    remediationObjectives: 1,
    retentionReviewsPending: 1,
    pendingCorrections: 0,
  },
  path: [
    {
      moduleId: "M01",
      month: 1,
      status: "EM_ANDAMENTO" as const,
      nextAction: "RETOMAR_MODULO" as const,
    },
  ],
  profile: [
    {
      moduleId: "M01",
      month: 1,
      competence:
        "Organizar dados, reconhecer risco e justificar um plano inicial.",
      status: "EM_DESENVOLVIMENTO_DIGITAL" as const,
      scorePercent: 70,
      lastEvaluatedAt: "2026-08-23T12:00:00.000Z",
      evidence: "AVALIACAO_MODULAR_DIGITAL" as const,
      practicalCompetenceClaim: "PROIBIDO_MVP" as const,
    },
  ],
};

describe("dashboard contracts", () => {
  it("accepts the participant dashboard projection", () => {
    expect(parseDashboardProjection(participant)).toEqual(participant);
  });

  it("accepts the scoped staff projection and keeps internal identity explicit", () => {
    const projection = {
      kind: "staff" as const,
      scopes: ["11111111-1111-4111-8111-111111111111"],
      generatedAt: "2026-08-23T12:00:00.000Z",
      metrics: {
        invitedParticipants: 2,
        activeParticipants: 1,
        inactiveParticipants: 0,
        assignedModules: 2,
        completedModules: 1,
        completionRatePercent: 50,
        medianProgressPercent: 50,
        pendingCorrections: 1,
        remediationParticipants: 1,
        retentionReviewsPending: 1,
        openFeedback: 1,
        content: { published: 4, inReview: 1, expired: 0, withdrawn: 0 },
      },
      participants: [
        {
          participantId: "22222222-2222-4222-8222-222222222222",
          professionalEmail: "vet@example.invalid",
          accountStatus: "ACTIVE" as const,
          scopeIds: ["11111111-1111-4111-8111-111111111111"],
          lastSeenAt: "2026-08-23T11:00:00.000Z",
          progress: {
            assignedModules: 2,
            completedModules: 1,
            progressPercent: 50,
            remediationModules: 1,
            retentionReviewsPending: 1,
          },
          pendingCorrections: 1,
          openFeedback: 1,
          nextAction: "AGUARDAR_CORRECAO_HUMANA" as const,
          diagnosticProfile: [
            profileItem,
            { ...profileItem, themeId: "B07-S2" as const },
            { ...profileItem, themeId: "B07-S3" as const },
          ],
        },
      ],
    };

    expect(staffDashboardProjectionSchema.parse(projection)).toEqual(
      projection,
    );
  });

  it("rejects unsupported dashboard fields and invalid percentage values", () => {
    expect(() =>
      parseDashboardProjection({
        ...participant,
        progress: { ...participant.progress, progressPercent: 101 },
      }),
    ).toThrow();
    expect(() =>
      parseDashboardProjection({
        ...participant,
        profile: [
          {
            ...participant.profile[0],
            practicalCompetenceClaim: "APROVADO" as never,
          },
        ],
      }),
    ).toThrow();
    expect(() =>
      staffDashboardProjectionSchema.parse({
        kind: "staff",
        scopes: [],
        generatedAt: "2026-08-23T12:00:00.000Z",
        metrics: {},
        participants: [],
        source: "internal",
      }),
    ).toThrow();
  });
});
