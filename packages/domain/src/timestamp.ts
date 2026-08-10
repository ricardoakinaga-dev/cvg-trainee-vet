const isoInstantPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/u;

export function isValidIsoTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    isoInstantPattern.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}
