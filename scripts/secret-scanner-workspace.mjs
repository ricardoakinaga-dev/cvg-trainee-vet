import { Buffer } from "node:buffer";
import { constants as fsConstants } from "node:fs";
import { lstat, open, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const noFollowReadFlags =
  Number.isSafeInteger(fsConstants.O_NOFOLLOW) && fsConstants.O_NOFOLLOW > 0
    ? fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW
    : undefined;
const noFollowDirectoryFlags =
  noFollowReadFlags !== undefined &&
  Number.isSafeInteger(fsConstants.O_DIRECTORY) &&
  fsConstants.O_DIRECTORY > 0
    ? noFollowReadFlags | fsConstants.O_DIRECTORY
    : undefined;
const procFdChildPathPattern = /^\/proc\/self\/fd\/\d+(?:\/|$)/u;

async function closeHandles(handles) {
  await Promise.all(
    handles.map(async (handle) => {
      await handle.close().catch(() => undefined);
    }),
  );
}

async function openProcFdDirectory(directory) {
  const handle = await open(directory, noFollowDirectoryFlags);
  try {
    const entries = await readdir(`/proc/self/fd/${handle.fd}`, {
      withFileTypes: true,
    });
    return { entries, handle, path: `/proc/self/fd/${handle.fd}` };
  } catch (error) {
    await closeHandles([handle]);
    throw error;
  }
}

async function openPathDirectory(directory) {
  const handles = [await open("/", noFollowDirectoryFlags)];
  try {
    let current = handles[0];
    for (const component of resolve(directory).split("/").filter(Boolean)) {
      current = await open(
        `/proc/self/fd/${current.fd}/${component}`,
        noFollowDirectoryFlags,
      );
      handles.push(current);
    }
    const path = `/proc/self/fd/${current.fd}`;
    const entries = await readdir(path, { withFileTypes: true });
    await closeHandles(handles.slice(0, -1));
    return { entries, handle: current, path };
  } catch (error) {
    await closeHandles(handles);
    throw error;
  }
}

export async function readScanBuffer(file, maxBytes) {
  if (noFollowReadFlags === undefined) {
    throw new Error("workspace no-follow open is unavailable");
  }
  const handle = await open(file, noFollowReadFlags);
  try {
    const buffer = Buffer.allocUnsafe(maxBytes + 1);
    let offset = 0;
    while (offset < buffer.length) {
      const { bytesRead } = await handle.read(
        buffer,
        offset,
        buffer.length - offset,
        null,
      );
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    return buffer.subarray(0, offset);
  } finally {
    await handle.close();
  }
}

export async function openWorkspaceDirectory(directory) {
  if (noFollowDirectoryFlags === undefined) {
    throw new Error("workspace no-follow directory open is unavailable");
  }
  return procFdChildPathPattern.test(directory)
    ? openProcFdDirectory(directory)
    : openPathDirectory(directory);
}

export async function readWorkspaceEntries(directory) {
  const { entries, handle } = await openWorkspaceDirectory(directory);
  try {
    return entries;
  } finally {
    await handle.close();
  }
}

export async function withWorkspaceRoot(directory, callback) {
  let access;
  try {
    access = await openWorkspaceDirectory(directory);
  } catch {
    return null;
  }
  try {
    return await callback(access.path, access);
  } finally {
    await access.handle.close();
  }
}

export async function validateWorkspaceRoot(root, unscannedFinding) {
  const metadata = await lstat(root).catch(() => null);
  if (metadata?.isDirectory()) return null;
  return Object.freeze([
    unscannedFinding(
      "<workspace>",
      "unreadable-file",
      metadata?.isSymbolicLink() ? "symlink" : "workspace root",
    ),
  ]);
}
