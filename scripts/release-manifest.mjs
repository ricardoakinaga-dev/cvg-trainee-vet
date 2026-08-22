const digestPattern = /^sha256:[a-f0-9]{64}$/iu;
const sourceShaPattern = /^[a-f0-9]{40}$/iu;
const REQUIRED_FIELDS = Object.freeze([
  "releaseId",
  "image",
  "imageDigest",
  "rollbackImageDigest",
  "sourceSha",
  "rollbackSourceSha",
  "migrationStrategy",
  "workerRolloutStrategy",
  "mutationGateStrategy",
  "qdrantIdentity",
  "rollbackQdrantIdentity",
  "canaryService",
  "healthPath",
]);

export function assertReleaseManifest(value) {
  const manifest = assertManifestObject(value);
  assertRequiredFields(manifest);
  assertManifestIdentity(manifest);
  assertManifestDigests(manifest);
  assertManifestPolicy(manifest);
  const canarySeconds = assertCanarySeconds(manifest.canarySeconds);
  const canaryStableProbes = assertCanaryStableProbes(
    manifest.canaryStableProbes,
  );
  const workerDrainSeconds = assertWorkerDrainSeconds(
    manifest.workerDrainSeconds,
  );
  return Object.freeze({
    releaseId: manifest.releaseId,
    image: manifest.image,
    imageDigest: manifest.imageDigest,
    rollbackImageDigest: manifest.rollbackImageDigest,
    sourceSha: manifest.sourceSha.toLowerCase(),
    rollbackSourceSha: manifest.rollbackSourceSha.toLowerCase(),
    migrationStrategy: manifest.migrationStrategy,
    workerRolloutStrategy: manifest.workerRolloutStrategy,
    mutationGateStrategy: manifest.mutationGateStrategy,
    qdrantIdentity: manifest.qdrantIdentity,
    rollbackQdrantIdentity: manifest.rollbackQdrantIdentity,
    canaryService: manifest.canaryService,
    healthPath: manifest.healthPath,
    canarySeconds,
    canaryStableProbes,
    workerDrainSeconds,
  });
}

function assertManifestObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("release manifest must be an object");
  }
  return value;
}

function assertRequiredFields(manifest) {
  for (const field of REQUIRED_FIELDS) {
    if (typeof manifest[field] !== "string" || manifest[field].trim() === "") {
      throw new Error(`release manifest field ${field} is required`);
    }
  }
}

function assertManifestIdentity(manifest) {
  if (!/^cvg-[a-z0-9-]+$/u.test(manifest.releaseId)) {
    throw new Error("releaseId must be a stable CVG release identifier");
  }
  if (manifest.image.includes(":latest") || manifest.image.includes("@")) {
    throw new Error("image must not use latest or embed a second digest");
  }
}

function assertManifestDigests(manifest) {
  for (const field of ["imageDigest", "rollbackImageDigest"]) {
    if (!digestPattern.test(manifest[field])) {
      throw new Error(`${field} must be an immutable sha256 digest`);
    }
  }
  for (const field of ["sourceSha", "rollbackSourceSha"]) {
    if (!sourceShaPattern.test(manifest[field])) {
      throw new Error(`${field} must be a 40-character git SHA`);
    }
  }
  if (manifest.imageDigest === manifest.rollbackImageDigest) {
    throw new Error(
      "rollback image digest must differ from the release digest",
    );
  }
}

function assertManifestPolicy(manifest) {
  if (manifest.migrationStrategy !== "EXPAND_CONTRACT") {
    throw new Error("migrationStrategy must be EXPAND_CONTRACT");
  }
  if (manifest.workerRolloutStrategy !== "DRAIN_N_MINUS_1_BEFORE_N") {
    throw new Error("workerRolloutStrategy must drain N-1 before N");
  }
  if (
    manifest.mutationGateStrategy !== "REQUIRED_CLOSED_DURING_WORKER_CUTOVER"
  ) {
    throw new Error(
      "mutationGateStrategy must require a closed worker cutover gate",
    );
  }
  if (
    manifest.qdrantIdentity.length > 256 ||
    !/^[A-Za-z0-9._:/-]+$/u.test(manifest.qdrantIdentity) ||
    manifest.rollbackQdrantIdentity.length > 256 ||
    !/^[A-Za-z0-9._:/-]+$/u.test(manifest.rollbackQdrantIdentity)
  ) {
    throw new Error("Qdrant identity must be a bounded stable identifier");
  }
  if (manifest.qdrantIdentity !== manifest.rollbackQdrantIdentity) {
    throw new Error(
      "Qdrant identity must remain unchanged during worker cutover",
    );
  }
  if (manifest.qdrantIdentity !== "disabled") {
    throw new Error(
      "Qdrant identity changes require a versioned alias rollout",
    );
  }
  if (manifest.canaryService !== "api-a") {
    throw new Error("canaryService must be api-a");
  }
  if (!manifest.healthPath.startsWith("/health/")) {
    throw new Error("healthPath must be a health endpoint");
  }
}

function assertCanarySeconds(value) {
  const canarySeconds = value ?? 60;
  if (
    !Number.isInteger(canarySeconds) ||
    canarySeconds < 1 ||
    canarySeconds > 3600
  ) {
    throw new Error("canarySeconds must be between 1 and 3600");
  }
  return canarySeconds;
}

function assertCanaryStableProbes(value) {
  const canaryStableProbes = value ?? 3;
  if (
    !Number.isInteger(canaryStableProbes) ||
    canaryStableProbes < 1 ||
    canaryStableProbes > 60
  ) {
    throw new Error("canaryStableProbes must be between 1 and 60");
  }
  return canaryStableProbes;
}

function assertWorkerDrainSeconds(value) {
  const workerDrainSeconds = value ?? 30;
  if (
    !Number.isInteger(workerDrainSeconds) ||
    workerDrainSeconds < 1 ||
    workerDrainSeconds > 300
  ) {
    throw new Error("workerDrainSeconds must be between 1 and 300");
  }
  return workerDrainSeconds;
}

export function assertDistinctRollbackProvenance(value) {
  const manifest = assertReleaseManifest(value);
  if (manifest.sourceSha === manifest.rollbackSourceSha) {
    throw new Error(
      "rollback source SHA must differ from the release source SHA for a versioned rollback",
    );
  }
  return manifest;
}
