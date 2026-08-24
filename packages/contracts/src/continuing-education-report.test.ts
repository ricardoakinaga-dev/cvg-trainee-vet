import { describe, expect, it } from "vitest";

import {
  continuingEducationReportProjectionSchema,
  continuingEducationReportQuerySchema,
  parseContinuingEducationReportProjection,
} from "./continuing-education-report.js";

const scopeId = "11111111-1111-4111-8111-111111111111";
const participantId = "22222222-2222-4222-8222-222222222222";

const report = {
  kind: "continuing_education_report" as const,
  scopeId,
  generatedAt: "2026-08-23T20:00:00.000Z",
  filters: { scopeId, moduleId: "M02", accountStatus: "ACTIVE" as const },
  summary: {
    participantCount: 1,
    invitedParticipants: 0,
    activeParticipants: 1,
    suspendedParticipants: 0,
    deactivatedParticipants: 0,
    assignedModules: 2,
    completedModules: 1,
    completionRatePercent: 50,
    completedDigitalMinutes: 360,
    completedDigitalHours: 6,
  },
  participants: [
    {
      participantId,
      professionalEmail: "vet@example.invalid",
      accountStatus: "ACTIVE" as const,
      assignedModules: 2,
      completedModules: 1,
      progressPercent: 50,
      completedDigitalMinutes: 360,
      completedDigitalHours: 6,
      lastSeenAt: "2026-08-23T19:00:00.000Z",
    },
  ],
  modules: [
    {
      moduleId: "M02",
      month: 2,
      scheduledMinutes: 360,
      assignedParticipants: 1,
      completedParticipants: 1,
      completionRatePercent: 100,
    },
  ],
  pagination: {
    page: 1,
    pageSize: 25,
    totalParticipants: 1,
    totalPages: 1,
    hasNextPage: false,
  },
  learningEvidence: "ATIVIDADE_MODULAR_DIGITAL" as const,
  hoursClaim: "NAO_CREDENCIADAS" as const,
  practicalCompetenceClaim: "PROIBIDO_MVP" as const,
};

describe("continuing education report contracts", () => {
  it("accepts only bounded, filtered report queries", () => {
    expect(
      continuingEducationReportQuerySchema.parse({
        scopeId,
        moduleId: "M24",
        accountStatus: "SUSPENDED",
      }),
    ).toEqual({
      scopeId,
      moduleId: "M24",
      accountStatus: "SUSPENDED",
    });
    expect(
      continuingEducationReportQuerySchema.parse({
        scopeId,
        page: 2,
        pageSize: 50,
      }),
    ).toEqual({ scopeId, page: 2, pageSize: 50 });
    expect(() =>
      continuingEducationReportQuerySchema.parse({
        scopeId,
        page: 0,
      }),
    ).toThrow();
    expect(() =>
      continuingEducationReportQuerySchema.parse({
        scopeId,
        moduleId: "M25",
        unexpected: "field",
      }),
    ).toThrow();
  });

  it("preserves the digital-only and non-accredited boundary", () => {
    expect(parseContinuingEducationReportProjection(report)).toEqual(report);
    expect(report.hoursClaim).toBe("NAO_CREDENCIADAS");
    expect(report.practicalCompetenceClaim).toBe("PROIBIDO_MVP");
  });

  it("rejects unbounded or public-certification-shaped fields", () => {
    expect(() =>
      continuingEducationReportProjectionSchema.parse({
        ...report,
        certificate: true,
      }),
    ).toThrow();
    expect(() =>
      continuingEducationReportProjectionSchema.parse({
        ...report,
        summary: { ...report.summary, completedDigitalMinutes: -1 },
      }),
    ).toThrow();
  });
});
