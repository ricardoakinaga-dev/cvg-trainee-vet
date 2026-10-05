import { ApplicationError } from "@cvg/application";
import { describe, expect, it } from "vitest";
import { approvedModuleFixture } from "./test-support/module-obligation-fixture.js";
import {
  validateFinalizedModuleObligations,
  type ModuleObligationTerminalWitness,
} from "./module-obligation-finalization.js";

type Mutable<T> = T extends Date
  ? Date
  : T extends object
    ? { -readonly [K in keyof T]: Mutable<T[K]> }
    : T;
const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const capturedAt = new Date("2026-09-28T13:00:00Z");
const submittedAt = "2026-09-29T12:00:00.000Z";
const terminalAt = new Date("2026-09-30T11:00:00Z");

function fixture() {
  const capture = approvedModuleFixture();
  const witnesses: Mutable<ModuleObligationTerminalWitness>[] =
    capture.captures.map((c, index) => {
      const { form, blueprint, items } = c.capture;
      const attemptId = uuid(900 + index);
      return {
        activityId: c.activityId,
        learningAssignmentId: capture.expected.assignmentId,
        formVersionId: form.id,
        capturedAt,
        terminalAt,
        attempt: {
          attemptId,
          participantId: capture.expected.participantId,
          scopeId: capture.expected.scopeId,
          moduleId: capture.expected.moduleId,
          attemptVersion: 5,
          status: "CORRIGIDA_HUMANAMENTE",
          submittedAt,
          mode: form.mode,
          form: {
            formId: form.formId,
            version: form.version,
            blueprintId: blueprint.blueprintId,
            status: "PUBLICADO",
            publication: {
              decisionId: form.publicationDecisionId,
              publishedAt: form.publishedAt.toISOString(),
            },
            blueprint: structuredClone(blueprint.manifest),
            catalog: {
              moduleId: form.moduleId,
              items: items.map((item) => structuredClone(item.catalogItem)),
            },
            contentVersions: items.map((item) => ({
              itemId: item.canonicalItemId,
              contentVersionId: item.contentVersionId,
              version: item.contentVersion,
              sourceRefs: structuredClone(item.catalogItem.sourceRefs),
            })),
          },
          answers: items.map((item) => ({
            attemptId,
            contentVersionId: item.contentVersionId,
            answer:
              item.catalogItem.responseMode === "TEXT"
                ? {
                    itemId: item.canonicalItemId,
                    text: "Synthetic technical response",
                  }
                : { itemId: item.canonicalItemId, selectedChoiceIds: ["a"] },
          })),
        },
        correction: {
          id: uuid(950 + index),
          attemptId,
          version: 1,
          kind: "HUMANA",
          outcome: "APROVADO",
          correctedBy: uuid(4),
          correctedAt: terminalAt,
        },
        correctionDecision: {
          id: uuid(970 + index),
          actorKind: "AUTHENTICATED",
          principalId: uuid(4),
          scopeId: capture.expected.scopeId,
          action: "ATTEMPT_CORRECTED",
          resourceType: "attempt",
          resourceId: attemptId,
          outcome: "SUCCESS",
          occurredAt: terminalAt,
        },
      };
    });
  return { capture, witnesses };
}
type Fixture = ReturnType<typeof fixture>;
function first(f: Fixture) {
  const witness = f.witnesses[0];
  if (!witness) throw new Error("Missing technical witness");
  return witness;
}
function answer(f: Fixture) {
  const row = first(f).attempt.answers[0];
  if (!row) throw new Error("Missing technical answer");
  return row;
}
function denied(f: Fixture) {
  const before = structuredClone(f);
  expect(() =>
    validateFinalizedModuleObligations(f.capture, f.witnesses),
  ).toThrow(ApplicationError);
  expect(() =>
    validateFinalizedModuleObligations(f.capture, f.witnesses),
  ).toThrow(expect.objectContaining({ code: "state_conflict", details: [] }));
  expect(f).toEqual(before);
}

