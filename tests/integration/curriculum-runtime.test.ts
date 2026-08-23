import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
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
import { accounts } from "../../packages/persistence/src/schema.js";
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
      const scopeId = randomUUID();
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
      } finally {
        await admin.db
          .delete(curriculumRuntimeStates)
          .where(eq(curriculumRuntimeStates.participantId, participantId));
        await admin.db.delete(accounts).where(eq(accounts.id, participantId));
        await closeLivePostgresHarness(harness);
      }
    });
  },
);
