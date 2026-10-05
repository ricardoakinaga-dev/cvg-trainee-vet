import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Single source of truth for promotion thresholds.
// Matrix: docs/54 §4 (G01–G73) → config/triple-aaa-gates.json.
// Every promotion gate loads this file; no script may hardcode a
// divergent threshold. Missing/invalid config is fatal (fail-closed).
const here = dirname(fileURLToPath(import.meta.url));

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

export async function loadGateConfig() {
  let raw;
  try {
    raw = await readFile(
      join(here, "..", "config", "triple-aaa-gates.json"),
      "utf8",
    );
  } catch {
    throw new Error("gate config missing: config/triple-aaa-gates.json");
  }
  let config;
  try {
    config = JSON.parse(raw);
  } catch {
    throw new Error("gate config unparsable: config/triple-aaa-gates.json");
  }
  const numbers = [
    config?.coverage?.statements_min,
    config?.coverage?.branches_min,
    config?.coverage?.functions_min,
    config?.coverage?.lines_min,
    config?.mutation?.adjusted_critical_min,
    config?.mutation?.real_critical_survivors_max,
    config?.scores?.engineering_min,
    config?.scores?.security_min,
    config?.scores?.operations_min,
    config?.findings?.p0_max,
    config?.findings?.p1_max,
  ];
  if (
    config?.format !== "cvg-triple-aaa-gates/v1" ||
    numbers.some((value) => !isFiniteNumber(value))
  ) {
    throw new Error("gate config schema invalid: config/triple-aaa-gates.json");
  }
  return config;
}
