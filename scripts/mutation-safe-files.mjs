import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { link, open, rename, unlink } from "node:fs/promises";
import { dirname, isAbsolute, resolve, sep } from "node:path";
import { tmpdir } from "node:os";

const directoryFlags =
  fsConstants.O_RDONLY | fsConstants.O_DIRECTORY | fsConstants.O_NOFOLLOW;
const readFlags =
  fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW | fsConstants.O_NONBLOCK;
const writeFlags =
  fsConstants.O_WRONLY |
  fsConstants.O_CREAT |
  fsConstants.O_EXCL |
  fsConstants.O_NOFOLLOW;
const runIdPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/u;
const shaPattern = /^[a-f0-9]{40}(?:[a-f0-9]{24})?$/u;

function descriptorPath(directory, name) {
  return `/proc/self/fd/${directory.fd}/${name}`;
}

function sameDirectoryIdentity(left, right) {
  return (
    left.isDirectory() &&
    right.isDirectory() &&
    left.dev === right.dev &&
    left.ino === right.ino
  );
}

async function closeContainedParent(location) {
  if (location.directory !== location.rootDirectory) {
    await location.directory.close();
  }
  if (location.ownsRootDirectory) await location.rootDirectory.close();
}

async function matchesPinnedRootPath(location) {
  if (location.rootLease !== null) {
    return location.rootLease.isStillCurrent();
  }
  let currentRoot;
  try {
    currentRoot = await openDirectoryChain(location.rootPath);
    return sameDirectoryIdentity(await currentRoot.stat(), location.rootStats);
  } catch {
    return false;
  } finally {
    await currentRoot?.close().catch(() => undefined);
  }
}

async function isLocationStillContained(location) {
  let current = location.rootDirectory;
  let parentMatches = false;
  try {
    for (const segment of location.parentSegments) {
      const next = await open(descriptorPath(current, segment), directoryFlags);
      const stats = await next.stat();
      if (!stats.isDirectory()) {
        await next.close();
        return false;
      }
      if (current !== location.rootDirectory) await current.close();
      current = next;
    }
    parentMatches = sameDirectoryIdentity(
      await current.stat(),
      await location.directory.stat(),
    );
  } catch {
    return false;
  } finally {
    if (current !== location.rootDirectory) {
      await current.close().catch(() => undefined);
    }
  }
  return parentMatches && (await matchesPinnedRootPath(location));
}

export function isSafeMutationRelativePath(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !isAbsolute(value) &&
    !value.includes("\\") &&
    !value.includes(":") &&
    value
      .split("/")
      .every((segment) => segment !== "" && segment !== "." && segment !== "..")
  );
}

async function openDirectoryChain(path) {
  if (process.platform !== "linux") {
    throw new Error(
      "safe mutation file access requires Linux /proc descriptors",
    );
  }
  const absolutePath = resolve(path);
  let current = await open(sep, directoryFlags);
  try {
    for (const segment of absolutePath.split(sep).filter(Boolean)) {
      const next = await open(descriptorPath(current, segment), directoryFlags);
      const stats = await next.stat();
      if (!stats.isDirectory()) {
        await next.close();
        throw new Error("mutation path contains a non-directory parent");
      }
      await current.close();
      current = next;
    }
    return current;
  } catch (error) {
    await current.close().catch(() => undefined);
    throw error;
  }
}

async function openContainedParent(root, name) {
  if (!isSafeMutationRelativePath(name)) {
    throw new Error("candidate path must be a normalized relative path");
  }
  const rootLease =
    root !== null &&
    typeof root === "object" &&
    typeof root.isStillCurrent === "function" &&
    root.rootDirectory
      ? root
      : null;
  const rootPath = resolve(rootLease?.rootPath ?? root);
  const ownsRootDirectory = rootLease === null;
  const rootDirectory =
    rootLease?.rootDirectory ?? (await openDirectoryChain(rootPath));
  let rootStats;
  try {
    rootStats = rootLease?.rootStats ?? (await rootDirectory.stat());
  } catch (error) {
    if (ownsRootDirectory) await rootDirectory.close().catch(() => undefined);
    throw error;
  }
  let current = rootDirectory;
  const segments = name.split("/");
  const parentSegments = segments.slice(0, -1);
  try {
    for (const segment of parentSegments) {
      const next = await open(descriptorPath(current, segment), directoryFlags);
      const stats = await next.stat();
      if (!stats.isDirectory()) {
        await next.close();
        throw new Error("candidate path parent is not a directory");
      }
      if (current !== rootDirectory) await current.close();
      current = next;
    }
    return {
      rootPath,
      rootDirectory,
      rootStats,
      directory: current,
      parentSegments,
      rootLease,
      ownsRootDirectory,
      leaf: segments.at(-1),
    };
  } catch (error) {
    if (current !== rootDirectory) {
      await current.close().catch(() => undefined);
    }
    if (ownsRootDirectory) {
      await rootDirectory.close().catch(() => undefined);
    }
    throw error;
  }
}

