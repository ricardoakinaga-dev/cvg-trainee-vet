import { describe, expect, it } from "vitest";
import { saveAnswerRequestSchema } from "./assessment.js";

import {
  parseParticipantCurriculumRuntime,
  curriculumRuntimeEvaluationRequestSchema,
  parseParticipantActivity,
  participantActivityProjectionSchema,
} from "./learning.js";

const projection = {
  activityId: "11111111-1111-4111-8111-111111111111",
  slug: "emergencia-v1",
  title: "Emergência",
  items: [
    {
      itemId: "22222222-2222-4222-8222-222222222222",
      ordinal: 1,
      kind: "LEITURA",
      title: "Prioridades iniciais",
      text: "Conteúdo autoral interno para treinamento.",
      responseMode: "TEXT",
    },
  ],
} as const;

describe("participant activity contract", () => {
  it("R17 rejects duplicate public item identities even with distinct ordinals", () => {
    expect(
      participantActivityProjectionSchema.safeParse({
        ...projection,
        items: [projection.items[0], { ...projection.items[0], ordinal: 2 }],
      }).success,
    ).toBe(false);
  });
  it("R17 rejects choices whose IDs alias after canonical normalization", () => {
    expect(
      participantActivityProjectionSchema.safeParse({
        ...projection,
        items: [
          {
            ...projection.items[0],
            kind: "QUESTAO",
            responseMode: "CHOICE",
            selectionMode: "SINGLE",
            choices: [
              { id: "a", label: "A", text: "First technical option" },
              { id: " a ", label: "B", text: "Second technical option" },
            ],
          },
        ],
      }).success,
    ).toBe(false);
  });
  it.each([
    ["<", ">"],
    [">", "<"],
  ])(
    "rejects MULTIPLE alternatives %j when an offered ordering violates the canonical response contract",
    (first, second) => {
      const invalid = {
        ...projection,
        items: [
          {
            ...projection.items[0],
            kind: "QUESTAO",
            responseMode: "CHOICE",
            selectionMode: "MULTIPLE",
            choices: [
              { id: first, label: "A", text: "Technical A" },
              { id: second, label: "B", text: "Technical B" },
            ],
          },
        ],
      };
      expect(() => parseParticipantActivity(invalid)).toThrow();
    },
  );
  it.each(["SINGLE", "MULTIPLE"] as const)(
    "preserves valid %s alternatives containing individual angle characters",
    (selectionMode) => {
      const ids =
        selectionMode === "SINGLE" ? ["<", ">"] : ["a>b", "plain-key"];
      const valid = {
        ...projection,
        items: [
          {
            ...projection.items[0],
            kind: "QUESTAO",
            responseMode: "CHOICE",
            selectionMode,
            choices: ids.map((id, index) => ({
              id,
              label: String(index),
              text: "Technical choice",
            })),
          },
        ],
      };
      expect(() => parseParticipantActivity(valid)).not.toThrow();
      const responses =
        selectionMode === "SINGLE"
          ? ids
          : [JSON.stringify(ids), JSON.stringify([...ids].reverse())];
      for (const response of responses)
        expect(
          saveAnswerRequestSchema.shape.response.safeParse(response).success,
        ).toBe(true);
    },
  );
  it.each(["SINGLE", "MULTIPLE"] as const)(
    "rejects %s public alternatives whose IDs the answer contract cannot encode",
    (selectionMode) => {
      const invalid = {
        ...projection,
        items: [
          {
            ...projection.items[0],
            kind: "QUESTAO",
            responseMode: "CHOICE",
            selectionMode,
            choices: [
              { id: "<id>", label: "A", text: "Technical A" },
              { id: "b", label: "B", text: "Technical B" },
            ],
          },
        ],
      };
      expect(() => parseParticipantActivity(invalid)).toThrow();
    },
  );
  it.each(["SINGLE", "MULTIPLE"] as const)(
    "every offered %s ID in the public control can be submitted through the canonical answer contract",
    (selectionMode) => {
      const choices = [
        { id: "a<b", label: "A", text: "Technical A" },
        { id: "plain-key", label: "B", text: "Technical B" },
      ];
      const valid = {
        ...projection,
        items: [
          {
            ...projection.items[0],
            kind: "QUESTAO",
            responseMode: "CHOICE",
            selectionMode,
            choices,
          },
        ],
      };
      expect(() => parseParticipantActivity(valid)).not.toThrow();
      for (const choice of choices) {
        expect(() =>
          saveAnswerRequestSchema.parse({
            attemptId: projection.activityId,
            activityId: projection.activityId,
            itemId: projection.items[0].itemId,
            response:
              selectionMode === "SINGLE"
                ? choice.id
                : JSON.stringify([choice.id]),
            idempotencyKey: "synthetic-answer-contract-key",
          }),
        ).not.toThrow();
      }
    },
  );
  it("accepts only the published projection shape", () => {
    expect(parseParticipantActivity(projection)).toEqual(projection);
    expect(participantActivityProjectionSchema.parse(projection)).toEqual(
      projection,
    );
  });

  it("rejects internal authorship fields and invalid item order", () => {
    expect(() =>
      parseParticipantActivity({
        ...projection,
        source_record_id: "internal",
      }),
    ).toThrow();
    expect(() =>
      parseParticipantActivity({
        ...projection,
        items: [{ ...projection.items[0], ordinal: 0 }],
      }),
    ).toThrow();
    expect(() =>
      parseParticipantActivity({
        ...projection,
        items: [{ ...projection.items[0], text: "<b>unsafe</b>" }],
      }),
    ).toThrow();
  });

  it("requires public choices for choice-response items", () => {
    const choiceProjection = {
      ...projection,
      items: [
        {
          itemId: projection.items[0].itemId,
          ordinal: 1,
          kind: "QUESTAO",
          title: "Escolha",
          text: "Selecione uma opção.",
          responseMode: "CHOICE",
          selectionMode: "SINGLE",
          choices: [
            { id: "a", label: "A", text: "Primeira opção." },
            { id: "b", label: "B", text: "Segunda opção." },
          ],
        },
      ],
    } as const;

    expect(parseParticipantActivity(choiceProjection)).toEqual(
      choiceProjection,
    );
    expect(() =>
      parseParticipantActivity({
        ...choiceProjection,
        items: [{ ...choiceProjection.items[0], choices: undefined }],
      }),
    ).toThrow();
  });

  it("binds reflection answers to published reflection items", () => {
    const reflectionItem = {
      itemId: "33333333-3333-4333-8333-333333333333",
      ordinal: 1,
      kind: "REFLEXAO",
      title: "Próxima ação",
      text: "Descreva uma próxima ação sintética.",
      responseMode: "TEXT",
    } as const;
    const activityWithReflection = {
      ...projection,
      items: [reflectionItem],
      reflection: {
        status: "EM_ANDAMENTO",
        nextAction: "RETOMAR_REFLEXAO",
        itemCount: 1,
        answeredItemCount: 1,
        answers: [
          {
            itemId: reflectionItem.itemId,
            response: "Uma próxima ação própria.",
            savedAt: "2026-08-23T20:00:00.000Z",
          },
        ],
        evidence: "REFLEXAO_DIGITAL",
        practicalCompetenceClaim: "PROIBIDO_MVP",
      },
    } as const;

    expect(parseParticipantActivity(activityWithReflection)).toEqual(
      activityWithReflection,
    );
    expect(() =>
      parseParticipantActivity({
        ...activityWithReflection,
        reflection: {
          ...activityWithReflection.reflection,
          answers: [
            {
              ...activityWithReflection.reflection.answers[0],
              itemId: "44444444-4444-4444-8444-444444444444",
            },
          ],
        },
      }),
    ).toThrow();
  });

  it("validates internal evaluation input without changing the public state boundary", () => {
    const request = {
      participantId: "11111111-1111-4111-8111-111111111111",
      scopeId: "22222222-2222-4222-8222-222222222222",
      attemptId: "33333333-3333-4333-8333-333333333333",
      attemptVersion: 3,
      formVersion: 1,
    } as const;
    expect(curriculumRuntimeEvaluationRequestSchema.parse(request)).toEqual(
      request,
    );
    expect(() =>
      curriculumRuntimeEvaluationRequestSchema.parse({
        ...request,
        answers: [{ itemId: "M03-S1-Q01", text: "<script>" }],
      }),
    ).toThrow();
    expect(() =>
      curriculumRuntimeEvaluationRequestSchema.parse({
        ...request,
        answers: [{ itemId: "M03-S1-Q01", selectedChoiceIds: [] }],
      }),
    ).toThrow();
  });

  it("projects runtime state without participant, scope, item or answer internals", () => {
    const runtime = {
      moduleId: "M03",
      version: 1,
      status: "DOMINIO_DIGITAL",
      nextAction: "REVISAR_RETENCAO",
      scorePercent: 100,
      remediationCount: 0,
      retentionReviews: [
        { day: 60, dueAt: "2026-10-09T01:00:00.000Z", status: "PENDENTE" },
      ],
      practicalCompetenceClaim: "PROIBIDO_MVP",
    } as const;
    expect(parseParticipantCurriculumRuntime(runtime)).toEqual(runtime);
    expect(() =>
      parseParticipantCurriculumRuntime({
        ...runtime,
        retentionReviews: [
          { day: 7, dueAt: "2026-08-17T01:00:00.000Z", status: "PENDENTE" },
        ],
      }),
    ).toThrow();
    expect(() =>
      parseParticipantCurriculumRuntime({
        ...runtime,
        participantId: "internal",
      }),
    ).toThrow();
  });
});
