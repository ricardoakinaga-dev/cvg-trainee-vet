import { describe, expect, it } from "vitest";

import {
  getContinuingEducationReport,
  type ContinuingEducationReportReadPort,
  type ContinuingEducationReportState,
} from "./continuing-education-report-use-cases.js";

const scopeId = "11111111-1111-4111-8111-111111111111";

const report: ContinuingEducationReportState = {
  kind: "continuing_education_report",
  scopeId,
  generatedAt: "2026-08-23T20:00:00.000Z",
  filters: { scopeId },
  summary: {
    participantCount: 0,
    invitedParticipants: 0,
    activeParticipants: 0,
    suspendedParticipants: 0,
    deactivatedParticipants: 0,
    assignedModules: 0,
    completedModules: 0,
    completionRatePercent: null,
    completedDigitalMinutes: 0,
    completedDigitalHours: 0,
  },
  participants: [],
  modules: [],
  pagination: {
    page: 1,
    pageSize: 25,
    totalParticipants: 0,
    totalPages: 0,
    hasNextPage: false,
  },
  learningEvidence: "ATIVIDADE_MODULAR_DIGITAL",
  hoursClaim: "NAO_CREDENCIADAS",
  practicalCompetenceClaim: "PROIBIDO_MVP",
};

function repository(
  value: ContinuingEducationReportState,
): ContinuingEducationReportReadPort {
  return {
    findContinuingEducationReport: async () => value,
  };
}

describe("continuing education report use case", () => {
  it("normalizes filters and returns a frozen scoped report", async () => {
    const result = await getContinuingEducationReport(
      {
        principalId: "33333333-3333-4333-8333-333333333333",
        query: { scopeId: ` ${scopeId} `, moduleId: " M02 " },
      },
      repository({
        ...report,
        scopeId,
        filters: { scopeId, moduleId: "M02" },
      }),
    );

    expect(result.filters).toEqual({ scopeId, moduleId: "M02" });
    expect(result.pagination).toEqual({
      page: 1,
      pageSize: 25,
      totalParticipants: 0,
      totalPages: 0,
      hasNextPage: false,
    });
    expect(result.scopeId).toBe(scopeId);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.summary)).toBe(true);
  });

  it("fails closed for an empty principal, scope or invalid filter", async () => {
    await expect(
      getContinuingEducationReport(
        { principalId: "", query: { scopeId } },
        repository(report),
      ),
    ).rejects.toMatchObject({ code: "validation_error" });

    await expect(
      getContinuingEducationReport(
        {
          principalId: "33333333-3333-4333-8333-333333333333",
          query: { scopeId: "" },
        },
        repository(report),
      ),
    ).rejects.toMatchObject({ code: "validation_error" });

    await expect(
      getContinuingEducationReport(
        {
          principalId: "33333333-3333-4333-8333-333333333333",
          query: { scopeId, moduleId: "M25" },
        },
        repository(report),
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
  });

  it("rejects a repository response from another scope", async () => {
    await expect(
      getContinuingEducationReport(
        {
          principalId: "33333333-3333-4333-8333-333333333333",
          query: { scopeId },
        },
        repository({
          ...report,
          scopeId: "44444444-4444-4444-8444-444444444444",
        }),
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("normalizes bounded pagination and rejects a mismatched repository page", async () => {
    const result = await getContinuingEducationReport(
      {
        principalId: "33333333-3333-4333-8333-333333333333",
        query: { scopeId, page: 2, pageSize: 10 },
      },
      repository({
        ...report,
        pagination: {
          page: 2,
          pageSize: 10,
          totalParticipants: 11,
          totalPages: 2,
          hasNextPage: false,
        },
      }),
    );

    expect(result.pagination.page).toBe(2);
    await expect(
      getContinuingEducationReport(
        {
          principalId: "33333333-3333-4333-8333-333333333333",
          query: { scopeId, page: 2, pageSize: 10 },
        },
        repository({
          ...report,
          pagination: {
            page: 1,
            pageSize: 10,
            totalParticipants: 11,
            totalPages: 2,
            hasNextPage: true,
          },
        }),
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
  });
});
