import type {
  ContentIndexSourcePort,
  OutboxEventRecord,
} from "@cvg/persistence";
import type {
  AiTextPort,
  EmbeddingPort,
  VectorStorePort,
} from "@cvg/integrations";

import type { WorkerEventHandler, WorkerEventHandlers } from "./loop.js";
import { createInternalVectorPoint, vectorPointId } from "./indexing.js";

export type WorkerIntegrationDependencies = Readonly<{
  readonly source: ContentIndexSourcePort;
  readonly embedding: EmbeddingPort | null;
  readonly vectorStore: VectorStorePort | null;
  readonly ai?: AiTextPort | null;
  readonly suggestionSink?: AiSuggestionSinkPort;
  readonly recalculateAppeal?: (
    command: AppealRecalculationCommand,
  ) => Promise<unknown>;
}>;

export type AppealRecalculationCommand = Readonly<{
  readonly appealId: string;
  readonly scopeId: string;
  readonly attemptId: string;
  readonly appealVersion: number;
  readonly correlationId: string;
}>;

export type AiSuggestion = Readonly<{
  readonly contentId: string;
  readonly version: number;
  readonly draftText: string;
  readonly warnings: readonly string[];
}>;

export type AiSuggestionSinkPort = Readonly<{
  readonly saveDraftSuggestion: (suggestion: AiSuggestion) => Promise<void>;
}>;

export class WorkerPayloadError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "WorkerPayloadError";
  }
}

export const WORKER_RECOGNIZED_EVENT_TYPES = [
  "content.published.v1",
  "content.withdrawn.v1",
  "content.workflow.changed.v1",
  "attempt.submitted.v1",
  "answer.saved.v1",
  "assessment.corrected.v1",
  "ai.suggestion.requested.v1",
  "appeal.recalculation.requested.v1",
] as const;

export type WorkerRecognizedEventType =
  (typeof WORKER_RECOGNIZED_EVENT_TYPES)[number];

function payloadString(event: OutboxEventRecord, field: string): string {
  const value = event.payload[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new WorkerPayloadError(`payload.${field} is required`);
  }
  return value;
}

function payloadVersion(event: OutboxEventRecord, field = "version"): number {
  const value = payloadString(event, field);
  if (!/^\d+$/u.test(value)) {
    throw new WorkerPayloadError(`payload.${field} is invalid`);
  }
  const version = Number(value);
  if (!Number.isSafeInteger(version) || version < 1) {
    throw new WorkerPayloadError(`payload.${field} is invalid`);
  }
  return version;
}

const appealRecalculationHandler =
  (dependencies: WorkerIntegrationDependencies): WorkerEventHandler =>
  async (event): Promise<void> => {
    if (dependencies.recalculateAppeal === undefined) {
      throw new Error("appeal recalculation is not configured");
    }
    const decision = payloadString(event, "decision");
    if (decision !== "MANTER_RESULTADO") {
      throw new WorkerPayloadError(
        "bounded appeal recalculation only supports MANTER_RESULTADO",
      );
    }
    const command: AppealRecalculationCommand = {
      appealId: payloadString(event, "appeal_id"),
      scopeId: payloadString(event, "scope_id"),
      attemptId: payloadString(event, "attempt_id"),
      appealVersion: payloadVersion(event, "appeal_version"),
      correlationId: event.correlationId,
    };
    await dependencies.recalculateAppeal(command);
  };

const publishHandler =
  (dependencies: WorkerIntegrationDependencies): WorkerEventHandler =>
  async (event): Promise<void> => {
    if (dependencies.vectorStore === null || dependencies.embedding === null) {
      return;
    }

    const contentId = payloadString(event, "content_id");
    const version = payloadVersion(event);
    const content = await dependencies.source.findPublishedIndexable(
      contentId,
      version,
    );
    if (content === null) {
      throw new Error("published content is not available for indexing");
    }
    const vectors = await dependencies.embedding.embed([content.text]);
    const vector = vectors[0];
    if (vector === undefined) {
      throw new Error("embedding provider returned no vector");
    }

    await dependencies.vectorStore.upsert([
      createInternalVectorPoint(content, vector),
    ]);
  };

