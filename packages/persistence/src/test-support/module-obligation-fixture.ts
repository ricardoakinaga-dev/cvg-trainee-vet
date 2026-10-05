import type { ApprovedModuleObligationCaptureInput } from "../module-obligation-validation.js";

type Mutable<T> = T extends Date
  ? Date
  : T extends object
    ? { -readonly [K in keyof T]: Mutable<T[K]> }
    : T;
type Fixture = Mutable<ApprovedModuleObligationCaptureInput>;
const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const date = (day: number) => new Date(`2026-09-${day}T12:00:00Z`);
type FrozenItem = Fixture["captures"][number]["capture"]["items"][number];
function syntheticItem(
  index: number,
  position: number,
  formVersionId: string,
): FrozenItem {
  const scopeId = uuid(1);
  const text = index >= 31;
  const session = index < 11 ? 1 : index < 17 ? 2 : index < 25 ? 3 : 4;
  const catalogItem: FrozenItem["catalogItem"] = {
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
}

// Synthetic technical rows. No clinical data, publisher or native authority is created.
function nativeCapture(
  indices: readonly number[],
  n: number,
): Fixture["captures"][number] {
  const scopeId = uuid(1),
    formVersionId = uuid(20 + n),
    blueprintId = uuid(30 + n);
  const items = indices.map((index, position) =>
    syntheticItem(index, position, formVersionId),
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

export function approvedModuleFixture(): Fixture {
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
