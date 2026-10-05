import type { ModuleObligationTerminalWitness } from "../module-obligation-finalization.js";
import type { ApprovedModuleObligationCaptureInput } from "../module-obligation-validation.js";

const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

/** Synthetic terminal proof for the approved module fixture. No clinical data. */
export function terminalModuleWitnesses(
  input: ApprovedModuleObligationCaptureInput,
): readonly ModuleObligationTerminalWitness[] {
  const capturedAt = new Date("2026-09-28T13:00:00Z");
  const submittedAt = "2026-09-29T12:00:00.000Z";
  const terminalAt = new Date("2026-09-30T11:00:00Z");
  return input.captures.map((bound, index) => {
    const { form, blueprint, items } = bound.capture;
    const attemptId = uuid(900 + index);
    return {
      activityId: bound.activityId,
      learningAssignmentId: input.expected.assignmentId,
      formVersionId: form.id,
      capturedAt,
      terminalAt,
      attempt: {
        attemptId,
        participantId: input.expected.participantId,
        scopeId: input.expected.scopeId,
        moduleId: input.expected.moduleId,
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
        scopeId: input.expected.scopeId,
        action: "ATTEMPT_CORRECTED",
        resourceType: "attempt",
        resourceId: attemptId,
        outcome: "SUCCESS",
        occurredAt: terminalAt,
      },
    } satisfies ModuleObligationTerminalWitness;
  });
}
