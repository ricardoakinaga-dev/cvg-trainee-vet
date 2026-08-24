import { randomUUID } from "node:crypto";

import { eq, inArray } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  evaluateAndPersistCurriculumModule,
  getParticipantCurriculumRuntime,
} from "../../packages/application/src/index.js";
import { getModuleDraftPack } from "../../packages/curriculum/src/index.js";
import {
  createCurriculumRuntimeRepository,
  curriculumRuntimeStates,
} from "../../packages/persistence/src/index.js";
import {
  accountInvitations,
  accounts,
} from "../../packages/persistence/src/schema.js";
import {
  closeLivePostgresHarness,
  hasAdministrativeCleanupCapability,
  liveAdminCapabilityMessage,
  liveDatabaseUrl,
  openLivePostgresHarness,
} from "./live-postgres-harness.js";

const runLiveDatabaseTests = process.env.CVG_RUN_LIVE_DB_TESTS === "true";

describe.skipIf(!runLiveDatabaseTests || liveDatabaseUrl === undefined)(
  "PostgreSQL curriculum runtime integration",
  () => {
    it("persists, versions and reads scoped digital mastery without public internals", async ({
      skip,
    }) => {
      const harness = await openLivePostgresHarness();
      if (!hasAdministrativeCleanupCapability(harness.adminRole)) {
        await closeLivePostgresHarness(harness);
        skip(liveAdminCapabilityMessage);
        return;
      }
      const { application: database, admin } = harness;

      const participantId = randomUUID();
      const creatorId = randomUUID();
      const scopeId = randomUUID();
      const foreignScopeId = randomUUID();
      const invitationId = randomUUID();
      const repository = createCurriculumRuntimeRepository(database.db);
      const pack = getModuleDraftPack("M03");
      const answers = pack.items
        .filter((item) => item.responseMode === "CHOICE")
        .map((item) => ({
          itemId: item.id,
          selectedChoiceIds: item.correctChoiceIds ?? [],
        }));

      try {
        await admin.db.insert(accounts).values({
          id: participantId,
          professionalEmail: `synthetic-runtime-${participantId}@example.invalid`,
          status: "ACTIVE",
        });
        await admin.db.insert(accounts).values({
          id: creatorId,
          professionalEmail: `synthetic-runtime-creator-${creatorId}@example.invalid`,
          status: "ACTIVE",
        });
        await admin.db.insert(accountInvitations).values({
          id: invitationId,
          accountId: participantId,
          tokenHash: `${randomUUID().replaceAll("-", "")}${randomUUID().replaceAll("-", "")}`,
          roles: ["PARTICIPANT"],
          scopes: [scopeId],
          expiresAt: new Date("2027-08-10T05:00:00.000Z"),
          acceptedAt: new Date("2026-08-10T04:00:00.000Z"),
          createdBy: creatorId,
        });

        const first = await evaluateAndPersistCurriculumModule(
          {
            participantId,
            scopeId,
            moduleId: "M03",
            answers,
            completedAt: "2026-08-10T01:00:00.000Z",
            mode: "FORMATIVE_CHOICE",
          },
          repository,
        );
        const second = await evaluateAndPersistCurriculumModule(
          {
            participantId,
            scopeId,
            moduleId: "M03",
            answers,
            completedAt: "2026-08-11T01:00:00.000Z",
            mode: "FORMATIVE_CHOICE",
          },
          repository,
        );
        const read = await getParticipantCurriculumRuntime(
          { participantId, moduleId: "M03" },
          repository,
        );

        expect(first).toMatchObject({
          participantId,
          scopeId,
          version: 1,
          evaluation: { status: "DOMINIO_DIGITAL", scorePercent: 100 },
        });
        expect(second.version).toBe(2);
        expect(read).toMatchObject({
          participantId,
          scopeId,
          version: 2,
          evaluation: {
            moduleId: "M03",
            status: "DOMINIO_DIGITAL",
            practicalCompetenceClaim: "PROIBIDO_MVP",
          },
        });
        expect(JSON.stringify(read)).not.toMatch(
          /source|chapter|page|pdf|answer_key|rubric_internal/iu,
        );
        await expect(
          evaluateAndPersistCurriculumModule(
            {
              participantId,
              scopeId: foreignScopeId,
              moduleId: "M03",
              answers,
              completedAt: "2026-08-12T01:00:00.000Z",
              mode: "FORMATIVE_CHOICE",
            },
            repository,
          ),
        ).rejects.toBeDefined();
      } finally {
        await admin.db
          .delete(curriculumRuntimeStates)
          .where(eq(curriculumRuntimeStates.participantId, participantId));
        await admin.db
          .delete(accountInvitations)
          .where(eq(accountInvitations.id, invitationId));
        await admin.db
          .delete(accounts)
          .where(inArray(accounts.id, [participantId, creatorId]));
        await closeLivePostgresHarness(harness);
      }
    });
  },
);
