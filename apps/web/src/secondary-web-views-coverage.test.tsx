import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AccountView } from "../app/account-view.js";
import { AuthoringView } from "../app/authoring-view.js";
import {
  InviteComplete,
  InviteFeedback,
  InviteForm,
  InviteHeader,
  InviteIntro,
} from "../app/invite/invite-view.js";
import {
  ModeratorDashboardView,
  ModeratorHeader,
  ModeratorHero,
} from "../app/moderator/moderator-view.js";
import { ParticipantExperienceView } from "../app/participant-experience-view.js";
import { ParticipantFeedbackView } from "../app/participant-feedback-view.js";
import { ParticipantJourneyView } from "../app/participant-journey-view.js";
import { ParticipantLoginView } from "../app/participant-login-view.js";
import type {
  ActivityProjection,
  AttemptProjection,
} from "../app/participant-model.js";

const participantPasswordFixture = ["fixture", "participant", "2026"].join("-");

const operation = {
  operationId: "operation-1",
  expiresAt: "2026-08-17T12:00:00.000Z",
} as const;

const activity = {
  activityId: "activity-secondary",
  slug: "m01-secondary",
  title: "Atividade secundária",
  items: [
    {
      itemId: "text",
      ordinal: 1,
      kind: "QUESTAO",
      title: "Questão",
      text: "Responda.",
      responseMode: "TEXT",
    },
  ],
} as const satisfies ActivityProjection;

const attempt = {
  attemptId: "attempt-secondary",
  activityId: "activity-secondary",
  status: "EM_ANDAMENTO",
  version: 1,
  answers: [],
} as const satisfies AttemptProjection;

const journey = {
  assignments: [],
  activities: [
    {
      activityId: "activity-secondary",
      slug: "m01-secondary",
      title: "Atividade secundária",
      status: "DISPONIVEL",
      nextAction: "INICIAR_ATIVIDADE",
    },
  ],
  results: [],
  runtimes: [],
  nextAction: "INICIAR_ATIVIDADE",
} as const;

const record = {
  contentId: "11111111-1111-4111-8111-111111111111",
  version: 1,
  scopeId: "scope-1",
  moduleId: "M01",
  sessionId: "M01-S1",
  objectiveId: "M01-OBJ-01",
  authorId: "22222222-2222-4222-8222-222222222222",
  contentStatus: "APROVADO_CLINICAMENTE",
  item: {
    title: "Item autoral sintético",
    prompt: "Escolha a próxima ação.",
    responseMode: "CHOICE",
    choices: [
      { id: "a", label: "A", text: "Priorizar." },
      { id: "b", label: "B", text: "Aguardar." },
    ],
    correctChoiceIds: ["a"],
    feedback: "Feedback sintético.",
    critical: true,
    remediationTargetObjectiveId: "M01-OBJ-01",
    sourceRefs: [{ code: "INTERNAL_SYNTHETIC", locator: "capítulo 1" }],
    rubric: {
      dimensions: [
        {
          id: "reasoning",
          label: "Raciocínio",
          description: "Justifica a decisão.",
          maxPoints: 4,
        },
      ],
      passScore: 3,
    },
  },
  preflight: {
    ruleVersion: "authoring-preflight-v1",
    technicalChecksPassed: true,
    sourceVerification: "VERIFICADO_AUTOMATICAMENTE",
    readyForPublication: true,
    checks: {
      requiredFields: true,
      correctionMetadata: true,
      publicBoundary: true,
      sourceTraceability: true,
      publicationBlocked: false,
    },
    checkedAt: "2026-08-16T12:00:00.000Z",
  },
} as const;

const queue = {
  items: [
    {
      contentId: record.contentId,
      version: 1,
      scopeId: "scope-1",
      moduleId: "M01",
      sessionId: "M01-S1",
      objectiveId: "M01-OBJ-01",
      authorId: record.authorId,
      contentStatus: "PROJECAO_VERIFICADA",
      reviewStatus: "PENDING",
      technicalChecksPassed: false,
      latestReview: null,
    },
  ],
  page: 1,
  perPage: 1,
  total: 2,
} as const;

