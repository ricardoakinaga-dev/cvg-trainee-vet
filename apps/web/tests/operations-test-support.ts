export function unavailableResponse(): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: { code: "synthetic_unavailable", message: "Synthetic fixture." },
    }),
    { status: 503, headers: { "content-type": "application/json" } },
  );
}

export function successResponse(
  data: unknown,
  meta: Readonly<Record<string, unknown>> = {},
): Response {
  return new Response(
    JSON.stringify({
      success: true,
      data,
      meta: { request_id: "browser-test", ...meta },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

export function staffDashboard(participants: readonly unknown[] = []) {
  return {
    kind: "staff",
    scopes: ["22222222-2222-4222-8222-222222222222"],
    generatedAt: "2026-10-02T00:00:00.000Z",
    metrics: {
      invitedParticipants: 0,
      activeParticipants: 0,
      inactiveParticipants: 0,
      assignedModules: 0,
      completedModules: 0,
      completionRatePercent: null,
      medianProgressPercent: null,
      pendingCorrections: 0,
      remediationParticipants: 0,
      retentionReviewsPending: 0,
      openFeedback: 0,
      content: { published: 0, inReview: 0, expired: 0, withdrawn: 0 },
    },
    participants,
  };
}

export function readyDependencies(): Response {
  return successResponse({
    status: "READY",
    dependencies: { postgres: "UP", qdrant: "DISABLED", ai: "DISABLED" },
  });
}
