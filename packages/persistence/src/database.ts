import postgres, { type Sql } from "postgres";
import { sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";

import * as schema from "./schema.js";

export type DatabaseOptions = Readonly<{
  maxConnections?: number;
  connectTimeoutSeconds?: number;
  prepareStatements?: boolean;
  requireLeastPrivilege?: boolean;
}>;

export type NormalizedDatabaseOptions = Readonly<{
  maxConnections: number;
  connectTimeoutSeconds: number;
  prepareStatements: boolean;
  requireLeastPrivilege: boolean;
}>;

export type DatabaseHandle = Readonly<{
  db: PostgresJsDatabase<typeof schema>;
  healthcheck: () => Promise<void>;
  close: () => Promise<void>;
}>;

export function normalizeDatabaseOptions(
  options: DatabaseOptions = {},
): NormalizedDatabaseOptions {
  const maxConnections = options.maxConnections ?? 10;
  const connectTimeoutSeconds = options.connectTimeoutSeconds ?? 10;
  const prepareStatements = options.prepareStatements ?? true;
  const requireLeastPrivilege = options.requireLeastPrivilege ?? false;

  if (!Number.isInteger(maxConnections) || maxConnections < 1) {
    throw new RangeError("maxConnections must be a positive integer");
  }

  if (!Number.isInteger(connectTimeoutSeconds) || connectTimeoutSeconds < 1) {
    throw new RangeError("connectTimeoutSeconds must be a positive integer");
  }

  return Object.freeze({
    maxConnections,
    connectTimeoutSeconds,
    prepareStatements,
    requireLeastPrivilege,
  });
}

export function createPostgresDatabase(
  databaseUrl: string,
  options: DatabaseOptions = {},
): DatabaseHandle {
  if (
    !databaseUrl.startsWith("postgresql://") &&
    !databaseUrl.startsWith("postgres://")
  ) {
    throw new TypeError("databaseUrl must use PostgreSQL");
  }

  const normalized = normalizeDatabaseOptions(options);
  const client: Sql = postgres(databaseUrl, {
    max: normalized.maxConnections,
    connect_timeout: normalized.connectTimeoutSeconds,
    prepare: normalized.prepareStatements,
  });
  const db = drizzle({ client, schema });
  const healthcheck = async (): Promise<void> => {
    await db.execute(sql`select 1`);
    if (normalized.requireLeastPrivilege) {
      const rows = await db.execute<{
        readonly isSuperuser: boolean;
        readonly bypassesRls: boolean;
      }>(sql`
        select
          rolsuper as "isSuperuser",
          rolbypassrls as "bypassesRls"
        from pg_roles
        where rolname = current_user
      `);
      const role = rows[0];
      if (role === undefined || role.isSuperuser || role.bypassesRls) {
        throw new Error(
          "database connection must use a non-superuser role without BYPASSRLS",
        );
      }
    }
  };

  return Object.freeze({
    db,
    healthcheck,
    close: async () =>
      client.end({ timeout: normalized.connectTimeoutSeconds }),
  });
}

export type { InternalKnowledgeMetadata } from "./schema.js";
export { knowledgeDocuments } from "./schema.js";
