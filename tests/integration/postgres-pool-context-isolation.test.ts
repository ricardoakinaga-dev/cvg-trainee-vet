import { randomUUID } from "node:crypto";

import { sql, type SQL } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  setDatabaseSecurityContext,
  setDatabaseServiceContext,
} from "../../packages/persistence/src/security-context.js";

import {
  closeLivePostgresHarness,
  liveDatabaseUrl,
  openLivePostgresHarness,
} from "./live-postgres-harness.js";

const runLiveDatabaseTests = process.env.CVG_RUN_LIVE_DB_TESTS === "true";

type QueryExecutor = {
  execute<T>(query: SQL): Promise<T[]>;
};

type SettingRow = Readonly<{
  readonly participant: string;
  readonly scope: string;
  readonly service: string;
}>;

async function readContextSettings(
  executor: QueryExecutor,
): Promise<SettingRow> {
  const rows = await executor.execute<{
    readonly participant: string | null;
    readonly scope: string | null;
    readonly service: string | null;
  }>(sql`
    select
      current_setting('cvg.participant_id', true) as "participant",
      current_setting('cvg.scope_id', true) as "scope",
      current_setting('cvg.service_role', true) as "service"
  `);
  const row = rows[0];
  return {
    participant: row?.participant ?? "",
    scope: row?.scope ?? "",
    service: row?.service ?? "",
  };
}

describe.skipIf(!runLiveDatabaseTests || liveDatabaseUrl === undefined)(
  "PostgreSQL pooled connection RLS context isolation",
  () => {
    it("resets every context slot when a new request context is set", async () => {
      const harness = await openLivePostgresHarness();
      try {
        const participantA = randomUUID();
        const scopeA = randomUUID();
        const participantB = randomUUID();

        await harness.application.db.transaction(async (tx) => {
          await setDatabaseSecurityContext(tx, {
            participantId: participantA,
            scopeId: scopeA,
          });
          await expect(readContextSettings(tx)).resolves.toEqual({
            participant: participantA,
            scope: scopeA,
            service: "",
          });

          await setDatabaseSecurityContext(tx, {
            participantId: participantB,
          });
          await expect(readContextSettings(tx)).resolves.toEqual({
            participant: participantB,
            scope: "",
            service: "",
          });
        });
      } finally {
        await closeLivePostgresHarness(harness);
      }
    });

    it("does not leak transaction-local context to the next pooled checkout", async () => {
      const harness = await openLivePostgresHarness();
      try {
        const participant = randomUUID();
        await harness.application.db.transaction(async (tx) => {
          await setDatabaseSecurityContext(tx, { participantId: participant });
          await expect(readContextSettings(tx)).resolves.toMatchObject({
            participant,
          });
        });
        await harness.application.db.transaction(async (tx) => {
          await expect(readContextSettings(tx)).resolves.toEqual({
            participant: "",
            scope: "",
            service: "",
          });
        });
      } finally {
        await closeLivePostgresHarness(harness);
      }
    });

    it("clears participant slots when the worker service identity takes over", async () => {
      const harness = await openLivePostgresHarness();
      try {
        await harness.application.db.transaction(async (tx) => {
          await setDatabaseSecurityContext(tx, {
            participantId: randomUUID(),
            scopeId: randomUUID(),
          });
          await setDatabaseServiceContext(tx, {
            serviceRole: "content-indexer",
          });
          await expect(readContextSettings(tx)).resolves.toEqual({
            participant: "",
            scope: "",
            service: "content-indexer",
          });
        });
      } finally {
        await closeLivePostgresHarness(harness);
      }
    });
  },
);
