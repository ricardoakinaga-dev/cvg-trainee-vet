import { ApplicationError } from "@cvg/application";
import type {
  ApiHttpDependencies,
  ApiHttpRequest,
  ApiPrincipal,
} from "./http/contracts.js";
import {
  errorResponse,
  validationResponse,
  type ApiHttpResponse,
} from "./http/errors.js";
import {
  handleCorrection,
  handleGetAttempt,
  handleSaveAnswer,
  handleStart,
  handleSubmit,
} from "./features/attempts/attempts.handler.js";
import {
  handleDiagnosticDraftEvaluation,
  handleFinalizeDiagnosticSession,
  handleGetDiagnosticSession,
  handleSaveDiagnosticSessionAnswer,
  handleStartDiagnosticSession,
} from "./features/diagnostics/diagnostics.handler.js";

import {
  handleAcceptInvitation,
  handleCreateInvitation,
  handleResendAccountInvitation,
} from "./features/invitations/invitations.handler.js";
import {
  handleAcceptAccountRecovery,
  handleAccountStatusChange,
  handleIssueAccountRecovery,
} from "./features/accounts/accounts.handler.js";
import {
  handleActivity,
  handleProgress,
} from "./features/activities/activities.handler.js";
import { handleAuditTrail } from "./features/audit/audit.handler.js";
import { handleOperationalRoutes } from "./features/ops/ops.handler.js";
import {
  handleAssignCurriculumFromDiagnostic,
  handleCreateAssessmentWorkflow,
  handleCreateLearningAssignment,
  handleCurriculumRuntime,
  handleCurriculumRuntimeEvaluation,
  handleDashboard,
  handleLearningPath,
  handleTransitionAssessmentWorkflow,
  handleTransitionLearningAssignment,
} from "./features/curriculum/curriculum.handler.js";
import {
  handleContinuingEducationReport,
  handleReflectionManagementReport,
} from "./features/reports/reports.handler.js";
import {
  handleAuthoringReview,
  handleContentReviewQueue,
  handleContentTransition,
  handleCreateAuthoringDraft,
  handleInternalAuthoringRecord,
} from "./features/content/content.handler.js";
import {
  handleAppealDecisionImpact,
  handleAppealReviewHistory,
  handleAppealReviewQueue,
  handleCreateAppeal,
  handleGetParticipantAppeals,
  handleTransitionAppeal,
} from "./features/appeals/appeals.handler.js";
import {
  handleCreateFeedbackTicket,
  handleFeedback,
  handleFeedbackTicketHistory,
  handleFeedbackTriageQueue,
  handleGetParticipantFeedback,
  handleTransitionFeedbackTicket,
  handleUpdateFeedbackTriageMetadata,
} from "./features/feedback/feedback.handler.js";
import {
  handleCurrentSession,
  handleInternalSessionScopes,
  handleRevokeSession,
  handleRotateSession,
} from "./features/session/session.handler.js";
import { recordApiRejectionAudit } from "./http/rejection-audit.js";

export type { ApiHttpResponse };

