import {
  b07DiagnosticDraftPack,
  getModuleDraftPack,
  type CurriculumDraftItem,
  type DiagnosticDraftItem,
  type DraftContentStatus,
  type DraftRubric,
} from "./learning-runtime.js";
import { curriculumV3, m02Assessment } from "./catalog.js";
import type {
  AssessmentQuestion,
  Choice,
  InternalSourceRef,
  OpenResponse,
} from "./types.js";

export type AuthoringParticipantItem = Readonly<{
  readonly id: string;
  readonly ordinal: number;
  readonly kind: "QUESTAO" | "CASO";
  readonly title: string;
  readonly prompt: string;
  readonly responseMode: "CHOICE" | "TEXT";
  readonly choices?: readonly Choice[];
  readonly selectionMode?: "SINGLE" | "MULTIPLE";
}>;

export type AuthoringItem = Readonly<{
  readonly contentId: string;
  readonly scopeId: string;
  readonly authorId: string;
  readonly version: 1;
  readonly moduleId: string;
  readonly sessionId: string;
  readonly ordinal: number;
  readonly objectiveId: string;
  readonly kind:
    | "RECUPERACAO_ATIVA"
    | "CASO_PROGRESSIVO"
    | "SIMULACAO_DIGITAL"
    | "DEBRIEFING"
    | "RETENCAO_ESPACADA"
    | "QUESTAO"
    | "CASO";
  readonly title: string;
  readonly prompt: string;
  readonly responseMode: "CHOICE" | "TEXT";
  readonly choices?: readonly Choice[];
  readonly correctChoiceIds?: readonly string[];
  readonly rubric?: DraftRubric;
  readonly feedback: string;
  readonly critical: boolean;
  readonly remediationTargetObjectiveId: string;
  readonly sourceRefs: readonly InternalSourceRef[];
  readonly participant: AuthoringParticipantItem;
}>;

export type AuthoringBank = Readonly<{
  readonly bankId: string;
  readonly version: "0.1.0";
  readonly scopeId: string;
  readonly authorId: string;
  readonly moduleId: string;
  readonly status: DraftContentStatus;
  readonly sourceVerification: "VERIFICADO_AUTOMATICAMENTE";
  readonly publicationAuthorized: true;
  readonly items: readonly AuthoringItem[];
}>;

