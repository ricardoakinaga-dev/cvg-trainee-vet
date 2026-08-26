import { QdrantClient, type Schemas } from "@qdrant/js-client-rest";

import { classifyQdrantInitializationError } from "./retry.js";

export type QdrantIntegrationConfig = Readonly<{
  url: string;
  apiKey?: string;
  collection: string;
  embeddingDimension: number;
  embeddingModel: string;
  indexVersion: string;
}>;

export type InternalVectorPoint = Readonly<{
  id: string;
  vector: readonly number[];
  knowledgeId: string;
  sectionId: string;
  scopeId: string;
  contentHash: string;
  status: "APPROVED_FOR_INTERNAL_SEARCH";
}>;

export type VectorSearchInput = Readonly<{
  vector: readonly number[];
  scopeId: string;
  limit: number;
  scoreThreshold?: number;
}>;

export type VectorSearchMatch = Readonly<{
  id: string;
  score: number;
  knowledgeId: string;
  sectionId: string;
  scopeId: string;
  contentHash: string;
}>;

export type VectorPointMetadata = Readonly<{
  id: string;
  knowledgeId: string;
  sectionId: string;
  scopeId: string;
  contentHash: string;
}>;

export type VectorStorePort = Readonly<{
  healthcheck: () => Promise<void>;
  ensureCollection: () => Promise<void>;
  list: () => Promise<readonly VectorPointMetadata[]>;
  upsert: (points: readonly InternalVectorPoint[]) => Promise<void>;
  delete: (ids: readonly string[]) => Promise<void>;
  search: (input: VectorSearchInput) => Promise<readonly VectorSearchMatch[]>;
}>;

type QdrantClientPort = Pick<
  QdrantClient,
  | "collectionExists"
  | "createCollection"
  | "getCollection"
  | "createPayloadIndex"
  | "scroll"
  | "upsert"
  | "delete"
  | "query"
>;

type QdrantScrollOffset = Exclude<
  NonNullable<Parameters<QdrantClient["scroll"]>[1]>["offset"],
  null | undefined
>;

export function validateVectorDimension(
  vector: readonly number[],
  expectedDimension: number,
): void {
  if (vector.length !== expectedDimension) {
    throw new RangeError(
      `Vector dimension ${vector.length} does not match ${expectedDimension}`,
    );
  }

  if (vector.some((value) => !Number.isFinite(value))) {
    throw new TypeError("Vector values must be finite numbers");
  }
}

