import {
  ApplicationError,
  evaluateAndPersistCurriculumModule,
  type EvaluateCurriculumModuleCommand,
} from "@cvg/application";
import { describe, expect, it, vi } from "vitest";
import {
  mapCapturedCurriculumEvaluation,
  type NativeCurriculumEvaluationRows,
} from "./curriculum-evaluation-mapping.js";

type Mutable<T> = T extends Date
  ? Date
  : T extends readonly (infer V)[]
    ? Mutable<V>[]
    : T extends object
      ? { -readonly [K in keyof T]: Mutable<T[K]> }
      : T;
type Fixture = Mutable<NativeCurriculumEvaluationRows>;
const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
function first<T>(items: readonly T[]): T {
  const item = items[0];
  if (item === undefined) throw new Error("Synthetic fixture item required");
  return item;
}

// Technical server-owned rows only: these values do not authorize clinical publication.
function fixture(): Fixture {
  const scopeId = uuid(1);
  const form: Fixture["form"] = {
    id: uuid(2),
    formId: "synthetic-form",
    version: 1,
    scopeId,
    moduleId: "M02",
    blueprintVersionId: uuid(3),
    mode: "MODULE_COMPLETION",
    status: "PUBLICADO",
    publicationDecisionId: uuid(4),
    publishedBy: uuid(5),
    publishedAt: new Date("2026-10-02T12:00:00Z"),
  };
  const formItems: Fixture["formItems"] = Array.from({ length: 33 }, (_, i) => {
    const text = i >= 31;
    const catalogItem: Fixture["items"][number]["catalogItem"] = {
      id: `synthetic-M02-${i + 1}`,
      moduleId: "M02",
      sessionId: `M02-S${(i % 4) + 1}`,
      ordinal: i + 1,
      objectiveId: "synthetic-objective",
      kind: "RECUPERACAO_ATIVA",
      responseMode: text ? "TEXT" : "CHOICE",
      title: `Synthetic ${i + 1}`,
      prompt: `Technical prompt ${i + 1}`,
      feedback: "Technical feedback",
      critical: i === 0,
      remediationTargetObjectiveId: "synthetic-objective",
      sourceRefs: [
        { code: "F-01", locator: "Technical fixture", updateRequired: false },
      ],
      ...(text
        ? {
            rubric: {
              dimensions: [
                {
                  id: "synthetic-dimension",
                  label: "Technical",
                  description: "Human evaluation",
                  maxPoints: 100,
                },
              ],
              passScore: 70,
              criticalErrors: ["Synthetic critical omission"],
            },
          }
        : {
            choices: [
              { id: "synthetic-a", label: "A", text: "Technical A" },
              { id: "synthetic-b", label: "B", text: "Technical B" },
            ],
            correctChoiceIds: ["synthetic-a"],
          }),
    };
    return {
      formVersionId: form.id,
      canonicalItemId: catalogItem.id,
      scopeId,
      contentVersionId: uuid(100 + i),
      contentId: uuid(200 + i),
      contentVersion: 1,
      ordinal: i + 1,
      catalogItem,
      publicItem: {
        itemId: uuid(100 + i),
        ordinal: i + 1,
        kind: "QUESTAO",
        title: catalogItem.title,
        text: catalogItem.prompt,
        responseMode: catalogItem.responseMode,
        ...(text
          ? {}
          : {
              choices: structuredClone(catalogItem.choices ?? []),
              selectionMode: "SINGLE",
            }),
      },
    };
  });
  return {
    form,
    blueprint: {
      id: uuid(3),
      blueprintId: "synthetic-blueprint",
      version: 1,
      scopeId,
      moduleId: "M02",
      approvalDecisionId: uuid(6),
      approvedBy: uuid(5),
      approvedAt: new Date("2026-10-01T12:00:00Z"),
      manifest: {
        version: 1,
        approvalDecisionId: uuid(6),
        moduleId: "M02",
        questionTotal: 31,
        openResponseCount: 2,
        objectiveIds: ["synthetic-objective"],
        itemManifest: formItems.map(({ catalogItem: c }) => ({
          itemId: c.id,
          objectiveId: c.objectiveId,
          responseMode: c.responseMode,
          critical: c.critical,
          sessionId: c.sessionId,
        })),
      },
    },
    formItems,
    attempt: {
      id: uuid(10),
      participantId: uuid(11),
      activityId: uuid(12),
      status: "SUBMETIDA",
      version: 2,
      submittedAt: new Date("2026-10-03T10:00:00Z"),
      createdAt: new Date("2026-10-02T13:00:00Z"),
      updatedAt: new Date("2026-10-03T10:00:00Z"),
    },
    activity: {
      id: uuid(12),
      scopeId,
      moduleId: "M02",
      sessionId: null,
      slug: "synthetic-module",
      title: "Technical module",
      status: "PUBLISHED",
      createdAt: new Date("2026-10-02T12:00:00Z"),
    },
    binding: {
      attemptId: uuid(10),
      participantId: uuid(11),
      scopeId,
      moduleId: "M02",
      formVersionId: form.id,
      capturedAt: new Date("2026-10-02T13:00:00Z"),
    },
    items: formItems.map((i) => ({
      attemptId: uuid(10),
      itemId: i.contentVersionId,
      canonicalItemId: i.canonicalItemId,
      formVersionId: form.id,
      ordinal: i.ordinal,
      catalogItem: structuredClone(i.catalogItem),
      publicItem: structuredClone(i.publicItem),
    })),
    answers: formItems.map((i, n) => ({
      id: uuid(300 + n),
      attemptId: uuid(10),
      itemId: i.contentVersionId,
      response:
        i.publicItem.responseMode === "TEXT"
          ? "Synthetic human response."
          : "synthetic-a",
      savedAt: new Date("2026-10-03T09:00:00Z"),
      createdAt: new Date("2026-10-03T09:00:00Z"),
      updatedAt: new Date("2026-10-03T09:00:00Z"),
    })),
    contentVersions: formItems.map((i) => ({
      id: i.contentVersionId,
      contentId: i.contentId,
      scopeId,
      version: i.contentVersion,
      status: "PUBLICADO",
      kind: i.publicItem.kind,
      title: i.publicItem.title,
      participantText: i.publicItem.text,
      responseMode: i.publicItem.responseMode,
      participantOptions:
        i.publicItem.choices === undefined
          ? null
          : structuredClone(i.publicItem.choices),
      participantSelectionMode: i.publicItem.selectionMode ?? null,
      createdAt: new Date("2026-09-30T12:00:00Z"),
      updatedAt: new Date("2026-10-02T12:00:00Z"),
    })),
    now: new Date("2026-10-03T12:00:00Z"),
  };
}

