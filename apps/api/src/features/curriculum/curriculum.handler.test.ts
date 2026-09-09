import { describe, expect, it, vi } from "vitest";

import type {
  ApiHttpDependencies,
  ApiHttpRequest,
  ApiPrincipal,
} from "../../http.js";
import {
  handleCreateAssessmentWorkflow,
  handleCreateLearningAssignment,
  handleDashboard,
  handleLearningPath,
  handleTransitionAssessmentWorkflow,
  handleTransitionLearningAssignment,
} from "./curriculum.handler.js";

const SCOPE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PARTICIPANT_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ASSIGNMENT_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const RESULT_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

const principal: ApiPrincipal = {
  principalId: PARTICIPANT_ID,
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

function request(body: unknown): ApiHttpRequest {
  return { method: "POST", path: "/api/v1/internal/x", body };
}

describe("curriculum feature handlers", () => {
  it("branch=forbidden/risk=scope-escalation: learning path denied without owned scope (403)", async () => {
    const getParticipantLearningJourney = vi.fn();
    const outsider: ApiPrincipal = { ...principal, scopes: [] };
    const response = await handleLearningPath(
      "request-1",
      outsider,
      baseDependencies({ getParticipantLearningJourney }),
    );
    expect(response.status).toBe(403);
    expect(getParticipantLearningJourney).not.toHaveBeenCalled();
  });

  it("branch=forbidden/risk=identity-confusion: learning path rejects foreign journey (403)", async () => {
    const getParticipantLearningJourney = vi.fn(async () => ({
      participantId: "00000000-0000-4000-8000-000000000000",
      assignments: [],
      activities: [],
      results: [],
      runtimes: [],
    }));
    const response = await handleLearningPath(
      "request-1",
      principal,
      baseDependencies({ getParticipantLearningJourney }),
    );
    expect(response.status).toBe(403);
  });

  it("branch=forbidden/risk=privilege-escalation: staff dashboard without port (403)", async () => {
    const admin: ApiPrincipal = { ...principal, roles: ["ADMIN"] };
    const response = await handleDashboard(
      "request-1",
      admin,
      baseDependencies(),
    );
    expect(response.status).toBe(403);
  });

  it("branch=validation/risk=malformed-input: create assignment with invalid body (422)", async () => {
    const createLearningAssignment = vi.fn();
    const response = await handleCreateLearningAssignment(
      request({ scopeId: SCOPE }),
      "request-1",
      principal,
      baseDependencies({ createLearningAssignment }),
    );
    expect(response.status).toBe(422);
    expect(createLearningAssignment).not.toHaveBeenCalled();
  });

  it("branch=validation/risk=replay-confusion: transition assignment on id mismatch (422)", async () => {
    const transitionLearningAssignment = vi.fn();
    const response = await handleTransitionLearningAssignment(
      request({
        assignmentId: ASSIGNMENT_ID,
        participantId: PARTICIPANT_ID,
        scopeId: SCOPE,
        version: 1,
        event: "DISPONIBILIZAR",
      }),
      "00000000-0000-4000-8000-000000000000",
      "request-1",
      principal,
      baseDependencies({ transitionLearningAssignment }),
    );
    expect(response.status).toBe(422);
    expect(transitionLearningAssignment).not.toHaveBeenCalled();
  });

  it("branch=validation/risk=malformed-input: create workflow with invalid body (422)", async () => {
    const createAssessmentWorkflow = vi.fn();
    const response = await handleCreateAssessmentWorkflow(
      request({ scopeId: SCOPE }),
      "request-1",
      principal,
      baseDependencies({ createAssessmentWorkflow }),
    );
    expect(response.status).toBe(422);
    expect(createAssessmentWorkflow).not.toHaveBeenCalled();
  });

  it("branch=validation/risk=replay-confusion: transition workflow on id mismatch (422)", async () => {
    const transitionAssessmentWorkflow = vi.fn();
    const response = await handleTransitionAssessmentWorkflow(
      request({
        resultId: RESULT_ID,
        participantId: PARTICIPANT_ID,
        scopeId: SCOPE,
        version: 1,
        event: "CORRIGIR",
      }),
      "00000000-0000-4000-8000-000000000000",
      "request-1",
      principal,
      baseDependencies({ transitionAssessmentWorkflow }),
    );
    expect(response.status).toBe(422);
    expect(transitionAssessmentWorkflow).not.toHaveBeenCalled();
  });
});
