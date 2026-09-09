import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type ProtectedSurface = "operations" | "authoring";
type ApiRecord = Readonly<Record<string, unknown>>;

const sessionCookieName = "__Host-cvg_session";

function isRecord(value: unknown): value is ApiRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function protectedSurface(pathname: string): ProtectedSurface | null {
  const normalized = pathname.replace(/\/+$/u, "") || "/";
  if (normalized === "/operations") return "operations";
  if (normalized === "/authoring") return "authoring";
  return null;
}

function sessionCookieHeader(request: NextRequest): string | null {
  const value = request.cookies.get(sessionCookieName)?.value;
  return typeof value === "string" && value.trim().length > 0
    ? `${sessionCookieName}=${value}`
    : null;
}

function isAuthorizedProjection(
  surface: ProtectedSurface,
  value: unknown,
): boolean {
  if (!isRecord(value)) return false;
  if (!Array.isArray(value.scopes) || value.scopes.length === 0) return false;
  if (
    !value.scopes.every(
      (scope) => typeof scope === "string" && scope.trim().length > 0,
    )
  ) {
    return false;
  }
  return surface === "operations"
    ? value.kind === "staff"
    : value.kind === "internal_session_scopes";
}

function apiUrlForSurface(surface: ProtectedSurface): string | null {
  const configured = process.env.CVG_API_INTERNAL_URL?.trim();
  if (configured === undefined || configured.length === 0) return null;
  try {
    const base = new URL(configured);
    if (base.protocol !== "http:" && base.protocol !== "https:") return null;
    const suffix =
      surface === "operations"
        ? "/api/v1/dashboard"
        : "/api/v1/internal/session/scopes";
    return new URL(
      suffix,
      `${base.origin}${base.pathname.replace(/\/+$/u, "")}/`,
    ).toString();
  } catch {
    return null;
  }
}

async function hasAuthorizedSurface(
  request: NextRequest,
  surface: ProtectedSurface,
): Promise<boolean> {
  const sessionCookie = sessionCookieHeader(request);
  if (sessionCookie === null) return false;

  const url = apiUrlForSurface(surface);
  if (url === null) return false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1_500);
  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { cookie: sessionCookie },
      signal: controller.signal,
    });
    if (!response.ok) return false;
    const payload: unknown = await response.json().catch(() => null);
    return (
      isRecord(payload) &&
      payload.success === true &&
      isAuthorizedProjection(surface, payload.data)
    );
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function accessRequired(request: NextRequest): NextResponse {
  const destination = request.nextUrl.clone();
  destination.pathname = "/";
  destination.search = "?access=required";
  return NextResponse.redirect(destination);
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const surface = protectedSurface(request.nextUrl.pathname);
  if (surface === null) return NextResponse.next();
  if (await hasAuthorizedSurface(request, surface)) return NextResponse.next();
  return accessRequired(request);
}

export const config = {
  matcher: ["/operations", "/operations/", "/authoring", "/authoring/"],
};
