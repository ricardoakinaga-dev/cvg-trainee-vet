import type {
  EmbeddingPort,
  VectorPointMetadata,
  VectorStorePort,
} from "@cvg/integrations";
import type {
  ContentIndexSourcePort,
  IndexableContentRecord,
} from "@cvg/persistence";

import {
  createInternalVectorPoint,
  createInternalVectorPointMetadata,
} from "./indexing.js";

export const QDRANT_RECONCILIATION_LOCK_KEY = "cvg:qdrant:reconcile";

export type VectorReconciliationDependencies = Readonly<{
  readonly source: ContentIndexSourcePort;
  readonly embedding: EmbeddingPort | null;
  readonly vectorStore: VectorStorePort | null;
  readonly withExclusiveLock: (
    work: () => Promise<VectorReconciliationResult>,
  ) => Promise<VectorReconciliationResult>;
}>;

export type VectorReconciliationResult = Readonly<{
  readonly expected: number;
  readonly upserted: number;
  readonly removed: number;
}>;

function sameMetadata(
  left: VectorPointMetadata | undefined,
  right: VectorPointMetadata,
): boolean {
  if (left === undefined) return false;
  return (
    left.id === right.id &&
    left.knowledgeId === right.knowledgeId &&
    left.sectionId === right.sectionId &&
    left.scopeId === right.scopeId &&
    left.contentHash === right.contentHash &&
    left.indexVersion === right.indexVersion &&
    left.embeddingModel === right.embeddingModel
  );
}

type ContentFence = NonNullable<
  ContentIndexSourcePort["withContentVersionFence"]
>;

async function reconcilePublishedRecord(
  record: IndexableContentRecord,
  vector: readonly number[] | undefined,
  fence: ContentFence,
  vectorStore: VectorStorePort,
  expected: Map<string, VectorPointMetadata>,
): Promise<boolean> {
  let upserted = false;
  await fence(record.contentId, record.version, async (current) => {
    if (current === null) return;
    if (
      current.contentId !== record.contentId ||
      current.version !== record.version ||
      current.scopeId !== record.scopeId ||
      current.text !== record.text
    )
      throw new Error("published index source changed during embedding");
    const metadata = createInternalVectorPointMetadata(
      current,
      vectorStore.indexVersion,
      vectorStore.embeddingModel,
    );
    expected.set(metadata.id, metadata);
    if (vector !== undefined) {
      await vectorStore.upsert([createInternalVectorPoint(current, vector)]);
      upserted = true;
    }
  });
  return upserted;
}

async function removeStaleVersions(
  existing: readonly VectorPointMetadata[],
  expected: Map<string, VectorPointMetadata>,
  fence: ContentFence,
  vectorStore: VectorStorePort,
): Promise<number> {
  const groups = new Map<
    string,
    { contentId: string; version: number; ids: string[] }
  >();
  for (const point of existing) {
    if (expected.has(point.id)) continue;
    const prefix = `${point.knowledgeId}:v`;
    const versionText = point.sectionId.startsWith(prefix)
      ? point.sectionId.slice(prefix.length)
      : "";
    const version = Number(versionText);
    if (!/^[1-9][0-9]*$/u.test(versionText) || !Number.isSafeInteger(version))
      throw new Error("indexed content version identity is invalid");
    const key = JSON.stringify([point.knowledgeId, version]);
    const group = groups.get(key) ?? {
      contentId: point.knowledgeId,
      version,
      ids: [],
    };
    group.ids.push(point.id);
    groups.set(key, group);
  }
  let removed = 0;
  for (const group of groups.values()) {
    await fence(group.contentId, group.version, async (current) => {
      if (current !== null) {
        if (
          current.contentId !== group.contentId ||
          current.version !== group.version
        )
          throw new Error(
            "published index source identity differs from deletion fence",
          );
        const metadata = createInternalVectorPointMetadata(
          current,
          vectorStore.indexVersion,
          vectorStore.embeddingModel,
        );
        expected.set(metadata.id, metadata);
        return;
      }
      await vectorStore.delete(group.ids);
      removed += group.ids.length;
    });
  }
  return removed;
}

export async function reconcileVectorIndex(
  dependencies: VectorReconciliationDependencies,
): Promise<VectorReconciliationResult> {
  const { embedding, vectorStore } = dependencies;
  if (embedding === null && vectorStore === null) {
    return Object.freeze({ expected: 0, upserted: 0, removed: 0 });
  }
  if (embedding === null || vectorStore === null) {
    throw new Error(
      "reconciliation requires both embedding and vector store, or neither when disabled",
    );
  }

  if (embedding.model !== vectorStore.embeddingModel) {
    throw new Error(
      "embedding model does not match vector index configuration",
    );
  }

  const fence = dependencies.source.withContentVersionFence;
  if (fence === undefined)
    throw new Error("content version effect fence is not configured");

  return dependencies.withExclusiveLock(async () => {
    const content = (await dependencies.source.listPublishedIndexable()).map(
      (record) => Object.freeze({ ...record }),
    );
    const expectedMetadata = content.map((record) =>
      createInternalVectorPointMetadata(
        record,
        vectorStore.indexVersion,
        vectorStore.embeddingModel,
      ),
    );
    const expectedById = new Map<string, VectorPointMetadata>();
    const existing = await vectorStore.list();
    const existingById = new Map(
      existing.map((point) => [point.id, point] as const),
    );
    const changedRecords = content.filter((record, index) => {
      const metadata = expectedMetadata[index];
      if (metadata === undefined) {
        throw new Error("reconciliation metadata set is incomplete");
      }
      return !sameMetadata(existingById.get(metadata.id), metadata);
    });
    const vectors =
      changedRecords.length === 0
        ? []
        : await embedding.embed(changedRecords.map((record) => record.text));
    if (vectors.length !== changedRecords.length) {
      throw new Error("embedding provider returned an unexpected vector count");
    }

    const vectorsById = new Map(
      changedRecords.map((record, index) => {
        const vector = vectors[index];
        if (vector === undefined) {
          throw new Error(
            "embedding provider returned an incomplete vector set",
          );
        }
        const metadata = createInternalVectorPointMetadata(
          record,
          vectorStore.indexVersion,
          vectorStore.embeddingModel,
        );
        return [metadata.id, vector] as const;
      }),
    );
    let upserted = 0;
    for (const record of content) {
      const metadata = createInternalVectorPointMetadata(
        record,
        vectorStore.indexVersion,
        vectorStore.embeddingModel,
      );
      if (
        await reconcilePublishedRecord(
          record,
          vectorsById.get(metadata.id),
          fence,
          vectorStore,
          expectedById,
        )
      )
        upserted += 1;
    }
    const removed = await removeStaleVersions(
      existing,
      expectedById,
      fence,
      vectorStore,
    );

    return Object.freeze({
      expected: expectedById.size,
      upserted,
      removed,
    });
  });
}
