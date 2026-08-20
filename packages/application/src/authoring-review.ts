import { canAccess, type Capability } from "./authorization.js";
import { hashAuthoringFingerprint } from "./authoring-idempotency.js";
import { ApplicationError } from "./errors.js";
import type {
  AdvanceContentCommand,
  ContentRecord,
} from "./content-use-cases.js";
import type {
  AuthoringPreflightResult,
  AuthoringIdempotencyRecord,
  AuthoringRecord,
  AuthoringReviewDependencies,
  AuthoringReviewResult,
  AuthoringTransactionalOperations,
  ClinicalReviewRecord,
  ReviewAuthoringCommand,
} from "./authoring-use-cases.js";

export type AuthoringReviewMethodsDependencies = Readonly<{
  readonly runPreflight: (record: AuthoringRecord) => AuthoringPreflightResult;
}>;

export type AuthoringReviewMethods = Readonly<{
  readonly review: (
    command: ReviewAuthoringCommand,
    dependencies: AuthoringReviewDependencies,
  ) => Promise<
    Readonly<{ record: AuthoringRecord; review: ClinicalReviewRecord }>
  >;
}>;

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new ApplicationError("validation_error", `${field} is required`);
  }
}

function validateReviewCommand(command: ReviewAuthoringCommand): void {
  for (const [value, field] of [
    [command.principalId, "principalId"],
    [command.contentId, "contentId"],
    [command.scopeId, "scopeId"],
    [command.rationale, "rationale"],
    [command.correlationId, "correlationId"],
    [command.idempotencyKey, "idempotencyKey"],
  ] as const) {
    assertNonEmpty(value, field);
  }
  if (!Number.isInteger(command.version) || command.version < 1) {
    throw new ApplicationError("validation_error", "version is invalid");
  }
  if (command.rationale.length > 10_000 || /<[^>]*>/u.test(command.rationale)) {
    throw new ApplicationError(
      "validation_error",
      "rationale must be plain text",
    );
  }
}

function reviewCapability(command: ReviewAuthoringCommand): Capability {
  return command.decision === "APROVAR_CLINICAMENTE"
    ? "APPROVE_CLINICAL_CONTENT"
    : "MODERATE_CONTENT";
}

function assertReviewAccess(command: ReviewAuthoringCommand): void {
  const approvedClinicalApproverId =
    command.decision === "APROVAR_CLINICAMENTE"
      ? (command.approvedClinicalApproverId ?? command.principalId)
      : command.approvedClinicalApproverId;
  if (
    !canAccess({
      principalId: command.principalId,
      accountStatus: command.accountStatus,
      roles: command.roles,
      capability: reviewCapability(command),
      resource: { scopeId: command.scopeId },
      scopes: command.scopes,
      ...(approvedClinicalApproverId === undefined
        ? {}
        : { approvedClinicalApproverId }),
    })
  ) {
    throw new ApplicationError(
      "forbidden",
      "Clinical review is outside the scope",
    );
  }
}

async function findReviewRecord(
  command: ReviewAuthoringCommand,
  repository: AuthoringReviewDependencies["repository"],
): Promise<AuthoringRecord> {
  const record = await repository.find(command.contentId, command.version);
  if (record === null) {
    throw new ApplicationError("not_found", "Authoring record not found");
  }
  if (record.scopeId !== command.scopeId) {
    throw new ApplicationError("forbidden", "Content is outside the scope");
  }
  if (record.authorId === command.principalId) {
    throw new ApplicationError("forbidden", "Author cannot review own content");
  }
  return record;
}

async function saveTechnicalPreflight(
  record: AuthoringRecord,
  dependencies: Pick<AuthoringReviewDependencies, "repository" | "transition">,
  runPreflight: AuthoringReviewMethodsDependencies["runPreflight"],
): Promise<
  Readonly<{ preflight: AuthoringPreflightResult; record: AuthoringRecord }>
> {
  const preflight = runPreflight(record);
  if (!preflight.technicalChecksPassed) {
    throw new ApplicationError(
      "state_conflict",
      "Technical preflight must pass before clinical review",
    );
  }
  return Object.freeze({
    preflight,
    record: await dependencies.repository.savePreflight(record, preflight),
  });
}

async function assertCurrentClinicalApprover(
  command: ReviewAuthoringCommand,
  dependencies: AuthoringTransactionalOperations,
): Promise<void> {
  if (command.decision !== "APROVAR_CLINICAMENTE") return;
  const approver = await dependencies.approver.findById(command.principalId);
  if (
    approver === null ||
    approver.accountStatus !== "ACTIVE" ||
    !approver.roles.includes("CLINICAL_APPROVER") ||
    !approver.scopes.includes(command.scopeId)
  ) {
    throw new ApplicationError(
      "forbidden",
      "Current clinical approver is not active in the requested scope",
    );
  }
}

function approvedClinicalFields(
  command: ReviewAuthoringCommand,
): Readonly<{ readonly approvedClinicalApproverId?: string }> {
  const approverId =
    command.approvedClinicalApproverId ??
    (command.decision === "APROVAR_CLINICAMENTE"
      ? command.principalId
      : undefined);
  return approverId === undefined
    ? {}
    : { approvedClinicalApproverId: approverId };
}

