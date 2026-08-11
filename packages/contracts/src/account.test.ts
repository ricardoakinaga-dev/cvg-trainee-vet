import { describe, expect, it } from "vitest";

import {
  accountVerificationRequestSchema,
  accountActionRequestSchema,
} from "./account.js";

describe("account security contracts", () => {
  it("accepts bounded verification input without normalizing the code", () => {
    expect(
      accountVerificationRequestSchema.parse({
        operationId: "mfa-operation",
        verificationCode: " 123456 ",
      }),
    ).toEqual({
      operationId: "mfa-operation",
      verificationCode: " 123456 ",
    });
  });

  it("rejects empty, control-character and oversized verification values", () => {
    for (const verificationCode of ["", "\n", "x".repeat(257)]) {
      expect(() =>
        accountVerificationRequestSchema.parse({
          operationId: "operation",
          verificationCode,
        }),
      ).toThrow();
    }
    expect(() =>
      accountVerificationRequestSchema.parse({
        operationId: " ",
        verificationCode: "123456",
      }),
    ).toThrow();
  });

  it("keeps start-operation payloads empty and strict", () => {
    expect(accountActionRequestSchema.parse({})).toEqual({});
    expect(() =>
      accountActionRequestSchema.parse({ code: "123456" }),
    ).toThrow();
  });
});
