import { randomUUID, createHash } from "node:crypto";
import type { InferInsertModel } from "drizzle-orm";
import type { StartAttemptCommand } from "../../packages/application/src/attempt-use-cases.js";
import type { ModuleEvaluationCatalog } from "../../packages/curriculum/src/module-evaluation-contracts.js";
import { createAttemptUseCaseDependencies } from "../../packages/persistence/src/attempt-repository.js";
import {
  accounts,
  accountInvitations,
  activityAssignments,
  auditEntries,
  contentVersions,
  learningActivities,
  learningAssignments,
  learningActivityItems,
  curriculumBlueprintVersions,
  curriculumFormVersions,
  curriculumFormItems,
  curriculumActivityForms,
} from "../../packages/persistence/src/schema.js";
import type { LivePostgresHarness } from "./live-postgres-harness.js";

// All records are synthetic technical fixtures, NOT clinical publication.
// Immutable decisions/forms remain until the owned disposable cluster is destroyed.
export function syntheticCatalog(): ModuleEvaluationCatalog {
  return {
    moduleId: "M02",
    items: Array.from({ length: 33 }, (_, index) => ({
      id: `synthetic-M02-${index + 1}`,
      moduleId: "M02",
      sessionId: "M02-S1",
      ordinal: index + 1,
      objectiveId: "synthetic-objective",
      kind: "RECUPERACAO_ATIVA",
      responseMode: index < 31 ? "CHOICE" : "TEXT",
      title: `Synthetic technical item ${index + 1}`,
      prompt: `Synthetic prompt ${index + 1}; no clinical content`,
      feedback: "Synthetic technical feedback",
      critical: false,
      remediationTargetObjectiveId: "synthetic-objective",
      sourceRefs: [
        {
          code: "F-01",
          locator: "synthetic technical fixture",
          updateRequired: false,
        },
      ],
      ...(index < 31
        ? {
            choices: [
              { id: "synthetic-a", label: "A", text: "Synthetic A" },
              { id: "synthetic-b", label: "B", text: "Synthetic B" },
            ],
            correctChoiceIds: ["synthetic-a"],
          }
        : {
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
          }),
    })),
  };
}

type NativeCurriculumFixture = Readonly<{
  participantId: string;
  scopeId: string;
  activityId: string;
  formVersionId: string;
  blueprintVersionId: string;
  formItems: readonly InferInsertModel<typeof curriculumFormItems>[];
  command: StartAttemptCommand;
  dependencies: ReturnType<typeof createAttemptUseCaseDependencies>;
}>;

type DecisionPatch = Partial<
  Pick<
    InferInsertModel<typeof auditEntries>,
    | "action"
    | "actorKind"
    | "principalId"
    | "resourceType"
    | "resourceId"
    | "scopeId"
    | "outcome"
    | "occurredAt"
  >
>;
type DecisionFixtureContext = Readonly<{
  participantId: string;
  publisherId: string;
  scopeId: string;
  blueprintVersionId: string;
  formVersionId: string;
}>;

