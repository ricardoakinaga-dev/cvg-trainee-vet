import { canAccess } from "./authorization.js";
import { hashAuthoringFingerprint } from "./authoring-idempotency.js";
import { ApplicationError } from "./errors.js";
import type {
  AdvanceContentCommand,
  ContentRecord,
} from "./content-use-cases.js";
import type {
  AuthoringIdempotencyRecord,
  AuthoringPreflightResult,
  AuthoringPublicationDependencies,
  AuthoringPublicationResult,
  AuthoringRecord,
  AuthoringTransactionalOperations,
  ClinicalReviewRecord,
  PublishAuthoringCommand,
} from "./authoring-use-cases.js";

export type AuthoringPublicationMethodsDependencies = Readonly<{
  readonly runPreflight: (record: AuthoringRecord) => AuthoringPreflightResult;
}>;

export type AuthoringPublicationMethods = Readonly<{
  readonly publish: (
    command: PublishAuthoringCommand,
    dependencies: AuthoringPublicationDependencies,
  ) => Promise<Readonly<{ record: AuthoringRecord }>>;
}>;

function assertNonEmpty(value: unknown, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApplicationError("validation_error", `${field} is required`);
  }
}

function validatePublishCommand(command: PublishAuthoringCommand): void {
  for (const [value, field] of [
    [command.principalId, "principalId"],
    [command.contentId, "contentId"],
    [command.scopeId, "scopeId"],
    [command.correlationId, "correlationId"],
    [command.idempotencyKey, "idempotencyKey"],
  ] as const) {
    assertNonEmpty(value, field);
  }
  if (!Number.isInteger(command.version) || command.version < 1) {
    throw new ApplicationError("validation_error", "version is invalid");
  }
}

function assertPublicationAccess(command: PublishAuthoringCommand): void {
  if (
    !canAccess({
      principalId: command.principalId,
      accountStatus: command.accountStatus,
      roles: command.roles,
      capability: "PUBLISH_CONTENT",
      resource: { scopeId: command.scopeId },
      scopes: command.scopes,
    })
  ) {
    throw new ApplicationError("forbidden", "Publisher is outside the scope");
  }
}

async function findPublicationRecord(
  command: PublishAuthoringCommand,
  repository: AuthoringPublicationDependencies["repository"],
): Promise<AuthoringRecord> {
  const record = await repository.find(command.contentId, command.version);
  if (record === null) {
    throw new ApplicationError("not_found", "Authoring record not found");
  }
  if (record.scopeId !== command.scopeId) {
    throw new ApplicationError("forbidden", "Content is outside the scope");
  }
  return record;
}

async function findIndependentClinicalApproval(
  command: PublishAuthoringCommand,
  record: AuthoringRecord,
  dependencies: AuthoringTransactionalOperations,
): Promise<ClinicalReviewRecord> {
  const latestReview = await dependencies.repository.findLatestClinicalReview(
    command.contentId,
    command.version,
  );
  if (
    record.contentStatus !== "APROVADO_CLINICAMENTE" ||
    latestReview === null ||
    latestReview.decision !== "APROVAR_CLINICAMENTE" ||
    latestReview.reviewerId === record.authorId
  ) {
    throw new ApplicationError(
      "state_conflict",
      "Clinical approval is required before publication",
    );
  }
  const approver = await dependencies.approver.findById(
    latestReview.reviewerId,
  );
  if (
    approver === null ||
    approver.accountStatus !== "ACTIVE" ||
    !approver.roles.includes("CLINICAL_APPROVER") ||
    !approver.scopes.includes(command.scopeId)
  ) {
    throw new ApplicationError(
      "state_conflict",
      "Persisted clinical approval is revoked or outside the scope",
    );
  }
  return latestReview;
}

async function savePublicationPreflight(
  record: AuthoringRecord,
  dependencies: Pick<
    AuthoringPublicationDependencies,
    "repository" | "transition"
  >,
  runPreflight: AuthoringPublicationMethodsDependencies["runPreflight"],
): Promise<
  Readonly<{ preflight: AuthoringPreflightResult; record: AuthoringRecord }>
> {
  const preflight = runPreflight(record);
  const preflightRecord = await dependencies.repository.savePreflight(
    record,
    preflight,
  );
  if (!preflight.readyForPublication) {
    throw new ApplicationError(
      "state_conflict",
      "Automatic source preflight is incomplete",
    );
  }
  return Object.freeze({ preflight, record: preflightRecord });
}

function buildPublicationTransitionCommand(
  command: PublishAuthoringCommand,
  event: AdvanceContentCommand["event"],
  reviewerId: string,
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
    approvedClinicalReviewerId: reviewerId,
  };
}

async function transitionToPublished(
  command: PublishAuthoringCommand,
  reviewerId: string,
  dependencies: Pick<
    AuthoringPublicationDependencies,
    "repository" | "transition"
  >,
): Promise<ContentRecord> {
  await dependencies.transition(
    buildPublicationTransitionCommand(
      command,
      "AUTORIZAR_PUBLICACAO",
      reviewerId,
    ),
  );
  return dependencies.transition(
    buildPublicationTransitionCommand(command, "PUBLICAR", reviewerId),
  );
}

async function executePublication(
  command: PublishAuthoringCommand,
  dependencies: AuthoringTransactionalOperations,
  runPreflight: AuthoringPublicationMethodsDependencies["runPreflight"],
): Promise<AuthoringPublicationResult> {
  const record = await findPublicationRecord(command, dependencies.repository);
  const approval = await findIndependentClinicalApproval(
    command,
    record,
    dependencies,
  );
  const prepared = await savePublicationPreflight(
    record,
    dependencies,
    runPreflight,
  );
  const transition = await transitionToPublished(
    command,
    approval.reviewerId,
    dependencies,
  );
  return Object.freeze({
    record: Object.freeze({
      ...prepared.record,
      contentStatus: transition.status,
      preflight: prepared.preflight,
    }),
  });
}

function publicationFingerprint(command: PublishAuthoringCommand): string {
  return hashAuthoringFingerprint({
    operation: "publication",
    principalId: command.principalId,
    accountStatus: command.accountStatus,
    roles: command.roles,
    scopes: command.scopes,
    contentId: command.contentId,
    version: command.version,
    scopeId: command.scopeId,
  });
}

function replayPublicationOrThrow(
  record: AuthoringIdempotencyRecord | null,
  expectedFingerprint: string,
): AuthoringPublicationResult | null {
  if (record === null) return null;
  if (
    record.operation !== "publication" ||
    record.fingerprint !== expectedFingerprint
  ) {
    throw new ApplicationError(
      "idempotency_conflict",
      "Idempotency key was already used with another authoring command",
    );
  }
  return record.result;
}

export function createAuthoringPublicationMethods(
  dependencies: AuthoringPublicationMethodsDependencies,
): AuthoringPublicationMethods {
  return Object.freeze({
    publish: async (command, publicationDependencies) => {
      validatePublishCommand(command);
      assertPublicationAccess(command);
      const expectedFingerprint = publicationFingerprint(command);
      const execute = (
        transactionDependencies: AuthoringTransactionalOperations,
      ): Promise<AuthoringPublicationResult> =>
        executePublication(
          command,
          transactionDependencies,
          dependencies.runPreflight,
        );
      return publicationDependencies.transaction.run(
        async (transactionDependencies) => {
          const replay = replayPublicationOrThrow(
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
              operation: "publication",
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
