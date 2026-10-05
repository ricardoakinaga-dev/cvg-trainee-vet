import { expect, it } from "vitest";
import { PublicApiError } from "./participant-contracts";
import { participantPublicError } from "./participant-field-validation";
it("uses an allowlisted answer message instead of token or server details", () => {
  const error = new PublicApiError(
    "validation_error",
    "private synthetic answer key",
  );
  expect(participantPublicError(error, "answer")).toBe(
    "Revise a resposta deste item e tente salvar novamente.",
  );
  expect(participantPublicError(error, "access")).toContain("token");
  for (const context of [
    "answer",
    "feedback",
    "appeal",
    "operation",
  ] as const) {
    expect(participantPublicError(error, context)).not.toContain("token");
    expect(participantPublicError(error, context)).not.toContain(error.message);
  }
});
it("keeps not-found invitation guidance confined to access and timeout recoverable", () => {
  const error = new PublicApiError("not_found", "private synthetic detail");
  expect(participantPublicError(error, "answer")).not.toContain("convite");
  expect(participantPublicError(error, "access")).toContain("convite");
  expect(
    participantPublicError(
      new PublicApiError("request_timeout", "private"),
      "answer",
    ),
  ).toContain("sem alterar os dados");
  expect(participantPublicError(new Error("private"))).not.toContain("private");
});
