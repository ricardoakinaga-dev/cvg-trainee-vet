import { readFile } from "node:fs/promises";

const manifest = await readFile("traceability.yml", "utf8");
const requiredMarkers = [
  "version:",
  "project:",
  "artifacts:",
  "SPEC-GATE-0190",
  "QUALITY-TEST-0118",
];
const missing = requiredMarkers.filter((marker) => !manifest.includes(marker));

if (missing.length > 0) {
  console.error(`traceability manifest is incomplete: ${missing.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log("traceability manifest: valid baseline");
}
