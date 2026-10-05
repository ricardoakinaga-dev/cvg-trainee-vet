import type { Logger, Observability } from "./observability.js";

function writeObservation(write: () => void): void {
  try {
    write();
  } catch {
    // Diagnostics are best effort; never retry or alter the business result.
  }
}

function isolatedLogger(source: Logger): Logger {
  const logger: Logger = Object.freeze<Logger>({
    debug: (event, context) =>
      writeObservation(() => source.debug(event, context)),
    info: (event, context) =>
      writeObservation(() => source.info(event, context)),
    warn: (event, context) =>
      writeObservation(() => source.warn(event, context)),
    error: (event, context) =>
      writeObservation(() => source.error(event, context)),
    child: (context) => {
      try {
        return isolatedLogger(source.child(context));
      } catch {
        return logger;
      }
    },
  });
  return logger;
}

export function isolateObservabilityWrites(
  source: Observability,
): Observability {
  return Object.freeze<Observability>({
    logger: isolatedLogger(source.logger),
    metrics: Object.freeze<Observability["metrics"]>({
      increment: (name, labels, amount) =>
        writeObservation(() => source.metrics.increment(name, labels, amount)),
      observe: (name, value, labels) =>
        writeObservation(() => source.metrics.observe(name, value, labels)),
      // Reads retain their original failure semantics; do not fabricate health.
      snapshot: () => source.metrics.snapshot(),
      prometheus: () => source.metrics.prometheus(),
    }),
  });
}
