import { and, asc, eq } from "drizzle-orm";
import type { ModuleCompletionReceiptFact } from "@cvg/application";
import type { DatabaseExecutor } from "./database-executor.js";
import { PersistenceMappingError } from "./persistence-errors.js";
import { curriculumModuleCompletionReceipts as completionReceipts } from "./schema.js";

const modulePattern = /^M(0[1-9]|1[0-9]|2[0-4])$/u;

function unavailable(message: string): never {
  throw new PersistenceMappingError(message);
}

function requiredText(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0)
    unavailable(`module completion receipt ${field} is unavailable`);
  return value;
}

function completedTime(value: unknown): string {
  const time =
    value instanceof Date
      ? value.getTime()
      : typeof value === "string"
        ? Date.parse(value)
        : Number.NaN;
  if (!Number.isFinite(time))
    unavailable("module completion receipt timestamp is unavailable");
  return new Date(time).toISOString();
}

/**
 * Private projection of the immutable completion receipts owned by one
 * participant and scope. It returns only the identity a prerequisite decision
 * compares: no approval, audit, request, hash, manifest or witness internal is
 * ever selected or forwarded. The caller owns the participant and scope
 * security context; this reader never widens it and fails closed when a stored
 * row does not belong to the requested context.
 */
export async function readModuleCompletionReceipts(
  db: DatabaseExecutor,
  context: Readonly<{ participantId: string; scopeId: string }>,
): Promise<readonly ModuleCompletionReceiptFact[]> {
  const participantId = requiredText(context.participantId, "participant");
  const scopeId = requiredText(context.scopeId, "scope");
  const rows = await db
    .select({
      assignmentId: completionReceipts.assignmentId,
      participantId: completionReceipts.participantId,
      scopeId: completionReceipts.scopeId,
      moduleId: completionReceipts.moduleId,
      completedAt: completionReceipts.completedAt,
      completedAssignmentVersion: completionReceipts.completedAssignmentVersion,
    })
    .from(completionReceipts)
    .where(
      and(
        eq(completionReceipts.participantId, participantId),
        eq(completionReceipts.scopeId, scopeId),
      ),
    )
    .orderBy(asc(completionReceipts.completedAt));
  return Object.freeze(
    rows.map((row) => {
      if (row.participantId !== participantId || row.scopeId !== scopeId)
        unavailable("module completion receipt context is unavailable");
      if (!modulePattern.test(row.moduleId))
        unavailable("module completion receipt module is unavailable");
      requiredText(row.assignmentId, "assignment");
      if (
        typeof row.completedAssignmentVersion !== "number" ||
        !Number.isInteger(row.completedAssignmentVersion) ||
        row.completedAssignmentVersion < 0
      )
        unavailable("module completion receipt version is unavailable");
      return Object.freeze({
        participantId,
        scopeId,
        moduleId: row.moduleId,
        assignmentId: row.assignmentId,
        completedAt: completedTime(row.completedAt),
        completedAssignmentVersion: row.completedAssignmentVersion,
      });
    }),
  );
}
