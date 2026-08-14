import { randomBytes, randomUUID } from "node:crypto";
import { unlink, writeFile } from "node:fs/promises";
import { createServer } from "node:http";

import { eq, inArray, like } from "drizzle-orm";

import { createInvitation } from "../packages/application/dist/invitation-use-cases.js";
import { hashPassword } from "../packages/application/dist/password-auth.js";
import { createPostgresDatabase } from "../packages/persistence/dist/database.js";
import { createInvitationUseCaseDependencies } from "../packages/persistence/dist/invitation-repository.js";
import {
  accountInvitations,
  accounts,
  activityAssignments,
  appeals,
  answerIdempotency,
  answers,
  attemptIdempotency,
  attempts,
  assessmentIdempotency,
  assessmentResults,
  assessmentWorkflows,
  contentWithdrawalAffected,
  contentVersions,
  curriculumRuntimeStates,
  digitalCaseRuntimeStates,
  feedbackTickets,
  learningActivities,
  learningActivityItems,
  learningAssignments,
  outboxEvents,
  sessions,
} from "../packages/persistence/dist/schema.js";

const applicationDatabaseUrl =
  process.env.CVG_REAL_E2E_DATABASE_URL ??
  process.env.DATABASE_URL ??
  process.env.CVG_TEST_DATABASE_URL;
const adminDatabaseUrl = process.env.CVG_REAL_E2E_ADMIN_DATABASE_URL;
const fixtureFile =
  process.env.CVG_REAL_E2E_FIXTURE_FILE ?? "/tmp/cvg-real-e2e-fixture.json";
const port = Number(process.env.CVG_REAL_E2E_FIXTURE_PORT ?? "3102");
const host = process.env.CVG_REAL_E2E_FIXTURE_HOST ?? "127.0.0.1";

if (applicationDatabaseUrl === undefined) {
  throw new Error(
    "CVG_REAL_E2E_DATABASE_URL, DATABASE_URL or CVG_TEST_DATABASE_URL is required",
  );
}
if (adminDatabaseUrl === undefined) {
  throw new Error(
    "CVG_REAL_E2E_ADMIN_DATABASE_URL is required for fixture seed and cleanup",
  );
}
const applicationRole = new URL(applicationDatabaseUrl).username;
const adminRole = new URL(adminDatabaseUrl).username;
if (applicationRole === adminRole) {
  throw new Error(
    "fixture admin connection must use a role different from the API connection",
  );
}
if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error("CVG_REAL_E2E_FIXTURE_PORT is invalid");
}

const database = createPostgresDatabase(adminDatabaseUrl);
const adminId = randomUUID();
const scopeId = randomUUID();
const activityId = randomUUID();
const contentId = randomUUID();
const contentVersionId = randomUUID();
const token = randomBytes(32).toString("base64url");
const adminPassword = randomBytes(18).toString("base64url");
const participantPassword = randomBytes(18).toString("base64url");
let participantId;
let cleanupStarted = false;
let cleanupStep = "not_started";

async function seed() {
  await database.db.insert(accounts).values({
    id: adminId,
    professionalEmail: `real-e2e-admin-${adminId}@cvg.example`,
    status: "ACTIVE",
    passwordHash: await hashPassword(adminPassword),
    roles: ["ADMIN"],
    scopes: [scopeId],
  });

  const participantEmail = `real-e2e-participant-${activityId}@cvg.example`;
  const invitation = await createInvitation(
    {
      principalId: adminId,
      accountStatus: "ACTIVE",
      roles: ["ADMIN"],
      scopes: [scopeId],
      professionalEmail: participantEmail,
      invitedRoles: ["PARTICIPANT"],
      invitedScopes: [scopeId],
      expiresInSeconds: 3600,
      correlationId: randomUUID(),
      tokenFactory: () => token,
    },
    createInvitationUseCaseDependencies(database.db, randomUUID),
  );
  participantId = invitation.accountId;
  await database.db
    .update(accounts)
    .set({
      passwordHash: await hashPassword(participantPassword),
      status: "ACTIVE",
    })
    .where(eq(accounts.id, participantId));

  await database.db.insert(contentVersions).values({
    id: contentVersionId,
    contentId,
    scopeId,
    version: 1,
    status: "PUBLICADO",
    kind: "QUESTAO",
    title: "Resposta sintética",
    participantText: "Descreva a próxima ação segura.",
    responseMode: "TEXT",
  });
  await database.db.insert(learningActivities).values({
    id: activityId,
    scopeId,
    slug: `real-e2e-${activityId}`,
    title: "Atividade real sintética",
    status: "PUBLISHED",
  });
  await database.db.insert(learningActivityItems).values({
    activityId,
    contentVersionId,
    ordinal: 1,
  });
  await database.db.insert(activityAssignments).values({
    participantId,
    activityId,
    status: "DISPONIVEL",
  });

  await writeFile(
    fixtureFile,
    JSON.stringify({
      adminLogin: `real-e2e-admin-${adminId}@cvg.example`,
      adminPassword,
      login: participantEmail,
      password: participantPassword,
      activityId,
      itemId: contentVersionId,
    }),
    "utf8",
  );
}

