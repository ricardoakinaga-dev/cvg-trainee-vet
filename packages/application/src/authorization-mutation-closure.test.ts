import { describe, expect, it } from "vitest";

import {
  canAccess,
  CAPABILITIES,
  type AuthorizationRequest,
  type Capability,
} from "./authorization.js";

/**
 * AAA-CERT-001 — Mutation Assurance Closure.
 *
 * Killer tests comportamentais para os surviving mutants do Stryker em
 * `authorization.ts` (baseline raw 70,78%: 155 killed / 64 survived em 219).
 * Cada teste observa comportamento de `canAccess` (allow/deny), nunca
 * implementação interna ou número de linha.
 *
 * Mapeamento mutant→teste em
 * `docs/quality/mutation-classification-v4.md`.
 */

const scope = "curriculum-1";
const otherScope = "other-scope";

function request(overrides = {}): AuthorizationRequest {
  return {
    principalId: "principal-1",
    accountStatus: "ACTIVE",
    roles: ["PARTICIPANT"],
    capability: "VIEW_OWN_ACTIVITY",
    resource: { ownerId: "principal-1", scopeId: scope },
    scopes: [scope],
    ...overrides,
  };
}

const moderator = (overrides = {}): AuthorizationRequest =>
  request({
    principalId: "moderator-1",
    roles: ["MODERATOR"],
    capability: "MODERATE_CONTENT",
    resource: { scopeId: scope },
    ...overrides,
  });

describe("authorization mutation closure — CAPABILITIES integrity (kills IDs 0–33)", () => {
  const expected: readonly Capability[] = [
    "VIEW_OWN_ACTIVITY",
    "VIEW_OWN_DIAGNOSTIC_SESSION",
    "START_OWN_DIAGNOSTIC_SESSION",
    "SAVE_OWN_DIAGNOSTIC_ANSWER",
    "FINALIZE_OWN_DIAGNOSTIC_SESSION",
    "START_OWN_ATTEMPT",
    "SAVE_OWN_ANSWER",
    "SUBMIT_OWN_ATTEMPT",
    "VIEW_OWN_FEEDBACK",
    "VIEW_OWN_APPEALS",
    "CORRECT_ATTEMPT",
    "MODERATE_CONTENT",
    "AUTHOR_CONTENT",
    "APPROVE_CLINICAL_CONTENT",
    "PUBLISH_CONTENT",
    "VIEW_INTERNAL_SOURCE",
    "VIEW_INTERNAL_AUDIT",
    "VIEW_AUDIT_TRAIL",
    "VIEW_STAFF_DASHBOARD",
    "VIEW_PROGRAM_METRICS",
    "VIEW_CONTENT_REVIEW_QUEUE",
    "VIEW_FEEDBACK_QUEUE",
    "VIEW_INTERNAL_SCOPES",
    "MANAGE_ROLES",
    "MANAGE_ACCOUNT_LIFECYCLE",
    "GRANT_CLINICAL_APPROVER",
    "MANAGE_LEARNING_ASSIGNMENTS",
    "MANAGE_ASSESSMENT_WORKFLOWS",
    "CREATE_FEEDBACK_TICKET",
    "TRANSITION_FEEDBACK_TICKET",
    "MANAGE_FEEDBACK_METADATA",
    "CREATE_APPEAL",
    "REVIEW_APPEAL",
  ];

  it("exposes every governed capability and nothing else", () => {
    expect(CAPABILITIES.size).toBe(expected.length);
    for (const capability of expected) {
      expect(CAPABILITIES.has(capability)).toBe(true);
    }
    expect(CAPABILITIES.has("" as Capability)).toBe(false);
  });
});

describe("authorization mutation closure — scope guard (kills IDs 40–41)", () => {
  it("denies scoped staff access without a resource scope", () => {
    expect(canAccess(moderator({ resource: undefined, scopes: [scope] }))).toBe(
      false,
    );
  });

  it("denies scoped staff access outside membership", () => {
    expect(
      canAccess(
        moderator({ resource: { scopeId: scope }, scopes: [otherScope] }),
      ),
    ).toBe(false);
  });

  it("grants scoped staff access inside membership", () => {
    expect(canAccess(moderator())).toBe(true);
  });
});

describe("authorization mutation closure — staff role composition (kills IDs 55, 57, 60–61)", () => {
  const manageAssignments = (overrides = {}): AuthorizationRequest =>
    request({
      principalId: "moderator-1",
      roles: ["MODERATOR"],
      capability: "MANAGE_LEARNING_ASSIGNMENTS",
      resource: { scopeId: scope },
      scopes: [scope],
      ...overrides,
    });

  it("denies a participant on staff-only transitions", () => {
    expect(canAccess(manageAssignments({ roles: ["PARTICIPANT"] }))).toBe(
      false,
    );
  });

  it("grants a bare moderator without clinical identity", () => {
    expect(canAccess(manageAssignments())).toBe(true);
  });

  it("grants a bare administrator without clinical identity", () => {
    expect(canAccess(manageAssignments({ roles: ["ADMIN"] }))).toBe(true);
  });
});

