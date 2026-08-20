import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  buildSourceConflictDecision,
  type SourceConflictDecisionState,
} from "@cvg/domain";
import type {
  SourceConflictDecisionRepository,
  SourceConflictDecisionTransactionPort,
  SourceConflictDecisionTransactionalOperations,
  TransactionSecurityContext,
} from "@cvg/application";

import { createClinicalApproverPort } from "./clinical-approver-repository.js";
import { sourceConflictDecisions } from "./schema.js";
import type * as schema from "./schema.js";
import { setDatabaseSecurityContext } from "./security-context.js";

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;

export class SourceConflictMappingError extends Error {
  public override readonly name = "SourceConflictMappingError";

  public constructor(message: string) {
    super(message);
  }
}

export type SourceConflictDecisionRowShape = Readonly<{
  readonly id: string;
  readonly contentId: string;
  readonly contentVersion: number;
  readonly scopeId: string;
  readonly sourceCodes: unknown;
  readonly description: string;
  readonly decision: string;
  readonly rationale: string;
  readonly decidedBy: string;
  readonly decidedAt: Date | string;
  readonly humanReviewRequired: boolean;
  readonly createdAt: Date | string;
}>;

function timestamp(value: Date | string, field: string): string {
  const date =
    value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new SourceConflictMappingError(`${field} is invalid`);
  }
  return date.toISOString();
}

function sourceCodes(value: unknown): readonly string[] {
  if (
    !Array.isArray(value) ||
    value.some((sourceCode) => typeof sourceCode !== "string")
  ) {
    throw new SourceConflictMappingError("sourceCodes is invalid");
  }
  return Object.freeze([...value]);
}

export function sourceConflictDecisionStateToRow(
  state: SourceConflictDecisionState,
) {
  try {
    const verified = buildSourceConflictDecision(state);
    return {
      id: verified.conflictId,
      contentId: verified.contentId,
      contentVersion: verified.contentVersion,
      scopeId: verified.scopeId,
      sourceCodes: verified.sourceCodes,
      description: verified.description,
      decision: verified.decision,
      rationale: verified.rationale,
      decidedBy: verified.decidedBy,
      decidedAt: new Date(verified.decidedAt),
      humanReviewRequired: verified.humanReviewRequired,
    } satisfies typeof sourceConflictDecisions.$inferInsert;
  } catch (error) {
    throw new SourceConflictMappingError(
      error instanceof Error ? error.message : "source conflict is invalid",
    );
  }
}

export function sourceConflictDecisionRowToState(
  row: SourceConflictDecisionRowShape,
): SourceConflictDecisionState {
  try {
    const state = buildSourceConflictDecision({
      conflictId: row.id,
      contentId: row.contentId,
      contentVersion: row.contentVersion,
      scopeId: row.scopeId,
      sourceCodes: sourceCodes(row.sourceCodes),
      description: row.description,
      decision: row.decision as SourceConflictDecisionState["decision"],
      rationale: row.rationale,
      decidedBy: row.decidedBy,
      decidedAt: timestamp(row.decidedAt, "decidedAt"),
    });
    timestamp(row.createdAt, "createdAt");
    if (state.humanReviewRequired !== row.humanReviewRequired) {
      throw new SourceConflictMappingError(
        "humanReviewRequired does not match the decision",
      );
    }
    return state;
  } catch (error) {
    if (error instanceof SourceConflictMappingError) throw error;
    throw new SourceConflictMappingError(
      error instanceof Error ? error.message : "source conflict is invalid",
    );
  }
}

function createTransactionalOperations(
  executor: DatabaseExecutor,
): SourceConflictDecisionTransactionalOperations {
  return Object.freeze({
    approver: createClinicalApproverPort(executor),
    save: async (state: SourceConflictDecisionState) => {
      await setDatabaseSecurityContext(executor, { scopeId: state.scopeId });
      await executor
        .insert(sourceConflictDecisions)
        .values(sourceConflictDecisionStateToRow(state));
      return state;
    },
  });
}

export function createSourceConflictDecisionRepository(
  db: DatabaseExecutor,
): SourceConflictDecisionRepository {
  const transaction: SourceConflictDecisionTransactionPort = Object.freeze({
    run: async <Result>(
      work: (
        operations: SourceConflictDecisionTransactionalOperations,
      ) => Promise<Result>,
      context?: TransactionSecurityContext,
    ): Promise<Result> =>
      db.transaction(async (executor) => {
        if (context !== undefined) {
          await setDatabaseSecurityContext(executor, context);
        }
        return work(createTransactionalOperations(executor));
      }),
  });
  return Object.freeze({
    transaction,
    save: async (state: SourceConflictDecisionState) =>
      transaction.run((operations) => operations.save(state)),
  });
}
