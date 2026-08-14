import { describe, expect, it } from "vitest";

import {
  API_SURFACE,
  materializeApiSurfacePath,
} from "../../packages/contracts/src/index.js";

import { routeTemplate } from "../../apps/api/src/server.js";

describe("API surface to runtime route inventory", () => {
  it("has a telemetry template for every canonical route", () => {
    const unmatched = API_SURFACE.filter(
      ({ method, path }) =>
        routeTemplate(method, materializeApiSurfacePath(path)) !== path,
    ).map(({ method, path }) => `${method} ${path}`);

    expect(unmatched).toEqual([]);
  });
});