function freeze<T>(value: T): Readonly<T> {
  return Object.freeze(value);
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function assertIdentity(value: string, field: string): void {
  if (!uuidPattern.test(value)) throw new Error(`${field} must be a UUID`);
}

function choiceMode(
  choices: readonly Choice[] | undefined,
  multiple: boolean,
): "SINGLE" | "MULTIPLE" | undefined {
  if (choices === undefined) return undefined;
  return multiple ? "MULTIPLE" : "SINGLE";
}

function fromDraftItem(
  scopeId: string,
  authorId: string,
  item: CurriculumDraftItem | DiagnosticDraftItem,
  ordinal: number,
): AuthoringItem {
  const choices = item.choices;
  const selectionMode = choiceMode(
    choices,
    choices !== undefined && item.correctChoiceIds !== undefined
      ? item.correctChoiceIds.length > 1
      : false,
  );
  return freeze({
    contentId: item.id,
    scopeId,
    authorId,
    version: 1,
    moduleId: item.moduleId,
    sessionId: item.sessionId,
    ordinal,
    objectiveId: item.objectiveId,
    kind: item.kind,
    title: item.title,
    prompt: item.prompt,
    responseMode: item.responseMode,
    ...(choices === undefined ? {} : { choices: freeze([...choices]) }),
    ...(item.correctChoiceIds === undefined
      ? {}
      : { correctChoiceIds: freeze([...item.correctChoiceIds]) }),
    ...(item.rubric === undefined ? {} : { rubric: item.rubric }),
    feedback: item.feedback,
    critical: item.critical,
    remediationTargetObjectiveId: item.remediationTargetObjectiveId,
    sourceRefs: freeze([...item.sourceRefs]),
    participant: freeze({
      id: item.id,
      ordinal,
      kind: item.responseMode === "TEXT" ? "CASO" : "QUESTAO",
      title: item.title,
      prompt: item.prompt,
      responseMode: item.responseMode,
      ...(choices === undefined ? {} : { choices: freeze([...choices]) }),
      ...(selectionMode === undefined ? {} : { selectionMode }),
    }),
  });
}

function fromQuestion(
  scopeId: string,
  authorId: string,
  question: AssessmentQuestion,
  ordinal: number,
): AuthoringItem {
  return freeze({
    contentId: question.id,
    scopeId,
    authorId,
    version: 1,
    moduleId: "M02",
    sessionId: question.sessionId,
    ordinal,
    objectiveId: `M02-OBJ-${String((ordinal % 3) + 1).padStart(2, "0")}`,
    kind: "QUESTAO",
    title: question.title,
    prompt: question.prompt,
    responseMode: "CHOICE",
    choices: freeze([...question.choices]),
    correctChoiceIds: freeze([...question.correctChoiceIds]),
    feedback: question.feedback,
    critical: question.critical,
    remediationTargetObjectiveId: `M02-OBJ-${String((ordinal % 3) + 1).padStart(2, "0")}`,
    sourceRefs: freeze([...question.sourceRefs]),
    participant: freeze({
      id: question.id,
      ordinal,
      kind: "QUESTAO",
      title: question.title,
      prompt: question.prompt,
      responseMode: "CHOICE",
      choices: freeze([...question.choices]),
      selectionMode: question.kind === "MULTI_SELECT" ? "MULTIPLE" : "SINGLE",
    }),
  });
}

function fromOpenResponse(
  scopeId: string,
  authorId: string,
  response: OpenResponse,
  ordinal: number,
): AuthoringItem {
  const objectiveId = `M02-OBJ-${String((ordinal % 3) + 1).padStart(2, "0")}`;
  return freeze({
    contentId: response.id,
    scopeId,
    authorId,
    version: 1,
    moduleId: "M02",
    sessionId: response.sessionId,
    ordinal,
    objectiveId,
    kind: "DEBRIEFING",
    title: response.title,
    prompt: response.prompt,
    responseMode: "TEXT",
    rubric: freeze({ ...response.rubric }),
    feedback: response.feedback,
    critical: true,
    remediationTargetObjectiveId: objectiveId,
    sourceRefs: freeze([...response.sourceRefs]),
    participant: freeze({
      id: response.id,
      ordinal,
      kind: "CASO",
      title: response.title,
      prompt: response.prompt,
      responseMode: "TEXT",
    }),
  });
}

function bankFromItems(
  bankId: string,
  moduleId: string,
  scopeId: string,
  authorId: string,
  items: readonly AuthoringItem[],
): AuthoringBank {
  return freeze({
    bankId,
    version: "0.1.0",
    scopeId,
    authorId,
    moduleId,
    status: "PUBLICADO",
    sourceVerification: "VERIFICADO_AUTOMATICAMENTE",
    publicationAuthorized: true,
    items: freeze([...items]),
  });
}

export function createM02AuthoringBank(
  scopeId: string,
  authorId: string,
): AuthoringBank {
  assertIdentity(scopeId, "scopeId");
  assertIdentity(authorId, "authorId");
  const questions = m02Assessment.questions.map((question, index) =>
    fromQuestion(scopeId, authorId, question, index + 1),
  );
  const openResponses = m02Assessment.openResponses.map((response, index) =>
    fromOpenResponse(scopeId, authorId, response, questions.length + index + 1),
  );
  return bankFromItems("M02-AUTHORING-V1", "M02", scopeId, authorId, [
    ...questions,
    ...openResponses,
  ]);
}

export function createCurriculumAuthoringBank(
  scopeId: string,
  authorId: string,
): readonly AuthoringBank[] {
  assertIdentity(scopeId, "scopeId");
  assertIdentity(authorId, "authorId");
  return freeze(
    curriculumV3.modules.map((module) => {
      const pack = getModuleDraftPack(module.id);
      return bankFromItems(
        `${module.id}-AUTHORING-V1`,
        module.id,
        scopeId,
        authorId,
        pack.items.map((item, index) =>
          fromDraftItem(scopeId, authorId, item, index + 1),
        ),
      );
    }),
  );
}

export function createDiagnosticAuthoringBank(
  scopeId: string,
  authorId: string,
): AuthoringBank {
  assertIdentity(scopeId, "scopeId");
  assertIdentity(authorId, "authorId");
  return bankFromItems(
    "B07-AUTHORING-V1",
    "B07",
    scopeId,
    authorId,
    b07DiagnosticDraftPack.items.map((item, index) =>
      fromDraftItem(scopeId, authorId, item, index + 1),
    ),
  );
}
