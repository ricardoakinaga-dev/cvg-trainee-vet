import { fileURLToPath } from "node:url";

import { sql } from "drizzle-orm";

import { createCurriculumMaterializationPlan } from "../packages/curriculum/dist/index.js";
import { createPostgresDatabase } from "../packages/persistence/dist/database.js";

const DEFAULT_AUTHOR_ID = "22222222-2222-4222-8222-222222222222";
const DEFAULT_AVAILABLE_AT = "2026-01-01T00:00:00.000Z";

export function buildCurriculumRuntimeExpectation({
  scopeId,
  authorId = DEFAULT_AUTHOR_ID,
  participantId,
  availableAt = DEFAULT_AVAILABLE_AT,
}) {
  const plan = createCurriculumMaterializationPlan({
    scopeId,
    authorId,
    participantId,
    availableAt,
  });
  return Object.freeze({
    scopeId,
    participantId,
    moduleCount: plan.modules.length,
    contentCount: plan.modules.reduce(
      (total, module) => total + module.items.length,
      0,
    ),
    moduleIds: Object.freeze(plan.modules.map((module) => module.moduleId)),
  });
}

export function validateCurriculumRuntimeSnapshot(
  snapshot,
  expectation,
  options = {},
) {
  const errors = [];
  const expectedAggregates = {
    activities: expectation.moduleCount,
    content: expectation.contentCount,
    editorial: expectation.contentCount,
    items: expectation.contentCount,
    assignments: expectation.moduleCount,
    runtime: expectation.moduleCount,
  };

  for (const [field, expected] of Object.entries(expectedAggregates)) {
    if (snapshot.aggregates?.[field] !== expected) {
      errors.push(`${field} count must equal ${expected}`);
    }
  }

  const contentStatusTotal = sumCounts(snapshot.contentStatuses);
  if (contentStatusTotal !== expectedAggregates.content) {
    errors.push("content status counts must equal content count");
  }

  const assignmentStatusTotal = sumCounts(snapshot.assignmentStatuses);
  if (assignmentStatusTotal !== expectedAggregates.assignments) {
    errors.push("assignment status counts must equal assignments count");
  }
  if (
    snapshot.assignmentStatuses?.NAO_ATRIBUIDO !==
    expectedAggregates.assignments
  ) {
    errors.push(
      `assignment status NAO_ATRIBUIDO must have count ${expectedAggregates.assignments}`,
    );
  }

  const runtimeStatusTotal = sumCounts(snapshot.runtimeStatuses);
  if (runtimeStatusTotal !== expectedAggregates.runtime) {
    errors.push("runtime status counts must equal runtime count");
  }
  if (snapshot.runtimeStatuses?.PENDENTE !== expectedAggregates.runtime) {
    errors.push(
      `runtime status PENDENTE must have count ${expectedAggregates.runtime}`,
    );
  }

  if (!sameValues(snapshot.assignmentModules, expectation.moduleIds)) {
    errors.push("assignment module set must contain exactly M01–M24");
  }
  if (!sameValues(snapshot.runtimeModules, expectation.moduleIds)) {
    errors.push("runtime module set must contain exactly M01–M24");
  }

  const unpublishedContent =
    expectedAggregates.content - (snapshot.contentStatuses?.PUBLICADO ?? 0);
  if (options.requireClinicalPublication === true && unpublishedContent > 0) {
    errors.push(
      `clinical publication is incomplete: ${unpublishedContent} items`,
    );
  }

  const status =
    errors.length > 0
      ? "FAIL"
      : unpublishedContent > 0
        ? "PASS_WITH_GAPS"
        : "PASS";
  return Object.freeze({
    status,
    errors: Object.freeze(errors),
    unpublishedContent,
    expected: Object.freeze(expectedAggregates),
  });
}

