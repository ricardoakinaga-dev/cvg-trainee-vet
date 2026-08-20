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

  it("allows only active scoped staff to read the moderator dashboard", () => {
    expect(
      canAccess(
        participant({
          principalId: "moderator-1",
          roles: ["MODERATOR"],
          capability: "VIEW_MODERATOR_DASHBOARD",
          resource: { scopeId: "curriculum-1" },
          scopes: ["curriculum-1"],
        }),
      ),
    ).toBe(true);
    expect(
      canAccess(
        participant({
          roles: ["PARTICIPANT"],
          capability: "VIEW_MODERATOR_DASHBOARD",
          resource: { scopeId: "curriculum-1" },
          scopes: ["curriculum-1"],
        }),
      ),
    ).toBe(false);
  });

  it("keeps the admin dashboard capability exclusive to administrators", () => {
    expect(
      canAccess(
        participant({
          principalId: "admin-1",
          roles: ["ADMIN"],
          capability: "VIEW_ADMIN_DASHBOARD",
          scopes: [],
        }),
      ),
    ).toBe(true);
    expect(canAccess(participant({ capability: "VIEW_ADMIN_DASHBOARD" }))).toBe(
      false,
    );
  });

  it("allows scoped authors to request publication while keeping the clinical gate", () => {
    const request = participant({
      principalId: "author-account",
      roles: ["AUTHOR"],
      capability: "PUBLISH_CONTENT",
      resource: { scopeId: "curriculum-1" },
      scopes: ["curriculum-1"],
    });

    expect(canAccess(request)).toBe(true);
    expect(
      canAccess({
        ...request,
        scopes: [],
      }),
    ).toBe(false);
  });

  it("covers staff alternatives for publication, internal source, and audit", () => {
    const scoped = {
      accountStatus: "ACTIVE" as const,
      resource: { scopeId: "curriculum-1" },
      scopes: ["curriculum-1"],
    };

    expect(
      canAccess({
        principalId: "moderator-1",
        roles: ["MODERATOR"],
        capability: "PUBLISH_CONTENT",
        ...scoped,
      }),
    ).toBe(true);
    expect(
      canAccess({
        principalId: "admin-1",
        roles: ["ADMIN"],
        capability: "PUBLISH_CONTENT",
        ...scoped,
      }),
    ).toBe(true);
    expect(
      canAccess({
        principalId: "viewer-1",
        roles: [],
        capability: "PUBLISH_CONTENT",
        ...scoped,
      }),
    ).toBe(false);
    expect(
      canAccess({
        principalId: "author-1",
        roles: ["AUTHOR"],
        capability: "VIEW_INTERNAL_SOURCE",
        ...scoped,
      }),
    ).toBe(true);
    expect(
      canAccess({
        principalId: "approver-1",
        roles: ["CLINICAL_APPROVER"],
        approvedClinicalApproverId: "approver-1",
        capability: "VIEW_INTERNAL_SOURCE",
        ...scoped,
      }),
    ).toBe(true);
    expect(
      canAccess({
        principalId: "approver-1",
        roles: ["CLINICAL_APPROVER"],
        approvedClinicalApproverId: "other-approver",
        capability: "VIEW_INTERNAL_SOURCE",
        ...scoped,
      }),
    ).toBe(false);
    expect(
      canAccess({
        principalId: "admin-1",
        accountStatus: "ACTIVE",
        roles: ["ADMIN"],
        capability: "VIEW_INTERNAL_AUDIT",
        scopes: [],
      }),
    ).toBe(true);
  });

  it("allows an active clinical approver to submit a scoped review decision", () => {
    expect(
      canAccess({
        principalId: "clinical-approver-1",
        accountStatus: "ACTIVE",
        roles: ["CLINICAL_APPROVER"],
        capability: "MODERATE_CONTENT",
        resource: { scopeId: "curriculum-1" },
        scopes: ["curriculum-1"],
        approvedClinicalApproverId: "clinical-approver-1",
      }),
    ).toBe(true);
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
    expect(
      canAccess({
        principalId: "clinical-approver-1",
        accountStatus: "ACTIVE",
        roles: ["CLINICAL_APPROVER"],
        capability: "VIEW_CLINICAL_REVIEW_QUEUE",
        resource: { scopeId: "curriculum-1" },
        scopes: ["curriculum-1"],
        approvedClinicalApproverId: "clinical-approver-1",
      }),
    ).toBe(true);
    expect(
      canAccess(
        participant({
          capability: "VIEW_CLINICAL_REVIEW_QUEUE",
          resource: { scopeId: "curriculum-1" },
        }),
      ),
    ).toBe(false);
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

  it("allows feedback reads for the owner or scoped staff only", () => {
    expect(
      canAccess(
        participant({
          capability: "VIEW_FEEDBACK_TICKETS",
          resource: { ownerId: "participant-1", scopeId: "curriculum-1" },
        }),
      ),
    ).toBe(true);
    expect(
      canAccess(
        participant({
          capability: "VIEW_FEEDBACK_TICKETS",
          resource: { ownerId: "participant-2", scopeId: "curriculum-1" },
        }),
      ),
    ).toBe(false);
    expect(
      canAccess({
        principalId: "moderator-1",
        accountStatus: "ACTIVE",
        roles: ["MODERATOR"],
        capability: "VIEW_FEEDBACK_TICKETS",
        resource: { scopeId: "curriculum-1" },
        scopes: ["curriculum-1"],
      }),
    ).toBe(true);
    expect(
      canAccess({
        principalId: "moderator-1",
        accountStatus: "ACTIVE",
        roles: ["MODERATOR"],
        capability: "VIEW_FEEDBACK_TICKETS",
        resource: { scopeId: "other-scope" },
        scopes: ["curriculum-1"],
      }),
    ).toBe(false);
  });
});
