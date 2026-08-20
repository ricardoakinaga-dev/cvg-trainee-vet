import { curriculumV3 } from "@cvg/curriculum";

import type { ParticipantLearningJourneyState } from "./journey-use-cases.js";

export type ParticipantDashboardModuleStatus =
  | "DISPONIVEL"
  | "EM_ANDAMENTO"
  | "EM_REMEDIACAO"
  | "RETENCAO_PENDENTE"
  | "CONCLUIDO_DIGITAL"
  | "BLOQUEADO_PRE_REQUISITO"
  | "AGUARDANDO_PUBLICACAO";

export type ParticipantDashboardModule = Readonly<{
  readonly moduleId: string;
  readonly month: number;
  readonly title: string;
  readonly competence: string;
  readonly sessionCount: 4;
  readonly status: ParticipantDashboardModuleStatus;
  readonly nextAction: string;
}>;

export type ParticipantDashboardRecommendation = Readonly<{
  readonly id: "NEXT_STUDY" | "ACCOUNT_SECURITY" | "REPORT_FEEDBACK";
  readonly title: string;
  readonly description: string;
  readonly href: "/dashboard" | "/account" | "/#feedback-report-title";
}>;

export type ParticipantDashboard = Readonly<{
  readonly curriculumId: string;
  readonly curriculumVersion: string;
  readonly totalMonths: 24;
  readonly totalModules: 24;
  readonly completedModules: number;
  readonly progressPercent: number;
  readonly activeModuleId?: string;
  readonly nextAction: string;
  readonly roadmap: readonly ParticipantDashboardModule[];
  readonly recommendations: readonly ParticipantDashboardRecommendation[];
}>;

const nextActionDescription: Readonly<Record<string, string>> = {
  INICIAR_ATIVIDADE: "Abra a próxima atividade digital disponível.",
  INICIAR_BASELINE: "Comece a próxima atividade digital da sua jornada.",
  RETOMAR_ATIVIDADE: "Retome a atividade digital que ficou em andamento.",
  EXECUTAR_REMEDIACAO: "Revise o reforço digital indicado para o objetivo.",
  REVISAR_RETENCAO: "Confira a revisão de retenção que está pendente.",
  AGUARDAR_CORRECAO_HUMANA:
    "Acompanhe o status enquanto a correção humana é realizada.",
  AGUARDAR_PUBLICACAO: "Aguarde a publicação clínica autorizada do conteúdo.",
};

function buildRecommendations(
  nextAction: string,
): readonly ParticipantDashboardRecommendation[] {
  return Object.freeze([
    Object.freeze({
      id: "NEXT_STUDY" as const,
      title: "Acompanhe sua próxima ação",
      description:
        nextActionDescription[nextAction] ??
        "Veja a próxima ação digital indicada para sua jornada.",
      href: "/dashboard" as const,
    }),
    Object.freeze({
      id: "ACCOUNT_SECURITY" as const,
      title: "Revise sua conta",
      description: "Confira recuperação, MFA e sessões da sua conta.",
      href: "/account" as const,
    }),
    Object.freeze({
      id: "REPORT_FEEDBACK" as const,
      title: "Relate um problema ou melhoria",
      description: "Envie um relato sem anexos ou dados sensíveis.",
      href: "/#feedback-report-title" as const,
    }),
  ]);
}

type CurriculumModule = (typeof curriculumV3.modules)[number];

function projectionBase(module: CurriculumModule) {
  return {
    moduleId: module.id,
    month: module.month,
    title: module.title,
    competence: module.competence,
    sessionCount: 4,
  } as const;
}

function projectedModule(
  module: CurriculumModule,
  status: ParticipantDashboardModuleStatus,
  nextAction: string,
): ParticipantDashboardModule {
  return Object.freeze({ ...projectionBase(module), status, nextAction });
}

