import { createHash, randomBytes, randomUUID } from "node:crypto";
import { unlink, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { URL } from "node:url";

import { and, eq, inArray } from "drizzle-orm";

import { createInvitation } from "../packages/application/dist/index.js";
import {
  createInvitationUseCaseDependencies,
  createPostgresDatabase,
} from "../packages/persistence/dist/index.js";
import {
  accountInvitations,
  accounts,
  activityAssignments,
  answerIdempotency,
  answers,
  attemptIdempotency,
  attempts,
  auditEntries,
  contentVersions,
  learningActivities,
  learningActivityItems,
  learningAssignments,
  outboxEvents,
  sessions,
} from "../packages/persistence/dist/schema.js";

const databaseUrl =
  process.env.DATABASE_URL ?? process.env.CVG_TEST_DATABASE_URL;
const fixtureDatabaseUrl =
  process.env.CVG_REAL_E2E_DATABASE_URL?.trim() ?? databaseUrl;
const fixtureFile =
  process.env.CVG_REAL_E2E_FIXTURE_FILE ?? "/tmp/cvg-real-e2e-fixture.json";
const port = Number(process.env.CVG_REAL_E2E_FIXTURE_PORT ?? "3102");

if (databaseUrl === undefined || fixtureDatabaseUrl === undefined) {
  throw new Error(
    "DATABASE_URL or CVG_TEST_DATABASE_URL is required for the API and fixture database",
  );
}
if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error("CVG_REAL_E2E_FIXTURE_PORT is invalid");
}

const database = createPostgresDatabase(fixtureDatabaseUrl);
const adminId = randomUUID();
const scopeId = randomUUID();
const contentId = randomUUID();
const contentVersionId = randomUUID();
const activitySlug = `synthetic-real-e2e-${randomUUID().replaceAll("-", "")}`;
const learningAssignmentId = randomUUID();
const token = randomBytes(32).toString("base64url");
const staffToken = randomBytes(32).toString("base64url");
const forbiddenParticipantToken = randomBytes(32).toString("base64url");
const foreignScopeId = randomUUID();
const expectedAnswer = "Resposta sintética persistida.";
let participantId;
let staffId;
let forbiddenParticipantId;
let activityId;
let attemptIds = [];
let closed = false;

async function seed() {
  await database.db.insert(accounts).values([
    {
      id: adminId,
      professionalEmail: `real-e2e-admin-${adminId}@cvg.example`,
      status: "ACTIVE",
    },
  ]);

  const invitation = await createInvitation(
    {
      principalId: adminId,
      accountStatus: "ACTIVE",
      roles: ["ADMIN"],
      scopes: [scopeId],
      professionalEmail: `real-e2e-participant-${contentId}@cvg.example`,
      invitedRoles: ["PARTICIPANT"],
      invitedScopes: [scopeId],
      expiresInSeconds: 3600,
      correlationId: randomUUID(),
      tokenFactory: () => token,
    },
    createInvitationUseCaseDependencies(database.db, randomUUID),
  );
  participantId = invitation.accountId;
  staffId = await inviteSyntheticAccount("MODERATOR", staffToken);
  forbiddenParticipantId = await inviteSyntheticAccount(
    "PARTICIPANT",
    forbiddenParticipantToken,
  );

  await database.db.insert(contentVersions).values({
    id: contentVersionId,
    contentId,
    scopeId,
    version: 1,
    status: "PUBLICADO",
    kind: "QUESTAO",
    title: "Atividade sintética do fixture",
    participantText: "Descreva uma próxima etapa em um exemplo fictício.",
    responseMode: "TEXT",
  });
  activityId = randomUUID();
  await database.db.insert(learningActivities).values({
    id: activityId,
    scopeId,
    slug: activitySlug,
    moduleId: "M02",
    sessionId: "M02-S1",
    title: "Atividade sintética do fixture",
    status: "PUBLISHED",
  });
  await database.db.insert(learningActivityItems).values({
    activityId,
    contentVersionId,
    ordinal: 1,
  });

  await database.db.insert(learningAssignments).values({
    id: learningAssignmentId,
    participantId,
    scopeId,
    moduleId: "M02",
    availableAt: new Date(),
    status: "DISPONIVEL",
    version: 0,
  });
  await database.db.insert(activityAssignments).values({
    participantId,
    activityId,
    learningAssignmentId,
    status: "DISPONIVEL",
  });

  await writeFile(
    fixtureFile,
    JSON.stringify({
      token,
      activityId,
      itemId: contentVersionId,
      activitySlug,
      expectedAnswer,
      source: "pre-provisioned-synthetic-activity-v1",
      assignmentSource: "pre-provisioned-learning-assignment-v1",
      staff: {
        token: staffToken,
        participantToken: forbiddenParticipantToken,
        scopeId,
        foreignScopeId,
      },
    }),
    "utf8",
  );
}

