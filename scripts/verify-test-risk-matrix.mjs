import { readFile } from "node:fs/promises";
import { join } from "node:path";

const POLICY_PATH = "test-risk-matrix.json";
const MATRIX_PATH = "traceability.yml";
const MATRIX_ID = "PREMIUM-ENTERPRISE-95-REQUIREMENTS-MATRIX";
const REQUIRED_PROOF_TYPES = Object.freeze([
  "success",
  "error",
  "denied",
  "conflict",
]);
const REQUIRED_LAYERS = Object.freeze([
  "unit",
  "application",
  "contract",
  "integration",
  "worker",
  "web",
  "e2e",
  "security",
]);

function parsePolicy(snapshot, errors) {
  const raw = snapshot.get(POLICY_PATH);
  if (typeof raw !== "string") {
    errors.push(`missing ${POLICY_PATH}`);
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    errors.push(`${POLICY_PATH} is not valid JSON`);
    return null;
  }
}

function matrixBlock(manifest) {
  const marker = `id: "${MATRIX_ID}"`;
  const markerIndex = manifest.indexOf(marker);
  if (markerIndex < 0) return "";
  const start = manifest.lastIndexOf("  - ", markerIndex);
  const endCandidates = [
    manifest.indexOf("\n  - id:", start + 1),
    manifest.indexOf("\nscope_control:", start + 1),
    manifest.indexOf("\nnotes:", start + 1),
  ].filter((index) => index >= 0);
  const end =
    endCandidates.length > 0 ? Math.min(...endCandidates) : manifest.length;
  return manifest.slice(start, end);
}

function matrixRows(manifest) {
  const block = matrixBlock(manifest);
  const coverageStart = block.indexOf("coverage:");
  if (coverageStart < 0) return [];
  const coverage = block.slice(coverageStart);
  return [...coverage.matchAll(/^\s*-\s+"([^"\n]+)"\s*$/gmu)].map((match) =>
    match[1].split("|"),
  );
}

function testReferences(row) {
  const testField = row[6] ?? "";
  if (testField.startsWith("GAP:")) return [];
  return testField.split(",").filter((reference) => reference.length > 0);
}

function configuredProofReferences(policy, proofType) {
  const references = policy?.proofReferencePaths?.[proofType];
  return new Set(
    Array.isArray(references)
      ? references.filter(
          (reference) => typeof reference === "string" && reference.length > 0,
        )
      : [],
  );
}

function layersForReference(reference) {
  const normalized = reference.toLowerCase();
  const layers = new Set();
  if (normalized.includes("packages/domain/src")) layers.add("unit");
  if (normalized.includes("packages/application/src"))
    layers.add("application");
  if (normalized.includes("packages/contracts/src")) layers.add("contract");
  if (normalized.includes("packages/persistence/src"))
    layers.add("integration");
  if (normalized.includes("tests/integration")) layers.add("integration");
  if (normalized.includes("apps/worker")) layers.add("worker");
  if (normalized.includes("apps/web") || normalized.includes("tests/e2e"))
    layers.add("web");
  if (normalized.includes("tests/e2e")) layers.add("e2e");
  if (
    /(security|auth|rls|forbidden|access|authorization|exposure|public-boundary)/u.test(
      normalized,
    )
  ) {
    layers.add("security");
  }
  return layers;
}

function proofCoverage(row, policy) {
  const references = testReferences(row);
  const joined = references.join(" ").toLowerCase();
  const errorReferences = configuredProofReferences(policy, "error");
  return Object.freeze({
    success: references.length > 0,
    error: references.some((reference) => errorReferences.has(reference)),
    denied:
      /(security|auth|rls|forbidden|access|authorization|exposure|public-boundary)/u.test(
        joined,
      ),
    conflict:
      /(idempot|concurr|version|transition|workflow|correction|attempt|learning-state|migration|lock)/u.test(
        joined,
      ),
  });
}

function analyzeRows(rows, policy) {
  const requiredRows = rows.filter((row) => ["P0", "P1"].includes(row[1]));
  const proofCoverageByType = Object.fromEntries(
    REQUIRED_PROOF_TYPES.map((proofType) => [
      proofType,
      requiredRows.filter((row) => proofCoverage(row, policy)[proofType])
        .length,
    ]),
  );
  const layerCoverage = Object.fromEntries(
    REQUIRED_LAYERS.map((layer) => [
      layer,
      requiredRows.filter((row) =>
        testReferences(row).some((reference) =>
          layersForReference(reference).has(layer),
        ),
      ).length,
    ]),
  );
  const completeProofRows = requiredRows.filter((row) =>
    REQUIRED_PROOF_TYPES.every(
      (proofType) => proofCoverage(row, policy)[proofType],
    ),
  ).length;
  return Object.freeze({
    requirements: requiredRows.length,
    proofCoverageByType: Object.freeze(proofCoverageByType),
    layerCoverage: Object.freeze(layerCoverage),
    completeProofRows,
  });
}

