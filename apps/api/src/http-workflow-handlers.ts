import { randomUUID } from "node:crypto";

import { inspectFeedbackContent } from "@cvg/domain";
import {
  type ApiHttpDependencies,
  type ApiHttpRequest,
  type ApiHttpResponse,
  type ApiPrincipal,
} from "./http.js";
import {
  clearSessionCookie,
  type AppealTransitionCommand,
  type AssignmentTransitionCommand,
  type FeedbackTicketListContext,
  type TicketTransitionCommand,
} from "@cvg/application";
import {
  acceptInvitationRequestSchema,
  activeSessionProjectionSchema,
  apiSuccessResponse,
  appealCreateRequestSchema,
  appealScopedTransitionRequestSchema,
  assessmentWorkflowCreateRequestSchema,
  assessmentWorkflowScopedTransitionRequestSchema,
  createInvitationRequestSchema,
  feedbackTicketListProjectionSchema,
  feedbackTicketListQuerySchema,
  feedbackTicketParticipantCreateRequestSchema,
  feedbackTicketScopedTransitionRequestSchema,
  learningAssignmentCreateRequestSchema,
  learningAssignmentScopedTransitionRequestSchema,
  loginRequestSchema,
  passwordUpdateRequestSchema,
  rotateSessionRequestSchema,
  submitAttemptRequestSchema,
} from "@cvg/contracts";
import {
  internalFeedbackTicketProjection,
  publicAppealProjection,
  publicAssessmentWorkflowProjection,
  publicAttemptProjection,
  publicCorrectionProjection,
  publicFeedbackTicketProjection,
  publicLearningAssignmentProjection,
} from "./http-projections.js";
import {
  errorResponse,
  isAllowed,
  recordFeedbackSafetyEventIfNeeded,
  validationResponse,
} from "./http-support.js";

export async function handleCreateInvitation(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const parsed = createInvitationRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);
  const invitedScopes =
    parsed.data.invitedScopes.length === 0
      ? Object.freeze([...principal.scopes])
      : parsed.data.invitedScopes;
  if (invitedScopes.some((scopeId) => !principal.scopes.includes(scopeId))) {
    return errorResponse("forbidden", requestId);
  }

  const created = await dependencies.createInvitation({
    principalId: principal.principalId,
    accountStatus: principal.accountStatus,
    roles: principal.roles,
    scopes: principal.scopes,
    professionalEmail: parsed.data.professionalEmail,
    invitedRoles: parsed.data.invitedRoles,
    invitedScopes,
    expiresInSeconds: parsed.data.expiresInSeconds,
    correlationId: requestId,
  });

  return {
    status: 201,
    body: apiSuccessResponse(
      {
        invitationId: created.invitationId,
        professionalEmail: created.professionalEmail,
        token: created.token,
        expiresAt: created.expiresAt.toISOString(),
      },
      requestId,
    ),
  };
}

export async function handleAcceptInvitation(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const parsed = acceptInvitationRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);

  const accepted = await dependencies.acceptInvitation({
    token: parsed.data.token,
    password: parsed.data.password,
    sessionExpiresInSeconds: parsed.data.sessionExpiresInSeconds,
    correlationId: requestId,
  });

  return {
    status: 200,
    headers: { "set-cookie": accepted.session.cookie },
    body: apiSuccessResponse({ status: "active" }, requestId),
  };
}

export async function handlePasswordLogin(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const parsed = loginRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);
  if (dependencies.loginWithPassword === undefined) {
    return errorResponse("internal_error", requestId);
  }

  const loggedIn = await dependencies.loginWithPassword({
    login: parsed.data.login,
    password: parsed.data.password,
    sessionExpiresInSeconds: parsed.data.sessionExpiresInSeconds,
    correlationId: requestId,
  });
  return {
    status: 200,
    headers: { "set-cookie": loggedIn.session.cookie },
    body: apiSuccessResponse(
      activeSessionProjectionSchema.parse({ status: "active" }),
      requestId,
    ),
  };
}

export async function handleSessionStatus(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const principal = await dependencies.authenticate(request);
  if (principal === null) return errorResponse("unauthenticated", requestId);
  return {
    status: 200,
    body: apiSuccessResponse(
      activeSessionProjectionSchema.parse({
        status: "active",
        canAccessAdmin: isAllowed(principal, "VIEW_ADMIN_DASHBOARD", {}),
      }),
      requestId,
    ),
  };
}

