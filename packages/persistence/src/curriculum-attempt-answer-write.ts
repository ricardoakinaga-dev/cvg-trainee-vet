import { sql, type SQL } from "drizzle-orm";
import { ApplicationError } from "@cvg/application";
import { decodePersistedModuleAnswer } from "@cvg/curriculum";
import {
  readCapturedAttemptItems,
  type CapturedAttemptItem,
} from "./curriculum-attempt-item-read.js";
import type { CurriculumAttemptContext } from "./curriculum-attempt-context.js";

type Executor = Readonly<{ execute(query: SQL): Promise<unknown> }>;

/** Frozen membership does not substitute for current assignment authorization. */
export async function readCapturedAnswerItem(
  db: Executor,
  context: CurriculumAttemptContext,
  itemId: string,
): Promise<CapturedAttemptItem | null | undefined> {
  const items = await readCapturedAttemptItems(db, context);
  if (items == null) return items;
  const rows = await db.execute(sql`
    select activity.id from learning_activities activity
    join activity_assignments assignment on assignment.activity_id = activity.id
    join learning_assignments learning on learning.id = assignment.learning_assignment_id
      and learning.participant_id = assignment.participant_id
      and learning.scope_id = activity.scope_id and learning.module_id = activity.module_id
    where activity.id = ${context.activityId} and activity.scope_id = ${context.scopeId}
      and activity.status = 'PUBLISHED' and assignment.participant_id = ${context.participantId}
      and assignment.status in ('DISPONIVEL', 'EM_ANDAMENTO', 'EM_REFORCO')
  `);
  if (!Array.isArray(rows) || rows.length !== 1) return null;
  const item = items.find((value) => value.itemId === itemId);
  if (item === undefined) return null;
  const projection = record(item.publicItem);
  return projection &&
    typeof projection.kind === "string" &&
    ["QUESTAO", "CASO", "REFLEXAO"].includes(projection.kind)
    ? item
    : null;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Decode only the public frozen response contract, never answer keys or today's content. */
export function assertCapturedAnswerResponse(
  item: CapturedAttemptItem,
  response: string,
): void {
  const projection = record(item.publicItem);
  if (
    !projection ||
    projection.itemId !== item.itemId ||
    (projection.responseMode !== "TEXT" && projection.responseMode !== "CHOICE")
  ) {
    throw new ApplicationError(
      "state_conflict",
      "Frozen answer projection is invalid",
    );
  }
  const choices = Array.isArray(projection.choices)
    ? projection.choices.map((choice: unknown) => {
        const value = record(choice);
        if (!value || typeof value.id !== "string")
          throw new ApplicationError(
            "state_conflict",
            "Frozen answer choices are invalid",
          );
        return { id: value.id };
      })
    : undefined;
  if (
    projection.responseMode === "CHOICE" &&
    projection.selectionMode !== "SINGLE" &&
    projection.selectionMode !== "MULTIPLE"
  ) {
    throw new ApplicationError(
      "state_conflict",
      "Frozen selection mode is missing",
    );
  }
  try {
    decodePersistedModuleAnswer(
      {
        itemId: item.itemId,
        responseMode: projection.responseMode,
        ...(projection.selectionMode === "SINGLE" ||
        projection.selectionMode === "MULTIPLE"
          ? { selectionMode: projection.selectionMode }
          : {}),
        ...(choices ? { choices } : {}),
      },
      response,
    );
  } catch {
    throw new ApplicationError(
      "validation_error",
      "Answer does not match its published response contract",
    );
  }
}