export function validateTestRiskMatrix(snapshot) {
  const errors = [];
  const policy = parsePolicy(snapshot, errors);
  const manifest = snapshot.get(MATRIX_PATH);
  if (typeof manifest !== "string") errors.push(`missing ${MATRIX_PATH}`);
  if (policy === null || typeof manifest !== "string")
    return Object.freeze(errors);

  if (policy.version !== 1) errors.push("test risk matrix version must be 1");
  if (policy.task !== "ENT95-14-A")
    errors.push("test risk matrix task must be ENT95-14-A");
  if (policy.sourceMatrix !== MATRIX_PATH)
    errors.push("test risk matrix source must be traceability.yml");
  if (
    JSON.stringify(policy.requiredPriorities ?? []) !==
    JSON.stringify(["P0", "P1"])
  )
    errors.push("test risk matrix priorities must be P0,P1");
  const proofTypes = Array.isArray(policy.proofTypes)
    ? policy.proofTypes.map((proofType) => proofType?.id)
    : [];
  if (JSON.stringify(proofTypes) !== JSON.stringify(REQUIRED_PROOF_TYPES))
    errors.push("required proof types must be success,error,denied,conflict");
  if (
    JSON.stringify(policy.testLayers ?? []) !== JSON.stringify(REQUIRED_LAYERS)
  )
    errors.push("test risk matrix layers are incomplete or reordered");
  if (policy.status !== "PASS_WITH_GAPS")
    errors.push("test risk matrix must remain PASS_WITH_GAPS");
  if (policy.releaseDisposition !== "PILOT_BLOCKED")
    errors.push(
      "test risk matrix release disposition must remain PILOT_BLOCKED",
    );

  const rows = matrixRows(manifest);
  if (rows.length < 87)
    errors.push(
      `premium matrix must expose at least 87 P0/P1 rows, found ${rows.length}`,
    );
  const ids = new Set();
  for (const row of rows) {
    if (row.length !== 12) continue;
    if (ids.has(row[0]))
      errors.push(`risk matrix source row ${row[0]} is duplicated`);
    ids.add(row[0]);
  }
  const analysis = analyzeRows(rows, policy);
  if (analysis.requirements !== 87)
    errors.push(
      `risk matrix must derive 87 P0/P1 requirements, found ${analysis.requirements}`,
    );
  const errorReferences = policy.proofReferencePaths?.error;
  if (!Array.isArray(errorReferences) || errorReferences.length === 0) {
    errors.push(
      "test risk matrix must declare explicit error proof references",
    );
  } else {
    const matrixTestReferences = new Set(
      rows.flatMap((row) => testReferences(row)),
    );
    for (const reference of errorReferences) {
      if (!matrixTestReferences.has(reference)) {
        errors.push(
          `error proof reference is not linked from the premium matrix: ${reference}`,
        );
      }
    }
  }
  return Object.freeze(errors);
}

export function buildTestRiskMatrixReport(snapshot) {
  const errors = validateTestRiskMatrix(snapshot);
  if (errors.length > 0) throw new Error(errors.join("; "));
  const policy = JSON.parse(snapshot.get(POLICY_PATH));
  const analysis = analyzeRows(matrixRows(snapshot.get(MATRIX_PATH)), policy);
  return Object.freeze({
    status: policy.status,
    task: policy.task,
    requirements: analysis.requirements,
    requiredProofTypes: policy.proofTypes.length,
    proofCoverageByType: analysis.proofCoverageByType,
    completeProofRows: analysis.completeProofRows,
    layerCoverage: analysis.layerCoverage,
    releaseDisposition: policy.releaseDisposition,
  });
}

export async function loadTestRiskMatrixSnapshot(
  rootOrSnapshot = process.cwd(),
) {
  if (rootOrSnapshot instanceof Map) return rootOrSnapshot;
  const root =
    typeof rootOrSnapshot === "string" ? rootOrSnapshot : process.cwd();
  const entries = await Promise.all(
    [POLICY_PATH, MATRIX_PATH].map(async (path) => [
      path,
      await readFile(join(root, path), "utf8"),
    ]),
  );
  return new Map(entries);
}

async function main() {
  const snapshot = await loadTestRiskMatrixSnapshot();
  const errors = validateTestRiskMatrix(snapshot);
  if (errors.length > 0) {
    console.error(`test risk matrix gate failed (${errors.length} findings):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log(JSON.stringify(buildTestRiskMatrixReport(snapshot), null, 2));
}

if (process.argv[1]?.endsWith("verify-test-risk-matrix.mjs")) {
  await main();
}
