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
