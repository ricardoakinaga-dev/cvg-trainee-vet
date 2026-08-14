import { readFile } from "node:fs/promises";

import {
  loadPremiumTraceabilitySnapshot,
  validatePremiumTraceabilitySnapshot,
} from "./verify-premium-enterprise-traceability.mjs";
import {
  loadScopeDriftSnapshot,
  validateScopeDriftSnapshot,
} from "./verify-scope-drift.mjs";

const manifest = await readFile("traceability.yml", "utf8");
const requiredMarkers = [
  "version:",
  "project:",
  "artifacts:",
  "SPEC-GATE-0190",
  "QUALITY-TEST-0118",
];
const missing = requiredMarkers.filter((marker) => !manifest.includes(marker));
const premium = validatePremiumTraceabilitySnapshot(
  await loadPremiumTraceabilitySnapshot(),
);
const scopeDrift = validateScopeDriftSnapshot(await loadScopeDriftSnapshot());

if (
  missing.length > 0 ||
  premium.errors.length > 0 ||
  scopeDrift.errors.length > 0
) {
  const findings = [
    ...missing.map((marker) => `missing marker: ${marker}`),
    ...premium.errors,
    ...scopeDrift.errors,
  ];
  console.error(
    `traceability manifest is incomplete (${findings.length} findings):`,
  );
  for (const finding of findings) console.error(`- ${finding}`);
  process.exitCode = 1;
} else {
  console.log(
    `traceability manifest: valid baseline; premium matrix ${premium.requirements} requirements, ${premium.completeChains} complete chains, ${premium.mappedWithGaps} explicit gaps, ${premium.localEvidenceRows} local-evidence rows and ${premium.p0p1LocalEvidenceRows}/${premium.p0p1Requirements} P0/P1 local-evidence rows; scope drift ${scopeDrift.capabilityCount} capabilities, ${scopeDrift.decisionCount} decisions, ${scopeDrift.requirementCount} requirements`,
  );
}
