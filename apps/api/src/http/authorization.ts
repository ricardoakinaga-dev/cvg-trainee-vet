import { canAccess, type Capability } from "@cvg/application";

import type { ApiPrincipal } from "../http.js";

export type ParticipantActivityItemKind = "QUESTAO" | "CASO" | "REFLEXAO";

export function isAllowed(
  principal: ApiPrincipal,
  capability: Capability,
  resource: Readonly<{ ownerId?: string; scopeId?: string }>,
  approvedClinicalApproverId?: string,
): boolean {
  // Independent review finding (v6): the clinical identity must be
  // forwarded unconditionally. canAccess reads it only in the arms that
  // define clinical-identity semantics; everywhere else it is inert, so
  // selective forwarding only created fail-closed denials for clinical
  // staff on hasScopedStaffRole arms (dashboard, metrics, assignments).
  return canAccess({
    principalId: principal.principalId,
    accountStatus: principal.accountStatus,
    roles: principal.roles,
    capability,
    resource,
    scopes: principal.scopes,
    ...(approvedClinicalApproverId === undefined
      ? {}
      : { approvedClinicalApproverId }),
  });
}
