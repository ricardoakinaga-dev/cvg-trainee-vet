import {
  readGitBlobs as readGitBlobsInternal,
  runGitCommand,
} from "./secret-scanner-git-batch.mjs";

const MAX_GIT_TOTAL_BYTES = 256 * 1024 * 1024;
const GIT_TOTAL_BYTES_ERROR = "ERR_GIT_TOTAL_BYTES";

function gitTotalByteBudgetExceededError() {
  return Object.assign(new Error("Git total byte budget exceeded"), {
    code: GIT_TOTAL_BYTES_ERROR,
  });
}

export function createGitSurfaceScanner({
  maxScanBytes,
  maxGitBatchBodyBytes,
  maxGitBatchHeaderBytes,
  maxGitTotalBytes = MAX_GIT_TOTAL_BYTES,
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
      gitIndexHandle: options.gitIndexHandle,
      gitObjectDirectoryHandle: options.gitObjectDirectoryHandle,
      validateGitMetadata: options.validateGitMetadata,
      maxOutputBytes: options.maxOutputBytes ?? 32 * 1024 * 1024,
    });
    return output.toString("utf8");
  }

  async function stagedPaths(root, options) {
    const output = await git(root, ["ls-files", "--cached", "-z"], options);
    return output.split("\0").filter((path) => path.length > 0);
  }

  async function scanStaged(root, options) {
    if (options.gitIndexStatus === "missing") return [];
    if (
      options.gitIndexStatus !== "ready" ||
      options.gitObjectDirectoryStatus !== "ready"
    ) {
      throw new Error("Git staged metadata unavailable");
    }
    const findings = [];
    let remainingBytes = maxGitTotalBytes;
    for (const path of await stagedPaths(root, options)) {
      if (remainingBytes <= 0) throw gitTotalByteBudgetExceededError();
      try {
        const stdout = await runGitCommand(root, ["show", `:${path}`], {
          env: options.env,
          gitDirectoryHandle: options.gitDirectoryHandle,
          gitIndexHandle: options.gitIndexHandle,
          gitObjectDirectoryHandle: options.gitObjectDirectoryHandle,
          validateGitMetadata: options.validateGitMetadata,
          maxOutputBytes: Math.min(maxScanBytes + 1, remainingBytes + 1),
        });
        if (stdout.length > remainingBytes) {
          throw gitTotalByteBudgetExceededError();
        }
        remainingBytes -= stdout.length;
        findings.push(...scanPathBuffer(stdout, `staged:${path}`));
      } catch (error) {
        if (
          error?.code === GIT_TOTAL_BYTES_ERROR ||
          (remainingBytes <= maxScanBytes &&
            /output exceeds configured limit/iu.test(error?.message ?? ""))
        ) {
          throw gitTotalByteBudgetExceededError();
        }
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
    if (options.gitObjectDirectoryStatus !== "ready") {
      throw new Error("Git object directory unavailable");
    }
    const objects = parseObjectList(
      await git(root, ["rev-list", "--objects", "--all"], options),
    );
    return readGitBlobsInternal(root, objects, {
      maxScanBytes,
      maxBatchBytes: maxGitBatchBodyBytes,
      maxTotalBytes: maxGitTotalBytes,
      maxHeaderBytes: maxGitBatchHeaderBytes,
      isIgnoredBinaryAssetPath,
      unscannedFinding,
      readBatchOutput,
      env: options.env,
      gitDirectoryHandle: options.gitDirectoryHandle,
      gitIndexHandle: options.gitIndexHandle,
      gitObjectDirectoryHandle: options.gitObjectDirectoryHandle,
      validateGitMetadata: options.validateGitMetadata,
    });
  }

  return Object.freeze({ scanStaged, scanHistory });
}
