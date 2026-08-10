import { expect, it } from "vitest";

import {
  b07Blueprint,
  createM02ContentSeed,
  curriculumV3,
  hospitalTrainingBlueprint,
  moduleAssessmentBlueprints,
  m02Assessment,
  toParticipantActivity,
} from "../../packages/curriculum/src/index.js";
import { parseParticipantActivity } from "../../packages/contracts/src/index.js";

it("materializes the 24-month curriculum and its session cadence", () => {
  expect(curriculumV3.modules).toHaveLength(24);
  expect(
    curriculumV3.modules.every((module) => module.sessions.length === 4),
  ).toBe(true);
  expect(
    curriculumV3.modules.flatMap((module) => module.sessions),
  ).toHaveLength(96);
  expect(curriculumV3.totalMinutes).toBe(149 * 60);
  expect(new Set(curriculumV3.modules.map((module) => module.month)).size).toBe(
    24,
  );
  expect(hospitalTrainingBlueprint.sequence).toEqual([
    "BASELINE",
    "MICROLEARNING",
    "CASO_PROGRESSIVO",
    "SIMULACAO_DIGITAL",
    "DEBRIEFING",
    "RETENCAO_ESPACADA",
    "TRANSFERENCIA_PILOTO",
  ]);
  expect(
    curriculumV3.modules.every(
      (module) =>
        module.hospitalTraining.spacedReviewDays.join(",") === "7,30,90" &&
        module.hospitalTraining.assessmentModes.includes("SIMULACAO_DIGITAL") &&
        module.hospitalTraining.assessmentModes.includes("RETENCAO_ESPACADA") &&
        module.hospitalTraining.transferMetric.id.length > 0 &&
        module.hospitalTraining.masteryRule.knowledgeMinimumPercent === 70,
    ),
  ).toBe(true);
  expect(
    curriculumV3.modules.find((module) => module.id === "M02"),
  ).toMatchObject({
    hospitalTraining: {
      audiences: ["VETERINARIO", "ENFERMAGEM_TECNICO", "MULTIPROFISSIONAL"],
      assessmentModes: expect.arrayContaining([
        "RACIOCINIO_CASO",
        "DEBRIEFING",
      ]),
      hospitalBehaviors: expect.arrayContaining([
        "priorizacao_ABCDE",
        "reavaliacao_e_escalonamento",
      ]),
    },
  });
  expect(moduleAssessmentBlueprints).toHaveLength(24);
  expect(
    moduleAssessmentBlueprints.every(
      (blueprint) =>
        blueprint.questionTotal >= 31 &&
        blueprint.openResponseCount >= 2 &&
        blueprint.objectiveIds.length === 3 &&
        blueprint.publicationAuthorized === true &&
        blueprint.assessmentModes.includes("DEBRIEFING"),
    ),
  ).toBe(true);
  expect(
    moduleAssessmentBlueprints.find((item) => item.moduleId === "M02"),
  ).toMatchObject({
    questionCountsBySession: [11, 6, 8, 6],
    questionTotal: 31,
    openResponseCount: 2,
    publicProjectionReady: true,
  });
});

it("builds the M02 question bank and B-07 diagnostic blueprint", () => {
  expect(m02Assessment.moduleId).toBe("M02");
  expect(m02Assessment.questions).toHaveLength(31);
  expect(m02Assessment.openResponses).toHaveLength(2);
  expect(
    m02Assessment.questions.every(
      (question) =>
        question.feedback.length > 0 &&
        question.correctChoiceIds.length > 0 &&
        question.sourceRefs.length > 0,
    ),
  ).toBe(true);
  expect(b07Blueprint.items).toHaveLength(120);
  expect(
    ["B07-S1", "B07-S2", "B07-S3"].map(
      (sessionId) =>
        b07Blueprint.items.filter((item) => item.sessionId === sessionId)
          .length,
    ),
  ).toEqual([40, 40, 40]);
});

it("projects M02 without internal source, answer-key, or rubric fields", () => {
  const projection = parseParticipantActivity(
    toParticipantActivity(m02Assessment),
  );
  const serialized = JSON.stringify(projection);

  expect(projection.items).toHaveLength(33);
  expect(serialized).not.toMatch(
    /source|chapter|page|answer|rubric|critical|pdf/iu,
  );
  expect(projection.items.some((item) => item.responseMode === "CHOICE")).toBe(
    true,
  );
});

it("prepares M02 persistence rows after automatic source verification", () => {
  const seed = createM02ContentSeed("44444444-4444-4444-8444-444444444444");

  expect(seed.activity.status).toBe("PUBLISHED");
  expect(seed.contentVersions).toHaveLength(33);
  expect(seed.activityItems).toHaveLength(33);
  expect(
    seed.contentVersions.every((content) => content.status === "PUBLICADO"),
  ).toBe(true);
  expect(
    seed.contentVersions.some(
      (content) =>
        content.responseMode === "CHOICE" &&
        content.participantOptions !== undefined &&
        content.participantSelectionMode === "MULTIPLE",
    ),
  ).toBe(true);
  expect(JSON.stringify(seed)).not.toMatch(
    /source|chapter|page|answer|rubric|critical|pdf/iu,
  );
});
