import { describe, expect, it } from "vitest";

import {
  parseAccountSecurity,
  parseOperationsDashboard,
  parseParticipantDashboard,
} from "./dashboard.js";

function roadmap() {
  return Array.from({ length: 24 }, (_, index) => ({
    moduleId: `M${String(index + 1).padStart(2, "0")}`,
    month: index + 1,
    title: `Módulo ${index + 1}`,
    competence: "Competência digital sintética.",
    sessionCount: 4 as const,
    status:
      index === 0
        ? ("DISPONIVEL" as const)
        : ("BLOQUEADO_PRE_REQUISITO" as const),
    nextAction: index === 0 ? "INICIAR_BASELINE" : "CONCLUIR_PRE_REQUISITO",
  }));
}

describe("dashboard public contracts", () => {
  it("accepts the complete participant roadmap and operational dashboard", () => {
    const participant = parseParticipantDashboard({
      curriculumId: "curriculum-v3",
      curriculumVersion: "3.0.0",
      totalMonths: 24,
      totalModules: 24,
      completedModules: 0,
      progressPercent: 0,
      activeModuleId: "M01",
      nextAction: "INICIAR_BASELINE",
      roadmap: roadmap(),
    });
    expect(participant.roadmap).toHaveLength(24);

    const operations = parseOperationsDashboard({
      dependencyStatus: "READY",
      dependencies: { postgres: "UP", qdrant: "DISABLED", ai: "DISABLED" },
      metrics: { requestsTotal: 10, errorsTotal: 1, p95DurationMs: null },
      evidence: {
        collector: "VERIFIED",
        retention: "VERIFIED",
        traces: "NOT_EXECUTED",
        load: "VERIFIED",
        failover: "NOT_CONFIGURED",
        replicas: "VERIFIED",
      },
    });
    expect(operations.metrics.p95DurationMs).toBeNull();

    expect(
      parseAccountSecurity({
        provider: "EXTERNAL_IDENTITY_PROVIDER",
        recovery: "AVAILABLE",
        mfa: "ENABLED",
        session: "ACTIVE",
      }),
    ).toMatchObject({ provider: "EXTERNAL_IDENTITY_PROVIDER" });
  });

  it("rejects duplicate roadmap ids, markup actions and unknown fields", () => {
    const duplicateRoadmap = roadmap();
    duplicateRoadmap[1] = { ...duplicateRoadmap[1]!, moduleId: "M01" };
    expect(() =>
      parseParticipantDashboard({
        curriculumId: "curriculum-v3",
        curriculumVersion: "3.0.0",
        totalMonths: 24,
        totalModules: 24,
        completedModules: 0,
        progressPercent: 0,
        nextAction: "<script>unsafe</script>",
        roadmap: duplicateRoadmap,
      }),
    ).toThrow();

    expect(() =>
      parseOperationsDashboard({
        dependencyStatus: "READY",
        dependencies: { postgres: "UP", qdrant: "DISABLED", ai: "DISABLED" },
        metrics: { requestsTotal: 0, errorsTotal: 0, p95DurationMs: null },
        evidence: {
          collector: "VERIFIED",
          retention: "VERIFIED",
          traces: "NOT_EXECUTED",
          load: "VERIFIED",
          failover: "NOT_CONFIGURED",
          replicas: "VERIFIED",
        },
        internalSource: "must-not-cross-boundary",
      }),
    ).toThrow();
  });
});