describe("whole-module activity finalization distinct from summative approval", () => {
  it("returns two terminal witnesses for all 33 original mandatory items without mutating input", () => {
    const f = fixture(),
      before = structuredClone(f);
    const result = validateFinalizedModuleObligations(f.capture, f.witnesses);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      activityId: first(f).activityId,
      attemptId: first(f).attempt.attemptId,
      attemptVersion: 5,
      formVersionId: first(f).formVersionId,
      formVersion: 1,
      assessmentResultId: first(f).correction.id,
      correctedAt: terminalAt,
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result[0])).toBe(true);
    expect(f).toEqual(before);
  });
  it("records finalized correction with REFORCO outcome without manufacturing module approval", () => {
    const f = fixture();
    first(f).correction.outcome = "REFORCO";
    expect(
      validateFinalizedModuleObligations(f.capture, f.witnesses),
    ).toHaveLength(2);
  });
  it("matches activity witnesses by identity regardless of read order", () => {
    const f = fixture(),
      expected = validateFinalizedModuleObligations(f.capture, f.witnesses);
    f.witnesses.reverse();
    expect(validateFinalizedModuleObligations(f.capture, f.witnesses)).toEqual(
      expected,
    );
  });
  it("keeps activity finalization separate from quiz score and critical mastery", () => {
    const f = fixture();
    answer(f).answer.selectedChoiceIds = ["b"];
    first(f).correction.outcome = "REFORCO";
    expect(
      validateFinalizedModuleObligations(f.capture, f.witnesses),
    ).toHaveLength(2);
  });
  it("does not alias a mutable receipt clock to the input proof", () => {
    const f = fixture();
    const before = structuredClone(f);
    const result = validateFinalizedModuleObligations(f.capture, f.witnesses);
    result[0]?.correctedAt.setTime(0);
    expect(f).toEqual(before);
  });
  const cases: readonly (readonly [string, (f: Fixture) => void])[] = [
    [
      "duplicate correction audit identity",
      (f) => {
        const other = f.witnesses[1];
        if (other) other.correctionDecision.id = first(f).correctionDecision.id;
      },
    ],
    [
      "duplicate correction identity",
      (f) => {
        const other = f.witnesses[1];
        if (other) other.correction.id = first(f).correction.id;
      },
    ],
    [
      "invalid correction identity",
      (f) => {
        first(f).correction.id = "legacy";
      },
    ],
    [
      "invalid audit identity",
      (f) => {
        first(f).correctionDecision.id = "legacy";
      },
    ],
    [
      "unsafe attempt numeric version",
      (f) => {
        first(f).attempt.attemptVersion = Number.MAX_SAFE_INTEGER + 1;
      },
    ],
    [
      "sparse witness array",
      (f) => {
        delete f.witnesses[0];
      },
    ],
    [
      "sparse mandatory answers",
      (f) => {
        delete first(f).attempt.answers[0];
      },
    ],
    [
      "empty inventory",
      (f) => {
        f.capture.manifest.obligations = [];
      },
    ],
    [
      "visible inventory subset",
      (f) => {
        f.capture.manifest.obligations.pop();
        f.capture.captures.pop();
        f.witnesses.pop();
      },
    ],
    [
      "no terminal witnesses",
      (f) => {
        f.witnesses = [];
      },
    ],
    [
      "missing required activity",
      (f) => {
        f.witnesses.pop();
      },
    ],
    [
      "duplicate witness",
      (f) => {
        f.witnesses[1] = structuredClone(first(f));
      },
    ],
    [
      "unbound activity",
      (f) => {
        first(f).activityId = uuid(1000);
      },
    ],
    [
      "foreign assignment",
      (f) => {
        first(f).learningAssignmentId = uuid(1001);
      },
    ],
    [
      "foreign participant",
      (f) => {
        first(f).attempt.participantId = uuid(1002);
      },
    ],
    [
      "foreign scope",
      (f) => {
        first(f).attempt.scopeId = uuid(1003);
      },
    ],
    [
      "foreign module",
      (f) => {
        first(f).attempt.moduleId = "M03";
      },
    ],
    [
      "wrong form identity",
      (f) => {
        first(f).formVersionId = uuid(1004);
      },
    ],
    [
      "form numeric version mismatch",
      (f) => {
        first(f).attempt.form.version++;
      },
    ],
    [
      "unsubmitted attempt",
      (f) => {
        first(f).attempt.status = "SUBMETIDA";
      },
    ],
    [
      "pending human correction",
      (f) => {
        first(f).attempt.status = "AGUARDA_CORRECAO_HUMANA";
      },
    ],
    [
      "automatic status despite open response",
      (f) => {
        first(f).attempt.status = "CORRIGIDA_AUTOMATICAMENTE";
      },
    ],
    [
      "unsafe attempt version",
      (f) => {
        first(f).attempt.attemptVersion = 0.5;
      },
    ],
    [
      "negative attempt version",
      (f) => {
        first(f).attempt.attemptVersion = -1;
      },
    ],
    [
      "invalid attempt identity",
      (f) => {
        first(f).attempt.attemptId = "legacy";
      },
    ],
    [
      "attempt before original module binding",
      (f) => {
        first(f).capturedAt = new Date("2026-09-27T12:00:00Z");
      },
    ],
    [
      "submission before capture",
      (f) => {
        first(f).attempt.submittedAt = "2026-09-28T12:00:00.000Z";
      },
    ],
    [
      "terminal correction before submission",
      (f) => {
        first(f).terminalAt = new Date("2026-09-28T12:00:00Z");
      },
    ],
    [
      "future terminal correction",
      (f) => {
        first(f).terminalAt = new Date("2026-10-01T12:00:00Z");
      },
    ],
    [
      "invalid terminal clock",
      (f) => {
        first(f).terminalAt = new Date(NaN);
      },
    ],
    [
      "missing mandatory answer",
      (f) => {
        first(f).attempt.answers.pop();
      },
    ],
    [
      "duplicate answer",
      (f) => {
        const row = structuredClone(answer(f));
        first(f).attempt.answers[1] = row;
      },
    ],
    [
      "answer borrowed from another attempt",
      (f) => {
        answer(f).attemptId = uuid(1005);
      },
    ],
    [
      "foreign content version",
      (f) => {
        answer(f).contentVersionId = uuid(1006);
      },
    ],
    [
      "canonical item mismatch",
      (f) => {
        answer(f).answer.itemId = "unbound";
      },
    ],
    [
      "unknown choice",
      (f) => {
        answer(f).answer.selectedChoiceIds = ["unknown"];
      },
    ],
    [
      "duplicate choices",
      (f) => {
        answer(f).answer.selectedChoiceIds = ["a", "a"];
      },
    ],
    [
      "multiple choices for single-select",
      (f) => {
        answer(f).answer.selectedChoiceIds = ["a", "b"];
      },
    ],
    [
      "empty response",
      (f) => {
        answer(f).answer.selectedChoiceIds = [];
      },
    ],
    [
      "choice sent as text",
      (f) => {
        answer(f).answer.text = "a";
        delete answer(f).answer.selectedChoiceIds;
      },
    ],
    [
      "ambiguous dual modality",
      (f) => {
        answer(f).answer.text = "extra";
      },
    ],
    [
      "blank mandatory human response",
      (f) => {
        const a = first(f).attempt.answers.at(-1);
        if (a) a.answer.text = "   ";
      },
    ],
    [
      "frozen catalog subset",
      (f) => {
        first(f).attempt.form.catalog.items.pop();
      },
    ],
    [
      "mutated frozen key",
      (f) => {
        const i = first(f).attempt.form.catalog.items[0];
        if (i) i.correctChoiceIds = ["b"];
      },
    ],
    [
      "different publication event",
      (f) => {
        first(f).attempt.form.publication.decisionId = uuid(1007);
      },
    ],
    [
      "blueprint version substitution",
      (f) => {
        first(f).attempt.form.blueprint.version++;
      },
    ],
    [
      "content version substitution",
      (f) => {
        const v = first(f).attempt.form.contentVersions[0];
        if (v) v.version++;
      },
    ],
    [
      "foreign correction attempt",
      (f) => {
        first(f).correction.attemptId = uuid(1008);
      },
    ],
    [
      "automatic correction for text",
      (f) => {
        first(f).correction.kind = "AUTOMATICA";
      },
    ],
    [
      "zero correction version",
      (f) => {
        first(f).correction.version = 0;
      },
    ],
    [
      "correction time mismatch",
      (f) => {
        first(f).correction.correctedAt = new Date("2026-09-30T10:00:00Z");
      },
    ],
    [
      "audit anonymous",
      (f) => {
        first(f).correctionDecision.actorKind = "ANONYMOUS";
      },
    ],
    [
      "audit failed",
      (f) => {
        first(f).correctionDecision.outcome = "FAILURE";
      },
    ],
    [
      "wrong corrected actor",
      (f) => {
        first(f).correctionDecision.principalId = uuid(1009);
      },
    ],
    [
      "wrong corrected scope",
      (f) => {
        first(f).correctionDecision.scopeId = uuid(1010);
      },
    ],
    [
      "wrong corrected resource",
      (f) => {
        first(f).correctionDecision.resourceId = uuid(1011);
      },
    ],
    [
      "wrong correction action",
      (f) => {
        first(f).correctionDecision.action = "ANSWER_SAVED";
      },
    ],
    [
      "wrong correction resource type",
      (f) => {
        first(f).correctionDecision.resourceType = "answer";
      },
    ],
    [
      "audit clock mismatch",
      (f) => {
        first(f).correctionDecision.occurredAt = new Date(
          "2026-09-30T10:00:00Z",
        );
      },
    ],
  ];
  it.each(cases)(
    "denies %s without writes or internal error details",
    (_name, change) => {
      const f = fixture();
      change(f);
      denied(f);
    },
  );
});