const withdrawHandler =
  (dependencies: WorkerIntegrationDependencies): WorkerEventHandler =>
  async (event): Promise<void> => {
    if (dependencies.vectorStore === null) return;
    const contentId = payloadString(event, "content_id");
    const version = payloadVersion(event);
    await dependencies.vectorStore.delete([vectorPointId(contentId, version)]);
  };

const workflowChangedHandler: WorkerEventHandler = async () => {
  // Editorial transitions are already the source of truth in PostgreSQL.
  // The worker acknowledges this event without indexing or changing state.
};

const learningEventAcknowledgementHandler: WorkerEventHandler = async () => {
  // Learning state is persisted transactionally by the application layer.
  // The worker acknowledges these events without duplicating that state.
};

function parseSuggestion(value: unknown): Readonly<{
  readonly draftText: string;
  readonly warnings: readonly string[];
}> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("AI suggestion output is invalid");
  }
  const record = value as Record<string, unknown>;
  const draftText = record.draftText;
  const warnings = record.warnings;
  if (
    typeof draftText !== "string" ||
    draftText.trim().length === 0 ||
    draftText.length > 20_000 ||
    /<[^>]*>/u.test(draftText) ||
    !Array.isArray(warnings) ||
    warnings.some((warning) => typeof warning !== "string")
  ) {
    throw new Error("AI suggestion output is invalid");
  }
  return Object.freeze({
    draftText,
    warnings: Object.freeze(warnings.map((warning) => String(warning))),
  });
}

const aiSuggestionHandler =
  (dependencies: WorkerIntegrationDependencies): WorkerEventHandler =>
  async (event): Promise<void> => {
    if (dependencies.ai === null || dependencies.ai === undefined) return;
    if (dependencies.suggestionSink === undefined) {
      throw new Error("AI suggestion sink is not configured");
    }

    const contentId = payloadString(event, "content_id");
    const version = payloadVersion(event);
    const content = await dependencies.source.findPublishedIndexable(
      contentId,
      version,
    );
    if (content === null) {
      throw new Error("content is not available for internal AI assistance");
    }
    const suggestion = await dependencies.ai.generateStructured({
      input: content.text,
      instructions:
        "Assistente interno: produza um rascunho autoral para revisão de Ricardo. Não publique, não aprove, não defina nota e não inclua fontes, fotos, PDFs, OCR ou dados reais.",
      schemaName: "CvgInternalSuggestionV1",
      jsonSchema: {
        type: "object",
        properties: {
          draftText: { type: "string", minLength: 1, maxLength: 20_000 },
          warnings: {
            type: "array",
            items: { type: "string", maxLength: 500 },
            maxItems: 20,
          },
        },
        required: ["draftText", "warnings"],
        additionalProperties: false,
      },
      parse: parseSuggestion,
    });
    await dependencies.suggestionSink.saveDraftSuggestion({
      contentId,
      version,
      draftText: suggestion.draftText,
      warnings: suggestion.warnings,
    });
  };

export function createIntegrationHandlers(
  dependencies: WorkerIntegrationDependencies,
): WorkerEventHandlers & {
  readonly "content.published.v1": WorkerEventHandler;
  readonly "content.withdrawn.v1": WorkerEventHandler;
  readonly "content.workflow.changed.v1": WorkerEventHandler;
  readonly "attempt.submitted.v1": WorkerEventHandler;
  readonly "answer.saved.v1": WorkerEventHandler;
  readonly "assessment.corrected.v1": WorkerEventHandler;
  readonly "ai.suggestion.requested.v1": WorkerEventHandler;
  readonly "appeal.recalculation.requested.v1": WorkerEventHandler;
} {
  return Object.freeze({
    "content.published.v1": publishHandler(dependencies),
    "content.withdrawn.v1": withdrawHandler(dependencies),
    "content.workflow.changed.v1": workflowChangedHandler,
    "attempt.submitted.v1": learningEventAcknowledgementHandler,
    "answer.saved.v1": learningEventAcknowledgementHandler,
    "assessment.corrected.v1": learningEventAcknowledgementHandler,
    "ai.suggestion.requested.v1": aiSuggestionHandler(dependencies),
    "appeal.recalculation.requested.v1":
      appealRecalculationHandler(dependencies),
  });
}
