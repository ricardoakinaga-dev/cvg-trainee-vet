export type MaintenanceWindowRequest = Readonly<{
  readonly changeId: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly approvedBy?: string;
  readonly approvedAt?: string;
}>;

export type ProtectedOperationalInterval = Readonly<{
  readonly intervalId: string;
  readonly startsAt: string;
  readonly endsAt: string;
}>;

export type MaintenanceWindowDecision = Readonly<{
  readonly changeId: string;
  readonly decision:
    | "APPROVED_OUTSIDE_CRITICAL_HOURS"
    | "REJECTED_CRITICAL_HOURS"
    | "REJECTED_APPROVAL";
  readonly overlaps: readonly string[];
}>;

function parse(value: string, field: string): number {
  if (value.trim().length === 0) throw new TypeError(`${field} is required`);
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) throw new TypeError(`${field} is invalid`);
  return timestamp;
}

function assertInterval(
  startsAt: string,
  endsAt: string,
  prefix: string,
): Readonly<{ readonly startsAt: number; readonly endsAt: number }> {
  const starts = parse(startsAt, `${prefix}.startsAt`);
  const ends = parse(endsAt, `${prefix}.endsAt`);
  if (ends <= starts)
    throw new RangeError(`${prefix} must have positive duration`);
  return Object.freeze({ startsAt: starts, endsAt: ends });
}

export function evaluateMaintenanceWindow(
  request: MaintenanceWindowRequest,
  protectedIntervals: readonly ProtectedOperationalInterval[],
): MaintenanceWindowDecision {
  if (request.changeId.trim().length === 0) {
    throw new TypeError("changeId is required");
  }
  const window = assertInterval(request.startsAt, request.endsAt, "window");
  if (protectedIntervals.length === 0) {
    throw new Error("critical operating intervals are not configured");
  }
  const overlaps = protectedIntervals
    .filter((interval) => {
      const protection = assertInterval(
        interval.startsAt,
        interval.endsAt,
        `interval.${interval.intervalId}`,
      );
      return (
        window.startsAt < protection.endsAt &&
        window.endsAt > protection.startsAt
      );
    })
    .map((interval) => interval.intervalId);
  const hasApproval =
    request.approvedBy !== undefined &&
    request.approvedBy.trim().length > 0 &&
    request.approvedAt !== undefined &&
    !Number.isNaN(Date.parse(request.approvedAt));
  return Object.freeze({
    changeId: request.changeId,
    decision:
      overlaps.length > 0
        ? "REJECTED_CRITICAL_HOURS"
        : hasApproval
          ? "APPROVED_OUTSIDE_CRITICAL_HOURS"
          : "REJECTED_APPROVAL",
    overlaps: Object.freeze(overlaps),
  });
}
