import { describe, expect, it, vi } from "vitest";

import type {
  ContentIndexSourcePort,
  OutboxEventRecord,
} from "@cvg/persistence";
import type {
  AiTextPort,
  EmbeddingPort,
  VectorStorePort,
} from "@cvg/integrations";

import {
  createIntegrationHandlers,
  WORKER_RECOGNIZED_EVENT_TYPES,
  type AiSuggestionSinkPort,
  type AppealRecalculationCommand,
} from "./handlers.js";

const syntheticLeaseMarker = "lease-11111111-1111-4111-8111-111111111111";

const baseEvent: OutboxEventRecord = {
  id: "11111111-1111-4111-8111-111111111111",
  eventType: "content.published.v1",
  aggregateType: "content_version",
  aggregateId: "22222222-2222-4222-8222-222222222222",
  occurredAt: new Date("2026-08-09T17:00:00.000Z"),
  schemaVersion: 1,
  correlationId: "33333333-3333-4333-8333-333333333333",
  payload: {
    content_id: "22222222-2222-4222-8222-222222222222",
    version: "1",
    status: "PUBLICADO",
  },
  status: "PROCESSING",
  attempts: 1,
  availableAt: new Date("2026-08-09T17:00:00.000Z"),
  lockedUntil: new Date("2026-08-09T17:01:00.000Z"),
  leaseToken: syntheticLeaseMarker,
  lastErrorCode: null,
  processedAt: null,
  createdAt: new Date("2026-08-09T17:00:00.000Z"),
};

function integrations(): {
  readonly source: ContentIndexSourcePort;
  readonly embedding: EmbeddingPort;
  readonly vectorStore: VectorStorePort;
  readonly ai: AiTextPort;
  readonly suggestionSink: AiSuggestionSinkPort;
  readonly generateStructuredMock: ReturnType<typeof vi.fn>;
  readonly saveDraftSuggestionMock: ReturnType<typeof vi.fn>;
} {
  const generateStructuredMock = vi.fn();
  generateStructuredMock.mockResolvedValue({
    draftText: "Rascunho interno.",
    warnings: ["Revisar antes de publicar."],
  });
  const saveDraftSuggestionMock = vi.fn(async () => undefined);
  return {
    source: {
      findPublishedIndexable: vi.fn(
        async (_contentId: string, _version: number) => ({
          contentId: baseEvent.aggregateId,
          version: 1,
          scopeId: "44444444-4444-4444-8444-444444444444",
          text: "Texto interno autoral sintético.",
        }),
      ),
      listPublishedIndexable: vi.fn(async () => [
        {
          contentId: baseEvent.aggregateId,
          version: 1,
          scopeId: "44444444-4444-4444-8444-444444444444",
          text: "Texto interno autoral sintético.",
        },
      ]),
    },
    embedding: { embed: vi.fn(async () => [[0.1, 0.2]]) },
    vectorStore: {
      healthcheck: vi.fn(async () => undefined),
      ensureCollection: vi.fn(async () => undefined),
      list: vi.fn(async () => []),
      upsert: vi.fn(async () => undefined),
      delete: vi.fn(async () => undefined),
      search: vi.fn(async () => []),
    },
    ai: {
      generateStructured:
        generateStructuredMock as AiTextPort["generateStructured"],
    },
    suggestionSink: {
      saveDraftSuggestion: saveDraftSuggestionMock,
    },
    generateStructuredMock,
    saveDraftSuggestionMock,
  };
}