export async function provisionCurriculumForm(
  harness: LivePostgresHarness,
  itemCount = 33,
  firstChoice?: Readonly<{
    id: string;
    secondId?: string;
    selectionMode: "SINGLE" | "MULTIPLE";
    formativeChoiceOnly?: true;
  }>,
  decisionPatch?: (context: DecisionFixtureContext) => Readonly<{
    approval?: DecisionPatch;
    publication?: DecisionPatch;
  }>,
): Promise<NativeCurriculumFixture> {
  const participantId = randomUUID(),
    publisherId = randomUUID(),
    scopeId = randomUUID();
  const activityId = randomUUID(),
    formVersionId = randomUUID(),
    blueprintVersionId = randomUUID();
  const approvalDecisionId = randomUUID(),
    publicationDecisionId = randomUUID();
  const approvedAt = new Date("2026-10-01T12:00:00.000Z");
  const publishedAt = new Date("2026-10-02T12:00:00.000Z");
  const baseCatalog = syntheticCatalog();
  const catalog: ModuleEvaluationCatalog = {
    ...baseCatalog,
    items: baseCatalog.items
      .filter(
        (item) =>
          !firstChoice?.formativeChoiceOnly || item.responseMode === "CHOICE",
      )
      .map((item, index) =>
        index === 0 && firstChoice
          ? {
              ...item,
              choices: item.choices!.map((choice, choiceIndex) =>
                choiceIndex === 0
                  ? { ...choice, id: firstChoice.id }
                  : firstChoice.secondId === undefined
                    ? choice
                    : { ...choice, id: firstChoice.secondId },
              ),
              correctChoiceIds: [firstChoice.id],
            }
          : item,
      ),
  };
  const { db } = harness.admin;
  await db.insert(accounts).values(
    [participantId, publisherId].map((id) => ({
      id,
      status: "ACTIVE",
      professionalEmail: `synthetic-binding-${id}@example.invalid`,
    })),
  );
  await db.insert(accountInvitations).values({
    accountId: participantId,
    createdBy: publisherId,
    tokenHash: createHash("sha256").update(randomUUID()).digest("hex"),
    roles: ["PARTICIPANT"],
    scopes: [scopeId],
    acceptedAt: approvedAt,
    expiresAt: new Date("2027-10-01T12:00:00.000Z"),
  });
  const patches = decisionPatch?.({
    participantId,
    publisherId,
    scopeId,
    blueprintVersionId,
    formVersionId,
  });
  await db.insert(auditEntries).values(
    [
      {
        id: approvalDecisionId,
        action: "CURRICULUM_BLUEPRINT_APPROVED",
        resourceType: "curriculum_blueprint_version",
        resourceId: blueprintVersionId,
        occurredAt: approvedAt,
      },
      {
        id: publicationDecisionId,
        action: "CURRICULUM_FORM_PUBLISHED",
        resourceType: "curriculum_form_version",
        resourceId: formVersionId,
        occurredAt: publishedAt,
      },
    ].map((row, index) => ({
      ...row,
      actorKind: "AUTHENTICATED",
      principalId: publisherId,
      scopeId,
      outcome: "SUCCESS",
      requestId: randomUUID(),
      correlationId: randomUUID(),
      ...patches?.[index === 0 ? "approval" : "publication"],
    })),
  );
  const manifest = {
    version: 1,
    approvalDecisionId,
    moduleId: "M02",
    questionTotal: 31,
    openResponseCount: firstChoice?.formativeChoiceOnly ? 0 : 2,
    objectiveIds: ["synthetic-objective"],
    itemManifest: catalog.items.map((item) => ({
      itemId: item.id,
      objectiveId: item.objectiveId,
      responseMode: item.responseMode,
      critical: item.critical,
      sessionId: item.sessionId,
    })),
  };
  await db.insert(curriculumBlueprintVersions).values({
    id: blueprintVersionId,
    blueprintId: "synthetic-full-module",
    version: 1,
    scopeId,
    moduleId: "M02",
    approvalDecisionId,
    approvedBy: publisherId,
    approvedAt,
    manifest,
  });
  await db.insert(curriculumFormVersions).values({
    id: formVersionId,
    formId: "synthetic-published-form",
    version: 1,
    scopeId,
    moduleId: "M02",
    blueprintVersionId,
    mode: firstChoice?.formativeChoiceOnly
      ? "FORMATIVE_CHOICE"
      : "MODULE_COMPLETION",
    status: "PUBLICADO",
    publicationDecisionId,
    publishedBy: publisherId,
    publishedAt,
  });
  await db.insert(learningActivities).values({
    id: activityId,
    scopeId,
    moduleId: "M02",
    slug: `synthetic-binding-${activityId}`,
    status: "PUBLISHED",
  });
  const formItems = catalog.items.slice(0, itemCount).map((item) => {
    const contentVersionId = randomUUID();
    return {
      formVersionId,
      canonicalItemId: item.id,
      scopeId,
      contentVersionId,
      contentId: randomUUID(),
      contentVersion: 1,
      ordinal: item.ordinal,
      catalogItem: item,
      publicItem: {
        itemId: contentVersionId,
        ordinal: item.ordinal,
        kind: "QUESTAO" as const,
        title: item.title,
        text: item.prompt,
        responseMode: item.responseMode,
        ...(item.responseMode === "CHOICE"
          ? {
              choices: item.choices ?? [],
              selectionMode:
                item.ordinal === 1 && firstChoice
                  ? firstChoice.selectionMode
                  : ("SINGLE" as const),
            }
          : {}),
      },
    };
  });
  await db.insert(contentVersions).values(
    formItems.map((item) => ({
      id: item.contentVersionId,
      contentId: item.contentId,
      scopeId,
      version: 1,
      status: "PUBLICADO",
      kind: "QUESTAO",
      title: item.publicItem.title,
      participantText: item.publicItem.text,
      responseMode: item.publicItem.responseMode,
      ...(item.publicItem.responseMode === "CHOICE"
        ? {
            participantOptions: item.publicItem.choices,
            participantSelectionMode: item.publicItem.selectionMode,
          }
        : {}),
    })),
  );
  await db.insert(learningActivityItems).values(
    formItems.map((item) => ({
      activityId,
      contentVersionId: item.contentVersionId,
      ordinal: item.ordinal,
    })),
  );
  await db.insert(curriculumFormItems).values(formItems);
  await db
    .insert(curriculumActivityForms)
    .values({ activityId, formVersionId, scopeId, moduleId: "M02" });
  const learningAssignmentId = randomUUID();
  await db.insert(learningAssignments).values({
    id: learningAssignmentId,
    participantId,
    scopeId,
    moduleId: "M02",
    availableAt: publishedAt,
    status: "DISPONIVEL",
  });
  await db.insert(activityAssignments).values({
    activityId,
    participantId,
    learningAssignmentId,
    status: "DISPONIVEL",
  });
  return {
    participantId,
    scopeId,
    activityId,
    formVersionId,
    blueprintVersionId,
    formItems,
    command: {
      participantId,
      activityId,
      scopeId,
      idempotencyKey: `native-start-${activityId}`,
      correlationId: randomUUID(),
    },
    dependencies: createAttemptUseCaseDependencies(
      harness.application.db,
      randomUUID,
    ),
  };
}
