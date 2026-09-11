import { describe, expect, it, vi } from "vitest";

import { getAuditTrail, type AuditTrailReadPort } from "./index.js";

/**
 * AAA-FINAL-003 — Coverage margin hardening (audit trail query edges).
 *
 * Risco: paginação/filtro malformado vazar ou quebrar a trilha de
 * auditoria. Branches: limit default/inválido, from>to, cursor inválido,
 * TypeError de persistência, identidade clínica opcional.
 */
const scopeId = "11111111-1111-4111-8111-111111111111";
const principalId = "22222222-2222-4222-8222-222222222222";

const command = {
  principalId,
  accountStatus: "ACTIVE" as const,
  roles: ["AUDITOR"] as const,
  scopes: [scopeId] as const,
  query: { scopeId },
};

function port(overrides = {}) {
  return {
    listAuditTrail: vi.fn(async () => ({
      scopeId,
      items: [],
      hasNext: false,
      nextCursor: undefined as unknown as string,
    })),
    ...overrides,
  } satisfies AuditTrailReadPort;
}

describe("audit trail branch closure", () => {
  it("defaults the limit and rejects out-of-range values", async () => {
    const listing = port();
    await getAuditTrail(command, listing);
    expect(listing.listAuditTrail).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 50 }),
    );
    for (const limit of [0, 101, 1.5]) {
      await expect(
        getAuditTrail({ ...command, query: { scopeId, limit } }, port()),
      ).rejects.toMatchObject({ code: "validation_error" });
    }
  });

  it("rejects inverted ranges and malformed cursors", async () => {
    await expect(
      getAuditTrail(
        {
          ...command,
          query: {
            scopeId,
            from: "2026-09-11T12:00:00.000Z",
            to: "2026-09-10T12:00:00.000Z",
          },
        },
        port(),
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      getAuditTrail(
        { ...command, query: { scopeId, cursor: "not-a-cursor!!" } },
        port(),
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
  });

  it("maps persistence type errors to validation errors", async () => {
    await expect(
      getAuditTrail(command, {
        listAuditTrail: async () => {
          throw new TypeError("cannot read properties of null");
        },
      }),
    ).rejects.toMatchObject({ code: "validation_error" });
  });

  it("forwards the approved clinical identity when present", async () => {
    const listing = port();
    await getAuditTrail(
      {
        principalId: "ricardo-account",
        accountStatus: "ACTIVE",
        roles: ["CLINICAL_APPROVER"],
        scopes: [scopeId],
        approvedClinicalApproverId: "ricardo-account",
        query: { scopeId },
      },
      listing,
    );
    expect(listing.listAuditTrail).toHaveBeenCalled();
  });
});
