import { randomUUID, createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { getTableConfig, type PgTable } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  curriculumModuleBlueprintVersions,
  curriculumModuleObligationManifests,
  curriculumAssignmentObligations,
  curriculumModuleCompletionReceipts,
} from "../../packages/persistence/src/schema.js";

// Technical SQL-admin fixtures only. No authorized staff, clinical publication,
// original-INICIAR producer, native attempt witness, D102 grade or consumer proof.
const names = [
  "curriculum_module_blueprint_versions",
  "curriculum_module_obligation_manifests",
  "curriculum_assignment_obligations",
  "curriculum_module_completion_receipts",
] as const;
type Table = (typeof names)[number];
type Sql = ReturnType<typeof drizzle>["$client"];
type TransactionSql = Parameters<Parameters<Sql["begin"]>[1]>[0];
type Row = Record<string, string | number | null>;
type Query = Pick<Sql, "unsafe">;
type Fixture = ReturnType<typeof fixture>;
const phase = process.env.CVG_R59_PHASE;
let app: Sql, admin: Sql, f: Fixture;
const stamp = "2026-09-01T12:00:00.123456Z";
const manifestStamp = "2026-09-01T12:00:01.123456Z";
const boundStamp = "2026-09-01T12:00:02.123456Z";
const completedStamp = "2026-09-01T12:00:03.123456Z";
const metadata: readonly PgTable[] = [
  curriculumModuleBlueprintVersions,
  curriculumModuleObligationManifests,
  curriculumAssignmentObligations,
  curriculumModuleCompletionReceipts,
];

function fixture() {
  const participant = randomUUID(),
    actor = randomUUID(),
    outsider = randomUUID();
  const scope = randomUUID(),
    foreignScope = randomUUID(),
    assignment = randomUUID();
  const blueprint = randomUUID(),
    manifest = randomUUID(),
    request = randomUUID();
  const correlation = randomUUID(),
    blueprintAudit = randomUUID(),
    manifestAudit = randomUUID(),
    receiptAudit = randomUUID();
  const snapshot = {
    questionCountsBySession: [11, 6, 8, 6],
    questionTotal: 31,
    openResponseCount: 2,
    objectiveIds: ["synthetic-objective"],
    itemManifest: Array.from({ length: 33 }, (_, index) => ({
      itemId: `synthetic-${index + 1}`,
      objectiveId: "synthetic-objective",
      responseMode: index < 31 ? "CHOICE" : "TEXT",
      critical: index === 0,
      sessionId: `M02-S${index < 11 ? 1 : index < 17 ? 2 : index < 25 ? 3 : 4}`,
    })),
  };
  const obligations = [
    {
      id: "synthetic-obligation",
      activityId: randomUUID(),
      formVersionId: randomUUID(),
      formVersion: 1,
      blueprintVersionId: blueprint,
      blueprintVersion: 1,
      evidenceKind: "CURRICULUM_ATTEMPT",
      items: snapshot.itemManifest.map((item, index) => ({
        canonicalItemId: item.itemId,
        contentVersionId: randomUUID(),
        contentId: randomUUID(),
        contentVersion: 1,
        ordinal: index + 1,
      })),
    },
  ];
  const blueprintRow: Row = {
    id: blueprint,
    blueprint_id: "synthetic-whole-module",
    version: 1,
    scope_id: scope,
    module_id: "M02",
    approval_decision_id: blueprintAudit,
    approved_by: actor,
    approved_at: stamp,
    snapshot: JSON.stringify(snapshot),
  };
  const manifestRow: Row = {
    id: manifest,
    version: 1,
    scope_id: scope,
    module_id: "M02",
    blueprint_version_id: blueprint,
    blueprint_version: 1,
    approval_decision_id: manifestAudit,
    approved_by: actor,
    approved_at: manifestStamp,
    obligations: JSON.stringify(obligations),
  };
  const binding: Row = {
    assignment_id: assignment,
    participant_id: participant,
    scope_id: scope,
    module_id: "M02",
    manifest_id: manifest,
    manifest_version: 1,
    blueprint_version_id: blueprint,
    blueprint_version: 1,
    bound_at: boundStamp,
    assignment_version: 1,
  };
  const identity = { ...binding };
  delete identity.bound_at;
  delete identity.assignment_version;
  const witnesses = [
    {
      activityId: obligations[0]!.activityId,
      attemptId: randomUUID(),
      attemptVersion: 2,
      formVersionId: obligations[0]!.formVersionId,
      formVersion: 1,
      correctedAt: boundStamp,
      assessmentResultId: randomUUID(),
    },
  ];
  const receipt: Row = {
    ...identity,
    completed_assignment_version: 2,
    completed_at: completedStamp,
    actor_id: actor,
    request_id: request,
    correlation_id: correlation,
    audit_entry_id: receiptAudit,
    witnesses: JSON.stringify(witnesses),
  };
  return {
    participant,
    actor,
    outsider,
    scope,
    foreignScope,
    assignment,
    blueprint,
    manifest,
    request,
    correlation,
    blueprintAudit,
    manifestAudit,
    receiptAudit,
    snapshot,
    obligations,
    witnesses,
    blueprintRow,
    manifestRow,
    binding,
    receipt,
  };
}

