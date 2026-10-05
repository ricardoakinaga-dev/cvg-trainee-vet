import { sql, type SQL } from "drizzle-orm";
import {
  setCurriculumAttemptContext,
  type CurriculumAttemptContext,
} from "./curriculum-attempt-context.js";
import { setDatabaseSecurityContext } from "./security-context.js";

type Executor = Readonly<{ execute(query: SQL): Promise<unknown> }>;
type Row = Readonly<Record<string, unknown>>;
export type CapturedAttemptItem = Readonly<{
  itemId: string;
  ordinal: number;
  publicItem: unknown;
}>;

function rows(value: unknown): readonly Row[] {
  if (!Array.isArray(value))
    throw new TypeError("Invalid captured item result");
  return value.map((row: unknown) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new TypeError("Invalid captured item row");
    }
    return row as Row;
  });
}

/** undefined denotes an explicitly unbound legacy activity; null denies a broken binding. */
export async function readCapturedAttemptItemIds(
  db: Executor,
  context: CurriculumAttemptContext,
): Promise<readonly string[] | null | undefined> {
  const captured = await readCapturedAttemptItems(db, context);
  return captured == null
    ? captured
    : Object.freeze(captured.map((item) => item.itemId));
}

/** Internal frozen public projections only; private keys are never selected. */
export async function readCapturedAttemptItems(
  db: Executor,
  context: CurriculumAttemptContext,
): Promise<readonly CapturedAttemptItem[] | null | undefined> {
  try {
    await setCurriculumAttemptContext(db, context);
    const [binding] = rows(
      await db.execute(sql`
      select exists (
        select 1 from curriculum_activity_forms where activity_id = ${context.activityId}
      ) as "activityBound", af.attempt_id as "attemptId", af.form_version_id as "formVersionId"
      from (select 1) seed
      left join curriculum_attempt_forms af on af.attempt_id = ${context.attemptId}
        and af.participant_id = ${context.participantId} and af.scope_id = ${context.scopeId}
    `),
    );
    if (!binding) return null;
    if (binding.attemptId === null) {
      return binding.activityBound === false ? undefined : null;
    }
    if (
      binding.attemptId !== context.attemptId ||
      typeof binding.formVersionId !== "string"
    ) {
      return null;
    }
    await db.execute(sql`select pg_advisory_xact_lock_shared(
      hashtextextended(${`curriculum-form:${binding.formVersionId}`}, 0))`);
    const captured = rows(
      await db.execute(sql`
      select ai.item_id as "itemId", ai.ordinal, ai.public_item as "publicItem",
        jsonb_array_length(bp.manifest->'itemManifest') as "expectedCount"
      from curriculum_attempt_items ai
      join curriculum_attempt_forms af on af.attempt_id = ai.attempt_id
        and af.form_version_id = ai.form_version_id
      join curriculum_form_versions fv on fv.id = ai.form_version_id
      join curriculum_blueprint_versions bp on bp.id = fv.blueprint_version_id
      join content_versions cv on cv.id = ai.item_id
      where ai.attempt_id = ${context.attemptId}
        and af.participant_id = ${context.participantId} and af.scope_id = ${context.scopeId}
        and fv.status = 'PUBLICADO' and cv.status = 'PUBLICADO'
      order by ai.ordinal
      for share of cv
    `),
    );
    if (completeItemIds(captured) === null) return null;
    return Object.freeze(
      captured.map((row) =>
        Object.freeze({
          itemId: row.itemId as string,
          ordinal: row.ordinal as number,
          publicItem: row.publicItem,
        }),
      ),
    );
  } finally {
    // Ordinary answer reads must never inherit the internal key-reader identity.
    await setDatabaseSecurityContext(db, context);
  }
}

function completeItemIds(captured: readonly Row[]): readonly string[] | null {
  const expected = captured[0]?.expectedCount;
  if (
    typeof expected !== "number" ||
    !Number.isInteger(expected) ||
    expected < 1 ||
    expected > 100 ||
    captured.length !== expected
  )
    return null;
  const ids = new Set<string>();
  const ordinals = new Set<number>();
  for (const row of captured) {
    if (
      row.expectedCount !== expected ||
      typeof row.itemId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(
        row.itemId,
      ) ||
      typeof row.ordinal !== "number" ||
      !Number.isInteger(row.ordinal) ||
      row.ordinal < 1 ||
      row.ordinal > 100 ||
      ids.has(row.itemId) ||
      ordinals.has(row.ordinal)
    )
      return null;
    ids.add(row.itemId);
    ordinals.add(row.ordinal);
  }
  return Object.freeze([...ids]);
}
