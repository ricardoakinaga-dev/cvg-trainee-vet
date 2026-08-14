import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";

import {
  resolveClinicalSourceFile,
  resolveClinicalSourcesDirectory,
} from "./clinical-source-location.mjs";

const root = process.cwd();
const manifest = JSON.parse(
  await readFile(join(root, "clinical-sources.json"), "utf8"),
);
const sourcesDirectory = resolveClinicalSourcesDirectory({
  rootDirectory: root,
});

if (!Array.isArray(manifest.sources) || manifest.sources.length !== 3) {
  throw new Error(
    "clinical source manifest must contain exactly three sources",
  );
}

const allowedCodes = new Set(manifest.sources.map((source) => source.code));
const errors = [];

for (const source of manifest.sources) {
  const filePath = resolveClinicalSourceFile(sourcesDirectory, source.fileName);
  try {
    const file = await readFile(filePath);
    const hash = createHash("sha256").update(file).digest("hex");
    if (hash !== source.sha256) {
      errors.push(`${source.code}: sha256 mismatch`);
    }
    const metadata = await stat(filePath);
    if (!metadata.isFile() || metadata.size === 0) {
      errors.push(`${source.code}: source file is empty or not a regular file`);
    }
  } catch {
    errors.push(`${source.code}: source file is missing`);
  }
}

const curriculumFiles = (
  await readdir(join(root, "packages/curriculum/src"))
).filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"));
const forbiddenMarkers = [
  "F-01",
  "F-02",
  "F-03",
  "AAHA-2024",
  "RECOVER-2024",
  "WSAVA-2022",
  "AVHTM-TRACS-2021",
];
for (const file of curriculumFiles) {
  const content = await readFile(
    join(root, "packages/curriculum/src", file),
    "utf8",
  );
  for (const marker of forbiddenMarkers) {
    if (content.includes(marker)) {
      errors.push(`${file}: forbidden external/legacy source marker ${marker}`);
    }
  }
}

for (const source of manifest.sources) {
  if (!allowedCodes.has(source.code))
    errors.push(`${source.code}: unknown code`);
  if (!Number.isInteger(source.pages) || source.pages < 1) {
    errors.push(`${source.code}: invalid page count`);
  }
}

if (errors.length > 0) {
  console.error(`clinical source governance failed:\n- ${errors.join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log(
    `clinical source governance: PASS (${manifest.sources.length} immutable PDFs, hashes verified)`,
  );
}
