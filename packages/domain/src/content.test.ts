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
      transitionContent({ ...draft, version: 0 }, { type: "AUTOVERIFICAR" }),
    ).toThrow("version");
    expect(() =>
      transitionContent(
        { ...draft, status: "UNKNOWN" as never },
        { type: "AUTOVERIFICAR" },
      ),
    ).toThrow("status");
  });

  it("requires the complete clinical publication sequence", () => {
    const draft = createContent(contentInput);
    const autoVerified = transitionContent(draft, { type: "AUTOVERIFICAR" });
    const inReview = transitionContent(autoVerified, {
      type: "INICIAR_REVISAO_CLINICA",
    });
    const approved = transitionContent(inReview, {
      type: "APROVAR_CLINICAMENTE",
    });
    const projectionVerified = transitionContent(approved, {
      type: "VERIFICAR_PROJECAO",
    });
    const authorized = transitionContent(projectionVerified, {
      type: "AUTORIZAR_PUBLICACAO",
    });
    const published = transitionContent(authorized, { type: "PUBLICAR" });

    expect(published.status).toBe("PUBLICADO");
    expect(Object.isFrozen(published)).toBe(true);
    expect(draft.status).toBe("RASCUNHO");
    expect(published.version).toBe(1);
  });

  it("returns requested changes to a new draft cycle", () => {
    const autoVerified = transitionContent(createContent(contentInput), {
      type: "AUTOVERIFICAR",
    });
    const inReview = transitionContent(autoVerified, {
      type: "INICIAR_REVISAO_CLINICA",
    });
    const changes = transitionContent(inReview, {
      type: "SOLICITAR_AJUSTES",
    });
    const draft = transitionContent(changes, { type: "RETORNAR_A_RASCUNHO" });

    expect(changes.status).toBe("AJUSTES_SOLICITADOS");
    expect(draft.status).toBe("RASCUNHO");
  });

  it("does not permit approval, publication, or withdrawal out of order", () => {
    const draft = createContent(contentInput);

    expect(() =>
      transitionContent(draft, { type: "APROVAR_CLINICAMENTE" }),
    ).toThrow("APROVAR_CLINICAMENTE");
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
      "INICIAR_REVISAO_CLINICA",
      "APROVAR_CLINICAMENTE",
      "VERIFICAR_PROJECAO",
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
});