function projectRuntimeModule(
  module: CurriculumModule,
  runtime: ParticipantLearningJourneyState["runtimes"][number],
): ParticipantDashboardModule {
  if (runtime.evaluation.status === "PENDENTE") {
    return projectedModule(
      module,
      "AGUARDANDO_PUBLICACAO",
      "AGUARDAR_PUBLICACAO",
    );
  }
  if (runtime.evaluation.status === "EM_REMEDIACAO") {
    return projectedModule(module, "EM_REMEDIACAO", "EXECUTAR_REMEDIACAO");
  }
  if (runtime.evaluation.status === "AGUARDA_CORRECAO_HUMANA") {
    return projectedModule(module, "EM_ANDAMENTO", "AGUARDAR_CORRECAO_HUMANA");
  }
  const retentionPending = runtime.evaluation.retentionReviews.length > 0;
  return projectedModule(
    module,
    retentionPending ? "RETENCAO_PENDENTE" : "CONCLUIDO_DIGITAL",
    retentionPending ? "REVISAR_RETENCAO" : "REVISAR_PROXIMO_MODULO",
  );
}

function projectAssignmentModule(
  module: CurriculumModule,
  assignment: NonNullable<
    ParticipantLearningJourneyState["assignments"][number]["state"]
  >,
): ParticipantDashboardModule {
  if (assignment.status === "NAO_ATRIBUIDO") {
    return projectedModule(
      module,
      "AGUARDANDO_PUBLICACAO",
      "AGUARDAR_PUBLICACAO",
    );
  }
  if (assignment.status === "BLOQUEADO") {
    return projectedModule(
      module,
      "BLOQUEADO_PRE_REQUISITO",
      "CONCLUIR_PRE_REQUISITO",
    );
  }
  if (
    assignment.status === "CONCLUIDO" ||
    assignment.status === "CONCLUIDO_COM_RETENCAO_PENDENTE"
  ) {
    const retentionPending =
      assignment.status === "CONCLUIDO_COM_RETENCAO_PENDENTE";
    return projectedModule(
      module,
      retentionPending ? "RETENCAO_PENDENTE" : "CONCLUIDO_DIGITAL",
      retentionPending ? "REVISAR_RETENCAO" : "REVISAR_PROXIMO_MODULO",
    );
  }
  const inRemediation = assignment.status === "EM_REFORCO";
  return projectedModule(
    module,
    inRemediation ? "EM_REMEDIACAO" : "DISPONIVEL",
    inRemediation ? "EXECUTAR_REMEDIACAO" : "INICIAR_BASELINE",
  );
}

function moduleProjection(
  module: CurriculumModule,
  state: ParticipantLearningJourneyState,
): ParticipantDashboardModule {
  const runtime = state.runtimes.find(
    (candidate) => candidate.evaluation.moduleId === module.id,
  );
  if (runtime !== undefined) return projectRuntimeModule(module, runtime);

  const assignment = state.assignments.find(
    ({ state: candidate }) => candidate.moduleId === module.id,
  )?.state;
  if (assignment !== undefined)
    return projectAssignmentModule(module, assignment);

  return projectedModule(
    module,
    module.month === 1 ? "DISPONIVEL" : "BLOQUEADO_PRE_REQUISITO",
    module.month === 1 ? "INICIAR_BASELINE" : "CONCLUIR_PRE_REQUISITO",
  );
}

export function buildParticipantDashboard(
  state: ParticipantLearningJourneyState,
): ParticipantDashboard {
  const roadmap = Object.freeze(
    curriculumV3.modules.map((module) => moduleProjection(module, state)),
  );
  const completedModules = roadmap.filter(
    (module) => module.status === "CONCLUIDO_DIGITAL",
  ).length;
  const activeModule = roadmap.find(
    (module) =>
      module.status !== "CONCLUIDO_DIGITAL" &&
      module.status !== "RETENCAO_PENDENTE" &&
      module.status !== "BLOQUEADO_PRE_REQUISITO" &&
      module.status !== "AGUARDANDO_PUBLICACAO",
  );
  const firstActionable = roadmap.find(
    (module) =>
      module.status !== "BLOQUEADO_PRE_REQUISITO" &&
      module.status !== "AGUARDANDO_PUBLICACAO",
  );
  const nextAction =
    state.nextAction ??
    firstActionable?.nextAction ??
    "CONSULTAR_PROXIMO_PASSO";

  return Object.freeze({
    curriculumId: curriculumV3.id,
    curriculumVersion: curriculumV3.version,
    totalMonths: 24,
    totalModules: 24,
    completedModules,
    progressPercent: Math.round((completedModules / 24) * 100),
    ...(activeModule === undefined
      ? {}
      : { activeModuleId: activeModule.moduleId }),
    nextAction,
    roadmap,
    recommendations: buildRecommendations(nextAction),
  });
}