function accountProps(overrides: Record<string, unknown> = {}) {
  return {
    security: {
      provider: "EXTERNAL_IDENTITY_PROVIDER",
      recovery: "AVAILABLE",
      mfa: "NOT_ENABLED",
      session: "ACTIVE",
    },
    recoveryOperation: operation,
    mfaOperation: operation,
    recoveryCode: "recovery-code",
    mfaCode: "123456",
    busy: false,
    error: "Erro sintético.",
    notice: "Aviso sintético.",
    setRecoveryCode: vi.fn(),
    setMfaCode: vi.fn(),
    load: vi.fn(async () => undefined),
    startRecovery: vi.fn(async () => undefined),
    startMfa: vi.fn(async () => undefined),
    completeRecovery: vi.fn(async () => undefined),
    completeMfa: vi.fn(async () => undefined),
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

function authoringProps(overrides: Record<string, unknown> = {}) {
  return {
    record,
    contentId: record.contentId,
    version: "1",
    scopeId: "scope-1",
    queue,
    rationale: "Justificativa sintética.",
    busy: false,
    error: "Erro editorial sintético.",
    notice: "Aviso editorial sintético.",
    setRecord: vi.fn(),
    setContentId: vi.fn(),
    setVersion: vi.fn(),
    setScopeId: vi.fn(),
    setQueue: vi.fn(),
    setRationale: vi.fn(),
    setBusy: vi.fn(),
    setError: vi.fn(),
    setNotice: vi.fn(),
    loadRecord: vi.fn(async () => undefined),
    loadQueue: vi.fn(async () => undefined),
    openQueueItem: vi.fn(),
    publish: vi.fn(async () => undefined),
    review: vi.fn(async () => undefined),
    ...overrides,
  };
}

function participantProps(overrides: Record<string, unknown> = {}) {
  const actions = {
    signOut: vi.fn(async () => undefined),
    handleLogin: vi.fn(),
    handleRetry: vi.fn(),
    refreshJourney: vi.fn(async () => undefined),
    handleFeedbackSubmit: vi.fn(async () => undefined),
    handleStartAttempt: vi.fn(async () => undefined),
    handleChoiceChange: vi.fn(),
    handleAdvanceDigitalCase: vi.fn(async () => undefined),
    handleSaveAnswer: vi.fn(async () => undefined),
    handleNextPage: vi.fn(async () => undefined),
    saveCurrentBlock: vi.fn(async () => attempt),
    handleSubmitAttempt: vi.fn(async () => undefined),
  } as never;
  return {
    authenticated: true,
    canManageAdmin: true,
    busy: true,
    error: "Erro de jornada.",
    notice: "Aviso de jornada.",
    login: "vet@example.test",
    password: participantPasswordFixture,
    showPassword: true,
    activity,
    activityState: "ready",
    attempt,
    answers: { text: "Resposta" },
    digitalCase: null,
    journey,
    runtime: null,
    journeyState: "ready",
    answerableItems: activity.items,
    answeredItemCount: 1,
    progressPercent: 100,
    pageSaveState: "saved",
    questionPage: 0,
    totalBlocks: 1,
    visibleItems: activity.items,
    currentBlockAnswerableItems: activity.items,
    currentBlockAnsweredCount: 1,
    blockStartOrdinal: 1,
    blockEndOrdinal: 1,
    hasNextPage: false,
    feedbackType: "MELHORIA",
    feedbackDescription: "Melhoria sintética.",
    feedbackState: "sent",
    retryAction: "activity",
    setLogin: vi.fn(),
    setPassword: vi.fn(),
    setShowPassword: vi.fn(),
    setAnswers: vi.fn(),
    setQuestionPage: vi.fn(),
    setPageSaveState: vi.fn(),
    setFeedbackType: vi.fn(),
    setFeedbackDescription: vi.fn(),
    actions,
    ...overrides,
  };
}

describe("secondary web production views", () => {
  it("renders account security, recovery and MFA states", () => {
    const full = renderToStaticMarkup(
      createElement(AccountView, accountProps() as never),
    );
    expect(full).toContain("Concluir recuperação");
    expect(full).toContain("Confirmar MFA");
    expect(full).toContain("Erro sintético.");

    const loading = renderToStaticMarkup(
      createElement(
        AccountView,
        accountProps({
          security: null,
          recoveryOperation: null,
          mfaOperation: null,
          error: null,
          notice: null,
        }) as never,
      ),
    );
    expect(loading).toContain("Consultando segurança");
  });

  it("exercises account and feedback view handlers with synthetic events", async () => {
    const account = accountProps();
    const feedbackProps = {
      feedbackType: "MELHORIA" as const,
      feedbackDescription: "Relato sintético.",
      feedbackState: "idle" as const,
      error: "Falha no envio.",
      notice: null,
      retryAction: "feedback" as const,
      busy: false,
      setFeedbackType: vi.fn(),
      setFeedbackDescription: vi.fn(),
      handleFeedbackSubmit: vi.fn(async () => undefined),
      handleRetry: vi.fn(),
    };
    const nodes = [
      ...expandRenderTree(AccountView(account as never)),
      ...expandRenderTree(ParticipantFeedbackView(feedbackProps)),
    ];
    const pending: Promise<unknown>[] = [];

    for (const node of nodes) {
      const props = node.props ?? {};
      const onClick = props.onClick;
      if (typeof onClick === "function") {
        pending.push(Promise.resolve(onClick()));
      }
      const onChange = props.onChange;
      if (typeof onChange === "function") {
        pending.push(
          Promise.resolve(onChange({ target: { value: "synthetic-value" } })),
        );
      }
      const onSubmit = props.onSubmit;
      if (typeof onSubmit === "function") {
        pending.push(Promise.resolve(onSubmit({ preventDefault: vi.fn() })));
      }
    }
    await Promise.all(pending);

    expect(account.startRecovery).toHaveBeenCalled();
    expect(account.startMfa).toHaveBeenCalled();
    expect(account.completeRecovery).toHaveBeenCalled();
    expect(account.completeMfa).toHaveBeenCalled();
    expect(feedbackProps.setFeedbackType).toHaveBeenCalledWith(
      "synthetic-value",
    );
    expect(feedbackProps.setFeedbackDescription).toHaveBeenCalledWith(
      "synthetic-value",
    );
    expect(feedbackProps.handleFeedbackSubmit).toHaveBeenCalled();
    expect(feedbackProps.handleRetry).toHaveBeenCalled();
  });

  it("renders authoring entry, queue pagination and full governed record", () => {
    const full = renderToStaticMarkup(
      createElement(AuthoringView, authoringProps() as never),
    );
    expect(full).toContain("Rubrica");
    expect(full).toContain("gabarito");
    expect(full).toContain("Fontes internas");

    const queueView = renderToStaticMarkup(
      createElement(AuthoringView, authoringProps({ record: null }) as never),
    );
    expect(queueView).toContain("Fila de revisão clínica");
    expect(queueView).toContain("Próxima página");
    expect(queueView).toContain("Pré-voo técnico: PENDENTE");

    const emptyQueue = renderToStaticMarkup(
      createElement(
        AuthoringView,
        authoringProps({
          record: null,
          queue: { ...queue, items: [], total: 0 },
        }) as never,
      ),
    );
    expect(emptyQueue).toContain("Abrir item autoral");
    expect(emptyQueue).toContain("Nenhum item pendente");
  });

  it("exercises authoring queue and record actions with synthetic events", async () => {
    const fullProps = authoringProps();
    const entryProps = authoringProps({ record: null });
    const nodes = [
      ...expandRenderTree(AuthoringView(fullProps as never)),
      ...expandRenderTree(AuthoringView(entryProps as never)),
    ];
    const pending: Promise<unknown>[] = [];
    for (const node of nodes) {
      const props = node.props ?? {};
      const onClick = props.onClick;
      if (typeof onClick === "function")
        pending.push(Promise.resolve(onClick()));
      const onChange = props.onChange;
      if (typeof onChange === "function") {
        pending.push(
          Promise.resolve(onChange({ target: { value: "synthetic-value" } })),
        );
      }
    }
    await Promise.all(pending);

    expect(entryProps.loadQueue).toHaveBeenCalled();
    expect(entryProps.loadRecord).toHaveBeenCalled();
    expect(entryProps.openQueueItem).toHaveBeenCalled();
    expect(fullProps.review).toHaveBeenCalled();
    expect(fullProps.publish).toHaveBeenCalled();
  });

  it("renders moderator headers, populated queues and empty states", () => {
    const dashboard = {
      moderatorId: "33333333-3333-4333-8333-333333333333",
      scopeIds: ["scope-1"],
      participants: [
        {
          participantId: "44444444-4444-4444-8444-444444444444",
          professionalEmail: "moderated@example.test",
          scopeIds: ["scope-1"],
          progressPercent: 20,
          nextAction: "INICIAR_ATIVIDADE",
          gapCount: 1,
          remediationObjectiveIds: ["OBJ-1"],
          correctionPendingCount: 1,
          feedbackOpenCount: 1,
          technicalFailureCount: 0,
          digitalReinforcementPlan: ["OBJ-1"],
        },
      ],
      queues: [
        {
          queueId: "CORRECTION:scope-1",
          scopeId: "scope-1",
          kind: "CORRECTION",
          openCount: 1,
          overdueCount: 0,
        },
      ],
      practiceValidation: "NOT_AVAILABLE",
      summary: {
        participantsTotal: 1,
        correctionPending: 1,
        feedbackOpen: 1,
        technicalFailures: 0,
        overdueQueues: 0,
      },
    } as never;
    const markup = renderToStaticMarkup(
      createElement(
        "div",
        null,
        createElement(ModeratorHeader),
        createElement(ModeratorHero),
        createElement(ModeratorDashboardView, { dashboard }),
      ),
    );
    expect(markup).toContain("Painel do moderador");
    expect(markup).toContain("moderated@example.test");

    const empty = renderToStaticMarkup(
      createElement(ModeratorDashboardView, {
        dashboard: { ...dashboard, participants: [], queues: [] },
      }),
    );
    expect(empty).toContain("Nenhuma fila atribuída");
    expect(empty).toContain("Nenhum participante atribuído");
  });

  it("renders first-access components and feedback variants", () => {
    const markup = renderToStaticMarkup(
      createElement(
        "div",
        null,
        createElement(InviteHeader),
        createElement(InviteIntro),
        createElement(InviteForm, {
          password: participantPasswordFixture,
          confirmation: participantPasswordFixture,
          busy: false,
          onPasswordChange: vi.fn(),
          onConfirmationChange: vi.fn(),
          onSubmit: vi.fn(),
        }),
        createElement(InviteComplete),
        createElement(InviteFeedback, { error: "Convite inválido." }),
      ),
    );
    expect(markup).toContain("Criar senha de primeiro acesso");
    expect(markup).toContain("Acesso ativado");
    expect(markup).toContain("Convite inválido.");
  });

  it("renders participant login, journey, feedback and authenticated shell branches", () => {
    const login = renderToStaticMarkup(
      createElement(ParticipantLoginView, {
        login: "vet@example.test",
        password: participantPasswordFixture,
        showPassword: false,
        busy: false,
        error: "Login inválido.",
        retryAction: "login",
        setLogin: vi.fn(),
        setPassword: vi.fn(),
        setShowPassword: vi.fn(),
        handleLogin: vi.fn(),
        handleRetry: vi.fn(),
      }),
    );
    expect(login).toContain("Login inválido.");
    expect(login).toContain("Tentar novamente");

    const journeyStates = ["empty", "error", "ready"] as const;
    for (const journeyState of journeyStates) {
      const markup = renderToStaticMarkup(
        createElement(ParticipantJourneyView, {
          journeyState,
          journey: journeyState === "ready" ? journey : null,
          busy: false,
          refreshJourney: vi.fn(async () => undefined),
          handleRetry: vi.fn(),
        }),
      );
      expect(markup).toContain("Sessão ativa");
    }

    const feedback = renderToStaticMarkup(
      createElement(ParticipantFeedbackView, {
        feedbackType: "MELHORIA",
        feedbackDescription: "Relato sintético.",
        feedbackState: "sent",
        error: "Falha no envio.",
        notice: "Relato registrado.",
        retryAction: "journey",
        busy: false,
        setFeedbackType: vi.fn(),
        setFeedbackDescription: vi.fn(),
        handleFeedbackSubmit: vi.fn(async () => undefined),
        handleRetry: vi.fn(),
      }),
    );
    expect(feedback).toContain("Relato registrado.");
    expect(feedback).toContain("Tentar novamente");

    const shell = renderToStaticMarkup(
      createElement(ParticipantExperienceView, participantProps() as never),
    );
    expect(shell).toContain("Centro de controle");
    expect(shell).toContain("Atualizando seu treinamento");

    const unauthenticated = renderToStaticMarkup(
      createElement(
        ParticipantExperienceView,
        participantProps({
          authenticated: false,
          activity: null,
          busy: false,
          error: null,
          retryAction: null,
        }) as never,
      ),
    );
    expect(unauthenticated).toContain("Bem-vindo de volta");

    const noActivity = renderToStaticMarkup(
      createElement(
        ParticipantExperienceView,
        participantProps({
          activity: null,
          busy: false,
          journeyState: "empty",
          journey: null,
        }) as never,
      ),
    );
    expect(noActivity).toContain("Nenhuma atividade atribuída");
  });
});
