import process from "node:process";

const productionRequested =
  process.env.CVG_VERIFY_PRODUCTION_SECURITY === "true";

if (!productionRequested) {
  console.log(
    JSON.stringify({
      status: "NOT_EXECUTED",
      reason:
        "set CVG_VERIFY_PRODUCTION_SECURITY=true only in the approved production release environment",
    }),
  );
  process.exit(0);
}

const required = [
  [
    "IDENTITY_PROVIDER_REQUIRED",
    process.env.IDENTITY_PROVIDER_REQUIRED === "true",
  ],
  ["IDENTITY_PROVIDER_URL", process.env.IDENTITY_PROVIDER_URL],
  ["IDENTITY_PROVIDER_TOKEN", process.env.IDENTITY_PROVIDER_TOKEN],
  ["CVG_PUBLIC_HTTPS_ORIGIN", process.env.CVG_PUBLIC_HTTPS_ORIGIN],
  ["CVG_TRACE_STORAGE_BACKEND", process.env.CVG_TRACE_STORAGE_BACKEND],
  ["CVG_TRACE_RETENTION", process.env.CVG_TRACE_RETENTION],
  ["CVG_BACKUP_URI", process.env.CVG_BACKUP_URI],
  ["CVG_BACKUP_ENCRYPTION_KEY_REF", process.env.CVG_BACKUP_ENCRYPTION_KEY_REF],
  ["CVG_RELEASE_IMAGE_DIGEST", process.env.CVG_RELEASE_IMAGE_DIGEST],
  ["CVG_ROLLBACK_IMAGE_DIGEST", process.env.CVG_ROLLBACK_IMAGE_DIGEST],
];
const missing = required
  .filter(
    ([, value]) => value !== true && (!value || String(value).trim() === ""),
  )
  .map(([name]) => name);
if (missing.length > 0) {
  throw new Error(
    `production security gate is incomplete: ${missing.join(", ")}`,
  );
}

if (!/^https:\/\//u.test(process.env.IDENTITY_PROVIDER_URL)) {
  throw new Error("IDENTITY_PROVIDER_URL must use HTTPS in production");
}
const publicOrigin = new URL(process.env.CVG_PUBLIC_HTTPS_ORIGIN);
if (
  publicOrigin.protocol !== "https:" ||
  ["localhost", "127.0.0.1", "0.0.0.0"].includes(publicOrigin.hostname)
) {
  throw new Error("CVG_PUBLIC_HTTPS_ORIGIN must be a managed HTTPS origin");
}
if (!["s3", "gcs", "azure"].includes(process.env.CVG_TRACE_STORAGE_BACKEND)) {
  throw new Error(
    "CVG_TRACE_STORAGE_BACKEND must be production object storage",
  );
}
if (!/^sha256:[a-f0-9]{64}$/iu.test(process.env.CVG_RELEASE_IMAGE_DIGEST)) {
  throw new Error("CVG_RELEASE_IMAGE_DIGEST must be an immutable image digest");
}
if (!/^sha256:[a-f0-9]{64}$/iu.test(process.env.CVG_ROLLBACK_IMAGE_DIGEST)) {
  throw new Error(
    "CVG_ROLLBACK_IMAGE_DIGEST must be an immutable image digest",
  );
}

console.log(
  JSON.stringify({
    status: "PASS",
    identityProvider: "configured-over-https",
    publicOrigin: publicOrigin.origin,
    traceStorage: process.env.CVG_TRACE_STORAGE_BACKEND,
    retention: process.env.CVG_TRACE_RETENTION,
    backup: "configured-by-reference",
    release: "immutable-digest-with-rollback-digest",
  }),
);
