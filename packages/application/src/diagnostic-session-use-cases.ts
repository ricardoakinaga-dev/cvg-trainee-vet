import {
  b07DiagnosticDraftPack,
  evaluateDiagnosticAttempt,
  toParticipantActivityFromDiagnosticDraft,
  type Choice,
  type CurriculumDiagnosticResult,
  type DiagnosticEvaluationCatalog,
  type DiagnosticSessionId,
  type ModuleAnswer,
} from "@cvg/curriculum";
import type { DiagnosticSessionState } from "@cvg/domain";

import {
  assignedModuleIdsForDiagnosticResult,
  type MaterializedCurriculumAssignments,
} from "./adaptive-assignment-use-cases.js";
import {
  deriveParticipantDiagnosticProfile,
  type DiagnosticResultState,
} from "./diagnostic-use-cases.js";
import { ApplicationError } from "./errors.js";

export type DiagnosticSessionPublicChoice = Readonly<{
  readonly id: string;
  readonly label: string;
  readonly text: string;
}>;

export type DiagnosticSessionPublicItem = Readonly<{
  readonly publicItemId: string;
  readonly ordinal: number;
  readonly title: string;
  readonly text: string;
  readonly responseMode: "CHOICE";
  readonly choices: readonly DiagnosticSessionPublicChoice[];
  readonly selectionMode: "SINGLE" | "MULTIPLE";
}>;

export type DiagnosticSessionCatalogSnapshotItem = Readonly<{
  readonly canonicalItemId: string;
  readonly publicItemId: string;
  readonly diagnosticSessionId: DiagnosticSessionId;
  readonly objectiveId: string;
  readonly ordinal: number;
  readonly title: string;
  readonly text: string;
  readonly responseMode: "CHOICE";
  readonly choices: readonly Choice[];
  readonly correctChoiceIds: readonly string[];
  readonly selectionMode: "SINGLE" | "MULTIPLE";
}>;

export type DiagnosticSessionCatalogSnapshot = Readonly<{
  readonly diagnosticId: "B07-DIAGNOSTIC-V1";
  readonly diagnosticVersion: "0.1.0";
  readonly status: "RASCUNHO";
  readonly publicationAuthorized: false;
  readonly clinicalReview: "PENDENTE";
  readonly items: readonly DiagnosticSessionCatalogSnapshotItem[];
}>;

export type DiagnosticSessionCatalog = Readonly<{
  readonly diagnosticId: "B07-DIAGNOSTIC-V1";
  readonly diagnosticVersion: "0.1.0";
  readonly status: "RASCUNHO";
  readonly publicationAuthorized: false;
  readonly clinicalReview: "PENDENTE";
  readonly items: readonly DiagnosticSessionPublicItem[];
  readonly snapshot: DiagnosticSessionCatalogSnapshot;
}>;

export type DiagnosticSessionAnswerState = Readonly<{
  readonly canonicalItemId: string;
  readonly selectedChoiceIds: readonly string[];
  readonly savedAt: string;
}>;

export type DiagnosticSessionAggregate = Readonly<{
  readonly session: DiagnosticSessionState;
  readonly catalog: DiagnosticSessionCatalogSnapshot;
  readonly answers: readonly DiagnosticSessionAnswerState[];
  readonly result?: DiagnosticResultState;
}>;

export type DiagnosticSessionEvaluation = Readonly<{
  readonly result: CurriculumDiagnosticResult;
  readonly moduleIds: readonly string[];
}>;

export type StartDiagnosticSessionInput = Readonly<{
  readonly participantId: string;
  readonly scopeId: string;
  readonly startedAt: string;
  readonly idempotencyKey: string;
  readonly correlationId: string;
  readonly catalog?: DiagnosticSessionCatalogSnapshot;
}>;

export type SaveDiagnosticSessionAnswerInput = Readonly<{
  readonly participantId: string;
  readonly scopeId: string;
  readonly sessionId: string;
  readonly expectedVersion: number;
  readonly canonicalItemId: string;
  readonly selectedChoiceIds: readonly string[];
  readonly savedAt: string;
  readonly idempotencyKey: string;
  readonly correlationId: string;
  readonly fingerprint: string;
}>;

export type FinalizeDiagnosticSessionInput = Readonly<{
  readonly participantId: string;
  readonly scopeId: string;
  readonly sessionId: string;
  readonly expectedVersion: number;
  readonly completedAt: string;
  readonly idempotencyKey: string;
  readonly correlationId: string;
  readonly fingerprint: string;
  readonly evaluate: (
    answers: readonly ModuleAnswer[],
    catalog: DiagnosticSessionCatalogSnapshot,
  ) => DiagnosticSessionEvaluation;
}>;

