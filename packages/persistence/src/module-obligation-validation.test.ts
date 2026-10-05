import { ApplicationError } from "@cvg/application";
import { describe, expect, it } from "vitest";
import {
  assertApprovedModuleObligationCapture,
  type ApprovedModuleObligationCaptureInput,
} from "./module-obligation-validation.js";

type Mutable<T> = T extends Date
  ? Date
  : T extends object
    ? { -readonly [K in keyof T]: Mutable<T[K]> }
    : T;
type Fixture = Mutable<ApprovedModuleObligationCaptureInput>;
type Cases = readonly (readonly [string, (f: Fixture) => void])[];
const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const date = (day: number) => new Date(`2026-09-${day}T12:00:00Z`);
function first<T>(items: readonly T[]): T {
  const value = items[0];
  if (value === undefined) throw new Error("Synthetic fixture member required");
  return value;
}

// Synthetic technical rows. No clinical data, publisher or native authority is created.
function nativeCapture(
  indices: readonly number[],
  n: number,
): Fixture["captures"][number] {
  const scopeId = uuid(1),
    formVersionId = uuid(20 + n),
    blueprintId = uuid(30 + n);
  const items: Fixture["captures"][number]["capture"]["items"] = indices.map(
    (index, position) => {
      const text = index >= 31;
      const session = index < 11 ? 1 : index < 17 ? 2 : index < 25 ? 3 : 4;
      const catalogItem: (typeof items)[number]["catalogItem"] = {
        id: `synthetic-item-${index + 1}`,
        moduleId: "M02",
        sessionId: `M02-S${session}`,
        ordinal: position + 1,
        objectiveId: "synthetic-objective",
        kind: text ? "CASO_PROGRESSIVO" : "RECUPERACAO_ATIVA",
        responseMode: text ? "TEXT" : "CHOICE",
        title: `Technical ${index + 1}`,
        prompt: `Synthetic prompt ${index + 1}`,
        feedback: "Synthetic feedback",
        critical: index === 0,
        remediationTargetObjectiveId: "synthetic-objective",
        sourceRefs: [
          {
            code: "F-01",
            locator: "Synthetic technical fixture",
            updateRequired: false,
          },
        ],
        ...(text
          ? {
              rubric: {
                dimensions: [
                  {
                    id: "synthetic-dimension",
                    label: "Technical",
                    description: "Synthetic",
                    maxPoints: 100,
                  },
                ],
                passScore: 70,
                criticalErrors: ["Synthetic omission"],
              },
            }
          : {
              choices: [
                { id: "a", label: "A", text: "Technical A" },
                { id: "b", label: "B", text: "Technical B" },
              ],
              correctChoiceIds: ["a"],
            }),
      };
      return {
        formVersionId,
        canonicalItemId: catalogItem.id,
        scopeId,
        contentVersionId: uuid(100 + index),
        contentId: uuid(200 + index),
        contentVersion: 1,
        ordinal: position + 1,
        catalogItem,
        publicItem: {
          itemId: uuid(100 + index),
          ordinal: position + 1,
          kind: text ? "CASO" : "QUESTAO",
          title: catalogItem.title,
          text: catalogItem.prompt,
          responseMode: catalogItem.responseMode,
          ...(text
            ? {}
            : {
                choices: structuredClone(catalogItem.choices!),
                selectionMode: "SINGLE",
              }),
        },
      };
    },
  );
  const approvalDecisionId = uuid(40 + n),
    publicationDecisionId = uuid(50 + n);
  return {
    activityId: uuid(60 + n),
    assignmentId: uuid(2),
    activityStatus: "PUBLISHED",
    capture: {
      expectedScopeId: scopeId,
      now: date(30),
      activity: { scopeId, moduleId: "M02" },
      form: {
        id: formVersionId,
        formId: `synthetic-form-${n}`,
        version: 1,
        scopeId,
        moduleId: "M02",
        blueprintVersionId: blueprintId,
        mode: "MODULE_COMPLETION",
        status: "PUBLICADO",
        publicationDecisionId,
        publishedBy: uuid(4),
        publishedAt: date(25),
      },
      blueprint: {
        id: blueprintId,
        blueprintId: `synthetic-form-blueprint-${n}`,
        version: 1,
        scopeId,
        moduleId: "M02",
        approvalDecisionId,
        approvedBy: uuid(4),
        approvedAt: date(24),
        manifest: {
          moduleId: "M02",
          version: 1,
          approvalDecisionId,
          questionTotal: items.filter(
            (i) => i.catalogItem.responseMode === "CHOICE",
          ).length,
          openResponseCount: items.filter(
            (i) => i.catalogItem.responseMode === "TEXT",
          ).length,
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
        participantOptions: i.publicItem.choices ?? null,
        participantSelectionMode: i.publicItem.selectionMode ?? null,
        createdAt: date(23),
        updatedAt: date(25),
      })),
    },
    decisions: [
      {
        id: approvalDecisionId,
        actorKind: "AUTHENTICATED",
        principalId: uuid(4),
        scopeId,
        action: "CURRICULUM_BLUEPRINT_APPROVED",
        resourceType: "curriculum_blueprint_version",
        resourceId: blueprintId,
        outcome: "SUCCESS",
        occurredAt: date(24),
      },
      {
        id: publicationDecisionId,
        actorKind: "AUTHENTICATED",
        principalId: uuid(4),
        scopeId,
        action: "CURRICULUM_FORM_PUBLISHED",
        resourceType: "curriculum_form_version",
        resourceId: formVersionId,
        outcome: "SUCCESS",
        occurredAt: date(25),
      },
    ],
  };
}

