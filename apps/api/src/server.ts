import { createServer, type Server } from "node:http";

import type { ApiHttpDependencies } from "./http.js";
import {
  createRateLimiter,
  type RateLimitOptions,
  type RequestRateLimiter,
} from "./request-security.js";
import { parseTrustedProxyCidrs } from "./client-address.js";
import { createApiRequestHandlerMethods } from "./server-http.js";

export { routeTemplate } from "./route-template.js";
export { requestOutcome } from "./server-http.js";

const DEFAULT_MAX_BODY_BYTES = 64 * 1024;

export type ApiServerOptions = Readonly<{
  readonly host?: string;
  readonly port?: number;
  readonly maxBodyBytes?: number;
  readonly allowedOrigins?: readonly string[];
  readonly trustedProxyCidrs?: readonly string[];
  readonly rateLimit?: RateLimitOptions;
  readonly rateLimiter?: RequestRateLimiter;
}>;

export type ApiServer = Readonly<{
  readonly listen: () => Promise<void>;
  readonly close: () => Promise<void>;
  readonly address: () => ReturnType<Server["address"]>;
}>;

function validateServerLimits(port: number, maxBodyBytes: number): void {
  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new RangeError("port must be an integer between 0 and 65535");
  }
  if (!Number.isInteger(maxBodyBytes) || maxBodyBytes < 1) {
    throw new RangeError("maxBodyBytes must be a positive integer");
  }
}

export function createApiServer(
  dependencies: ApiHttpDependencies,
  options: ApiServerOptions = {},
): ApiServer {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 3000;
  const maxBodyBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;
  const allowedOrigins = Object.freeze([
    ...(options.allowedOrigins ?? [
      `http://${host}:${port}`,
      `http://localhost:${port}`,
    ]),
  ]);
  const rateLimiter =
    options.rateLimiter ?? createRateLimiter(options.rateLimit);
  const trustedProxyCidrs = parseTrustedProxyCidrs(options.trustedProxyCidrs);
  validateServerLimits(port, maxBodyBytes);

  const server = createServer(
    createApiRequestHandlerMethods({
      dependencies,
      allowedOrigins,
      maxBodyBytes,
      rateLimiter,
      trustedProxyCidrs,
    }).handle,
  );

  return Object.freeze({
    listen: () =>
      new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, host, () => {
          server.off("error", reject);
          resolve();
        });
      }),
    close: () =>
      new Promise<void>((resolve, reject) => {
        if (!server.listening) {
          resolve();
          return;
        }
        server.close((error) => (error ? reject(error) : resolve()));
      }),
    address: () => server.address(),
  });
}