function command(f: Fixture): EvaluateCurriculumModuleCommand {
  return {
    participantId: f.attempt.participantId,
    scopeId: f.binding.scopeId,
    moduleId: "M02",
    attemptId: f.attempt.id,
    attemptVersion: 2,
    formVersion: 1,
  };
}
function rejected(f: Fixture, c = command(f)): void {
  try {
    mapCapturedCurriculumEvaluation(f, c);
    expect.fail("Malformed server records must fail closed");
  } catch (error) {
    expect(error).toBeInstanceOf(ApplicationError);
    expect(error).toMatchObject({
      code: "state_conflict",
      status: 409,
      details: [],
      message: "Captured curriculum evaluation is inconsistent",
    });
    expect(error).not.toHaveProperty("cause");
  }
}
function mirror(f: Fixture): void {
  f.items = f.formItems.map((i) => ({
    attemptId: f.attempt.id,
    itemId: i.contentVersionId,
    canonicalItemId: i.canonicalItemId,
    formVersionId: i.formVersionId,
    ordinal: i.ordinal,
    catalogItem: structuredClone(i.catalogItem),
    publicItem: structuredClone(i.publicItem),
  }));
}
function reorder<T extends object>(record: T): T {
  return Object.fromEntries(Object.entries(record).reverse()) as T;
}
function frozenTree(value: unknown): void {
  if (value !== null && typeof value === "object") {
    expect(Object.isFrozen(value)).toBe(true);
    for (const nested of Object.values(value)) frozenTree(nested);
  }
}
const invalid: readonly [string, (f: Fixture) => void][] = [
  [
    "attempt identity",
    (f) => {
      f.attempt.id = uuid(900);
    },
  ],
  [
    "participant",
    (f) => {
      f.attempt.participantId = uuid(900);
    },
  ],
  [
    "attempt activity",
    (f) => {
      f.attempt.activityId = uuid(900);
    },
  ],
  [
    "activity namespace",
    (f) => {
      f.activity.scopeId = uuid(900);
    },
  ],
  [
    "activity module",
    (f) => {
      f.activity.moduleId = "M03";
    },
  ],
  [
    "activity withdrawn",
    (f) => {
      f.activity.status = "WITHDRAWN";
    },
  ],
  [
    "binding attempt",
    (f) => {
      f.binding.attemptId = uuid(900);
    },
  ],
  [
    "binding participant",
    (f) => {
      f.binding.participantId = uuid(900);
    },
  ],
  [
    "binding namespace",
    (f) => {
      f.binding.scopeId = uuid(900);
    },
  ],
  [
    "binding module",
    (f) => {
      f.binding.moduleId = "M03";
    },
  ],
  [
    "binding form",
    (f) => {
      f.binding.formVersionId = uuid(900);
    },
  ],
  [
    "missing binding",
    (f) => {
      Object.assign(f, { binding: null });
    },
  ],
  [
    "missing blueprint proof",
    (f) => {
      Object.assign(f, { blueprint: undefined });
    },
  ],
  [
    "blank publication decision",
    (f) => {
      f.form.publicationDecisionId = "";
    },
  ],
  [
    "blank publisher",
    (f) => {
      f.form.publishedBy = "";
    },
  ],
  [
    "blank approver",
    (f) => {
      f.blueprint.approvedBy = "";
    },
  ],
  [
    "blank approval decision",
    (f) => {
      f.blueprint.approvalDecisionId = "";
    },
  ],
  [
    "form id",
    (f) => {
      f.form.id = "synthetic-form";
    },
  ],
  [
    "form identity empty",
    (f) => {
      f.form.formId = "";
    },
  ],
  [
    "blueprint identity empty",
    (f) => {
      f.blueprint.blueprintId = "";
    },
  ],
  [
    "form scope",
    (f) => {
      f.form.scopeId = uuid(900);
    },
  ],
  [
    "blueprint scope",
    (f) => {
      f.blueprint.scopeId = uuid(900);
    },
  ],
  [
    "form module",
    (f) => {
      f.form.moduleId = "M03";
    },
  ],
  [
    "blueprint module",
    (f) => {
      f.blueprint.moduleId = "M03";
    },
  ],
  [
    "blueprint rebound",
    (f) => {
      f.form.blueprintVersionId = uuid(900);
    },
  ],
  [
    "form retired",
    (f) => {
      f.form.status = "RETIRADO";
    },
  ],
  [
    "form version",
    (f) => {
      f.form.version = 2;
    },
  ],
  [
    "fractional form version",
    (f) => {
      f.form.version = 1.5;
    },
  ],
  [
    "blueprint version zero",
    (f) => {
      f.blueprint.version = 0;
    },
  ],
  [
    "unsupported mode",
    (f) => {
      Object.assign(f.form, { mode: "AI" });
    },
  ],
  [
    "attempt draft",
    (f) => {
      f.attempt.status = "SALVA";
    },
  ],
  [
    "attempt version",
    (f) => {
      f.attempt.version = 3;
    },
  ],
  [
    "fractional attempt version",
    (f) => {
      f.attempt.version = 2.5;
    },
  ],
  [
    "missing submission",
    (f) => {
      f.attempt.submittedAt = null;
    },
  ],
  [
    "invalid submission",
    (f) => {
      f.attempt.submittedAt = new Date("invalid");
    },
  ],
  [
    "string submission",
    (f) => {
      Object.assign(f.attempt, { submittedAt: "2026-10-03" });
    },
  ],
  [
    "future submission",
    (f) => {
      f.attempt.submittedAt = new Date("2027-01-01");
    },
  ],
  [
    "invalid clock",
    (f) => {
      f.now = new Date("invalid");
    },
  ],
  [
    "publication after submission",
    (f) => {
      f.form.publishedAt = new Date("2026-10-03T11:00:00Z");
    },
  ],
  [
    "approval after publication",
    (f) => {
      f.blueprint.approvedAt = new Date("2026-10-03");
    },
  ],
  [
    "invalid publication",
    (f) => {
      f.form.publishedAt = new Date("invalid");
    },
  ],
  [
    "invalid approval",
    (f) => {
      f.blueprint.approvedAt = new Date("invalid");
    },
  ],
  [
    "capture before publication",
    (f) => {
      f.binding.capturedAt = new Date("2026-10-01");
    },
  ],
  [
    "capture after submission",
    (f) => {
      f.binding.capturedAt = new Date("2026-10-03T11:00:00Z");
    },
  ],
  [
    "invalid capture",
    (f) => {
      f.binding.capturedAt = new Date("invalid");
    },
  ],
  [
    "manifest missing",
    (f) => {
      Object.assign(f.blueprint, { manifest: null });
    },
  ],
  [
    "manifest unknown key",
    (f) => {
      Object.assign(f.blueprint.manifest, { injected: true });
    },
  ],
  [
    "manifest module",
    (f) => {
      f.blueprint.manifest.moduleId = "M03";
    },
  ],
  [
    "manifest version",
    (f) => {
      f.blueprint.manifest.version = 2;
    },
  ],
  [
    "manifest approval",
    (f) => {
      f.blueprint.manifest.approvalDecisionId = uuid(900);
    },
  ],
  [
    "manifest count",
    (f) => {
      f.blueprint.manifest.questionTotal--;
    },
  ],
  [
    "negative open count",
    (f) => {
      f.blueprint.manifest.openResponseCount = -1;
    },
  ],
  [
    "fractional count",
    (f) => {
      f.blueprint.manifest.questionTotal = 31.5;
    },
  ],
  [
    "manifest subset",
    (f) => {
      f.blueprint.manifest.itemManifest.pop();
    },
  ],
  [
    "manifest extra",
    (f) => {
      f.blueprint.manifest.itemManifest.push({
        ...first(f.blueprint.manifest.itemManifest),
        itemId: "extra",
      });
    },
  ],
  [
    "manifest duplicate",
    (f) => {
      f.blueprint.manifest.itemManifest[1] = structuredClone(
        first(f.blueprint.manifest.itemManifest),
      );
    },
  ],
  [
    "manifest objective",
    (f) => {
      first(f.blueprint.manifest.itemManifest).objectiveId = "extra";
    },
  ],
  [
    "manifest response mode",
    (f) => {
      first(f.blueprint.manifest.itemManifest).responseMode = "TEXT";
    },
  ],
  [
    "manifest critical",
    (f) => {
      first(f.blueprint.manifest.itemManifest).critical = false;
    },
  ],
  [
    "manifest session",
    (f) => {
      first(f.blueprint.manifest.itemManifest).sessionId = "M03-S1";
    },
  ],
  [
    "duplicate objective",
    (f) => {
      f.blueprint.manifest.objectiveIds.push("synthetic-objective");
    },
  ],
  [
    "uncovered objective",
    (f) => {
      f.blueprint.manifest.objectiveIds.push("uncovered");
    },
  ],
  [
    "empty objectives",
    (f) => {
      f.blueprint.manifest.objectiveIds = [];
    },
  ],
  [
    "capture subset",
    (f) => {
      f.items.pop();
    },
  ],
  [
    "capture extra",
    (f) => {
      f.items.push(structuredClone(first(f.items)));
    },
  ],
  [
    "form subset",
    (f) => {
      f.formItems.pop();
    },
  ],
  [
    "form extra",
    (f) => {
      f.formItems.push(structuredClone(first(f.formItems)));
    },
  ],
  [
    "capture duplicate",
    (f) => {
      f.items[1] = structuredClone(first(f.items));
    },
  ],
  [
    "capture rebound",
    (f) => {
      first(f.items).attemptId = uuid(900);
    },
  ],
  [
    "capture form rebound",
    (f) => {
      first(f.items).formVersionId = uuid(900);
    },
  ],
  [
    "capture canonical",
    (f) => {
      first(f.items).canonicalItemId = "unknown";
    },
  ],
  [
    "capture ordinal",
    (f) => {
      first(f.items).ordinal = 2;
    },
  ],
  [
    "capture item UUID",
    (f) => {
      first(f.items).itemId = "synthetic-M02-1";
    },
  ],
  [
    "catalog copy mismatch",
    (f) => {
      first(f.items).catalogItem.feedback = "changed";
    },
  ],
  [
    "public copy mismatch",
    (f) => {
      first(f.items).publicItem.text = "changed";
    },
  ],
  [
    "form binding",
    (f) => {
      first(f.formItems).formVersionId = uuid(900);
    },
  ],
  [
    "form namespace",
    (f) => {
      first(f.formItems).scopeId = uuid(900);
    },
  ],
  [
    "form duplicate canonical",
    (f) => {
      first(f.formItems).canonicalItemId = first(
        f.formItems.slice(1),
      ).canonicalItemId;
    },
  ],
  [
    "form duplicate ordinal",
    (f) => {
      first(f.formItems).ordinal = 2;
      mirror(f);
    },
  ],
  [
    "form ordinal zero",
    (f) => {
      first(f.formItems).ordinal = 0;
      mirror(f);
    },
  ],
  [
    "form catalog ordinal",
    (f) => {
      first(f.formItems).catalogItem.ordinal = 2;
      mirror(f);
    },
  ],
  [
    "form public ordinal",
    (f) => {
      first(f.formItems).publicItem.ordinal = 2;
      mirror(f);
    },
  ],
  [
    "form public identity",
    (f) => {
      first(f.formItems).publicItem.itemId = uuid(900);
      mirror(f);
    },
  ],
  [
    "form canonical identity",
    (f) => {
      first(f.formItems).catalogItem.id = "unknown";
      mirror(f);
    },
  ],
  [
    "form catalog module",
    (f) => {
      first(f.formItems).catalogItem.moduleId = "M03";
      mirror(f);
    },
  ],
  [
    "form remediation objective",
    (f) => {
      first(f.formItems).catalogItem.remediationTargetObjectiveId = "unknown";
      mirror(f);
    },
  ],
  [
    "form missing keys",
    (f) => {
      first(f.formItems).catalogItem.correctChoiceIds = [];
      mirror(f);
    },
  ],
  [
    "form unknown key",
    (f) => {
      first(f.formItems).catalogItem.correctChoiceIds = ["unknown"];
      mirror(f);
    },
  ],
  [
    "form duplicate keys",
    (f) => {
      first(f.formItems).catalogItem.correctChoiceIds = [
        "synthetic-a",
        "synthetic-a",
      ];
      mirror(f);
    },
  ],
  [
    "form single ambiguous keys",
    (f) => {
      first(f.formItems).catalogItem.correctChoiceIds = [
        "synthetic-a",
        "synthetic-b",
      ];
      mirror(f);
    },
  ],
  [
    "form choices duplicate",
    (f) => {
      const c = first(f.formItems).catalogItem;
      c.choices = [first(c.choices ?? []), first(c.choices ?? [])];
      mirror(f);
    },
  ],
  [
    "form choices mismatch",
    (f) => {
      first(first(f.formItems).publicItem.choices ?? []).text = "changed";
      mirror(f);
    },
  ],
  [
    "form public title mismatch",
    (f) => {
      first(f.formItems).publicItem.title = "changed";
      mirror(f);
    },
  ],
  [
    "form public kind",
    (f) => {
      Object.assign(first(f.formItems).publicItem, { kind: "NONE" });
      mirror(f);
    },
  ],
  [
    "form unknown private field",
    (f) => {
      Object.assign(first(f.formItems).catalogItem, {
        selectionMode: "SINGLE",
      });
      mirror(f);
    },
  ],
  [
    "form unknown public field",
    (f) => {
      Object.assign(first(f.formItems).publicItem, {
        correctChoiceIds: ["synthetic-a"],
      });
      mirror(f);
    },
  ],
  [
    "form missing mode",
    (f) => {
      delete first(f.formItems).publicItem.selectionMode;
      mirror(f);
    },
  ],
  [
    "form text choice fields",
    (f) => {
      first(f.formItems.slice(31)).publicItem.selectionMode = "SINGLE";
      mirror(f);
    },
  ],
  [
    "form empty sources",
    (f) => {
      first(f.formItems).catalogItem.sourceRefs = [];
      mirror(f);
    },
  ],
  [
    "source invalid enum",
    (f) => {
      Object.assign(first(first(f.formItems).catalogItem.sourceRefs), {
        code: "F01",
      });
      mirror(f);
    },
  ],
  [
    "source empty locator",
    (f) => {
      first(first(f.formItems).catalogItem.sourceRefs).locator = "";
      mirror(f);
    },
  ],
  [
    "source invalid boolean",
    (f) => {
      Object.assign(first(first(f.formItems).catalogItem.sourceRefs), {
        updateRequired: "false",
      });
      mirror(f);
    },
  ],
  [
    "text no rubric",
    (f) => {
      delete first(f.formItems.slice(31)).catalogItem.rubric;
      mirror(f);
    },
  ],
  [
    "text invalid pass score",
    (f) => {
      const r = first(f.formItems.slice(31)).catalogItem.rubric;
      if (r) r.passScore = NaN;
      mirror(f);
    },
  ],
  [
    "text missing dimensions",
    (f) => {
      const r = first(f.formItems.slice(31)).catalogItem.rubric;
      if (r) r.dimensions = [];
      mirror(f);
    },
  ],
  [
    "current subset",
    (f) => {
      f.contentVersions.pop();
    },
  ],
  [
    "current extra",
    (f) => {
      f.contentVersions.push(structuredClone(first(f.contentVersions)));
    },
  ],
  [
    "current duplicate",
    (f) => {
      f.contentVersions[1] = structuredClone(first(f.contentVersions));
    },
  ],
  [
    "current UUID",
    (f) => {
      first(f.contentVersions).id = uuid(900);
    },
  ],
  [
    "current content identity",
    (f) => {
      first(f.contentVersions).contentId = uuid(900);
    },
  ],
  [
    "current integer version",
    (f) => {
      first(f.contentVersions).version = 2;
    },
  ],
  [
    "current namespace",
    (f) => {
      first(f.contentVersions).scopeId = uuid(900);
    },
  ],
  [
    "current retired",
    (f) => {
      first(f.contentVersions).status = "RETIRADO";
    },
  ],
  [
    "current draft",
    (f) => {
      first(f.contentVersions).status = "RASCUNHO";
    },
  ],
  [
    "form contentId invalid",
    (f) => {
      first(f.formItems).contentId = "canonical";
    },
  ],
  [
    "form version fractional",
    (f) => {
      first(f.formItems).contentVersion = 1.5;
    },
  ],
  [
    "form content UUID duplicate",
    (f) => {
      first(f.formItems).contentVersionId = first(
        f.formItems.slice(1),
      ).contentVersionId;
    },
  ],
  [
    "foreign answer",
    (f) => {
      first(f.answers).attemptId = uuid(900);
    },
  ],
  [
    "answer canonical used as UUID",
    (f) => {
      first(f.answers).itemId = first(f.items).canonicalItemId;
    },
  ],
  [
    "answer rebound",
    (f) => {
      first(f.answers).itemId = uuid(900);
    },
  ],
  [
    "duplicate answers",
    (f) => {
      f.answers.push(structuredClone(first(f.answers)));
    },
  ],
  [
    "unknown answer option",
    (f) => {
      first(f.answers).response = "current-option";
    },
  ],
  [
    "single JSON ambiguous",
    (f) => {
      first(f.answers).response = '["synthetic-a"]';
    },
  ],
  [
    "empty answer",
    (f) => {
      first(f.answers).response = " ";
    },
  ],
  [
    "HTML text answer",
    (f) => {
      first(f.answers.slice(31)).response = "<b>answer</b>";
    },
  ],
  [
    "legacy empty capture",
    (f) => {
      f.items = [];
      f.formItems = [];
    },
  ],
];
describe("captured native curriculum evaluation mapper", () => {
  it("maps the complete synthetic form using canonical IDs and immutable versions", () => {
    const f = fixture(),
      result = mapCapturedCurriculumEvaluation(f, command(f));
    expect(result).toMatchObject({
      attemptId: uuid(10),
      participantId: uuid(11),
      scopeId: uuid(1),
      moduleId: "M02",
      attemptVersion: 2,
      status: "SUBMETIDA",
      submittedAt: "2026-10-03T10:00:00.000Z",
      mode: "MODULE_COMPLETION",
      form: {
        formId: "synthetic-form",
        version: 1,
        blueprintId: "synthetic-blueprint",
        status: "PUBLICADO",
        publication: {
          decisionId: uuid(4),
          publishedAt: "2026-10-02T12:00:00.000Z",
        },
        blueprint: f.blueprint.manifest,
        catalog: { moduleId: "M02", items: f.items.map((i) => i.catalogItem) },
      },
    });
    expect(result.form.contentVersions).toEqual(
      f.formItems.map((i) => ({
        itemId: i.canonicalItemId,
        contentVersionId: i.contentVersionId,
        version: i.contentVersion,
        sourceRefs: i.catalogItem.sourceRefs,
      })),
    );
    expect(result.answers).toHaveLength(33);
    expect(first(result.answers).answer).toEqual({
      itemId: "synthetic-M02-1",
      selectedChoiceIds: ["synthetic-a"],
    });
    expect(first(result.answers.slice(31)).answer).toEqual({
      itemId: "synthetic-M02-32",
      text: "Synthetic human response.",
    });
    frozenTree(result);
    expect(Object.isFrozen(f.items)).toBe(false);
    first(f.items).catalogItem.feedback = "caller mutation";
    first(first(f.items).catalogItem.sourceRefs).locator = "caller mutation";
    f.blueprint.manifest.objectiveIds.push("caller mutation");
    expect(first(result.form.catalog.items).feedback).toBe(
      "Technical feedback",
    );
    expect(first(first(result.form.contentVersions).sourceRefs).locator).toBe(
      "Technical fixture",
    );
    expect(result.form.blueprint.objectiveIds).toEqual(["synthetic-objective"]);
  });
  it("does not consult current public text, title, choices, selection mode or correction data", () => {
    const f = fixture();
    for (const current of f.contentVersions) {
      Object.assign(current, {
        title: "Edited after capture",
        participantText: "Edited after capture",
        participantOptions: [
          { id: "current-option", label: "X", text: "Changed" },
        ],
        participantSelectionMode: "MULTIPLE",
        responseMode: "NONE",
        kind: "LEITURA",
        correctChoiceIds: ["current-option"],
      });
    }
    const result = mapCapturedCurriculumEvaluation(f, command(f));
    expect(first(result.form.catalog.items).title).toBe("Synthetic 1");
    expect(first(result.answers).answer).toEqual({
      itemId: "synthetic-M02-1",
      selectedChoiceIds: ["synthetic-a"],
    });
  });
  it("uses captured MULTIPLE even with a single correct key", () => {
    const f = fixture();
    first(f.formItems).publicItem.selectionMode = "MULTIPLE";
    mirror(f);
    first(f.answers).response = '["synthetic-a","synthetic-b"]';
    expect(
      first(mapCapturedCurriculumEvaluation(f, command(f)).answers).answer,
    ).toEqual({
      itemId: "synthetic-M02-1",
      selectedChoiceIds: ["synthetic-a", "synthetic-b"],
    });
  });
  it("accepts semantic JSON object key order and independently shuffled SQL row order", () => {
    const f = fixture();
    first(f.items).catalogItem = reorder(first(f.items).catalogItem);
    first(f.items).publicItem = reorder(first(f.items).publicItem);
    first(f.items).catalogItem.sourceRefs = first(
      f.items,
    ).catalogItem.sourceRefs.map(reorder);
    f.items.reverse();
    f.formItems.reverse();
    f.contentVersions.reverse();
    const result = mapCapturedCurriculumEvaluation(f, command(f));
    expect(result.form.catalog.items.map((i) => i.ordinal)).toEqual(
      Array.from({ length: 33 }, (_, i) => i + 1),
    );
  });
  it.each([
    "SUBMETIDA",
    "AGUARDA_CORRECAO_HUMANA",
    "CORRIGIDA_AUTOMATICAMENTE",
    "CORRIGIDA_HUMANAMENTE",
  ])("accepts authoritative submitted/corrected status %s", (status) => {
    const f = fixture();
    f.attempt.status = status;
    expect(mapCapturedCurriculumEvaluation(f, command(f)).status).toBe(status);
  });
  it("supports persisted omissions without inventing answers", () => {
    const f = fixture();
    f.answers = [];
    expect(mapCapturedCurriculumEvaluation(f, command(f)).answers).toEqual([]);
  });
  it("passes unchanged application manifest/answer guards for a complete synthetic form", async () => {
    const f = fixture();
    const mapped = mapCapturedCurriculumEvaluation(f, command(f));
    const save = vi.fn(async (input) => ({
      ...input,
      version: 1,
      updatedAt: "2026-10-03T12:00:00.000Z",
    }));
    await evaluateAndPersistCurriculumModule(
      command(f),
      { saveCurriculumRuntime: save },
      { findEvaluationAttempt: async () => mapped },
    );
    expect(save).toHaveBeenCalledTimes(1);
  });
  it.each(invalid)(
    "rejects %s with one redacted conflict",
    (_label, mutate) => {
      const f = fixture(),
        c = command(f);
      mutate(f);
      rejected(f, c);
    },
  );
  it.each(["participantId", "scopeId", "attemptId"] as const)(
    "rejects changed command %s",
    (key) => {
      const f = fixture();
      rejected(f, { ...command(f), [key]: uuid(999) });
    },
  );
  it.each([0, -1, NaN, 1.5])("rejects command form version %s", (version) => {
    const f = fixture();
    rejected(f, { ...command(f), formVersion: version });
  });
  it.each([
    "a",
    "[]",
    '["synthetic-a","synthetic-a"]',
    '["unknown"]',
    "{}",
    "[null]",
  ])("rejects ambiguous MULTIPLE response %s", (response) => {
    const f = fixture();
    first(f.formItems).publicItem.selectionMode = "MULTIPLE";
    mirror(f);
    first(f.answers).response = response;
    rejected(f);
  });
  it.each(["items", "formItems", "answers", "contentVersions"] as const)(
    "rejects sparse %s rows",
    (key) => {
      const f = fixture();
      delete f[key][0];
      rejected(f);
    },
  );
  it("rejects sparse choice arrays even when form and capture share the malformed value", () => {
    const f = fixture(),
      i = first(f.formItems);
    if (!i.catalogItem.choices) throw new Error("Synthetic choices required");
    delete i.catalogItem.choices[0];
    i.publicItem.choices = i.catalogItem.choices;
    mirror(f);
    rejected(f);
  });
  it("rejects boxed module identities in all records even when consistently forged", () => {
    const f = fixture(),
      c = command(f);
    for (const record of [
      f.form,
      f.blueprint,
      f.binding,
      f.activity,
      f.blueprint.manifest,
      c,
      ...f.formItems.map((i) => i.catalogItem),
    ])
      Object.assign(record, { moduleId: Object("M02") });
    mirror(f);
    rejected(f, c);
  });
});

