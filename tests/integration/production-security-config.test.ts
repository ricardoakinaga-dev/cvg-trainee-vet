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

function expectValidationError(environment: object, message: string) {
  let error: unknown;
  try {
    validateProductionSecurityConfig(environment);
  } catch (caught) {
    error = caught;
  }

  expect(error).toBeInstanceOf(Error);
  expect(error).toHaveProperty("message", message);
}

describe("production security configuration", () => {
  it("accepts a complete external configuration without returning secrets", () => {
    const result = validateProductionSecurityConfig(validEnvironment);

    expect(result).toEqual({
      status: "PASS",
      identityProviderUrl: "https://identity.example",
      probePrincipal: "probe/account",
      publicOrigin: "https://training.example",
      traceStorage: "s3",
      retention: "14d",
      backupUri: "s3://cvg-backups/production",
      backup: "configured-by-reference",
      release: "immutable-digest-with-rollback-digest",
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(JSON.stringify(result)).not.toContain("xxxxxxxx");
  });

  it("preserves fail-closed validation messages for invalid configurations", () => {
    expectValidationError(
      {
        ...validEnvironment,
        IDENTITY_PROVIDER_URL: "",
      },
      "production security gate is incomplete: IDENTITY_PROVIDER_URL",
    );
    expectValidationError(
      {
        ...validEnvironment,
        CVG_TRACE_STORAGE_BACKEND: "filesystem",
      },
      "CVG_TRACE_STORAGE_BACKEND must be production object storage",
    );
    expectValidationError(
      {
        ...validEnvironment,
        CVG_RELEASE_IMAGE_DIGEST: validEnvironment.CVG_ROLLBACK_IMAGE_DIGEST,
      },
      "CVG_RELEASE_IMAGE_DIGEST and CVG_ROLLBACK_IMAGE_DIGEST must be different",
    );
  });

  it("rejects a local or credential-bearing public origin", () => {
    expectValidationError(
      {
        ...validEnvironment,
        CVG_PUBLIC_HTTPS_ORIGIN: [
          "https://",
          "user:password@localhost:3181/path",
        ].join(""),
      },
      "CVG_PUBLIC_HTTPS_ORIGIN must use HTTPS without embedded credentials",
    );
  });

  it("rejects non-object-storage backup references", () => {
    expectValidationError(
      {
        ...validEnvironment,
        CVG_BACKUP_URI: "file:///tmp/backup",
      },
      "CVG_BACKUP_URI must be an object-storage URI",
    );
  });

  it("rejects malformed or empty retention", () => {
    expectValidationError(
      {
        ...validEnvironment,
        CVG_TRACE_RETENTION: "",
      },
      "production security gate is incomplete: CVG_TRACE_RETENTION",
    );
    expectValidationError(
      {
        ...validEnvironment,
        CVG_TRACE_RETENTION: "forever",
      },
      "CVG_TRACE_RETENTION must be a positive duration such as 14d",
    );
  });

  it("requires distinct immutable release and rollback digests", () => {
    expectValidationError(
      {
        ...validEnvironment,
        CVG_ROLLBACK_IMAGE_DIGEST: validEnvironment.CVG_RELEASE_IMAGE_DIGEST,
      },
      "CVG_RELEASE_IMAGE_DIGEST and CVG_ROLLBACK_IMAGE_DIGEST must be different",
    );
  });

  it("rejects an insecure identity provider URL", () => {
    expectValidationError(
      {
        ...validEnvironment,
        IDENTITY_PROVIDER_URL: "http://identity.example",
      },
      "IDENTITY_PROVIDER_URL must use HTTPS without embedded credentials",
    );
  });

  it("rejects control characters in secret references", () => {
    expectValidationError(
      {
        ...validEnvironment,
        CVG_BACKUP_ENCRYPTION_KEY_REF: "secret://cvg/backup\nkey",
      },
      "CVG_BACKUP_ENCRYPTION_KEY_REF must be a bounded secret/reference value",
    );
  });
});
