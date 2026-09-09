import {
  apiSuccessResponse,
  authoringDraftCreateRequestSchema,
  authoringReviewRequestSchema,
  contentReviewQueueProjectionSchema,
  contentReviewQueueQuerySchema,
  contentTransitionRequestSchema,
  internalAuthoringRecordQuerySchema,
  parseInternalAuthoringRecordProjection,
  type ApiSuccessEnvelope,
} from "@cvg/contracts";
import type {
  AdvanceContentCommand,
  AuthoringRecord,
  ContentReviewQueueState,
  CreateAuthoringDraftCommand,
  ReviewAuthoringCommand,
  Capability,
} from "@cvg/application";

import {
  errorResponse,
  validationResponse,
  type ApiHttpResponse,
} from "../../http/errors.js";
import type {
  ApiHttpDependencies,
  ApiHttpRequest,
  ApiPrincipal,
} from "../../http.js";
import { isAllowed } from "../../http/authorization.js";

export function internalAuthoringProjection(
  record: AuthoringRecord,
  availableActions: Readonly<{
    readonly requestAdjustments: boolean;
    readonly approveClinically: boolean;
  }>,
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
    ...(record.latestReview === undefined
      ? {}
      : { latestReview: record.latestReview }),
    availableActions,
  });
}

export function internalAuthoringAvailableActions(
  record: AuthoringRecord,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Readonly<{
  readonly requestAdjustments: boolean;
  readonly approveClinically: boolean;
}> {
  const reviewable = record.contentStatus === "EM_REVISAO_CLINICA";
  return {
    requestAdjustments:
      reviewable &&
      isAllowed(
        principal,
        "MODERATE_CONTENT",
        { scopeId: record.scopeId },
        dependencies.approvedClinicalApproverId,
      ),
    approveClinically:
      reviewable &&
      isAllowed(
        principal,
        "APPROVE_CLINICAL_CONTENT",
        { scopeId: record.scopeId },
        dependencies.approvedClinicalApproverId,
      ),
  };
}

export function publicContentReviewQueueProjection(
  state: ContentReviewQueueState,
): ApiSuccessEnvelope<unknown>["data"] {
  return contentReviewQueueProjectionSchema.parse({
    kind: state.kind,
    scopeId: state.scopeId,
    generatedAt: state.generatedAt,
    filters: { ...state.filters },
    items: state.items.map((item) => ({
      ...item,
      preflight: { ...item.preflight },
      ...(item.latestReview === undefined
        ? {}
        : { latestReview: { ...item.latestReview } }),
    })),
  });
}

export async function handleContentReviewQueue(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const rawQuery = request.query ?? {};
  const rawLimit = rawQuery.limit;
  const parsed = contentReviewQueueQuerySchema.safeParse({
    scopeId: rawQuery.scopeId,
    ...(rawQuery.status === undefined ? {} : { status: rawQuery.status }),
    ...(rawLimit === undefined ? {} : { limit: Number(rawLimit) }),
  });
  if (!parsed.success) return validationResponse(requestId);
  if (dependencies.getContentReviewQueue === undefined) {
    return errorResponse("internal_error", requestId);
  }
  if (
    !isAllowed(
      principal,
      "VIEW_CONTENT_REVIEW_QUEUE",
      {
        scopeId: parsed.data.scopeId,
      },
      dependencies.approvedClinicalApproverId,
    )
  ) {
    return errorResponse("forbidden", requestId);
  }
  const state = await dependencies.getContentReviewQueue({
    principalId: principal.principalId,
    accountStatus: principal.accountStatus,
    roles: principal.roles,
    scopes: principal.scopes,
    ...(dependencies.approvedClinicalApproverId === undefined
      ? {}
      : {
          approvedClinicalApproverId: dependencies.approvedClinicalApproverId,
        }),
    query: {
      scopeId: parsed.data.scopeId,
      ...(parsed.data.status === undefined
        ? {}
        : { status: parsed.data.status }),
      limit: parsed.data.limit,
    },
  });
  return {
    status: 200,
    body: apiSuccessResponse(
      publicContentReviewQueueProjection(state),
      requestId,
    ),
  };
}

export async function handleContentTransition(
  request: ApiHttpRequest,
  contentId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const parsed = contentTransitionRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);

  const baseCommand = {
    principalId: principal.principalId,
    accountStatus: principal.accountStatus,
    roles: principal.roles,
    scopes: principal.scopes,
    contentId,
    version: parsed.data.version,
    scopeId: parsed.data.scopeId,
    event: parsed.data.event,
    correlationId: requestId,
  } satisfies AdvanceContentCommand;
  const command: AdvanceContentCommand =
    dependencies.approvedClinicalApproverId === undefined
      ? baseCommand
      : {
          ...baseCommand,
          approvedClinicalApproverId: dependencies.approvedClinicalApproverId,
        };
  const result = await dependencies.advanceContent(command);

  return {
    status: 200,
    body: apiSuccessResponse(
      {
        contentId: result.contentId,
        version: result.version,
        status: result.status,
      },
      requestId,
    ),
  };
}

