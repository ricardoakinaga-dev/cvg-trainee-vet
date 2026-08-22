import { describe, expect, it } from "vitest";

import {
  assertLocalImageSourceSha,
  assertSourceSha,
  assertLocalReleaseRehearsalEnabled,
  buildLocalReleaseEnvironment,
  buildLocalReleaseScriptSequence,
  classifyLocalCompatibilityMatrix,
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
  assertMutationGateClosed,
  buildCanaryProbeArgs,
  buildDeployRolloutPlan,
  buildOutboxDrainProbeArgs,
  buildRollbackRolloutPlan,
  buildRuntimeContainerNames,
  assertCanaryGate,
  createCanaryGateState,
  recordCanaryProbe,
  RELEASE_HEALTH_SERVICES,
  assertReleaseServicesHealthy,
  assertReleaseServicesStoppedCleanly,
  assertRollbackServicesQuiescent,
  assertOutboxDrained,
  parseComposePsHealthOutput,
  resolveReleasePullMode,
} from "../../scripts/release-execution.mjs";

describe("local release rehearsal contract", () => {
  it("resolves a validated immutable rehearsal configuration", () => {
    const configuration = resolveLocalRehearsalConfiguration({
      CVG_RUN_LOCAL_RELEASE_REHEARSAL: "true",
      CVG_SOURCE_SHA: "a".repeat(40),
      CVG_LOCAL_RELEASE_IMAGE: "cvg-trainee-vet:local",
      CVG_RELEASE_MUTATION_GATE_CLOSED: "true",
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
      workerRolloutStrategy: "DRAIN_N_MINUS_1_BEFORE_N",
      mutationGateStrategy: "REQUIRED_CLOSED_DURING_WORKER_CUTOVER",
      qdrantIdentity: "disabled",
      rollbackQdrantIdentity: "disabled",
      workerDrainSeconds: 30,
      canaryStableProbes: 3,
    });
  });

  it("fails closed without the worker cutover and stable Qdrant identity policy", () => {
    const manifest = createLocalReleaseManifest({
      releaseDigest: `sha256:${"a".repeat(64)}`,
      rollbackDigest: `sha256:${"b".repeat(64)}`,
      sourceSha: "a".repeat(40),
      rollbackSourceSha: "b".repeat(40),
    });

    expect(() =>
      assertReleaseManifest({
        ...manifest,
        workerRolloutStrategy: undefined,
      }),
    ).toThrow("release manifest field workerRolloutStrategy is required");
    expect(() =>
      assertReleaseManifest({
        ...manifest,
        workerRolloutStrategy: "MIXED_N_N_MINUS_1",
      }),
    ).toThrow("workerRolloutStrategy must drain N-1 before N");
    expect(() =>
      assertReleaseManifest({
        ...manifest,
        rollbackQdrantIdentity: "content-v2:model-v2:index-v2",
      }),
    ).toThrow("Qdrant identity must remain unchanged during worker cutover");
    expect(() =>
      assertReleaseManifest({
        ...manifest,
        qdrantIdentity: "content-v1:model-v1:index-v1",
        rollbackQdrantIdentity: "content-v1:model-v1:index-v1",
      }),
    ).toThrow("Qdrant identity changes require a versioned alias rollout");
  });

  it("requires a closed external mutation gate for executable cutover", () => {
    expect(() => assertMutationGateClosed({})).toThrow(
      "CVG_RELEASE_MUTATION_GATE_CLOSED=true is required",
    );
    expect(() =>
      assertMutationGateClosed({ CVG_RELEASE_MUTATION_GATE_CLOSED: "false" }),
    ).toThrow("CVG_RELEASE_MUTATION_GATE_CLOSED=true is required");
    expect(
      assertMutationGateClosed({ CVG_RELEASE_MUTATION_GATE_CLOSED: "true" }),
    ).toBe(true);
  });

  it("drains both old workers before migration and proves both N workers before API N", () => {
    const manifest = createLocalReleaseManifest({
      releaseDigest: `sha256:${"a".repeat(64)}`,
      rollbackDigest: `sha256:${"b".repeat(64)}`,
      sourceSha: "a".repeat(40),
      rollbackSourceSha: "b".repeat(40),
    });
    const plan = buildDeployRolloutPlan(manifest);

    expect(plan.map(({ id }) => id)).toEqual([
      "prove-n-minus-1-baseline",
      "close-edge-mutation-gate",
      "drain-n-minus-1-workers",
      "prove-n-minus-1-workers-drained",
      "expand-contract-migration",
      "start-n-workers",
      "prove-n-workers",
      "prove-api-peer-n-minus-1",
      "start-api-canary",
      "prove-api-canary-and-n-workers",
      "probe-api-canary",
      "start-api-peer",
      "prove-promotion",
      "promote-edge",
    ]);
    expect(plan[0]).toMatchObject({ services: RELEASE_HEALTH_SERVICES });
    expect(plan[1]).toMatchObject({
      args: ["stop", "-t", "30", "edge"],
      services: ["edge"],
    });
    expect(plan[2]).toMatchObject({
      args: ["stop", "-t", "30", "worker-a", "worker-b"],
      services: ["worker-a", "worker-b"],
    });
    expect(plan[3]).toMatchObject({ services: ["worker-a", "worker-b"] });
    expect(plan[5]).toMatchObject({
      args: ["up", "-d", "--no-build", "worker-a", "worker-b"],
      services: ["worker-a", "worker-b"],
    });
    expect(plan[6]).toMatchObject({ services: ["worker-a", "worker-b"] });
    expect(plan[7]).toMatchObject({ services: ["api-b"] });
    expect(plan[9]).toMatchObject({
      services: ["api-a", "worker-a", "worker-b"],
    });
    expect(Object.isFrozen(plan)).toBe(true);
    expect(plan.every((step) => Object.isFrozen(step))).toBe(true);
  });

  it("drains both N workers before recreating the complete rollback set", () => {
    const manifest = createLocalReleaseManifest({
      releaseDigest: `sha256:${"a".repeat(64)}`,
      rollbackDigest: `sha256:${"b".repeat(64)}`,
      sourceSha: "a".repeat(40),
      rollbackSourceSha: "b".repeat(40),
    });

    expect(buildRollbackRolloutPlan(manifest)).toEqual([
      expect.objectContaining({
        id: "inspect-n-workers-for-recovery",
        services: ["worker-a", "worker-b"],
      }),
      expect.objectContaining({
        id: "close-edge-mutation-gate",
        args: ["stop", "-t", "30", "edge"],
      }),
      expect.objectContaining({
        id: "drain-n-workers",
        args: ["stop", "-t", "30", "worker-a", "worker-b"],
      }),
      expect.objectContaining({
        id: "prove-n-workers-drained",
        services: ["worker-a", "worker-b"],
      }),
      expect.objectContaining({
        id: "prove-outbox-drained-before-n-minus-1",
        args: buildOutboxDrainProbeArgs(),
      }),
      expect.objectContaining({
        id: "start-n-minus-1-workers",
        args: ["up", "-d", "--no-build", "worker-a", "worker-b"],
      }),
      expect.objectContaining({
        id: "prove-n-minus-1-workers",
        services: ["worker-a", "worker-b"],
      }),
      expect.objectContaining({
        id: "start-rollback-api-canary",
        args: ["up", "-d", "--no-build", "api-a"],
      }),
      expect.objectContaining({
        id: "prove-rollback-api-canary-and-workers",
        services: ["api-a", "worker-a", "worker-b"],
      }),
      expect.objectContaining({ id: "probe-rollback-api-canary" }),
      expect.objectContaining({
        id: "start-rollback-api-peer",
        args: ["up", "-d", "--no-build", "api-b"],
      }),
      expect.objectContaining({
        id: "prove-rollback-promotion",
        services: RELEASE_HEALTH_SERVICES,
      }),
      expect.objectContaining({
        id: "restore-edge",
        args: ["up", "-d", "--no-build", "edge"],
      }),
    ]);
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
    expect(() => buildLocalReleaseEnvironment({ PATH: "/usr/bin" })).toThrow(
      "CVG_RELEASE_MUTATION_GATE_CLOSED=true is required",
    );
    expect(
      buildLocalReleaseEnvironment({
        PATH: "/usr/bin",
        CVG_RELEASE_MUTATION_GATE_CLOSED: "true",
      }),
    ).toMatchObject({
      CVG_RELEASE_EXECUTE: "true",
      CVG_RELEASE_LOCAL_REHEARSAL: "true",
      CVG_RELEASE_PULL: "skip",
      CVG_RELEASE_MUTATION_GATE_CLOSED: "true",
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

  it("restores the local N runtime through the same safe deploy plan", () => {
    expect(buildLocalReleaseScriptSequence()).toEqual([
      "rollback",
      "deploy",
      "rollback",
      "deploy",
    ]);
    expect(Object.isFrozen(buildLocalReleaseScriptSequence())).toBe(true);
  });

  it("does not claim an N/N-1 matrix for a synthetic same-source rollback", () => {
    expect(
      classifyLocalCompatibilityMatrix({
        sourceSha: "a".repeat(40),
        rollbackSourceSha: "a".repeat(40),
      }),
    ).toBe("NOT_PROVEN");
    expect(
      classifyLocalCompatibilityMatrix({
        sourceSha: "a".repeat(40),
        rollbackSourceSha: "b".repeat(40),
      }),
    ).toBe("VERSIONED_IMAGES_ONLY");
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

  it("requires both stopped workers to have exited without a forced kill", () => {
    const clean = ["worker-a", "worker-b"].map((service) => ({
      Service: service,
      State: "exited",
      ExitCode: 0,
    }));

    expect(
      assertReleaseServicesStoppedCleanly(clean, {
        phase: "drain",
        services: ["worker-a", "worker-b"],
      }),
    ).toMatchObject({ status: "PASS", phase: "drain" });
    expect(() =>
      assertReleaseServicesStoppedCleanly(
        clean.map((record) =>
          record.Service === "worker-b" ? { ...record, ExitCode: 137 } : record,
        ),
        { phase: "drain", services: ["worker-a", "worker-b"] },
      ),
    ).toThrow("drain graceful-stop gate failed (worker-b: exited/137)");
    expect(() =>
      assertReleaseServicesStoppedCleanly(clean.slice(0, 1), {
        phase: "drain",
        services: ["worker-a", "worker-b"],
      }),
    ).toThrow("worker-b: missing/missing");
  });

  it("lets rollback recover a worker that was already failed but not force-kill a running one", () => {
    const running = ["worker-a", "worker-b"].map((service) => ({
      Service: service,
      State: "running",
      ExitCode: 0,
    }));
    const stopped = [
      { Service: "worker-a", State: "exited", ExitCode: 0 },
      { Service: "worker-b", State: "exited", ExitCode: 137 },
    ];

    expect(() =>
      assertRollbackServicesQuiescent(running, stopped, {
        services: ["worker-a", "worker-b"],
      }),
    ).toThrow("rollback quiescence gate failed (worker-b: running→exited/137)");
    expect(
      assertRollbackServicesQuiescent(
        [running[0], { Service: "worker-b", State: "exited", ExitCode: 137 }],
        stopped,
        { services: ["worker-a", "worker-b"] },
      ),
    ).toMatchObject({
      status: "PASS_WITH_RECOVERY",
      recoveredServices: ["worker-b"],
    });
  });

  it("requires an empty pending/processing outbox before starting N-1 workers", () => {
    expect(buildOutboxDrainProbeArgs()).toEqual([
      "exec",
      "-T",
      "postgres",
      "sh",
      "-ec",
      expect.stringContaining("status in ('PENDING', 'PROCESSING')"),
    ]);
    expect(assertOutboxDrained("0\n")).toEqual({
      status: "PASS",
      pendingOrProcessing: 0,
    });
    expect(() => assertOutboxDrained("1\n")).toThrow(
      "rollback outbox drain gate failed (1 active events)",
    );
    expect(() => assertOutboxDrained("invalid\n")).toThrow(
      "rollback outbox drain probe returned invalid output",
    );
  });
});
