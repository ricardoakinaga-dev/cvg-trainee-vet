import { and, asc, eq } from "drizzle-orm";
import type { DatabaseExecutor } from "./database-executor.js";
import { PersistenceMappingError } from "./persistence-errors.js";
import { curriculumAssignmentObligations as assignmentObligations } from "./schema.js";

function unavailable(message: string): never {
  throw new PersistenceMappingError(message);
}

function requiredText(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0)
    unavailable(`module obligation binding ${field} is unavailable`);
  return value;
}

/**
 * Private projection of the obligation bindings owned by one participant and
 * scope. It returns only the assignment identity a prerequisite decision
 * compares: no manifest, approval, blueprint, timestamp or version internal is
 * ever selected or forwarded. The caller owns the participant and scope
 * security context; this reader never widens it and fails closed when a stored
 * row does not belong to the requested context.
 */
export async function readBoundAssignmentIds(
  db: DatabaseExecutor,
  context: Readonly<{ participantId: string; scopeId: string }>,
): Promise<readonly string[]> {
  const participantId = requiredText(context.participantId, "participant");
  const scopeId = requiredText(context.scopeId, "scope");
  const rows = await db
    .select({
      assignmentId: assignmentObligations.assignmentId,
      participantId: assignmentObligations.participantId,
      scopeId: assignmentObligations.scopeId,
    })
    .from(assignmentObligations)
    .where(
      and(
        eq(assignmentObligations.participantId, participantId),
        eq(assignmentObligations.scopeId, scopeId),
      ),
    )
    .orderBy(asc(assignmentObligations.assignmentId));
  return Object.freeze(
    rows.map((row) => {
      if (row.participantId !== participantId || row.scopeId !== scopeId)
        unavailable("module obligation binding context is unavailable");
      requiredText(row.assignmentId, "assignment");
      return row.assignmentId;
    }),
  );
}
