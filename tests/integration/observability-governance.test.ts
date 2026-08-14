import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildObservabilityGovernanceReport,
  loadObservabilityGovernanceSnapshot,
  validateObservabilityGovernance,
} from "../../scripts/verify-observability-governance.mjs";

const root = resolve(process.cwd());

describe("observability governance", () => {
  it("accepts the versioned signal, dashboard, alert and runbook contract", async () => {
    const snapshot = await loadObservabilityGovernanceSnapshot(root);
    const errors = validateObservabilityGovernance(snapshot);

    expect(errors).toEqual([]);
    expect(buildObservabilityGovernanceReport(snapshot)).toMatchObject({
      signalCount: 7,
      alertCount: 7,
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
});
