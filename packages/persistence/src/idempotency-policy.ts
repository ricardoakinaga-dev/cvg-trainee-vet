import { sql, type SQL } from "drizzle-orm";

import { PersistenceMappingError } from "./persistence-errors.js";

type IdempotencyLockExecutor = Readonly<{
  readonly execute: (query: SQL) => Promise<unknown>;
}>;

const idempotencyKeyPattern = /^[A-Za-z0-9][A-Za-z0-9._~:-]{15,127}$/u;

export function assertIdempotencyKey(key: string, label = "idempotency"): void {
  if (!idempotencyKeyPattern.test(key)) {
    throw new PersistenceMappingError(`${label} key is invalid`);
  }
}

export async function lockIdempotencyKey(
  executor: IdempotencyLockExecutor,
  namespace: string,
  key: string,
): Promise<void> {
  await executor.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`${namespace}:${key}`}, 0))`,
  );
}
