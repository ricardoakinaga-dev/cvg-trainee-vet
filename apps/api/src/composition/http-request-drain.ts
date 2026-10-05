export type HttpRequestDrain = Readonly<{
  track: <T>(work: () => Promise<T>) => Promise<T>;
  drain: () => Promise<void>;
}>;

/** Own application work until settlement, regardless of socket lifetime. */
export function createHttpRequestDrain(): HttpRequestDrain {
  const active = new Set<Promise<unknown>>();
  const track = <T>(work: () => Promise<T>): Promise<T> => {
    const operation = Promise.resolve().then(work);
    active.add(operation);
    void operation.then(
      () => active.delete(operation),
      () => active.delete(operation),
    );
    return operation;
  };
  const drain = async (): Promise<void> => {
    if (active.size === 0) return;
    // A pending promise does not keep Node alive after the last client leaves.
    // This reference only owns liveness; it never times out or cancels work.
    const reference = setInterval(() => undefined, 2 ** 31 - 1);
    try {
      while (active.size !== 0) await Promise.allSettled([...active]);
    } finally {
      clearInterval(reference);
    }
  };
  return Object.freeze({ track, drain });
}
