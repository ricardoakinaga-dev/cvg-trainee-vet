import { describe, expect, it } from "vitest";

import {
  evaluateAndPersistCurriculumModule,
  getParticipantCurriculumRuntime,
  type CurriculumRuntimeState,
  type CurriculumRuntimeWritePort,
  type CurriculumEvaluationAttempt,
} from "./curriculum-runtime-use-cases.js";
import {
  evaluateModuleAttempt,
  getModuleDraftPack,
  type ModuleAnswer,
} from "@cvg/curriculum";

const participantId = "11111111-1111-4111-8111-111111111111";
const scopeId = "22222222-2222-4222-8222-222222222222";
const attemptId = "33333333-3333-4333-8333-333333333333";
const command = {
  participantId,
  scopeId,
  moduleId: "M03",
  attemptId,
  attemptVersion: 3,
  formVersion: 1,
};

function snapshot(
  moduleId = "M03",
  mode: CurriculumEvaluationAttempt["mode"] = "FORMATIVE_CHOICE",
): CurriculumEvaluationAttempt {
  const pack = getModuleDraftPack(moduleId);
  const contentVersions = pack.items.map((item, index) => ({
    itemId: item.id,
    contentVersionId: `synthetic-content-${index}`,
    version: 1,
    sourceRefs: item.sourceRefs,
  }));
  return {
    attemptId,
    participantId,
    scopeId,
    moduleId,
    attemptVersion: 3,
    status: "SUBMETIDA",
    submittedAt: "2026-08-10T01:00:00.000Z",
    mode,
    form: {
      formId: "synthetic-form",
      version: 1,
      blueprintId: "synthetic-approved-blueprint",
      status: "PUBLICADO",
      catalog: { moduleId, items: pack.items },
      contentVersions,
      publication: {
        decisionId: "synthetic-publication-decision",
        publishedAt: "2026-08-09T01:00:00.000Z",
      },
      blueprint: {
        version: 1,
        approvalDecisionId: "synthetic-blueprint-approval",
        moduleId,
        questionTotal: pack.items.filter(
          (item) => item.responseMode === "CHOICE",
        ).length,
        openResponseCount: pack.items.filter(
          (item) => item.responseMode === "TEXT",
        ).length,
        objectiveIds: [...new Set(pack.items.map((item) => item.objectiveId))],
        itemManifest: pack.items.map((item) => ({
          itemId: item.id,
          objectiveId: item.objectiveId,
          responseMode: item.responseMode,
          critical: item.critical,
          sessionId: item.sessionId,
        })),
      },
    },
    answers: pack.items
      .filter(
        (item) =>
          mode === "MODULE_COMPLETION" || item.responseMode === "CHOICE",
      )
      .map((item) => ({
        attemptId,
        contentVersionId: contentVersions.find(
          (binding) => binding.itemId === item.id,
        )!.contentVersionId,
        answer:
          item.responseMode === "CHOICE"
            ? {
                itemId: item.id,
                selectedChoiceIds: item.correctChoiceIds ?? [],
              }
            : {
                itemId: item.id,
                text: "Resposta sintética aguardando correção humana.",
              },
      })),
  };
}

function allChoiceAnswers(moduleId: string): readonly ModuleAnswer[] {
  return getModuleDraftPack(moduleId)
    .items.filter((item) => item.responseMode === "CHOICE")
    .map((item) => ({
      itemId: item.id,
      selectedChoiceIds: item.correctChoiceIds ?? [],
    }));
}

