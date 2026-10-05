import type { RetentionReviewResult } from "./module-evaluation-contracts.js";
import type { RetentionTemplate } from "./draft-contracts.js";

export const RETENTION_DAYS = Object.freeze([30, 60, 90] as const);

export type RetentionEquivalenceItem = Readonly<{
  id: string;
  objectiveId: string;
  cognitiveTag: string;
  critical: boolean;
  species: string;
  complexity: string;
  prompt: string;
  expectedResponse: string;
}>;

export type RetentionForm = Readonly<{
  formId: string;
  version: number;
  blueprintId: string;
  blueprintVersion: number;
  clinicalReview: "PENDENTE" | "APROVADO_CLINICAMENTE";
  correctionReview: "PENDENTE" | "VERIFICADO";
  syntheticPreflight: boolean;
  items: readonly RetentionEquivalenceItem[];
}>;

export type RetentionBlueprint = Readonly<{
  id: string;
  version: number;
  clinicalReview: "PENDENTE" | "APROVADO_CLINICAMENTE";
  slots: readonly Omit<
    RetentionEquivalenceItem,
    "id" | "prompt" | "expectedResponse"
  >[];
}>;

export function scheduleRetentionReviews(
  completedAt: string,
): readonly RetentionReviewResult[] {
  const startedAt = new Date(completedAt);
  if (!Number.isFinite(startedAt.getTime()))
    throw new Error("Retention origin must be a valid date");
  return Object.freeze(
    RETENTION_DAYS.map((day) => {
      const dueAt = new Date(startedAt);
      dueAt.setUTCDate(dueAt.getUTCDate() + day);
      if (!Number.isFinite(dueAt.getTime()))
        throw new Error("Retention date exceeds the supported calendar");
      return Object.freeze({
        day,
        dueAt: dueAt.toISOString(),
        status: "PENDENTE" as const,
      });
    }),
  );
}

export function verifyRetentionForm(
  input: Readonly<{
    blueprint: RetentionBlueprint;
    baseline: RetentionForm;
    previousForms: readonly RetentionForm[];
    candidate: RetentionForm;
  }>,
): Readonly<{
  status: "RASCUNHO" | "VERIFICADA";
  equivalentForm: boolean;
  issues: readonly string[];
}> {
  const { blueprint, baseline, candidate, previousForms } = input;
  const issues: string[] = [];
  const validVersion = (version: number) =>
    Number.isSafeInteger(version) && version >= 1;
  const normalize = (value: string) =>
    value
      .normalize("NFKC")
      .trim()
      .replace(/\s+/gu, " ")
      .toLocaleLowerCase("pt-BR");
  const signature = (item: RetentionBlueprint["slots"][number]) =>
    JSON.stringify([
      item.objectiveId,
      item.cognitiveTag,
      item.critical,
      item.species,
      item.complexity,
    ]);
  const distribution = (
    items: readonly RetentionBlueprint["slots"][number][],
  ) => items.map(signature).sort().join("\n");
  if (
    !validVersion(blueprint.version) ||
    blueprint.id.trim().length === 0 ||
    blueprint.clinicalReview !== "APROVADO_CLINICAMENTE" ||
    blueprint.slots.length === 0
  )
    issues.push("BLUEPRINT_NOT_AUTHORIZED");
  for (const form of [baseline, ...previousForms, candidate]) {
    if (
      !validVersion(form.version) ||
      form.formId.trim().length === 0 ||
      form.blueprintId !== blueprint.id ||
      form.blueprintVersion !== blueprint.version ||
      form.clinicalReview !== "APROVADO_CLINICAMENTE" ||
      form.correctionReview !== "VERIFICADO" ||
      !form.syntheticPreflight ||
      form.items.length === 0
    )
      issues.push("FORM_PROOF_MISSING");
    if (distribution(form.items) !== distribution(blueprint.slots))
      issues.push("BLUEPRINT_DISTRIBUTION_MISMATCH");
  }
  const seenIds = new Set<string>();
  const seenPrompts = new Set<string>();
  const seenResponses = new Set<string>();
  const seenForms = new Set<string>();
  for (const form of [baseline, ...previousForms, candidate]) {
    if (seenForms.has(form.formId)) issues.push("REPEATED_FORM");
    seenForms.add(form.formId);
    for (const item of form.items) {
      const prompt = normalize(item.prompt);
      const response = normalize(item.expectedResponse);
      if (
        item.id.trim().length === 0 ||
        prompt.length === 0 ||
        response.length === 0
      )
        issues.push("ITEM_PROOF_MISSING");
      if (
        seenIds.has(item.id) ||
        seenPrompts.has(prompt) ||
        seenResponses.has(response)
      )
        issues.push("LITERAL_REPETITION");
      seenIds.add(item.id);
      seenPrompts.add(prompt);
      seenResponses.add(response);
    }
  }
  const uniqueIssues = Object.freeze([...new Set(issues)]);
  return Object.freeze({
    status: uniqueIssues.length === 0 ? "VERIFICADA" : "RASCUNHO",
    equivalentForm: uniqueIssues.length === 0,
    issues: uniqueIssues,
  });
}

export function createRetentionTemplates(
  input: Readonly<{
    objectiveIds: readonly string[];
    proof?: Readonly<{
      blueprint: RetentionBlueprint;
      baseline: RetentionForm;
      forms: readonly [RetentionForm, RetentionForm, RetentionForm];
    }>;
  }>,
): readonly [RetentionTemplate, RetentionTemplate, RetentionTemplate] {
  const template = (
    day: RetentionTemplate["day"],
    index: 0 | 1 | 2,
  ): RetentionTemplate => {
    const proof = input.proof;
    const candidate = proof?.forms[index];
    const verification =
      proof === undefined || candidate === undefined
        ? undefined
        : verifyRetentionForm({
            blueprint: proof.blueprint,
            baseline: proof.baseline,
            previousForms: proof.forms.slice(0, index),
            candidate,
          });
    const expectedObjectives =
      proof === undefined
        ? []
        : [
            ...new Set(proof.blueprint.slots.map((slot) => slot.objectiveId)),
          ].sort();
    const verified =
      verification?.equivalentForm === true &&
      JSON.stringify([...new Set(input.objectiveIds)].sort()) ===
        JSON.stringify(expectedObjectives);
    return Object.freeze({
      day,
      objectiveIds: Object.freeze([...input.objectiveIds]),
      itemIds: Object.freeze(
        verified && candidate !== undefined
          ? candidate.items.map((item) => item.id)
          : [],
      ),
      equivalentForm: verified,
      status: verified ? "VERIFICADA" : "RASCUNHO",
    });
  };
  return Object.freeze([
    template(30, 0),
    template(60, 1),
    template(90, 2),
  ] as const);
}
