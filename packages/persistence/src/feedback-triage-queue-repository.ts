import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { and, desc, eq, lt, or } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  FeedbackTriageQueueQueryError,
  type FeedbackTriageQueueReadPort,
  type FeedbackTriageQueueStatus,
  type FeedbackTriageQueueState,
} from "@cvg/application";

import {
  feedbackTicketRowToState,
  type FeedbackTicketRowShape,
} from "./learning-state-repository.js";
import { feedbackTickets } from "./schema.js";
import type * as schema from "./schema.js";
import { setDatabaseSecurityContext } from "./security-context.js";

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;

const queueStatuses: readonly FeedbackTriageQueueStatus[] = [
  "NOVO",
  "TRIADO",
  "EM_TRATAMENTO",
  "AGUARDA_USUARIO",
  "RESOLVIDO",
  "DUPLICADO",
  "NAO_REPRODUZIDO",
  "NAO_PLANEJADO",
];

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const cursorPattern = /^[A-Za-z0-9_-]{1,512}$/u;
const hashPattern = /^[a-f0-9]{64}$/u;
const minimumCursorSecretBytes = 32;

type FeedbackTriageQueueReadQuery = Parameters<
  FeedbackTriageQueueReadPort["listFeedbackTickets"]
>[0];

export type FeedbackTriageQueueCursor = Readonly<{
  readonly version: 1;
  readonly ticketId: string;
  readonly createdAt: Date;
  readonly scopeId: string;
  readonly queryHash: string;
}>;

export type FeedbackTriageQueueRepository = FeedbackTriageQueueReadPort &
  Readonly<{
    readonly findFeedbackTicketParticipant: (
      ticketId: string,
      scopeId: string,
    ) => Promise<string | null>;
  }>;

function assertQuery(query: FeedbackTriageQueueReadQuery): void {
  if (query.scopeId.trim().length === 0) {
    throw new FeedbackTriageQueueQueryError("scopeId is required");
  }
  if (!uuidPattern.test(query.scopeId)) {
    throw new FeedbackTriageQueueQueryError("scopeId is invalid");
  }
  if (!Number.isInteger(query.limit) || query.limit < 1 || query.limit > 100) {
    throw new FeedbackTriageQueueQueryError("limit is invalid");
  }
  if (query.status !== undefined && !queueStatuses.includes(query.status)) {
    throw new FeedbackTriageQueueQueryError("status is invalid");
  }
  if (query.cursor !== undefined && !cursorPattern.test(query.cursor)) {
    throw new FeedbackTriageQueueQueryError("cursor is invalid");
  }
}

function assertUuid(value: string, field: string): void {
  if (!uuidPattern.test(value)) throw new TypeError(`${field} is invalid`);
}

function assertCursorSecret(value: string): void {
  if (
    typeof value !== "string" ||
    Buffer.byteLength(value, "utf8") < minimumCursorSecretBytes
  ) {
    throw new TypeError("cursor secret is invalid");
  }
}

function cursorPayload(cursor: FeedbackTriageQueueCursor): string {
  return JSON.stringify({
    version: cursor.version,
    ticketId: cursor.ticketId,
    createdAt: cursor.createdAt.toISOString(),
    scopeId: cursor.scopeId,
    queryHash: cursor.queryHash,
  });
}

function cursorSignature(payload: string, cursorSecret: string): string {
  assertCursorSecret(cursorSecret);
  return createHmac("sha256", cursorSecret)
    .update(payload, "utf8")
    .digest("hex");
}

export function feedbackTriageQueueQueryFingerprint(
  query: FeedbackTriageQueueReadQuery,
): string {
  const canonical: readonly (string | number | null)[] = [
    query.scopeId,
    query.status ?? null,
    query.limit,
  ];
  return createHash("sha256")
    .update(JSON.stringify(canonical), "utf8")
    .digest("hex");
}

