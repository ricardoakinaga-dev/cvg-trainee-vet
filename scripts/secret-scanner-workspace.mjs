import { lstat } from "node:fs/promises";

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
