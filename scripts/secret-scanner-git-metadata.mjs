import { opendir } from "node:fs/promises";
import { join } from "node:path";

import {
  openWorkspaceDirectoryHandle,
  openWorkspaceFile,
} from "./secret-scanner-workspace.mjs";

const MAX_GIT_METADATA_ENTRIES = 1024;

function entryKind(entry) {
  if (entry.isSymbolicLink()) return "symlink";
  if (entry.isDirectory()) return "directory";
  if (entry.isFile()) return "file";
  return "other";
}

function entrySignature(entries) {
  return Object.freeze(
    entries
      .map((entry) => `${entry.name}\0${entryKind(entry)}`)
      .sort((left, right) => left.localeCompare(right)),
  );
}

function statSignature(stat) {
  return Object.freeze({
    ctimeNs: String(stat.ctimeNs),
    dev: String(stat.dev),
    ino: String(stat.ino),
    mode: String(stat.mode),
    mtimeNs: String(stat.mtimeNs),
    size: String(stat.size),
  });
}

function hasUnsafeEntries(role, entries) {
  return (
    entries.some((entry) => entry.isSymbolicLink()) ||
    (role === "info" && entries.some((entry) => entry.name === "alternates"))
  );
}

async function readDirectorySnapshot(directory, role) {
  let opened;
  try {
    opened = await openWorkspaceDirectoryHandle(directory);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
  try {
    return await snapshotOpenedDirectory(opened, role);
  } finally {
    await opened.handle.close().catch(() => undefined);
  }
}

async function snapshotOpenedDirectory(opened, role) {
  const { entries, overflow } = await readBoundedEntries(
    `/proc/self/fd/${opened.handle.fd}`,
  );
  const stat = await opened.handle.stat({ bigint: true });
  return Object.freeze({
    entries: entrySignature(entries),
    overflow,
    stat: statSignature(stat),
    unsafe: overflow || hasUnsafeEntries(role, entries),
  });
}

async function readBoundedEntries(directory) {
  const opened = await opendir(directory, { bufferSize: 64 });
  const entries = [];
  let overflow = false;
  try {
    while (true) {
      const entry = await opened.read();
      if (entry === null) break;
      if (entries.length >= MAX_GIT_METADATA_ENTRIES) {
        overflow = true;
        break;
      }
      entries.push(entry);
    }
  } finally {
    await opened.close().catch(() => undefined);
  }
  return Object.freeze({ entries: Object.freeze(entries), overflow });
}

async function captureGitObjectSnapshot(objects) {
  const objectSnapshot = await snapshotOpenedDirectory(objects, "objects");
  const info = await readDirectorySnapshot(join(objects.path, "info"), "info");
  const pack = await readDirectorySnapshot(join(objects.path, "pack"), "pack");
  return Object.freeze({
    info,
    objects: objectSnapshot,
    pack,
    unsafe:
      objectSnapshot.unsafe || info?.unsafe === true || pack?.unsafe === true,
  });
}

function sameSnapshot(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function openGitIndex(gitDirectory) {
  try {
    return Object.freeze({
      status: "ready",
      ...(await openWorkspaceFile(join(gitDirectory.path, "index"))),
    });
  } catch (error) {
    return Object.freeze({
      status: error?.code === "ENOENT" ? "missing" : "unavailable",
    });
  }
}

async function openGitObjects(gitDirectory) {
  let objects;
  try {
    objects = await openWorkspaceDirectoryHandle(
      join(gitDirectory.path, "objects"),
    );
    const snapshot = await captureGitObjectSnapshot(objects);
    if (snapshot === null || snapshot.unsafe) {
      await objects.handle.close().catch(() => undefined);
      return Object.freeze({ status: "unavailable" });
    }
    return Object.freeze({
      status: "ready",
      ...objects,
      snapshot,
    });
  } catch {
    await objects?.handle.close().catch(() => undefined);
    return Object.freeze({ status: "unavailable" });
  }
}

async function isGitObjectsStable(gitObjects) {
  try {
    const current = await captureGitObjectSnapshot(gitObjects);
    return (
      current !== null &&
      !current.unsafe &&
      sameSnapshot(gitObjects.snapshot, current)
    );
  } catch {
    return false;
  }
}

export async function openGitMetadata(root) {
  const gitDirectory = await openWorkspaceDirectoryHandle(
    join(root, ".git"),
  ).catch(() => null);
  if (gitDirectory === null) return null;
  return Object.freeze({
    gitDirectory,
    gitIndex: await openGitIndex(gitDirectory),
    gitObjects: await openGitObjects(gitDirectory),
  });
}

export async function closeGitMetadata(metadata) {
  if (metadata === null || metadata === undefined) return;
  const handles = [metadata.gitDirectory.handle];
  if (metadata.gitIndex.status === "ready")
    handles.push(metadata.gitIndex.handle);
  if (metadata.gitObjects.status === "ready") {
    handles.push(metadata.gitObjects.handle);
  }
  await Promise.all(
    handles.map((handle) => handle.close().catch(() => undefined)),
  );
}

export async function isGitMetadataStable(metadata) {
  if (metadata === null || metadata === undefined) return true;
  if (
    metadata.gitObjects.status !== "ready" ||
    metadata.gitObjects.snapshot === undefined
  ) {
    return false;
  }
  return isGitObjectsStable(metadata.gitObjects);
}

function sanitizeEnvironment() {
  return Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) => !key.toUpperCase().startsWith("GIT_"),
    ),
  );
}

export function createGitOptions(metadata) {
  if (metadata === null || metadata === undefined) return undefined;
  const environment = {
    ...sanitizeEnvironment(),
    GIT_DIR: "/proc/self/fd/3",
    GIT_WORK_TREE: ".",
  };
  if (metadata.gitIndex.status === "ready") {
    environment.GIT_INDEX_FILE = "/proc/self/fd/4";
  }
  if (metadata.gitObjects.status === "ready") {
    environment.GIT_OBJECT_DIRECTORY = "/proc/self/fd/5";
  }
  return Object.freeze({
    env: Object.freeze(environment),
    gitDirectoryHandle: metadata.gitDirectory.handle,
    gitIndexHandle:
      metadata.gitIndex.status === "ready"
        ? metadata.gitIndex.handle
        : undefined,
    gitObjectDirectoryHandle:
      metadata.gitObjects.status === "ready"
        ? metadata.gitObjects.handle
        : undefined,
    gitIndexStatus: metadata.gitIndex.status,
    gitObjectDirectoryStatus: metadata.gitObjects.status,
    validateGitMetadata: () => isGitMetadataStable(metadata),
  });
}
