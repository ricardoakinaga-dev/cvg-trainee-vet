import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const runLiveRestoreTest = process.env.CVG_RUN_LIVE_RESTORE_TESTS === "true";
const databaseUrl = process.env.CVG_TEST_DATABASE_URL;
const scriptPath = fileURLToPath(
  new URL("../../scripts/verify-postgres-restore.mjs", import.meta.url),
);

function runRestoreVerification(): Promise<{
  readonly status: string;
  readonly markerVerified: boolean;
  readonly targetIsolated: boolean;
  readonly rtoMs: number;
}> {
  return new Promise((resolve, reject) => {
    if (databaseUrl === undefined) {
      reject(new Error("CVG_TEST_DATABASE_URL is required"));
      return;
    }

    const child = spawn(process.execPath, [scriptPath], {
      env: {
        ...process.env,
        CVG_RESTORE_SOURCE_DATABASE_URL: databaseUrl,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const output: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => output.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `restore verification failed with exit code ${String(code)}`,
          ),
        );
        return;
      }
      try {
        resolve(
          JSON.parse(Buffer.concat(output).toString("utf8")) as {
            readonly status: string;
            readonly markerVerified: boolean;
            readonly targetIsolated: boolean;
            readonly rtoMs: number;
          },
        );
      } catch {
        reject(new Error("restore verification returned invalid JSON"));
      }
    });
  });
}

describe.skipIf(!runLiveRestoreTest || databaseUrl === undefined)(
  "PostgreSQL backup and restore",
  () => {
    it("restores a synthetic marker into an isolated disposable database", async () => {
      const result = await runRestoreVerification();

      expect(result).toMatchObject({
        status: "PASS",
        markerVerified: true,
        targetIsolated: true,
      });
      expect(result.rtoMs).toBeGreaterThanOrEqual(0);
    }, 60_000);
  },
);
