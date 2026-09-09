import { describe, expect, it, vi } from "vitest";

import { handleApiRequest } from "../http.js";
import {
  attempt,
  continuingEducationReport,
  dependencies,
  reflectionManagementReport,
} from "./fixtures.js";

describe("API HTTP boundary — reports boundary", () => {
  it("returns the filtered digital participation report only to scoped staff", async () => {
    const getContinuingEducationReport = vi.fn(
      async () => continuingEducationReport,
    );
    const response = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/internal/reports/continuing-education",
        query: {
          scopeId: "11111111-1111-4111-8111-111111111111",
          moduleId: "M02",
          accountStatus: "ACTIVE",
        },
        body: undefined,
      },
      dependencies({
        authenticate: async () => ({
          principalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: ["11111111-1111-4111-8111-111111111111"],
        }),
        getContinuingEducationReport,
      }),
    );

    expect(response.status).toBe(200);
    expect(getContinuingEducationReport).toHaveBeenCalledWith(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      {
        scopeId: "11111111-1111-4111-8111-111111111111",
        moduleId: "M02",
        accountStatus: "ACTIVE",
      },
    );
    expect(response.body).toMatchObject({
      success: true,
      data: {
        kind: "continuing_education_report",
        summary: { completedDigitalHours: 6 },
        hoursClaim: "NAO_CREDENCIADAS",
        practicalCompetenceClaim: "PROIBIDO_MVP",
      },
    });
  });
  it("fails closed for an invalid or cross-scope metrics query", async () => {
    const getContinuingEducationReport = vi.fn(
      async () => continuingEducationReport,
    );
    const dependenciesValue = dependencies({
      authenticate: async () => ({
        principalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        accountStatus: "ACTIVE",
        roles: ["MODERATOR"],
        scopes: ["11111111-1111-4111-8111-111111111111"],
      }),
      getContinuingEducationReport,
    });
    const invalid = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/internal/reports/continuing-education",
        query: { scopeId: "not-a-uuid" },
        body: undefined,
      },
      dependenciesValue,
    );
    expect(invalid.status).toBe(422);
    expect(getContinuingEducationReport).not.toHaveBeenCalled();

    const crossScope = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/internal/reports/continuing-education",
        query: { scopeId: "44444444-4444-4444-8444-444444444444" },
        body: undefined,
      },
      dependenciesValue,
    );
    expect(crossScope.status).toBe(403);
    expect(getContinuingEducationReport).not.toHaveBeenCalled();
  });
  it("passes bounded report pagination to the scoped application port", async () => {
    const getContinuingEducationReport = vi.fn(
      async () => continuingEducationReport,
    );
    const response = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/internal/reports/continuing-education",
        query: {
          scopeId: "11111111-1111-4111-8111-111111111111",
          page: "2",
          pageSize: "50",
        },
        body: undefined,
      },
      dependencies({
        authenticate: async () => ({
          principalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: ["11111111-1111-4111-8111-111111111111"],
        }),
        getContinuingEducationReport,
      }),
    );

    expect(response.status).toBe(200);
    expect(getContinuingEducationReport).toHaveBeenCalledWith(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      {
        scopeId: "11111111-1111-4111-8111-111111111111",
        page: 2,
        pageSize: 50,
      },
    );
  });
  it("returns only scoped reflection state counts and never participant responses", async () => {
    const getReflectionManagementReport = vi.fn(
      async () => reflectionManagementReport,
    );
    const response = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/internal/reports/reflections",
        query: {
          scopeId: "11111111-1111-4111-8111-111111111111",
        },
        body: undefined,
      },
      dependencies({
        authenticate: async () => ({
          principalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: ["11111111-1111-4111-8111-111111111111"],
        }),
        getReflectionManagementReport,
      }),
    );

    expect(response.status).toBe(200);
    expect(getReflectionManagementReport).toHaveBeenCalledWith(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      { scopeId: "11111111-1111-4111-8111-111111111111" },
    );
    expect(response.body).toMatchObject({
      success: true,
      data: {
        kind: "reflection_management_aggregate",
        modules: [
          {
            moduleId: "M02",
            counts: {
              NAO_INICIADA: 1,
              EM_ANDAMENTO: 1,
              CONCLUIDA: 1,
            },
          },
        ],
        practicalCompetenceClaim: "PROIBIDO_MVP",
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("participantId");
    expect(JSON.stringify(response.body)).not.toContain("response");
  });
  it("fails closed for participant, cross-scope, and unexpected reflection query input", async () => {
    const getReflectionManagementReport = vi.fn(
      async () => reflectionManagementReport,
    );
    const participant = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/internal/reports/reflections",
        query: {
          scopeId: "11111111-1111-4111-8111-111111111111",
        },
        body: undefined,
      },
      dependencies({ getReflectionManagementReport }),
    );
    expect(participant.status).toBe(403);

    const crossScope = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/internal/reports/reflections",
        query: {
          scopeId: "44444444-4444-4444-8444-444444444444",
        },
        body: undefined,
      },
      dependencies({
        authenticate: async () => ({
          principalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: ["11111111-1111-4111-8111-111111111111"],
        }),
        getReflectionManagementReport,
      }),
    );
    expect(crossScope.status).toBe(403);

    const unexpected = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/internal/reports/reflections",
        query: {
          scopeId: "11111111-1111-4111-8111-111111111111",
          participantId: attempt.participantId,
        },
        body: undefined,
      },
      dependencies({
        authenticate: async () => ({
          principalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: ["11111111-1111-4111-8111-111111111111"],
        }),
        getReflectionManagementReport,
      }),
    );
    expect(unexpected.status).toBe(422);
    expect(getReflectionManagementReport).not.toHaveBeenCalled();
  });
});
