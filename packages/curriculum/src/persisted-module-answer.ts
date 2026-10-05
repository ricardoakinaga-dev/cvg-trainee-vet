import type { ModuleAnswer } from "./learning-runtime.js";

export type PersistedModuleAnswerItem = Readonly<{
  itemId: string;
  responseMode: "CHOICE" | "TEXT";
  selectionMode?: "SINGLE" | "MULTIPLE";
  choices?: readonly Readonly<{ id: string }>[];
}>;

export function decodePersistedModuleAnswer(
  item: PersistedModuleAnswerItem,
  response: string,
): ModuleAnswer {
  const value = response.trim();
  if (
    item.itemId.trim().length === 0 ||
    value.length === 0 ||
    value.length > 10_000 ||
    /<[^>]*>/u.test(value)
  )
    throw new Error("Persisted response must be valid plain text");
  if (item.responseMode === "TEXT")
    return Object.freeze({ itemId: item.itemId, text: value });
  if (item.responseMode !== "CHOICE")
    throw new Error("Frozen published response mode is unsupported");
  const choices = item.choices;
  if (
    choices === undefined ||
    choices.length < 2 ||
    new Set(choices.map((choice) => choice.id)).size !== choices.length
  )
    throw new Error("Frozen published choice metadata is required");
  let selected: readonly string[];
  if (item.selectionMode === "SINGLE") {
    selected = [value];
  } else if (item.selectionMode === "MULTIPLE") {
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new Error("Persisted MULTIPLE response must be a JSON ID array");
    }
    if (
      !Array.isArray(parsed) ||
      parsed.length === 0 ||
      !parsed.every(
        (id): id is string => typeof id === "string" && id.trim().length > 0,
      )
    )
      throw new Error("Persisted MULTIPLE response must contain choice IDs");
    selected = parsed;
  } else {
    throw new Error("Frozen published selection mode is required");
  }
  const allowed = new Set(choices.map((choice) => choice.id));
  if (
    new Set(selected).size !== selected.length ||
    selected.some((id) => !allowed.has(id))
  )
    throw new Error(
      "Persisted response contains duplicated or unknown choices",
    );
  return Object.freeze({
    itemId: item.itemId,
    selectedChoiceIds: Object.freeze([...selected]),
  });
}
