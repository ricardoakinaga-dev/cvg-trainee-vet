import { randomUUID } from "node:crypto";

import { loadRuntimeConfig } from "@cvg/config";
import {
  createServerIntegrations,
  type ServerIntegrationSet,
} from "@cvg/integrations";
import { createObservability } from "@cvg/observability";
import {
  createAiSuggestionSink,
  createAppealRecalculationProcessor,
  createContentIndexSourceRepository,
  createOutboxRepository,
} from "@cvg/persistence";

import { createIntegrationHandlers } from "./handlers.js";
import { processOutboxOnce, type WorkerLoopOptions } from "./loop.js";
import {
  reconcileVectorIndex,
  type VectorReconciliationResult,
} from "./reconcile.js";

export function createWorkerRuntime(
  environment: Record<string, string | undefined>,
): Readonly<{
  service: "worker";
  config: ReturnType<typeof loadRuntimeConfig>;
  integrations: ServerIntegrationSet;
  initialize: () => Promise<void>;
  reconcile: () => Promise<VectorReconciliationResult>;
  processOnce: (
    options?: WorkerLoopOptions,
  ) => ReturnType<typeof processOutboxOnce>;
  run: () => Promise<void>;
  close: () => Promise<void>;
}> {
  const config = loadRuntimeConfig(environment);
  const integrations = createServerIntegrations(config);
  const observability = createObservability({ service: "worker" });
  const outbox = createOutboxRepository(integrations.database.db);
  const recalculateAppeal = createAppealRecalculationProcessor(
    integrations.database.db,
  );
  const source = createContentIndexSourceRepository(integrations.database.db);
  const workerDependencies = {
    source,
    embedding: integrations.embedding,
    vectorStore: integrations.vectorStore,
  } as const;
  const handlers = createIntegrationHandlers({
    ...workerDependencies,
    embedding: integrations.embedding,
    vectorStore: integrations.vectorStore,
    ai: integrations.ai,
    suggestionSink: createAiSuggestionSink(
      integrations.database.db,
      randomUUID,
    ),
    recalculateAppeal,
  });
  let stopped = false;
  const initialize = async (): Promise<void> => {
    await integrations.initialize();
  };
  const processOnce = (options: WorkerLoopOptions = {}) =>
    processOutboxOnce(outbox, handlers, {
      ...options,
      observability: options.observability ?? observability,
    });
  const reconcile = (): Promise<VectorReconciliationResult> =>
    reconcileVectorIndex(workerDependencies);
  const run = async (): Promise<void> => {
    await initialize();
    while (!stopped) {
      const result = await processOnce();
      if (result.claimed === 0) {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 1_000);
        });
      }
    }
  };

  return Object.freeze({
    service: "worker" as const,
    config,
    integrations,
    initialize,
    reconcile,
    processOnce,
    run,
    close: async () => {
      stopped = true;
      await integrations.close();
    },
  });
}

if (
  process.env.NODE_ENV !== "test" &&
  process.env.CVG_WORKER_AUTOSTART !== "false"
) {
  const runtime = createWorkerRuntime(process.env);
  process.once("SIGTERM", () => {
    void runtime.close();
  });
  process.once("SIGINT", () => {
    void runtime.close();
  });
  void runtime.run().catch(() => {
    process.exitCode = 1;
  });
}
