import { expect, it } from "vitest";
import { authorizedJourneyTarget } from "./participant-journey-actions";
const activities = Array.from({ length: 4 }, (_, index) => ({
  activityId: `synthetic-${index}`,
  slug: `synthetic-${index}`,
  title: `Activity ${index}`,
  status: "DISPONIVEL",
  nextAction: "INICIAR_ATIVIDADE",
}));
it("finds only the server-selected activity even after three preview entries", () => {
  expect(
    authorizedJourneyTarget(activities, "INICIAR_ATIVIDADE", {
      kind: "ACTIVITY",
      activityId: "synthetic-3",
    }),
  ).toBe(activities[3]);
});
it.each([
  "CONSULTAR_PROXIMO_PASSO",
  "AGUARDAR_CORRECAO_HUMANA",
  "REVISAR_RETENCAO",
])("does not invent an activity action for %s", (action) => {
  expect(
    authorizedJourneyTarget(activities, action, {
      kind: "ACTIVITY",
      activityId: "synthetic-3",
    }),
  ).toBeUndefined();
});
it("rejects absent, unbound or empty-list targets", () => {
  expect(
    authorizedJourneyTarget(activities, "INICIAR_ATIVIDADE", undefined),
  ).toBeUndefined();
  expect(
    authorizedJourneyTarget(activities, "INICIAR_ATIVIDADE", {
      kind: "ACTIVITY",
      activityId: "foreign",
    }),
  ).toBeUndefined();
  expect(
    authorizedJourneyTarget([], "INICIAR_ATIVIDADE", {
      kind: "ACTIVITY",
      activityId: "synthetic-3",
    }),
  ).toBeUndefined();
});
