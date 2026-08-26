import { and, eq } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  deriveProgressNextAction,
  type AssignmentStatus,
  type ParticipantProgressState,
  type ProgressReadPort,
} from "@cvg/application";
import type { AttemptStatus } from "@cvg/domain";

import { activityAssignments, attempts, learningActivities } from "./schema.js";
import type * as schema from "./schema.js";
import {
  resolveParticipantActivityScope,
  setDatabaseSecurityContext,
} from "./security-context.js";

export class ProgressMappingError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ProgressMappingError";
  }
}

export type ProgressRowShape = Readonly<{
  readonly participantId: string;
  readonly activityId: string;
  readonly scopeId: string;
  readonly assignmentStatus: string;
  readonly attemptId: string | null;
  readonly attemptStatus: string | null;
  readonly attemptVersion: number | null;
}>;

const assignmentStatuses: readonly AssignmentStatus[] = [
  "ATRIBUIDO",
  "DISPONIVEL",
  "EM_ANDAMENTO",
  "CONCLUIDO",
  "EM_REFORCO",
  "CONCLUIDO_COM_RETENCAO_PENDENTE",
  "PAUSADO",
  "BLOQUEADO",
];

const attemptStatuses: readonly AttemptStatus[] = [
  "CRIADA",
  "EM_ANDAMENTO",
  "SALVA",
  "SUBMETIDA",
  "CORRIGIDA_AUTOMATICAMENTE",
  "AGUARDA_CORRECAO_HUMANA",
  "CORRIGIDA_HUMANAMENTE",
  "ANULADA",
];

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new ProgressMappingError(`${field} must not be empty`);
  }
}

function parseAssignmentStatus(value: string): AssignmentStatus {
  if (!assignmentStatuses.includes(value as AssignmentStatus)) {
    throw new ProgressMappingError("assignment status is not supported");
  }
  return value as AssignmentStatus;
}

function parseAttemptStatus(value: string | null): AttemptStatus | undefined {
  if (value === null) return undefined;
  if (!attemptStatuses.includes(value as AttemptStatus)) {
    throw new ProgressMappingError("attempt status is not supported");
  }
  return value as AttemptStatus;
}

export function progressRowToState(
  row: ProgressRowShape,
): ParticipantProgressState {
  assertNonEmpty(row.participantId, "participantId");
  assertNonEmpty(row.activityId, "activityId");
  assertNonEmpty(row.scopeId, "scopeId");
  const assignmentStatus = parseAssignmentStatus(row.assignmentStatus);
  const attemptStatus = parseAttemptStatus(row.attemptStatus);
  if (row.attemptId === null && attemptStatus !== undefined) {
    throw new ProgressMappingError(
      "attempt status cannot exist without an attempt",
    );
  }
  if (
    row.attemptVersion !== null &&
    (!Number.isInteger(row.attemptVersion) || row.attemptVersion < 0)
  ) {
    throw new ProgressMappingError("attempt version is invalid");
  }

  return Object.freeze({
    participantId: row.participantId,
    activityId: row.activityId,
    scopeId: row.scopeId,
    assignmentStatus,
    ...(row.attemptId === null ? {} : { attemptId: row.attemptId }),
    ...(attemptStatus === undefined ? {} : { attemptStatus }),
    ...(row.attemptVersion === null
      ? {}
      : { attemptVersion: row.attemptVersion }),
    nextAction: deriveProgressNextAction(assignmentStatus, attemptStatus),
  });
}

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;

export function createProgressReadRepository(
  db: DatabaseExecutor,
): ProgressReadPort {
  const repository: ProgressReadPort = {
    findParticipantProgress: async (
      participantId: string,
      activityId: string,
    ): Promise<ParticipantProgressState | null> => {
      return db.transaction(async (transaction) => {
        const executor = transaction as unknown as DatabaseExecutor;
        await setDatabaseSecurityContext(executor, { participantId });
        const scopeId = await resolveParticipantActivityScope(
          executor,
          activityId,
          participantId,
        );
        if (scopeId === null) return null;
        await setDatabaseSecurityContext(executor, { participantId, scopeId });
        const rows = await executor
          .select({
            participantId: activityAssignments.participantId,
            activityId: activityAssignments.activityId,
            scopeId: learningActivities.scopeId,
            assignmentStatus: activityAssignments.status,
            attemptId: attempts.id,
            attemptStatus: attempts.status,
            attemptVersion: attempts.version,
          })
          .from(activityAssignments)
          .innerJoin(
            learningActivities,
            eq(activityAssignments.activityId, learningActivities.id),
          )
          .leftJoin(
            attempts,
            and(
              eq(attempts.participantId, participantId),
              eq(attempts.activityId, activityAssignments.activityId),
            ),
          )
          .where(
            and(
              eq(activityAssignments.participantId, participantId),
              eq(activityAssignments.activityId, activityId),
            ),
          )
          .limit(1);
        const row = rows[0];
        return row === undefined ? null : progressRowToState(row);
      });
    },
  };
  return Object.freeze(repository);
}
