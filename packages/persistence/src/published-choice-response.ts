export function hasCanonicalChoiceResponseEncoding(
  choiceIds: readonly string[],
  selectionMode: "SINGLE" | "MULTIPLE",
): boolean {
  if (selectionMode !== "SINGLE" && selectionMode !== "MULTIPLE") return false;
  const containsMarkup = (value: string): boolean => /<[^>]*>/u.test(value);
  if (choiceIds.some(containsMarkup)) return false;
  if (selectionMode === "SINGLE") return true;
  // Any markup crossing JSON elements appears in an ordered pair. Check both
  // orders because checkbox selections preserve the user's selection order.
  return !choiceIds.some((left, leftIndex) =>
    choiceIds.some(
      (right, rightIndex) =>
        leftIndex !== rightIndex &&
        containsMarkup(JSON.stringify([left, right])),
    ),
  );
}
