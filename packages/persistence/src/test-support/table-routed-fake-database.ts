import { getTableName, type SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

export type RoutedFakeOperation = Readonly<{
  readonly kind: "select" | "insert" | "update" | "execute";
  readonly table?: string;
  readonly values?: unknown;
  readonly sql?: string;
  readonly params?: readonly unknown[];
}>;

type Row = Readonly<Record<string, unknown>>;
type Batch = Readonly<Row[]> | (() => readonly Row[]);
type TableQueue = Readonly<Record<string, ReadonlyArray<Batch>>>;

export type TableRoutedFakeDatabaseOptions = Readonly<{
  readonly selects?: TableQueue;
  readonly returning?: TableQueue;
  readonly onInsert?: (table: string, values: unknown) => void;
  readonly onUpdate?: (table: string, values: unknown) => void;
  readonly onExecute?: (sql: string, params: readonly unknown[]) => void;
}>;

type QueueStore = Map<string, ReadonlyArray<Batch>>;

function store(queue: TableQueue | undefined): QueueStore {
  return new Map(Object.entries(queue ?? {}));
}

function shift(target: QueueStore, table: string): readonly Row[] {
  const rows = target.get(table);
  if (rows === undefined || rows.length === 0) return [];
  const [batch] = rows;
  target.set(table, rows.slice(1));
  if (batch === undefined) return [];
  return typeof batch === "function" ? batch() : batch;
}

type Builder = Readonly<{
  values: (values?: unknown) => Builder;
  onConflictDoNothing: () => Builder;
  set: (values?: unknown) => Builder;
  where: () => Builder;
  returning: () => Promise<readonly Row[]>;
  from: (table: unknown) => Builder;
  innerJoin: () => Builder;
  leftJoin: () => Builder;
  orderBy: () => Builder;
  limit: () => Promise<readonly Row[]>;
  for: () => Builder;
  offset: () => Builder;
  then: (
    onfulfilled?: ((value: readonly Row[]) => unknown) | null,
    onrejected?: ((reason: unknown) => unknown) | null,
  ) => Promise<readonly Row[]>;
}>;

function resolveEmptyThen(
  onfulfilled?: ((value: readonly Row[]) => unknown) | null,
  onrejected?: ((reason: unknown) => unknown) | null,
): Promise<readonly Row[]> {
  return Promise.resolve([] as readonly Row[]).then(
    (value) => (onfulfilled ? onfulfilled(value) : value) as readonly Row[],
    (reason) => {
      if (onrejected !== undefined && onrejected !== null)
        return onrejected(reason) as readonly Row[];
      throw reason;
    },
  );
}

export type TableRoutedFakeDatabase = Readonly<{
  readonly executor: unknown;
  readonly operations: readonly RoutedFakeOperation[];
  readonly pending: readonly RoutedFakeOperation[];
  readonly committed: readonly RoutedFakeOperation[];
  readonly configurations: readonly string[];
  readonly inserts: (table: string) => readonly RoutedFakeOperation[];
  readonly updates: (table: string) => readonly RoutedFakeOperation[];
  readonly selects: (table: string) => readonly RoutedFakeOperation[];
  readonly unregisteredSelects: readonly string[];
}>;

/**
 * Table-routed fake executor. SELECT and RETURNING clauses pop the next row
 * batch registered for their table, so multi-query production flows can be
 * driven without depending on one global call order.
 */
export function createTableRoutedFakeDatabase(
  options: TableRoutedFakeDatabaseOptions = {},
): TableRoutedFakeDatabase {
  const selects = store(options.selects);
  const returning = store(options.returning);
  const dialect = new PgDialect();
  const operations: RoutedFakeOperation[] = [];
  const pending: RoutedFakeOperation[] = [];
  const committed: RoutedFakeOperation[] = [];
  const configurations: string[] = [];
  const unregisteredSelects: string[] = [];
  let currentTable = "";

  const record = (operation: RoutedFakeOperation): void => {
    operations.push(operation);
    pending.push(operation);
  };

  const popSelect = (): readonly Row[] => {
    if (currentTable.length === 0) return [];
    if (selects.has(currentTable)) return shift(selects, currentTable);
    unregisteredSelects.push(currentTable);
    return [];
  };

  const createBuilder = (kind: "select" | "insert" | "update"): Builder => {
    const builder: Builder = {
      values: (next) => {
        if (kind === "insert") {
          options.onInsert?.(currentTable, next);
          record({
            kind: "insert",
            table: currentTable,
            values: next,
            sql: "",
            params: [],
          });
        }
        return builder;
      },
      onConflictDoNothing: () => builder,
      set: (next) => {
        if (kind === "update") {
          options.onUpdate?.(currentTable, next);
          record({
            kind: "update",
            table: currentTable,
            values: next,
            sql: "",
            params: [],
          });
        }
        return builder;
      },
      where: () => builder,
      returning: async () => {
        if (kind === "select") return popSelect();
        if (returning.has(currentTable)) return shift(returning, currentTable);
        return [];
      },
      from: (table) => {
        currentTable = getTableName(
          table as Parameters<typeof getTableName>[0],
        );
        return builder;
      },
      innerJoin: () => builder,
      leftJoin: () => builder,
      orderBy: () => builder,
      limit: async () => {
        record({
          kind: "select",
          table: currentTable,
          sql: "",
          params: [],
        });
        return popSelect();
      },
      for: () => builder,
      offset: () => builder,
      then: resolveEmptyThen,
    };
    return builder;
  };

  const execute = async (query: SQL): Promise<readonly Row[]> => {
    const compiled = dialect.sqlToQuery(query);
    configurations.push(compiled.sql);
    record({
      kind: "execute",
      sql: compiled.sql,
      params: compiled.params,
      table: "",
    });
    options.onExecute?.(compiled.sql, compiled.params);
    return [];
  };

  let depth = 0;
  const executor = {
    execute,
    insert: (table: unknown) => {
      currentTable = getTableName(table as Parameters<typeof getTableName>[0]);
      return createBuilder("insert");
    },
    update: (table: unknown) => {
      currentTable = getTableName(table as Parameters<typeof getTableName>[0]);
      return createBuilder("update");
    },
    select: () => createBuilder("select"),
    transaction: async (action: (tx: unknown) => Promise<unknown>) => {
      depth += 1;
      const mark = pending.length;
      try {
        const result = await action(executor);
        // Only the outermost transaction publishes: nested savepoints stay
        // pending until the whole transaction commits, like PostgreSQL.
        if (depth === 1) committed.push(...pending.splice(0));
        return result;
      } catch (error) {
        pending.length = mark;
        throw error;
      } finally {
        depth -= 1;
      }
    },
  };

  return {
    executor,
    operations,
    get pending() {
      return pending;
    },
    get committed() {
      return committed;
    },
    configurations,
    inserts: (table) =>
      committed.filter((op) => op.kind === "insert" && op.table === table),
    updates: (table) =>
      committed.filter((op) => op.kind === "update" && op.table === table),
    selects: (table) =>
      committed.filter((op) => op.kind === "select" && op.table === table),
    unregisteredSelects,
  };
}
