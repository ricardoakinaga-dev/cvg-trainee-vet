import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";

import type * as schema from "./schema.js";

export type DatabaseExecutor = PostgresJsDatabase<typeof schema>;
export type DatabaseTransaction = Parameters<
  Parameters<DatabaseExecutor["transaction"]>[0]
>[0];
