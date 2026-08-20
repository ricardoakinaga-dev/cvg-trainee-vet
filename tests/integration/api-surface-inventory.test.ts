import { describe, expect, it } from "vitest";

import {
  API_SURFACE,
  findApiSurfaceRoute,
  materializeApiSurfacePath,
} from "../../packages/contracts/src/index.js";

import { routeTemplate } from "../../apps/api/src/server.js";
import { API_ROUTE_GROUPS } from "../../apps/api/src/http-router.js";
import { handleApiRequest } from "../../apps/api/src/http.js";
import type { ApiHttpDependencies } from "../../apps/api/src/http-types.js";

const unauthenticatedDependencies: ApiHttpDependencies = {
  requestIdFactory: () => "request-api-surface-test",
  authenticate: async () => null,
  resolveActivityScope: async () => null,
  resolveAttempt: async () => null,
  createInvitation: async () => {
    throw new Error("not used");
  },
  acceptInvitation: async () => {
    throw new Error("not used");
  },
  getParticipantActivity: async () => {
    throw new Error("not used");
  },
  advanceContent: async () => {
    throw new Error("not used");
  },
  getParticipantProgress: async () => {
    throw new Error("not used");
  },
  getAttemptFeedback: async () => null,
  correctOpenResponse: async () => {
    throw new Error("not used");
  },
  startAttempt: async () => {
    throw new Error("not used");
  },
  saveAnswer: async () => {
    throw new Error("not used");
  },
  submitAttempt: async () => {
    throw new Error("not used");
  },
  healthcheck: async () => undefined,
};

function requestForRoute(route: (typeof API_SURFACE)[number]) {
  return {
    method: route.method,
    path: materializeApiSurfacePath(route.path),
    body: null,
  };
}

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

  it("dispatches every canonical route without falling through to 404", async () => {
    const fallthroughs = (
      await Promise.all(
        API_SURFACE.map(async (route) => {
          const response = await handleApiRequest(
            requestForRoute(route),
            unauthenticatedDependencies,
          );
          return response.status === 404
            ? `${route.method} ${route.path}`
            : null;
        }),
      )
    ).filter((route): route is string => route !== null);

    expect(fallthroughs).toEqual([]);
  });

  it("keeps protected routes closed and public invalid input bounded", async () => {
    const protectedRoutes = API_SURFACE.filter(
      (route) => route.auth !== "PUBLIC",
    );
    const protectedStatuses = await Promise.all(
      protectedRoutes.map(
        async (route) =>
          (
            await handleApiRequest(
              requestForRoute(route),
              unauthenticatedDependencies,
            )
          ).status,
      ),
    );
    expect(
      protectedStatuses.every((status) => status === 401 || status === 403),
    ).toBe(true);

    const publicInputRoutes = API_SURFACE.filter(
      (route) => route.auth === "PUBLIC" && route.requestContract !== "none",
    );
    const publicInputStatuses = await Promise.all(
      publicInputRoutes.map(
        async (route) =>
          (
            await handleApiRequest(
              requestForRoute(route),
              unauthenticatedDependencies,
            )
          ).status,
      ),
    );

    expect(publicInputStatuses).toEqual([422, 422]);
  });

  it("does not resolve unsupported methods or malformed path variants", () => {
    const malformedRoutes = API_SURFACE.map((route) => ({
      method: route.method,
      path: `${materializeApiSurfacePath(route.path)}/`,
    }));

    expect(
      malformedRoutes.every(
        ({ method, path }) => findApiSurfaceRoute(method, path) === null,
      ),
    ).toBe(true);
    expect(findApiSurfaceRoute("DELETE", "/health/live")).toBeNull();
  });
});
