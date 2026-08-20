import { z } from "zod";

const booleanString = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

const optionalNonEmptyString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

const optionalHttpUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z
    .string()
    .url()
    .refine(
      (value) => value.startsWith("http://") || value.startsWith("https://"),
      "IDENTITY_PROVIDER_URL must use HTTP(S)",
    )
    .optional(),
);

const rawEnvironmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z
    .string()
    .url()
    .refine(
      (value) =>
        value.startsWith("postgresql://") || value.startsWith("postgres://"),
      "DATABASE_URL must use PostgreSQL",
    ),
  QDRANT_ENABLED: booleanString.default(false),
  QDRANT_URL: z
    .string()
    .url()
    .refine(
      (value) => value.startsWith("http://") || value.startsWith("https://"),
      "QDRANT_URL must use HTTP(S)",
    )
    .optional(),
  QDRANT_API_KEY: z.string().min(1).optional(),
  QDRANT_COLLECTION: z
    .string()
    .regex(/^[A-Za-z0-9_-]+$/)
    .default("cvg_internal_knowledge_v1"),
  QDRANT_INDEX_VERSION: z
    .string()
    .regex(/^[A-Za-z0-9._-]+$/)
    .default("v1"),
  EMBEDDING_PROVIDER: z.enum(["openai", "fake"]).default("openai"),
  EMBEDDING_MODEL: z.string().min(1).optional(),
  EMBEDDING_API_KEY: z.string().min(1).optional(),
  EMBEDDING_DIMENSION: z.coerce.number().int().positive().optional(),
  AI_ENABLED: booleanString.default(false),
  AI_PROVIDER: z.literal("openai").default("openai"),
  AI_API_KEY: z.string().min(1).optional(),
  AI_MODEL: z.string().min(1).optional(),
  AI_OPERATIONAL_COST_CEILING_USD: z.coerce
    .number()
    .finite()
    .positive()
    .max(100)
    .default(0.25),
  IDENTITY_PROVIDER_REQUIRED: booleanString.default(false),
  IDENTITY_PROVIDER_URL: optionalHttpUrl,
  IDENTITY_PROVIDER_TOKEN: optionalNonEmptyString,
  METRICS_SCRAPE_TOKEN: z.string().min(32).optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z
    .string()
    .url()
    .refine(
      (value) => value.startsWith("http://") || value.startsWith("https://"),
      "OTEL_EXPORTER_OTLP_ENDPOINT must use HTTP(S)",
    )
    .optional(),
});

type EnvironmentInput = Record<string, string | undefined>;
type ParsedEnvironment = z.infer<typeof rawEnvironmentSchema>;

export type RuntimeConfig = {
  nodeEnv: "development" | "test" | "production";
  databaseUrl: string;
  requireDatabaseLeastPrivilege: boolean;
  operationalAiCostCeilingUsd: number;
  identityProvider:
    { configured: false } | { configured: true; url: string; token: string };
  identityProviderRequired: boolean;
  observability:
    { configured: false } | { configured: true; otlpEndpoint: string };
  metricsScrapeToken?: string;
  qdrant:
    | {
        enabled: false;
      }
    | {
        enabled: true;
        url: string;
        apiKey?: string;
        collection: string;
        indexVersion: string;
        embeddingProvider: "openai" | "fake";
        embeddingApiKey?: string;
        embeddingModel: string;
        embeddingDimension: number;
      };
  ai:
    | {
        enabled: false;
        provider: "openai";
      }
    | {
        enabled: true;
        provider: "openai";
        apiKey: string;
        model: string;
      };
};

export class ConfigError extends Error {
  public override readonly name = "ConfigError";

  public constructor(message: string) {
    super(message);
  }
}

function parseRuntimeEnvironment(
  environment: EnvironmentInput,
): ParsedEnvironment {
  const parsed = rawEnvironmentSchema.safeParse(environment);

  if (!parsed.success) {
    const fields = parsed.error.issues.map(
      (issue) => issue.path.join(".") || "environment",
    );
    throw new ConfigError(
      `Invalid runtime configuration: ${fields.join(", ")}`,
    );
  }
  return parsed.data;
}

function validateQdrantRequirements(
  value: ParsedEnvironment,
): readonly string[] {
  if (!value.QDRANT_ENABLED) return [];
  if (value.EMBEDDING_PROVIDER === "fake" && value.NODE_ENV === "production") {
    throw new ConfigError(
      "Deterministic embedding provider is allowed only in development or test",
    );
  }
  return Object.freeze([
    ...(value.QDRANT_URL ? [] : ["QDRANT_URL"]),
    ...(value.EMBEDDING_MODEL ? [] : ["EMBEDDING_MODEL"]),
    ...(value.EMBEDDING_DIMENSION ? [] : ["EMBEDDING_DIMENSION"]),
    ...(value.EMBEDDING_PROVIDER === "openai" &&
    !value.EMBEDDING_API_KEY &&
    !value.AI_API_KEY
      ? ["EMBEDDING_API_KEY or AI_API_KEY"]
      : []),
  ]);
}

