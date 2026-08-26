import { z } from "zod";

const booleanString = z
  .enum(["true", "false"])
  .transform((value) => value === "true");
const developmentAuditCursorKey = "cvg-development-only-audit-cursor-key-v1";

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
  AUDIT_CURSOR_SECRET: z.string().min(32).optional(),
  CLINICAL_APPROVER_ID: z.string().min(1).optional(),
  DIAGNOSTIC_SESSION_DRAFT_ENABLED: booleanString.default(false),
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
});

type EnvironmentInput = Record<string, string | undefined>;

export type RuntimeConfig = {
  nodeEnv: "development" | "test" | "production";
  databaseUrl: string;
  requireDatabaseLeastPrivilege: boolean;
  diagnosticSessionDraftEnabled: boolean;
  auditCursorSecret: string;
  approvedClinicalApproverId?: string;
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

export function loadRuntimeConfig(
  environment: EnvironmentInput,
): RuntimeConfig {
  const parsed = rawEnvironmentSchema.safeParse(environment);

  if (!parsed.success) {
    const fields = parsed.error.issues.map(
      (issue) => issue.path.join(".") || "environment",
    );
    throw new ConfigError(
      `Invalid runtime configuration: ${fields.join(", ")}`,
    );
  }

  const value = parsed.data;
  const missing: string[] = [];
  const auditCursorSecret =
    value.AUDIT_CURSOR_SECRET ??
    (value.NODE_ENV === "production" ? undefined : developmentAuditCursorKey);
  if (auditCursorSecret === undefined) missing.push("AUDIT_CURSOR_SECRET");

  if (value.QDRANT_ENABLED) {
    if (!value.QDRANT_URL) missing.push("QDRANT_URL");
    if (!value.EMBEDDING_MODEL) missing.push("EMBEDDING_MODEL");
    if (!value.EMBEDDING_DIMENSION) missing.push("EMBEDDING_DIMENSION");
    if (
      value.EMBEDDING_PROVIDER === "openai" &&
      !value.EMBEDDING_API_KEY &&
      !value.AI_API_KEY
    ) {
      missing.push("EMBEDDING_API_KEY or AI_API_KEY");
    }
    if (
      value.EMBEDDING_PROVIDER === "fake" &&
      value.NODE_ENV === "production"
    ) {
      throw new ConfigError(
        "Deterministic embedding provider is allowed only in development or test",
      );
    }
  }

  if (value.AI_ENABLED) {
    if (!value.AI_API_KEY) missing.push("AI_API_KEY");
    if (!value.AI_MODEL) missing.push("AI_MODEL");
  }

  if (missing.length > 0) {
    throw new ConfigError(
      `Missing runtime configuration: ${missing.join(", ")}`,
    );
  }

  return {
    nodeEnv: value.NODE_ENV,
    databaseUrl: value.DATABASE_URL,
    requireDatabaseLeastPrivilege: value.NODE_ENV === "production",
    diagnosticSessionDraftEnabled:
      value.NODE_ENV !== "production" && value.DIAGNOSTIC_SESSION_DRAFT_ENABLED,
    auditCursorSecret: auditCursorSecret as string,
    ...(value.CLINICAL_APPROVER_ID === undefined
      ? {}
      : { approvedClinicalApproverId: value.CLINICAL_APPROVER_ID }),
    qdrant: value.QDRANT_ENABLED
      ? {
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
        }
      : { enabled: false },
    ai: value.AI_ENABLED
      ? {
          enabled: true,
          provider: value.AI_PROVIDER,
          apiKey: value.AI_API_KEY as string,
          model: value.AI_MODEL as string,
        }
      : { enabled: false, provider: value.AI_PROVIDER },
  };
}
