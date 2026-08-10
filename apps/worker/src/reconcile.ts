import type {
  EmbeddingPort,
  VectorPointMetadata,
  VectorStorePort,
} from "@cvg/integrations";
import type { ContentIndexSourcePort } from "@cvg/persistence";

import { createInternalVectorPoint } from "./indexing.js";

export type VectorReconciliationDependencies = Readonly<{
  readonly source: ContentIndexSourcePort;
  readonly embedding: EmbeddingPort | null;
  readonly vectorStore: VectorStorePort | null;
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
  return (
    left?.id === right.id &&
    left.knowledgeId === right.knowledgeId &&
    left.sectionId === right.sectionId &&
    left.scopeId === right.scopeId &&
    left.contentHash === right.contentHash
  );
}

export async function reconcileVectorIndex(
  dependencies: VectorReconciliationDependencies,
): Promise<VectorReconciliationResult> {
  if (dependencies.embedding === null || dependencies.vectorStore === null) {
    return Object.freeze({ expected: 0, upserted: 0, removed: 0 });
  }

  const content = await dependencies.source.listPublishedIndexable();
  const vectors = await dependencies.embedding.embed(
    content.map((record) => record.text),
  );
  if (vectors.length !== content.length) {
    throw new Error("embedding provider returned an unexpected vector count");
  }

  const expectedPoints = content.map((record, index) => {
    const vector = vectors[index];
    if (vector === undefined) {
      throw new Error("embedding provider returned an incomplete vector set");
    }
    return createInternalVectorPoint(record, vector);
  });
  const expectedById = new Map(
    expectedPoints.map((point) => [point.id, point] as const),
  );
  const existing = await dependencies.vectorStore.list();
  const existingById = new Map(
    existing.map((point) => [point.id, point] as const),
  );
  const changed = expectedPoints.filter((point) => {
    const metadata: VectorPointMetadata = {
      id: point.id,
      knowledgeId: point.knowledgeId,
      sectionId: point.sectionId,
      scopeId: point.scopeId,
      contentHash: point.contentHash,
    };
    return !sameMetadata(existingById.get(point.id), metadata);
  });
  const stale = existing
    .filter((point) => !expectedById.has(point.id))
    .map((point) => point.id);

  if (changed.length > 0) await dependencies.vectorStore.upsert(changed);
  if (stale.length > 0) await dependencies.vectorStore.delete(stale);

  return Object.freeze({
    expected: expectedPoints.length,
    upserted: changed.length,
    removed: stale.length,
  });
}
