import { describe, expect, it } from "vitest";
import type { LearningAssignmentState } from "@cvg/domain";
import {
  isAssignmentOperationallyAvailable,
  isUnstartedAssignmentAvailable,
} from "./journey-assignment-eligibility.js";

const availableAt = "2026-10-04T02:00:00.000Z";
const now = Date.parse(availableAt);
const base: LearningAssignmentState = {
  assignmentId: "synthetic-assignment",
  participantId: "synthetic-participant",
  moduleId: "M01",
  status: "ATRIBUIDO",
  version: 1,
  availableAt,
};
describe("unstarted assignment uses server availability clock", () => {
  it.each(["PAUSADO", "BLOQUEADO", "NAO_ATRIBUIDO"] as const)(
    "keeps %s operationally unavailable despite elapsed time",
    (status) => {
      expect(isAssignmentOperationallyAvailable({ ...base, status })).toBe(
        false,
      );
    },
  );
  it.each([
    "EM_ANDAMENTO",
    "EM_REFORCO",
    "CONCLUIDO",
    "CONCLUIDO_COM_RETENCAO_PENDENTE",
  ] as const)(
    "preserves authorized %s continuity independently of an unstarted availability clock",
    (status) => {
      expect(
        isAssignmentOperationallyAvailable({
          ...base,
          status,
          availableAt: "2099-10-05T12:00:00.000Z",
        }),
      ).toBe(true);
    },
  );
  it.each(["ATRIBUIDO", "DISPONIVEL"] as const)(
    "uses the server clock for operational %s eligibility",
    (status) => {
      expect(
        isAssignmentOperationallyAvailable({
          ...base,
          status,
          availableAt: "2099-10-05T12:00:00.000Z",
        }),
      ).toBe(false);
      expect(
        isAssignmentOperationallyAvailable({
          ...base,
          status,
          availableAt: "2026-09-01T00:00:00.000Z",
        }),
      ).toBe(true);
    },
  );

  it.each(["ATRIBUIDO", "DISPONIVEL"] as const)(
    "%s admits availability equality and elapsed time",
    (status) => {
      const assignment = { ...base, status };
      expect(isUnstartedAssignmentAvailable(assignment, now)).toBe(true);
      expect(isUnstartedAssignmentAvailable(assignment, now + 1)).toBe(true);
      expect(isUnstartedAssignmentAvailable(assignment, now - 1)).toBe(false);
    },
  );
  it.each([
    "NAO_ATRIBUIDO",
    "EM_ANDAMENTO",
    "EM_REFORCO",
    "CONCLUIDO",
    "CONCLUIDO_COM_RETENCAO_PENDENTE",
    "PAUSADO",
    "BLOQUEADO",
  ] as const)("does not substitute availability for %s authority", (status) => {
    expect(isUnstartedAssignmentAvailable({ ...base, status }, now)).toBe(
      false,
    );
  });
  it.each(["", "invalid", "2099-10-05T12:00:00.000Z"])(
    "rejects unproved/future time %s",
    (availableAt) => {
      expect(
        isUnstartedAssignmentAvailable({ ...base, availableAt }, now),
      ).toBe(false);
    },
  );
  it.each([NaN, Infinity, -Infinity])(
    "rejects invalid server time %s",
    (clock) => {
      expect(isUnstartedAssignmentAvailable(base, clock)).toBe(false);
    },
  );
});