function validateAiRequirements(value: ParsedEnvironment): readonly string[] {
  if (!value.AI_ENABLED) return [];
  return Object.freeze([
    ...(value.AI_API_KEY ? [] : ["AI_API_KEY"]),
    ...(value.AI_MODEL ? [] : ["AI_MODEL"]),
  ]);
}

function validateIdentityProviderRequirements(
  value: ParsedEnvironment,
): readonly string[] {
  return Object.freeze([
    ...(value.IDENTITY_PROVIDER_URL && !value.IDENTITY_PROVIDER_TOKEN
      ? ["IDENTITY_PROVIDER_TOKEN"]
      : []),
    ...(value.IDENTITY_PROVIDER_REQUIRED && !value.IDENTITY_PROVIDER_URL
      ? ["IDENTITY_PROVIDER_URL"]
      : []),
    ...(value.IDENTITY_PROVIDER_REQUIRED && !value.IDENTITY_PROVIDER_TOKEN
      ? ["IDENTITY_PROVIDER_TOKEN"]
      : []),
  ]);
}

function validateProductionRequirements(
  value: ParsedEnvironment,
): readonly string[] {
  if (
    value.NODE_ENV === "production" &&
    value.IDENTITY_PROVIDER_URL !== undefined &&
    !value.IDENTITY_PROVIDER_URL.startsWith("https://")
  ) {
    throw new ConfigError("IDENTITY_PROVIDER_URL must use HTTPS in production");
  }
  return Object.freeze([
    ...(value.NODE_ENV === "production" && !value.METRICS_SCRAPE_TOKEN
      ? ["METRICS_SCRAPE_TOKEN"]
      : []),
  ]);
}

function collectMissingRuntimeConfiguration(
  value: ParsedEnvironment,
): readonly string[] {
  return Object.freeze([
    ...validateQdrantRequirements(value),
    ...validateAiRequirements(value),
    ...validateIdentityProviderRequirements(value),
    ...validateProductionRequirements(value),
  ]);
}

function buildIdentityProvider(
  value: ParsedEnvironment,
): RuntimeConfig["identityProvider"] {
  return value.IDENTITY_PROVIDER_URL === undefined
    ? { configured: false }
    : {
        configured: true,
        url: value.IDENTITY_PROVIDER_URL,
        token: value.IDENTITY_PROVIDER_TOKEN as string,
      };
}

function buildObservability(
  value: ParsedEnvironment,
): RuntimeConfig["observability"] {
  return value.OTEL_EXPORTER_OTLP_ENDPOINT === undefined
    ? { configured: false }
    : {
        configured: true,
        otlpEndpoint: value.OTEL_EXPORTER_OTLP_ENDPOINT,
      };
}

function buildQdrant(value: ParsedEnvironment): RuntimeConfig["qdrant"] {
  if (!value.QDRANT_ENABLED) return { enabled: false };
  return {
    enabled: true,
    url: value.QDRANT_URL as string,
    ...(value.QDRANT_API_KEY ? { apiKey: value.QDRANT_API_KEY } : {}),
    collection: value.QDRANT_COLLECTION,
    indexVersion: value.QDRANT_INDEX_VERSION,
    embeddingProvider: value.EMBEDDING_PROVIDER,
    ...((value.EMBEDDING_API_KEY ?? value.AI_API_KEY)
      ? {
          embeddingApiKey:
            value.EMBEDDING_API_KEY ?? (value.AI_API_KEY as string),
        }
      : {}),
    embeddingModel: value.EMBEDDING_MODEL as string,
    embeddingDimension: value.EMBEDDING_DIMENSION as number,
  };
}

function buildAi(value: ParsedEnvironment): RuntimeConfig["ai"] {
  return value.AI_ENABLED
    ? {
        enabled: true,
        provider: value.AI_PROVIDER,
        apiKey: value.AI_API_KEY as string,
        model: value.AI_MODEL as string,
      }
    : { enabled: false, provider: value.AI_PROVIDER };
}

function buildRuntimeConfig(value: ParsedEnvironment): RuntimeConfig {
  return {
    nodeEnv: value.NODE_ENV,
    databaseUrl: value.DATABASE_URL,
    requireDatabaseLeastPrivilege: value.NODE_ENV === "production",
    operationalAiCostCeilingUsd: value.AI_OPERATIONAL_COST_CEILING_USD,
    identityProvider: buildIdentityProvider(value),
    identityProviderRequired: value.IDENTITY_PROVIDER_REQUIRED,
    observability: buildObservability(value),
    ...(value.METRICS_SCRAPE_TOKEN === undefined
      ? {}
      : { metricsScrapeToken: value.METRICS_SCRAPE_TOKEN }),
    qdrant: buildQdrant(value),
    ai: buildAi(value),
  };
}

export function loadRuntimeConfig(
  environment: EnvironmentInput,
): RuntimeConfig {
  const value = parseRuntimeEnvironment(environment);
  const missing = collectMissingRuntimeConfiguration(value);

  if (missing.length > 0) {
    throw new ConfigError(
      `Missing runtime configuration: ${missing.join(", ")}`,
    );
  }
  return buildRuntimeConfig(value);
}