export function encodeFeedbackTriageQueueCursor(
  cursor: FeedbackTriageQueueCursor,
  cursorSecret: string,
): string {
  assertCursorSecret(cursorSecret);
  assertUuid(cursor.ticketId, "ticketId");
  assertUuid(cursor.scopeId, "scopeId");
  if (cursor.version !== 1) throw new TypeError("cursor version is invalid");
  if (!hashPattern.test(cursor.queryHash)) {
    throw new TypeError("cursor query hash is invalid");
  }
  if (Number.isNaN(cursor.createdAt.getTime())) {
    throw new TypeError("createdAt is invalid");
  }
  const payload = cursorPayload(cursor);
  return Buffer.from(
    JSON.stringify({
      version: cursor.version,
      ticketId: cursor.ticketId,
      createdAt: cursor.createdAt.toISOString(),
      scopeId: cursor.scopeId,
      queryHash: cursor.queryHash,
      signature: cursorSignature(payload, cursorSecret),
    }),
    "utf8",
  ).toString("base64url");
}

export function decodeFeedbackTriageQueueCursor(
  value: string,
  cursorSecret: string,
): FeedbackTriageQueueCursor {
  assertCursorSecret(cursorSecret);
  if (!cursorPattern.test(value)) {
    throw new FeedbackTriageQueueQueryError("cursor is invalid");
  }
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    );
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed) ||
      !Object.hasOwn(parsed, "ticketId") ||
      !Object.hasOwn(parsed, "createdAt") ||
      !Object.hasOwn(parsed, "version") ||
      !Object.hasOwn(parsed, "scopeId") ||
      !Object.hasOwn(parsed, "queryHash") ||
      !Object.hasOwn(parsed, "signature")
    ) {
      throw new TypeError("cursor payload is invalid");
    }
    const candidate = parsed as Record<string, unknown>;
    const expectedKeys = [
      "createdAt",
      "queryHash",
      "signature",
      "scopeId",
      "ticketId",
      "version",
    ].sort();
    if (
      JSON.stringify(Object.keys(candidate).sort()) !==
      JSON.stringify(expectedKeys)
    ) {
      throw new TypeError("cursor payload is invalid");
    }
    if (
      typeof candidate.ticketId !== "string" ||
      typeof candidate.createdAt !== "string" ||
      candidate.version !== 1 ||
      typeof candidate.scopeId !== "string" ||
      typeof candidate.queryHash !== "string" ||
      typeof candidate.signature !== "string"
    ) {
      throw new TypeError("cursor payload is invalid");
    }
    const createdAt = new Date(candidate.createdAt);
    assertUuid(candidate.ticketId, "ticketId");
    assertUuid(candidate.scopeId, "scopeId");
    if (!hashPattern.test(candidate.queryHash)) {
      throw new TypeError("cursor query hash is invalid");
    }
    if (Number.isNaN(createdAt.getTime())) {
      throw new TypeError("createdAt is invalid");
    }
    if (!hashPattern.test(candidate.signature)) {
      throw new TypeError("cursor signature is invalid");
    }
    const unsignedPayload = JSON.stringify({
      version: candidate.version,
      ticketId: candidate.ticketId,
      createdAt: createdAt.toISOString(),
      scopeId: candidate.scopeId,
      queryHash: candidate.queryHash,
    });
    const expectedSignature = Buffer.from(
      cursorSignature(unsignedPayload, cursorSecret),
      "hex",
    );
    const actualSignature = Buffer.from(candidate.signature, "hex");
    if (
      expectedSignature.length !== actualSignature.length ||
      !timingSafeEqual(expectedSignature, actualSignature)
    ) {
      throw new TypeError("cursor signature is invalid");
    }
    return Object.freeze({
      version: 1,
      ticketId: candidate.ticketId,
      createdAt,
      scopeId: candidate.scopeId,
      queryHash: candidate.queryHash,
    });
  } catch {
    throw new FeedbackTriageQueueQueryError("cursor is invalid");
  }
}

