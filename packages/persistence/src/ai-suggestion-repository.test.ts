import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { describe, expect, it, vi } from "vitest";

import { createAiSuggestionSink } from "./ai-suggestion-repository.js";
import type * as schema from "./schema.js";

function fakeDatabase(...responses: readonly unknown[]): Readonly<{
  database: PostgresJsDatabase<typeof schema>;
  execute: ReturnType<typeof vi.fn>;
  transaction: ReturnType<typeof vi.fn>;
}> {
  const remaining = [...responses];
  const execute = vi.fn(async () => remaining.shift() ?? []);
  const executor = { execute };
  const transaction = vi.fn(
    async (work: (value: typeof executor) => Promise<unknown>) =>
      work(executor),
  );
  return Object.freeze({
    database: { transaction } as unknown as PostgresJsDatabase<typeof schema>,
    execute,
    transaction,
  });
}

const eventId = "11111111-1111-4111-8111-111111111111";
const contentId = "22222222-2222-4222-8222-222222222222";
const leaseToken = "33333333-3333-4333-8333-333333333333";

describe("internal AI suggestion persistence", () => {
  it("atomically saves only an owned reviewable draft", async () => {
    const fake = fakeDatabase(
      [{ acquired: true }],
      [
        {
          contentId,
          version: 1,
          status: "PROCESSING",
          leaseToken,
          lockedUntil: new Date("2026-08-22T00:00:00.000Z"),
          databaseNow: new Date("2026-08-21T00:00:00.000Z"),
        },
      ],
      [],
      [{ eventId }],
    );
    const sink = createAiSuggestionSink(
      fake.database,
      () => "44444444-4444-4444-8444-444444444444",
      () => leaseToken,
    );

    await expect(
      sink.saveDraftSuggestion(
        {
          eventId,
          contentId,
          version: 1,
          draftText: "Rascunho interno.",
          warnings: ["Revisar antes de publicar."],
        },
        leaseToken,
      ),
    ).resolves.toBe(true);

    expect(fake.transaction).toHaveBeenCalledOnce();
    expect(fake.execute).toHaveBeenCalledTimes(4);
    const serializedCalls = JSON.stringify(fake.execute.mock.calls);
    expect(serializedCalls).toContain("Rascunho interno.");
    expect(serializedCalls).not.toContain("participantText");
    expect(serializedCalls).not.toContain("internalContent");
    expect(serializedCalls).not.toContain("photo");
  });

  it("serializes event claims and returns an opaque lease token", async () => {
    const fake = fakeDatabase(
      [{ acquired: true }],
      [],
      [],
      [{ acquired: true }],
      [
        {
          contentId,
          version: 1,
          status: "PROCESSING",
          leaseToken,
          lockedUntil: new Date("2999-01-01T00:00:00.000Z"),
          databaseNow: new Date("2026-08-21T00:00:00.000Z"),
        },
      ],
    );
    const sink = createAiSuggestionSink(
      fake.database,
      () => "44444444-4444-4444-8444-444444444444",
      () => leaseToken,
    );

    await expect(sink.claimEvent(eventId, contentId, 1)).resolves.toEqual({
      state: "ACQUIRED",
      leaseToken,
    });
    await expect(sink.claimEvent(eventId, contentId, 1)).resolves.toEqual({
      state: "IN_PROGRESS",
      leaseToken: null,
    });

    expect(fake.transaction).toHaveBeenCalledTimes(2);
    expect(fake.execute).toHaveBeenCalledTimes(5);
    expect(JSON.stringify(fake.execute.mock.calls)).toContain(
      "clock_timestamp",
    );
  });

  it("fails closed without waiting when the event advisory lock is busy", async () => {
    const fake = fakeDatabase(
      [{ acquired: false }],
      [{ acquired: false }],
      [{ acquired: false }],
    );
    const sink = createAiSuggestionSink(
      fake.database,
      () => "44444444-4444-4444-8444-444444444444",
    );

    await expect(sink.claimEvent(eventId, contentId, 1)).resolves.toEqual({
      state: "IN_PROGRESS",
      leaseToken: null,
    });
    await expect(
      sink.saveDraftSuggestion(
        {
          eventId,
          contentId,
          version: 1,
          draftText: "Rascunho interno.",
          warnings: [],
        },
        leaseToken,
      ),
    ).resolves.toBe(false);
    await expect(sink.releaseEvent(eventId, leaseToken)).resolves.toBe(false);
    expect(fake.execute).toHaveBeenCalledTimes(3);
  });

  it("rejects malformed event identities before opening a transaction", async () => {
    const fake = fakeDatabase();
    const sink = createAiSuggestionSink(
      fake.database,
      () => "44444444-4444-4444-8444-444444444444",
    );

    await expect(sink.claimEvent("not-a-uuid", contentId, 1)).rejects.toThrow(
      "eventId must be a UUID",
    );
    await expect(sink.claimEvent(eventId, "not-a-uuid", 1)).rejects.toThrow(
      "contentId must be a UUID",
    );
    await expect(sink.releaseEvent(eventId, "not-a-uuid")).rejects.toThrow(
      "leaseToken must be a UUID",
    );
    expect(fake.transaction).not.toHaveBeenCalled();
  });

  it("rejects stale persistence and fences release by lease token", async () => {
    const currentLease = "55555555-5555-4555-8555-555555555555";
    const fake = fakeDatabase(
      [{ acquired: true }],
      [
        {
          contentId,
          version: 1,
          status: "PROCESSING",
          leaseToken: currentLease,
          lockedUntil: new Date("2999-01-01T00:00:00.000Z"),
          databaseNow: new Date("2026-08-21T00:00:00.000Z"),
        },
      ],
      [{ acquired: true }],
      [],
    );
    const sink = createAiSuggestionSink(
      fake.database,
      () => "44444444-4444-4444-8444-444444444444",
    );

    await expect(
      sink.saveDraftSuggestion(
        {
          eventId,
          contentId,
          version: 1,
          draftText: "Rascunho interno.",
          warnings: [],
        },
        leaseToken,
      ),
    ).resolves.toBe(false);
    await expect(sink.releaseEvent(eventId, leaseToken)).resolves.toBe(false);

    expect(fake.transaction).toHaveBeenCalledTimes(2);
    expect(fake.execute).toHaveBeenCalledTimes(4);
  });
});
