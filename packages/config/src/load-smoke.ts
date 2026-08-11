export type LoadSmokeEnvironment = Readonly<Record<string, string | undefined>>;

export type LoadSmokeConfig = Readonly<{
  readonly target: string;
  readonly requestCount: number;
  readonly concurrency: number;
  readonly timeoutMs: number;
}>;

export function parsePositiveInteger(
  value: string | number,
  name: string,
  maximum: number,
): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw new Error(name + " must be an integer from 1 to " + maximum);
  }
  return parsed;
}

export function loadLoadSmokeConfig(
  environment: LoadSmokeEnvironment,
): LoadSmokeConfig {
  const target =
    environment.CVG_LOAD_TARGET ?? "http://127.0.0.1:3000/health/live";
  try {
    new URL(target);
  } catch {
    throw new Error("CVG_LOAD_TARGET must be an absolute URL");
  }

  return Object.freeze({
    target,
    requestCount: parsePositiveInteger(
      environment.CVG_LOAD_REQUESTS ?? "200",
      "CVG_LOAD_REQUESTS",
      20_000,
    ),
    concurrency: parsePositiveInteger(
      environment.CVG_LOAD_CONCURRENCY ?? "10",
      "CVG_LOAD_CONCURRENCY",
      200,
    ),
    timeoutMs: parsePositiveInteger(
      environment.CVG_LOAD_TIMEOUT_MS ?? "5000",
      "CVG_LOAD_TIMEOUT_MS",
      60_000,
    ),
  });
}
