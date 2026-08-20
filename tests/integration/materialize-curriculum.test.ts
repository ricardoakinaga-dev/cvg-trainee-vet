import { describe, expect, it } from "vitest";

import {
  assertMembership,
  authoringItemForPersistence,
  createMaterializationReport,
  stableUuid,
} from "../../scripts/materialize-curriculum-support.mjs";

describe("curriculum materialization support", () => {
  it("builds deterministic identifiers and a bounded persistence report", () => {
    const first = stableUuid("curriculum:scope:module");
    const second = stableUuid("curriculum:scope:module");

    expect(first).toBe(second);
    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/u,
    );
    expect(
      createMaterializationReport(
        { modules: [{ moduleId: "M01" }, { moduleId: "M02" }] },
        {
          contentCount: 2,
          editorialCount: 2,
          activityCount: 2,
          activityItemCount: 2,
          assignmentCount: 2,
          runtimeCount: 2,
        },
      ),
    ).toEqual({
      success: true,
      modules: 2,
      contentInserted: 2,
      editorialInserted: 2,
      activitiesInserted: 2,
      activityItemsInserted: 2,
      assignmentsInserted: 2,
      runtimeStatesInserted: 2,
      contentStatus: "PROJECAO_VERIFICADA",
      activityStatus: "WITHDRAWN",
      assignmentStatus: "NAO_ATRIBUIDO",
      runtimeStatus: "PENDENTE",
    });
  });

  it("preserves authoring fields without mutating the source item", () => {
    const item = {
      title: "Synthetic title",
      prompt: "Synthetic prompt",
      responseMode: "TEXT",
      feedback: "Synthetic feedback",
      critical: false,
      remediationTargetObjectiveId: "OBJ-01",
      sourceRefs: ["SRC-01"],
      participant: { safe: true },
      internalOnly: "omit",
    };

    expect(authoringItemForPersistence(item)).toEqual({
      title: "Synthetic title",
      prompt: "Synthetic prompt",
      responseMode: "TEXT",
      feedback: "Synthetic feedback",
      critical: false,
      remediationTargetObjectiveId: "OBJ-01",
      sourceRefs: ["SRC-01"],
      participant: { safe: true },
    });
    expect(item.internalOnly).toBe("omit");
  });

  it("requires the expected account and scope", () => {
    expect(() =>
      assertMembership(
        { id: "author-1", scopes: ["scope-1"] },
        "author-1",
        "author",
        "scope-1",
      ),
    ).not.toThrow();
    expect(() =>
      assertMembership(
        { id: "author-1", scopes: ["scope-2"] },
        "author-1",
        "author",
        "scope-1",
      ),
    ).toThrow("author account is outside the requested scope");
  });
});