function fixture(): Fixture {
  const captures = [
    nativeCapture([...Array.from({ length: 17 }, (_, i) => i), 31], 0),
    nativeCapture([...Array.from({ length: 14 }, (_, i) => 17 + i), 32], 1),
  ];
  const expected = {
    scopeId: uuid(1),
    assignmentId: uuid(2),
    participantId: uuid(3),
    moduleId: "M02",
  };
  return {
    expected,
    now: date(30),
    blueprint: {
      id: uuid(5),
      blueprintId: "synthetic-whole-module-blueprint",
      version: 1,
      scopeId: uuid(1),
      moduleId: "M02",
      approval: { decisionId: uuid(7), actorId: uuid(4), at: date(26) },
      snapshot: {
        questionCountsBySession: [11, 6, 8, 6],
        questionTotal: 31,
        openResponseCount: 2,
        objectiveIds: ["synthetic-objective"],
      },
      itemManifest: captures.flatMap((c) =>
        structuredClone(c.capture.blueprint.manifest.itemManifest),
      ),
    },
    manifest: {
      id: uuid(6),
      version: 1,
      scopeId: uuid(1),
      moduleId: "M02",
      blueprintVersionId: uuid(5),
      blueprintVersion: 1,
      approval: { decisionId: uuid(8), actorId: uuid(4), at: date(27) },
      obligations: captures.map((c, i) => ({
        id: uuid(70 + i),
        activityId: c.activityId,
        formVersionId: c.capture.form.id,
        formVersion: c.capture.form.version,
        blueprintVersionId: c.capture.blueprint.id,
        blueprintVersion: c.capture.blueprint.version,
        evidenceKind: "CURRICULUM_ATTEMPT",
        items: c.capture.items.map((item) => ({
          canonicalItemId: item.canonicalItemId,
          contentVersionId: item.contentVersionId,
          contentId: item.contentId,
          contentVersion: item.contentVersion,
          ordinal: item.ordinal,
        })),
      })),
    },
    approvals: [
      {
        id: uuid(7),
        actorKind: "AUTHENTICATED",
        principalId: uuid(4),
        scopeId: uuid(1),
        action: "CURRICULUM_MODULE_BLUEPRINT_APPROVED",
        resourceType: "curriculum_module_blueprint_version",
        resourceId: uuid(5),
        outcome: "SUCCESS",
        occurredAt: date(26),
      },
      {
        id: uuid(8),
        actorKind: "AUTHENTICATED",
        principalId: uuid(4),
        scopeId: uuid(1),
        action: "CURRICULUM_MODULE_OBLIGATIONS_APPROVED",
        resourceType: "curriculum_module_obligation_manifest",
        resourceId: uuid(6),
        outcome: "SUCCESS",
        occurredAt: date(27),
      },
    ],
    binding: {
      ...expected,
      manifestId: uuid(6),
      manifestVersion: 1,
      blueprintVersionId: uuid(5),
      blueprintVersion: 1,
      boundAt: date(28),
    },
    captures,
  };
}

