export type FeedbackSafetyReason =
  | "HTML_OR_SCRIPT"
  | "CONTACT_IDENTIFIER"
  | "SENSITIVE_URL_PARAMETER"
  | "PROHIBITED_RECORD_MARKER"
  | "MEDIA_OR_ATTACHMENT"
  | "OVERSIZED";

export type FeedbackContentInspection = Readonly<{
  readonly safe: boolean;
  readonly reasons: readonly FeedbackSafetyReason[];
  readonly redacted: string;
}>;

const maxFeedbackTextLength = 2_000;

const safetyPatterns: readonly Readonly<{
  readonly reason: FeedbackSafetyReason;
  readonly pattern: RegExp;
}>[] = [
  { reason: "HTML_OR_SCRIPT", pattern: /<[^>]*>/u },
  {
    reason: "SENSITIVE_URL_PARAMETER",
    pattern:
      /https?:\/\/[^\s]+[?&](?:token|secret|password|senha|api[_-]?key|authorization|session(?:[_-]?id)?|access[_-]?token|refresh[_-]?token)\s*=/iu,
  },
  {
    reason: "CONTACT_IDENTIFIER",
    pattern: /\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/u,
  },
  {
    reason: "PROHIBITED_RECORD_MARKER",
    pattern:
      /(?:^|[\s,{])(?:patient(?:[_-]?id)?|paciente(?:[_-]?id)?|tutor(?:[_-]?id)?|prontu[áa]rio(?:[_-]?id)?|cpf|crmv|telefone|phone|email|e-mail|senha|password|secret|token|api[_-]?key|authorization|session(?:[_-]?id)?|access[_-]?token|refresh[_-]?token)\s*[:=]/iu,
  },
  {
    reason: "PROHIBITED_RECORD_MARKER",
    pattern:
      /\b(?:prontu[áa]rio|dados\s+do\s+(?:paciente|tutor)|caso\s+real\s+identific[áa]vel|prescri[çc][ãa]o\s*[:=]|exame\s+(?:do|da)\s+(?:paciente|animal))\b/iu,
  },
  {
    reason: "MEDIA_OR_ATTACHMENT",
    pattern:
      /(?:data:(?:audio|video|image)|blob:|(?:anexo|anexei|arquivo|upload|foto|imagem|áudio|audio|vídeo|video)\s*[:=]|grava[çc][ãa]o\s+de\s+tela|screen[_\s-]?record(?:ing)?)/iu,
  },
  {
    reason: "PROHIBITED_RECORD_MARKER",
    pattern: /\b(?:answer|response|resposta)\s*[:=]/iu,
  },
];

function freeze<T>(value: T): Readonly<T> {
  return Object.freeze(value);
}

export function inspectFeedbackContent(
  value: unknown,
): FeedbackContentInspection {
  if (typeof value !== "string") {
    return freeze({
      safe: false,
      reasons: freeze(["PROHIBITED_RECORD_MARKER"] as const),
      redacted: "[CONTEUDO_REDACTED]",
    });
  }

  const reasons = safetyPatterns
    .filter(({ pattern }) => pattern.test(value))
    .map(({ reason }) => reason);
  if (value.length > maxFeedbackTextLength) reasons.push("OVERSIZED");

  const uniqueReasons = freeze([...new Set(reasons)]);
  return freeze({
    safe: uniqueReasons.length === 0,
    reasons: uniqueReasons,
    redacted: uniqueReasons.length === 0 ? value : "[CONTEUDO_REDACTED]",
  });
}

export function redactFeedbackContent(value: string): string {
  return inspectFeedbackContent(value).redacted;
}

export const FEEDBACK_TEXT_MAX_LENGTH = maxFeedbackTextLength;