async function insert(tx: Query, table: string, row: Row) {
  // Identifiers are fixed local names/keys; all values are bound SQL parameters.
  if (
    !/^[a-z_]+$/u.test(table) ||
    Object.keys(row).some((key) => !/^[a-z_]+$/u.test(key))
  )
    throw new Error("Invalid internal fixture identifier");
  const keys = Object.keys(row);
  await tx.unsafe(
    `insert into "${table}" (${keys.map((key) => `"${key}"`).join(",")}) values (${keys.map((_, i) => `$${i + 1}`).join(",")})`,
    keys.map((key) => row[key] ?? null),
  );
}

function audit(
  which: "blueprint" | "manifest" | "receipt",
  patch: Row = {},
): Row {
  const defaults =
    which === "blueprint"
      ? [
          f.blueprintAudit,
          "CURRICULUM_MODULE_BLUEPRINT_APPROVED",
          "curriculum_module_blueprint_version",
          f.blueprint,
          stamp,
        ]
      : which === "manifest"
        ? [
            f.manifestAudit,
            "CURRICULUM_MODULE_OBLIGATIONS_APPROVED",
            "curriculum_module_obligation_manifest",
            f.manifest,
            manifestStamp,
          ]
        : [
            f.receiptAudit,
            "MODULE_COMPLETION_RECORDED",
            "curriculum_module_completion_receipt",
            f.assignment,
            completedStamp,
          ];
  return {
    id: defaults[0]!,
    actor_kind: "AUTHENTICATED",
    principal_id: f.actor,
    action: defaults[1]!,
    resource_type: defaults[2]!,
    resource_id: defaults[3]!,
    scope_id: f.scope,
    outcome: "SUCCESS",
    request_id: f.request,
    correlation_id: f.correlation,
    occurred_at: defaults[4]!,
    ...patch,
  };
}

async function seedParents(
  which: "none" | "blueprint" | "manifest" | "binding" = "manifest",
) {
  f = fixture();
  await admin.begin(async (tx) => {
    for (const id of [f.participant, f.actor, f.outsider])
      await insert(tx, "accounts", {
        id,
        professional_email: `${id}@example.invalid`,
        status: "ACTIVE",
      });
    await insert(tx, "account_invitations", {
      account_id: f.participant,
      token_hash: createHash("sha256").update(randomUUID()).digest("hex"),
      roles: '["PARTICIPANT"]',
      scopes: JSON.stringify([f.scope]),
      expires_at: "2030-01-01T00:00:00Z",
      accepted_at: stamp,
      created_by: f.actor,
    });
    await insert(tx, "learning_assignments", {
      id: f.assignment,
      participant_id: f.participant,
      scope_id: f.scope,
      module_id: "M02",
      available_at: stamp,
      status: "EM_ANDAMENTO",
      version: 1,
    });
    if (which === "none") return;
    await insert(tx, "audit_entries", audit("blueprint"));
    await insert(tx, names[0], f.blueprintRow);
    if (which === "blueprint") return;
    await insert(tx, "audit_entries", audit("manifest"));
    await insert(tx, names[1], f.manifestRow);
    if (which === "binding") await insert(tx, names[2], f.binding);
  });
}

