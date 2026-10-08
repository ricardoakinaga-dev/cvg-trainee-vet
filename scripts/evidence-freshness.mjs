import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

const execFileAsync = promisify(execFile);

/**
 * AAA-CERT-004 §36 — evidence freshness rule.
 *
 * A tracked file can never contain its own future commit SHA, and evidence
 * producers stamp the tree they measured. Freshness therefore means: the
 * stamped SHA is an ancestor of the checked-out candidate with no RUNTIME
 * diff since, including staged, unstaged and untracked runtime/config bytes.
 * Equality with HEAD never bypasses the clean-checkout check. Docs-only
 * commits (docs/, BRIEFING/, prompt copies, scorecards, audits) never
 * invalidate runtime evidence; any change under apps/, packages/, tests/,
 * scripts/, .github/, config/, dependency patches or installation/toolchain
 * root configs does.
 */
export const RUNTIME_TOP_LEVELS = Object.freeze([
  "apps",
  "packages",
  "tests",
  "scripts",
  ".github",
  "config",
  "patches",
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
  ".nvmrc",
  ".gitignore",
  ".npmrc",
  ".pnpmfile.cjs",
  ".pnpmfile.mjs",
  ".env.example",
  ".prettierignore",
]);

export function isRuntimePath(path) {
  return (
    RUNTIME_TOP_LEVELS.some(
      (top) => path === top || path.startsWith(`${top}/`),
    ) ||
    RUNTIME_ROOT_FILES.includes(path) ||
    /^stryker(?:\.[^/]+)?\.mjs$/u.test(path) ||
    /^tsconfig(?:\.[^/]+)?\.json$/u.test(path) ||
    /^\.prettierrc(?:\.[^/]+)?$/u.test(path) ||
    path.endsWith("/.gitignore")
  );
}

export async function latestAuditPath(root) {
  const directory = join(root, "docs/audits");
  const audits = (await readdir(directory))
    .filter((file) => /^state-of-art-final-audit-v\d+\.json$/u.test(file))
    .sort(
      (a, b) =>
        Number(a.match(/v(\d+)\.json$/u)[1]) -
        Number(b.match(/v(\d+)\.json$/u)[1]),
    );
  if (audits.length === 0) throw new Error("no final audit JSON found");
  return join(directory, audits.at(-1));
}

export async function dirtyRuntimePaths(root) {
  const commands = [
    ["diff", "--name-only", "--no-renames", "-z", "HEAD", "--"],
    ["diff", "--cached", "--name-only", "--no-renames", "-z", "HEAD", "--"],
    // Ignore policy cannot hide source. Only explicitly generated trees
    // are excluded from untracked inventory; tracked changes still count.
    [
      "ls-files",
      "--others",
      "-z",
      ...[
        "node_modules",
        "dist",
        ".next",
        ".turbo",
        "coverage",
        "playwright-report",
        "test-results",
        ".stryker-tmp",
        // Browser-test failure screenshots and geometry dumps (generated).
        "__screenshots__",
      ].flatMap((directory) => [
        `--exclude=${directory}/**`,
        `--exclude=**/${directory}/**`,
      ]),
      "--exclude=*.tsbuildinfo",
      "--",
      ...RUNTIME_TOP_LEVELS,
      ...RUNTIME_ROOT_FILES,
      "stryker*.mjs",
      "tsconfig*.json",
      ".prettierrc*",
    ],
  ];
  const outputs = await Promise.all(
    commands.map((args) => execFileAsync("git", args, { cwd: root })),
  );
  return [
    ...new Set(
      outputs.flatMap(({ stdout }) => stdout.split("\0")).filter(isRuntimePath),
    ),
  ].sort();
}

export async function runtimeDiffSince(root, sha, head) {
  const { stdout } = await execFileAsync(
    "git",
    ["diff", "--name-only", "--no-renames", "-z", sha, head, "--"],
    { cwd: root },
  );
  return stdout.split("\0").filter(isRuntimePath);
}

export async function isEvidenceFresh(root, sha, head) {
  const result = (fresh, detail) => ({
    fresh,
    detail,
    evidence_sha: sha ?? null,
    candidate_sha: head ?? null,
  });
  if (
    !/^[0-9a-f]{40}$/u.test(sha ?? "") ||
    !/^[0-9a-f]{40}$/u.test(head ?? "")
  ) {
    return result(
      false,
      `not a full SHA: evidence=${String(sha)} candidate=${String(head)}`,
    );
  }
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], {
      cwd: root,
    });
    if (stdout.trim() !== head)
      return result(
        false,
        `candidate ${head} differs from checkout ${stdout.trim()}`,
      );
    const dirty = await dirtyRuntimePaths(root);
    if (dirty.length > 0)
      return result(
        false,
        `dirty runtime (${dirty.length} paths): ${dirty.join(", ")}`,
      );
    await execFileAsync("git", ["merge-base", "--is-ancestor", sha, head], {
      cwd: root,
    });
    const runtimeChanged = await runtimeDiffSince(root, sha, head);
    if (runtimeChanged.length > 0)
      return result(
        false,
        `runtime changed since ${sha}: ${runtimeChanged.join(", ")}`,
      );
  } catch {
    return result(
      false,
      `cannot verify ${sha} as an ancestor of ${head} in a clean checkout`,
    );
  }
  return result(true, sha === head ? sha : `${sha} (docs-only since)`);
}
