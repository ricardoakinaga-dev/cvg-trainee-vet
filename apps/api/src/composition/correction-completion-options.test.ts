import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CorrectionCompletionOptions } from "@cvg/persistence";

import { createApiCorrectionCompletionOptions } from "./correction-completion-options.js";

type ApprovalRequest = Parameters<
  NonNullable<CorrectionCompletionOptions["summativeApproval"]>
>[0];

describe("createApiCorrectionCompletionOptions", () => {
  it("provides a fail-closed production summative approval source", () => {
    const options = createApiCorrectionCompletionOptions();
    expect(typeof options.summativeApproval).toBe("function");

    const request: ApprovalRequest = {
      capture: {} as unknown as ApprovalRequest["capture"],
      obligations: [],
      now: new Date(),
    };
    expect(options.summativeApproval?.(request)).toBeNull();
  });

  it("wires the API correction completion options into createApiRuntime", () => {
    const mainSource = readFileSync(
      new URL("../main.ts", import.meta.url),
      "utf8",
    );

    expect(mainSource).toContain("createApiCorrectionCompletionOptions()");
  });
});
