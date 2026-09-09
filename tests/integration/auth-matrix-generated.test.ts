import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  parseMatrixEntries,
  renderMatrix,
} from "../../scripts/generate-auth-matrix.mjs";

const root = process.cwd();

describe("authorization matrix generation", () => {
  it("matches the registry source of truth (regenerate with node scripts/generate-auth-matrix.mjs)", async () => {
    const [source, committed] = await Promise.all([
      readFile(join(root, "apps/api/src/routing/route-registry.ts"), "utf8"),
      readFile(
        join(root, "docs/security/authorization-matrix.generated.md"),
        "utf8",
      ),
    ]);
    const entries = parseMatrixEntries(source);
    expect(entries.length).toBeGreaterThan(50);
    expect(renderMatrix(entries)).toBe(committed);
  });

  it("covers every private route with an explicit capability or lifecycle note", async () => {
    const source = await readFile(
      join(root, "apps/api/src/routing/route-registry.ts"),
      "utf8",
    );
    const entries = parseMatrixEntries(source);
    const lifecycle = new Set([
      "POST /api/v1/session/revoke",
      "GET /api/v1/session/current",
      "POST /api/v1/session/rotate",
    ]);
    for (const entry of entries) {
      if (entry.auth === "public") continue;
      const key = `${entry.method} ${entry.template}`;
      if (lifecycle.has(key)) {
        expect(entry.note).toMatch(/cookie-possession/);
        continue;
      }
      expect(
        entry.capabilities.length,
        `${key} has no capability`,
      ).toBeGreaterThan(0);
      expect(entry.enforcement).not.toBe("");
      expect(entry.riskClass).not.toBe("");
    }
  });
});
