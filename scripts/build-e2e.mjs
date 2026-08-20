import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function buildE2eEnvironment(inherited = process.env) {
  const runRealE2e = inherited.CVG_RUN_REAL_E2E === "true";
  const runActiveHaE2e = inherited.CVG_RUN_ACTIVE_HA_E2E === "true";
  return {
    ...inherited,
    CVG_API_INTERNAL_URL:
      inherited.CVG_API_INTERNAL_URL ??
      (runActiveHaE2e ? "http://127.0.0.1:3182" : "http://127.0.0.1:3101"),
    CVG_WEB_DIST_DIR:
      inherited.CVG_WEB_DIST_DIR ??
      (runActiveHaE2e
        ? ".next-e2e-active"
        : runRealE2e
          ? ".next-e2e-real"
          : ".next"),
  };
}

function main() {
  const child = spawn("pnpm", ["build"], {
    env: buildE2eEnvironment(),
    stdio: "inherit",
  });

  child.once("error", (error) => {
    console.error(`E2E build could not start: ${error.message}`);
    process.exitCode = 1;
  });
  child.once("close", (code, signal) => {
    if (signal !== null) {
      console.error(`E2E build stopped by ${signal}`);
      process.exitCode = 1;
      return;
    }
    process.exitCode = code ?? 1;
  });
}

const invokedFile =
  process.argv[1] === undefined ? undefined : resolve(process.argv[1]);
if (invokedFile === fileURLToPath(import.meta.url)) {
  main();
}
