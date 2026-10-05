import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { and, eq, inArray, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { processOutboxOnce } from "../../apps/worker/src/loop.js";
import { guardWorkerEffect } from "../../apps/worker/src/lease-guard.js";
import { createIntegrationHandlers } from "../../apps/worker/src/handlers.js";
import { createOutboxRepository } from "../../packages/persistence/src/outbox-repository.js";
import { createContentIndexSourceRepository } from "../../packages/persistence/src/content-repository.js";
import {
  createPostgresDatabase,
  type DatabaseHandle,
} from "../../packages/persistence/src/database.js";
import {
  contentVersions,
  outboxEvents,
} from "../../packages/persistence/src/schema.js";
import { setDatabaseSecurityContext } from "../../packages/persistence/src/security-context.js";
import type {
  InternalVectorPoint,
  VectorStorePort,
} from "../../packages/integrations/src/qdrant.js";
import {
  closeLivePostgresHarness,
  openLivePostgresHarness,
  type LivePostgresHarness,
  liveDatabaseUrl,
} from "./live-postgres-harness.js";

function deferred() {
  let resolve: () => void = () => {
    throw new Error("deferred not initialized");
  };
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function proof(label: string, value: unknown) {
  process.stdout.write(`${label} ${JSON.stringify(value)}\n`);
}

describe.skipIf(
  process.env.CVG_RUN_LIVE_DB_TESTS !== "true" || liveDatabaseUrl === undefined,
)(
  "real PostgreSQL worker fencing (vector provider DOUBLE, NOT real Qdrant)",
  () => {
    let harness: LivePostgresHarness;
    let second: DatabaseHandle;
    let ids: string[];
    let contentIds: string[];
    beforeEach(async () => {
      harness = await openLivePostgresHarness();
      if (liveDatabaseUrl === undefined)
        throw new Error("application URL required");
      second = createPostgresDatabase(liveDatabaseUrl);
      ids = [];
      contentIds = [];
    });
    afterEach(async () => {
      await harness.admin.db
        .delete(outboxEvents)
        .where(inArray(outboxEvents.id, ids));
      await harness.admin.db
        .delete(contentVersions)
        .where(inArray(contentVersions.contentId, contentIds));
      await second.close();
      await closeLivePostgresHarness(harness);
    });
    async function insert(
      size = 1,
      attempts = 0,
      eventType = "synthetic.worker.r6",
      payload: Record<string, unknown> = {},
    ) {
      const values = Array.from({ length: size }, (_, index) => {
        const id = randomUUID();
        ids.push(id);
        return {
          id,
          eventType,
          aggregateType: "synthetic",
          aggregateId: randomUUID(),
          correlationId: randomUUID(),
          payload,
          attempts,
          occurredAt: new Date(),
          schemaVersion: 1,
          createdAt: new Date(index),
          availableAt: new Date(0),
        };
      });
      await harness.application.db.insert(outboxEvents).values(values);
      return values.map((value) => value.id);
    }
    async function published() {
      const contentId = randomUUID();
      contentIds.push(contentId);
      const scopeId = randomUUID();
      await harness.admin.db.insert(contentVersions).values({
        id: randomUUID(),
        contentId,
        scopeId,
        version: 1,
        status: "PUBLICADO",
        kind: "LEITURA",
        title: "Synthetic R6",
        participantText: "Synthetic authoritative text",
        responseMode: "NONE",
      });
      return { contentId, scopeId };
    }
    async function withdraw(contentId: string, scopeId: string) {
      await second.db.transaction(async (tx) => {
        await setDatabaseSecurityContext(tx, { scopeId });
        await tx
          .update(contentVersions)
          .set({ status: "RETIRADO" })
          .where(
            and(
              eq(contentVersions.contentId, contentId),
              eq(contentVersions.version, 1),
            ),
          );
      });
    }
    function vectors() {
      const points = new Map<string, InternalVectorPoint>();
      const store: VectorStorePort = {
        indexVersion: "synthetic-r6",
        embeddingModel: "synthetic-double",
        healthcheck: async () => {},
        ensureCollection: async () => {},
        list: async () => [],
        search: async () => [],
        upsert: vi.fn(async (batch) => {
          for (const point of batch) points.set(point.id, point);
        }),
        delete: vi.fn(async (keys) => {
          for (const key of keys) points.delete(key);
        }),
      };
      return { points, store };
    }
    it("uses separate least privilege application and administrative roles", () => {
      expect(harness.applicationRole).toMatchObject({
        isSuperuser: false,
        bypassesRls: false,
        canCreateRoles: false,
        canCreateDatabases: false,
        canReplicate: false,
      });
      expect(harness.adminRole.isSuperuser).toBe(true);
      expect(harness.applicationRole.roleName).not.toBe(
        harness.adminRole.roleName,
      );
      proof("R6_ROLES", {
        application: harness.applicationRole,
        admin: harness.adminRole,
      });
    });
    it("claims 25 JIT and renews a real heartbeat beyond the initial lease deadline", async () => {
      await insert(25);
      const repository = createOutboxRepository(harness.application.db);
      const claim = vi.fn(repository.claim);
      let first = true;
      const effects: string[] = [];
      const result = await processOutboxOnce(
        { ...repository, claim },
        {
          "synthetic.worker.r6": async (event) => {
            if (first) {
              first = false;
              if (event.lockedUntil === null)
                throw new Error("deadline required");
              const originalDeadline = event.lockedUntil.getTime();
              await delay(1450);
              expect(Date.now()).toBeGreaterThan(originalDeadline);
              const rows = await second.db
                .select()
                .from(outboxEvents)
                .where(eq(outboxEvents.id, event.id));
              const renewed = rows[0]?.lockedUntil;
              expect(renewed?.getTime()).toBeGreaterThan(Date.now());
              expect(rows[0]?.attempts).toBe(1);
              expect(
                await createOutboxRepository(second.db).claim(1, new Date(), 1),
              ).toHaveLength(1);
              // The competing instance claims a different queued row, never the live job.
              const competing = await second.db
                .select()
                .from(outboxEvents)
                .where(eq(outboxEvents.status, "PROCESSING"));
              expect(competing).toHaveLength(2);
              const other = competing.find((row) => row.id !== event.id);
              if (other === undefined || other.leaseToken === null)
                throw new Error("competing claim missing");
              expect(
                await createOutboxRepository(second.db).markProcessed(
                  other.id,
                  other.leaseToken,
                  new Date(),
                ),
              ).toBe(true);
              proof("R6_REAL_HEARTBEAT", {
                originalDeadline,
                observedAt: Date.now(),
                renewedDeadline: renewed?.getTime(),
              });
            }
            await guardWorkerEffect(async () => {
              effects.push(event.id);
            });
          },
        },
        { batchSize: 25, leaseSeconds: 1 },
      );
      expect(result).toEqual({ claimed: 24, processed: 24, failed: 0 });
      expect(new Set(effects).size).toBe(24);
      expect(claim.mock.calls.every(([limit]) => limit === 1)).toBe(true);
      const rows = await harness.application.db
        .select()
        .from(outboxEvents)
        .where(inArray(outboxEvents.id, ids));
      expect(
        rows.every((row) => row.status === "PROCESSED" && row.attempts === 1),
      ).toBe(true);
    });
    it("keeps the material row fence through a slow effect and still acknowledges once", async () => {
      await insert();
      const repository = createOutboxRepository(harness.application.db);
      const rival = createOutboxRepository(second.db);
      const entered = deferred();
      const release = deferred();
      let effects = 0;
      const pending = processOutboxOnce(
        repository,
        {
          "synthetic.worker.r6": async () => {
            await guardWorkerEffect(async () => {
              entered.resolve();
              await release.promise;
              effects += 1;
            });
          },
        },
        { batchSize: 1, leaseSeconds: 1 },
      );
      try {
        await entered.promise;
        await delay(1400);
        expect(await rival.claim(1, new Date(), 1)).toEqual([]);
      } finally {
        release.resolve();
      }
      expect(await pending).toEqual({ claimed: 1, processed: 1, failed: 0 });
      expect(effects).toBe(1);
      expect(await rival.claim(1, new Date(), 1)).toEqual([]);
    });
    it("rejects expired and reclaimed tokens for effects, renewals, ACK and failure", async () => {
      await insert();
      const repository = createOutboxRepository(harness.application.db);
      const rival = createOutboxRepository(second.db);
      const event = (await repository.claim(1, new Date(), 1))[0];
      if (event === undefined || event.leaseToken === null)
        throw new Error("claim missing");
      await delay(1100);
      const effect = vi.fn(async () => {});
      const fence = repository.withLeaseFence;
      const renew = repository.renewLease;
      if (fence === undefined || renew === undefined)
        throw new Error("fence contract missing");
      expect(await fence(event.id, event.leaseToken, 1, effect)).toEqual({
        owned: false,
      });
      expect(await renew(event.id, event.leaseToken, 1)).toBe(false);
      expect(
        await repository.markProcessed(event.id, event.leaseToken, new Date()),
      ).toBe(false);
      const reclaimed = (await rival.claim(1, new Date(), 1))[0];
      if (reclaimed === undefined || reclaimed.leaseToken === null)
        throw new Error("reclaim missing");
      expect(reclaimed.attempts).toBe(2);
      expect(reclaimed.leaseToken).not.toBe(event.leaseToken);
      expect(await fence(event.id, event.leaseToken, 1, effect)).toEqual({
        owned: false,
      });
      expect(
        await repository.markFailed(
          event.id,
          event.leaseToken,
          1,
          "stale",
          new Date(),
          0,
          5,
        ),
      ).toBe(false);
      expect(effect).not.toHaveBeenCalled();
      expect(
        await rival.markProcessed(event.id, reclaimed.leaseToken, new Date()),
      ).toBe(true);
    });
    it("terminalizes exhausted claims durably without a sixth effect and permits explicit recovery", async () => {
      await insert(2, 5);
      const repository = createOutboxRepository(harness.application.db);
      const handler = vi.fn(async () => {});
      for (let i = 0; i < 4; i += 1) {
        expect(
          await processOutboxOnce(repository, {
            "synthetic.worker.r6": handler,
          }),
        ).toEqual({ claimed: 0, processed: 0, failed: 0 });
      }
      expect(handler).not.toHaveBeenCalled();
      const rows = await harness.application.db
        .select()
        .from(outboxEvents)
        .where(inArray(outboxEvents.id, ids));
      expect(
        rows.every(
          (row) =>
            row.status === "FAILED" &&
            row.attempts === 5 &&
            row.leaseToken === null &&
            row.lockedUntil === null &&
            row.lastErrorCode === "worker_attempts_exhausted",
        ),
      ).toBe(true);
      await harness.admin.db
        .update(outboxEvents)
        .set({
          status: "PENDING",
          attempts: 4,
          lastErrorCode: null,
          availableAt: new Date(0),
        })
        .where(eq(outboxEvents.id, ids[0] ?? ""));
      expect(
        await processOutboxOnce(repository, { "synthetic.worker.r6": handler }),
      ).toEqual({ claimed: 1, processed: 1, failed: 0 });
      expect(handler).toHaveBeenCalledTimes(1);
      proof("R6_DURABLE_FAILED_AND_MANUAL_RECOVERY", {
        exhausted: rows.length,
        maxAttempts: 5,
      });
    });
    it("denies a resumed provider result after another connection reclaims the event", async () => {
      const content = await published();
      const vector = vectors();
      const entered = deferred();
      const release = deferred();
      const handlers = createIntegrationHandlers({
        source: createContentIndexSourceRepository(harness.application.db),
        vectorStore: vector.store,
        embedding: {
          model: "synthetic-double",
          embed: async () => {
            entered.resolve();
            await release.promise;
            return [[1, 0]];
          },
        },
        ai: null,
      });
      await insert(1, 0, "content.published.v1", {
        content_id: content.contentId,
        version: "1",
      });
      const repository = createOutboxRepository(harness.application.db);
      const rival = createOutboxRepository(second.db);
      const pending = processOutboxOnce(repository, handlers, { batchSize: 1 });
      let reclaimed;
      try {
        await entered.promise;
        await harness.admin.db.execute(sql`update outbox_events
          set locked_until = clock_timestamp() - interval '1 second' where id = ${ids[0]}`);
        reclaimed = (await rival.claim(1, new Date(), 60))[0];
        if (reclaimed === undefined || reclaimed.leaseToken === null)
          throw new Error("reclaim required");
        expect(reclaimed.attempts).toBe(2);
      } finally {
        release.resolve();
      }
      expect(await pending).toEqual({ claimed: 1, processed: 0, failed: 1 });
      expect(vector.store.upsert).not.toHaveBeenCalled();
      const stored = await second.db
        .select()
        .from(outboxEvents)
        .where(inArray(outboxEvents.id, ids));
      expect(stored[0]?.status).toBe("PROCESSING");
      expect(stored[0]?.leaseToken).toBe(reclaimed.leaseToken);
      if (reclaimed.leaseToken === null) throw new Error("token required");
      expect(
        await rival.markFailed(
          reclaimed.id,
          reclaimed.leaseToken,
          2,
          "synthetic_retry",
          new Date(),
          0,
          5,
        ),
      ).toBe(true);
      const resumed = createIntegrationHandlers({
        source: createContentIndexSourceRepository(second.db),
        vectorStore: vector.store,
        embedding: { model: "synthetic-double", embed: async () => [[1, 0]] },
        ai: null,
      });
      expect(await processOutboxOnce(rival, resumed, { batchSize: 1 })).toEqual(
        { claimed: 1, processed: 1, failed: 0 },
      );
      expect(vector.points.size).toBe(1);
      proof("R6_LOST_FENCE", {
        staleResultDenied: true,
        currentAttempt: 3,
        provider: "DOUBLE_NOT_REAL_QDRANT",
      });
    });
    it("withdraw/delete completed during embedding forbids the resumed publish and replay", async () => {
      const content = await published();
      const vector = vectors();
      const entered = deferred();
      const release = deferred();
      const handlers = createIntegrationHandlers({
        source: createContentIndexSourceRepository(harness.application.db),
        vectorStore: vector.store,
        embedding: {
          model: "synthetic-double",
          embed: async () => {
            entered.resolve();
            await release.promise;
            return [[1, 0]];
          },
        },
        ai: null,
      });
      const publishIds = await insert(1, 0, "content.published.v1", {
        content_id: content.contentId,
        version: "1",
      });
      const pending = processOutboxOnce(
        createOutboxRepository(harness.application.db),
        handlers,
        { batchSize: 1 },
      );
      try {
        await entered.promise;
        await withdraw(content.contentId, content.scopeId);
        await insert(1, 0, "content.withdrawn.v1", {
          content_id: content.contentId,
          version: "1",
        });
        expect(
          await processOutboxOnce(createOutboxRepository(second.db), handlers, {
            batchSize: 1,
          }),
        ).toEqual({ claimed: 1, processed: 1, failed: 0 });
        expect(vector.store.delete).toHaveBeenCalledTimes(1);
      } finally {
        release.resolve();
      }
      expect(await pending).toEqual({ claimed: 1, processed: 1, failed: 0 });
      expect(vector.store.upsert).not.toHaveBeenCalled();
      expect(vector.points.size).toBe(0);
      await harness.admin.db
        .update(outboxEvents)
        .set({ status: "PENDING", processedAt: null })
        .where(inArray(outboxEvents.id, publishIds));
      expect(
        await processOutboxOnce(createOutboxRepository(second.db), handlers, {
          batchSize: 1,
          baseRetrySeconds: 0,
        }),
      ).toEqual({ claimed: 1, processed: 0, failed: 1 });
      expect(vector.points.size).toBe(0);
    });
    it("serializes an already-started upsert with withdrawal; retry deletes its result", async () => {
      const content = await published();
      const vector = vectors();
      const entered = deferred();
      const release = deferred();
      const originalUpsert = vector.store.upsert;
      const store: VectorStorePort = {
        ...vector.store,
        upsert: async (points) => {
          entered.resolve();
          await release.promise;
          await originalUpsert(points);
        },
      };
      const handlers = createIntegrationHandlers({
        source: createContentIndexSourceRepository(harness.application.db),
        vectorStore: store,
        embedding: { model: "synthetic-double", embed: async () => [[1, 0]] },
        ai: null,
      });
      await insert(1, 0, "content.published.v1", {
        content_id: content.contentId,
        version: "1",
      });
      const pending = processOutboxOnce(
        createOutboxRepository(harness.application.db),
        handlers,
        { batchSize: 1 },
      );
      try {
        await entered.promise;
        await withdraw(content.contentId, content.scopeId);
        await insert(1, 0, "content.withdrawn.v1", {
          content_id: content.contentId,
          version: "1",
        });
        expect(
          await processOutboxOnce(createOutboxRepository(second.db), handlers, {
            batchSize: 1,
            baseRetrySeconds: 0,
          }),
        ).toEqual({ claimed: 1, processed: 0, failed: 1 });
        expect(vector.store.delete).not.toHaveBeenCalled();
      } finally {
        release.resolve();
      }
      expect(await pending).toEqual({ claimed: 1, processed: 1, failed: 0 });
      expect(vector.points.size).toBe(1);
      expect(
        await processOutboxOnce(createOutboxRepository(second.db), handlers, {
          batchSize: 1,
        }),
      ).toEqual({ claimed: 1, processed: 1, failed: 0 });
      expect(vector.points.size).toBe(0);
      proof("R6_INDEX_SERIALIZATION", {
        provider: "DOUBLE_NOT_REAL_QDRANT",
        finalPoints: vector.points.size,
      });
    });
  },
);
