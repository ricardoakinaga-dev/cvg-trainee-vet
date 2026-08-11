import {
  createCurriculumAuthoringBank,
  type AuthoringBank,
  type AuthoringItem,
} from "./authoring.js";
import { curriculumV3 } from "./catalog.js";
import {
  createInitialModuleEvaluation,
  getModuleDraftPack,
  type ModuleEvaluationResult,
} from "./learning-runtime.js";
import { toParticipantActivityFromDraft } from "./projection.js";

export type CurriculumMaterializationInput = Readonly<{
  readonly scopeId: string;
  readonly authorId: string;
  readonly participantId: string;
  readonly availableAt: string;
}>;

export type CurriculumMaterializationItemPlan = Readonly<{
  readonly contentId: string;
  readonly activityId: string;
  readonly moduleId: string;
  readonly sessionId: string;
  readonly objectiveId: string;
  readonly ordinal: number;
  readonly title: string;
  readonly participantText: string;
  readonly responseMode: "CHOICE" | "TEXT";
  readonly participantOptions?: readonly Readonly<{
    readonly id: string;
    readonly label: string;
    readonly text: string;
  }>[];
  readonly participantSelectionMode?: "SINGLE" | "MULTIPLE";
  readonly authoringItem: AuthoringItem;
}>;

export type CurriculumMaterializationModulePlan = Readonly<{
  readonly moduleId: string;
  readonly activityId: string;
  readonly slug: string;
  readonly title: string;
  readonly activityStatus: "WITHDRAWN";
  readonly contentStatus: "PROJECAO_VERIFICADA";
  readonly assignmentStatus: "NAO_ATRIBUIDO";
  readonly availableAt: string;
  readonly runtimeState: ModuleEvaluationResult;
  readonly items: readonly CurriculumMaterializationItemPlan[];
}>;

export type CurriculumMaterializationPlan = Readonly<{
  readonly scopeId: string;
  readonly authorId: string;
  readonly participantId: string;
  readonly modules: readonly CurriculumMaterializationModulePlan[];
}>;

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function freeze<T>(value: T): Readonly<T> {
  return Object.freeze(value);
}

function assertUuid(value: string, field: string): void {
  if (!uuidPattern.test(value)) throw new Error(`${field} must be a UUID`);
}

function assertTimestamp(value: string): void {
  if (Number.isNaN(Date.parse(value))) {
    throw new Error("availableAt must be an ISO timestamp");
  }
}

function authoringBankFor(
  banks: readonly AuthoringBank[],
  moduleId: string,
): AuthoringBank {
  const bank = banks.find((candidate) => candidate.moduleId === moduleId);
  if (bank === undefined) {
    throw new Error(`authoring bank is missing for ${moduleId}`);
  }
  return bank;
}

export function createCurriculumMaterializationPlan(
  input: CurriculumMaterializationInput,
): CurriculumMaterializationPlan {
  assertUuid(input.scopeId, "scopeId");
  assertUuid(input.authorId, "authorId");
  assertUuid(input.participantId, "participantId");
  assertTimestamp(input.availableAt);

  const banks = createCurriculumAuthoringBank(input.scopeId, input.authorId);
  const modules = curriculumV3.modules.map((module) => {
    const bank = authoringBankFor(banks, module.id);
    const projection = toParticipantActivityFromDraft(
      getModuleDraftPack(module.id),
    );
    if (bank.items.length !== projection.items.length) {
      throw new Error(
        `authoring/projection item count mismatch for ${module.id}`,
      );
    }

    const items = bank.items.map((authoringItem, index) => {
      const projectedItem = projection.items[index];
      if (projectedItem === undefined) {
        throw new Error(`projected item is missing for ${module.id}`);
      }
      return freeze({
        contentId: projectedItem.itemId,
        activityId: projection.activityId,
        moduleId: module.id,
        sessionId: authoringItem.sessionId,
        objectiveId: authoringItem.objectiveId,
        ordinal: projectedItem.ordinal,
        title: projectedItem.title,
        participantText: projectedItem.text,
        responseMode: projectedItem.responseMode,
        ...(projectedItem.choices === undefined
          ? {}
          : { participantOptions: freeze([...projectedItem.choices]) }),
        ...(projectedItem.selectionMode === undefined
          ? {}
          : { participantSelectionMode: projectedItem.selectionMode }),
        authoringItem,
      });
    });

    return freeze({
      moduleId: module.id,
      activityId: projection.activityId,
      slug: projection.slug,
      title: projection.title,
      activityStatus: "WITHDRAWN" as const,
      contentStatus: "PROJECAO_VERIFICADA" as const,
      assignmentStatus: "NAO_ATRIBUIDO" as const,
      availableAt: input.availableAt,
      runtimeState: createInitialModuleEvaluation(module.id),
      items: freeze(items),
    });
  });

  return freeze({
    scopeId: input.scopeId,
    authorId: input.authorId,
    participantId: input.participantId,
    modules: freeze(modules),
  });
}
