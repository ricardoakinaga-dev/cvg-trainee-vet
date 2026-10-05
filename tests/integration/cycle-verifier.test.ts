import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const verifier = pathToFileURL(resolve("scripts/verify-cycles.mjs")).href;

async function inspectFixture(files: Readonly<Record<string, string>>) {
  const root = await mkdtemp(join(tmpdir(), "cvg-cycle-test-"));
  try {
    for (const [name, source] of Object.entries(files)) {
      const path = join(root, "packages/domain/src", name);
      await mkdir(resolve(path, ".."), { recursive: true });
      await writeFile(path, source);
    }
    const { stdout } = await execFileAsync(process.execPath, [
      "--input-type=module",
      "-e",
      `const { verifyCycles } = await import(${JSON.stringify(verifier)}); console.log(JSON.stringify(await verifyCycles(${JSON.stringify(root)})));`,
    ]);
    return JSON.parse(stdout) as string[];
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("cycle verifier source resolution", () => {
  it("parses compact static imports", async () => {
    expect(
      await inspectFixture({
        "a.ts": 'import{b}from"./b.js";export const a=b;',
        "b.ts": 'import{a}from"./a.js";export const b=a;',
      }),
    ).toHaveLength(1);
  });

  it("ignores import-shaped strings", async () => {
    expect(
      await inspectFixture({
        "a.ts": `export const text = 'import { b } from "./b.js"';`,
        "b.ts": 'import "./a.js";',
      }),
    ).toEqual([]);
  });

  it("retains type-only and workspace-package edges", async () => {
    expect(
      await inspectFixture({
        "index.ts": 'export type { B } from "./b.js";',
        "b.ts": 'import type { A } from "@cvg/domain"; export type B = A;',
      }),
    ).toHaveLength(1);
  });
  it("detects cycles expressed through runtime .js specifiers", async () => {
    const cycles = await inspectFixture({
      "a.ts": 'import { b } from "./b.js"; export const a = () => b;',
      "b.ts": 'import { a } from "./a.js"; export const b = () => a;',
    });
    expect(cycles).toEqual([
      "packages/domain/src/a.ts -> packages/domain/src/b.ts -> packages/domain/src/a.ts",
    ]);
  });

  it("accepts an acyclic graph using runtime .js specifiers", async () => {
    expect(
      await inspectFixture({
        "a.ts": 'import { b } from "./b.js"; export const a = b;',
        "b.ts": "export const b = 1;",
      }),
    ).toEqual([]);
  });

  it("resolves directory barrels and TSX runtime specifiers", async () => {
    expect(
      await inspectFixture({
        "a.ts": 'export { b } from "./nested";',
        "nested/index.ts": 'export { b } from "../b.js";',
        "b.tsx": 'import "./a.js"; export const b = 1;',
      }),
    ).toHaveLength(1);
  });
});
