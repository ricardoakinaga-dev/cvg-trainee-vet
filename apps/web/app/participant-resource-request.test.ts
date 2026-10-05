import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ParticipantReadRequests,
  ParticipantRequestCancelled,
  PARTICIPANT_REQUEST_DEADLINE_MS,
  requestParticipantJson,
} from "./participant-resource-request";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
const success = () =>
  new Response(JSON.stringify({ success: true, data: { synthetic: true } }));
describe("participant resource deadline and lifetime", () => {
  it("invalidates attempt-dependent readers while preserving feedback identity", () => {
    const reads = new ParticipantReadRequests();
    const attempt = reads.begin("attempt"),
      correction = reads.begin("correction"),
      appeals = reads.begin("appeals"),
      feedback = reads.begin("feedback");
    reads.cancelDependents();
    expect(attempt.current()).toBe(false);
    expect(correction.current()).toBe(false);
    expect(appeals.current()).toBe(false);
    expect(feedback.current()).toBe(true);
    expect(reads.begin("attempt").current()).toBe(true);
  });
  it.each(["transport", "body"])(
    "bounds a never-resolving %s at exact 15s even if abort is ignored",
    async (phase) => {
      vi.useFakeTimers();
      let signal: AbortSignal | null | undefined;
      const fetcher = vi.fn<typeof fetch>(async (_, init) => {
        signal = init?.signal;
        if (phase === "transport") return new Promise<Response>(() => {});
        const response = success();
        vi.spyOn(response, "json").mockImplementation(
          () => new Promise(() => {}),
        );
        return response;
      });
      const pending = requestParticipantJson(
        "/synthetic",
        { method: "GET" },
        { fetcher },
      );
      const outcome = pending.catch((error: unknown) => error);
      await vi.advanceTimersByTimeAsync(PARTICIPANT_REQUEST_DEADLINE_MS - 1);
      expect(signal?.aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect(await outcome).toMatchObject({ code: "request_timeout" });
      expect(signal?.aborted).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
    },
  );
  it("keeps mutation bytes and credentials while timeout never automatically repeats it", async () => {
    vi.useFakeTimers();
    const requests: RequestInit[] = [];
    const fetcher = vi.fn<typeof fetch>(async (_, init) => {
      if (init) requests.push(init);
      return new Promise<Response>(() => {});
    });
    const body = {
      response: "dirty synthetic response",
      idempotencyKey: "synthetic-stable-key",
    };
    const outcome = requestParticipantJson(
      "/synthetic",
      { method: "POST", body },
      { deadlineMs: 10, fetcher },
    ).catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(10);
    expect(await outcome).toMatchObject({ code: "request_timeout" });
    await vi.advanceTimersByTimeAsync(100_000);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      method: "POST",
      credentials: "include",
      body: JSON.stringify(body),
    });
  });
  it("cancels an in-flight body and clears its timer", async () => {
    vi.useFakeTimers();
    const parent = new AbortController();
    const response = success();
    vi.spyOn(response, "json").mockImplementation(() => new Promise(() => {}));
    const fetcher = vi.fn<typeof fetch>(async () => response);
    const pending = requestParticipantJson(
      "/synthetic",
      { method: "GET", signal: parent.signal },
      { fetcher },
    );
    const outcome = pending.catch((error: unknown) => error);
    await Promise.resolve();
    parent.abort();
    expect(await outcome).toBeInstanceOf(ParticipantRequestCancelled);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("does not send an already cancelled request", async () => {
    const parent = new AbortController();
    parent.abort();
    const fetcher = vi.fn<typeof fetch>();
    await expect(
      requestParticipantJson(
        "/synthetic",
        { method: "GET", signal: parent.signal },
        { fetcher },
      ),
    ).rejects.toBeInstanceOf(ParticipantRequestCancelled);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("isolates fixed resource slots and rejects closed lifetimes", () => {
    const reads = new ParticipantReadRequests();
    const a = reads.begin("feedback");
    const journey = reads.begin("journey");
    const b = reads.begin("feedback");
    expect(a.current()).toBe(false);
    expect(a.signal.aborted).toBe(true);
    expect(journey.current()).toBe(true);
    expect(b.current()).toBe(true);
    reads.cancelAll();
    expect(b.current()).toBe(false);
    expect(journey.current()).toBe(false);
    expect(() => reads.begin("feedback")).toThrow(ParticipantRequestCancelled);
  });
  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, 15_001])(
    "rejects invalid deadline %s",
    async (deadlineMs) => {
      const fetcher = vi.fn<typeof fetch>();
      await expect(
        requestParticipantJson(
          "/synthetic",
          { method: "GET" },
          { deadlineMs, fetcher },
        ),
      ).rejects.toThrow("invalid participant request deadline");
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  it.each([false, true])(
    "clears the timer after an HTTP envelope, failed status=%s",
    async (failed) => {
      vi.useFakeTimers();
      const fetcher = vi.fn<typeof fetch>(
        async () =>
          new Response(JSON.stringify({ success: true, data: "synthetic" }), {
            status: failed ? 503 : 200,
          }),
      );
      const pending = requestParticipantJson(
        "/synthetic",
        { method: "GET" },
        { fetcher },
      );
      if (failed)
        await expect(pending).rejects.toMatchObject({ code: "internal_error" });
      else expect(await pending).toBe("synthetic");
      expect(vi.getTimerCount()).toBe(0);
    },
  );
});
