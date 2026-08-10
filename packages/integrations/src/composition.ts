import type { RuntimeConfig } from "@cvg/config";
import { createPostgresDatabase, type DatabaseHandle } from "@cvg/persistence";

import {
  createDeterministicEmbeddingProvider,
  createOpenAiEmbeddingProvider,
  createOpenAiTextProvider,
  type AiTextPort,
  type EmbeddingPort,
} from "./ai.js";
import { createQdrantVectorStore, type VectorStorePort } from "./qdrant.js";

export type ServerIntegrationSet = Readonly<{
  database: DatabaseHandle;
  vectorStore: VectorStorePort | null;
  embedding: EmbeddingPort | null;
  ai: AiTextPort | null;
  initialize: () => Promise<void>;
  healthcheck: () => Promise<void>;
  dependencyStatus: () => Promise<DependencyStatus>;
  close: () => Promise<void>;
}>;

export type DependencyStatus = Readonly<{
  readonly status: "READY" | "DEGRADED" | "NOT_READY";
  readonly dependencies: Readonly<{
    readonly postgres: "UP" | "DOWN";
    readonly qdrant: "UP" | "DOWN" | "DISABLED";
    readonly ai: "ENABLED" | "DISABLED";
  }>;
}>;

export function createIntegrationInitializer(
  vectorStore: Pick<VectorStorePort, "ensureCollection"> | null,
): () => Promise<void> {
  return async (): Promise<void> => {
    if (vectorStore !== null) await vectorStore.ensureCollection();
  };
}

export function createIntegrationHealthcheck(
  databaseHealthcheck: () => Promise<void>,
  vectorStore: Pick<VectorStorePort, "healthcheck"> | null,
): () => Promise<void> {
  return async (): Promise<void> => {
    await databaseHealthcheck();
    if (vectorStore !== null) await vectorStore.healthcheck();
  };
}

export function createDependencyStatus(
  databaseHealthcheck: () => Promise<void>,
  vectorStore: Pick<VectorStorePort, "healthcheck"> | null,
  aiEnabled: boolean,
): () => Promise<DependencyStatus> {
  return async (): Promise<DependencyStatus> => {
    let postgres: DependencyStatus["dependencies"]["postgres"] = "UP";
    try {
      await databaseHealthcheck();
    } catch {
      postgres = "DOWN";
    }

    let qdrant: DependencyStatus["dependencies"]["qdrant"] =
      vectorStore === null ? "DISABLED" : "UP";
    if (vectorStore !== null) {
      try {
        await vectorStore.healthcheck();
      } catch {
        qdrant = "DOWN";
      }
    }

    const status: DependencyStatus["status"] =
      postgres === "DOWN"
        ? "NOT_READY"
        : qdrant === "DOWN"
          ? "DEGRADED"
          : "READY";
    return Object.freeze({
      status,
      dependencies: Object.freeze({
        postgres,
        qdrant,
        ai: aiEnabled ? "ENABLED" : "DISABLED",
      }),
    });
  };
}

export function createServerIntegrations(
  config: RuntimeConfig,
): ServerIntegrationSet {
  const database = createPostgresDatabase(config.databaseUrl, {
    requireLeastPrivilege: config.requireDatabaseLeastPrivilege,
  });

  try {
    const vectorStore = config.qdrant.enabled
      ? createQdrantVectorStore({
          url: config.qdrant.url,
          ...(config.qdrant.apiKey ? { apiKey: config.qdrant.apiKey } : {}),
          collection: config.qdrant.collection,
          embeddingDimension: config.qdrant.embeddingDimension,
          embeddingModel: config.qdrant.embeddingModel,
          indexVersion: config.qdrant.indexVersion,
        })
      : null;
    const embedding = config.qdrant.enabled
      ? config.qdrant.embeddingProvider === "fake"
        ? createDeterministicEmbeddingProvider({
            model: config.qdrant.embeddingModel,
            dimension: config.qdrant.embeddingDimension,
          })
        : createOpenAiEmbeddingProvider({
            apiKey: config.qdrant.embeddingApiKey as string,
            model: config.qdrant.embeddingModel,
            dimension: config.qdrant.embeddingDimension,
          })
      : null;
    const ai = config.ai.enabled
      ? createOpenAiTextProvider({
          apiKey: config.ai.apiKey,
          model: config.ai.model,
        })
      : null;
    const healthcheck = createIntegrationHealthcheck(
      database.healthcheck,
      vectorStore,
    );
    const dependencyStatus = createDependencyStatus(
      database.healthcheck,
      vectorStore,
      ai !== null,
    );
    const initialize = createIntegrationInitializer(vectorStore);

    return Object.freeze({
      database,
      vectorStore,
      embedding,
      ai,
      initialize,
      healthcheck,
      dependencyStatus,
      close: () => database.close(),
    });
  } catch (error) {
    void database.close();
    throw error;
  }
}
