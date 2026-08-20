import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ParticipantActivityView } from "../app/participant-activity-view.js";
import type {
  ActivityProjection,
  AttemptProjection,
  CurriculumRuntimeProjection,
  DigitalCaseRuntimeProjection,
  LearningJourneyProjection,
} from "../app/participant-model.js";

const structuredInteraction = {
  kind: "STRUCTURED_FIELDS",
  evaluationMode: "AUTOMATIC",
  fields: [
    {
      id: "weight",
      label: "Peso",
      valueType: "NUMBER",
      unit: "kg",
      required: true,
      min: 1,
      max: 100,
    },
    { id: "note", label: "Observação", valueType: "TEXT", required: true },
    {
      id: "confirmed",
      label: "Confirmado",
      valueType: "BOOLEAN",
      required: true,
    },
  ],
} as const;

const doseInteraction = {
  kind: "DOSE_INFUSION",
  evaluationMode: "AUTOMATIC",
  fields: [{ id: "dose", label: "Dose", valueType: "NUMBER", required: true }],
  calculationInputs: {
    weightKg: 10,
    doseMgPerKg: 2,
    concentrationMgPerMl: 5,
    durationHours: 1,
  },
  formulaLabel: "peso × dose ÷ concentração",
} as const;

const caseStage = {
  caseId: "case-view",
  stage: 1,
  examSeries: [
    {
      id: "xray",
      modality: "RADIOGRAFIA",
      label: "Raio-X",
      observationCount: 2,
    },
    { id: "pocus", modality: "POCUS", label: "POCUS", observationCount: 2 },
    { id: "ecg", modality: "ECG", label: "ECG", observationCount: 2 },
  ],
} as const;

const activity = {
  activityId: "activity-view",
  slug: "m01-view",
  title: "Atividade visual",
  items: [
    {
      itemId: "text",
      ordinal: 1,
      kind: "QUESTAO",
      title: "Texto",
      text: "Explique.",
      responseMode: "TEXT",
    },
    {
      itemId: "info",
      ordinal: 2,
      kind: "INFO",
      title: "Informação",
      text: "Leia.",
      responseMode: "NONE",
    },
    {
      itemId: "choice",
      ordinal: 3,
      kind: "QUESTAO",
      title: "Escolha",
      text: "Selecione.",
      responseMode: "CHOICE",
      choices: [
        { id: "a", label: "A", text: "Primeira" },
        { id: "b", label: "B", text: "Segunda" },
      ],
      selectionMode: "SINGLE",
    },
    {
      itemId: "multiple",
      ordinal: 4,
      kind: "QUESTAO",
      title: "Múltipla",
      text: "Selecione várias.",
      responseMode: "CHOICE",
      choices: [
        { id: "a", label: "A", text: "Primeira" },
        { id: "b", label: "B", text: "Segunda" },
      ],
      selectionMode: "MULTIPLE",
    },
    {
      itemId: "structured",
      ordinal: 5,
      kind: "QUESTAO",
      title: "Campos",
      text: "Preencha os campos.",
      responseMode: "STRUCTURED_FIELDS",
      interaction: structuredInteraction,
    },
    {
      itemId: "dose",
      ordinal: 6,
      kind: "QUESTAO",
      title: "Dose",
      text: "Calcule.",
      responseMode: "DOSE_INFUSION",
      interaction: doseInteraction,
    },
    {
      itemId: "case",
      ordinal: 7,
      kind: "QUESTAO",
      title: "Caso digital",
      text: "Registre a decisão.",
      responseMode: "CHOICE",
      choices: [
        { id: "a", label: "A", text: "Liberar" },
        { id: "b", label: "B", text: "Aguardar" },
      ],
      selectionMode: "SINGLE",
      digitalCaseStage: caseStage,
    },
  ],
} as const satisfies ActivityProjection;

const attempt = {
  attemptId: "attempt-view",
  activityId: "activity-view",
  status: "EM_ANDAMENTO",
  version: 1,
  answers: [],
} as const satisfies AttemptProjection;

const runtime = {
  moduleId: "M01",
  version: 1,
  status: "EM_REMEDIACAO",
  nextAction: "EXECUTAR_REMEDIACAO",
  scorePercent: 70,
  remediationCount: 1,
  retentionReviews: [
    { day: 7, dueAt: "2026-08-17T00:00:00.000Z", status: "PENDENTE" },
  ],
  practicalCompetenceClaim: "PROIBIDO_MVP",
} as const satisfies CurriculumRuntimeProjection;

const digitalCase = {
  moduleId: "M01",
  caseId: "case-view",
  version: 1,
  currentStage: 1,
  state: { stable: true },
  revealedExamSeries: [],
  consequences: [],
  updatedAt: "2026-08-16T00:00:00.000Z",
} as const satisfies DigitalCaseRuntimeProjection;

const journey = {
  assignments: [],
  activities: [
    {
      activityId: "activity-view",
      slug: "m01-view",
      title: "Atividade visual",
      status: "DISPONIVEL",
      nextAction: "INICIAR_ATIVIDADE",
    },
  ],
  results: [],
  runtimes: [runtime],
  nextAction: "INICIAR_ATIVIDADE",
} as const satisfies LearningJourneyProjection;

