import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { getTableConfig, PgDialect, type PgTable } from "drizzle-orm/pg-core";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { ApprovedModuleObligationCaptureInput } from "./module-obligation-validation.js";
import * as existing from "./schema.js";
import { createSchema } from "./module-obligation-schema.js";

const root = new URL("../../../", import.meta.url);
const migrations = new URL("packages/persistence/drizzle/", root);
const source = readFileSync(
  new URL("0058_module_obligations.sql", migrations),
  "utf8",
);
const journal = JSON.parse(
  readFileSync(new URL("meta/_journal.json", migrations), "utf8"),
) as {
  entries: {
    idx: number;
    version: string;
    when: number;
    tag: string;
    breakpoints: boolean;
  }[];
};
const storage = createSchema(
  existing.accounts,
  existing.auditEntries,
  existing.learningAssignments,
);
const tables = Object.values(storage);
const dialect = new PgDialect();
const blueprint = "curriculum_module_blueprint_versions";
const manifest = "curriculum_module_obligation_manifests";
const binding = "curriculum_assignment_obligations";
const receipt = "curriculum_module_completion_receipts";
const context = ["assignment_id", "participant_id", "scope_id", "module_id"];
const manifestIdentity = [
  "id",
  "version",
  "blueprint_version_id",
  "blueprint_version",
  "scope_id",
  "module_id",
];
const boundIdentity = [
  ...context,
  "manifest_id",
  "manifest_version",
  "blueprint_version_id",
  "blueprint_version",
];
const expectedColumns: Record<string, readonly string[]> = {
  [blueprint]: [
    "id",
    "blueprint_id",
    "version",
    "scope_id",
    "module_id",
    "approval_decision_id",
    "approved_by",
    "approved_at",
    "snapshot",
  ],
  [manifest]: [
    "id",
    "version",
    "scope_id",
    "module_id",
    "blueprint_version_id",
    "blueprint_version",
    "approval_decision_id",
    "approved_by",
    "approved_at",
    "obligations",
  ],
  [binding]: [
    ...context,
    "manifest_id",
    "manifest_version",
    "blueprint_version_id",
    "blueprint_version",
    "bound_at",
    "assignment_version",
  ],
  [receipt]: [
    ...boundIdentity,
    "completed_assignment_version",
    "completed_at",
    "actor_id",
    "request_id",
    "correlation_id",
    "audit_entry_id",
    "witnesses",
  ],
};
function names(values: readonly unknown[]): string[] {
  return values.map((value) => {
    if (
      !value ||
      typeof value !== "object" ||
      !("name" in value) ||
      typeof value.name !== "string"
    )
      throw new Error("Expected native column identity");
    return value.name;
  });
}
function table(name: string): PgTable {
  const result = tables.find((t) => getTableConfig(t).name === name);
  if (!result) throw new Error("Required private table missing");
  return result;
}
function fk(name: string, target: string, columns: readonly string[]) {
  const match = getTableConfig(table(name)).foreignKeys.find((key) => {
    const ref = key.reference();
    return (
      getTableConfig(ref.foreignTable).name === target &&
      JSON.stringify(names(ref.columns)) === JSON.stringify(columns)
    );
  });
  expect(match, `FK ${name} -> ${target} with full identity`).toBeDefined();
  return match!.reference();
}
function uniform(sql: string): string {
  return sql
    .replace(/--[^\n]*/gu, "")
    .replaceAll('"', "")
    .replace(/\s+/gu, " ")
    .trim();
}
function body(sql: string, name: string): string {
  const result = new RegExp(
    `CREATE FUNCTION ${name}\\(\\) RETURNS trigger[\\s\\S]*?AS \\$\\$([\\s\\S]*?)\\$\\$`,
    "iu",
  ).exec(sql);
  if (!result) throw new Error("Missing provenance guard " + name);
  return uniform(result[1]!);
}
// Static contract admission only, not a PostgreSQL parser/executor or RLS proof.
function admitMigration(sql: string): void {
  const normalized = uniform(sql);
  for (const name of [blueprint, manifest, binding, receipt]) {
    for (const mode of ["ENABLE", "FORCE"]) {
      if (
        !normalized.includes(`ALTER TABLE ${name} ${mode} ROW LEVEL SECURITY`)
      )
        throw new Error("RLS missing " + name);
    }
    if (
      !normalized.includes(
        `ON ${name} FOR EACH ROW EXECUTE FUNCTION cvg_prevent_audit_mutation()`,
      )
    )
      throw new Error("Immutability missing " + name);
  }
  const policies = [
    ...normalized.matchAll(/CREATE POLICY (\w+) ON (\w+) FOR (\w+) (.*?);/gu),
  ];
  if (policies.length !== 8) throw new Error("Unexpected policy inventory");
  for (const match of policies) {
    if (![blueprint, manifest, binding, receipt].includes(match[2]!))
      throw new Error("Foreign policy target");
    if (!["SELECT", "INSERT"].includes(match[3]!))
      throw new Error("Mutating policy broadened");
    if (!match[4]!.includes("current_setting('cvg.scope_id', true)"))
      throw new Error("Scope missing");
    if (!match[4]!.includes("current_setting('cvg.participant_id', true)"))
      throw new Error("Participant fence missing");
    if (match[3] === "INSERT" && !match[4]!.includes("WITH CHECK"))
      throw new Error("Insert fence missing");
  }
  const allowed = new Set([
    "cvg.scope_id",
    "cvg.participant_id",
    "cvg.audit_read",
    "cvg.audit_scope_id",
  ]);
  for (const match of normalized.matchAll(/current_setting\('([^']+)'/gu))
    if (!allowed.has(match[1]!)) throw new Error("New GUC");
  if (
    /SECURITY DEFINER|set_config\(|FOR ALL|(?:^|;)\s*TRUNCATE|INSERT INTO|UPDATE public\.|DELETE FROM/iu.test(
      normalized,
    )
  )
    throw new Error("Unrequested privilege or backfill");
}

describe("R56 private module storage — structural contracts; native NOT_EXECUTED", () => {
  it("keeps the frozen full snapshot exactly compatible with sealed M1", () => {
    type Expected =
      ApprovedModuleObligationCaptureInput["blueprint"]["snapshot"] &
        Pick<ApprovedModuleObligationCaptureInput["blueprint"], "itemManifest">;
    expectTypeOf<
      typeof storage.curriculumModuleBlueprintVersions.$inferSelect.snapshot
    >().toEqualTypeOf<Expected>();
  });
  it("keeps obligations exactly compatible with sealed M1 membership and evidence types", () => {
    expectTypeOf<
      typeof storage.curriculumModuleObligationManifests.$inferSelect.obligations
    >().toEqualTypeOf<
      ApprovedModuleObligationCaptureInput["manifest"]["obligations"]
    >();
  });
  it.each([blueprint, manifest, binding, receipt])(
    "defines exact nonnullable columns for %s",
    (name) => {
      const cfg = getTableConfig(table(name));
      expect(cfg.columns.map((c) => c.name)).toEqual(expectedColumns[name]);
      expect(cfg.columns.every((c) => c.notNull)).toBe(true);
      expect(cfg.columns.filter((c) => c.primary).map((c) => c.name)).toEqual([
        name === blueprint || name === manifest ? "id" : "assignment_id",
      ]);
    },
  );
  it("builds the assignment identity index with all four columns, preserving existing participant/module uniqueness", () => {
    const identity = getTableConfig(existing.learningAssignments).indexes.find(
      (i) => i.config.name === "learning_assignments_identity_idx",
    );
    expect(identity).toBeDefined();
    expect(names(identity!.config.columns)).toEqual([
      "id",
      "participant_id",
      "scope_id",
      "module_id",
    ]);
    expect(
      getTableConfig(existing.learningAssignments).indexes.find(
        (i) =>
          i.config.name === "learning_assignments_participant_scope_module_idx",
      ),
    ).toBeDefined();
    expect(
      getTableConfig(existing.learningAssignments).indexes.find(
        (i) => i.config.name === "learning_assignments_identity_idx",
      ),
    ).toBeDefined();
  });
  it("exports the four tables from private schema.ts using the factory", () => {
    const values = Object.values(existing).filter(
      (value) => value && typeof value === "object",
    );
    for (const name of [blueprint, manifest, binding, receipt]) {
      expect(
        values.some((value) => {
          try {
            return getTableConfig(value as PgTable).name === name;
          } catch {
            return false;
          }
        }),
      ).toBe(true);
    }
  });
  it("binds blueprint identity and numeric version in the same scope/module", () => {
    const ref = fk(manifest, blueprint, [
      "blueprint_version_id",
      "blueprint_version",
      "scope_id",
      "module_id",
    ]);
    expect(names(ref.foreignColumns)).toEqual([
      "id",
      "version",
      "scope_id",
      "module_id",
    ]);
  });
  it("ties original binding to the actual participant/scope/module assignment", () => {
    const ref = fk(binding, "learning_assignments", context);
    expect(names(ref.foreignColumns)).toEqual([
      "id",
      "participant_id",
      "scope_id",
      "module_id",
    ]);
  });
  it("binds manifest numeric version and full blueprint identity without draft fallback", () => {
    const ref = fk(binding, manifest, [
      "manifest_id",
      "manifest_version",
      "blueprint_version_id",
      "blueprint_version",
      "scope_id",
      "module_id",
    ]);
    expect(names(ref.foreignColumns)).toEqual(manifestIdentity);
  });
  it("ties receipt to the same immutable binding including numeric blueprint version", () => {
    expect(names(fk(receipt, binding, boundIdentity).foreignColumns)).toEqual(
      boundIdentity,
    );
  });
  it.each(["participant_id", "scope_id", "module_id"])(
    "FK column pairs reject a swapped %s rather than only checking assignment ID",
    (changed) => {
      const ref = fk(binding, "learning_assignments", context);
      const child: Record<string, string> = {
        assignment_id: "synthetic-assignment",
        participant_id: "synthetic-participant",
        scope_id: "synthetic-scope",
        module_id: "M02",
      };
      const parent: Record<string, string> = {
        id: child.assignment_id!,
        participant_id: child.participant_id!,
        scope_id: child.scope_id!,
        module_id: child.module_id!,
      };
      const matches = () =>
        ref.columns.every(
          (c, i) => child[c.name] === parent[ref.foreignColumns[i]!.name],
        );
      expect(matches()).toBe(true);
      child[changed] = "foreign-context";
      expect(matches()).toBe(false);
    },
  );
  it.each([blueprint, manifest, binding, receipt])(
    "uses restrictive FK deletion on %s",
    (name) => {
      const keys = getTableConfig(table(name)).foreignKeys;
      expect(keys.length).toBeGreaterThan(0);
      expect(keys.every((key) => key.onDelete === "restrict")).toBe(true);
    },
  );
  it("anchors approval actors/events and completion audit to native identity tables", () => {
    for (const name of [blueprint, manifest]) {
      fk(name, "accounts", ["approved_by"]);
      fk(name, "audit_entries", ["approval_decision_id"]);
    }
    fk(receipt, "accounts", ["actor_id"]);
    fk(receipt, "audit_entries", ["audit_entry_id"]);
  });
  it.each([blueprint, manifest, binding, receipt])(
    "matches actual migration columns against Drizzle metadata for %s",
    (name) => {
      const match = new RegExp(
        `CREATE TABLE "?${name}"? \\(([\\s\\S]*?)\\n\\);`,
        "u",
      ).exec(source);
      expect(match).not.toBeNull();
      const declared = [
        ...match![1]!.matchAll(
          /^\s*"(\w+)"\s+(?:uuid|text|integer|jsonb|timestamptz)/gmu,
        ),
      ].map((m) => m[1]);
      expect(declared).toEqual(
        getTableConfig(table(name)).columns.map((c) => c.name),
      );
    },
  );
  it.each([
    [blueprint, "module_blueprint_snapshot_check"],
    [manifest, "module_obligations_json_check"],
    [receipt, "module_completion_witnesses_check"],
  ])("has a nonempty bounded JSON guard for %s", (name, checkName) => {
    const guard = getTableConfig(table(name!)).checks.find(
      (c) => c.name === checkName,
    );
    expect(guard).toBeDefined();
    const sql = dialect.sqlToQuery(guard!.value).sql;
    expect(sql).toContain("jsonb_typeof");
    expect(sql).toContain("jsonb_array_length");
    expect(sql).toContain("100");
  });
  it("loads the forward-only migration through the official Drizzle migration reader", () => {
    const entry = journal.entries.at(-1)!;
    expect(entry).toMatchObject({
      idx: 58,
      version: "7",
      tag: "0058_module_obligations",
      breakpoints: true,
    });
    expect(entry.when).toBeGreaterThan(journal.entries.at(-2)!.when);
    const loaded = readMigrationFiles({
      migrationsFolder: migrations.pathname,
    });
    expect(loaded.length).toBe(59);
    expect(loaded.at(-1)!.sql.join("--> statement-breakpoint")).toBe(source);
    expect(loaded.at(-1)!.hash).toBe(
      createHash("sha256").update(source).digest("hex"),
    );
  });
  it("admits only scoped append-only RLS and existing GUCs", () => {
    expect(() => admitMigration(source)).not.toThrow();
  });
  it("guards unsupported evidence types and optional native assessment result UUID syntax", () => {
    const obligation = getTableConfig(table(manifest)).checks.find(
      (c) => c.name === "module_obligations_json_check",
    )!;
    const witness = getTableConfig(table(receipt)).checks.find(
      (c) => c.name === "module_completion_witnesses_check",
    )!;
    expect(dialect.sqlToQuery(obligation.value).sql).toContain(
      '@.evidenceKind.type() != "string"',
    );
    expect(dialect.sqlToQuery(witness.value).sql).toContain(
      "@.assessmentResultId like_regex",
    );
  });
  it("keeps every Drizzle check expression identical to the actual migration DDL", () => {
    for (const native of tables)
      for (const guard of getTableConfig(native).checks) {
        expect(uniform(source)).toContain(
          `CONSTRAINT ${guard.name} CHECK (${uniform(dialect.sqlToQuery(guard.value).sql)})`,
        );
      }
  });
  it.each([blueprint, manifest])(
    "allows scoped pre-binding validation on %s without requiring the not-yet-inserted binding",
    (name) => {
      const policy = new RegExp(
        `CREATE POLICY \\w+ ON ${name} FOR SELECT USING ([\\s\\S]*?);`,
        "u",
      ).exec(uniform(source));
      expect(policy?.[1]).toContain("FROM learning_assignments assigned");
      expect(policy?.[1]).toContain(
        "assigned.participant_id::text = current_setting('cvg.participant_id', true)",
      );
      expect(policy?.[1]).toContain(
        "NOT EXISTS ( SELECT 1 FROM curriculum_assignment_obligations captured",
      );
      expect(policy?.[1]).toContain("assigned.scope_id");
      expect(policy?.[1]).toContain("assigned.module_id");
    },
  );
  it.each(["UPDATE", "DELETE", "ALL"])(
    "the admission guard rejects a broadened %s policy",
    (operation) => {
      const changed = source.replace(
        /FOR INSERT WITH CHECK/u,
        `FOR ${operation} WITH CHECK`,
      );
      expect(changed).not.toBe(source);
      expect(() => admitMigration(changed)).toThrow();
    },
  );
  it("the admission guard rejects removing FORCE RLS", () => {
    const changed = source.replace(
      `ALTER TABLE "${receipt}" FORCE ROW LEVEL SECURITY;`,
      "",
    );
    expect(changed).not.toBe(source);
    expect(() => admitMigration(changed)).toThrow();
  });
  it.each([
    [
      "cvg_guard_module_blueprint_approval",
      "CURRICULUM_MODULE_BLUEPRINT_APPROVED",
      "curriculum_module_blueprint_version",
    ],
    [
      "cvg_guard_module_manifest_approval",
      "CURRICULUM_MODULE_OBLIGATIONS_APPROVED",
      "curriculum_module_obligation_manifest",
    ],
  ])(
    "approval guard %s checks native audit correspondence at full timestamp precision",
    (name, action, type) => {
      const guard = body(source, name!);
      for (const clause of [
        "decision.id = NEW.approval_decision_id",
        "decision.actor_kind = 'AUTHENTICATED'",
        "decision.outcome = 'SUCCESS'",
        "decision.principal_id = NEW.approved_by",
        "decision.scope_id = NEW.scope_id",
        `decision.action = '${action}'`,
        `decision.resource_type = '${type}'`,
        "decision.resource_id = NEW.id::text",
        "decision.occurred_at = NEW.approved_at",
        "isfinite(NEW.approved_at)",
        "clock_timestamp()",
      ])
        expect(guard).toContain(clause);
      expect(source).not.toContain("date_trunc");
    },
  );
  it("receipt provenance binds audit actor/request/correlation and exact completedAt without trusting legacy status", () => {
    const guard = body(source, "cvg_guard_module_completion_receipt");
    for (const clause of [
      "decision.id = NEW.audit_entry_id",
      "decision.actor_kind = 'AUTHENTICATED'",
      "decision.outcome = 'SUCCESS'",
      "decision.principal_id = NEW.actor_id",
      "decision.scope_id = NEW.scope_id",
      "decision.request_id = NEW.request_id",
      "decision.correlation_id = NEW.correlation_id",
      "decision.action = 'MODULE_COMPLETION_RECORDED'",
      "decision.resource_type = 'curriculum_module_completion_receipt'",
      "decision.resource_id = NEW.assignment_id::text",
      "decision.occurred_at = NEW.completed_at",
      "NEW.completed_assignment_version > binding.assignment_version",
      "binding.bound_at <= NEW.completed_at",
    ])
      expect(guard).toContain(clause);
    expect(guard).not.toMatch(/status\s*=\s*'CONCLUIDO'/u);
  });
  it("preserves compatible generic append-only trigger without changing historical SQL", () => {
    const old = readFileSync(
      new URL("0002_lovely_madelyne_pryor.sql", migrations),
      "utf8",
    );
    expect(old).toContain(
      "CREATE FUNCTION cvg_prevent_audit_mutation() RETURNS trigger",
    );
    expect(
      source.match(/EXECUTE FUNCTION cvg_prevent_audit_mutation\(\)/gu),
    ).toHaveLength(4);
  });
  it("publishes in scoped staff context only and permits participant binding reads without audit metadata projection", () => {
    const normalized = uniform(source);
    for (const name of [blueprint, manifest]) {
      const insert = new RegExp(
        `CREATE POLICY \\w+ ON ${name} FOR INSERT WITH CHECK \\(([\\s\\S]*?)\\);`,
        "u",
      ).exec(normalized);
      expect(insert?.[1]).toContain(
        "current_setting('cvg.participant_id', true), '') = ''",
      );
      expect(insert?.[1]).toContain("current_setting('cvg.scope_id', true)");
    }
    expect(normalized).toContain("assessmentResultId");
    expect(normalized).toContain(
      "SECURITY INVOKER SET search_path = public, pg_temp",
    );
  });
});
