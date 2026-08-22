import type {
  EmbeddingPort,
  InternalVectorPoint,
  VectorPointMetadata,
  VectorStorePort,
} from "@cvg/integrations";
import {
  EMBEDDING_BATCH_MAX_INPUTS,
  EMBEDDING_BATCH_MAX_UTF8_BYTES,
} from "@cvg/integrations";
import type {
  ContentIndexSourcePort,
  IndexableContentRecord,
} from "@cvg/persistence";

import {
  createInternalVectorPoint,
  createVectorPointMetadata,
} from "./indexing.js";

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

const MAX_RECONCILIATION_PASSES = 3;
const VECTOR_WRITE_BATCH_SIZE = 100;

type ExpectedRecord = Readonly<{
  readonly record: IndexableContentRecord;
  readonly metadata: VectorPointMetadata;
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

function hasExactMetadata(
  actual: readonly VectorPointMetadata[],
  expectedById: ReadonlyMap<string, VectorPointMetadata>,
): boolean {
  const actualById = new Map(actual.map((point) => [point.id, point] as const));
  return (
    actual.length === expectedById.size &&
    actualById.size === actual.length &&
    [...expectedById.values()].every((metadata) =>
      sameMetadata(actualById.get(metadata.id), metadata),
    )
  );
}

function hasExpectedMetadata(
  actual: readonly VectorPointMetadata[],
  expectedById: ReadonlyMap<string, VectorPointMetadata>,
): boolean {
  const actualById = new Map(actual.map((point) => [point.id, point] as const));
  return [...expectedById.values()].every((metadata) =>
    sameMetadata(actualById.get(metadata.id), metadata),
  );
}

function contentIdentity(record: IndexableContentRecord): string {
  return `${record.contentId}:${record.version}`;
}

function sameContentSnapshot(
  left: readonly IndexableContentRecord[],
  right: readonly IndexableContentRecord[],
): boolean {
  const rightById = new Map(
    right.map((record) => [contentIdentity(record), record] as const),
  );
  return (
    left.length === right.length &&
    rightById.size === right.length &&
    left.every((record) => {
      const candidate = rightById.get(contentIdentity(record));
      return (
        candidate?.contentId === record.contentId &&
        candidate.version === record.version &&
        candidate.scopeId === record.scopeId &&
        candidate.text === record.text
      );
    })
  );
}

function splitByCount<T>(items: readonly T[], size: number): readonly T[][] {
  return Object.freeze(
    Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
      items.slice(index * size, (index + 1) * size),
    ),
  );
}

function embeddingBatches(
  records: readonly ExpectedRecord[],
): readonly (readonly ExpectedRecord[])[] {
  let remaining = records;
  let batches: readonly (readonly ExpectedRecord[])[] = Object.freeze([]);
  while (remaining.length > 0) {
    let batchLength = 0;
    let batchBytes = 0;
    for (const candidate of remaining) {
      const candidateBytes = Buffer.byteLength(candidate.record.text);
      if (candidateBytes > EMBEDDING_BATCH_MAX_UTF8_BYTES) {
        throw new RangeError("Embedding record exceeds the allowed batch size");
      }
      const exceedsBound =
        batchLength >= EMBEDDING_BATCH_MAX_INPUTS ||
        batchBytes + candidateBytes > EMBEDDING_BATCH_MAX_UTF8_BYTES;
      if (exceedsBound) break;
      batchLength += 1;
      batchBytes += candidateBytes;
    }
    const batch = Object.freeze(remaining.slice(0, batchLength));
    batches = Object.freeze([...batches, batch]);
    remaining = remaining.slice(batchLength);
  }
  return batches;
}

async function createChangedPoints(
  changed: readonly ExpectedRecord[],
  embedding: EmbeddingPort,
): Promise<readonly InternalVectorPoint[]> {
  const vectors = await embedding.embed(
    changed.map(({ record }) => record.text),
  );
  if (vectors.length !== changed.length) {
    throw new Error("embedding provider returned an unexpected vector count");
  }
  return changed.map(({ record }, index) => {
    const vector = vectors[index];
    if (vector === undefined) {
      throw new Error("embedding provider returned an incomplete vector set");
    }
    return createInternalVectorPoint(record, vector);
  });
}

async function upsertChangedRecords(
  changed: readonly ExpectedRecord[],
  embedding: EmbeddingPort,
  vectorStore: VectorStorePort,
): Promise<void> {
  for (const embeddingBatch of embeddingBatches(changed)) {
    const points = await createChangedPoints(embeddingBatch, embedding);
    for (const writeBatch of splitByCount(points, VECTOR_WRITE_BATCH_SIZE)) {
      await vectorStore.upsert(writeBatch);
    }
  }
}

async function reconcileSnapshot(
  content: readonly IndexableContentRecord[],
  embedding: EmbeddingPort,
  vectorStore: VectorStorePort,
): Promise<VectorReconciliationResult> {
  const expectedRecords = content.map((record) =>
    Object.freeze({ record, metadata: createVectorPointMetadata(record) }),
  );
  const expectedById = new Map(
    expectedRecords.map(({ metadata }) => [metadata.id, metadata] as const),
  );
  const existing = await vectorStore.list();
  const existingById = new Map(
    existing.map((point) => [point.id, point] as const),
  );
  const changed = expectedRecords.filter(
    ({ metadata }) => !sameMetadata(existingById.get(metadata.id), metadata),
  );
  const stale = existing
    .filter((point) => !expectedById.has(point.id))
    .map((point) => point.id);

  let metadataAfterUpsert = existing;
  if (changed.length > 0) {
    await upsertChangedRecords(changed, embedding, vectorStore);
    metadataAfterUpsert = await vectorStore.list();
    if (!hasExpectedMetadata(metadataAfterUpsert, expectedById)) {
      throw new Error("Qdrant reconciliation upsert did not converge");
    }
  }
  for (const deleteBatch of splitByCount(stale, VECTOR_WRITE_BATCH_SIZE)) {
    await vectorStore.delete(deleteBatch);
  }
  const finalMetadata =
    stale.length > 0 ? await vectorStore.list() : metadataAfterUpsert;
  if (!hasExactMetadata(finalMetadata, expectedById)) {
    throw new Error("Qdrant reconciliation did not converge");
  }
  return Object.freeze({
    expected: expectedRecords.length,
    upserted: changed.length,
    removed: stale.length,
  });
}

export async function reconcileVectorIndex(
  dependencies: VectorReconciliationDependencies,
): Promise<VectorReconciliationResult> {
  if (dependencies.embedding === null || dependencies.vectorStore === null) {
    throw new Error("Qdrant reconciliation is disabled");
  }

  const embedding = dependencies.embedding;
  const vectorStore = dependencies.vectorStore;
  let content = await dependencies.source.listPublishedIndexable();
  let totalUpserted = 0;
  let totalRemoved = 0;
  for (let pass = 0; pass < MAX_RECONCILIATION_PASSES; pass += 1) {
    const result = await reconcileSnapshot(content, embedding, vectorStore);
    totalUpserted += result.upserted;
    totalRemoved += result.removed;
    const freshContent = await dependencies.source.listPublishedIndexable();
    if (sameContentSnapshot(content, freshContent)) {
      return Object.freeze({
        expected: freshContent.length,
        upserted: totalUpserted,
        removed: totalRemoved,
      });
    }
    content = freshContent;
  }
  throw new Error("Qdrant reconciliation source changed repeatedly");
}
