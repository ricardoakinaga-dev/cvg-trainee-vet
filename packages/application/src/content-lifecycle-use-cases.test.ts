import { describe, expect, it, vi } from "vitest";

import {
  expireDueContent,
  type ContentRecord,
  type ContentUseCaseDependencies,
} from "./content-use-cases.js";

const contentId = "11111111-1111-4111-8111-111111111111";
const scopeId = "22222222-2222-4222-8222-222222222222";
const now = "2026-08-12T12:00:00.000Z";

function createDependencies(initial: ContentRecord[]) {
  let records = [...initial];
  const saved: ContentRecord[] = [];
  const publishedEvents: Readonly<Record<string, unknown>>[] = [];

  const repository = {
    find: vi.fn(
      async (requestedContentId: string, version: number) =>
        records.find(
          (record) =>
            record.contentId === requestedContentId &&
            record.version === version,
        ) ?? null,
    ),
    save: vi.fn(async (_current: ContentRecord, next: ContentRecord) => {
      records = records.map((record) =>
        record.contentId === next.contentId && record.version === next.version
          ? next
          : record,
      );
      saved.push(next);
    }),
    listPublishedDueForExpiry: vi.fn(
      async (
        requestedNow: string,
        scopeIds: readonly string[],
        limit: number,
      ) =>
        records
          .filter(
            (record) =>
              record.status === "PUBLICADO" &&
              record.validUntil !== undefined &&
              record.validUntil <= requestedNow &&
              scopeIds.includes(record.scopeId),
          )
          .slice(0, limit),
    ),
  };
  const deps: ContentUseCaseDependencies & {
    readonly expiryRepository: typeof repository;
  } = {
    idFactory: (() => {
      let sequence = 0;
      return () => `generated-${++sequence}`;
    })(),
    transaction: {
      run: async (work) =>
        work({
          content: repository,
          audit: { append: vi.fn(async () => undefined) },
          eventPublisher: {
            publish: vi.fn(async (event) => {
              publishedEvents.push(event);
            }),
          },
          clinicalReview: { hasApproved: vi.fn(async () => true) },
        }),
    },
    expiryRepository: repository,
  };

  return { deps, repository, saved, publishedEvents };
}

const dueContent: ContentRecord = {
  contentId,
  version: 1,
  scopeId,
  status: "PUBLICADO",
  validUntil: "2026-08-12T11:59:59.000Z",
  nextReviewAt: "2026-08-01T00:00:00.000Z",
};

