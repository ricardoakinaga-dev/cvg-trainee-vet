import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const KNOWN_PINS = new Map([
  ["actions/checkout@v4", "11d5960a326750d5838078e36cf38b85af677262"],
  ["actions/setup-node@v4", "49933ea5288caeca8642d1e84afbd3f7d6820020"],
  ["actions/upload-artifact@v4", "ea165f8d65b6e75b540449e92b4886f43607fa02"],
  [
    "actions/dependency-review-action@v4.9.0",
    "2031cfc080254a8a887f58cffee85186f0e49e48",
  ],
  ["github/codeql-action@v3", "6f5948dfacef28e207b48d0905cf90c03365536d"],
]);

const USES_PATTERN =
  /^(\s*-?\s*uses:\s*)([A-Za-z0-9_./-]+\/[\w.-]+)@([A-Za-z0-9_./-]+)(\s*(?:#.*)?)$/gmu;

async function resolveSha(repo, tag) {
  try {
    const { stdout } = await execFileAsync(
      "curl",
      ["-s", `https://api.github.com/repos/${repo}/git/ref/tags/${tag}`],
      { timeout: 15000 },
    );
    const payload = JSON.parse(stdout);
    const object = payload.object ?? {};
    if (object.type === "commit" && typeof object.sha === "string") {
      return object.sha;
    }
    if (object.type === "tag" && typeof object.sha === "string") {
      const nested = await execFileAsync(
        "curl",
        [`https://api.github.com/repos/${repo}/git/tags/${object.sha}`],
        { timeout: 15000 },
      );
      return JSON.parse(nested.stdout).object.sha;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function shortVersion(tag) {
  return tag.startsWith("v") ? tag : tag;
}

export async function pinWorkflowUses(content, resolve = resolveSha) {
  const matches = [...content.matchAll(USES_PATTERN)];
  let pinned = content;
  for (const match of matches) {
    const [, prefix, repo, tag] = match;
    const key = `${repo}@${tag}`;
    if (/^[0-9a-f]{40}$/u.test(tag)) continue;
    const known = KNOWN_PINS.get(key);
    const sha = known ?? (await resolve(repo, tag));
    if (sha === undefined) {
      throw new Error(`cannot resolve pin for ${key}`);
    }
    pinned = pinned.replace(
      match[0],
      `${prefix}${repo}@${sha} # ${shortVersion(tag)}`,
    );
  }
  return pinned;
}

async function main() {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error("usage: node scripts/pin-actions.mjs <workflow.yml> [...]");
    process.exitCode = 2;
    return;
  }
  for (const file of files) {
    const content = await readFile(file, "utf8");
    const pinned = await pinWorkflowUses(content);
    if (pinned !== content) {
      await writeFile(file, pinned);
      console.log(`pinned: ${file}`);
    } else {
      console.log(`unchanged: ${file}`);
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
