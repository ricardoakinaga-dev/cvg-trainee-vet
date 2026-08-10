import { spawn } from "node:child_process";

const environment = {
  ...process.env,
  ...(process.env.CVG_RUN_REAL_E2E === "true"
    ? {
        CVG_API_INTERNAL_URL:
          process.env.CVG_API_INTERNAL_URL ?? "http://127.0.0.1:3101",
      }
    : {}),
};

const child = spawn("pnpm", ["build"], {
  env: environment,
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