type PublicField = "title" | "text" | "choiceId" | "choiceLabel" | "choiceText";
function setFrozenPublicField(
  f: Fixture,
  field: PublicField,
  value: string,
  index = 0,
): void {
  const item = first(f.formItems.slice(index));
  if (field === "title") item.catalogItem.title = item.publicItem.title = value;
  else if (field === "text")
    item.catalogItem.prompt = item.publicItem.text = value;
  else {
    const privateChoice = first(item.catalogItem.choices ?? []);
    const publicChoice = first(item.publicItem.choices ?? []);
    if (field === "choiceId") {
      privateChoice.id = publicChoice.id = value;
      item.catalogItem.correctChoiceIds = [value];
      first(f.answers.slice(index)).response = value;
    } else if (field === "choiceLabel")
      privateChoice.label = publicChoice.label = value;
    else privateChoice.text = publicChoice.text = value;
  }
  mirror(f);
}
const publicFields: readonly PublicField[] = [
  "title",
  "text",
  "choiceId",
  "choiceLabel",
  "choiceText",
];
const publicInvalid: readonly [string, PublicField, string][] = [
  ["title max300", "title", "t".repeat(301)],
  ["prompt max20000", "text", "p".repeat(20001)],
  ["choice id max32", "choiceId", "k".repeat(33)],
  ["choice label max16", "choiceLabel", "l".repeat(17)],
  ["choice text max2000", "choiceText", "c".repeat(2001)],
  ["HTML title", "title", "<b>Technical title</b>"],
  ["HTML prompt", "text", "<b>Technical prompt</b>"],
  ["HTML choice text", "choiceText", "<b>Technical choice</b>"],
];
describe("canonical frozen public metadata and current full module consumer", () => {
  it.each([
    ["<", ">"],
    [">", "<"],
  ])(
    "denies captured MULTIPLE keys with an unrepresentable valid permutation: %j",
    (...choiceIds) => {
      const f = fixture();
      const item = first(f.formItems);
      const choices = item.catalogItem.choices!;
      choices.forEach((choice, index) => {
        choice.id = choiceIds[index]!;
      });
      item.catalogItem.correctChoiceIds = [...choiceIds];
      item.publicItem.choices = structuredClone(choices);
      item.publicItem.selectionMode = "MULTIPLE";
      mirror(f);
      f.answers = [];
      const before = structuredClone(f);
      rejected(f);
      expect(f).toEqual(before);
    },
  );
  it.each(["SINGLE", "MULTIPLE"] as const)(
    "rejects unsaveable %s choice IDs even before any answer is supplied",
    (selectionMode) => {
      const f = fixture();
      setFrozenPublicField(f, "choiceId", "<id>");
      first(f.formItems).publicItem.selectionMode = selectionMode;
      mirror(f);
      f.answers = [];
      const before = structuredClone(f);
      rejected(f);
      expect(f).toEqual(before);
    },
  );
  it.each(publicInvalid)(
    "rejects %s without replacing either snapshot",
    (_name, field, value) => {
      const f = fixture();
      setFrozenPublicField(f, field, value);
      // Omissions prevent answer decoding from accidentally hiding invalid public keys.
      f.answers = [];
      const before = structuredClone(f);
      rejected(f);
      expect(f).toEqual(before);
    },
  );
  it.each(publicFields)(
    "rejects trim normalization drift in captured %s",
    (field) => {
      for (const value of [" padded", "padded ", "\tpadded\n"]) {
        const f = fixture();
        setFrozenPublicField(f, field, value);
        f.answers = [];
        const before = structuredClone(f);
        rejected(f);
        expect(f).toEqual(before);
      }
    },
  );
  it.each(["title", "text"] as const)(
    "rejects HTML in frozen TEXT item %s",
    (field) => {
      const f = fixture();
      setFrozenPublicField(f, field, "<b>Technical text item</b>", 31);
      rejected(f);
    },
  );
  it.each(["MODULE_COMPLETION", "FORMATIVE_CHOICE"] as const)(
    "maps exact canonical maximum fields unchanged for complete %s 31+2",
    (mode) => {
      const f = fixture();
      f.form.mode = mode;
      setFrozenPublicField(f, "title", "t".repeat(300));
      setFrozenPublicField(f, "text", "p".repeat(20000));
      setFrozenPublicField(f, "choiceId", "k".repeat(32));
      setFrozenPublicField(f, "choiceLabel", "l".repeat(16));
      setFrozenPublicField(f, "choiceText", "c".repeat(2000));
      const before = structuredClone(f);
      const mapped = mapCapturedCurriculumEvaluation(f, command(f));
      expect(mapped.mode).toBe(mode);
      expect(first(mapped.form.catalog.items)).toEqual(
        first(f.items).catalogItem,
      );
      expect(first(mapped.answers).answer).toEqual({
        itemId: "synthetic-M02-1",
        selectedChoiceIds: ["k".repeat(32)],
      });
      expect(f).toEqual(before);
      frozenTree(mapped);
    },
  );
  it("preserves minimum canonical public fields, plain internal whitespace and private metadata", () => {
    const f = fixture();
    for (const [field, value] of [
      ["title", "T"],
      ["text", "P"],
      ["choiceId", "k"],
      ["choiceLabel", "L"],
      ["choiceText", "C"],
    ] as const)
      setFrozenPublicField(f, field, value);
    first(f.formItems).catalogItem.feedback = "  Synthetic private feedback.  ";
    mirror(f);
    let mapped = mapCapturedCurriculumEvaluation(f, command(f));
    expect(first(mapped.form.catalog.items)).toEqual(
      first(f.items).catalogItem,
    );
    expect(first(mapped.form.catalog.items).feedback).toBe(
      "  Synthetic private feedback.  ",
    );
    for (const field of ["title", "text", "choiceText"] as const)
      setFrozenPublicField(
        f,
        field,
        "Technical line one.\nLine two with internal spaces.",
      );
    first(f.answers).response = " k ";
    first(f.answers.slice(31)).response =
      "  Synthetic plain response.\nInternal spacing.  ";
    mapped = mapCapturedCurriculumEvaluation(f, command(f));
    expect(first(mapped.form.catalog.items)).toEqual(
      first(f.items).catalogItem,
    );
    expect(first(mapped.answers).answer).toEqual({
      itemId: "synthetic-M02-1",
      selectedChoiceIds: ["k"],
    });
    expect(first(mapped.answers.slice(31)).answer).toEqual({
      itemId: "synthetic-M02-32",
      text: "Synthetic plain response.\nInternal spacing.",
    });
  });
  it.each(["MODULE_COMPLETION", "FORMATIVE_CHOICE"] as const)(
    "passes unchanged application guards and persists complete %s 31+2",
    async (mode) => {
      const f = fixture();
      f.form.mode = mode;
      const save = vi.fn(async (input) => ({
        ...input,
        version: 1,
        updatedAt: f.now.toISOString(),
      }));
      await evaluateAndPersistCurriculumModule(
        command(f),
        { saveCurriculumRuntime: save },
        {
          findEvaluationAttempt: async () =>
            mapCapturedCurriculumEvaluation(f, command(f)),
        },
      );
      expect(save).toHaveBeenCalledTimes(1);
    },
  );
  it("rejects the choice-only FORMATIVE 31+0 shape before the application can save", async () => {
    const f = fixture();
    f.form.mode = "FORMATIVE_CHOICE";
    f.formItems = f.formItems.slice(0, 31);
    f.contentVersions = f.contentVersions.slice(0, 31);
    f.answers = f.answers.slice(0, 31);
    f.blueprint.manifest.openResponseCount = 0;
    f.blueprint.manifest.itemManifest = f.blueprint.manifest.itemManifest.slice(
      0,
      31,
    );
    mirror(f);
    rejected(f);
    const save = vi.fn(async (input) => ({
      ...input,
      version: 1,
      updatedAt: f.now.toISOString(),
    }));
    await expect(
      evaluateAndPersistCurriculumModule(
        command(f),
        { saveCurriculumRuntime: save },
        {
          findEvaluationAttempt: async () =>
            mapCapturedCurriculumEvaluation(f, command(f)),
        },
      ),
    ).rejects.toMatchObject({
      code: "state_conflict",
      message: "Captured curriculum evaluation is inconsistent",
      details: [],
    });
    expect(save).not.toHaveBeenCalled();
  });
  it("ignores malformed or padded current public metadata after a valid capture", () => {
    const f = fixture();
    for (const current of f.contentVersions)
      Object.assign(current, {
        title: "<b>" + "x".repeat(301) + "</b>",
        participantText: " current padded ",
        participantOptions: [
          {
            id: " current key ",
            label: "l".repeat(17),
            text: "<b>Current</b>",
          },
        ],
        participantSelectionMode: "NONE",
      });
    const mapped = mapCapturedCurriculumEvaluation(f, command(f));
    expect(mapped.form.catalog.items).toEqual(
      f.items.map((i) => i.catalogItem),
    );
    expect(first(mapped.answers).answer).toEqual({
      itemId: "synthetic-M02-1",
      selectedChoiceIds: ["synthetic-a"],
    });
  });
  it("accepts canonical labels without inventing omitted answers or unsaveable keys", () => {
    const f = fixture();
    setFrozenPublicField(f, "choiceLabel", "<b>L</b>");
    f.answers = [];
    const mapped = mapCapturedCurriculumEvaluation(f, command(f));
    expect(first(mapped.form.catalog.items)).toEqual(
      first(f.items).catalogItem,
    );
    expect(mapped.answers).toEqual([]);
  });
});