function buildTransitionCommand(
  command: ReviewAuthoringCommand,
  event: AdvanceContentCommand["event"],
): AdvanceContentCommand {
  return {
    principalId: command.principalId,
    accountStatus: command.accountStatus,
    roles: command.roles,
    scopes: command.scopes,
    contentId: command.contentId,
    version: command.version,
    scopeId: command.scopeId,
    event,
    correlationId: command.correlationId,
    ...approvedClinicalFields(command),
  };
}

async function transitionThroughClinicalReview(
  command: ReviewAuthoringCommand,
  record: AuthoringRecord,
  dependencies: Pick<AuthoringReviewDependencies, "repository" | "transition">,
): Promise<ContentRecord> {
  const requiresReopen = record.contentStatus === "APROVADO_CLINICAMENTE";
  const requiresSubmission =
    record.contentStatus === "AUTOVERIFICADO" ||
    record.contentStatus === "PROJECAO_VERIFICADA";
  const reviewedStatus = requiresReopen
    ? (
        await dependencies.transition(
          buildTransitionCommand(command, "REABRIR_REVISAO_CLINICA"),
        )
      ).status
    : requiresSubmission
      ? (
          await dependencies.transition(
            buildTransitionCommand(command, "ENVIAR_PARA_REVISAO_CLINICA"),
          )
        ).status
      : record.contentStatus;

  if (reviewedStatus !== "EM_REVISAO_CLINICA") {
    throw new ApplicationError(
      "state_conflict",
      "Content is not awaiting clinical review",
    );
  }
  return dependencies.transition(
    buildTransitionCommand(command, command.decision),
  );
}

function buildClinicalReview(
  command: ReviewAuthoringCommand,
  record: AuthoringRecord,
  idFactory: () => string,
): ClinicalReviewRecord {
  return Object.freeze({
    reviewId: idFactory(),
    contentId: record.contentId,
    version: record.version,
    contentEditorialRecordId: record.editorialRecordId,
    contentVersionId: record.contentVersionId,
    scopeId: record.scopeId,
    reviewerId: command.principalId,
    decision: command.decision,
    rationale: command.rationale,
    correlationId: command.correlationId,
    reviewedAt: new Date().toISOString(),
  });
}

async function executeClinicalReview(
  command: ReviewAuthoringCommand,
  dependencies: AuthoringTransactionalOperations,
  runPreflight: AuthoringReviewMethodsDependencies["runPreflight"],
): Promise<AuthoringReviewResult> {
  const record = await findReviewRecord(command, dependencies.repository);
  await assertCurrentClinicalApprover(command, dependencies);
  const prepared = await saveTechnicalPreflight(
    record,
    dependencies,
    runPreflight,
  );
  const transition = await transitionThroughClinicalReview(
    command,
    record,
    dependencies,
  );
  const review = buildClinicalReview(command, record, dependencies.idFactory);
  await dependencies.repository.saveClinicalReview(review);
  return Object.freeze({
    record: Object.freeze({
      ...prepared.record,
      contentStatus: transition.status,
      preflight: prepared.preflight,
    }),
    review,
  });
}

function reviewFingerprint(command: ReviewAuthoringCommand): string {
  return hashAuthoringFingerprint({
    operation: "clinical_review",
    principalId: command.principalId,
    accountStatus: command.accountStatus,
    roles: command.roles,
    scopes: command.scopes,
    contentId: command.contentId,
    version: command.version,
    scopeId: command.scopeId,
    decision: command.decision,
    rationale: command.rationale,
    approvedClinicalApproverId: command.approvedClinicalApproverId ?? null,
  });
}

function replayReviewOrThrow(
  record: AuthoringIdempotencyRecord | null,
  expectedFingerprint: string,
): AuthoringReviewResult | null {
  if (record === null) return null;
  if (
    record.operation !== "clinical_review" ||
    record.fingerprint !== expectedFingerprint
  ) {
    throw new ApplicationError(
      "idempotency_conflict",
      "Idempotency key was already used with another authoring command",
    );
  }
  return record.result;
}

export function createAuthoringReviewMethods(
  dependencies: AuthoringReviewMethodsDependencies,
): AuthoringReviewMethods {
  return Object.freeze({
    review: async (command, reviewDependencies) => {
      validateReviewCommand(command);
      assertReviewAccess(command);
      const expectedFingerprint = reviewFingerprint(command);
      const execute = (
        transactionDependencies: AuthoringTransactionalOperations,
      ): Promise<AuthoringReviewResult> =>
        executeClinicalReview(
          command,
          transactionDependencies,
          dependencies.runPreflight,
        );
      return reviewDependencies.transaction.run(
        async (transactionDependencies) => {
          const replay = replayReviewOrThrow(
            await transactionDependencies.idempotency.find(
              command.idempotencyKey,
            ),
            expectedFingerprint,
          );
          if (replay !== null) return replay;
          const result = await execute(transactionDependencies);
          await transactionDependencies.idempotency.store(
            command.idempotencyKey,
            {
              operation: "clinical_review",
              fingerprint: expectedFingerprint,
              result,
            },
          );
          return result;
        },
      );
    },
  });
}
