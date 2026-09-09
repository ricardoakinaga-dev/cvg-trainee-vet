import { describe, expect, it, vi } from "vitest";

import type { ContinuingEducationReportState } from "@cvg/application";

import type {
  ApiHttpDependencies,
  ApiHttpRequest,
  ApiPrincipal,
} from "../../http.js";
import {
  handleContinuingEducationReport,
  handleReflectionManagementReport,
} from "./reports.handler.js";

const SCOPE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const staff: ApiPrincipal = {
  principalId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  accountStatus: "ACTIVE",
  roles: ["ADMIN"],
  scopes: [SCOPE],
};

const participant: ApiPrincipal = {
  principalId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  accountStatus: "ACTIVE",
  roles: ["PARTICIPANT"],
  scopes: [SCOPE],
};

function baseDependencies(
  overrides: Partial<ApiHttpDependencies> = {},
): ApiHttpDependencies {
  return {
    requestIdFactory: () => "request-1",
    ...overrides,
  } as ApiHttpDependencies;
}

function getRequest(query: Record<string, string | undefined>): ApiHttpRequest {
  return {
    method: "GET",
    path: "/api/v1/internal/reports/continuing-education",
    query,
    body: undefined,
  };
}

describe("reports feature handlers", () => {
  it("branch=validation/risk=malformed-input: continuing education with invalid scope (422)", async () => {
    const getContinuingEducationReport = vi.fn();
    const response = await handleContinuingEducationReport(
      getRequest({ scopeId: "not-a-uuid" }),
      "request-1",
      staff,
      baseDependencies({ getContinuingEducationReport }),
    );
    expect(response.status).toBe(422);
    expect(getContinuingEducationReport).not.toHaveBeenCalled();
  });

  it("branch=forbidden/risk=privilege-escalation: continuing education denied to participant (403)", async () => {
    const getContinuingEducationReport = vi.fn();
    const response = await handleContinuingEducationReport(
      getRequest({ scopeId: SCOPE }),
      "request-1",
      participant,
      baseDependencies({ getContinuingEducationReport }),
    );
    expect(response.status).toBe(403);
    expect(getContinuingEducationReport).not.toHaveBeenCalled();
  });

  it("branch=happy-path/risk=none: continuing education returns the report (200)", async () => {
    const state: ContinuingEducationReportState = {
      kind: "continuing_education_report",
      scopeId: SCOPE,
      generatedAt: "2026-09-09T00:00:00.000Z",
      filters: { scopeId: SCOPE },
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
    const getContinuingEducationReport = vi.fn(async () => state);
    const response = await handleContinuingEducationReport(
      getRequest({ scopeId: SCOPE }),
      "request-1",
      staff,
      baseDependencies({ getContinuingEducationReport }),
    );
    expect(response.status).toBe(200);
    expect(getContinuingEducationReport).toHaveBeenCalledWith(
      staff.principalId,
      expect.objectContaining({ scopeId: SCOPE }),
    );
  });

  it("branch=validation/risk=malformed-input: reflection report with invalid query (422)", async () => {
    const getReflectionManagementReport = vi.fn();
    const response = await handleReflectionManagementReport(
      getRequest({ scopeId: "not-a-uuid" }),
      "request-1",
      staff,
      baseDependencies({ getReflectionManagementReport }),
    );
    expect(response.status).toBe(422);
    expect(getReflectionManagementReport).not.toHaveBeenCalled();
  });

  it("branch=forbidden/risk=privilege-escalation: reflection report denied to participant (403)", async () => {
    const getReflectionManagementReport = vi.fn();
    const response = await handleReflectionManagementReport(
      getRequest({ scopeId: SCOPE }),
      "request-1",
      participant,
      baseDependencies({ getReflectionManagementReport }),
    );
    expect(response.status).toBe(403);
    expect(getReflectionManagementReport).not.toHaveBeenCalled();
  });
});
