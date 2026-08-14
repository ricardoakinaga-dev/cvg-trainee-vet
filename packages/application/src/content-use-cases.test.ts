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
  clinicalApproval = true,
): ContentUseCaseDependencies & {
  readonly saved: { current?: ContentRecord };
  readonly events: { current?: Readonly<Record<string, unknown>> };
  readonly affectedParticipants: readonly string[];
  readonly withdrawalAffected: { count?: number };
} {
  const saved: { current?: ContentRecord } = {};
  const events: { current?: Readonly<Record<string, unknown>> } = {};
  const affectedParticipants = [
    "44444444-4444-4444-8444-444444444444",
    "55555555-5555-4555-8555-555555555555",
  ] as const;
  const withdrawalAffected: { count?: number } = {};
  const repository = {
    find: vi.fn(async (_contentId: string, version: number) =>
      version === state.version ? state : null,
    ),
    save: vi.fn(async (_current: ContentRecord, next: ContentRecord) => {
      saved.current = next;
    }),
    listAffectedParticipantIds: vi.fn(async () => affectedParticipants),
    recordWithdrawalAffected: vi.fn(async (ids: readonly string[]) => {
      withdrawalAffected.count = ids.length;
      return ids.length;
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
          clinicalReview: {
            hasApproved: vi.fn(async () => clinicalApproval),
          },
        }),
    },
    saved,
    events,
    affectedParticipants,
    withdrawalAffected,
  };
}

const publishCommandWithoutClinicalContext = {
  principalId: "content-author",
  accountStatus: "ACTIVE" as const,
  roles: ["AUTHOR"] as const,
  scopes: [content.scopeId],
  contentId: content.contentId,
  version: content.version,
  scopeId: content.scopeId,
  event: "PUBLICAR" as const,
  correlationId: "33333333-3333-4333-8333-333333333333",
};

const publishCommand = {
  ...publishCommandWithoutClinicalContext,
  approvedClinicalReviewerId: "clinical-reviewer",
};

describe("content workflow use cases", () => {
  it("publishes content with an explicit clinical approval context and redacts the event", async () => {
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

  it("rejects direct publication without a clinical approval context", async () => {
    const deps = dependencies();

    await expect(
      advanceContent(publishCommandWithoutClinicalContext, deps),
    ).rejects.toMatchObject({ code: "state_conflict" });
    expect(deps.saved.current).toBeUndefined();
    expect(deps.events.current).toBeUndefined();
  });

  it("rejects a publication context that is not backed by a persisted approval", async () => {
    const deps = dependencies(content, false);

    await expect(advanceContent(publishCommand, deps)).rejects.toMatchObject({
      code: "state_conflict",
    });
    expect(deps.saved.current).toBeUndefined();
    expect(deps.events.current).toBeUndefined();
  });

  it("rejects automatic publication without a human clinical gate", async () => {
    const sourceVerified: ContentRecord = {
      ...content,
      status: "AUTOVERIFICADO",
      publicationReady: true,
    };
    const deps = dependencies(sourceVerified);

    await expect(
      advanceContent(
        {
          ...publishCommandWithoutClinicalContext,
          event: "PUBLICAR_AUTOMATICAMENTE" as const,
        },
        deps,
      ),
    ).rejects.toMatchObject({ code: "state_conflict" });
    expect(deps.saved.current).toBeUndefined();
  });

  it("denies publication to an out-of-scope author without writing state", async () => {
    const deps = dependencies();

    await expect(
      advanceContent(
        {
          ...publishCommand,
          principalId: "another-account",
          scopes: [],
        },
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

  it("allows an authorized author to publish source-verified content without a clinical approver", async () => {
    const sourceVerified: ContentRecord = {
      ...content,
      status: "AUTOVERIFICADO",
      publicationReady: true,
    };
    const deps = dependencies(sourceVerified);

    await expect(
      advanceContent(
        {
          ...publishCommand,
          principalId: "content-author",
          roles: ["AUTHOR"],
          event: "VERIFICAR_PROJECAO",
        },
        deps,
      ),
    ).resolves.toMatchObject({ status: "PROJECAO_VERIFICADA" });
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

  it("withdraws content only through the approved clinical path and records affected participants", async () => {
    const published: ContentRecord = {
      ...content,
      status: "PUBLICADO",
    };
    const deps = dependencies(published);

    const result = await advanceContent(
      {
        principalId: "clinical-approver",
        accountStatus: "ACTIVE",
        roles: ["CLINICAL_APPROVER"],
        scopes: [published.scopeId],
        contentId: published.contentId,
        version: published.version,
        scopeId: published.scopeId,
        event: "RETIRAR",
        withdrawalReasonCode: "ERRO_CONTEUDO",
        approvedClinicalApproverId: "clinical-approver",
        correlationId: "33333333-3333-4333-8333-333333333333",
      },
      deps,
    );

    expect(result).toMatchObject({
      status: "RETIRADO",
      withdrawalReasonCode: "ERRO_CONTEUDO",
      affectedParticipantCount: deps.affectedParticipants.length,
    });
    expect(deps.withdrawalAffected.count).toBe(
      deps.affectedParticipants.length,
    );
    expect(deps.events.current).toMatchObject({
      eventType: "content.withdrawn.v1",
      payload: {
        reason_code: "ERRO_CONTEUDO",
        affected_count: deps.affectedParticipants.length,
      },
    });
  });

  it("denies emergency withdrawal to a non-clinical publisher", async () => {
    const deps = dependencies({ ...content, status: "PUBLICADO" });

    await expect(
      advanceContent(
        {
          ...publishCommand,
          event: "RETIRAR",
          withdrawalReasonCode: "ERRO_CLINICO",
          roles: ["AUTHOR"],
        },
        deps,
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(deps.saved.current).toBeUndefined();
  });
});
