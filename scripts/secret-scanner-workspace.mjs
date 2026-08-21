import { Buffer } from "node:buffer";
import { constants as fsConstants } from "node:fs";
import { lstat, open } from "node:fs/promises";

const noFollowReadFlags =
  Number.isSafeInteger(fsConstants.O_NOFOLLOW) && fsConstants.O_NOFOLLOW > 0
    ? fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW
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
