import { readFile, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

type PackageRule = Readonly<{
  manifest: string;
  allowedWorkspaceDependencies: readonly string[];
}>;

type SourceRule = Readonly<{
  root: string;
  forbiddenImports: readonly string[];
}>;

type ArchitecturePolicy = Readonly<{
  version: number;
  sourceDocuments: readonly string[];
  packages: Readonly<Record<string, PackageRule>>;
  sourceRules: readonly SourceRule[];
}>;

const workspaceRoot = resolve(process.cwd());
const policyPath = join(workspaceRoot, "architecture-boundaries.json");

async function readPolicy(): Promise<ArchitecturePolicy> {
  const raw = await readFile(policyPath, "utf8");
  return JSON.parse(raw) as ArchitecturePolicy;
}

async function listProductionSourceFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const nested = await Promise.all(
    entries
      .filter(
        (entry) =>
          entry.name !== "dist" &&
          entry.name !== ".next" &&
          entry.name !== "node_modules",
      )
      .map(async (entry) => {
        const path = join(root, entry.name);
        if (entry.isDirectory()) return listProductionSourceFiles(path);
        if (
          entry.isFile() &&
          /\.(?:ts|tsx)$/u.test(entry.name) &&
          !/\.test\.(?:ts|tsx)$/u.test(entry.name)
        ) {
          return [path];
        }
        return [];
      }),
  );
  return nested.flat();
}

async function workspaceDependencies(manifestPath: string): Promise<string[]> {
  const raw = await readFile(manifestPath, "utf8");
  const manifest = JSON.parse(raw) as Record<string, unknown>;
  const sections = [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies",
  ];
  return sections.flatMap((section) => {
    const dependencies = manifest[section];
    if (typeof dependencies !== "object" || dependencies === null) return [];
    return Object.entries(dependencies as Record<string, unknown>)
      .filter(([, version]) => version === "workspace:*")
      .map(([name]) => name)
      .sort();
  });
}

describe("architecture boundary policy", () => {
  it("covers the approved package dependency graph", async () => {
    const policy = await readPolicy();

    expect(policy.version).toBe(1);
    expect(policy.sourceDocuments).toEqual(
      expect.arrayContaining([
        "BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC/0101_visao_arquitetural.md",
        "BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC/0102_bounded_contexts.md",
        "BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC/0103_mapa_de_modulos.md",
      ]),
    );

    for (const [packageName, rule] of Object.entries(policy.packages)) {
      const actual = await workspaceDependencies(
        join(workspaceRoot, rule.manifest),
      );
      expect(actual, packageName).toEqual(
        [...rule.allowedWorkspaceDependencies].sort(),
      );
    }
  });

  it("rejects forbidden production imports at every declared boundary", async () => {
    const policy = await readPolicy();

    for (const rule of policy.sourceRules) {
      const files = await listProductionSourceFiles(
        join(workspaceRoot, rule.root),
      );
      expect(files.length, rule.root).toBeGreaterThan(0);

      for (const file of files) {
        const source = await readFile(file, "utf8");
        const importStatements = source
          .split(/\r?\n/u)
          .filter(
            (line) =>
              /^\s*(?:import|export)\b/u.test(line) ||
              /\bfrom\s+["']/u.test(line),
          )
          .join("\n");
        const violations = rule.forbiddenImports.filter((token) =>
          importStatements.includes(token),
        );
        expect(violations, relative(workspaceRoot, file)).toEqual([]);
      }
    }
  });
});
