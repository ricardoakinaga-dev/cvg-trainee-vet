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
  /**
   * Runs work while holding a PostgreSQL session-level advisory lock.
   *
   * Blocking semantics: pg_advisory_lock waits indefinitely until the lock is
   * acquired, so concurrent callers queue instead of overlapping. This is
   * intended for rare serial operations (for example the Qdrant
   * reconciliation); it must not wrap request-latency paths. The lock key is
   * hashed server-side and passed as a bound parameter, never interpolated.
   * The lock is always released and the connection always returned to the
   * pool; when both work and the release fail, the work error is preserved
   * as the rejection reason with the release error attached as its cause.
   */
  withAdvisoryLock: <Result>(
    key: string,
    work: () => Promise<Result>,
  ) => Promise<Result>;
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
        readonly canCreateRoles: boolean;
        readonly canCreateDatabases: boolean;
        readonly canReplicate: boolean;
        readonly canCreateInDatabase: boolean;
        readonly canUseTemporaryTables: boolean;
        readonly canUsePublicSchema: boolean;
        readonly canCreateInPublicSchema: boolean;
        readonly ownedRelationCount: number;
      }>(sql`
        select
          rolsuper as "isSuperuser",
          rolbypassrls as "bypassesRls",
          rolcreaterole as "canCreateRoles",
          rolcreatedb as "canCreateDatabases",
          rolreplication as "canReplicate",
          has_database_privilege(current_user, current_database(), 'CREATE') as "canCreateInDatabase",
          has_database_privilege(current_user, current_database(), 'TEMPORARY') as "canUseTemporaryTables",
          has_schema_privilege(current_user, 'public', 'USAGE') as "canUsePublicSchema",
          has_schema_privilege(current_user, 'public', 'CREATE') as "canCreateInPublicSchema",
          (
            select count(*)::int
            from pg_class relation
            join pg_namespace namespace on namespace.oid = relation.relnamespace
            where namespace.nspname = 'public'
              and relation.relowner = pg_roles.oid
              and relation.relkind in ('r', 'p', 'v', 'm', 'S', 'f')
          ) as "ownedRelationCount"
        from pg_roles
        where rolname = current_user
      `);
      const role = rows[0];
      if (
        role === undefined ||
        role.isSuperuser ||
        role.bypassesRls ||
        role.canCreateRoles ||
        role.canCreateDatabases ||
        role.canReplicate ||
        role.canCreateInDatabase ||
        role.canUseTemporaryTables ||
        !role.canUsePublicSchema ||
        role.canCreateInPublicSchema ||
        role.ownedRelationCount > 0
      ) {
        throw new Error(
          "database connection must use a non-superuser role without BYPASSRLS, replication, table ownership, database/schema creation, temporary-table, or role/database creation privileges",
        );
      }
    }
  };

  const withAdvisoryLock = async <Result>(
    key: string,
    work: () => Promise<Result>,
  ): Promise<Result> => {
    if (key.trim().length === 0) {
      throw new TypeError("advisory lock key must not be empty");
    }

    const connection = await client.reserve();
    let acquired = false;
    let outcome:
      | { readonly ok: true; readonly value: unknown }
      | { readonly ok: false; readonly error: unknown }
      | undefined;
    let releaseError: unknown;
    try {
      await connection`select pg_advisory_lock(hashtextextended(${key}, 0))`;
      acquired = true;
      try {
        outcome = { ok: true, value: await work() };
      } catch (error) {
        outcome = { ok: false, error };
      }
    } finally {
      if (acquired) {
        try {
          await connection`select pg_advisory_unlock(hashtextextended(${key}, 0))`;
        } catch (error) {
          releaseError = error;
        }
      }
      try {
        connection.release();
      } catch (error) {
        releaseError ??= error;
      }
    }
    // When lock acquisition itself throws, that error is already propagating
    // through the finally above and this point is unreachable.
    if (outcome === undefined) {
      if (releaseError !== undefined) throw releaseError;
      throw new Error("advisory lock reached an unreachable state");
    }
    if (!outcome.ok) {
      if (
        releaseError !== undefined &&
        outcome.error instanceof Error &&
        outcome.error.cause === undefined
      ) {
        outcome.error.cause = releaseError;
      }
      throw outcome.error;
    }
    if (releaseError !== undefined) {
      throw releaseError;
    }
    return outcome.value as Result;
  };

  return Object.freeze({
    db,
    healthcheck,
    withAdvisoryLock,
    close: async () =>
      client.end({ timeout: normalized.connectTimeoutSeconds }),
  });
}

export type { InternalKnowledgeMetadata } from "./schema.js";
export { knowledgeDocuments } from "./schema.js";
