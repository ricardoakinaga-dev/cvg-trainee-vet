import { fileURLToPath } from "node:url";

import { sql } from "drizzle-orm";

import { createPostgresDatabase } from "../packages/persistence/dist/database.js";

const RELEASED_CONTENT_STATUSES = sql`(
  'APROVADO_CLINICAMENTE',
  'AUTORIZADO_PARA_PUBLICACAO',
  'PUBLICADO',
  'RETIRADO',
  'VENCIDO'
)`;

export function summarizeClinicalReviewQueueSnapshot(snapshot, options = {}) {
  const errors = [];
  const fields = [
    "total",
    "pending",
    "approved",
    "adjustmentsRequested",
    "unreviewed",
    "technicalFailures",
  ];
  for (const field of fields) {
    if (!Number.isSafeInteger(snapshot[field]) || snapshot[field] < 0) {
      errors.push(`${field} must be a non-negative integer`);
    }
  }
  if (snapshot.pending > snapshot.total) {
    errors.push("pending review count cannot exceed total content count");
  }
  if (snapshot.unreviewed > snapshot.pending) {
    errors.push("unreviewed count cannot exceed pending review count");
  }
  if (
    options.expectedTotal !== undefined &&
    snapshot.total !== options.expectedTotal
  ) {
    errors.push(
      `clinical review queue total must equal ${options.expectedTotal}`,
    );
  }
  if (snapshot.technicalFailures > 0) {
    errors.push(
      `pending items have failed technical preflight: ${snapshot.technicalFailures}`,
    );
  }
  if (options.requireComplete === true && snapshot.pending > 0) {
    errors.push(
      `clinical review queue is incomplete: ${snapshot.pending} pending items`,
    );
  }
  const status =
    errors.length > 0
      ? "FAIL"
      : snapshot.pending > 0
        ? "PASS_WITH_GAPS"
        : "PASS";
  return Object.freeze({
    ...snapshot,
    errors: Object.freeze(errors),
    status,
  });
}

export async function runClinicalReviewQueueVerification(
  environment = process.env,
) {
  const databaseUrl = resolveDatabaseUrl(environment);
  const scopeId = requireEnvironment(
    environment,
    "CVG_CLINICAL_REVIEW_SCOPE_ID",
  );
  const database = createPostgresDatabase(databaseUrl, {
    maxConnections: 2,
    requireLeastPrivilege: false,
  });
  try {
    await database.healthcheck();
    const snapshot = await readClinicalReviewQueueSnapshot(database, scopeId);
    const result = summarizeClinicalReviewQueueSnapshot(snapshot, {
      ...(environment.CVG_CLINICAL_REVIEW_EXPECTED_TOTAL === undefined
        ? {}
        : {
            expectedTotal: parsePositiveInteger(
              environment.CVG_CLINICAL_REVIEW_EXPECTED_TOTAL,
              "CVG_CLINICAL_REVIEW_EXPECTED_TOTAL",
            ),
          }),
      requireComplete:
        environment.CVG_CLINICAL_REVIEW_REQUIRE_COMPLETE === "true",
      requireTechnicalPreflight:
        environment.CVG_CLINICAL_REVIEW_REQUIRE_TECHNICAL_PREFLIGHT === "true",
    });
    const output = Object.freeze({
      ...result,
      mode: "live",
      scopeId,
      observed: snapshot,
    });
    console.log(JSON.stringify(output));
    if (result.status === "FAIL") {
      throw new Error(result.errors.join("; "));
    }
    return output;
  } finally {
    await database.close();
  }
}

function latestReviewsSql(scopeId) {
  return sql`
    select distinct on (content_id, version, scope_id)
      content_id, version, scope_id, decision, reviewed_at
    from content_review_decisions
    where scope_id = ${scopeId}
    order by content_id, version, scope_id, reviewed_at desc, created_at desc
  `;
}

function queueRowsSql(scopeId) {
  return sql`
    select
      editorial.module_id as module_id,
      version.status as content_status,
      latest.decision as latest_decision,
      coalesce(editorial.preflight ->> 'technicalChecksPassed', 'false')
        = 'true' as technical_checks_passed
    from content_editorial_records editorial
    inner join content_versions version
      on version.id = editorial.content_version_id
    left join latest_reviews latest
      on latest.content_id = editorial.content_id
      and latest.version = editorial.version
      and latest.scope_id = editorial.scope_id
    where editorial.scope_id = ${scopeId}
  `;
}

