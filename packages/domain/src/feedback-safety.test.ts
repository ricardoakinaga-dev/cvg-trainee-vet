import { describe, expect, it } from "vitest";

import {
  inspectFeedbackContent,
  redactFeedbackContent,
} from "./feedback-safety.js";

describe("feedback content safety", () => {
  it("accepts bounded plain text without protected data markers", () => {
    const inspection = inspectFeedbackContent(
      "O botão de avanço não respondeu no fluxo sintético.",
    );

    expect(inspection.safe).toBe(true);
    expect(inspection.reasons).toEqual([]);
    expect(inspection.redacted).toBe(
      "O botão de avanço não respondeu no fluxo sintético.",
    );
  });

  it("detects records, sensitive URL parameters, contacts, and media attempts", () => {
    const suspicious = [
      "prontuário: sintético-001",
      "https://example.invalid/report?token=synthetic-token",
      "tutor: synthetic@example.invalid",
      "gravação de tela: data:video/mp4;base64,synthetic",
    ];

    for (const value of suspicious) {
      const inspection = inspectFeedbackContent(value);
      expect(inspection.safe).toBe(false);
      expect(inspection.reasons.length).toBeGreaterThan(0);
      expect(inspection.redacted).toBe("[CONTEUDO_REDACTED]");
    }
  });

  it("redacts oversized or suspicious legacy content without returning its value", () => {
    expect(redactFeedbackContent("x".repeat(2_001))).toBe(
      "[CONTEUDO_REDACTED]",
    );
    expect(redactFeedbackContent("patientId: synthetic-id")).toBe(
      "[CONTEUDO_REDACTED]",
    );
  });
});
