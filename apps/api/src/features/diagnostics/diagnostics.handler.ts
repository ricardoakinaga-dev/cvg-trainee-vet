import {
  deriveParticipantDiagnosticProfile,
  finalizeDiagnosticSession,
  getDiagnosticSession,
  saveDiagnosticSessionAnswer,
  startDiagnosticSession,
  toDiagnosticSessionProjection,
  type DiagnosticSessionCatalog,
  type DiagnosticSessionRepositoryPort,
  type EvaluateDiagnosticDraftCommand,
} from "@cvg/application";
import {
  apiErrorResponse,
  apiSuccessResponse,
  diagnosticEvaluationRequestSchema,
  diagnosticSessionAnswerRequestSchema,
  diagnosticSessionFinalizeRequestSchema,
  diagnosticSessionStartRequestSchema,
  parseDiagnosticResultProjection,
  parseDiagnosticSessionProjection,
  type ApiSuccessEnvelope,
} from "@cvg/contracts";

import {
  errorResponse,
  validationResponse,
  type ApiHttpResponse,
} from "../../http/errors.js";
import type {
  ApiHttpDependencies,
  ApiHttpRequest,
  ApiPrincipal,
} from "../../http.js";
import { isAllowed } from "../../http/authorization.js";
import { isUuid } from "../../http/validation.js";

export async function handleDiagnosticDraftEvaluation(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.evaluateDiagnosticDraft === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const parsed = diagnosticEvaluationRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);
  if (
    !isAllowed(principal, "MODERATE_CONTENT", {
      scopeId: parsed.data.scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }
  if (
    dependencies.isParticipantInScope === undefined ||
    !(await dependencies.isParticipantInScope(
      parsed.data.participantId,
      parsed.data.scopeId,
    ))
  ) {
    return errorResponse("forbidden", requestId);
  }
  const command = {
    participantId: parsed.data.participantId,
    scopeId: parsed.data.scopeId,
    answers: parsed.data.answers.map((answer) => ({
      itemId: answer.itemId,
      selectedChoiceIds: [...answer.selectedChoiceIds],
    })),
    completedAt: parsed.data.completedAt,
  } satisfies EvaluateDiagnosticDraftCommand;
  const state = await dependencies.evaluateDiagnosticDraft(command);
  if (
    state.participantId !== command.participantId ||
    state.scopeId !== command.scopeId
  ) {
    return errorResponse("forbidden", requestId);
  }
  if (dependencies.assignCurriculumFromDiagnostic !== undefined) {
    await dependencies.assignCurriculumFromDiagnostic({
      diagnosticResultId: state.resultId,
      scopeId: state.scopeId,
    });
  }
  const themes = deriveParticipantDiagnosticProfile([state]);
  const projection = parseDiagnosticResultProjection({
    resultId: state.resultId,
    diagnosticId: state.diagnosticId,
    version: state.version,
    completedAt: state.completedAt,
    themes: themes.map((theme) => ({
      ...theme,
      recommendedModuleIds: [...theme.recommendedModuleIds],
    })),
  });
  return {
    status: 200,
    body: apiSuccessResponse(projection, requestId),
  };
}

export type DiagnosticScopeAuthorization = string | ApiHttpResponse;

export async function authorizeParticipantDiagnosticScope(
  requestId: string,
  principal: ApiPrincipal,
  capability:
    | "VIEW_OWN_DIAGNOSTIC_SESSION"
    | "START_OWN_DIAGNOSTIC_SESSION"
    | "SAVE_OWN_DIAGNOSTIC_ANSWER"
    | "FINALIZE_OWN_DIAGNOSTIC_SESSION",
  dependencies: ApiHttpDependencies,
): Promise<DiagnosticScopeAuthorization> {
  const candidateScopes = [
    ...new Set(principal.scopes.filter((scopeId) => scopeId.trim().length > 0)),
  ].filter((scopeId) =>
    isAllowed(principal, capability, {
      ownerId: principal.principalId,
      scopeId,
    }),
  );
  if (candidateScopes.length === 0) {
    return errorResponse("forbidden", requestId);
  }
  if (candidateScopes.length !== 1) {
    return {
      status: 409,
      body: apiErrorResponse("state_conflict", requestId, [
        { code: "diagnostic_scope_ambiguous" },
      ]),
    };
  }
  const scopeId = candidateScopes[0];
  if (
    scopeId === undefined ||
    dependencies.isParticipantInScope === undefined ||
    !(await dependencies.isParticipantInScope(principal.principalId, scopeId))
  ) {
    return errorResponse("forbidden", requestId);
  }
  return scopeId;
}

export function diagnosticSessionProjection(
  aggregate: Parameters<typeof toDiagnosticSessionProjection>[0],
): ApiSuccessEnvelope<unknown>["data"] {
  return parseDiagnosticSessionProjection(
    toDiagnosticSessionProjection(aggregate),
  );
}

export function hasDiagnosticSessionDependencies(
  dependencies: ApiHttpDependencies,
): dependencies is ApiHttpDependencies & {
  readonly diagnosticSessionRepository: DiagnosticSessionRepositoryPort;
  readonly diagnosticSessionCatalog: DiagnosticSessionCatalog;
} {
  return (
    dependencies.diagnosticSessionRepository !== undefined &&
    dependencies.diagnosticSessionCatalog !== undefined
  );
}

export async function handleStartDiagnosticSession(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (!hasDiagnosticSessionDependencies(dependencies)) {
    return errorResponse("not_found", requestId);
  }
  const parsed = diagnosticSessionStartRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);
  const scope = await authorizeParticipantDiagnosticScope(
    requestId,
    principal,
    "START_OWN_DIAGNOSTIC_SESSION",
    dependencies,
  );
  if (typeof scope !== "string") return scope;
  const aggregate = await startDiagnosticSession(
    {
      participantId: principal.principalId,
      scopeId: scope,
      startedAt: new Date().toISOString(),
      idempotencyKey: parsed.data.idempotencyKey,
      correlationId: requestId,
    },
    dependencies.diagnosticSessionRepository,
    dependencies.diagnosticSessionCatalog,
  );
  return {
    status: 201,
    body: apiSuccessResponse(diagnosticSessionProjection(aggregate), requestId),
  };
}

