import { randomUUID } from "node:crypto";

import { eq, inArray } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  createDeterministicEmbeddingProvider,
  createQdrantVectorStore,
} from "../../packages/integrations/src/index.js";
import { createIntegrationHandlers } from "../../apps/worker/src/handlers.js";
import {
  createInternalVectorPoint,
  vectorPointId,
} from "../../apps/worker/src/indexing.js";
import { reconcileVectorIndex } from "../../apps/worker/src/reconcile.js";
import { createPostgresDatabase } from "../../packages/persistence/src/database.js";
import { setDatabaseSecurityContext } from "../../packages/persistence/src/security-context.js";
import {
  contentVersions,
  createContentIndexSourceRepository,
} from "../../packages/persistence/src/index.js";
import type { OutboxEventRecord } from "../../packages/persistence/src/index.js";

const syntheticLeaseMarker = "lease-11111111-1111-4111-8111-111111111111";

const runLiveTests =
  process.env.CVG_RUN_LIVE_DB_TESTS === "true" &&
  process.env.CVG_RUN_LIVE_QDRANT_TESTS === "true";
const databaseUrl = process.env.CVG_TEST_DATABASE_URL;
const qdrantUrl = process.env.CVG_TEST_QDRANT_URL;
const qdrantApiKey = process.env.CVG_TEST_QDRANT_API_KEY;

