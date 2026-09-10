export type FakeDatabaseOptions = Readonly<{
  readonly rows?: readonly (readonly unknown[])[];
  readonly onExecute?: (query: unknown) => void;
  readonly onInsert?: (table: unknown, values: unknown) => void;
  readonly onUpdate?: (table: unknown, values: unknown) => void;
  readonly onDelete?: (table: unknown, values: unknown) => void;
}>;

export type FakeBuilder = {
  values: (values?: unknown) => FakeBuilder;
  set: (values?: unknown) => FakeBuilder;
  where: (condition?: unknown) => FakeBuilder;
  from: (table?: unknown) => FakeBuilder;
  innerJoin: (table?: unknown, on?: unknown) => FakeBuilder;
  leftJoin: (table?: unknown, on?: unknown) => FakeBuilder;
  orderBy: (...columns: unknown[]) => FakeBuilder;
  groupBy: (...columns: unknown[]) => FakeBuilder;
  onConflictDoNothing: () => FakeBuilder;
  onConflictDoUpdate: (...args: unknown[]) => FakeBuilder;
  returning: (columns?: unknown) => Promise<readonly unknown[]>;
  limit: (count?: unknown) => Promise<readonly unknown[]>;
  execute: (query?: unknown) => Promise<readonly unknown[]>;
  then: <TResult1 = readonly unknown[], TResult2 = never>(
    onfulfilled?: ((value: readonly unknown[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) => Promise<TResult1 | TResult2>;
};

export type FakeExecutor = FakeBuilder & {
  transaction: (
    action: (tx: FakeExecutor) => Promise<unknown>,
  ) => Promise<unknown>;
  insert: (table?: unknown) => FakeBuilder;
  update: (table?: unknown) => FakeBuilder;
  delete: (table?: unknown) => FakeBuilder;
  select: (columns?: unknown) => FakeBuilder;
};

export function createFakeDatabase(options: FakeDatabaseOptions = {}) {
  const queue = [...(options.rows ?? [])];
  const next = (): readonly unknown[] => queue.shift() ?? [];

  const createBuilder = (
    table?: unknown,
    operation?: "insert" | "update" | "delete" | "select",
  ): FakeBuilder => {
    const builder: FakeBuilder = {
      values: (values?: unknown) => {
        options.onInsert?.(table, values);
        return builder;
      },
      set: (values?: unknown) => {
        options.onUpdate?.(table, values);
        return builder;
      },
      where: () => builder,
      from: () => builder,
      innerJoin: () => builder,
      leftJoin: () => builder,
      orderBy: () => builder,
      groupBy: () => builder,
      onConflictDoNothing: () => builder,
      onConflictDoUpdate: () => builder,
      returning: async () => next(),
      limit: async () => next(),
      execute: async (query?: unknown) => {
        options.onExecute?.(query);
        return next();
      },
      then: (onfulfilled) => Promise.resolve(next()).then(onfulfilled),
    };
    if (operation === "delete") {
      const deleteBuilder = {
        ...builder,
        where: (condition?: unknown) => {
          options.onDelete?.(table, condition);
          return deleteBuilder;
        },
        returning: async () => next(),
      };
      return deleteBuilder;
    }
    return builder;
  };

  const transaction: FakeExecutor["transaction"] = async (action) => {
    return action(createExecutor());
  };

  const createExecutor = (): FakeExecutor => ({
    ...createBuilder(),
    transaction,
    insert: (table) => createBuilder(table, "insert"),
    update: (table) => createBuilder(table, "update"),
    delete: (table) => createBuilder(table, "delete"),
    select: (columns) => createBuilder(columns, "select"),
  });

  return createExecutor();
}
