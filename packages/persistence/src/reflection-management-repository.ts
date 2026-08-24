import { and, asc, eq, sql } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  ReflectionManagementInstance,
  ReflectionManagementReadPort,
  ReflectionManagementState,
  ReflectionManagementQuery,
} from "@cvg/application";
import type { AttemptStatus } from "@cvg/domain";
import { aggregateReflectionManagement } from "@cvg/application";

import { PersistenceMappingError } from "./attempt-repository.js";
import {
  accountInvitations,
  accounts,
  activityAssignments,
  answers,
  attempts,
  contentEditorialRecords,
  contentVersions,
  learningActivities,
  learningActivityItems,
} from "./schema.js";
import type * as schema from "./schema.js";
import { setDatabaseSecurityContext } from "./security-context.js";

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;

export type ReflectionManagementRepositoryOptions = Readonly<{
  readonly now?: () => Date;
}>;

export type ReflectionManagementRowShape = Readonly<{
  readonly participantId: string;
  readonly activityId: string;
  readonly moduleId: string;
  readonly itemId: string;
  readonly attemptId: string | null;
  readonly attemptStatus: string | null;
  readonly attemptVersion: number | null;
  readonly attemptUpdatedAt: Date | string | null;
  readonly answeredItemId: string | null;
}>;

const participantRoleJson = JSON.stringify(["PARTICIPANT"]);
const supportedAttemptStatuses: readonly AttemptStatus[] = [
  "CRIADA",
  "EM_ANDAMENTO",
  "SALVA",
  "SUBMETIDA",
  "CORRIGIDA_AUTOMATICAMENTE",
  "AGUARDA_CORRECAO_HUMANA",
  "CORRIGIDA_HUMANAMENTE",
  "ANULADA",
];

function parseAttemptStatus(value: string): AttemptStatus {
  if (!supportedAttemptStatuses.includes(value as AttemptStatus)) {
    throw new PersistenceMappingError(
      "reflection management attempt status is invalid",
    );
  }
  return value as AttemptStatus;
}

function timestamp(value: Date | string | null, field: string): Date {
  if (value === null) {
    throw new PersistenceMappingError(`${field} is required`);
  }
  const parsed =
    value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new PersistenceMappingError(`${field} is invalid`);
  }
  return parsed;
}

function compareAttemptRows(
  left: ReflectionManagementRowShape,
  right: ReflectionManagementRowShape,
): number {
  const leftUpdatedAt = timestamp(left.attemptUpdatedAt, "attemptUpdatedAt");
  const rightUpdatedAt = timestamp(right.attemptUpdatedAt, "attemptUpdatedAt");
  const byTimestamp = leftUpdatedAt.getTime() - rightUpdatedAt.getTime();
  if (byTimestamp !== 0) return byTimestamp;
  const leftVersion = left.attemptVersion;
  const rightVersion = right.attemptVersion;
  if (
    leftVersion === null ||
    rightVersion === null ||
    !Number.isInteger(leftVersion) ||
    !Number.isInteger(rightVersion) ||
    leftVersion < 0 ||
    rightVersion < 0
  ) {
    throw new PersistenceMappingError(
      "reflection management attempt version is invalid",
    );
  }
  if (leftVersion !== rightVersion) return leftVersion - rightVersion;
  return (left.attemptId ?? "").localeCompare(right.attemptId ?? "");
}

type MutableGroup = {
  readonly participantId: string;
  readonly activityId: string;
  moduleId: string;
  readonly itemIds: Set<string>;
  readonly rows: ReflectionManagementRowShape[];
};

export function reflectionManagementRowsToInstances(
  rows: readonly ReflectionManagementRowShape[],
): readonly ReflectionManagementInstance[] {
  const groups = new Map<string, MutableGroup>();
  for (const row of rows) {
    if (
      row.participantId.trim().length === 0 ||
      row.activityId.trim().length === 0 ||
      row.moduleId.trim().length === 0 ||
      row.itemId.trim().length === 0
    ) {
      throw new PersistenceMappingError(
        "reflection management row identity is required",
      );
    }
    const key = `${row.participantId}:${row.activityId}`;
    const group = groups.get(key) ?? {
      participantId: row.participantId,
      activityId: row.activityId,
      moduleId: row.moduleId,
      itemIds: new Set<string>(),
      rows: [],
    };
    if (group.moduleId !== row.moduleId) {
      throw new PersistenceMappingError(
        "reflection management activity has multiple modules",
      );
    }
    if (row.answeredItemId !== null && row.answeredItemId !== row.itemId) {
      throw new PersistenceMappingError(
        "reflection management answer item does not match activity item",
      );
    }
    if (row.attemptId === null) {
      if (
        row.attemptStatus !== null ||
        row.attemptVersion !== null ||
        row.attemptUpdatedAt !== null ||
        row.answeredItemId !== null
      ) {
        throw new PersistenceMappingError(
          "reflection management row without attempt contains state",
        );
      }
    } else {
      if (
        row.attemptStatus === null ||
        row.attemptVersion === null ||
        row.attemptUpdatedAt === null
      ) {
        throw new PersistenceMappingError(
          "reflection management attempt metadata is incomplete",
        );
      }
      parseAttemptStatus(row.attemptStatus);
      timestamp(row.attemptUpdatedAt, "attemptUpdatedAt");
      if (!Number.isInteger(row.attemptVersion) || row.attemptVersion < 0) {
        throw new PersistenceMappingError(
          "reflection management attempt version is invalid",
        );
      }
    }
    group.itemIds.add(row.itemId);
    group.rows.push(row);
    groups.set(key, group);
  }

  return Object.freeze(
    [...groups.values()]
      .sort((left, right) =>
        `${left.participantId}:${left.activityId}`.localeCompare(
          `${right.participantId}:${right.activityId}`,
        ),
      )
      .map((group) => {
        const attemptsForGroup = group.rows.filter(
          (row) => row.attemptId !== null,
        );
        const latestAttempt = attemptsForGroup.reduce<
          ReflectionManagementRowShape | undefined
        >(
          (latest, row) =>
            latest === undefined || compareAttemptRows(row, latest) > 0
              ? row
              : latest,
          undefined,
        );
        const answeredItemIds = new Set(
          latestAttempt === undefined
            ? []
            : group.rows
                .filter(
                  (row) =>
                    row.attemptId === latestAttempt.attemptId &&
                    row.answeredItemId !== null,
                )
                .map((row) => row.answeredItemId as string),
        );
        return Object.freeze({
          participantId: group.participantId,
          activityId: group.activityId,
          moduleId: group.moduleId,
          itemCount: group.itemIds.size,
          answeredItemCount: answeredItemIds.size,
          ...(latestAttempt === undefined
            ? {}
            : {
                attemptStatus: parseAttemptStatus(
                  latestAttempt.attemptStatus as string,
                ),
              }),
        });
      }),
  );
}