async function inviteSyntheticAccount(role, invitationToken) {
  const invitation = await createInvitation(
    {
      principalId: adminId,
      accountStatus: "ACTIVE",
      roles: ["ADMIN"],
      scopes: [scopeId],
      professionalEmail: `real-e2e-${role.toLowerCase()}-${randomUUID()}@cvg.example`,
      invitedRoles: [role],
      invitedScopes: [scopeId],
      expiresInSeconds: 3600,
      correlationId: randomUUID(),
      tokenFactory: () => invitationToken,
    },
    createInvitationUseCaseDependencies(database.db, randomUUID),
  );
  return invitation.accountId;
}

function fixtureAccountIds() {
  return [adminId, participantId, staffId, forbiddenParticipantId].filter(
    (id) => id !== undefined,
  );
}

async function readStaffEvidence() {
  if (staffId === undefined || forbiddenParticipantId === undefined) {
    return { verified: false };
  }
  const rows = await database.db
    .select({
      accountId: sessions.accountId,
      roles: sessions.roles,
      scopes: sessions.scopes,
      revokedAt: sessions.revokedAt,
    })
    .from(sessions)
    .where(inArray(sessions.accountId, [staffId, forbiddenParticipantId]));
  const invitations = await database.db
    .select({ acceptedAt: accountInvitations.acceptedAt })
    .from(accountInvitations)
    .where(
      inArray(accountInvitations.accountId, [staffId, forbiddenParticipantId]),
    );
  const moderator = rows.find((row) => row.accountId === staffId);
  const participant = rows.find(
    (row) => row.accountId === forbiddenParticipantId,
  );
  const matches = (row, role) =>
    row !== undefined &&
    JSON.stringify(row.roles) === JSON.stringify([role]) &&
    JSON.stringify(row.scopes) === JSON.stringify([scopeId]);
  const verified =
    rows.length === 2 &&
    invitations.length === 2 &&
    invitations.every((row) => row.acceptedAt !== null) &&
    matches(moderator, "MODERATOR") &&
    moderator.revokedAt !== null &&
    matches(participant, "PARTICIPANT") &&
    participant.revokedAt === null;
  return {
    verified,
    moderator:
      moderator === undefined
        ? null
        : {
            roles: moderator.roles,
            scopes: moderator.scopes,
            revoked: moderator.revokedAt !== null,
          },
    participant:
      participant === undefined
        ? null
        : {
            roles: participant.roles,
            scopes: participant.scopes,
          },
  };
}

