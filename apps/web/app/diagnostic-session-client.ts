import {
  apiErrorResponse,
  assertPublicProjection,
  diagnosticSessionProjectionSchema,
  type ApiErrorDetail,
  type DiagnosticSessionProjection,
} from "@cvg/contracts";
import {
  apiBase,
  isRecord,
  isString,
  PublicApiError,
} from "./participant-contracts";

export type DiagnosticSession = DiagnosticSessionProjection;
export type DiagnosticReceiptExpectation = Readonly<{
  operation: "answer" | "finalize";
  sessionId: string;
  version: number;
  itemId?: string;
  selectedChoiceIds?: readonly string[];
}>;
export function parseDiagnosticSession(value: unknown): DiagnosticSession {
  const parsed = diagnosticSessionProjectionSchema.safeParse(value);
  if (!parsed.success)
    throw new PublicApiError(
      "internal_error",
      "invalid public diagnostic projection",
    );
  return {
    ...parsed.data,
    items: [...parsed.data.items].sort(
      (left, right) => left.ordinal - right.ordinal,
    ),
  };
}
export function isDiagnosticReceipt(
  value: DiagnosticSession,
  expected: DiagnosticReceiptExpectation,
): boolean {
  if (!diagnosticSessionProjectionSchema.safeParse(value).success) return false;
  if (
    value.sessionId !== expected.sessionId ||
    value.version <= expected.version ||
    !Number.isSafeInteger(expected.version) ||
    expected.version < 0
  )
    return false;
  if (expected.operation === "finalize") return value.status === "FINALIZADA";
  if (
    value.status !== "EM_ANDAMENTO" ||
    expected.itemId === undefined ||
    expected.selectedChoiceIds === undefined ||
    !value.items.some((item) => item.itemId === expected.itemId)
  )
    return false;
  const answer = value.answers.find(
    (candidate) => candidate.itemId === expected.itemId,
  );
  if (expected.selectedChoiceIds.length === 0) return answer === undefined;
  return (
    answer !== undefined &&
    sameDiagnosticChoices(answer.selectedChoiceIds, expected.selectedChoiceIds)
  );
}
export function sameDiagnosticChoices(
  left: readonly string[],
  right: readonly string[],
): boolean {
  const sortedRight = [...right].sort();
  return (
    left.length === right.length &&
    [...left].sort().every((value, index) => value === sortedRight[index])
  );
}
function diagnosticCheckpoint(session: DiagnosticSession): string {
  return JSON.stringify({
    ...session,
    answers: [...session.answers]
      .sort((left, right) => left.itemId.localeCompare(right.itemId))
      .map((answer) => ({
        ...answer,
        selectedChoiceIds: [...answer.selectedChoiceIds].sort(),
      })),
  });
}
function isPublicValidationRejection(value: unknown): boolean {
  if (
    !isRecord(value) ||
    value.success !== false ||
    Object.keys(value).some(
      (key) => !["success", "error", "meta"].includes(key),
    ) ||
    !isRecord(value.error) ||
    !isRecord(value.meta)
  )
    return false;
  const { error, meta } = value;
  if (
    Object.keys(error).some(
      (key) => !["code", "message", "details"].includes(key),
    ) ||
    Object.keys(meta).some((key) => key !== "request_id") ||
    error.code !== "validation_error" ||
    !isString(error.message) ||
    !Array.isArray(error.details) ||
    !isString(meta.request_id)
  )
    return false;
  try {
    assertPublicProjection(value);
    const details = error.details.filter(
      (detail): detail is ApiErrorDetail =>
        isRecord(detail) &&
        isString(detail.code) &&
        (detail.field === undefined || isString(detail.field)),
    );
    if (details.length !== error.details.length) return false;
    const canonical = apiErrorResponse(
      "validation_error",
      meta.request_id,
      details,
    );
    return error.message === canonical.error.message;
  } catch {
    return false;
  }
}
export type PendingDiagnosticMutation = Readonly<{
  path: string;
  method: "POST" | "PUT";
  body: string;
  expected?: DiagnosticReceiptExpectation;
  advance: boolean;
  draftChoiceIds?: readonly string[];
}>;
export class DiagnosticRequestCancelled extends Error {}
export class DiagnosticRequestError extends PublicApiError {
  constructor(
    code: string,
    public readonly definitiveRejection: boolean,
  ) {
    super(code, "public diagnostic request failed");
  }
}
export class DiagnosticSessionClient {
  private projection: DiagnosticSession | null = null;
  private readonly lifetime = new AbortController();
  private reader: AbortController | null = null;
  private mutation: PendingDiagnosticMutation | null = null;
  public get signal() {
    return this.lifetime.signal;
  }
  public readSession(next: DiagnosticSession): DiagnosticSession {
    const expected = this.pending?.expected;
    if (expected !== undefined && next.sessionId !== expected.sessionId)
      throw new PublicApiError(
        "internal_error",
        "foreign pending diagnostic read",
      );
    return this.reconcileSession(next);
  }
  public acknowledgeSession(next: DiagnosticSession): DiagnosticSession {
    return this.reconcileSession(next);
  }
  private reconcileSession(next: DiagnosticSession): DiagnosticSession {
    const previous = this.projection;
    if (previous !== null && previous.sessionId === next.sessionId) {
      if (
        previous.diagnosticId !== next.diagnosticId ||
        previous.diagnosticVersion !== next.diagnosticVersion ||
        previous.startedAt !== next.startedAt ||
        JSON.stringify(previous.items) !== JSON.stringify(next.items)
      )
        throw new PublicApiError("internal_error", "changed diagnostic form");
      if (next.version < previous.version) return previous;
      if (
        (previous.status === "FINALIZADA" && next.status !== "FINALIZADA") ||
        (next.version === previous.version &&
          diagnosticCheckpoint(previous) !== diagnosticCheckpoint(next))
      )
        throw new PublicApiError(
          "internal_error",
          "incoherent diagnostic checkpoint",
        );
    }
    this.projection = next;
    return next;
  }
  public cancel() {
    this.lifetime.abort();
    this.reader?.abort();
  }
  public beginRead() {
    if (this.signal.aborted) throw new DiagnosticRequestCancelled();
    this.reader?.abort();
    const reader = new AbortController();
    this.reader = reader;
    return {
      signal: reader.signal,
      current: () =>
        !this.signal.aborted &&
        !reader.signal.aborted &&
        this.reader === reader,
    };
  }
  public get pending() {
    return this.mutation;
  }
  public prepare(input: PendingDiagnosticMutation): PendingDiagnosticMutation {
    if (this.mutation !== null) return this.mutation;
    const expected =
      input.expected === undefined
        ? undefined
        : Object.freeze({
            ...input.expected,
            ...(input.expected.selectedChoiceIds === undefined
              ? {}
              : {
                  selectedChoiceIds: Object.freeze([
                    ...input.expected.selectedChoiceIds,
                  ]),
                }),
          });
    this.mutation = Object.freeze({
      ...input,
      ...(input.draftChoiceIds === undefined
        ? {}
        : { draftChoiceIds: Object.freeze([...input.draftChoiceIds]) }),
      ...(expected === undefined ? {} : { expected }),
    });
    return this.mutation;
  }
  public complete(mutation: PendingDiagnosticMutation) {
    if (this.mutation === mutation) this.mutation = null;
  }
  public reject(mutation: PendingDiagnosticMutation, error: unknown) {
    if (error instanceof DiagnosticRequestError && error.definitiveRejection)
      this.complete(mutation);
  }
}
export async function requestDiagnosticJson(
  path: string,
  init: Readonly<{
    method: "GET" | "POST" | "PUT";
    body?: string;
    signal?: AbortSignal;
  }>,
  options: Readonly<{ deadlineMs?: number; fetcher?: typeof fetch }> = {},
): Promise<unknown> {
  const deadlineMs = options.deadlineMs ?? 15_000;
  if (!Number.isFinite(deadlineMs) || deadlineMs <= 0 || deadlineMs > 15_000)
    throw new Error("invalid diagnostic request deadline");
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let cancel = () => {};
  const bounded = new Promise<never>((_, reject) => {
    cancel = () => {
      controller.abort();
      reject(new DiagnosticRequestCancelled());
    };
    if (init.signal?.aborted) {
      cancel();
      return;
    }
    init.signal?.addEventListener("abort", cancel, { once: true });
    timeout = setTimeout(() => {
      controller.abort();
      reject(
        new PublicApiError("request_timeout", "diagnostic request deadline"),
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
          signal: controller.signal,
          headers: { "content-type": "application/json" },
          ...(init.body === undefined ? {} : { body: init.body }),
        });
        const payload: unknown = await response.json().catch(() => null);
        if (!response.ok || !isRecord(payload) || payload.success !== true) {
          const code =
            isRecord(payload) &&
            payload.success === false &&
            isRecord(payload.error) &&
            isString(payload.error.code)
              ? payload.error.code
              : "internal_error";
          throw new DiagnosticRequestError(
            code,
            response.status === 422 && isPublicValidationRejection(payload),
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
