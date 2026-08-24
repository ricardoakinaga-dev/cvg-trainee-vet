import { randomUUID } from "node:crypto";

import { and, eq, inArray, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import type { AiTextPort } from "../../packages/integrations/src/ai.js";
import { createIntegrationHandlers } from "../../apps/worker/src/handlers.js";
import { processOutboxOnce } from "../../apps/worker/src/loop.js";
import { createPostgresDatabase } from "../../packages/persistence/src/database.js";
import {
  aiSuggestions,
  contentVersions,
  createAiSuggestionSink,
  createContentIndexSourceRepository,
  createOutboxRepository,
  createOutboxInsert,
  outboxEvents,
} from "../../packages/persistence/src/index.js";

const runLiveDatabaseTests = process.env.CVG_RUN_LIVE_DB_TESTS === "true";
const databaseUrl = process.env.CVG_TEST_DATABASE_URL;

describe.skipIf(!runLiveDatabaseTests || databaseUrl === undefined)(
  "PostgreSQL outbox and worker integration",
  () => {
    it("claims a redacted event and persists an internal AI draft through the worker", async () => {
      if (databaseUrl === undefined)
        throw new Error("test database URL is required");

      const database = createPostgresDatabase(databaseUrl);
      const contentId = randomUUID();
      const versionId = randomUUID();
      const scopeId = randomUUID();
      const publishEventId = randomUUID();
      const suggestionEventId = randomUUID();
      const correlationId = randomUUID();
      const processingNow = new Date(0);

      try {
        await database.db.insert(contentVersions).values({
          id: versionId,
          contentId,
          scopeId,
          version: 1,
          status: "PUBLICADO",
          kind: "LEITURA",
          title: "Conteúdo sintético para integração",
          participantText: "Texto interno autoral sintético para teste.",
          responseMode: "NONE",
        });
        await database.db.insert(outboxEvents).values([
          {
            ...createOutboxInsert({
              eventId: publishEventId,
              eventType: "content.published.v1",
              aggregateType: "content_version",
              aggregateId: contentId,
              occurredAt: new Date().toISOString(),
              schemaVersion: 1,
              correlationId,
              payload: {
                content_id: contentId,
                version: "1",
                status: "PUBLICADO",
              },
            }),
            availableAt: processingNow,
            createdAt: processingNow,
          },
          {
            ...createOutboxInsert({
              eventId: suggestionEventId,
              eventType: "ai.suggestion.requested.v1",
              aggregateType: "content_version",
              aggregateId: contentId,
              occurredAt: new Date().toISOString(),
              schemaVersion: 1,
              correlationId,
              payload: { content_id: contentId, version: "1" },
            }),
            availableAt: processingNow,
            createdAt: processingNow,
          },
        ]);

        const ai: AiTextPort = {
          generateStructured: async (request) =>
            request.parse({
              draftText: "Rascunho interno para revisão.",
              warnings: ["Revisar antes de publicar."],
            }),
        };
        const handlers = createIntegrationHandlers({
          source: createContentIndexSourceRepository(database.db),
          embedding: null,
          vectorStore: null,
          ai,
          suggestionSink: createAiSuggestionSink(database.db, randomUUID),
        });
        const result = await processOutboxOnce(
          createOutboxRepository(database.db),
          handlers,
          { batchSize: 2, now: processingNow },
        );

        const storedEvents = await database.db
          .select({
            id: outboxEvents.id,
            eventType: outboxEvents.eventType,
            status: outboxEvents.status,
            attempts: outboxEvents.attempts,
            lastErrorCode: outboxEvents.lastErrorCode,
          })
          .from(outboxEvents)
          .where(inArray(outboxEvents.id, [publishEventId, suggestionEventId]));
        const drafts = await database.db
          .select({
            contentId: aiSuggestions.contentId,
            version: aiSuggestions.version,
            status: aiSuggestions.status,
            draftText: aiSuggestions.draftText,
            warnings: aiSuggestions.warnings,
          })
          .from(aiSuggestions)
          .where(
            and(
              eq(aiSuggestions.contentId, contentId),
              eq(aiSuggestions.version, 1),
            ),
          );

        expect(result).toEqual({ claimed: 2, processed: 2, failed: 0 });
        expect(storedEvents).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: publishEventId,
              status: "PROCESSED",
              attempts: 1,
            }),
            expect.objectContaining({
              id: suggestionEventId,
              status: "PROCESSED",
              attempts: 1,
            }),
          ]),
        );
        expect(drafts).toEqual([
          expect.objectContaining({
            contentId,
            version: 1,
            status: "DRAFT_AI",
            draftText: "Rascunho interno para revisão.",
          }),
        ]);
        expect(JSON.stringify(storedEvents)).not.toContain("participantText");
        expect(JSON.stringify(drafts)).not.toContain("Texto interno autoral");
      } finally {
        await database.db
          .delete(aiSuggestions)
          .where(eq(aiSuggestions.contentId, contentId));
        await database.db
          .delete(outboxEvents)
          .where(inArray(outboxEvents.id, [publishEventId, suggestionEventId]));
        await database.db
          .delete(contentVersions)
          .where(
            and(
              eq(contentVersions.scopeId, scopeId),
              eq(contentVersions.id, versionId),
            ),
          );
        await database.close();
      }
    });

    it("fences a stale lease before a reclaimed worker can finalize the event", async () => {
      if (databaseUrl === undefined)
        throw new Error("test database URL is required");

      const database = createPostgresDatabase(databaseUrl);
      const reclaimedDatabase = createPostgresDatabase(databaseUrl);
      const eventId = randomUUID();
      const aggregateId = randomUUID();
      const now = new Date();

      try {
        await database.db.insert(outboxEvents).values({
          ...createOutboxInsert({
            eventId,
            eventType: "synthetic.lease.fenced.v1",
            aggregateType: "synthetic",
            aggregateId,
            occurredAt: now.toISOString(),
            schemaVersion: 1,
            correlationId: randomUUID(),
            payload: { operation: "lease-fencing" },
          }),
          availableAt: now,
          createdAt: new Date("1970-01-01T00:00:00.000Z"),
        });

        const repository = createOutboxRepository(database.db);
        const reclaimedRepository = createOutboxRepository(
          reclaimedDatabase.db,
        );
        const firstClaim = await repository.claim(1, now, 60);
        const first = firstClaim[0];
        if (first === undefined || first.leaseToken === null) {
          throw new Error("first claim must carry a lease token");
        }

        await expect(
          database.db.execute(sql`
            update outbox_events
            set status = 'PROCESSED',
                processed_at = statement_timestamp(),
                locked_until = null
            where id = ${eventId}
          `),
        ).rejects.toThrow();
        await database.db.execute(sql`
          update outbox_events
          set locked_until = statement_timestamp() - interval '1 second'
          where id = ${eventId}
        `);

        const secondClaim = await reclaimedRepository.claim(1, new Date(), 60);
        const second = secondClaim[0];
        if (second === undefined || second.leaseToken === null) {
          throw new Error("reclaimed claim must carry a lease token");
        }
        expect(second.leaseToken).not.toBe(first.leaseToken);

        const [staleResult, currentResult] = await Promise.all([
          repository.markProcessed(eventId, first.leaseToken, new Date()),
          reclaimedRepository.markProcessed(
            eventId,
            second.leaseToken,
            new Date(),
          ),
        ]);
        expect(staleResult).toBe(false);
        expect(currentResult).toBe(true);

        const stored = await database.db
          .select({
            status: outboxEvents.status,
            attempts: outboxEvents.attempts,
            leaseToken: outboxEvents.leaseToken,
          })
          .from(outboxEvents)
          .where(eq(outboxEvents.id, eventId));
        expect(stored).toEqual([
          { status: "PROCESSED", attempts: 2, leaseToken: null },
        ]);
      } finally {
        await database.db
          .delete(outboxEvents)
          .where(eq(outboxEvents.id, eventId));
        await reclaimedDatabase.close();
        await database.close();
      }
    });

    it("fences a stale worker failure before the reclaimed worker retries", async () => {
      if (databaseUrl === undefined)
        throw new Error("test database URL is required");

      const database = createPostgresDatabase(databaseUrl);
      const eventId = randomUUID();
      const now = new Date();

      try {
        await database.db.insert(outboxEvents).values({
          ...createOutboxInsert({
            eventId,
            eventType: "synthetic.lease.failure-fenced.v1",
            aggregateType: "synthetic",
            aggregateId: randomUUID(),
            occurredAt: now.toISOString(),
            schemaVersion: 1,
            correlationId: randomUUID(),
            payload: { operation: "lease-failure-fencing" },
          }),
          availableAt: now,
          createdAt: new Date("1970-01-01T00:00:00.000Z"),
        });

        const repository = createOutboxRepository(database.db);
        const firstClaim = await repository.claim(1, now, 60);
        const first = firstClaim[0];
        if (first === undefined || first.leaseToken === null) {
          throw new Error("first claim must carry a lease token");
        }

        await database.db.execute(sql`
          update outbox_events
          set locked_until = statement_timestamp() - interval '1 second'
          where id = ${eventId}
        `);
        const secondClaim = await repository.claim(1, new Date(), 60);
        const second = secondClaim[0];
        if (second === undefined || second.leaseToken === null) {
          throw new Error("reclaimed claim must carry a lease token");
        }

        await expect(
          repository.markFailed(
            eventId,
            first.leaseToken,
            first.attempts,
            "stale_failure",
            new Date(),
            0,
            3,
          ),
        ).resolves.toBe(false);
        await expect(
          repository.markFailed(
            eventId,
            second.leaseToken,
            second.attempts,
            "reclaimed_failure",
            new Date(),
            0,
            3,
          ),
        ).resolves.toBe(true);

        const stored = await database.db
          .select({
            status: outboxEvents.status,
            attempts: outboxEvents.attempts,
            leaseToken: outboxEvents.leaseToken,
            lastErrorCode: outboxEvents.lastErrorCode,
          })
          .from(outboxEvents)
          .where(eq(outboxEvents.id, eventId));
        expect(stored).toEqual([
          {
            status: "PENDING",
            attempts: 2,
            leaseToken: null,
            lastErrorCode: "reclaimed_failure",
          },
        ]);
      } finally {
        await database.db
          .delete(outboxEvents)
          .where(eq(outboxEvents.id, eventId));
        await database.close();
      }
    });

    it("reclaims an expired lease and reaches dead-letter after bounded retries", async () => {
      if (databaseUrl === undefined)
        throw new Error("test database URL is required");

      const database = createPostgresDatabase(databaseUrl);
      const leaseEventId = randomUUID();
      const retryEventId = randomUUID();
      const leaseAggregateId = randomUUID();
      const retryAggregateId = randomUUID();
      const correlationId = randomUUID();
      const now = new Date("2026-08-10T08:10:00.000Z");
      const retryNow = new Date(now.getTime() + 2_000);

      try {
        await database.db.insert(outboxEvents).values([
          {
            ...createOutboxInsert({
              eventId: leaseEventId,
              eventType: "synthetic.lease.v1",
              aggregateType: "synthetic",
              aggregateId: leaseAggregateId,
              occurredAt: now.toISOString(),
              schemaVersion: 1,
              correlationId,
              payload: { operation: "lease-recovery" },
            }),
            availableAt: now,
            createdAt: now,
          },
          {
            ...createOutboxInsert({
              eventId: retryEventId,
              eventType: "synthetic.retry.v1",
              aggregateType: "synthetic",
              aggregateId: retryAggregateId,
              occurredAt: now.toISOString(),
              schemaVersion: 1,
              correlationId,
              payload: { operation: "retry-recovery" },
            }),
            availableAt: now,
            createdAt: new Date(now.getTime() + 1),
          },
        ]);

        const repository = createOutboxRepository(database.db);
        const firstLease = await repository.claim(1, now, 1);
        expect(firstLease).toEqual([
          expect.objectContaining({
            id: leaseEventId,
            status: "PROCESSING",
            attempts: 1,
          }),
        ]);

        await database.db.execute(sql`
          update outbox_events
          set locked_until = statement_timestamp() - interval '1 second'
          where id = ${leaseEventId}
        `);
        const reclaimedLease = await repository.claim(1, retryNow, 1);
        expect(reclaimedLease).toEqual([
          expect.objectContaining({
            id: leaseEventId,
            status: "PROCESSING",
            attempts: 2,
          }),
        ]);
        const reclaimed = reclaimedLease[0];
        if (reclaimed === undefined || reclaimed.leaseToken === null) {
          throw new Error("lease was not reclaimed with a token");
        }
        await repository.markFailed(
          reclaimed.id,
          reclaimed.leaseToken,
          reclaimed.attempts,
          "synthetic_terminal",
          retryNow,
          0,
          2,
        );

        const failingHandler = {
          "synthetic.retry.v1": async (): Promise<void> => {
            throw new Error("synthetic dependency failure");
          },
        };
        await expect(
          processOutboxOnce(repository, failingHandler, {
            batchSize: 1,
            now: retryNow,
            baseRetrySeconds: 0,
            maxAttempts: 2,
          }),
        ).resolves.toEqual({ claimed: 1, processed: 0, failed: 1 });
        await expect(
          processOutboxOnce(repository, failingHandler, {
            batchSize: 1,
            now: retryNow,
            baseRetrySeconds: 0,
            maxAttempts: 2,
          }),
        ).resolves.toEqual({ claimed: 1, processed: 0, failed: 1 });

        const stored = await database.db
          .select({
            id: outboxEvents.id,
            status: outboxEvents.status,
            attempts: outboxEvents.attempts,
            lastErrorCode: outboxEvents.lastErrorCode,
            lockedUntil: outboxEvents.lockedUntil,
          })
          .from(outboxEvents)
          .where(inArray(outboxEvents.id, [leaseEventId, retryEventId]));
        expect(stored).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: leaseEventId,
              status: "FAILED",
              attempts: 2,
              lastErrorCode: "synthetic_terminal",
              lockedUntil: null,
            }),
            expect.objectContaining({
              id: retryEventId,
              status: "FAILED",
              attempts: 2,
              lastErrorCode: "worker_handler_failed",
              lockedUntil: null,
            }),
          ]),
        );
      } finally {
        await database.db
          .delete(outboxEvents)
          .where(inArray(outboxEvents.id, [leaseEventId, retryEventId]));
        await database.close();
      }
    });
  },
);