export async function handlePasswordUpdate(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const parsed = passwordUpdateRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);
  if (dependencies.setAccountPassword === undefined) {
    return errorResponse("internal_error", requestId);
  }
  if (principal.accountStatus !== "ACTIVE") {
    return errorResponse("forbidden", requestId);
  }
  await dependencies.setAccountPassword({
    principalId: principal.principalId,
    currentPassword: parsed.data.currentPassword,
    password: parsed.data.password,
    correlationId: requestId,
  });
  return {
    status: 200,
    headers: { "set-cookie": clearSessionCookie() },
    body: apiSuccessResponse({ status: "updated" }, requestId),
  };
}

export async function handleRevokeSession(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.revokeSession !== undefined) {
    await dependencies.revokeSession(request.headers?.cookie);
  }
  return {
    status: 200,
    headers: { "set-cookie": clearSessionCookie() },
    body: apiSuccessResponse({ status: "revoked" }, requestId),
  };
}

export async function handleRotateSession(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const parsed = rotateSessionRequestSchema.safeParse(request.body ?? {});
  if (!parsed.success) return validationResponse(requestId);
  if (dependencies.rotateSession === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const rotated = await dependencies.rotateSession(
    request.headers?.cookie,
    parsed.data.sessionExpiresInSeconds,
  );
  if (rotated === null) return errorResponse("unauthenticated", requestId);
  return {
    status: 200,
    headers: { "set-cookie": rotated.cookie },
    body: apiSuccessResponse({ status: "rotated" }, requestId),
  };
}

export async function handleFeedback(
  attemptId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const attempt = await dependencies.resolveAttempt(attemptId, {
    participantId: principal.principalId,
  });
  if (attempt === null) return errorResponse("not_found", requestId);
  const scopeId = await dependencies.resolveActivityScope(attempt.activityId);
  if (scopeId === null) return errorResponse("not_found", requestId);
  if (
    !isAllowed(principal, "VIEW_OWN_FEEDBACK", {
      ownerId: attempt.participantId,
      scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }

  const correction = await dependencies.getAttemptFeedback(
    principal.principalId,
    attemptId,
  );
  if (correction === null) return errorResponse("not_found", requestId);
  return {
    status: 200,
    body: apiSuccessResponse(publicCorrectionProjection(correction), requestId),
  };
}

export async function handleCreateLearningAssignment(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.createLearningAssignment === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const parsed = learningAssignmentCreateRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);
  if (
    !isAllowed(principal, "MANAGE_LEARNING_ASSIGNMENTS", {
      scopeId: parsed.data.scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }
  const state = await dependencies.createLearningAssignment(parsed.data);
  return {
    status: 201,
    body: apiSuccessResponse(
      publicLearningAssignmentProjection(state),
      requestId,
    ),
  };
}

export async function handleTransitionLearningAssignment(
  request: ApiHttpRequest,
  assignmentId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.transitionLearningAssignment === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const parsed = learningAssignmentScopedTransitionRequestSchema.safeParse(
    request.body,
  );
  if (!parsed.success || parsed.data.assignmentId !== assignmentId) {
    return validationResponse(requestId);
  }
  if (
    !isAllowed(principal, "MANAGE_LEARNING_ASSIGNMENTS", {
      scopeId: parsed.data.scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }
  const event = {
    type: parsed.data.event,
    ...(parsed.data.now === undefined ? {} : { now: parsed.data.now }),
    ...(parsed.data.reason === undefined ? {} : { reason: parsed.data.reason }),
    ...(parsed.data.resumeAt === undefined
      ? {}
      : { resumeAt: parsed.data.resumeAt }),
    ...(parsed.data.to === undefined ? {} : { to: parsed.data.to }),
  } as AssignmentTransitionCommand["event"];
  const state = await dependencies.transitionLearningAssignment({
    assignmentId,
    participantId: parsed.data.participantId,
    scopeId: parsed.data.scopeId,
    version: parsed.data.version,
    event,
  });
  return {
    status: 200,
    body: apiSuccessResponse(
      publicLearningAssignmentProjection(state),
      requestId,
    ),
  };
}

export async function handleCreateAssessmentWorkflow(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.createAssessmentWorkflow === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const parsed = assessmentWorkflowCreateRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);
  if (
    !isAllowed(principal, "MANAGE_ASSESSMENT_WORKFLOWS", {
      scopeId: parsed.data.scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }
  const state = await dependencies.createAssessmentWorkflow(parsed.data);
  return {
    status: 201,
    body: apiSuccessResponse(
      publicAssessmentWorkflowProjection(state),
      requestId,
    ),
  };
}

export async function handleTransitionAssessmentWorkflow(
  request: ApiHttpRequest,
  resultId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.transitionAssessmentWorkflow === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const parsed = assessmentWorkflowScopedTransitionRequestSchema.safeParse(
    request.body,
  );
  if (!parsed.success || parsed.data.resultId !== resultId) {
    return validationResponse(requestId);
  }
  if (
    !isAllowed(principal, "MANAGE_ASSESSMENT_WORKFLOWS", {
      scopeId: parsed.data.scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }
  const state = await dependencies.transitionAssessmentWorkflow({
    resultId,
    participantId: parsed.data.participantId,
    scopeId: parsed.data.scopeId,
    version: parsed.data.version,
    event: { type: parsed.data.event },
  });
  return {
    status: 200,
    body: apiSuccessResponse(
      publicAssessmentWorkflowProjection(state),
      requestId,
    ),
  };
}

export async function handleCreateFeedbackTicket(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.createFeedbackTicket === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const parsed = feedbackTicketParticipantCreateRequestSchema.safeParse(
    request.body,
  );
  if (!parsed.success) return validationResponse(requestId);
  const scopeId =
    parsed.data.scopeId ??
    (principal.scopes.length === 1 ? principal.scopes[0] : undefined);
  if (scopeId === undefined) return errorResponse("forbidden", requestId);
  if (
    !isAllowed(principal, "CREATE_FEEDBACK_TICKET", {
      ownerId: principal.principalId,
      scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }
  const contentInspection = inspectFeedbackContent(parsed.data.description);
  if (!contentInspection.safe) {
    if (dependencies.recordFeedbackSafetyEvent !== undefined) {
      await dependencies.recordFeedbackSafetyEvent({
        principalId: principal.principalId,
        scopeId,
        ticketId: "blocked",
        requestId,
        action: "BLOCKED",
        reasonCodes: contentInspection.reasons,
      });
    }
    return validationResponse(requestId, "description");
  }
  const createdAt = new Date().toISOString();
  const suppliedTechnicalContext = parsed.data.technicalContext;
  const technicalContext =
    suppliedTechnicalContext === undefined
      ? ({
          logicalPage: "/feedback",
          appVersion: dependencies.applicationVersion ?? "api-0.1.0",
          occurredAt: createdAt,
        } as const)
      : {
          logicalPage: suppliedTechnicalContext.logicalPage,
          appVersion: suppliedTechnicalContext.appVersion,
          ...(suppliedTechnicalContext.occurredAt === undefined
            ? {}
            : { occurredAt: suppliedTechnicalContext.occurredAt }),
          ...(suppliedTechnicalContext.errorCode === undefined
            ? {}
            : { errorCode: suppliedTechnicalContext.errorCode }),
        };
  const state = await dependencies.createFeedbackTicket({
    ticketId: randomUUID(),
    participantId: principal.principalId,
    scopeId,
    type: parsed.data.type,
    description: parsed.data.description,
    createdAt,
    technicalContext,
  });
  return {
    status: 201,
    body: apiSuccessResponse(publicFeedbackTicketProjection(state), requestId),
  };
}

export async function handleListFeedbackTickets(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.listFeedbackTickets === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const parsed = feedbackTicketListQuerySchema.safeParse(request.query ?? {});
  if (!parsed.success) return validationResponse(requestId);

  const scopeId =
    parsed.data.scopeId ??
    (principal.scopes.length === 1 ? principal.scopes[0] : undefined);
  if (scopeId === undefined) return errorResponse("forbidden", requestId);

  const isStaff = principal.roles.some((role) =>
    ["MODERATOR", "ADMIN", "CLINICAL_APPROVER"].includes(role),
  );
  if (
    !isAllowed(
      principal,
      "VIEW_FEEDBACK_TICKETS",
      isStaff ? { scopeId } : { ownerId: principal.principalId, scopeId },
    )
  ) {
    return errorResponse("forbidden", requestId);
  }

  const context: FeedbackTicketListContext = {
    audience: isStaff ? "STAFF" : "PARTICIPANT",
    scopeId,
    ...(isStaff ? {} : { participantId: principal.principalId }),
    ...(parsed.data.status === undefined ? {} : { status: parsed.data.status }),
    ...(parsed.data.priority === undefined
      ? {}
      : { priority: parsed.data.priority }),
  };
  const tickets = await dependencies.listFeedbackTickets(context);
  if (
    !isStaff &&
    tickets.some(
      (ticket) => ticket.state.participantId !== principal.principalId,
    )
  ) {
    return errorResponse("forbidden", requestId);
  }
  if (tickets.some((ticket) => ticket.scopeId !== scopeId)) {
    return errorResponse("internal_error", requestId);
  }
  for (const ticket of tickets) {
    await recordFeedbackSafetyEventIfNeeded(
      ticket.state,
      principal.principalId,
      ticket.scopeId,
      requestId,
      "REDACTED",
      dependencies,
    );
  }
  const projection = feedbackTicketListProjectionSchema.parse({
    tickets: tickets.map((ticket) =>
      isStaff
        ? internalFeedbackTicketProjection(ticket)
        : publicFeedbackTicketProjection(ticket.state),
    ),
  });
  return {
    status: 200,
    body: apiSuccessResponse(projection, requestId),
  };
}

export async function handleTransitionFeedbackTicket(
  request: ApiHttpRequest,
  ticketId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.transitionFeedbackTicket === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const parsed = feedbackTicketScopedTransitionRequestSchema.safeParse(
    request.body,
  );
  if (!parsed.success || parsed.data.ticketId !== ticketId) {
    return validationResponse(requestId);
  }
  if (
    !isAllowed(principal, "TRANSITION_FEEDBACK_TICKET", {
      scopeId: parsed.data.scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }
  const event = {
    type: parsed.data.event,
    actorId: principal.principalId,
    ...(parsed.data.now === undefined ? {} : { now: parsed.data.now }),
    ...(parsed.data.priority === undefined
      ? {}
      : { priority: parsed.data.priority }),
    ...(parsed.data.assigneeId === undefined
      ? {}
      : { assigneeId: parsed.data.assigneeId }),
    ...(parsed.data.response === undefined
      ? {}
      : { response: parsed.data.response }),
  } as TicketTransitionCommand["event"];
  const state = await dependencies.transitionFeedbackTicket({
    ticketId,
    participantId: parsed.data.participantId,
    scopeId: parsed.data.scopeId,
    version: parsed.data.version,
    event,
  });
  return {
    status: 200,
    body: apiSuccessResponse(publicFeedbackTicketProjection(state), requestId),
  };
}

export async function handleCreateAppeal(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.createAppeal === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const parsed = appealCreateRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);
  const attempt = await dependencies.resolveAttempt(parsed.data.attemptId, {
    participantId: principal.principalId,
  });
  if (attempt === null) return errorResponse("not_found", requestId);
  const scopeId = await dependencies.resolveActivityScope(attempt.activityId);
  if (scopeId === null) return errorResponse("not_found", requestId);
  if (
    !isAllowed(principal, "CREATE_APPEAL", {
      ownerId: attempt.participantId,
      scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }
  const state = await dependencies.createAppeal({
    appealId: randomUUID(),
    participantId: principal.principalId,
    scopeId,
    attemptId: parsed.data.attemptId,
    itemId: parsed.data.itemId,
    justification: parsed.data.justification,
    createdAt: new Date().toISOString(),
  });
  return {
    status: 201,
    body: apiSuccessResponse(publicAppealProjection(state), requestId),
  };
}

export async function handleTransitionAppeal(
  request: ApiHttpRequest,
  appealId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  if (dependencies.transitionAppeal === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const parsed = appealScopedTransitionRequestSchema.safeParse(request.body);
  if (!parsed.success || parsed.data.appealId !== appealId) {
    return validationResponse(requestId);
  }
  if (
    !isAllowed(principal, "REVIEW_APPEAL", {
      scopeId: parsed.data.scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }
  const event = {
    type: parsed.data.event,
    ...(parsed.data.reviewerId === undefined
      ? {}
      : { reviewerId: parsed.data.reviewerId }),
    ...(parsed.data.decision === undefined
      ? {}
      : { decision: parsed.data.decision }),
  } as AppealTransitionCommand["event"];
  const state = await dependencies.transitionAppeal({
    appealId,
    participantId: parsed.data.participantId,
    scopeId: parsed.data.scopeId,
    version: parsed.data.version,
    event,
  });
  return {
    status: 200,
    body: apiSuccessResponse(publicAppealProjection(state), requestId),
  };
}

export async function handleSubmit(
  request: ApiHttpRequest,
  attemptId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const parsed = submitAttemptRequestSchema.safeParse({
    ...(request.body !== null &&
    typeof request.body === "object" &&
    !Array.isArray(request.body)
      ? request.body
      : {}),
    attemptId,
  });
  if (!parsed.success) return validationResponse(requestId);

  const current = await dependencies.resolveAttempt(parsed.data.attemptId, {
    participantId: principal.principalId,
  });
  if (current === null) return errorResponse("not_found", requestId);
  const scopeId = await dependencies.resolveActivityScope(current.activityId);
  if (scopeId === null) return errorResponse("not_found", requestId);
  if (
    !isAllowed(principal, "SUBMIT_OWN_ATTEMPT", {
      ownerId: current.participantId,
      scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }

  const state = await dependencies.submitAttempt({
    attemptId: parsed.data.attemptId,
    participantId: principal.principalId,
    idempotencyKey: parsed.data.idempotencyKey,
    correlationId: requestId,
    submittedAt: new Date().toISOString(),
  });
  return {
    status: 200,
    body: apiSuccessResponse(publicAttemptProjection(state), requestId),
  };
}