function baseProps(overrides: Record<string, unknown> = {}) {
  return {
    activity,
    activityState: "ready",
    attempt,
    answers: {
      text: "Resposta textual",
      choice: "a",
      multiple: '["a","b"]',
      structured: '{"weight":10,"note":"ok","confirmed":true}',
      dose: '{"dose":2}',
      case: "a",
    },
    digitalCase,
    journey,
    runtime,
    busy: false,
    answeredItemCount: 6,
    answerableItems: activity.items.filter(
      (item) => item.responseMode !== "NONE",
    ),
    progressPercent: 100,
    pageSaveState: "saved",
    questionPage: 0,
    totalBlocks: 1,
    visibleItems: activity.items,
    currentBlockAnswerableItems: activity.items.filter(
      (item) => item.responseMode !== "NONE",
    ),
    currentBlockAnsweredCount: 6,
    blockStartOrdinal: 1,
    blockEndOrdinal: 7,
    hasNextPage: false,
    setAnswers: vi.fn(),
    setQuestionPage: vi.fn(),
    setPageSaveState: vi.fn(),
    handleStartAttempt: vi.fn(async () => undefined),
    handleChoiceChange: vi.fn(),
    handleAdvanceDigitalCase: vi.fn(async () => undefined),
    handleSaveAnswer: vi.fn(async () => undefined),
    handleNextPage: vi.fn(async () => undefined),
    saveCurrentBlock: vi.fn(async () => attempt),
    handleSubmitAttempt: vi.fn(async () => undefined),
    ...overrides,
  };
}

type RenderNode = Readonly<{
  readonly type: unknown;
  readonly props?: Readonly<Record<string, unknown>>;
}>;

function isRenderNode(value: unknown): value is RenderNode {
  return value !== null && typeof value === "object" && "type" in value;
}

function expandRenderTree(value: unknown): readonly RenderNode[] {
  if (Array.isArray(value)) {
    return value.flatMap((child) => expandRenderTree(child));
  }
  if (!isRenderNode(value)) return [];
  const props = value.props ?? {};
  if (typeof value.type === "function") {
    const rendered = (
      value.type as (nextProps: Readonly<Record<string, unknown>>) => unknown
    )(props);
    return expandRenderTree(rendered);
  }
  const children = props.children;
  return children === undefined
    ? [value]
    : [value, ...expandRenderTree(children)];
}

describe("participant activity production view", () => {
  it("renders preview and the complete interactive activity projection", () => {
    const preview = renderToStaticMarkup(
      createElement(
        ParticipantActivityView,
        baseProps({ attempt: null, pageSaveState: "idle" }) as never,
      ),
    );
    expect(preview).toContain("Pronto para começar?");
    expect(preview).toContain("Prévia da atividade");
    expect(preview).toContain("Caso digital · etapa 1 de 3");

    const active = renderToStaticMarkup(
      createElement(ParticipantActivityView, baseProps() as never),
    );
    expect(active).toContain("Salvo");
    expect(active).toContain("Salvar bloco");
    expect(active).toContain("Enviar tentativa");
    expect(active).toContain("Fórmula: peso × dose ÷ concentração");
    expect(active).toContain("Objetivos para reforço: 1.");
    expect(active).toContain("Retenções pendentes: 1.");
  });

  it("renders retry, saving and forward-navigation states", () => {
    const markup = renderToStaticMarkup(
      createElement(
        ParticipantActivityView,
        baseProps({
          activityState: "error",
          pageSaveState: "saving",
          questionPage: 1,
          totalBlocks: 2,
          visibleItems: [activity.items[6]],
          currentBlockAnswerableItems: [activity.items[6]],
          currentBlockAnsweredCount: 0,
          blockStartOrdinal: 7,
          blockEndOrdinal: 7,
          hasNextPage: true,
        }) as never,
      ),
    );
    expect(markup).toContain("A atualização falhou");
    expect(markup).toContain("Salvando…");

    const forwardMarkup = renderToStaticMarkup(
      createElement(
        ParticipantActivityView,
        baseProps({
          pageSaveState: "idle",
          hasNextPage: true,
          visibleItems: [activity.items[6]],
          currentBlockAnswerableItems: [activity.items[6]],
          currentBlockAnsweredCount: 0,
          questionPage: 1,
          totalBlocks: 2,
          blockStartOrdinal: 7,
          blockEndOrdinal: 7,
        }) as never,
      ),
    );
    expect(forwardMarkup).toContain("Salvar e avançar");
  });

  it("exercises the rendered interaction handlers with synthetic events", async () => {
    const props = baseProps({ hasNextPage: false });
    const nodes = expandRenderTree(ParticipantActivityView(props as never));

    const callbacks: Promise<unknown>[] = [];
    for (const node of nodes) {
      const nodeProps = node.props ?? {};
      const onClick = nodeProps.onClick;
      if (typeof onClick === "function") {
        callbacks.push(Promise.resolve(onClick()));
      }
      const onChange = nodeProps.onChange;
      if (typeof onChange === "function") {
        const inputType = nodeProps.type;
        const event =
          inputType === "checkbox"
            ? { target: { checked: true, value: "" } }
            : { target: { checked: false, value: "3" } };
        callbacks.push(Promise.resolve(onChange(event)));
        if (inputType === "number") {
          callbacks.push(
            Promise.resolve(
              onChange({ target: { checked: false, value: "x" } }),
            ),
          );
          callbacks.push(
            Promise.resolve(
              onChange({ target: { checked: false, value: " " } }),
            ),
          );
        }
      }
    }
    await Promise.all(callbacks);

    expect(props.setAnswers).toHaveBeenCalled();
    expect(props.handleSaveAnswer).toHaveBeenCalled();
    expect(props.handleAdvanceDigitalCase).toHaveBeenCalled();
    expect(props.saveCurrentBlock).toHaveBeenCalled();
    expect(props.handleSubmitAttempt).toHaveBeenCalled();
    expect(props.setQuestionPage).toHaveBeenCalled();
    expect(props.setPageSaveState).toHaveBeenCalledWith("idle");
  });
});