async function readPersistenceEvidence(attemptId) {
  if (participantId === undefined || activityId === undefined) {
    return { verified: false };
  }

  const attemptRows = await database.db
    .select({
      status: attempts.status,
      version: attempts.version,
      submittedAt: attempts.submittedAt,
    })
    .from(attempts)
    .where(
      and(
        eq(attempts.id, attemptId),
        eq(attempts.participantId, participantId),
        eq(attempts.activityId, activityId),
      ),
    )
    .limit(1);
  const answerRows = await database.db
    .select({ itemId: answers.itemId, response: answers.response })
    .from(answers)
    .where(eq(answers.attemptId, attemptId));
  const attemptIdempotencyRows = await database.db
    .select({ key: attemptIdempotency.key })
    .from(attemptIdempotency)
    .where(eq(attemptIdempotency.attemptId, attemptId));
  const answerIdempotencyRows = await database.db
    .select({ key: answerIdempotency.key })
    .from(answerIdempotency)
    .where(eq(answerIdempotency.attemptId, attemptId));
  const outboxRows = await database.db
    .select({ eventType: outboxEvents.eventType })
    .from(outboxEvents)
    .where(eq(outboxEvents.aggregateId, attemptId));
  const auditRows = await database.db
    .select({ action: auditEntries.action })
    .from(auditEntries)
    .where(
      and(
        eq(auditEntries.principalId, participantId),
        eq(auditEntries.resourceId, attemptId),
      ),
    );
  const attempt = attemptRows[0];
  const answer = answerRows[0];
  const requiredAuditActions = [
    "ATTEMPT_STARTED",
    "ANSWER_SAVED",
    "ATTEMPT_SUBMITTED",
  ];
  const auditActions = [...new Set(auditRows.map((row) => row.action))].sort();
  const verified =
    attempt?.status === "SUBMETIDA" &&
    attempt.version >= 3 &&
    attempt.submittedAt !== null &&
    answerRows.length === 1 &&
    answer?.itemId === contentVersionId &&
    answer.response === expectedAnswer &&
    attemptIdempotencyRows.length === 2 &&
    answerIdempotencyRows.length === 1 &&
    outboxRows.some((row) => row.eventType === "answer.saved.v1") &&
    outboxRows.some((row) => row.eventType === "attempt.submitted.v1") &&
    requiredAuditActions.every((action) => auditActions.includes(action));

  return {
    verified,
    attempt:
      attempt === undefined
        ? null
        : {
            status: attempt.status,
            version: attempt.version,
            hasSubmittedAt: attempt.submittedAt !== null,
          },
    answer:
      answer === undefined
        ? null
        : { itemId: answer.itemId, response: answer.response },
    idempotency: {
      attempt: attemptIdempotencyRows.length,
      answer: answerIdempotencyRows.length,
    },
    outbox: {
      count: outboxRows.length,
      eventTypes: [...new Set(outboxRows.map((row) => row.eventType))].sort(),
    },
    audit: { actions: auditActions, count: auditRows.length },
  };
}

async function assertCleanupComplete() {
  const accountIds = fixtureAccountIds();
  const checks = [
    [
      "accounts",
      await database.db
        .select({ id: accounts.id })
        .from(accounts)
        .where(inArray(accounts.id, accountIds)),
    ],
    [
      "invitations",
      await database.db
        .select({ id: accountInvitations.id })
        .from(accountInvitations)
        .where(inArray(accountInvitations.accountId, accountIds)),
    ],
    [
      "sessions",
      await database.db
        .select({ id: sessions.id })
        .from(sessions)
        .where(inArray(sessions.accountId, accountIds)),
    ],
    [
      "learning_assignments",
      await database.db
        .select({ id: learningAssignments.id })
        .from(learningAssignments)
        .where(eq(learningAssignments.id, learningAssignmentId)),
    ],
    [
      "activity_assignments",
      activityId === undefined
        ? []
        : await database.db
            .select({ activityId: activityAssignments.activityId })
            .from(activityAssignments)
            .where(eq(activityAssignments.activityId, activityId)),
    ],
    [
      "attempts",
      participantId === undefined
        ? []
        : await database.db
            .select({ id: attempts.id })
            .from(attempts)
            .where(eq(attempts.participantId, participantId)),
    ],
    [
      "answers",
      await database.db
        .select({ id: answers.id })
        .from(answers)
        .where(eq(answers.itemId, contentVersionId)),
    ],
    [
      "attempt_idempotency",
      attemptIds.length === 0
        ? []
        : await database.db
            .select({ key: attemptIdempotency.key })
            .from(attemptIdempotency)
            .where(inArray(attemptIdempotency.attemptId, attemptIds)),
    ],
    [
      "answer_idempotency",
      attemptIds.length === 0
        ? []
        : await database.db
            .select({ key: answerIdempotency.key })
            .from(answerIdempotency)
            .where(inArray(answerIdempotency.attemptId, attemptIds)),
    ],
    [
      "activity_items",
      activityId === undefined
        ? []
        : await database.db
            .select({
              activityId: learningActivityItems.activityId,
              contentVersionId: learningActivityItems.contentVersionId,
            })
            .from(learningActivityItems)
            .where(eq(learningActivityItems.activityId, activityId)),
    ],
    [
      "activities",
      activityId === undefined
        ? []
        : await database.db
            .select({ id: learningActivities.id })
            .from(learningActivities)
            .where(eq(learningActivities.id, activityId)),
    ],
    [
      "content_versions",
      await database.db
        .select({ id: contentVersions.id })
        .from(contentVersions)
        .where(eq(contentVersions.id, contentVersionId)),
    ],
    [
      "content_outbox",
      await database.db
        .select({ id: outboxEvents.id })
        .from(outboxEvents)
        .where(eq(outboxEvents.aggregateId, contentId)),
    ],
    [
      "attempt_outbox",
      attemptIds.length === 0
        ? []
        : await database.db
            .select({ id: outboxEvents.id })
            .from(outboxEvents)
            .where(inArray(outboxEvents.aggregateId, attemptIds)),
    ],
  ];
  const residual = checks
    .filter(([, rows]) => rows.length > 0)
    .map(([name, rows]) => `${name}=${rows.length}`);
  if (residual.length > 0) {
    throw new Error(`fixture cleanup left rows: ${residual.join(", ")}`);
  }
  return Object.fromEntries(checks.map(([name, rows]) => [name, rows.length]));
}

