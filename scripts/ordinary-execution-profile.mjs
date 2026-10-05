import { createHash } from "node:crypto";
import { isAbsolute } from "node:path";

/* global URL */
/** @typedef {{name:string,superuser:boolean,bypassRls:boolean,createDatabase:boolean,createRole:boolean,replication:boolean}} ObservedRole */
/** @typedef {{invocationId:string,startedAt:string,observedAt:string,sha:string,originalEnvironment:Record<string,string|undefined>,stagingEnvironment:Record<string,string|undefined>,qdrantUrl:string,pg:{kind:string,invocationId:string,directory:string,observedAt:string,applicationUrl:string,adminUrl:string,operatorUrl:string,applicationRole:ObservedRole,adminRole:ObservedRole},redis:{invocationId:string,url:string,binary:string,pid:number,serverPid:number,alive:boolean,initialRunId:string,runId:string,observedAt:string}}} OwnedRuntime */

const requireOwned = (condition, detail) => {
  if (!condition) throw new Error(`owned ordinary profile invalid: ${detail}`);
};
function endpoint(value, protocols) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("owned ordinary profile invalid: endpoint malformed");
  }
  requireOwned(
    protocols.includes(parsed.protocol) &&
      parsed.hostname === "127.0.0.1" &&
      /^[0-9]+$/u.test(parsed.port),
    "endpoint must identify owned loopback instance",
  );
  return parsed;
}
const pgInstance = (url) => [url.hostname, url.port, url.pathname].join("/");
const hash = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
function roleMatches(role, name, bypassRls) {
  return (
    role?.name === name &&
    role.superuser === false &&
    role.bypassRls === bypassRls &&
    role.createDatabase === false &&
    role.createRole === false &&
    role.replication === false
  );
}

/**
 * Validate local observations supplied by the runner and compose its child
 * environment. This pure function does not observe providers or authenticate
 * arbitrary supplied JSON. The runner must make the actual observations.
 * @param {OwnedRuntime} input
 */
export function prepareOrdinaryExecutionProfile(input) {
  requireOwned(
    /^[a-f0-9-]{36}$/u.test(input?.invocationId ?? "") &&
      /^[a-f0-9]{40}$/u.test(input?.sha ?? ""),
    "invocation/SHA missing",
  );
  const { pg, redis } = input;
  requireOwned(
    input.originalEnvironment &&
      input.stagingEnvironment &&
      Object.keys(input.stagingEnvironment).every(
        (key) =>
          key.startsWith("CVG_STAGING_") ||
          key === "NODE_TLS_REJECT_UNAUTHORIZED",
      ),
    "staging inputs cannot replace original CI identity",
  );
  requireOwned(
    pg?.kind === "owned-embedded" &&
      pg.invocationId === input.invocationId &&
      typeof pg.directory === "string" &&
      isAbsolute(pg.directory),
    "PostgreSQL ownership missing",
  );
  const app = endpoint(pg.applicationUrl, ["postgres:", "postgresql:"]);
  const admin = endpoint(pg.adminUrl, ["postgres:", "postgresql:"]);
  const operator = endpoint(pg.operatorUrl, ["postgres:", "postgresql:"]);
  requireOwned(
    app.username &&
      admin.username &&
      app.username !== admin.username &&
      app.pathname.length > 1 &&
      pgInstance(app) === pgInstance(admin) &&
      pgInstance(app) === pgInstance(operator),
    "database/role identities differ",
  );
  requireOwned(
    roleMatches(pg.applicationRole, decodeURIComponent(app.username), false),
    "application role capabilities differ",
  );
  requireOwned(
    roleMatches(pg.adminRole, decodeURIComponent(admin.username), true),
    "dedicated admin must be NOSUPERUSER/BYPASSRLS without DDL/role capabilities",
  );
  const redisEndpoint = endpoint(redis?.url, ["redis:"]);
  requireOwned(
    redis.invocationId === input.invocationId &&
      redis.alive === true &&
      Number.isSafeInteger(redis.pid) &&
      redis.pid > 0 &&
      redis.serverPid === redis.pid &&
      /^[a-f0-9]{40}$/u.test(redis.runId ?? "") &&
      redis.initialRunId === redis.runId &&
      isAbsolute(redis.binary),
    "Redis process/run ownership differs",
  );
  requireOwned(
    input.stagingEnvironment?.CVG_STAGING_REDIS_URL === redis.url,
    "staging Redis endpoint differs",
  );
  const start = Date.parse(input.startedAt),
    end = Date.parse(input.observedAt);
  const observed = [Date.parse(pg.observedAt), Date.parse(redis.observedAt)];
  requireOwned(
    [start, end, ...observed].every(Number.isFinite) &&
      start <= end &&
      observed.every((time) => start <= time && time <= end) &&
      end <= Date.now() &&
      Date.now() - end <= 60000,
    "chronology stale/reversed/outside invocation",
  );
  if (input.originalEnvironment.GITHUB_ACTIONS === "true")
    requireOwned(
      input.originalEnvironment.GITHUB_SHA === input.sha,
      "original CI SHA differs",
    );
  const provenance = {
    format: "cvg-ordinary-runtime-observation/v1",
    certification: "NOT_VERIFIED",
    invocationId: input.invocationId,
    sha: input.sha,
    startedAt: input.startedAt,
    observedAt: input.observedAt,
    pg: {
      kind: pg.kind,
      invocationId: pg.invocationId,
      directory: pg.directory,
      observedAt: pg.observedAt,
      applicationRole: { ...pg.applicationRole },
      adminRole: { ...pg.adminRole },
    },
    redis: {
      invocationId: redis.invocationId,
      pid: redis.pid,
      serverPid: redis.serverPid,
      alive: redis.alive,
      initialRunId: redis.initialRunId,
      runId: redis.runId,
      observedAt: redis.observedAt,
    },
    endpointFingerprint: hash({
      pg: pgInstance(app),
      app: app.username,
      admin: admin.username,
      redis: redisEndpoint.href,
    }),
  };
  /** @type {Record<string,string|undefined>} */
  const environment = {
    ...input.originalEnvironment,
    ...input.stagingEnvironment,
    CVG_RUN_LIVE_DB_TESTS: "true",
    CVG_RUN_LIVE_QDRANT_TESTS: "true",
    CVG_RUN_LIVE_REDIS_TESTS: "true",
    CVG_RUN_LIVE_RESTORE_TESTS: "true",
    CVG_RUN_RESTORE_MIGRATION_DRILL: "true",
    CVG_OWNED_DISPOSABLE_BINDING_DATABASE: "true",
    CVG_TEST_DATABASE_URL: pg.applicationUrl,
    CVG_TEST_ADMIN_DATABASE_URL: pg.adminUrl,
    CVG_MIGRATION_DATABASE_URL: pg.operatorUrl,
    CVG_TEST_QDRANT_URL: input.qdrantUrl,
    CVG_TEST_REDIS_URL: redis.url,
    CVG_REDIS_SERVER_BIN: redis.binary,
    CVG_ORDINARY_RUNTIME_RECEIPT: JSON.stringify(provenance),
  };
  return { environment, provenance };
}

