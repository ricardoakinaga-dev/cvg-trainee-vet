const FORBIDDEN_PUBLIC_FIELDS = new Set([
  "source_record_id",
  "source_id",
  "source",
  "work",
  "author",
  "edition",
  "chapter",
  "page",
  "pdf",
  "ocr",
  "photo",
  "figure",
  "table",
  "bibliography",
  "prompt",
  "ai_response",
  "answer_key",
  "rubric_internal",
]);

export const PUBLIC_FORBIDDEN_FIELDS = [...FORBIDDEN_PUBLIC_FIELDS] as const;

export function assertPublicProjection(value: unknown): void {
  const violations = new Set<string>();

  function visit(candidate: unknown): void {
    if (Array.isArray(candidate)) {
      candidate.forEach(visit);
      return;
    }

    if (candidate === null || typeof candidate !== "object") return;

    for (const [key, nested] of Object.entries(candidate)) {
      if (FORBIDDEN_PUBLIC_FIELDS.has(key.toLowerCase())) violations.add(key);
      visit(nested);
    }
  }

  visit(value);

  if (violations.size > 0) {
    throw new Error(
      `Public projection contains internal fields: ${[...violations].sort().join(", ")}`,
    );
  }
}
