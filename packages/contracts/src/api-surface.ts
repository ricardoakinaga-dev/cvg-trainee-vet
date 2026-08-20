export type ApiSurfaceMethod = "GET" | "PATCH" | "POST";

export type ApiSurfaceAuth = "PUBLIC" | "SESSION" | "INTERNAL" | "METRICS";

export type ApiSurfaceScope = "none" | "own" | "scope" | "audit";

export type ApiSurfaceHandlerGroup =
  "health" | "metrics" | "workflow" | "internal" | "participant" | "authoring";

export type ApiSurfaceRoute = Readonly<{
  readonly method: ApiSurfaceMethod;
  readonly path: string;
  readonly capability: string;
  readonly auth: ApiSurfaceAuth;
  readonly scope: ApiSurfaceScope;
  readonly useCase: string;
  readonly requestContract: string;
  readonly responseContract: string;
  readonly handlerGroup: ApiSurfaceHandlerGroup;
}>;

type ApiSurfaceRouteInput = Omit<ApiSurfaceRoute, "handlerGroup">;

type HandlerGroupMatcher = Readonly<{
  readonly group: ApiSurfaceHandlerGroup;
  readonly matches: (path: string) => boolean;
}>;

const handlerGroupMatchers: readonly HandlerGroupMatcher[] = Object.freeze([
  { group: "health", matches: (path) => path.startsWith("/health/") },
  {
    group: "metrics",
    matches: (path) => path.startsWith("/internal/metrics"),
  },
  {
    group: "authoring",
    matches: (path) =>
      [
        path.startsWith("/api/v1/internal/content/"),
        path.startsWith("/api/v1/internal/authoring/"),
        path.startsWith("/api/v1/internal/attempts/"),
        path === "/api/v1/internal/curriculum/modules/:moduleId/evaluate",
        path.startsWith("/api/v1/attempts/"),
        path.endsWith("/progress"),
      ].some(Boolean),
  },
  {
    group: "workflow",
    matches: (path) =>
      [
        "/api/v1/invitations/accept",
        "/api/v1/auth/login",
        "/api/v1/session",
        "/api/v1/account/password",
        "/api/v1/session/revoke",
        "/api/v1/session/rotate",
        "/api/v1/internal/invitations",
        "/api/v1/feedback",
        "/api/v1/appeals",
      ].includes(path) ||
      [
        "/api/v1/internal/learning-assignments",
        "/api/v1/internal/assessment-workflows",
        "/api/v1/internal/feedback/",
        "/api/v1/internal/appeals/",
      ].some((prefix) => path.startsWith(prefix)),
  },
  {
    group: "participant",
    matches: (path) =>
      [
        "/api/v1/attempts",
        "/api/v1/learning-path",
        "/api/v1/dashboard",
      ].includes(path) ||
      ["/api/v1/activities/", "/api/v1/curriculum/"].some((prefix) =>
        path.startsWith(prefix),
      ),
  },
  {
    group: "internal",
    matches: (path) =>
      path === "/api/v1/account/security" ||
      path.startsWith("/api/v1/account/recovery/") ||
      path.startsWith("/api/v1/account/mfa/") ||
      path.startsWith("/api/v1/internal/"),
  },
]);

function handlerGroupForPath(path: string): ApiSurfaceHandlerGroup {
  const match = handlerGroupMatchers.find(({ matches }) => matches(path));
  if (match === undefined) {
    throw new Error(`API surface route has no handler group: ${path}`);
  }
  return match.group;
}

const route = (value: ApiSurfaceRouteInput): ApiSurfaceRoute =>
  Object.freeze({ ...value, handlerGroup: handlerGroupForPath(value.path) });

