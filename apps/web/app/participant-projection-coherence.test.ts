import { expect, it } from "vitest";
import {
  ParticipantProjectionCoherence,
  sameParticipantAttemptContext,
  isContextualParticipantCorrection,
  isContextualParticipantAppeal,
} from "./participant-projection-coherence";
import type {
  AttemptProjection,
  CorrectionProjection,
  ParticipantAppealProjection,
} from "./participant-contracts";

const identity = { activityId: "activity", attemptId: "attempt" };
function projection(
  version = 2,
  status = "SALVA",
  response = "saved",
): AttemptProjection {
  return {
    ...identity,
    version,
    status,
    answers: [{ itemId: "item", response }],
  };
}
const corrected = projection(7, "CORRIGIDA_AUTOMATICAMENTE");
const result: CorrectionProjection = {
  attemptStatus: "CORRIGIDA_AUTOMATICAMENTE",
  attemptVersion: 7,
  resultVersion: 1,
  score: 100,
  outcome: "APROVADO",
  feedback: "Synthetic.",
};
const row: ParticipantAppealProjection = {
  appealId: "appeal",
  attemptId: "attempt",
  itemId: "item",
  status: "ABERTA",
  version: 0,
  createdAt: "2026-10-03T12:00:00.000Z",
  dueAt: "2026-10-04T12:00:00.000Z",
};

it("read floor retains a matching acknowledged answer on lower GET", () => {
  const cache = new ParticipantProjectionCoherence();
  cache.read(projection(), projection());
  const ack = projection(3, "SALVA", "acknowledged");
  cache.acknowledge(ack);
  expect(cache.read(projection(), projection())).toBe(ack);
});
it("R25 original saved receipt cannot lower a newer client-accepted in-progress read", () => {
  const cache = new ParticipantProjectionCoherence();
  cache.read(projection(4), projection(4));
  const newer = projection(7, "EM_ANDAMENTO", "later");
  cache.read(newer, projection(4));
  expect(cache.acknowledge(projection(5, "SALVA", "original"))).toBe(newer);
  expect(cache.current).toBe(newer);
});
it.each(["activityId", "attemptId"] as const)(
  "read rejects foreign %s",
  (field) => {
    const cache = new ParticipantProjectionCoherence();
    expect(() =>
      cache.read({ ...projection(), [field]: "foreign" }, projection()),
    ).toThrow();
  },
);
it.each([
  [7, "SALVA", 7, "SUBMETIDA"],
  [8, "SALVA", 7, "SUBMETIDA"],
  [6, "SUBMETIDA", 7, "SUBMETIDA"],
  [8, "CORRIGIDA_HUMANAMENTE", 7, "CORRIGIDA_AUTOMATICAMENTE"],
])(
  "read rejects incompatible v%i %s against v%i %s",
  (version, status, expectedVersion, expectedStatus) => {
    const cache = new ParticipantProjectionCoherence();
    expect(() =>
      cache.read(
        projection(version, status),
        projection(expectedVersion, expectedStatus),
      ),
    ).toThrow();
  },
);
it.each([
  ["SALVA", "EM_ANDAMENTO"],
  ["SUBMETIDA", "CORRIGIDA_AUTOMATICAMENTE"],
  ["SUBMETIDA", "CORRIGIDA_HUMANAMENTE"],
  ["AGUARDA_CORRECAO_HUMANA", "CORRIGIDA_HUMANAMENTE"],
  ["SUBMETIDA", "ANULADA"],
])(
  "read accepts actual forward %s to %s with nonconsecutive versions",
  (from, to) => {
    const cache = new ParticipantProjectionCoherence();
    const next = projection(12, to);
    expect(cache.read(next, projection(2, from))).toBe(next);
  },
);
it("same-version contradictory answer cannot overwrite known snapshot", () => {
  const cache = new ParticipantProjectionCoherence();
  cache.read(projection(), projection());
  expect(() =>
    cache.read(projection(2, "SALVA", "changed"), projection()),
  ).toThrow();
});
it("original terminal receipt3 remains valid after compatible read8 without reopening on later GET", () => {
  const cache = new ParticipantProjectionCoherence();
  cache.read(projection(8), projection());
  const original = projection(3, "SUBMETIDA");
  expect(cache.acknowledge(original)).toBe(original);
  expect(() => cache.read(projection(8), projection())).toThrow();
  expect(cache.current).toBe(original);
});
it("older answer acknowledgment cannot downgrade a newer terminal read", () => {
  const cache = new ParticipantProjectionCoherence();
  cache.read(corrected, projection());
  expect(cache.acknowledge(projection(3))).toBe(corrected);
});
it("clear releases resource knowledge for a different valid identity", () => {
  const cache = new ParticipantProjectionCoherence();
  cache.acknowledge(corrected);
  cache.clear();
  expect(cache.current).toBeNull();
  const next = { ...projection(), attemptId: "next" };
  expect(cache.read(next, next)).toBe(next);
});
it.each(["activityId", "attemptId", "version", "status"] as const)(
  "context equality binds %s",
  (field) => {
    expect(sameParticipantAttemptContext(corrected, corrected)).toBe(true);
    expect(sameParticipantAttemptContext(null, corrected)).toBe(false);
    const next = { ...corrected, [field]: field === "version" ? 8 : "foreign" };
    expect(sameParticipantAttemptContext(next, corrected)).toBe(false);
  },
);
it.each([
  { ...result, attemptStatus: "CORRIGIDA_HUMANAMENTE" },
  { ...result, attemptVersion: 1 },
  { ...result, attemptVersion: 8 },
] satisfies readonly CorrectionProjection[])(
  "correction rejects mismatched server attempt context %j",
  (value) => {
    expect(isContextualParticipantCorrection(value, corrected, corrected)).toBe(
      false,
    );
  },
);
it.each([
  null,
  { ...corrected, attemptId: "foreign" },
  { ...corrected, activityId: "foreign" },
  projection(8, corrected.status),
])("correction rejects missing/replaced current attempt %j", (current) => {
  expect(isContextualParticipantCorrection(result, corrected, current)).toBe(
    false,
  );
});
it("matching correction uses independent resultVersion and full attempt context", () => {
  expect(
    isContextualParticipantCorrection(
      { ...result, resultVersion: 42 },
      corrected,
      corrected,
    ),
  ).toBe(true);
});
it.each([
  { ...row, attemptId: "foreign" },
  { ...row, itemId: "foreign" },
])("appeal rejects foreign identity %j", (value) => {
  expect(
    isContextualParticipantAppeal(value, corrected, corrected, ["item"]),
  ).toBe(false);
});
it("appeal receipt binds dispatched item and current attempt", () => {
  expect(
    isContextualParticipantAppeal(
      row,
      corrected,
      corrected,
      ["item", "other"],
      "other",
    ),
  ).toBe(false);
  expect(
    isContextualParticipantAppeal(
      row,
      corrected,
      projection(8, corrected.status),
      ["item"],
      "item",
    ),
  ).toBe(false);
  expect(
    isContextualParticipantAppeal(row, corrected, corrected, ["item"], "item"),
  ).toBe(true);
});
