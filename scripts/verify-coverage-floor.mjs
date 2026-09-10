import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "..", "..");
const FLOOR = Object.freeze({
  statements: 90,
  branches: 85,
  functions: 90,
  lines: 90,
});

async function main() {
  const raw = await readFile(
    join(root, "coverage", "coverage-summary.json"),
    "utf8",
  );
  const summary = JSON.parse(raw);
  const total = summary?.total;
  if (total === undefined || typeof total !== "object") {
    console.error("FAIL: coverage-summary.json has no total section");
    process.exitCode = 1;
    return;
  }
  let failed = false;
  for (const [key, floor] of Object.entries(FLOOR)) {
    const section = total[key];
    if (section === undefined || typeof section.pct !== "number") {
      console.error(`FAIL: coverage ${key} is missing`);
      failed = true;
      continue;
    }
    const ok = section.pct >= floor;
    console.log(
      `${ok ? "ok" : "FAIL"}: coverage ${key} = ${section.pct.toFixed(2)}% (floor ${floor}%)`,
    );
    if (!ok) failed = true;
  }
  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`FAIL: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
