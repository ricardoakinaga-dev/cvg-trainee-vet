import { describe, expect, it, vi } from "vitest";

import {
  buildLiveIntegrationPlan,
  buildLiveTestEnvironment,
  executeLiveIntegration,
} from "../../scripts/live-integration-environment.mjs";

const ADMIN_URL =
  "postgresql://postgres:synthetic-admin@127.0.0.1:5432/cvg?sslmode=disable";
const TOKEN = "0".repeat(24);

describe("live integration environment", () => {
  it("requires an explicit PostgreSQL admin URL without a runtime fallback", () => {
    expect(() =>
      buildLiveIntegrationPlan(
        {
          CVG_TEST_DATABASE_URL:
            "postgresql://runtime:synthetic@127.0.0.1:5432/cvg",
        },
        TOKEN,
      ),
    ).toThrow("CVG_TEST_ADMIN_DATABASE_URL is required");
    expect(() =>
      buildLiveIntegrationPlan(
        { CVG_TEST_ADMIN_DATABASE_URL: "mysql://admin@example.invalid/cvg" },
        TOKEN,
      ),
    ).toThrow("must use PostgreSQL");
  });

  it("builds a disposable database and distinct restricted role URLs", () => {
    const plan = buildLiveIntegrationPlan(
      { CVG_TEST_ADMIN_DATABASE_URL: ADMIN_URL },
      TOKEN,
    );

    expect(plan).toMatchObject({
      databaseName: `cvg_live_${TOKEN}`,
      apiRoleName: `cvg_live_api_${TOKEN}`,
      workerRoleName: `cvg_live_worker_${TOKEN}`,
    });
    expect(new URL(plan.adminDatabaseUrl).pathname).toBe(`/cvg_live_${TOKEN}`);
    expect(new URL(plan.apiDatabaseUrl).username).toBe(`cvg_live_api_${TOKEN}`);
    expect(new URL(plan.workerDatabaseUrl).username).toBe(
      `cvg_live_worker_${TOKEN}`,
    );
    expect(plan.apiDatabaseUrl).not.toBe(plan.workerDatabaseUrl);
    expect(Object.isFrozen(plan)).toBe(true);
  });

  it("exports every live URL and never preserves caller runtime identities", () => {
    const plan = buildLiveIntegrationPlan(
      { CVG_TEST_ADMIN_DATABASE_URL: ADMIN_URL },
      TOKEN,
    );
    const environment = buildLiveTestEnvironment(
      {
        CVG_TEST_DATABASE_URL: "postgresql://shared.invalid/unsafe",
        CVG_TEST_WORKER_DATABASE_URL: "postgresql://shared.invalid/unsafe",
      },
      plan,
      { includeQdrant: false, includeRestore: false },
    );

    expect(environment).toMatchObject({
      DATABASE_URL: plan.apiDatabaseUrl,
      CVG_TEST_ADMIN_DATABASE_URL: plan.adminDatabaseUrl,
      CVG_TEST_DATABASE_URL: plan.apiDatabaseUrl,
      CVG_TEST_WORKER_DATABASE_URL: plan.workerDatabaseUrl,
      CVG_RUN_LIVE_DB_TESTS: "true",
      CVG_RUN_LIVE_RESTORE_TESTS: "false",
      CVG_RUN_LIVE_QDRANT_TESTS: "false",
    });
  });

  it("provisions, migrates and grants before Vitest, then always cleans up", async () => {
    const operations: string[] = [];
    const runCommand = vi.fn(async (operation: { readonly id: string }) => {
      operations.push(operation.id);
    });

    await executeLiveIntegration({
      environment: { CVG_TEST_ADMIN_DATABASE_URL: ADMIN_URL },
      token: TOKEN,
      runCommand,
    });

    expect(operations).toEqual([
      "provision",
      "migrate",
      "grant",
      "verify-identities",
      "vitest",
      "cleanup",
    ]);
  });

  it("cleans up roles and database when migration or Vitest fails", async () => {
    for (const failingOperation of ["migrate", "vitest"]) {
      const operations: string[] = [];
      const runCommand = vi.fn(async (operation: { readonly id: string }) => {
        operations.push(operation.id);
        if (operation.id === failingOperation) {
          throw new Error(`synthetic ${failingOperation} failure`);
        }
      });

      await expect(
        executeLiveIntegration({
          environment: { CVG_TEST_ADMIN_DATABASE_URL: ADMIN_URL },
          token: TOKEN,
          runCommand,
        }),
      ).rejects.toThrow(`synthetic ${failingOperation} failure`);
      expect(operations.at(-1)).toBe("cleanup");
    }
  });

  it("fails closed if cleanup fails after an otherwise successful run", async () => {
    const runCommand = vi.fn(async (operation: { readonly id: string }) => {
      if (operation.id === "cleanup") {
        throw new Error("synthetic cleanup failure");
      }
    });

    await expect(
      executeLiveIntegration({
        environment: { CVG_TEST_ADMIN_DATABASE_URL: ADMIN_URL },
        token: TOKEN,
        runCommand,
      }),
    ).rejects.toThrow("synthetic cleanup failure");
  });
});
