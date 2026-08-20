import { redactFeedbackContent } from "@cvg/domain";
import type {
  AnswerState,
  AppealState,
  AssessmentWorkflowState,
  AttemptState,
  FeedbackTicketState,
  LearningAssignmentState,
} from "@cvg/domain";
import {
  projectParticipantDigitalCaseRuntime,
  type AuthoringRecord,
  type ClinicalReviewQueuePage,
  type CorrectionResult,
  type CurriculumRuntimeState,
  type DigitalCaseRuntimeRecord,
  type ParticipantActivityState,
  type ParticipantLearningJourneyState,
  type ParticipantProgressState,
  type ScopedFeedbackTicket,
} from "@cvg/application";
import {
  correctionResultProjectionSchema,
  internalFeedbackTicketProjectionSchema,
  parseClinicalReviewQueuePage,
  parseInternalAuthoringRecordProjection,
  parseParticipantActivity,
  parseParticipantAttempt,
  parseParticipantCurriculumRuntime,
  parseParticipantDigitalCaseRuntime,
  parseParticipantLearningJourney,
  parseParticipantProgress,
  participantAppealProjectionSchema,
  participantAssessmentWorkflowProjectionSchema,
  participantFeedbackTicketProjectionSchema,
  participantLearningAssignmentProjectionSchema,
  type ApiSuccessEnvelope,
} from "@cvg/contracts";

export function publicAttemptProjection(
  state: AttemptState,
  answers: readonly AnswerState[] = [],
): ApiSuccessEnvelope<unknown>["data"] {
  return parseParticipantAttempt({
    attemptId: state.attemptId,
    activityId: state.activityId,
    status: state.status,
    version: state.version,
    answers: answers.map((answer) => ({
      itemId: answer.itemId,
      response: answer.response,
      savedAt: answer.savedAt,
    })),
  });
}

