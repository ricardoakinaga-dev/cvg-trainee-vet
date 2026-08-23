import { randomUUID } from "node:crypto";

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  DiagnosticResultReadPort,
  DiagnosticResultState,
  DiagnosticResultWriteInput,
  DiagnosticResultWritePort,
} from "@cvg/application";
import type {
  CurriculumDiagnosticResult,
  DiagnosticSessionId,
} from "@cvg/curriculum";

import { PersistenceMappingError } from "./attempt-repository.js";
import { diagnosticResults } from "./schema.js";
import type * as schema from "./schema.js";
import { setDatabaseSecurityContext } from "./security-context.js";

export class DiagnosticResultMappingError extends PersistenceMappingError {
  public constructor(message: string) {
    super(message);
    this.name = "DiagnosticResultMappingError";
  }
}

export type DiagnosticResultRowShape = Readonly<{
  readonly id: string;
  readonly participantId: string;
  readonly scopeId: string;
  readonly diagnosticId: string;
  readonly diagnosticVersion: string;
  readonly result: CurriculumDiagnosticResult;
  readonly completedAt: Date;
}>;

export type DiagnosticResultInsertRow = Readonly<{
  readonly id: string;
  readonly participantId: string;
  readonly scopeId: string;
  readonly diagnosticId: "B07-DIAGNOSTIC-V1";
  readonly diagnosticVersion: "0.1.0";
  readonly result: CurriculumDiagnosticResult;
  readonly completedAt: Date;
}>;

const diagnosticIds: readonly DiagnosticSessionId[] = [
  "B07-S1",
  "B07-S2",
  "B07-S3",
];

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new DiagnosticResultMappingError(`${field} must not be empty`);
  }
}

function freezeResult(
  result: CurriculumDiagnosticResult,
): CurriculumDiagnosticResult {
  if (result.diagnosticId !== "B07-DIAGNOSTIC-V1") {
    throw new DiagnosticResultMappingError("diagnostic id is invalid");
  }
  if (result.version !== "0.1.0") {
    throw new DiagnosticResultMappingError("diagnostic version is invalid");
  }
  if (result.notPunitive !== true || result.noGlobalPassFail !== true) {
    throw new DiagnosticResultMappingError(
      "diagnostic safety flags must remain enabled",
    );
  }
  if (result.themeResults.length !== diagnosticIds.length) {
    throw new DiagnosticResultMappingError("diagnostic theme count is invalid");
  }
  for (const theme of result.themeResults) {
    if (!diagnosticIds.includes(theme.themeId)) {
      throw new DiagnosticResultMappingError("diagnostic theme id is invalid");
    }
  }
  return Object.freeze({
    ...result,
    themeResults: Object.freeze(
      result.themeResults.map((theme) =>
        Object.freeze({
          ...theme,
          recommendedModuleIds: Object.freeze([...theme.recommendedModuleIds]),
        }),
      ),
    ),
    recommendedModuleIds: Object.freeze([...result.recommendedModuleIds]),
    remediationObjectiveIds: Object.freeze([...result.remediationObjectiveIds]),
  });
}

export function diagnosticResultStateToRow(
  input: DiagnosticResultWriteInput,
  id: string,
): DiagnosticResultInsertRow {
  assertNonEmpty(id, "id");
  assertNonEmpty(input.participantId, "participantId");
  assertNonEmpty(input.scopeId, "scopeId");
  const completedAt = new Date(input.completedAt);
  if (Number.isNaN(completedAt.getTime())) {
    throw new DiagnosticResultMappingError(
      "completedAt must be a valid timestamp",
    );
  }
  return Object.freeze({
    id,
    participantId: input.participantId,
    scopeId: input.scopeId,
    diagnosticId: "B07-DIAGNOSTIC-V1",
    diagnosticVersion: "0.1.0",
    result: freezeResult(input.result),
    completedAt,
  });
}

export function diagnosticResultRowToState(
  row: DiagnosticResultRowShape,
): DiagnosticResultState {
  assertNonEmpty(row.id, "id");
  assertNonEmpty(row.participantId, "participantId");
  assertNonEmpty(row.scopeId, "scopeId");
  if (row.diagnosticId !== "B07-DIAGNOSTIC-V1") {
    throw new DiagnosticResultMappingError("stored diagnostic id is invalid");
  }
  if (row.diagnosticVersion !== "0.1.0") {
    throw new DiagnosticResultMappingError(
      "stored diagnostic version is invalid",
    );
  }
  if (Number.isNaN(row.completedAt.getTime())) {
    throw new DiagnosticResultMappingError(
      "stored completedAt must be a valid timestamp",
    );
  }
  return Object.freeze({
    resultId: row.id,
    participantId: row.participantId,
    scopeId: row.scopeId,
    diagnosticId: "B07-DIAGNOSTIC-V1",
    version: "0.1.0",
    completedAt: row.completedAt.toISOString(),
    result: freezeResult(row.result),
  });
}

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;

function toRow(
  row: typeof diagnosticResults.$inferSelect,
): DiagnosticResultRowShape {
  return {
    id: row.id,
    participantId: row.participantId,
    scopeId: row.scopeId,
    diagnosticId: row.diagnosticId,
    diagnosticVersion: row.diagnosticVersion,
    result: row.result,
    completedAt: row.completedAt,
  };
}

export function createDiagnosticResultRepository(
  db: DatabaseExecutor,
  idFactory: () => string = randomUUID,
): DiagnosticResultReadPort & DiagnosticResultWritePort {
  const repository = {
    findDiagnosticResults: async (
      participantId: string,
      scopeIds: readonly string[],
    ): Promise<readonly DiagnosticResultState[]> => {
      assertNonEmpty(participantId, "participantId");
      const normalizedScopeIds = [
        ...new Set(
          scopeIds
            .map((scopeId) => scopeId.trim())
            .filter((scopeId) => scopeId.length > 0),
        ),
      ];
      if (normalizedScopeIds.length === 0) return Object.freeze([]);
      return db.transaction(async (transaction) => {
        const executor = transaction as unknown as DatabaseExecutor;
        await setDatabaseSecurityContext(executor, { participantId });
        const rows = await executor
          .select()
          .from(diagnosticResults)
          .where(
            and(
              eq(diagnosticResults.participantId, participantId),
              inArray(diagnosticResults.scopeId, normalizedScopeIds),
            ),
          )
          .orderBy(
            asc(diagnosticResults.diagnosticId),
            desc(diagnosticResults.completedAt),
          );
        return Object.freeze(
          rows.map((row) => diagnosticResultRowToState(toRow(row))),
        );
      });
    },
    saveDiagnosticResult: async (
      input: DiagnosticResultWriteInput,
    ): Promise<DiagnosticResultState> => {
      const id = idFactory();
      const row = diagnosticResultStateToRow(input, id);
      return db.transaction(async (transaction) => {
        const executor = transaction as unknown as DatabaseExecutor;
        await setDatabaseSecurityContext(executor, {
          participantId: row.participantId,
          scopeId: row.scopeId,
        });
        await executor.insert(diagnosticResults).values(row);
        const rows = await executor
          .select()
          .from(diagnosticResults)
          .where(eq(diagnosticResults.id, row.id))
          .limit(1);
        const stored = rows[0];
        if (stored === undefined) {
          throw new DiagnosticResultMappingError(
            "saved diagnostic result was not found",
          );
        }
        return diagnosticResultRowToState(toRow(stored));
      });
    },
  } satisfies DiagnosticResultReadPort & DiagnosticResultWritePort;
  return Object.freeze(repository);
}
