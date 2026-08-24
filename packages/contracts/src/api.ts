import { z } from "zod";

export const apiErrorCodeSchema = z.enum([
  "unauthenticated",
  "forbidden",
  "not_found",
  "validation_error",
  "state_conflict",
  "idempotency_conflict",
  "rate_limited",
  "internal_error",
]);

const requestIdSchema = z.string().trim().min(1).max(128);
const apiErrorDetailSchema = z
  .object({
    code: z.string().trim().min(1).max(64),
    field: z.string().trim().min(1).max(128).optional(),
  })
  .strict();
const paginationQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    per_page: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
export type ApiErrorDetail = z.infer<typeof apiErrorDetailSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export type ApiSuccessEnvelope<Data> = Readonly<{
  readonly success: true;
  readonly data: Data;
  readonly meta: Readonly<{
    readonly request_id: string;
    readonly has_next?: boolean;
    readonly next_cursor?: string;
  }>;
}>;

export type ApiErrorEnvelope = Readonly<{
  readonly success: false;
  readonly error: Readonly<{
    readonly code: ApiErrorCode;
    readonly message: string;
    readonly details: readonly ApiErrorDetail[];
  }>;
  readonly meta: Readonly<{ readonly request_id: string }>;
}>;

const publicMessages: Readonly<Record<ApiErrorCode, string>> = {
  unauthenticated: "A sessão não está autenticada.",
  forbidden: "Você não tem permissão para esta ação.",
  not_found: "O recurso solicitado não foi encontrado.",
  validation_error: "Revise os dados enviados.",
  state_conflict: "O recurso não está disponível para esta transição.",
  idempotency_conflict: "A chave da solicitação já foi usada com outros dados.",
  rate_limited: "Muitas tentativas. Aguarde e tente novamente.",
  internal_error: "Não foi possível concluir a solicitação.",
};

function assertRequestId(requestId: string): void {
  if (!requestIdSchema.safeParse(requestId).success) {
    throw new TypeError("requestId must be a non-empty bounded string");
  }
}

export function apiSuccessResponse<Data>(
  data: Data,
  requestId: string,
  pagination: Readonly<{
    readonly has_next?: boolean;
    readonly next_cursor?: string;
  }> = {},
): ApiSuccessEnvelope<Data> {
  assertRequestId(requestId);
  return Object.freeze({
    success: true as const,
    data,
    meta: Object.freeze({ request_id: requestId, ...pagination }),
  });
}

export function apiErrorResponse(
  code: ApiErrorCode,
  requestId: string,
  details: readonly ApiErrorDetail[] = [],
): ApiErrorEnvelope {
  assertRequestId(requestId);
  const parsedDetails = details.map((detail) =>
    apiErrorDetailSchema.parse(detail),
  );

  return Object.freeze({
    success: false as const,
    error: Object.freeze({
      code,
      message: publicMessages[code],
      details: Object.freeze(parsedDetails),
    }),
    meta: Object.freeze({ request_id: requestId }),
  });
}

export function parsePaginationQuery(value: unknown): PaginationQuery {
  return paginationQuerySchema.parse(value);
}
