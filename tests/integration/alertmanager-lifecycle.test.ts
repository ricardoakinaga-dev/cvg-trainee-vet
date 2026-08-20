import { describe, expect, it, vi } from "vitest";

import {
  validateAlertLifecycle,
  verifyAlertmanagerLifecycle,
} from "../../scripts/verify-alertmanager-lifecycle.mjs";

const alertName = "CvgB99204SyntheticProbe";

describe("Alertmanager lifecycle verification", () => {
  it("accepts firing, acknowledged and resolved synthetic snapshots", () => {
    const result = validateAlertLifecycle({
      alertName,
      active: [
        {
          labels: { alertname: alertName },
          status: { state: "active", silencedBy: [] },
        },
      ],
      acknowledged: [
        {
          labels: { alertname: alertName },
          status: { state: "suppressed", silencedBy: ["silence-1"] },
        },
      ],
      resolved: [],
    });

    expect(result).toEqual({
      status: "PASS",
      phases: {
        firing: "observed",
        acknowledged: "observed",
        resolved: "observed",
      },
      errors: [],
    });
  });

  it("fails closed when acknowledgement or resolution is absent", () => {
    const result = validateAlertLifecycle({
      alertName,
      active: [
        { labels: { alertname: alertName }, status: { state: "active" } },
      ],
      acknowledged: [
        {
          labels: { alertname: alertName },
          status: { state: "active", silencedBy: [] },
        },
      ],
      resolved: [
        { labels: { alertname: alertName }, status: { state: "active" } },
      ],
    });

    expect(result.status).toBe("FAIL");
    expect(result.errors.join("; ")).toContain("acknowledgement");
    expect(result.errors.join("; ")).toContain("resolve");
  });

  it("does not contact Alertmanager unless explicitly enabled", async () => {
    const fetchImpl = vi.fn();

    const result = await verifyAlertmanagerLifecycle(
      { CVG_VERIFY_ALERTMANAGER_LIFECYCLE: "false" },
      fetchImpl,
    );

    expect(result).toMatchObject({ status: "NOT_EXECUTED" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
