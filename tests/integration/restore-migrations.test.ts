import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  restoreApplicationGrantMatrixMatches,
  restoreIntegrityCatalogMatches,
} from "../../scripts/restore-integrity-contract.mjs";
import { buildRestoreMigrationPlan } from "../../scripts/restore-migration-compatibility.mjs";
import {
  createRestoreToolRunner,
  runRoleProvisioningCommand,
} from "../../scripts/restore-tool-runner.mjs";

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("catalog fixture row required");
  return value;
}

const journalEntries = [
  { idx: 0, tag: "0000_initial", when: 100, breakpoints: true },
  { idx: 1, tag: "0001_scope", when: 200, breakpoints: true },
  { idx: 2, tag: "0002_policy", when: 300, breakpoints: true },
];

const hashes = {
  "0000_initial": "a".repeat(64),
  "0001_scope": "b".repeat(64),
  "0002_policy": "c".repeat(64),
};
const integrityTableNames = ["content_versions", "ai_suggestions"];
const integrityCatalog = {
  columns: integrityTableNames.flatMap((table_name) => [
    {
      table_name,
      column_name: "id",
      data_type: "uuid",
      not_null: true,
      identity_kind: "",
      generated_kind: "",
      default_expression: null,
      catalog_row_count: 2,
    },
    {
      table_name,
      column_name: "content_id",
      data_type: "uuid",
      not_null: true,
      identity_kind: "",
      generated_kind: "",
      default_expression: null,
      catalog_row_count: 2,
    },
  ]),
  constraints: integrityTableNames.map((table_name) => ({
    table_name,
    constraint_name: `${table_name}_pkey`,
    constraint_type: "p",
    validated: true,
    definition: "PRIMARY KEY (id)",
    catalog_row_count: 1,
  })),
  indexes: integrityTableNames.map((table_name) => ({
    table_name,
    index_name: `${table_name}_pkey`,
    is_unique: true,
    is_primary: true,
    is_valid: true,
    is_ready: true,
    definition: `CREATE UNIQUE INDEX ${table_name}_pkey ON public.${table_name} USING btree (id)`,
    catalog_row_count: 1,
  })),
};
const grantPrivilegeNames = [
  "SELECT",
  "INSERT",
  "UPDATE",
  "DELETE",
  "TRUNCATE",
  "REFERENCES",
  "TRIGGER",
];
const applicationGrantMatrix = { accounts: ["SELECT", "INSERT"] };
const applicationGrantCatalog = [
  ...grantPrivilegeNames.map((privilege) => ({
    table_name: "accounts",
    privilege,
    granted: applicationGrantMatrix.accounts.includes(privilege),
  })),
  ...grantPrivilegeNames.map((privilege) => ({
    table_name: "knowledge_documents",
    privilege,
    granted: false,
  })),
];
const root = fileURLToPath(new URL("../..", import.meta.url));
const liveDrillEnabled = process.env.CVG_RUN_RESTORE_MIGRATION_DRILL === "true";
const execFileAsync = promisify(execFile);
const drillScript = join(root, "scripts/verify-restore-migrations.mjs");

