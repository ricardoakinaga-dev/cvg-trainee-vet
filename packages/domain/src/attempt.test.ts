import { describe, expect, it } from "vitest";

import {
  AttemptDomainError,
  createAttempt,
  transitionAttempt,
  type AttemptEvent,
} from "./attempt.js";

const ids = {
  attemptId: "11111111-1111-4111-8111-111111111111",
  participantId: "22222222-2222-4222-8222-222222222222",
  activityId: "33333333-3333-4333-8333-333333333333",
};

describe("attempt domain state machine", () => {
  it("starts every attempt in the created state with an immutable version", () => {
    const attempt = createAttempt(ids);

    expect(attempt).toEqual({
      ...ids,
      status: "CRIADA",
      version: 0,
    });
    expect(Object.isFrozen(attempt)).toBe(true);
  });

  it("freezes every derived state and rejects an invalid prior version", () => {
    const created = createAttempt(ids);
    const started = transitionAttempt(created, { type: "INICIAR" });

    expect(Object.isFrozen(started)).toBe(true);
    expect(() =>
      transitionAttempt({ ...created, version: -1 }, { type: "INICIAR" }),
    ).toThrow("version");
  });

  it("rejects incomplete aggregate identity", () => {
    expect(() => createAttempt({ ...ids, activityId: "" })).toThrow(
      AttemptDomainError,
    );
  });

  it("follows the resumable lifecycle without mutating prior states", () => {
    const created = createAttempt(ids);
    const started = transitionAttempt(created, { type: "INICIAR" });
    const saved = transitionAttempt(started, { type: "SALVAR" });
    const resumed = transitionAttempt(saved, { type: "RETOMAR" });
    const savedAgain = transitionAttempt(resumed, { type: "SALVAR" });
    const submitted = transitionAttempt(savedAgain, {
      type: "SUBMETER",
      submittedAt: "2026-08-09T17:00:00.000Z",
    });

    expect(submitted).toMatchObject({ status: "SUBMETIDA", version: 5 });
    expect(submitted.submittedAt).toBe("2026-08-09T17:00:00.000Z");
    expect(created).toMatchObject({ status: "CRIADA", version: 0 });
    expect(started).toMatchObject({ status: "EM_ANDAMENTO", version: 1 });
    expect(saved).toMatchObject({ status: "SALVA", version: 2 });
    expect(resumed).toMatchObject({ status: "EM_ANDAMENTO", version: 3 });
    expect(savedAgain).toMatchObject({ status: "SALVA", version: 4 });
  });

  it("does not allow submission before a confirmed save", () => {
    const started = transitionAttempt(createAttempt(ids), { type: "INICIAR" });

    expect(() =>
      transitionAttempt(started, {
        type: "SUBMETER",
        submittedAt: "2026-08-09T17:00:00.000Z",
      }),
    ).toThrow("SUBMETER");
  });

  it("requires a complete ISO timestamp when submitting", () => {
    const saved = transitionAttempt(
      transitionAttempt(createAttempt(ids), { type: "INICIAR" }),
      { type: "SALVAR" },
    );

    expect(() =>
      transitionAttempt(saved, {
        type: "SUBMETER",
        submittedAt: "2026-08-10",
      }),
    ).toThrow("timestamp");
  });

  it("does not allow editing or correction before submission", () => {
    const state = createAttempt(ids);
    const invalidEvents: AttemptEvent[] = [
      { type: "SALVAR" },
      { type: "CORRIGIR_AUTOMATICAMENTE" },
      { type: "CORRIGIR_HUMANAMENTE" },
      { type: "ANULAR" },
    ];

    invalidEvents.forEach((event) => {
      expect(() => transitionAttempt(state, event)).toThrow(AttemptDomainError);
    });
  });

  it("supports one correction route and keeps the submitted timestamp", () => {
    const submitted = transitionAttempt(
      transitionAttempt(
        transitionAttempt(createAttempt(ids), { type: "INICIAR" }),
        { type: "SALVAR" },
      ),
      { type: "SUBMETER", submittedAt: "2026-08-09T17:00:00.000Z" },
    );

    const corrected = transitionAttempt(submitted, {
      type: "CORRIGIR_AUTOMATICAMENTE",
    });

    expect(corrected).toMatchObject({
      status: "CORRIGIDA_AUTOMATICAMENTE",
      submittedAt: "2026-08-09T17:00:00.000Z",
      version: 4,
    });
    expect(() =>
      transitionAttempt(corrected, { type: "CORRIGIR_HUMANAMENTE" }),
    ).toThrow(AttemptDomainError);
  });

  it("allows the human correction route only after explicit queueing", () => {
    const submitted = transitionAttempt(
      transitionAttempt(
        transitionAttempt(createAttempt(ids), { type: "INICIAR" }),
        { type: "SALVAR" },
      ),
      { type: "SUBMETER", submittedAt: "2026-08-09T17:00:00.000Z" },
    );
    const awaiting = transitionAttempt(submitted, {
      type: "AGUARDAR_CORRECAO_HUMANA",
    });
    const corrected = transitionAttempt(awaiting, {
      type: "CORRIGIR_HUMANAMENTE",
    });

    expect(corrected.status).toBe("CORRIGIDA_HUMANAMENTE");
  });

  it("allows only a submitted attempt to be annulled", () => {
    const submitted = transitionAttempt(
      transitionAttempt(
        transitionAttempt(createAttempt(ids), { type: "INICIAR" }),
        { type: "SALVAR" },
      ),
      { type: "SUBMETER", submittedAt: "2026-08-09T17:00:00.000Z" },
    );

    expect(transitionAttempt(submitted, { type: "ANULAR" }).status).toBe(
      "ANULADA",
    );
  });
});
