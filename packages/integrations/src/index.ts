export {
  AiIntegrationError,
  createDeterministicEmbeddingProvider,
  createOpenAiEmbeddingProvider,
  createOpenAiTextProvider,
} from "./ai.js";
export type {
  AiIntegrationConfig,
  AiTextPort,
  DeterministicEmbeddingProviderConfig,
  EmbeddingPort,
  EmbeddingProviderConfig,
  StructuredAiRequest,
} from "./ai.js";

export {
  createCoreReadinessHealthcheck,
  createDependencyStatus,
  createIntegrationHealthcheck,
  createIntegrationInitializer,
  createServerIntegrations,
} from "./composition.js";
export type { DependencyStatus, ServerIntegrationSet } from "./composition.js";

export { createQdrantVectorStore, validateVectorDimension } from "./qdrant.js";
export type {
  InternalVectorPoint,
  QdrantIntegrationConfig,
  VectorPointMetadata,
  VectorSearchInput,
  VectorSearchMatch,
  VectorStorePort,
} from "./qdrant.js";

export {
  calculateQdrantInitializationRetryDelay,
  classifyQdrantInitializationError,
  DEFAULT_QDRANT_INITIALIZATION_RETRY_POLICY,
} from "./retry.js";
export type {
  QdrantInitializationFailure,
  QdrantInitializationFailureClassification,
  QdrantInitializationRetryPolicy,
} from "./retry.js";
