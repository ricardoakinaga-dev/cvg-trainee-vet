import { spawn, spawnSync } from "node:child_process";
import process from "node:process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_SHA_PATTERN = /^[a-f0-9]{40}$/iu;
const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/iu;
const IMMUTABLE_IMAGE_PATTERN = /@sha256:[a-f0-9]{64}$/iu;
const DEFAULT_CONTAINERS = Object.freeze([
  "cvg-trainee-vet-ha-api-a-1",
  "cvg-trainee-vet-ha-api-b-1",
  "cvg-trainee-vet-ha-worker-a-1",
  "cvg-trainee-vet-ha-worker-b-1",
]);
const projectRoot = fileURLToPath(new URL("../", import.meta.url));

export function assertRuntimeSourceSha(sourceSha) {
  if (typeof sourceSha !== "string" || !SOURCE_SHA_PATTERN.test(sourceSha)) {
    throw new Error("runtime provenance requires a 40-character git SHA");
  }
  return sourceSha.toLowerCase();
}

export function assertRuntimeDigest(digest) {
  if (typeof digest !== "string" || !DIGEST_PATTERN.test(digest)) {
    throw new Error("runtime provenance requires an immutable image digest");
  }
  return digest.toLowerCase();
}

export function assertGitSourceShaExists(sourceSha) {
  const normalizedSourceSha = assertRuntimeSourceSha(sourceSha);
  const result = spawnSync(
    "git",
    ["cat-file", "-e", `${normalizedSourceSha}^{commit}`],
    { cwd: projectRoot, stdio: "ignore" },
  );
  if (result.error !== undefined || result.status !== 0) {
    throw new Error(
      `runtime provenance source SHA is not a Git commit: ${normalizedSourceSha}`,
    );
  }
  return normalizedSourceSha;
}

export function validateRuntimeProvenanceRecords(
  records,
  expectedSourceSha,
  expectedDigest,
  expectedQdrantIdentity,
) {
  const expected = assertRuntimeSourceSha(expectedSourceSha);
  const expectedImageDigest =
    expectedDigest === undefined
      ? undefined
      : assertRuntimeDigest(expectedDigest);
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("runtime provenance requires at least one container");
  }

  const containers = records.map((record, index) =>
    validateRuntimeContainerRecord(
      record,
      index,
      expected,
      expectedImageDigest,
      expectedQdrantIdentity,
    ),
  );
  const commonDigest = containers[0].digest.toLowerCase();
  const divergingContainer = containers.find(
    ({ digest }) => digest.toLowerCase() !== commonDigest,
  );
  if (divergingContainer !== undefined) {
    throw new Error(
      `runtime provenance digest diverges: ${divergingContainer.name}`,
    );
  }

  return Object.freeze({
    status: "PASS",
    expectedSourceSha: expected,
    expectedDigest: expectedImageDigest,
    expectedQdrantIdentity,
    commonDigest,
    containerCount: containers.length,
    containers: Object.freeze(containers),
  });
}

function validateRuntimeContainerRecord(
  record,
  index,
  expectedSourceSha,
  expectedDigest,
  expectedQdrantIdentity,
) {
  const name = readContainerName(record, index);
  if (record?.State?.Status !== "running") {
    throw new Error(`runtime provenance container is not running: ${name}`);
  }
  if (record?.State?.Health?.Status !== "healthy") {
    throw new Error(`runtime provenance container is not healthy: ${name}`);
  }

  const image = readValidatedRuntimeImage(record, name, expectedDigest);
  const referenceDigest = image.imageReference.slice(
    image.imageReference.lastIndexOf("@") + 1,
  );
  if (referenceDigest.toLowerCase() !== image.digest.toLowerCase()) {
    throw new Error(`runtime provenance image/digest mismatch: ${name}`);
  }

  const labelSha =
    record?.Config?.Labels?.["org.opencontainers.image.revision"];
  if (
    typeof labelSha !== "string" ||
    labelSha.toLowerCase() !== expectedSourceSha
  ) {
    throw new Error(`runtime provenance source label diverges: ${name}`);
  }
  if (readSourceSha(record?.Config?.Env) !== expectedSourceSha) {
    throw new Error(`runtime provenance source environment diverges: ${name}`);
  }
  if (
    expectedQdrantIdentity !== undefined &&
    readQdrantIdentity(record?.Config?.Env) !== expectedQdrantIdentity
  ) {
    throw new Error(`runtime Qdrant identity diverges: ${name}`);
  }

  return Object.freeze({
    name,
    imageReference: image.imageReference,
    sourceSha: expectedSourceSha,
    digest: image.digest,
  });
}

