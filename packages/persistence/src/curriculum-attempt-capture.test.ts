import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName, type SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { AttemptState } from "@cvg/domain";
import type * as schema from "./schema.js";
import { capturePublishedCurriculumAttempt } from "./curriculum-attempt-capture.js";

const validated = vi.hoisted(() => vi.fn());
vi.mock("./curriculum-attempt-capture-validation.js", () => ({
  assertPublishedCurriculumCapture: validated,
}));
const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const participantId = uuid(1),
  scopeId = uuid(2),
  activityId = uuid(3),
  formId = uuid(4),
  blueprintId = uuid(5),
  approvalDecisionId = uuid(6),
  publicationDecisionId = uuid(7),
  publisherId = uuid(8);
const state: AttemptState = {
  participantId,
  activityId,
  attemptId: uuid(9),
  status: "CRIADA",
  version: 0,
};
const approvedAt = new Date("2026-10-01T12:00:00Z"),
  publishedAt = new Date("2026-10-02T12:00:00Z");
type CaptureVariation =
  | "publicationAction"
  | "publicationResource"
  | "approvalAction"
  | "approvalActor"
  | "missingAudit"
  | "readFailure"
  | "unbound";
function captureDecisions(wrong?: CaptureVariation) {
  return [
    {
      id: approvalDecisionId,
      actorKind: "AUTHENTICATED",
      principalId: wrong === "approvalActor" ? participantId : publisherId,
      scopeId,
      action:
        wrong === "approvalAction"
          ? "UNRELATED"
          : "CURRICULUM_BLUEPRINT_APPROVED",
      resourceType: "curriculum_blueprint_version",
      resourceId: blueprintId,
      outcome: "SUCCESS",
      occurredAt: approvedAt,
      exactSnapshotTime: true,
    },
    {
      id: publicationDecisionId,
      actorKind: "AUTHENTICATED",
      principalId: publisherId,
      scopeId,
      action:
        wrong === "publicationAction"
          ? "UNRELATED"
          : "CURRICULUM_FORM_PUBLISHED",
      resourceType: "curriculum_form_version",
      resourceId: wrong === "publicationResource" ? blueprintId : formId,
      outcome: "SUCCESS",
      occurredAt: publishedAt,
      exactSnapshotTime: true,
    },
  ];
}
function database(wrong?: CaptureVariation) {
  const tables: Record<string, readonly unknown[]> = {
    learning_activities: [
      { id: activityId, scopeId, moduleId: "M02", status: "PUBLISHED" },
    ],
    curriculum_activity_forms:
      wrong === "unbound"
        ? []
        : [{ activityId, scopeId, moduleId: "M02", formVersionId: formId }],
    curriculum_form_versions: [
      {
        id: formId,
        scopeId,
        moduleId: "M02",
        blueprintVersionId: blueprintId,
        publicationDecisionId,
        publishedBy: publisherId,
        publishedAt,
        status: "PUBLICADO",
      },
    ],
    curriculum_blueprint_versions: [
      {
        id: blueprintId,
        scopeId,
        moduleId: "M02",
        approvalDecisionId,
        approvedBy: publisherId,
        approvedAt,
      },
    ],
    curriculum_form_items: [
      {
        contentVersionId: uuid(10),
        canonicalItemId: "synthetic-item",
        ordinal: 1,
        catalogItem: {},
        publicItem: {},
      },
    ],
    learning_activity_items: [],
    content_versions: [],
    audit_entries: wrong === "missingAudit" ? [] : captureDecisions(wrong),
  };
  const configurations: { sql: string; params: unknown[] }[] = [];
  const context = new Map<string, string>();
  const dialect = new PgDialect();
  const inserted: string[] = [];
  const db = {
    execute: vi.fn(async (query: SQL) => {
      const compiled = dialect.sqlToQuery(query);
      configurations.push(compiled);
      if (compiled.sql.includes("current_setting"))
        return [
          {
            auditRead: context.get("cvg.audit_read") ?? "",
            auditScopeId: context.get("cvg.audit_scope_id") ?? "",
          },
        ];
      const names = [
        ...compiled.sql.matchAll(/set_config\('([^']+)',\s*(\$\d+|'[^']*')/gu),
      ];
      for (const m of names)
        context.set(
          m[1]!,
          m[2]!.startsWith("$")
            ? String(compiled.params[Number(m[2]!.slice(1)) - 1])
            : m[2]!.slice(1, -1),
        );
      return [];
    }),
    select: vi.fn(() => {
      let table = "";
      const builder = {
        from(value: Parameters<typeof getTableName>[0]) {
          table = getTableName(value);
          return builder;
        },
        where() {
          return builder;
        },
        orderBy() {
          return builder;
        },
        for() {
          return builder;
        },
        then(
          resolve: (rows: readonly unknown[]) => unknown,
          reject: (error: unknown) => unknown,
        ) {
          if (table === "audit_entries") {
            expect(context.get("cvg.curriculum_activity_id")).toBe(activityId);
            expect(context.get("cvg.curriculum_attempt_id")).toBe(
              state.attemptId,
            );
            expect(context.get("cvg.participant_id")).toBe(participantId);
            expect(context.get("cvg.audit_read")).toBe("on");
            if (wrong === "readFailure")
              return Promise.reject(new Error("synthetic audit failure")).then(
                resolve,
                reject,
              );
          }
          return Promise.resolve(tables[table] ?? []).then(resolve, reject);
        },
      };
      return builder;
    }),
    insert: vi.fn((table: Parameters<typeof getTableName>[0]) => ({
      values: async () => {
        inserted.push(getTableName(table));
      },
    })),
  };
  return {
    db: db as unknown as PostgresJsDatabase<typeof schema>,
    inserted,
    context,
    configurations,
  };
}
beforeEach(() => vi.clearAllMocks());
describe("capture refuses invalid immutable publication provenance", () => {
  it("captures only after exact blueprint approval and form publication correspond to immutable audit decisions", async () => {
    const value = database();
    await expect(
      capturePublishedCurriculumAttempt(value.db, state, {
        participantId,
        scopeId,
      }),
    ).resolves.toBeUndefined();
    expect(value.inserted).toEqual([
      "curriculum_attempt_forms",
      "curriculum_attempt_items",
    ]);
    expect(validated).toHaveBeenCalledOnce();
    expect(
      value.configurations.some((q) =>
        q.sql.includes("current_setting('cvg.audit_read'"),
      ),
    ).toBe(true);
    expect(value.context.get("cvg.audit_read")).toBe("");
    expect(value.context.get("cvg.curriculum_attempt_id")).toBe("");
    expect(value.context.get("cvg.participant_id")).toBe(participantId);
  });
  it.each([
    "publicationAction",
    "publicationResource",
    "approvalAction",
    "approvalActor",
    "missingAudit",
  ] as const)("rejects %s before inserting a frozen capture", async (wrong) => {
    const value = database(wrong);
    await expect(
      capturePublishedCurriculumAttempt(value.db, state, {
        participantId,
        scopeId,
      }),
    ).rejects.toMatchObject({ code: "state_conflict" });
    expect(value.inserted).toEqual([]);
    expect(value.context.get("cvg.audit_read")).toBe("");
    expect(value.context.get("cvg.audit_scope_id")).toBe("");
    expect(value.context.get("cvg.curriculum_attempt_id")).toBe("");
  });
  it("restores audit and ordinary context after an audit read error", async () => {
    const value = database("readFailure");
    await expect(
      capturePublishedCurriculumAttempt(value.db, state, {
        participantId,
        scopeId,
      }),
    ).rejects.toThrow("synthetic audit failure");
    expect(value.inserted).toEqual([]);
    expect(value.context.get("cvg.audit_read")).toBe("");
    expect(value.context.get("cvg.audit_scope_id")).toBe("");
    expect(value.context.get("cvg.curriculum_attempt_id")).toBe("");
  });
  it("retains explicitly unbound legacy capture without an audit reader or native insert", async () => {
    const value = database("unbound");
    await expect(
      capturePublishedCurriculumAttempt(value.db, state, {
        participantId,
        scopeId,
      }),
    ).resolves.toBeUndefined();
    expect(value.inserted).toEqual([]);
    expect(
      value.configurations.some((q) =>
        q.sql.includes("current_setting('cvg.audit_read'"),
      ),
    ).toBe(false);
  });
});