export type DiagnosticSessionFinalizationState = Readonly<{
  readonly aggregate: DiagnosticSessionAggregate;
  readonly assignments: MaterializedCurriculumAssignments;
}>;

export interface DiagnosticSessionRepositoryPort {
  readonly start: (
    input: StartDiagnosticSessionInput &
      Readonly<{ readonly fingerprint: string }>,
  ) => Promise<DiagnosticSessionAggregate>;
  readonly findCurrent: (
    participantId: string,
    scopeId: string,
  ) => Promise<DiagnosticSessionAggregate | null>;
  readonly findById: (
    sessionId: string,
    participantId: string,
    scopeId: string,
  ) => Promise<DiagnosticSessionAggregate | null>;
  readonly saveAnswer: (
    input: SaveDiagnosticSessionAnswerInput,
  ) => Promise<DiagnosticSessionAggregate>;
  readonly finalize: (
    input: FinalizeDiagnosticSessionInput,
  ) => Promise<DiagnosticSessionFinalizationState>;
}

const diagnosticSessionErrorNames: ReadonlyMap<
  string,
  "not_found" | "state_conflict" | "idempotency_conflict"
> = new Map([
  ["DiagnosticSessionNotFoundError", "not_found"],
  ["DiagnosticSessionConflictError", "state_conflict"],
  ["DiagnosticSessionIdempotencyConflictError", "idempotency_conflict"],
] as const);

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new ApplicationError("validation_error", `${field} is required`);
  }
}

function assertTimestamp(value: string, field: string): void {
  if (Number.isNaN(new Date(value).getTime())) {
    throw new ApplicationError(
      "validation_error",
      `${field} must be a valid timestamp`,
    );
  }
}

function assertVersion(value: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new ApplicationError("validation_error", "version is invalid");
  }
}

function fingerprint(
  operation: string,
  input: Readonly<Record<string, unknown>>,
): string {
  return JSON.stringify({ operation, ...input });
}

function normalizeChoiceIds(choiceIds: readonly string[]): readonly string[] {
  const normalized = choiceIds.map((choiceId) => choiceId.trim()).sort();
  if (normalized.some((choiceId) => choiceId.length === 0)) {
    throw new ApplicationError(
      "validation_error",
      "selectedChoiceIds must not contain empty values",
    );
  }
  if (new Set(normalized).size !== normalized.length) {
    throw new ApplicationError(
      "validation_error",
      "selectedChoiceIds must not contain duplicates",
    );
  }
  return Object.freeze(normalized);
}

function normalizeRepositoryError(error: unknown): ApplicationError {
  if (error instanceof ApplicationError) return error;
  if (error instanceof Error && error.name === "DiagnosticSessionDomainError") {
    return new ApplicationError(
      "state_conflict",
      "Diagnostic session conflict",
    );
  }
  if (error instanceof Error) {
    const code = diagnosticSessionErrorNames.get(error.name);
    if (code !== undefined) {
      return new ApplicationError(code, "Diagnostic session operation failed");
    }
  }
  return new ApplicationError(
    "internal_error",
    "Unexpected application failure",
  );
}

function assertCatalog(catalog: DiagnosticSessionCatalog): void {
  if (
    catalog.diagnosticId !== "B07-DIAGNOSTIC-V1" ||
    catalog.diagnosticVersion !== "0.1.0" ||
    catalog.status !== "RASCUNHO" ||
    catalog.publicationAuthorized !== false ||
    catalog.clinicalReview !== "PENDENTE" ||
    catalog.items.length !== 120 ||
    catalog.snapshot.items.length !== catalog.items.length
  ) {
    throw new ApplicationError(
      "validation_error",
      "diagnostic catalog is not an eligible technical draft",
    );
  }
}

function assertAggregateOwnership(
  aggregate: DiagnosticSessionAggregate,
  participantId: string,
  scopeId: string,
): void {
  if (
    aggregate.session.participantId !== participantId ||
    aggregate.session.scopeId !== scopeId
  ) {
    throw new ApplicationError(
      "forbidden",
      "Diagnostic session is outside the current scope",
    );
  }
}

