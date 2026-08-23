import { describe, expect, it } from "vitest";

import {
  createDashboardReadRepository,
  type DashboardRepositoryOptions,
} from "./dashboard-repository.js";
import {
  accountInvitations,
  activityAssignments,
  assessmentWorkflows,
  attempts,
  contentVersions,
  curriculumRuntimeStates,
  diagnosticResults,
  feedbackTickets,
  learningActivities,
  learningAssignments,
  sessions,
} from "./schema.js";

type QueryRows = ReadonlyMap<object, readonly unknown[]>;

type FakeDatabase = Parameters<typeof createDashboardReadRepository>[0];
type FakeQueryBuilder = {
  readonly from: (source: object) => FakeQueryBuilder;
  readonly innerJoin: (...args: readonly unknown[]) => FakeQueryBuilder;
  readonly leftJoin: (...args: readonly unknown[]) => FakeQueryBuilder;
  readonly where: (...args: readonly unknown[]) => FakeQueryBuilder;
  readonly groupBy: (...args: readonly unknown[]) => FakeQueryBuilder;
  readonly then: <TResult1 = readonly unknown[], TResult2 = never>(
    onfulfilled?:
      ((value: readonly unknown[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) => Promise<TResult1 | TResult2>;
};
type FakeExecutor = {
  readonly execute: (
    ...args: readonly unknown[]
  ) => Promise<readonly unknown[]>;
  readonly select: (...args: readonly unknown[]) => FakeQueryBuilder;
  readonly transaction: <T>(
    callback: (transaction: FakeExecutor) => Promise<T>,
  ) => Promise<T>;
};

function fakeDatabase(rows: QueryRows): FakeDatabase {
  const executor: FakeExecutor = {
    execute: async () => [],
    select: (..._args: readonly unknown[]) => {
      let table: object | undefined;
      const builder: FakeQueryBuilder = {
        from(source: object) {
          table = source;
          return builder;
        },
        innerJoin(..._args: readonly unknown[]) {
          return builder;
        },
        leftJoin(..._args: readonly unknown[]) {
          return builder;
        },
        where(..._args: readonly unknown[]) {
          return builder;
        },
        groupBy(..._args: readonly unknown[]) {
          return builder;
        },
        then<TResult1 = readonly unknown[], TResult2 = never>(
          onfulfilled?:
            | ((value: readonly unknown[]) => TResult1 | PromiseLike<TResult1>)
            | null,
          onrejected?:
            ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
        ): Promise<TResult1 | TResult2> {
          return Promise.resolve(
            rows.get(table ?? accountInvitations) ?? [],
          ).then(onfulfilled, onrejected);
        },
      };
      return builder;
    },
    transaction: async <T>(
      callback: (transaction: FakeExecutor) => Promise<T>,
    ) => callback(executor),
  };
  return executor as unknown as FakeDatabase;
}

const scopeId = "11111111-1111-4111-8111-111111111111";
const participantIds = {
  resumable: "22222222-2222-4222-8222-222222222222",
  remediation: "33333333-3333-4333-8333-333333333333",
  retention: "44444444-4444-4444-8444-444444444444",
  correction: "55555555-5555-4555-8555-555555555555",
  available: "66666666-6666-4666-8666-666666666666",
  consultation: "77777777-7777-4777-8777-777777777777",
} as const;

function member(
  participantId: string,
  accountStatus: "ACTIVE" | "INVITED",
  lastSeenAt: Date | string | null,
) {
  return {
    participantId,
    professionalEmail: `${participantId}@example.invalid`,
    accountStatus,
    scopeId,
    lastSeenAt,
  };
}

function rowsForCompleteSnapshot(): QueryRows {
  return new Map<object, readonly unknown[]>([
    [
      accountInvitations,
      [
        member(
          participantIds.resumable,
          "ACTIVE",
          new Date("2026-08-23T11:00:00.000Z"),
        ),
        member(
          participantIds.remediation,
          "ACTIVE",
          "2026-08-01T11:00:00.000Z",
        ),
        member(participantIds.retention, "ACTIVE", null),
        member(participantIds.correction, "ACTIVE", null),
        member(participantIds.available, "ACTIVE", null),
        member(participantIds.consultation, "INVITED", null),
      ],
    ],
    [
      learningAssignments,
      [
        {
          participantId: participantIds.resumable,
          moduleId: "M01",
          status: "CONCLUIDO",
        },
        {
          participantId: participantIds.remediation,
          moduleId: "M02",
          status: "EM_REFORCO",
        },
        {
          participantId: participantIds.retention,
          moduleId: "M03",
          status: "CONCLUIDO_COM_RETENCAO_PENDENTE",
        },
        {
          participantId: participantIds.correction,
          moduleId: "M04",
          status: "ATRIBUIDO",
        },
        {
          participantId: "88888888-8888-4888-8888-888888888888",
          moduleId: "M05",
          status: "BLOQUEADO",
        },
      ],
    ],
    [
      activityAssignments,
      [
        { participantId: participantIds.resumable, status: "EM_ANDAMENTO" },
        { participantId: participantIds.remediation, status: "PAUSADO" },
        { participantId: participantIds.available, status: "DISPONIVEL" },
        { participantId: participantIds.correction, status: "CONCLUIDO" },
        {
          participantId: "88888888-8888-4888-8888-888888888888",
          status: "BLOQUEADO",
        },
      ],
    ],
    [
      attempts,
      [
        { participantId: participantIds.correction, status: "SUBMETIDA" },
        { participantId: participantIds.resumable, status: "SALVA" },
        {
          participantId: "88888888-8888-4888-8888-888888888888",
          status: "ANULADA",
        },
      ],
    ],
    [
      assessmentWorkflows,
      [
        {
          participantId: participantIds.retention,
          status: "RESULTADO_EM_PROCESSAMENTO",
        },
        {
          participantId: participantIds.resumable,
          status: "RESULTADO_DISPONIVEL",
        },
      ],
    ],
    [
      feedbackTickets,
      [
        { participantId: participantIds.resumable, status: "NOVO" },
        { participantId: participantIds.remediation, status: "RESOLVIDO" },
        { participantId: participantIds.retention, status: "DUPLICADO" },
        { participantId: participantIds.correction, status: "NAO_REPRODUZIDO" },
        { participantId: participantIds.available, status: "NAO_PLANEJADO" },
        { participantId: participantIds.consultation, status: "TRIADO" },
      ],
    ],
    [
      curriculumRuntimeStates,
      [
        {
          participantId: participantIds.remediation,
          moduleId: "M02",
          state: { remediationObjectiveIds: ["M02-OBJ-01"] },
        },
        {
          participantId: participantIds.retention,
          moduleId: "M03",
          state: {
            retentionReviews: [{ status: "PENDENTE" }],
          },
        },
        {
          participantId: "88888888-8888-4888-8888-888888888888",
          moduleId: "M04",
          state: null,
        },
      ],
    ],
    [
      contentVersions,
      [
        { status: "PUBLICADO" },
        { status: "EM_REVISAO_CLINICA" },
        { status: "AJUSTES_SOLICITADOS" },
        { status: "VENCIDO" },
        { status: "RETIRADO" },
        { status: "RASCUNHO" },
      ],
    ],
    [sessions, []],
    [learningActivities, []],
  ]);
}

describe("staff dashboard persistence adapter", () => {
  it("aggregates every attention state and content status without leaking rows", async () => {
    const repository = createDashboardReadRepository(
      fakeDatabase(rowsForCompleteSnapshot()),
      {
        now: () => new Date("2026-08-23T12:00:00.000Z"),
      } satisfies DashboardRepositoryOptions,
    );

    const result = await repository.findStaffDashboard([
      ` ${scopeId} `,
      scopeId,
    ]);

    expect(result.scopes).toEqual([scopeId]);
    expect(result.participants[0]?.scopeIds).toEqual([scopeId]);
    expect(result.metrics).toMatchObject({
      invitedParticipants: 1,
      activeParticipants: 5,
      inactiveParticipants: 4,
      assignedModules: 4,
      completedModules: 2,
      completionRatePercent: 50,
      medianProgressPercent: 50,
      pendingCorrections: 2,
      openFeedback: 2,
      content: {
        published: 1,
        inReview: 2,
        expired: 1,
        withdrawn: 1,
      },
    });
    expect(
      result.participants.map((participant) => [
        participant.participantId,
        participant.nextAction,
      ]),
    ).toEqual([
      [participantIds.resumable, "RETOMAR_ATIVIDADE"],
      [participantIds.remediation, "EXECUTAR_REMEDIACAO"],
      [participantIds.retention, "REVISAR_RETENCAO"],
      [participantIds.correction, "AGUARDAR_CORRECAO_HUMANA"],
      [participantIds.available, "INICIAR_ATIVIDADE"],
      [participantIds.consultation, "CONSULTAR_PROXIMO_PASSO"],
    ]);
    expect(result.participants[0]?.lastSeenAt).toBe("2026-08-23T11:00:00.000Z");
  });

  it("fails closed for an empty scope and invalid persisted timestamps", async () => {
    const emptyScopeRepository = createDashboardReadRepository(
      fakeDatabase(new Map<object, readonly unknown[]>()),
    );
    await expect(emptyScopeRepository.findStaffDashboard([])).rejects.toThrow(
      "dashboard scope is required",
    );

    const invalidTimestampRepository = createDashboardReadRepository(
      fakeDatabase(
        new Map<object, readonly unknown[]>([
          [
            accountInvitations,
            [member(participantIds.consultation, "ACTIVE", "not-a-date")],
          ],
        ]),
      ),
    );
    await expect(
      invalidTimestampRepository.findStaffDashboard([scopeId]),
    ).rejects.toThrow("dashboard timestamp is invalid");
  });

  it("uses a nullable completion percentage for an unassigned participant", async () => {
    const repository = createDashboardReadRepository(
      fakeDatabase(
        new Map<object, readonly unknown[]>([
          [
            accountInvitations,
            [member(participantIds.consultation, "ACTIVE", null)],
          ],
        ]),
      ),
    );

    const result = await repository.findStaffDashboard([scopeId]);

    expect(result.metrics.completionRatePercent).toBeNull();
    expect(result.metrics.medianProgressPercent).toBeNull();
    expect(result.participants[0]?.progress.progressPercent).toBeNull();
    expect(result.participants[0]?.nextAction).toBe("CONSULTAR_PROXIMO_PASSO");
  });

  it("projects only the latest formational diagnostic profile for a scoped participant", async () => {
    const diagnosticResult = {
      id: "99999999-9999-4999-8999-999999999999",
      participantId: participantIds.resumable,
      scopeId,
      diagnosticId: "B07-DIAGNOSTIC-V1",
      diagnosticVersion: "0.1.0",
      result: {
        diagnosticId: "B07-DIAGNOSTIC-V1",
        version: "0.1.0",
        notPunitive: true,
        noGlobalPassFail: true,
        totalItemCount: 120,
        answeredItemCount: 30,
        themeResults: [
          {
            themeId: "B07-S1",
            itemCount: 40,
            answeredItemCount: 30,
            earnedPoints: 30,
            possiblePoints: 40,
            percent: 75,
            recommendedModuleIds: ["M01", "M11"],
          },
          {
            themeId: "B07-S2",
            itemCount: 40,
            answeredItemCount: 0,
            earnedPoints: 0,
            possiblePoints: 0,
            percent: 0,
            recommendedModuleIds: ["M02"],
          },
          {
            themeId: "B07-S3",
            itemCount: 40,
            answeredItemCount: 0,
            earnedPoints: 0,
            possiblePoints: 0,
            percent: 0,
            recommendedModuleIds: ["M11"],
          },
        ],
        recommendedModuleIds: ["M01", "M02", "M11"],
        remediationObjectiveIds: ["M01-OBJ-01"],
      },
      completedAt: new Date("2026-08-23T12:00:00.000Z"),
    };
    const repository = createDashboardReadRepository(
      fakeDatabase(
        new Map<object, readonly unknown[]>([
          [
            accountInvitations,
            [
              member(
                participantIds.resumable,
                "ACTIVE",
                new Date("2026-08-23T11:00:00.000Z"),
              ),
            ],
          ],
          [diagnosticResults, [diagnosticResult]],
        ]),
      ),
    );

    const result = await repository.findStaffDashboard([scopeId]);
    const profile = result.participants[0]?.diagnosticProfile;

    expect(profile).toHaveLength(3);
    expect(profile?.[0]).toMatchObject({
      themeId: "B07-S1",
      status: "BASELINE_REGISTRADA",
      scorePercent: 75,
      recommendedModuleIds: ["M01", "M11"],
      practicalCompetenceClaim: "PROIBIDO_MVP",
    });
    expect(JSON.stringify(profile)).not.toContain("M01-OBJ-01");
  });
});
