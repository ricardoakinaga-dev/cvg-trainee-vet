import { describe, expect, it, vi } from "vitest";
import { getTableName, type SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { auditEntries } from "./schema.js";
import type * as schema from "./schema.js";
import {
  assertCurriculumPublicationProvenance,
  assertStoredCurriculumPublicationProvenance,
  type CurriculumPublicationDecision,
  type CurriculumPublicationProvenanceInput,
} from "./curriculum-publication-provenance.js";

const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
function fixture() {
  const input: CurriculumPublicationProvenanceInput = {
    expectedScopeId: uuid(1),
    now: new Date("2026-10-03T12:00:00Z"),
    blueprint: {
      id: uuid(2),
      scopeId: uuid(1),
      moduleId: "M02",
      approvalDecisionId: uuid(4),
      approvedBy: uuid(6),
      approvedAt: new Date("2026-10-01T12:00:00Z"),
    },
    form: {
      id: uuid(3),
      scopeId: uuid(1),
      moduleId: "M02",
      blueprintVersionId: uuid(2),
      publicationDecisionId: uuid(5),
      publishedBy: uuid(7),
      publishedAt: new Date("2026-10-02T12:00:00Z"),
      status: "PUBLICADO",
    },
  };
  const decisions: CurriculumPublicationDecision[] = [
    {
      id: uuid(4),
      actorKind: "AUTHENTICATED",
      principalId: uuid(6),
      scopeId: uuid(1),
      action: "CURRICULUM_BLUEPRINT_APPROVED",
      resourceType: "curriculum_blueprint_version",
      resourceId: uuid(2),
      outcome: "SUCCESS",
      occurredAt: input.blueprint.approvedAt,
    },
    {
      id: uuid(5),
      actorKind: "AUTHENTICATED",
      principalId: uuid(7),
      scopeId: uuid(1),
      action: "CURRICULUM_FORM_PUBLISHED",
      resourceType: "curriculum_form_version",
      resourceId: uuid(3),
      outcome: "SUCCESS",
      occurredAt: input.form.publishedAt,
    },
  ];
  return { input, decisions };
}
const eventMutations: Readonly<
  Record<
    string,
    (row: CurriculumPublicationDecision) => CurriculumPublicationDecision
  >
> = {
  id: (row) => ({ ...row, id: uuid(99) }),
  actor: (row) => ({ ...row, actorKind: "ANONYMOUS" }),
  principal: (row) => ({ ...row, principalId: uuid(99) }),
  nullPrincipal: (row) => ({ ...row, principalId: null }),
  scope: (row) => ({ ...row, scopeId: uuid(99) }),
  nullScope: (row) => ({ ...row, scopeId: null }),
  action: (row) => ({ ...row, action: "SYNTHETIC_UNRELATED_ACTION" }),
  resourceType: (row) => ({ ...row, resourceType: "synthetic_technical_form" }),
  resourceId: (row) => ({ ...row, resourceId: uuid(99) }),
  nullResource: (row) => ({ ...row, resourceId: null }),
  outcome: (row) => ({ ...row, outcome: "FAILURE" }),
  denied: (row) => ({ ...row, outcome: "DENIED" }),
  time: (row) => ({
    ...row,
    occurredAt: new Date(row.occurredAt.getTime() + 1),
  }),
  invalidTime: (row) => ({ ...row, occurredAt: new Date(NaN) }),
};
describe("technical curriculum publication event correspondence", () => {
  it.each([false, true])(
    "accepts exact version-targeted events independent of order; reversed=%s",
    (reversed) => {
      const { input, decisions } = fixture();
      expect(() =>
        assertCurriculumPublicationProvenance(
          input,
          reversed ? decisions.reverse() : decisions,
        ),
      ).not.toThrow();
    },
  );
  it.each(
    [0, 1].flatMap((index) =>
      Object.keys(eventMutations).map((field) => [index, field] as const),
    ),
  )("rejects decision %s with wrong %s", (index, field) => {
    const { input, decisions } = fixture();
    decisions[index] = eventMutations[field]!(decisions[index]!);
    expect(() =>
      assertCurriculumPublicationProvenance(input, decisions),
    ).toThrow(expect.objectContaining({ code: "state_conflict" }));
  });
  it.each([0, 1])(
    "requires the exact referenced decision %s rather than another coherent event",
    (index) => {
      const { input, decisions } = fixture();
      decisions.splice(index, 1);
      expect(() =>
        assertCurriculumPublicationProvenance(input, decisions),
      ).toThrow();
    },
  );
  it("denies duplicated/extra decision rows instead of picking an arbitrary match", () => {
    const { input, decisions } = fixture();
    expect(() =>
      assertCurriculumPublicationProvenance(input, [
        ...decisions,
        decisions[0]!,
      ]),
    ).toThrow();
  });
  it.each([
    "scope",
    "formScope",
    "blueprintScope",
    "module",
    "binding",
    "sameDecision",
    "invalidId",
    "withdrawn",
    "future",
    "approvalAfterPublication",
    "invalidNow",
  ])("rejects snapshot %s", (kind) => {
    const { input, decisions } = fixture();
    const changed = {
      ...input,
      blueprint: { ...input.blueprint },
      form: { ...input.form },
    };
    if (kind === "scope") changed.expectedScopeId = uuid(99);
    if (kind === "formScope") changed.form.scopeId = uuid(99);
    if (kind === "blueprintScope") changed.blueprint.scopeId = uuid(99);
    if (kind === "module") changed.form.moduleId = "M03";
    if (kind === "binding") changed.form.blueprintVersionId = uuid(99);
    if (kind === "sameDecision")
      changed.form.publicationDecisionId = changed.blueprint.approvalDecisionId;
    if (kind === "invalidId") changed.blueprint.id = "not-a-uuid";
    if (kind === "withdrawn") changed.form.status = "RETIRADO";
    if (kind === "future") {
      changed.now = new Date("2026-09-30T12:00:00Z");
    }
    if (kind === "approvalAfterPublication") {
      changed.blueprint.approvedAt = new Date(
        changed.form.publishedAt.getTime() + 1,
      );
      decisions[0] = {
        ...decisions[0]!,
        occurredAt: changed.blueprint.approvedAt,
      };
    }
    if (kind === "invalidNow") changed.now = new Date(NaN);
    expect(() =>
      assertCurriculumPublicationProvenance(changed, decisions),
    ).toThrow();
  });
});

function database(
  rows: readonly CurriculumPublicationDecision[],
  failure?: "enable" | "read" | "precision",
) {
  const calls: { sql: string; params: unknown[] }[] = [];
  const projections: { sql: string; params: unknown[] }[] = [];
  const fullSelects: { sql: string; params: unknown[] }[] = [];
  const flags = { auditRead: "off", auditScopeId: uuid(99) };
  const dialect = new PgDialect();
  const db = {
    execute: vi.fn(async (query: SQL) => {
      const compiled = dialect.sqlToQuery(query);
      calls.push(compiled);
      if (compiled.sql.includes("current_setting")) return [{ ...flags }];
      if (compiled.sql.includes("set_config")) {
        flags.auditRead = String(compiled.params[0]);
        flags.auditScopeId = String(compiled.params[1]);
        if (failure === "enable" && flags.auditRead === "on")
          throw new Error("synthetic enable failure");
      }
      return [];
    }),
    select: vi.fn((selection: { exactSnapshotTime: SQL }) => {
      projections.push(dialect.sqlToQuery(selection.exactSnapshotTime));
      fullSelects.push(
        drizzle.mock().select(selection).from(auditEntries).toSQL(),
      );
      return {
        from(table: Parameters<typeof getTableName>[0]) {
          expect(getTableName(table)).toBe("audit_entries");
          return {
            where(query: SQL) {
              calls.push(dialect.sqlToQuery(query));
              expect(flags).toEqual({ auditRead: "on", auditScopeId: uuid(1) });
              if (failure === "read")
                throw new Error("synthetic audit read failure");
              return Promise.resolve(
                rows.map((row) => ({
                  ...row,
                  exactSnapshotTime: failure !== "precision",
                })),
              );
            },
          };
        },
      };
    }),
  };
  return {
    db: db as unknown as PostgresJsDatabase<typeof schema>,
    calls,
    projections,
    fullSelects,
    flags,
  };
}
describe("scoped audit proof reader preserves native transaction identity", () => {
  it("keeps outer audit columns qualified in the actual Drizzle single-table select", async () => {
    const { input, decisions } = fixture();
    const value = database(decisions);
    await assertStoredCurriculumPublicationProvenance(value.db, input);
    const query = value.fullSelects[0]!.sql;
    expect(query).toContain(
      'blueprint.approval_decision_id = "audit_entries"."id"',
    );
    expect(query).toContain(
      'blueprint.approved_at = "audit_entries"."occurred_at"',
    );
    expect(query).toContain(
      'form.publication_decision_id = "audit_entries"."id"',
    );
    expect(query).toContain(
      'form.published_at = "audit_entries"."occurred_at"',
    );
    expect(query).not.toContain('blueprint.approval_decision_id = "id"');
    expect(query).not.toContain('form.publication_decision_id = "id"');
  });
  it("reads only the two referenced IDs in exact scope, toggles only audit flags, restores previous flags", async () => {
    const { input, decisions } = fixture();
    const value = database(decisions);
    await expect(
      assertStoredCurriculumPublicationProvenance(value.db, input),
    ).resolves.toBeUndefined();
    expect(value.calls).toHaveLength(4);
    expect(value.flags).toEqual({ auditRead: "off", auditScopeId: uuid(99) });
    const select = value.calls[2]!;
    expect(select.sql).toContain('"audit_entries"."scope_id"');
    expect(select.params).toEqual([
      input.expectedScopeId,
      input.blueprint.approvalDecisionId,
      input.form.publicationDecisionId,
    ]);
    expect(value.projections[0]!.sql).toContain(
      'blueprint.approved_at = "audit_entries"."occurred_at"',
    );
    expect(value.projections[0]!.sql).toContain(
      'form.published_at = "audit_entries"."occurred_at"',
    );
    expect(value.projections[0]!.params).toEqual([
      input.blueprint.approvalDecisionId,
      input.blueprint.id,
      input.expectedScopeId,
      input.form.publicationDecisionId,
      input.form.id,
      input.expectedScopeId,
    ]);
    const configurations = value.calls.filter((c) =>
      c.sql.includes("set_config"),
    );
    expect(configurations).toHaveLength(2);
    for (const c of configurations) {
      expect(
        [...c.sql.matchAll(/set_config\('([^']+)'/gu)].map((m) => m[1]),
      ).toEqual(["cvg.audit_read", "cvg.audit_scope_id"]);
    }
  });
  it.each(["enable", "read", "precision"] as const)(
    "restores flags and denies %s failure",
    async (failure) => {
      const { input, decisions } = fixture();
      const value = database(decisions, failure);
      await expect(
        assertStoredCurriculumPublicationProvenance(value.db, input),
      ).rejects.toThrow();
      expect(value.flags).toEqual({ auditRead: "off", auditScopeId: uuid(99) });
    },
  );
  it("denies historical immutable rows with unrelated publication events and restores flags", async () => {
    const { input, decisions } = fixture();
    decisions[1] = eventMutations.action!(decisions[1]!);
    const value = database(decisions);
    await expect(
      assertStoredCurriculumPublicationProvenance(value.db, input),
    ).rejects.toMatchObject({ code: "state_conflict" });
    expect(value.flags).toEqual({ auditRead: "off", auditScopeId: uuid(99) });
  });
});
