import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  assertBackupManifest,
  verifyBackupArtifact,
} from "../../scripts/backup-artifact.mjs";
import { buildDockerExecCommand } from "../../scripts/postgres-command.mjs";

const baseManifest = {
  backupId: "cvg-backup-20260811120000-abcdef12",
  file: "cvg-backup-20260811120000-abcdef12.dump",
  sha256: "0".repeat(64),
  bytes: 4,
  createdAt: "2026-08-11T12:00:00.000Z",
  durationMs: 42,
  format: "custom",
  rpoTarget: "PT1H",
  restoreVerifier: "scripts/verify-postgres-restore.mjs",
};

describe("backup artifact contract", () => {
  it("forwards the inherited database password into Docker PostgreSQL commands", () => {
    expect(
      buildDockerExecCommand({
        container: "cvg-postgres",
        program: "pg_restore",
        args: ["-U", "cvg_admin"],
        interactive: true,
      }),
    ).toEqual({
      program: "docker",
      args: [
        "exec",
        "-i",
        "-e",
        "PGPASSWORD",
        "cvg-postgres",
        "pg_restore",
        "-U",
        "cvg_admin",
      ],
    });
  });

  it("rejects an unsafe Docker container identifier", () => {
    expect(() =>
      buildDockerExecCommand({
        container: "postgres;drop",
        program: "psql",
        args: [],
      }),
    ).toThrow("container identifier");
  });

  it("accepts a complete custom-format manifest", () => {
    expect(assertBackupManifest(baseManifest)).toMatchObject(baseManifest);
  });

  it("rejects a manifest whose file or checksum is not bound to the artifact", () => {
    expect(() =>
      assertBackupManifest(
        {
          ...baseManifest,
          file: "other.dump",
        },
        baseManifest.file,
      ),
    ).toThrow("file");
    expect(() =>
      assertBackupManifest({
        ...baseManifest,
        sha256: "not-a-sha256",
      }),
    ).toThrow("sha256");
  });

  it("verifies byte count and sha256 before a restore consumes the dump", async () => {
    const directory = await mkdtemp(join(tmpdir(), "cvg-backup-artifact-"));
    try {
      const backupPath = join(directory, baseManifest.file);
      const manifestPath = join(directory, "manifest.json");
      const bytes = Buffer.from("dump");
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      await writeFile(backupPath, bytes, { mode: 0o600 });
      await writeFile(
        manifestPath,
        `${JSON.stringify({ ...baseManifest, sha256 })}\n`,
        { mode: 0o600 },
      );

      await expect(
        verifyBackupArtifact({ backupPath, manifestPath }),
      ).resolves.toMatchObject({
        sha256,
        bytes: bytes.byteLength,
        manifest: { file: baseManifest.file },
      });

      await writeFile(backupPath, Buffer.from("bad!"), { mode: 0o600 });
      await expect(
        verifyBackupArtifact({ backupPath, manifestPath }),
      ).rejects.toThrow("sha256 mismatch");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("does not consume backup inputs located inside the repository", async () => {
    await expect(
      verifyBackupArtifact({
        backupPath: join(process.cwd(), "backup.dump"),
        manifestPath: join(process.cwd(), "backup.json"),
      }),
    ).rejects.toThrow("outside the repository");
  });
});
