import { randomUUID, randomBytes, createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { setTimeout } from "node:timers/promises";
import { createApiRuntime } from "../../apps/api/dist/main.js";
import { describe, expect, it } from "vitest";
import {
  startAttempt,
  saveAnswer,
  submitAttempt,
} from "../../packages/application/dist/index.js";
import { createCurriculumModuleEvaluationUseCase } from "../../packages/persistence/src/curriculum-evaluation-repository.js";
import { createAnswerUseCaseDependencies } from "../../packages/persistence/src/answer-repository.js";
import { setDatabaseSecurityContext } from "../../packages/persistence/src/security-context.js";
import {
  answers,
  contentVersions,
  curriculumRuntimeStates,
  curriculumFormVersions,
  attempts,
  accounts,
  accountInvitations,
  activityAssignments,
  learningAssignments,
  learningActivities,
  learningActivityItems,
} from "../../packages/persistence/src/schema.js";
import { provisionCurriculumForm } from "./curriculum-native-fixtures.js";
import {
  closeLivePostgresHarness,
  liveDatabaseUrl,
  openLivePostgresHarness,
  type LivePostgresHarness,
} from "./live-postgres-harness.js";

async function withHarness(
  work: (harness: LivePostgresHarness) => Promise<void>,
) {
  if (process.env.CVG_OWNED_DISPOSABLE_BINDING_DATABASE !== "true")
    throw new Error(
      "Immutable synthetic fixtures require an owned disposable database",
    );
  const harness = await openLivePostgresHarness();
  try {
    expect(harness.applicationRole).toMatchObject({
      isSuperuser: false,
      bypassesRls: false,
    });
    expect(harness.adminRole).toMatchObject({
      isSuperuser: false,
      bypassesRls: true,
    });
    await work(harness);
  } finally {
    await closeLivePostgresHarness(harness);
  }
}

async function submittedFixture(harness: LivePostgresHarness, fill = false) {
  const f = await provisionCurriculumForm(harness);
  const started = await startAttempt(f.command, f.dependencies);
  if (fill)
    await harness.application.db.transaction(async (tx) => {
      await setDatabaseSecurityContext(tx, f);
      await tx.insert(answers).values(
        f.formItems.map((item) => ({
          id: randomUUID(),
          attemptId: started.attemptId,
          itemId: item.contentVersionId,
          savedAt: new Date(),
          response:
            item.publicItem.responseMode === "CHOICE"
              ? "synthetic-a"
              : "Synthetic technical human response",
        })),
      );
    });
  await saveAnswer(
    {
      attemptId: started.attemptId,
      itemId: f.formItems[0]!.contentVersionId,
      response: "synthetic-a",
      participantId: f.participantId,
      activityId: f.activityId,
      scopeId: f.scopeId,
      idempotencyKey: `save-${started.attemptId}`,
      correlationId: randomUUID(),
      savedAt: new Date().toISOString(),
    },
    createAnswerUseCaseDependencies(harness.application.db, randomUUID),
  );
  const submitted = await submitAttempt(
    {
      ...f.command,
      attemptId: started.attemptId,
      idempotencyKey: `submit-${started.attemptId}`,
      submittedAt: new Date().toISOString(),
    },
    f.dependencies,
  );
  return {
    ...f,
    submitted,
    evaluationCommand: {
      participantId: f.participantId,
      scopeId: f.scopeId,
      moduleId: "M02",
      attemptId: submitted.attemptId,
      attemptVersion: submitted.version,
      formVersion: 1,
    },
  };
}

function latch() {
  let resolve = () => {};
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, release: () => resolve() };
}

async function waitForLock(
  harness: LivePostgresHarness,
  kind: "relation" | "advisory",
) {
  const deadline = Date.now() + 4_000;
  while (Date.now() < deadline) {
    const rows = await harness.admin.db.execute<{ pid: number }>(sql`
      select pid from pg_locks where not granted and locktype = ${kind}
        and (${kind} = 'advisory' or relation = 'curriculum_runtime_states'::regclass)
      order by pid`);
    if (rows.length) return rows[0]!.pid;
    await setTimeout(20);
  }
  throw new Error(`Actual native ${kind} lock overlap was not observed`);
}

