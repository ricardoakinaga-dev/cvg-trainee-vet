import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";

const runLiveRestoreTest = process.env.CVG_RUN_LIVE_RESTORE_TESTS === "true";
const databaseUrl = process.env.CVG_TEST_ADMIN_DATABASE_URL;
const scriptPath = fileURLToPath(
  new URL("../../scripts/verify-postgres-restore.mjs", import.meta.url),
);
const backupScriptPath = fileURLToPath(
  new URL("../../scripts/create-postgres-backup.mjs", import.meta.url),
);

function runRestoreVerification(
  additionalEnvironment: Record<string, string> = {},
): Promise<{
  readonly status: string;
  readonly markerVerified: boolean;
  readonly artifactVerified: boolean;
  readonly invariantsVerified: boolean;
  readonly verificationMode: string;
  readonly restoredObjects?: number;
  readonly targetIsolated: boolean;
  readonly rtoMs: number;
}> {
  return new Promise((resolve, reject) => {
    if (databaseUrl === undefined) {
      reject(new Error("CVG_TEST_ADMIN_DATABASE_URL is required"));
      return;
    }

    const child = spawn(process.execPath, [scriptPath], {
      env: {
        ...process.env,
        CVG_RESTORE_SOURCE_DATABASE_URL: databaseUrl,
        ...additionalEnvironment,
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
            readonly artifactVerified: boolean;
            readonly invariantsVerified: boolean;
            readonly verificationMode: string;
            readonly restoredObjects?: number;
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

function createBackupArtifact(directory: string): Promise<{
  readonly file: string;
  readonly manifest: string;
}> {
  return new Promise((resolve, reject) => {
    if (databaseUrl === undefined) {
      reject(new Error("CVG_TEST_ADMIN_DATABASE_URL is required"));
      return;
    }
    const child = spawn(process.execPath, [backupScriptPath], {
      env: {
        ...process.env,
        CVG_BACKUP_SOURCE_DATABASE_URL: databaseUrl,
        CVG_BACKUP_DIRECTORY: directory,
        ...(process.env.CVG_BACKUP_DOCKER_CONTAINER === undefined
          ? {}
          : {
              CVG_BACKUP_DOCKER_CONTAINER:
                process.env.CVG_BACKUP_DOCKER_CONTAINER,
            }),
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const output: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => output.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(`backup creation failed with exit code ${String(code)}`),
        );
        return;
      }
      try {
        const result = JSON.parse(Buffer.concat(output).toString("utf8")) as {
          readonly file: string;
          readonly manifest: string;
        };
        resolve({
          file: join(directory, result.file),
          manifest: join(directory, result.manifest),
        });
      } catch {
        reject(new Error("backup creation returned invalid JSON"));
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
        artifactVerified: false,
        invariantsVerified: true,
        verificationMode: "synthetic-marker",
        targetIsolated: true,
      });
      expect(result.rtoMs).toBeGreaterThanOrEqual(0);
    }, 60_000);

    it("restores and verifies an existing checksummed backup artifact", async () => {
      const directory = await mkdtemp(join(tmpdir(), "cvg-backup-live-"));
      try {
        const artifact = await createBackupArtifact(directory);
        const result = await runRestoreVerification({
          CVG_RESTORE_BACKUP_FILE: artifact.file,
          CVG_RESTORE_BACKUP_MANIFEST: artifact.manifest,
        });

        expect(result).toMatchObject({
          status: "PASS",
          markerVerified: false,
          artifactVerified: true,
          invariantsVerified: true,
          verificationMode: "stored-artifact",
          targetIsolated: true,
        });
        expect(result.restoredObjects).toBeGreaterThan(0);
        expect(result.rtoMs).toBeGreaterThanOrEqual(0);
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    }, 120_000);
  },
);