describe("historical restore migration compatibility", () => {
  it("plans only unapplied migrations from a matching snapshot prefix", () => {
    expect(
      buildRestoreMigrationPlan(journalEntries, hashes, [
        { hash: hashes["0000_initial"], created_at: "100" },
        { hash: hashes["0001_scope"], created_at: "200" },
      ]),
    ).toEqual({
      snapshotHeadTag: "0001_scope",
      appliedMigrationCount: 2,
      pendingTags: ["0002_policy"],
    });
  });

  it("rejects snapshot history whose recorded hash or timestamp changed", () => {
    expect(() =>
      buildRestoreMigrationPlan(journalEntries, hashes, [
        { hash: "f".repeat(64), created_at: "100" },
      ]),
    ).toThrow("snapshot migration history is incompatible");

    expect(() =>
      buildRestoreMigrationPlan(journalEntries, hashes, [
        { hash: hashes["0000_initial"], created_at: "101" },
      ]),
    ).toThrow("snapshot migration history is incompatible");
  });

  it("rejects gaps, unknown migrations, and empty snapshot history", () => {
    expect(() =>
      buildRestoreMigrationPlan(
        [journalEntries[0], journalEntries[2]],
        hashes,
        [{ hash: hashes["0000_initial"], created_at: "100" }],
      ),
    ).toThrow("journal indexes must be contiguous");

    expect(() =>
      buildRestoreMigrationPlan(journalEntries, hashes, [
        { hash: hashes["0000_initial"], created_at: "100" },
        { hash: hashes["0001_scope"], created_at: "200" },
        { hash: "d".repeat(64), created_at: "400" },
      ]),
    ).toThrow("snapshot migration history is incompatible");

    expect(() => buildRestoreMigrationPlan(journalEntries, hashes, [])).toThrow(
      "snapshot has no applied migration history",
    );

    expect(() =>
      buildRestoreMigrationPlan(
        [journalEntries[1], journalEntries[0], journalEntries[2]],
        hashes,
        [{ hash: hashes["0000_initial"], created_at: "100" }],
      ),
    ).toThrow("journal indexes must be contiguous");

    expect(() =>
      buildRestoreMigrationPlan(
        [
          journalEntries[0],
          { ...journalEntries[1], when: 50 },
          journalEntries[2],
        ],
        hashes,
        [{ hash: hashes["0000_initial"], created_at: "100" }],
      ),
    ).toThrow("journal timestamps are invalid, repeated, or out of order");
  });

  it.skipIf(!liveDrillEnabled)(
    "restores the previous migration head and applies pending migrations in disposable PostgreSQL",
    async () => {
      const { stdout } = await execFileAsync(process.execPath, [drillScript], {
        cwd: root,
        timeout: 600_000,
      });
      const result = JSON.parse(stdout.trim());
      expect(result).toMatchObject({
        status: "PASS",
        targetIsolated: true,
        privateSocketVerified: true,
        snapshotHeadTag: "0053_aaa_content_integrity",
        markerVerified: true,
        migrationHistoryVerified: true,
        constraintsVerified: true,
        semanticSnapshotMismatchRejected: true,
        applicationGrantMatrixVerified: true,
        applicationRoleLeastPrivilegeVerified: true,
        applicationRoleDefaultPrivilegesDenied: true,
        applicationRoleHasNoOwnership: true,
        snapshotPreflightVerified: true,
        corruptSnapshotAbortVerified: true,
        rlsPoliciesVerified: true,
        targetOwnersMatchRestoreRole: true,
        targetRoleIsNonSuperuserNoBypass: true,
      });
      expect(result.appliedMigrationTags).toContain(
        "0054_aaa_content_indexer_service",
      );
      expect(result.targetHeadTag).toBe(result.repositoryHeadTag);
    },
    600_000,
  );
});

