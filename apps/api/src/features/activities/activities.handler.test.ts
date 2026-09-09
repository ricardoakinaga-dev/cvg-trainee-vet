import { describe, expect, it, vi } from "vitest";

import type { ApiHttpDependencies, ApiPrincipal } from "../../http.js";
import { handleActivity, handleProgress } from "./activities.handler.js";

const ACTIVITY_ID = "33333333-3333-4333-8333-333333333333";
const PARTICIPANT_ID = "22222222-2222-4222-8222-222222222222";
const SCOPE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const principal: ApiPrincipal = {
  principalId: PARTICIPANT_ID,
  accountStatus: "ACTIVE",
  roles: ["PARTICIPANT"],
  scopes: [SCOPE],
};

const activity = {
  activityId: ACTIVITY_ID,
  scopeId: SCOPE,
  slug: "atividade-sintetica",
  title: "Atividade sintética",
  items: [],
} as const;

function baseDependencies(
  overrides: Partial<ApiHttpDependencies> = {},
): ApiHttpDependencies {
  return {
    requestIdFactory: () => "request-1",
    ...overrides,
  } as ApiHttpDependencies;
}

describe("activities feature handlers", () => {
  it("branch=forbidden/risk=scope-escalation: activity outside owned scope (403)", async () => {
    const getParticipantActivity = vi.fn(async () => ({
      ...activity,
      scopeId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
    }));
    const response = await handleActivity(
      ACTIVITY_ID,
      "request-1",
      principal,
      baseDependencies({ getParticipantActivity }),
    );
    expect(response.status).toBe(403);
  });

  it("branch=happy-path/risk=none: returns the owned activity (200)", async () => {
    const getParticipantActivity = vi.fn(async () => ({ ...activity }));
    const response = await handleActivity(
      ACTIVITY_ID,
      "request-1",
      principal,
      baseDependencies({ getParticipantActivity }),
    );
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: { activityId: ACTIVITY_ID },
    });
  });

  it("branch=forbidden/risk=scope-escalation: progress outside owned scope (403)", async () => {
    const getParticipantProgress = vi.fn(async () => ({
      participantId: PARTICIPANT_ID,
      activityId: ACTIVITY_ID,
      scopeId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
      assignmentStatus: "EM_ANDAMENTO" as const,
      nextAction: "RETOMAR_ATIVIDADE" as const,
    }));
    const response = await handleProgress(
      ACTIVITY_ID,
      "request-1",
      principal,
      baseDependencies({ getParticipantProgress }),
    );
    expect(response.status).toBe(403);
  });

  it("branch=happy-path/risk=none: returns progress without internals (200)", async () => {
    const getParticipantProgress = vi.fn(async () => ({
      participantId: PARTICIPANT_ID,
      activityId: ACTIVITY_ID,
      scopeId: SCOPE,
      assignmentStatus: "EM_ANDAMENTO" as const,
      nextAction: "RETOMAR_ATIVIDADE" as const,
    }));
    const response = await handleProgress(
      ACTIVITY_ID,
      "request-1",
      principal,
      baseDependencies({ getParticipantProgress }),
    );
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: { activityId: ACTIVITY_ID },
    });
  });
});