function readValidatedRuntimeImage(record, name, expectedDigest) {
  const imageReference = record?.Config?.Image;
  if (
    typeof imageReference !== "string" ||
    !IMMUTABLE_IMAGE_PATTERN.test(imageReference)
  ) {
    throw new Error(`runtime provenance image is not immutable: ${name}`);
  }
  const digest = record?.Image;
  if (typeof digest !== "string" || !DIGEST_PATTERN.test(digest)) {
    throw new Error(`runtime provenance digest is invalid: ${name}`);
  }
  if (expectedDigest !== undefined && digest.toLowerCase() !== expectedDigest) {
    throw new Error(
      `runtime provenance digest does not match expected manifest digest: ${name}`,
    );
  }
  return Object.freeze({ imageReference, digest });
}

export async function runRuntimeProvenanceVerification(
  environment = process.env,
) {
  if (environment.CVG_VERIFY_RUNTIME_PROVENANCE !== "true") {
    return Object.freeze({
      status: "NOT_EXECUTED",
      reason:
        "set CVG_VERIFY_RUNTIME_PROVENANCE=true in the approved runtime environment",
    });
  }

  const expectedSourceSha = assertRuntimeSourceSha(
    environment.CVG_RUNTIME_EXPECTED_SOURCE_SHA ?? environment.CVG_SOURCE_SHA,
  );
  const expectedDigest = assertRuntimeDigest(
    environment.CVG_RUNTIME_EXPECTED_DIGEST,
  );
  assertGitSourceShaExists(expectedSourceSha);
  const containers = parseContainerNames(environment.CVG_RUNTIME_CONTAINERS);
  const records = await inspectContainers(containers, environment);
  return validateRuntimeProvenanceRecords(
    records,
    expectedSourceSha,
    expectedDigest,
    environment.CVG_RUNTIME_EXPECTED_QDRANT_IDENTITY,
  );
}

function parseContainerNames(value) {
  const names =
    typeof value === "string" && value.trim().length > 0
      ? value.split(",").map((name) => name.trim())
      : DEFAULT_CONTAINERS;
  if (
    names.length === 0 ||
    names.some((name) => !/^[a-z0-9_.-]+$/iu.test(name))
  ) {
    throw new Error("runtime provenance container names are invalid");
  }
  return Object.freeze([...names]);
}

function readContainerName(record, index) {
  const name = record?.Name;
  if (typeof name === "string" && name.length > 0)
    return name.replace(/^\//u, "");
  return `container-${index + 1}`;
}

function readSourceSha(environmentValues) {
  if (!Array.isArray(environmentValues)) return null;
  const sourceEntry = environmentValues.find(
    (value) => typeof value === "string" && value.startsWith("CVG_SOURCE_SHA="),
  );
  if (typeof sourceEntry !== "string") return null;
  const sourceSha = sourceEntry.slice("CVG_SOURCE_SHA=".length);
  return SOURCE_SHA_PATTERN.test(sourceSha) ? sourceSha.toLowerCase() : null;
}

function readQdrantIdentity(environmentValues) {
  if (!Array.isArray(environmentValues)) return null;
  return environmentValues.includes("QDRANT_ENABLED=false") ? "disabled" : null;
}

function inspectContainers(containers, environment) {
  return new Promise((resolveOutput, reject) => {
    const child = spawn("docker", ["inspect", ...containers], {
      env: environment,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `runtime provenance docker inspect failed: ${stderr.trim().slice(-500)}`,
          ),
        );
        return;
      }
      try {
        resolveOutput(JSON.parse(stdout));
      } catch {
        reject(
          new Error("runtime provenance docker inspect returned invalid JSON"),
        );
      }
    });
  });
}

const invokedFile =
  process.argv[1] === undefined ? undefined : resolve(process.argv[1]);
if (invokedFile === resolve(fileURLToPath(import.meta.url))) {
  try {
    console.log(JSON.stringify(await runRuntimeProvenanceVerification()));
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "runtime provenance failed",
    );
    process.exitCode = 1;
  }
}
