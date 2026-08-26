import { describe, expect, it } from "vitest";

import {
  DiagnosticSessionDomainError,
  createDiagnosticSession,
  transitionDiagnosticSession,
  type DiagnosticSessionState,
} from "./diagnostic-session.js";

const identity = {
  sessionId: "11111111-1111-4111-8111-111111111111",
  participantId: "22222222-2222-4222-8222-222222222222",
  scopeId: "33333333-3333-4333-8333-333333333333",
  diagnosticId: "B07-DIAGNOSTIC-V1" as const,
  diagnosticVersion: "0.1.0" as const,
  startedAt: "2026-08-26T14:00:00.000Z",
};

describe("diagnostic session domain", () => {
  it("creates an in-progress session at version zero", () => {
    expect(createDiagnosticSession(identity)).toEqual({
      ...identity,
      status: "EM_ANDAMENTO",
      version: 0,
    });
  });

  it("advances the CAS version for checkpoints and finalization", () => {
    const started = createDiagnosticSession(identity);
    const checkpointed = transitionDiagnosticSession(started, {
      type: "CHECKPOINT",
      occurredAt: "2026-08-26T14:01:00.000Z",
    });
    const finalized = transitionDiagnosticSession(checkpointed, {
      type: "FINALIZAR",
      finalizedAt: "2026-08-26T14:02:00.000Z",
    });

    expect(checkpointed).toMatchObject({
      status: "EM_ANDAMENTO",
      version: 1,
      lastCheckpointAt: "2026-08-26T14:01:00.000Z",
    });
    expect(finalized).toMatchObject({
      status: "FINALIZADA",
      version: 2,
      finalizedAt: "2026-08-26T14:02:00.000Z",
    });
  });

  it("does not permit mutation after finalization or invalid state", () => {
    const finalized: DiagnosticSessionState = {
      ...createDiagnosticSession(identity),
      status: "FINALIZADA",
      version: 1,
      finalizedAt: "2026-08-26T14:02:00.000Z",
    };

    expect(() =>
      transitionDiagnosticSession(finalized, {
        type: "CHECKPOINT",
        occurredAt: "2026-08-26T14:03:00.000Z",
      }),
    ).toThrow(DiagnosticSessionDomainError);
    expect(() =>
      createDiagnosticSession({ ...identity, startedAt: "invalid" }),
    ).toThrow(DiagnosticSessionDomainError);
  });
});
