import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("independent function budgets inside file ratchets", () => {
  it.each([
    {
      path: "apps/api/src/http.ts",
      name: "handleApiRequestCore",
      size: 762,
      failed: true,
    },
    {
      path: "apps/api/src/http.ts",
      name: "handleApiRequestCore",
      size: 761,
      failed: false,
    },
    {
      path: "packages/curriculum/src/catalog.ts",
      name: "newFunction",
      size: 151,
      failed: true,
    },
    {
      path: "packages/curriculum/src/catalog.ts",
      name: "newFunction",
      size: 150,
      failed: false,
    },
  ])(
    "checks $path#$name at $size lines independently of its file exception",
    async (fixture) => {
      const directory = await mkdtemp(
        join(tmpdir(), "cvg-complexity-contract-"),
      );
      try {
        for (const folder of [
          "apps/api/src",
          "packages/curriculum/src",
          "tests",
          "scripts",
        ])
          await mkdir(join(directory, folder), { recursive: true });
        const scanner = await readFile("scripts/verify-complexity.mjs", "utf8");
        const scannerPath = join(directory, "scripts/verify-complexity.mjs");
        await writeFile(scannerPath, scanner);
        const body = [
          `function ${fixture.name}() {`,
          ...Array.from(
            { length: fixture.size - 2 },
            (_, i) => `  // synthetic line ${i}`,
          ),
          "}",
        ];
        await writeFile(join(directory, fixture.path), body.join("\n") + "\n");
        const child = spawnSync(process.execPath, [scannerPath], {
          cwd: directory,
          encoding: "utf8",
        });
        expect(child.error).toBeUndefined();
        expect(child.status).toBe(fixture.failed ? 1 : 0);
        if (fixture.failed)
          expect(child.stdout + child.stderr).toContain(
            `${fixture.path}#${fixture.name}`,
          );
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    },
  );
});