async function cleanup() {
  if (closed) return;
  closed = true;
  try {
    if (participantId !== undefined) {
      const participantAttempts = await database.db
        .select({ id: attempts.id })
        .from(attempts)
        .where(eq(attempts.participantId, participantId));
      attemptIds = participantAttempts.map((row) => row.id);
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
      await database.db
        .delete(sessions)
        .where(eq(sessions.accountId, participantId));
      await database.db
        .delete(accountInvitations)
        .where(eq(accountInvitations.accountId, participantId));
      await database.db
        .delete(activityAssignments)
        .where(eq(activityAssignments.participantId, participantId));
      await database.db
        .delete(learningAssignments)
        .where(eq(learningAssignments.id, learningAssignmentId));
    }

    const materializedActivities = await database.db
      .select({ id: learningActivities.id })
      .from(learningActivities)
      .where(
        and(
          eq(learningActivities.scopeId, scopeId),
          eq(learningActivities.moduleId, "M02"),
          eq(learningActivities.sessionId, "M02-S1"),
        ),
      );
    const materializedActivityIds = materializedActivities.map((row) => row.id);
    if (materializedActivityIds.length > 0) {
      await database.db
        .delete(activityAssignments)
        .where(
          inArray(activityAssignments.activityId, materializedActivityIds),
        );
      await database.db
        .delete(learningActivityItems)
        .where(
          inArray(learningActivityItems.activityId, materializedActivityIds),
        );
      await database.db
        .delete(learningActivities)
        .where(inArray(learningActivities.id, materializedActivityIds));
    }

    await database.db
      .delete(outboxEvents)
      .where(eq(outboxEvents.aggregateId, contentId));
    await database.db
      .delete(contentVersions)
      .where(eq(contentVersions.id, contentVersionId));
    const accountIds = fixtureAccountIds();
    await database.db
      .delete(sessions)
      .where(inArray(sessions.accountId, accountIds));
    await database.db
      .delete(accountInvitations)
      .where(inArray(accountInvitations.accountId, accountIds));
    await database.db.delete(accounts).where(inArray(accounts.id, accountIds));
    const deletableEntities = await assertCleanupComplete();
    const retainedAuditRows = await database.db
      .select({
        id: auditEntries.id,
        principalId: auditEntries.principalId,
        action: auditEntries.action,
        resourceId: auditEntries.resourceId,
        scopeId: auditEntries.scopeId,
        requestId: auditEntries.requestId,
      })
      .from(auditEntries)
      .where(inArray(auditEntries.principalId, accountIds))
      .orderBy(auditEntries.id);
    const evidence = {
      verified: true,
      deletableEntities,
      retainedAudit: {
        count: retainedAuditRows.length,
        sha256: createHash("sha256")
          .update(JSON.stringify(retainedAuditRows))
          .digest("hex"),
        lifecycle: "append-only until disposable cluster destruction",
      },
    };
    console.log(JSON.stringify({ fixtureCleanup: evidence }));
    if (process.env.CVG_REAL_E2E_ARTIFACT_PREFIX !== undefined) {
      await writeFile(
        `${process.env.CVG_REAL_E2E_ARTIFACT_PREFIX}-fixture-cleanup.json`,
        JSON.stringify(evidence, null, 2) + "\n",
        { flag: "wx" },
      );
    }
  } finally {
    await database.close();
    await unlink(fixtureFile).catch(() => undefined);
  }
}

