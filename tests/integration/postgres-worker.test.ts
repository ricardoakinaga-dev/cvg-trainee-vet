import { randomUUID } from "node:crypto";

import { and, eq, inArray, sql } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";

import type { AiTextPort } from "../../packages/integrations/src/ai.js";
import { createIntegrationHandlers } from "../../apps/worker/src/handlers.js";
import {
  processOutboxOnce,
  runWorkerClaimAckProbe,
} from "../../apps/worker/src/loop.js";
import { createPostgresDatabase } from "../../packages/persistence/src/database.js";
import {
  aiSuggestionEvents,
  aiSuggestions,
  contentVersions,
  createAiSuggestionSink,
  createContentIndexSourceRepository,
  createOutboxRepository,
  createOutboxInsert,
  outboxEvents,
} from "../../packages/persistence/src/index.js";

const runLiveDatabaseTests = process.env.CVG_RUN_LIVE_DB_TESTS === "true";
const databaseUrl = process.env.CVG_TEST_WORKER_DATABASE_URL;
type LiveDatabase = ReturnType<typeof createPostgresDatabase>["db"];
type LiveTransactionWork = Parameters<LiveDatabase["transaction"]>[0];
type LiveTransaction = Parameters<LiveTransactionWork>[0];

function failBeforeSuggestionCompletion(database: LiveDatabase): LiveDatabase {
  return new Proxy(database, {
    get(target, property, receiver) {
      if (property !== "transaction") {
        return Reflect.get(target, property, receiver);
      }
      return async (work: LiveTransactionWork) =>
        target.transaction(async (transaction) => {
          let executionCount = 0;
          const faultingTransaction = new Proxy(transaction, {
            get(transactionTarget, transactionProperty, transactionReceiver) {
              if (transactionProperty !== "execute") {
                return Reflect.get(
                  transactionTarget,
                  transactionProperty,
                  transactionReceiver,
                );
              }
              return (
                ...parameters: Parameters<LiveTransaction["execute"]>
              ) => {
                executionCount += 1;
                if (executionCount === 4) {
                  throw new Error("synthetic completion failure");
                }
                return transactionTarget.execute(...parameters);
              };
            },
          });
          return work(faultingTransaction);
        });
    },
  });
}

async function deleteAiSuggestionEvent(
  database: ReturnType<typeof createPostgresDatabase>,
  eventId: string,
): Promise<void> {
  await database.db.transaction(async (transaction) => {
    await transaction.execute(
      sql`select set_config('cvg.ai_suggestion_worker', 'true', true)`,
    );
    await transaction
      .delete(aiSuggestionEvents)
      .where(eq(aiSuggestionEvents.eventId, eventId));
  });
}

