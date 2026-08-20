import { describe, expect, it, vi } from "vitest";

import {
  loadPrometheusRuntimeSnapshot,
  validatePrometheusRuntime,
  verifyPrometheusRuntime,
} from "../../scripts/verify-prometheus-runtime.mjs";

const ruleNames = [
  "CvgCoreAvailabilityBreach",
  "CvgApiLatencyBreach",
  "CvgApiErrorRateBreach",
  "CvgIndexingFailures",
  "CvgAssistiveAiFailures",
  "CvgWorkerQueueBacklog",
  "CvgParticipantExperienceErrors",
  "CvgApiTargetDown",
  "CvgApiTargetAbsent",
  "CvgWorkerTargetDown",
  "CvgWorkerTargetAbsent",
  "CvgAlertmanagerDisconnected",
  "CvgObservabilityWatchdog",
  "CvgObservabilityWatchdogMissing",
];

function buildRule(name: string) {
  return { name, health: "ok", state: "inactive" };
}

function buildTarget(job: string, instance: string) {
  return {
    labels: { job, instance },
    health: "up",
    lastError: "",
  };
}

describe("Prometheus runtime verification", () => {
  it("accepts the loaded rules, healthy targets, Alertmanager and watchdog", () => {
    const result = validatePrometheusRuntime({
      rules: {
        groups: [
          {
            name: "cvg.operational",
            rules: ruleNames.map(buildRule),
          },
        ],
      },
      targets: {
        activeTargets: [
          buildTarget("cvg-api", "api-a:3000"),
          buildTarget("cvg-api", "api-b:3000"),
          buildTarget("cvg-worker", "worker-a:9091"),
          buildTarget("cvg-worker", "worker-b:9091"),
          buildTarget("alertmanager", "alertmanager:9093"),
        ],
      },
      alertmanagers: {
        activeAlertmanagers: [
          { url: "http://alertmanager:9093/api/v2/alerts" },
        ],
      },
      watchdog: {
        result: [
          {
            metric: {
              __name__: "ALERTS",
              alertname: "CvgObservabilityWatchdog",
              alertstate: "firing",
            },
          },
        ],
      },
    });

    expect(result).toMatchObject({
      status: "PASS",
      loadedRuleCount: 14,
      watchdog: "firing",
    });
    expect(result.errors).toEqual([]);
  });

  it("fails closed when a target is down or a rule is unhealthy", () => {
    const result = validatePrometheusRuntime({
      rules: {
        groups: [
          {
            name: "cvg.operational",
            rules: [
              ...ruleNames.slice(0, -1).map(buildRule),
              { name: "CvgObservabilityWatchdogMissing", health: "err" },
            ],
          },
        ],
      },
      targets: {
        activeTargets: [
          buildTarget("cvg-api", "api-a:3000"),
          { ...buildTarget("cvg-api", "api-b:3000"), health: "down" },
          buildTarget("cvg-worker", "worker-a:9091"),
          buildTarget("cvg-worker", "worker-b:9091"),
          buildTarget("alertmanager", "alertmanager:9093"),
        ],
      },
      alertmanagers: { activeAlertmanagers: [] },
      watchdog: { result: [] },
    });

    expect(result.status).toBe("FAIL");
    expect(result.errors.join("; ")).toContain(
      "target cvg-api/api-b:3000 is down",
    );
    expect(result.errors.join("; ")).toContain(
      "rule CvgObservabilityWatchdogMissing is unhealthy",
    );
    expect(result.errors.join("; ")).toContain(
      "Alertmanager has no active destination",
    );
    expect(result.errors.join("; ")).toContain("watchdog is not firing");
  });

  it("loads the four read-only Prometheus API endpoints", async () => {
    const fetchImpl = vi.fn(async (url: string) => ({
      ok: true,
      status: 200,
      json: async () => ({ status: "success", data: { url } }),
    }));

    const snapshot = await loadPrometheusRuntimeSnapshot(
      "http://prometheus:9090/",
      fetchImpl,
    );

    expect(fetchImpl).toHaveBeenCalledTimes(4);
    expect(snapshot.rules).toMatchObject({
      url: "http://prometheus:9090/api/v1/rules?type=alert",
    });
    expect(snapshot.targets).toMatchObject({
      url: "http://prometheus:9090/api/v1/targets?state=active",
    });
    expect(snapshot.alertmanagers).toMatchObject({
      url: "http://prometheus:9090/api/v1/alertmanagers",
    });
    expect(snapshot.watchdog.url).toContain(
      "/api/v1/query?query=ALERTS%7Balertname%3D%22CvgObservabilityWatchdog%22%2Calertstate%3D%22firing%22%7D",
    );
  });

  it("does not contact a runtime unless explicitly enabled", async () => {
    const fetchImpl = vi.fn();

    const result = await verifyPrometheusRuntime(
      { CVG_VERIFY_PROMETHEUS_RUNTIME: "false" },
      fetchImpl,
    );

    expect(result).toMatchObject({ status: "NOT_EXECUTED" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
