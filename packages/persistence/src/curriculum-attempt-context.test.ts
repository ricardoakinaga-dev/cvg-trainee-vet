import type { SQL } from "drizzle-orm";
import { describe, it, expect, vi } from "vitest";
import { setCurriculumAttemptContext } from "./curriculum-attempt-context.js";

const context = {
  participantId: "11111111-1111-4111-8111-111111111111",
  scopeId: "22222222-2222-4222-8222-222222222222",
  activityId: "33333333-3333-4333-8333-333333333333",
  attemptId: "44444444-4444-4444-8444-444444444444",
};
describe("internal curriculum transaction context", () => {
  it.each(["participantId", "scopeId", "activityId", "attemptId"] as const)(
    "rejects missing or invalid %s before executing SQL",
    async (field) => {
      for (const value of [undefined, "", "invalid", " "]) {
        const execute = vi.fn(async () => []);
        await expect(
          setCurriculumAttemptContext({ execute }, {
            ...context,
            [field]: value,
          } as typeof context),
        ).rejects.toThrow("UUID");
        expect(execute).not.toHaveBeenCalled();
      }
    },
  );
  it("clears unrelated identities before enabling only the exact native attempt", async () => {
    const execute = vi.fn(async (_query: SQL) => []);
    await setCurriculumAttemptContext({ execute }, context);
    expect(execute).toHaveBeenCalledTimes(2);
    const base = JSON.stringify(execute.mock.calls[0]?.[0]);
    const internal = JSON.stringify(execute.mock.calls[1]?.[0]);
    for (const name of [
      "service_role",
      "session_token_hash",
      "audit_read",
      "audit_write",
      "curriculum_activity_id",
      "curriculum_attempt_id",
    ])
      expect(base).toContain(`set_config('cvg.${name}', '', true)`);
    expect(internal).toContain(context.activityId);
    expect(internal).toContain(context.attemptId);
    expect(internal).not.toContain("service_role");
  });
});