export function createFeedbackTriageQueueRepository(
  db: DatabaseExecutor,
  options: Readonly<{
    readonly now?: () => Date;
    readonly cursorSecret: string;
  }>,
): FeedbackTriageQueueRepository {
  assertCursorSecret(options.cursorSecret);
  const now = options.now ?? (() => new Date());
  return Object.freeze({
    listFeedbackTickets: async (
      query: Parameters<FeedbackTriageQueueReadPort["listFeedbackTickets"]>[0],
    ): Promise<FeedbackTriageQueueState> => {
      assertQuery(query);
      const cursor =
        query.cursor === undefined
          ? undefined
          : decodeFeedbackTriageQueueCursor(query.cursor, options.cursorSecret);
      if (
        cursor !== undefined &&
        (cursor.scopeId !== query.scopeId ||
          cursor.queryHash !== feedbackTriageQueueQueryFingerprint(query))
      ) {
        throw new FeedbackTriageQueueQueryError(
          "cursor does not belong to this query",
        );
      }
      return db.transaction(async (transaction) => {
        const executor = transaction as unknown as DatabaseExecutor;
        await setDatabaseSecurityContext(executor, { scopeId: query.scopeId });
        const predicates = [
          eq(feedbackTickets.scopeId, query.scopeId),
          ...(query.status === undefined
            ? []
            : [eq(feedbackTickets.status, query.status)]),
        ];
        if (cursor !== undefined) {
          const cursorPredicate = or(
            lt(feedbackTickets.createdAt, cursor.createdAt),
            and(
              eq(feedbackTickets.createdAt, cursor.createdAt),
              lt(feedbackTickets.id, cursor.ticketId),
            ),
          );
          if (cursorPredicate === undefined) {
            throw new FeedbackTriageQueueQueryError(
              "cursor predicate is invalid",
            );
          }
          predicates.push(cursorPredicate);
        }
        const rows = await executor
          .select()
          .from(feedbackTickets)
          .where(and(...predicates))
          .orderBy(desc(feedbackTickets.createdAt), desc(feedbackTickets.id))
          .limit(query.limit + 1);
        const hasNext = rows.length > query.limit;
        const items = rows.slice(0, query.limit).map((row) => {
          const scoped = feedbackTicketRowToState(
            row as FeedbackTicketRowShape,
          );
          return Object.freeze({
            ticketId: scoped.state.ticketId,
            type: scoped.state.type,
            description: scoped.state.description,
            createdAt: scoped.state.createdAt,
            status: scoped.state.status,
            version: scoped.state.version,
          });
        });
        const generatedAt = now();
        if (Number.isNaN(generatedAt.getTime())) {
          throw new TypeError("generatedAt is invalid");
        }
        const lastItem = items.at(-1);
        return Object.freeze({
          kind: "feedback_triage_queue" as const,
          scopeId: query.scopeId,
          generatedAt: generatedAt.toISOString(),
          filters: Object.freeze({
            scopeId: query.scopeId,
            ...(query.status === undefined ? {} : { status: query.status }),
            limit: query.limit,
          }),
          items: Object.freeze(items),
          hasNext,
          ...(hasNext && lastItem !== undefined
            ? {
                nextCursor: encodeFeedbackTriageQueueCursor(
                  {
                    version: 1,
                    ticketId: lastItem.ticketId,
                    createdAt: new Date(lastItem.createdAt),
                    scopeId: query.scopeId,
                    queryHash: feedbackTriageQueueQueryFingerprint(query),
                  },
                  options.cursorSecret,
                ),
              }
            : {}),
        });
      });
    },
    findFeedbackTicketParticipant: async (
      ticketId: string,
      scopeId: string,
    ): Promise<string | null> => {
      assertUuid(ticketId, "ticketId");
      assertUuid(scopeId, "scopeId");
      return db.transaction(async (transaction) => {
        const executor = transaction as unknown as DatabaseExecutor;
        await setDatabaseSecurityContext(executor, { scopeId });
        const rows = await executor
          .select({ participantId: feedbackTickets.participantId })
          .from(feedbackTickets)
          .where(
            and(
              eq(feedbackTickets.id, ticketId),
              eq(feedbackTickets.scopeId, scopeId),
            ),
          )
          .limit(1);
        return rows[0]?.participantId ?? null;
      });
    },
  });
}