async function cleanupStaleSyntheticResidue() {
  const staleAccounts = await database.db
    .select({ id: accounts.id })
    .from(accounts)
    .where(like(accounts.professionalEmail, "real-e2e-%"));
  const staleAccountIds = staleAccounts.map((row) => row.id);
  const staleActivities = await database.db
    .select({ id: learningActivities.id })
    .from(learningActivities)
    .where(like(learningActivities.slug, "real-e2e-%"));
  const staleActivityIds = staleActivities.map((row) => row.id);
  const staleContentVersionRows =
    staleActivityIds.length === 0
      ? []
      : await database.db
          .select({ contentVersionId: learningActivityItems.contentVersionId })
          .from(learningActivityItems)
          .where(inArray(learningActivityItems.activityId, staleActivityIds));
  const staleContentVersionIds = staleContentVersionRows.map(
    (row) => row.contentVersionId,
  );

  if (staleAccountIds.length > 0) {
    const staleAttempts = await database.db
      .select({ id: attempts.id })
      .from(attempts)
      .where(inArray(attempts.participantId, staleAccountIds));
    const staleAttemptIds = staleAttempts.map((row) => row.id);
    if (staleAttemptIds.length > 0) {
      await database.db
        .delete(assessmentIdempotency)
        .where(inArray(assessmentIdempotency.attemptId, staleAttemptIds));
      await database.db
        .delete(assessmentResults)
        .where(inArray(assessmentResults.attemptId, staleAttemptIds));
      await database.db
        .delete(assessmentWorkflows)
        .where(inArray(assessmentWorkflows.attemptId, staleAttemptIds));
      await database.db
        .delete(appeals)
        .where(inArray(appeals.attemptId, staleAttemptIds));
      await database.db
        .delete(answerIdempotency)
        .where(inArray(answerIdempotency.attemptId, staleAttemptIds));
      await database.db
        .delete(attemptIdempotency)
        .where(inArray(attemptIdempotency.attemptId, staleAttemptIds));
      await database.db
        .delete(answers)
        .where(inArray(answers.attemptId, staleAttemptIds));
      await database.db
        .delete(outboxEvents)
        .where(inArray(outboxEvents.aggregateId, staleAttemptIds));
      await database.db
        .delete(attempts)
        .where(inArray(attempts.id, staleAttemptIds));
    }
    await database.db
      .delete(sessions)
      .where(inArray(sessions.accountId, staleAccountIds));
    await database.db
      .delete(accountInvitations)
      .where(inArray(accountInvitations.accountId, staleAccountIds));
    await database.db
      .delete(accountInvitations)
      .where(inArray(accountInvitations.createdBy, staleAccountIds));
    await database.db
      .delete(activityAssignments)
      .where(inArray(activityAssignments.participantId, staleAccountIds));
    await database.db
      .delete(curriculumRuntimeStates)
      .where(inArray(curriculumRuntimeStates.participantId, staleAccountIds));
    await database.db
      .delete(digitalCaseRuntimeStates)
      .where(inArray(digitalCaseRuntimeStates.participantId, staleAccountIds));
    await database.db
      .delete(learningAssignments)
      .where(inArray(learningAssignments.participantId, staleAccountIds));
    await database.db
      .delete(assessmentWorkflows)
      .where(inArray(assessmentWorkflows.participantId, staleAccountIds));
    await database.db
      .delete(feedbackTickets)
      .where(inArray(feedbackTickets.participantId, staleAccountIds));
    await database.db
      .delete(appeals)
      .where(inArray(appeals.participantId, staleAccountIds));
    await database.db
      .delete(contentWithdrawalAffected)
      .where(inArray(contentWithdrawalAffected.participantId, staleAccountIds));
  }

  if (staleActivityIds.length > 0) {
    await database.db
      .delete(activityAssignments)
      .where(inArray(activityAssignments.activityId, staleActivityIds));
    await database.db
      .delete(learningActivityItems)
      .where(inArray(learningActivityItems.activityId, staleActivityIds));
    await database.db
      .delete(learningActivities)
      .where(inArray(learningActivities.id, staleActivityIds));
  }
  if (staleContentVersionIds.length > 0) {
    await database.db
      .delete(contentWithdrawalAffected)
      .where(
        inArray(
          contentWithdrawalAffected.contentVersionId,
          staleContentVersionIds,
        ),
      );
    await database.db
      .delete(contentVersions)
      .where(inArray(contentVersions.id, staleContentVersionIds));
  }
  if (staleAccountIds.length > 0) {
    await database.db
      .delete(accounts)
      .where(inArray(accounts.id, staleAccountIds));
  }
}

