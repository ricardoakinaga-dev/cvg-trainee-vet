export {
  AiIntegrationError,
  calculateAiRetryDelay,
  classifyAiError,
  createResilientAiTextProvider,
  createResilientEmbeddingProvider,
  createDeterministicEmbeddingProvider,
  createOpenAiEmbeddingProvider,
  createOpenAiTextProvider,
  DEFAULT_AI_RESILIENCE_POLICY,
  DEFAULT_EMBEDDING_RESILIENCE_POLICY,
} from "./ai.js";
export type {
  AiFailure,
  AiFailureClassification,
  AiIntegrationConfig,
  AiResilienceOptions,
  AiResiliencePolicy,
  AiTextPort,
  DeterministicEmbeddingProviderConfig,
  EmbeddingRequestOptions,
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

export { runTextSafetyEvals } from "./evals.js";
export type {
  TextSafetyEvalCase,
  TextSafetyEvalDimension,
  TextSafetyEvalResult,
} from "./evals.js";