function freezeTree(value: unknown): void {
  if (value !== null && typeof value === "object") {
    Object.values(value).forEach(freezeTree);
    Object.freeze(value);
  }
}
function assertDenied(input: ApprovedModuleObligationCaptureInput): void {
  const before = structuredClone(input);
  expect(() => assertApprovedModuleObligationCapture(input)).toThrow(
    ApplicationError,
  );
  expect(() => assertApprovedModuleObligationCapture(input)).toThrow(
    expect.objectContaining({
      code: "state_conflict",
      status: 409,
      details: [],
    }),
  );
  expect(input).toEqual(before);
}
function negativeGroup(name: string, cases: Cases): void {
  describe(name, () => {
    it.each(cases)("denies %s without mutation", (_name, change) => {
      const f = fixture();
      change(f);
      assertDenied(f);
    });
  });
}

describe("approved whole-module obligation capture — pure consistency seam", () => {
  describe("valid full input", () => {
    it("validates 31 questions and two open responses across two bound forms and four frozen sessions", () => {
      const f = fixture(),
        before = structuredClone(f);
      freezeTree(f);
      expect(assertApprovedModuleObligationCapture(f)).toBeUndefined();
      expect(f).toEqual(before);
    });
    it("matches independent rows by identity, without array-order authority", () => {
      const f = fixture();
      f.captures.reverse();
      f.manifest.obligations.reverse();
      f.blueprint.itemManifest.reverse();
      f.approvals.reverse();
      f.captures.forEach((c) => {
        c.capture.items.reverse();
        c.capture.activityItems.reverse();
        c.capture.contentVersions.reverse();
        c.decisions.reverse();
      });
      const before = structuredClone(f);
      expect(assertApprovedModuleObligationCapture(f)).toBeUndefined();
      expect(f).toEqual(before);
    });
    it("uses the frozen snapshot rather than requiring current M02 catalog totals", () => {
      const f = fixture();
      // Move one question coherently in all frozen descriptions. No catalog is consulted.
      const item = first(first(f.captures).capture.items);
      item.catalogItem.sessionId = "M02-S2";
      first(
        first(f.captures).capture.blueprint.manifest.itemManifest,
      ).sessionId = "M02-S2";
      first(f.blueprint.itemManifest).sessionId = "M02-S2";
      f.blueprint.snapshot.questionCountsBySession = [10, 7, 8, 6];
      expect(assertApprovedModuleObligationCapture(f)).toBeUndefined();
    });
  });

  negativeGroup("missing or partial authority", [
    [
      "empty obligations",
      (f) => {
        f.manifest.obligations = [];
      },
    ],
    [
      "partial native capture",
      (f) => {
        f.captures.pop();
      },
    ],
    [
      "single-form self-consistent subset",
      (f) => {
        f.captures.pop();
        f.manifest.obligations.pop();
      },
    ],
    [
      "empty whole-module item inventory",
      (f) => {
        f.blueprint.itemManifest = [];
      },
    ],
    [
      "missing whole-module item",
      (f) => {
        f.blueprint.itemManifest.pop();
      },
    ],
    [
      "empty per-obligation items",
      (f) => {
        first(f.manifest.obligations).items = [];
      },
    ],
    [
      "partial obligation item list",
      (f) => {
        first(f.manifest.obligations).items.pop();
      },
    ],
    [
      "empty captures",
      (f) => {
        f.captures = [];
      },
    ],
    [
      "extra visible activity",
      (f) => {
        const c = structuredClone(first(f.captures));
        c.activityId = uuid(999);
        f.captures.push(c);
      },
    ],
    [
      "missing approvals",
      (f) => {
        f.approvals = [];
      },
    ],
    [
      "duplicate approvals",
      (f) => {
        f.approvals[1] = structuredClone(first(f.approvals));
      },
    ],
    [
      "unbound form approval",
      (f) => {
        first(f.captures).decisions = [];
      },
    ],
  ]);
  negativeGroup("frozen full-blueprint limits", [
    [
      "question-total subset",
      (f) => {
        f.blueprint.snapshot.questionTotal = 1;
      },
    ],
    [
      "missing required open responses",
      (f) => {
        f.blueprint.snapshot.openResponseCount = 0;
      },
    ],
    [
      "wrong session distribution with same total",
      (f) => {
        f.blueprint.snapshot.questionCountsBySession = [6, 11, 8, 6];
      },
    ],
    [
      "unknown session",
      (f) => {
        first(f.blueprint.itemManifest).sessionId = "M02-S5";
      },
    ],
    [
      "foreign session",
      (f) => {
        first(f.blueprint.itemManifest).sessionId = "M03-S1";
      },
    ],
    [
      "unsupported response mode",
      (f) => {
        Object.assign(first(f.blueprint.itemManifest), {
          responseMode: "BOOLEAN",
        });
      },
    ],
    [
      "unbound objective",
      (f) => {
        first(f.blueprint.itemManifest).objectiveId = "foreign-objective";
      },
    ],
    [
      "unused objective",
      (f) => {
        f.blueprint.snapshot.objectiveIds.push("unused-objective");
      },
    ],
    [
      "duplicate objectives",
      (f) => {
        f.blueprint.snapshot.objectiveIds.push(
          first(f.blueprint.snapshot.objectiveIds),
        );
      },
    ],
    [
      "NaN total",
      (f) => {
        f.blueprint.snapshot.questionTotal = NaN;
      },
    ],
    [
      "fractional total",
      (f) => {
        f.blueprint.snapshot.questionTotal = 31.5;
      },
    ],
    [
      "negative count",
      (f) => {
        f.blueprint.snapshot.questionCountsBySession[0] = -1;
      },
    ],
    [
      "duplicate frozen item IDs",
      (f) => {
        f.blueprint.itemManifest[1] = structuredClone(
          first(f.blueprint.itemManifest),
        );
      },
    ],
    [
      "item criticality mismatch",
      (f) => {
        first(f.blueprint.itemManifest).critical = false;
      },
    ],
    [
      "coherent one-item subset cannot evade frozen counts",
      (f) => {
        f.captures.pop();
        f.manifest.obligations.pop();
        const c = first(f.captures).capture;
        c.items = c.items.slice(0, 1);
        c.activityItems = c.activityItems.slice(0, 1);
        c.contentVersions = c.contentVersions.slice(0, 1);
        c.blueprint.manifest.itemManifest =
          c.blueprint.manifest.itemManifest.slice(0, 1);
        c.blueprint.manifest.questionTotal = 1;
        c.blueprint.manifest.openResponseCount = 0;
        first(f.manifest.obligations).items = first(
          f.manifest.obligations,
        ).items.slice(0, 1);
        f.blueprint.itemManifest = f.blueprint.itemManifest.slice(0, 1);
      },
    ],
  ]);
  negativeGroup("identity, scope and duplicate membership", [
    [
      "manifest from another full-blueprint numeric version",
      (f) => {
        f.manifest.blueprintVersion++;
      },
    ],
    [
      "binding from another full-blueprint numeric version",
      (f) => {
        f.binding.blueprintVersion++;
      },
    ],
    [
      "whole-blueprint version tampering",
      (f) => {
        f.blueprint.version++;
      },
    ],
    [
      "foreign expected scope",
      (f) => {
        f.expected.scopeId = uuid(999);
      },
    ],
    [
      "foreign expected participant",
      (f) => {
        f.expected.participantId = uuid(999);
      },
    ],
    [
      "foreign expected assignment",
      (f) => {
        f.expected.assignmentId = uuid(999);
      },
    ],
    [
      "foreign expected module",
      (f) => {
        f.expected.moduleId = "M03";
      },
    ],
    [
      "foreign blueprint scope",
      (f) => {
        f.blueprint.scopeId = uuid(999);
      },
    ],
    [
      "foreign manifest module",
      (f) => {
        f.manifest.moduleId = "M03";
      },
    ],
    [
      "binding from another inventory",
      (f) => {
        f.binding.manifestId = uuid(999);
      },
    ],
    [
      "binding from another inventory version",
      (f) => {
        f.binding.manifestVersion++;
      },
    ],
    [
      "manifest from another full blueprint",
      (f) => {
        f.manifest.blueprintVersionId = uuid(999);
      },
    ],
    [
      "binding from another full blueprint",
      (f) => {
        f.binding.blueprintVersionId = uuid(999);
      },
    ],
    [
      "malformed scope ID",
      (f) => {
        f.expected.scopeId = "bad-id";
      },
    ],
    [
      "malformed module ID",
      (f) => {
        f.expected.moduleId = "M25";
      },
    ],
    [
      "zero manifest version",
      (f) => {
        f.manifest.version = 0;
      },
    ],
    [
      "duplicate obligation ID",
      (f) => {
        f.manifest.obligations[1]!.id = first(f.manifest.obligations).id;
      },
    ],
    [
      "duplicate activity membership",
      (f) => {
        f.manifest.obligations[1]!.activityId = first(
          f.manifest.obligations,
        ).activityId;
      },
    ],
    [
      "duplicate form membership",
      (f) => {
        f.manifest.obligations[1]!.formVersionId = first(
          f.manifest.obligations,
        ).formVersionId;
      },
    ],
    [
      "duplicate captures",
      (f) => {
        f.captures[1] = structuredClone(first(f.captures));
      },
    ],
    [
      "foreign capture assignment",
      (f) => {
        first(f.captures).assignmentId = uuid(999);
      },
    ],
    [
      "foreign capture scope",
      (f) => {
        first(f.captures).capture.activity.scopeId = uuid(999);
      },
    ],
    [
      "mismatched form version",
      (f) => {
        first(f.manifest.obligations).formVersion++;
      },
    ],
    [
      "mismatched form blueprint version",
      (f) => {
        first(f.manifest.obligations).blueprintVersion++;
      },
    ],
    [
      "mismatched content version",
      (f) => {
        first(first(f.manifest.obligations).items).contentVersion++;
      },
    ],
    [
      "mismatched content identity",
      (f) => {
        first(first(f.manifest.obligations).items).contentId = uuid(999);
      },
    ],
    [
      "mismatched native item ID",
      (f) => {
        first(first(f.manifest.obligations).items).contentVersionId = uuid(999);
      },
    ],
    [
      "mismatched canonical item",
      (f) => {
        first(first(f.manifest.obligations).items).canonicalItemId =
          "foreign-item";
      },
    ],
    [
      "mismatched ordinal",
      (f) => {
        first(first(f.manifest.obligations).items).ordinal = 99;
      },
    ],
    [
      "duplicate obligation item",
      (f) => {
        first(f.manifest.obligations).items[1] = structuredClone(
          first(first(f.manifest.obligations).items),
        );
      },
    ],
  ]);
  negativeGroup("approval provenance and time", [
    [
      "approval by another actor",
      (f) => {
        first(f.approvals).principalId = uuid(999);
      },
    ],
    [
      "approval for another scope",
      (f) => {
        first(f.approvals).scopeId = uuid(999);
      },
    ],
    [
      "approval for another resource",
      (f) => {
        first(f.approvals).resourceId = uuid(999);
      },
    ],
    [
      "wrong approval action",
      (f) => {
        first(f.approvals).action = "CURRICULUM_FORM_PUBLISHED";
      },
    ],
    [
      "wrong approval resource type",
      (f) => {
        first(f.approvals).resourceType = "curriculum_form_version";
      },
    ],
    [
      "anonymous approval",
      (f) => {
        first(f.approvals).actorKind = "ANONYMOUS";
      },
    ],
    [
      "failed approval",
      (f) => {
        Object.assign(first(f.approvals), { outcome: "FAILURE" });
      },
    ],
    [
      "approval time mismatch",
      (f) => {
        first(f.approvals).occurredAt = date(25);
      },
    ],
    [
      "future blueprint approval",
      (f) => {
        f.blueprint.approval.at = new Date("2027-01-01");
      },
    ],
    [
      "manifest approved before blueprint",
      (f) => {
        f.manifest.approval.at = date(25);
        f.approvals[1]!.occurredAt = date(25);
      },
    ],
    [
      "binding before approval",
      (f) => {
        f.binding.boundAt = date(26);
      },
    ],
    [
      "future binding",
      (f) => {
        f.binding.boundAt = new Date("2027-01-01");
      },
    ],
    [
      "future per-form publication",
      (f) => {
        first(f.captures).capture.form.publishedAt = new Date("2027-01-01");
      },
    ],
    [
      "form publication after inventory approval",
      (f) => {
        first(f.captures).capture.form.publishedAt = date(29);
        first(f.captures).decisions[1]!.occurredAt = date(29);
      },
    ],
    [
      "invalid clock",
      (f) => {
        f.now = new Date(NaN);
      },
    ],
    [
      "independent capture clock bypass",
      (f) => {
        first(f.captures).capture.now = new Date("2027-01-01");
      },
    ],
  ]);
  negativeGroup("unsupported authority/evidence and malformed rows", [
    [
      "NONE evidence without a native producer",
      (f) => {
        Object.assign(first(f.manifest.obligations), { evidenceKind: "NONE" });
      },
    ],
    [
      "reading completion status",
      (f) => {
        Object.assign(first(f.manifest.obligations), {
          evidenceKind: "READING_STATUS",
        });
      },
    ],
    [
      "reflection boolean",
      (f) => {
        Object.assign(first(f.manifest.obligations), {
          evidenceKind: "REFLECTION_BOOLEAN",
        });
      },
    ],
    [
      "unknown modality",
      (f) => {
        Object.assign(first(f.manifest.obligations), {
          evidenceKind: "FUTURE_NATIVE",
        });
      },
    ],
    [
      "bare assignment CONCLUIDO replacing membership",
      (f) => {
        Object.assign(f.manifest, {
          obligations: undefined,
          status: "CONCLUIDO",
        });
      },
    ],
    [
      "draft form",
      (f) => {
        first(f.captures).capture.form.status = "RASCUNHO";
      },
    ],
    [
      "retired activity",
      (f) => {
        Object.assign(first(f.captures), { activityStatus: "RETIRED" });
      },
    ],
    [
      "formative-only evidence",
      (f) => {
        first(f.captures).capture.form.mode = "FORMATIVE_CHOICE";
      },
    ],
    [
      "native item binding incomplete",
      (f) => {
        first(f.captures).capture.activityItems.pop();
      },
    ],
    [
      "public/private snapshot disagreement",
      (f) => {
        first(first(f.captures).capture.items).publicItem.title = "Different";
      },
    ],
    [
      "missing frozen snapshot",
      (f) => {
        Object.assign(f.blueprint, { snapshot: undefined });
      },
    ],
    [
      "extra unknown manifest field",
      (f) => {
        Object.assign(f.manifest, { approved: true });
      },
    ],
    [
      "sparse captures",
      (f) => {
        delete f.captures[0];
      },
    ],
    [
      "sparse inventory",
      (f) => {
        delete f.blueprint.itemManifest[0];
      },
    ],
  ]);
  it.each([null, undefined, true, {}, { manifest: true }])(
    "denies malformed top-level input %j",
    (value) => {
      assertDenied(value as unknown as ApprovedModuleObligationCaptureInput);
    },
  );
});
