import { describe, expect, it } from "vitest";

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

  it("validates internal evaluation input without changing the public state boundary", () => {
    const request = {
      participantId: "11111111-1111-4111-8111-111111111111",
      scopeId: "22222222-2222-4222-8222-222222222222",
      answers: [
        { itemId: "M03-S1-Q01", selectedChoiceIds: ["a"] },
        { itemId: "M03-S4-RA01", text: "Plano fictício para correção humana." },
      ],
      completedAt: "2026-08-10T01:00:00.000Z",
      mode: "MODULE_COMPLETION",
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
        { day: 7, dueAt: "2026-08-17T01:00:00.000Z", status: "PENDENTE" },
      ],
      practicalCompetenceClaim: "PROIBIDO_MVP",
    } as const;
    expect(parseParticipantCurriculumRuntime(runtime)).toEqual(runtime);
    expect(() =>
      parseParticipantCurriculumRuntime({
        ...runtime,
        participantId: "internal",
      }),
    ).toThrow();
  });
});
