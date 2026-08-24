import { randomBytes, randomUUID } from "node:crypto";
import { unlink, writeFile } from "node:fs/promises";
import { createServer } from "node:http";

import { eq, inArray } from "drizzle-orm";

import { createInvitation } from "../packages/application/dist/invitation-use-cases.js";
import { createPostgresDatabase } from "../packages/persistence/dist/database.js";
import { createInvitationUseCaseDependencies } from "../packages/persistence/dist/invitation-repository.js";
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
const activityId = randomUUID();
const contentId = randomUUID();
const contentVersionId = randomUUID();
const token = randomBytes(32).toString("base64url");
let participantId;
let closed = false;

async function seed() {
  await database.db.insert(accounts).values({
    id: adminId,
    professionalEmail: `real-e2e-admin-${adminId}@cvg.example`,
    status: "ACTIVE",
  });

  const invitation = await createInvitation(
    {
      principalId: adminId,
      accountStatus: "ACTIVE",
      roles: ["ADMIN"],
      scopes: [scopeId],
      professionalEmail: `real-e2e-participant-${activityId}@cvg.example`,
      invitedRoles: ["PARTICIPANT"],
      invitedScopes: [scopeId],
      expiresInSeconds: 3600,
      correlationId: randomUUID(),
      tokenFactory: () => token,
    },
    createInvitationUseCaseDependencies(database.db, randomUUID),
  );
  participantId = invitation.accountId;

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
    JSON.stringify({ token, activityId, itemId: contentVersionId }),
    "utf8",
  );
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
        .delete(auditEntries)
        .where(eq(auditEntries.principalId, participantId));
    }
    await database.db
      .delete(auditEntries)
      .where(eq(auditEntries.principalId, adminId));
    await database.db
      .delete(learningActivityItems)
      .where(eq(learningActivityItems.activityId, activityId));
    await database.db
      .delete(learningActivities)
      .where(eq(learningActivities.id, activityId));
    await database.db
      .delete(contentVersions)
      .where(eq(contentVersions.id, contentVersionId));
    if (participantId !== undefined) {
      await database.db.delete(accounts).where(eq(accounts.id, participantId));
    }
    await database.db.delete(accounts).where(eq(accounts.id, adminId));
  } finally {
    await database.close();
    await unlink(fixtureFile).catch(() => undefined);
  }
}

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
  await new Promise((resolve) => server.close(() => resolve()));
  await cleanup();
};
process.once("SIGTERM", () => void shutdown());
process.once("SIGINT", () => void shutdown());
server.listen(port, "127.0.0.1", () => {
  console.log("real E2E fixture ready");
});
