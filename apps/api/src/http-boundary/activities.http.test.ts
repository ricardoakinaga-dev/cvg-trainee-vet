import { describe, expect, it, vi } from "vitest";

import { ApplicationError } from "@cvg/application";

import { handleApiRequest } from "../http.js";
import {
  activity,
  answer,
  attempt,
  dependencies,
  progress,
} from "./fixtures.js";

describe("API HTTP boundary — activities boundary", () => {
  it("reads only an assigned published activity projection", async () => {
    const getParticipantActivity = vi.fn(async () => activity);
    const response = await handleApiRequest(
      {
        method: "GET",
        path: `/api/v1/activities/${activity.activityId}`,
        body: undefined,
      },
      dependencies({ getParticipantActivity }),
    );

    expect(response.status).toBe(200);
    expect(getParticipantActivity).toHaveBeenCalledWith(
      attempt.participantId,
      activity.activityId,
    );
    expect(response.body).toMatchObject({
      success: true,
      data: {
        activityId: activity.activityId,
        items: [{ itemId: answer.itemId }],
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("scopeId");
    expect(JSON.stringify(response.body)).not.toContain("source");
  });
  it("reads only the participant progress projection", async () => {
    const getParticipantProgress = vi.fn(async () => progress);
    const response = await handleApiRequest(
      {
        method: "GET",
        path: `/api/v1/activities/${activity.activityId}/progress`,
        body: undefined,
      },
      dependencies({ getParticipantProgress }),
    );

    expect(response.status).toBe(200);
    expect(getParticipantProgress).toHaveBeenCalledWith(
      attempt.participantId,
      activity.activityId,
    );
    expect(response.body).toMatchObject({
      success: true,
      data: {
        activityId: activity.activityId,
        assignmentStatus: "EM_ANDAMENTO",
        nextAction: "RETOMAR_ATIVIDADE",
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("participantId");
    expect(JSON.stringify(response.body)).not.toContain("attemptId");
    expect(JSON.stringify(response.body)).not.toContain("scopeId");
  });
  it("does not turn an unavailable activity into a public success", async () => {
    const response = await handleApiRequest(
      {
        method: "GET",
        path: `/api/v1/activities/${activity.activityId}`,
        body: undefined,
      },
      dependencies({
        getParticipantActivity: async () => {
          throw new ApplicationError(
            "not_found",
            "Activity is not available in the current scope",
          );
        },
      }),
    );

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: "not_found" },
    });
  });
});
