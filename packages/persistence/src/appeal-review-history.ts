import { randomUUID } from "node:crypto";

import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { AppealState } from "@cvg/domain";

import { appealReviewHistory } from "./schema.js";
import type * as schema from "./schema.js";

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;

function eventType(
  next: AppealState["status"],
):
  | "ATRIBUIR_REVISOR"
  | "DECIDIR"
  | "SOLICITAR_RECALCULO"
  | "CONCLUIR_RECALCULO" {
  switch (next) {
    case "EM_REVISAO":
      return "ATRIBUIR_REVISOR";
    case "DECIDIDA":
      return "DECIDIR";
    case "RECALCULO_PENDENTE":
      return "SOLICITAR_RECALCULO";
    case "ENCERRADA":
      return "CONCLUIR_RECALCULO";
    default:
      throw new TypeError("appeal history cannot record this status");
  }
}

export async function appendAppealReviewHistory(
  executor: DatabaseExecutor,
  input: Readonly<{
    readonly scopeId: string;
    readonly previous: AppealState;
    readonly next: AppealState;
    readonly createdAt?: Date;
    readonly idFactory?: () => string;
  }>,
): Promise<void> {
  await executor.insert(appealReviewHistory).values({
    id: (input.idFactory ?? randomUUID)(),
    appealId: input.next.appealId,
    scopeId: input.scopeId,
    appealVersion: input.next.version,
    eventType: eventType(input.next.status),
    fromStatus: input.previous.status,
    toStatus: input.next.status,
    reviewerId: input.next.reviewerId ?? null,
    decision: input.next.decision ?? null,
    decisionRationale: input.next.decisionRationale ?? null,
    decisionAt:
      input.next.decisionAt === undefined
        ? null
        : new Date(input.next.decisionAt),
    decisionCorrelationId: input.next.decisionCorrelationId ?? null,
    createdAt: input.createdAt ?? new Date(),
  });
}
