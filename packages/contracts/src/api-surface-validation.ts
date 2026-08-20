import type {
  ApiSurfaceAuth,
  ApiSurfaceHandlerGroup,
  ApiSurfaceMethod,
  ApiSurfaceRoute,
  ApiSurfaceScope,
} from "./api-surface.js";

const validMethods = new Set<ApiSurfaceMethod>(["GET", "PATCH", "POST"]);
const validAuth = new Set<ApiSurfaceAuth>([
  "PUBLIC",
  "SESSION",
  "INTERNAL",
  "METRICS",
]);
const validScopes = new Set<ApiSurfaceScope>(["none", "own", "scope", "audit"]);
const validHandlerGroups = new Set<ApiSurfaceHandlerGroup>([
  "health",
  "metrics",
  "workflow",
  "internal",
  "participant",
  "authoring",
]);

type UnknownRecord = Readonly<Record<string, unknown>>;

function asUnknownRecord(value: unknown): UnknownRecord {
  return value !== null && typeof value === "object"
    ? (value as UnknownRecord)
    : {};
}

function readString(record: UnknownRecord, key: string): string | null {
  const value = record[key];
  return typeof value === "string" ? value : null;
}

function stringifyUnknown(value: unknown): string {
  try {
    return String(value);
  } catch {
    return "<invalid>";
  }
}

function isCompatibleAuthScope(
  auth: ApiSurfaceAuth,
  scope: ApiSurfaceScope,
): boolean {
  switch (auth) {
    case "PUBLIC":
      return scope === "none";
    case "SESSION":
      return scope === "own";
    case "INTERNAL":
      return scope === "scope" || scope === "audit";
    case "METRICS":
      return scope === "audit";
  }
}

export function validateApiSurface(
  routes: readonly ApiSurfaceRoute[],
): readonly string[] {
  if (!Array.isArray(routes)) return Object.freeze(["invalid route inventory"]);

  const errors: string[] = [];
  const seen = new Set<string>();

  for (const candidate of routes) {
    const route = asUnknownRecord(candidate);
    const method = readString(route, "method");
    const path = readString(route, "path");
    const auth = readString(route, "auth");
    const scope = readString(route, "scope");
    const handlerGroup = readString(route, "handlerGroup");
    const capability = readString(route, "capability");
    const useCase = readString(route, "useCase");
    const requestContract = readString(route, "requestContract");
    const responseContract = readString(route, "responseContract");
    const key = `${stringifyUnknown(route.method)} ${stringifyUnknown(route.path)}`;
    if (seen.has(key)) errors.push(`duplicate route: ${key}`);
    seen.add(key);

    if (!validMethods.has(method as ApiSurfaceMethod)) {
      errors.push(`invalid method for ${key}`);
    }
    if (path === null || !path.startsWith("/") || path.includes("//")) {
      errors.push(`invalid path for ${key}`);
    }
    if (!validAuth.has(auth as ApiSurfaceAuth)) {
      errors.push(`invalid auth for ${key}`);
    }
    if (!validScopes.has(scope as ApiSurfaceScope)) {
      errors.push(`invalid scope for ${key}`);
    }
    if (!validHandlerGroups.has(handlerGroup as ApiSurfaceHandlerGroup)) {
      errors.push(`invalid handler group for ${key}`);
    }
    if (
      validAuth.has(auth as ApiSurfaceAuth) &&
      validScopes.has(scope as ApiSurfaceScope) &&
      !isCompatibleAuthScope(auth as ApiSurfaceAuth, scope as ApiSurfaceScope)
    ) {
      errors.push(`incompatible auth and scope for ${key}`);
    }
    if (capability === null || capability.trim() === "") {
      errors.push(`missing capability for ${key}`);
    }
    if (useCase === null || useCase.trim() === "") {
      errors.push(`missing use case for ${key}`);
    }
    if (requestContract === null || requestContract.trim() === "") {
      errors.push(`missing request contract for ${key}`);
    }
    if (responseContract === null || responseContract.trim() === "") {
      errors.push(`missing response contract for ${key}`);
    }
  }

  return Object.freeze(errors);
}