/** @param {Record<string,string|undefined>} environment @param {string} executingSha */
export function validateOrdinaryRuntimeReceipt(environment, executingSha) {
  let receipt;
  try {
    receipt = JSON.parse(environment.CVG_ORDINARY_RUNTIME_RECEIPT ?? "");
  } catch {
    throw new Error(
      "owned ordinary profile invalid: runtime receipt missing/malformed",
    );
  }
  requireOwned(
    receipt?.format === "cvg-ordinary-runtime-observation/v1" &&
      receipt.certification === "NOT_VERIFIED",
    "receipt format missing",
  );
  requireOwned(
    receipt.sha === executingSha && /^[a-f0-9]{40}$/u.test(executingSha ?? ""),
    "receipt executing SHA differs",
  );
  const rebuilt = prepareOrdinaryExecutionProfile({
    invocationId: receipt.invocationId,
    sha: receipt.sha,
    startedAt: receipt.startedAt,
    observedAt: receipt.observedAt,
    originalEnvironment: environment,
    stagingEnvironment: Object.fromEntries(
      Object.entries(environment).filter(
        ([key]) =>
          key.startsWith("CVG_STAGING_") ||
          key === "NODE_TLS_REJECT_UNAUTHORIZED",
      ),
    ),
    qdrantUrl: environment.CVG_TEST_QDRANT_URL,
    pg: {
      ...receipt.pg,
      applicationUrl: environment.CVG_TEST_DATABASE_URL,
      adminUrl: environment.CVG_TEST_ADMIN_DATABASE_URL,
      operatorUrl: environment.CVG_MIGRATION_DATABASE_URL,
    },
    redis: {
      ...receipt.redis,
      url: environment.CVG_TEST_REDIS_URL,
      binary: environment.CVG_REDIS_SERVER_BIN,
    },
  });
  requireOwned(
    rebuilt.provenance.endpointFingerprint === receipt.endpointFingerprint,
    "receipt endpoint identity differs",
  );
  return rebuilt.provenance;
}
