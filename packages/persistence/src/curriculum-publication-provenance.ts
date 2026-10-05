import { and, eq, inArray, sql, type InferSelectModel } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { ApplicationError } from "@cvg/application";
import * as schema from "./schema.js";

export type CurriculumPublicationProvenanceInput = Readonly<{
  blueprint: Pick<
    InferSelectModel<typeof schema.curriculumBlueprintVersions>,
    | "id"
    | "scopeId"
    | "moduleId"
    | "approvalDecisionId"
    | "approvedBy"
    | "approvedAt"
  >;
  form: Pick<
    InferSelectModel<typeof schema.curriculumFormVersions>,
    | "id"
    | "scopeId"
    | "moduleId"
    | "blueprintVersionId"
    | "publicationDecisionId"
    | "publishedBy"
    | "publishedAt"
    | "status"
  >;
  expectedScopeId: string;
  now: Date;
}>;
export type CurriculumPublicationDecision = Pick<
  InferSelectModel<typeof schema.auditEntries>,
  | "id"
  | "actorKind"
  | "principalId"
  | "scopeId"
  | "action"
  | "resourceType"
  | "resourceId"
  | "outcome"
  | "occurredAt"
>;

function requireProvenance(condition: unknown): asserts condition {
  if (!condition)
    throw new ApplicationError(
      "state_conflict",
      "Curriculum publication provenance is unavailable",
    );
}
function validDate(value: unknown): value is Date {
  return value instanceof Date && Number.isFinite(value.getTime());
}

/** Internal technical snapshot proof; it conveys no clinical approval or public keys. */
export function assertCurriculumPublicationProvenance(
  input: CurriculumPublicationProvenanceInput,
  decisions: readonly CurriculumPublicationDecision[],
): void {
  const { blueprint, form, expectedScopeId, now } = input;
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
  requireProvenance(
    [
      expectedScopeId,
      blueprint.id,
      form.id,
      blueprint.approvalDecisionId,
      form.publicationDecisionId,
      blueprint.approvedBy,
      form.publishedBy,
    ].every((id) => typeof id === "string" && uuid.test(id)),
  );
  requireProvenance(
    blueprint.scopeId === expectedScopeId &&
      form.scopeId === expectedScopeId &&
      form.blueprintVersionId === blueprint.id &&
      form.moduleId === blueprint.moduleId &&
      form.status === "PUBLICADO",
  );
  requireProvenance(
    validDate(now) &&
      validDate(blueprint.approvedAt) &&
      validDate(form.publishedAt) &&
      blueprint.approvedAt <= form.publishedAt &&
      form.publishedAt <= now,
  );
  requireProvenance(
    Array.isArray(decisions) &&
      decisions.length === 2 &&
      blueprint.approvalDecisionId !== form.publicationDecisionId,
  );
  const expected = [
    {
      id: blueprint.approvalDecisionId,
      principalId: blueprint.approvedBy,
      action: "CURRICULUM_BLUEPRINT_APPROVED",
      resourceType: "curriculum_blueprint_version",
      resourceId: blueprint.id,
      at: blueprint.approvedAt,
    },
    {
      id: form.publicationDecisionId,
      principalId: form.publishedBy,
      action: "CURRICULUM_FORM_PUBLISHED",
      resourceType: "curriculum_form_version",
      resourceId: form.id,
      at: form.publishedAt,
    },
  ];
  for (const event of expected) {
    const matching = decisions.filter((row) => row.id === event.id);
    requireProvenance(matching.length === 1);
    const decision = matching[0]!;
    requireProvenance(
      decision.actorKind === "AUTHENTICATED" &&
        decision.principalId === event.principalId &&
        decision.scopeId === expectedScopeId &&
        decision.outcome === "SUCCESS" &&
        decision.action === event.action &&
        decision.resourceType === event.resourceType &&
        decision.resourceId === event.resourceId &&
        validDate(decision.occurredAt) &&
        decision.occurredAt.getTime() === event.at.getTime(),
    );
  }
}

export async function assertStoredCurriculumPublicationProvenance(
  db: PostgresJsDatabase<typeof schema>,
  input: CurriculumPublicationProvenanceInput,
): Promise<void> {
  const flags = await db.execute(sql`select
    current_setting('cvg.audit_read', true) as "auditRead",
    current_setting('cvg.audit_scope_id', true) as "auditScopeId"`);
  const previous = flags[0] as
    | Readonly<{ auditRead: string | null; auditScopeId: string | null }>
    | undefined;
  requireProvenance(
    previous &&
      (previous.auditRead === null || typeof previous.auditRead === "string") &&
      (previous.auditScopeId === null ||
        typeof previous.auditScopeId === "string"),
  );
  try {
    // Preserve participant and curriculum settings: ordinary audit context resets them.
    await db.execute(sql`select
      set_config('cvg.audit_read', ${"on"}, true),
      set_config('cvg.audit_scope_id', ${input.expectedScopeId}, true)`);
    const decisions = await db
      .select({
        id: schema.auditEntries.id,
        actorKind: schema.auditEntries.actorKind,
        principalId: schema.auditEntries.principalId,
        scopeId: schema.auditEntries.scopeId,
        action: schema.auditEntries.action,
        resourceType: schema.auditEntries.resourceType,
        resourceId: schema.auditEntries.resourceId,
        outcome: schema.auditEntries.outcome,
        occurredAt: schema.auditEntries.occurredAt,
        // PostgreSQL compares full timestamp precision; JS Date alone loses microseconds.
        exactSnapshotTime: sql<boolean>`(
        ("audit_entries"."id" = ${input.blueprint.approvalDecisionId}::uuid and exists (
          select 1 from curriculum_blueprint_versions blueprint
          where blueprint.id = ${input.blueprint.id}::uuid and blueprint.scope_id = ${input.expectedScopeId}::uuid
            and blueprint.approval_decision_id = "audit_entries"."id"
            and blueprint.approved_at = "audit_entries"."occurred_at"
        )) or ("audit_entries"."id" = ${input.form.publicationDecisionId}::uuid and exists (
          select 1 from curriculum_form_versions form
          where form.id = ${input.form.id}::uuid and form.scope_id = ${input.expectedScopeId}::uuid
            and form.publication_decision_id = "audit_entries"."id"
            and form.published_at = "audit_entries"."occurred_at"
        )))`,
      })
      .from(schema.auditEntries)
      .where(
        and(
          eq(schema.auditEntries.scopeId, input.expectedScopeId),
          inArray(schema.auditEntries.id, [
            input.blueprint.approvalDecisionId,
            input.form.publicationDecisionId,
          ]),
        ),
      );
    assertCurriculumPublicationProvenance(input, decisions);
    requireProvenance(
      decisions.every((decision) => decision.exactSnapshotTime === true),
    );
  } finally {
    await db.execute(sql`select
      set_config('cvg.audit_read', ${previous.auditRead ?? ""}, true),
      set_config('cvg.audit_scope_id', ${previous.auditScopeId ?? ""}, true)`);
  }
}
