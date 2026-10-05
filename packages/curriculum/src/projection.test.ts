import { describe, expect, expectTypeOf, it } from "vitest";
import { parseParticipantActivity } from "../../contracts/dist/learning.js";
import {
  b07DiagnosticDraftPack,
  preflightCurriculumDrafts,
} from "./learning-runtime.js";
import { toParticipantActivityFromDiagnosticDraft } from "./projection.js";
import type { ParticipantActivity } from "./types.js";

describe("diagnostic activity versus full internal catalog boundary", () => {
  it("rejects a full120 generic activity before emitting an invalid DTO", () => {
    expect(() =>
      toParticipantActivityFromDiagnosticDraft(b07DiagnosticDraftPack),
    ).toThrow(/100.*diagnostic.*catalog/iu);
  });
  it.each([0, 1, 40, 100])(
    "retains the unchanged activity DTO at %i bounded items",
    (count) => {
      const bounded = toParticipantActivityFromDiagnosticDraft({
        ...b07DiagnosticDraftPack,
        items: b07DiagnosticDraftPack.items.slice(0, count),
      });
      expectTypeOf(bounded).toEqualTypeOf<ParticipantActivity>();
      expect(parseParticipantActivity(bounded).items).toHaveLength(count);
      expect(bounded.items.every((item) => item.ordinal <= 100)).toBe(true);
    },
  );
  it("explicit internal overload preserves120 global IDs/ordinals and the three40 themes", () => {
    const internal = toParticipantActivityFromDiagnosticDraft(
      b07DiagnosticDraftPack,
      { boundary: "INTERNAL_DIAGNOSTIC_CATALOG" },
    );
    expectTypeOf(internal).not.toMatchTypeOf<ParticipantActivity>();
    expect(internal.items).toHaveLength(120);
    expect(internal.activity.activityId).toBe(
      "10000000-0000-4000-8000-000000000000",
    );
    expect(internal.items.map((item) => item.ordinal)).toEqual(
      Array.from({ length: 120 }, (_, index) => index + 1),
    );
    expect(internal.items[119]?.itemId).toBe(
      "10000000-0000-4000-8000-000000000120",
    );
    expect(
      ["B07-S1", "B07-S2", "B07-S3"].map(
        (session) =>
          b07DiagnosticDraftPack.items.filter(
            (item) => item.diagnosticSessionId === session,
          ).length,
      ),
    ).toEqual([40, 40, 40]);
    expect(() => parseParticipantActivity(internal)).toThrow();
    expect(JSON.stringify(internal)).not.toMatch(
      /correctChoiceIds|sourceRefs|rubric|critical|blueprint/iu,
    );
  });
  it("keeps preflight technical readiness separate from clinical publication", () => {
    const report = preflightCurriculumDrafts();
    expect(report.diagnostic).toMatchObject({
      technicalChecksPassed: true,
      itemCount: 120,
      itemsBySession: [40, 40, 40],
    });
    expect(report.readyForPublication).toBe(false);
    expect(report.clinicalApprovalPending).toBe(true);
    expect(b07DiagnosticDraftPack).toMatchObject({
      publicationAuthorized: false,
      status: "RASCUNHO",
      clinicalReview: "PENDENTE",
    });
  });
});
