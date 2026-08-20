import { describe, expect, it } from "vitest";

import {
  assertLocalImageSourceSha,
  assertSourceSha,
  assertLocalReleaseRehearsalEnabled,
  buildLocalReleaseEnvironment,
  resolveLocalRehearsalConfiguration,
  createLocalReleaseManifest,
  parseRepositoryDigest,
  resolveLocalRollbackImage,
} from "../../scripts/local-release-rehearsal.mjs";
import {
  assertDistinctRollbackProvenance,
  assertReleaseManifest,
} from "../../scripts/release-manifest.mjs";
import {
  buildCanaryProbeArgs,
  buildRuntimeContainerNames,
  assertCanaryGate,
  createCanaryGateState,
  recordCanaryProbe,
  RELEASE_HEALTH_SERVICES,
  assertReleaseServicesHealthy,
  parseComposePsHealthOutput,
  resolveReleasePullMode,
} from "../../scripts/release-execution.mjs";

describe("local release rehearsal contract", () => {
  it("resolves a validated immutable rehearsal configuration", () => {
    const configuration = resolveLocalRehearsalConfiguration({
      CVG_RUN_LOCAL_RELEASE_REHEARSAL: "true",
      CVG_SOURCE_SHA: "a".repeat(40),
      CVG_LOCAL_RELEASE_IMAGE: "cvg-trainee-vet:local",
      CVG_CANARY_HEALTH_URL: "http://127.0.0.1:3180/health/ready",
    });

    expect(configuration).toMatchObject({
      sourceSha: "a".repeat(40),
      localImage: "cvg-trainee-vet:local",
      rollbackSourceImage: null,
      requireVersionedRollback: false,
      composeFile: "infra/production/docker-compose.ha.yml",
      composeEnvFile: "infra/production/.env.local",
      project: "cvg-trainee-vet-ha",
      healthTarget: "http://127.0.0.1:3180/health/ready",
    });
    expect(Object.isFrozen(configuration)).toBe(true);
  });

  it("requires an explicit source SHA and matching image provenance", () => {
    const sourceSha = "a".repeat(40);

    expect(() => assertSourceSha(undefined)).toThrow(
      "local release rehearsal requires CVG_SOURCE_SHA to be a 40-character git SHA",
    );
    expect(() => assertSourceSha("unknown")).toThrow(
      "local release rehearsal requires CVG_SOURCE_SHA to be a 40-character git SHA",
    );
    expect(assertSourceSha(sourceSha)).toBe(sourceSha);

    expect(() =>
      assertLocalImageSourceSha({
        expectedSourceSha: sourceSha,
        actualSourceSha: "unknown",
      }),
    ).toThrow(
      "local image source SHA does not match the requested release SHA",
    );
    expect(() =>
      assertLocalImageSourceSha({
        expectedSourceSha: sourceSha,
        actualSourceSha: "b".repeat(40),
      }),
    ).toThrow(
      "local image source SHA does not match the requested release SHA",
    );
    expect(
      assertLocalImageSourceSha({
        expectedSourceSha: sourceSha,
        actualSourceSha: sourceSha,
      }),
    ).toBe(sourceSha);
  });

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
      sourceSha: "a".repeat(40),
      rollbackSourceSha: "b".repeat(40),
    });

    expect(assertReleaseManifest(manifest)).toMatchObject({
      releaseId: "cvg-local-rehearsal",
      image: "cvg-trainee-vet",
      imageDigest:
        "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      rollbackImageDigest:
        "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      sourceSha: "a".repeat(40),
      rollbackSourceSha: "b".repeat(40),
      canaryStableProbes: 3,
    });
  });

  it("requires an explicit source binding and canary stability policy", () => {
    expect(() =>
      createLocalReleaseManifest({
        releaseDigest: `sha256:${"a".repeat(64)}`,
        rollbackDigest: `sha256:${"b".repeat(64)}`,
      }),
    ).toThrow("release manifest field sourceSha is required");

    let state = createCanaryGateState({ stableProbes: 3 });
    state = recordCanaryProbe(state, false);
    state = recordCanaryProbe(state, true);
    state = recordCanaryProbe(state, true);
    expect(() => assertCanaryGate(state)).toThrow(
      "canary health gate did not recover",
    );

    state = recordCanaryProbe(state, true);
    expect(assertCanaryGate(state)).toMatchObject({
      status: "PASS",
      consecutiveSuccesses: 3,
      transientFailures: 1,
    });

    expect(() => createCanaryGateState({ stableProbes: 0 })).toThrow(
      "canaryStableProbes must be between 1 and 60",
    );
    expect(() => recordCanaryProbe(state, "yes" as never)).toThrow(
      "canary probe state is invalid",
    );
  });

  it("resets the stability window after a recovered probe fails again", () => {
    let state = createCanaryGateState({ stableProbes: 3 });
    for (const probe of [true, true, false, true, true]) {
      state = recordCanaryProbe(state, probe);
    }

    expect(() => assertCanaryGate(state)).toThrow(
      "canary health gate did not recover",
    );
  });

  it("requires distinct source versions for a versioned rollback", () => {
    const manifest = createLocalReleaseManifest({
      releaseDigest: `sha256:${"a".repeat(64)}`,
      rollbackDigest: `sha256:${"b".repeat(64)}`,
      sourceSha: "a".repeat(40),
      rollbackSourceSha: "a".repeat(40),
    });

    expect(() => assertDistinctRollbackProvenance(manifest)).toThrow(
      "rollback source SHA must differ from the release source SHA",
    );

    expect(buildRuntimeContainerNames("cvg-trainee-vet-ha", ["api-a"])).toEqual(
      ["cvg-trainee-vet-ha-api-a-1"],
    );
    expect(() =>
      buildRuntimeContainerNames("Invalid Project", ["api-a"]),
    ).toThrow("runtime provenance project or services are invalid");
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

  it("probes the named canary container directly instead of the shared edge", () => {
    expect(
      buildCanaryProbeArgs({ service: "api-a", healthPath: "/health/ready" }),
    ).toEqual([
      "exec",
      "-T",
      "api-a",
      "node",
      "-e",
      expect.stringContaining("http://127.0.0.1:3000/health/ready"),
    ]);
  });

  it("requires every API and worker replica to be running and healthy", () => {
    const healthyRecords = RELEASE_HEALTH_SERVICES.map((service) => ({
      Service: service,
      State: "running",
      Health: "healthy",
    }));
    const output = healthyRecords
      .map((record) => JSON.stringify(record))
      .join("\n");

    expect(parseComposePsHealthOutput(output)).toEqual(healthyRecords);
    expect(
      assertReleaseServicesHealthy(parseComposePsHealthOutput(output), {
        phase: "deploy",
      }),
    ).toMatchObject({
      phase: "deploy",
      services: RELEASE_HEALTH_SERVICES,
    });

    for (const service of RELEASE_HEALTH_SERVICES) {
      const unhealthyRecords = healthyRecords.map((record) =>
        record.Service === service
          ? { ...record, Health: "unhealthy" }
          : record,
      );

      expect(() =>
        assertReleaseServicesHealthy(unhealthyRecords, { phase: "rollback" }),
      ).toThrow(`rollback health gate failed (${service}: running/unhealthy)`);
    }
  });

  it("fails closed for a stopped or missing HA process", () => {
    const stopped = RELEASE_HEALTH_SERVICES.map((service) => ({
      Service: service,
      State: service === "worker-a" ? "exited" : "running",
      Health: service === "worker-a" ? "none" : "healthy",
    }));

    expect(() =>
      assertReleaseServicesHealthy(stopped, { phase: "deploy" }),
    ).toThrow("deploy health gate failed (worker-a: exited/none)");

    expect(() =>
      assertReleaseServicesHealthy(stopped.slice(0, -1), { phase: "deploy" }),
    ).toThrow("worker-b: missing/missing");
  });
});
