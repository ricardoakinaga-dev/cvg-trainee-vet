import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "..", "..");

// Custom, zero-dependency hygiene check (Knip-equivalent scoped to what is
// deterministic here): every workspace dependency declared in a manifest must
// be imported by at least one source file of that package, unless explicitly
// allowlisted. Orphan-file reporting stays informational until stabilized.
const ALLOWLIST = new Map([
  // package -> [{ dep, reason }]
]);

async function manifestWorkspaceDeps(manifestPath) {
  const raw = await readFile(join(root, manifestPath), "utf8");
  const manifest = JSON.parse(raw);
  const deps = new Set();
  for (const section of [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies",
  ]) {
    const entries = manifest[section];
    if (typeof entries !== "object" || entries === null) continue;
    for (const [name, version] of Object.entries(entries)) {
      if (version === "workspace:*") deps.add(name);
    }
  }
  return deps;
}

async function packageSources(directories) {
  const { readdir } = await import("node:fs/promises");
  const files = [];
  async function walk(directory) {
    let entries = [];
    try {
      entries = await readdir(join(root, directory), { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules" && entry.name !== "dist") {
          await walk(path);
        }
        continue;
      }
      if (
        path.endsWith(".ts") ||
        path.endsWith(".tsx") ||
        path.endsWith(".mjs")
      ) {
        files.push(path);
      }
    }
  }
  for (const directory of directories) await walk(directory);
  return files;
}

const PACKAGES = new Map([
  [
    "@cvg/api",
    { manifest: "apps/api/package.json", sources: ["apps/api/src"] },
  ],
  [
    "@cvg/worker",
    { manifest: "apps/worker/package.json", sources: ["apps/worker/src"] },
  ],
  [
    "@cvg/application",
    {
      manifest: "packages/application/package.json",
      sources: ["packages/application/src"],
    },
  ],
  [
    "@cvg/persistence",
    {
      manifest: "packages/persistence/package.json",
      sources: ["packages/persistence/src"],
    },
  ],
  [
    "@cvg/integrations",
    {
      manifest: "packages/integrations/package.json",
      sources: ["packages/integrations/src"],
    },
  ],
]);

export async function verifyDeadCode() {
  const failures = [];
  for (const [name, config] of PACKAGES) {
    const deps = await manifestWorkspaceDeps(config.manifest);
    const files = await packageSources(config.sources);
    const contents = await Promise.all(
      files.map((file) => readFile(join(root, file), "utf8")),
    );
    const corpus = contents.join("\n");
    const allowed = new Map(
      (ALLOWLIST.get(name) ?? []).map((entry) => [entry.dep, entry.reason]),
    );
    for (const dep of [...deps].sort()) {
      if (
        allowed.has(dep) ||
        corpus.includes(`from "${dep}`) ||
        corpus.includes(`from '${dep}`)
      ) {
        continue;
      }
      failures.push(
        `${name}: workspace dependency ${dep} is never imported (remove it or allowlist with reason)`,
      );
    }
  }
  return failures;
}

async function main() {
  const failures = await verifyDeadCode();
  if (failures.length > 0) {
    for (const failure of failures) console.error(`fail: ${failure}`);
    process.exitCode = 1;
    return;
  }
  console.log("dead-code gate: every workspace dependency is imported");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