describe.skipIf(
  !runLiveTests || databaseUrl === undefined || qdrantUrl === undefined,
)("live worker and Qdrant resilience", () => {
  it("reconciles non-empty content, repairs divergence/orphans, and replays deterministic events", async () => {
    if (databaseUrl === undefined) {
      throw new Error("test database URL is required");
    }
    if (qdrantUrl === undefined) {
      throw new Error("Qdrant URL is required");
    }

    const database = createPostgresDatabase(databaseUrl);
    const collection = `cvg_worker_live_${Date.now()}`;
    const store = createQdrantVectorStore({
      url: qdrantUrl,
      ...(qdrantApiKey ? { apiKey: qdrantApiKey } : {}),
      collection,
      embeddingDimension: 8,
      embeddingModel: "cvg-live-test-embedding-v1",
      indexVersion: "v1",
    });
    const embedding = createDeterministicEmbeddingProvider({
      model: "cvg-live-test-embedding-v1",
      dimension: 8,
    });
    const firstContentId = randomUUID();
    const secondContentId = randomUUID();
    const firstVersionId = randomUUID();
    const secondVersionId = randomUUID();
    const scopeId = randomUUID();
    const contentIds = [firstContentId, secondContentId];

    try {
      // Staff fixtures run under an explicit staff scope transaction
      // (AAA-104); worker reads resolve through the service identity.
      const staffWrite = async (
        work: (staffDb: typeof database.db) => Promise<unknown>,
      ): Promise<void> => {
        await database.db.transaction(async (transaction) => {
          await setDatabaseSecurityContext(transaction, { scopeId });
          await work(transaction as unknown as typeof database.db);
        });
      };
      await staffWrite((staffDb) =>
        staffDb.insert(contentVersions).values([
          {
            id: firstVersionId,
            contentId: firstContentId,
            scopeId,
            version: 1,
            status: "PUBLICADO",
            kind: "LEITURA",
            title: "Conteúdo sintético A",
            participantText: "Texto sintético publicado A.",
            responseMode: "NONE",
          },
          {
            id: secondVersionId,
            contentId: secondContentId,
            scopeId,
            version: 1,
            status: "PUBLICADO",
            kind: "CASO",
            title: "Conteúdo sintético B",
            participantText: "Texto sintético publicado B.",
            responseMode: "TEXT",
          },
        ]),
      );

      await store.ensureCollection();
      await store.upsert([
        createInternalVectorPoint(
          {
            contentId: firstContentId,
            version: 1,
            scopeId,
            text: "Texto sintético A anterior.",
          },
          [1, 0, 0, 0, 0, 0, 0, 0],
        ),
        {
          id: randomUUID(),
          vector: [0, 1, 0, 0, 0, 0, 0, 0],
          knowledgeId: "orphan-synthetic",
          sectionId: "orphan-synthetic:v1",
          scopeId,
          contentHash: "orphan-hash",
          status: "APPROVED_FOR_INTERNAL_SEARCH",
        },
      ]);

      const contentSource = createContentIndexSourceRepository(database.db);
      const source = {
        findPublishedIndexable: contentSource.findPublishedIndexable,
        listPublishedIndexable: async () =>
          (await contentSource.listPublishedIndexable()).filter(
            (record) => record.scopeId === scopeId,
          ),
      };
      const dependencies = {
        source,
        embedding,
        vectorStore: store,
        // Real PostgreSQL advisory lock: this live path also proves
        // cross-process-safe serialization of the worker reconciliation.
        withExclusiveLock: <Result>(work: () => Promise<Result>) =>
          database.withAdvisoryLock("cvg:qdrant:reconcile-live-test", work),
      };

      await expect(reconcileVectorIndex(dependencies)).resolves.toEqual({
        expected: 2,
        upserted: 2,
        removed: 1,
      });
      const firstList = await store.list();
      expect(firstList).toHaveLength(2);
      expect(firstList.map((point) => point.knowledgeId).sort()).toEqual(
        [...contentIds].sort(),
      );

      await expect(reconcileVectorIndex(dependencies)).resolves.toEqual({
        expected: 2,
        upserted: 0,
        removed: 0,
      });
      await staffWrite((staffDb) =>
        staffDb
          .update(contentVersions)
          .set({ participantText: "Texto sintético publicado B revisado." })
          .where(eq(contentVersions.id, secondVersionId)),
      );
      await expect(reconcileVectorIndex(dependencies)).resolves.toEqual({
        expected: 2,
        upserted: 1,
        removed: 0,
      });

      const handlers = createIntegrationHandlers(dependencies);
      const publishEvent = {
        id: randomUUID(),
        eventType: "content.published.v1",
        aggregateType: "content_version",
        aggregateId: firstContentId,
        occurredAt: new Date("2026-08-10T08:00:00.000Z"),
        schemaVersion: 1,
        correlationId: randomUUID(),
        payload: {
          content_id: firstContentId,
          version: "1",
          status: "PUBLICADO",
        },
        status: "PROCESSING",
        attempts: 1,
        availableAt: new Date("2026-08-10T08:00:00.000Z"),
        lockedUntil: new Date("2026-08-10T08:01:00.000Z"),
        leaseToken: syntheticLeaseMarker,
        lastErrorCode: null,
        processedAt: null,
        createdAt: new Date("2026-08-10T08:00:00.000Z"),
      } satisfies OutboxEventRecord;
      await handlers["content.published.v1"](publishEvent);
      await handlers["content.published.v1"](publishEvent);

      const replayedList = await store.list();
      expect(replayedList).toHaveLength(2);
      expect(replayedList.map((point) => point.id)).toContain(
        vectorPointId(firstContentId, 1),
      );

      await handlers["content.withdrawn.v1"]({
        ...publishEvent,
        eventType: "content.withdrawn.v1",
        payload: { content_id: firstContentId, version: "1" },
      });
      await expect(store.list()).resolves.toEqual([
        expect.objectContaining({ knowledgeId: secondContentId }),
      ]);

      await staffWrite((staffDb) =>
        staffDb
          .update(contentVersions)
          .set({ status: "RETIRADO" })
          .where(eq(contentVersions.id, firstVersionId)),
      );
      await expect(reconcileVectorIndex(dependencies)).resolves.toEqual({
        expected: 1,
        upserted: 0,
        removed: 0,
      });
      await expect(store.list()).resolves.toEqual([
        expect.objectContaining({
          knowledgeId: secondContentId,
          scopeId,
        }),
      ]);
    } finally {
      await database.db.transaction(async (transaction) => {
        await setDatabaseSecurityContext(transaction, { scopeId });
        const staffDb = transaction as unknown as typeof database.db;
        await staffDb
          .delete(contentVersions)
          .where(inArray(contentVersions.contentId, contentIds));
      });
      const headers = qdrantApiKey ? { "api-key": qdrantApiKey } : undefined;
      await fetch(`${qdrantUrl}/collections/${collection}`, {
        method: "DELETE",
        ...(headers ? { headers } : {}),
      });
      await database.close();
    }
  });
});
