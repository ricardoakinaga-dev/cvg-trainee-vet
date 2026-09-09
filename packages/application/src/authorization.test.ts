import { describe, expect, it } from "vitest";

import { canAccess, type AuthorizationRequest } from "./authorization.js";

const participant = (
  overrides: Partial<AuthorizationRequest> = {},
): AuthorizationRequest => ({
  principalId: "participant-1",
  accountStatus: "ACTIVE",
  roles: ["PARTICIPANT"],
  capability: "VIEW_OWN_ACTIVITY",
  resource: { ownerId: "participant-1", scopeId: "curriculum-1" },
  scopes: ["curriculum-1"],
  ...overrides,
});

describe("authorization policy", () => {
  it("allows an active participant to access only their own scoped activity", () => {
    expect(canAccess(participant())).toBe(true);
    expect(
      canAccess(
        participant({
          resource: { ownerId: "participant-2", scopeId: "curriculum-1" },
        }),
      ),
    ).toBe(false);
  });

  it("allows diagnostic session capabilities only for the active participant owner and scope", () => {
    for (const capability of [
      "VIEW_OWN_DIAGNOSTIC_SESSION",
      "START_OWN_DIAGNOSTIC_SESSION",
      "SAVE_OWN_DIAGNOSTIC_ANSWER",
      "FINALIZE_OWN_DIAGNOSTIC_SESSION",
    ] as const) {
      expect(
        canAccess(
          participant({
            capability,
            resource: { ownerId: "participant-1", scopeId: "curriculum-1" },
          }),
        ),
      ).toBe(true);
      expect(
        canAccess(
          participant({
            capability,
            resource: { ownerId: "participant-2", scopeId: "curriculum-1" },
          }),
        ),
      ).toBe(false);
      expect(
        canAccess(
          participant({
            capability,
            resource: { ownerId: "participant-1", scopeId: "other-scope" },
          }),
        ),
      ).toBe(false);
    }
  });

  it("allows a participant to read only their own scoped appeal protocols", () => {
    expect(
      canAccess(
        participant({
          capability: "VIEW_OWN_APPEALS",
          resource: { ownerId: "participant-1", scopeId: "curriculum-1" },
        }),
      ),
    ).toBe(true);
    expect(
      canAccess(
        participant({
          capability: "VIEW_OWN_APPEALS",
          resource: { ownerId: "participant-2", scopeId: "curriculum-1" },
        }),
      ),
    ).toBe(false);
  });

  it("denies inactive accounts and unknown capabilities by default", () => {
    expect(canAccess(participant({ accountStatus: "SUSPENDED" }))).toBe(false);
    expect(
      canAccess(participant({ capability: "UNKNOWN_CAPABILITY" as never })),
    ).toBe(false);
  });

  it("requires an explicit scope for scoped staff access", () => {
    const moderator = participant({
      principalId: "moderator-1",
      roles: ["MODERATOR"],
      capability: "MODERATE_CONTENT",
      resource: { scopeId: "curriculum-1" },
      scopes: ["curriculum-1"],
    });

    expect(canAccess(moderator)).toBe(true);
    expect(
      canAccess({
        ...moderator,
        scopes: [],
        resource: { scopeId: "curriculum-1" },
      }),
    ).toBe(false);
  });

  it("allows clinical approval only to Ricardo's configured approved identity", () => {
    const request = participant({
      principalId: "ricardo-account",
      roles: ["CLINICAL_APPROVER"],
      capability: "APPROVE_CLINICAL_CONTENT",
      resource: { scopeId: "curriculum-1" },
      scopes: ["curriculum-1"],
      approvedClinicalApproverId: "ricardo-account",
    });

    expect(canAccess(request)).toBe(true);
    expect(canAccess({ ...request, principalId: "another-approver" })).toBe(
      false,
    );
    expect(
      canAccess({
        ...request,
        roles: ["ADMIN"],
        principalId: "admin-1",
      }),
    ).toBe(false);
  });

  it("keeps internal source and audit capabilities outside participant access", () => {
    expect(canAccess(participant({ capability: "VIEW_INTERNAL_SOURCE" }))).toBe(
      false,
    );
    expect(canAccess(participant({ capability: "VIEW_INTERNAL_AUDIT" }))).toBe(
      false,
    );
    expect(
      canAccess({
        principalId: "auditor-1",
        accountStatus: "ACTIVE",
        roles: ["AUDITOR"],
        capability: "VIEW_INTERNAL_AUDIT",
        scopes: [],
      }),
    ).toBe(true);
  });

  it("separates participant creation from scoped staff transitions", () => {
    expect(
      canAccess(
        participant({
          capability: "CREATE_FEEDBACK_TICKET",
          resource: {
            ownerId: "participant-1",
            scopeId: "curriculum-1",
          },
        }),
      ),
    ).toBe(true);
    expect(
      canAccess(
        participant({
          capability: "MANAGE_LEARNING_ASSIGNMENTS",
          resource: { scopeId: "curriculum-1" },
        }),
      ),
    ).toBe(false);
    expect(
      canAccess({
        principalId: "moderator-1",
        accountStatus: "ACTIVE",
        roles: ["MODERATOR"],
        capability: "MANAGE_LEARNING_ASSIGNMENTS",
        resource: { scopeId: "curriculum-1" },
        scopes: ["curriculum-1"],
      }),
    ).toBe(true);
    expect(
      canAccess({
        principalId: "moderator-1",
        accountStatus: "ACTIVE",
        roles: ["MODERATOR"],
        capability: "REVIEW_APPEAL",
        resource: { scopeId: "other-scope" },
        scopes: ["curriculum-1"],
      }),
    ).toBe(false);
  });

  it("limits account lifecycle actions to active administrators in scope", () => {
    const administrator = {
      principalId: "admin-1",
      accountStatus: "ACTIVE" as const,
      roles: ["ADMIN"] as const,
      capability: "MANAGE_ACCOUNT_LIFECYCLE" as const,
      resource: { scopeId: "curriculum-1" },
      scopes: ["curriculum-1"] as const,
    };
    expect(canAccess(administrator)).toBe(true);
    expect(canAccess({ ...administrator, scopes: ["other-scope"] })).toBe(
      false,
    );
    expect(canAccess({ ...administrator, roles: ["MODERATOR"] })).toBe(false);
    expect(canAccess({ ...administrator, accountStatus: "SUSPENDED" })).toBe(
      false,
    );
  });

  it("limits program metrics to active scoped staff roles", () => {
    const request = {
      principalId: "moderator-1",
      accountStatus: "ACTIVE" as const,
      roles: ["MODERATOR"] as const,
      capability: "VIEW_PROGRAM_METRICS" as const,
      resource: { scopeId: "curriculum-1" },
      scopes: ["curriculum-1"] as const,
    };
    expect(canAccess(request)).toBe(true);
    expect(
      canAccess({ ...request, resource: { scopeId: "other-scope" } }),
    ).toBe(false);
    expect(canAccess({ ...request, roles: ["PARTICIPANT"] })).toBe(false);
    expect(canAccess({ ...request, accountStatus: "SUSPENDED" })).toBe(false);
  });

  it("limits the content review queue to active scoped editorial identities", () => {
    const author = {
      principalId: "author-1",
      accountStatus: "ACTIVE" as const,
      roles: ["AUTHOR"] as const,
      capability: "VIEW_CONTENT_REVIEW_QUEUE" as const,
      resource: { scopeId: "curriculum-1" },
      scopes: ["curriculum-1"] as const,
    };
    expect(canAccess(author)).toBe(true);
    expect(canAccess({ ...author, scopes: ["other-scope"] })).toBe(false);
    expect(canAccess({ ...author, accountStatus: "SUSPENDED" })).toBe(false);
    expect(canAccess({ ...author, roles: ["PARTICIPANT"] })).toBe(false);
  });

  it("limits the feedback triage queue to active scoped staff identities", () => {
    const moderator = {
      principalId: "moderator-1",
      accountStatus: "ACTIVE" as const,
      roles: ["MODERATOR"] as const,
      capability: "VIEW_FEEDBACK_QUEUE" as const,
      resource: { scopeId: "curriculum-1" },
      scopes: ["curriculum-1"] as const,
    };
    expect(canAccess(moderator)).toBe(true);
    expect(canAccess({ ...moderator, scopes: ["other-scope"] })).toBe(false);
    expect(canAccess({ ...moderator, roles: ["PARTICIPANT"] })).toBe(false);
    expect(canAccess({ ...moderator, accountStatus: "SUSPENDED" })).toBe(false);
  });

  it("limits feedback metadata changes to moderator and administrator roles", () => {
    const moderator = {
      principalId: "moderator-1",
      accountStatus: "ACTIVE" as const,
      roles: ["MODERATOR"] as const,
      capability: "MANAGE_FEEDBACK_METADATA" as const,
      resource: { scopeId: "curriculum-1" },
      scopes: ["curriculum-1"] as const,
    };
    expect(canAccess(moderator)).toBe(true);
    expect(canAccess({ ...moderator, roles: ["CLINICAL_APPROVER"] })).toBe(
      false,
    );
    expect(canAccess({ ...moderator, roles: ["PARTICIPANT"] })).toBe(false);
    expect(canAccess({ ...moderator, scopes: ["other-scope"] })).toBe(false);
  });

  it("requires the configured identity for a clinical queue reader", () => {
    const request = {
      principalId: "ricardo-account",
      accountStatus: "ACTIVE" as const,
      roles: ["CLINICAL_APPROVER"] as const,
      capability: "VIEW_CONTENT_REVIEW_QUEUE" as const,
      resource: { scopeId: "curriculum-1" },
      scopes: ["curriculum-1"] as const,
    };
    expect(canAccess(request)).toBe(false);
    expect(
      canAccess({ ...request, approvedClinicalApproverId: "ricardo-account" }),
    ).toBe(true);
  });

  it("exposes only session scope context to internal editorial identities", () => {
    expect(
      canAccess({
        principalId: "author-1",
        accountStatus: "ACTIVE",
        roles: ["AUTHOR"],
        capability: "VIEW_INTERNAL_SCOPES",
        scopes: [],
      }),
    ).toBe(true);
    expect(
      canAccess({
        principalId: "participant-1",
        accountStatus: "ACTIVE",
        roles: ["PARTICIPANT"],
        capability: "VIEW_INTERNAL_SCOPES",
        scopes: [],
      }),
    ).toBe(false);
  });
});