describe.skipIf(!runLiveDatabaseTests || databaseUrl === undefined)(
  "PostgreSQL outbox and worker integration",
  () => {
    it("proves claim, lease, acknowledgement, and cleanup against PostgreSQL", async () => {
      if (databaseUrl === undefined)
        throw new Error("test database URL is required");

      const database = createPostgresDatabase(databaseUrl);
      const cleanupEventId = randomUUID();
      try {
        const repository = createOutboxRepository(database.db);
        const result = await runWorkerClaimAckProbe(repository);

        expect(result).toEqual({
          claimed: 1,
          processed: 1,
          failed: 0,
          acknowledged: true,
        });

        await database.db.insert(outboxEvents).values({
          ...createOutboxInsert({
            eventId: cleanupEventId,
            eventType: "worker.cleanup.probe.v1",
            aggregateType: "worker_readiness_probe",
            aggregateId: randomUUID(),
            occurredAt: "2020-01-01T00:00:00.000Z",
            schemaVersion: 1,
            correlationId: randomUUID(),
            payload: { probe: "worker_cleanup_v1" },
          }),
          status: "PROCESSED",
          attempts: 1,
          availableAt: new Date("2020-01-01T00:00:00.000Z"),
          processedAt: new Date("2020-01-01T00:00:00.000Z"),
          createdAt: new Date("2020-01-01T00:00:00.000Z"),
        });
        if (repository.cleanup === undefined) {
          throw new Error("outbox cleanup is not configured");
        }
        await expect(
          repository.cleanup(new Date("2020-01-02T00:00:00.000Z"), 10),
        ).resolves.toBe(1);
      } finally {
        await database.db
          .delete(outboxEvents)
          .where(eq(outboxEvents.eventType, "worker.readiness.probe.v1"));
        await database.db
          .delete(outboxEvents)
          .where(eq(outboxEvents.id, cleanupEventId));
        await database.close();
      }
    });

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
          embedding: {
            embed: async (inputs) => inputs.map(() => [0.1, 0.2]),
          },
          vectorStore: {
            healthcheck: async () => undefined,
            ensureCollection: async () => undefined,
            list: async () => [],
            upsert: async () => undefined,
            delete: async () => undefined,
            search: async () => [],
          },
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
        await deleteAiSuggestionEvent(database, suggestionEventId);
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

    it("does not regenerate an AI draft when the same event is replayed", async () => {
      if (databaseUrl === undefined)
        throw new Error("test database URL is required");

      const database = createPostgresDatabase(databaseUrl);
      const contentId = randomUUID();
      const versionId = randomUUID();
      const scopeId = randomUUID();
      const eventId = randomUUID();
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
          title: "Conteúdo sintético de replay",
          participantText: "Texto interno autoral sintético de replay.",
          responseMode: "NONE",
        });
        await database.db.insert(outboxEvents).values({
          ...createOutboxInsert({
            eventId,
            eventType: "ai.suggestion.requested.v1",
            aggregateType: "content_version",
            aggregateId: contentId,
            occurredAt: new Date().toISOString(),
            schemaVersion: 1,
            correlationId,
            payload: { content_id: contentId, version: "1" },
          }),
          availableAt: processingNow,
        });

        const generateStructured: AiTextPort["generateStructured"] = vi.fn(
          async (request) =>
            request.parse({
              draftText: "Rascunho de replay sintético.",
              warnings: ["Revisar antes de publicar."],
            }),
        );
        const handlers = createIntegrationHandlers({
          source: createContentIndexSourceRepository(database.db),
          embedding: null,
          vectorStore: null,
          ai: { generateStructured },
          suggestionSink: createAiSuggestionSink(database.db, randomUUID),
        });
        const repository = createOutboxRepository(database.db);

        await expect(
          processOutboxOnce(repository, handlers, {
            batchSize: 1,
            now: processingNow,
          }),
        ).resolves.toEqual({ claimed: 1, processed: 1, failed: 0 });
        expect(generateStructured).toHaveBeenCalledOnce();

        await database.db
          .update(outboxEvents)
          .set({
            status: "PROCESSING",
            attempts: 1,
            availableAt: processingNow,
            lockedUntil: processingNow,
            lastErrorCode: null,
            processedAt: null,
          })
          .where(eq(outboxEvents.id, eventId));

        await expect(
          processOutboxOnce(repository, handlers, {
            batchSize: 1,
            now: new Date("2026-08-21T15:00:00.000Z"),
          }),
        ).resolves.toEqual({ claimed: 1, processed: 1, failed: 0 });
        expect(generateStructured).toHaveBeenCalledOnce();
        await expect(
          database.db
            .select({ sourceEventId: aiSuggestions.sourceEventId })
            .from(aiSuggestions)
            .where(eq(aiSuggestions.contentId, contentId)),
        ).resolves.toEqual([{ sourceEventId: eventId }]);

        await expect(
          repository.cleanup(new Date("2999-01-01T00:00:00.000Z"), 10),
        ).resolves.toBeGreaterThanOrEqual(1);
        await database.db.insert(outboxEvents).values({
          ...createOutboxInsert({
            eventId,
            eventType: "ai.suggestion.requested.v1",
            aggregateType: "content_version",
            aggregateId: contentId,
            occurredAt: new Date().toISOString(),
            schemaVersion: 1,
            correlationId,
            payload: { content_id: contentId, version: "1" },
          }),
          availableAt: processingNow,
        });
        await expect(
          processOutboxOnce(repository, handlers, {
            batchSize: 1,
            now: new Date("2026-08-21T15:01:00.000Z"),
          }),
        ).resolves.toEqual({ claimed: 1, processed: 1, failed: 0 });
        expect(generateStructured).toHaveBeenCalledOnce();
      } finally {
        await database.db
          .delete(aiSuggestions)
          .where(eq(aiSuggestions.contentId, contentId));
        await deleteAiSuggestionEvent(database, eventId);
        await database.db
          .delete(outboxEvents)
          .where(eq(outboxEvents.id, eventId));
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

    it("rolls back the draft when completion fails after its upsert", async () => {
      if (databaseUrl === undefined)
        throw new Error("test database URL is required");

      const database = createPostgresDatabase(databaseUrl);
      const contentId = randomUUID();
      const versionId = randomUUID();
      const scopeId = randomUUID();
      const eventId = randomUUID();
      try {
        await database.db.insert(contentVersions).values({
          id: versionId,
          contentId,
          scopeId,
          version: 1,
          status: "PUBLICADO",
          kind: "LEITURA",
          title: "Conteúdo sintético para rollback",
          participantText: "Texto sintético para rollback transacional.",
          responseMode: "NONE",
        });
        await database.db.insert(outboxEvents).values({
          ...createOutboxInsert({
            eventId,
            eventType: "ai.suggestion.requested.v1",
            aggregateType: "content_version",
            aggregateId: contentId,
            occurredAt: new Date().toISOString(),
            schemaVersion: 1,
            correlationId: randomUUID(),
            payload: { content_id: contentId, version: "1" },
          }),
        });
        const sink = createAiSuggestionSink(
          failBeforeSuggestionCompletion(database.db),
          randomUUID,
        );
        const claim = await sink.claimEvent(eventId, contentId, 1);
        expect(claim.state).toBe("ACQUIRED");
        if (claim.state !== "ACQUIRED") {
          throw new Error("AI rollback probe did not acquire its claim");
        }

        await expect(
          sink.saveDraftSuggestion(
            {
              eventId,
              contentId,
              version: 1,
              draftText: "Rascunho sintético que deve sofrer rollback.",
              warnings: [],
            },
            claim.leaseToken,
          ),
        ).rejects.toThrow("synthetic completion failure");
        await expect(
          database.db
            .select({ id: aiSuggestions.id })
            .from(aiSuggestions)
            .where(eq(aiSuggestions.contentId, contentId)),
        ).resolves.toEqual([]);
        await database.db.transaction(async (transaction) => {
          await transaction.execute(
            sql`select set_config('cvg.ai_suggestion_worker', 'true', true)`,
          );
          await expect(
            transaction
              .select({ status: aiSuggestionEvents.status })
              .from(aiSuggestionEvents)
              .where(eq(aiSuggestionEvents.eventId, eventId)),
          ).resolves.toEqual([{ status: "PROCESSING" }]);
        });
      } finally {
        await database.db
          .delete(aiSuggestions)
          .where(eq(aiSuggestions.contentId, contentId));
        await deleteAiSuggestionEvent(database, eventId);
        await database.db
          .delete(outboxEvents)
          .where(eq(outboxEvents.id, eventId));
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

    it("does not let a stale AI worker release a reclaimed event lease", async () => {
      if (databaseUrl === undefined)
        throw new Error("test database URL is required");

      const database = createPostgresDatabase(databaseUrl);
      const eventId = randomUUID();
      const contentId = randomUUID();
      const now = new Date();

      try {
        await database.db.insert(outboxEvents).values({
          ...createOutboxInsert({
            eventId,
            eventType: "ai.suggestion.requested.v1",
            aggregateType: "content_version",
            aggregateId: contentId,
            occurredAt: now.toISOString(),
            schemaVersion: 1,
            correlationId: randomUUID(),
            payload: { content_id: contentId, version: "1" },
          }),
          availableAt: now,
        });
        const sink = createAiSuggestionSink(database.db, randomUUID);

        await expect(
          database.db.transaction(async (transaction) => {
            await transaction.execute(
              sql`select set_config('cvg.ai_suggestion_worker', 'true', true)`,
            );
            await transaction.insert(aiSuggestionEvents).values({
              eventId,
              contentId,
              version: 1,
              status: "PROCESSING",
              leaseToken: randomUUID(),
              lockedUntil: new Date(Date.now() + 60_000),
              completedAt: new Date(),
            });
          }),
        ).rejects.toMatchObject({ cause: { code: "23514" } });

        const firstClaim = await sink.claimEvent(eventId, contentId, 1);
        expect(firstClaim.state).toBe("ACQUIRED");
        if (firstClaim.state !== "ACQUIRED") {
          throw new Error("first AI claim was not acquired");
        }
        await database.db.transaction(async (transaction) => {
          await transaction.execute(
            sql`select set_config('cvg.ai_suggestion_worker', 'true', true)`,
          );
          await transaction
            .update(aiSuggestionEvents)
            .set({ lockedUntil: new Date(0) })
            .where(eq(aiSuggestionEvents.eventId, eventId));
        });
        const secondClaim = await sink.claimEvent(eventId, contentId, 1);
        expect(secondClaim.state).toBe("ACQUIRED");
        if (secondClaim.state !== "ACQUIRED") {
          throw new Error("expired AI claim was not reclaimed");
        }
        expect(secondClaim.leaseToken).not.toBe(firstClaim.leaseToken);

        await expect(
          sink.saveDraftSuggestion(
            {
              eventId,
              contentId,
              version: 1,
              draftText: "Rascunho sintético de worker obsoleto.",
              warnings: [],
            },
            firstClaim.leaseToken,
          ),
        ).resolves.toBe(false);
        await expect(
          database.db
            .select({ id: aiSuggestions.id })
            .from(aiSuggestions)
            .where(eq(aiSuggestions.contentId, contentId)),
        ).resolves.toEqual([]);

        await expect(
          sink.releaseEvent(eventId, firstClaim.leaseToken),
        ).resolves.toBe(false);

        await expect(sink.claimEvent(eventId, contentId, 1)).resolves.toEqual({
          state: "IN_PROGRESS",
          leaseToken: null,
        });
      } finally {
        await deleteAiSuggestionEvent(database, eventId);
        await database.db
          .delete(outboxEvents)
          .where(eq(outboxEvents.id, eventId));
        await database.close();
      }
    });

    it("serializes concurrent AI claims and hides their rows without worker context", async () => {
      if (databaseUrl === undefined)
        throw new Error("test database URL is required");

      const left = createPostgresDatabase(databaseUrl);
      const right = createPostgresDatabase(databaseUrl);
      const eventId = randomUUID();
      const contentId = randomUUID();
      try {
        await left.db.insert(outboxEvents).values({
          ...createOutboxInsert({
            eventId,
            eventType: "ai.suggestion.requested.v1",
            aggregateType: "content_version",
            aggregateId: contentId,
            occurredAt: new Date().toISOString(),
            schemaVersion: 1,
            correlationId: randomUUID(),
            payload: { content_id: contentId, version: "1" },
          }),
        });
        await left.db.transaction(async (transaction) => {
          await transaction.execute(
            sql`select pg_advisory_xact_lock(hashtextextended(${eventId}, 0))`,
          );
          await expect(
            createAiSuggestionSink(right.db, randomUUID).claimEvent(
              eventId,
              contentId,
              1,
            ),
          ).resolves.toEqual({ state: "IN_PROGRESS", leaseToken: null });
        });
        const [first, second] = await Promise.all([
          createAiSuggestionSink(left.db, randomUUID).claimEvent(
            eventId,
            contentId,
            1,
          ),
          createAiSuggestionSink(right.db, randomUUID).claimEvent(
            eventId,
            contentId,
            1,
          ),
        ]);

        expect([first.state, second.state].sort()).toEqual([
          "ACQUIRED",
          "IN_PROGRESS",
        ]);
        await expect(
          left.db
            .select({ eventId: aiSuggestionEvents.eventId })
            .from(aiSuggestionEvents)
            .where(eq(aiSuggestionEvents.eventId, eventId)),
        ).resolves.toEqual([]);
        const catalog = await left.db.execute<{
          readonly rlsEnabled: boolean;
          readonly rlsForced: boolean;
        }>(sql`
          select
            relrowsecurity as "rlsEnabled",
            relforcerowsecurity as "rlsForced"
          from pg_class
          where oid = 'ai_suggestion_events'::regclass
        `);
        expect(catalog).toEqual([
          expect.objectContaining({ rlsEnabled: true, rlsForced: true }),
        ]);
      } finally {
        await deleteAiSuggestionEvent(left, eventId);
        await left.db.delete(outboxEvents).where(eq(outboxEvents.id, eventId));
        await Promise.all([left.close(), right.close()]);
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

        const reclaimedLease = await repository.claim(1, retryNow, 1);
        expect(reclaimedLease).toEqual([
          expect.objectContaining({
            id: leaseEventId,
            status: "PROCESSING",
            attempts: 2,
          }),
        ]);
        const firstLeaseEvent = firstLease[0];
        const reclaimed = reclaimedLease[0];
        if (firstLeaseEvent === undefined || reclaimed === undefined) {
          throw new Error("lease was not reclaimed");
        }
        await expect(
          repository.markProcessed(
            firstLeaseEvent.id,
            firstLeaseEvent.attempts,
            retryNow,
          ),
        ).resolves.toBe(false);
        await repository.markFailed(
          reclaimed.id,
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
