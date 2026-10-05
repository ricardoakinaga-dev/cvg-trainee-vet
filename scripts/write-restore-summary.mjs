import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { promisify } from "node:util";

import { createRestoreSummary } from "./restore-summary-contract.mjs";

const execFileAsync = promisify(execFile);
const root = fileURLToPath(new URL("../", import.meta.url));

/**
 * AAA-CERT-005 §51 — produce candidate-bound restore evidence.
 *
 * Local runs use the isolated historical PostgreSQL 16 drill, which binds to
 * a private Unix socket. CI can explicitly provide an owner-capable external
 * source through CVG_RESTORE_SOURCE_DATABASE_URL.
 */
async function main() {
  const externalSource = process.env.CVG_RESTORE_SOURCE_DATABASE_URL?.trim();
  const verifier =
    externalSource === undefined || externalSource === ""
      ? "verify-restore-migrations.mjs"
      : "verify-postgres-restore.mjs";
  const childEnvironment = { ...process.env };
  if (externalSource === undefined || externalSource === "") {
    delete childEnvironment.CVG_RESTORE_SOURCE_DATABASE_URL;
  } else {
    childEnvironment.CVG_RESTORE_SOURCE_DATABASE_URL = externalSource;
  }

  const { stdout } = await execFileAsync(
    process.execPath,
    [join(root, "scripts", verifier)],
    {
      cwd: root,
      env: childEnvironment,
      timeout: 600_000,
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  const result = JSON.parse(stdout.trim());
  const { stdout: sha } = await execFileAsync("git", ["rev-parse", "HEAD"], {
    cwd: root,
  });
  const summary = createRestoreSummary({
    result,
    sha: sha.trim(),
    generatedAt: new Date().toISOString(),
  });
  if (summary.status !== "PASS") {
    throw new Error("restore verification FAIL");
  }

  await mkdir(join(root, "release-evidence"), { recursive: true });
  await writeFile(
    join(root, "release-evidence", "restore-summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
  console.log(
    `restore summary written (verificationDurationMs=${summary.verificationDurationMs})`,
  );
}

await main().catch((error) => {
  console.error(`restore summary failed: ${error.message}`);
  process.exitCode = 1;
});
