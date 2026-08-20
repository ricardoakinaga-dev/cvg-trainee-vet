import { loadRuntimeConfig } from "@cvg/config";
import type { ServerIntegrationSet } from "@cvg/integrations";

import { createApiHttpDependencies } from "./api-http-dependencies.js";
import { createApiRuntimeResources } from "./api-runtime-resources.js";
import type { ApiHttpDependencies } from "./http.js";
import type { ApiServer } from "./server.js";
import { createApiServer as createNodeApiServer } from "./server.js";

function configuredOrigins(
  environment: Record<string, string | undefined>,
): readonly string[] | undefined {
  const raw = environment.WEB_ORIGINS?.trim();
  if (raw === undefined || raw.length === 0) return undefined;
  const origins = raw
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  return origins.length === 0 ? undefined : Object.freeze(origins);
}

function configuredTrustedProxyCidrs(
  environment: Record<string, string | undefined>,
): readonly string[] | undefined {
  const raw = environment.TRUSTED_PROXY_CIDRS?.trim();
  if (raw === undefined || raw.length === 0) return undefined;
  const ranges = raw
    .split(",")
    .map((range) => range.trim())
    .filter((range) => range.length > 0);
  return ranges.length === 0 ? undefined : Object.freeze(ranges);
}

export type ApiRuntimeOptions = Readonly<{
  readonly authenticate?: ApiHttpDependencies["authenticate"];
}>;

export function createApiRuntime(
  environment: Record<string, string | undefined>,
  options: ApiRuntimeOptions = {},
): Readonly<{
  service: "api";
  config: ReturnType<typeof loadRuntimeConfig>;
  integrations: ServerIntegrationSet;
  server: ApiServer;
  listen: () => Promise<void>;
  close: () => Promise<void>;
}> {
  const config = loadRuntimeConfig(environment);
  const trustedProxyCidrs = configuredTrustedProxyCidrs(environment);
  const webOrigins = configuredOrigins(environment);
  const resources = createApiRuntimeResources(config);
  const apiDependencies = createApiHttpDependencies(
    config,
    resources,
    options.authenticate,
  );
  const server = createNodeApiServer(apiDependencies, {
    host: environment.API_HOST ?? "127.0.0.1",
    port: environment.API_PORT ? Number(environment.API_PORT) : 3000,
    ...(webOrigins === undefined ? {} : { allowedOrigins: webOrigins }),
    ...(trustedProxyCidrs === undefined ? {} : { trustedProxyCidrs }),
    rateLimiter: resources.rateLimiter,
  });

  return Object.freeze({
    service: "api" as const,
    config,
    integrations: resources.integrations,
    server,
    listen: async () => {
      await resources.integrations.initialize();
      await server.listen();
    },
    close: async () => {
      await server.close();
      await resources.integrations.close();
    },
  });
}

if (process.env.NODE_ENV !== "test") {
  const runtime = createApiRuntime(process.env);
  void runtime.listen().catch(() => {
    process.exitCode = 1;
  });
}
