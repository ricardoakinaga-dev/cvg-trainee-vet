import {
  apiBase,
  isRecord,
  isString,
  PublicApiError,
} from "./participant-contracts";

export const PARTICIPANT_REQUEST_DEADLINE_MS = 15_000;
export class ParticipantRequestCancelled extends Error {}
export type ParticipantReadResource =
  | "journey"
  | "activity"
  | "attempt"
  | "feedback"
  | "appeals"
  | "correction"
  | "dashboard";

/** Fixed resource slots fence replacement and unmount without retaining query history. */
export class ParticipantReadRequests {
  private readonly controllers = new Map<
    ParticipantReadResource,
    AbortController
  >();
  private readonly lifetime = new AbortController();
  get signal() {
    return this.lifetime.signal;
  }
  begin(resource: ParticipantReadResource) {
    if (this.lifetime.signal.aborted) throw new ParticipantRequestCancelled();
    this.controllers.get(resource)?.abort();
    const controller = new AbortController();
    this.controllers.set(resource, controller);
    return {
      signal: controller.signal,
      current: () =>
        !controller.signal.aborted &&
        this.controllers.get(resource) === controller,
    };
  }
  cancelAll() {
    this.lifetime.abort();
    for (const controller of this.controllers.values()) controller.abort();
    this.controllers.clear();
  }
  cancelDependents() {
    for (const resource of ["attempt", "appeals", "correction"] as const) {
      this.controllers.get(resource)?.abort();
      this.controllers.delete(resource);
    }
  }
}

export async function requestParticipantJson(
  path: string,
  init: Readonly<{
    method: "GET" | "POST";
    body?: unknown;
    signal?: AbortSignal;
  }>,
  options: Readonly<{ deadlineMs?: number; fetcher?: typeof fetch }> = {},
): Promise<unknown> {
  const deadlineMs = options.deadlineMs ?? PARTICIPANT_REQUEST_DEADLINE_MS;
  if (
    !Number.isFinite(deadlineMs) ||
    deadlineMs <= 0 ||
    deadlineMs > PARTICIPANT_REQUEST_DEADLINE_MS
  )
    throw new Error("invalid participant request deadline");
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let cancel = () => {};
  const bounded = new Promise<never>((_, reject) => {
    cancel = () => {
      controller.abort();
      reject(new ParticipantRequestCancelled());
    };
    if (init.signal?.aborted) {
      cancel();
      return;
    }
    init.signal?.addEventListener("abort", cancel, { once: true });
    timeout = setTimeout(() => {
      controller.abort();
      reject(
        new PublicApiError("request_timeout", "participant request deadline"),
      );
    }, deadlineMs);
  });
  try {
    if (init.signal?.aborted) return await bounded;
    return await Promise.race([
      bounded,
      (async () => {
        const response = await (options.fetcher ?? fetch)(`${apiBase}${path}`, {
          method: init.method,
          credentials: "include",
          headers: { "content-type": "application/json" },
          signal: controller.signal,
          ...(init.body === undefined
            ? {}
            : { body: JSON.stringify(init.body) }),
        });
        const payload: unknown = await response.json().catch(() => null);
        if (!response.ok || !isRecord(payload) || payload.success !== true) {
          const error =
            isRecord(payload) && isRecord(payload.error)
              ? payload.error
              : undefined;
          throw new PublicApiError(
            error !== undefined && isString(error.code)
              ? error.code
              : "internal_error",
            "public participant request failed",
          );
        }
        return payload.data;
      })(),
    ]);
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
    init.signal?.removeEventListener("abort", cancel);
  }
}
