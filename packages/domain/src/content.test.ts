import { describe, expect, it } from "vitest";

import {
  ContentDomainError,
  createContent,
  transitionContent,
} from "./content.js";

const contentInput = {
  contentId: "44444444-4444-4444-8444-444444444444",
  version: 1,
};

describe("content editorial state machine", () => {
  it("starts a content version as a draft", () => {
    const draft = createContent(contentInput);

    expect(draft).toEqual({
      ...contentInput,
      status: "RASCUNHO",
    });
    expect(Object.isFrozen(draft)).toBe(true);
  });

  it("rejects a non-positive content version", () => {
    expect(() => createContent({ ...contentInput, version: 0 })).toThrow(
      ContentDomainError,
    );
  });

  it("rejects malformed prior state before resolving a transition", () => {
    const draft = createContent(contentInput);

    expect(() =>
      transitionContent(null as never, { type: "AUTOVERIFICAR" }),
    ).toThrow("object");
    expect(() =>
      transitionContent({ ...draft, contentId: "" }, { type: "AUTOVERIFICAR" }),
    ).toThrow("contentId");
    expect(() =>
      transitionContent({ ...draft, version: 0 }, { type: "AUTOVERIFICAR" }),
    ).toThrow("version");
    expect(() =>
      transitionContent(
        { ...draft, status: "UNKNOWN" as never },
        { type: "AUTOVERIFICAR" },
      ),
    ).toThrow("status");
  });

  it("rejects an empty content identity before creating a version", () => {
    expect(() => createContent({ ...contentInput, contentId: "" })).toThrow(
      "contentId",
    );
  });

  it("requires clinical review and explicit authorization before publication", () => {
    const draft = createContent(contentInput);
    const autoVerified = transitionContent(draft, { type: "AUTOVERIFICAR" });
    const projectionVerified = transitionContent(autoVerified, {
      type: "VERIFICAR_PROJECAO",
    });
    const inReview = transitionContent(projectionVerified, {
      type: "ENVIAR_PARA_REVISAO_CLINICA",
    });
    const clinicallyApproved = transitionContent(inReview, {
      type: "APROVAR_CLINICAMENTE",
    });
    const authorized = transitionContent(clinicallyApproved, {
      type: "AUTORIZAR_PUBLICACAO",
    });
    const published = transitionContent(authorized, { type: "PUBLICAR" });

    expect(published.status).toBe("PUBLICADO");
  });

  it("rejects automatic publication without a clinical decision", () => {
    const draft = createContent(contentInput);
    expect(() =>
      transitionContent(draft, { type: "PUBLICAR_AUTOMATICAMENTE" }),
    ).toThrow(ContentDomainError);
  });

  it("exposes explicit clinical review transitions", () => {
    const draft = createContent(contentInput);
    const inReview = transitionContent(
      transitionContent(draft, { type: "AUTOVERIFICAR" }),
      { type: "ENVIAR_PARA_REVISAO_CLINICA" },
    );
    expect(
      transitionContent(inReview, { type: "SOLICITAR_AJUSTES" }).status,
    ).toBe("AJUSTES_SOLICITADOS");
  });

  it("does not permit publication or withdrawal out of order", () => {
    const draft = createContent(contentInput);

    expect(() => transitionContent(draft, { type: "PUBLICAR" })).toThrow(
      ContentDomainError,
    );
    expect(() => transitionContent(draft, { type: "RETIRAR" })).toThrow(
      ContentDomainError,
    );
  });

  it("withdraws or expires only content that was published", () => {
    const published = [
      "AUTOVERIFICAR",
      "VERIFICAR_PROJECAO",
      "ENVIAR_PARA_REVISAO_CLINICA",
      "APROVAR_CLINICAMENTE",
      "AUTORIZAR_PUBLICACAO",
      "PUBLICAR",
    ].reduce(
      (state, type) =>
        transitionContent(state, { type } as Parameters<
          typeof transitionContent
        >[1]),
      createContent(contentInput),
    );

    expect(transitionContent(published, { type: "RETIRAR" }).status).toBe(
      "RETIRADO",
    );
    expect(transitionContent(published, { type: "VENCER" }).status).toBe(
      "VENCIDO",
    );
  });

  it("validates withdrawal metadata and preserves the affected count", () => {
    const published = [
      "AUTOVERIFICAR",
      "VERIFICAR_PROJECAO",
      "ENVIAR_PARA_REVISAO_CLINICA",
      "APROVAR_CLINICAMENTE",
      "AUTORIZAR_PUBLICACAO",
      "PUBLICAR",
    ].reduce(
      (state, type) =>
        transitionContent(state, { type } as Parameters<
          typeof transitionContent
        >[1]),
      createContent(contentInput),
    );

    expect(
      transitionContent(published, {
        type: "RETIRAR",
        withdrawalReasonCode: "ERRO_CONTEUDO",
      }),
    ).toMatchObject({
      status: "RETIRADO",
      withdrawalReasonCode: "ERRO_CONTEUDO",
    });
    expect(() =>
      transitionContent(
        { ...published, withdrawnAt: "not-a-timestamp" },
        { type: "VENCER" },
      ),
    ).toThrow("withdrawnAt");
    expect(() =>
      transitionContent(
        { ...published, affectedParticipantCount: -1 },
        { type: "VENCER" },
      ),
    ).toThrow("affectedParticipantCount");
    expect(() =>
      transitionContent(
        { ...published, affectedParticipantCount: 1.5 },
        { type: "VENCER" },
      ),
    ).toThrow("affectedParticipantCount");
    expect(
      transitionContent(
        {
          ...published,
          withdrawnAt: "2026-08-14T12:00:00.000Z",
          affectedParticipantCount: 2,
        },
        { type: "VENCER" },
      ),
    ).toMatchObject({ status: "VENCIDO", affectedParticipantCount: 2 });
  });
});
