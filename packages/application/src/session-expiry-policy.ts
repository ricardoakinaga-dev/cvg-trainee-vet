import type { Role } from "./authorization.js";

// D-091 / pre-SPEC alignment §6.15, approved in full by the sponsor.
export const SESSION_ABSOLUTE_LIFETIME_SECONDS = 12 * 60 * 60;

type SessionClockProof = Readonly<{
  readonly roles: readonly Role[];
  readonly createdAt: unknown;
  readonly lastSeenAt: unknown;
  readonly expiresAt: unknown;
  readonly revokedAt: unknown;
}>;

function validDate(value: unknown): value is Date {
  return value instanceof Date && Number.isFinite(value.getTime());
}

function idleLifetimeMs(roles: readonly Role[]): number | null {
  if (roles.includes("ADMIN") || roles.includes("MODERATOR")) {
    return 30 * 60 * 1_000;
  }
  if (roles.includes("PARTICIPANT")) return 8 * 60 * 60 * 1_000;
  // AUTHOR/AUDITOR/CLINICAL_APPROVER are capabilities, not a base role.
  return null;
}

/** Validate stored proof before refreshing it. Equality is already expired. */
export function isSessionWithinExpiryPolicy(
  proof: SessionClockProof,
  now: Date,
): boolean {
  if (
    !validDate(now) ||
    !validDate(proof.createdAt) ||
    !validDate(proof.lastSeenAt) ||
    !validDate(proof.expiresAt) ||
    proof.revokedAt !== null
  )
    return false;

  const idleMs = idleLifetimeMs(proof.roles);
  if (idleMs === null) return false;
  const timestamp = now.getTime();
  const created = proof.createdAt.getTime();
  const seen = proof.lastSeenAt.getTime();
  const expiry = proof.expiresAt.getTime();
  return (
    created <= seen &&
    seen <= timestamp &&
    created < expiry &&
    timestamp < expiry &&
    timestamp - created < SESSION_ABSOLUTE_LIFETIME_SECONDS * 1_000 &&
    timestamp - seen < idleMs
  );
}
