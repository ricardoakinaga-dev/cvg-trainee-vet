import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";

import { apiErrorResponse } from "@cvg/contracts";
import {
  API_SLO_DURATION_METRIC,
  BatchSpanProcessor,
  OtlpHttpExporter,
  createTracer,
  extractTraceParent,
  isolateObservabilityWrites,
  sanitizeCorrelationId,
  type Observability,
  type Span,
  type TraceContext,
  type Tracer,
} from "@cvg/observability";

import {
  handleApiRequest,
  type ApiHttpDependencies,
  type ApiHttpResponse,
  type ApiHttpRequest,
} from "./http.js";
import { recordApiRejectionAudit } from "./http/rejection-audit.js";
import { createHttpRequestDrain } from "./composition/http-request-drain.js";
import { createHttpServerLifecycle } from "./composition/http-server-lifecycle.js";
import {
  createRateLimiter,
  isCsrfAllowed,
  type RateLimitOptions,
  type RateLimitDecision,
  type RequestRateLimiter,
  type RequestHeaders,
} from "./request-security.js";
import {
  matchRoute,
  type RateLimitRiskClass,
} from "./routing/route-registry.js";
import {
  buildSecurityHeaders,
  type SecurityHeadersEnvironment,
} from "./security/security-headers.js";
import { resolveClientIp } from "./security/trusted-proxy.js";

const DEFAULT_MAX_BODY_BYTES = 64 * 1024;

export type ApiServerTracingOptions = Readonly<{
  readonly enabled?: boolean;
  readonly endpoint?: string;
  readonly serviceName?: string;
  readonly timeoutMs?: number;
  readonly sampleRatio?: number;
}>;

export type ApiServerOptions = Readonly<{
  readonly host?: string;
  readonly port?: number;
  readonly maxBodyBytes?: number;
  readonly allowedOrigins?: readonly string[];
  readonly rateLimit?: RateLimitOptions;
  readonly rateLimiter?: RequestRateLimiter;
  readonly trustedProxies?: readonly string[];
  readonly securityHeaders?: SecurityHeadersEnvironment;
  readonly tracing?: ApiServerTracingOptions;
}>;

export type ApiServer = Readonly<{
  readonly listen: () => Promise<void>;
  readonly close: () => Promise<void>;
  readonly address: () => ReturnType<Server["address"]>;
}>;

