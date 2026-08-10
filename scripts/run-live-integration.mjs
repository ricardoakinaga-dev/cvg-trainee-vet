import { spawn } from "node:child_process";

const databaseUrl =
  process.env.CVG_TEST_DATABASE_URL ?? process.env.DATABASE_URL;
if (databaseUrl === undefined || databaseUrl.trim().length === 0) {
  console.error(
    "CVG_TEST_DATABASE_URL (or DATABASE_URL) is required for live integration",
  );
  process.exit(2);
}

const qdrantUrl = process.env.CVG_TEST_QDRANT_URL?.trim();
const includeQdrant = process.env.CVG_INCLUDE_LIVE_QDRANT === "true";
const includeRestore = process.env.CVG_INCLUDE_LIVE_RESTORE === "true";
const onlyRestore = process.env.CVG_ONLY_LIVE_RESTORE === "true";
if (onlyRestore && !includeRestore) {
  console.error("CVG_INCLUDE_LIVE_RESTORE is required for restore-only mode");
  process.exit(2);
}
if (includeQdrant && qdrantUrl === undefined) {
  console.error(
    "CVG_TEST_QDRANT_URL is required when live Qdrant tests are enabled",
  );
  process.exit(2);
}
const environment = {
  ...process.env,
  CVG_TEST_DATABASE_URL: databaseUrl,
  CVG_RUN_LIVE_DB_TESTS: "true",
  CVG_RUN_LIVE_RESTORE_TESTS: includeRestore ? "true" : "false",
  CVG_RUN_LIVE_QDRANT_TESTS: includeQdrant ? "true" : "false",
  ...(qdrantUrl === undefined ? {} : { CVG_TEST_QDRANT_URL: qdrantUrl }),
};

const optionalExcludes = [
  ...(includeQdrant
    ? []
    : [
        "tests/integration/api-health.test.ts",
        "tests/integration/qdrant-live.test.ts",
        "tests/integration/worker-qdrant-live.test.ts",
      ]),
  ...(includeRestore ? [] : ["tests/integration/postgres-restore.test.ts"]),
];
const vitestArguments = [
  "exec",
  "vitest",
  "run",
  "--project",
  "integration",
  ...(onlyRestore ? ["tests/integration/postgres-restore.test.ts"] : []),
  ...optionalExcludes.flatMap((file) => ["--exclude", file]),
];

const child = spawn("pnpm", vitestArguments, {
  env: environment,
  stdio: "inherit",
});

child.once("error", (error) => {
  console.error(`live integration could not start: ${error.message}`);
  process.exitCode = 1;
});
child.once("close", (code, signal) => {
  if (signal !== null) {
    console.error(`live integration stopped by ${signal}`);
    process.exitCode = 1;
    return;
  }
  process.exitCode = code ?? 1;
});
