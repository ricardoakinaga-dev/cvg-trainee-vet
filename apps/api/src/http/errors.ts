import {
  apiErrorResponse,
  type ApiErrorCode,
  type ApiErrorEnvelope,
  type ApiSuccessEnvelope,
} from "@cvg/contracts";

export type ApiHttpResponse = Readonly<{
  readonly status: number;
  readonly body: ApiSuccessEnvelope<unknown> | ApiErrorEnvelope;
  readonly headers?: Readonly<Record<string, string>>;
}>;

export const statusByErrorCode: Readonly<Record<ApiErrorCode, number>> =
  Object.freeze({
    unauthenticated: 401,
    forbidden: 403,
    not_found: 404,
    validation_error: 422,
    state_conflict: 409,
    idempotency_conflict: 409,
    rate_limited: 429,
    internal_error: 500,
  });

export function validationResponse(
  requestId: string,
  field?: string,
): ApiHttpResponse {
  return {
    status: 422,
    body: apiErrorResponse(
      "validation_error",
      requestId,
      field ? [{ code: "invalid_input", field }] : [],
    ),
  };
}

export function errorResponse(
  code: ApiErrorCode,
  requestId: string,
  status = statusByErrorCode[code],
): ApiHttpResponse {
  return { status, body: apiErrorResponse(code, requestId) };
}
