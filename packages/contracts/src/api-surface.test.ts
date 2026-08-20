import { describe, expect, it } from "vitest";

import {
  API_SURFACE,
  findApiSurfaceRoute,
  materializeApiSurfacePath,
  validateApiSurface,
} from "./api-surface.js";

describe("canonical API surface inventory", () => {
  it("maps every route to access, scope, use case and contracts", () => {
    expect(validateApiSurface(API_SURFACE)).toEqual([]);
    expect(API_SURFACE).toHaveLength(57);

    const keys = API_SURFACE.map(({ method, path }) => `${method} ${path}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(API_SURFACE.every((route) => route.useCase.length > 0)).toBe(true);
    expect(
      API_SURFACE.every((route) => route.responseContract.length > 0),
    ).toBe(true);
    expect(
      API_SURFACE.some((route) => route.path.includes("/authoring/review")),
    ).toBe(true);
    expect(new Set(API_SURFACE.map((route) => route.handlerGroup))).toEqual(
      new Set([
        "health",
        "metrics",
        "workflow",
        "internal",
        "participant",
        "authoring",
      ]),
    );
  });

  it("resolves exact and parameterized paths from the canonical inventory", () => {
    expect(findApiSurfaceRoute("GET", "/health/live")?.path).toBe(
      "/health/live",
    );
    expect(
      findApiSurfaceRoute("POST", "/api/v1/internal/content/sample-id/review")
        ?.path,
    ).toBe("/api/v1/internal/content/:contentId/review");
    expect(findApiSurfaceRoute("GET", "/api/v1/not-registered")).toBeNull();
  });

  it("materializes parameterized paths for runtime route verification", () => {
    expect(
      materializeApiSurfacePath(
        "/api/v1/internal/content/:contentId/versions/:version/authoring",
      ),
    ).toBe("/api/v1/internal/content/sample-id/versions/1/authoring");
  });

  it("rejects duplicate, invalid and incomplete route descriptors", () => {
    const [route] = API_SURFACE;
    expect(route).toBeDefined();
    if (route === undefined) return;

    expect(validateApiSurface([route, route])).toEqual([
      "duplicate route: GET /health/live",
    ]);
    expect(
      validateApiSurface([
        {
          ...route,
          method: "TRACE",
        } as never,
      ]),
    ).toContain("invalid method for TRACE /health/live");
    expect(
      validateApiSurface([
        {
          ...route,
          capability: "",
        },
      ]),
    ).toContain("missing capability for GET /health/live");

    expect(
      validateApiSurface([{ ...route, auth: "BROKEN" } as never]),
    ).toContain("invalid auth for GET /health/live");
    expect(
      validateApiSurface([{ ...route, scope: "BROKEN" } as never]),
    ).toContain("invalid scope for GET /health/live");
    expect(validateApiSurface([{ ...route, useCase: "" }])).toContain(
      "missing use case for GET /health/live",
    );
    expect(validateApiSurface([{ ...route, responseContract: "" }])).toContain(
      "missing response contract for GET /health/live",
    );
  });
});
