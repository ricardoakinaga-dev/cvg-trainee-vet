import type { IncomingMessage, ServerResponse } from "node:http";

import { apiErrorResponse } from "@cvg/contracts";
import { sanitizeCorrelationId, type Observability } from "@cvg/observability";

import {
  handleApiRequest,
  type ApiHttpDependencies,
  type ApiHttpRequest,
  type ApiHttpResponse,
} from "./http.js";
import {
  isCsrfAllowed,
  type RequestHeaders,
  type RequestRateLimiter,
} from "./request-security.js";
import {
  resolveClientAddress,
  type TrustedProxyCidr,
} from "./client-address.js";
import { routeTemplate } from "./route-template.js";

const API_SECURITY_HEADERS = Object.freeze({
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "no-referrer",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "cross-origin-opener-policy": "same-origin",
  "cross-origin-resource-policy": "same-origin",
  "content-security-policy":
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
});

export type ApiRequestHandlerDependencies = Readonly<{
  readonly dependencies: ApiHttpDependencies;
  readonly allowedOrigins: readonly string[];
  readonly maxBodyBytes: number;
  readonly rateLimiter: RequestRateLimiter;
  readonly trustedProxyCidrs: readonly TrustedProxyCidr[];
}>;

export type ApiRequestHandlerMethods = Readonly<{
  readonly handle: (
    request: IncomingMessage,
    response: ServerResponse,
  ) => Promise<void>;
}>;

class BodyLimitError extends Error {
  public constructor() {
    super("Request body exceeds configured limit");
    this.name = "BodyLimitError";
  }
}

class RateLimiterUnavailableError extends Error {
  public constructor() {
    super("Rate limiter unavailable");
    this.name = "RateLimiterUnavailableError";
  }
}

function requestHeaders(request: IncomingMessage): RequestHeaders {
  return Object.fromEntries(
    Object.entries(request.headers).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : value,
    ]),
  );
}

function isUnmeteredHealthPath(path: string): boolean {
  return path === "/health/live" || path === "/health/ready";
}

function clientKey(
  request: IncomingMessage,
  route: string,
  trustedProxyCidrs: readonly TrustedProxyCidr[],
): string {
  const address = resolveClientAddress(
    request.socket.remoteAddress,
    request.headers["x-forwarded-for"],
    trustedProxyCidrs,
  );
  return `${address}|${route}`;
}

async function readJsonBody(
  request: IncomingMessage,
  maxBodyBytes: number,
): Promise<unknown> {
  const contentLength = request.headers["content-length"];
  if (contentLength !== undefined) {
    const parsedLength = Number(contentLength);
    if (!Number.isSafeInteger(parsedLength) || parsedLength < 0) {
      throw new BodyLimitError();
    }
    if (parsedLength > maxBodyBytes) throw new BodyLimitError();
  }

  const chunks: Buffer[] = [];
  let totalBytes = 0;
  return new Promise((resolve, reject) => {
    request.on("data", (chunk: Buffer | string) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += buffer.byteLength;
      if (totalBytes > maxBodyBytes) {
        request.resume();
        reject(new BodyLimitError());
        return;
      }
      chunks.push(buffer);
    });
    request.on("end", () => {
      if (chunks.length === 0) {
        resolve(undefined);
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown);
      } catch {
        reject(new BodyLimitError());
      }
    });
    request.on("error", () => reject(new BodyLimitError()));
  });
}

function writeResponse(
  response: ServerResponse,
  payload: ApiHttpResponse,
): void {
  response.statusCode = payload.status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", "no-store");
  response.setHeader("x-request-id", payload.body.meta.request_id);
  for (const [name, value] of Object.entries(payload.headers ?? {})) {
    response.setHeader(name, value);
  }
  for (const [name, value] of Object.entries(API_SECURITY_HEADERS)) {
    response.setHeader(name, value);
  }
  if (payload.rawBody !== undefined) {
    response.setHeader(
      "content-type",
      payload.rawContentType ?? "text/plain; charset=utf-8",
    );
    response.end(payload.rawBody);
    return;
  }
  response.end(JSON.stringify(payload.body));
}