export const API_SURFACE: readonly ApiSurfaceRoute[] = Object.freeze([
  route({
    method: "GET",
    path: "/health/live",
    capability: "PUBLIC_HEALTH",
    auth: "PUBLIC",
    scope: "none",
    useCase: "liveness",
    requestContract: "none",
    responseContract: "HealthProjection",
  }),
  route({
    method: "GET",
    path: "/health/ready",
    capability: "PUBLIC_HEALTH",
    auth: "PUBLIC",
    scope: "none",
    useCase: "readiness",
    requestContract: "none",
    responseContract: "HealthProjection",
  }),
  route({
    method: "GET",
    path: "/health/dependencies",
    capability: "PUBLIC_HEALTH",
    auth: "PUBLIC",
    scope: "none",
    useCase: "dependencyHealth",
    requestContract: "none",
    responseContract: "DependencyStatusProjection",
  }),
  route({
    method: "GET",
    path: "/internal/metrics",
    capability: "VIEW_INTERNAL_AUDIT",
    auth: "METRICS",
    scope: "audit",
    useCase: "metricsJson",
    requestContract: "none",
    responseContract: "MetricsProjection",
  }),
  route({
    method: "GET",
    path: "/internal/metrics/prometheus",
    capability: "VIEW_INTERNAL_AUDIT",
    auth: "METRICS",
    scope: "audit",
    useCase: "metricsPrometheus",
    requestContract: "none",
    responseContract: "PrometheusText",
  }),
  route({
    method: "POST",
    path: "/api/v1/invitations/accept",
    capability: "ACCEPT_INVITATION",
    auth: "PUBLIC",
    scope: "none",
    useCase: "acceptInvitation",
    requestContract: "AcceptInvitationRequest",
    responseContract: "AcceptedInvitationProjection",
  }),
  route({
    method: "POST",
    path: "/api/v1/auth/login",
    capability: "AUTHENTICATE_PASSWORD",
    auth: "PUBLIC",
    scope: "none",
    useCase: "loginWithPassword",
    requestContract: "LoginRequest",
    responseContract: "LoggedInSessionProjection",
  }),
  route({
    method: "GET",
    path: "/api/v1/session",
    capability: "READ_SESSION",
    auth: "SESSION",
    scope: "own",
    useCase: "readSession",
    requestContract: "none",
    responseContract: "ActiveSessionProjection",
  }),
  route({
    method: "POST",
    path: "/api/v1/account/password",
    capability: "MANAGE_OWN_PASSWORD",
    auth: "SESSION",
    scope: "own",
    useCase: "setAccountPassword",
    requestContract: "PasswordUpdateRequest",
    responseContract: "AccountOperationProjection",
  }),
  route({
    method: "POST",
    path: "/api/v1/session/revoke",
    capability: "REVOKE_OWN_SESSION",
    auth: "SESSION",
    scope: "own",
    useCase: "revokeSession",
    requestContract: "none",
    responseContract: "AccountOperationProjection",
  }),
  route({
    method: "POST",
    path: "/api/v1/session/rotate",
    capability: "ROTATE_OWN_SESSION",
    auth: "SESSION",
    scope: "own",
    useCase: "rotateSession",
    requestContract: "RotateSessionRequest",
    responseContract: "ActiveSessionProjection",
  }),
  route({
    method: "POST",
    path: "/api/v1/internal/invitations",
    capability: "MANAGE_ACCOUNTS",
    auth: "INTERNAL",
    scope: "scope",
    useCase: "createInvitation",
    requestContract: "CreateInvitationRequest",
    responseContract: "CreatedInvitationProjection",
  }),
  route({
    method: "GET",
    path: "/api/v1/internal/accounts",
    capability: "MANAGE_ACCOUNTS",
    auth: "INTERNAL",
    scope: "scope",
    useCase: "listManagedAccounts",
    requestContract: "AccountManagementListQuery",
    responseContract: "ManagedAccountPageProjection",
  }),
  route({
    method: "PATCH",
    path: "/api/v1/internal/accounts/:accountId",
    capability: "MANAGE_ACCOUNTS",
    auth: "INTERNAL",
    scope: "scope",
    useCase: "updateManagedAccount",
    requestContract: "AccountManagementUpdateRequest",
    responseContract: "ManagedAccountProjection",
  }),
  route({
    method: "POST",
    path: "/api/v1/internal/accounts/:accountId/sessions/revoke",
    capability: "MANAGE_ACCOUNTS",
    auth: "INTERNAL",
    scope: "scope",
    useCase: "revokeManagedAccountSessions",
    requestContract: "AccountSessionRevokeRequest",
    responseContract: "RevokedAccountSessionsProjection",
  }),
  route({
    method: "POST",
    path: "/api/v1/internal/learning-assignments",
    capability: "MANAGE_LEARNING_ASSIGNMENTS",
    auth: "INTERNAL",
    scope: "scope",
    useCase: "createLearningAssignment",
    requestContract: "LearningAssignmentCreateRequest",
    responseContract: "ParticipantLearningAssignmentProjection",
  }),
  route({
    method: "POST",
    path: "/api/v1/internal/learning-assignments/:assignmentId/transition",
    capability: "MANAGE_LEARNING_ASSIGNMENTS",
    auth: "INTERNAL",
    scope: "scope",
    useCase: "transitionLearningAssignment",
    requestContract: "LearningAssignmentScopedTransitionRequest",
    responseContract: "ParticipantLearningAssignmentProjection",
  }),
  route({
    method: "POST",
    path: "/api/v1/internal/assessment-workflows",
    capability: "MANAGE_ASSESSMENT_WORKFLOWS",
    auth: "INTERNAL",
    scope: "scope",
    useCase: "createAssessmentWorkflow",
    requestContract: "AssessmentWorkflowCreateRequest",
    responseContract: "ParticipantAssessmentWorkflowProjection",
  }),
  route({
    method: "POST",
    path: "/api/v1/internal/assessment-workflows/:resultId/transition",
    capability: "MANAGE_ASSESSMENT_WORKFLOWS",
    auth: "INTERNAL",
    scope: "scope",
    useCase: "transitionAssessmentWorkflow",
    requestContract: "AssessmentWorkflowScopedTransitionRequest",
    responseContract: "ParticipantAssessmentWorkflowProjection",
  }),
  route({
    method: "GET",
    path: "/api/v1/feedback",
    capability: "VIEW_FEEDBACK_TICKETS",
    auth: "SESSION",
    scope: "own",
    useCase: "listFeedbackTickets",
    requestContract: "FeedbackTicketListQuery",
    responseContract: "FeedbackTicketListProjection",
  }),
  route({
    method: "POST",
    path: "/api/v1/feedback",
    capability: "CREATE_FEEDBACK_TICKET",
    auth: "SESSION",
    scope: "own",
    useCase: "createFeedbackTicket",
    requestContract: "FeedbackTicketParticipantCreateRequest",
    responseContract: "ParticipantFeedbackTicketProjection",
  }),
  route({
    method: "PATCH",
    path: "/api/v1/internal/feedback/:ticketId",
    capability: "TRANSITION_FEEDBACK_TICKET",
    auth: "INTERNAL",
    scope: "scope",
    useCase: "transitionFeedbackTicket",
    requestContract: "FeedbackTicketScopedTransitionRequest",
    responseContract: "ParticipantFeedbackTicketProjection",
  }),
  route({
    method: "POST",
    path: "/api/v1/appeals",
    capability: "CREATE_APPEAL",
    auth: "SESSION",
    scope: "own",
    useCase: "createAppeal",
    requestContract: "AppealCreateRequest",
    responseContract: "ParticipantAppealProjection",
  }),
  route({
    method: "POST",
    path: "/api/v1/internal/appeals/:appealId/transition",
    capability: "REVIEW_APPEAL",
    auth: "INTERNAL",
    scope: "scope",
    useCase: "transitionAppeal",
    requestContract: "AppealScopedTransitionRequest",
    responseContract: "ParticipantAppealProjection",
  }),
  route({
    method: "POST",
    path: "/api/v1/attempts",
    capability: "START_OWN_ATTEMPT",
    auth: "SESSION",
    scope: "own",
    useCase: "startAttempt",
    requestContract: "CreateAttemptRequest",
    responseContract: "ParticipantAttemptProjection",
  }),
  route({
    method: "GET",
    path: "/api/v1/learning-path",
    capability: "VIEW_OWN_ACTIVITY",
    auth: "SESSION",
    scope: "own",
    useCase: "readLearningPath",
    requestContract: "none",
    responseContract: "ParticipantLearningJourneyProjection",
  }),
  route({
    method: "GET",
    path: "/api/v1/dashboard",
    capability: "VIEW_OWN_ACTIVITY",
    auth: "SESSION",
    scope: "own",
    useCase: "readParticipantDashboard",
    requestContract: "none",
    responseContract: "ParticipantDashboardProjection",
  }),
  route({
    method: "GET",
    path: "/api/v1/account/security",
    capability: "READ_OWN_SECURITY",
    auth: "SESSION",
    scope: "own",
    useCase: "readAccountSecurity",
    requestContract: "none",
    responseContract: "AccountSecurityProjection",
  }),
  route({
    method: "POST",
    path: "/api/v1/account/recovery/start",
    capability: "MANAGE_OWN_RECOVERY",
    auth: "SESSION",
    scope: "own",
    useCase: "beginRecovery",
    requestContract: "AccountOperationRequest",
    responseContract: "AccountOperationProjection",
  }),
  route({
    method: "POST",
    path: "/api/v1/account/mfa/enrollment",
    capability: "MANAGE_OWN_MFA",
    auth: "SESSION",
    scope: "own",
    useCase: "beginMfaEnrollment",
    requestContract: "AccountOperationRequest",
    responseContract: "AccountOperationProjection",
  }),
  route({
    method: "POST",
    path: "/api/v1/account/mfa/enrollment/verify",
    capability: "MANAGE_OWN_MFA",
    auth: "SESSION",
    scope: "own",
    useCase: "verifyMfaEnrollment",
    requestContract: "AccountVerificationRequest",
    responseContract: "AccountOperationProjection",
  }),
  route({
    method: "POST",
    path: "/api/v1/account/recovery/complete",
    capability: "MANAGE_OWN_RECOVERY",
    auth: "SESSION",
    scope: "own",
    useCase: "completeRecovery",
    requestContract: "AccountVerificationRequest",
    responseContract: "AccountOperationProjection",
  }),
  route({
    method: "GET",
    path: "/api/v1/internal/dashboard",
    capability: "VIEW_INTERNAL_AUDIT",
    auth: "INTERNAL",
    scope: "audit",
    useCase: "readOperationsDashboard",
    requestContract: "none",
    responseContract: "OperationsDashboardProjection",
  }),
  route({
    method: "GET",
    path: "/api/v1/internal/audit",
    capability: "VIEW_INTERNAL_AUDIT",
    auth: "INTERNAL",
    scope: "audit",
    useCase: "readAuditTrail",
    requestContract: "none",
    responseContract: "AuditTrailProjection",
  }),
  route({
    method: "GET",
    path: "/api/v1/internal/admin/dashboard",
    capability: "VIEW_ADMIN_DASHBOARD",
    auth: "INTERNAL",
    scope: "scope",
    useCase: "readAdminDashboard",
    requestContract: "none",
    responseContract: "AdminDashboardProjection",
  }),
  route({
    method: "GET",
    path: "/api/v1/internal/admin/operations",
    capability: "VIEW_ADMIN_DASHBOARD",
    auth: "INTERNAL",
    scope: "scope",
    useCase: "readAdminOperationsDashboard",
    requestContract: "none",
    responseContract: "AdminOperationsDashboardProjection",
  }),
  route({
    method: "GET",
    path: "/api/v1/internal/moderator/dashboard",
    capability: "VIEW_MODERATOR_DASHBOARD",
    auth: "INTERNAL",
    scope: "scope",
    useCase: "readModeratorDashboard",
    requestContract: "scopeId query parameter",
    responseContract: "ModeratorDashboardProjection",
  }),
  route({
    method: "POST",
    path: "/api/v1/internal/operational-ai/proposals",
    capability: "VIEW_INTERNAL_AUDIT",
    auth: "INTERNAL",
    scope: "audit",
    useCase: "runOperationalAiProposal",
    requestContract: "OperationalAiProposalRequest",
    responseContract: "OperationalAiProposalProjection",
  }),
  route({
    method: "POST",
    path: "/api/v1/internal/operational-ai/proposals/confirm",
    capability: "VIEW_INTERNAL_AUDIT",
    auth: "INTERNAL",
    scope: "audit",
    useCase: "confirmOperationalAiProposal",
    requestContract: "OperationalAiConfirmationRequest",
    responseContract: "OperationalAiConfirmationProjection",
  }),
  route({
    method: "POST",
    path: "/api/v1/internal/item-statistics",
    capability: "VIEW_INTERNAL_AUDIT",
    auth: "INTERNAL",
    scope: "scope",
    useCase: "recordObservedItemStatistics",
    requestContract: "ObservedItemStatisticsRequest",
    responseContract: "ObservedItemStatisticsProjection",
  }),
  route({
    method: "POST",
    path: "/api/v1/internal/source-conflicts/decisions",
    capability: "APPROVE_CLINICAL_CONTENT",
    auth: "INTERNAL",
    scope: "scope",
    useCase: "recordSourceConflictDecision",
    requestContract: "SourceConflictDecisionRequest",
    responseContract: "SourceConflictDecisionProjection",
  }),
  route({
    method: "POST",
    path: "/api/v1/internal/assessment-recalculations",
    capability: "CORRECT_ATTEMPT",
    auth: "INTERNAL",
    scope: "scope",
    useCase: "recalculateAffectedAssessments",
    requestContract: "AssessmentRecalculationBatchRequest",
    responseContract: "AssessmentRecalculationResult",
  }),
  route({
    method: "GET",
    path: "/api/v1/activities/:activityId",
    capability: "VIEW_OWN_ACTIVITY",
    auth: "SESSION",
    scope: "own",
    useCase: "readParticipantActivity",
    requestContract: "none",
    responseContract: "ParticipantActivityProjection",
  }),
  route({
    method: "GET",
    path: "/api/v1/activities/:activityId/progress",
    capability: "VIEW_OWN_ACTIVITY",
    auth: "SESSION",
    scope: "own",
    useCase: "readParticipantProgress",
    requestContract: "none",
    responseContract: "ParticipantProgressProjection",
  }),
  route({
    method: "GET",
    path: "/api/v1/curriculum/modules/:moduleId/runtime",
    capability: "VIEW_OWN_ACTIVITY",
    auth: "SESSION",
    scope: "own",
    useCase: "readCurriculumRuntime",
    requestContract: "none",
    responseContract: "ParticipantCurriculumRuntimeProjection",
  }),
  route({
    method: "GET",
    path: "/api/v1/curriculum/modules/:moduleId/case",
    capability: "VIEW_OWN_ACTIVITY",
    auth: "SESSION",
    scope: "own",
    useCase: "readParticipantDigitalCase",
    requestContract: "DigitalCaseScopeQuery",
    responseContract: "ParticipantDigitalCaseRuntimeProjection",
  }),
  route({
    method: "POST",
    path: "/api/v1/curriculum/modules/:moduleId/case/advance",
    capability: "VIEW_OWN_ACTIVITY",
    auth: "SESSION",
    scope: "own",
    useCase: "advanceParticipantDigitalCase",
    requestContract: "DigitalCaseAdvanceRequest",
    responseContract: "ParticipantDigitalCaseRuntimeProjection",
  }),
  route({
    method: "POST",
    path: "/api/v1/attempts/:attemptId/answers",
    capability: "SAVE_OWN_ANSWER",
    auth: "SESSION",
    scope: "own",
    useCase: "saveAnswer",
    requestContract: "SaveAnswerRequest",
    responseContract: "ParticipantAttemptProjection",
  }),
  route({
    method: "POST",
    path: "/api/v1/attempts/:attemptId/submit",
    capability: "SUBMIT_OWN_ATTEMPT",
    auth: "SESSION",
    scope: "own",
    useCase: "submitAttempt",
    requestContract: "SubmitAttemptRequest",
    responseContract: "ParticipantAttemptProjection",
  }),
  route({
    method: "GET",
    path: "/api/v1/attempts/:attemptId/feedback",
    capability: "VIEW_OWN_FEEDBACK",
    auth: "SESSION",
    scope: "own",
    useCase: "readAttemptFeedback",
    requestContract: "none",
    responseContract: "ParticipantFeedbackProjection",
  }),
  route({
    method: "POST",
    path: "/api/v1/internal/attempts/:attemptId/correct",
    capability: "CORRECT_ATTEMPT",
    auth: "INTERNAL",
    scope: "scope",
    useCase: "correctOpenResponse",
    requestContract: "CorrectOpenResponseRequest",
    responseContract: "CorrectionResultProjection",
  }),
  route({
    method: "POST",
    path: "/api/v1/internal/content/:contentId/transition",
    capability: "MODERATE_CONTENT",
    auth: "INTERNAL",
    scope: "scope",
    useCase: "transitionContent",
    requestContract: "ContentTransitionRequest",
    responseContract: "AuthoringRecordProjection",
  }),
  route({
    method: "GET",
    path: "/api/v1/internal/content/:contentId/versions/:version/authoring",
    capability: "VIEW_INTERNAL_SOURCE",
    auth: "INTERNAL",
    scope: "scope",
    useCase: "readInternalAuthoringRecord",
    requestContract: "none",
    responseContract: "InternalAuthoringRecordProjection",
  }),
  route({
    method: "GET",
    path: "/api/v1/internal/authoring/review-queue",
    capability: "VIEW_CLINICAL_REVIEW_QUEUE",
    auth: "INTERNAL",
    scope: "scope",
    useCase: "readClinicalReviewQueue",
    requestContract: "ClinicalReviewQueueQuery",
    responseContract: "ClinicalReviewQueuePage",
  }),
  route({
    method: "POST",
    path: "/api/v1/internal/content/:contentId/review",
    capability: "APPROVE_CLINICAL_CONTENT",
    auth: "INTERNAL",
    scope: "scope",
    useCase: "reviewAuthoring",
    requestContract: "AuthoringReviewRequest",
    responseContract: "AuthoringRecordProjection",
  }),
  route({
    method: "POST",
    path: "/api/v1/internal/content/:contentId/publish",
    capability: "PUBLISH_CONTENT",
    auth: "INTERNAL",
    scope: "scope",
    useCase: "publishAuthoring",
    requestContract: "AuthoringPublicationRequest",
    responseContract: "AuthoringRecordProjection",
  }),
  route({
    method: "POST",
    path: "/api/v1/internal/curriculum/modules/:moduleId/evaluate",
    capability: "MANAGE_ASSESSMENT_WORKFLOWS",
    auth: "INTERNAL",
    scope: "scope",
    useCase: "evaluateCurriculumModule",
    requestContract: "CurriculumRuntimeEvaluationRequest",
    responseContract: "ParticipantCurriculumRuntimeProjection",
  }),
]);

