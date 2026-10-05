export function createStagingOwnedLifecycle() {
  const active = new Set();
  const cleanup = [];
  let stopping = false;
  let closing;
  const assertActive = () => {
    if (stopping) throw new Error("owned staging lifecycle is closing");
  };
  const register = (stop) => {
    let stopped;
    cleanup.push(() => (stopped ??= Promise.resolve().then(stop)));
  };
  /** @template T @param {() => T | Promise<T>} work @returns {Promise<T>} */
  const run = (work) => {
    if (stopping)
      return Promise.reject(new Error("owned staging lifecycle is closing"));
    const task = Promise.resolve().then(work);
    active.add(task);
    void task.then(
      () => active.delete(task),
      () => active.delete(task),
    );
    return task;
  };
  /** @template T @param {() => T | Promise<T>} factory @param {(resource: T) => void | Promise<void>} stop @returns {Promise<T>} */
  const acquire = (factory, stop) =>
    run(async () => {
      const resource = await factory();
      register(() => stop(resource));
      return resource;
    });
  const own = (stop) => {
    assertActive();
    register(stop);
  };
  const close = () => {
    stopping = true;
    return (closing ??= (async () => {
      await Promise.allSettled([...active]);
      const failures = [];
      while (cleanup.length > 0) {
        try {
          await cleanup.pop()();
        } catch (error) {
          failures.push(error);
        }
      }
      if (failures.length > 0)
        throw new AggregateError(failures, "owned staging teardown failed");
    })());
  };
  return Object.freeze({ run, acquire, own, assertActive, close });
}
