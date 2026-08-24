import { describe, expect, it } from "vitest";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { startAttempt, submitAttempt } from "@cvg/application";
import type { AttemptState } from "@cvg/domain";

import {
  createActivityScopeResolver,
  createAttemptUseCaseDependencies,
  createParticipantScopeResolver,
  PersistenceConflictError,
  type AttemptRowShape,
} from "./attempt-repository.js";
import * as schema from "./schema.js";

type FakeRow = Record<string, unknown>;

type FakeDatabaseState = {
  readonly attemptRows: AttemptRowShape[];
  readonly idempotencyRows: Array<{
    key: string;
    fingerprint: string;
    attemptId: string;
    response: unknown;
  }>;
  readonly activityRows: Array<{ activityId: string; scopeId: string }>;
  readonly invitationRows: Array<{
    accountId: string;
    scopeId: string;
    accountStatus: "INVITED" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
    acceptedAt: Date | null;
  }>;
  readonly assignmentRows: Array<{ activityId: string; available: boolean }>;
  readonly outboxRows: FakeRow[];
  readonly auditRows: FakeRow[];
};

function record(value: unknown): FakeRow {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("fake row must be an object");
  }
  return Object.fromEntries(Object.entries(value));
}

function queryParameters(value: unknown): readonly unknown[] {
  if (Array.isArray(value)) return value.flatMap(queryParameters);
  if (value === null || typeof value !== "object") return [];
  const candidate = value as {
    readonly queryChunks?: readonly unknown[];
    readonly value?: unknown;
  };
  if (candidate.queryChunks !== undefined) {
    return candidate.queryChunks.flatMap(queryParameters);
  }
  if (
    "value" in candidate &&
    (typeof candidate.value === "string" || typeof candidate.value === "number")
  ) {
    return [candidate.value];
  }
  return [];
}

function createFakeDatabase(
  options: {
    readonly accountStatus?: FakeDatabaseState["invitationRows"][number]["accountStatus"];
    readonly acceptedAt?: Date | null;
  } = {},
): {
  readonly database: PostgresJsDatabase<typeof schema>;
  readonly state: FakeDatabaseState;
} {
  const state: FakeDatabaseState = {
    attemptRows: [],
    idempotencyRows: [],
    activityRows: [{ activityId: "activity-1", scopeId: "scope-1" }],
    invitationRows: [
      {
        accountId: "participant-1",
        scopeId: "scope-1",
        accountStatus: options.accountStatus ?? "ACTIVE",
        acceptedAt:
          options.acceptedAt === undefined
            ? new Date("2026-08-23T12:00:00.000Z")
            : options.acceptedAt,
      },
    ],
    assignmentRows: [{ activityId: "activity-1", available: true }],
    outboxRows: [],
    auditRows: [],
  };

  const fakeDatabase = {
    select: () => {
      let selectedTable: unknown;
      let whereValues: readonly unknown[] = [];
      const query = {
        from: (table: unknown) => {
          selectedTable = table;
          return query;
        },
        innerJoin: () => query,
        where: (condition: unknown) => {
          whereValues = queryParameters(condition);
          return query;
        },
        limit: async () => {
          if (selectedTable === schema.attempts) {
            return state.attemptRows
              .filter(
                (row) =>
                  whereValues.length === 0 ||
                  whereValues.some((value) => value === row.id) ||
                  (whereValues.includes(row.participantId) &&
                    whereValues.includes(row.activityId)),
              )
              .map((row) => ({ ...row }));
          }
          if (selectedTable === schema.attemptIdempotency) {
            return state.idempotencyRows
              .filter(
                (row) =>
                  whereValues.length === 0 || whereValues.includes(row.key),
              )
              .map((row) => ({ ...row }));
          }
          if (selectedTable === schema.activityAssignments) {
            return state.assignmentRows
              .filter(
                (row) =>
                  row.available &&
                  (whereValues.length === 0 ||
                    whereValues.includes(row.activityId)),
              )
              .map((row) => ({ activityId: row.activityId }));
          }
          if (selectedTable === schema.learningActivities) {
            return state.activityRows
              .filter(
                (row) =>
                  whereValues.length === 0 ||
                  whereValues.includes(row.activityId),
              )
              .map((row) => ({ ...row }));
          }
          if (selectedTable === schema.accountInvitations) {
            return state.invitationRows
              .filter(
                (row) =>
                  whereValues.includes(row.accountId) &&
                  whereValues.includes("ACTIVE") &&
                  row.accountStatus === "ACTIVE" &&
                  row.acceptedAt !== null,
              )
              .map((row) => ({ accountId: row.accountId }));
          }
          return [];
        },
      };
      return query;
    },
    insert: (table: unknown) => ({
      values: async (value: unknown) => {
        const row = record(value);
        if (table === schema.attempts) {
          state.attemptRows.push(row as unknown as AttemptRowShape);
        } else if (table === schema.attemptIdempotency) {
          state.idempotencyRows.push(
            row as unknown as FakeDatabaseState["idempotencyRows"][number],
          );
        } else if (table === schema.outboxEvents) {
          state.outboxRows.push(row);
        } else if (table === schema.auditEntries) {
          state.auditRows.push(row);
        }
      },
    }),
    execute: async () => [],
    update: (table: unknown) => ({
      set: (value: unknown) => ({
        where: () => ({
          returning: async () => {
            if (table !== schema.attempts) return [];
            const update = record(value);
            const current = state.attemptRows[0];
            if (
              current === undefined ||
              update.version !== current.version + 1
            ) {
              return [];
            }
            state.attemptRows.splice(0, 1, {
              ...current,
              status: String(update.status),
              version: Number(update.version),
              submittedAt:
                update.submittedAt instanceof Date ? update.submittedAt : null,
            });
            return [{ id: current.id }];
          },
        }),
      }),
    }),
    transaction: async <Result>(
      work: (transaction: unknown) => Promise<Result>,
    ): Promise<Result> => work(fakeDatabase),
  };

  return {
    database: fakeDatabase as unknown as PostgresJsDatabase<typeof schema>,
    state,
  };
}

