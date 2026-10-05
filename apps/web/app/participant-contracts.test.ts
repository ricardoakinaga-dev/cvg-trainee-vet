import { expect, it } from "vitest";
import {
  isRuntime,
  isActivity,
  isAttempt,
  isJourney,
  isCorrection,
  isParticipantAppeal,
  isParticipantAppeals,
  isParticipantFeedbackTicket,
  isParticipantFeedback,
  isParticipantDashboard,
  type ActivityProjection,
  type AttemptProjection,
  type LearningJourneyProjection,
} from "./participant-contracts";
import { participantActivityProjectionSchema } from "@cvg/contracts";
import { participantAttemptProjectionSchema } from "@cvg/contracts";
import { participantLearningJourneyProjectionSchema } from "@cvg/contracts";
import { dashboardProjectionSchema } from "@cvg/contracts";
import {
  participantAppealProjectionSchema,
  participantAppealsProjectionSchema,
  participantFeedbackTicketProjectionSchema,
  participantFeedbackTicketsProjectionSchema,
} from "@cvg/contracts";

const activityId = "11111111-1111-4111-8111-111111111111";
const attemptId = "22222222-2222-4222-8222-222222222222";
const itemId = "33333333-3333-4333-8333-333333333333";
const publicTicket = {
  ticketId: activityId,
  type: "MELHORIA",
  description: "Relato sintético público",
  createdAt: "2026-10-04T03:00:00.000Z",
  status: "NOVO",
  version: 0,
};
const publicAppeal = {
  appealId: activityId,
  attemptId,
  itemId,
  createdAt: "2026-10-04T03:00:00.000Z",
  dueAt: "2026-10-12T03:00:00.000Z",
  status: "ABERTA",
  version: 0,
};
it("R27 distinguishes strict public create receipts from list DTOs", () => {
  expect(isParticipantFeedbackTicket(publicTicket)).toBe(true);
  expect(isParticipantFeedback({ tickets: [publicTicket] })).toBe(true);
  expect(isParticipantFeedbackTicket({ tickets: [publicTicket] })).toBe(false);
  expect(isParticipantFeedback(publicTicket)).toBe(false);
  expect(isParticipantAppeal(publicAppeal)).toBe(true);
  expect(isParticipantAppeals({ appeals: [publicAppeal] })).toBe(true);
  expect(isParticipantAppeal({ appeals: [publicAppeal] })).toBe(false);
  expect(isParticipantAppeals(publicAppeal)).toBe(false);
});
it.each([
  { sourceRefs: ["PRIVATE_SYNTHETIC"] },
  { ticketId: "invalid" },
  { createdAt: "invalid" },
  { status: "ABERTO" },
  { description: "<b>synthetic markup</b>" },
  { description: " " },
  { description: "x".repeat(10_001) },
  { type: "INTERNAL_ONLY" },
  { version: -1 },
  { version: 0.5 },
])("R27 rejects canonical-invalid feedback receipt and list %j", (change) => {
  const ticket = { ...publicTicket, ...change };
  const list = { tickets: [ticket] };
  expect(
    participantFeedbackTicketProjectionSchema.safeParse(ticket).success,
  ).toBe(false);
  expect(
    participantFeedbackTicketsProjectionSchema.safeParse(list).success,
  ).toBe(false);
  expect(isParticipantFeedbackTicket(ticket)).toBe(false);
  expect(isParticipantFeedback(list)).toBe(false);
});
it.each([
  { reviewerId: "PRIVATE_SYNTHETIC" },
  { appealId: "invalid" },
  { attemptId: "invalid" },
  { itemId: "invalid" },
  { createdAt: "invalid" },
  { dueAt: "invalid" },
  { status: "INTERNAL_ONLY" },
  { decision: "INTERNAL_ONLY" },
  { version: -1 },
  { version: 0.5 },
])("R27 rejects canonical-invalid appeal receipt and list %j", (change) => {
  const appeal = { ...publicAppeal, ...change };
  const list = { appeals: [appeal] };
  expect(participantAppealProjectionSchema.safeParse(appeal).success).toBe(
    false,
  );
  expect(participantAppealsProjectionSchema.safeParse(list).success).toBe(
    false,
  );
  expect(isParticipantAppeal(appeal)).toBe(false);
  expect(isParticipantAppeals(list)).toBe(false);
});
it("R27 rejects private list fields and lists beyond the public bound", () => {
  expect(isParticipantFeedback({ tickets: [], sourceRefs: [] })).toBe(false);
  expect(isParticipantAppeals({ appeals: [], reviewerId: activityId })).toBe(
    false,
  );
  expect(
    isParticipantFeedback({ tickets: Array(100).fill(publicTicket) }),
  ).toBe(true);
  expect(isParticipantAppeals({ appeals: Array(100).fill(publicAppeal) })).toBe(
    true,
  );
  expect(
    isParticipantFeedback({ tickets: Array(101).fill(publicTicket) }),
  ).toBe(false);
  expect(isParticipantAppeals({ appeals: Array(101).fill(publicAppeal) })).toBe(
    false,
  );
});
const activity = {
  activityId,
  slug: "synthetic",
  title: "Synthetic",
  items: [
    {
      itemId,
      ordinal: 1,
      kind: "QUESTAO",
      title: "Synthetic item",
      text: "Synthetic text",
      responseMode: "TEXT",
    },
  ],
};
const attempt = {
  attemptId,
  activityId,
  version: 3,
  status: "SALVA",
  answers: [
    { itemId, response: "Original", savedAt: "2026-10-03T12:00:00.000Z" },
  ],
};
const journey = {
  assignments: [],
  activities: [
    {
      activityId,
      slug: "synthetic",
      title: "Synthetic",
      status: "EM_ANDAMENTO",
      attemptId,
      attemptStatus: "SALVA",
      attemptVersion: 3,
      nextAction: "RETOMAR_ATIVIDADE",
    },
  ],
  results: [],
  runtimes: [],
  nextAction: "RETOMAR_ATIVIDADE",
  nextActionTarget: { kind: "ACTIVITY", activityId },
};
it("R14 canonical public DTO types and guards remain compatible", () => {
  const parsedActivity = participantActivityProjectionSchema.parse(activity);
  const parsedJourney =
    participantLearningJourneyProjectionSchema.parse(journey);
  if (!isActivity(parsedActivity) || !isJourney(parsedJourney)) {
    throw new Error(
      "Canonical producers must satisfy participant consumer guards",
    );
  }
  const a: ActivityProjection = parsedActivity;
  const t: AttemptProjection =
    participantAttemptProjectionSchema.parse(attempt);
  const j: LearningJourneyProjection = parsedJourney;
  expect(isActivity(a)).toBe(true);
  expect(isAttempt(t)).toBe(true);
  expect(isJourney(j)).toBe(true);
});
it.each([
  { ordinal: -1 },
  { ordinal: 1.5 },
  { ordinal: Number.MAX_SAFE_INTEGER + 1 },
  { answer_key: "PRIVATE_SYNTHETIC" },
  { kind: "INTERNAL_RUBRIC" },
  { title: "" },
])("R14 rejects canonical-invalid activity item %j", (change) => {
  const value = { ...activity, items: [{ ...activity.items[0], ...change }] };
  expect(participantActivityProjectionSchema.safeParse(value).success).toBe(
    false,
  );
  expect(isActivity(value)).toBe(false);
});
it.each([-1, 1.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1])(
  "R14 rejects attempt version %s",
  (version) => {
    const value = { ...attempt, version };
    expect(participantAttemptProjectionSchema.safeParse(value).success).toBe(
      false,
    );
    expect(isAttempt(value)).toBe(false);
  },
);
it.each([
  { ...attempt, answer_key: "PRIVATE_SYNTHETIC" },
  {
    ...attempt,
    answers: [{ ...attempt.answers[0], rubric_internal: "PRIVATE_SYNTHETIC" }],
  },
  { ...attempt, answers: [{ itemId, response: "Original" }] },
  { ...attempt, answers: [{ ...attempt.answers[0], itemId: "invalid" }] },
])("R14 rejects invalid public answer DTO %j", (value) => {
  expect(participantAttemptProjectionSchema.safeParse(value).success).toBe(
    false,
  );
  expect(isAttempt(value)).toBe(false);
});
it.each([
  { attemptVersion: undefined },
  { status: "INTERNAL_ONLY" },
  { source: "PRIVATE_SYNTHETIC" },
  { attemptVersion: Number.MAX_SAFE_INTEGER + 1 },
])("R14 rejects partial or private journey metadata %j", (change) => {
  const value = {
    ...journey,
    activities: [{ ...journey.activities[0], ...change }],
  };
  expect(
    participantLearningJourneyProjectionSchema.safeParse(value).success,
  ).toBe(false);
  expect(isJourney(value)).toBe(false);
});
it("R14 correction strictly rejects private fields and unsafe versions", () => {
  const value = {
    attemptStatus: "CORRIGIDA_AUTOMATICAMENTE",
    attemptVersion: 3,
    resultVersion: 1,
    score: 80,
    outcome: "APROVADO",
    feedback: "Synthetic",
  };
  expect(isCorrection(value)).toBe(true);
  expect(isCorrection({ ...value, answer_key: "PRIVATE_SYNTHETIC" })).toBe(
    false,
  );
  expect(
    isCorrection({ ...value, attemptVersion: Number.MAX_SAFE_INTEGER + 1 }),
  ).toBe(false);
});
it.each([30, 60, 90, 7])(
  "T19 accepts only approved retention day %s",
  (day) => {
    expect(
      isRuntime({
        moduleId: "M02",
        version: 1,
        status: "DOMINIO_DIGITAL",
        nextAction: "REVISAR_RETENCAO",
        remediationCount: 0,
        retentionReviews: [
          { day, dueAt: "2026-10-03T12:00:00.000Z", status: "PENDENTE" },
        ],
        practicalCompetenceClaim: "PROIBIDO_MVP",
      }),
    ).toBe(day !== 7);
  },
);
function fullDashboard() {
  const projection = dashboardProjectionSchema.parse({
    kind: "participant",
    nextAction: "RETOMAR_ATIVIDADE",
    path: [
      {
        moduleId: "M01",
        month: 1,
        status: "EM_ANDAMENTO",
        nextAction: "RETOMAR_MODULO",
      },
    ],
    profile: [
      {
        moduleId: "M01",
        month: 1,
        competence: "Competência sintética",
        status: "EM_DESENVOLVIMENTO_DIGITAL",
        scorePercent: 50,
        lastEvaluatedAt: "2026-10-04T07:00:00.000Z",
        evidence: "AVALIACAO_MODULAR_DIGITAL",
        practicalCompetenceClaim: "PROIBIDO_MVP",
      },
    ],
    diagnosticProfile: (["B07-S1", "B07-S2", "B07-S3"] as const).map(
      (themeId) => ({
        themeId,
        themeLabel: "Tema sintético",
        status: "BASELINE_REGISTRADA",
        scorePercent: 50,
        answeredItemCount: 1,
        itemCount: 40,
        recommendedModuleIds: ["M01"],
        lastEvaluatedAt: "2026-10-04T07:00:00.000Z",
        evidence: "DIAGNOSTICO_FORMATIVO_DIGITAL",
        notPunitive: true,
        noGlobalPassFail: true,
        practicalCompetenceClaim: "PROIBIDO_MVP",
      }),
    ),
    progress: {
      assignedActivities: 1,
      completedActivities: 0,
      progressPercent: 0,
      remediationObjectives: 0,
      retentionReviewsPending: 0,
      pendingCorrections: 0,
    },
  });
  if (projection.kind !== "participant")
    throw new Error("Expected synthetic participant dashboard");
  return projection;
}
it("R58 accepts full producer dashboard and optional diagnostic-free dashboard", () => {
  const full = fullDashboard();
  expect(isParticipantDashboard(full)).toBe(true);
  const { diagnosticProfile: omitted, ...minimal } = full;
  expect(omitted).toHaveLength(3);
  expect(dashboardProjectionSchema.safeParse(minimal).success).toBe(true);
  expect(isParticipantDashboard(minimal)).toBe(true);
});
for (const field of ["source", "answer_key", "rubric_internal"] as const) {
  it.each([
    "root",
    "path",
    "profile",
    "diagnosticProfile",
    "progress",
  ] as const)(
    `R58 rejects extra ${field} at dashboard %s boundary`,
    (boundary) => {
      const full = fullDashboard();
      const extra = { [field]: "PRIVATE_SYNTHETIC" };
      const invalid =
        boundary === "root"
          ? { ...full, ...extra }
          : boundary === "progress"
            ? { ...full, progress: { ...full.progress, ...extra } }
            : {
                ...full,
                [boundary]: full[boundary]!.map((item) => ({
                  ...item,
                  ...extra,
                })),
              };
      expect(dashboardProjectionSchema.safeParse(invalid).success).toBe(false);
      expect(isParticipantDashboard(invalid)).toBe(false);
    },
  );
}
it.each([
  { nextAction: "PRIVATE_ACTION" },
  { profile: [{ ...fullDashboard().profile[0], competence: "" }] },
  { profile: [{ ...fullDashboard().profile[0], lastEvaluatedAt: "invalid" }] },
  {
    path: [
      {
        ...fullDashboard().path[0],
        status: "PAUSADO",
        nextAction: "RETOMAR_MODULO",
      },
    ],
  },
  {
    diagnosticProfile: [
      { ...fullDashboard().diagnosticProfile![0], themeLabel: "" },
    ],
  },
])("R58 rejects canonical-invalid dashboard metadata %j", (change) => {
  const invalid = { ...fullDashboard(), ...change };
  expect(dashboardProjectionSchema.safeParse(invalid).success).toBe(false);
  expect(isParticipantDashboard(invalid)).toBe(false);
});
it("R58 participant guard rejects a valid staff dashboard", () => {
  const staff = dashboardProjectionSchema.parse({
    kind: "staff",
    scopes: ["synthetic"],
    generatedAt: "2026-10-04T07:00:00.000Z",
    metrics: {
      invitedParticipants: 0,
      activeParticipants: 0,
      inactiveParticipants: 0,
      assignedModules: 0,
      completedModules: 0,
      completionRatePercent: null,
      medianProgressPercent: null,
      pendingCorrections: 0,
      remediationParticipants: 0,
      retentionReviewsPending: 0,
      openFeedback: 0,
      content: { published: 0, inReview: 0, expired: 0, withdrawn: 0 },
    },
    participants: [],
  });
  expect(isParticipantDashboard(staff)).toBe(false);
});
