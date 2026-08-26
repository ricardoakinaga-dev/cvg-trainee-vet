import { describe, expect, it, vi } from "vitest";

import { runReconcileCommand } from "./reconcile-command-runner.js";

describe("reconcile command runner", () => {
  it("waits for optional initialization before reconciling", async () => {
    const events: string[] = [];
    const result = { expected: 1, upserted: 1, removed: 0 } as const;
    const initialize = vi.fn(
      async (options?: { waitForOptionalDependencies?: boolean }) => {
        events.push("initialize");
        expect(options).toEqual({ waitForOptionalDependencies: true });
      },
    );
    const reconcile = vi.fn(async () => {
      events.push("reconcile");
      return result;
    });

    await expect(
      runReconcileCommand({ initialize, reconcile }),
    ).resolves.toEqual(result);
    expect(events).toEqual(["initialize", "reconcile"]);
  });
});
