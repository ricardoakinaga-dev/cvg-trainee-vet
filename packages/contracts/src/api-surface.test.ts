import { describe, expect, it } from "vitest";

import {
  API_SURFACE,
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
  });
});