const validMethods = new Set<ApiSurfaceMethod>(["GET", "PATCH", "POST"]);
const validAuth = new Set<ApiSurfaceAuth>([
  "PUBLIC",
  "SESSION",
  "INTERNAL",
  "METRICS",
]);
const validScopes = new Set<ApiSurfaceScope>(["none", "own", "scope", "audit"]);
const pathParameterPattern = /:[A-Za-z][A-Za-z0-9]*/gu;

export function materializeApiSurfacePath(path: string): string {
  return path.replace(pathParameterPattern, (parameter) =>
    parameter === ":version" ? "1" : "sample-id",
  );
}

function matchesApiSurfacePath(template: string, path: string): boolean {
  const templateSegments = template.split("/");
  const pathSegments = path.split("/");
  if (templateSegments.length !== pathSegments.length) return false;
  return templateSegments.every((segment, index) =>
    segment.startsWith(":") && pathSegments[index] !== undefined
      ? pathSegments[index] !== ""
      : segment === pathSegments[index],
  );
}

export function findApiSurfaceRoute(
  method: string,
  path: string,
): ApiSurfaceRoute | null {
  return (
    API_SURFACE.find(
      (route) =>
        route.method === method && matchesApiSurfacePath(route.path, path),
    ) ?? null
  );
}

export function validateApiSurface(
  routes: readonly ApiSurfaceRoute[],
): readonly string[] {
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const route of routes) {
    const key = `${String(route.method)} ${route.path}`;
    if (seen.has(key)) errors.push(`duplicate route: ${key}`);
    seen.add(key);

    if (!validMethods.has(route.method)) {
      errors.push(`invalid method for ${key}`);
    }
    if (!route.path.startsWith("/") || route.path.includes("//")) {
      errors.push(`invalid path for ${key}`);
    }
    if (!validAuth.has(route.auth)) {
      errors.push(`invalid auth for ${key}`);
    }
    if (!validScopes.has(route.scope)) {
      errors.push(`invalid scope for ${key}`);
    }
    if (route.capability.trim() === "") {
      errors.push(`missing capability for ${key}`);
    }
    if (route.useCase.trim() === "") {
      errors.push(`missing use case for ${key}`);
    }
    if (route.responseContract.trim() === "") {
      errors.push(`missing response contract for ${key}`);
    }
  }

  return Object.freeze(errors);
}