export function createReflectionManagementReadRepository(
  db: DatabaseExecutor,
  options: ReflectionManagementRepositoryOptions = {},
): ReflectionManagementReadPort {
  const now = options.now ?? (() => new Date());
  return Object.freeze({
    findReflectionManagement: async (
      query: ReflectionManagementQuery,
    ): Promise<ReflectionManagementState> => {
      const scopeId = query.scopeId.trim();
      if (scopeId.length === 0) {
        throw new PersistenceMappingError(
          "reflection management scope is required",
        );
      }
      const generatedAt = now();
      if (Number.isNaN(generatedAt.getTime())) {
        throw new PersistenceMappingError(
          "reflection management timestamp is invalid",
        );
      }

      return db.transaction(async (transaction) => {
        const executor = transaction as unknown as DatabaseExecutor;
        await setDatabaseSecurityContext(executor, { scopeId });
        const memberRows = await executor
          .select({ participantId: accounts.id })
          .from(accountInvitations)
          .innerJoin(accounts, eq(accountInvitations.accountId, accounts.id))
          .where(
            and(
              sql`${accountInvitations.roles} @> ${participantRoleJson}::jsonb`,
              sql`${accountInvitations.scopes} @> ${JSON.stringify([scopeId])}::jsonb`,
            ),
          )
          .groupBy(accounts.id);

        const instances: ReflectionManagementInstance[] = [];
        for (const member of memberRows) {
          await setDatabaseSecurityContext(executor, {
            scopeId,
            participantId: member.participantId,
          });
          const rows = await executor
            .select({
              participantId: activityAssignments.participantId,
              activityId: learningActivities.id,
              moduleId: contentEditorialRecords.moduleId,
              itemId: learningActivityItems.contentVersionId,
              attemptId: attempts.id,
              attemptStatus: attempts.status,
              attemptVersion: attempts.version,
              attemptUpdatedAt: attempts.updatedAt,
              answeredItemId: answers.itemId,
            })
            .from(activityAssignments)
            .innerJoin(
              learningActivities,
              eq(activityAssignments.activityId, learningActivities.id),
            )
            .innerJoin(
              learningActivityItems,
              eq(learningActivityItems.activityId, learningActivities.id),
            )
            .innerJoin(
              contentVersions,
              eq(learningActivityItems.contentVersionId, contentVersions.id),
            )
            .innerJoin(
              contentEditorialRecords,
              eq(contentEditorialRecords.contentVersionId, contentVersions.id),
            )
            .leftJoin(
              attempts,
              and(
                eq(attempts.activityId, learningActivities.id),
                eq(attempts.participantId, member.participantId),
              ),
            )
            .leftJoin(
              answers,
              and(
                eq(answers.attemptId, attempts.id),
                eq(answers.itemId, learningActivityItems.contentVersionId),
              ),
            )
            .where(
              and(
                eq(activityAssignments.participantId, member.participantId),
                eq(learningActivities.scopeId, scopeId),
                eq(learningActivities.status, "PUBLISHED"),
                eq(contentVersions.scopeId, scopeId),
                eq(contentVersions.kind, "REFLEXAO"),
                eq(contentVersions.status, "PUBLICADO"),
                eq(contentEditorialRecords.scopeId, scopeId),
              ),
            )
            .orderBy(
              asc(learningActivities.id),
              asc(learningActivityItems.ordinal),
            );
          instances.push(
            ...reflectionManagementRowsToInstances(
              rows as ReflectionManagementRowShape[],
            ),
          );
        }

        return aggregateReflectionManagement({
          scopeId,
          generatedAt: generatedAt.toISOString(),
          instances,
        });
      });
    },
  });
}
