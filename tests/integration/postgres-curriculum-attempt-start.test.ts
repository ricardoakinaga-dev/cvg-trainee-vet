import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  startAttempt,
  saveAnswer,
  submitAttempt,
} from "../../packages/application/dist/index.js";
import { createParticipantAttemptReadRepository } from "../../packages/persistence/src/participant-attempt-read-repository.js";
import {
  createActivityReadRepository,
  createParticipantActivityItemResolver,
} from "../../packages/persistence/src/activity-repository.js";
import { createAnswerUseCaseDependencies } from "../../packages/persistence/src/answer-repository.js";
import { setDatabaseSecurityContext } from "../../packages/persistence/src/security-context.js";
import {
  answers,
  attempts,
  attemptIdempotency,
  contentVersions,
  learningActivityItems,
  curriculumFormVersions,
  curriculumAttemptForms,
  curriculumAttemptItems,
} from "../../packages/persistence/src/schema.js";
import {
  closeLivePostgresHarness,
  liveDatabaseUrl,
  openLivePostgresHarness,
  type LivePostgresHarness,
} from "./live-postgres-harness.js";

import { provisionCurriculumForm as provision } from "./curriculum-native-fixtures.js";

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

describe.skipIf(
  process.env.CVG_RUN_LIVE_DB_TESTS !== "true" || liveDatabaseUrl === undefined,
)(
  "native published form capture on actual start (synthetic technical publication only)",
  () => {
    it("captures all 33 immutable items atomically and replay never recaptures edited content", async () => {
      await withHarness(async (harness) => {
        const f = await provision(harness);
        const started = await startAttempt(f.command, f.dependencies);
        const before = await harness.admin.db
          .select()
          .from(curriculumAttemptItems)
          .where(eq(curriculumAttemptItems.attemptId, started.attemptId));
        expect(before).toHaveLength(33);
        expect(
          await harness.admin.db
            .select()
            .from(curriculumAttemptForms)
            .where(eq(curriculumAttemptForms.attemptId, started.attemptId)),
        ).toMatchObject([
          {
            participantId: f.participantId,
            scopeId: f.scopeId,
            formVersionId: f.formVersionId,
          },
        ]);
        const first = f.formItems[0];
        if (!first) throw new Error("fixture requires items");
        const savedAnswerId = randomUUID();
        await harness.application.db.transaction(async (tx) => {
          await setDatabaseSecurityContext(tx, {
            participantId: f.participantId,
            scopeId: f.scopeId,
          });
          await tx.insert(answers).values({
            id: savedAnswerId,
            attemptId: started.attemptId,
            itemId: first.contentVersionId,
            response: "synthetic-a",
            savedAt: new Date(),
          });
        });
        await harness.admin.db
          .update(contentVersions)
          .set({ participantText: "Changed current projection" })
          .where(eq(contentVersions.id, first.contentVersionId));
        await harness.admin.db
          .delete(learningActivityItems)
          .where(eq(learningActivityItems.activityId, f.activityId));
        expect(await startAttempt(f.command, f.dependencies)).toEqual(started);
        expect(
          await harness.admin.db
            .select()
            .from(curriculumAttemptItems)
            .where(eq(curriculumAttemptItems.attemptId, started.attemptId)),
        ).toEqual(before);
        const ownAttempt = await createParticipantAttemptReadRepository(
          harness.application.db,
        ).findOwnAttempt(f.participantId, started.attemptId);
        expect(ownAttempt?.answers).toMatchObject([
          {
            answerId: savedAnswerId,
            itemId: first.contentVersionId,
            response: "synthetic-a",
          },
        ]);
        expect(JSON.stringify(ownAttempt)).not.toMatch(
          /correctChoiceIds|catalogItem|rubric|sourceRefs/u,
        );
        const publicActivity = await createActivityReadRepository(
          harness.application.db,
        ).findParticipantActivity(f.participantId, f.activityId);
        expect(publicActivity?.items).toHaveLength(33);
        expect(publicActivity?.items[0]).toEqual(first.publicItem);
        expect(JSON.stringify(publicActivity)).not.toMatch(
          /correctChoiceIds|catalogItem|rubric|sourceRefs/u,
        );
        const answerDependencies = createAnswerUseCaseDependencies(
          harness.application.db,
          randomUUID,
        );
        const command = {
          attemptId: started.attemptId,
          participantId: f.participantId,
          activityId: f.activityId,
          scopeId: f.scopeId,
          itemId: first.contentVersionId,
          response: "synthetic-b",
          idempotencyKey: randomUUID(),
          correlationId: randomUUID(),
          savedAt: new Date().toISOString(),
        };
        const saved = await saveAnswer(command, answerDependencies);
        expect(saved.attempt).toMatchObject({ status: "SALVA", version: 2 });
        expect(saved.answer.response).toBe("synthetic-b");
        expect(await saveAnswer(command, answerDependencies)).toEqual(saved);
        expect(
          await createParticipantActivityItemResolver(harness.application.db)(
            f.participantId,
            f.activityId,
            first.contentVersionId,
          ),
        ).toBe(true);
        const multipleProjection = JSON.stringify({
          responseMode: "CHOICE",
          selectionMode: "MULTIPLE",
          choices: [{ id: "synthetic-a" }, { id: "synthetic-b" }],
        });
        for (const [response, expected] of [
          ['["synthetic-a","synthetic-b"]', true],
          ['["synthetic-b"]', true],
          ['["synthetic-a","synthetic-a"]', false],
          ['["unknown"]', false],
          ["[]", false],
          ["synthetic-a", false],
          ["[1]", false],
          ["{}", false],
        ] as const) {
          const checked = await harness.application.db.execute(sql`
            select cvg_validate_frozen_answer_response(${multipleProjection}::jsonb, ${response}) as valid
          `);
          expect(checked).toEqual([{ valid: expected }]);
        }
        await expect(
          saveAnswer(
            {
              ...command,
              response: "unknown-choice",
              idempotencyKey: randomUUID(),
            },
            answerDependencies,
          ),
        ).rejects.toMatchObject({ code: "validation_error" });
        const directInsert = (itemId: string, response: string) =>
          harness.application.db.transaction(async (tx) => {
            await setDatabaseSecurityContext(tx, {
              participantId: f.participantId,
              scopeId: f.scopeId,
            });
            await tx.insert(answers).values({
              id: randomUUID(),
              attemptId: started.attemptId,
              itemId,
              response,
              savedAt: new Date(),
            });
          });
        await expect(
          directInsert(randomUUID(), "synthetic-a"),
        ).rejects.toMatchObject({ cause: { code: "23514" } });
        const second = f.formItems[1];
        if (!second) throw new Error("fixture requires second item");
        await expect(
          directInsert(second.contentVersionId, "unknown-choice"),
        ).rejects.toMatchObject({ cause: { code: "23514" } });
        const submitted = await submitAttempt(
          {
            attemptId: started.attemptId,
            participantId: f.participantId,
            scopeId: f.scopeId,
            idempotencyKey: randomUUID(),
            correlationId: randomUUID(),
            submittedAt: new Date().toISOString(),
          },
          f.dependencies,
        );
        expect(submitted).toMatchObject({ status: "SUBMETIDA", version: 3 });
        await expect(
          harness.application.db.transaction(async (tx) => {
            await setDatabaseSecurityContext(tx, {
              participantId: f.participantId,
              scopeId: f.scopeId,
            });
            await tx
              .update(answers)
              .set({ response: "synthetic-a" })
              .where(eq(answers.id, savedAnswerId));
          }),
        ).rejects.toMatchObject({ cause: { code: "23514" } });
        await expect(
          harness.application.db.transaction(async (tx) => {
            await setDatabaseSecurityContext(tx, {
              participantId: f.participantId,
              scopeId: f.scopeId,
            });
            await tx
              .update(answers)
              .set({ itemId: second.contentVersionId })
              .where(eq(answers.id, savedAnswerId));
          }),
        ).rejects.toMatchObject({ cause: { code: "23514" } });
        expect(await saveAnswer(command, answerDependencies)).toEqual(saved);
        const persisted = await harness.admin.db
          .select()
          .from(answers)
          .where(eq(answers.attemptId, started.attemptId));
        expect(persisted).toHaveLength(1);
        expect(persisted[0]?.response).toBe("synthetic-b");
        await expect(
          createParticipantAttemptReadRepository(
            harness.application.db,
          ).findOwnAttempt(randomUUID(), started.attemptId),
        ).resolves.toBeNull();
        await harness.admin.db
          .update(curriculumFormVersions)
          .set({ status: "RETIRADO" })
          .where(eq(curriculumFormVersions.id, f.formVersionId));
        await expect(
          createParticipantAttemptReadRepository(
            harness.application.db,
          ).findOwnAttempt(f.participantId, started.attemptId),
        ).resolves.toBeNull();
      });
    });
    it("rejects a self-consistent one-item subset and rolls back attempt and idempotency", async () => {
      await withHarness(async (harness) => {
        const f = await provision(harness, 1);
        await expect(
          startAttempt(f.command, f.dependencies),
        ).rejects.toMatchObject({ code: "state_conflict" });
        expect(
          await harness.admin.db
            .select()
            .from(attempts)
            .where(eq(attempts.activityId, f.activityId)),
        ).toHaveLength(0);
        expect(
          await harness.admin.db
            .select()
            .from(attemptIdempotency)
            .where(eq(attemptIdempotency.key, f.command.idempotencyKey)),
        ).toHaveLength(0);
      });
    });
    it("rejects an explicitly withdrawn form without saving any attempt", async () => {
      await withHarness(async (harness) => {
        const f = await provision(harness);
        await harness.admin.db
          .update(curriculumFormVersions)
          .set({ status: "RETIRADO" })
          .where(eq(curriculumFormVersions.id, f.formVersionId));
        await expect(
          startAttempt(f.command, f.dependencies),
        ).rejects.toMatchObject({ code: "state_conflict" });
        expect(
          await harness.admin.db
            .select()
            .from(attempts)
            .where(eq(attempts.activityId, f.activityId)),
        ).toHaveLength(0);
      });
    });
    it("never exposes private keys to ordinary participant database context", async () => {
      await withHarness(async (harness) => {
        const f = await provision(harness);
        for (const query of [
          sql`select catalog_item from curriculum_form_items`,
          sql`select catalog_item from curriculum_attempt_items`,
        ]) {
          let rows: unknown;
          try {
            rows = await harness.application.db.transaction(async (tx) => {
              await setDatabaseSecurityContext(tx, {
                participantId: f.participantId,
                scopeId: f.scopeId,
              });
              return tx.execute(query);
            });
          } catch (error) {
            // Either table ACL denies access, or RLS returns no rows. Any
            // other failure remains a failure, and returned data never passes.
            expect(error).toMatchObject({ cause: { code: "42501" } });
            continue;
          }
          expect(rows).toHaveLength(0);
        }
        await expect(
          harness.application.db.transaction(async (tx) => {
            await setDatabaseSecurityContext(tx, {
              participantId: f.participantId,
              scopeId: f.scopeId,
            });
            await tx.insert(attempts).values({
              id: randomUUID(),
              participantId: f.participantId,
              activityId: f.activityId,
              status: "CRIADA",
              version: 0,
            });
          }),
        ).rejects.toMatchObject({ code: "23514" });
        expect(
          await harness.admin.db
            .select()
            .from(attempts)
            .where(eq(attempts.activityId, f.activityId)),
        ).toHaveLength(0);
      });
    });
  },
);