export function createQdrantVectorStore(
  config: QdrantIntegrationConfig,
  client: QdrantClientPort = new QdrantClient({
    url: config.url,
    ...(config.apiKey ? { apiKey: config.apiKey } : {}),
    timeout: 20_000,
    checkCompatibility: false,
  }),
): VectorStorePort {
  if (!config.collection.trim()) {
    throw new TypeError("Qdrant collection is required");
  }

  if (
    !Number.isInteger(config.embeddingDimension) ||
    config.embeddingDimension < 1
  ) {
    throw new RangeError(
      "Qdrant embeddingDimension must be a positive integer",
    );
  }

  const ensureCollection = async (): Promise<void> => {
    const existence = await client.collectionExists(config.collection);
    if (!existence.exists) {
      await client.createCollection(config.collection, {
        vectors: {
          size: config.embeddingDimension,
          distance: "Cosine",
        },
        on_disk_payload: true,
      });
    }

    const collection = await client.getCollection(config.collection);
    validateCollectionVectorConfig(collection, config.embeddingDimension);
    const indexedFields = new Set(Object.keys(collection.payload_schema));
    const fields = ["index_version", "visibility", "status", "scope_id"];
    const indexResults = await Promise.allSettled(
      fields
        .filter((field) => !indexedFields.has(field))
        .map((field) =>
          client.createPayloadIndex(config.collection, {
            field_name: field,
            field_schema: "keyword",
            wait: true,
          }),
        ),
    );
    const failedIndexes = indexResults.filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    const firstFailedIndex = failedIndexes[0];
    if (firstFailedIndex !== undefined) {
      const terminalFailure = failedIndexes.find(
        (result) => !classifyQdrantInitializationError(result.reason).retryable,
      );
      throw (terminalFailure ?? firstFailedIndex).reason;
    }
  };

  const healthcheck = async (): Promise<void> => {
    const collection = await client.getCollection(config.collection);
    validateCollectionVectorConfig(collection, config.embeddingDimension);
  };

  const upsert = async (
    points: readonly InternalVectorPoint[],
  ): Promise<void> => {
    const qdrantPoints = points.map((point) => {
      validateVectorDimension(point.vector, config.embeddingDimension);
      return {
        id: point.id,
        vector: [...point.vector],
        payload: {
          index_version: config.indexVersion,
          embedding_model: config.embeddingModel,
          visibility: "INTERNAL",
          status: point.status,
          knowledge_id: point.knowledgeId,
          section_id: point.sectionId,
          scope_id: point.scopeId,
          content_hash: point.contentHash,
        },
      };
    });

    if (qdrantPoints.length === 0) return;

    await client.upsert(config.collection, {
      wait: true,
      points: qdrantPoints,
    });
  };

  const search = async (
    input: VectorSearchInput,
  ): Promise<readonly VectorSearchMatch[]> => {
    validateVectorDimension(input.vector, config.embeddingDimension);
    if (!Number.isInteger(input.limit) || input.limit < 1) {
      throw new RangeError("Qdrant search limit must be a positive integer");
    }

    const result = await client.query(config.collection, {
      query: [...input.vector],
      filter: {
        must: [
          {
            key: "index_version",
            match: { value: config.indexVersion },
          },
          {
            key: "visibility",
            match: { value: "INTERNAL" },
          },
          {
            key: "status",
            match: { value: "APPROVED_FOR_INTERNAL_SEARCH" },
          },
          {
            key: "scope_id",
            match: { value: input.scopeId },
          },
        ],
      },
      limit: input.limit,
      ...(input.scoreThreshold === undefined
        ? {}
        : { score_threshold: input.scoreThreshold }),
      with_payload: [
        "knowledge_id",
        "section_id",
        "scope_id",
        "content_hash",
        "index_version",
        "visibility",
        "status",
      ],
      with_vector: false,
    });

    return result.points.flatMap((point) => {
      const payload = point.payload;
      if (
        !isInternalPayload(payload) ||
        payload.index_version !== config.indexVersion ||
        payload.scope_id !== input.scopeId
      ) {
        return [];
      }

      return [
        {
          id: String(point.id),
          score: point.score,
          knowledgeId: payload.knowledge_id,
          sectionId: payload.section_id,
          scopeId: payload.scope_id,
          contentHash: payload.content_hash,
        },
      ];
    });
  };

  const list = async (): Promise<readonly VectorPointMetadata[]> => {
    const points: VectorPointMetadata[] = [];
    let offset: QdrantScrollOffset | undefined;

    while (true) {
      const result = await client.scroll(config.collection, {
        limit: 100,
        ...(offset === undefined ? {} : { offset }),
        filter: {
          must: [
            { key: "visibility", match: { value: "INTERNAL" } },
            {
              key: "status",
              match: { value: "APPROVED_FOR_INTERNAL_SEARCH" },
            },
          ],
        },
        with_payload: true,
        with_vector: false,
      });

      for (const point of result.points) {
        const payload = point.payload;
        if (
          !isInternalPayload(payload) ||
          payload.index_version !== config.indexVersion
        ) {
          continue;
        }
        points.push({
          id: String(point.id),
          knowledgeId: payload.knowledge_id,
          sectionId: payload.section_id,
          scopeId: payload.scope_id,
          contentHash: payload.content_hash,
        });
      }

      const nextOffset = result.next_page_offset;
      if (nextOffset === null || nextOffset === undefined) break;
      offset = nextOffset;
    }

    return Object.freeze(points);
  };

  const remove = async (ids: readonly string[]): Promise<void> => {
    if (ids.length === 0) return;
    if (ids.some((id) => id.trim().length === 0)) {
      throw new TypeError("Qdrant point ids must not be empty");
    }
    await client.delete(config.collection, {
      wait: true,
      points: [...ids],
    });
  };

  return Object.freeze({
    healthcheck,
    ensureCollection,
    list,
    upsert,
    search,
    delete: remove,
  });
}

function validateCollectionVectorConfig(
  collection: Awaited<ReturnType<QdrantClient["getCollection"]>>,
  expectedDimension: number,
): void {
  const vectors = collection.config.params.vectors;
  if (!vectors || typeof vectors !== "object") {
    throw new RangeError("Qdrant collection has no dense vector configuration");
  }

  const vectorConfig =
    "size" in vectors
      ? vectors
      : "default" in vectors
        ? vectors.default
        : undefined;
  if (!vectorConfig || typeof vectorConfig !== "object") {
    throw new RangeError(
      "Qdrant collection has no default vector configuration",
    );
  }

  if (
    vectorConfig.size !== expectedDimension ||
    vectorConfig.distance !== "Cosine"
  ) {
    throw new RangeError(
      "Qdrant collection vector configuration is incompatible with runtime",
    );
  }
}

function isInternalPayload(
  payload: Schemas["Payload"] | Record<string, unknown> | null | undefined,
): payload is Record<string, unknown> & {
  knowledge_id: string;
  section_id: string;
  scope_id: string;
  content_hash: string;
  index_version: string;
  visibility: "INTERNAL";
  status: "APPROVED_FOR_INTERNAL_SEARCH";
} {
  if (!payload || typeof payload !== "object") return false;
  return (
    typeof payload.knowledge_id === "string" &&
    typeof payload.section_id === "string" &&
    typeof payload.scope_id === "string" &&
    typeof payload.content_hash === "string" &&
    typeof payload.index_version === "string" &&
    payload.visibility === "INTERNAL" &&
    payload.status === "APPROVED_FOR_INTERNAL_SEARCH"
  );
}
