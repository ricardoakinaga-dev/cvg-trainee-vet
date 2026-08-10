import { describe, expect, it, vi } from "vitest";

import {
  advanceContent,
  type ContentRecord,
  type ContentUseCaseDependencies,
} from "./content-use-cases.js";

const content: ContentRecord = {
  contentId: "11111111-1111-4111-8111-111111111111",
  version: 1,
  scopeId: "22222222-2222-4222-8222-222222222222",
  status: "AUTORIZADO_PARA_PUBLICACAO",
  publicationReady: true,
};

function dependencies(
  state: ContentRecord = content,
): ContentUseCaseDependencies & {
  readonly saved: { current?: ContentRecord };
  readonly events: { current?: Readonly<Record<string, unknown>> };
} {
  const saved: { current?: ContentRecord } = {};
  const events: { current?: Readonly<Record<string, unknown>> } = {};
  const repository = {
    find: vi.fn(async (_contentId: string, version: number) =>
      version === state.version ? state : null,
    ),
    save: vi.fn(async (_current: ContentRecord, next: ContentRecord) => {
      saved.current = next;
    }),
  };
  const audit = { append: vi.fn(async () => undefined) };
  const eventPublisher = {
    publish: vi.fn(async (event: Readonly<Record<string, unknown>>) => {
      events.current = event;
    }),
  };

  return {
    idFactory: (() => {
      let count = 0;
      return () => `generated-${++count}`;
    })(),
    transaction: {
      run: async (work) =>
        work({
          content: repository,
          audit,
          eventPublisher,
        }),
    },
    saved,
    events,
  };
}

const publishCommand = {
  principalId: "ricardo-account",
  accountStatus: "ACTIVE" as const,
  roles: ["CLINICAL_APPROVER"] as const,
  scopes: [content.scopeId],
  approvedClinicalApproverId: "ricardo-account",
  contentId: content.contentId,
  version: content.version,
  scopeId: content.scopeId,
  event: "PUBLICAR" as const,
  correlationId: "33333333-3333-4333-8333-333333333333",
};

describe("content workflow use cases", () => {
  it("publishes only through the configured clinical approver and redacts the event", async () => {
    const deps = dependencies();

    const result = await advanceContent(publishCommand, deps);

    expect(result.status).toBe("PUBLICADO");
    expect(deps.saved.current).toEqual({ ...content, status: "PUBLICADO" });
    expect(deps.events.current).toMatchObject({
      eventType: "content.published.v1",
      payload: {
        content_id: content.contentId,
        version: String(content.version),
        status: "PUBLICADO",
      },
    });
    expect(JSON.stringify(deps.events.current)).not.toContain(
      "participantText",
    );
  });

  it("denies publication to another clinical identity without writing state", async () => {
    const deps = dependencies();

    await expect(
      advanceContent(
        { ...publishCommand, principalId: "another-account" },
        deps,
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(deps.saved.current).toBeUndefined();
  });

  it("requires the requested scope and current version to match", async () => {
    const deps = dependencies();

    await expect(
      advanceContent({ ...publishCommand, scopeId: "other-scope" }, deps),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      advanceContent({ ...publishCommand, version: 2 }, deps),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("allows an author to request clinical review but not to publish", async () => {
    const draft: ContentRecord = { ...content, status: "AUTOVERIFICADO" };
    const deps = dependencies(draft);
    const command = {
      principalId: publishCommand.principalId,
      accountStatus: publishCommand.accountStatus,
      roles: ["AUTHOR"] as const,
      scopes: publishCommand.scopes,
      contentId: publishCommand.contentId,
      version: publishCommand.version,
      scopeId: publishCommand.scopeId,
      event: "INICIAR_REVISAO_CLINICA" as const,
      correlationId: publishCommand.correlationId,
    };

    await expect(advanceContent(command, deps)).resolves.toMatchObject({
      status: "EM_REVISAO_CLINICA",
    });
    await expect(
      advanceContent(
        {
          principalId: publishCommand.principalId,
          accountStatus: publishCommand.accountStatus,
          roles: ["AUTHOR"] as const,
          scopes: publishCommand.scopes,
          contentId: publishCommand.contentId,
          version: publishCommand.version,
          scopeId: publishCommand.scopeId,
          event: publishCommand.event,
          correlationId: publishCommand.correlationId,
        },
        dependencies(),
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("maps an invalid editorial transition to a stable conflict", async () => {
    const deps = dependencies({ ...content, status: "RASCUNHO" });

    await expect(advanceContent(publishCommand, deps)).rejects.toMatchObject({
      code: "state_conflict",
    });
  });

  it("blocks publication when the item-level authoring gate is incomplete", async () => {
    const deps = dependencies({ ...content, publicationReady: false });

    await expect(advanceContent(publishCommand, deps)).rejects.toMatchObject({
      code: "state_conflict",
    });
    expect(deps.saved.current).toBeUndefined();
  });
});
