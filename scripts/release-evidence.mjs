import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = process.cwd();

async function git(args) {
  try {
    const { stdout } = await execFileAsync("git", args, { cwd: root });
    return stdout.trim();
  } catch {
    return "unknown";
  }
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

async function migrationHead() {
  const journal = JSON.parse(
    await readFile(
      join(root, "packages/persistence/drizzle/meta/_journal.json"),
      "utf8",
    ),
  );
  const entries = journal.entries ?? [];
  return entries.length > 0 ? entries[entries.length - 1].tag : "unknown";
}

async function digestTree() {
  const { stdout } = await execFileAsync("git", ["ls-files", "-s"], {
    cwd: root,
  });
  return sha256(stdout);
}

async function main() {
  const outDir =
    process.argv
      .find((arg) => arg.startsWith("--out-dir="))
      ?.slice("--out-dir=".length) ?? "release-evidence";
  await mkdir(outDir, { recursive: true });

  const commit = await git(["rev-parse", "HEAD"]);
  const branch = await git(["rev-parse", "--abbrev-ref", "HEAD"]);
  const lockfile = await readFile(join(root, "pnpm-lock.yaml"), "utf8").catch(
    () => "",
  );
  const packageManifest = await readFile(
    join(root, "package.json"),
    "utf8",
  ).catch(() => "");
  const files = await readdir(join(root, "packages/persistence/drizzle")).catch(
    () => [],
  );

  const provenance = {
    format: "cvg-release-provenance/v1",
    commit,
    branch,
    buildTimestamp: new Date().toISOString(),
    nodeVersion: process.version,
    lockfileSha256: lockfile === "" ? "unknown" : sha256(lockfile),
    manifestSha256:
      packageManifest === "" ? "unknown" : sha256(packageManifest),
    migrationHead: await migrationHead(),
    migrationFiles: files.filter((file) => file.endsWith(".sql")).length,
    treeDigest: await digestTree(),
  };

  await writeFile(join(outDir, "commit.txt"), `${commit}\n`);
  await writeFile(
    join(outDir, "provenance.json"),
    `${JSON.stringify(provenance, null, 2)}\n`,
  );
  await writeFile(
    join(outDir, "migration-head.txt"),
    `${provenance.migrationHead}\n`,
  );
  await writeFile(
    join(outDir, "manifest.json"),
    `${JSON.stringify(
      {
        format: "cvg-release-evidence/v1",
        commit,
        artifacts: [
          "commit.txt",
          "provenance.json",
          "migration-head.txt",
          "artifact-digests.txt",
        ],
        note: "test/coverage/security summaries are attached by CI from quality and security workflow artifacts",
      },
      null,
      2,
    )}\n`,
  );
  await writeFile(
    join(outDir, "artifact-digests.txt"),
    `provenance.json sha256=${sha256(
      await readFile(join(outDir, "provenance.json"), "utf8"),
    )}\n`,
  );
  console.log(`release evidence written to ${outDir} at ${commit}`);
}

await main();
