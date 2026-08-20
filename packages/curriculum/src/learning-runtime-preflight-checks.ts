import { b07Blueprint, moduleAssessmentBlueprints } from "./catalog.js";
import {
  toParticipantActivityFromDiagnosticDraft,
  toParticipantActivityFromDraft,
} from "./projection.js";
import { validateClinicalSourceRefs } from "./source-registry.js";
import type {
  CurriculumDraftItem,
  CurriculumDraftPack,
  DiagnosticDraftPack,
  DraftPreflightDiagnosticResult,
  DraftPreflightModuleResult,
} from "./learning-runtime-types.js";
import { freeze } from "./learning-runtime-types.js";

function publicBoundaryIsClean(pack: CurriculumDraftPack): boolean {
  const projection = toParticipantActivityFromDraft(pack);
  const serialized = JSON.stringify(projection);
  return (
    !/source|chapter|page|answer|rubric|critical|pdf/iu.test(serialized) &&
    projection.items.every((item) => {
      if (item.responseMode === "TEXT") {
        return item.choices === undefined && item.selectionMode === undefined;
      }
      if (item.responseMode === "CHOICE") {
        return item.choices !== undefined && item.selectionMode !== undefined;
      }
      return (
        item.choices === undefined &&
        item.selectionMode === undefined &&
        item.interaction?.kind === item.responseMode
      );
    })
  );
}

function equivalentRetentionFormsAreValid(pack: CurriculumDraftPack): boolean {
  const forms = pack.learningLoop.retention;
  const blueprintIds = new Set(forms.map((form) => form.blueprintId));
  const formIds = new Set(forms.map((form) => form.formId));
  const itemIds = forms.flatMap((form) => form.itemIds);
  return (
    forms.map((form) => form.day).join(",") === "30,60,90" &&
    blueprintIds.size === 1 &&
    formIds.size === forms.length &&
    new Set(itemIds).size === itemIds.length &&
    forms.every(
      (form) =>
        form.equivalentForm &&
        form.objectiveIds.length > 0 &&
        form.itemIds.length > 0,
    )
  );
}

function publicDiagnosticBoundaryIsClean(pack: DiagnosticDraftPack): boolean {
  const projection = toParticipantActivityFromDiagnosticDraft(pack);
  const serialized = JSON.stringify(projection);
  return (
    !/source|chapter|page|answer|rubric|critical|blueprint|pdf/iu.test(
      serialized,
    ) &&
    projection.items.length === 120 &&
    projection.items.every(
      (item) =>
        item.responseMode === "CHOICE" &&
        item.choices !== undefined &&
        item.selectionMode !== undefined,
    )
  );
}

function hasRequiredFields(item: CurriculumDraftItem, moduleId: string) {
  return (
    item.moduleId === moduleId &&
    item.sessionId.length > 0 &&
    item.objectiveId.length > 0 &&
    item.prompt.trim().length > 0 &&
    item.feedback.trim().length > 0 &&
    !/<[^>]*>/u.test(item.prompt) &&
    !/<[^>]*>/u.test(item.feedback) &&
    validateClinicalSourceRefs(item.sourceRefs).valid &&
    item.remediationTargetObjectiveId.length > 0
  );
}

function hasChoiceCorrectionMetadata(item: CurriculumDraftItem): boolean {
  return (
    item.choices !== undefined &&
    item.choices.length >= 2 &&
    item.correctChoiceIds !== undefined &&
    item.correctChoiceIds.length > 0 &&
    item.correctChoiceIds.every((id) =>
      item.choices?.some((choice) => choice.id === id),
    )
  );
}

function hasCorrectionMetadata(item: CurriculumDraftItem): boolean {
  if (item.responseMode === "CHOICE") {
    return hasChoiceCorrectionMetadata(item);
  }
  if (item.responseMode === "TEXT") {
    return (
      item.rubric !== undefined &&
      item.rubric.passScore > 0 &&
      item.humanCorrectionOwner === "RICARDO"
    );
  }
  return item.interaction?.kind === item.responseMode;
}

function moduleChecks(pack: CurriculumDraftPack) {
  const blueprint = moduleAssessmentBlueprints.find(
    (item) => item.moduleId === pack.moduleId,
  );
  const questionCount = pack.items.filter(
    (item) => item.responseMode !== "TEXT",
  ).length;
  const openResponseCount = pack.items.filter(
    (item) => item.responseMode === "TEXT",
  ).length;
  return freeze({
    questionCount,
    openResponseCount,
    checks: freeze({
      blueprintCount:
        blueprint !== undefined &&
        blueprint.questionTotal === questionCount &&
        blueprint.openResponseCount === openResponseCount,
      requiredFields: pack.items.every((item) =>
        hasRequiredFields(item, pack.moduleId),
      ),
      correctionMetadata: pack.items.every(hasCorrectionMetadata),
      equivalentRetentionForms: equivalentRetentionFormsAreValid(pack),
      publicBoundary: publicBoundaryIsClean(pack),
      publicationBlocked:
        !pack.publicationAuthorized ||
        !pack.publicProjectionReady ||
        pack.sourceVerification !== "VERIFICADO_AUTOMATICAMENTE",
    }),
  });
}

function buildModulePreflight(
  pack: CurriculumDraftPack,
): DraftPreflightModuleResult {
  const result = moduleChecks(pack);
  const { checks } = result;
  return freeze({
    moduleId: pack.moduleId,
    technicalChecksPassed:
      checks.blueprintCount &&
      checks.requiredFields &&
      checks.correctionMetadata &&
      checks.equivalentRetentionForms &&
      checks.publicBoundary,
    questionCount: result.questionCount,
    openResponseCount: result.openResponseCount,
    checks,
  });
}

function diagnosticChecks(pack: DiagnosticDraftPack) {
  const items = pack.items;
  return freeze({
    blueprintCount:
      items.length === b07Blueprint.items.length &&
      items.every((item, index) => item.id === b07Blueprint.items[index]?.id),
    requiredFields: items.every((item) => hasRequiredFields(item, "M01")),
    correctionMetadata: items.every(hasChoiceCorrectionMetadata),
    publicBoundary: publicDiagnosticBoundaryIsClean(pack),
    publicationBlocked:
      !pack.publicationAuthorized ||
      !pack.publicProjectionReady ||
      pack.sourceVerification !== "VERIFICADO_AUTOMATICAMENTE",
  });
}

function buildDiagnosticPreflight(
  pack: DiagnosticDraftPack,
): DraftPreflightDiagnosticResult {
  const itemsBySession = ["B07-S1", "B07-S2", "B07-S3"].map(
    (sessionId) =>
      pack.items.filter((item) => item.diagnosticSessionId === sessionId)
        .length,
  ) as [number, number, number];
  const checks = diagnosticChecks(pack);
  return freeze({
    diagnosticId: pack.diagnosticId,
    technicalChecksPassed:
      checks.blueprintCount &&
      checks.requiredFields &&
      checks.correctionMetadata &&
      checks.publicBoundary,
    itemCount: pack.items.length,
    itemsBySession,
    checks,
  });
}

export function createCurriculumDraftPreflightMethods() {
  return freeze({
    buildDiagnosticPreflight,
    buildModulePreflight,
  });
}
