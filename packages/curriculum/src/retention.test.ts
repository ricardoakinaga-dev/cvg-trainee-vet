import { describe, expect, it } from "vitest";
import {
  createRetentionTemplates,
  scheduleRetentionReviews,
  verifyRetentionForm,
  type RetentionBlueprint,
  type RetentionForm,
} from "./retention.js";

const slot = {
  objectiveId: "synthetic-objective",
  cognitiveTag: "INTERPRETACAO",
  critical: true,
  species: "CANINA",
  complexity: "INTERMEDIARIA",
};
const blueprint: RetentionBlueprint = {
  id: "synthetic-blueprint",
  version: 1,
  clinicalReview: "APROVADO_CLINICAMENTE",
  slots: [slot],
};
function form(id: string): RetentionForm {
  return {
    formId: id,
    version: 1,
    blueprintId: blueprint.id,
    blueprintVersion: blueprint.version,
    clinicalReview: "APROVADO_CLINICAMENTE",
    correctionReview: "VERIFICADO",
    syntheticPreflight: true,
    items: [
      {
        ...slot,
        id: `${id}-item`,
        prompt: `Enunciado sintético ${id}.`,
        expectedResponse: `Resposta sintética ${id}.`,
      },
    ],
  };
}
const baseline = form("baseline");
const candidate = form("retention30");
function verify(
  next: RetentionForm = candidate,
  approved: RetentionBlueprint = blueprint,
  previousForms: readonly RetentionForm[] = [],
) {
  return verifyRetentionForm({
    blueprint: approved,
    baseline,
    previousForms,
    candidate: next,
  });
}

describe("retention calendar and equivalent-form evidence", () => {
  it("materializes templates with verified evidence and blocks an unproven or reused subsequent form", () => {
    const forms = [
      form("retention30"),
      form("retention60"),
      form("retention90"),
    ] as const;
    const valid = createRetentionTemplates({
      objectiveIds: [slot.objectiveId],
      proof: { blueprint, baseline, forms },
    });
    expect(
      valid.map((template) => [
        template.day,
        template.equivalentForm,
        template.status,
      ]),
    ).toEqual([
      [30, true, "VERIFICADA"],
      [60, true, "VERIFICADA"],
      [90, true, "VERIFICADA"],
    ]);
    expect(valid.map((template) => template.itemIds)).toEqual(
      forms.map((form) => form.items.map((item) => item.id)),
    );
    const invalid = createRetentionTemplates({
      objectiveIds: [slot.objectiveId],
      proof: { blueprint, baseline, forms: [forms[0], forms[0], forms[2]] },
    });
    expect(invalid[1]).toMatchObject({
      status: "RASCUNHO",
      equivalentForm: false,
      itemIds: [],
    });
    expect(invalid[2]).toMatchObject({
      status: "RASCUNHO",
      equivalentForm: false,
      itemIds: [],
    });
    expect(
      createRetentionTemplates({ objectiveIds: [slot.objectiveId] }).every(
        (template) =>
          template.status === "RASCUNHO" && template.itemIds.length === 0,
      ),
    ).toBe(true);
    expect(
      createRetentionTemplates({
        objectiveIds: ["foreign-objective"],
        proof: { blueprint, baseline, forms },
      }).every((template) => template.equivalentForm === false),
    ).toBe(true);
  });
  it("uses 30/60/90 calendar days across leap-year and year boundaries", () => {
    expect(
      scheduleRetentionReviews("2028-01-31T23:59:59.000Z").map(
        (review) => review.dueAt,
      ),
    ).toEqual([
      "2028-03-01T23:59:59.000Z",
      "2028-03-31T23:59:59.000Z",
      "2028-04-30T23:59:59.000Z",
    ]);
    expect(
      scheduleRetentionReviews("2026-12-31T00:00:00.000Z").map(
        (review) => review.dueAt,
      ),
    ).toEqual([
      "2027-01-30T00:00:00.000Z",
      "2027-03-01T00:00:00.000Z",
      "2027-03-31T00:00:00.000Z",
    ]);
    expect(() => scheduleRetentionReviews("bad-date")).toThrow("valid date");
    expect(() =>
      scheduleRetentionReviews("+275760-09-13T00:00:00.000Z"),
    ).toThrow("supported calendar");
  });
  it("verifies a reviewed form using the authorized blueprint distribution and distinct literal content", () => {
    expect(verify()).toEqual({
      status: "VERIFICADA",
      equivalentForm: true,
      issues: [],
    });
  });
  it.each([
    "objectiveId",
    "cognitiveTag",
    "species",
    "complexity",
    "critical",
  ] as const)("rejects a different %s distribution", (key) => {
    const item = candidate.items[0];
    if (item === undefined) throw new Error("synthetic item missing");
    expect(
      verify({
        ...candidate,
        items: [{ ...item, [key]: key === "critical" ? false : "OTHER" }],
      }).equivalentForm,
    ).toBe(false);
  });
  it.each(["id", "prompt", "expectedResponse"] as const)(
    "rejects a repeated literal %s even with another form ID",
    (key) => {
      const original = baseline.items[0];
      const item = candidate.items[0];
      if (original === undefined || item === undefined)
        throw new Error("synthetic item missing");
      expect(
        verify({ ...candidate, items: [{ ...item, [key]: original[key] }] })
          .equivalentForm,
      ).toBe(false);
    },
  );
  it("rejects repetition against an earlier retention form and normalized wording", () => {
    expect(verify(candidate, blueprint, [candidate]).equivalentForm).toBe(
      false,
    );
    const item = candidate.items[0];
    if (item === undefined) throw new Error("synthetic item missing");
    expect(
      verify({
        ...candidate,
        items: [{ ...item, prompt: "  ENUNCIADO   SINTÉTICO baseline. " }],
      }).equivalentForm,
    ).toBe(false);
  });
  it("keeps missing review, correction, preflight, version or item evidence in draft", () => {
    for (const next of [
      { ...candidate, clinicalReview: "PENDENTE" as const },
      { ...candidate, correctionReview: "PENDENTE" as const },
      { ...candidate, syntheticPreflight: false },
      { ...candidate, version: 0 },
      { ...candidate, blueprintVersion: 2 },
      { ...candidate, items: [] },
      { ...candidate, items: [...candidate.items, ...candidate.items] },
    ])
      expect(verify(next)).toMatchObject({
        status: "RASCUNHO",
        equivalentForm: false,
      });
    expect(
      verify(candidate, { ...blueprint, clinicalReview: "PENDENTE" }),
    ).toMatchObject({ status: "RASCUNHO", equivalentForm: false });
  });
});
