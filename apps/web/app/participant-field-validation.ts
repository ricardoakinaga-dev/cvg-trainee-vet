import { PublicApiError } from "./participant-contracts";

export type ParticipantValidationContext =
  "access" | "answer" | "feedback" | "appeal" | "operation";
export function participantPublicError(
  error: unknown,
  context: ParticipantValidationContext = "operation",
): string {
  if (error instanceof PublicApiError && error.code === "validation_error") {
    const messages: Readonly<Record<ParticipantValidationContext, string>> = {
      access: "Revise o token informado e tente novamente.",
      answer: "Revise a resposta deste item e tente salvar novamente.",
      feedback: "Revise a descrição do relato e tente novamente.",
      appeal: "Revise a justificativa e o item da contestação.",
      operation: "Revise os dados desta operação e tente novamente.",
    };
    return messages[context];
  }
  if (
    context === "access" &&
    error instanceof PublicApiError &&
    error.code === "not_found"
  )
    return "O convite não está disponível. Verifique o link interno.";
  if (error instanceof PublicApiError && error.code === "request_timeout")
    return "A operação demorou mais que o esperado. Tente novamente sem alterar os dados.";
  return "Não foi possível concluir a operação. Tente novamente.";
}

export function focusParticipantField(id: string): void {
  // Save buttons are disabled while awaiting the response; focus after React re-enables fields.
  requestAnimationFrame(() => document.getElementById(id)?.focus());
}
