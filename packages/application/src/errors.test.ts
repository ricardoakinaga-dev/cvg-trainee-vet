import { describe, expect, it } from "vitest";

import { ApplicationError, toApplicationError } from "./errors.js";

describe("application errors", () => {
  it("keeps stable public codes and statuses", () => {
    const error = new ApplicationError("forbidden", "Scope denied");

    expect(error.code).toBe("forbidden");
    expect(error.status).toBe(403);
    expect(error.message).toBe("Scope denied");
  });

  it("does not expose unknown infrastructure errors as public details", () => {
    const error = toApplicationError(new Error("SQL password=secret"));

    expect(error.code).toBe("internal_error");
    expect(error.status).toBe(500);
    expect(error.message).toBe("Unexpected application failure");
    expect(error.message).not.toContain("secret");
  });
});