describe("database adapter operations", () => {
  it("executes start, submit, outbox, replay, and scope lookup through transaction ports", async () => {
    const { database, state } = createFakeDatabase();
    const dependencies = createAttemptUseCaseDependencies(
      database,
      (() => {
        let count = 0;
        return () => `generated-${++count}`;
      })(),
    );

    const started = await startAttempt(
      {
        participantId: "participant-1",
        activityId: "activity-1",
        scopeId: "scope-1",
        idempotencyKey: "start-key-123456",
        correlationId: "correlation-start-1",
      },
      dependencies,
    );
    const initialRow = state.attemptRows[0];
    if (initialRow === undefined)
      throw new Error("attempt row was not inserted");
    state.attemptRows.splice(0, 1, {
      ...initialRow,
      status: "SALVA",
      version: 2,
    });
    const command = {
      attemptId: started.attemptId,
      participantId: "participant-1",
      scopeId: "scope-1",
      idempotencyKey: "submit-key-123456",
      correlationId: "correlation-1",
      submittedAt: "2026-08-09T17:00:00.000Z",
    } as const;
    const submitted = await submitAttempt(command, dependencies);
    const replay = await submitAttempt(command, dependencies);
    const scope = await createActivityScopeResolver(database)("activity-1", {
      scopeId: "scope-1",
    });

    expect(submitted.status).toBe("SUBMETIDA");
    expect(replay).toEqual(submitted);
    expect(state.outboxRows).toHaveLength(1);
    expect(state.auditRows).toHaveLength(2);
    expect(scope).toBe("scope-1");
  });

  it("resolves participant membership by invitation role scope", async () => {
    const { database } = createFakeDatabase();
    const resolveParticipantScope = createParticipantScopeResolver(database);

    await expect(
      resolveParticipantScope("participant-1", "scope-1"),
    ).resolves.toBe(true);
  });

  it.each([
    ["INVITED", new Date("2026-08-23T12:00:00.000Z")],
    ["SUSPENDED", new Date("2026-08-23T12:00:00.000Z")],
    ["DEACTIVATED", new Date("2026-08-23T12:00:00.000Z")],
    ["ACTIVE", null],
  ] as const)(
    "rejects a participant that is not active with an accepted membership (%s)",
    async (accountStatus, acceptedAt) => {
      const { database } = createFakeDatabase({ accountStatus, acceptedAt });
      const resolveParticipantScope = createParticipantScopeResolver(database);

      await expect(
        resolveParticipantScope("participant-1", "scope-1"),
      ).resolves.toBe(false);
    },
  );

  it("resolves activity scope only through a contextual transaction", async () => {
    const { database } = createFakeDatabase();
    const guardedDatabase = {
      ...database,
      select: () => {
        throw new Error("activity scope resolver bypassed transaction");
      },
    } as unknown as typeof database;
    const resolveActivityScope = createActivityScopeResolver(guardedDatabase);

    await expect(
      resolveActivityScope("activity-1", { scopeId: "scope-1" }),
    ).resolves.toBe("scope-1");
  });

  it("handles unavailable activity, empty reads, and optimistic update conflicts", async () => {
    const { database, state } = createFakeDatabase();
    const dependencies = createAttemptUseCaseDependencies(
      database,
      () => "generated-1",
    );

    state.assignmentRows[0]!.available = false;
    await expect(
      startAttempt(
        {
          participantId: "participant-1",
          activityId: "activity-1",
          scopeId: "scope-1",
          idempotencyKey: "start-key-123456",
          correlationId: "correlation-start-1",
        },
        dependencies,
      ),
    ).rejects.toMatchObject({ code: "not_found" });

    expect(await dependencies.attemptsPort.findById("missing")).toBeNull();
    expect(await dependencies.idempotency.find("missing")).toBeNull();
    await expect(
      dependencies.attemptsPort.update({
        attemptId: "attempt-1",
        participantId: "participant-1",
        activityId: "activity-1",
        status: "SALVA",
        version: 2,
      }),
    ).rejects.toBeInstanceOf(PersistenceConflictError);
  });

  it("detects an idempotency fingerprint conflict in the adapter", async () => {
    const { database } = createFakeDatabase();
    const dependencies = createAttemptUseCaseDependencies(
      database,
      () => "generated-1",
    );
    const attempt: AttemptState = {
      attemptId: "attempt-1",
      participantId: "participant-1",
      activityId: "activity-1",
      status: "SALVA",
      version: 2,
    };

    await dependencies.idempotency.store("same-key-123456", {
      fingerprint: "fingerprint-a",
      attempt,
    });
    await expect(
      dependencies.idempotency.store("same-key-123456", {
        fingerprint: "fingerprint-b",
        attempt,
      }),
    ).rejects.toBeInstanceOf(PersistenceConflictError);
  });
});