describe("restored schema semantic compatibility", () => {
  it("accepts matching catalogs with columns, constraints, and indexes for both tables", () => {
    expect(
      restoreIntegrityCatalogMatches(
        integrityCatalog,
        structuredClone(integrityCatalog),
        integrityTableNames,
      ),
    ).toBe(true);
  });

  it("accepts matching catalogs regardless of row or property order", () => {
    const reorderProperties = (row: Record<string, unknown>) =>
      Object.fromEntries(Object.entries(row).reverse());
    const reorderedCatalog = {
      columns: [...integrityCatalog.columns].reverse().map(reorderProperties),
      constraints: [...integrityCatalog.constraints]
        .reverse()
        .map(reorderProperties),
      indexes: [...integrityCatalog.indexes].reverse().map(reorderProperties),
    };

    expect(
      restoreIntegrityCatalogMatches(
        integrityCatalog,
        reorderedCatalog,
        integrityTableNames,
      ),
    ).toBe(true);
  });

  it("rejects semantic differences in columns, constraints, or index definitions", () => {
    const changedColumn = structuredClone(integrityCatalog);
    required(changedColumn.columns[0]).data_type = "text";
    expect(
      restoreIntegrityCatalogMatches(
        integrityCatalog,
        changedColumn,
        integrityTableNames,
      ),
    ).toBe(false);

    const changedConstraint = structuredClone(integrityCatalog);
    required(changedConstraint.constraints[0]).definition =
      "CHECK (id IS NOT NULL)";
    expect(
      restoreIntegrityCatalogMatches(
        integrityCatalog,
        changedConstraint,
        integrityTableNames,
      ),
    ).toBe(false);

    const changedIndex = structuredClone(integrityCatalog);
    required(changedIndex.indexes[0]).definition =
      "CREATE INDEX unexpected ON public.content_versions (id)";
    expect(
      restoreIntegrityCatalogMatches(
        integrityCatalog,
        changedIndex,
        integrityTableNames,
      ),
    ).toBe(false);
  });

  it("rejects identical catalogs with incomplete or wrong-typed rows", () => {
    const removeRequiredField = [
      (catalog: typeof integrityCatalog) =>
        Reflect.deleteProperty(required(catalog.columns[0]), "column_name"),
      (catalog: typeof integrityCatalog) =>
        Reflect.deleteProperty(
          required(catalog.constraints[0]),
          "constraint_name",
        ),
      (catalog: typeof integrityCatalog) =>
        Reflect.deleteProperty(required(catalog.indexes[0]), "index_name"),
      (catalog: typeof integrityCatalog) =>
        Reflect.set(required(catalog.columns[0]), "data_type", 1),
      (catalog: typeof integrityCatalog) =>
        Reflect.set(required(catalog.constraints[0]), "constraint_type", 1),
      (catalog: typeof integrityCatalog) =>
        Reflect.set(required(catalog.indexes[0]), "definition", 1),
    ];

    for (const makeMalformed of removeRequiredField) {
      const sourceCatalog = structuredClone(integrityCatalog);
      const targetCatalog = structuredClone(integrityCatalog);
      makeMalformed(sourceCatalog);
      makeMalformed(targetCatalog);

      expect(
        restoreIntegrityCatalogMatches(
          sourceCatalog,
          targetCatalog,
          integrityTableNames,
        ),
      ).toBe(false);
    }
  });

  it("rejects matching catalogs whose query rows were truncated", () => {
    const truncatedCatalog = structuredClone(integrityCatalog);
    truncatedCatalog.columns = truncatedCatalog.columns.filter(
      (column) => column.column_name !== "id",
    );

    expect(
      restoreIntegrityCatalogMatches(
        truncatedCatalog,
        structuredClone(truncatedCatalog),
        integrityTableNames,
      ),
    ).toBe(false);
  });

  it("rejects unknown PostgreSQL constraint type codes", () => {
    const invalidConstraintType = structuredClone(integrityCatalog);
    required(invalidConstraintType.constraints[0]).constraint_type = "invalid";

    expect(
      restoreIntegrityCatalogMatches(
        invalidConstraintType,
        structuredClone(invalidConstraintType),
        integrityTableNames,
      ),
    ).toBe(false);
  });

  it.each([
    ["identity_kind", "invalid"],
    ["identity_kind", "s"],
    ["generated_kind", "invalid"],
    ["generated_kind", "d"],
    ["data_type", "   "],
  ])("rejects matching malformed column %s=%j", (field, value) => {
    const catalog = structuredClone(integrityCatalog);
    Reflect.set(required(catalog.columns[0]), field, value);
    expect(
      restoreIntegrityCatalogMatches(
        catalog,
        structuredClone(catalog),
        integrityTableNames,
      ),
    ).toBe(false);
  });

  it.each(["constraints", "indexes"] as const)(
    "rejects matching blank %s definitions",
    (section) => {
      const catalog = structuredClone(integrityCatalog);
      for (const row of catalog[section]) row.definition = "   ";
      expect(
        restoreIntegrityCatalogMatches(
          catalog,
          structuredClone(catalog),
          integrityTableNames,
        ),
      ).toBe(false);
    },
  );

  it("rejects matching nonunique primary-index metadata", () => {
    const catalog = structuredClone(integrityCatalog);
    required(catalog.indexes[0]).is_unique = false;
    expect(
      restoreIntegrityCatalogMatches(
        catalog,
        structuredClone(catalog),
        integrityTableNames,
      ),
    ).toBe(false);
  });

  it.each([
    ["identity_kind", ""],
    ["identity_kind", "a"],
    ["identity_kind", "d"],
    ["generated_kind", ""],
    ["generated_kind", "s"],
  ])("accepts PostgreSQL 16 column %s=%j", (field, value) => {
    const catalog = structuredClone(integrityCatalog);
    Reflect.set(required(catalog.columns[0]), field, value);
    expect(
      restoreIntegrityCatalogMatches(
        catalog,
        structuredClone(catalog),
        integrityTableNames,
      ),
    ).toBe(true);
  });

  it("accepts a valid nonprimary nonunique index", () => {
    const catalog = structuredClone(integrityCatalog);
    const index = required(catalog.indexes[0]);
    index.is_primary = false;
    index.is_unique = false;
    index.definition =
      "CREATE INDEX content_versions_id_idx ON public.content_versions USING btree (id)";
    expect(
      restoreIntegrityCatalogMatches(
        catalog,
        structuredClone(catalog),
        integrityTableNames,
      ),
    ).toBe(true);
  });

  it.each(["", "   "])(
    "rejects matching blank column default expression %j",
    (value) => {
      const catalog = structuredClone(integrityCatalog);
      Reflect.set(required(catalog.columns[0]), "default_expression", value);
      expect(
        restoreIntegrityCatalogMatches(
          catalog,
          structuredClone(catalog),
          integrityTableNames,
        ),
      ).toBe(false);
    },
  );

  it("accepts a nonblank SQL expression for the empty-string default", () => {
    const catalog = structuredClone(integrityCatalog);
    Reflect.set(required(catalog.columns[0]), "default_expression", "''::text");
    expect(
      restoreIntegrityCatalogMatches(
        catalog,
        structuredClone(catalog),
        integrityTableNames,
      ),
    ).toBe(true);
  });

  it("rejects an empty contract table name even when catalog rows match", () => {
    const emptyTableCatalog = {
      columns: [{ ...required(integrityCatalog.columns[0]), table_name: "" }],
      constraints: [
        { ...required(integrityCatalog.constraints[0]), table_name: "" },
      ],
      indexes: [{ ...required(integrityCatalog.indexes[0]), table_name: "" }],
    };

    expect(
      restoreIntegrityCatalogMatches(
        emptyTableCatalog,
        structuredClone(emptyTableCatalog),
        [""],
      ),
    ).toBe(false);
  });

  it("rejects missing table metadata and unvalidated or unusable target entries", () => {
    const missingColumn = structuredClone(integrityCatalog);
    missingColumn.columns = missingColumn.columns.filter(
      (column) => column.table_name !== "ai_suggestions",
    );
    const matchingMissingColumn = structuredClone(missingColumn);
    expect(
      restoreIntegrityCatalogMatches(
        missingColumn,
        matchingMissingColumn,
        integrityTableNames,
      ),
    ).toBe(false);

    const unvalidatedConstraint = structuredClone(integrityCatalog);
    required(unvalidatedConstraint.constraints[0]).validated = false;
    const matchingUnvalidatedConstraint = structuredClone(
      unvalidatedConstraint,
    );
    expect(
      restoreIntegrityCatalogMatches(
        unvalidatedConstraint,
        matchingUnvalidatedConstraint,
        integrityTableNames,
      ),
    ).toBe(false);

    const invalidIndex = structuredClone(integrityCatalog);
    required(invalidIndex.indexes[0]).is_ready = false;
    const matchingInvalidIndex = structuredClone(invalidIndex);
    expect(
      restoreIntegrityCatalogMatches(
        invalidIndex,
        matchingInvalidIndex,
        integrityTableNames,
      ),
    ).toBe(false);
  });
});

