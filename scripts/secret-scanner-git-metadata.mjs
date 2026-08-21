import { join } from "node:path";

import {
  openWorkspaceDirectory,
  openWorkspaceFile,
} from "./secret-scanner-workspace.mjs";

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

async function hasUnsafeGitObjectChildren(objects) {
  if (objects.entries.some((entry) => entry.isSymbolicLink())) return true;
  for (const childName of ["info", "pack"]) {
    let child;
    try {
      child = await openWorkspaceDirectory(join(objects.path, childName));
    } catch (error) {
      if (error?.code === "ENOENT") continue;
      return true;
    }
    try {
      if (child.entries.some((entry) => entry.isSymbolicLink())) return true;
      if (
        childName === "info" &&
        child.entries.some((entry) => entry.name === "alternates")
      ) {
        return true;
      }
    } finally {
      await child.handle.close().catch(() => undefined);
    }
  }
  return false;
}

async function openGitObjects(gitDirectory) {
  try {
    const objects = await openWorkspaceDirectory(
      join(gitDirectory.path, "objects"),
    );
    if (await hasUnsafeGitObjectChildren(objects)) {
      await objects.handle.close().catch(() => undefined);
      return Object.freeze({ status: "unavailable" });
    }
    return Object.freeze({
      status: "ready",
      ...objects,
    });
  } catch {
    return Object.freeze({ status: "unavailable" });
  }
}

export async function openGitMetadata(root) {
  const gitDirectory = await openWorkspaceDirectory(join(root, ".git")).catch(
    () => null,
  );
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
  });
}