function toEvaluationCatalog(
  catalog: DiagnosticSessionCatalogSnapshot,
): DiagnosticEvaluationCatalog {
  return Object.freeze({
    items: Object.freeze(
      catalog.items.map((item) =>
        Object.freeze({
          id: item.canonicalItemId,
          diagnosticSessionId: item.diagnosticSessionId,
          objectiveId: item.objectiveId,
          choices: item.choices,
          correctChoiceIds: item.correctChoiceIds,
        }),
      ),
    ),
  });
}

export function createB07DiagnosticSessionCatalog(): DiagnosticSessionCatalog {
  const draft = b07DiagnosticDraftPack;
  if (
    draft.status !== "RASCUNHO" ||
    draft.publicationAuthorized !== false ||
    draft.clinicalReview !== "PENDENTE" ||
    draft.publicProjectionReady !== false
  ) {
    throw new Error("B-07 technical catalog gate is invalid");
  }
  const activity = toParticipantActivityFromDiagnosticDraft(draft);
  if (activity.items.length !== draft.items.length) {
    throw new Error("B-07 public item projection is incomplete");
  }
  const items = Object.freeze(
    activity.items.map((publicItem, index) => {
      const draftItem = draft.items[index];
      if (
        draftItem === undefined ||
        publicItem.choices === undefined ||
        publicItem.selectionMode === undefined
      ) {
        throw new Error("B-07 public item projection is invalid");
      }
      return Object.freeze({
        publicItemId: publicItem.itemId,
        ordinal: publicItem.ordinal,
        title: publicItem.title,
        text: publicItem.text,
        responseMode: "CHOICE" as const,
        choices: Object.freeze(
          publicItem.choices.map((choice) =>
            Object.freeze({
              id: choice.id,
              label: choice.label,
              text: choice.text,
            }),
          ),
        ),
        selectionMode: publicItem.selectionMode,
      });
    }),
  );
  const snapshotItems = Object.freeze(
    items.map((item, index) => {
      const draftItem = draft.items[index];
      if (draftItem === undefined) throw new Error("B-07 item is missing");
      return Object.freeze({
        canonicalItemId: draftItem.id,
        publicItemId: item.publicItemId,
        diagnosticSessionId: draftItem.diagnosticSessionId,
        objectiveId: draftItem.objectiveId,
        ordinal: item.ordinal,
        title: item.title,
        text: item.text,
        responseMode: item.responseMode,
        choices: Object.freeze([...item.choices]),
        correctChoiceIds: Object.freeze([
          ...(draftItem.correctChoiceIds ?? []),
        ]),
        selectionMode: item.selectionMode,
      });
    }),
  );
  const snapshot: DiagnosticSessionCatalogSnapshot = Object.freeze({
    diagnosticId: draft.diagnosticId,
    diagnosticVersion: draft.version,
    status: draft.status,
    publicationAuthorized: draft.publicationAuthorized,
    clinicalReview: draft.clinicalReview,
    items: snapshotItems,
  });
  const catalog: DiagnosticSessionCatalog = Object.freeze({
    diagnosticId: draft.diagnosticId,
    diagnosticVersion: draft.version,
    status: draft.status,
    publicationAuthorized: draft.publicationAuthorized,
    clinicalReview: draft.clinicalReview,
    items,
    snapshot,
  });
  assertCatalog(catalog);
  return catalog;
}

export async function startDiagnosticSession(
  command: StartDiagnosticSessionInput,
  repository: DiagnosticSessionRepositoryPort,
  catalog: DiagnosticSessionCatalog = createB07DiagnosticSessionCatalog(),
): Promise<DiagnosticSessionAggregate> {
  for (const [value, field] of [
    [command.participantId, "participantId"],
    [command.scopeId, "scopeId"],
    [command.idempotencyKey, "idempotencyKey"],
    [command.correlationId, "correlationId"],
  ] as const) {
    assertNonEmpty(value, field);
  }
  assertTimestamp(command.startedAt, "startedAt");
  assertCatalog(catalog);
  try {
    const aggregate = await repository.start({
      ...command,
      catalog: catalog.snapshot,
      fingerprint: fingerprint("start_diagnostic_session", {
        participantId: command.participantId,
        scopeId: command.scopeId,
        diagnosticId: catalog.diagnosticId,
        diagnosticVersion: catalog.diagnosticVersion,
      }),
    });
    assertAggregateOwnership(aggregate, command.participantId, command.scopeId);
    return aggregate;
  } catch (error) {
    throw normalizeRepositoryError(error);
  }
}

