import { describe, expect, it, vi } from "vitest";

import { createAccountActions } from "../app/account-actions.js";
import type { AccountPageState } from "../app/account-state.js";

const operation = {
  operationId: "operation-1",
  expiresAt: "2026-08-16T12:00:00.000Z",
} as const;

const security = {
  provider: "EXTERNAL_IDENTITY_PROVIDER",
  recovery: "AVAILABLE",
  mfa: "NOT_ENABLED",
  session: "ACTIVE",
} as const;

function response(payload: unknown, ok = true): Response {
  return { ok, json: async () => payload } as Response;
}

function context(overrides: Partial<AccountPageState> = {}) {
  return {
    security: null,
    recoveryOperation: operation,
    mfaOperation: operation,
    recoveryCode: "recovery-code",
    mfaCode: "mfa-code",
    busy: false,
    notice: null,
    error: null,
    setSecurity: vi.fn(),
    setRecoveryOperation: vi.fn(),
    setMfaOperation: vi.fn(),
    setRecoveryCode: vi.fn(),
    setMfaCode: vi.fn(),
    setBusy: vi.fn(),
    setNotice: vi.fn(),
    setError: vi.fn(),
    ...overrides,
  } as unknown as AccountPageState;
}

describe("account actions production coverage", () => {
  it("loads security and handles invalid projections", async () => {
    const state = context();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(response({ success: true, data: security })),
    );
    await createAccountActions(state).load();
    expect(state.setSecurity).toHaveBeenCalledWith(security);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(response({ success: false }, false)),
    );
    await createAccountActions(state).load();
    expect(state.setError).toHaveBeenCalledWith(
      "Não foi possível carregar a segurança da conta.",
    );
  });

  it("starts recovery and MFA only from valid provider operations", async () => {
    const state = context();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(response({ success: true, data: operation })),
    );
    const actions = createAccountActions(state);
    await actions.startRecovery();
    await actions.startMfa();
    expect(state.setRecoveryOperation).toHaveBeenCalledWith(operation);
    expect(state.setMfaOperation).toHaveBeenCalledWith(operation);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(response({ success: false }, false)),
    );
    await actions.startRecovery();
    expect(state.setError).toHaveBeenCalledWith(
      "A operação depende de um provedor de identidade configurado.",
    );
  });

  it("requires codes and clears completed operations", async () => {
    const emptyState = context({
      recoveryOperation: null,
      recoveryCode: " ",
    });
    const emptyActions = createAccountActions(emptyState);
    await emptyActions.completeRecovery();
    expect(emptyState.setError).toHaveBeenCalledWith(
      "Informe o código recebido do provedor de identidade.",
    );

    const state = context();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(response({ success: true, data: operation })),
    );
    const actions = createAccountActions(state);
    await actions.completeRecovery();
    await actions.completeMfa();
    expect(state.setRecoveryOperation).toHaveBeenCalledWith(null);
    expect(state.setMfaOperation).toHaveBeenCalledWith(null);
    expect(state.setRecoveryCode).toHaveBeenCalledWith("");
    expect(state.setMfaCode).toHaveBeenCalledWith("");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(response({ success: false }, false)),
    );
    await actions.completeRecovery();
    expect(state.setError).toHaveBeenCalledWith(
      "O provedor não confirmou o código informado.",
    );
    vi.unstubAllGlobals();
  });
});
