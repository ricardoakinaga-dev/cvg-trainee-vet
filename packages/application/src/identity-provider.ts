import { ApplicationError } from "./errors.js";

export type IdentityProviderSecurityStatus = Readonly<{
  readonly provider: "EXTERNAL_IDENTITY_PROVIDER" | "NOT_CONFIGURED";
  readonly recovery: "AVAILABLE" | "UNAVAILABLE";
  readonly mfa: "ENABLED" | "NOT_ENABLED" | "UNAVAILABLE";
}>;

export type IdentityProviderOperation = Readonly<{
  readonly operationId: string;
  readonly expiresAt: string;
}>;

export interface IdentityProviderPort {
  readonly getSecurityStatus: (
    principalId: string,
  ) => Promise<IdentityProviderSecurityStatus>;
  readonly beginRecovery: (
    principalId: string,
  ) => Promise<IdentityProviderOperation>;
  readonly beginMfaEnrollment: (
    principalId: string,
  ) => Promise<IdentityProviderOperation>;
  readonly verifyMfaEnrollment: (
    principalId: string,
    operationId: string,
    verificationCode: string,
  ) => Promise<IdentityProviderOperation>;
  readonly completeRecovery: (
    principalId: string,
    operationId: string,
    verificationCode: string,
  ) => Promise<IdentityProviderOperation>;
}

function assertPrincipalId(principalId: string): void {
  if (typeof principalId !== "string" || principalId.trim().length === 0) {
    throw new ApplicationError("validation_error", "principalId is required");
  }
}

function assertOpaqueValue(value: string, name: string): void {
  if (
    typeof value !== "string" ||
    value.trim().length === 0 ||
    value.length > 256 ||
    hasControlCharacter(value)
  ) {
    throw new ApplicationError("validation_error", `${name} is invalid`);
  }
}

function hasControlCharacter(value: string): boolean {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || codePoint === 0x7f;
  });
}

function notConfigured(): ApplicationError {
  return new ApplicationError(
    "state_conflict",
    "Identity provider is not configured",
  );
}

export function createUnavailableIdentityProvider(): IdentityProviderPort {
  return Object.freeze({
    getSecurityStatus: async (principalId: string) => {
      assertPrincipalId(principalId);
      return Object.freeze({
        provider: "NOT_CONFIGURED" as const,
        recovery: "UNAVAILABLE" as const,
        mfa: "UNAVAILABLE" as const,
      });
    },
    beginRecovery: async (principalId: string) => {
      assertPrincipalId(principalId);
      throw notConfigured();
    },
    beginMfaEnrollment: async (principalId: string) => {
      assertPrincipalId(principalId);
      throw notConfigured();
    },
    verifyMfaEnrollment: async (
      principalId: string,
      operationId: string,
      verificationCode: string,
    ) => {
      assertPrincipalId(principalId);
      assertOpaqueValue(operationId, "operationId");
      assertOpaqueValue(verificationCode, "verificationCode");
      throw notConfigured();
    },
    completeRecovery: async (
      principalId: string,
      operationId: string,
      verificationCode: string,
    ) => {
      assertPrincipalId(principalId);
      assertOpaqueValue(operationId, "operationId");
      assertOpaqueValue(verificationCode, "verificationCode");
      throw notConfigured();
    },
  });
}

type IdentityProviderFetch = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

type IdentityProviderOptions = Readonly<{
  readonly baseUrl: string;
  readonly bearerToken: string;
  readonly fetchImpl?: IdentityProviderFetch;
}>;

function assertProviderOptions(options: IdentityProviderOptions): void {
  if (!/^https:\/\//u.test(options.baseUrl)) {
    throw new ApplicationError(
      "validation_error",
      "Identity provider URL must use HTTPS",
    );
  }
  if (options.bearerToken.trim().length === 0) {
    throw new ApplicationError(
      "validation_error",
      "Identity provider token is required",
    );
  }
}

function providerUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/u, "")}${path}`;
}

async function parseProviderResponse(response: Response): Promise<unknown> {
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApplicationError(
      response.status === 409 ? "state_conflict" : "internal_error",
      "Identity provider request failed",
    );
  }
  return payload;
}

function parseSecurityStatus(value: unknown): IdentityProviderSecurityStatus {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ApplicationError(
      "internal_error",
      "Identity provider response is invalid",
    );
  }
  const candidate = value as Record<string, unknown>;
  if (
    candidate.provider !== "EXTERNAL_IDENTITY_PROVIDER" ||
    (candidate.recovery !== "AVAILABLE" &&
      candidate.recovery !== "UNAVAILABLE") ||
    (candidate.mfa !== "ENABLED" &&
      candidate.mfa !== "NOT_ENABLED" &&
      candidate.mfa !== "UNAVAILABLE")
  ) {
    throw new ApplicationError(
      "internal_error",
      "Identity provider security status is invalid",
    );
  }
  return Object.freeze({
    provider: candidate.provider,
    recovery: candidate.recovery,
    mfa: candidate.mfa,
  });
}

function parseOperation(value: unknown): IdentityProviderOperation {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ApplicationError(
      "internal_error",
      "Identity provider operation is invalid",
    );
  }
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.operationId !== "string" ||
    candidate.operationId.trim().length === 0 ||
    typeof candidate.expiresAt !== "string" ||
    candidate.expiresAt.trim().length === 0
  ) {
    throw new ApplicationError(
      "internal_error",
      "Identity provider operation is invalid",
    );
  }
  return Object.freeze({
    operationId: candidate.operationId,
    expiresAt: candidate.expiresAt,
  });
}

export function createHttpIdentityProvider(
  options: IdentityProviderOptions,
): IdentityProviderPort {
  assertProviderOptions(options);
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const request = async (
    path: string,
    method: "GET" | "POST",
    principalId: string,
    body: Readonly<Record<string, string>> = {},
  ): Promise<unknown> => {
    assertPrincipalId(principalId);
    const response = await fetchImpl(providerUrl(options.baseUrl, path), {
      method,
      headers: {
        accept: "application/json",
        authorization: `Bearer ${options.bearerToken}`,
        ...(method === "POST" ? { "content-type": "application/json" } : {}),
      },
      ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
    });
    return parseProviderResponse(response);
  };

  return Object.freeze({
    getSecurityStatus: async (principalId: string) =>
      parseSecurityStatus(
        await request(
          `/v1/accounts/${encodeURIComponent(principalId)}/security`,
          "GET",
          principalId,
        ),
      ),
    beginRecovery: async (principalId: string) =>
      parseOperation(
        await request(
          `/v1/accounts/${encodeURIComponent(principalId)}/recovery`,
          "POST",
          principalId,
        ),
      ),
    beginMfaEnrollment: async (principalId: string) =>
      parseOperation(
        await request(
          `/v1/accounts/${encodeURIComponent(principalId)}/mfa/enrollment`,
          "POST",
          principalId,
        ),
      ),
    verifyMfaEnrollment: async (
      principalId: string,
      operationId: string,
      verificationCode: string,
    ) => {
      assertOpaqueValue(operationId, "operationId");
      assertOpaqueValue(verificationCode, "verificationCode");
      return parseOperation(
        await request(
          `/v1/accounts/${encodeURIComponent(principalId)}/mfa/enrollment/verify`,
          "POST",
          principalId,
          { operationId, verificationCode },
        ),
      );
    },
    completeRecovery: async (
      principalId: string,
      operationId: string,
      verificationCode: string,
    ) => {
      assertOpaqueValue(operationId, "operationId");
      assertOpaqueValue(verificationCode, "verificationCode");
      return parseOperation(
        await request(
          `/v1/accounts/${encodeURIComponent(principalId)}/recovery/complete`,
          "POST",
          principalId,
          { operationId, verificationCode },
        ),
      );
    },
  });
}