export async function getDiagnosticSession(
  command: Readonly<{
    readonly participantId: string;
    readonly scopeId: string;
    readonly sessionId?: string;
  }>,
  repository: DiagnosticSessionRepositoryPort,
): Promise<DiagnosticSessionAggregate | null> {
  assertNonEmpty(command.participantId, "participantId");
  assertNonEmpty(command.scopeId, "scopeId");
  if (command.sessionId !== undefined)
    assertNonEmpty(command.sessionId, "sessionId");
  try {
    const aggregate =
      command.sessionId === undefined
        ? await repository.findCurrent(command.participantId, command.scopeId)
        : await repository.findById(
            command.sessionId,
            command.participantId,
            command.scopeId,
          );
    if (aggregate !== null) {
      assertAggregateOwnership(
        aggregate,
        command.participantId,
        command.scopeId,
      );
    }
    return aggregate;
  } catch (error) {
    throw normalizeRepositoryError(error);
  }
}

export async function saveDiagnosticSessionAnswer(
  command: Readonly<{
    readonly participantId: string;
    readonly scopeId: string;
    readonly sessionId: string;
    readonly itemId: string;
    readonly version: number;
    readonly selectedChoiceIds: readonly string[];
    readonly idempotencyKey: string;
    readonly correlationId: string;
    readonly occurredAt: string;
  }>,
  repository: DiagnosticSessionRepositoryPort,
): Promise<DiagnosticSessionAggregate> {
  for (const [value, field] of [
    [command.participantId, "participantId"],
    [command.scopeId, "scopeId"],
    [command.sessionId, "sessionId"],
    [command.itemId, "itemId"],
    [command.idempotencyKey, "idempotencyKey"],
    [command.correlationId, "correlationId"],
  ] as const) {
    assertNonEmpty(value, field);
  }
  assertVersion(command.version);
  assertTimestamp(command.occurredAt, "occurredAt");
  const current = await getDiagnosticSession(
    {
      participantId: command.participantId,
      scopeId: command.scopeId,
      sessionId: command.sessionId,
    },
    repository,
  );
  if (current === null) {
    throw new ApplicationError("not_found", "Diagnostic session was not found");
  }
  const item = current.catalog.items.find(
    (candidate) => candidate.publicItemId === command.itemId,
  );
  if (item === undefined) {
    throw new ApplicationError("not_found", "Diagnostic item was not found");
  }
  const selectedChoiceIds = normalizeChoiceIds(command.selectedChoiceIds);
  const allowedChoices = new Set(item.choices.map((choice) => choice.id));
  if (selectedChoiceIds.some((choiceId) => !allowedChoices.has(choiceId))) {
    throw new ApplicationError(
      "validation_error",
      "Diagnostic answer is invalid",
    );
  }
  if (item.selectionMode === "SINGLE" && selectedChoiceIds.length > 1) {
    throw new ApplicationError(
      "validation_error",
      "Single-choice diagnostic item accepts one choice",
    );
  }
  try {
    const aggregate = await repository.saveAnswer({
      participantId: command.participantId,
      scopeId: command.scopeId,
      sessionId: command.sessionId,
      expectedVersion: command.version,
      canonicalItemId: item.canonicalItemId,
      selectedChoiceIds,
      savedAt: command.occurredAt,
      idempotencyKey: command.idempotencyKey,
      correlationId: command.correlationId,
      fingerprint: fingerprint("save_diagnostic_answer", {
        participantId: command.participantId,
        scopeId: command.scopeId,
        sessionId: command.sessionId,
        expectedVersion: command.version,
        canonicalItemId: item.canonicalItemId,
        selectedChoiceIds,
      }),
    });
    assertAggregateOwnership(aggregate, command.participantId, command.scopeId);
    return aggregate;
  } catch (error) {
    throw normalizeRepositoryError(error);
  }
}