export async function handleGetDiagnosticSession(
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
  sessionId?: string,
): Promise<ApiHttpResponse> {
  if (!hasDiagnosticSessionDependencies(dependencies)) {
    return errorResponse("not_found", requestId);
  }
  if (sessionId !== undefined && !isUuid(sessionId)) {
    return validationResponse(requestId);
  }
  const scope = await authorizeParticipantDiagnosticScope(
    requestId,
    principal,
    "VIEW_OWN_DIAGNOSTIC_SESSION",
    dependencies,
  );
  if (typeof scope !== "string") return scope;
  const aggregate = await getDiagnosticSession(
    {
      participantId: principal.principalId,
      scopeId: scope,
      ...(sessionId === undefined ? {} : { sessionId }),
    },
    dependencies.diagnosticSessionRepository,
  );
  if (aggregate === null) return errorResponse("not_found", requestId);
  return {
    status: 200,
    body: apiSuccessResponse(diagnosticSessionProjection(aggregate), requestId),
  };
}

export async function handleSaveDiagnosticSessionAnswer(
  request: ApiHttpRequest,
  sessionId: string,
  itemId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (!hasDiagnosticSessionDependencies(dependencies)) {
    return errorResponse("not_found", requestId);
  }
  if (!isUuid(sessionId) || !isUuid(itemId)) {
    return validationResponse(requestId);
  }
  const parsed = diagnosticSessionAnswerRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);
  const scope = await authorizeParticipantDiagnosticScope(
    requestId,
    principal,
    "SAVE_OWN_DIAGNOSTIC_ANSWER",
    dependencies,
  );
  if (typeof scope !== "string") return scope;
  const aggregate = await saveDiagnosticSessionAnswer(
    {
      participantId: principal.principalId,
      scopeId: scope,
      sessionId,
      itemId,
      version: parsed.data.version,
      selectedChoiceIds: [...parsed.data.selectedChoiceIds],
      idempotencyKey: parsed.data.idempotencyKey,
      correlationId: requestId,
      occurredAt: new Date().toISOString(),
    },
    dependencies.diagnosticSessionRepository,
  );
  return {
    status: 200,
    body: apiSuccessResponse(diagnosticSessionProjection(aggregate), requestId),
  };
}

export async function handleFinalizeDiagnosticSession(
  request: ApiHttpRequest,
  sessionId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (!hasDiagnosticSessionDependencies(dependencies)) {
    return errorResponse("not_found", requestId);
  }
  if (!isUuid(sessionId)) return validationResponse(requestId);
  const parsed = diagnosticSessionFinalizeRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);
  const scope = await authorizeParticipantDiagnosticScope(
    requestId,
    principal,
    "FINALIZE_OWN_DIAGNOSTIC_SESSION",
    dependencies,
  );
  if (typeof scope !== "string") return scope;
  const finalization = await finalizeDiagnosticSession(
    {
      participantId: principal.principalId,
      scopeId: scope,
      sessionId,
      version: parsed.data.version,
      idempotencyKey: parsed.data.idempotencyKey,
      correlationId: requestId,
      completedAt: new Date().toISOString(),
    },
    dependencies.diagnosticSessionRepository,
  );
  return {
    status: 200,
    body: apiSuccessResponse(
      diagnosticSessionProjection(finalization.aggregate),
      requestId,
    ),
  };
}
