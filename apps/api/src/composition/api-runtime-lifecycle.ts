export type ApiRuntimeLifecyclePorts = Readonly<{
  listen: () => Promise<void>;
  beginInitialization: () => void;
  cancelInitialization: () => void;
  awaitInitialization: () => Promise<void>;
  closeServer: () => Promise<void>;
  closeIntegrations: () => Promise<void>;
}>;

export function apiRuntimeFailureDiagnostic(error: unknown) {
  let code = "UNCLASSIFIED_RUNTIME_FAILURE";
  try {
    const candidate =
      error !== null && typeof error === "object" && "code" in error
        ? error.code
        : undefined;
    if (
      typeof candidate === "string" &&
      ["EADDRINUSE", "EADDRNOTAVAIL", "EACCES"].includes(candidate)
    )
      code = candidate;
  } catch {
    // Diagnostic output must not invoke or serialize arbitrary error content.
  }
  return { component: "api", event: "api.runtime.failed", error_code: code };
}

export function createApiRuntimeLifecycle(ports: ApiRuntimeLifecyclePorts) {
  let closing: Promise<void> | undefined;
  let starting: Promise<void> | undefined;
  const listen = (): Promise<void> => {
    if (closing) return Promise.reject(new Error("API runtime is closing"));
    return (starting ??= (async () => {
      await ports.listen();
      if (closing) throw new Error("API runtime is closing");
      ports.beginInitialization();
    })());
  };
  const close = (): Promise<void> => {
    if (closing) return closing;
    ports.cancelInitialization();
    const reference = setInterval(() => undefined, 2 ** 31 - 1);
    return (closing = (async () => {
      try {
        if (starting) await starting.catch(() => undefined);
        await ports.closeServer();
        await ports.awaitInitialization();
        await ports.closeIntegrations();
      } finally {
        clearInterval(reference);
      }
    })());
  };
  return Object.freeze({ listen, close });
}

type SignalSource = Readonly<{
  on: (signal: "SIGTERM" | "SIGINT", listener: () => void) => unknown;
  off: (signal: "SIGTERM" | "SIGINT", listener: () => void) => unknown;
}>;

export async function startApiRuntime(
  runtime: Readonly<{
    listen: () => Promise<void>;
    close: () => Promise<void>;
  }>,
  signals: SignalSource,
  onFailure: (error: unknown) => void,
): Promise<void> {
  let shutdown: Promise<void> | undefined;
  const removeListeners = () => {
    signals.off("SIGTERM", onSignal);
    signals.off("SIGINT", onSignal);
  };
  const close = () => (shutdown ??= runtime.close().finally(removeListeners));
  const onSignal = () => {
    void close().catch(onFailure);
  };
  signals.on("SIGTERM", onSignal);
  signals.on("SIGINT", onSignal);
  try {
    await runtime.listen();
  } catch (error) {
    onFailure(error);
    await close().catch(onFailure);
  }
}
