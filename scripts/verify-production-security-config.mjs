import process from "node:process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { probeIdentityProviderReadiness } from "./verify-identity-provider-readiness.mjs";

const digestPattern = /^sha256:[a-f0-9]{64}$/iu;
const traceStorageBackends = new Set(["s3", "gcs", "azure"]);
const backupUriSchemes = new Set(["s3:", "gs:", "az:"]);

export function validateProductionSecurityConfig(environment = process.env) {
  assertCompleteProductionSecurityConfig(environment);
  assertIdentityProviderRequired(environment);

  const identityProvider = parseIdentityProviderConfig(environment);

  const publicOrigin = parsePublicHttpsOrigin(
    requiredString(environment, "CVG_PUBLIC_HTTPS_ORIGIN"),
  );
  const trace = parseTraceConfig(environment);
  const backup = parseBackupConfig(environment);
  assertDistinctReleaseDigests(environment);

  return createProductionSecurityResult({
    identityProviderUrl: identityProvider.identityProviderUrl,
    probePrincipal: identityProvider.probePrincipal,
    publicOrigin,
    traceStorage: trace.traceStorage,
    retention: trace.retention,
    backupUri: backup.backupUri,
  });
}

function assertCompleteProductionSecurityConfig(environment) {
  const missing = requiredProductionSecurityConfig(environment)
    .filter(
      ([, value]) => value !== true && (!value || String(value).trim() === ""),
    )
    .map(([name]) => name);
  if (missing.length > 0) {
    throw new Error(
      `production security gate is incomplete: ${missing.join(", ")}`,
    );
  }
}

function requiredProductionSecurityConfig(environment) {
  return [
    [
      "IDENTITY_PROVIDER_REQUIRED",
      environment.IDENTITY_PROVIDER_REQUIRED === "true",
    ],
    ["IDENTITY_PROVIDER_URL", environment.IDENTITY_PROVIDER_URL],
    ["IDENTITY_PROVIDER_TOKEN", environment.IDENTITY_PROVIDER_TOKEN],
    [
      "CVG_IDENTITY_PROVIDER_PROBE_PRINCIPAL",
      environment.CVG_IDENTITY_PROVIDER_PROBE_PRINCIPAL,
    ],
    ["CVG_PUBLIC_HTTPS_ORIGIN", environment.CVG_PUBLIC_HTTPS_ORIGIN],
    ["CVG_TRACE_STORAGE_BACKEND", environment.CVG_TRACE_STORAGE_BACKEND],
    ["CVG_TRACE_RETENTION", environment.CVG_TRACE_RETENTION],
    ["CVG_BACKUP_URI", environment.CVG_BACKUP_URI],
    [
      "CVG_BACKUP_ENCRYPTION_KEY_REF",
      environment.CVG_BACKUP_ENCRYPTION_KEY_REF,
    ],
    ["CVG_RELEASE_IMAGE_DIGEST", environment.CVG_RELEASE_IMAGE_DIGEST],
    ["CVG_ROLLBACK_IMAGE_DIGEST", environment.CVG_ROLLBACK_IMAGE_DIGEST],
  ];
}

function assertIdentityProviderRequired(environment) {
  if (environment.IDENTITY_PROVIDER_REQUIRED !== "true") {
    throw new Error("IDENTITY_PROVIDER_REQUIRED must be true in production");
  }
}

function parseIdentityProviderConfig(environment) {
  const identityProviderUrl = parseHttpsUrl(
    requiredString(environment, "IDENTITY_PROVIDER_URL"),
    "IDENTITY_PROVIDER_URL",
  );
  const token = requiredString(environment, "IDENTITY_PROVIDER_TOKEN");
  assertOpaqueReference(token, "IDENTITY_PROVIDER_TOKEN");
  const principal = requiredString(
    environment,
    "CVG_IDENTITY_PROVIDER_PROBE_PRINCIPAL",
  );
  assertOpaqueReference(principal, "CVG_IDENTITY_PROVIDER_PROBE_PRINCIPAL");

  return { identityProviderUrl, probePrincipal: principal };
}

function parseTraceConfig(environment) {
  const traceStorage = requiredString(
    environment,
    "CVG_TRACE_STORAGE_BACKEND",
  ).toLowerCase();
  if (!traceStorageBackends.has(traceStorage)) {
    throw new Error(
      "CVG_TRACE_STORAGE_BACKEND must be production object storage",
    );
  }

  const retention = requiredString(environment, "CVG_TRACE_RETENTION");
  if (!/^[1-9][0-9]*(?:mo|[smhdwy])$/u.test(retention)) {
    throw new Error(
      "CVG_TRACE_RETENTION must be a positive duration such as 14d",
    );
  }

  return { traceStorage, retention };
}

