import type {
  Assessment,
  ParticipantActivity,
  AssessmentQuestion,
} from "./types.js";
import { curriculumV3 } from "./catalog.js";
import type {
  CurriculumDraftPack,
  DiagnosticDraftPack,
} from "./draft-contracts.js";

function publicItemId(ordinal: number, moduleNumber = 2): string {
  return `10000000-0000-4000-8000-${String(moduleNumber * 1000 + ordinal).padStart(12, "0")}`;
}

function publicActivityId(activityNumber: number): string {
  return `10000000-0000-4000-8000-${String(activityNumber).padStart(12, "0")}`;
}

function questionText(question: AssessmentQuestion): string {
  return question.prompt;
}

export function toParticipantActivity(
  assessment: Assessment,
): ParticipantActivity {
  const questionItems = assessment.questions.map((question, index) => ({
    itemId: publicItemId(index + 1),
    ordinal: index + 1,
    kind: "QUESTAO" as const,
    title: question.title,
    text: questionText(question),
    responseMode: "CHOICE" as const,
    choices: question.choices,
    selectionMode:
      question.kind === "MULTI_SELECT"
        ? ("MULTIPLE" as const)
        : ("SINGLE" as const),
  }));
  const openItems = assessment.openResponses.map((response, index) => ({
    itemId: publicItemId(assessment.questions.length + index + 1),
    ordinal: assessment.questions.length + index + 1,
    kind: "CASO" as const,
    title: response.title,
    text: response.prompt,
    responseMode: "TEXT" as const,
  }));

  return Object.freeze({
    activityId: "10000000-0000-4000-8000-000000000002",
    slug: "m02-emergencia-terapia-intensiva-v1",
    title: "M02 — Emergência e terapia intensiva",
    items: Object.freeze([...questionItems, ...openItems]),
  });
}

function moduleNumberFromId(moduleId: string): number {
  const match = /^M(\d{2})$/u.exec(moduleId);
  const moduleNumber = Number(match?.[1] ?? Number.NaN);
  if (
    !Number.isInteger(moduleNumber) ||
    moduleNumber < 1 ||
    moduleNumber > 24
  ) {
    throw new Error("moduleId must identify a curriculum module");
  }
  return moduleNumber;
}

export function toParticipantActivityFromDraft(
  draft: CurriculumDraftPack,
): ParticipantActivity {
  const moduleNumber = moduleNumberFromId(draft.moduleId);
  const module = curriculumV3.modules.find(
    (candidate) => candidate.id === draft.moduleId,
  );
  if (module === undefined) {
    throw new Error("curriculum module is not present in the catalog");
  }
  const items = draft.items.map((item, index) => ({
    itemId: publicItemId(index + 1, moduleNumber),
    ordinal: index + 1,
    kind:
      item.responseMode === "TEXT" ? ("CASO" as const) : ("QUESTAO" as const),
    title: item.title,
    text: item.prompt,
    responseMode: item.responseMode,
    ...(item.choices === undefined
      ? {}
      : {
          choices: item.choices,
          selectionMode:
            item.correctChoiceIds !== undefined &&
            item.correctChoiceIds.length > 1
              ? ("MULTIPLE" as const)
              : ("SINGLE" as const),
        }),
  }));
  return Object.freeze({
    activityId: publicActivityId(moduleNumber),
    slug: `${module.id.toLowerCase()}-training-v1`,
    title: `${module.id} — ${module.title}`,
    items: Object.freeze(items),
  });
}

type InternalDiagnosticCatalogProjection = Readonly<{
  diagnosticId: DiagnosticDraftPack["diagnosticId"];
  version: DiagnosticDraftPack["version"];
  activity: Omit<ParticipantActivity, "items">;
  items: ParticipantActivity["items"];
}>;
type InternalDiagnosticCatalogOptions = Readonly<{
  boundary: "INTERNAL_DIAGNOSTIC_CATALOG";
}>;

export function toParticipantActivityFromDiagnosticDraft(
  draft: DiagnosticDraftPack,
): ParticipantActivity;
export function toParticipantActivityFromDiagnosticDraft(
  draft: DiagnosticDraftPack,
  options: InternalDiagnosticCatalogOptions,
): InternalDiagnosticCatalogProjection;
export function toParticipantActivityFromDiagnosticDraft(
  draft: DiagnosticDraftPack,
  options?: InternalDiagnosticCatalogOptions,
): ParticipantActivity | InternalDiagnosticCatalogProjection {
  if (
    options !== undefined &&
    options.boundary !== "INTERNAL_DIAGNOSTIC_CATALOG"
  )
    throw new Error("Explicit diagnostic catalog boundary is required");
  if (options === undefined && draft.items.length > 100)
    throw new Error(
      "Activity exceeds 100 items; use the explicit internal diagnostic catalog for the session",
    );
  if (
    options !== undefined &&
    (draft.items.length !== 120 ||
      ["B07-S1", "B07-S2", "B07-S3"].some(
        (session) =>
          draft.items.filter((item) => item.diagnosticSessionId === session)
            .length !== 40,
      ))
  )
    throw new Error(
      "Internal diagnostic catalog must preserve 120 items in three 40-item themes",
    );
  const items = Object.freeze(
    draft.items.map((item, index) =>
      Object.freeze({
        itemId: publicItemId(index + 1, 0),
        ordinal: index + 1,
        kind: "QUESTAO" as const,
        title: item.title,
        text: item.prompt,
        responseMode: "CHOICE" as const,
        ...(item.choices === undefined ? {} : { choices: item.choices }),
        selectionMode:
          item.correctChoiceIds !== undefined &&
          item.correctChoiceIds.length > 1
            ? ("MULTIPLE" as const)
            : ("SINGLE" as const),
      }),
    ),
  );
  const activity = Object.freeze({
    activityId: publicActivityId(0),
    slug: "b07-diagnostic-v1",
    title: "B-07 — diagnóstico formativo",
  });
  return options === undefined
    ? Object.freeze({ ...activity, items })
    : Object.freeze({
        diagnosticId: draft.diagnosticId,
        version: draft.version,
        activity,
        items,
      });
}
