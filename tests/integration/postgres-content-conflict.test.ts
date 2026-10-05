import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  advanceContent,
  type AdvanceContentCommand,
  type ContentUseCaseDependencies,
} from "../../packages/application/src/index.js";
import {
  accounts,
  auditEntries,
  contentVersions,
  createContentUseCaseDependencies,
  outboxEvents,
} from "../../packages/persistence/src/index.js";
import {
  closeLivePostgresHarness,
  openLivePostgresHarness,
} from "./live-postgres-harness.js";

describe.skipIf(process.env.CVG_RUN_LIVE_DB_TESTS !== "true")(
  "PostgreSQL content optimistic concurrency",
  () => {
    it("commits only one concurrent transition and returns a state conflict for the other", async () => {
      const harness = await openLivePostgresHarness();
      const { application, admin } = harness;
      const contentId = randomUUID();
      const versionId = randomUUID();
      const scopeId = randomUUID();
      const authorId = randomUUID();
      expect(harness.applicationRole.isSuperuser).toBe(false);
      expect(harness.applicationRole.bypassesRls).toBe(false);
      expect(harness.applicationRole.roleName).not.toBe(
        harness.adminRole.roleName,
      );
      let releaseReads: () => void = () => undefined;
      const bothRead = new Promise<void>((resolve) => {
        releaseReads = resolve;
      });
      let reads = 0;
      const dependencies = createContentUseCaseDependencies(
        application.db,
        randomUUID,
      );
      const synchronized: ContentUseCaseDependencies = {
        ...dependencies,
        transaction: {
          run: (work, context) =>
            dependencies.transaction.run(
              async (operations) =>
                work({
                  ...operations,
                  content: {
                    ...operations.content,
                    find: async (...args) => {
                      const current = await operations.content.find(...args);
                      reads += 1;
                      if (reads === 2) releaseReads();
                      let deadline: ReturnType<typeof setTimeout> | undefined;
                      try {
                        await Promise.race([
                          bothRead,
                          new Promise<never>((_resolve, reject) => {
                            deadline = setTimeout(
                              () =>
                                reject(new Error("concurrent reads timed out")),
                              3000,
                            );
                          }),
                        ]);
                      } finally {
                        clearTimeout(deadline);
                      }
                      return current;
                    },
                  },
                }),
              context,
            ),
        },
      };
      try {
        await admin.db.insert(accounts).values({
          id: authorId,
          professionalEmail: `${authorId}@example.invalid`,
          status: "ACTIVE",
        });
        await admin.db.insert(contentVersions).values({
          id: versionId,
          contentId,
          scopeId,
          version: 1,
          status: "AUTOVERIFICADO",
          kind: "LEITURA",
          title: "Conteúdo sintético concorrente",
          participantText: "Texto sintético sem publicação.",
          responseMode: "NONE",
        });
        const command: AdvanceContentCommand = {
          principalId: authorId,
          accountStatus: "ACTIVE",
          roles: ["AUTHOR"],
          scopes: [scopeId],
          contentId,
          version: 1,
          scopeId,
          event: "INICIAR_REVISAO_CLINICA",
          correlationId: randomUUID(),
        };
        const results = await Promise.allSettled([
          advanceContent(command, synchronized),
          advanceContent(
            { ...command, correlationId: randomUUID() },
            synchronized,
          ),
        ]);
        expect(reads).toBe(2);
        expect(
          results.filter((result) => result.status === "fulfilled"),
        ).toHaveLength(1);
        const rejected = results.find((result) => result.status === "rejected");
        expect(rejected).toMatchObject({
          status: "rejected",
          reason: {
            code: "state_conflict",
            status: 409,
            message: "Content state conflict",
          },
        });
        expect(
          await admin.db
            .select({ status: contentVersions.status })
            .from(contentVersions)
            .where(eq(contentVersions.id, versionId)),
        ).toEqual([{ status: "EM_REVISAO_CLINICA" }]);
        expect(
          await admin.db
            .select({ eventType: outboxEvents.eventType })
            .from(outboxEvents)
            .where(eq(outboxEvents.aggregateId, contentId)),
        ).toEqual([{ eventType: "content.workflow.changed.v1" }]);
        expect(
          await admin.db
            .select({ action: auditEntries.action })
            .from(auditEntries)
            .where(eq(auditEntries.resourceId, contentId)),
        ).toEqual([{ action: "CONTENT_INICIAR_REVISAO_CLINICA" }]);
      } finally {
        releaseReads();
        await admin.db
          .delete(outboxEvents)
          .where(eq(outboxEvents.aggregateId, contentId));
        await admin.db
          .delete(contentVersions)
          .where(eq(contentVersions.id, versionId));
        await admin.db.delete(accounts).where(eq(accounts.id, authorId));
        await closeLivePostgresHarness(harness);
      }
    }, 15_000);
  },
);
