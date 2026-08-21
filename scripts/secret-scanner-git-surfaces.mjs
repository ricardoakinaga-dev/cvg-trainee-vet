import {
  readGitBlobs as readGitBlobsInternal,
  runGitCommand,
} from "./secret-scanner-git-batch.mjs";

export function createGitSurfaceScanner({
  maxScanBytes,
  maxGitBatchBodyBytes,
  maxGitBatchHeaderBytes,
  isIgnoredBinaryAssetPath,
  unscannedFinding,
  parseObjectList,
  readBatchOutput,
  scanPathBuffer,
}) {
  async function git(root, args, options = {}) {
    const output = await runGitCommand(root, args, {
      env: options.env,
      gitDirectoryHandle: options.gitDirectoryHandle,
      maxOutputBytes: options.maxOutputBytes ?? 32 * 1024 * 1024,
    });
    return output.toString("utf8");
  }

  async function stagedPaths(root, options) {
    const output = await git(root, ["ls-files", "--cached", "-z"], options);
    return output.split("\0").filter((path) => path.length > 0);
  }

  async function scanStaged(root, options) {
    const findings = [];
    for (const path of await stagedPaths(root, options)) {
      try {
        const stdout = await runGitCommand(root, ["show", `:${path}`], {
          env: options.env,
          gitDirectoryHandle: options.gitDirectoryHandle,
          maxOutputBytes: maxScanBytes + 1,
        });
        findings.push(...scanPathBuffer(stdout, `staged:${path}`));
      } catch {
        findings.push(
          unscannedFinding(
            `staged:${path}`,
            "unreadable-file",
            "unreadable staged content",
          ),
        );
      }
    }
    return findings;
  }

  async function scanHistory(root, options) {
    const objects = parseObjectList(
      await git(root, ["rev-list", "--objects", "--all"], options),
    );
    return readGitBlobsInternal(root, objects, {
      maxScanBytes,
      maxBatchBytes: maxGitBatchBodyBytes,
      maxHeaderBytes: maxGitBatchHeaderBytes,
      isIgnoredBinaryAssetPath,
      unscannedFinding,
      readBatchOutput,
      env: options.env,
      gitDirectoryHandle: options.gitDirectoryHandle,
    });
  }

  return Object.freeze({ scanStaged, scanHistory });
}
