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

function moduleProjection(
  module: (typeof curriculumV3.modules)[number],
  state: ParticipantLearningJourneyState,
): ParticipantDashboardModule {
  const runtime = state.runtimes.find(
    (candidate) => candidate.evaluation.moduleId === module.id,
  );
  if (runtime !== undefined) {
    if (runtime.evaluation.status === "PENDENTE") {
      return Object.freeze({
        moduleId: module.id,
        month: module.month,
        title: module.title,
        competence: module.competence,
        sessionCount: 4,
        status: "AGUARDANDO_PUBLICACAO",
        nextAction: "AGUARDAR_PUBLICACAO",
      });
    }
    if (runtime.evaluation.status === "EM_REMEDIACAO") {
      return Object.freeze({
        moduleId: module.id,
        month: module.month,
        title: module.title,
        competence: module.competence,
        sessionCount: 4,
        status: "EM_REMEDIACAO",
        nextAction: "EXECUTAR_REMEDIACAO",
      });
    }
    if (runtime.evaluation.status === "AGUARDA_CORRECAO_HUMANA") {
      return Object.freeze({
        moduleId: module.id,
        month: module.month,
        title: module.title,
        competence: module.competence,
        sessionCount: 4,
        status: "EM_ANDAMENTO",
        nextAction: "AGUARDAR_CORRECAO_HUMANA",
      });
    }
    const retentionPending = runtime.evaluation.retentionReviews.length > 0;
    return Object.freeze({
      moduleId: module.id,
      month: module.month,
      title: module.title,
      competence: module.competence,
      sessionCount: 4,
      status: retentionPending ? "RETENCAO_PENDENTE" : "CONCLUIDO_DIGITAL",
      nextAction: retentionPending
        ? "REVISAR_RETENCAO"
        : "REVISAR_PROXIMO_MODULO",
    });
  }

  const assignment = state.assignments.find(
    ({ state: candidate }) => candidate.moduleId === module.id,
  )?.state;
  if (assignment !== undefined) {
    if (assignment.status === "NAO_ATRIBUIDO") {
      return Object.freeze({
        moduleId: module.id,
        month: module.month,
        title: module.title,
        competence: module.competence,
        sessionCount: 4,
        status: "AGUARDANDO_PUBLICACAO",
        nextAction: "AGUARDAR_PUBLICACAO",
      });
    }
    if (assignment.status === "BLOQUEADO") {
      return Object.freeze({
        moduleId: module.id,
        month: module.month,
        title: module.title,
        competence: module.competence,
        sessionCount: 4,
        status: "BLOQUEADO_PRE_REQUISITO",
        nextAction: "CONCLUIR_PRE_REQUISITO",
      });
    }
    if (
      assignment.status === "CONCLUIDO" ||
      assignment.status === "CONCLUIDO_COM_RETENCAO_PENDENTE"
    ) {
      return Object.freeze({
        moduleId: module.id,
        month: module.month,
        title: module.title,
        competence: module.competence,
        sessionCount: 4,
        status:
          assignment.status === "CONCLUIDO_COM_RETENCAO_PENDENTE"
            ? "RETENCAO_PENDENTE"
            : "CONCLUIDO_DIGITAL",
        nextAction:
          assignment.status === "CONCLUIDO_COM_RETENCAO_PENDENTE"
            ? "REVISAR_RETENCAO"
            : "REVISAR_PROXIMO_MODULO",
      });
    }
    return Object.freeze({
      moduleId: module.id,
      month: module.month,
      title: module.title,
      competence: module.competence,
      sessionCount: 4,
      status:
        assignment.status === "EM_REFORCO" ? "EM_REMEDIACAO" : "DISPONIVEL",
      nextAction:
        assignment.status === "EM_REFORCO"
          ? "EXECUTAR_REMEDIACAO"
          : "INICIAR_BASELINE",
    });
  }

  return Object.freeze({
    moduleId: module.id,
    month: module.month,
    title: module.title,
    competence: module.competence,
    sessionCount: 4,
    status: module.month === 1 ? "DISPONIVEL" : "BLOQUEADO_PRE_REQUISITO",
    nextAction:
      module.month === 1 ? "INICIAR_BASELINE" : "CONCLUIR_PRE_REQUISITO",
  });
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