export function publicActivityProjection(
  activity: ParticipantActivityState,
): ApiSuccessEnvelope<unknown>["data"] {
  return parseParticipantActivity({
    activityId: activity.activityId,
    slug: activity.slug,
    title: activity.title,
    items: activity.items.map((item) => ({ ...item })),
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

export function publicCurriculumRuntimeProjection(
  state: CurriculumRuntimeState,
): ApiSuccessEnvelope<unknown>["data"] {
  const evaluation = state.evaluation;
  return parseParticipantCurriculumRuntime({
    moduleId: evaluation.moduleId,
    version: state.version,
    status: evaluation.status,
    nextAction: evaluation.nextAction,
    ...(evaluation.scorePercent === undefined
      ? {}
      : { scorePercent: evaluation.scorePercent }),
    remediationCount: evaluation.remediationObjectiveIds.length,
    retentionReviews: evaluation.retentionReviews,
    practicalCompetenceClaim: evaluation.practicalCompetenceClaim,
  });
}

export function publicDigitalCaseRuntimeProjection(
  state: DigitalCaseRuntimeRecord,
): ApiSuccessEnvelope<unknown>["data"] {
  const projection = projectParticipantDigitalCaseRuntime(state);
  return parseParticipantDigitalCaseRuntime({
    moduleId: state.moduleId,
    ...projection,
  });
}

export function publicCorrectionProjection(
  correction: CorrectionResult,
): ApiSuccessEnvelope<unknown>["data"] {
  return correctionResultProjectionSchema.parse({
    attemptStatus: correction.attempt.status,
    attemptVersion: correction.attempt.version,
    resultVersion: correction.result.version,
    score: correction.result.score,
    outcome: correction.result.outcome,
    feedback: correction.result.feedback,
  });
}

export function publicLearningAssignmentProjection(
  state: LearningAssignmentState,
): ApiSuccessEnvelope<unknown>["data"] {
  return participantLearningAssignmentProjectionSchema.parse({
    assignmentId: state.assignmentId,
    moduleId: state.moduleId,
    availableAt: state.availableAt,
    status: state.status,
    version: state.version,
    ...(state.blockReason === undefined
      ? {}
      : { blockReason: state.blockReason }),
    ...(state.resumeAt === undefined ? {} : { resumeAt: state.resumeAt }),
  });
}

export function publicAssessmentWorkflowProjection(
  state: AssessmentWorkflowState,
): ApiSuccessEnvelope<unknown>["data"] {
  return participantAssessmentWorkflowProjectionSchema.parse({
    resultId: state.resultId,
    status: state.status,
    version: state.version,
  });
}

export function publicFeedbackTicketProjection(
  state: FeedbackTicketState,
): ApiSuccessEnvelope<unknown>["data"] {
  return participantFeedbackTicketProjectionSchema.parse({
    ticketId: state.ticketId,
    type: state.type,
    description: redactFeedbackContent(state.description),
    createdAt: state.createdAt,
    ...(state.alertedAt === undefined ? {} : { alertedAt: state.alertedAt }),
    status: state.status,
    version: state.version,
    priority: state.priority ?? "NORMAL",
    history: (
      state.history ?? [{ status: state.status, changedAt: state.createdAt }]
    ).map(({ status, changedAt }) => ({ status, changedAt })),
    ...(state.technicalContext === undefined
      ? {}
      : { technicalContext: state.technicalContext }),
    ...(state.response === undefined
      ? {}
      : {
          response: {
            message: redactFeedbackContent(state.response.message),
            respondedAt: state.response.respondedAt,
          },
        }),
  });
}

export function internalFeedbackTicketProjection(
  scoped: ScopedFeedbackTicket,
): ApiSuccessEnvelope<unknown>["data"] {
  const state = scoped.state;
  return internalFeedbackTicketProjectionSchema.parse({
    ticketId: state.ticketId,
    participantId: state.participantId,
    scopeId: scoped.scopeId,
    type: state.type,
    description: redactFeedbackContent(state.description),
    createdAt: state.createdAt,
    ...(state.alertedAt === undefined ? {} : { alertedAt: state.alertedAt }),
    status: state.status,
    version: state.version,
    priority: state.priority ?? "NORMAL",
    history: state.history ?? [
      { status: state.status, changedAt: state.createdAt },
    ],
    ...(state.assigneeId === undefined ? {} : { assigneeId: state.assigneeId }),
    ...(state.technicalContext === undefined
      ? {}
      : { technicalContext: state.technicalContext }),
    ...(state.response === undefined
      ? {}
      : {
          response: {
            message: redactFeedbackContent(state.response.message),
            respondedAt: state.response.respondedAt,
            ...(state.response.respondedBy === undefined
              ? {}
              : { respondedBy: state.response.respondedBy }),
          },
        }),
  });
}

export function publicAppealProjection(
  state: AppealState,
): ApiSuccessEnvelope<unknown>["data"] {
  return participantAppealProjectionSchema.parse({
    appealId: state.appealId,
    attemptId: state.attemptId,
    itemId: state.itemId,
    status: state.status,
    version: state.version,
    ...(state.decision === undefined ? {} : { decision: state.decision }),
  });
}

export function publicLearningJourneyProjection(
  state: ParticipantLearningJourneyState,
): ApiSuccessEnvelope<unknown>["data"] {
  return parseParticipantLearningJourney({
    assignments: state.assignments.map(({ state: assignment }) =>
      publicLearningAssignmentProjection(assignment),
    ),
    activities: state.activities.map((activity) => ({
      activityId: activity.activityId,
      slug: activity.slug,
      title: activity.title,
      status: activity.status,
      ...(activity.attemptId === undefined
        ? {}
        : { attemptId: activity.attemptId }),
      ...(activity.attemptStatus === undefined
        ? {}
        : { attemptStatus: activity.attemptStatus }),
      ...(activity.attemptVersion === undefined
        ? {}
        : { attemptVersion: activity.attemptVersion }),
      nextAction: activity.nextAction,
    })),
    results: state.results.map(({ state: result }) =>
      publicAssessmentWorkflowProjection(result),
    ),
    runtimes: state.runtimes.map((runtime) =>
      publicCurriculumRuntimeProjection(runtime),
    ),
    nextAction: state.nextAction ?? "CONSULTAR_PROXIMO_PASSO",
  });
}

export function internalAuthoringProjection(
  record: AuthoringRecord,
): ApiSuccessEnvelope<unknown>["data"] {
  return parseInternalAuthoringRecordProjection({
    contentId: record.contentId,
    version: record.version,
    scopeId: record.scopeId,
    moduleId: record.moduleId,
    sessionId: record.sessionId,
    objectiveId: record.objectiveId,
    authorId: record.authorId,
    contentStatus: record.contentStatus,
    item: {
      title: record.title,
      prompt: record.prompt,
      responseMode: record.responseMode,
      ...(record.choices === undefined ? {} : { choices: record.choices }),
      ...(record.correctChoiceIds === undefined
        ? {}
        : { correctChoiceIds: record.correctChoiceIds }),
      ...(record.rubric === undefined ? {} : { rubric: record.rubric }),
      feedback: record.feedback,
      critical: record.critical,
      remediationTargetObjectiveId: record.remediationTargetObjectiveId,
      sourceRefs: record.sourceRefs,
      participant: record.participant,
    },
    preflight: record.preflight,
  });
}

export function clinicalReviewQueueProjection(
  page: ClinicalReviewQueuePage,
): ApiSuccessEnvelope<unknown>["data"] {
  return parseClinicalReviewQueuePage({
    items: page.items.map((item) => ({
      contentId: item.contentId,
      version: item.version,
      scopeId: item.scopeId,
      moduleId: item.moduleId,
      sessionId: item.sessionId,
      objectiveId: item.objectiveId,
      authorId: item.authorId,
      contentStatus: item.contentStatus,
      reviewStatus: item.reviewStatus,
      technicalChecksPassed: item.technicalChecksPassed,
      latestReview:
        item.latestReview === null
          ? null
          : {
              decision: item.latestReview.decision,
              reviewedAt: item.latestReview.reviewedAt,
            },
    })),
    page: page.page,
    perPage: page.perPage,
    total: page.total,
  });
}
