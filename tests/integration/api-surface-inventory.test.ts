import { describe, expect, it } from "vitest";

import {
  API_SURFACE,
  findApiSurfaceRoute,
  materializeApiSurfacePath,
} from "../../packages/contracts/src/index.js";

import { routeTemplate } from "../../apps/api/src/server.js";
import { API_ROUTE_GROUPS } from "../../apps/api/src/http-router.js";

describe("API surface to runtime route inventory", () => {
  it("has a telemetry template for every canonical route", () => {
    const unmatched = API_SURFACE.filter(
      ({ method, path }) =>
        routeTemplate(method, materializeApiSurfacePath(path)) !== path,
    ).map(({ method, path }) => `${method} ${path}`);

    expect(unmatched).toEqual([]);
  });

  it("links every canonical route to a concrete dispatcher group", () => {
    const missingGroups = API_SURFACE.filter(
      (route) => API_ROUTE_GROUPS[route.handlerGroup] === undefined,
    ).map(
      ({ method, path, handlerGroup }) =>
        `${method} ${path} -> ${handlerGroup}`,
    );

    expect(missingGroups).toEqual([]);
    expect(
      API_SURFACE.every(
        ({ method, path }) =>
          findApiSurfaceRoute(method, materializeApiSurfacePath(path)) !== null,
      ),
    ).toBe(true);
  });
});
