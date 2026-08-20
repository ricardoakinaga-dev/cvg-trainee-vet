import { createCurriculumMaterializationPlan } from "../packages/curriculum/dist/index.js";
import { createPostgresDatabase } from "../packages/persistence/dist/database.js";
import {
  assertMembership,
  createMaterializationReport,
} from "./materialize-curriculum-support.mjs";
import {
  loadCurriculumIdentities,
  materializeCurriculum,
} from "./materialize-curriculum-persistence.mjs";

const databaseUrl =
  process.env.CVG_CURRICULUM_ADMIN_DATABASE_URL ?? process.env.DATABASE_URL;
const scopeId = process.env.CVG_CURRICULUM_SCOPE_ID;
const authorId = process.env.CVG_CURRICULUM_AUTHOR_ID;
const participantId = process.env.CVG_CURRICULUM_PARTICIPANT_ID;
const availableAt =
  process.env.CVG_CURRICULUM_AVAILABLE_AT ?? new Date().toISOString();

if (databaseUrl === undefined) {
  throw new Error(
    "CVG_CURRICULUM_ADMIN_DATABASE_URL or DATABASE_URL is required",
  );
}
if (
  scopeId === undefined ||
  authorId === undefined ||
  participantId === undefined
) {
  throw new Error(
    "CVG_CURRICULUM_SCOPE_ID, CVG_CURRICULUM_AUTHOR_ID and CVG_CURRICULUM_PARTICIPANT_ID are required",
  );
}

async function main() {
  const database = createPostgresDatabase(databaseUrl, {
    maxConnections: 2,
    requireLeastPrivilege: false,
  });
  try {
    await database.healthcheck();
    const plan = createCurriculumMaterializationPlan({
      scopeId,
      authorId,
      participantId,
      availableAt,
    });
    const identities = await loadCurriculumIdentities(database, plan);
    assertMembership(identities.author, authorId, "author", scopeId);
    assertMembership(
      identities.participant,
      participantId,
      "participant",
      scopeId,
    );
    const counts = await database.db.transaction((transaction) =>
      materializeCurriculum(transaction, plan),
    );

    console.log(JSON.stringify(createMaterializationReport(plan, counts)));
  } finally {
    await database.close();
  }
}

await main();
