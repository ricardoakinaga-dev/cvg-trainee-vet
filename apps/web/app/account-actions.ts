"use client";

import type { AccountPageState } from "./account-state";
import { isOperation, isRecord, isSecurity } from "./account-model";
import type { Operation } from "./account-model";

const apiBase = process.env.NEXT_PUBLIC_CVG_API_BASE_URL ?? "";

export type AccountActions = Readonly<{
  readonly load: () => Promise<void>;
  readonly startRecovery: () => Promise<void>;
  readonly startMfa: () => Promise<void>;
  readonly completeRecovery: () => Promise<void>;
  readonly completeMfa: () => Promise<void>;
}>;

async function requestJson(
  path: string,
  body?: unknown,
): Promise<
  Readonly<{ readonly response: Response; readonly payload: unknown }>
> {
  const response = await fetch(`${apiBase}${path}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "include",
    cache: "no-store",
    ...(body === undefined
      ? {}
      : {
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
  });
  return { response, payload: await response.json().catch(() => null) };
}

async function load(context: AccountPageState): Promise<void> {
  context.setError(null);
  try {
    const { response, payload } = await requestJson("/api/v1/account/security");
    if (
      !response.ok ||
      !isRecord(payload) ||
      payload.success !== true ||
      !isSecurity(payload.data)
    )
      throw new Error("invalid security projection");
    context.setSecurity(payload.data);
  } catch {
    context.setError("Não foi possível carregar a segurança da conta.");
  }
}

async function begin(
  context: AccountPageState,
  path: string,
  message: string,
  setOperation: (operation: Operation | null) => void,
): Promise<void> {
  context.setBusy(true);
  context.setNotice(null);
  context.setError(null);
  try {
    const { response, payload } = await requestJson(path, {});
    if (
      !response.ok ||
      !isRecord(payload) ||
      payload.success !== true ||
      !isOperation(payload.data)
    )
      throw new Error("operation unavailable");
    setOperation(payload.data);
    context.setNotice(message);
  } catch {
    context.setError(
      "A operação depende de um provedor de identidade configurado.",
    );
  } finally {
    context.setBusy(false);
  }
}

async function complete(
  context: AccountPageState,
  path: string,
  operation: Operation | null,
  code: string,
  setOperation: (operation: Operation | null) => void,
  clearCode: () => void,
  message: string,
): Promise<void> {
  if (operation === null || code.trim().length === 0) {
    context.setError("Informe o código recebido do provedor de identidade.");
    return;
  }
  context.setBusy(true);
  context.setNotice(null);
  context.setError(null);
  try {
    const { response, payload } = await requestJson(path, {
      operationId: operation.operationId,
      verificationCode: code,
    });
    if (
      !response.ok ||
      !isRecord(payload) ||
      payload.success !== true ||
      !isOperation(payload.data)
    )
      throw new Error("operation unavailable");
    setOperation(null);
    clearCode();
    context.setNotice(message);
  } catch {
    context.setError("O provedor não confirmou o código informado.");
  } finally {
    context.setBusy(false);
  }
}

export function createAccountActions(
  context: AccountPageState,
): AccountActions {
  return {
    load: () => load(context),
    startRecovery: () =>
      begin(
        context,
        "/api/v1/account/recovery/start",
        "Solicitação de recuperação encaminhada ao provedor.",
        context.setRecoveryOperation,
      ),
    startMfa: () =>
      begin(
        context,
        "/api/v1/account/mfa/enrollment",
        "Inscrição MFA encaminhada ao provedor.",
        context.setMfaOperation,
      ),
    completeRecovery: () =>
      complete(
        context,
        "/api/v1/account/recovery/complete",
        context.recoveryOperation,
        context.recoveryCode,
        context.setRecoveryOperation,
        () => context.setRecoveryCode(""),
        "Recuperação concluída pelo provedor.",
      ),
    completeMfa: () =>
      complete(
        context,
        "/api/v1/account/mfa/enrollment/verify",
        context.mfaOperation,
        context.mfaCode,
        context.setMfaOperation,
        () => context.setMfaCode(""),
        "MFA confirmado pelo provedor.",
      ),
  };
}
