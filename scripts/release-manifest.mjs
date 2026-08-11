const digestPattern = /^sha256:[a-f0-9]{64}$/iu;

export function assertReleaseManifest(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("release manifest must be an object");
  }
  const manifest = value;
  for (const field of [
    "releaseId",
    "image",
    "imageDigest",
    "rollbackImageDigest",
    "migrationStrategy",
    "canaryService",
    "healthPath",
  ]) {
    if (typeof manifest[field] !== "string" || manifest[field].trim() === "") {
      throw new Error(`release manifest field ${field} is required`);
    }
  }
  if (!/^cvg-[a-z0-9-]+$/u.test(manifest.releaseId)) {
    throw new Error("releaseId must be a stable CVG release identifier");
  }
  if (manifest.image.includes(":latest") || manifest.image.includes("@")) {
    throw new Error("image must not use latest or embed a second digest");
  }
  for (const field of ["imageDigest", "rollbackImageDigest"]) {
    if (!digestPattern.test(manifest[field])) {
      throw new Error(`${field} must be an immutable sha256 digest`);
    }
  }
  if (manifest.imageDigest === manifest.rollbackImageDigest) {
    throw new Error(
      "rollback image digest must differ from the release digest",
    );
  }
  if (manifest.migrationStrategy !== "EXPAND_CONTRACT") {
    throw new Error("migrationStrategy must be EXPAND_CONTRACT");
  }
  if (manifest.canaryService !== "api-a") {
    throw new Error("canaryService must be api-a");
  }
  if (!manifest.healthPath.startsWith("/health/")) {
    throw new Error("healthPath must be a health endpoint");
  }
  const canarySeconds = manifest.canarySeconds ?? 60;
  if (
    !Number.isInteger(canarySeconds) ||
    canarySeconds < 1 ||
    canarySeconds > 3600
  ) {
    throw new Error("canarySeconds must be between 1 and 3600");
  }
  return Object.freeze({
    releaseId: manifest.releaseId,
    image: manifest.image,
    imageDigest: manifest.imageDigest,
    rollbackImageDigest: manifest.rollbackImageDigest,
    migrationStrategy: manifest.migrationStrategy,
    canaryService: manifest.canaryService,
    healthPath: manifest.healthPath,
    canarySeconds,
  });
}
