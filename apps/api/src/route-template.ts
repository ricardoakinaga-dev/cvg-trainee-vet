import { findApiSurfaceRoute } from "@cvg/contracts";

export function routeTemplate(method: string, path: string): string {
  return findApiSurfaceRoute(method, path)?.path ?? "unmatched";
}
