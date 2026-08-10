import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const root = process.cwd();
const ignoredDirectories = new Set([
  ".git",
  "node_modules",
  "dist",
  "coverage",
  ".next",
]);
const textExtensions = new Set([
  ".js",
  ".mjs",
  ".ts",
  ".tsx",
  ".json",
  ".yaml",
  ".yml",
  ".md",
  ".toml",
  ".env",
]);
const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /(?:sk|rk)-[A-Za-z0-9]{20,}/,
  /(?:api[_-]?key|password|secret|token)\s*[:=]\s*["'][^"']{12,}["']/i,
];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name))
        files.push(...(await walk(join(directory, entry.name))));
      continue;
    }
    if (textExtensions.has(entry.name.slice(entry.name.lastIndexOf("."))))
      files.push(join(directory, entry.name));
  }
  return files;
}

const findings = [];
for (const file of await walk(root)) {
  const content = await readFile(file, "utf8");
  for (const pattern of secretPatterns) {
    if (pattern.test(content)) {
      findings.push(relative(root, file));
      break;
    }
  }
}

if (findings.length > 0) {
  console.error(`Potential secret pattern found in: ${findings.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log("secret scan: clean");
}
