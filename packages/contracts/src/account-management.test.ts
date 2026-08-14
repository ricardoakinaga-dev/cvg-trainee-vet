import { describe, expect, it } from "vitest";

import {
  accountManagementListQuerySchema,
  accountManagementUpdateRequestSchema,
  managedAccountPageProjectionSchema,
} from "./account-management.js";

describe("account management contracts", () => {
  it("accepts bounded list and update inputs", () => {
    expect(
      accountManagementListQuerySchema.parse({
        limit: "50",
        status: "ACTIVE",
        scopeId: "scope-a",
      }),
    ).toEqual({ limit: 50, status: "ACTIVE", scopeId: "scope-a" });
    expect(
      accountManagementUpdateRequestSchema.parse({
        expectedVersion: 0,
        status: "SUSPENDED",
        roles: ["PARTICIPANT"],
        scopes: ["scope-a"],
      }),
    ).toEqual({
      expectedVersion: 0,
      status: "SUSPENDED",
      roles: ["PARTICIPANT"],
      scopes: ["scope-a"],
    });
  });

  it("rejects empty updates and internal credential fields", () => {
    expect(() => accountManagementUpdateRequestSchema.parse({})).toThrow();
    expect(() =>
      accountManagementUpdateRequestSchema.parse({ passwordHash: "secret" }),
    ).toThrow();
    expect(() =>
      accountManagementListQuerySchema.parse({ limit: "201" }),
    ).toThrow();
    expect(() =>
      accountManagementListQuerySchema.parse({ scopeId: "\u0001" }),
    ).toThrow();
    expect(() =>
      accountManagementUpdateRequestSchema.parse({
        expectedVersion: 0,
        roles: ["PARTICIPANT"],
      }),
    ).not.toThrow();
    expect(() =>
      accountManagementUpdateRequestSchema.parse({
        expectedVersion: 0,
        scopes: ["scope-a"],
      }),
    ).not.toThrow();
  });

  it("keeps the page projection allowlisted", () => {
    const page = managedAccountPageProjectionSchema.parse({
      accounts: [
        {
          accountId: "11111111-1111-4111-8111-111111111111",
          professionalEmail: "trainee@example.test",
          accountStatus: "ACTIVE",
          roles: ["PARTICIPANT"],
          scopes: ["scope-a"],
          version: 2,
          createdAt: "2026-08-11T20:00:00.000Z",
          updatedAt: "2026-08-11T21:00:00.000Z",
        },
      ],
      nextCursor: null,
    });
    expect(JSON.stringify(page)).not.toContain("passwordHash");
    expect(JSON.stringify(page)).not.toContain("tokenHash");
  });
});
