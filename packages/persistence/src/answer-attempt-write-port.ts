import { and, eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  AnswerTransactionalOperations,
  TransactionSecurityContext,
} from "@cvg/application";
import type { AttemptState } from "@cvg/domain";
import {
  PersistenceMappingError,
  PersistenceStateConflictError,
} from "./attempt-repository.js";
import { attempts } from "./schema.js";
import type * as schema from "./schema.js";

/** The authorized parent lock spans answer validation, persistence and submission races. */
export function createAnswerAttemptWritePort(
  db: PostgresJsDatabase<typeof schema>,
  onRead: (state: AttemptState | null) => void,
  context?: TransactionSecurityContext,
): AnswerTransactionalOperations["attemptsPort"] {
  return {
    findById: async (attemptId: string): Promise<AttemptState | null> => {
      onRead(null);
      if (context !== undefined) {
        await db.execute(
          sql`select id from attempts where id = ${attemptId} for update`,
        );
      }
      const rows = await db
        .select({
          id: attempts.id,
          participantId: attempts.participantId,
          activityId: attempts.activityId,
          status: attempts.status,
          version: attempts.version,
          submittedAt: attempts.submittedAt,
        })
        .from(attempts)
        .where(eq(attempts.id, attemptId))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      const supportedStatuses = [
        "CRIADA",
        "EM_ANDAMENTO",
        "SALVA",
        "SUBMETIDA",
        "CORRIGIDA_AUTOMATICAMENTE",
        "AGUARDA_CORRECAO_HUMANA",
        "CORRIGIDA_HUMANAMENTE",
        "ANULADA",
      ] as const;
      if (
        !supportedStatuses.includes(
          row.status as (typeof supportedStatuses)[number],
        )
      ) {
        throw new PersistenceMappingError("attempt status is not supported");
      }
      const state: AttemptState = {
        attemptId: row.id,
        participantId: row.participantId,
        activityId: row.activityId,
        status: row.status as AttemptState["status"],
        version: row.version,
        ...(row.submittedAt
          ? { submittedAt: row.submittedAt.toISOString() }
          : {}),
      };
      onRead(state);
      return state;
    },
    update: async (state: AttemptState): Promise<void> => {
      const rows = await db
        .update(attempts)
        .set({
          status: state.status,
          version: state.version,
          submittedAt: state.submittedAt ? new Date(state.submittedAt) : null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(attempts.id, state.attemptId),
            eq(attempts.version, state.version - 1),
          ),
        )
        .returning({ id: attempts.id });
      if (rows.length === 0) {
        throw new PersistenceStateConflictError(
          "attempt version changed concurrently",
        );
      }
    },
  };
}
