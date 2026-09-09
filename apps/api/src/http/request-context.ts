export type RequestMethod =
  "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

export type RequestPrincipal = Readonly<{
  readonly principalId: string;
  readonly roles: readonly string[];
  readonly scopes: readonly string[];
  readonly accountStatus: string;
}>;

export type RequestContextInput = Readonly<{
  readonly method: string;
  readonly route: string;
  readonly principal?: RequestPrincipal | null;
  readonly correlationId?: string;
  readonly clientIp?: string;
  readonly timeoutMs?: number;
  readonly body?: unknown;
}>;

export type RequestContextDependencies = Readonly<{
  readonly idFactory: () => string;
  readonly clock?: () => number;
}>;

export type RequestContext = Readonly<{
  readonly requestId: string;
  readonly correlationId: string;
  readonly method: RequestMethod;
  readonly route: string;
  readonly principal: RequestPrincipal | null;
  readonly clientIp: string | null;
  readonly startedAtMs: number;
  readonly deadlineMs: number;
}>;

export type RequestLogContext = Readonly<{
  readonly requestId: string;
  readonly correlationId: string;
  readonly authenticated: boolean;
  readonly fields: Readonly<{
    readonly method: string;
    readonly route: string;
  }>;
}>;

const VALID_METHODS: ReadonlySet<string> = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]);

const MAX_ROUTE_LENGTH = 256;
const MAX_CORRELATION_ID_LENGTH = 128;
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_TIMEOUT_MS = 120_000;

function assertMethod(value: string): RequestMethod {
  const normalized = value.toUpperCase();
  if (!VALID_METHODS.has(normalized)) {
    throw new RangeError(`method must be a known HTTP method, got ${value}`);
  }
  return normalized as RequestMethod;
}

function assertRoute(value: string): string {
  const normalized = value.trim();
  if (
    normalized.length === 0 ||
    normalized.length > MAX_ROUTE_LENGTH ||
    !(normalized === "unmatched" || normalized.startsWith("/"))
  ) {
    throw new RangeError("route must be a canonical template or unmatched");
  }
  return normalized;
}

function assertTimeout(value: number | undefined, startedAtMs: number): number {
  const timeoutMs = value ?? DEFAULT_TIMEOUT_MS;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) {
    throw new RangeError("timeoutMs must be a positive integer");
  }
  if (timeoutMs > MAX_TIMEOUT_MS) {
    throw new RangeError("timeoutMs exceeds the request deadline budget");
  }
  return startedAtMs + timeoutMs;
}

function sanitizeCorrelationId(
  value: string | undefined,
  fallback: string,
): string {
  if (value === undefined) return fallback;
  const normalized = value.trim();
  if (
    normalized.length === 0 ||
    normalized.length > MAX_CORRELATION_ID_LENGTH ||
    !/^[a-zA-Z0-9._:-]+$/.test(normalized)
  ) {
    return fallback;
  }
  return normalized;
}

function sanitizeClientIp(value: string | undefined): string | null {
  if (value === undefined) return null;
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > 64) return null;
  if (normalized === "::1") return "127.0.0.1";
  if (/^[a-zA-Z0-9.:]+$/.test(normalized)) return normalized;
  return null;
}

export function createRequestContext(
  input: RequestContextInput,
  dependencies: RequestContextDependencies,
): RequestContext {
  const method = assertMethod(input.method);
  const route = assertRoute(input.route);
  const startedAtMs = dependencies.clock?.() ?? Date.now();
  if (!Number.isFinite(startedAtMs) || startedAtMs < 0) {
    throw new RangeError("clock must return a non-negative timestamp");
  }
  const requestId = dependencies.idFactory();
  if (typeof requestId !== "string" || requestId.trim().length === 0) {
    throw new RangeError("idFactory must return a non-empty request id");
  }
  return Object.freeze({
    requestId,
    correlationId: sanitizeCorrelationId(input.correlationId, requestId),
    method,
    route,
    principal:
      input.principal === undefined || input.principal === null
        ? null
        : Object.freeze({
            principalId: input.principal.principalId,
            roles: Object.freeze([...input.principal.roles]),
            scopes: Object.freeze([...input.principal.scopes]),
            accountStatus: input.principal.accountStatus,
          }),
    clientIp: sanitizeClientIp(input.clientIp),
    startedAtMs,
    deadlineMs: assertTimeout(input.timeoutMs, startedAtMs),
  });
}

export function toLogContext(context: RequestContext): RequestLogContext {
  return Object.freeze({
    requestId: context.requestId,
    correlationId: context.correlationId,
    authenticated: context.principal !== null,
    fields: Object.freeze({
      method: context.method,
      route: context.route,
    }),
  });
}
