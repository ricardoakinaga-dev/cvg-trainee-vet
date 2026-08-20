import {
  accountOperationProjectionSchema,
  parseAccountSecurity,
} from "@cvg/contracts";
import type {
  AccountOperationProjection,
  AccountSecurityProjection,
} from "@cvg/contracts";

export type ApiRecord = Readonly<Record<string, unknown>>;
export type Security = AccountSecurityProjection;
export type Operation = AccountOperationProjection;

export function isRecord(value: unknown): value is ApiRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isSecurity(value: unknown): value is Security {
  try {
    parseAccountSecurity(value);
    return true;
  } catch {
    return false;
  }
}

export function isOperation(value: unknown): value is Operation {
  return accountOperationProjectionSchema.safeParse(value).success;
}