function safeRequestId(factory: () => string): string {
  try {
    const requestId = factory();
    return typeof requestId === "string" &&
      requestId.trim().length > 0 &&
      requestId.length <= 128
      ? requestId
      : "request-error";
  } catch {
    return "request-error";
  }
}

function requestFailurePayload(
  dependencies: ApiHttpDependencies,
  status: number,
): ApiHttpResponse {
  return {
    status,
    body: apiErrorResponse(
      "internal_error",
      safeRequestId(dependencies.requestIdFactory),
    ),
  };
}

function toPath(request: IncomingMessage): string {
  try {
    return new URL(request.url ?? "/", "http://127.0.0.1").pathname;
  } catch {
    return "/";
  }
}

function toQuery(
  request: IncomingMessage,
): Readonly<Record<string, string | undefined>> {
  try {
    return Object.freeze(
      Object.fromEntries(
        new URL(request.url ?? "/", "http://127.0.0.1").searchParams.entries(),
      ),
    );
  } catch {
    return Object.freeze({});
  }
}

function requestMetadata(request: IncomingMessage): Readonly<{
  readonly path: string;
  readonly method: string;
  readonly route: string;
}> {
  const path = toPath(request);
  const method = request.method ?? "GET";
  return Object.freeze({ path, method, route: routeTemplate(method, path) });
}

export function requestOutcome(
  status: number,
): "success" | "client_error" | "server_error" {
  if (status >= 500) return "server_error";
  if (status >= 400) return "client_error";
  return "success";
}

function observeRequest(
  observability: Observability | undefined,
  request: IncomingMessage,
  payload: ApiHttpResponse,
  startedAt: number,
): void {
  if (observability === undefined) return;

  const method = request.method ?? "GET";
  const route = routeTemplate(method, toPath(request));
  const outcome = requestOutcome(payload.status);
  const status = String(payload.status);
  const requestId = payload.body.meta.request_id;
  const correlationId =
    sanitizeCorrelationId(request.headers["x-correlation-id"]) ?? requestId;
  const durationMs = Math.max(0, Date.now() - startedAt);
  const fields = { method, route, status: payload.status, outcome };

  const traceparent = request.headers.traceparent;
  const traceContext =
    typeof traceparent === "string"
      ? traceparent.match(/^00-([a-f0-9]{32})-([a-f0-9]{16})-[a-f0-9]{2}$/u)
      : null;

  observability.logger.info("http.request.completed", {
    requestId,
    correlationId,
    durationMs,
    fields,
  });
  observability.metrics.increment("api.requests.total", {
    route,
    status,
    outcome,
  });
  observability.metrics.observe("api.request.duration_ms", durationMs, {
    route,
  });
  observability.traces.record({
    ...(traceContext?.[1] === undefined ? {} : { traceId: traceContext[1] }),
    ...(traceContext?.[2] === undefined
      ? {}
      : { parentSpanId: traceContext[2] }),
    name: "http.request",
    startedAt: new Date(startedAt),
    endedAt: new Date(),
    status: outcome === "server_error" ? "error" : "ok",
    attributes: { method, route, status: payload.status, outcome },
  });
}

function observeRequestFailure(
  dependencies: ApiHttpDependencies,
  request: IncomingMessage,
  payload: ApiHttpResponse,
  startedAt: number,
  errorCode: string,
): void {
  try {
    const requestId = payload.body.meta.request_id;
    const correlationId =
      sanitizeCorrelationId(request.headers["x-correlation-id"]) ?? requestId;
    dependencies.observability?.logger.error("http.request.failed", {
      requestId,
      correlationId,
      durationMs: Math.max(0, Date.now() - startedAt),
      fields: {
        method: request.method ?? "GET",
        route: routeTemplate(request.method ?? "GET", toPath(request)),
        status: payload.status,
        error_code: errorCode,
      },
    });
    observeRequest(dependencies.observability, request, payload, startedAt);
  } catch {
    // Observability must not prevent the bounded fallback response.
  }
}

