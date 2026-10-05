import { describe, expect, it } from "vitest";
import {
  prepareOrdinaryExecutionProfile,
  validateOrdinaryRuntimeReceipt,
} from "../../scripts/ordinary-execution-profile.mjs";

function runtimeFixture() {
  const invocationId = "11111111-1111-4111-8111-111111111111";
  const startedAt = new Date(Date.now() - 10000).toISOString();
  const observedAt = new Date(Date.now() - 1000).toISOString();
  const role = (name: string, bypassRls: boolean) => ({
    name,
    superuser: false,
    bypassRls,
    createDatabase: false,
    createRole: false,
    replication: false,
  });
  return {
    invocationId,
    startedAt,
    observedAt,
    sha: "a".repeat(40),
    originalEnvironment: {
      ORIGINAL_TEST_SENTINEL: "explicit synthetic IO fixture",
      CVG_OWNED_DISPOSABLE_BINDING_DATABASE: "false",
    },
    stagingEnvironment: {
      CVG_STAGING_API_A_URL: "http://127.0.0.1:3101",
      CVG_STAGING_API_B_URL: "http://127.0.0.1:3112",
      CVG_STAGING_TLS_URL: "https://127.0.0.1:3443",
      CVG_STAGING_EVIDENCE_DIR: "/synthetic/evidence",
      CVG_STAGING_OTEL_SPANS_FILE: "/synthetic/evidence/spans.json",
      CVG_STAGING_REDIS_URL: "redis://127.0.0.1:6391",
    },
    pg: {
      kind: "owned-embedded" as const,
      invocationId,
      directory: "/synthetic/owned-pg",
      observedAt,
      applicationUrl: "postgresql://app@127.0.0.1:5432/owned",
      adminUrl: "postgresql://admin@127.0.0.1:5432/owned",
      operatorUrl: "postgresql://operator@127.0.0.1:5432/owned",
      applicationRole: role("app", false),
      adminRole: role("admin", true),
    },
    redis: {
      invocationId,
      url: "redis://127.0.0.1:6391",
      binary: "/synthetic/redis-server",
      pid: 1234,
      serverPid: 1234,
      alive: true,
      initialRunId: "b".repeat(40),
      runId: "b".repeat(40),
      observedAt,
    },
    qdrantUrl: "http://127.0.0.1:6333",
  };
}
describe("R10 owned ordinary profile pure observations; explicitly synthetic fixtures only", () => {
  it.each([
    "valid",
    "missing",
    "malformed",
    "empty",
    "different endpoint",
    "invented fingerprint",
    "different executing SHA",
  ])("writer receipt retains local observation scope for %s", (scenario) => {
    const profile = prepareOrdinaryExecutionProfile(runtimeFixture());
    if (scenario === "missing")
      Reflect.deleteProperty(
        profile.environment,
        "CVG_ORDINARY_RUNTIME_RECEIPT",
      );
    if (scenario === "malformed")
      profile.environment.CVG_ORDINARY_RUNTIME_RECEIPT = "{";
    if (scenario === "empty")
      profile.environment.CVG_ORDINARY_RUNTIME_RECEIPT = "{}";
    if (scenario === "different endpoint")
      profile.environment.CVG_TEST_ADMIN_DATABASE_URL =
        "postgresql://admin@127.0.0.1:5432/other";
    if (scenario === "invented fingerprint")
      profile.environment.CVG_ORDINARY_RUNTIME_RECEIPT = JSON.stringify({
        ...profile.provenance,
        endpointFingerprint: "f".repeat(64),
      });
    const executingSha =
      scenario === "different executing SHA"
        ? "c".repeat(40)
        : profile.provenance.sha;
    if (scenario === "valid")
      expect(
        Reflect.apply(validateOrdinaryRuntimeReceipt, undefined, [
          profile.environment,
          executingSha,
        ]),
      ).toEqual(profile.provenance);
    else
      expect(() =>
        Reflect.apply(validateOrdinaryRuntimeReceipt, undefined, [
          profile.environment,
          executingSha,
        ]),
      ).toThrow(/owned ordinary profile/u);
  });
  it("preserves original environment and declares all gates only for coherent owned observations", () => {
    const input = runtimeFixture();
    const result = prepareOrdinaryExecutionProfile(input);
    expect(result.provenance.certification).toBe("NOT_VERIFIED");
    expect(result.environment.ORIGINAL_TEST_SENTINEL).toBe(
      input.originalEnvironment.ORIGINAL_TEST_SENTINEL,
    );
    for (const flag of [
      "CVG_RUN_LIVE_DB_TESTS",
      "CVG_RUN_LIVE_QDRANT_TESTS",
      "CVG_RUN_LIVE_REDIS_TESTS",
      "CVG_RUN_LIVE_RESTORE_TESTS",
      "CVG_RUN_RESTORE_MIGRATION_DRILL",
      "CVG_OWNED_DISPOSABLE_BINDING_DATABASE",
    ])
      expect(result.environment[flag]).toBe("true");
    expect(result.environment.CVG_TEST_ADMIN_DATABASE_URL).toBe(
      input.pg.adminUrl,
    );
    expect(result.environment.CVG_TEST_REDIS_URL).toBe(input.redis.url);
    expect(
      input.originalEnvironment.CVG_OWNED_DISPOSABLE_BINDING_DATABASE,
    ).toBe("false");
  });
  it.each([
    "staging identity override",
    "external PG",
    "unowned PG",
    "wrong invocation PG",
    "missing directory",
    "same app/admin",
    "different database",
    "admin superuser",
    "admin no bypass",
    "admin createdb",
    "wrong admin role",
    "app superuser",
    "app bypass",
    "wrong app role",
    "unowned Redis",
    "wrong server PID",
    "dead child",
    "changed run ID",
    "empty run ID",
    "noninteger PID",
    "external Redis",
    "wrong Redis URL",
    "relative Redis binary",
    "future observation",
    "reversed observation",
    "stale PG",
    "stale Redis",
    "invalid SHA",
  ])("rejects %s without certifying supplied observations", (scenario) => {
    const input = runtimeFixture();
    const valid = prepareOrdinaryExecutionProfile(input);
    expect(valid.provenance.certification).toBe("NOT_VERIFIED");
    if (scenario === "staging identity override")
      Reflect.set(input.stagingEnvironment, "GITHUB_SHA", "f".repeat(40));
    if (scenario === "external PG") Reflect.set(input.pg, "kind", "external");
    if (scenario === "unowned PG")
      Reflect.deleteProperty(input.pg, "invocationId");
    if (scenario === "wrong invocation PG") input.pg.invocationId = "other";
    if (scenario === "missing directory") input.pg.directory = "";
    if (scenario === "same app/admin")
      input.pg.adminUrl = input.pg.applicationUrl;
    if (scenario === "different database")
      input.pg.adminUrl = "postgresql://admin@127.0.0.1:5432/other";
    if (scenario === "admin superuser") input.pg.adminRole.superuser = true;
    if (scenario === "admin no bypass") input.pg.adminRole.bypassRls = false;
    if (scenario === "admin createdb") input.pg.adminRole.createDatabase = true;
    if (scenario === "wrong admin role") input.pg.adminRole.name = "other";
    if (scenario === "app superuser") input.pg.applicationRole.superuser = true;
    if (scenario === "app bypass") input.pg.applicationRole.bypassRls = true;
    if (scenario === "wrong app role") input.pg.applicationRole.name = "other";
    if (scenario === "unowned Redis") input.redis.invocationId = "other";
    if (scenario === "wrong server PID") input.redis.serverPid = 999;
    if (scenario === "dead child") input.redis.alive = false;
    if (scenario === "changed run ID") input.redis.runId = "c".repeat(40);
    if (scenario === "empty run ID") input.redis.runId = "";
    if (scenario === "noninteger PID") input.redis.pid = 1.5;
    if (scenario === "external Redis")
      input.redis.url = "redis://remote.invalid:6379";
    if (scenario === "wrong Redis URL")
      input.redis.url = "redis://127.0.0.1:6392";
    if (scenario === "relative Redis binary")
      input.redis.binary = "redis-server";
    if (scenario === "future observation")
      input.observedAt = new Date(Date.now() + 60000).toISOString();
    if (scenario === "reversed observation")
      input.startedAt = new Date().toISOString();
    if (scenario === "stale PG") input.pg.observedAt = "2020-01-01T00:00:00Z";
    if (scenario === "stale Redis")
      input.redis.observedAt = "2020-01-01T00:00:00Z";
    if (scenario === "invalid SHA") input.sha = "invented";
    expect(() => prepareOrdinaryExecutionProfile(input)).toThrow(
      /owned ordinary profile/u,
    );
  });
});