describe("authorization mutation closure — entry guard (kills ID 62)", () => {
  it("denies suspended and blank identities before any capability arm", () => {
    expect(
      canAccess(request({ accountStatus: "SUSPENDED", resource: undefined })),
    ).toBe(false);
    expect(
      canAccess(request({ principalId: "   ", resource: undefined })),
    ).toBe(false);
  });
});

describe("authorization mutation closure — creation arms (kills IDs 95, 97–99)", () => {
  const createTicket = (overrides = {}): AuthorizationRequest =>
    request({
      capability: "CREATE_FEEDBACK_TICKET",
      ...overrides,
    });

  it("denies creation for a mismatched owner", () => {
    expect(
      canAccess(
        createTicket({
          resource: { ownerId: "someone-else", scopeId: scope },
        }),
      ),
    ).toBe(false);
  });

  it("denies creation for non-participant roles even in scope", () => {
    expect(canAccess(createTicket({ roles: ["MODERATOR"] }))).toBe(false);
  });

  it("grants creation to the scoped owner participant", () => {
    expect(canAccess(createTicket())).toBe(true);
  });
});

describe("authorization mutation closure — editorial arms (kills IDs 117, 119)", () => {
  it("grants feedback metadata to a scoped moderator", () => {
    expect(
      canAccess(
        request({
          principalId: "moderator-1",
          roles: ["MODERATOR"],
          capability: "MANAGE_FEEDBACK_METADATA",
          resource: { scopeId: scope },
          scopes: [scope],
        }),
      ),
    ).toBe(true);
  });

  it("grants appeal review to a scoped moderator", () => {
    expect(
      canAccess(
        request({
          principalId: "moderator-1",
          roles: ["MODERATOR"],
          capability: "REVIEW_APPEAL",
          resource: { scopeId: scope },
          scopes: [scope],
        }),
      ),
    ).toBe(true);
  });
});

describe("authorization mutation closure — moderation confinement (kills IDs 132–133)", () => {
  it("denies moderation to participants even inside the scope", () => {
    expect(canAccess(moderator({ roles: ["PARTICIPANT"] }))).toBe(false);
  });

  it("denies moderation outside the scope", () => {
    expect(canAccess(moderator({ resource: { scopeId: otherScope } }))).toBe(
      false,
    );
  });
});

describe("authorization mutation closure — audit arms (kills IDs 163–164, 174)", () => {
  it("grants internal audit to a scoped auditor identity", () => {
    expect(
      canAccess(
        request({
          principalId: "auditor-1",
          roles: ["AUDITOR"],
          capability: "VIEW_INTERNAL_AUDIT",
          resource: undefined,
          scopes: [],
        }),
      ),
    ).toBe(true);
  });

  it("grants the audit trail to a scoped administrator", () => {
    expect(
      canAccess(
        request({
          principalId: "admin-1",
          roles: ["ADMIN"],
          capability: "VIEW_AUDIT_TRAIL",
          resource: { scopeId: scope },
          scopes: [scope],
        }),
      ),
    ).toBe(true);
  });

  it("denies the audit trail to participants", () => {
    expect(
      canAccess(
        request({
          capability: "VIEW_AUDIT_TRAIL",
          resource: { scopeId: scope },
        }),
      ),
    ).toBe(false);
  });
});

describe("authorization mutation closure — review queue and internal scopes (kills IDs 187, 203–204)", () => {
  const reviewQueue = (overrides = {}): AuthorizationRequest =>
    request({
      principalId: "moderator-1",
      roles: ["MODERATOR"],
      capability: "VIEW_CONTENT_REVIEW_QUEUE",
      resource: { scopeId: scope },
      scopes: [scope],
      ...overrides,
    });

  it("denies the review queue to participants", () => {
    expect(canAccess(reviewQueue({ roles: ["PARTICIPANT"] }))).toBe(false);
  });

  it("grants the review queue to a scoped moderator", () => {
    expect(canAccess(reviewQueue())).toBe(true);
  });

  it("grants internal scopes to moderator and administrator identities", () => {
    expect(
      canAccess(
        request({
          principalId: "moderator-1",
          roles: ["MODERATOR"],
          capability: "VIEW_INTERNAL_SCOPES",
          resource: undefined,
          scopes: [],
        }),
      ),
    ).toBe(true);
    expect(
      canAccess(
        request({
          principalId: "admin-1",
          roles: ["ADMIN"],
          capability: "VIEW_INTERNAL_SCOPES",
          resource: undefined,
          scopes: [],
        }),
      ),
    ).toBe(true);
  });
});
