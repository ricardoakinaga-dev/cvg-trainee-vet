export type AccountStatus = "INVITED" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED";

export type Role =
  | "PARTICIPANT"
  | "MODERATOR"
  | "ADMIN"
  | "CLINICAL_APPROVER"
  | "AUDITOR"
  | "AUTHOR";

export type Capability =
  | "VIEW_OWN_ACTIVITY"
  | "START_OWN_ATTEMPT"
  | "SAVE_OWN_ANSWER"
  | "SUBMIT_OWN_ATTEMPT"
  | "VIEW_OWN_FEEDBACK"
  | "VIEW_OWN_APPEALS"
  | "CORRECT_ATTEMPT"
  | "MODERATE_CONTENT"
  | "AUTHOR_CONTENT"
  | "APPROVE_CLINICAL_CONTENT"
  | "PUBLISH_CONTENT"
  | "VIEW_INTERNAL_SOURCE"
  | "VIEW_INTERNAL_AUDIT"
  | "VIEW_STAFF_DASHBOARD"
  | "VIEW_PROGRAM_METRICS"
  | "VIEW_CONTENT_REVIEW_QUEUE"
  | "VIEW_INTERNAL_SCOPES"
  | "MANAGE_ROLES"
  | "MANAGE_ACCOUNT_LIFECYCLE"
  | "GRANT_CLINICAL_APPROVER"
  | "MANAGE_LEARNING_ASSIGNMENTS"
  | "MANAGE_ASSESSMENT_WORKFLOWS"
  | "CREATE_FEEDBACK_TICKET"
  | "TRANSITION_FEEDBACK_TICKET"
  | "CREATE_APPEAL"
  | "REVIEW_APPEAL";

export interface AuthorizationResource {
  readonly ownerId?: string;
  readonly scopeId?: string;
}

export interface AuthorizationRequest {
  readonly principalId: string;
  readonly accountStatus: AccountStatus;
  readonly roles: readonly Role[];
  readonly capability: Capability;
  readonly resource?: AuthorizationResource;
  readonly scopes: readonly string[];
  readonly approvedClinicalApproverId?: string;
}

function hasRole(request: AuthorizationRequest, role: Role): boolean {
  return request.roles.includes(role);
}

function hasScope(request: AuthorizationRequest): boolean {
  const scopeId = request.resource?.scopeId;
  return scopeId !== undefined && request.scopes.includes(scopeId);
}

function ownsResource(request: AuthorizationRequest): boolean {
  return request.resource?.ownerId === request.principalId;
}

function isApprovedClinicalIdentity(request: AuthorizationRequest): boolean {
  return (
    hasRole(request, "CLINICAL_APPROVER") &&
    request.approvedClinicalApproverId === request.principalId
  );
}

function hasScopedStaffRole(request: AuthorizationRequest): boolean {
  return (
    hasRole(request, "MODERATOR") ||
    hasRole(request, "ADMIN") ||
    isApprovedClinicalIdentity(request)
  );
}

export function canAccess(request: AuthorizationRequest): boolean {
  if (request.accountStatus !== "ACTIVE" || request.principalId.trim() === "") {
    return false;
  }

  switch (request.capability) {
    case "VIEW_OWN_ACTIVITY":
    case "START_OWN_ATTEMPT":
    case "SAVE_OWN_ANSWER":
    case "SUBMIT_OWN_ATTEMPT":
    case "VIEW_OWN_FEEDBACK":
    case "VIEW_OWN_APPEALS":
      return (
        hasRole(request, "PARTICIPANT") &&
        ownsResource(request) &&
        hasScope(request)
      );
    case "CREATE_FEEDBACK_TICKET":
    case "CREATE_APPEAL":
      return (
        hasRole(request, "PARTICIPANT") &&
        ownsResource(request) &&
        hasScope(request)
      );
    case "MANAGE_LEARNING_ASSIGNMENTS":
    case "MANAGE_ASSESSMENT_WORKFLOWS":
    case "TRANSITION_FEEDBACK_TICKET":
      return hasScopedStaffRole(request) && hasScope(request);
    case "REVIEW_APPEAL":
      return hasScopedStaffRole(request) && hasScope(request);
    case "CORRECT_ATTEMPT":
      return isApprovedClinicalIdentity(request) && hasScope(request);
    case "MODERATE_CONTENT":
      return (
        (hasRole(request, "MODERATOR") || hasRole(request, "ADMIN")) &&
        hasScope(request)
      );
    case "AUTHOR_CONTENT":
      return hasRole(request, "AUTHOR") && hasScope(request);
    case "APPROVE_CLINICAL_CONTENT":
    case "PUBLISH_CONTENT":
      return isApprovedClinicalIdentity(request) && hasScope(request);
    case "VIEW_INTERNAL_SOURCE":
      return (
        (hasRole(request, "AUTHOR") || isApprovedClinicalIdentity(request)) &&
        hasScope(request)
      );
    case "VIEW_INTERNAL_AUDIT":
      return hasRole(request, "AUDITOR") || hasRole(request, "ADMIN");
    case "VIEW_STAFF_DASHBOARD":
      return hasScopedStaffRole(request) && hasScope(request);
    case "VIEW_PROGRAM_METRICS":
      return hasScopedStaffRole(request) && hasScope(request);
    case "VIEW_CONTENT_REVIEW_QUEUE":
      return (
        (hasRole(request, "AUTHOR") || hasScopedStaffRole(request)) &&
        hasScope(request)
      );
    case "VIEW_INTERNAL_SCOPES":
      return (
        hasRole(request, "AUTHOR") ||
        hasRole(request, "MODERATOR") ||
        hasRole(request, "ADMIN") ||
        isApprovedClinicalIdentity(request)
      );
    case "MANAGE_ROLES":
      return hasRole(request, "ADMIN");
    case "MANAGE_ACCOUNT_LIFECYCLE":
      return hasRole(request, "ADMIN") && hasScope(request);
    case "GRANT_CLINICAL_APPROVER":
      return false;
    default:
      return false;
  }
}
