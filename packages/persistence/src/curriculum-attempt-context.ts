import { sql, type SQL } from "drizzle-orm";
import { setDatabaseSecurityContext } from "./security-context.js";

type Executor = Readonly<{ execute(query: SQL): Promise<unknown> }>;
export type CurriculumAttemptContext = Readonly<{
  participantId: string;
  scopeId: string;
  activityId: string;
  attemptId: string;
}>;

/** Internal transaction identity; never populated from HTTP body flags. */
export async function setCurriculumAttemptContext(
  executor: Executor,
  context: CurriculumAttemptContext,
): Promise<void> {
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
  for (const field of [
    "participantId",
    "scopeId",
    "activityId",
    "attemptId",
  ] as const) {
    const value = context[field];
    if (typeof value !== "string" || !uuid.test(value))
      throw new TypeError(`${field} must be a UUID`);
  }
  await setDatabaseSecurityContext(executor, context);
  await executor.execute(sql`select
    set_config('cvg.curriculum_activity_id', ${context.activityId}, true),
    set_config('cvg.curriculum_attempt_id', ${context.attemptId}, true)`);
}
