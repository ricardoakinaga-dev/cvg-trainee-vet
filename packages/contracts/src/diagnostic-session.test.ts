import { describe, expect, it } from "vitest";

import {
  diagnosticSessionAnswerRequestSchema,
  diagnosticSessionFinalizeRequestSchema,
  diagnosticSessionProjectionSchema,
  diagnosticSessionResultProjectionSchema,
  diagnosticSessionStartRequestSchema,
  parseDiagnosticSessionProjection,
} from "./diagnostic-session.js";

const item = {
  itemId: "10000000-0000-4000-8000-000000000001",
  ordinal: 1,
  title: "B-07 — decisão segura 001",
  text: "Em um caso fictício, qual resposta organiza melhor o risco?",
  responseMode: "CHOICE" as const,
  choices: [
    { id: "a", label: "A", text: "Organizar dados e declarar reavaliação" },
    { id: "b", label: "B", text: "Adiar toda decisão sem plano" },
  ],
  selectionMode: "SINGLE" as const,
};

const items = Array.from({ length: 120 }, (_, index) => ({
  ...item,
  itemId: `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  ordinal: index + 1,
}));

const projection = {
  sessionId: "11111111-1111-4111-8111-111111111111",
  diagnosticId: "B07-DIAGNOSTIC-V1" as const,
  diagnosticVersion: "0.1.0" as const,
  version: 0,
  status: "EM_ANDAMENTO" as const,
  startedAt: "2026-08-26T14:00:00.000Z",
  itemCount: 120,
  answeredItemCount: 0,
  currentOrdinal: 1,
  items,
  answers: [],
};

function theme(
  themeId: "B07-S1" | "B07-S2" | "B07-S3",
  scorePercent: number | null,
) {
  return {
    themeId,
    themeLabel: `Tema ${themeId}`,
    status:
      scorePercent === null ? "SEM_EVIDENCIA_DIGITAL" : "BASELINE_REGISTRADA",
    scorePercent,
    answeredItemCount: scorePercent === null ? 0 : 1,
    itemCount: 40,
    lastEvaluatedAt:
      scorePercent === null ? undefined : "2026-08-26T14:05:00.000Z",
    evidence: "DIAGNOSTICO_FORMATIVO_DIGITAL",
    notPunitive: true,
    noGlobalPassFail: true,
    practicalCompetenceClaim: "PROIBIDO_MVP",
  } as const;
}

describe("diagnostic session contracts", () => {
  it("accepts only server-owned start input", () => {
    expect(
      diagnosticSessionStartRequestSchema.parse({
        idempotencyKey: "diagnostic-start-2026-08-26-0001",
      }),
    ).toEqual({
      idempotencyKey: "diagnostic-start-2026-08-26-0001",
    });

    expect(() =>
      diagnosticSessionStartRequestSchema.parse({
        idempotencyKey: "diagnostic-start-2026-08-26-0001",
        participantId: "11111111-1111-4111-8111-111111111111",
        scopeId: "22222222-2222-4222-8222-222222222222",
      }),
    ).toThrow();
  });

  it("bounds checkpoint input and permits clearing a saved answer", () => {
    expect(
      diagnosticSessionAnswerRequestSchema.parse({
        version: 4,
        selectedChoiceIds: [],
        idempotencyKey: "diagnostic-answer-2026-08-26-0004",
      }),
    ).toMatchObject({ version: 4, selectedChoiceIds: [] });

    expect(() =>
      diagnosticSessionAnswerRequestSchema.parse({
        version: 4,
        selectedChoiceIds: ["a"],
        idempotencyKey: "short",
        moduleIds: ["M01"],
      }),
    ).toThrow();
  });

  it("requires the observed version to finalize", () => {
    expect(
      diagnosticSessionFinalizeRequestSchema.parse({
        version: 7,
        idempotencyKey: "diagnostic-finalize-2026-08-26-0007",
      }),
    ).toEqual({
      version: 7,
      idempotencyKey: "diagnostic-finalize-2026-08-26-0007",
    });
  });

  it("parses a redacted public session and rejects internal fields", () => {
    expect(parseDiagnosticSessionProjection(projection)).toEqual(projection);
    expect(() =>
      diagnosticSessionProjectionSchema.parse({
        ...projection,
        items: [{ ...item, prompt: "internal" }],
      }),
    ).toThrow();
    expect(() =>
      diagnosticSessionProjectionSchema.parse({
        ...projection,
        answer_key: ["a"],
      }),
    ).toThrow();
  });

  it("covers the validation branches for replay keys, answers and finalization", () => {
    const firstItem = items[0];
    if (firstItem === undefined) throw new Error("synthetic item is missing");

    expect(() =>
      diagnosticSessionStartRequestSchema.parse({
        idempotencyKey: "invalid key with spaces",
      }),
    ).toThrow();
    expect(() =>
      diagnosticSessionAnswerRequestSchema.parse({
        version: 0,
        selectedChoiceIds: ["a", "a"],
        idempotencyKey: "diagnostic-answer-2026-08-26-0002",
      }),
    ).toThrow();

    expect(() =>
      diagnosticSessionProjectionSchema.parse({
        ...projection,
        answeredItemCount: 1,
        answers: [{ itemId: firstItem.itemId, selectedChoiceIds: ["unknown"] }],
      }),
    ).toThrow();
    expect(() =>
      diagnosticSessionProjectionSchema.parse({
        ...projection,
        answeredItemCount: 2,
        answers: [
          { itemId: firstItem.itemId, selectedChoiceIds: ["a"] },
          { itemId: firstItem.itemId, selectedChoiceIds: ["a"] },
        ],
      }),
    ).toThrow();
    expect(() =>
      diagnosticSessionProjectionSchema.parse({
        ...projection,
        answeredItemCount: 1,
        answers: [
          {
            itemId: firstItem.itemId,
            selectedChoiceIds: ["a", "b"],
          },
        ],
      }),
    ).toThrow();
    expect(() =>
      diagnosticSessionProjectionSchema.parse({
        ...projection,
        items: [
          {
            ...firstItem,
            choices: [...firstItem.choices, { ...firstItem.choices[0] }],
          },
          ...items.slice(1),
        ],
      }),
    ).toThrow();

    const result = {
      completedAt: "2026-08-26T14:05:00.000Z",
      themes: [
        theme("B07-S1", 100),
        theme("B07-S2", null),
        theme("B07-S3", null),
      ],
    };
    expect(diagnosticSessionResultProjectionSchema.parse(result)).toEqual(
      result,
    );
    expect(() =>
      diagnosticSessionResultProjectionSchema.parse({
        ...result,
        themes: [
          theme("B07-S1", 100),
          theme("B07-S1", null),
          theme("B07-S3", null),
        ],
      }),
    ).toThrow();
    expect(() =>
      diagnosticSessionProjectionSchema.parse({
        ...projection,
        status: "FINALIZADA",
        currentOrdinal: 1,
        finalizedAt: result.completedAt,
      }),
    ).toThrow();
    expect(() =>
      diagnosticSessionProjectionSchema.parse({
        ...projection,
        finalizedAt: result.completedAt,
      }),
    ).toThrow();
    expect(
      parseDiagnosticSessionProjection({
        ...projection,
        status: "FINALIZADA",
        currentOrdinal: null,
        finalizedAt: result.completedAt,
        result,
        nextAction: "CONTINUAR_TRILHA",
      }),
    ).toMatchObject({ status: "FINALIZADA", result });
  });
});
