import { and, asc, eq, inArray } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { ParticipantAttemptReadPort } from "@cvg/application";
import { answerRowToState } from "./answer-repository.js";
import { attemptRowToState } from "./attempt-repository.js";
import { readCapturedAttemptItemIds } from "./curriculum-attempt-item-read.js";
import {
  answers,
  attempts,
  contentVersions,
  learningActivityItems,
} from "./schema.js";
import type * as schema from "./schema.js";
import {
  resolveParticipantActivityScope,
  setDatabaseSecurityContext,
} from "./security-context.js";

export function createParticipantAttemptReadRepository(
  db: PostgresJsDatabase<typeof schema>,
): ParticipantAttemptReadPort {
  return Object.freeze({
    findOwnAttempt: (participantId: string, attemptId: string) =>
      db.transaction(async (transaction) => {
        await setDatabaseSecurityContext(transaction, { participantId });
        // Hold the attempt while reading answers so its version and responses
        // cannot straddle a concurrent SaveAnswer/Submit transaction.
        const rows = await transaction
          .select({
            id: attempts.id,
            participantId: attempts.participantId,
            activityId: attempts.activityId,
            status: attempts.status,
            version: attempts.version,
            submittedAt: attempts.submittedAt,
          })
          .from(attempts)
          .where(
            and(
              eq(attempts.id, attemptId),
              eq(attempts.participantId, participantId),
            ),
          )
          .limit(1)
          .for("share");
        const row = rows[0];
        if (row === undefined) return null;
        const scopeId = await resolveParticipantActivityScope(
          transaction,
          row.activityId,
          participantId,
        );
        if (scopeId === null) return null;
        await setDatabaseSecurityContext(transaction, {
          participantId,
          scopeId,
        });
        const capturedItemIds = await readCapturedAttemptItemIds(transaction, {
          participantId,
          scopeId,
          activityId: row.activityId,
          attemptId,
        });
        if (capturedItemIds === null) return null;
        if (capturedItemIds !== undefined) {
          const capturedAnswers = await transaction
            .select({
              id: answers.id,
              attemptId: answers.attemptId,
              itemId: answers.itemId,
              response: answers.response,
              savedAt: answers.savedAt,
            })
            .from(answers)
            .where(
              and(
                eq(answers.attemptId, attemptId),
                inArray(answers.itemId, [...capturedItemIds]),
              ),
            );
          const ordinal = new Map(
            capturedItemIds.map((id, index) => [id, index]),
          );
          return Object.freeze({
            attempt: attemptRowToState(row),
            answers: Object.freeze(
              capturedAnswers
                .sort(
                  (left, right) =>
                    ordinal.get(left.itemId)! - ordinal.get(right.itemId)!,
                )
                .map(answerRowToState),
            ),
          });
        }
        const answerRows = await transaction
          .select({
            id: answers.id,
            attemptId: answers.attemptId,
            itemId: answers.itemId,
            response: answers.response,
            savedAt: answers.savedAt,
          })
          .from(answers)
          .innerJoin(
            learningActivityItems,
            and(
              eq(learningActivityItems.contentVersionId, answers.itemId),
              eq(learningActivityItems.activityId, row.activityId),
            ),
          )
          .innerJoin(contentVersions, eq(contentVersions.id, answers.itemId))
          .where(
            and(
              eq(answers.attemptId, attemptId),
              eq(contentVersions.status, "PUBLICADO"),
            ),
          )
          .orderBy(asc(learningActivityItems.ordinal));
        return Object.freeze({
          attempt: attemptRowToState(row),
          answers: Object.freeze(answerRows.map(answerRowToState)),
        });
      }),
  });
}
