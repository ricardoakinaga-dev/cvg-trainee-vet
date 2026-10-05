import { and, eq, inArray } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  ApplicationError,
  type TransactionSecurityContext,
} from "@cvg/application";
import type { AttemptState } from "@cvg/domain";
import * as schema from "./schema.js";
import { assertPublishedCurriculumCapture } from "./curriculum-attempt-capture-validation.js";
import { setCurriculumAttemptContext } from "./curriculum-attempt-context.js";
import { setDatabaseSecurityContext } from "./security-context.js";
import { sql } from "drizzle-orm";
import { assertStoredCurriculumPublicationProvenance } from "./curriculum-publication-provenance.js";

type Database = PostgresJsDatabase<typeof schema>;
function conflict(): never {
  throw new ApplicationError(
    "state_conflict",
    "Published curriculum capture is unavailable",
  );
}

async function capture(
  db: Database,
  state: AttemptState,
  scopeId: string,
): Promise<void> {
  const [activity] = await db
    .select()
    .from(schema.learningActivities)
    .where(
      and(
        eq(schema.learningActivities.id, state.activityId),
        eq(schema.learningActivities.scopeId, scopeId),
      ),
    )
    .for("update");
  if (!activity || activity.status !== "PUBLISHED") conflict();
  const [binding] = await db
    .select()
    .from(schema.curriculumActivityForms)
    .where(eq(schema.curriculumActivityForms.activityId, state.activityId));
  // Explicitly unbound legacy activities retain their existing behavior.
  if (!binding) return;
  await db.execute(
    sql`select pg_advisory_xact_lock_shared(hashtextextended(${`curriculum-form:${binding.formVersionId}`}, 0))`,
  );
  const [form] = await db
    .select()
    .from(schema.curriculumFormVersions)
    .where(eq(schema.curriculumFormVersions.id, binding.formVersionId));
  if (
    !form ||
    binding.scopeId !== scopeId ||
    binding.moduleId !== activity.moduleId
  )
    conflict();
  const [blueprint] = await db
    .select()
    .from(schema.curriculumBlueprintVersions)
    .where(eq(schema.curriculumBlueprintVersions.id, form.blueprintVersionId));
  if (!blueprint) conflict();
  const now = new Date();
  await assertStoredCurriculumPublicationProvenance(db, {
    form,
    blueprint,
    expectedScopeId: scopeId,
    now,
  });
  const items = await db
    .select()
    .from(schema.curriculumFormItems)
    .where(eq(schema.curriculumFormItems.formVersionId, form.id))
    .orderBy(schema.curriculumFormItems.ordinal);
  const activityItems = await db
    .select({
      contentVersionId: schema.learningActivityItems.contentVersionId,
      ordinal: schema.learningActivityItems.ordinal,
    })
    .from(schema.learningActivityItems)
    .where(eq(schema.learningActivityItems.activityId, activity.id))
    .for("share");
  if (items.length === 0 || items.length > 100) conflict();
  const contentVersions = await db
    .select()
    .from(schema.contentVersions)
    .where(
      inArray(
        schema.contentVersions.id,
        items.map((item) => item.contentVersionId),
      ),
    )
    .for("share");
  assertPublishedCurriculumCapture({
    form,
    blueprint,
    items,
    activity,
    activityItems,
    contentVersions,
    expectedScopeId: scopeId,
    now,
  });
  await db.insert(schema.curriculumAttemptForms).values({
    attemptId: state.attemptId,
    participantId: state.participantId,
    scopeId,
    moduleId: form.moduleId,
    formVersionId: form.id,
    capturedAt: now,
  });
  await db.insert(schema.curriculumAttemptItems).values(
    items.map((item) => ({
      attemptId: state.attemptId,
      itemId: item.contentVersionId,
      canonicalItemId: item.canonicalItemId,
      formVersionId: form.id,
      ordinal: item.ordinal,
      catalogItem: item.catalogItem,
      publicItem: item.publicItem,
    })),
  );
}

/** Must run in the SAME transaction as attempt insertion and idempotency. */
export async function capturePublishedCurriculumAttempt(
  db: Database,
  state: AttemptState,
  context: TransactionSecurityContext | undefined,
): Promise<void> {
  // An insert outside the authorized attempt transaction cannot prove a binding.
  if (
    !context?.participantId ||
    !context.scopeId ||
    context.participantId !== state.participantId
  )
    conflict();
  try {
    await setCurriculumAttemptContext(db, {
      participantId: state.participantId,
      scopeId: context.scopeId,
      activityId: state.activityId,
      attemptId: state.attemptId,
    });
    await capture(db, state, context.scopeId);
  } finally {
    await setDatabaseSecurityContext(db, context);
  }
}