export async function runCurriculumRuntimeVerification(
  environment = process.env,
) {
  const databaseUrl = resolveDatabaseUrl(environment);
  const scopeId = requireEnvironment(environment, "CVG_CURRICULUM_SCOPE_ID");
  const participantId = requireEnvironment(
    environment,
    "CVG_CURRICULUM_PARTICIPANT_ID",
  );
  const expectation = buildCurriculumRuntimeExpectation({
    scopeId,
    participantId,
    authorId: environment.CVG_CURRICULUM_AUTHOR_ID ?? DEFAULT_AUTHOR_ID,
  });
  const database = createPostgresDatabase(databaseUrl, {
    maxConnections: 2,
    requireLeastPrivilege: false,
  });

  try {
    await database.healthcheck();
    const snapshot = await readCurriculumRuntimeSnapshot(
      database,
      scopeId,
      participantId,
    );
    const result = validateCurriculumRuntimeSnapshot(snapshot, expectation, {
      requireClinicalPublication:
        environment.CVG_CURRICULUM_REQUIRE_CLINICAL_PUBLICATION === "true",
    });
    const output = Object.freeze({
      ...result,
      mode: "live",
      scopeId,
      participantId,
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

async function readCurriculumRuntimeSnapshot(database, scopeId, participantId) {
  const aggregateRows = await database.db.execute(sql`
    select
      (select count(*)::int from learning_activities where scope_id = ${scopeId}) as "activities",
      (select count(*)::int from content_versions where scope_id = ${scopeId}) as "content",
      (select count(*)::int from content_editorial_records where scope_id = ${scopeId}) as "editorial",
      (select count(*)::int
       from learning_activity_items item
       inner join learning_activities activity on activity.id = item.activity_id
       where activity.scope_id = ${scopeId}) as "items",
      (select count(*)::int
       from learning_assignments
       where scope_id = ${scopeId} and participant_id = ${participantId}) as "assignments",
      (select count(*)::int
       from curriculum_runtime_states
       where scope_id = ${scopeId} and participant_id = ${participantId}) as "runtime"
  `);
  const aggregate = normalizeAggregate(aggregateRows[0]);
  const [contentStatuses, assignmentStatuses, runtimeStatuses] =
    await Promise.all([
      readStatusCounts(
        database,
        sql`select status, count(*)::int as "count"
            from content_versions where scope_id = ${scopeId} group by status`,
      ),
      readStatusCounts(
        database,
        sql`select status, count(*)::int as "count"
            from learning_assignments
            where scope_id = ${scopeId} and participant_id = ${participantId}
            group by status`,
      ),
      readStatusCounts(
        database,
        sql`select state ->> 'status' as status, count(*)::int as "count"
            from curriculum_runtime_states
            where scope_id = ${scopeId} and participant_id = ${participantId}
            group by state ->> 'status'`,
      ),
    ]);
  const [assignmentModules, runtimeModules] = await Promise.all([
    readModuleIds(
      database,
      sql`select module_id as "moduleId"
          from learning_assignments
          where scope_id = ${scopeId} and participant_id = ${participantId}
          order by module_id`,
    ),
    readModuleIds(
      database,
      sql`select module_id as "moduleId"
          from curriculum_runtime_states
          where scope_id = ${scopeId} and participant_id = ${participantId}
          order by module_id`,
    ),
  ]);

  return Object.freeze({
    aggregates: aggregate,
    contentStatuses,
    assignmentStatuses,
    runtimeStatuses,
    assignmentModules,
    runtimeModules,
  });
}

async function readStatusCounts(database, query) {
  const rows = await database.db.execute(query);
  return Object.freeze(
    Object.fromEntries(
      rows.map((row) => [String(row.status), Number(row.count)]),
    ),
  );
}

async function readModuleIds(database, query) {
  const rows = await database.db.execute(query);
  return Object.freeze(rows.map((row) => String(row.moduleId)));
}

function normalizeAggregate(row = {}) {
  return Object.freeze(
    Object.fromEntries(
      [
        "activities",
        "content",
        "editorial",
        "items",
        "assignments",
        "runtime",
      ].map((field) => [field, Number(row[field] ?? 0)]),
    ),
  );
}

function sumCounts(counts = {}) {
  return Object.values(counts).reduce(
    (total, count) => total + Number(count),
    0,
  );
}

function sameValues(left = [], right = []) {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

function requireEnvironment(environment, name) {
  const value = environment[name];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${name} is required`);
  }
  return value;
}

function resolveDatabaseUrl(environment) {
  const explicit = environment.CVG_CURRICULUM_VERIFY_DATABASE_URL;
  if (typeof explicit === "string" && explicit.trim() !== "") return explicit;
  if (environment.CVG_CURRICULUM_VERIFY_USE_DATABASE_URL === "true") {
    return requireEnvironment(environment, "DATABASE_URL");
  }
  throw new Error(
    "CVG_CURRICULUM_VERIFY_DATABASE_URL is required; use the explicit opt-in for DATABASE_URL",
  );
}

const isMain =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  runCurriculumRuntimeVerification().catch((error) => {
    console.error(
      error instanceof Error ? error.message : "verification failed",
    );
    process.exitCode = 1;
  });
}