function queueCountsSql(scopeId) {
  return sql`
    with latest_reviews as (${latestReviewsSql(scopeId)}),
    queue as (${queueRowsSql(scopeId)})
    select
      count(*)::int as total,
      count(*) filter (
        where content_status not in ${RELEASED_CONTENT_STATUSES}
        and (latest_decision is null or latest_decision = 'SOLICITAR_AJUSTES')
      )::int as pending,
      count(*) filter (where latest_decision = 'APROVAR_CLINICAMENTE')::int
        as approved,
      count(*) filter (where latest_decision = 'SOLICITAR_AJUSTES')::int
        as adjustments_requested,
      count(*) filter (
        where content_status not in ${RELEASED_CONTENT_STATUSES}
        and latest_decision is null
      )::int as unreviewed,
      count(*) filter (
        where content_status not in ${RELEASED_CONTENT_STATUSES}
        and (latest_decision is null or latest_decision = 'SOLICITAR_AJUSTES')
        and not technical_checks_passed
      )::int as technical_failures
    from queue
  `;
}

function pendingByModuleSql(scopeId) {
  return sql`
    with latest_reviews as (${latestReviewsSql(scopeId)})
    select editorial.module_id as "moduleId", count(*)::int as "count"
    from content_editorial_records editorial
    inner join content_versions version
      on version.id = editorial.content_version_id
    left join latest_reviews latest
      on latest.content_id = editorial.content_id
      and latest.version = editorial.version
      and latest.scope_id = editorial.scope_id
    where editorial.scope_id = ${scopeId}
      and version.status not in ${RELEASED_CONTENT_STATUSES}
      and (latest.decision is null or latest.decision = 'SOLICITAR_AJUSTES')
    group by editorial.module_id
    order by editorial.module_id
  `;
}

async function readQueueCounts(database, scopeId) {
  const rows = await database.db.execute(queueCountsSql(scopeId));
  return rows[0] ?? {};
}

async function readPendingByModule(database, scopeId) {
  return database.db.execute(pendingByModuleSql(scopeId));
}

export function buildClinicalReviewQueueSnapshot(row, moduleRows) {
  return Object.freeze({
    total: normalizeCount(row.total),
    pending: normalizeCount(row.pending),
    approved: normalizeCount(row.approved),
    adjustmentsRequested: normalizeCount(row.adjustments_requested),
    unreviewed: normalizeCount(row.unreviewed),
    technicalFailures: normalizeCount(row.technical_failures),
    pendingByModule: Object.freeze(
      Object.fromEntries(
        moduleRows.map((module) => [
          String(module.moduleId),
          normalizeCount(module.count),
        ]),
      ),
    ),
  });
}

async function readClinicalReviewQueueSnapshot(database, scopeId) {
  const row = await readQueueCounts(database, scopeId);
  const moduleRows = await readPendingByModule(database, scopeId);
  return buildClinicalReviewQueueSnapshot(row, moduleRows);
}

function normalizeCount(value) {
  const count = Number(value ?? 0);
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error("clinical review queue count is invalid");
  }
  return count;
}

function parsePositiveInteger(value, field) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${field} must be a positive integer`);
  }
  return parsed;
}

function requireEnvironment(environment, name) {
  const value = environment[name];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${name} is required`);
  }
  return value;
}

function resolveDatabaseUrl(environment) {
  const explicit = environment.CVG_CLINICAL_REVIEW_VERIFY_DATABASE_URL;
  if (typeof explicit === "string" && explicit.trim() !== "") return explicit;
  if (environment.CVG_CLINICAL_REVIEW_VERIFY_USE_DATABASE_URL === "true") {
    return requireEnvironment(environment, "DATABASE_URL");
  }
  throw new Error(
    "CVG_CLINICAL_REVIEW_VERIFY_DATABASE_URL is required; use the explicit opt-in for DATABASE_URL",
  );
}

const isMain =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  runClinicalReviewQueueVerification().catch((error) => {
    console.error(
      error instanceof Error ? error.message : "verification failed",
    );
    process.exitCode = 1;
  });
}