export async function finalizeDiagnosticSession(
  command: Readonly<{
    readonly participantId: string;
    readonly scopeId: string;
    readonly sessionId: string;
    readonly version: number;
    readonly idempotencyKey: string;
    readonly correlationId: string;
    readonly completedAt: string;
  }>,
  repository: DiagnosticSessionRepositoryPort,
): Promise<DiagnosticSessionFinalizationState> {
  for (const [value, field] of [
    [command.participantId, "participantId"],
    [command.scopeId, "scopeId"],
    [command.sessionId, "sessionId"],
    [command.idempotencyKey, "idempotencyKey"],
    [command.correlationId, "correlationId"],
  ] as const) {
    assertNonEmpty(value, field);
  }
  assertVersion(command.version);
  assertTimestamp(command.completedAt, "completedAt");
  try {
    const finalization = await repository.finalize({
      participantId: command.participantId,
      scopeId: command.scopeId,
      sessionId: command.sessionId,
      expectedVersion: command.version,
      completedAt: new Date(command.completedAt).toISOString(),
      idempotencyKey: command.idempotencyKey,
      correlationId: command.correlationId,
      fingerprint: fingerprint("finalize_diagnostic_session", {
        participantId: command.participantId,
        scopeId: command.scopeId,
        sessionId: command.sessionId,
        expectedVersion: command.version,
      }),
      evaluate: (answers, catalog) => {
        const result = evaluateDiagnosticAttempt({
          answers,
          catalog: toEvaluationCatalog(catalog),
        });
        return Object.freeze({
          result,
          moduleIds: assignedModuleIdsForDiagnosticResult(result),
        });
      },
    });
    assertAggregateOwnership(
      finalization.aggregate,
      command.participantId,
      command.scopeId,
    );
    return finalization;
  } catch (error) {
    throw normalizeRepositoryError(error);
  }
}

function publicItemFromSnapshot(
  item: DiagnosticSessionCatalogSnapshotItem,
): DiagnosticSessionPublicItem {
  return Object.freeze({
    publicItemId: item.publicItemId,
    ordinal: item.ordinal,
    title: item.title,
    text: item.text,
    responseMode: item.responseMode,
    choices: Object.freeze(
      item.choices.map((choice) =>
        Object.freeze({
          id: choice.id,
          label: choice.label,
          text: choice.text,
        }),
      ),
    ),
    selectionMode: item.selectionMode,
  });
}

export function toDiagnosticSessionProjection(
  aggregate: DiagnosticSessionAggregate,
): Readonly<Record<string, unknown>> {
  const publicItems = aggregate.catalog.items.map(publicItemFromSnapshot);
  const publicItemByCanonicalId = new Map(
    aggregate.catalog.items.map((item) => [item.canonicalItemId, item]),
  );
  const answerProjection = aggregate.answers.map((answer) => {
    const item = publicItemByCanonicalId.get(answer.canonicalItemId);
    if (item === undefined) {
      throw new Error("diagnostic answer references an unknown snapshot item");
    }
    return {
      itemId: item.publicItemId,
      selectedChoiceIds: [...answer.selectedChoiceIds],
    };
  });
  const answeredCanonicalIds = new Set(
    aggregate.answers.map((answer) => answer.canonicalItemId),
  );
  const currentItem = aggregate.catalog.items.find(
    (item) => !answeredCanonicalIds.has(item.canonicalItemId),
  );
  const result =
    aggregate.result === undefined
      ? undefined
      : {
          completedAt: aggregate.result.completedAt,
          themes: deriveParticipantDiagnosticProfile([aggregate.result]).map(
            ({ recommendedModuleIds: _recommendedModuleIds, ...theme }) =>
              theme,
          ),
        };
  const projection = {
    sessionId: aggregate.session.sessionId,
    diagnosticId: aggregate.session.diagnosticId,
    diagnosticVersion: aggregate.session.diagnosticVersion,
    version: aggregate.session.version,
    status: aggregate.session.status,
    startedAt: aggregate.session.startedAt,
    ...(aggregate.session.lastCheckpointAt === undefined
      ? {}
      : { lastCheckpointAt: aggregate.session.lastCheckpointAt }),
    ...(aggregate.session.finalizedAt === undefined
      ? {}
      : { finalizedAt: aggregate.session.finalizedAt }),
    itemCount: publicItems.length,
    answeredItemCount: answerProjection.length,
    currentOrdinal:
      aggregate.session.status === "FINALIZADA"
        ? null
        : (currentItem?.ordinal ?? null),
    items: publicItems.map((item) => ({
      itemId: item.publicItemId,
      ordinal: item.ordinal,
      title: item.title,
      text: item.text,
      responseMode: item.responseMode,
      choices: item.choices,
      selectionMode: item.selectionMode,
    })),
    answers: answerProjection,
    ...(result === undefined ? {} : { result }),
    ...(aggregate.session.status === "FINALIZADA"
      ? { nextAction: "CONTINUAR_TRILHA" as const }
      : {}),
  };
  if (
    aggregate.session.status === "FINALIZADA" &&
    (aggregate.result === undefined ||
      aggregate.session.finalizedAt === undefined)
  ) {
    throw new Error("finalized diagnostic session is incomplete");
  }
  return Object.freeze(projection);
}