try {
  await seed();
} catch (error) {
  await cleanup();
  throw error;
}

const server = createServer((request, response) => {
  if (request.method === "GET" && request.url === "/staff-evidence") {
    void (async () => {
      try {
        const evidence = await readStaffEvidence();
        response.statusCode = evidence.verified ? 200 : 500;
        response.setHeader("content-type", "application/json; charset=utf-8");
        response.end(JSON.stringify(evidence));
      } catch {
        response.statusCode = 500;
        response.end(JSON.stringify({ verified: false }));
      }
    })();
    return;
  }
  if (request.method === "GET" && request.url === "/ready") {
    response.statusCode = 200;
    response.setHeader("content-type", "application/json; charset=utf-8");
    response.end(JSON.stringify({ ready: true }));
    return;
  }
  if (
    request.method === "GET" &&
    new URL(request.url ?? "/", "http://127.0.0.1").pathname === "/evidence"
  ) {
    void (async () => {
      const requestedAttemptId = new URL(
        request.url ?? "/evidence",
        "http://127.0.0.1",
      ).searchParams.get("attemptId");
      if (
        requestedAttemptId === null ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
          requestedAttemptId,
        )
      ) {
        response.statusCode = 400;
        response.setHeader("content-type", "application/json; charset=utf-8");
        response.end(JSON.stringify({ verified: false }));
        return;
      }
      try {
        const evidence = await readPersistenceEvidence(requestedAttemptId);
        response.statusCode = evidence.verified ? 200 : 500;
        response.setHeader("content-type", "application/json; charset=utf-8");
        response.end(JSON.stringify(evidence));
      } catch {
        response.statusCode = 500;
        response.setHeader("content-type", "application/json; charset=utf-8");
        response.end(JSON.stringify({ verified: false }));
      }
    })();
    return;
  }
  if (request.method === "GET" && request.url === "/shutdown") {
    void (async () => {
      let cleaned = true;
      try {
        await runCleanup();
      } catch (error) {
        console.error("real E2E fixture cleanup failed", error);
        cleaned = false;
      }
      response.statusCode = cleaned ? 200 : 500;
      response.setHeader("content-type", "application/json; charset=utf-8");
      response.end(JSON.stringify({ cleaned }));
      await closeServer().catch(() => undefined);
    })();
    return;
  }
  response.statusCode = 404;
  response.end();
});

let cleanupPromise;
let closeServerPromise;

function runCleanup() {
  cleanupPromise ??= cleanup();
  return cleanupPromise;
}

function closeServer() {
  if (closeServerPromise !== undefined) return closeServerPromise;
  if (!server.listening) return Promise.resolve();
  closeServerPromise = new Promise((resolve) => server.close(() => resolve()));
  return closeServerPromise;
}

const shutdown = async () => {
  await closeServer();
  await runCleanup();
};
process.once("SIGTERM", () => void shutdown());
process.once("SIGINT", () => void shutdown());
server.listen(port, "127.0.0.1", () => {
  console.log("real E2E fixture ready");
});
