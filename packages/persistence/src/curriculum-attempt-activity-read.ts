import { sql, type SQL } from "drizzle-orm";
import {
  deriveReflectionState,
  type ParticipantActivityState,
} from "@cvg/application";
import type { AttemptStatus } from "@cvg/domain";
import type { ActivityRowShape } from "./activity-row-types.js";
import {
  readCapturedAttemptItems,
  type CapturedAttemptItem,
} from "./curriculum-attempt-item-read.js";

type Executor = Readonly<{ execute(query: SQL): Promise<unknown> }>;
type Context = Readonly<{
  participantId: string;
  scopeId: string;
  activityId: string;
}>;
type Mapper = (
  rows: readonly ActivityRowShape[],
) => ParticipantActivityState | null;
type Metadata = Readonly<{
  activityId: string;
  scopeId: string;
  slug: string;
  title: string;
}>;

function records(value: unknown): readonly Record<string, unknown>[] {
  if (
    !Array.isArray(value) ||
    Array.from(
      { length: value.length },
      (_, index) =>
        !Object.hasOwn(value, index) ||
        !value[index] ||
        typeof value[index] !== "object" ||
        Array.isArray(value[index]),
    ).some(Boolean)
  ) {
    throw new TypeError("Invalid captured activity result");
  }
  return value as readonly Record<string, unknown>[];
}

/** Map an explicit whitelist; current content text and private fields never escape. */
export function capturedActivityRows(
  metadata: Metadata,
  items: readonly CapturedAttemptItem[],
): readonly ActivityRowShape[] | null {
  const result: ActivityRowShape[] = [];
  for (const item of items) {
    const publicItem = item.publicItem;
    if (
      !publicItem ||
      typeof publicItem !== "object" ||
      Array.isArray(publicItem)
    )
      return null;
    const projection = publicItem as Record<string, unknown>;
    if (
      projection.itemId !== item.itemId ||
      projection.ordinal !== item.ordinal ||
      typeof projection.title !== "string" ||
      typeof projection.text !== "string" ||
      typeof projection.kind !== "string" ||
      typeof projection.responseMode !== "string"
    )
      return null;
    result.push({
      ...metadata,
      itemId: item.itemId,
      ordinal: item.ordinal,
      contentStatus: "PUBLICADO",
      itemTitle: projection.title,
      text: projection.text,
      kind: projection.kind,
      responseMode: projection.responseMode,
      choices: projection.choices,
      selectionMode: projection.selectionMode,
    });
  }
  return Object.freeze(result);
}

/** Uses the caller's authorized transaction and holds the attempt through all reads. */
export async function readCapturedParticipantActivity(
  db: Executor,
  context: Context,
  mapRows: Mapper,
): Promise<ParticipantActivityState | null | undefined> {
  const [attempt] = records(
    await db.execute(sql`
    select a.id as "attemptId", a.status from attempts a
    join activity_assignments assignment on assignment.activity_id = a.activity_id
      and assignment.participant_id = a.participant_id
    where a.participant_id = ${context.participantId} and a.activity_id = ${context.activityId}
      and assignment.status in ('DISPONIVEL', 'EM_ANDAMENTO', 'EM_REFORCO')
    order by a.updated_at desc, a.version desc, a.id desc limit 1 for share of a
  `),
  );
  if (attempt?.attemptId === undefined) return undefined;
  if (
    typeof attempt.attemptId !== "string" ||
    typeof attempt.status !== "string"
  )
    return null;
  if (attempt.status === "ANULADA") return null;
  const items = await readCapturedAttemptItems(db, {
    ...context,
    attemptId: attempt.attemptId,
  });
  if (items == null) return items;
  const [metadata] = records(
    await db.execute(sql`
    select id as "activityId", scope_id as "scopeId", slug, title from learning_activities
    where id = ${context.activityId} and scope_id = ${context.scopeId} and status = 'PUBLISHED'
  `),
  );
  if (
    !metadata ||
    metadata.activityId !== context.activityId ||
    metadata.scopeId !== context.scopeId ||
    typeof metadata.slug !== "string" ||
    typeof metadata.title !== "string"
  )
    return null;
  const rows = capturedActivityRows(
    {
      activityId: context.activityId,
      scopeId: context.scopeId,
      slug: metadata.slug,
      title: metadata.title,
    },
    items,
  );
  if (rows === null) return null;
  const activity = mapRows(rows);
  if (activity === null) return null;
  const reflectionIds = activity.items
    .filter((item) => item.kind === "REFLEXAO")
    .map((item) => item.itemId);
  if (reflectionIds.length === 0) return activity;
  const saved = records(
    await db.execute(sql`
    select item_id as "itemId", response, saved_at as "savedAt" from answers
    where attempt_id = ${attempt.attemptId}
  `),
  );
  const reflectionAnswers = saved
    .filter(
      (row) =>
        typeof row.itemId === "string" && reflectionIds.includes(row.itemId),
    )
    .map((row) => {
      if (
        typeof row.itemId !== "string" ||
        typeof row.response !== "string" ||
        !(row.savedAt instanceof Date) ||
        !Number.isFinite(row.savedAt.getTime())
      )
        throw new TypeError("Invalid captured reflection answer");
      return {
        itemId: row.itemId,
        response: row.response,
        savedAt: row.savedAt.toISOString(),
      };
    });
  return Object.freeze({
    ...activity,
    reflection: deriveReflectionState({
      itemIds: reflectionIds,
      attemptStatus: attempt.status as AttemptStatus,
      answers: reflectionAnswers,
    }),
  });
}
