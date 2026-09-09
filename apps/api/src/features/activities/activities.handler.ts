import {
  apiSuccessResponse,
  parseParticipantActivity,
  parseParticipantProgress,
  type ApiSuccessEnvelope,
} from "@cvg/contracts";
import type {
  ParticipantActivityState,
  ParticipantProgressState,
} from "@cvg/application";

import { errorResponse, type ApiHttpResponse } from "../../http/errors.js";
import type { ApiHttpDependencies, ApiPrincipal } from "../../http.js";
import { isAllowed } from "../../http/authorization.js";

export function publicActivityProjection(
  activity: ParticipantActivityState,
): ApiSuccessEnvelope<unknown>["data"] {
  return parseParticipantActivity({
    activityId: activity.activityId,
    slug: activity.slug,
    title: activity.title,
    items: activity.items.map((item) => ({ ...item })),
    ...(activity.reflection === undefined
      ? {}
      : {
          reflection: {
            ...activity.reflection,
            answers: activity.reflection.answers.map((answer) => ({
              ...answer,
            })),
          },
        }),
  });
}

export function publicProgressProjection(
  progress: ParticipantProgressState,
): ApiSuccessEnvelope<unknown>["data"] {
  return parseParticipantProgress({
    activityId: progress.activityId,
    assignmentStatus: progress.assignmentStatus,
    ...(progress.attemptStatus === undefined
      ? {}
      : { attemptStatus: progress.attemptStatus }),
    ...(progress.attemptVersion === undefined
      ? {}
      : { attemptVersion: progress.attemptVersion }),
    nextAction: progress.nextAction,
  });
}

export async function handleActivity(
  activityId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const activity = await dependencies.getParticipantActivity(
    principal.principalId,
    activityId,
  );
  if (
    !isAllowed(principal, "VIEW_OWN_ACTIVITY", {
      ownerId: principal.principalId,
      scopeId: activity.scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }

  return {
    status: 200,
    body: apiSuccessResponse(publicActivityProjection(activity), requestId),
  };
}

export async function handleProgress(
  activityId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const progress = await dependencies.getParticipantProgress(
    principal.principalId,
    activityId,
  );
  if (
    !isAllowed(principal, "VIEW_OWN_ACTIVITY", {
      ownerId: principal.principalId,
      scopeId: progress.scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }

  return {
    status: 200,
    body: apiSuccessResponse(publicProgressProjection(progress), requestId),
  };
}
