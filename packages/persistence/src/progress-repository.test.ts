import { describe, expect, it } from "vitest";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import {
  ProgressMappingError,
  createProgressReadRepository,
  progressRowToState,
} from "./progress-repository.js";
import type * as schema from "./schema.js";

const row = {
  participantId: "11111111-1111-4111-8111-111111111111",
  activityId: "22222222-2222-4222-8222-222222222222",
  scopeId: "33333333-3333-4333-8333-333333333333",
  assignmentStatus: "EM_ANDAMENTO",
  attemptId: "44444444-4444-4444-8444-444444444444",
  attemptStatus: "SALVA",
  attemptVersion: 2,
};

function fakeDatabase(rows: readonly (typeof row)[]) {
  const query = {
    from: () => query,
    innerJoin: () => query,
    leftJoin: () => query,
    where: () => query,
    limit: async () => rows,
  };
  const transaction = {
    execute: async () => [{ scopeId: rows[0]?.scopeId }],
    select: () => query,
  };
  return {
    select: () => query,
    transaction: async (
      callback: (value: typeof transaction) => Promise<unknown>,
    ) => callback(transaction),
  } as unknown as PostgresJsDatabase<typeof schema>;
}

describe("progress persistence mapping", () => {
  it("maps assignment and latest attempt without response contents", () => {
    const state = progressRowToState(row);

    expect(state).toMatchObject({
      participantId: row.participantId,
      assignmentStatus: row.assignmentStatus,
      attemptStatus: row.attemptStatus,
      nextAction: "RETOMAR_ATIVIDADE",
    });
    expect(JSON.stringify(state)).not.toContain("response");
    expect(JSON.stringify(state)).not.toContain("participantText");
  });

  it("supports an assignment without an attempt and rejects bad status", () => {
    expect(
      progressRowToState({
        ...row,
        attemptId: null,
        attemptStatus: null,
        attemptVersion: null,
        assignmentStatus: "DISPONIVEL",
      }),
    ).toMatchObject({
      assignmentStatus: "DISPONIVEL",
      nextAction: "INICIAR_ATIVIDADE",
    });
    expect(() =>
      progressRowToState({ ...row, assignmentStatus: "INVALIDO" }),
    ).toThrow(ProgressMappingError);
  });

  it("reads the scoped assignment and optional attempt through PostgreSQL joins", async () => {
    const repository = createProgressReadRepository(fakeDatabase([row]));

    await expect(
      repository.findParticipantProgress(row.participantId, row.activityId),
    ).resolves.toMatchObject({ activityId: row.activityId, attemptVersion: 2 });
    await expect(
      createProgressReadRepository(fakeDatabase([])).findParticipantProgress(
        row.participantId,
        row.activityId,
      ),
    ).resolves.toBeNull();
  });
});