describe("restored application privilege matrix", () => {
  it("accepts exact grants and requires excluded tables to remain present and denied", () => {
    expect(
      restoreApplicationGrantMatrixMatches(
        applicationGrantCatalog,
        applicationGrantMatrix,
        ["knowledge_documents"],
      ),
    ).toBe(true);
  });

  it("rejects overgrants, missing catalog entries, duplicates, and absent required tables", () => {
    const overgrant = structuredClone(applicationGrantCatalog);
    required(
      overgrant.find(
        (row) =>
          row.table_name === "knowledge_documents" &&
          row.privilege === "DELETE",
      ),
    ).granted = true;
    expect(
      restoreApplicationGrantMatrixMatches(overgrant, applicationGrantMatrix, [
        "knowledge_documents",
      ]),
    ).toBe(false);

    expect(
      restoreApplicationGrantMatrixMatches(
        applicationGrantCatalog.slice(1),
        applicationGrantMatrix,
        ["knowledge_documents"],
      ),
    ).toBe(false);
    expect(
      restoreApplicationGrantMatrixMatches(
        [...applicationGrantCatalog, applicationGrantCatalog[0]],
        applicationGrantMatrix,
        ["knowledge_documents"],
      ),
    ).toBe(false);
    expect(
      restoreApplicationGrantMatrixMatches(
        applicationGrantCatalog.filter(
          (row) => row.table_name !== "knowledge_documents",
        ),
        applicationGrantMatrix,
        ["knowledge_documents"],
      ),
    ).toBe(false);
  });

  it("rejects malformed privilege catalog rows", () => {
    const malformedRows = [
      null,
      "accounts",
      { table_name: 1, privilege: "SELECT", granted: true },
      { table_name: "accounts", privilege: "UNKNOWN", granted: false },
      { table_name: "accounts", privilege: "SELECT", granted: "true" },
      { table_name: "accounts", privilege: "SELECT" },
    ];

    for (const malformedRow of malformedRows) {
      const rows: unknown[] = structuredClone(applicationGrantCatalog);
      rows[0] = malformedRow;
      expect(
        restoreApplicationGrantMatrixMatches(rows, applicationGrantMatrix, [
          "knowledge_documents",
        ]),
      ).toBe(false);
    }
  });
});

