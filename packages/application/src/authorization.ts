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
  | "CORRECT_ATTEMPT"
  | "MODERATE_CONTENT"
  | "APPROVE_CLINICAL_CONTENT"
  | "AUTHOR_CONTENT"
  | "PUBLISH_CONTENT"
  | "VIEW_INTERNAL_SOURCE"
  | "VIEW_CLINICAL_REVIEW_QUEUE"
  | "VIEW_INTERNAL_AUDIT"
  | "VIEW_MODERATOR_DASHBOARD"
  | "VIEW_ADMIN_DASHBOARD"
  | "MANAGE_ACCOUNTS"
  | "MANAGE_ROLES"
  | "MANAGE_LEARNING_ASSIGNMENTS"
  | "MANAGE_ASSESSMENT_WORKFLOWS"
  | "CREATE_FEEDBACK_TICKET"
  | "VIEW_FEEDBACK_TICKETS"
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

function hasParticipantResourceAccess(request: AuthorizationRequest): boolean {
  return (
    hasRole(request, "PARTICIPANT") &&
    ownsResource(request) &&
    hasScope(request)
  );
}

function hasScopedStaffAccess(request: AuthorizationRequest): boolean {
  return hasScopedStaffRole(request) && hasScope(request);
}

function hasContentModerationAccess(request: AuthorizationRequest): boolean {
  return (
    (hasRole(request, "MODERATOR") ||
      hasRole(request, "ADMIN") ||
      isApprovedClinicalIdentity(request)) &&
    hasScope(request)
  );
}

function hasPublicationAccess(request: AuthorizationRequest): boolean {
  return (
    (hasRole(request, "AUTHOR") ||
      hasRole(request, "MODERATOR") ||
      hasRole(request, "ADMIN")) &&
    hasScope(request)
  );
}

function hasInternalSourceAccess(request: AuthorizationRequest): boolean {
  return (
    (hasRole(request, "AUTHOR") || isApprovedClinicalIdentity(request)) &&
    hasScope(request)
  );
}

function canAccessCapability(request: AuthorizationRequest): boolean {
  switch (request.capability) {
    case "VIEW_OWN_ACTIVITY":
    case "START_OWN_ATTEMPT":
    case "SAVE_OWN_ANSWER":
    case "SUBMIT_OWN_ATTEMPT":
    case "VIEW_OWN_FEEDBACK":
      return hasParticipantResourceAccess(request);
    case "CREATE_FEEDBACK_TICKET":
    case "CREATE_APPEAL":
      return hasParticipantResourceAccess(request);
    case "VIEW_FEEDBACK_TICKETS":
      return (
        hasParticipantResourceAccess(request) || hasScopedStaffAccess(request)
      );
    case "MANAGE_LEARNING_ASSIGNMENTS":
    case "MANAGE_ASSESSMENT_WORKFLOWS":
    case "TRANSITION_FEEDBACK_TICKET":
      return hasScopedStaffAccess(request);
    case "REVIEW_APPEAL":
      return hasScopedStaffAccess(request);
    case "CORRECT_ATTEMPT":
      return isApprovedClinicalIdentity(request) && hasScope(request);
    case "MODERATE_CONTENT":
      return hasContentModerationAccess(request);
    case "APPROVE_CLINICAL_CONTENT":
      return isApprovedClinicalIdentity(request) && hasScope(request);
    case "AUTHOR_CONTENT":
      return hasRole(request, "AUTHOR") && hasScope(request);
    case "PUBLISH_CONTENT":
      return hasPublicationAccess(request);
    case "VIEW_INTERNAL_SOURCE":
      return hasInternalSourceAccess(request);
    case "VIEW_CLINICAL_REVIEW_QUEUE":
      return isApprovedClinicalIdentity(request) && hasScope(request);
    case "VIEW_MODERATOR_DASHBOARD":
      return hasScopedStaffRole(request) && hasScope(request);
    case "VIEW_INTERNAL_AUDIT":
      return hasRole(request, "AUDITOR") || hasRole(request, "ADMIN");
    case "VIEW_ADMIN_DASHBOARD":
      return hasRole(request, "ADMIN");
    case "MANAGE_ACCOUNTS":
      return hasRole(request, "ADMIN");
    case "MANAGE_ROLES":
      return hasRole(request, "ADMIN");
    default:
      return false;
  }
}

export function canAccess(request: AuthorizationRequest): boolean {
  if (request.accountStatus !== "ACTIVE" || request.principalId.trim() === "") {
    return false;
  }
  return canAccessCapability(request);
}
