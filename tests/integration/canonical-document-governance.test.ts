import { expect, it } from "vitest";

import {
  validateCanonicalDocumentSnapshot,
  validateDocumentationSnapshot,
} from "../../scripts/verify-documentation.mjs";

const validRegistry = JSON.stringify({
  version: 1,
  current: {
    program: "program.md",
    audit: "audit.md",
    roadmap: "roadmap.md",
    backlog: "backlog.md",
  },
  documents: [
    { path: "program.md", role: "program", status: "CURRENT" },
    { path: "audit.md", role: "audit", status: "CURRENT" },
    { path: "roadmap.md", role: "roadmap", status: "CURRENT" },
    { path: "backlog.md", role: "backlog", status: "CURRENT" },
    {
      path: "old-audit.md",
      role: "audit",
      status: "HISTORICAL",
      supersededBy: "audit.md",
    },
  ],
});

it("accepts a registry with one current source per canonical role", () => {
  const snapshot = new Map<string, string>([
    ["docs/canonical-document-registry.json", validRegistry],
    ["program.md", "program"],
    ["audit.md", "audit"],
    ["roadmap.md", "roadmap"],
    ["backlog.md", "backlog"],
    ["old-audit.md", "registro histórico; superseded"],
  ]);

  expect(validateCanonicalDocumentSnapshot(snapshot)).toEqual([]);
});

it("accepts an active execution overlay alongside canonical baseline sources", () => {
  const snapshot = new Map<string, string>([
    [
      "docs/canonical-document-registry.json",
      JSON.stringify({
        version: 1,
        current: {
          program: "program.md",
          audit: "audit.md",
          roadmap: "roadmap.md",
          backlog: "backlog.md",
        },
        documents: [
          { path: "program.md", role: "program", status: "CURRENT" },
          { path: "audit.md", role: "audit", status: "CURRENT" },
          { path: "roadmap.md", role: "roadmap", status: "CURRENT" },
          { path: "backlog.md", role: "backlog", status: "CURRENT" },
          {
            path: "overlay-program.md",
            role: "program",
            status: "ACTIVE_EXECUTION_OVERLAY",
          },
          {
            path: "overlay-roadmap.md",
            role: "roadmap",
            status: "ACTIVE_EXECUTION_OVERLAY",
          },
          {
            path: "overlay-backlog.md",
            role: "backlog",
            status: "ACTIVE_EXECUTION_OVERLAY",
          },
        ],
      }),
    ],
    ["program.md", "program"],
    ["audit.md", "audit"],
    ["roadmap.md", "roadmap"],
    ["backlog.md", "backlog"],
    ["overlay-program.md", "overlay"],
    ["overlay-roadmap.md", "overlay"],
    ["overlay-backlog.md", "overlay"],
  ]);

  expect(validateCanonicalDocumentSnapshot(snapshot)).toEqual([]);
});

it("rejects duplicate current roles, missing paths and unlinked history", () => {
  const snapshot = new Map<string, string>([
    [
      "docs/canonical-document-registry.json",
      JSON.stringify({
        version: 1,
        current: { program: "program.md" },
        documents: [
          { path: "program.md", role: "program", status: "CURRENT" },
          { path: "other-program.md", role: "program", status: "CURRENT" },
          { path: "missing.md", role: "audit", status: "CURRENT" },
          { path: "old.md", role: "roadmap", status: "HISTORICAL" },
        ],
      }),
    ],
    ["program.md", "program"],
    ["other-program.md", "program"],
    ["old.md", "old content"],
  ]);

  expect(validateCanonicalDocumentSnapshot(snapshot)).toEqual([
    "canonical registry must define current audit",
    "canonical registry must define current roadmap",
    "canonical registry must define current backlog",
    "canonical registry has duplicate current role program",
    "canonical registry path is missing: missing.md",
    "historical document old.md must declare supersededBy",
    "historical document old.md must contain a historical marker",
  ]);
});

it("preserves the ordered findings for mixed canonical document failures", () => {
  const snapshot = new Map<string, string>([
    [
      "docs/canonical-document-registry.json",
      JSON.stringify({
        version: 2,
        current: {
          program: "program.md",
          audit: "",
          roadmap: "roadmap.md",
        },
        documents: [
          null,
          { path: "program.md", role: "program", status: "CURRENT" },
          { path: "program.md", role: "program", status: "CURRENT" },
          {
            path: "overlay-program.md",
            role: "program",
            status: "ACTIVE_EXECUTION_OVERLAY",
          },
          { path: "old-audit.md", role: "audit", status: "HISTORICAL" },
          { path: "invalid.md", role: "unknown", status: "INVALID" },
          { path: "missing.md", role: "backlog", status: "CURRENT" },
          { path: "", role: "backlog", status: "CURRENT" },
        ],
      }),
    ],
    ["program.md", "program"],
    ["roadmap.md", "roadmap"],
    ["overlay-program.md", "overlay"],
    ["old-audit.md", "old content"],
    ["invalid.md", "invalid"],
  ]);

  expect(validateCanonicalDocumentSnapshot(snapshot)).toEqual([
    "canonical document registry version must be 1",
    "canonical registry must define current audit",
    "canonical registry must define current backlog",
    "canonical registry has an invalid document entry",
    "canonical registry has duplicate path program.md",
    "canonical registry has duplicate current role program",
    "historical document old-audit.md must declare supersededBy",
    "historical document old-audit.md must contain a historical marker",
    "canonical registry document invalid.md has invalid role unknown",
    "canonical registry document invalid.md has invalid status INVALID",
    "canonical registry path is missing: missing.md",
    "canonical registry document has no path",
  ]);
});

it("includes canonical governance in the documentation gate when the registry is present", () => {
  const snapshot = new Map<string, string>([
    ["docs/canonical-document-registry.json", validRegistry],
    ["program.md", "program"],
    ["audit.md", "audit"],
    ["roadmap.md", "roadmap"],
    ["backlog.md", "backlog"],
    ["old-audit.md", "registro histórico"],
  ]);

  expect(validateDocumentationSnapshot(snapshot)).toContain(
    "missing required file: AGENTS.md",
  );
});
