import { describe, expect, it } from "vitest";

import { AnswerDomainError, createAnswer } from "./answer.js";

const identity = {
  answerId: "answer-1",
  attemptId: "attempt-1",
  itemId: "item-1",
  savedAt: "2026-08-09T17:00:00.000Z",
};

describe("answer domain", () => {
  it("creates a trimmed plain-text answer without mutating input", () => {
    const answer = createAnswer({ ...identity, response: "  texto  " });

    expect(answer).toEqual({ ...identity, response: "texto" });
    expect(Object.isFrozen(answer)).toBe(true);
  });

  it("rejects blank, oversized, HTML-like, and invalid timestamp responses", () => {
    expect(() => createAnswer({ ...identity, response: "   " })).toThrow(
      AnswerDomainError,
    );
    expect(() =>
      createAnswer({ ...identity, response: "x".repeat(10_001) }),
    ).toThrow("size");
    expect(() =>
      createAnswer({ ...identity, response: "<script>alert(1)</script>" }),
    ).toThrow("plain text");
    expect(() =>
      createAnswer({ ...identity, response: "valid", savedAt: "invalid" }),
    ).toThrow("timestamp");
    expect(() =>
      createAnswer({ ...identity, response: "valid", savedAt: "2026-08-10" }),
    ).toThrow("timestamp");
  });

  it("rejects incomplete answer identity", () => {
    expect(() => createAnswer({ ...identity, itemId: "" })).toThrow(
      AnswerDomainError,
    );
  });
});
