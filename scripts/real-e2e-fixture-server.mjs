import { randomBytes, randomUUID } from "node:crypto";
import { unlink, writeFile } from "node:fs/promises";
import { createServer } from "node:http";

import { and, eq, inArray } from "drizzle-orm";

import {
  advanceContent,
  createInvitation,
  reviewAuthoringContent,
} from "../packages/application/dist/index.js";
import {
  createAuthoringRepository,
  createContentUseCaseDependencies,
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
  contentEditorialRecords,
  contentReviewDecisions,
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
const reviewerId = randomUUID();
const scopeId = randomUUID();
const contentId = randomUUID();
const contentVersionId = randomUUID();
const editorialRecordId = randomUUID();
const token = randomBytes(32).toString("base64url");
let participantId;
let activityId;
let closed = false;

async function seed() {
  await database.db.insert(accounts).values([
    {
      id: adminId,
      professionalEmail: `real-e2e-admin-${adminId}@cvg.example`,
      status: "ACTIVE",
    },
    {
      id: reviewerId,
      professionalEmail: `real-e2e-reviewer-${reviewerId}@cvg.example`,
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

  const bankItem = {
    title: "Resposta sintética",
    prompt: "Descreva a próxima ação segura.",
    responseMode: "TEXT",
    rubric: {
      dimensions: [
        {
          id: "safe-next-step",
          label: "Próxima ação segura",
          description: "Explicita uma ação verificável e uma reavaliação.",
          maxPoints: 1,
        },
      ],
      passScore: 1,
      criticalErrors: ["Não definir uma ação ou reavaliação."],
    },
    feedback: "Defina uma ação segura, uma meta e o momento de reavaliar.",
    critical: false,
    remediationTargetObjectiveId: "M02-OBJ-01",
    sourceRefs: [
      {
        code: "CVG-E2E-SYNTHETIC",
        locator: "fixture-internal://authoring/publication",
        updateRequired: false,
      },
    ],
    participant: {
      id: contentId,
      ordinal: 1,
      kind: "QUESTAO",
      title: "Resposta sintética",
      prompt: "Descreva a próxima ação segura.",
      responseMode: "TEXT",
    },
  };
  const preflight = {
    ruleVersion: "authoring-preflight-v1",
    technicalChecksPassed: true,
    readyForClinicalReview: true,
    readyForPublication: false,
    checks: {
      requiredFields: true,
      correctionMetadata: true,
      publicBoundary: true,
      sourceTraceability: true,
      publicationBlocked: true,
    },
    checkedAt: new Date().toISOString(),
  };

  await database.db.insert(contentVersions).values({
    id: contentVersionId,
    contentId,
    scopeId,
    version: 1,
    status: "EM_REVISAO_CLINICA",
    kind: "QUESTAO",
    title: "Atividade real sintética",
    participantText: bankItem.prompt,
    responseMode: "TEXT",
  });
  await database.db.insert(contentEditorialRecords).values({
    id: editorialRecordId,
    contentVersionId,
    contentId,
    scopeId,
    version: 1,
    moduleId: "M02",
    sessionId: "M02-S1",
    objectiveId: "M02-OBJ-01",
    authorId: adminId,
    item: bankItem,
    preflight,
  });

  const authoringRepository = createAuthoringRepository(database.db);
  const contentDependencies = createContentUseCaseDependencies(
    database.db,
    randomUUID,
  );
  await reviewAuthoringContent(
    {
      principalId: reviewerId,
      accountStatus: "ACTIVE",
      roles: ["AUTHOR", "CLINICAL_APPROVER"],
      scopes: [scopeId],
      approvedClinicalApproverId: reviewerId,
      contentId,
      version: 1,
      scopeId,
      decision: "APROVAR_CLINICAMENTE",
      rationale: "Revisão sintética do fixture concluída.",
      correlationId: randomUUID(),
    },
    {
      repository: authoringRepository,
      transition: (command) => advanceContent(command, contentDependencies),
    },
  );
  await advanceContent(
    {
      principalId: reviewerId,
      accountStatus: "ACTIVE",
      roles: ["AUTHOR", "CLINICAL_APPROVER"],
      scopes: [scopeId],
      approvedClinicalApproverId: reviewerId,
      contentId,
      version: 1,
      scopeId,
      event: "VERIFICAR_PROJECAO",
      correlationId: randomUUID(),
    },
    contentDependencies,
  );
  await advanceContent(
    {
      principalId: reviewerId,
      accountStatus: "ACTIVE",
      roles: ["CLINICAL_APPROVER"],
      scopes: [scopeId],
      approvedClinicalApproverId: reviewerId,
      contentId,
      version: 1,
      scopeId,
      event: "AUTORIZAR_PUBLICACAO",
      correlationId: randomUUID(),
    },
    contentDependencies,
  );
  await advanceContent(
    {
      principalId: reviewerId,
      accountStatus: "ACTIVE",
      roles: ["CLINICAL_APPROVER"],
      scopes: [scopeId],
      approvedClinicalApproverId: reviewerId,
      contentId,
      version: 1,
      scopeId,
      event: "PUBLICAR",
      correlationId: randomUUID(),
    },
    contentDependencies,
  );

  const materializedActivities = await database.db
    .select({
      id: learningActivities.id,
      slug: learningActivities.slug,
      status: learningActivities.status,
    })
    .from(learningActivities)
    .where(
      and(
        eq(learningActivities.scopeId, scopeId),
        eq(learningActivities.moduleId, "M02"),
        eq(learningActivities.sessionId, "M02-S1"),
      ),
    )
    .limit(1);
  const materializedActivity = materializedActivities[0];
  if (
    materializedActivity === undefined ||
    materializedActivity.status !== "PUBLISHED"
  ) {
    throw new Error("authoring publication did not materialize an activity");
  }
  activityId = materializedActivity.id;

  const materializedItems = await database.db
    .select({ contentVersionId: learningActivityItems.contentVersionId })
    .from(learningActivityItems)
    .where(eq(learningActivityItems.activityId, activityId));
  if (
    materializedItems.length !== 1 ||
    materializedItems[0]?.contentVersionId !== contentVersionId
  ) {
    throw new Error(
      "authoring publication did not materialize the fixture item",
    );
  }

  await database.db.insert(activityAssignments).values({
    participantId,
    activityId,
    status: "DISPONIVEL",
  });

  await writeFile(
    fixtureFile,
    JSON.stringify({
      token,
      activityId,
      itemId: contentVersionId,
      activitySlug: materializedActivity.slug,
      source: "authoring-publication-v1",
    }),
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
      .delete(auditEntries)
      .where(eq(auditEntries.principalId, adminId));
    await database.db
      .delete(auditEntries)
      .where(eq(auditEntries.principalId, reviewerId));
    await database.db
      .delete(contentReviewDecisions)
      .where(eq(contentReviewDecisions.contentVersionId, contentVersionId));
    await database.db
      .delete(contentEditorialRecords)
      .where(eq(contentEditorialRecords.contentVersionId, contentVersionId));
    await database.db
      .delete(contentVersions)
      .where(eq(contentVersions.id, contentVersionId));
    if (participantId !== undefined) {
      await database.db.delete(accounts).where(eq(accounts.id, participantId));
    }
    await database.db.delete(accounts).where(eq(accounts.id, reviewerId));
    await database.db.delete(accounts).where(eq(accounts.id, adminId));
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
