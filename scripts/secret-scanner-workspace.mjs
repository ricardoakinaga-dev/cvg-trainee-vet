import { Buffer } from "node:buffer";
import { constants as fsConstants } from "node:fs";
import { lstat, open, opendir } from "node:fs/promises";
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
const MAX_WORKSPACE_ENTRIES = 1024;

async function closeHandles(handles) {
  await Promise.all(
    handles.map(async (handle) => {
      await handle.close().catch(() => undefined);
    }),
  );
}

async function openProcFdDirectoryHandle(directory) {
  const handle = await open(directory, noFollowDirectoryFlags);
  return { handle, path: `/proc/self/fd/${handle.fd}` };
}

async function openPathDirectoryHandle(directory) {
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
    await closeHandles(handles.slice(0, -1));
    return { handle: current, path: `/proc/self/fd/${current.fd}` };
  } catch (error) {
    await closeHandles(handles);
    throw error;
  }
}

async function readBoundedDirectoryEntries(directory) {
  const opened = await opendir(directory, { bufferSize: 64 });
  const entries = [];
  try {
    while (true) {
      const entry = await opened.read();
      if (entry === null) break;
      if (entries.length >= MAX_WORKSPACE_ENTRIES) {
        throw new Error("workspace directory entry budget exceeded");
      }
      entries.push(entry);
    }
  } finally {
    await opened.close().catch(() => undefined);
  }
  return Object.freeze(entries);
}

async function openProcFdDirectory(directory) {
  const opened = await openProcFdDirectoryHandle(directory);
  try {
    const entries = await readBoundedDirectoryEntries(opened.path);
    return { ...opened, entries };
  } catch (error) {
    await closeHandles([opened.handle]);
    throw error;
  }
}

async function openPathDirectory(directory) {
  const opened = await openPathDirectoryHandle(directory);
  try {
    const entries = await readBoundedDirectoryEntries(opened.path);
    return { ...opened, entries };
  } catch (error) {
    await closeHandles([opened.handle]);
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

export async function openWorkspaceFile(file) {
  if (noFollowReadFlags === undefined) {
    throw new Error("workspace no-follow open is unavailable");
  }
  const handle = await open(file, noFollowReadFlags);
  return { handle, path: `/proc/self/fd/${handle.fd}` };
}

export async function openWorkspaceDirectory(directory) {
  if (noFollowDirectoryFlags === undefined) {
    throw new Error("workspace no-follow directory open is unavailable");
  }
  return procFdChildPathPattern.test(directory)
    ? openProcFdDirectory(directory)
    : openPathDirectory(directory);
}

export async function openWorkspaceDirectoryHandle(directory) {
  if (noFollowDirectoryFlags === undefined) {
    throw new Error("workspace no-follow directory open is unavailable");
  }
  return procFdChildPathPattern.test(directory)
    ? openProcFdDirectoryHandle(directory)
    : openPathDirectoryHandle(directory);
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
  const expectedMetadata = await lstat(directory).catch(() => null);
  if (!expectedMetadata?.isDirectory()) return null;
  let access;
  try {
    access = await openWorkspaceDirectory(directory);
  } catch {
    return null;
  }
  try {
    const openedMetadata = await access.handle.stat();
    if (
      !openedMetadata.isDirectory() ||
      openedMetadata.dev !== expectedMetadata.dev ||
      openedMetadata.ino !== expectedMetadata.ino
    ) {
      return null;
    }
    return await callback(access.path, access);
  } finally {
    await access.handle.close();
  }
}