export async function readContainedMutationFile(root, name) {
  const location = await openContainedParent(root, name);
  try {
    const file = await open(
      descriptorPath(location.directory, location.leaf),
      readFlags,
    );
    try {
      const stats = await file.stat();
      if (!stats.isFile())
        throw new Error("candidate path is not a regular file");
      return {
        bytes: await file.readFile(),
        mode: stats.mode & 0o777,
        stats,
      };
    } finally {
      await file.close();
    }
  } finally {
    await closeContainedParent(location);
  }
}

export async function openContainedMutationFile(root, name) {
  const location = await openContainedParent(root, name);
  let closed = false;
  return {
    async read() {
      if (closed) throw new Error("candidate file handle is closed");
      const file = await open(
        descriptorPath(location.directory, location.leaf),
        readFlags,
      );
      try {
        const stats = await file.stat();
        if (!stats.isFile()) {
          throw new Error("candidate path is not a regular file");
        }
        return { bytes: await file.readFile(), mode: stats.mode & 0o777 };
      } finally {
        await file.close();
      }
    },
    async replace(bytes, mode) {
      if (closed) throw new Error("candidate file handle is closed");
      if (!Buffer.isBuffer(bytes)) {
        throw new TypeError("candidate replacement must be raw bytes");
      }
      if (!(await isLocationStillContained(location))) {
        throw new Error(
          "candidate root or source parent is no longer contained",
        );
      }
      const temporaryName = `.cvg-mutation-${randomUUID()}.tmp`;
      const temporaryPath = descriptorPath(location.directory, temporaryName);
      const targetPath = descriptorPath(location.directory, location.leaf);
      let temporary;
      try {
        temporary = await open(temporaryPath, writeFlags, mode & 0o777);
        await temporary.chmod(mode & 0o777);
        await temporary.writeFile(bytes);
        await temporary.sync();
        await temporary.close();
        temporary = undefined;
        if (!(await isLocationStillContained(location))) {
          throw new Error(
            "candidate root or source parent changed before restoration",
          );
        }
        await rename(temporaryPath, targetPath);
        await location.directory.sync().catch(() => undefined);
      } finally {
        await temporary?.close().catch(() => undefined);
        await unlink(temporaryPath).catch(() => undefined);
      }
    },
    async isStillContained() {
      if (closed) return false;
      return isLocationStillContained(location);
    },
    async close() {
      if (closed) return;
      closed = true;
      await closeContainedParent(location);
    },
  };
}

export async function writeExclusiveContainedMutationFile(
  root,
  name,
  bytes,
  mode = 0o600,
) {
  if (!Buffer.isBuffer(bytes)) {
    throw new TypeError("mutation result must be raw bytes");
  }
  const location = await openContainedParent(root, name);
  const filePath = descriptorPath(location.directory, location.leaf);
  const temporaryPath = descriptorPath(
    location.directory,
    `.cvg-mutation-result-${randomUUID()}.tmp`,
  );
  let file;
  try {
    file = await open(temporaryPath, writeFlags, mode & 0o777);
    await file.writeFile(bytes);
    await file.sync();
    await file.close();
    file = undefined;
    await link(temporaryPath, filePath);
    await location.directory.sync().catch(() => undefined);
  } finally {
    await file?.close().catch(() => undefined);
    await unlink(temporaryPath).catch(() => undefined);
    await closeContainedParent(location);
  }
}

