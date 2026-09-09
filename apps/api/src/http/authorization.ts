import { canAccess, type Capability } from "@cvg/application";

import type { ApiPrincipal } from "../http.js";

export type ParticipantActivityItemKind = "QUESTAO" | "CASO" | "REFLEXAO";

export function isAllowed(
  principal: ApiPrincipal,
  capability: Capability,
  resource: Readonly<{ ownerId?: string; scopeId?: string }>,
  approvedClinicalApproverId?: string,
): boolean {
  const configuredClinicalIdentity = approvedClinicalApproverId;
  return canAccess({
    principalId: principal.principalId,
    accountStatus: principal.accountStatus,
    roles: principal.roles,
    capability,
    resource,
    scopes: principal.scopes,
    ...(capability === "APPROVE_CLINICAL_CONTENT" ||
    capability === "PUBLISH_CONTENT" ||
    capability === "VIEW_INTERNAL_SOURCE" ||
    capability === "VIEW_AUDIT_TRAIL" ||
    capability === "VIEW_CONTENT_REVIEW_QUEUE" ||
    capability === "VIEW_FEEDBACK_QUEUE" ||
    capability === "TRANSITION_FEEDBACK_TICKET" ||
    capability === "MANAGE_FEEDBACK_METADATA" ||
    capability === "REVIEW_APPEAL" ||
    capability === "VIEW_INTERNAL_SCOPES"
      ? {
          ...(configuredClinicalIdentity === undefined
            ? {}
            : { approvedClinicalApproverId: configuredClinicalIdentity }),
        }
      : {}),
  });
}
