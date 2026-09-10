import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const apiA = process.env.CVG_STAGING_API_A_URL?.trim();
const apiB = process.env.CVG_STAGING_API_B_URL?.trim();
const tlsUrl = process.env.CVG_STAGING_TLS_URL?.trim();
const evidenceDir = process.env.CVG_STAGING_EVIDENCE_DIR?.trim();
const spansFile = process.env.CVG_STAGING_OTEL_SPANS_FILE?.trim();

const stagingEnabled =
  apiA !== undefined &&
  apiB !== undefined &&
  tlsUrl !== undefined &&
  evidenceDir !== undefined;

describe.skipIf(!stagingEnabled)("staging-like stack verification", () => {
  it("serves readiness on both API replicas", async () => {
    for (const base of [apiA as string, apiB as string]) {
      const live = await fetch(`${base}/health/live`);
      expect(live.status).toBe(200);
      const ready = await fetch(`${base}/health/ready`);
      expect(ready.status).toBe(200);
    }
  });

  it("correlates an HTTP request to a collector span via traceparent", async () => {
    if (spansFile === undefined || spansFile.length === 0) return;
    const traceId = "0af7651916cd43dd8448eb211c80319c";
    let found = false;
    // Several spaced requests: the app flushes every 5s and the collector
    // batches before writing, so allow the full window for export.
    for (let attempt = 0; attempt < 10 && !found; attempt += 1) {
      const response = await fetch(`${apiA}/health/live`, {
        headers: { traceparent: `00-${traceId}-b7ad6b7169203331-01` },
      });
      expect(response.status).toBe(200);
      await new Promise((resolve) => setTimeout(resolve, 4000));
      const content = await readFile(spansFile, "utf8").catch(() => "");
      found = content.includes(traceId);
    }
    expect(found).toBe(true);
  }, 120000);

  it("emits Secure session-cookie attributes over real TLS", async () => {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    const response = await fetch(`${tlsUrl}/api/v1/session/revoke`, {
      method: "POST",
    });
    expect(response.status).toBe(200);
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("__Host-cvg_session=");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toMatch(/SameSite=(Lax|Strict)/u);
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("Max-Age=0");
  });

  it("shares one Postgres-backed rate budget across both replicas", async () => {
    // Unique route per run so the 120/min shared bucket starts empty.
    const probe = `/unknown-staging-probe-${Date.now().toString(36)}`;
    for (let index = 0; index < 60; index += 1) {
      await fetch(`${apiA}${probe}`);
      await fetch(`${apiB}${probe}`);
    }
    // 60+60 filled the shared bucket: the 121st request is denied on
    // EITHER replica, proving a single distributed budget.
    const deniedA = await fetch(`${apiA}${probe}`);
    const deniedB = await fetch(`${apiB}${probe}`);
    expect(deniedA.status).toBe(429);
    expect(deniedB.status).toBe(429);
    expect(deniedA.headers.get("retry-after")).toMatch(/^\d+$/u);
    expect(deniedB.headers.get("retry-after")).toMatch(/^\d+$/u);
  });

  it("denies unauthenticated access to internal routes on the stack", async () => {
    const internal = await fetch(`${apiA}/api/v1/internal/invitations`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ professionalEmail: "x@y.zz" }),
    });
    expect([401, 422]).toContain(internal.status);
    const session = await fetch(`${apiA}/api/v1/session/current`);
    expect(session.status).toBe(401);
  });

  it("keeps drill evidence complete and green", async () => {
    const names = [
      "drill-reconcile.json",
      "drill-qdrant-loss.json",
      "drill-backup-restore.json",
      "drill-failover.json",
      "drill-otel-outage.json",
    ];
    for (const name of names) {
      const raw = await readFile(`${evidenceDir}/${name}`, "utf8");
      const drill = JSON.parse(raw) as {
        status: string;
        name: string;
        reason?: string;
      };
      expect(["PASS", "SKIP"]).toContain(drill.status);
      if (drill.status === "SKIP") {
        expect(typeof drill.reason).toBe("string");
      }
    }
  });
});
