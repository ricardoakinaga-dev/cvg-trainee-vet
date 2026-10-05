import { createPostgresRateLimiter } from "@cvg/persistence";

import type { RequestRateLimiter } from "../request-security.js";
import {
  createBackendRequestLimiter,
  createClassifiedBackendRequestLimiter,
  createRedisRateLimitStore,
  describeRateLimitBackend,
  FAIL_POLICY_BY_RISK_CLASS,
  RISK_CLASS_LIMITS,
} from "../security/rate-limit-store.js";
import { createRespScriptClient } from "../security/redis-client.js";

/**
 * AAA-FINAL-005 §17: default postgres-shared, explicit Redis/Valkey URL,
 * unknown backend rejected at startup. Memory remains a server test default;
 * neither distributed backend falls back to it. All classes use one backend.
 */
export function createHttpRateLimiter(
  environment: Record<string, string | undefined>,
  database: Parameters<typeof createPostgresRateLimiter>[0],
  log: (message: string) => void,
): RequestRateLimiter {
  const backend = (
    environment.CVG_RATE_LIMIT_BACKEND ?? "postgres-shared"
  ).trim();
  if (backend === "redis") {
    const url = environment.CVG_RATE_LIMIT_REDIS_URL?.trim();
    if (url === undefined || url.length === 0) {
      throw new RangeError(
        "CVG_RATE_LIMIT_REDIS_URL is required with CVG_RATE_LIMIT_BACKEND=redis",
      );
    }
    const store = createRedisRateLimitStore(createRespScriptClient(url), {
      keyPrefix: "rl:v1",
    });
    log(`rate-limit backend: ${describeRateLimitBackend("redis").backend}`);
    return createClassifiedBackendRequestLimiter((riskClass) =>
      createBackendRequestLimiter(store, {
        ...RISK_CLASS_LIMITS[riskClass],
        failPolicy: FAIL_POLICY_BY_RISK_CLASS[riskClass],
      }),
    );
  }
  if (backend === "postgres-shared") {
    log(
      `rate-limit backend: ${describeRateLimitBackend("postgres-shared").backend}`,
    );
    return createClassifiedBackendRequestLimiter((riskClass) =>
      createPostgresRateLimiter(database, RISK_CLASS_LIMITS[riskClass]),
    );
  }
  throw new RangeError(`unknown CVG_RATE_LIMIT_BACKEND: ${backend}`);
}
