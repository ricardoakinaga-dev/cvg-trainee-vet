import { ApplicationError } from "@cvg/application";
import { describe, expect, it } from "vitest";
import {
  assertPublishedCurriculumCapture,
  type PublishedCurriculumCaptureInput,
} from "./curriculum-attempt-capture-validation.js";

type Mutable<T> = T extends Date
  ? Date
  : T extends readonly (infer V)[]
    ? Mutable<V>[]
    : T extends object
      ? { -readonly [K in keyof T]: Mutable<T[K]> }
      : T;
type Fixture = Mutable<PublishedCurriculumCaptureInput>;
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
  const items: Fixture["items"] = Array.from({ length: 33 }, (_, i) => {
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
        itemManifest: items.map(({ catalogItem: c }) => ({
          itemId: c.id,
          objectiveId: c.objectiveId,
          responseMode: c.responseMode,
          critical: c.critical,
          sessionId: c.sessionId,
        })),
      },
    },
    items,
    activity: { scopeId, moduleId: "M02" },
    activityItems: items.map((i) => ({
      contentVersionId: i.contentVersionId,
      ordinal: i.ordinal,
    })),
    contentVersions: items.map((i) => ({
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
    expectedScopeId: scopeId,
    now: new Date("2026-10-03T12:00:00Z"),
  };
}

describe("published curriculum capture validation (pure trusted-row contract)", () => {
  it.each([
    ["<", ">"],
    [">", "<"],
  ])(
    "rejects MULTIPLE keys whose valid permutations cannot traverse plain JSON: %j",
    (...choiceIds) => {
      const f = fixture();
      const item = first(f.items);
      const content = first(f.contentVersions);
      const choices = item.catalogItem.choices!;
      choices.forEach((choice, index) => {
        choice.id = choiceIds[index]!;
      });
      item.catalogItem.correctChoiceIds = [...choiceIds];
      item.publicItem.choices = structuredClone(choices);
      item.publicItem.selectionMode = "MULTIPLE";
      content.participantOptions = structuredClone(choices);
      content.participantSelectionMode = "MULTIPLE";
      const before = structuredClone(f);
      expect(() => assertPublishedCurriculumCapture(f)).toThrow(
        ApplicationError,
      );
      expect(f).toEqual(before);
    },
  );
  it("denies choice-only FORMATIVE capture before creating an unsupported evaluation binding", () => {
    const f = fixture();
    f.form.mode = "FORMATIVE_CHOICE";
    f.items = f.items.slice(0, 31);
    f.activityItems = f.activityItems.slice(0, 31);
    f.contentVersions = f.contentVersions.slice(0, 31);
    f.blueprint.manifest.openResponseCount = 0;
    f.blueprint.manifest.itemManifest = f.blueprint.manifest.itemManifest.slice(
      0,
      31,
    );
    const before = structuredClone(f);
    expect(() => assertPublishedCurriculumCapture(f)).toThrow(ApplicationError);
    expect(f).toEqual(before);
  });
  it.each(["SINGLE", "MULTIPLE"] as const)(
    "rejects an offered %s choice ID that cannot traverse the plain response contract",
    (selectionMode) => {
      const f = fixture(),
        item = first(f.items),
        content = first(f.contentVersions);
      const choices = item.catalogItem.choices!;
      first(choices).id = "<id>";
      item.catalogItem.correctChoiceIds = ["<id>"];
      item.publicItem.choices = structuredClone(choices);
      item.publicItem.selectionMode = selectionMode;
      content.participantOptions = structuredClone(choices);
      content.participantSelectionMode = selectionMode;
      const before = structuredClone(f);
      expect(() => assertPublishedCurriculumCapture(f)).toThrow(
        ApplicationError,
      );
      expect(f).toEqual(before);
    },
  );
  it.each([
    ["title too long", "title", "x".repeat(301)],
    ["HTML title", "title", "<b>Technical title</b>"],
    ["HTML prompt", "prompt", "<b>Technical prompt</b>"],
    ["noncanonical title", "title", " Technical title "],
    ["choice id too long", "id", "x".repeat(33)],
    ["choice label too long", "label", "x".repeat(17)],
    ["choice text too long", "text", "x".repeat(2_001)],
    ["HTML choice text", "text", "<b>Technical choice</b>"],
    ["noncanonical choice id", "id", " synthetic-a "],
  ] as const)(
    "rejects coherent public metadata outside the canonical contract: %s",
    (_name, field, value) => {
      const f = fixture(),
        item = first(f.items),
        content = first(f.contentVersions);
      if (field === "title" || field === "prompt") {
        item.catalogItem[field] = value;
        if (field === "title") item.publicItem.title = content.title = value;
        else item.publicItem.text = content.participantText = value;
      } else {
        const choices = item.catalogItem.choices!;
        first(choices)[field] = value;
        if (field === "id") item.catalogItem.correctChoiceIds = [value];
        item.publicItem.choices = structuredClone(choices);
        content.participantOptions = structuredClone(choices);
      }
      expect(() => assertPublishedCurriculumCapture(f)).toThrow(
        ApplicationError,
      );
    },
  );

  it("preserves exact canonical public limits without rewriting frozen values", () => {
    const f = fixture(),
      item = first(f.items),
      content = first(f.contentVersions);
    item.catalogItem.title =
      item.publicItem.title =
      content.title =
        "t".repeat(300);
    item.catalogItem.prompt =
      item.publicItem.text =
      content.participantText =
        "p".repeat(20_000);
    first(item.catalogItem.choices!).id = "i".repeat(32);
    first(item.catalogItem.choices!).label = "l".repeat(16);
    first(item.catalogItem.choices!).text = "c".repeat(2_000);
    item.catalogItem.correctChoiceIds = ["i".repeat(32)];
    item.publicItem.choices = structuredClone(item.catalogItem.choices!);
    content.participantOptions = structuredClone(item.catalogItem.choices!);
    const before = structuredClone(f);
    expect(() => assertPublishedCurriculumCapture(f)).not.toThrow();
    expect(f).toEqual(before);
  });

  it.each([
    "public-hole",
    "current-hole",
    "public-empty",
    "current-empty",
    "both-holes",
  ])("rejects sparse choice projections: %s", (variant) => {
    const f = fixture();
    const item = first(f.items);
    const content = first(f.contentVersions);
    if (!item.publicItem.choices || !content.participantOptions)
      throw new Error("Fixture choices required");
    if (variant === "public-hole" || variant === "both-holes")
      delete item.publicItem.choices[0];
    if (variant === "current-hole" || variant === "both-holes")
      delete content.participantOptions[1];
    if (variant === "public-empty") item.publicItem.choices = new Array(2);
    if (variant === "current-empty") content.participantOptions = new Array(2);
    expect(() => assertPublishedCurriculumCapture(f)).toThrow(ApplicationError);
  });
  it.each([
    { label: "array", value: ["M02"] },
    { label: "boxed string", value: Object("M02") },
  ])(
    "rejects shared coerced module identity $label",
    ({ value: malformed }) => {
      const f = fixture();
      for (const record of [
        f.form,
        f.blueprint,
        f.activity,
        f.blueprint.manifest,
        ...f.items.map((item) => item.catalogItem),
      ])
        Object.assign(record, { moduleId: malformed });
      expect(() => assertPublishedCurriculumCapture(f)).toThrow(
        ApplicationError,
      );
    },
  );
  it("accepts the entire authoritative 31 CHOICE + 2 human TEXT manifest without mutation", () => {
    const f = fixture(),
      before = structuredClone(f);
    expect(() => assertPublishedCurriculumCapture(f)).not.toThrow();
    expect(f).toEqual(before);
  });
  it("accepts explicit MULTIPLE with one or several frozen keys without inferring SINGLE", () => {
    const f = fixture(),
      item = first(f.items),
      content = first(f.contentVersions);
    item.publicItem.selectionMode = "MULTIPLE";
    content.participantSelectionMode = "MULTIPLE";
    assertPublishedCurriculumCapture(f);
    item.catalogItem.correctChoiceIds = ["synthetic-a", "synthetic-b"];
    assertPublishedCurriculumCapture(f);
  });
  it("accepts equality at approval/publication/now and independent positive version numbers", () => {
    const f = fixture();
    f.blueprint.approvedAt = f.now;
    f.form.publishedAt = f.now;
    f.form.version = 7;
    f.blueprint.version = 4;
    f.blueprint.manifest.version = 4;
    assertPublishedCurriculumCapture(f);
  });
  it("accepts all actual SourceCode values as internal metadata without projecting them", () => {
    const f = fixture();
    const codes = [
      "F-01",
      "F-02",
      "F-03",
      "AAHA-2024",
      "RECOVER-2024",
      "WSAVA-2022",
      "AVHTM-TRACS-2021",
    ] as const;
    first(f.items).catalogItem.sourceRefs = codes.map((code) => ({
      code,
      locator: "Synthetic internal provenance",
      updateRequired: false,
    }));
    assertPublishedCurriculumCapture(f);
  });
  it("validates the full authoritative manifest also in FORMATIVE_CHOICE without grading TEXT", () => {
    const f = fixture();
    f.form.mode = "FORMATIVE_CHOICE";
    expect(assertPublishedCurriculumCapture(f)).toBeUndefined();
    expect(
      f.items
        .slice(31)
        .every(
          (item) =>
            item.catalogItem.responseMode === "TEXT" &&
            item.catalogItem.correctChoiceIds === undefined,
        ),
    ).toBe(true);
  });
  it("ignores caller order of complete rows and JSON object keys without changing ordinals", () => {
    const f = fixture();
    f.items.reverse();
    f.activityItems.reverse();
    f.contentVersions.reverse();
    f.blueprint.manifest.itemManifest.reverse();
    first(f.contentVersions).participantOptions = null;
    const choice = f.contentVersions.find(
      (item) => item.responseMode === "CHOICE",
    );
    if (choice === undefined) throw new Error("Technical choice required");
    choice.participantOptions = (choice.participantOptions ?? []).map(
      ({ id, label, text }) => ({ text, label, id }),
    );
    assertPublishedCurriculumCapture(f);
  });

  const invalid: [string, (f: Fixture) => void][] = [
    [
      "withdrawn form",
      (f) => {
        f.form.status = "RETIRADO";
      },
    ],
    [
      "draft form",
      (f) => {
        f.form.status = "RASCUNHO";
      },
    ],
    [
      "foreign expected scope",
      (f) => {
        f.expectedScopeId = uuid(999);
      },
    ],
    [
      "foreign blueprint scope",
      (f) => {
        f.blueprint.scopeId = uuid(999);
      },
    ],
    [
      "foreign activity scope",
      (f) => {
        f.activity.scopeId = uuid(999);
      },
    ],
    [
      "foreign form module",
      (f) => {
        f.form.moduleId = "M03";
      },
    ],
    [
      "foreign blueprint module",
      (f) => {
        f.blueprint.moduleId = "M03";
      },
    ],
    [
      "unbound activity module",
      (f) => {
        f.activity.moduleId = null;
      },
    ],
    [
      "foreign blueprint link",
      (f) => {
        f.form.blueprintVersionId = uuid(999);
      },
    ],
    [
      "missing publication proof",
      (f) => {
        f.form.publicationDecisionId = "";
      },
    ],
    [
      "missing approval proof",
      (f) => {
        f.blueprint.approvalDecisionId = "";
      },
    ],
    [
      "invalid publisher",
      (f) => {
        f.form.publishedBy = "publisher";
      },
    ],
    [
      "invalid approver",
      (f) => {
        f.blueprint.approvedBy = "approver";
      },
    ],
    [
      "empty form identity",
      (f) => {
        f.form.formId = " ";
      },
    ],
    [
      "empty blueprint identity",
      (f) => {
        f.blueprint.blueprintId = " ";
      },
    ],
    [
      "malformed form UUID",
      (f) => {
        f.form.id = "form";
      },
    ],
    [
      "zero form version",
      (f) => {
        f.form.version = 0;
      },
    ],
    [
      "fractional blueprint version",
      (f) => {
        f.blueprint.version = 1.5;
      },
    ],
    [
      "NaN form version",
      (f) => {
        f.form.version = NaN;
      },
    ],
    [
      "unsafe version",
      (f) => {
        f.form.version = Number.MAX_SAFE_INTEGER + 1;
      },
    ],
    [
      "future publication",
      (f) => {
        f.form.publishedAt = new Date(f.now.getTime() + 1);
      },
    ],
    [
      "approval after publication",
      (f) => {
        f.blueprint.approvedAt = new Date(f.form.publishedAt.getTime() + 1);
      },
    ],
    [
      "invalid now",
      (f) => {
        f.now = new Date(NaN);
      },
    ],
    [
      "invalid approval date",
      (f) => {
        f.blueprint.approvedAt = new Date(NaN);
      },
    ],
    [
      "date string masquerading as date",
      (f) => {
        Object.assign(f.form, {
          publishedAt: f.form.publishedAt.toISOString(),
        });
      },
    ],
    [
      "unknown mode",
      (f) => {
        Object.assign(f.form, { mode: "CLINICAL" });
      },
    ],
    [
      "manifest approval mismatch",
      (f) => {
        f.blueprint.manifest.approvalDecisionId = uuid(999);
      },
    ],
    [
      "manifest version mismatch",
      (f) => {
        f.blueprint.manifest.version = 2;
      },
    ],
    [
      "manifest module mismatch",
      (f) => {
        f.blueprint.manifest.moduleId = "M03";
      },
    ],
    [
      "wrong CHOICE count",
      (f) => {
        f.blueprint.manifest.questionTotal = 30;
      },
    ],
    [
      "wrong TEXT count",
      (f) => {
        f.blueprint.manifest.openResponseCount = 1;
      },
    ],
    [
      "negative count",
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
      "duplicate objectives",
      (f) => {
        f.blueprint.manifest.objectiveIds.push("synthetic-objective");
      },
    ],
    [
      "unused objective",
      (f) => {
        f.blueprint.manifest.objectiveIds.push("unused-objective");
      },
    ],
    [
      "no objectives",
      (f) => {
        f.blueprint.manifest.objectiveIds = [];
      },
    ],
    [
      "duplicate manifest",
      (f) => {
        f.blueprint.manifest.itemManifest.push(
          first(f.blueprint.manifest.itemManifest),
        );
      },
    ],
    [
      "missing authoritative manifest item",
      (f) => {
        f.blueprint.manifest.itemManifest.pop();
      },
    ],
    [
      "single-item self-consistent catalog cannot replace authoritative manifest",
      (f) => {
        f.items = f.items.slice(0, 1);
        f.activityItems = f.activityItems.slice(0, 1);
        f.contentVersions = f.contentVersions.slice(0, 1);
      },
    ],
    [
      "partial catalog/activity/current rows",
      (f) => {
        f.items.pop();
        f.activityItems.pop();
        f.contentVersions.pop();
      },
    ],
    [
      "missing all items",
      (f) => {
        f.items = [];
      },
    ],
    [
      "foreign canonical membership",
      (f) => {
        first(f.items).canonicalItemId = "unknown-item";
        first(f.items).catalogItem.id = "unknown-item";
      },
    ],
    [
      "duplicate canonical identity",
      (f) => {
        f.items.push(first(f.items));
      },
    ],
    [
      "duplicate content UUID",
      (f) => {
        first(f.items).contentVersionId = f.items[1]?.contentVersionId ?? "";
      },
    ],
    [
      "duplicate ordinal",
      (f) => {
        first(f.items).ordinal = 2;
      },
    ],
    [
      "ordinal zero",
      (f) => {
        first(f.items).ordinal = 0;
      },
    ],
    [
      "ordinal outside bound",
      (f) => {
        first(f.items).ordinal = 101;
      },
    ],
    [
      "catalog ordinal mismatch",
      (f) => {
        first(f.items).catalogItem.ordinal = 2;
      },
    ],
    [
      "foreign frozen form",
      (f) => {
        first(f.items).formVersionId = uuid(999);
      },
    ],
    [
      "foreign frozen scope",
      (f) => {
        first(f.items).scopeId = uuid(999);
      },
    ],
    [
      "foreign catalog module",
      (f) => {
        first(f.items).catalogItem.moduleId = "M03";
      },
    ],
    [
      "manifest objective mismatch",
      (f) => {
        first(f.blueprint.manifest.itemManifest).objectiveId = "unknown";
      },
    ],
    [
      "manifest critical mismatch",
      (f) => {
        first(f.blueprint.manifest.itemManifest).critical = false;
      },
    ],
    [
      "manifest session mismatch",
      (f) => {
        first(f.blueprint.manifest.itemManifest).sessionId = "M02-S2";
      },
    ],
    [
      "manifest mode mismatch",
      (f) => {
        first(f.blueprint.manifest.itemManifest).responseMode = "TEXT";
      },
    ],
    [
      "invalid session",
      (f) => {
        first(f.items).catalogItem.sessionId = "M02-S5";
        first(f.blueprint.manifest.itemManifest).sessionId = "M02-S5";
      },
    ],
    [
      "unknown item kind",
      (f) => {
        Object.assign(first(f.items).catalogItem, { kind: "UNTRUSTED" });
      },
    ],
    [
      "unknown remediation objective",
      (f) => {
        first(f.items).catalogItem.remediationTargetObjectiveId = "unapproved";
      },
    ],
    [
      "absent source metadata",
      (f) => {
        first(f.items).catalogItem.sourceRefs = [];
      },
    ],
    [
      "unknown source code",
      (f) => {
        Object.assign(first(first(f.items).catalogItem.sourceRefs), {
          code: "FAKE",
        });
      },
    ],
    [
      "empty source locator",
      (f) => {
        first(first(f.items).catalogItem.sourceRefs).locator = " ";
      },
    ],
    [
      "untyped source flag",
      (f) => {
        Object.assign(first(first(f.items).catalogItem.sourceRefs), {
          updateRequired: "false",
        });
      },
    ],
    [
      "missing private feedback",
      (f) => {
        first(f.items).catalogItem.feedback = "";
      },
    ],
    [
      "unknown private JSON",
      (f) => {
        Object.assign(first(f.items).catalogItem, { hidden: "unrecognized" });
      },
    ],
    [
      "null private JSON",
      (f) => {
        Object.assign(first(f.items), { catalogItem: null });
      },
    ],
    [
      "null manifest",
      (f) => {
        Object.assign(f.blueprint, { manifest: null });
      },
    ],
    [
      "unknown manifest JSON",
      (f) => {
        Object.assign(f.blueprint.manifest, { hidden: true });
      },
    ],
    [
      "missing activity item",
      (f) => {
        f.activityItems.pop();
      },
    ],
    [
      "extra activity item",
      (f) => {
        f.activityItems.push({ contentVersionId: uuid(999), ordinal: 34 });
      },
    ],
    [
      "duplicate activity membership",
      (f) => {
        f.activityItems[1] = first(f.activityItems);
      },
    ],
    [
      "wrong activity ordinal",
      (f) => {
        first(f.activityItems).ordinal = 2;
      },
    ],
    [
      "missing current content",
      (f) => {
        f.contentVersions.pop();
      },
    ],
    [
      "extra current content",
      (f) => {
        f.contentVersions.push({ ...first(f.contentVersions), id: uuid(999) });
      },
    ],
    [
      "duplicate current content",
      (f) => {
        f.contentVersions[1] = first(f.contentVersions);
      },
    ],
    [
      "withdrawn current content",
      (f) => {
        first(f.contentVersions).status = "RETIRADO";
      },
    ],
    [
      "expired current content",
      (f) => {
        first(f.contentVersions).status = "VENCIDO";
      },
    ],
    [
      "foreign current scope",
      (f) => {
        first(f.contentVersions).scopeId = uuid(999);
      },
    ],
    [
      "content UUID mismatch",
      (f) => {
        first(f.contentVersions).contentId = uuid(999);
      },
    ],
    [
      "content version mismatch",
      (f) => {
        first(f.contentVersions).version = 2;
      },
    ],
    [
      "bad frozen version",
      (f) => {
        first(f.items).contentVersion = 0;
      },
    ],
    [
      "invalid content UUID",
      (f) => {
        first(f.items).contentId = "invalid";
      },
    ],
    [
      "current title mismatch",
      (f) => {
        first(f.contentVersions).title = "Edited title";
      },
    ],
    [
      "current prompt mismatch",
      (f) => {
        first(f.contentVersions).participantText = "Edited prompt";
      },
    ],
    [
      "current response mode mismatch",
      (f) => {
        first(f.contentVersions).responseMode = "TEXT";
      },
    ],
    [
      "current item kind mismatch",
      (f) => {
        first(f.contentVersions).kind = "CASO";
      },
    ],
    [
      "public canonical ID instead of UUID",
      (f) => {
        first(f.items).publicItem.itemId = first(f.items).canonicalItemId;
      },
    ],
    [
      "public ordinal mismatch",
      (f) => {
        first(f.items).publicItem.ordinal = 2;
      },
    ],
    [
      "public title mismatch",
      (f) => {
        first(f.items).publicItem.title = "Edited title";
      },
    ],
    [
      "public prompt mismatch",
      (f) => {
        first(f.items).publicItem.text = "Edited prompt";
      },
    ],
    [
      "public response mode mismatch",
      (f) => {
        first(f.items).publicItem.responseMode = "TEXT";
      },
    ],
    [
      "public unsupported kind",
      (f) => {
        Object.assign(first(f.items).publicItem, { kind: "LEITURA" });
      },
    ],
    [
      "public keys leaked",
      (f) => {
        Object.assign(first(f.items).publicItem, {
          correctChoiceIds: ["synthetic-a"],
        });
      },
    ],
    [
      "public sources leaked",
      (f) => {
        Object.assign(first(f.items).publicItem, {
          sourceRefs: first(f.items).catalogItem.sourceRefs,
        });
      },
    ],
    [
      "public rubric leaked",
      (f) => {
        Object.assign(first(f.items).publicItem, { rubric: {} });
      },
    ],
    [
      "public nested key leaked",
      (f) => {
        Object.assign(first(first(f.items).publicItem.choices ?? []), {
          correct: true,
        });
      },
    ],
    [
      "no explicit selection mode",
      (f) => {
        delete first(f.items).publicItem.selectionMode;
      },
    ],
    [
      "current selection mode absent",
      (f) => {
        first(f.contentVersions).participantSelectionMode = null;
      },
    ],
    [
      "mode mismatch",
      (f) => {
        first(f.contentVersions).participantSelectionMode = "MULTIPLE";
      },
    ],
    [
      "unknown selection mode",
      (f) => {
        Object.assign(first(f.items).publicItem, { selectionMode: "ORDERING" });
      },
    ],
    [
      "no choices",
      (f) => {
        first(f.items).catalogItem.choices = [];
      },
    ],
    [
      "duplicate choice ID",
      (f) => {
        const c = first(f.items).catalogItem;
        c.choices = [first(c.choices ?? []), first(c.choices ?? [])];
      },
    ],
    [
      "current choices mismatch",
      (f) => {
        first(first(f.contentVersions).participantOptions ?? []).text =
          "Edited choice";
      },
    ],
    [
      "public choices mismatch",
      (f) => {
        first(first(f.items).publicItem.choices ?? []).label = "Edited label";
      },
    ],
    [
      "no private keys",
      (f) => {
        first(f.items).catalogItem.correctChoiceIds = [];
      },
    ],
    [
      "unknown private key",
      (f) => {
        first(f.items).catalogItem.correctChoiceIds = ["not-a-choice"];
      },
    ],
    [
      "duplicate private key",
      (f) => {
        first(f.items).catalogItem.correctChoiceIds = [
          "synthetic-a",
          "synthetic-a",
        ];
      },
    ],
    [
      "SINGLE with multiple private keys",
      (f) => {
        first(f.items).catalogItem.correctChoiceIds = [
          "synthetic-a",
          "synthetic-b",
        ];
      },
    ],
    [
      "CHOICE rubric ambiguity",
      (f) => {
        Object.assign(first(f.items).catalogItem, { rubric: {} });
      },
    ],
    [
      "TEXT choices ambiguity",
      (f) => {
        Object.assign(f.items[31]?.catalogItem ?? {}, { choices: [] });
      },
    ],
    [
      "TEXT key ambiguity",
      (f) => {
        Object.assign(f.items[31]?.catalogItem ?? {}, { correctChoiceIds: [] });
      },
    ],
    [
      "TEXT public choice ambiguity",
      (f) => {
        Object.assign(f.items[31]?.publicItem ?? {}, { choices: [] });
      },
    ],
    [
      "TEXT current mode ambiguity",
      (f) => {
        const c = f.contentVersions[31];
        if (c) c.participantSelectionMode = "SINGLE";
      },
    ],
    [
      "TEXT rubric missing",
      (f) => {
        const c = f.items[31]?.catalogItem;
        if (c) delete c.rubric;
      },
    ],
    [
      "TEXT rubric dimensions empty",
      (f) => {
        const r = f.items[31]?.catalogItem.rubric;
        if (r) r.dimensions = [];
      },
    ],
    [
      "TEXT rubric critical errors empty",
      (f) => {
        const r = f.items[31]?.catalogItem.rubric;
        if (r) r.criticalErrors = [];
      },
    ],
    [
      "TEXT rubric pass score zero",
      (f) => {
        const r = f.items[31]?.catalogItem.rubric;
        if (r) r.passScore = 0;
      },
    ],
    [
      "TEXT rubric pass score excessive",
      (f) => {
        const r = f.items[31]?.catalogItem.rubric;
        if (r) r.passScore = 101;
      },
    ],
    [
      "TEXT rubric nonfinite max points",
      (f) => {
        const r = f.items[31]?.catalogItem.rubric;
        if (r) first(r.dimensions).maxPoints = Infinity;
      },
    ],
    [
      "TEXT rubric duplicate dimensions",
      (f) => {
        const r = f.items[31]?.catalogItem.rubric;
        if (r) r.dimensions.push(first(r.dimensions));
      },
    ],
    [
      "TEXT rubric empty dimension description",
      (f) => {
        const r = f.items[31]?.catalogItem.rubric;
        if (r) first(r.dimensions).description = "";
      },
    ],
    [
      "empty canonical manifest ID",
      (f) => {
        first(f.blueprint.manifest.itemManifest).itemId = "";
      },
    ],
    [
      "empty manifest session",
      (f) => {
        first(f.blueprint.manifest.itemManifest).sessionId = "";
      },
    ],
    [
      "critical string",
      (f) => {
        Object.assign(first(f.blueprint.manifest.itemManifest), {
          critical: "true",
        });
      },
    ],
    [
      "unknown manifest entry JSON",
      (f) => {
        Object.assign(first(f.blueprint.manifest.itemManifest), {
          hidden: true,
        });
      },
    ],
    [
      "sparse objective array",
      (f) => {
        f.blueprint.manifest.objectiveIds.length = 2;
      },
    ],
    [
      "null objectives",
      (f) => {
        Object.assign(f.blueprint.manifest, { objectiveIds: null });
      },
    ],
    [
      "null full manifest items",
      (f) => {
        Object.assign(f.blueprint.manifest, { itemManifest: null });
      },
    ],
    [
      "TEXT current choices ambiguity",
      (f) => {
        const c = f.contentVersions[31];
        if (c) c.participantOptions = [];
      },
    ],
    [
      "TEXT private rubric extra JSON",
      (f) => {
        Object.assign(f.items[31]?.catalogItem.rubric ?? {}, {
          automatic: true,
        });
      },
    ],
    [
      "TEXT rubric dimension extra JSON",
      (f) => {
        const r = f.items[31]?.catalogItem.rubric;
        if (r) Object.assign(first(r.dimensions), { source: "leak" });
      },
    ],
    [
      "public nested source leak",
      (f) => {
        Object.assign(first(first(f.items).publicItem.choices ?? []), {
          sourceRefs: [],
        });
      },
    ],
    [
      "current nested source leak",
      (f) => {
        Object.assign(
          first(first(f.contentVersions).participantOptions ?? []),
          { sourceRefs: [] },
        );
      },
    ],
    [
      "more than 100 authoritative items",
      (f) => {
        f.blueprint.manifest.questionTotal = 100;
      },
    ],
    [
      "string rubric pass score",
      (f) => {
        Object.assign(f.items[31]?.catalogItem.rubric ?? {}, {
          passScore: "70",
        });
      },
    ],
    [
      "string max points",
      (f) => {
        const r = f.items[31]?.catalogItem.rubric;
        if (r) Object.assign(first(r.dimensions), { maxPoints: "100" });
      },
    ],
    [
      "empty critical error",
      (f) => {
        const r = f.items[31]?.catalogItem.rubric;
        if (r) r.criticalErrors = [""];
      },
    ],
    [
      "null public JSON",
      (f) => {
        Object.assign(first(f.items), { publicItem: null });
      },
    ],
    [
      "null content rows",
      (f) => {
        Object.assign(f, { contentVersions: null });
      },
    ],
    [
      "null activity rows",
      (f) => {
        Object.assign(f, { activityItems: null });
      },
    ],
    [
      "null frozen rows",
      (f) => {
        Object.assign(f, { items: null });
      },
    ],
    [
      "undefined approval time",
      (f) => {
        Object.assign(f.blueprint, { approvedAt: undefined });
      },
    ],
    [
      "oversized form ID",
      (f) => {
        f.form.formId = "a".repeat(201);
      },
    ],
    [
      "foreign module consistent rows",
      (f) => {
        f.form.moduleId = "M25";
        f.blueprint.moduleId = "M25";
        f.activity.moduleId = "M25";
      },
    ],
  ];
  it.each(invalid)("rejects %s with only state_conflict", (_name, edit) => {
    const f = structuredClone(fixture());
    edit(f);
    expect(() => assertPublishedCurriculumCapture(f)).toThrow(ApplicationError);
    expect(() => assertPublishedCurriculumCapture(f)).toThrow(
      expect.objectContaining({ code: "state_conflict" }),
    );
  });
});
