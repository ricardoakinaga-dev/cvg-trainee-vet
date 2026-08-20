import type {
  B07Blueprint,
  B07BlueprintItem,
  Curriculum,
  CurriculumModule,
  CurriculumSession,
  HospitalTrainingBlueprint,
  HospitalTrainingDesign,
  MasteryRule,
  ModuleAssessmentBlueprint,
  TrainingAudience,
} from "./types.js";

function freeze<T>(value: T): Readonly<T> {
  return Object.freeze(value);
}

import {
  digitalAssessmentModes,
  moduleSpecs,
  type ModuleSpec,
  multiprofessionalMonths,
  operationalBehaviorsByMonth,
  teamBehaviorsByMonth,
  transferMetricLabels,
} from "./catalog-module-data.js";
import { m02Assessment } from "./catalog-assessment-data.js";

const spacedReviewDays = freeze([30, 60, 90] as const);
const masteryRule: MasteryRule = freeze({
  knowledgeMinimumPercent: 70,
  criticalObjectiveMinimumPercent: 80,
  criticalDigitalBehaviorGate: true,
  practicalCompetenceClaim: "PROIBIDO_MVP",
});

export const hospitalTrainingBlueprint: HospitalTrainingBlueprint = freeze({
  id: "CVG-HOSPITAL-TRAINING-LOOP",
  version: "1.0.0",
  sequence: freeze([
    "BASELINE",
    "MICROLEARNING",
    "CASO_PROGRESSIVO",
    "SIMULACAO_DIGITAL",
    "DEBRIEFING",
    "RETENCAO_ESPACADA",
    "TRANSFERENCIA_PILOTO",
  ] as const),
  defaultSpacedReviewDays: spacedReviewDays,
  digitalBoundary: "CONHECIMENTO_RACIOCINIO_COMUNICACAO_SIMULADA",
  practicalBoundary: "NAO_COMPROVA_COMPETENCIA_PRATICA",
});

function createHospitalTrainingDesign(month: number): HospitalTrainingDesign {
  const audiences: readonly TrainingAudience[] =
    multiprofessionalMonths.includes(month)
      ? freeze(["VETERINARIO", "ENFERMAGEM_TECNICO", "MULTIPROFISSIONAL"])
      : freeze(["VETERINARIO"]);
  const hospitalBehaviors = operationalBehaviorsByMonth[month] ?? [
    "raciocinio_clinico_estruturado",
  ];
  const teamBehaviors = teamBehaviorsByMonth[month] ?? ["COMUNICACAO_FECHADA"];
  const metricLabel =
    transferMetricLabels[month] ?? "qualidade_da_aplicacao_do_modulo";

  return freeze({
    audiences: freeze([...audiences]),
    hospitalBehaviors: freeze([...hospitalBehaviors]),
    teamBehaviors: freeze([...teamBehaviors]),
    assessmentModes: freeze([...digitalAssessmentModes]),
    spacedReviewDays,
    transferMetric: freeze({
      id: `M${String(month).padStart(2, "0")}-TRANSFER`,
      label: metricLabel,
      cadenceDays: freeze([30, 90] as const),
      collectionMode: "PILOTO_MANUAL",
    }),
    masteryRule,
  });
}

function sessionMinutes(
  month: number,
): readonly [number, number, number, number] {
  if (month === 1) return [120, 120, 120, 60];
  if (month === 12 || month === 24) return [90, 150, 150, 90];
  return [60, 120, 120, 60];
}

function sessionFormat(number: 1 | 2 | 3 | 4): CurriculumSession["format"] {
  if (number === 1) return "ATIVACAO_CASO";
  if (number === 2) return "ESTUDO_GUIADO";
  if (number === 3) return "CASO_PROGRESSIVO";
  return "DEBRIEF_RETENCAO";
}