describe("worker integration handlers", () => {
  it("recognizes every event emitted by the domain and the internal AI request", () => {
    const handlers = createIntegrationHandlers(integrations());

    expect(Object.keys(handlers)).toEqual(
      expect.arrayContaining([...WORKER_RECOGNIZED_EVENT_TYPES]),
    );
    for (const eventType of WORKER_RECOGNIZED_EVENT_TYPES) {
      expect(handlers[eventType]).toEqual(expect.any(Function));
    }
  });

  it("dispatches bounded appeal recalculation events without exposing payloads to logs", async () => {
    const dependencies = integrations();
    const recalculateAppeal = vi.fn<
      (command: AppealRecalculationCommand) => Promise<void>
    >(async () => undefined);
    const handlers = createIntegrationHandlers({
      ...dependencies,
      recalculateAppeal,
    });
    const event = {
      ...baseEvent,
      eventType: "appeal.recalculation.requested.v1",
      aggregateType: "appeal",
      payload: {
        appeal_id: "55555555-5555-4555-8555-555555555555",
        scope_id: "66666666-6666-4666-8666-666666666666",
        attempt_id: "77777777-7777-4777-8777-777777777777",
        appeal_version: "3",
        decision: "MANTER_RESULTADO",
      },
    } satisfies OutboxEventRecord;

    await handlers["appeal.recalculation.requested.v1"](event);

    expect(recalculateAppeal).toHaveBeenCalledWith({
      appealId: event.payload.appeal_id,
      scopeId: event.payload.scope_id,
      attemptId: event.payload.attempt_id,
      appealVersion: 3,
      correlationId: event.correlationId,
    });
  });

  it("acknowledges learning events without duplicating educational state", async () => {
    const dependencies = integrations();
    const handlers = createIntegrationHandlers(dependencies);

    for (const eventType of [
      "attempt.submitted.v1",
      "answer.saved.v1",
      "assessment.corrected.v1",
    ] as const) {
      await handlers[eventType]({ ...baseEvent, eventType });
    }

    expect(dependencies.source.findPublishedIndexable).not.toHaveBeenCalled();
    expect(dependencies.embedding.embed).not.toHaveBeenCalled();
    expect(dependencies.vectorStore.upsert).not.toHaveBeenCalled();
    expect(dependencies.vectorStore.delete).not.toHaveBeenCalled();
  });

  it("indexes internal content without putting text in Qdrant payload", async () => {
    const dependencies = integrations();
    const handlers = createIntegrationHandlers(dependencies);

    await handlers["content.published.v1"](baseEvent);

    expect(dependencies.embedding.embed).toHaveBeenCalledWith([
      "Texto interno autoral sintético.",
    ]);
    expect(dependencies.vectorStore.upsert).toHaveBeenCalledWith([
      expect.objectContaining({
        id: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u,
        ),
        scopeId: "44444444-4444-4444-8444-444444444444",
      }),
    ]);
    expect(
      JSON.stringify(vi.mocked(dependencies.vectorStore.upsert).mock.calls),
    ).not.toContain("Texto interno");
  });

  it("removes a withdrawn version and degrades to a no-op when Qdrant is disabled", async () => {
    const dependencies = integrations();
    const handlers = createIntegrationHandlers(dependencies);
    const withdrawn = {
      ...baseEvent,
      eventType: "content.withdrawn.v1",
      payload: { content_id: baseEvent.aggregateId, version: "1" },
    } satisfies OutboxEventRecord;

    await handlers["content.withdrawn.v1"](withdrawn);
    expect(dependencies.vectorStore.delete).toHaveBeenCalledWith([
      expect.any(String),
    ]);

    const disabled = createIntegrationHandlers({
      source: dependencies.source,
      embedding: null,
      vectorStore: null,
    });
    await disabled["content.published.v1"](baseEvent);
    expect(dependencies.source.findPublishedIndexable).not.toHaveBeenCalled();
  });

  it("acknowledges editorial workflow events without indexing or changing state", async () => {
    const dependencies = integrations();
    const handlers = createIntegrationHandlers(dependencies);

    await handlers["content.workflow.changed.v1"]({
      ...baseEvent,
      eventType: "content.workflow.changed.v1",
      payload: {
        content_id: baseEvent.aggregateId,
        version: "1",
        status: "EM_REVISAO_CLINICA",
      },
    });

    expect(dependencies.source.findPublishedIndexable).not.toHaveBeenCalled();
    expect(dependencies.vectorStore.upsert).not.toHaveBeenCalled();
    expect(dependencies.vectorStore.delete).not.toHaveBeenCalled();
  });

  it("rejects malformed content events before touching dependencies", async () => {
    const dependencies = integrations();
    const handlers = createIntegrationHandlers(dependencies);

    await expect(
      handlers["content.published.v1"]({
        ...baseEvent,
        payload: { content_id: "", version: "bad" },
      }),
    ).rejects.toThrow("payload");
    expect(dependencies.embedding.embed).not.toHaveBeenCalled();
  });

  it("keeps AI assistive, structured, server-side, and behind an internal sink", async () => {
    const dependencies = integrations();
    const handlers = createIntegrationHandlers(dependencies);
    const requested = {
      ...baseEvent,
      eventType: "ai.suggestion.requested.v1",
      payload: { content_id: baseEvent.aggregateId, version: "1" },
    } satisfies OutboxEventRecord;

    await handlers["ai.suggestion.requested.v1"](requested);

    expect(dependencies.generateStructuredMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: "Texto interno autoral sintético.",
        schemaName: "CvgInternalSuggestionV1",
      }),
    );
    expect(dependencies.saveDraftSuggestionMock).toHaveBeenCalledWith({
      contentId: baseEvent.aggregateId,
      version: 1,
      draftText: "Rascunho interno.",
      warnings: ["Revisar antes de publicar."],
    });
  });

  it("fails closed when published content or its embedding is unavailable", async () => {
    const dependencies = integrations();
    const handlers = createIntegrationHandlers(dependencies);
    vi.mocked(dependencies.source.findPublishedIndexable).mockResolvedValueOnce(
      null,
    );

    await expect(handlers["content.published.v1"](baseEvent)).rejects.toThrow(
      "not available for indexing",
    );

    vi.mocked(dependencies.source.findPublishedIndexable).mockResolvedValue({
      contentId: baseEvent.aggregateId,
      version: 1,
      scopeId: "44444444-4444-4444-8444-444444444444",
      text: "Texto interno autoral sintético.",
    });
    vi.mocked(dependencies.embedding.embed).mockResolvedValueOnce([]);

    await expect(handlers["content.published.v1"](baseEvent)).rejects.toThrow(
      "no vector",
    );
  });

  it("validates version metadata and keeps each disabled integration inert", async () => {
    const dependencies = integrations();
    const handlers = createIntegrationHandlers(dependencies);

    await expect(
      handlers["content.published.v1"]({
        ...baseEvent,
        payload: {
          content_id: baseEvent.aggregateId,
          version: "0",
        },
      }),
    ).rejects.toThrow("payload.version");
    await expect(
      handlers["content.withdrawn.v1"]({
        ...baseEvent,
        eventType: "content.withdrawn.v1",
        payload: { content_id: baseEvent.aggregateId, version: "bad" },
      }),
    ).rejects.toThrow("payload.version");

    await createIntegrationHandlers({
      source: dependencies.source,
      embedding: dependencies.embedding,
      vectorStore: null,
    })["content.published.v1"](baseEvent);
    await createIntegrationHandlers({
      source: dependencies.source,
      embedding: null,
      vectorStore: dependencies.vectorStore,
    })["content.published.v1"](baseEvent);
    await createIntegrationHandlers({
      source: dependencies.source,
      embedding: null,
      vectorStore: null,
    })["content.withdrawn.v1"]({
      ...baseEvent,
      eventType: "content.withdrawn.v1",
      payload: { content_id: baseEvent.aggregateId, version: "1" },
    });

    expect(dependencies.source.findPublishedIndexable).not.toHaveBeenCalled();
  });

  it("rejects unavailable AI configuration and malformed structured output", async () => {
    const dependencies = integrations();
    const requested = {
      ...baseEvent,
      eventType: "ai.suggestion.requested.v1",
      payload: { content_id: baseEvent.aggregateId, version: "1" },
    } satisfies OutboxEventRecord;

    await createIntegrationHandlers({
      source: dependencies.source,
      embedding: null,
      vectorStore: null,
      ai: null,
    })["ai.suggestion.requested.v1"](requested);
    await createIntegrationHandlers({
      source: dependencies.source,
      embedding: null,
      vectorStore: null,
    })["ai.suggestion.requested.v1"](requested);

    const withoutSink = createIntegrationHandlers({
      source: dependencies.source,
      embedding: null,
      vectorStore: null,
      ai: dependencies.ai,
    });
    await expect(
      withoutSink["ai.suggestion.requested.v1"](requested),
    ).rejects.toThrow("sink");

    vi.mocked(dependencies.source.findPublishedIndexable).mockResolvedValueOnce(
      null,
    );
    await expect(
      createIntegrationHandlers(dependencies)["ai.suggestion.requested.v1"](
        requested,
      ),
    ).rejects.toThrow("not available for internal AI");
  });

  it.each([
    null,
    [],
    { draftText: "", warnings: [] },
    { draftText: "<b>HTML</b>", warnings: [] },
    { draftText: "Texto", warnings: "invalid" },
    { draftText: "Texto", warnings: ["ok", 10] },
  ])(
    "rejects AI output that is not a plain internal draft: %j",
    async (output) => {
      const dependencies = integrations();
      dependencies.generateStructuredMock.mockImplementationOnce(
        async (request: { parse: (value: unknown) => unknown }) =>
          request.parse(output),
      );
      const requested = {
        ...baseEvent,
        eventType: "ai.suggestion.requested.v1",
        payload: { content_id: baseEvent.aggregateId, version: "1" },
      } satisfies OutboxEventRecord;

      await expect(
        createIntegrationHandlers(dependencies)["ai.suggestion.requested.v1"](
          requested,
        ),
      ).rejects.toThrow("AI suggestion output is invalid");
    },
  );
});