describe.skipIf(
  process.env.CVG_RUN_LIVE_DB_TESTS !== "true" || liveDatabaseUrl === undefined,
)(
  "native frozen curriculum evaluation (synthetic technical publication only)",
  () => {
    it.each([
      ["<", ">"],
      [">", "<"],
    ])(
      "denies a MULTIPLE catalog starting with %s whose alternate selection ordering violates the plain response contract",
      async (id, secondId) => {
        await withHarness(async (harness) => {
          const f = await provisionCurriculumForm(harness, 33, {
            id,
            secondId,
            selectionMode: "MULTIPLE",
          });
          await expect(
            startAttempt(f.command, f.dependencies),
          ).rejects.toMatchObject({ code: "state_conflict" });
          expect(
            await harness.admin.db
              .select()
              .from(attempts)
              .where(eq(attempts.participantId, f.participantId)),
          ).toHaveLength(0);
          expect(
            await harness.admin.db
              .select()
              .from(curriculumRuntimeStates)
              .where(
                eq(curriculumRuntimeStates.participantId, f.participantId),
              ),
          ).toHaveLength(0);
        });
      },
    );
    it("denies a synthetic FORMATIVE choice-only publication before creating an unevaluable attempt", async () => {
      await withHarness(async (harness) => {
        const f = await provisionCurriculumForm(harness, 33, {
          id: "synthetic-a",
          selectionMode: "SINGLE",
          formativeChoiceOnly: true,
        });
        expect(f.formItems).toHaveLength(31);
        await expect(
          startAttempt(f.command, f.dependencies),
        ).rejects.toMatchObject({ code: "state_conflict" });
        expect(
          await harness.admin.db
            .select()
            .from(attempts)
            .where(eq(attempts.participantId, f.participantId)),
        ).toHaveLength(0);
        expect(
          await harness.admin.db
            .select()
            .from(curriculumRuntimeStates)
            .where(eq(curriculumRuntimeStates.participantId, f.participantId)),
        ).toHaveLength(0);
      });
    });
    it.each(["SINGLE", "MULTIPLE"] as const)(
      "captures and persists offered valid %s responses containing individual angle characters",
      async (selectionMode) => {
        await withHarness(async (harness) => {
          const ids =
            selectionMode === "SINGLE" ? ["<", ">"] : ["a>b", "plain-key"];
          const f = await provisionCurriculumForm(harness, 33, {
            id: ids[0]!,
            secondId: ids[1]!,
            selectionMode,
          });
          const started = await startAttempt(f.command, f.dependencies);
          const response =
            selectionMode === "SINGLE"
              ? ids[0]!
              : JSON.stringify([...ids].reverse());
          const saved = await saveAnswer(
            {
              attemptId: started.attemptId,
              participantId: f.participantId,
              scopeId: f.scopeId,
              activityId: f.activityId,
              itemId: f.formItems[0]!.contentVersionId,
              response,
              idempotencyKey: `native-angle-save-${started.attemptId}`,
              correlationId: randomUUID(),
              savedAt: new Date().toISOString(),
            },
            createAnswerUseCaseDependencies(harness.application.db, randomUUID),
          );
          expect(saved.attempt.status).toBe("SALVA");
          expect(saved.answer).toMatchObject({
            itemId: f.formItems[0]!.contentVersionId,
            response,
          });
          const persisted = await harness.admin.db
            .select()
            .from(answers)
            .where(eq(answers.attemptId, started.attemptId));
          expect(persisted).toHaveLength(1);
          expect(persisted[0]!.response).toBe(response);
        });
      },
    );
    it.each(["SINGLE", "MULTIPLE"] as const)(
      "denies capture of an unanswerable published %s key before creating any attempt",
      async (selectionMode) => {
        await withHarness(async (harness) => {
          const f = await provisionCurriculumForm(harness, 33, {
            id: "<id>",
            selectionMode,
          });
          await expect(
            startAttempt(f.command, f.dependencies),
          ).rejects.toMatchObject({ code: "state_conflict" });
          expect(
            await harness.admin.db
              .select()
              .from(attempts)
              .where(eq(attempts.participantId, f.participantId)),
          ).toHaveLength(0);
          expect(
            await harness.admin.db
              .select()
              .from(curriculumRuntimeStates)
              .where(
                eq(curriculumRuntimeStates.participantId, f.participantId),
              ),
          ).toHaveLength(0);
        });
      },
    );
    it("evaluates all persisted frozen answers and saves the exact immutable anchor despite current content drift", async () => {
      await withHarness(async (harness) => {
        const f = await submittedFixture(harness, true);
        await harness.admin.db
          .update(contentVersions)
          .set({
            participantText:
              "Synthetic current text differs from the captured form",
          })
          .where(eq(contentVersions.id, f.formItems[0]!.contentVersionId));
        await harness.admin.db
          .delete(learningActivityItems)
          .where(eq(learningActivityItems.activityId, f.activityId));
        const state = await createCurriculumModuleEvaluationUseCase(
          harness.application.db,
        )(f.evaluationCommand);
        expect(state.evaluation.objectiveResults).toEqual([
          {
            objectiveId: "synthetic-objective",
            earnedPoints: 31,
            possiblePoints: 31,
            percent: 100,
            critical: false,
            requiredPercent: 70,
          },
        ]);
        expect(state.evaluation.scorePercent).toBeUndefined();
        expect(state.evaluation.status).toBe("AGUARDA_CORRECAO_HUMANA");
        expect(state.evaluation.openResponseItemIds).toHaveLength(2);
        expect(state.evaluation.evaluationAnchor).toMatchObject({
          attemptId: f.submitted.attemptId,
          attemptVersion: f.submitted.version,
          formId: "synthetic-published-form",
          formVersion: 1,
        });
        expect(state.evaluation.evaluationAnchor!.contentVersions).toHaveLength(
          33,
        );
        expect(state.version).toBe(1);
        const rows = await harness.admin.db
          .select()
          .from(curriculumRuntimeStates)
          .where(eq(curriculumRuntimeStates.participantId, f.participantId));
        expect(rows).toHaveLength(1);
        expect(rows[0]!.state).toEqual(state.evaluation);
        expect(
          await harness.admin.db
            .select()
            .from(answers)
            .where(eq(answers.attemptId, f.submitted.attemptId)),
        ).toHaveLength(33);
      });
    });

    it("denies foreign identity and stale attempt or form versions without writing runtime", async () => {
      await withHarness(async (harness) => {
        const f = await submittedFixture(harness);
        const evaluate = createCurriculumModuleEvaluationUseCase(
          harness.application.db,
        );
        for (const delta of [
          { participantId: randomUUID() },
          { scopeId: randomUUID() },
          { attemptVersion: f.submitted.version + 1 },
          { formVersion: 2 },
        ])
          await expect(
            evaluate({ ...f.evaluationCommand, ...delta }),
          ).rejects.toMatchObject({ code: "state_conflict" });
        expect(
          await harness.admin.db
            .select()
            .from(curriculumRuntimeStates)
            .where(eq(curriculumRuntimeStates.participantId, f.participantId)),
        ).toHaveLength(0);
      });
    });

    it("denies withdrawn published form without saving or falling back to the current draft", async () => {
      await withHarness(async (harness) => {
        const f = await submittedFixture(harness);
        await harness.admin.db
          .update(curriculumFormVersions)
          .set({ status: "RETIRADO" })
          .where(eq(curriculumFormVersions.id, f.formVersionId));
        await expect(
          createCurriculumModuleEvaluationUseCase(harness.application.db)(
            f.evaluationCommand,
          ),
        ).rejects.toMatchObject({ code: "state_conflict" });
        expect(
          await harness.admin.db
            .select()
            .from(curriculumRuntimeStates)
            .where(eq(curriculumRuntimeStates.participantId, f.participantId)),
        ).toHaveLength(0);
      });
    });

    it("denies a withdrawn captured content version without partial runtime save", async () => {
      await withHarness(async (harness) => {
        const f = await submittedFixture(harness);
        await harness.admin.db
          .update(contentVersions)
          .set({ status: "RETIRADO" })
          .where(eq(contentVersions.id, f.formItems[0]!.contentVersionId));
        await expect(
          createCurriculumModuleEvaluationUseCase(harness.application.db)(
            f.evaluationCommand,
          ),
        ).rejects.toMatchObject({ code: "state_conflict" });
        expect(
          await harness.admin.db
            .select()
            .from(curriculumRuntimeStates)
            .where(eq(curriculumRuntimeStates.participantId, f.participantId)),
        ).toHaveLength(0);
      });
    });

    it("holds the published-form fence through runtime save and serializes a concurrent withdrawal", async () => {
      await withHarness(async (harness) => {
        const f = await submittedFixture(harness, true);
        const acquired = latch(),
          release = latch();
        const blocker = harness.admin.db.transaction(async (tx) => {
          await tx.execute(
            sql`lock table curriculum_runtime_states in access exclusive mode`,
          );
          acquired.release();
          await release.promise;
        });
        await acquired.promise;
        const evaluate = createCurriculumModuleEvaluationUseCase(
          harness.application.db,
        );
        const evaluated = evaluate(f.evaluationCommand);
        let withdrawal: Promise<unknown> | undefined;
        try {
          const evaluationPid = await waitForLock(harness, "relation");
          withdrawal = Promise.resolve(
            harness.admin.db
              .update(curriculumFormVersions)
              .set({ status: "RETIRADO" })
              .where(eq(curriculumFormVersions.id, f.formVersionId)),
          );
          const withdrawalPid = await waitForLock(harness, "advisory");
          const [row] = await harness.admin.db.execute<{
            blockers: number[];
          }>(sql`
        select pg_blocking_pids(${withdrawalPid}) as blockers`);
          expect(row!.blockers).toContain(evaluationPid);
          console.log(
            JSON.stringify({
              proof: "native-evaluation-read-save-form-fence",
              actualBlockedEvaluation: evaluationPid,
              actualBlockedWithdrawal: withdrawalPid,
              formFenceBlockerConfirmed: true,
            }),
          );
          release.release();
          const state = await evaluated;
          await withdrawal;
          expect(state.version).toBe(1);
          expect(state.evaluation.objectiveResults[0]!.earnedPoints).toBe(31);
          expect(state.evaluation.evaluationAnchor!.attemptId).toBe(
            f.submitted.attemptId,
          );
          await expect(evaluate(f.evaluationCommand)).rejects.toMatchObject({
            code: "state_conflict",
          });
          const [stored] = await harness.admin.db
            .select()
            .from(curriculumRuntimeStates)
            .where(eq(curriculumRuntimeStates.participantId, f.participantId));
          expect(stored!.version).toBe(1);
          expect(stored!.state).toEqual(state.evaluation);
        } finally {
          release.release();
          await Promise.allSettled([
            blocker,
            evaluated,
            ...(withdrawal ? [withdrawal] : []),
          ]);
        }
      });
    });

    it("serves native evaluation through actual main, issued moderator cookie and scoped HTTP authorization", async () => {
      await withHarness(async (harness) => {
        const f = await submittedFixture(harness, true);
        const moderatorId = randomUUID(),
          token = randomBytes(48).toString("base64url");
        await harness.admin.db.insert(accounts).values({
          id: moderatorId,
          status: "INVITED",
          professionalEmail: `native-evaluation-${moderatorId}@example.invalid`,
        });
        await harness.admin.db.insert(accountInvitations).values({
          accountId: moderatorId,
          createdBy: f.participantId,
          tokenHash: createHash("sha256").update(token).digest("hex"),
          roles: ["MODERATOR"],
          scopes: [f.scopeId],
          expiresAt: new Date(Date.now() + 3_600_000),
        });
        const origin = "http://native-evaluation.example.invalid";
        const runtime = createApiRuntime({
          NODE_ENV: "test",
          DATABASE_URL: liveDatabaseUrl,
          API_HOST: "127.0.0.1",
          API_PORT: "0",
          WEB_ORIGINS: origin,
          QDRANT_ENABLED: "false",
          AI_ENABLED: "false",
        });
        try {
          await runtime.listen();
          const address = runtime.server.address();
          if (!address || typeof address === "string")
            throw new Error("Native API did not bind");
          const base = `http://127.0.0.1:${address.port}`;
          const accepted = await fetch(`${base}/api/v1/invitations/accept`, {
            method: "POST",
            headers: { origin, "content-type": "application/json" },
            body: JSON.stringify({ token, sessionExpiresInSeconds: 3_600 }),
          });
          expect(accepted.status).toBe(200);
          const wireCookie = accepted.headers.get("set-cookie");
          expect(wireCookie).toContain("HttpOnly");
          expect(wireCookie).toContain("Secure");
          const cookie = wireCookie!.split(";")[0]!;
          const current = await fetch(`${base}/api/v1/session/current`, {
            headers: { cookie },
          });
          expect(current.status).toBe(200);
          const path = `${base}/api/v1/internal/curriculum/modules/M02/evaluate`;
          const body = JSON.stringify({
            participantId: f.participantId,
            scopeId: f.scopeId,
            attemptId: f.submitted.attemptId,
            attemptVersion: f.submitted.version,
            formVersion: 1,
          });
          expect(
            (
              await fetch(path, {
                method: "POST",
                headers: { origin, "content-type": "application/json" },
                body,
              })
            ).status,
          ).toBe(401);
          const response = await fetch(path, {
            method: "POST",
            headers: { cookie, origin, "content-type": "application/json" },
            body,
          });
          expect(response.status).toBe(200);
          const projected: unknown = await response.json();
          expect(projected).toMatchObject({
            data: {
              moduleId: "M02",
              status: "AGUARDA_CORRECAO_HUMANA",
              version: 1,
            },
          });
          const publicBytes = JSON.stringify(projected);
          for (const privateField of [
            "evaluationAnchor",
            "correctChoiceIds",
            "sourceRefs",
            "synthetic-a",
            "Synthetic technical human response",
            "tokenHash",
            "publicationDecisionId",
            "blueprintApprovalDecisionId",
          ])
            expect(publicBytes).not.toContain(privateField);
          const foreign = await fetch(path, {
            method: "POST",
            headers: { cookie, origin, "content-type": "application/json" },
            body: JSON.stringify({
              ...JSON.parse(body),
              scopeId: randomUUID(),
            }),
          });
          expect(foreign.status).toBe(403);
          const [stored] = await harness.admin.db
            .select()
            .from(curriculumRuntimeStates)
            .where(eq(curriculumRuntimeStates.participantId, f.participantId));
          expect(stored!.version).toBe(1);
          expect(stored!.state.evaluationAnchor!.attemptId).toBe(
            f.submitted.attemptId,
          );
          console.log(
            JSON.stringify({
              proof: "native-main-scoped-http-evaluation",
              actualInvitationAccept: accepted.status,
              actualSessionCurrent: current.status,
              anonymousDenied: 401,
              nativeEvaluation: response.status,
              foreignScopeDenied: foreign.status,
              publicPrivateFieldsAbsent: true,
            }),
          );
        } finally {
          await runtime.close();
          expect(runtime.server.address()).toBeNull();
        }
      });
    });

    it("denies an explicitly unbound legacy attempt rather than borrowing the current form", async () => {
      await withHarness(async (harness) => {
        const f = await provisionCurriculumForm(harness);
        const legacyId = randomUUID(),
          legacyActivityId = randomUUID();
        // A separate explicitly unbound legacy activity, never a deleted or
        // retroactively inferred association from a published native form.
        const [learning] = await harness.admin.db
          .select()
          .from(learningAssignments)
          .where(eq(learningAssignments.participantId, f.participantId));
        await harness.admin.db.insert(learningActivities).values({
          id: legacyActivityId,
          scopeId: f.scopeId,
          moduleId: "M02",
          slug: `synthetic-legacy-${legacyActivityId}`,
          status: "PUBLISHED",
        });
        await harness.admin.db.insert(activityAssignments).values({
          participantId: f.participantId,
          activityId: legacyActivityId,
          learningAssignmentId: learning!.id,
          status: "DISPONIVEL",
        });
        await harness.admin.db.insert(attempts).values({
          id: legacyId,
          participantId: f.participantId,
          activityId: legacyActivityId,
          status: "SUBMETIDA",
          version: 2,
          submittedAt: new Date(),
        });
        await expect(
          createCurriculumModuleEvaluationUseCase(harness.application.db)({
            participantId: f.participantId,
            scopeId: f.scopeId,
            moduleId: "M02",
            attemptId: legacyId,
            attemptVersion: 2,
            formVersion: 1,
          }),
        ).rejects.toMatchObject({ code: "state_conflict" });
        expect(
          await harness.admin.db
            .select()
            .from(curriculumRuntimeStates)
            .where(eq(curriculumRuntimeStates.participantId, f.participantId)),
        ).toHaveLength(0);
      });
    });
  },
);
