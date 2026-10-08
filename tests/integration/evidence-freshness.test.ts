import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  isEvidenceFresh,
  latestAuditPath,
  isRuntimePath,
} from "../../scripts/evidence-freshness.mjs";

const repos: string[] = [];
function git(root: string, ...args: string[]) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}
async function repository() {
  const root = await mkdtemp(join(tmpdir(), "cvg-freshness-"));
  repos.push(root);
  git(root, "init", "--quiet");
  git(root, "config", "user.email", "synthetic@example.invalid");
  git(root, "config", "user.name", "Synthetic test");
  await mkdir(join(root, "apps"));
  await writeFile(join(root, "apps/runtime.ts"), "export const value = 1;\n");
  git(root, "add", ".");
  git(root, "commit", "--quiet", "-m", "synthetic baseline");
  return { root, sha: git(root, "rev-parse", "HEAD") };
}
afterEach(async () => {
  await Promise.all(
    repos.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
describe("promotion evidence freshness", () => {
  it.each([".env.example", ".prettierignore", ".prettierrc.json"])(
    "R7 inventories root configuration %s",
    (path) => {
      expect(isRuntimePath(path)).toBe(true);
    },
  );
  it("rejects ignored runtime bytes and ignore policy changes, while excluding generated output", async () => {
    const { root } = await repository();
    await writeFile(
      join(root, ".gitignore"),
      "node_modules/\ndist/\napps/ignored-runtime.ts\n",
    );
    git(root, "add", ".gitignore");
    git(root, "commit", "--quiet", "-m", "synthetic ignore policy");
    const sha = git(root, "rev-parse", "HEAD");
    await mkdir(join(root, "apps/node_modules/dependency"), {
      recursive: true,
    });
    await mkdir(join(root, "apps/dist"));
    await writeFile(
      join(root, "apps/node_modules/dependency/index.js"),
      "generated dependency\n",
    );
    await writeFile(join(root, "apps/dist/index.js"), "generated output\n");
    expect((await isEvidenceFresh(root, sha, sha)).fresh).toBe(true);
    await writeFile(
      join(root, "apps/ignored-runtime.ts"),
      "export const unmeasured = 1;\n",
    );
    expect((await isEvidenceFresh(root, sha, sha)).fresh).toBe(false);
    await rm(join(root, "apps/ignored-runtime.ts"));
    await writeFile(
      join(root, ".gitignore"),
      "node_modules/\ndist/\napps/ignored-runtime.ts\napps/second-runtime.ts\n",
    );
    expect((await isEvidenceFresh(root, sha, sha)).fresh).toBe(false);
    git(root, "add", ".gitignore");
    expect((await isEvidenceFresh(root, sha, sha)).fresh).toBe(false);
    git(root, "commit", "--quiet", "-m", "ignore policy changed");
    expect(
      (await isEvidenceFresh(root, sha, git(root, "rev-parse", "HEAD"))).fresh,
    ).toBe(false);
  });
  it("excludes generated browser screenshots but still inventories sibling untracked runtime files", async () => {
    const { root, sha } = await repository();
    await mkdir(
      join(root, "apps/web/tests/__screenshots__/journey.browser.test.tsx"),
      {
        recursive: true,
      },
    );
    await writeFile(
      join(
        root,
        "apps/web/tests/__screenshots__/journey.browser.test.tsx/failure-1.png",
      ),
      "synthetic png bytes\n",
    );
    expect((await isEvidenceFresh(root, sha, sha)).fresh).toBe(true);
    await writeFile(
      join(root, "apps/web/tests/journey.browser.test.tsx"),
      "export const spec = 1;\n",
    );
    const dirty = await isEvidenceFresh(root, sha, sha);
    expect(dirty.fresh).toBe(false);
    expect(dirty.detail).toContain("apps/web/tests/journey.browser.test.tsx");
    expect(dirty.detail).not.toContain("__screenshots__");
  });
  it("accepts clean identity and preserves the measured SHA across docs commits", async () => {
    const { root, sha } = await repository();
    expect(await isEvidenceFresh(root, sha, sha)).toMatchObject({
      fresh: true,
      evidence_sha: sha,
      candidate_sha: sha,
    });
    await mkdir(join(root, "docs"));
    await writeFile(
      join(root, "docs/history.md"),
      "historical documentation\n",
    );
    git(root, "add", ".");
    git(root, "commit", "--quiet", "-m", "docs only");
    const head = git(root, "rev-parse", "HEAD");
    expect(await isEvidenceFresh(root, sha, head)).toMatchObject({
      fresh: true,
      evidence_sha: sha,
      candidate_sha: head,
    });
  });
  it.each(["unstaged", "staged", "untracked"])(
    "rejects %s runtime bytes even at HEAD",
    async (mode) => {
      const { root, sha } = await repository();
      const path =
        mode === "untracked" ? "apps/new runtime.ts" : "apps/runtime.ts";
      await writeFile(join(root, path), "changed runtime\n");
      if (mode === "staged") git(root, "add", path);
      const result = await isEvidenceFresh(root, sha, sha);
      expect(result.fresh).toBe(false);
      expect(result.detail).toContain(path);
    },
  );
  it.each([
    ".nvmrc",
    "stryker.authorization.mjs",
    "stryker.future.mjs",
    "config/triple-aaa-gates.json",
  ])("includes %s in dirty and committed inventory", async (path) => {
    const { root, sha } = await repository();
    await mkdir(join(root, "config"));
    await writeFile(join(root, path), "changed measurement\n");
    expect((await isEvidenceFresh(root, sha, sha)).fresh).toBe(false);
    git(root, "add", path);
    git(root, "commit", "--quiet", "-m", "measurement changed");
    expect(
      (await isEvidenceFresh(root, sha, git(root, "rev-parse", "HEAD"))).fresh,
    ).toBe(false);
  });
  it("rejects nonexistent equal SHAs and a candidate different from checkout", async () => {
    const { root, sha } = await repository();
    expect(
      (await isEvidenceFresh(root, "a".repeat(40), "a".repeat(40))).fresh,
    ).toBe(false);
    await writeFile(join(root, "apps/runtime.ts"), "committed change\n");
    git(root, "add", ".");
    git(root, "commit", "--quiet", "-m", "new runtime");
    expect((await isEvidenceFresh(root, sha, sha)).fresh).toBe(false);
  });
  it.each(["unstaged", "staged", "committed", "untracked"])(
    "rejects dependency patch %s instead of labeling runtime bytes docs-only",
    async (mode) => {
      const { root } = await repository();
      await mkdir(join(root, "patches"));
      const path = "patches/dependency.patch";
      await writeFile(join(root, path), "old dependency runtime bytes\n");
      git(root, "add", path);
      git(root, "commit", "--quiet", "-m", "synthetic patched dependency");
      const sha = git(root, "rev-parse", "HEAD");
      expect((await isEvidenceFresh(root, sha, sha)).fresh).toBe(true);
      const changed =
        mode === "untracked" ? "patches/new-dependency.patch" : path;
      await writeFile(
        join(root, changed),
        "changed dependency runtime bytes\n",
      );
      if (mode === "staged" || mode === "committed") git(root, "add", changed);
      if (mode === "committed")
        git(root, "commit", "--quiet", "-m", "dependency runtime changed");
      const result = await isEvidenceFresh(
        root,
        sha,
        git(root, "rev-parse", "HEAD"),
      );
      expect(result.fresh).toBe(false);
      expect(result.detail).toContain(changed);
      expect(result.detail).not.toContain("docs-only since");
      expect(result.evidence_sha).toBe(sha);
    },
  );
  it.each([".npmrc", ".pnpmfile.cjs", ".pnpmfile.mjs"])(
    "rejects dependency install input %s, staged and committed",
    async (path) => {
      const { root, sha } = await repository();
      await writeFile(join(root, path), "synthetic installation policy\n");
      expect((await isEvidenceFresh(root, sha, sha)).fresh).toBe(false);
      git(root, "add", path);
      expect((await isEvidenceFresh(root, sha, sha)).fresh).toBe(false);
      git(root, "commit", "--quiet", "-m", "installation policy changed");
      expect(
        (await isEvidenceFresh(root, sha, git(root, "rev-parse", "HEAD")))
          .fresh,
      ).toBe(false);
    },
  );
  it("selects the same latest numeric audit for both consumers", async () => {
    const { root } = await repository();
    await mkdir(join(root, "docs/audits"), { recursive: true });
    for (const version of [6, 7, 10])
      await writeFile(
        join(root, `docs/audits/state-of-art-final-audit-v${version}.json`),
        "{}\n",
      );
    expect(await latestAuditPath(root)).toBe(
      join(root, "docs/audits/state-of-art-final-audit-v10.json"),
    );
  });
});
