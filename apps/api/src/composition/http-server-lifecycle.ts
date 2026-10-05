import type { Server } from "node:http";

const TELEMETRY_CLOSE_BUDGET_MS = 2_000;

async function closeTelemetry(flush: () => Promise<void>): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      Promise.resolve()
        .then(flush)
        .catch(() => undefined),
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, TELEMETRY_CLOSE_BUDGET_MS);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/** Stop network admission, drain admitted requests, then flush their spans. */
export function createHttpServerLifecycle(
  server: Server,
  host: string,
  port: number,
  flush: () => Promise<void>,
  drainRequests: () => Promise<void> = async () => undefined,
) {
  let starting: Promise<void> | undefined;
  let closing: Promise<void> | undefined;
  const listen = (): Promise<void> => {
    if (closing) return Promise.reject(new Error("API listener is closing"));
    return (starting ??= new Promise<void>((resolve, reject) => {
      const onError = (error: Error) => {
        server.off("listening", onListening);
        reject(error);
      };
      const onListening = () => {
        server.off("error", onError);
        resolve();
      };
      server.once("error", onError);
      server.once("listening", onListening);
      try {
        server.listen(port, host);
      } catch (error) {
        server.off("error", onError);
        server.off("listening", onListening);
        reject(error);
      }
    }));
  };
  const close = (): Promise<void> =>
    (closing ??= (async () => {
      if (starting) await starting.catch(() => undefined);
      if (server.listening) {
        await new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
          server.closeIdleConnections();
        });
      }
      await drainRequests();
      await closeTelemetry(flush);
    })());
  return Object.freeze({
    listen,
    close,
    isClosing: () => closing !== undefined,
  });
}