export type {
  ApiHttpDependencies,
  ApiHttpRequest,
  ApiPrincipal,
} from "./http/contracts.js";

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function handleCredentialRoutes(
  request: ApiHttpRequest,
  requestId: string,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse | null> {
  if (
    request.method === "POST" &&
    request.path === "/api/v1/invitations/accept"
  ) {
    return await handleAcceptInvitation(request, requestId, dependencies);
  }

  if (request.method === "POST" && request.path === "/api/v1/recovery/accept") {
    return await handleAcceptAccountRecovery(request, requestId, dependencies);
  }

  if (request.method === "POST" && request.path === "/api/v1/session/revoke") {
    return await handleRevokeSession(request, requestId, dependencies);
  }

  if (request.method === "GET" && request.path === "/api/v1/session/current") {
    return await handleCurrentSession(request, requestId, dependencies);
  }

  if (request.method === "POST" && request.path === "/api/v1/session/rotate") {
    return await handleRotateSession(request, requestId, dependencies);
  }

  return null;
}

async function handleApiRequestCore(
  request: ApiHttpRequest,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const requestId = dependencies.requestIdFactory();

  try {
    if ((request.queryDuplicateKeys?.length ?? 0) > 0) {
      return validationResponse(requestId);
    }
    const operational = await handleOperationalRoutes(
      request,
      requestId,
      dependencies,
    );
    if (operational !== null) return operational;

    const credentials = await handleCredentialRoutes(
      request,
      requestId,
      dependencies,
    );
    if (credentials !== null) return credentials;

    if (
      request.method === "POST" &&
      request.path === "/api/v1/internal/invitations"
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleCreateInvitation(
        request,
        requestId,
        principal,
        dependencies,
      );
    }

    const accountStatusMatch = request.path.match(
      /^\/api\/v1\/internal\/accounts\/([^/]+)\/status$/u,
    );
    if (request.method === "PATCH" && accountStatusMatch?.[1]) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleAccountStatusChange(
        request,
        accountStatusMatch[1],
        requestId,
        principal,
        dependencies,
      );
    }

    const accountInvitationMatch = request.path.match(
      /^\/api\/v1\/internal\/accounts\/([^/]+)\/invitation$/u,
    );
    if (request.method === "POST" && accountInvitationMatch?.[1]) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleResendAccountInvitation(
        request,
        accountInvitationMatch[1],
        requestId,
        principal,
        dependencies,
      );
    }

    const accountRecoveryMatch = request.path.match(
      /^\/api\/v1\/internal\/accounts\/([^/]+)\/recovery$/u,
    );
    if (request.method === "POST" && accountRecoveryMatch?.[1]) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleIssueAccountRecovery(
        request,
        accountRecoveryMatch[1],
        requestId,
        principal,
        dependencies,
      );
    }

    if (
      request.method === "POST" &&
      request.path === "/api/v1/internal/learning-assignments"
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleCreateLearningAssignment(
        request,
        requestId,
        principal,
        dependencies,
      );
    }

    const learningAssignmentTransitionMatch = request.path.match(
      /^\/api\/v1\/internal\/learning-assignments\/([^/]+)\/transition$/u,
    );
    if (request.method === "POST" && learningAssignmentTransitionMatch?.[1]) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleTransitionLearningAssignment(
        request,
        learningAssignmentTransitionMatch[1],
        requestId,
        principal,
        dependencies,
      );
    }

    if (
      request.method === "POST" &&
      request.path === "/api/v1/internal/assessment-workflows"
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleCreateAssessmentWorkflow(
        request,
        requestId,
        principal,
        dependencies,
      );
    }

    const assessmentWorkflowTransitionMatch = request.path.match(
      /^\/api\/v1\/internal\/assessment-workflows\/([^/]+)\/transition$/u,
    );
    if (request.method === "POST" && assessmentWorkflowTransitionMatch?.[1]) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleTransitionAssessmentWorkflow(
        request,
        assessmentWorkflowTransitionMatch[1],
        requestId,
        principal,
        dependencies,
      );
    }

    if (request.method === "POST" && request.path === "/api/v1/feedback") {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleCreateFeedbackTicket(
        request,
        requestId,
        principal,
        dependencies,
      );
    }

    if (request.method === "GET" && request.path === "/api/v1/feedback") {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleGetParticipantFeedback(
        requestId,
        principal,
        dependencies,
      );
    }

    const feedbackTransitionMatch = request.path.match(
      /^\/api\/v1\/internal\/feedback\/([^/]+)$/u,
    );
    if (request.method === "PATCH" && feedbackTransitionMatch?.[1]) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleTransitionFeedbackTicket(
        request,
        feedbackTransitionMatch[1],
        requestId,
        principal,
        dependencies,
      );
    }

    const feedbackTriageMetadataMatch = request.path.match(
      /^\/api\/v1\/internal\/feedback\/([^/]+)\/triage-metadata$/u,
    );
    if (request.method === "PATCH" && feedbackTriageMetadataMatch?.[1]) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleUpdateFeedbackTriageMetadata(
        request,
        feedbackTriageMetadataMatch[1],
        requestId,
        principal,
        dependencies,
      );
    }

    const feedbackHistoryMatch = request.path.match(
      /^\/api\/v1\/internal\/feedback\/([^/]+)\/history$/u,
    );
    if (request.method === "GET" && feedbackHistoryMatch?.[1]) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleFeedbackTicketHistory(
        request,
        feedbackHistoryMatch[1],
        requestId,
        principal,
        dependencies,
      );
    }

    if (request.method === "GET" && request.path === "/api/v1/appeals") {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleGetParticipantAppeals(
        request,
        requestId,
        principal,
        dependencies,
      );
    }

    if (request.method === "POST" && request.path === "/api/v1/appeals") {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleCreateAppeal(
        request,
        requestId,
        principal,
        dependencies,
      );
    }

    const appealHistoryMatch = request.path.match(
      /^\/api\/v1\/internal\/appeals\/([^/]+)\/history$/u,
    );
    if (request.method === "GET" && appealHistoryMatch?.[1]) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleAppealReviewHistory(
        request,
        appealHistoryMatch[1],
        requestId,
        principal,
        dependencies,
      );
    }

    const appealDecisionImpactMatch = request.path.match(
      /^\/api\/v1\/internal\/appeals\/([^/]+)\/impact-preview$/u,
    );
    if (request.method === "GET" && appealDecisionImpactMatch?.[1]) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleAppealDecisionImpact(
        request,
        appealDecisionImpactMatch[1],
        requestId,
        principal,
        dependencies,
      );
    }

    const appealTransitionMatch = request.path.match(
      /^\/api\/v1\/internal\/appeals\/([^/]+)\/transition$/u,
    );
    if (request.method === "POST" && appealTransitionMatch?.[1]) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleTransitionAppeal(
        request,
        appealTransitionMatch[1],
        requestId,
        principal,
        dependencies,
      );
    }

    const attemptReadMatch = request.path.match(
      /^\/api\/v1\/attempts\/([^/]+)$/u,
    );
    if (request.method === "GET" && attemptReadMatch?.[1]) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleGetAttempt(
        attemptReadMatch[1],
        requestId,
        principal,
        dependencies,
      );
    }

    if (request.method === "POST" && request.path === "/api/v1/attempts") {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleStart(request, requestId, principal, dependencies);
    }

    if (request.method === "GET" && request.path === "/api/v1/learning-path") {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleLearningPath(requestId, principal, dependencies);
    }

    if (request.method === "GET" && request.path === "/api/v1/dashboard") {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleDashboard(requestId, principal, dependencies);
    }

    if (request.method === "GET" && request.path === "/api/v1/audit") {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleAuditTrail(
        request,
        requestId,
        principal,
        dependencies,
      );
    }

    if (
      request.method === "GET" &&
      request.path === "/api/v1/internal/reports/continuing-education"
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleContinuingEducationReport(
        request,
        requestId,
        principal,
        dependencies,
      );
    }

    if (
      request.method === "GET" &&
      request.path === "/api/v1/internal/reports/reflections"
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleReflectionManagementReport(
        request,
        requestId,
        principal,
        dependencies,
      );
    }

    if (
      request.method === "GET" &&
      request.path === "/api/v1/internal/content/review-queue"
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleContentReviewQueue(
        request,
        requestId,
        principal,
        dependencies,
      );
    }

    if (
      request.method === "POST" &&
      request.path === "/api/v1/content/drafts"
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleCreateAuthoringDraft(
        request,
        requestId,
        principal,
        dependencies,
      );
    }

    if (
      request.method === "GET" &&
      request.path === "/api/v1/internal/appeals/review-queue"
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleAppealReviewQueue(
        request,
        requestId,
        principal,
        dependencies,
      );
    }

    if (
      request.method === "GET" &&
      request.path === "/api/v1/internal/feedback"
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleFeedbackTriageQueue(
        request,
        requestId,
        principal,
        dependencies,
      );
    }

    if (
      request.method === "GET" &&
      request.path === "/api/v1/internal/session/scopes"
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleInternalSessionScopes(
        requestId,
        principal,
        dependencies,
      );
    }

    if (
      request.method === "POST" &&
      request.path === "/api/v1/diagnostics/b07/sessions"
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleStartDiagnosticSession(
        request,
        requestId,
        principal,
        dependencies,
      );
    }

    if (
      request.method === "GET" &&
      request.path === "/api/v1/diagnostics/b07/sessions/current"
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleGetDiagnosticSession(
        requestId,
        principal,
        dependencies,
      );
    }

    const diagnosticSessionAnswerMatch = request.path.match(
      /^\/api\/v1\/diagnostics\/b07\/sessions\/([^/]+)\/answers\/([^/]+)$/u,
    );
    if (
      request.method === "PUT" &&
      diagnosticSessionAnswerMatch?.[1] !== undefined &&
      diagnosticSessionAnswerMatch[2] !== undefined
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleSaveDiagnosticSessionAnswer(
        request,
        diagnosticSessionAnswerMatch[1],
        diagnosticSessionAnswerMatch[2],
        requestId,
        principal,
        dependencies,
      );
    }

    const diagnosticSessionFinalizeMatch = request.path.match(
      /^\/api\/v1\/diagnostics\/b07\/sessions\/([^/]+)\/finalize$/u,
    );
    if (
      request.method === "POST" &&
      diagnosticSessionFinalizeMatch?.[1] !== undefined
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleFinalizeDiagnosticSession(
        request,
        diagnosticSessionFinalizeMatch[1],
        requestId,
        principal,
        dependencies,
      );
    }

    const diagnosticSessionMatch = request.path.match(
      /^\/api\/v1\/diagnostics\/b07\/sessions\/([^/]+)$/u,
    );
    if (request.method === "GET" && diagnosticSessionMatch?.[1] !== undefined) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleGetDiagnosticSession(
        requestId,
        principal,
        dependencies,
        diagnosticSessionMatch[1],
      );
    }

    const activityMatch = request.path.match(
      /^\/api\/v1\/activities\/([^/]+)$/,
    );
    if (request.method === "GET" && activityMatch?.[1]) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleActivity(
        activityMatch[1],
        requestId,
        principal,
        dependencies,
      );
    }

    const curriculumRuntimeMatch = request.path.match(
      /^\/api\/v1\/curriculum\/modules\/([^/]+)\/runtime$/u,
    );
    if (request.method === "GET" && curriculumRuntimeMatch?.[1]) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleCurriculumRuntime(
        curriculumRuntimeMatch[1],
        requestId,
        principal,
        dependencies,
      );
    }

    const curriculumRuntimeEvaluationMatch = request.path.match(
      /^\/api\/v1\/internal\/curriculum\/modules\/([^/]+)\/evaluate$/u,
    );
    if (request.method === "POST" && curriculumRuntimeEvaluationMatch?.[1]) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleCurriculumRuntimeEvaluation(
        request,
        curriculumRuntimeEvaluationMatch[1],
        requestId,
        principal,
        dependencies,
      );
    }

    if (
      request.method === "POST" &&
      request.path === "/api/v1/internal/diagnostics/b07/evaluate"
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleDiagnosticDraftEvaluation(
        request,
        requestId,
        principal,
        dependencies,
      );
    }

    const diagnosticAssignmentMatch = request.path.match(
      /^\/api\/v1\/internal\/diagnostics\/([^/]+)\/assign$/u,
    );
    if (request.method === "POST" && diagnosticAssignmentMatch?.[1]) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleAssignCurriculumFromDiagnostic(
        request,
        diagnosticAssignmentMatch[1],
        requestId,
        principal,
        dependencies,
      );
    }

    const contentMatch = request.path.match(
      /^\/api\/v1\/internal\/content\/([^/]+)\/transition$/,
    );
    if (request.method === "POST" && contentMatch?.[1]) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleContentTransition(
        request,
        contentMatch[1],
        requestId,
        principal,
        dependencies,
      );
    }

    const authoringRecordMatch = request.path.match(
      /^\/api\/v1\/internal\/content\/([^/]+)\/versions\/(\d+)\/authoring$/u,
    );
    if (
      request.method === "GET" &&
      authoringRecordMatch?.[1] !== undefined &&
      authoringRecordMatch[2] !== undefined
    ) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleInternalAuthoringRecord(
        request,
        authoringRecordMatch[1],
        authoringRecordMatch[2],
        requestId,
        principal,
        dependencies,
      );
    }

    const authoringReviewMatch = request.path.match(
      /^\/api\/v1\/internal\/content\/([^/]+)\/review$/u,
    );
    if (request.method === "POST" && authoringReviewMatch?.[1] !== undefined) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleAuthoringReview(
        request,
        authoringReviewMatch[1],
        requestId,
        principal,
        dependencies,
      );
    }

    const correctionMatch = request.path.match(
      /^\/api\/v1\/internal\/attempts\/([^/]+)\/correct$/,
    );
    if (request.method === "POST" && correctionMatch?.[1]) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleCorrection(
        request,
        correctionMatch[1],
        requestId,
        principal,
        dependencies,
      );
    }

    const feedbackMatch = request.path.match(
      /^\/api\/v1\/attempts\/([^/]+)\/feedback$/,
    );
    if (request.method === "GET" && feedbackMatch?.[1]) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleFeedback(
        feedbackMatch[1],
        requestId,
        principal,
        dependencies,
      );
    }

    const progressMatch = request.path.match(
      /^\/api\/v1\/activities\/([^/]+)\/progress$/,
    );
    if (request.method === "GET" && progressMatch?.[1]) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleProgress(
        progressMatch[1],
        requestId,
        principal,
        dependencies,
      );
    }

    const submitMatch = request.path.match(
      /^\/api\/v1\/attempts\/([^/]+)\/submit$/,
    );
    if (request.method === "POST" && submitMatch?.[1]) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleSubmit(
        request,
        submitMatch[1],
        requestId,
        principal,
        dependencies,
      );
    }

    const answerMatch = request.path.match(
      /^\/api\/v1\/attempts\/([^/]+)\/answers$/,
    );
    if (request.method === "POST" && answerMatch?.[1]) {
      const principal = await dependencies.authenticate(request);
      if (principal === null)
        return errorResponse("unauthenticated", requestId);
      return await handleSaveAnswer(
        request,
        answerMatch[1],
        requestId,
        principal,
        dependencies,
      );
    }

    return errorResponse("not_found", requestId);
  } catch (error) {
    if (error instanceof ApplicationError) {
      return errorResponse(error.code, requestId, error.status);
    }
    return errorResponse("internal_error", requestId);
  }
}

export async function handleApiRequest(
  request: ApiHttpRequest,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  let principal: ApiPrincipal | undefined;
  const trackedDependencies: ApiHttpDependencies = {
    ...dependencies,
    authenticate: async (authenticatedRequest) => {
      const authenticatedPrincipal =
        await dependencies.authenticate(authenticatedRequest);
      principal = authenticatedPrincipal ?? undefined;
      return authenticatedPrincipal;
    },
  };
  const response = await handleApiRequestCore(request, trackedDependencies);
  await recordApiRejectionAudit(
    dependencies,
    {
      ...request,
      ...(request.query?.scopeId === undefined
        ? {}
        : { scopeId: request.query.scopeId }),
      ...(request.query?.scopeId === undefined &&
      isPlainRecord(request.body) &&
      typeof request.body.scopeId === "string"
        ? { scopeId: request.body.scopeId }
        : {}),
    },
    response,
    principal,
  );
  return response;
}