function respond(
  context: ApiRequestHandlerDependencies,
  request: IncomingMessage,
  response: ServerResponse,
  payload: ApiHttpResponse,
  startedAt: number,
  resumeRequest = false,
): void {
  if (resumeRequest) request.resume();
  observeRequest(
    context.dependencies.observability,
    request,
    payload,
    startedAt,
  );
  writeResponse(response, payload);
}

async function rateLimitResponse(
  context: ApiRequestHandlerDependencies,
  request: IncomingMessage,
  route: string,
  path: string,
): Promise<ApiHttpResponse | undefined> {
  if (isUnmeteredHealthPath(path)) return undefined;

  let rateLimit;
  try {
    rateLimit = await context.rateLimiter.check(
      clientKey(request, route, context.trustedProxyCidrs),
    );
  } catch {
    throw new RateLimiterUnavailableError();
  }
  if (rateLimit.allowed) return undefined;

  return {
    status: 429,
    body: apiErrorResponse(
      "rate_limited",
      context.dependencies.requestIdFactory(),
    ),
    ...(rateLimit.retryAfterSeconds === undefined
      ? {}
      : { headers: { "retry-after": String(rateLimit.retryAfterSeconds) } }),
  };
}

type BodyResult =
  | Readonly<{ readonly kind: "body"; readonly body: unknown }>
  | Readonly<{ readonly kind: "response"; readonly payload: ApiHttpResponse }>;

async function readRequestBody(
  context: ApiRequestHandlerDependencies,
  request: IncomingMessage,
): Promise<BodyResult> {
  try {
    return Object.freeze({
      kind: "body" as const,
      body: await readJsonBody(request, context.maxBodyBytes),
    });
  } catch {
    return Object.freeze({
      kind: "response" as const,
      payload: {
        status: 422,
        body: apiErrorResponse(
          "validation_error",
          context.dependencies.requestIdFactory(),
        ),
      },
    });
  }
}

async function processRequest(
  context: ApiRequestHandlerDependencies,
  request: IncomingMessage,
  response: ServerResponse,
  startedAt: number,
): Promise<void> {
  const { path, method, route } = requestMetadata(request);
  const rateLimit = await rateLimitResponse(context, request, route, path);
  if (rateLimit !== undefined) {
    respond(context, request, response, rateLimit, startedAt, true);
    return;
  }

  const headers = requestHeaders(request);
  if (!isCsrfAllowed(method, headers, context.allowedOrigins)) {
    respond(
      context,
      request,
      response,
      {
        status: 403,
        body: apiErrorResponse(
          "forbidden",
          context.dependencies.requestIdFactory(),
        ),
      },
      startedAt,
      true,
    );
    return;
  }

  const bodyResult = await readRequestBody(context, request);
  if (bodyResult.kind === "response") {
    respond(context, request, response, bodyResult.payload, startedAt);
    return;
  }

  const payload = await handleApiRequest(
    {
      method,
      path,
      body: bodyResult.body,
      query: toQuery(request),
      headers,
    } satisfies ApiHttpRequest,
    context.dependencies,
  );
  respond(context, request, response, payload, startedAt);
}

export function createApiRequestHandlerMethods(
  context: ApiRequestHandlerDependencies,
): ApiRequestHandlerMethods {
  const handle = async (
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> => {
    const startedAt = Date.now();
    try {
      await processRequest(context, request, response, startedAt);
    } catch (error) {
      const rateLimiterUnavailable =
        error instanceof RateLimiterUnavailableError;
      const payload = requestFailurePayload(
        context.dependencies,
        rateLimiterUnavailable ? 503 : 500,
      );
      request.resume();
      observeRequestFailure(
        context.dependencies,
        request,
        payload,
        startedAt,
        rateLimiterUnavailable
          ? "rate_limiter_unavailable"
          : "request_handler_failure",
      );
      if (response.headersSent) {
        response.destroy();
        return;
      }
      try {
        writeResponse(response, payload);
      } catch {
        response.destroy();
      }
    }
  };

  return Object.freeze({ handle });
}
