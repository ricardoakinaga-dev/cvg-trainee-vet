"use client";

import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Operation, Security } from "./account-model";

export type AccountPageState = Readonly<{
  readonly security: Security | null;
  readonly recoveryOperation: Operation | null;
  readonly mfaOperation: Operation | null;
  readonly recoveryCode: string;
  readonly mfaCode: string;
  readonly busy: boolean;
  readonly notice: string | null;
  readonly error: string | null;
  readonly setSecurity: Dispatch<SetStateAction<Security | null>>;
  readonly setRecoveryOperation: Dispatch<SetStateAction<Operation | null>>;
  readonly setMfaOperation: Dispatch<SetStateAction<Operation | null>>;
  readonly setRecoveryCode: Dispatch<SetStateAction<string>>;
  readonly setMfaCode: Dispatch<SetStateAction<string>>;
  readonly setBusy: Dispatch<SetStateAction<boolean>>;
  readonly setNotice: Dispatch<SetStateAction<string | null>>;
  readonly setError: Dispatch<SetStateAction<string | null>>;
}>;

export function useAccountPageState(): AccountPageState {
  const [security, setSecurity] = useState<Security | null>(null);
  const [recoveryOperation, setRecoveryOperation] = useState<Operation | null>(
    null,
  );
  const [mfaOperation, setMfaOperation] = useState<Operation | null>(null);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  return {
    security,
    recoveryOperation,
    mfaOperation,
    recoveryCode,
    mfaCode,
    busy,
    notice,
    error,
    setSecurity,
    setRecoveryOperation,
    setMfaOperation,
    setRecoveryCode,
    setMfaCode,
    setBusy,
    setNotice,
    setError,
  };
}