export async function validateDedicatedCandidateRoot(
  root,
  { candidateSha, candidateRunId, expectedRunId },
) {
  if (
    typeof expectedRunId !== "string" ||
    !runIdPattern.test(expectedRunId) ||
    candidateRunId !== expectedRunId
  ) {
    throw new Error(
      "current candidate run id is required and must match the manifest",
    );
  }
  if (typeof candidateSha !== "string" || !shaPattern.test(candidateSha)) {
    throw new Error("candidate SHA is missing or malformed");
  }
  const rootPath = resolve(root);
  const temporaryRoot = resolve(tmpdir());
  const directTempCandidate =
    dirname(rootPath) === temporaryRoot &&
    /^cvg-mutation-candidate-/u.test(rootPath.slice(temporaryRoot.length + 1));
  const nestedTempCandidate =
    dirname(dirname(rootPath)) === temporaryRoot &&
    rootPath.split(sep).at(-1) === "source" &&
    /^cvg-mutation-candidate-/u.test(
      dirname(rootPath).slice(temporaryRoot.length + 1),
    );
  const privateDirectoryPath = directTempCandidate
    ? rootPath
    : nestedTempCandidate
      ? dirname(rootPath)
      : null;
  if (privateDirectoryPath === null) {
    throw new Error(
      "candidate root is not inside a dedicated mutation temp directory",
    );
  }
  const privateDirectory = await openDirectoryChain(privateDirectoryPath);
  let rootDirectory = privateDirectory;
  let ownsRootDirectory = false;
  try {
    const privateStats = await privateDirectory.stat();
    if (
      (privateStats.mode & 0o777) !== 0o700 ||
      (typeof process.getuid === "function" &&
        privateStats.uid !== process.getuid())
    ) {
      throw new Error(
        "candidate temp directory must be private to the current user",
      );
    }
    if (nestedTempCandidate) {
      rootDirectory = await open(
        descriptorPath(privateDirectory, "source"),
        directoryFlags,
      );
      ownsRootDirectory = true;
      if (!(await rootDirectory.stat()).isDirectory()) {
        throw new Error("candidate source root is not a directory");
      }
    }
    const rootStats = await rootDirectory.stat();
    let closed = false;
    const rootLease = {
      rootPath,
      rootDirectory,
      rootStats,
      executionPath: `/proc/self/fd/${rootDirectory.fd}`,
      async isStillCurrent() {
        if (closed) return false;
        let currentPrivateDirectory;
        let currentRootDirectory;
        try {
          currentPrivateDirectory =
            await openDirectoryChain(privateDirectoryPath);
          const currentPrivateStats = await currentPrivateDirectory.stat();
          if (
            !sameDirectoryIdentity(currentPrivateStats, privateStats) ||
            (currentPrivateStats.mode & 0o777) !== 0o700 ||
            (typeof process.getuid === "function" &&
              currentPrivateStats.uid !== process.getuid())
          ) {
            return false;
          }
          if (!nestedTempCandidate) {
            return sameDirectoryIdentity(currentPrivateStats, rootStats);
          }
          currentRootDirectory = await open(
            descriptorPath(currentPrivateDirectory, "source"),
            directoryFlags,
          );
          return sameDirectoryIdentity(
            await currentRootDirectory.stat(),
            rootStats,
          );
        } catch {
          return false;
        } finally {
          await currentRootDirectory?.close().catch(() => undefined);
          await currentPrivateDirectory?.close().catch(() => undefined);
        }
      },
      async close() {
        if (closed) return;
        closed = true;
        if (ownsRootDirectory) await rootDirectory.close();
        await privateDirectory.close();
      },
    };
    const marker = await readContainedMutationFile(
      rootLease,
      ".cvg-mutation-candidate.json",
    );
    let markerValue;
    try {
      markerValue = JSON.parse(marker.bytes.toString("utf8"));
    } catch {
      throw new Error("candidate provenance marker is invalid JSON");
    }
    if (
      markerValue?.format !== "cvg-mutation-candidate/v1" ||
      resolve(markerValue.root) !== rootPath ||
      markerValue.candidateSha !== candidateSha ||
      markerValue.candidateRunId !== expectedRunId ||
      !(await rootLease.isStillCurrent())
    ) {
      throw new Error("isolated candidate marker does not match the manifest");
    }
    return rootLease;
  } catch (error) {
    if (ownsRootDirectory) await rootDirectory.close().catch(() => undefined);
    await privateDirectory.close().catch(() => undefined);
    throw error;
  }
}
