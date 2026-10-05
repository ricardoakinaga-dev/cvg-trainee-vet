import { describe, expect, it } from "vitest";
import {
  decodePersistedModuleAnswer,
  type PersistedModuleAnswerItem,
} from "./persisted-module-answer.js";

const single: PersistedModuleAnswerItem = {
  itemId: "synthetic-item",
  responseMode: "CHOICE",
  selectionMode: "SINGLE",
  choices: [{ id: "a" }, { id: "b" }],
};
const multiple = { ...single, selectionMode: "MULTIPLE" as const };
describe("persisted curriculum response decoding", () => {
  it("decodes the existing SINGLE raw ID and MULTIPLE JSON ID array contracts", () => {
    expect(decodePersistedModuleAnswer(single, "a")).toEqual({
      itemId: single.itemId,
      selectedChoiceIds: ["a"],
    });
    expect(decodePersistedModuleAnswer(multiple, '["a","b"]')).toEqual({
      itemId: single.itemId,
      selectedChoiceIds: ["a", "b"],
    });
    expect(
      decodePersistedModuleAnswer(
        { itemId: "synthetic-text", responseMode: "TEXT" },
        "Resposta sintética.",
      ),
    ).toEqual({ itemId: "synthetic-text", text: "Resposta sintética." });
  });
  it.each(["[]", '["a","a"]', '["unknown"]', "[1]", "{}", "a", '["a"'])(
    "rejects malformed or ambiguous MULTIPLE response %s",
    (response) => {
      expect(() => decodePersistedModuleAnswer(multiple, response)).toThrow();
    },
  );
  it("refuses missing frozen mode, unknown SINGLE IDs and invalid TEXT", () => {
    expect(() =>
      decodePersistedModuleAnswer(
        {
          itemId: single.itemId,
          responseMode: "CHOICE",
          choices: single.choices ?? [],
        },
        "a",
      ),
    ).toThrow();
    expect(() => decodePersistedModuleAnswer(single, '["a"]')).toThrow();
    expect(() => decodePersistedModuleAnswer(single, "unknown")).toThrow();
    expect(() =>
      decodePersistedModuleAnswer({ itemId: "text", responseMode: "TEXT" }, ""),
    ).toThrow();
    expect(() =>
      decodePersistedModuleAnswer(
        { itemId: "text", responseMode: "TEXT" },
        "<script>bad</script>",
      ),
    ).toThrow();
    expect(() =>
      decodePersistedModuleAnswer(
        { itemId: "text", responseMode: "TEXT" },
        "x".repeat(10_001),
      ),
    ).toThrow();
  });
  it("rejects incomplete or unsupported frozen item metadata", () => {
    const unsupported = { ...single };
    Object.defineProperty(unsupported, "responseMode", { value: "NONE" });
    expect(() => decodePersistedModuleAnswer(unsupported, "a")).toThrow(
      "unsupported",
    );
    expect(() =>
      decodePersistedModuleAnswer({ ...single, choices: [{ id: "a" }] }, "a"),
    ).toThrow("metadata");
    expect(() =>
      decodePersistedModuleAnswer(
        { ...single, choices: [{ id: "a" }, { id: "a" }] },
        "a",
      ),
    ).toThrow("metadata");
    expect(() =>
      decodePersistedModuleAnswer(
        {
          itemId: single.itemId,
          responseMode: "CHOICE",
          selectionMode: "SINGLE",
        },
        "a",
      ),
    ).toThrow("metadata");
    expect(() =>
      decodePersistedModuleAnswer({ ...single, itemId: "" }, "a"),
    ).toThrow("plain text");
    expect(
      decodePersistedModuleAnswer(
        { itemId: "synthetic-text", responseMode: "TEXT" },
        '["a"]',
      ),
    ).toEqual({ itemId: "synthetic-text", text: '["a"]' });
  });
});
