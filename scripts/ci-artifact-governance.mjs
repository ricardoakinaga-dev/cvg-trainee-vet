import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
export const ARTIFACT_GOVERNANCE_VERSION = "1.0.0";

const redactionRules = Object.freeze([
  Object.freeze({
    name: "openai-api-key",
    expression: /\bsk-[A-Za-z0-9_-]{10,}\b/gu,
  }),
  Object.freeze({
    name: "bearer-token",
    expression: /\bBearer\s+[A-Za-z0-9._~+/=-]{20,}/giu,
  }),
  Object.freeze({
    name: "database-credential",
    expression: /\bpostgres(?:ql)?(?::\/\/)[^\s:@]+:[^\s@]+@/giu,
  }),
  Object.freeze({
    name: "named-secret",
    expression:
      /\b(?:api[_-]?key|password|secret|token)\s*[:=]\s*["'](?!\$\{\{)[^"'\r\n]{8,}["']/giu,
  }),
]);

function packagePurl(name, version) {
  return `pkg:npm/${encodeURIComponent(name).replace(/%2F/gu, "/")}@${encodeURIComponent(version)}`;
}

function visitDependencyMap(dependencies, components) {
  if (dependencies === null || typeof dependencies !== "object") return;
  for (const [name, dependency] of Object.entries(dependencies)) {
    if (dependency === null || typeof dependency !== "object") continue;
    const version =
      typeof dependency.version === "string" ? dependency.version : "";
    if (
      version.length > 0 &&
      !version.startsWith("link:") &&
      !version.startsWith("workspace:")
    ) {
      const purl = packagePurl(name, version);
      components.set(`${name}@${version}`, {
        "bom-ref": purl,
        type: "library",
        name,
        version,
        purl,
      });
    }
    visitDependencyMap(dependency.dependencies, components);
    visitDependencyMap(dependency.optionalDependencies, components);
  }
}

export function createCycloneDxSbom({
  dependencyTree,
  packageName = "cvg-trainee-vet",
  packageVersion = "0.0.0",
  commitSha,
}) {
  if (typeof commitSha !== "string" || commitSha.length === 0) {
    throw new Error("SBOM commit SHA is required");
  }
  const components = new Map();
  const roots = Array.isArray(dependencyTree)
    ? dependencyTree
    : [dependencyTree];
  for (const root of roots) {
    if (root === null || typeof root !== "object") continue;
    visitDependencyMap(root.dependencies, components);
    visitDependencyMap(root.optionalDependencies, components);
  }
  const rootPurl = `pkg:npm/${encodeURIComponent(packageName).replace(/%2F/gu, "/")}@${encodeURIComponent(packageVersion)}`;
  const serialSeed = createHash("sha256")
    .update(commitSha)
    .digest("hex")
    .slice(0, 32);
  const serialNumber = `urn:uuid:${serialSeed.slice(0, 8)}-${serialSeed.slice(8, 12)}-${serialSeed.slice(12, 16)}-${serialSeed.slice(16, 20)}-${serialSeed.slice(20)}`;
  return {
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    serialNumber,
    version: 1,
    metadata: {
      component: {
        type: "application",
        name: packageName,
        version: packageVersion,
        purl: rootPurl,
      },
      properties: [{ name: "cvg:source-sha", value: commitSha }],
    },
    components: [...components.values()].sort((left, right) =>
      left["bom-ref"].localeCompare(right["bom-ref"]),
    ),
  };
}

export function findRedactionFindings(relativePath, text) {
  const findings = [];
  for (const rule of redactionRules) {
    rule.expression.lastIndex = 0;
    if (rule.expression.test(text)) {
      findings.push({ path: relativePath, rule: rule.name });
    }
    rule.expression.lastIndex = 0;
  }
  return findings;
}

export function createSha256Manifest(entries) {
  return `${[...entries]
    .sort((left, right) => left.path.localeCompare(right.path))
    .map(
      ({ path, content }) =>
        `${createHash("sha256").update(content).digest("hex")}  ${path}`,
    )
    .join("\n")}\n`;
}

function parseArguments(argv) {
  const options = { paths: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--sha" || argument === "--out-dir") {
      const value = argv[index + 1];
      if (value === undefined || value.length === 0) {
        throw new Error(`${argument} requires a value`);
      }
      options[argument === "--sha" ? "sha" : "outDir"] = value;
      index += 1;
      continue;
    }
    if (argument === "--paths") {
      options.paths = argv.slice(index + 1);
      break;
    }
    throw new Error(`unknown argument: ${argument}`);
  }
  if (
    typeof options.sha !== "string" ||
    !/^[0-9a-f]{7,64}$/iu.test(options.sha)
  ) {
    throw new Error("--sha must be a hexadecimal checkout SHA");
  }
  if (typeof options.outDir !== "string" || options.outDir.length === 0) {
    throw new Error("--out-dir is required");
  }
  return options;
}