async function context(
  tx: TransactionSql,
  participant: string = f.participant,
  scope: string = f.scope,
  auditScope: string = scope,
) {
  await tx`select set_config('cvg.participant_id',${participant},true), set_config('cvg.scope_id',${scope},true), set_config('cvg.audit_read','on',true), set_config('cvg.audit_scope_id',${auditScope},true)`;
}

async function count(table: Table, id: string) {
  const key = table === names[0] || table === names[1] ? "id" : "assignment_id";
  const rows = await admin.unsafe<{ count: number }[]>(
    `select count(*)::int as count from "${table}" where "${key}"=$1`,
    [id],
  );
  return rows[0]!.count;
}

async function denied(
  table: Table,
  row: Row,
  codes = ["23514"],
  participant: string = f.participant,
  scope: string = f.scope,
  auditScope: string = scope,
) {
  const id = String(row.id ?? row.assignment_id),
    before = await count(table, id);
  let caught: unknown;
  try {
    await app.begin(async (tx) => {
      await context(tx, participant, scope, auditScope);
      await insert(tx, table, row);
    });
  } catch (error) {
    caught = error;
  }
  expect(caught, "Native INSERT must fail").toBeDefined();
  expect(codes).toContain((caught as { code?: string }).code);
  expect(
    await count(table, id),
    "Rejected transaction must leave no new row",
  ).toBe(before);
}

async function capabilities() {
  for (const [db, expected] of [
    [app, [false, false, false, false, false]],
    [admin, [false, true, false, false, false]],
  ] as const) {
    const rows =
      await db`select current_setting('server_version_num') as version, current_user=session_user as direct, rolsuper,rolbypassrls,rolcreaterole,rolcreatedb,rolreplication from pg_roles where rolname=current_user`;
    expect(rows[0]!.version).toBe("180004");
    expect(rows[0]!.direct).toBe(true);
    expect([
      rows[0]!.rolsuper,
      rows[0]!.rolbypassrls,
      rows[0]!.rolcreaterole,
      rows[0]!.rolcreatedb,
      rows[0]!.rolreplication,
    ]).toEqual(expected);
  }
}

function lifecycle() {
  beforeAll(async () => {
    const appUrl = process.env.CVG_TEST_DATABASE_URL,
      adminUrl = process.env.CVG_TEST_ADMIN_DATABASE_URL;
    if (
      !appUrl ||
      !adminUrl ||
      appUrl === adminUrl ||
      !process.env.CVG_R59_RUN_DIRECTORY
    )
      throw new Error("Owned native checkpoint runner required");
    const directory = process.env.CVG_R59_RUN_DIRECTORY;
    const owned = JSON.parse(
      readFileSync(directory + "/cluster-ownership.json", "utf8"),
    ) as { directory: string; port: number; postmasterPidMatches: boolean };
    const checkpoint = JSON.parse(
      readFileSync(directory + "/checkpoint.json", "utf8"),
    ) as { status: string; phase: string };
    expect(checkpoint).toMatchObject({ status: "APPROVED", phase });
    expect(["red58", "green59"]).toContain(phase);
    expect(owned.directory).toBe(directory + "/cluster");
    expect(owned.postmasterPidMatches).toBe(true);
    for (const url of [appUrl, adminUrl]) {
      const parsed = new URL(url);
      expect(parsed.hostname).toBe("127.0.0.1");
      expect(Number(parsed.port)).toBe(owned.port);
      expect(parsed.pathname).toMatch(/^\/cvg_r59_[a-f0-9]{32}$/u);
    }
    app = drizzle({
      connection: { url: appUrl, max: 1, connect_timeout: 5 },
    }).$client;
    admin = drizzle({
      connection: { url: adminUrl, max: 1, connect_timeout: 5 },
    }).$client;
    await capabilities();
  });
  afterAll(async () => {
    await Promise.all([app?.end({ timeout: 5 }), admin?.end({ timeout: 5 })]);
  });
}

