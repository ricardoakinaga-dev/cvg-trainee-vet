import { describe, expect, it } from "vitest";
import type { Role } from "./authorization.js";
import {
  isSessionWithinExpiryPolicy,
  SESSION_ABSOLUTE_LIFETIME_SECONDS,
} from "./session-expiry-policy.js";

const createdAt = new Date("2026-09-01T00:00:00.000Z");
const ms = (offset: number) => new Date(createdAt.getTime() + offset);
const hour = 60 * 60 * 1_000;
const proof = {
  roles: ["PARTICIPANT"] as readonly Role[],
  createdAt,
  lastSeenAt: createdAt,
  expiresAt: ms(12 * hour),
  revokedAt: null,
};

describe("D-091 session expiry policy", () => {
  it.each([
    { roles: ["ADMIN"], idle: 30 * 60 * 1_000 },
    { roles: ["MODERATOR"], idle: 30 * 60 * 1_000 },
    { roles: ["PARTICIPANT"], idle: 8 * hour },
    { roles: ["AUTHOR", "MODERATOR", "PARTICIPANT"], idle: 30 * 60 * 1_000 },
    { roles: ["AUDITOR", "PARTICIPANT", "ADMIN"], idle: 30 * 60 * 1_000 },
    { roles: ["CLINICAL_APPROVER", "PARTICIPANT"], idle: 8 * hour },
  ] satisfies readonly { roles: Role[]; idle: number }[])(
    "uses the shortest approved base-role cutoff: $roles",
    ({ roles, idle }) => {
      expect(
        isSessionWithinExpiryPolicy({ ...proof, roles }, ms(idle - 1)),
      ).toBe(true);
      expect(isSessionWithinExpiryPolicy({ ...proof, roles }, ms(idle))).toBe(
        false,
      );
      expect(
        isSessionWithinExpiryPolicy({ ...proof, roles }, ms(idle + 1)),
      ).toBe(false);
    },
  );

  it.each(
    (
      [
        [],
        ["AUTHOR"],
        ["AUDITOR"],
        ["CLINICAL_APPROVER"],
        ["AUTHOR", "AUDITOR", "CLINICAL_APPROVER"],
      ] satisfies readonly Role[][]
    ).map((roles) => ({ roles })),
  )("does not invent a base role for $roles", ({ roles }) => {
    expect(isSessionWithinExpiryPolicy({ ...proof, roles }, createdAt)).toBe(
      false,
    );
  });

  it("expires at twelve hours even after recent activity and with a legacy seven-day expiry", () => {
    expect(SESSION_ABSOLUTE_LIFETIME_SECONDS).toBe(43_200);
    const active = {
      ...proof,
      expiresAt: ms(7 * 24 * hour),
      lastSeenAt: ms(12 * hour - 2),
    };
    expect(isSessionWithinExpiryPolicy(active, ms(12 * hour - 1))).toBe(true);
    expect(isSessionWithinExpiryPolicy(active, ms(12 * hour))).toBe(false);
    expect(isSessionWithinExpiryPolicy(active, ms(12 * hour + 1))).toBe(false);
  });

  it("honors a shorter persisted expiration, including exact equality", () => {
    const short = { ...proof, expiresAt: ms(60_000) };
    expect(isSessionWithinExpiryPolicy(short, ms(59_999))).toBe(true);
    expect(isSessionWithinExpiryPolicy(short, ms(60_000))).toBe(false);
    expect(isSessionWithinExpiryPolicy(short, ms(60_001))).toBe(false);
  });

  it.each(["createdAt", "lastSeenAt", "expiresAt"] as const)(
    "denies malformed or missing %s",
    (field) => {
      for (const invalid of [
        new Date("invalid"),
        undefined,
        null,
        "2026-09-01T00:00:00.000Z",
        0,
      ]) {
        expect(
          isSessionWithinExpiryPolicy(
            { ...proof, [field]: invalid },
            createdAt,
          ),
        ).toBe(false);
      }
    },
  );

  it("denies future and inconsistent timestamps and invalid clocks", () => {
    expect(isSessionWithinExpiryPolicy(proof, new Date("invalid"))).toBe(false);
    expect(isSessionWithinExpiryPolicy(proof, ms(-1))).toBe(false);
    expect(
      isSessionWithinExpiryPolicy({ ...proof, lastSeenAt: ms(1) }, createdAt),
    ).toBe(false);
    expect(
      isSessionWithinExpiryPolicy({ ...proof, lastSeenAt: ms(-1) }, createdAt),
    ).toBe(false);
    expect(
      isSessionWithinExpiryPolicy(
        { ...proof, expiresAt: createdAt },
        createdAt,
      ),
    ).toBe(false);
    expect(
      isSessionWithinExpiryPolicy({ ...proof, expiresAt: ms(-1) }, createdAt),
    ).toBe(false);
  });

  it.each([createdAt, ms(1), new Date("invalid"), undefined, "revoked"])(
    "denies any non-null revocation proof: %s",
    (revokedAt) => {
      expect(
        isSessionWithinExpiryPolicy({ ...proof, revokedAt }, createdAt),
      ).toBe(false);
    },
  );
});
