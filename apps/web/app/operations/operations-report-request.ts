import { useEffect, useRef, useState } from "react";

type ReportState =
  "idle" | "loading" | "ready" | "unauthenticated" | "forbidden" | "error";
type ScopedReport = Readonly<{
  scopeId: string;
  filters?: Readonly<{
    scopeId: string;
    moduleId?: string;
    accountStatus?: string;
  }>;
  pagination?: Readonly<{ page: number; pageSize: number }>;
}>;

export type OperationsReportQuery = Readonly<{
  key: string;
  resource: "continuing-education" | "reflections";
  scopeId: string;
  url: string;
}>;

export function operationsReportQuery(
  resource: OperationsReportQuery["resource"],
  scopeId: string | undefined,
  authorizedScopes: readonly string[],
  authorityStamp: string,
  filters?: Readonly<{
    moduleId: string;
    accountStatus: string;
    page: number;
    pageSize: number;
  }>,
): OperationsReportQuery | null {
  if (scopeId === undefined || !authorizedScopes.includes(scopeId)) return null;
  const query = new URLSearchParams({ scopeId });
  if (filters !== undefined) {
    query.set("page", String(filters.page));
    query.set("pageSize", String(filters.pageSize));
    if (filters.moduleId) query.set("moduleId", filters.moduleId);
    if (filters.accountStatus)
      query.set("accountStatus", filters.accountStatus);
  }
  const url = `/api/v1/internal/reports/${resource}?${query.toString()}`;
  return {
    resource,
    scopeId,
    url,
    key: JSON.stringify([url, [...authorizedScopes].sort(), authorityStamp]),
  };
}

export function reportMatchesQuery(
  report: ScopedReport,
  query: OperationsReportQuery,
): boolean {
  if (report.scopeId !== query.scopeId) return false;
  if (query.resource === "reflections") return true;
  const params = new URL(query.url, "http://operations.internal").searchParams;
  return (
    report.filters?.scopeId === query.scopeId &&
    (report.filters.moduleId ?? "") === (params.get("moduleId") ?? "") &&
    (report.filters.accountStatus ?? "") ===
      (params.get("accountStatus") ?? "") &&
    report.pagination?.page === Number(params.get("page")) &&
    report.pagination.pageSize === Number(params.get("pageSize"))
  );
}

/** A response owns only its current query and effect lifetime, including retries. */
export function useOperationsReport<T extends ScopedReport>(
  query: OperationsReportQuery | null,
  validate: (value: unknown) => value is T,
) {
  const queryRef = useRef(query);
  queryRef.current = query;
  const key = query?.key ?? null;
  const version = useRef(0);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{
    key: string | null;
    state: ReportState;
    data: T | null;
  }>({ key: null, state: "idle", data: null });

  useEffect(() => {
    const request = queryRef.current;
    const requestVersion = ++version.current;
    if (request === null) {
      setResult({ key: null, state: "idle", data: null });
      return;
    }
    const controller = new AbortController();
    const current = () =>
      !controller.signal.aborted &&
      version.current === requestVersion &&
      queryRef.current?.key === request.key;
    setResult({ key: request.key, state: "loading", data: null });
    void (async () => {
      try {
        const response = await fetch(request.url, {
          cache: "no-store",
          credentials: "include",
          signal: controller.signal,
        });
        if (!current()) return;
        if (!response.ok) {
          const state =
            response.status === 401
              ? "unauthenticated"
              : response.status === 403
                ? "forbidden"
                : "error";
          setResult({ key: request.key, state, data: null });
          return;
        }
        const payload: unknown = await response.json().catch(() => null);
        if (!current()) return;
        if (
          typeof payload !== "object" ||
          payload === null ||
          !("success" in payload) ||
          payload.success !== true ||
          !("data" in payload) ||
          !validate(payload.data) ||
          !reportMatchesQuery(payload.data, request)
        )
          throw new Error("invalid scoped report");
        setResult({ key: request.key, state: "ready", data: payload.data });
      } catch {
        if (current())
          setResult({ key: request.key, state: "error", data: null });
      }
    })();
    return () => {
      version.current += 1;
      controller.abort();
    };
  }, [key, retry, validate]);

  return {
    state:
      query === null
        ? ("idle" as const)
        : result.key === key
          ? result.state
          : ("loading" as const),
    data: result.key === key ? result.data : null,
    reload: () => setRetry((current) => current + 1),
  };
}