describe("authorization policy — uncovered decision arms (AAA-FINAL-002)", () => {
  it("branch=VIEW_STAFF_DASHBOARD/risk=privilege-escalation: staff role plus scope required", () => {
    const moderator = {
      principalId: "moderator-1",
      accountStatus: "ACTIVE" as const,
      roles: ["MODERATOR"] as const,
      capability: "VIEW_STAFF_DASHBOARD" as const,
      resource: { scopeId: "curriculum-1" },
      scopes: ["curriculum-1"] as const,
    };
    expect(canAccess(moderator)).toBe(true);
    expect(canAccess({ ...moderator, roles: ["PARTICIPANT"] as const })).toBe(
      false,
    );
    expect(canAccess({ ...moderator, scopes: ["other-scope"] })).toBe(false);
  });

  it("branch=MODERATE_CONTENT/admin/risk=role-confusion: ADMIN moderates in scope", () => {
    const admin = {
      principalId: "admin-1",
      accountStatus: "ACTIVE" as const,
      roles: ["ADMIN"] as const,
      capability: "MODERATE_CONTENT" as const,
      resource: { scopeId: "curriculum-1" },
      scopes: ["curriculum-1"] as const,
    };
    expect(canAccess(admin)).toBe(true);
    expect(canAccess({ ...admin, scopes: ["other-scope"] })).toBe(false);
  });

  it("branch=VIEW_AUDIT_TRAIL/risk=audit-tampering: auditor or admin in scope only", () => {
    const auditor = {
      principalId: "auditor-1",
      accountStatus: "ACTIVE" as const,
      roles: ["AUDITOR"] as const,
      capability: "VIEW_AUDIT_TRAIL" as const,
      resource: { scopeId: "curriculum-1" },
      scopes: ["curriculum-1"] as const,
    };
    expect(canAccess(auditor)).toBe(true);
    expect(canAccess({ ...auditor, roles: ["PARTICIPANT"] as const })).toBe(
      false,
    );
    expect(canAccess({ ...auditor, scopes: ["other-scope"] })).toBe(false);
  });

  it("branch=MANAGE_ROLES/risk=privilege-escalation: ADMIN only, no scope needed", () => {
    const admin = {
      principalId: "admin-1",
      accountStatus: "ACTIVE" as const,
      roles: ["ADMIN"] as const,
      capability: "MANAGE_ROLES" as const,
      scopes: [] as const,
    };
    expect(canAccess(admin)).toBe(true);
    expect(canAccess({ ...admin, roles: ["MODERATOR"] as const })).toBe(false);
  });

  it("branch=GRANT_CLINICAL_APPROVER/risk=deny-by-default: never granted via policy", () => {
    expect(
      canAccess({
        principalId: "admin-1",
        accountStatus: "ACTIVE",
        roles: ["ADMIN"],
        capability: "GRANT_CLINICAL_APPROVER",
        scopes: ["curriculum-1"],
      }),
    ).toBe(false);
  });
});

