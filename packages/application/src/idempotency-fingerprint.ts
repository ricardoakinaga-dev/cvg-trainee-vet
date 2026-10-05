/** Request identity excludes server-generated times; old records remain replayable. */
export function matchesIdempotencyFingerprint(
  stored: string,
  semantic: string,
  persistedTime?: Readonly<{
    field: "savedAt" | "submittedAt";
    value: string;
  }>,
): boolean {
  if (stored === semantic) return true;
  if (persistedTime === undefined) return false;

  // semantic is serialized by the application, never supplied as raw client JSON.
  const request = JSON.parse(semantic) as Readonly<Record<string, string>>;
  return (
    stored ===
    JSON.stringify({ ...request, [persistedTime.field]: persistedTime.value })
  );
}
