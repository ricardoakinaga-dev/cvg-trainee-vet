const invitationPath = "/api/v1/invitations/accept";

export const minimumPasswordLength = 12;

type ApiRecord = Readonly<Record<string, unknown>>;

export type InvitationFormValues = Readonly<{
  token: string | null;
  password: string;
  confirmation: string;
}>;

export type InvitationResponse = Readonly<{
  ok: boolean;
  json: () => Promise<unknown>;
}>;

export type InvitationFetcher = (
  input: string,
  init: RequestInit,
) => Promise<InvitationResponse>;

function isRecord(value: unknown): value is ApiRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isSuccess(value: unknown): boolean {
  return isRecord(value) && value.success === true;
}

export function readInvitationToken(
  searchParams: Pick<URLSearchParams, "get">,
): string | null {
  return searchParams.get("token");
}

export function stripInvitationTokenFromUrl(value: string): string {
  const url = new URL(value, "http://127.0.0.1");
  url.searchParams.delete("token");
  return `${url.pathname}${url.search}${url.hash}`;
}

export function validateInvitationForm(
  values: InvitationFormValues,
): string | null {
  if (values.token === null || values.token.trim().length === 0) {
    return "Este link de primeiro acesso não é válido.";
  }
  if (values.password.length < minimumPasswordLength) {
    return "A senha deve ter pelo menos 12 caracteres.";
  }
  if (values.password !== values.confirmation) {
    return "As senhas não coincidem.";
  }
  return null;
}

export async function acceptInvitation(
  apiBase: string,
  token: string,
  password: string,
  fetcher: InvitationFetcher = fetch,
): Promise<void> {
  const response = await fetcher(apiBase + invitationPath, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      token,
      password,
      sessionExpiresInSeconds: 3600,
    }),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok || !isSuccess(payload)) {
    throw new Error("invitation unavailable");
  }
}
