import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { createContinuingEducationReportRepository } from "../../packages/persistence/src/index.js";
import {
  accountInvitations,
  accounts,
  learningAssignments,
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
  "PostgreSQL continuing education report integration",
  () => {
    it("aggregates digital participation only inside the requested scope", async ({
      skip,
    }) => {
      const harness = await openLivePostgresHarness();
      if (!hasAdministrativeCleanupCapability(harness.adminRole)) {
        await closeLivePostgresHarness(harness);
        skip(liveAdminCapabilityMessage);
        return;
      }
      const { application: database, admin } = harness;
      const adminId = randomUUID();
      const scopeId = randomUUID();
      const otherScopeId = randomUUID();
      const participantIds = [randomUUID(), randomUUID(), randomUUID()];
      const otherParticipantId = randomUUID();
      const invitationIds = [randomUUID(), randomUUID(), randomUUID()];
      const otherInvitationId = randomUUID();
      const assignmentIds = [
        randomUUID(),
        randomUUID(),
        randomUUID(),
        randomUUID(),
      ];

      try {
        await admin.db.insert(accounts).values([
          {
            id: adminId,
            professionalEmail: `report-admin-${adminId}@example.invalid`,
            status: "ACTIVE",
          },
          {
            id: participantIds[0],
            professionalEmail: `report-active-${participantIds[0]}@example.invalid`,
            status: "ACTIVE",
          },
          {
            id: participantIds[1],
            professionalEmail: `report-invited-${participantIds[1]}@example.invalid`,
            status: "INVITED",
          },
          {
            id: participantIds[2],
            professionalEmail: `report-suspended-${participantIds[2]}@example.invalid`,
            status: "SUSPENDED",
          },
          {
            id: otherParticipantId,
            professionalEmail: `report-other-${otherParticipantId}@example.invalid`,
            status: "ACTIVE",
          },
        ]);
        await admin.db.insert(accountInvitations).values(
          participantIds.map((participantId, index) => ({
            id: invitationIds[index]!,
            accountId: participantId!,
            tokenHash: `${String.fromCharCode(97 + index)}`.repeat(64),
            roles: ["PARTICIPANT"],
            scopes: [scopeId],
            expiresAt: new Date("2027-08-23T12:00:00.000Z"),
            acceptedAt:
              index === 1 ? null : new Date("2026-08-23T10:00:00.000Z"),
            createdBy: adminId,
          })),
        );
        await admin.db.insert(learningAssignments).values([
          {
            id: assignmentIds[0]!,
            participantId: participantIds[0]!,
            scopeId,
            moduleId: "M01",
            availableAt: new Date("2026-08-20T12:00:00.000Z"),
            status: "CONCLUIDO",
            version: 1,
          },
          {
            id: assignmentIds[1]!,
            participantId: participantIds[0]!,
            scopeId,
            moduleId: "M02",
            availableAt: new Date("2026-08-20T12:00:00.000Z"),
            status: "EM_ANDAMENTO",
            version: 1,
          },
          {
            id: assignmentIds[2]!,
            participantId: participantIds[1]!,
            scopeId,
            moduleId: "M01",
            availableAt: new Date("2026-08-20T12:00:00.000Z"),
            status: "CONCLUIDO",
            version: 1,
          },
          {
            id: assignmentIds[3]!,
            participantId: participantIds[2]!,
            scopeId,
            moduleId: "M02",
            availableAt: new Date("2026-08-20T12:00:00.000Z"),
            status: "ATRIBUIDO",
            version: 1,
          },
        ]);
        await admin.db.insert(accountInvitations).values({
          id: otherInvitationId,
          accountId: otherParticipantId,
          tokenHash: "f".repeat(64),
          roles: ["PARTICIPANT"],
          scopes: [otherScopeId],
          expiresAt: new Date("2027-08-23T12:00:00.000Z"),
          acceptedAt: new Date("2026-08-23T10:00:00.000Z"),
          createdBy: adminId,
        });

        const repository = createContinuingEducationReportRepository(
          database.db,
          { now: () => new Date("2026-08-23T20:00:00.000Z") },
        );
        const report = await repository.findContinuingEducationReport({
          scopeId,
        });
        expect(report.summary).toMatchObject({
          participantCount: 3,
          invitedParticipants: 1,
          activeParticipants: 1,
          suspendedParticipants: 1,
          assignedModules: 4,
          completedModules: 2,
          completedDigitalMinutes: 840,
          completedDigitalHours: 14,
        });
        expect(report.modules).toEqual([
          expect.objectContaining({
            moduleId: "M01",
            assignedParticipants: 2,
            completedParticipants: 2,
          }),
          expect.objectContaining({
            moduleId: "M02",
            assignedParticipants: 2,
            completedParticipants: 0,
          }),
        ]);

        const filtered = await repository.findContinuingEducationReport({
          scopeId,
          moduleId: "M01",
          accountStatus: "ACTIVE",
        });
        expect(filtered.summary).toMatchObject({
          participantCount: 1,
          assignedModules: 1,
          completedModules: 1,
          completedDigitalMinutes: 420,
        });

        const otherScope = await repository.findContinuingEducationReport({
          scopeId: otherScopeId,
        });
        expect(otherScope.participants).toEqual([
          expect.objectContaining({ participantId: otherParticipantId }),
        ]);
        expect(
          otherScope.participants.some(
            (participant) => participant.participantId === participantIds[0],
          ),
        ).toBe(false);
      } finally {
        await admin.db
          .delete(learningAssignments)
          .where(eq(learningAssignments.participantId, participantIds[0]!));
        await admin.db
          .delete(learningAssignments)
          .where(eq(learningAssignments.participantId, participantIds[1]!));
        await admin.db
          .delete(learningAssignments)
          .where(eq(learningAssignments.participantId, participantIds[2]!));
        await admin.db
          .delete(accountInvitations)
          .where(eq(accountInvitations.createdBy, adminId));
        await admin.db
          .delete(accounts)
          .where(eq(accounts.id, participantIds[0]!));
        await admin.db
          .delete(accounts)
          .where(eq(accounts.id, participantIds[1]!));
        await admin.db
          .delete(accounts)
          .where(eq(accounts.id, participantIds[2]!));
        await admin.db
          .delete(accounts)
          .where(eq(accounts.id, otherParticipantId));
        await admin.db.delete(accounts).where(eq(accounts.id, adminId));
        await closeLivePostgresHarness(harness);
      }
    });
  },
);