describe("curriculum runtime application integration", () => {
  it("uses an explicitly provided native reader capability on the repository and validates optimistic versions", async () => {
    const repository = {
      findEvaluationAttempt: async () => snapshot(),
      saveCurriculumRuntime: async (
        input: Parameters<
          CurriculumRuntimeWritePort["saveCurriculumRuntime"]
        >[0],
      ) => ({ ...input, version: 1, updatedAt: "2026-08-10T01:00:00.000Z" }),
    };
    expect(
      (await evaluateAndPersistCurriculumModule(command, repository)).evaluation
        .evaluationAnchor?.attemptId,
    ).toBe(attemptId);
    for (const delta of [
      { attemptVersion: -1 },
      { attemptVersion: 1.5 },
      { formVersion: 0 },
      { formVersion: 1.5 },
    ]) {
      await expect(
        evaluateAndPersistCurriculumModule(
          { ...command, ...delta },
          repository,
        ),
      ).rejects.toMatchObject({ code: "validation_error" });
    }
  });
  it("grades the frozen published version when the current draft has a different answer key", async () => {
    const submitted = snapshot();
    const currentDraft = getModuleDraftPack("M03");
    const catalog = {
      moduleId: currentDraft.moduleId,
      items: currentDraft.items.map((item) => {
        if (item.responseMode === "TEXT") return item;
        const choice = item.choices?.find(
          (candidate) => !item.correctChoiceIds?.includes(candidate.id),
        );
        if (choice === undefined)
          throw new Error("synthetic alternative key required");
        return { ...item, correctChoiceIds: [choice.id] };
      }),
    };
    const frozen: CurriculumEvaluationAttempt = {
      ...submitted,
      form: { ...submitted.form, catalog },
      answers: submitted.answers.map((entry) => {
        const item = catalog.items.find(
          (item) => item.id === entry.answer.itemId,
        );
        if (item === undefined)
          throw new Error("synthetic catalog item missing");
        return {
          ...entry,
          answer: {
            ...entry.answer,
            selectedChoiceIds: item.correctChoiceIds ?? [],
          },
        };
      }),
    };
    expect(
      evaluateModuleAttempt({
        moduleId: "M03",
        catalog: currentDraft,
        answers: frozen.answers.map((entry) => entry.answer),
        completedAt: frozen.submittedAt,
        mode: "FORMATIVE_CHOICE",
      }).scorePercent,
    ).toBeLessThan(100);
    const state = await evaluateAndPersistCurriculumModule(
      command,
      {
        saveCurriculumRuntime: async (input) => ({
          ...input,
          version: 1,
          updatedAt: frozen.submittedAt,
        }),
      },
      { findEvaluationAttempt: async () => frozen },
    );
    expect(state.evaluation.scorePercent).toBe(100);
    expect(state.evaluation.evaluationAnchor?.contentVersions).toEqual(
      frozen.form.contentVersions,
    );
    const read = await getParticipantCurriculumRuntime(
      { participantId, moduleId: "M03" },
      { findCurriculumRuntime: async () => state },
    );
    expect(read.evaluation.evaluationAnchor).toEqual(
      state.evaluation.evaluationAnchor,
    );
    expect(
      Object.isFrozen(
        read.evaluation.evaluationAnchor?.contentVersions[0]?.sourceRefs[0],
      ),
    ).toBe(true);
  });
  it.each([
    "scope",
    "participant",
    "module",
    "attempt",
    "attemptVersion",
    "formVersion",
    "answerAttempt",
    "answerVersion",
    "missingSource",
    "draft",
    "unsubmitted",
    "missingBinding",
    "partialCatalog",
    "publicationProof",
    "blueprintApproval",
    "manifest",
    "missingFrozenKey",
    "invalidSourceCode",
    "publicationAfterSubmit",
  ])("rejects %s mismatch before saving", async (mismatch) => {
    const frozen = snapshot();
    let writes = 0;
    if (mismatch === "scope")
      Object.defineProperty(frozen, "scopeId", { value: "foreign" });
    if (mismatch === "participant")
      Object.defineProperty(frozen, "participantId", { value: "foreign" });
    if (mismatch === "module")
      Object.defineProperty(frozen, "moduleId", { value: "M02" });
    if (mismatch === "attempt")
      Object.defineProperty(frozen, "attemptId", { value: "foreign" });
    if (mismatch === "attemptVersion")
      Object.defineProperty(frozen, "attemptVersion", { value: 4 });
    if (mismatch === "formVersion")
      Object.defineProperty(frozen.form, "version", { value: 2 });
    if (mismatch === "answerAttempt")
      Object.defineProperty(frozen.answers[0], "attemptId", {
        value: "foreign",
      });
    if (mismatch === "answerVersion")
      Object.defineProperty(frozen.answers[0], "contentVersionId", {
        value: "foreign",
      });
    if (mismatch === "missingSource")
      Object.defineProperty(frozen.form.contentVersions[0], "sourceRefs", {
        value: [],
      });
    if (mismatch === "draft")
      Object.defineProperty(frozen.form, "status", { value: "RASCUNHO" });
    if (mismatch === "unsubmitted")
      Object.defineProperty(frozen, "status", { value: "EM_ANDAMENTO" });
    if (mismatch === "missingBinding")
      Object.defineProperty(frozen.form, "contentVersions", { value: [] });
    if (mismatch === "partialCatalog") {
      Object.defineProperty(frozen.form, "catalog", {
        value: {
          ...frozen.form.catalog,
          items: frozen.form.catalog.items.slice(0, 1),
        },
      });
      Object.defineProperty(frozen.form, "contentVersions", {
        value: frozen.form.contentVersions.slice(0, 1),
      });
      Object.defineProperty(frozen, "answers", {
        value: frozen.answers.slice(0, 1),
      });
    }
    if (mismatch === "publicationProof")
      Object.defineProperty(frozen.form, "publication", { value: undefined });
    if (mismatch === "blueprintApproval")
      Object.defineProperty(frozen.form.blueprint, "approvalDecisionId", {
        value: "",
      });
    if (mismatch === "manifest")
      Object.defineProperty(frozen.form.blueprint, "itemManifest", {
        value: [],
      });
    if (mismatch === "missingFrozenKey")
      Object.defineProperty(frozen.form, "catalog", {
        value: {
          ...frozen.form.catalog,
          items: frozen.form.catalog.items.map((item) => ({
            ...item,
            correctChoiceIds: [],
          })),
        },
      });
    if (mismatch === "invalidSourceCode") {
      const refs = [
        {
          code: "unapproved",
          locator: "synthetic-source",
          updateRequired: false,
        },
      ];
      Object.defineProperty(frozen.form.contentVersions[0], "sourceRefs", {
        value: refs,
      });
      Object.defineProperty(frozen.form, "catalog", {
        value: {
          ...frozen.form.catalog,
          items: frozen.form.catalog.items.map((item, index) =>
            index === 0 ? { ...item, sourceRefs: refs } : item,
          ),
        },
      });
    }
    if (mismatch === "publicationAfterSubmit")
      Object.defineProperty(frozen.form.publication, "publishedAt", {
        value: "2026-08-11T01:00:00.000Z",
      });
    await expect(
      evaluateAndPersistCurriculumModule(
        command,
        {
          saveCurriculumRuntime: async () => {
            writes += 1;
            throw new Error("must not save");
          },
        },
        { findEvaluationAttempt: async () => frozen },
      ),
    ).rejects.toMatchObject({
      code: ["scope", "participant", "module", "attempt"].includes(mismatch)
        ? "forbidden"
        : "state_conflict",
    });
    expect(writes).toBe(0);
  });
  it("fails closed when native binding cannot be read", async () => {
    await expect(
      evaluateAndPersistCurriculumModule(
        command,
        {
          saveCurriculumRuntime: async () => {
            throw new Error("must not save");
          },
        },
        { findEvaluationAttempt: async () => null },
      ),
    ).rejects.toMatchObject({ code: "state_conflict" });
  });
  it("refuses loose answers without a persisted submitted attempt and does not save", async () => {
    let writes = 0;
    const legacyCommand = {
      ...command,
      moduleId: "M02",
      answers: allChoiceAnswers("M02"),
      completedAt: "2026-08-10T01:00:00.000Z",
      mode: "FORMATIVE_CHOICE",
    };
    await expect(
      evaluateAndPersistCurriculumModule(legacyCommand, {
        saveCurriculumRuntime: async () => {
          writes += 1;
          throw new Error("must not save");
        },
      }),
    ).rejects.toMatchObject({ code: "state_conflict" });
    expect(writes).toBe(0);
  });
  it("evaluates a module and persists the server-side learning state", async () => {
    let stored: CurriculumRuntimeState | null = null;
    const repository: CurriculumRuntimeWritePort = {
      saveCurriculumRuntime: async (input) => {
        stored = Object.freeze({
          participantId: input.participantId,
          scopeId: input.scopeId,
          version: 1,
          updatedAt: "2026-08-10T01:00:00.000Z",
          evaluation: input.evaluation,
        });
        return stored;
      },
    };

    const state = await evaluateAndPersistCurriculumModule(
      command,
      repository,
      { findEvaluationAttempt: async () => snapshot() },
    );

    expect(state).toMatchObject({
      participantId,
      scopeId,
      version: 1,
      evaluation: {
        moduleId: "M03",
        status: "DOMINIO_DIGITAL",
        nextAction: "REVISAR_RETENCAO",
        practicalCompetenceClaim: "PROIBIDO_MVP",
      },
    });
    expect(stored).not.toBeNull();
    expect(state.evaluation.scorePercent).toBe(100);
    expect(state.evaluation.evaluationAnchor).toMatchObject({
      attemptId,
      attemptVersion: 3,
      formVersion: 1,
    });
  });

  it("keeps open responses pending human correction when integrated", async () => {
    const repository: CurriculumRuntimeWritePort = {
      saveCurriculumRuntime: async (input) =>
        Object.freeze({
          participantId: input.participantId,
          scopeId: input.scopeId,
          version: 1,
          updatedAt: "2026-08-10T01:00:00.000Z",
          evaluation: input.evaluation,
        }),
    };
    const state = await evaluateAndPersistCurriculumModule(
      command,
      repository,
      {
        findEvaluationAttempt: async () => snapshot("M03", "MODULE_COMPLETION"),
      },
    );

    expect(state.evaluation.status).toBe("AGUARDA_CORRECAO_HUMANA");
    expect(state.evaluation.scorePercent).toBeUndefined();
  });

  it("reads a participant state without exposing another participant's state", async () => {
    const state: CurriculumRuntimeState = {
      participantId,
      scopeId,
      version: 2,
      updatedAt: "2026-08-10T01:00:00.000Z",
      evaluation: {
        moduleId: "M03",
        status: "DOMINIO_DIGITAL",
        nextAction: "REVISAR_RETENCAO",
        objectiveResults: [],
        remediationObjectiveIds: [],
        criticalErrorItemIds: [],
        invalidAnswerItemIds: [],
        unansweredChoiceItemIds: [],
        openResponseItemIds: [],
        retentionReviews: [],
        practicalCompetenceClaim: "PROIBIDO_MVP",
        scorePercent: 100,
      },
    };
    const result = await getParticipantCurriculumRuntime(
      { participantId, moduleId: "M03" },
      { findCurriculumRuntime: async () => state },
    );

    expect(result).toEqual(state);
    await expect(
      getParticipantCurriculumRuntime(
        { participantId, moduleId: "M02" },
        { findCurriculumRuntime: async () => state },
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      getParticipantCurriculumRuntime(
        { participantId, moduleId: "M03" },
        { findCurriculumRuntime: async () => null },
      ),
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(
      getParticipantCurriculumRuntime(
        { participantId, moduleId: "M03" },
        {
          findCurriculumRuntime: async () => ({
            ...state,
            participantId: "foreign",
          }),
        },
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      getParticipantCurriculumRuntime(
        { participantId: "", moduleId: "M03" },
        { findCurriculumRuntime: async () => state },
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
  });
});