describe("restore command diagnostics", () => {
  it("suppresses stderr from a failed role-provisioning psql invocation", async () => {
    const password = "fake-pass";
    const sqlPath = "/private/restore-roles.sql";
    let capturedProgram: string | undefined;
    let capturedArgs: string[] = [];
    let capturedCwd: string | undefined;
    const runTool = createRestoreToolRunner({
      cwd: "/synthetic/repository",
      execute: (program: string, args?: unknown, options?: unknown) => {
        capturedProgram = program;
        if (
          !Array.isArray(args) ||
          !args.every((arg: unknown) => typeof arg === "string")
        ) {
          throw new Error("tool arguments must be strings");
        }
        if (
          options === null ||
          typeof options !== "object" ||
          !("cwd" in options) ||
          typeof options.cwd !== "string"
        ) {
          throw new Error("tool working directory required");
        }
        capturedArgs = args;
        capturedCwd = options.cwd;
        throw Object.assign(new Error("psql exited unsuccessfully"), {
          stderr: `ERROR: failed SQL: CREATE ROLE app PASSWORD '${password}'`,
        });
      },
    });

    let failure: Error | undefined;
    try {
      await runRoleProvisioningCommand({
        runTool,
        pgBin: "/synthetic/postgres/bin",
        targetDatabase: "restore_target",
        socketDirectory: "/private/postgres-socket",
        port: 5432,
        sqlPath,
        env: { PATH: "/synthetic/postgres/bin" },
      });
    } catch (error) {
      if (error instanceof Error) failure = error;
    }

    expect(failure).toBeInstanceOf(Error);
    expect(failure?.message).toBe("psql failed (stderr suppressed)");
    expect(failure?.message).not.toContain(password);
    expect(failure?.cause).toBeUndefined();
    expect(capturedProgram).toBe("/synthetic/postgres/bin/psql");
    expect(capturedArgs).toContain(sqlPath);
    expect(capturedArgs.join(" ")).not.toContain(password);
    expect(capturedCwd).toBe("/synthetic/repository");
  });
});
