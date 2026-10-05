import type { AuthoringPreflight } from "@cvg/application";

export const CLINICAL_PUBLICATION_HOLD_ACTIVE = true;

export function enforceClinicalPublicationHold(
  preflight: AuthoringPreflight,
): AuthoringPreflight {
  if (!CLINICAL_PUBLICATION_HOLD_ACTIVE) return preflight;
  return Object.freeze({
    ...preflight,
    readyForPublication: false,
    checks: Object.freeze({
      ...preflight.checks,
      publicationBlocked: true,
    }),
  });
}
