import type {
  DigitalCaseBranch,
  DigitalCaseExamSeries,
} from "./learning-interactions.js";

function freeze<T>(value: T): Readonly<T> {
  return Object.freeze(value);
}

export const digitalCaseExamSeries: readonly DigitalCaseExamSeries[] = freeze([
  freeze({
    id: "RADIOGRAFIA-SERIES",
    modality: "RADIOGRAFIA" as const,
    label: "Radiografia seriada — caso fictício",
    observations: freeze([
      freeze({
        sequence: 1,
        availableAtStage: 1 as const,
        syntheticSummary: "Achado sintético inicial do cenário digital.",
      }),
      freeze({
        sequence: 2,
        availableAtStage: 3 as const,
        syntheticSummary: "Achado sintético de reavaliação do cenário digital.",
      }),
    ]),
  }),
  freeze({
    id: "POCUS-SERIES",
    modality: "POCUS" as const,
    label: "POCUS seriado — caso fictício",
    observations: freeze([
      freeze({
        sequence: 1,
        availableAtStage: 1 as const,
        syntheticSummary: "Janela sintética inicial para a simulação.",
      }),
      freeze({
        sequence: 2,
        availableAtStage: 2 as const,
        syntheticSummary:
          "Janela sintética de acompanhamento para a simulação.",
      }),
    ]),
  }),
  freeze({
    id: "ECG-SERIES",
    modality: "ECG" as const,
    label: "ECG seriado — caso fictício",
    observations: freeze([
      freeze({
        sequence: 1,
        availableAtStage: 2 as const,
        syntheticSummary: "Traçado sintético inicial do cenário digital.",
      }),
      freeze({
        sequence: 2,
        availableAtStage: 3 as const,
        syntheticSummary:
          "Traçado sintético de reavaliação do cenário digital.",
      }),
    ]),
  }),
]);

export const digitalCaseBranches: readonly DigitalCaseBranch[] = freeze([
  freeze({
    id: "S1-A",
    fromStage: 1,
    selectedChoiceIds: freeze(["a"]),
    nextStage: 2,
    statePatch: freeze([{ key: "path", value: "ESTABILIZACAO" }]),
    consequence:
      "Ramo simulado de estabilização; a próxima informação é liberada.",
    revealExamSeriesIds: freeze(["RADIOGRAFIA-SERIES"]),
  }),
  freeze({
    id: "S1-B",
    fromStage: 1,
    selectedChoiceIds: freeze(["b"]),
    nextStage: 2,
    statePatch: freeze([{ key: "path", value: "MONITORAMENTO" }]),
    consequence:
      "Ramo simulado de monitoramento; a próxima informação é liberada.",
    revealExamSeriesIds: freeze(["POCUS-SERIES"]),
  }),
  freeze({
    id: "S2-A",
    fromStage: 2,
    selectedChoiceIds: freeze(["a"]),
    nextStage: 3,
    statePatch: freeze([{ key: "branch", value: "REAVALIACAO" }]),
    consequence: "Ramo simulado de reavaliação; o traçado seriado é liberado.",
    revealExamSeriesIds: freeze(["ECG-SERIES"]),
  }),
  freeze({
    id: "S2-B",
    fromStage: 2,
    selectedChoiceIds: freeze(["b"]),
    nextStage: 3,
    statePatch: freeze([{ key: "branch", value: "MONITORAMENTO" }]),
    consequence:
      "Ramo simulado de monitoramento continuado; a série é ampliada.",
    revealExamSeriesIds: freeze(["RADIOGRAFIA-SERIES", "POCUS-SERIES"]),
  }),
  freeze({
    id: "S3-A",
    fromStage: 3,
    selectedChoiceIds: freeze(["a"]),
    nextStage: "CONCLUIDO",
    statePatch: freeze([{ key: "outcome", value: "REAVALIADO" }]),
    consequence:
      "Caso digital concluído com decisão e reavaliação registradas.",
    revealExamSeriesIds: freeze(["ECG-SERIES"]),
  }),
  freeze({
    id: "S3-B",
    fromStage: 3,
    selectedChoiceIds: freeze(["b"]),
    nextStage: "CONCLUIDO",
    statePatch: freeze([{ key: "outcome", value: "ESCALONADO" }]),
    consequence:
      "Caso digital concluído com escalonamento simulado registrado.",
    revealExamSeriesIds: freeze(["RADIOGRAFIA-SERIES", "POCUS-SERIES"]),
  }),
]);
