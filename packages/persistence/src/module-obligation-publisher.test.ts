import { describe, expect, it } from "vitest";
import { getTableName, type SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { ApplicationError } from "@cvg/application";
import {
  publishModuleInventory,
  type ModuleInventoryIdentity,
} from "./module-obligation-publisher.js";
import type { DatabaseExecutor } from "./adaptive-assignment-repository.js";
import type { ApprovedModuleInventoryInput } from "./module-obligation-validation.js";
import { approvedModuleFixture } from "./test-support/module-obligation-fixture.js";
import { createFakeDatabase } from "./test-support/fake-database.js";

type Mutable<T> = T extends Date
  ? Date
  : T extends object
    ? { -readonly [K in keyof T]: Mutable<T[K]> }
    : T;

const dialect = new PgDialect();
const blueprintVersionId = "00000000-0000-4000-8000-000000000005";
const manifestId = "00000000-0000-4000-8000-000000000006";

type Insert = Readonly<{ table: string; values: Record<string, unknown> }>;

function inventory(
  change?: (input: Mutable<ApprovedModuleInventoryInput>) => void,
): ApprovedModuleInventoryInput {
  const capture = approvedModuleFixture();
  const input: Mutable<ApprovedModuleInventoryInput> = {
    now: capture.now,
    blueprint: capture.blueprint,
    manifest: capture.manifest,
    approvals: capture.approvals,
  };
  change?.(input);
  return input;
}

function harness(rows: readonly (readonly unknown[])[] = []) {
  const inserts: Insert[] = [];
  const updates: string[] = [];
  const configurations: string[] = [];
  const db = createFakeDatabase({
    rows,
    onInsert: (table, values) => {
      inserts.push({
        table: getTableName(table as Parameters<typeof getTableName>[0]),
        values: values as Record<string, unknown>,
      });
    },
    onUpdate: (table) => {
      updates.push(getTableName(table as Parameters<typeof getTableName>[0]));
    },
    onExecute: (query) => {
      configurations.push(dialect.sqlToQuery(query as SQL).sql);
    },
  });
  return {
    db: db as unknown as DatabaseExecutor,
    inserts,
    updates,
    configurations,
  };
}

async function denied(action: () => Promise<unknown>): Promise<void> {
  const error = await action().then(
    () => null,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(ApplicationError);
  expect(error).toMatchObject({
    code: "state_conflict",
    status: 409,
    details: [],
  });
}

describe("module inventory publisher", () => {
  it("publishes the approved blueprint and manifest as two immutable insert-only rows", async () => {
    const { db, inserts, updates } = harness();
    const input = inventory();

    const identity: ModuleInventoryIdentity = await publishModuleInventory(
      db,
      input,
    );

    expect(identity).toEqual({
      blueprintVersionId,
      blueprintVersion: 1,
      manifestId,
      manifestVersion: 1,
      scopeId: input.blueprint.scopeId,
      moduleId: input.blueprint.moduleId,
    });
    expect(updates).toEqual([]);
    expect(inserts.map((insert) => insert.table)).toEqual([
      "curriculum_module_blueprint_versions",
      "curriculum_module_obligation_manifests",
    ]);
    expect(inserts[0]!.values).toMatchObject({
      id: blueprintVersionId,
      blueprintId: input.blueprint.blueprintId,
      version: 1,
      scopeId: input.blueprint.scopeId,
      moduleId: input.blueprint.moduleId,
      approvalDecisionId: input.blueprint.approval.decisionId,
      approvedBy: input.blueprint.approval.actorId,
      approvedAt: input.blueprint.approval.at,
      snapshot: {
        ...input.blueprint.snapshot,
        itemManifest: input.blueprint.itemManifest,
      },
    });
    expect(inserts[1]!.values).toMatchObject({
      id: manifestId,
      version: 1,
      scopeId: input.manifest.scopeId,
      moduleId: input.manifest.moduleId,
      blueprintVersionId,
      blueprintVersion: 1,
      approvalDecisionId: input.manifest.approval.decisionId,
      approvedBy: input.manifest.approval.actorId,
      approvedAt: input.manifest.approval.at,
      obligations: input.manifest.obligations,
    });
  });

  it("configures participant-free scope and audit context before the guarded inserts", async () => {
    const { db, configurations } = harness();

    await publishModuleInventory(db, inventory());

    expect(configurations).toHaveLength(2);
    expect(configurations[0]).toContain("set_config('cvg.participant_id'");
    expect(configurations[0]).toContain("set_config('cvg.audit_write', '',");
    expect(configurations[1]).toContain("set_config('cvg.audit_read', 'on'");
    expect(configurations[1]).toContain("set_config('cvg.audit_scope_id'");
  });

  it("denies an empty inventory without inserting any row", async () => {
    const { db, inserts } = harness();

    await denied(() =>
      publishModuleInventory(
        db,
        inventory((input) => {
          input.manifest.obligations.splice(0);
        }),
      ),
    );

    expect(inserts).toEqual([]);
  });

  it("denies a partial inventory that no longer matches the bound captures", async () => {
    const { db, inserts } = harness();

    await denied(() =>
      publishModuleInventory(
        db,
        inventory((input) => {
          input.manifest.obligations.splice(1);
        }),
      ),
    );

    expect(inserts).toEqual([]);
  });

  it("denies an obligation item that is not part of the published blueprint", async () => {
    const { db, inserts } = harness();

    await denied(() =>
      publishModuleInventory(
        db,
        inventory((input) => {
          input.manifest.obligations[0]!.items[0]!.canonicalItemId =
            "not-a-published-item";
        }),
      ),
    );

    expect(inserts).toEqual([]);
  });

  it("denies future or non-finite approval timestamps", async () => {
    const future = harness();
    await denied(() =>
      publishModuleInventory(
        future.db,
        inventory((input) => {
          input.blueprint.approval.at = new Date("2099-01-01T00:00:00.000Z");
        }),
      ),
    );
    expect(future.inserts).toEqual([]);

    const invalid = harness();
    await denied(() =>
      publishModuleInventory(
        invalid.db,
        inventory((input) => {
          input.manifest.approval.at = new Date(Number.NaN);
        }),
      ),
    );
    expect(invalid.inserts).toEqual([]);
  });

  it("denies an approval decision that does not authenticate the published identity", async () => {
    const { db, inserts } = harness();

    await denied(() =>
      publishModuleInventory(
        db,
        inventory((input) => {
          input.approvals[0]!.resourceId =
            "00000000-0000-4000-8000-0000000000ff";
        }),
      ),
    );

    expect(inserts).toEqual([]);
  });

  it("denies republishing an already published blueprint identity", async () => {
    const { db, inserts } = harness([[], [], [{ id: blueprintVersionId }]]);

    await denied(() => publishModuleInventory(db, inventory()));

    expect(inserts).toEqual([]);
  });

  it("never leaves half an inventory when the manifest identity is already published", async () => {
    const { db, inserts } = harness([[], [], [], [{ id: manifestId }]]);

    await denied(() => publishModuleInventory(db, inventory()));

    expect(inserts).toEqual([]);
  });

  it("does not mutate the published inventory input", async () => {
    const { db } = harness();
    const input = inventory();
    const before = structuredClone(input);

    await publishModuleInventory(db, input);

    expect(input).toEqual(before);
  });
});