function createModule(spec: ModuleSpec): CurriculumModule {
  const id = `M${String(spec.month).padStart(2, "0")}`;
  const objectiveIds = spec.objectives.map(
    (_, index) => `${id}-OBJ-${String(index + 1).padStart(2, "0")}`,
  );
  const minutes = sessionMinutes(spec.month);
  const sessions = spec.sessions.map((title, index) => {
    const number = (index + 1) as 1 | 2 | 3 | 4;
    return freeze({
      id: `${id}-S${number}`,
      number,
      title,
      minutes: minutes[index] ?? 0,
      format: sessionFormat(number),
      objectiveIds: freeze([...objectiveIds]),
    });
  });
  return freeze({
    id,
    month: spec.month,
    part: spec.month <= 12 ? "PARTE_1" : "PARTE_2",
    title: spec.title,
    competence: spec.competence,
    objectives: freeze([...spec.objectives]),
    sessions: freeze(sessions),
    caseCount: spec.month === 12 || spec.month === 24 ? 3 : 2,
    minutes: minutes.reduce((total, value) => total + value, 0),
    hospitalTraining: createHospitalTrainingDesign(spec.month),
  });
}

const modules = moduleSpecs.map(createModule);

export const curriculumV3: Curriculum = freeze({
  id: "CVG-CURRICULUM-24M",
  version: "3.0.0",
  title: "Trilha clínica CVG — 24 meses",
  modality: "DIGITAL_ASSINCRONA_CASOS_FICTICIOS",
  species: ["CAES", "GATOS"],
  totalMinutes: modules.reduce((total, module) => total + module.minutes, 0),
  modules: freeze(modules),
  hospitalTrainingBlueprintId: hospitalTrainingBlueprint.id,
});

function createModuleAssessmentBlueprint(
  module: CurriculumModule,
): ModuleAssessmentBlueprint {
  const questionCountsBySession =
    module.month === 2
      ? ([11, 6, 8, 6] as const)
      : module.month === 12 || module.month === 24
        ? ([8, 8, 8, 8] as const)
        : ([8, 8, 8, 7] as const);
  const questionTotal = questionCountsBySession.reduce(
    (total, count) => total + count,
    0,
  );
  const objectiveIds = module.sessions[0]?.objectiveIds ?? [];
  return freeze({
    id: `${module.id}-ASSESSMENT-BLUEPRINT-V1`,
    moduleId: module.id,
    questionCountsBySession,
    questionTotal,
    openResponseCount: module.month === 12 || module.month === 24 ? 3 : 2,
    objectiveIds: freeze([...objectiveIds]),
    assessmentModes: module.hospitalTraining.assessmentModes,
    publicProjectionReady: true,
    publicationAuthorized: true,
  });
}

export const moduleAssessmentBlueprints: readonly ModuleAssessmentBlueprint[] =
  freeze(modules.map(createModuleAssessmentBlueprint));

export { m02Assessment };

const b07Sessions = [
  ["B07-S1", "Núcleo clínico e segurança"],
  ["B07-S2", "Emergência e priorização"],
  ["B07-S3", "Internação, monitoramento e integração"],
] as const;

function cognitiveTag(ordinal: number): B07BlueprintItem["cognitiveTag"] {
  if (ordinal <= 20) return "DECISAO_CLINICA";
  if (ordinal <= 28) return "CARACTERISTICA_CHAVE";
  if (ordinal <= 36) return "INTERPRETACAO";
  return "CONHECIMENTO_ESSENCIAL";
}

export const b07Blueprint: B07Blueprint = freeze({
  id: "B07-BLUEPRINT-V1",
  version: "0.1.0",
  items: freeze(
    b07Sessions.flatMap(([sessionId, domain]) =>
      Array.from({ length: 40 }, (_, index) => {
        const ordinal = index + 1;
        return freeze({
          id: `${sessionId}-I${String(ordinal).padStart(3, "0")}`,
          sessionId,
          domain,
          cognitiveTag: cognitiveTag(ordinal),
          format:
            ordinal <= 20
              ? "MELHOR_RESPOSTA"
              : ordinal <= 28
                ? "ASSOCIACAO"
                : "INTERPRETACAO",
          critical: ordinal <= 8,
        });
      }),
    ),
  ),
});
