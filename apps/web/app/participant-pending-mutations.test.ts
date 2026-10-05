import { describe, expect, it, vi } from "vitest";
import { ParticipantPendingMutations } from "./participant-pending-mutations";

const rejection = {
  success: false,
  error: { code: "validation_error", message: "Synthetic explicit rejection" },
};
describe("pinned participant mutation bytes (no scheduling or automatic sends)", () => {
  it("pins one original snapshot per operation through arbitrary later edits and retries", () => {
    const pending = new ParticipantPendingMutations(),
      key = vi.fn(() => "synthetic-original");
    const original = pending.prepare(
      "answer:attempt:item",
      { response: "Original" },
      key,
    );
    pending.markAmbiguous(original);
    for (let i = 0; i < 100; i++) {
      const edited = pending.prepare(
        "answer:attempt:item",
        { response: `Newer draft ${i}` },
        key,
      );
      expect(edited.body).toBe(original.body);
      expect(edited.key).toBe(original.key);
      pending.markAmbiguous(edited);
    }
    expect(key).toHaveBeenCalledTimes(1);
    expect(pending.get(original.operation)?.ambiguous).toBe(true);
    expect(
      pending.prepare(original.operation, { response: "Original" }, key).body,
    ).toBe(original.body);
  });
  it("snapshots exact wire JSON before nested caller edits without retaining mutable objects", () => {
    const pending = new ParticipantPendingMutations(),
      payload = { response: "Original", nested: ["a", "b"] };
    const snapshot = pending.prepare(
      "answer:a:i",
      payload,
      () => "synthetic-key",
    );
    payload.nested.push("changed");
    payload.response = "Changed";
    expect(snapshot.body).toBe(
      '{"response":"Original","nested":["a","b"],"idempotencyKey":"synthetic-key"}',
    );
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(pending.get(snapshot.operation)?.body).toBe(snapshot.body);
  });
  it("keeps independent item/attempt/operation snapshots separate", () => {
    const pending = new ParticipantPendingMutations();
    const a = pending.prepare("answer:a:item", { response: "A" }, () => "a"),
      b = pending.prepare("answer:b:item", { response: "B" }, () => "b");
    pending.markAmbiguous(a);
    pending.complete(b);
    expect(pending.get(a.operation)?.body).toBe(a.body);
    expect(pending.get(b.operation)).toBeUndefined();
  });
  it("allows a new payload/key only after the exact original is confirmed", () => {
    const pending = new ParticipantPendingMutations();
    const a = pending.prepare(
      "answer:a:i",
      { response: "Original" },
      () => "old-key",
    );
    pending.markAmbiguous(a);
    pending.complete(a);
    const b = pending.prepare(
      a.operation,
      { response: "Newer dirty draft" },
      () => "new-key",
    );
    expect(b.body).not.toBe(a.body);
    expect(b.key).toBe("new-key");
    pending.complete(a);
    pending.markAmbiguous(a);
    expect(pending.get(b.operation)).toEqual(b);
  });
  it("clears only an exact current snapshot after an explicit valid 422 validation rejection", () => {
    const pending = new ParticipantPendingMutations();
    const snapshot = pending.prepare(
      "answer:a:i",
      { response: "Invalid" },
      () => "old-key",
    );
    pending.markAmbiguous(snapshot);
    expect(pending.rejectValidation(snapshot, 422, rejection)).toBe(true);
    expect(pending.get(snapshot.operation)).toBeUndefined();
    const corrected = pending.prepare(
      snapshot.operation,
      { response: "Corrected" },
      () => "new-key",
    );
    expect(pending.rejectValidation(snapshot, 422, rejection)).toBe(false);
    expect(pending.get(corrected.operation)).toEqual(corrected);
  });
  it.each([
    [undefined, rejection],
    [500, rejection],
    [503, rejection],
    [200, rejection],
    [404, rejection],
    [422, null],
    [422, []],
    [422, {}],
    [422, { success: true, error: rejection.error }],
    [422, { success: false, error: { code: "validation_error" } }],
    [
      422,
      { success: false, error: { code: "validation_error", message: " " } },
    ],
    [422, { success: false, error: { code: "validation_error", message: 3 } }],
    [
      422,
      {
        success: false,
        error: { code: "internal_error", message: "Synthetic" },
      },
    ],
  ])(
    "cannot treat status=%s malformed/network/non2xx/5xx evidence as no-save",
    (status, body) => {
      const pending = new ParticipantPendingMutations();
      const snapshot = pending.prepare(
        "answer:a:i",
        { response: "Original" },
        () => "stable-key",
      );
      pending.markAmbiguous(snapshot);
      expect(
        pending.rejectValidation(
          snapshot,
          typeof status === "number" ? status : undefined,
          body,
        ),
      ).toBe(false);
      expect(pending.get(snapshot.operation)?.body).toBe(snapshot.body);
      expect(pending.get(snapshot.operation)?.ambiguous).toBe(true);
    },
  );
  it("ignores a stale forged receipt for the same key with different serialized bytes", () => {
    const pending = new ParticipantPendingMutations();
    const original = pending.prepare(
      "answer:a:i",
      { response: "Original" },
      () => "stable-key",
    );
    const forged = { ...original, body: '{"response":"Forged"}' };
    pending.markAmbiguous(forged);
    pending.complete(forged);
    expect(pending.rejectValidation(forged, 422, rejection)).toBe(false);
    expect(pending.get(original.operation)).toEqual(original);
  });
  it("requires an operation/key and owns the key instead of a payload hint", () => {
    const pending = new ParticipantPendingMutations(),
      key = vi.fn(() => "generated");
    expect(() => pending.prepare(" ", {}, key)).toThrow(
      "Mutation operation required",
    );
    expect(key).not.toHaveBeenCalled();
    expect(() => pending.prepare("answer:a:i", {}, () => " ")).toThrow(
      "Mutation key required",
    );
    expect(
      JSON.parse(
        pending.prepare("answer:a:i", { idempotencyKey: "payload-hint" }, key)
          .body,
      ),
    ).toEqual({ idempotencyKey: "generated" });
  });
});