function nativeMetadata() {
  it.each(
    metadata.map((table) => [getTableConfig(table).name, table] as const),
  )(
    "matches live Drizzle columns, composite FKs, checks, indexes and FORCE RLS for %s",
    async (_name, table) => {
      const expected = getTableConfig(table);
      const relation =
        await admin`select relrowsecurity,relforcerowsecurity,pg_get_userbyid(relowner) as owner from pg_class where oid=${expected.name}::regclass`;
      expect(relation[0]).toMatchObject({
        relrowsecurity: true,
        relforcerowsecurity: true,
        owner: "cvg_r42_migrator",
      });
      const columns =
        await admin`select attname as name,attnotnull as required,format_type(atttypid,atttypmod) as type from pg_attribute where attrelid=${expected.name}::regclass and attnum>0 and not attisdropped order by attnum`;
      expect([...columns]).toEqual(
        expected.columns.map((column) => ({
          name: column.name,
          required: column.notNull,
          type: column.getSQLType(),
        })),
      );
      const checks =
        await admin`select conname as name from pg_constraint where conrelid=${expected.name}::regclass and contype='c' order by conname`;
      expect(checks.map((row) => row.name)).toEqual(
        expected.checks.map((check) => check.name).sort(),
      );
      const foreignKeys =
        await admin`select conname as name,confrelid::regclass::text as target,confdeltype as deletion,array(select attname from unnest(conkey) with ordinality k(n,pos) join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.n order by pos) as columns,array(select attname from unnest(confkey) with ordinality k(n,pos) join pg_attribute a on a.attrelid=c.confrelid and a.attnum=k.n order by pos) as foreign_columns from pg_constraint c where conrelid=${expected.name}::regclass and contype='f' order by conname`;
      const wanted = expected.foreignKeys
        .map((key) => {
          const ref = key.reference();
          return {
            name: key.getName().slice(0, 63),
            target: getTableConfig(ref.foreignTable).name,
            deletion: "r",
            columns: ref.columns.map((column) => column.name),
            foreign_columns: ref.foreignColumns.map((column) => column.name),
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
      expect([...foreignKeys]).toEqual(wanted);
      const indexes =
        await admin`select ci.relname as name,i.indisunique as unique,array(select a.attname from unnest(i.indkey) with ordinality k(n,pos) join pg_attribute a on a.attrelid=i.indrelid and a.attnum=k.n order by pos) as columns from pg_index i join pg_class ci on ci.oid=i.indexrelid where i.indrelid=${expected.name}::regclass and not i.indisprimary order by ci.relname`;
      expect([...indexes]).toEqual(
        expected.indexes
          .map((index) => ({
            name: index.config.name,
            unique: index.config.unique,
            columns: index.config.columns.map((column) =>
              "name" in column ? column.name : "UNSUPPORTED_EXPRESSION",
            ),
          }))
          .sort((a, b) => String(a.name).localeCompare(String(b.name))),
      );
      const policies =
        await admin`select cmd from pg_policies where schemaname='public' and tablename=${expected.name} order by cmd`;
      expect(policies.map((row) => row.cmd)).toEqual(["INSERT", "SELECT"]);
    },
  );
}

function readsAndWrites() {
  it("default-denies every table and hides foreign participant/scope; unbound reads become exact captured version reads", async () => {
    await seedParents("binding");
    for (const [participant, scope] of [
      ["", ""],
      [f.participant, f.foreignScope],
      [f.outsider, f.scope],
    ] as const)
      await app.begin(async (tx) => {
        await context(tx, participant, scope);
        for (const name of names)
          expect((await tx.unsafe(`select * from "${name}"`)).length).toBe(0);
      });
    await app.begin(async (tx) => {
      await context(tx);
      for (const name of names.slice(0, 3))
        expect(
          (
            await tx.unsafe(
              `select * from "${name}" where ${name === names[2] ? "assignment_id" : "id"}=$1`,
              [
                name === names[0]
                  ? f.blueprint
                  : name === names[1]
                    ? f.manifest
                    : f.assignment,
              ],
            )
          ).length,
        ).toBe(1);
    });
    await admin`update learning_assignments set version=2 where id=${f.assignment}`;
    await insert(admin, "audit_entries", audit("receipt"));
    await app.begin(async (tx) => {
      await context(tx);
      await insert(tx, names[3], f.receipt);
    });
    expect(await count(names[3], f.assignment)).toBe(1);
    const stored =
      await admin`select to_char(completed_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as exact,witnesses from curriculum_module_completion_receipts where assignment_id=${f.assignment}`;
    expect(stored[0]!.exact).toBe(completedStamp);
    expect(stored[0]!.witnesses).toEqual(f.witnesses);
    await app.begin(async (tx) => {
      await context(tx);
      expect(
        (
          await tx`select * from curriculum_module_completion_receipts where assignment_id=${f.assignment}`
        ).length,
      ).toBe(1);
    });
    for (const [participant, scope] of [
      ["", ""],
      [f.outsider, f.scope],
      [f.participant, f.foreignScope],
    ] as const)
      await app.begin(async (tx) => {
        await context(tx, participant, scope);
        expect(
          (
            await tx`select * from curriculum_module_completion_receipts where assignment_id=${f.assignment}`
          ).length,
        ).toBe(0);
      });
  });
  it("app scoped empty-participant publisher inserts exact approvals, then participant binds without privilege elevation", async () => {
    await seedParents("none");
    await insert(admin, "audit_entries", audit("blueprint"));
    await insert(admin, "audit_entries", audit("manifest"));
    await app.begin(async (tx) => {
      await context(tx, "", f.scope);
      await insert(tx, names[0], f.blueprintRow);
      await insert(tx, names[1], f.manifestRow);
    });
    await app.begin(async (tx) => {
      await context(tx);
      expect(
        (
          await tx`select * from curriculum_module_obligation_manifests where id=${f.manifest}`
        ).length,
      ).toBe(1);
      await insert(tx, names[2], f.binding);
    });
    expect(await count(names[2], f.assignment)).toBe(1);
  });
  it.each(names)(
    "denies context-free native INSERT into %s and rolls back",
    async (table) => {
      await seedParents(
        table === names[0]
          ? "none"
          : table === names[1]
            ? "blueprint"
            : table === names[2]
              ? "manifest"
              : "binding",
      );
      if (table === names[0] || table === names[1])
        await insert(
          admin,
          "audit_entries",
          audit(table === names[0] ? "blueprint" : "manifest"),
        );
      if (table === names[3]) {
        await admin`update learning_assignments set version=2 where id=${f.assignment}`;
        await insert(admin, "audit_entries", audit("receipt"));
      }
      const rows = [f.blueprintRow, f.manifestRow, f.binding, f.receipt];
      await denied(
        table,
        rows[names.indexOf(table)]!,
        ["23514", "42501"],
        "",
        "",
      );
    },
  );
  it("denies participant publisher and wrong-scope publisher", async () => {
    await seedParents("none");
    await insert(admin, "audit_entries", audit("blueprint"));
    await denied(names[0], f.blueprintRow, ["42501"], f.participant, f.scope);
    await denied(
      names[0],
      f.blueprintRow,
      ["23514", "42501"],
      "",
      f.foreignScope,
    );
  });
}

const forgeries: readonly [string, () => Row][] = [
  ["action", () => ({ action: "SYNTHETIC_WRONG_EVENT" })],
  ["resource", () => ({ resource_type: "synthetic_wrong_resource" })],
  ["resource id", () => ({ resource_id: randomUUID() })],
  ["actor", () => ({ principal_id: f.outsider })],
  ["scope", () => ({ scope_id: f.foreignScope })],
  ["outcome", () => ({ outcome: "DENIED" })],
  ["anonymous", () => ({ actor_kind: "ANONYMOUS", principal_id: null })],
  ["microsecond", () => ({ occurred_at: stamp.replace("123456", "123457") })],
];

function approvalCases() {
  for (const which of ["blueprint", "manifest"] as const)
    it.each(forgeries)(
      `${which} approval rejects forged %s and leaves no row`,
      async (_name, patch) => {
        await seedParents(which === "blueprint" ? "none" : "blueprint");
        const forged = patch();
        if (_name === "microsecond")
          forged.occurred_at = (
            which === "blueprint" ? stamp : manifestStamp
          ).replace("123456", "123457");
        await insert(admin, "audit_entries", audit(which, forged));
        await denied(
          which === "blueprint" ? names[0] : names[1],
          which === "blueprint" ? f.blueprintRow : f.manifestRow,
          ["23514"],
          "",
          f.scope,
        );
      },
    );
  it("requires caller audit-read context and rejects future/infinite approval times", async () => {
    await seedParents("none");
    await insert(admin, "audit_entries", audit("blueprint"));
    await denied(
      names[0],
      f.blueprintRow,
      ["23514"],
      "",
      f.scope,
      f.foreignScope,
    );
    for (const at of ["2099-01-01T00:00:00Z", "infinity"])
      await denied(
        names[0],
        { ...f.blueprintRow, approved_at: at },
        ["23514"],
        "",
        f.scope,
      );
  });
}

function bindingCases() {
  it.each([
    "scope_id",
    "module_id",
    "blueprint_version_id",
    "blueprint_version",
  ])("manifest denies foreign blueprint composite identity %s", async (key) => {
    await seedParents("blueprint");
    await insert(admin, "audit_entries", audit("manifest"));
    const value =
      key === "module_id"
        ? "M03"
        : key === "blueprint_version"
          ? 2
          : randomUUID();
    await denied(
      names[1],
      { ...f.manifestRow, [key]: value },
      ["23514", "23503"],
      "",
      f.scope,
    );
  });
  const patches: readonly [string, () => Row][] = [
    ["assignment", () => ({ assignment_id: randomUUID() })],
    ["participant", () => ({ participant_id: f.outsider })],
    ["scope", () => ({ scope_id: f.foreignScope })],
    ["module", () => ({ module_id: "M03" })],
    ["manifest id", () => ({ manifest_id: randomUUID() })],
    ["manifest version", () => ({ manifest_version: 2 })],
    ["blueprint id", () => ({ blueprint_version_id: randomUUID() })],
    ["numeric blueprint version", () => ({ blueprint_version: 2 })],
    ["stale assignment version", () => ({ assignment_version: 2 })],
    ["zero assignment version", () => ({ assignment_version: 0 })],
    ["before approval", () => ({ bound_at: stamp })],
    ["future", () => ({ bound_at: "2099-01-01T00:00:00Z" })],
  ];
  it.each(patches)(
    "binding denies foreign context/version %s",
    async (_name, patch) => {
      await seedParents();
      await denied(names[2], { ...f.binding, ...patch() }, [
        "23514",
        "23503",
        "42501",
      ]);
    },
  );
  it("rejects duplicate binding and later inventory cannot replace the captured immutable identity", async () => {
    await seedParents("binding");
    await denied(names[2], f.binding, ["23505"]);
    const next = randomUUID(),
      decision = randomUUID();
    await insert(admin, "audit_entries", {
      ...audit("manifest"),
      id: decision,
      resource_id: next,
    });
    await insert(admin, names[1], {
      ...f.manifestRow,
      id: next,
      version: 2,
      approval_decision_id: decision,
    });
    await app.begin(async (tx) => {
      await context(tx);
      expect(
        (
          await tx`select * from curriculum_module_obligation_manifests where id=${next}`
        ).length,
      ).toBe(0);
    });
    await denied(
      names[2],
      { ...f.binding, manifest_id: next, manifest_version: 2 },
      ["23514", "23505"],
    );
  });
}

function jsonCases() {
  it.each([
    "[]",
    "{}",
    "null",
    "[{}]",
    '[{"evidenceKind":"NONE","items":[{}]}]',
    '[{"evidenceKind":true,"items":[{}]}]',
  ])("denies unsupported/empty obligation JSON %s", async (obligations) => {
    await seedParents("blueprint");
    await insert(admin, "audit_entries", audit("manifest"));
    await denied(
      names[1],
      { ...f.manifestRow, obligations },
      ["23514", "22023"],
      "",
      f.scope,
    );
  });
  it.each(["{}", "null", '{"questionCountsBySession":[],"itemManifest":[]}'])(
    "denies empty/missing blueprint JSON %s",
    async (snapshot) => {
      await seedParents("none");
      await insert(admin, "audit_entries", audit("blueprint"));
      await denied(
        names[0],
        { ...f.blueprintRow, snapshot },
        ["23514", "22023"],
        "",
        f.scope,
      );
    },
  );
  it.each(["[]", "{}", "null", "[{}]", '[{"status":"CONCLUIDO"}]'])(
    "denies empty/unknown witness JSON %s",
    async (witnesses) => {
      await receiptParents();
      await denied(names[3], { ...f.receipt, witnesses }, ["23514", "22023"]);
    },
  );
  it("rejects malformed assessment result UUID; JSON optionality does not prove automatic-only admissibility", async () => {
    await receiptParents();
    await denied(names[3], {
      ...f.receipt,
      witnesses: JSON.stringify([
        { ...f.witnesses[0], assessmentResultId: "invalid" },
      ]),
    });
    const automatic: Omit<
      (typeof f.witnesses)[number],
      "assessmentResultId"
    > & { assessmentResultId?: string } = { ...f.witnesses[0]! };
    delete automatic.assessmentResultId;
    await app.begin(async (tx) => {
      await context(tx);
      await insert(tx, names[3], {
        ...f.receipt,
        witnesses: JSON.stringify([automatic]),
      });
    });
    expect(await count(names[3], f.assignment)).toBe(1);
  });
}

async function receiptParents(patch: Row = {}) {
  await seedParents("binding");
  await admin`update learning_assignments set version=2 where id=${f.assignment}`;
  await insert(admin, "audit_entries", audit("receipt", patch));
}

function receiptCases() {
  it.each([
    ...forgeries,
    ["request", () => ({ request_id: randomUUID() })],
    ["correlation", () => ({ correlation_id: randomUUID() })],
  ] as readonly [string, () => Row][])(
    "receipt denies audit provenance %s with rollback",
    async (name, patch) => {
      await seedParents("binding");
      await admin`update learning_assignments set version=2 where id=${f.assignment}`;
      const forged = patch();
      if (name === "microsecond")
        forged.occurred_at = completedStamp.replace("123456", "123457");
      await insert(admin, "audit_entries", audit("receipt", forged));
      await denied(names[3], f.receipt);
    },
  );
  it.each([
    "assignment_id",
    "participant_id",
    "scope_id",
    "module_id",
    "manifest_id",
    "manifest_version",
    "blueprint_version_id",
    "blueprint_version",
    "completed_assignment_version",
  ])("receipt denies foreign captured tuple %s", async (key) => {
    await receiptParents();
    const value =
      key === "module_id" ? "M03" : key.endsWith("version") ? 3 : randomUUID();
    await denied(names[3], { ...f.receipt, [key]: value }, [
      "23514",
      "23503",
      "42501",
    ]);
  });
  it("requires a binding and advancing assignment version, with finite ordered timestamp", async () => {
    await seedParents();
    await insert(admin, "audit_entries", audit("receipt"));
    await denied(names[3], f.receipt);
    await insert(admin, names[2], f.binding);
    await denied(names[3], { ...f.receipt, completed_assignment_version: 1 });
    await admin`update learning_assignments set version=2 where id=${f.assignment}`;
    for (const at of [stamp, "infinity", "2099-01-01T00:00:00Z"])
      await denied(names[3], { ...f.receipt, completed_at: at });
  });
  it("rolls back an inserted binding and receipt plus audit when the transaction aborts", async () => {
    await seedParents();
    const before =
      await admin`select count(*)::int as count from audit_entries where id=${f.receiptAudit}`;
    await expect(
      admin.begin(async (tx) => {
        await insert(tx, names[2], f.binding);
        await tx`update learning_assignments set version=2 where id=${f.assignment}`;
        await insert(tx, "audit_entries", audit("receipt"));
        await insert(tx, names[3], f.receipt);
        throw new Error("synthetic transaction abort");
      }),
    ).rejects.toThrow("synthetic transaction abort");
    expect(await count(names[2], f.assignment)).toBe(0);
    expect(await count(names[3], f.assignment)).toBe(0);
    expect(
      (
        await admin`select count(*)::int as count from audit_entries where id=${f.receiptAudit}`
      )[0]!.count,
    ).toBe(before[0]!.count);
    expect(
      (
        await admin`select version from learning_assignments where id=${f.assignment}`
      )[0]!.version,
    ).toBe(1);
  });
}

function immutabilityCases() {
  it.each(names)(
    "append-only %s rejects admin UPDATE/DELETE despite BYPASSRLS and app cannot mutate",
    async (table) => {
      await receiptParents();
      await insert(admin, names[3], f.receipt);
      const key =
          table === names[0] || table === names[1] ? "id" : "assignment_id",
        id =
          table === names[0]
            ? f.blueprint
            : table === names[1]
              ? f.manifest
              : f.assignment;
      const before = await admin.unsafe(
        `select row_to_json(t) as row from "${table}" t where "${key}"=$1`,
        [id],
      );
      for (const command of [
        `update "${table}" set "${key}"="${key}" where "${key}"=$1`,
        `delete from "${table}" where "${key}"=$1`,
      ]) {
        await expect(admin.unsafe(command, [id])).rejects.toMatchObject({
          code: "P0001",
        });
        await expect(
          app.begin(async (tx) => {
            await context(tx);
            await tx.unsafe(command, [id]);
          }),
        ).rejects.toMatchObject({ code: "42501" });
        expect([
          ...(await admin.unsafe(
            `select row_to_json(t) as row from "${table}" t where "${key}"=$1`,
            [id],
          )),
        ]).toEqual([...before]);
      }
      const privileges =
        await app`select has_table_privilege(current_user,${table},'TRUNCATE') as truncate`;
      expect(privileges[0]!.truncate).toBe(false);
    },
  );
}

function defineGreen() {
  lifecycle();
  beforeEach(() => {
    f = fixture();
  });
  it(
    "enforces actual PostgreSQL 18.4 and distinct direct least-privilege app/admin roles",
    capabilities,
  );
  nativeMetadata();
  readsAndWrites();
  approvalCases();
  bindingCases();
  jsonCases();
  receiptCases();
  immutabilityCases();
}

if (phase === "red58") {
  describe("R59 native baseline58 RED", () => {
    lifecycle();
    it("requires native curriculum_module_blueprint_versions storage (baseline lacks it)", async () => {
      try {
        await app`select id from curriculum_module_blueprint_versions limit 0`;
      } catch (error) {
        const code = (error as { code?: string }).code;
        writeFileSync(
          process.env.CVG_R59_RUN_DIRECTORY + "/native-baseline-error.json",
          JSON.stringify({ code, table: names[0] }),
          { flag: "wx" },
        );
        throw error;
      }
    });
  });
} else {
  // Reachable by the official integration glob; ordinary non-native runs opt out.
  describe.skipIf(process.env.CVG_RUN_LIVE_DB_TESTS !== "true")(
    "R59 proposed module obligation native storage",
    defineGreen,
  );
}