describe("content lifecycle use cases", () => {
  it("expires due content once and emits a withdrawal event", async () => {
    const fixture = createDependencies([dueContent]);

    const result = await expireDueContent(
      {
        principalId: "content-operator",
        accountStatus: "ACTIVE",
        roles: ["ADMIN"],
        scopes: [scopeId],
        now,
        correlationId: "33333333-3333-4333-8333-333333333333",
      },
      fixture.deps,
    );

    expect(result).toMatchObject({ requested: 1, expiredCount: 1, skipped: 0 });
    expect(fixture.saved[0]).toMatchObject({
      contentId,
      status: "VENCIDO",
      validUntil: dueContent.validUntil,
    });
    expect(fixture.publishedEvents).toEqual([
      expect.objectContaining({
        eventType: "content.withdrawn.v1",
        payload: expect.objectContaining({
          content_id: contentId,
          version: "1",
          status: "VENCIDO",
        }),
      }),
    ]);
  });

  it("is idempotent when the scheduler is replayed after expiration", async () => {
    const fixture = createDependencies([dueContent]);
    const command = {
      principalId: "content-operator",
      accountStatus: "ACTIVE" as const,
      roles: ["ADMIN"] as const,
      scopes: [scopeId],
      now,
      correlationId: "33333333-3333-4333-8333-333333333333",
    };

    await expireDueContent(command, fixture.deps);
    const replay = await expireDueContent(command, fixture.deps);

    expect(replay).toMatchObject({ requested: 0, expiredCount: 0, skipped: 0 });
    expect(fixture.saved).toHaveLength(1);
    expect(fixture.publishedEvents).toHaveLength(1);
  });

  it("does not expire future, non-published, or out-of-scope content", async () => {
    const future: ContentRecord = {
      ...dueContent,
      contentId: "44444444-4444-4444-8444-444444444444",
      validUntil: "2026-08-13T00:00:00.000Z",
    };
    const draft: ContentRecord = {
      ...dueContent,
      contentId: "55555555-5555-4555-8555-555555555555",
      status: "RASCUNHO",
    };
    const foreign: ContentRecord = {
      ...dueContent,
      contentId: "66666666-6666-4666-8666-666666666666",
      scopeId: "77777777-7777-4777-8777-777777777777",
    };
    const fixture = createDependencies([future, draft, foreign]);

    const result = await expireDueContent(
      {
        principalId: "content-operator",
        accountStatus: "ACTIVE",
        roles: ["ADMIN"],
        scopes: [scopeId],
        now,
        correlationId: "33333333-3333-4333-8333-333333333333",
      },
      fixture.deps,
    );

    expect(result).toMatchObject({ requested: 0, expiredCount: 0, skipped: 0 });
    expect(fixture.saved).toHaveLength(0);
    expect(fixture.publishedEvents).toHaveLength(0);
  });

  it("fails closed for invalid windows or unauthorized lifecycle operators", async () => {
    const fixture = createDependencies([dueContent]);
    const validCommand = {
      principalId: "content-operator",
      accountStatus: "ACTIVE" as const,
      roles: ["ADMIN"] as const,
      scopes: [scopeId],
      now,
      correlationId: "33333333-3333-4333-8333-333333333333",
    };

    await expect(
      expireDueContent({ ...validCommand, now: "invalid" }, fixture.deps),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      expireDueContent(
        { ...validCommand, accountStatus: "SUSPENDED" },
        fixture.deps,
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(fixture.repository.listPublishedDueForExpiry).not.toHaveBeenCalled();
  });

  it("validates scheduler limits and classifies skipped or failed candidates", async () => {
    const fixture = createDependencies([dueContent]);
    const validCommand = {
      principalId: "content-operator",
      accountStatus: "ACTIVE" as const,
      roles: ["ADMIN"] as const,
      scopes: [scopeId],
      now,
      correlationId: "33333333-3333-4333-8333-333333333333",
    };

    await expect(
      expireDueContent({ ...validCommand, limit: 0 }, fixture.deps),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      expireDueContent({ ...validCommand, limit: 101 }, fixture.deps),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      expireDueContent({ ...validCommand, scopes: [] }, fixture.deps),
    ).rejects.toMatchObject({ code: "forbidden" });

    const missingRepository = {
      ...fixture.deps,
      expiryRepository: {},
    } as never;
    await expect(
      expireDueContent(validCommand, missingRepository),
    ).rejects.toMatchObject({
      code: "internal_error",
    });

    const skippedFixture = createDependencies([]);
    const dueContentWithoutExpiry = Object.fromEntries(
      Object.entries(dueContent).filter(([key]) => key !== "validUntil"),
    ) as Omit<ContentRecord, "validUntil">;
    skippedFixture.repository.listPublishedDueForExpiry.mockResolvedValue([
      { ...dueContent, status: "RASCUNHO" },
      {
        ...dueContentWithoutExpiry,
        contentId: "44444444-4444-4444-8444-444444444444",
      },
      {
        ...dueContent,
        contentId: "55555555-5555-4555-8555-555555555555",
        validUntil: "invalid",
      },
      {
        ...dueContent,
        contentId: "66666666-6666-4666-8666-666666666666",
        validUntil: "2026-08-13T00:00:00.000Z",
      },
    ]);
    await expect(
      expireDueContent(validCommand, skippedFixture.deps),
    ).resolves.toMatchObject({
      requested: 4,
      expiredCount: 0,
      skipped: 4,
    });

    const conflictFixture = createDependencies([]);
    const missingId = "77777777-7777-4777-8777-777777777777";
    conflictFixture.repository.listPublishedDueForExpiry.mockResolvedValue([
      dueContent,
      { ...dueContent, contentId: missingId },
    ]);
    conflictFixture.repository.find
      .mockResolvedValueOnce({ ...dueContent, status: "RASCUNHO" })
      .mockResolvedValueOnce(null);
    await expect(
      expireDueContent(validCommand, conflictFixture.deps),
    ).resolves.toMatchObject({
      requested: 2,
      expiredCount: 0,
      skipped: 2,
    });

    const failureFixture = createDependencies([dueContent]);
    failureFixture.repository.find.mockRejectedValueOnce(
      new Error("synthetic storage failure"),
    );
    await expect(
      expireDueContent(validCommand, failureFixture.deps),
    ).rejects.toMatchObject({
      code: "internal_error",
    });
  });
});