async function cleanup() {
  if (cleanupStarted) return;
  cleanupStarted = true;
  try {
    if (participantId !== undefined) {
      cleanupStep = "participant_attempts";
      const participantAttempts = await database.db
        .select({ id: attempts.id })
        .from(attempts)
        .where(eq(attempts.participantId, participantId));
      const attemptIds = participantAttempts.map((row) => row.id);
      if (attemptIds.length > 0) {
        await database.db
          .delete(answerIdempotency)
          .where(inArray(answerIdempotency.attemptId, attemptIds));
        await database.db
          .delete(attemptIdempotency)
          .where(inArray(attemptIdempotency.attemptId, attemptIds));
        await database.db
          .delete(answers)
          .where(inArray(answers.attemptId, attemptIds));
        await database.db
          .delete(outboxEvents)
          .where(inArray(outboxEvents.aggregateId, attemptIds));
        await database.db
          .delete(attempts)
          .where(inArray(attempts.id, attemptIds));
      }
      cleanupStep = "participant_sessions";
      await database.db
        .delete(sessions)
        .where(eq(sessions.accountId, participantId));
      await database.db
        .delete(accountInvitations)
        .where(eq(accountInvitations.accountId, participantId));
      cleanupStep = "participant_digital_case_runtime_states";
      await database.db
        .delete(digitalCaseRuntimeStates)
        .where(eq(digitalCaseRuntimeStates.participantId, participantId));
      cleanupStep = "participant_curriculum_runtime_states";
      await database.db
        .delete(curriculumRuntimeStates)
        .where(eq(curriculumRuntimeStates.participantId, participantId));
      cleanupStep = "participant_learning_assignments";
      await database.db
        .delete(learningAssignments)
        .where(eq(learningAssignments.participantId, participantId));
      await database.db
        .delete(activityAssignments)
        .where(eq(activityAssignments.participantId, participantId));
    }
    cleanupStep = "activity_items";
    await database.db
      .delete(learningActivityItems)
      .where(eq(learningActivityItems.activityId, activityId));
    cleanupStep = "activity";
    await database.db
      .delete(learningActivities)
      .where(eq(learningActivities.id, activityId));
    cleanupStep = "content";
    await database.db
      .delete(contentVersions)
      .where(eq(contentVersions.id, contentVersionId));
    if (participantId !== undefined) {
      cleanupStep = "participant_account";
      await database.db.delete(accounts).where(eq(accounts.id, participantId));
    }
    cleanupStep = "admin_sessions";
    await database.db.delete(sessions).where(eq(sessions.accountId, adminId));
    cleanupStep = "admin_account";
    await database.db.delete(accounts).where(eq(accounts.id, adminId));
  } catch (error) {
    console.error(
      JSON.stringify({
        status: "FAIL",
        code: "real_e2e_fixture_cleanup_step_failed",
        step: cleanupStep,
      }),
    );
    throw error;
  } finally {
    await database.close();
    await unlink(fixtureFile).catch(() => undefined);
  }
}

await cleanupStaleSyntheticResidue();
await seed();
const server = createServer((request, response) => {
  if (request.method === "GET" && request.url === "/ready") {
    response.statusCode = 200;
    response.setHeader("content-type", "application/json; charset=utf-8");
    response.end(JSON.stringify({ ready: true }));
    return;
  }
  response.statusCode = 404;
  response.end();
});

const shutdown = async () => {
  let exitCode = 0;
  try {
    await cleanup();
  } catch {
    console.error(
      JSON.stringify({
        status: "FAIL",
        code: "real_e2e_fixture_cleanup_failed",
      }),
    );
    exitCode = 1;
  } finally {
    server.close();
    server.closeAllConnections?.();
    process.exit(exitCode);
  }
};
process.once("SIGTERM", () => void shutdown());
process.once("SIGINT", () => void shutdown());
server.listen(port, host, () => {
  console.log("real E2E fixture ready");
});