describe("authorization policy — mutation killers (AAA-FINAL-002 §16)", () => {
  const scoped = (overrides = {}) => ({
    principalId: "principal-1",
    accountStatus: "ACTIVE" as const,
    roles: ["PARTICIPANT"] as const,
    capability: "VIEW_OWN_ACTIVITY" as const,
    resource: { ownerId: "principal-1", scopeId: "curriculum-1" },
    scopes: ["curriculum-1"] as const,
    ...overrides,
  });

  it("kills operator-swap mutants on the ownership conjunction", () => {
    // Mutant: hasRole && ownsResource || hasScope (precedence/operator swap).
    expect(
      canAccess(
        scoped({
          roles: ["MODERATOR"] as const,
          capability: "VIEW_OWN_ACTIVITY" as const,
        }),
      ),
    ).toBe(false);
    expect(
      canAccess(
        scoped({
          resource: { ownerId: "other", scopeId: "curriculum-1" },
        }),
      ),
    ).toBe(false);
  });

  it("kills case-fallthrough mutants between staff-gated arms", () => {
    const clinical = {
      principalId: "clinico-1",
      accountStatus: "ACTIVE" as const,
      roles: ["CLINICAL_APPROVER"] as const,
      approvedClinicalApproverId: "clinico-1",
      resource: { scopeId: "curriculum-1" },
      scopes: ["curriculum-1"] as const,
    };
    // TRANSITION allows scoped staff; METADATA does not allow bare clinical.
    expect(
      canAccess({ ...clinical, capability: "TRANSITION_FEEDBACK_TICKET" }),
    ).toBe(true);
    expect(
      canAccess({ ...clinical, capability: "MANAGE_FEEDBACK_METADATA" }),
    ).toBe(false);
  });

  it("kills case-fallthrough mutants on author-gated arms", () => {
    const author = {
      principalId: "author-1",
      accountStatus: "ACTIVE" as const,
      roles: ["AUTHOR"] as const,
      resource: { scopeId: "curriculum-1" },
      scopes: ["curriculum-1"] as const,
    };
    expect(canAccess({ ...author, capability: "AUTHOR_CONTENT" })).toBe(true);
    expect(canAccess({ ...author, capability: "VIEW_INTERNAL_SOURCE" })).toBe(
      true,
    );
    // Mutant && between AUTHOR and clinical identity must not hold:
    // AUTHOR alone (no clinical identity) still reads internal source.
    expect(canAccess({ ...author, capability: "VIEW_PROGRAM_METRICS" })).toBe(
      false,
    );
  });

  it("kills optional-chaining removal on resource guards (no throw, deny closed)", () => {
    expect(
      canAccess(
        scoped({ resource: undefined, capability: "VIEW_OWN_ACTIVITY" }),
      ),
    ).toBe(false);
    expect(
      canAccess(
        scoped({
          resource: undefined,
          capability: "MANAGE_LEARNING_ASSIGNMENTS",
          roles: ["MODERATOR"] as const,
        }),
      ),
    ).toBe(false);
  });

  it("kills guard-forcing mutants on the entry condition", () => {
    expect(
      canAccess(
        scoped({ accountStatus: "SUSPENDED" as const, resource: undefined }),
      ),
    ).toBe(false);
    expect(canAccess(scoped())).toBe(true);
  });
});
