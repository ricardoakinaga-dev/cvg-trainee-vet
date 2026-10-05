import { describe, expect, it } from "vitest";
import {
  operationsReportQuery,
  reportMatchesQuery,
} from "./operations-report-request";

const filters = {
  moduleId: "M02",
  accountStatus: "ACTIVE",
  page: 2,
  pageSize: 25,
};
const scopes = ["scope-a", "scope-b"];
const query = operationsReportQuery(
  "continuing-education",
  "scope-a",
  scopes,
  "session-snapshot",
  filters,
);
if (query === null) throw new Error("authorized query required");
const report = {
  scopeId: "scope-a",
  filters: { scopeId: "scope-a", moduleId: "M02", accountStatus: "ACTIVE" },
  pagination: { page: 2, pageSize: 25 },
};

describe("operations report request identity", () => {
  it("denies missing or unauthorized scope without inventing a request", () => {
    expect(
      operationsReportQuery("reflections", undefined, scopes, "snapshot"),
    ).toBeNull();
    expect(
      operationsReportQuery("reflections", "foreign", scopes, "snapshot"),
    ).toBeNull();
    expect(
      operationsReportQuery("reflections", "scope-a", [], "snapshot"),
    ).toBeNull();
  });
  it("binds every filter, page, resource and authorization snapshot", () => {
    expect(
      operationsReportQuery(
        "continuing-education",
        "scope-a",
        [...scopes].reverse(),
        "session-snapshot",
        filters,
      )?.key,
    ).toBe(query.key);
    for (const change of [
      { moduleId: "" },
      { accountStatus: "" },
      { page: 1 },
      { pageSize: 50 },
    ]) {
      expect(
        operationsReportQuery(
          "continuing-education",
          "scope-a",
          scopes,
          "session-snapshot",
          { ...filters, ...change },
        )?.key,
      ).not.toBe(query.key);
    }
    expect(
      operationsReportQuery(
        "continuing-education",
        "scope-b",
        scopes,
        "session-snapshot",
        filters,
      )?.key,
    ).not.toBe(query.key);
    expect(
      operationsReportQuery(
        "continuing-education",
        "scope-a",
        ["scope-a"],
        "session-snapshot",
        filters,
      )?.key,
    ).not.toBe(query.key);
    expect(
      operationsReportQuery(
        "continuing-education",
        "scope-a",
        scopes,
        "new-snapshot",
        filters,
      )?.key,
    ).not.toBe(query.key);
    expect(
      operationsReportQuery(
        "reflections",
        "scope-a",
        scopes,
        "session-snapshot",
      )?.key,
    ).not.toBe(query.key);
  });
  it("accepts only the selected report scope, filters, and page", () => {
    expect(reportMatchesQuery(report, query)).toBe(true);
    for (const wrong of [
      { ...report, scopeId: "scope-b" },
      { ...report, filters: { ...report.filters, scopeId: "scope-b" } },
      { ...report, filters: { ...report.filters, moduleId: "M03" } },
      { ...report, filters: { ...report.filters, accountStatus: "SUSPENDED" } },
      { ...report, pagination: { page: 1, pageSize: 25 } },
      { ...report, pagination: { page: 2, pageSize: 50 } },
      { scopeId: "scope-a" },
    ])
      expect(reportMatchesQuery(wrong, query)).toBe(false);
  });
  it("binds reflection reports to the authorized scope", () => {
    const reflection = operationsReportQuery(
      "reflections",
      "scope-a",
      scopes,
      "snapshot",
    );
    if (reflection === null) throw new Error("reflection query required");
    expect(reportMatchesQuery({ scopeId: "scope-a" }, reflection)).toBe(true);
    expect(reportMatchesQuery({ scopeId: "scope-b" }, reflection)).toBe(false);
  });
});
