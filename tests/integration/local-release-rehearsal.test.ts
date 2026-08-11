import { describe, expect, it } from "vitest";

import {
  assertLocalReleaseRehearsalEnabled,
  buildLocalReleaseEnvironment,
  createLocalReleaseManifest,
  parseRepositoryDigest,
  resolveLocalRollbackImage,
} from "../../scripts/local-release-rehearsal.mjs";
import { assertReleaseManifest } from "../../scripts/release-manifest.mjs";
import { resolveReleasePullMode } from "../../scripts/release-execution.mjs";

describe("local release rehearsal contract", () => {
  it("requires an explicit local-only execution flag", () => {
    expect(() => assertLocalReleaseRehearsalEnabled({})).toThrow(
      "local release rehearsal requires CVG_RUN_LOCAL_RELEASE_REHEARSAL=true",
    );

    expect(() =>
      assertLocalReleaseRehearsalEnabled({
        CVG_RUN_LOCAL_RELEASE_REHEARSAL: "true",
      }),
    ).not.toThrow();
  });

  it("parses a repository digest without accepting a mutable tag", () => {
    expect(
      parseRepositoryDigest(
        "cvg-trainee-vet@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      ),
    ).toEqual({
      image: "cvg-trainee-vet",
      digest:
        "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    });

    expect(() => parseRepositoryDigest("cvg-trainee-vet:local")).toThrow(
      "local image must expose an immutable repository digest",
    );
  });

  it("accepts only a local rollback image override", () => {
    expect(
      resolveLocalRollbackImage({
        CVG_LOCAL_RELEASE_ROLLBACK_IMAGE: "cvg-trainee-vet:previous",
      }),
    ).toBe("cvg-trainee-vet:previous");
    expect(resolveLocalRollbackImage({})).toBeNull();
    expect(() =>
      resolveLocalRollbackImage({
        CVG_LOCAL_RELEASE_ROLLBACK_IMAGE: "registry.example.invalid/cvg:old",
      }),
    ).toThrow(
      "local release rehearsal accepts only the local cvg-trainee-vet image",
    );
  });

  it("builds a manifest with distinct immutable release and rollback digests", () => {
    const manifest = createLocalReleaseManifest({
      releaseDigest:
        "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      rollbackDigest:
        "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    });

    expect(assertReleaseManifest(manifest)).toMatchObject({
      releaseId: "cvg-local-rehearsal",
      image: "cvg-trainee-vet",
      imageDigest:
        "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      rollbackImageDigest:
        "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    });
  });

  it("makes the pull bypass impossible outside the explicit rehearsal mode", () => {
    expect(buildLocalReleaseEnvironment({ PATH: "/usr/bin" })).toMatchObject({
      CVG_RELEASE_EXECUTE: "true",
      CVG_RELEASE_LOCAL_REHEARSAL: "true",
      CVG_RELEASE_PULL: "skip",
    });

    expect(() => resolveReleasePullMode({ CVG_RELEASE_PULL: "skip" })).toThrow(
      "CVG_RELEASE_PULL=skip requires CVG_RELEASE_LOCAL_REHEARSAL=true",
    );
    expect(
      resolveReleasePullMode({
        CVG_RELEASE_PULL: "skip",
        CVG_RELEASE_LOCAL_REHEARSAL: "true",
      }),
    ).toBe("skip");
  });
});
