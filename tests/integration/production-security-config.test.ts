import { describe, expect, it } from "vitest";

import { validateProductionSecurityConfig } from "../../scripts/verify-production-security-config.mjs";

const validEnvironment = Object.freeze({
  IDENTITY_PROVIDER_REQUIRED: "true",
  IDENTITY_PROVIDER_URL: "https://identity.example",
  IDENTITY_PROVIDER_TOKEN: "x".repeat(8),
  CVG_IDENTITY_PROVIDER_PROBE_PRINCIPAL: "probe/account",
  CVG_PUBLIC_HTTPS_ORIGIN: "https://training.example",
  CVG_TRACE_STORAGE_BACKEND: "s3",
  CVG_TRACE_RETENTION: "14d",
  CVG_BACKUP_URI: "s3://cvg-backups/production",
  CVG_BACKUP_ENCRYPTION_KEY_REF: "secret://cvg/backup-key",
  CVG_RELEASE_IMAGE_DIGEST: `sha256:${"a".repeat(64)}`,
  CVG_ROLLBACK_IMAGE_DIGEST: `sha256:${"b".repeat(64)}`,
});

describe("production security configuration", () => {
  it("accepts a complete external configuration without returning secrets", () => {
    const result = validateProductionSecurityConfig(validEnvironment);

    expect(result).toMatchObject({
      status: "PASS",
      publicOrigin: "https://training.example",
      traceStorage: "s3",
      retention: "14d",
      backupUri: "s3://cvg-backups/production",
      backup: "configured-by-reference",
      release: "immutable-digest-with-rollback-digest",
    });
    expect(JSON.stringify(result)).not.toContain("xxxxxxxx");
  });

  it("rejects a local or credential-bearing public origin", () => {
    expect(() =>
      validateProductionSecurityConfig({
        ...validEnvironment,
        CVG_PUBLIC_HTTPS_ORIGIN: "https://user:password@localhost:3181/path",
      }),
    ).toThrow("CVG_PUBLIC_HTTPS_ORIGIN");
  });

  it("rejects non-object-storage backup references", () => {
    expect(() =>
      validateProductionSecurityConfig({
        ...validEnvironment,
        CVG_BACKUP_URI: "file:///tmp/backup",
      }),
    ).toThrow("CVG_BACKUP_URI");
  });

  it("rejects malformed or empty retention", () => {
    expect(() =>
      validateProductionSecurityConfig({
        ...validEnvironment,
        CVG_TRACE_RETENTION: "",
      }),
    ).toThrow("CVG_TRACE_RETENTION");
    expect(() =>
      validateProductionSecurityConfig({
        ...validEnvironment,
        CVG_TRACE_RETENTION: "forever",
      }),
    ).toThrow("CVG_TRACE_RETENTION");
  });

  it("requires distinct immutable release and rollback digests", () => {
    expect(() =>
      validateProductionSecurityConfig({
        ...validEnvironment,
        CVG_ROLLBACK_IMAGE_DIGEST: validEnvironment.CVG_RELEASE_IMAGE_DIGEST,
      }),
    ).toThrow("different");
  });

  it("rejects an insecure identity provider URL", () => {
    expect(() =>
      validateProductionSecurityConfig({
        ...validEnvironment,
        IDENTITY_PROVIDER_URL: "http://identity.example",
      }),
    ).toThrow("IDENTITY_PROVIDER_URL");
  });

  it("rejects control characters in secret references", () => {
    expect(() =>
      validateProductionSecurityConfig({
        ...validEnvironment,
        CVG_BACKUP_ENCRYPTION_KEY_REF: "secret://cvg/backup\nkey",
      }),
    ).toThrow("CVG_BACKUP_ENCRYPTION_KEY_REF");
  });
});
