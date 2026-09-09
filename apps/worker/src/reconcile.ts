import type {
  EmbeddingPort,
  VectorPointMetadata,
  VectorStorePort,
} from "@cvg/integrations";
import type { ContentIndexSourcePort } from "@cvg/persistence";

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

  return dependencies.withExclusiveLock(async () => {
    const content = await dependencies.source.listPublishedIndexable();
    const expectedMetadata = content.map((record) =>
      createInternalVectorPointMetadata(
        record,
        vectorStore.indexVersion,
        vectorStore.embeddingModel,
      ),
    );
    const expectedById = new Map(
      expectedMetadata.map((metadata) => [metadata.id, metadata] as const),
    );
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

    const changed = changedRecords.map((record, index) => {
      const vector = vectors[index];
      if (vector === undefined) {
        throw new Error("embedding provider returned an incomplete vector set");
      }
      return createInternalVectorPoint(record, vector);
    });
    const stale = existing
      .filter((point) => !expectedById.has(point.id))
      .map((point) => point.id);

    if (changed.length > 0) await vectorStore.upsert(changed);
    if (stale.length > 0) await vectorStore.delete(stale);

    return Object.freeze({
      expected: expectedMetadata.length,
      upserted: changed.length,
      removed: stale.length,
    });
  });
}