function toProjectRelative(absolutePath) {
  const projectRelative = relative(projectRoot, absolutePath).replaceAll(
    "\\",
    "/",
  );
  if (projectRelative.startsWith("../") || projectRelative === "..") {
    throw new Error(`artifact path escapes project root: ${projectRelative}`);
  }
  return projectRelative;
}

async function collectFiles(targetPath) {
  const absolutePath = resolve(projectRoot, targetPath);
  let information;
  try {
    information = await lstat(absolutePath);
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
  if (information.isSymbolicLink()) return [];
  if (information.isFile()) {
    return [{ absolutePath, path: toProjectRelative(absolutePath) }];
  }
  if (!information.isDirectory()) return [];
  const children = (await readdir(absolutePath)).sort((left, right) =>
    left.localeCompare(right),
  );
  const files = [];
  for (const child of children) {
    files.push(...(await collectFiles(join(targetPath, child))));
  }
  return files;
}

async function collectArtifactEntries(targets, manifestPath) {
  const files = new Map();
  for (const target of targets) {
    for (const file of await collectFiles(target)) {
      if (file.path === manifestPath) continue;
      files.set(file.path, file);
    }
  }
  return Promise.all(
    [...files.values()]
      .sort((left, right) => left.path.localeCompare(right.path))
      .map(async (file) => ({
        path: file.path,
        content: await readFile(file.absolutePath),
      })),
  );
}

async function run() {
  const options = parseArguments(process.argv.slice(2));
  const outputDirectory = resolve(projectRoot, options.outDir);
  const outputRelativeDirectory = toProjectRelative(outputDirectory);
  const manifestPath = `${outputRelativeDirectory}/artifact-manifest.sha256`;
  const sbomPath = join(outputDirectory, "sbom.cdx.json");
  const governancePath = join(outputDirectory, "artifact-governance.json");
  await mkdir(outputDirectory, { recursive: true });

  const packageJson = JSON.parse(
    await readFile(join(projectRoot, "package.json"), "utf8"),
  );
  const dependencyTree = JSON.parse(
    execFileSync(
      "pnpm",
      ["list", "--json", "--depth", "Infinity", "--prod", "--recursive"],
      { cwd: projectRoot, encoding: "utf8", maxBuffer: 128 * 1024 * 1024 },
    ),
  );
  const sbom = createCycloneDxSbom({
    dependencyTree,
    packageName: packageJson.name,
    packageVersion: packageJson.version,
    commitSha: options.sha,
  });
  await writeFile(sbomPath, `${JSON.stringify(sbom, null, 2)}\n`, "utf8");

  const targets = [...options.paths, options.outDir];
  let entries = await collectArtifactEntries(targets, manifestPath);
  let findings = [];
  for (const entry of entries) {
    if (entry.content.includes(0)) continue;
    findings = findings.concat(
      findRedactionFindings(entry.path, entry.content.toString("utf8")),
    );
  }
  if (findings.length > 0) {
    throw new Error(
      `artifact redaction scan failed: ${findings.map(({ path, rule }) => `${path} (${rule})`).join(", ")}`,
    );
  }

  await writeFile(
    governancePath,
    `${JSON.stringify(
      {
        governanceVersion: ARTIFACT_GOVERNANCE_VERSION,
        status: "PASS",
        commitSha: options.sha,
        redactionFindings: 0,
        scannedPaths: options.paths,
        artifactCount: entries.length + 1,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  entries = await collectArtifactEntries(targets, manifestPath);
  findings = [];
  for (const entry of entries) {
    if (entry.content.includes(0)) continue;
    findings = findings.concat(
      findRedactionFindings(entry.path, entry.content.toString("utf8")),
    );
  }
  if (findings.length > 0) {
    throw new Error(
      `artifact redaction scan failed: ${findings.map(({ path, rule }) => `${path} (${rule})`).join(", ")}`,
    );
  }
  await writeFile(manifestPath, createSha256Manifest(entries), "utf8");
  console.log(
    JSON.stringify({
      status: "PASS",
      governanceVersion: ARTIFACT_GOVERNANCE_VERSION,
      commitSha: options.sha,
      artifactCount: entries.length,
      manifest: manifestPath,
      sbom: toProjectRelative(sbomPath),
    }),
  );
}

const invokedFile =
  process.argv[1] === undefined ? undefined : resolve(process.argv[1]);
if (invokedFile === fileURLToPath(import.meta.url)) {
  try {
    await run();
  } catch (error) {
    console.error(
      JSON.stringify({
        status: "FAIL",
        code: "artifact_governance_failed",
        message: error instanceof Error ? error.message : "unknown error",
      }),
    );
    process.exitCode = 1;
  }
}
