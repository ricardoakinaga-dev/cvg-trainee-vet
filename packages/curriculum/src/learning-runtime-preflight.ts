import type {
  CurriculumDraftPack,
  DraftPreflightReport,
} from "./learning-runtime-types.js";
import { freeze } from "./learning-runtime-types.js";
import {
  b07DiagnosticDraftPack,
  curriculumDraftPacks,
} from "./learning-runtime-content.js";
import { createCurriculumDraftPreflightMethods } from "./learning-runtime-preflight-checks.js";
import { b07Blueprint } from "./catalog.js";

export const curriculumDraftCounts = freeze(
  curriculumDraftPacks.map((pack) => ({
    moduleId: pack.moduleId,
    itemCount: pack.items.length,
    questionCount: pack.items.filter((item) => item.responseMode !== "TEXT")
      .length,
    openResponseCount: pack.items.filter((item) => item.responseMode === "TEXT")
      .length,
    b07BlueprintItemCount:
      pack.moduleId === "M01" ? b07Blueprint.items.length : 0,
  })),
);

export function preflightCurriculumDrafts(
  packs: readonly CurriculumDraftPack[] = curriculumDraftPacks,
): DraftPreflightReport {
  const methods = createCurriculumDraftPreflightMethods();
  const modules = freeze(packs.map(methods.buildModulePreflight));
  const diagnostic = methods.buildDiagnosticPreflight(b07DiagnosticDraftPack);
  return freeze({
    version: "1.0.0",
    modules,
    diagnostic,
    allTechnicalChecksPassed:
      modules.every((module) => module.technicalChecksPassed) &&
      diagnostic.technicalChecksPassed,
    clinicalApprovalPending: true,
    readyForPublication: false,
  });
}
