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
