import { Buffer } from "node:buffer";
import { constants as fsConstants } from "node:fs";
import { lstat, open, readdir } from "node:fs/promises";

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
  const handle = await open(directory, noFollowDirectoryFlags);
  try {
    const entries = await readdir(`/proc/self/fd/${handle.fd}`, {
      withFileTypes: true,
    });
    return { entries, handle, path: `/proc/self/fd/${handle.fd}` };
  } catch (error) {
    await handle.close();
    throw error;
  }
}

export async function readWorkspaceEntries(directory) {
  const { entries, handle } = await openWorkspaceDirectory(directory);
  try {
    return entries;
  } finally {
    await handle.close();
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
