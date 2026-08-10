export type ApplicationErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "validation_error"
  | "state_conflict"
  | "idempotency_conflict"
  | "rate_limited"
  | "internal_error";

export type ApplicationErrorDetail = Readonly<{
  readonly code: string;
  readonly field?: string;
}>;

const statusByCode: Readonly<Record<ApplicationErrorCode, number>> = {
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  validation_error: 422,
  state_conflict: 409,
  idempotency_conflict: 409,
  rate_limited: 429,
  internal_error: 500,
};

export class ApplicationError extends Error {
  public readonly code: ApplicationErrorCode;
  public readonly status: number;
  public readonly details: readonly ApplicationErrorDetail[];

  public constructor(
    code: ApplicationErrorCode,
    message: string,
    details: readonly ApplicationErrorDetail[] = [],
  ) {
    super(message);
    this.name = "ApplicationError";
    this.code = code;
    this.status = statusByCode[code];
    this.details = Object.freeze([...details]);
  }
}

export function toApplicationError(error: unknown): ApplicationError {
  if (error instanceof ApplicationError) return error;

  return new ApplicationError(
    "internal_error",
    "Unexpected application failure",
  );
}
