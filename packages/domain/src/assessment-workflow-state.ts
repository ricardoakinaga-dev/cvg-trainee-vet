export type AssessmentWorkflowStatus =
  | "RESULTADO_EM_PROCESSAMENTO"
  | "RESULTADO_DISPONIVEL"
  | "RESULTADO_EM_REVISAO"
  | "RESULTADO_CORRIGIDO"
  | "RESULTADO_ANULADO";

export interface AssessmentWorkflowState {
  readonly resultId: string;
  readonly attemptId: string;
  readonly ruleVersion: string;
  readonly version: number;
  readonly status: AssessmentWorkflowStatus;
}

export type AssessmentWorkflowEvent =
  | { readonly type: "DISPONIBILIZAR" }
  | { readonly type: "INICIAR_REVISAO" }
  | { readonly type: "CORRIGIR" }
  | { readonly type: "ANULAR" };

class AssessmentWorkflowDomainError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "LearningAssignmentDomainError";
  }
}

function freeze<T>(value: T): Readonly<T> {
  return Object.freeze(value);
}

function assertNonEmpty(
  value: unknown,
  field: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AssessmentWorkflowDomainError(`${field} must not be empty`);
  }
}

const assessmentWorkflowTransitions: Readonly<
  Record<
    AssessmentWorkflowStatus,
    Readonly<
      Partial<Record<AssessmentWorkflowEvent["type"], AssessmentWorkflowStatus>>
    >
  >
> = {
  RESULTADO_EM_PROCESSAMENTO: { DISPONIBILIZAR: "RESULTADO_DISPONIVEL" },
  RESULTADO_DISPONIVEL: {
    INICIAR_REVISAO: "RESULTADO_EM_REVISAO",
    ANULAR: "RESULTADO_ANULADO",
  },
  RESULTADO_EM_REVISAO: {
    CORRIGIR: "RESULTADO_CORRIGIDO",
    ANULAR: "RESULTADO_ANULADO",
  },
  RESULTADO_CORRIGIDO: { INICIAR_REVISAO: "RESULTADO_EM_REVISAO" },
  RESULTADO_ANULADO: {},
};

function assertAssessmentWorkflowState(state: AssessmentWorkflowState): void {
  if (state === null || typeof state !== "object") {
    throw new AssessmentWorkflowDomainError(
      "assessment workflow must be an object",
    );
  }
  assertNonEmpty(state.resultId, "resultId");
  assertNonEmpty(state.attemptId, "attemptId");
  assertNonEmpty(state.ruleVersion, "ruleVersion");
  if (!Number.isInteger(state.version) || state.version < 0) {
    throw new AssessmentWorkflowDomainError(
      "assessment workflow version must be non-negative",
    );
  }
  if (
    !Object.prototype.hasOwnProperty.call(
      assessmentWorkflowTransitions,
      state.status,
    )
  ) {
    throw new AssessmentWorkflowDomainError(
      "assessment workflow status is not supported",
    );
  }
}

export function createAssessmentWorkflowResult(
  input: Readonly<{
    readonly resultId: string;
    readonly attemptId: string;
    readonly ruleVersion: string;
  }>,
): AssessmentWorkflowState {
  assertNonEmpty(input.resultId, "resultId");
  assertNonEmpty(input.attemptId, "attemptId");
  assertNonEmpty(input.ruleVersion, "ruleVersion");
  return freeze({
    ...input,
    version: 0,
    status: "RESULTADO_EM_PROCESSAMENTO" as const,
  });
}

export function transitionAssessmentWorkflowResult(
  state: AssessmentWorkflowState,
  event: AssessmentWorkflowEvent,
): AssessmentWorkflowState {
  assertAssessmentWorkflowState(state);
  const nextStatus = assessmentWorkflowTransitions[state.status][event.type];
  if (nextStatus === undefined) {
    throw new AssessmentWorkflowDomainError(
      `Event ${event.type} is not allowed from state ${state.status}`,
    );
  }
  return freeze({ ...state, status: nextStatus, version: state.version + 1 });
}
