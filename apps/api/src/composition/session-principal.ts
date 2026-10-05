import type { SessionPrincipal } from "@cvg/application";

import type { ApiPrincipal } from "../http.js";

export function sessionPrincipalToApiPrincipal(
  principal: SessionPrincipal | null,
): ApiPrincipal | null {
  return principal === null
    ? null
    : ({
        principalId: principal.accountId,
        ...(principal.sessionId === undefined
          ? {}
          : { sessionId: principal.sessionId }),
        accountStatus: principal.accountStatus,
        roles: principal.roles,
        scopes: principal.scopes,
      } satisfies ApiPrincipal);
}
