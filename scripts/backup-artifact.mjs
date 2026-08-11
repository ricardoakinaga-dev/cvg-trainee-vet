import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, readFile } from "node:fs/promises";
import { basename, isAbsolute, relative, resolve } from "node:path";

const digestPattern = /^[a-f0-9]{64}$/iu;
const backupIdPattern = /^cvg-backup-[0-9]{14}-[a-f0-9]{8}$/u;
const restoreVerifier = "scripts/verify-postgres-restore.mjs";

export function assertBackupManifest(value, expectedFile) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("backup manifest must be an object");
  }
  const manifest = value;
  for (const field of [
    "backupId",
    "file",
    "sha256",
    "createdAt",
    "format",
    "rpoTarget",
    "restoreVerifier",
  ]) {
    if (typeof manifest[field] !== "string" || manifest[field].trim() === "") {
      throw new Error(`backup manifest field ${field} is required`);
    }
  }
  if (!backupIdPattern.test(manifest.backupId)) {
    throw new Error("backup manifest backupId is invalid");
  }
  if (
    manifest.file !== basename(manifest.file) ||
    !manifest.file.endsWith(".dump")
  ) {
    throw new Error("backup manifest file must be a dump basename");
  }
  if (expectedFile !== undefined && manifest.file !== expectedFile) {
    throw new Error("backup manifest file does not match the dump");
  }
  if (!digestPattern.test(manifest.sha256)) {
    throw new Error("backup manifest sha256 is invalid");
  }
  if (!Number.isSafeInteger(manifest.bytes) || manifest.bytes < 1) {
    throw new Error("backup manifest bytes must be a positive safe integer");
  }
  if (!Number.isSafeInteger(manifest.durationMs) || manifest.durationMs < 0) {
    throw new Error(
      "backup manifest durationMs must be a non-negative safe integer",
    );
  }
  if (Number.isNaN(Date.parse(manifest.createdAt))) {
    throw new Error("backup manifest createdAt must be an ISO timestamp");
  }
  if (manifest.format !== "custom") {
    throw new Error("backup manifest format must be custom");
  }
  if (manifest.rpoTarget !== "PT1H") {
    throw new Error("backup manifest rpoTarget must be PT1H");
  }
  if (manifest.restoreVerifier !== restoreVerifier) {
    throw new Error("backup manifest restoreVerifier is invalid");
  }
  return Object.freeze({
    backupId: manifest.backupId,
    file: manifest.file,
    sha256: manifest.sha256.toLowerCase(),
    bytes: manifest.bytes,
    createdAt: manifest.createdAt,
    durationMs: manifest.durationMs,
    format: manifest.format,
    rpoTarget: manifest.rpoTarget,
    restoreVerifier: manifest.restoreVerifier,
  });
}

export async function verifyBackupArtifact({
  backupPath,
  manifestPath,
  workspace = process.cwd(),
}) {
  const resolvedBackupPath = resolveExternalArtifactPath(backupPath, workspace);
  const resolvedManifestPath = resolveExternalArtifactPath(
    manifestPath,
    workspace,
  );
  const [backupStats, , manifestText] = await Promise.all([
    assertRegularFile(resolvedBackupPath),
    assertRegularFile(resolvedManifestPath),
    readFile(resolvedManifestPath, "utf8"),
  ]);
  let parsedManifest;
  try {
    parsedManifest = JSON.parse(manifestText);
  } catch {
    throw new Error("backup manifest is not valid JSON");
  }
  const manifest = assertBackupManifest(
    parsedManifest,
    basename(resolvedBackupPath),
  );
  if (backupStats.size !== manifest.bytes) {
    throw new Error("backup manifest byte count mismatch");
  }
  const sha256 = await hashFile(resolvedBackupPath);
  if (sha256 !== manifest.sha256) {
    throw new Error("backup artifact sha256 mismatch");
  }
  return Object.freeze({
    backupPath: resolvedBackupPath,
    manifestPath: resolvedManifestPath,
    manifest,
    bytes: backupStats.size,
    sha256,
  });
}

export function resolveExternalArtifactPath(value, workspace = process.cwd()) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("backup artifact path is required");
  }
  const candidate = resolve(value);
  const workspacePath = resolve(workspace);
  const relativePath = relative(workspacePath, candidate);
  if (
    relativePath === "" ||
    (!isAbsolute(relativePath) &&
      relativePath !== ".." &&
      !relativePath.startsWith(".." + "/"))
  ) {
    throw new Error("backup artifact must be outside the repository");
  }
  return candidate;
}

async function assertRegularFile(path) {
  const stats = await lstat(path);
  if (!stats.isFile()) {
    throw new Error("backup artifact must be a regular file");
  }
  return stats;
}

async function hashFile(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}
