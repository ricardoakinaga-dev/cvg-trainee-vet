import { describe, expect, it } from "vitest";

import {
  b07DiagnosticDraftPack,
  buildPersonalizedCurriculumPath,
  curriculumDraftPacks,
  evaluateDiagnosticAttempt,
  evaluateModuleAttempt,
  getModuleDraftPack,
  preflightCurriculumDrafts,
  type ModuleAnswer,
} from "./learning-runtime.js";
import {
  createCurriculumContentSeed,
  createDiagnosticContentSeed,
} from "./content-seed.js";
import { curriculumV3 } from "./catalog.js";
import {
  toParticipantActivityFromDiagnosticDraft,
  toParticipantActivityFromDraft,
} from "./projection.js";

describe("curriculum learning runtime", () => {
  it("materializes a complete internal draft pack for all 24 modules", () => {
    expect(curriculumDraftPacks).toHaveLength(24);
    expect(
      curriculumDraftPacks.every(
        (pack) =>
          pack.status === "RASCUNHO" || pack.status === "PROJECAO_VERIFICADA",
      ),
    ).toBe(true);
    expect(
      curriculumDraftPacks.every(
        (pack) =>
          pack.publicationAuthorized === false &&
          pack.clinicalReview === "PENDENTE" &&
          pack.items.length >= 31 &&
          pack.items.every(
            (item) =>
              item.prompt.length > 10 &&
              item.feedback.length > 10 &&
              item.sourceRefs.length > 0 &&
              item.remediationTargetObjectiveId.length > 0,
          ),
      ),
    ).toBe(true);
    expect(
      curriculumDraftPacks.every(
        (pack) =>
          pack.learningLoop.retention.length === 3 &&
          pack.learningLoop.retention.map((item) => item.day).join(",") ===
            "7,30,90" &&
          pack.learningLoop.simulation.practicalCompetenceClaim ===
            "PROIBIDO_MVP",
      ),
    ).toBe(true);
  });

  it("keeps M02 authored questions while giving the other modules versioned drafts", () => {
    const m02 = getModuleDraftPack("M02");
    const m03 = getModuleDraftPack("M03");

    expect(m02.items).toHaveLength(33);
    expect(m02.items.find((item) => item.id === "M02-S1-Q01")).toMatchObject({
      title: "Função da triagem",
      responseMode: "CHOICE",
    });
    expect(m03.items).toHaveLength(33);
    expect(m03.items.some((item) => item.responseMode === "TEXT")).toBe(true);
    expect(m03.items.some((item) => item.kind === "SIMULACAO_DIGITAL")).toBe(
      true,
    );
  });

  it("creates remediation for a critical error and only the affected objectives", () => {
    const pack = getModuleDraftPack("M02");
    const firstChoice = pack.items.find(
      (item) => item.responseMode === "CHOICE" && item.critical,
    );
    if (firstChoice === undefined) throw new Error("choice item is required");
    const wrongChoice = firstChoice.choices?.find(
      (choice) => !firstChoice.correctChoiceIds?.includes(choice.id),
    );
    if (wrongChoice === undefined) throw new Error("wrong choice is required");

    const answers: readonly ModuleAnswer[] = pack.items
      .filter((item) => item.responseMode === "CHOICE")
      .map((item) => ({
        itemId: item.id,
        selectedChoiceIds:
          item.id === firstChoice.id
            ? [wrongChoice.id]
            : (item.correctChoiceIds ?? []),
      }));
    const result = evaluateModuleAttempt({
      moduleId: "M02",
      answers,
      completedAt: "2026-08-10T12:00:00.000Z",
      mode: "FORMATIVE_CHOICE",
    });

    expect(result.status).toBe("EM_REMEDIACAO");
    expect(result.nextAction).toBe("EXECUTAR_REMEDIACAO");
    expect(result.remediationObjectiveIds).toContain(
      firstChoice.remediationTargetObjectiveId,
    );
    expect(result.practicalCompetenceClaim).toBe("PROIBIDO_MVP");
    expect(result.criticalErrorItemIds).toContain(firstChoice.id);
  });

  it("schedules D+7, D+30 and D+90 after digital mastery", () => {
    const pack = getModuleDraftPack("M03");
    const answers: readonly ModuleAnswer[] = pack.items
      .filter((item) => item.responseMode === "CHOICE")
      .map((item) => ({
        itemId: item.id,
        selectedChoiceIds: item.correctChoiceIds ?? [],
      }));

    const result = evaluateModuleAttempt({
      moduleId: "M03",
      answers,
      completedAt: "2026-08-10T12:00:00.000Z",
      mode: "FORMATIVE_CHOICE",
    });

    expect(result.status).toBe("DOMINIO_DIGITAL");
    expect(result.nextAction).toBe("REVISAR_RETENCAO");
    expect(result.retentionReviews).toEqual([
      { day: 7, dueAt: "2026-08-17T12:00:00.000Z", status: "PENDENTE" },
      { day: 30, dueAt: "2026-09-09T12:00:00.000Z", status: "PENDENTE" },
      { day: 90, dueAt: "2026-11-08T12:00:00.000Z", status: "PENDENTE" },
    ]);
    expect(result.objectiveResults.every((item) => item.percent === 100)).toBe(
      true,
    );
  });

  it("does not invent an automatic score when an open response awaits human review", () => {
    const pack = getModuleDraftPack("M03");
    const answers: readonly ModuleAnswer[] = pack.items.map((item) =>
      item.responseMode === "CHOICE"
        ? {
            itemId: item.id,
            selectedChoiceIds: item.correctChoiceIds ?? [],
          }
        : { itemId: item.id, text: "Plano fictício aguardando correção." },
    );

    const result = evaluateModuleAttempt({
      moduleId: "M03",
      answers,
      completedAt: "2026-08-10T12:00:00.000Z",
      mode: "MODULE_COMPLETION",
    });

    expect(result.status).toBe("AGUARDA_CORRECAO_HUMANA");
    expect(result.nextAction).toBe("AGUARDAR_CORRECAO_HUMANA");
    expect(result.scorePercent).toBeUndefined();
    expect(result.openResponseItemIds.length).toBeGreaterThan(0);
  });

  it("blocks the next module until the prerequisite has digital mastery", () => {
    const path = buildPersonalizedCurriculumPath({
      masteredModuleIds: ["M01"],
      remediationModuleIds: [],
      retentionDueModuleIds: [],
      assignedModuleIds: ["M01", "M02", "M03"],
    });

    expect(path.find((item) => item.moduleId === "M02")).toMatchObject({
      status: "DISPONIVEL",
      nextAction: "INICIAR_BASELINE",
    });
    expect(path.find((item) => item.moduleId === "M03")).toMatchObject({
      status: "BLOQUEADO_PRE_REQUISITO",
      nextAction: "CONCLUIR_PRE_REQUISITO",
    });
  });

  it("marks unassigned, in-progress, remediation, and retention modules explicitly", () => {
    const path = buildPersonalizedCurriculumPath({
      masteredModuleIds: ["M01", "M02"],
      remediationModuleIds: ["M04"],
      retentionDueModuleIds: ["M01"],
      inProgressModuleIds: ["M03"],
      assignedModuleIds: ["M01", "M02", "M03", "M04"],
    });

    expect(path.find((item) => item.moduleId === "M01")).toMatchObject({
      status: "RETENCAO_PENDENTE",
      nextAction: "EXECUTAR_RETENCAO",
    });
    expect(path.find((item) => item.moduleId === "M04")).toMatchObject({
      status: "EM_REMEDIACAO",
      nextAction: "EXECUTAR_REMEDIACAO",
    });
    expect(path.find((item) => item.moduleId === "M03")).toMatchObject({
      status: "EM_ANDAMENTO",
      nextAction: "RETOMAR_MODULO",
    });
    expect(path.find((item) => item.moduleId === "M24")).toMatchObject({
      status: "NAO_ATRIBUIDO",
      nextAction: "AGUARDAR_ATRIBUICAO",
    });
  });

  it("projects every draft safely and seeds it as non-published content", () => {
    const scopeId = "44444444-4444-4444-8444-444444444444";
    const projections = curriculumDraftPacks.map((pack) =>
      toParticipantActivityFromDraft(pack),
    );
    const seeds = curriculumV3.modules.map((module) =>
      createCurriculumContentSeed(scopeId, module.id),
    );
    const allContentIds = seeds.flatMap((seed) =>
      seed.contentVersions.map((content) => content.contentId),
    );

    expect(projections).toHaveLength(24);
    expect(projections.every((activity) => activity.items.length >= 31)).toBe(
      true,
    );
    expect(new Set(allContentIds).size).toBe(allContentIds.length);
    expect(
      seeds.every(
        (seed) =>
          seed.contentVersions.every(
            (content) => content.status === "RASCUNHO",
          ) &&
          seed.contentVersions.every(
            (content) =>
              !Object.prototype.hasOwnProperty.call(
                content,
                "correctChoiceIds",
              ),
          ),
      ),
    ).toBe(true);
    expect(
      projections.every(
        (activity) =>
          !/source|chapter|page|answer|rubric|critical|pdf/iu.test(
            JSON.stringify(activity),
          ),
      ),
    ).toBe(true);
  });

  it("materializes the 120-item B-07 diagnostic by three 40-item themes", () => {
    expect(b07DiagnosticDraftPack.items).toHaveLength(120);
    expect(
      ["B07-S1", "B07-S2", "B07-S3"].map(
        (sessionId) =>
          b07DiagnosticDraftPack.items.filter(
            (item) => item.diagnosticSessionId === sessionId,
          ).length,
      ),
    ).toEqual([40, 40, 40]);
    expect(
      b07DiagnosticDraftPack.items.filter((item) => item.critical),
    ).toHaveLength(24);
    const projection = toParticipantActivityFromDiagnosticDraft(
      b07DiagnosticDraftPack,
    );
    const seed = createDiagnosticContentSeed(
      "44444444-4444-4444-8444-444444444444",
    );
    expect(projection.items).toHaveLength(120);
    expect(seed.activity.status).toBe("RASCUNHO");
    expect(
      seed.contentVersions.every((item) => item.status === "RASCUNHO"),
    ).toBe(true);
    expect(JSON.stringify(projection)).not.toMatch(
      /source|answer|rubric|critical|blueprint|pdf/iu,
    );
  });

  it("returns a non-punitive diagnostic profile by theme and recommended modules", () => {
    const answers: readonly ModuleAnswer[] = b07DiagnosticDraftPack.items.map(
      (item) => ({
        itemId: item.id,
        selectedChoiceIds: item.correctChoiceIds ?? [],
      }),
    );
    const result = evaluateDiagnosticAttempt({ answers });

    expect(result.diagnosticId).toBe("B07-DIAGNOSTIC-V1");
    expect(result.notPunitive).toBe(true);
    expect(result.noGlobalPassFail).toBe(true);
    expect(result.themeResults).toHaveLength(3);
    expect(result.themeResults.every((theme) => theme.percent === 100)).toBe(
      true,
    );
    expect(result.recommendedModuleIds).toContain("M02");
    expect(result.globalScorePercent).toBeUndefined();
  });

  it("passes the technical preflight while keeping clinical publication gated", () => {
    const report = preflightCurriculumDrafts();

    expect(report.modules).toHaveLength(24);
    expect(report.diagnostic).toMatchObject({
      diagnosticId: "B07-DIAGNOSTIC-V1",
      itemCount: 120,
      itemsBySession: [40, 40, 40],
      technicalChecksPassed: true,
    });
    expect(report.allTechnicalChecksPassed).toBe(true);
    expect(report.clinicalApprovalPending).toBe(true);
    expect(report.readyForPublication).toBe(false);
    expect(
      report.modules.every(
        (module) =>
          module.checks.blueprintCount &&
          module.checks.requiredFields &&
          module.checks.correctionMetadata &&
          module.checks.publicBoundary &&
          module.checks.publicationBlocked,
      ),
    ).toBe(true);
  });

  it("rejects unknown modules and duplicate or unknown answer items", () => {
    expect(() => getModuleDraftPack("M99")).toThrow(
      "curriculum module draft was not found",
    );
    const item = getModuleDraftPack("M03").items.find(
      (candidate) => candidate.responseMode === "CHOICE",
    );
    if (item === undefined) throw new Error("choice item is required");
    const answer = {
      itemId: item.id,
      selectedChoiceIds: item.correctChoiceIds ?? [],
    } as const;
    expect(() =>
      evaluateModuleAttempt({
        moduleId: "M03",
        answers: [answer, answer],
        completedAt: "2026-08-10T12:00:00.000Z",
        mode: "FORMATIVE_CHOICE",
      }),
    ).toThrow("duplicate answers");
    expect(() =>
      evaluateModuleAttempt({
        moduleId: "M03",
        answers: [{ itemId: "unknown-item", selectedChoiceIds: ["a"] }],
        completedAt: "2026-08-10T12:00:00.000Z",
        mode: "FORMATIVE_CHOICE",
      }),
    ).toThrow("unknown curriculum item");
    expect(() =>
      evaluateModuleAttempt({
        moduleId: "M03",
        answers: [{ itemId: item.id, selectedChoiceIds: ["<script>"] }],
        completedAt: "2026-08-10T12:00:00.000Z",
        mode: "FORMATIVE_CHOICE",
      }),
    ).toThrow("unknown choice");
    const openItem = getModuleDraftPack("M03").items.find(
      (candidate) => candidate.responseMode === "TEXT",
    );
    if (openItem === undefined) throw new Error("open item is required");
    expect(() =>
      evaluateModuleAttempt({
        moduleId: "M03",
        answers: [{ itemId: openItem.id, text: "<b>unsafe</b>" }],
        completedAt: "2026-08-10T12:00:00.000Z",
      }),
    ).toThrow("plain text");
  });
});