function parseBackupConfig(environment) {
  const backupUri = parseBackupUri(
    requiredString(environment, "CVG_BACKUP_URI"),
  );
  const encryptionKeyRef = requiredString(
    environment,
    "CVG_BACKUP_ENCRYPTION_KEY_REF",
  );
  assertOpaqueReference(encryptionKeyRef, "CVG_BACKUP_ENCRYPTION_KEY_REF");

  return { backupUri };
}

function assertDistinctReleaseDigests(environment) {
  const releaseDigest = requiredDigest(environment, "CVG_RELEASE_IMAGE_DIGEST");
  const rollbackDigest = requiredDigest(
    environment,
    "CVG_ROLLBACK_IMAGE_DIGEST",
  );
  if (releaseDigest === rollbackDigest) {
    throw new Error(
      "CVG_RELEASE_IMAGE_DIGEST and CVG_ROLLBACK_IMAGE_DIGEST must be different",
    );
  }
}

function createProductionSecurityResult({
  identityProviderUrl,
  probePrincipal,
  publicOrigin,
  traceStorage,
  retention,
  backupUri,
}) {
  return Object.freeze({
    status: "PASS",
    identityProviderUrl: identityProviderUrl.origin,
    probePrincipal,
    publicOrigin: publicOrigin.origin,
    traceStorage,
    retention,
    backupUri,
    backup: "configured-by-reference",
    release: "immutable-digest-with-rollback-digest",
  });
}

function requiredString(environment, name) {
  const value = environment[name];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} is required`);
  }
  return value.trim();
}

function assertOpaqueReference(value, name) {
  if (
    value.length > 256 ||
    [...value].some((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint < 0x20 || codePoint === 0x7f;
    })
  ) {
    throw new Error(`${name} must be a bounded secret/reference value`);
  }
}

function parseHttpsUrl(value, name) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} must use HTTPS`);
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.hostname.length === 0 ||
    parsed.username.length > 0 ||
    parsed.password.length > 0
  ) {
    throw new Error(`${name} must use HTTPS without embedded credentials`);
  }
  return parsed;
}

function parsePublicHttpsOrigin(value) {
  const parsed = parseHttpsUrl(value, "CVG_PUBLIC_HTTPS_ORIGIN");
  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/gu, "");
  if (["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(hostname)) {
    throw new Error("CVG_PUBLIC_HTTPS_ORIGIN must be a managed HTTPS origin");
  }
  if (
    !["", "/"].includes(parsed.pathname) ||
    parsed.search.length > 0 ||
    parsed.hash.length > 0
  ) {
    throw new Error(
      "CVG_PUBLIC_HTTPS_ORIGIN must contain only the HTTPS origin",
    );
  }
  return parsed;
}

function parseBackupUri(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("CVG_BACKUP_URI must be an object-storage URI");
  }
  if (
    !backupUriSchemes.has(parsed.protocol) ||
    parsed.hostname.length === 0 ||
    parsed.pathname === "" ||
    parsed.username.length > 0 ||
    parsed.password.length > 0 ||
    parsed.search.length > 0 ||
    parsed.hash.length > 0
  ) {
    throw new Error("CVG_BACKUP_URI must be an object-storage URI");
  }
  return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
}

function requiredDigest(environment, name) {
  const value = requiredString(environment, name);
  if (!digestPattern.test(value)) {
    throw new Error(`${name} must be an immutable image digest`);
  }
  return value;
}

export async function runProductionSecurityGate(environment = process.env) {
  if (environment.CVG_VERIFY_PRODUCTION_SECURITY !== "true") {
    return Object.freeze({
      status: "NOT_EXECUTED",
      reason:
        "set CVG_VERIFY_PRODUCTION_SECURITY=true only in the approved production release environment",
    });
  }

  const configuration = validateProductionSecurityConfig(environment);
  const identityProviderReadiness = await probeIdentityProviderReadiness({
    ...environment,
    CVG_VERIFY_IDENTITY_PROVIDER: "true",
  });
  if (identityProviderReadiness.status !== "PASS") {
    throw new Error("identity provider readiness was not verified");
  }

  return Object.freeze({
    ...configuration,
    identityProvider: "configured-over-https",
    identityProviderReadiness: identityProviderReadiness.status,
  });
}

const invokedFile =
  process.argv[1] === undefined ? undefined : resolve(process.argv[1]);
if (invokedFile === resolve(fileURLToPath(import.meta.url))) {
  const result = await runProductionSecurityGate();
  console.log(JSON.stringify(result));
}
