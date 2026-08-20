import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildObservabilityGovernanceReport,
  loadObservabilityGovernanceSnapshot,
  validateObservabilitySignal,
  validateObservabilityGovernance,
} from "../../scripts/verify-observability-governance.mjs";

const root = resolve(process.cwd());

describe("observability governance", () => {
  it("accepts the versioned signal, dashboard, alert and runbook contract", async () => {
    const snapshot = await loadObservabilityGovernanceSnapshot(root);
    const errors = validateObservabilityGovernance(snapshot);

    expect(errors).toEqual([]);
    expect(buildObservabilityGovernanceReport(snapshot)).toMatchObject({
      signalCount: 8,
      alertCount: 14,
      runbookCount: 1,
      externalEvidenceRequired: true,
      productionAcknowledgement: "NOT_CONFIGURED",
    });
  });

  it("rejects missing signal ownership, runbooks and PII in alert rules", async () => {
    const paths = [
      "observability-governance.json",
      "infra/observability/grafana/dashboards/cvg-overview.json",
      "infra/observability/prometheus-alerts.yml",
      "BRIEFING/08.RUNTIME/0804_observability_operational_contract.md",
      "apps/api/src/server.ts",
      "apps/api/src/server-http.ts",
      "apps/worker/src/loop.ts",
      "apps/worker/src/handlers.ts",
    ];
    const entries = await Promise.all(
      paths.map(
        async (path) =>
          [path, await readFile(resolve(root, path), "utf8")] as const,
      ),
    );
    const snapshot = new Map(entries);
    const policy = JSON.parse(
      snapshot.get("observability-governance.json") ?? "{}",
    ) as {
      signals?: Array<Record<string, unknown>>;
    };
    if (policy.signals?.[0] !== undefined) {
      policy.signals[0] = {
        ...policy.signals[0],
        owner: "",
        runbook: "docs/missing.md",
      };
    }
    snapshot.set("observability-governance.json", JSON.stringify(policy));
    snapshot.set(
      "infra/observability/prometheus-alerts.yml",
      `${snapshot.get("infra/observability/prometheus-alerts.yml") ?? ""}\nparticipantId: forbidden\n`,
    );

    const errors = validateObservabilityGovernance(snapshot);

    expect(errors.join(";")).toContain("owner");
    expect(errors.join(";")).toContain("runbook");
    expect(errors.join(";")).toContain("PII");
  });

  it("keeps signal instrumentation validation independently composable", async () => {
    const snapshot = await loadObservabilityGovernanceSnapshot(root);
    const policy = JSON.parse(
      snapshot.get("observability-governance.json") ?? "{}",
    ) as { signals?: Array<Record<string, unknown>> };
    const dashboard = JSON.parse(
      snapshot.get(
        "infra/observability/grafana/dashboards/cvg-overview.json",
      ) ?? "{}",
    ) as Record<string, unknown>;
    const signal = policy.signals?.[0];

    expect(signal).toBeDefined();
    expect(
      validateObservabilitySignal(signal ?? {}, dashboard, snapshot),
    ).toEqual([]);
    expect(
      validateObservabilitySignal(
        { ...signal, instrumentationMarkers: ["marker.not.present"] },
        dashboard,
        snapshot,
      ),
    ).toContain(
      "observability signal api_availability marker is not instrumented: marker.not.present",
    );
  });

  it("requires loss-of-signal coverage for workers and Alertmanager", async () => {
    const snapshot = await loadObservabilityGovernanceSnapshot(root);
    const alertRules = snapshot.get(
      "infra/observability/prometheus-alerts.yml",
    );

    expect(alertRules).toContain("CvgApiTargetDown");
    expect(alertRules).toContain("CvgApiTargetAbsent");
    expect(alertRules).toContain("CvgWorkerTargetDown");
    expect(alertRules).toContain("CvgWorkerTargetAbsent");
    expect(alertRules).toContain("CvgAlertmanagerDisconnected");
    expect(alertRules).toContain("CvgObservabilityWatchdog");
    expect(alertRules).toContain("CvgObservabilityWatchdogMissing");
  });
});