class BodyLimitError extends Error {
  public constructor() {
    super("Request body exceeds configured limit");
    this.name = "BodyLimitError";
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

function isHealthPath(path: string): boolean {
  return (
    path === "/health/live" ||
    path === "/health/ready" ||
    path === "/health/dependencies"
  );
}

function clientKey(
  request: IncomingMessage,
  route: string,
  trustedProxies: readonly string[] = [],
): string {
  const forwarded = request.headers["x-forwarded-for"];
  const realIp = request.headers["x-real-ip"];
  const forwardedHeader = request.headers.forwarded;
  const clientIp = resolveClientIp(
    request.socket.remoteAddress ?? "unknown",
    {
      ...(typeof forwarded === "string"
        ? { "x-forwarded-for": forwarded }
        : {}),
      ...(typeof realIp === "string" ? { "x-real-ip": realIp } : {}),
      ...(typeof forwardedHeader === "string"
        ? { forwarded: forwardedHeader }
        : {}),
    },
    trustedProxies,
  );
  return `${clientIp}|${route}`;
}

async function checkRateLimit(
  request: IncomingMessage,
  limiter: RequestRateLimiter,
  trustedProxies: readonly string[],
): Promise<RateLimitDecision> {
  const definition = matchRoute(request.method ?? "GET", toPath(request));
  const riskClass: RateLimitRiskClass =
    definition?.riskClass ?? "expensive-read";
  try {
    return await limiter.check(
      clientKey(request, definition?.template ?? "unmatched", trustedProxies),
      undefined,
      riskClass,
    );
  } catch {
    return { allowed: false, remaining: 0, retryAfterSeconds: 1 };
  }
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
  securityEnvironment: SecurityHeadersEnvironment,
): void {
  response.statusCode = payload.status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", "no-store");
  response.setHeader("x-request-id", payload.body.meta.request_id);
  for (const [name, value] of Object.entries(
    buildSecurityHeaders({ environment: securityEnvironment }),
  )) {
    response.setHeader(name, value);
  }
  for (const [name, value] of Object.entries(payload.headers ?? {})) {
    response.setHeader(name, value);
  }
  response.end(JSON.stringify(payload.body));
}

function toPath(request: IncomingMessage): string {
  try {
    return new URL(request.url ?? "/", "http://127.0.0.1").pathname;
  } catch {
    return "/";
  }
}

type ParsedQuery = Readonly<{
  readonly values: Readonly<Record<string, string | undefined>>;
  readonly duplicateKeys: readonly string[];
}>;

function toQuery(request: IncomingMessage): ParsedQuery {
  try {
    const searchParams = new URLSearchParams(
      new URL(request.url ?? "/", "http://127.0.0.1").search,
    );
    const duplicateKeys = [
      ...new Set(
        [...searchParams.keys()].filter(
          (key) => searchParams.getAll(key).length > 1,
        ),
      ),
    ];
    return {
      values: Object.fromEntries(searchParams.entries()),
      duplicateKeys,
    };
  } catch {
    return { values: {}, duplicateKeys: [] };
  }
}

export function routeTemplate(method: string, path: string): string {
  return matchRoute(method, path)?.template ?? "unmatched";
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
  trace?: TraceContext,
): void {
  if (observability === undefined) return;
  const isolated = isolateObservabilityWrites(observability);

  const method = request.method ?? "GET";
  const route = routeTemplate(method, toPath(request));
  const outcome = requestOutcome(payload.status);
  const status = String(payload.status);
  const requestId = payload.body.meta.request_id;
  const correlationId =
    sanitizeCorrelationId(request.headers["x-correlation-id"]) ?? requestId;
  const durationMs = Math.max(0, performance.now() - startedAt);
  const fields = { method, route, status: payload.status, outcome };

  isolated.logger.info("http.request.completed", {
    requestId,
    correlationId,
    ...(trace === undefined
      ? {}
      : { traceId: trace.traceId, spanId: trace.spanId }),
    durationMs,
    fields,
  });
  // Legacy names are preserved; http_* aliases follow OTel/semconv style.
  isolated.metrics.increment("api.requests.total", {
    route,
    status,
    outcome,
  });
  isolated.metrics.increment("http_requests_total", {
    route,
    status,
    outcome,
  });
  if (payload.status >= 500) {
    isolated.metrics.increment("http_server_errors_total", {
      route,
      status,
    });
  }
  if (payload.status === 429) {
    isolated.metrics.increment("rate_limit_rejections_total", { route });
  }
  const matched = matchRoute(method, toPath(request));
  if (
    payload.status >= 200 &&
    payload.status < 300 &&
    matched !== undefined &&
    matched !== null &&
    matched.template.startsWith("/api/v1/") &&
    matched.riskClass !== "ai-assisted" &&
    ["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method)
  ) {
    isolated.metrics.observe(API_SLO_DURATION_METRIC, durationMs, {
      operation: method === "GET" ? "read" : "mutation",
    });
  }
  isolated.metrics.observe("api.request.duration_ms", durationMs, {
    route,
  });
  isolated.metrics.observe("http_request_duration_seconds", durationMs / 1000, {
    route,
  });
}

type RequestTracer = Readonly<{
  readonly tracer: Tracer;
  readonly processor: BatchSpanProcessor;
}>;

function createRequestTracer(
  options: ApiServerTracingOptions | undefined,
): RequestTracer | null {
  if (options?.enabled !== true || options.endpoint === undefined) return null;
  const processor = new BatchSpanProcessor(
    new OtlpHttpExporter({
      endpoint: options.endpoint,
      ...(options.timeoutMs === undefined
        ? {}
        : { timeoutMs: options.timeoutMs }),
      ...(options.serviceName === undefined
        ? {}
        : { serviceName: options.serviceName }),
    }),
  );
  return Object.freeze({
    processor,
    tracer: createTracer({
      ...(options.sampleRatio === undefined
        ? {}
        : { sampleRatio: options.sampleRatio }),
      onEnd: (span) => {
        void processor.onEnd(span);
      },
    }),
  });
}

function finishHttpRequest(
  payload: ApiHttpResponse,
  request: IncomingMessage,
  response: ServerResponse,
  dependencies: ApiHttpDependencies,
  startedAt: number,
  span: Span | null,
  environment: SecurityHeadersEnvironment,
): void {
  if (span !== null) {
    span.setAttribute("status", payload.status);
    span.setAttribute("outcome", requestOutcome(payload.status));
    if (payload.status >= 500) span.setStatus("error");
    span.end();
  }
  observeRequest(
    dependencies.observability,
    request,
    payload,
    startedAt,
    span?.context,
  );
  writeResponse(response, payload, environment);
}

function writeClosingResponse(
  request: IncomingMessage,
  response: ServerResponse,
  dependencies: ApiHttpDependencies,
  environment: SecurityHeadersEnvironment,
): void {
  request.resume();
  writeResponse(
    response,
    {
      status: 503,
      headers: { connection: "close" },
      body: apiErrorResponse("internal_error", dependencies.requestIdFactory()),
    },
    environment,
  );
}

export function createApiServer(
  dependencies: ApiHttpDependencies,
  options: ApiServerOptions = {},
): ApiServer {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 3000;
  const maxBodyBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;
  const allowedOrigins = options.allowedOrigins ?? [
    `http://${host}:${port}`,
    `http://localhost:${port}`,
  ];
  const limiter = options.rateLimiter ?? createRateLimiter(options.rateLimit);
  const trustedProxies = options.trustedProxies ?? [];
  const requestTracer = createRequestTracer(options.tracing);
  const securityEnvironment: SecurityHeadersEnvironment =
    options.securityHeaders ??
    (process.env.NODE_ENV === "production" ? "production" : "test");
  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new RangeError("port must be an integer between 0 and 65535");
  }
  if (!Number.isInteger(maxBodyBytes) || maxBodyBytes < 1) {
    throw new RangeError("maxBodyBytes must be a positive integer");
  }

  const requestDrain = createHttpRequestDrain();
  const server = createServer((request, response) =>
    requestDrain.track(async () => {
      if (lifecycle.isClosing()) {
        writeClosingResponse(
          request,
          response,
          dependencies,
          securityEnvironment,
        );
        return;
      }
      const startedAt = performance.now();
      const path = toPath(request);
      const method = request.method ?? "GET";
      const route = routeTemplate(method, path);
      const parent = extractTraceParent(
        typeof request.headers.traceparent === "string"
          ? request.headers.traceparent
          : undefined,
      );
      const span: Span | null =
        requestTracer === null
          ? null
          : requestTracer.tracer.startSpan(`HTTP ${method} ${route}`, {
              ...(parent === null ? {} : { parent }),
              attributes: { method, route },
            });
      try {
        const finish = (payload: ApiHttpResponse): void =>
          finishHttpRequest(
            payload,
            request,
            response,
            dependencies,
            startedAt,
            span,
            securityEnvironment,
          );
        if (!isHealthPath(path)) {
          const rateLimit = await checkRateLimit(
            request,
            limiter,
            trustedProxies,
          );
          if (!rateLimit.allowed) {
            const payload: ApiHttpResponse = {
              status: 429,
              body: apiErrorResponse(
                "rate_limited",
                dependencies.requestIdFactory(),
              ),
              ...(rateLimit.retryAfterSeconds === undefined
                ? {}
                : {
                    headers: {
                      "retry-after": String(rateLimit.retryAfterSeconds),
                    },
                  }),
            };
            request.resume();
            await recordApiRejectionAudit(
              dependencies,
              { method, path, route, headers: requestHeaders(request) },
              payload,
            );
            finish(payload);
            return;
          }
        }

        const headers = requestHeaders(request);
        if (!isCsrfAllowed(method, headers, allowedOrigins)) {
          const payload: ApiHttpResponse = {
            status: 403,
            body: apiErrorResponse(
              "forbidden",
              dependencies.requestIdFactory(),
            ),
          };
          request.resume();
          await recordApiRejectionAudit(
            dependencies,
            { method, path, route, headers },
            payload,
          );
          finish(payload);
          return;
        }

        let body: unknown;
        try {
          body = await readJsonBody(request, maxBodyBytes);
        } catch {
          const payload: ApiHttpResponse = {
            status: 422,
            body: apiErrorResponse(
              "validation_error",
              dependencies.requestIdFactory(),
            ),
          };
          await recordApiRejectionAudit(
            dependencies,
            { method, path, route, headers },
            payload,
          );
          finish(payload);
          return;
        }

        const parsedQuery = toQuery(request);
        const apiRequest: ApiHttpRequest = {
          method,
          path,
          route,
          body,
          query: parsedQuery.values,
          queryDuplicateKeys: parsedQuery.duplicateKeys,
          headers,
        };
        const payload = await handleApiRequest(apiRequest, dependencies);
        finish(payload);
      } finally {
        span?.end();
      }
    }),
  );

  const lifecycle = createHttpServerLifecycle(
    server,
    host,
    port,
    () => requestTracer?.processor.close() ?? Promise.resolve(),
    requestDrain.drain,
  );
  return Object.freeze({
    listen: lifecycle.listen,
    close: lifecycle.close,
    address: () => server.address(),
  });
}
