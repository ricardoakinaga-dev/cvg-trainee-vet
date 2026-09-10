import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * AAA-CERT-004 §36 — evidence freshness rule.
 *
 * A tracked file can never contain its own future commit SHA, and evidence
 * producers stamp the tree they measured. Freshness therefore means: the
 * stamped SHA is an ancestor of HEAD with no RUNTIME diff since. Docs-only
 * commits (docs/, BRIEFING/, prompt copies, scorecards, audits) never
 * invalidate runtime evidence; any change under apps/, packages/, tests/,
 * scripts/, .github/ or root configs does.
 */
export const RUNTIME_TOP_LEVELS = Object.freeze([
  "apps",
  "packages",
  "tests",
  "scripts",
  ".github",
]);

export const RUNTIME_ROOT_FILES = Object.freeze([
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "vitest.config.ts",
  "tsconfig.json",
  "tsconfig.base.json",
  "eslint.config.mjs",
  "drizzle.config.ts",
  "playwright.config.ts",
  "architecture-boundaries.json",
  "traceability.yml",
]);

export async function runtimeDiffSince(root, sha, head) {
  const { stdout } = await execFileAsync(
    "git",
    ["diff", "--name-only", sha, head, "--"],
    { cwd: root },
  );
  return stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter(
      (line) =>
        RUNTIME_TOP_LEVELS.some(
          (top) => line === top || line.startsWith(`${top}/`),
        ) || RUNTIME_ROOT_FILES.includes(line),
    );
}

export async function isEvidenceFresh(root, sha, head) {
  if (!/^[0-9a-f]{40}$/u.test(sha ?? "")) {
    return { fresh: false, detail: `not a full SHA: ${String(sha)}` };
  }
  if (sha === head) return { fresh: true, detail: sha };
  try {
    await execFileAsync("git", ["merge-base", "--is-ancestor", sha, head], {
      cwd: root,
    });
  } catch {
    return { fresh: false, detail: `${sha} is not an ancestor of ${head}` };
  }
  const runtimeChanged = await runtimeDiffSince(root, sha, head);
  if (runtimeChanged.length > 0) {
    return {
      fresh: false,
      detail: `runtime changed since ${sha}: ${runtimeChanged.slice(0, 5).join(", ")}`,
    };
  }
  return { fresh: true, detail: `${sha} (docs-only since)` };
}