export async function handleCreateAuthoringDraft(
  request: ApiHttpRequest,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const parsed = authoringDraftCreateRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);
  if (dependencies.createAuthoringDraft === undefined) {
    return errorResponse("internal_error", requestId);
  }
  if (
    !isAllowed(principal, "AUTHOR_CONTENT", {
      scopeId: parsed.data.scopeId,
    })
  ) {
    return errorResponse("forbidden", requestId);
  }
  const { choices, correctChoiceIds, rubric, ...requiredDraftFields } =
    parsed.data;
  const command: CreateAuthoringDraftCommand = {
    ...requiredDraftFields,
    ...(choices === undefined ? {} : { choices }),
    ...(correctChoiceIds === undefined ? {} : { correctChoiceIds }),
    ...(rubric === undefined ? {} : { rubric }),
    principalId: principal.principalId,
    accountStatus: principal.accountStatus,
    roles: principal.roles,
    scopes: principal.scopes,
    correlationId: requestId,
  };
  const record = await dependencies.createAuthoringDraft(command);
  if (
    record.authorId !== principal.principalId ||
    record.scopeId !== parsed.data.scopeId ||
    record.contentStatus !== "RASCUNHO" ||
    record.preflight.readyForPublication === true
  ) {
    return errorResponse("internal_error", requestId);
  }
  return {
    status: 201,
    body: apiSuccessResponse(
      internalAuthoringProjection(
        record,
        internalAuthoringAvailableActions(record, principal, dependencies),
      ),
      requestId,
    ),
  };
}

export async function handleInternalAuthoringRecord(
  request: ApiHttpRequest,
  contentId: string,
  versionText: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const parsedQuery = internalAuthoringRecordQuerySchema.safeParse(
    request.query ?? {},
  );
  if (!parsedQuery.success) return validationResponse(requestId, "scopeId");
  const version = Number(versionText);
  if (!Number.isSafeInteger(version) || version < 1) {
    return validationResponse(requestId, "version");
  }
  if (dependencies.getInternalAuthoringRecord === undefined) {
    return errorResponse("internal_error", requestId);
  }
  if (
    !isAllowed(
      principal,
      "VIEW_INTERNAL_SOURCE",
      { scopeId: parsedQuery.data.scopeId },
      dependencies.approvedClinicalApproverId,
    )
  ) {
    return errorResponse("forbidden", requestId);
  }
  const record = await dependencies.getInternalAuthoringRecord(
    contentId,
    version,
    parsedQuery.data.scopeId,
  );
  if (record === null) return errorResponse("not_found", requestId);
  if (record.scopeId !== parsedQuery.data.scopeId) {
    return errorResponse("forbidden", requestId);
  }
  const isScopedStaff =
    principal.roles.includes("MODERATOR") ||
    principal.roles.includes("ADMIN") ||
    (principal.roles.includes("CLINICAL_APPROVER") &&
      dependencies.approvedClinicalApproverId === principal.principalId);
  if (!isScopedStaff && record.authorId !== principal.principalId) {
    return errorResponse("forbidden", requestId);
  }
  const availableActions = {
    ...internalAuthoringAvailableActions(record, principal, dependencies),
  } as const;
  return {
    status: 200,
    body: apiSuccessResponse(
      internalAuthoringProjection(record, availableActions),
      requestId,
    ),
  };
}

export async function handleAuthoringReview(
  request: ApiHttpRequest,
  contentId: string,
  requestId: string,
  principal: ApiPrincipal,
  dependencies: ApiHttpDependencies,
): Promise<ApiHttpResponse> {
  const parsed = authoringReviewRequestSchema.safeParse(request.body);
  if (!parsed.success) return validationResponse(requestId);
  if (dependencies.reviewAuthoringContent === undefined) {
    return errorResponse("internal_error", requestId);
  }
  const capability: Capability =
    parsed.data.decision === "APROVAR_CLINICAMENTE"
      ? "APPROVE_CLINICAL_CONTENT"
      : "MODERATE_CONTENT";
  if (
    !isAllowed(
      principal,
      capability,
      { scopeId: parsed.data.scopeId },
      dependencies.approvedClinicalApproverId,
    )
  ) {
    return errorResponse("forbidden", requestId);
  }
  const command: ReviewAuthoringCommand = {
    principalId: principal.principalId,
    accountStatus: principal.accountStatus,
    roles: principal.roles,
    scopes: principal.scopes,
    contentId,
    version: parsed.data.version,
    scopeId: parsed.data.scopeId,
    decision: parsed.data.decision,
    rationale: parsed.data.rationale,
    correlationId: requestId,
    ...(dependencies.approvedClinicalApproverId === undefined
      ? {}
      : {
          approvedClinicalApproverId: dependencies.approvedClinicalApproverId,
        }),
  };
  const result = await dependencies.reviewAuthoringContent(command);
  return {
    status: 200,
    body: apiSuccessResponse(
      internalAuthoringProjection(result.record, {
        ...internalAuthoringAvailableActions(
          result.record,
          principal,
          dependencies,
        ),
      }),
      requestId,
    ),
  };
}
