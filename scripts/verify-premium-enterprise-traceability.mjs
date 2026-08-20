import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const FUNCTIONAL_REQUIREMENTS =
  "BRIEFING/09.PROJETO_CVG_TREINAMENTO/01.PRD/0013_requisitos_funcionais.md";
const NON_FUNCTIONAL_REQUIREMENTS =
  "BRIEFING/09.PROJETO_CVG_TREINAMENTO/01.PRD/0014_requisitos_nao_funcionais_produto.md";
const SPEC_MASTER =
  "BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC/0120_spec_master.md";
const TRACEABILITY = "traceability.yml";
const BACKLOG = "BRIEFING/04.AUDIT/0493_score_95_backlog.md";
const MATRIX_ID = "PREMIUM-ENTERPRISE-95-REQUIREMENTS-MATRIX";

function contentOf(snapshot, path) {
  const value = snapshot.get(path);
  return typeof value === "string" ? value : "";
}

function splitTableRow(line) {
  if (!line.trim().startsWith("|")) return [];
  return line
    .trim()
    .replace(/^\|/u, "")
    .replace(/\|$/u, "")
    .split("|")
    .map((cell) => cell.trim());
}

function decisionIds(classification) {
  const ids = classification.match(/\b(?:D|RN)-\d{3}\b/gu) ?? [];
  return ids.length > 0 ? ids.join(",") : "PRD-FACT";
}

function readFunctionalRequirements(content) {
  return content
    .split("\n")
    .map(splitTableRow)
    .filter((cells) => /^RF-\d{3}$/u.test(cells[0] ?? ""))
    .filter((cells) => cells.some((cell) => /^(P0|P1)$/u.test(cell)))
    .map((cells) => {
      const priority = cells.find((cell) => /^(P0|P1)$/u.test(cell));
      const classification = cells.at(-1) ?? "";
      return Object.freeze({
        id: cells[0],
        priority,
        decisions: decisionIds(classification),
      });
    });
}

function readNonFunctionalRequirements(content) {
  return content
    .split("\n")
    .map(splitTableRow)
    .filter((cells) => /^RNF-\d{3}$/u.test(cells[0] ?? ""))
    .map((cells) =>
      Object.freeze({
        id: cells[0],
        priority: "UNSPECIFIED",
        decisions: decisionIds(cells.at(-1) ?? ""),
      }),
    );
}

function readRequiredRequirements(snapshot) {
  return [
    ...readFunctionalRequirements(contentOf(snapshot, FUNCTIONAL_REQUIREMENTS)),
    ...readNonFunctionalRequirements(
      contentOf(snapshot, NON_FUNCTIONAL_REQUIREMENTS),
    ),
  ];
}

function readCanonicalSpecIds(content) {
  return new Set(
    [...content.matchAll(/\[(\d{4})\s+—/gmu)].map(
      (match) => `SPEC-${match[1]}`,
    ),
  );
}

function readCanonicalTaskIds(content) {
  return new Set(
    [...content.matchAll(/^###\s+(ENT95-\d{2}-[A-Z])\s+—/gmu)].map(
      (match) => match[1],
    ),
  );
}

function readArtifactIds(manifest) {
  return new Set(
    [...manifest.matchAll(/^\s{2}- id: "([^"]+)"/gmu)].map((match) => match[1]),
  );
}

function artifactBlock(manifest) {
  const marker = `id: "${MATRIX_ID}"`;
  const startMarker = manifest.indexOf(marker);
  if (startMarker < 0) return "";
  const start = manifest.lastIndexOf("  - ", startMarker);
  const endCandidates = [
    manifest.indexOf("\n  - id:", start + 1),
    manifest.indexOf("\nscope_control:", start + 1),
    manifest.indexOf("\nnotes:", start + 1),
  ].filter((index) => index >= 0);
  const end =
    endCandidates.length > 0 ? Math.min(...endCandidates) : manifest.length;
  return manifest.slice(start, end);
}

function parseCoverageRows(block) {
  const coverageStart = block.indexOf("coverage:");
  if (coverageStart < 0) return [];
  const coverageEndCandidates = [
    block.indexOf("\n    documents:", coverageStart),
    block.indexOf("\n    specification:", coverageStart),
  ].filter((index) => index >= 0);
  const coverageEnd =
    coverageEndCandidates.length > 0
      ? Math.min(...coverageEndCandidates)
      : block.length;
  const coverage = block.slice(coverageStart, coverageEnd);
  return [...coverage.matchAll(/^\s*-\s+"([^"\n]+)"\s*$/gmu)].map((match) =>
    match[1].split("|"),
  );
}

function hasField(block, field) {
  return new RegExp(`\\n    ${field}:`, "u").test(`\n${block}`);
}

function parseTraceabilityRow(row, requirement, errors) {
  if (row.length !== 12) {
    errors.push(
      `${requirement.id} matrix row must have 12 pipe-delimited fields`,
    );
    return null;
  }
  const [
    id,
    priority,
    spec,
    task,
    module,
    contract,
    test,
    decisions,
    state,
    release,
    commit,
    artifact,
  ] = row;
  if (id !== requirement.id) {
    errors.push(
      `matrix row ${id ?? "<empty>"} does not match ${requirement.id}`,
    );
    return null;
  }
  return {
    id,
    priority,
    spec,
    task,
    module,
    contract,
    test,
    decisions,
    state,
    release,
    commit,
    artifact,
  };
}

function validateCanonicalDestination(
  id,
  field,
  value,
  pattern,
  canonicalIds,
  missingMessage,
  errors,
) {
  if (!pattern.test(value)) {
    errors.push(`${id} has no canonical ${field} destination`);
    return;
  }
  if (canonicalIds.size === 0) return;
  for (const reference of value.split(",")) {
    if (!canonicalIds.has(reference)) {
      errors.push(missingMessage(reference));
    }
  }
}

function validateDispositionFields(id, fields, errors) {
  for (const [field, value] of fields) {
    if (value === undefined || value.trim().length === 0) {
      errors.push(`${id} has an empty ${field} disposition`);
    }
  }
}

function validateSnapshotReferences(id, fields, snapshot, errors) {
  for (const [field, value] of fields) {
    for (const reference of (value ?? "").split(",")) {
      if (
        reference.includes("/") &&
        !reference.startsWith("GAP:") &&
        contentOf(snapshot, reference).trim().length === 0
      ) {
        errors.push(
          `${id} ${field} path is not present in the traceability snapshot: ${reference}`,
        );
      }
    }
  }
}

function validateArtifactReferences(id, artifact, artifactIds, errors) {
  for (const reference of (artifact ?? "").split(",")) {
    if (!reference.startsWith("GAP:") && !artifactIds.has(reference)) {
      errors.push(
        `${id} artifact is not present in traceability.yml: ${reference}`,
      );
    }
  }
}

function validateRowDisposition(row, requirement, errors) {
  if (row.state === "RELEASED" && row.release === "PILOT_APPROVED") {
    errors.push(`${row.id} cannot be RELEASED while release is PILOT_APPROVED`);
  }
  if (
    row.decisions !== requirement.decisions &&
    row.decisions !== "DECISION_PENDING"
  ) {
    errors.push(
      `${row.id} decision mapping does not match the PRD classification`,
    );
  }
}

function validateRow(
  row,
  requirement,
  errors,
  canonicalSpecIds,
  canonicalTaskIds,
  snapshot,
  artifactIds,
) {
  const parsed = parseTraceabilityRow(row, requirement, errors);
  if (parsed === null) return;
  const { id, priority, spec, task, module, contract, test, decisions } =
    parsed;
  if (priority !== requirement.priority) {
    errors.push(`${id} priority drift: expected ${requirement.priority}`);
  }
  validateCanonicalDestination(
    id,
    "SPEC",
    spec,
    /^SPEC-\d{4}(?:,SPEC-\d{4})*$/u,
    canonicalSpecIds,
    (reference) => `${reference} is not present in the canonical SPEC master`,
    errors,
  );
  validateCanonicalDestination(
    id,
    "ENT95 task",
    task,
    /^ENT95-\d{2}-[A-Z](?:,ENT95-\d{2}-[A-Z])*$/u,
    canonicalTaskIds,
    (reference) =>
      `${reference} is not present in the canonical premium backlog`,
    errors,
  );
  validateDispositionFields(
    id,
    [
      ["module", module],
      ["contract", contract],
      ["test", test],
      ["decisions", decisions],
      ["state", parsed.state],
      ["release", parsed.release],
      ["commit", parsed.commit],
      ["artifact", parsed.artifact],
    ],
    errors,
  );
  validateSnapshotReferences(
    id,
    [
      ["module", module],
      ["contract", contract],
      ["test", test],
    ],
    snapshot,
    errors,
  );
  validateArtifactReferences(id, parsed.artifact, artifactIds, errors);
  validateRowDisposition(parsed, requirement, errors);
}

function isCompleteRow(row) {
  if (row.length !== 12) return false;
  const [, , , , module, contract, test, , state, release] = row;
  return (
    ![module, contract, test, row[10], row[11]].some((value) =>
      value.startsWith("GAP:"),
    ) &&
    state === "VERIFIED" &&
    release === "RELEASE_READY"
  );
}

function hasLocalEvidence(row) {
  return (
    row.length === 12 &&
    [row[4], row[5], row[6], row[11]].every(
      (value) => typeof value === "string" && !value.startsWith("GAP:"),
    )
  );
}

const TRACEABILITY_INPUT_PATHS = Object.freeze([
  FUNCTIONAL_REQUIREMENTS,
  NON_FUNCTIONAL_REQUIREMENTS,
  SPEC_MASTER,
  TRACEABILITY,
  BACKLOG,
]);

const TRACEABILITY_ARTIFACT_FIELDS = Object.freeze([
  "coverage",
  "documents",
  "specification",
  "tasks",
  "verification",
  "status",
  "commit",
  "artifact",
]);

function validateTraceabilityInputs(snapshot, manifest, block) {
  const errors = [];
  for (const path of TRACEABILITY_INPUT_PATHS) {
    if (contentOf(snapshot, path).trim().length === 0) {
      errors.push(`missing traceability input: ${path}`);
    }
  }
  if (block.length === 0) {
    errors.push(`traceability has no ${MATRIX_ID} artifact`);
  }
  for (const field of TRACEABILITY_ARTIFACT_FIELDS) {
    if (block.length > 0 && !hasField(block, field)) {
      errors.push(`${MATRIX_ID} has no ${field} field`);
    }
  }
  return errors;
}

function indexCoverageRows(rows, errors) {
  const rowsById = new Map();
  for (const row of rows) {
    const id = row[0];
    if (id !== undefined && rowsById.has(id)) {
      errors.push(`${id} is duplicated in the premium requirements matrix`);
    }
    if (id !== undefined) rowsById.set(id, row);
  }
  return rowsById;
}

function validateRequirementRows(requirements, rowsById, errors, context) {
  for (const requirement of requirements) {
    const row = rowsById.get(requirement.id);
    if (row === undefined) {
      errors.push(
        `${requirement.id} is missing from the premium requirements matrix`,
      );
      continue;
    }
    validateRow(
      row,
      requirement,
      errors,
      context.canonicalSpecIds,
      context.canonicalTaskIds,
      context.snapshot,
      context.artifactIds,
    );
  }
}

function validateUnexpectedRows(requirements, rowsById, errors) {
  const requirementIds = new Set(
    requirements.map((requirement) => requirement.id),
  );
  for (const id of rowsById.keys()) {
    if (!requirementIds.has(id)) {
      errors.push(`${id} is not present in the current PRD requirement set`);
    }
  }
}

function summarizeTraceabilityRows(requirements, rowsById) {
  const completeChains = requirements.filter((requirement) =>
    isCompleteRow(rowsById.get(requirement.id) ?? []),
  ).length;
  const localEvidenceRows = requirements.filter((requirement) =>
    hasLocalEvidence(rowsById.get(requirement.id) ?? []),
  ).length;
  const p0p1 = requirements.filter((requirement) =>
    ["P0", "P1"].includes(requirement.priority),
  );
  const p0p1LocalEvidenceRows = p0p1.filter((requirement) =>
    hasLocalEvidence(rowsById.get(requirement.id) ?? []),
  ).length;
  return Object.freeze({
    requirements: requirements.length,
    completeChains,
    mappedWithGaps: requirements.length - completeChains,
    localEvidenceRows,
    p0p1Requirements: p0p1.length,
    p0p1LocalEvidenceRows,
  });
}

export function validatePremiumTraceabilitySnapshot(snapshot) {
  const errors = [];
  const manifest = contentOf(snapshot, TRACEABILITY);
  const block = artifactBlock(manifest);
  const requirements = readRequiredRequirements(snapshot);
  const context = {
    canonicalSpecIds: readCanonicalSpecIds(contentOf(snapshot, SPEC_MASTER)),
    canonicalTaskIds: readCanonicalTaskIds(contentOf(snapshot, BACKLOG)),
    snapshot,
    artifactIds: readArtifactIds(manifest),
  };
  errors.push(...validateTraceabilityInputs(snapshot, manifest, block));
  const rowsById = indexCoverageRows(parseCoverageRows(block), errors);
  validateRequirementRows(requirements, rowsById, errors, context);
  validateUnexpectedRows(requirements, rowsById, errors);
  const summary = summarizeTraceabilityRows(requirements, rowsById);
  return Object.freeze({
    errors: Object.freeze(errors),
    ...summary,
  });
}

export async function loadPremiumTraceabilitySnapshot(root = process.cwd()) {
  const snapshot = new Map();
  for (const path of [
    FUNCTIONAL_REQUIREMENTS,
    NON_FUNCTIONAL_REQUIREMENTS,
    SPEC_MASTER,
    TRACEABILITY,
    BACKLOG,
  ]) {
    try {
      snapshot.set(path, await readFile(`${root}/${path}`, "utf8"));
    } catch {
      snapshot.set(path, "");
    }
  }
  const matrix = artifactBlock(contentOf(snapshot, TRACEABILITY));
  const localReferences = parseCoverageRows(matrix).flatMap((row) =>
    [row[4], row[5], row[6]]
      .filter((value) => typeof value === "string")
      .flatMap((value) => value.split(","))
      .filter(
        (reference) => reference.includes("/") && !reference.startsWith("GAP:"),
      ),
  );
  for (const path of new Set(localReferences)) {
    try {
      snapshot.set(path, await readFile(`${root}/${path}`, "utf8"));
    } catch {
      snapshot.set(path, "");
    }
  }
  return snapshot;
}

async function main() {
  const result = validatePremiumTraceabilitySnapshot(
    await loadPremiumTraceabilitySnapshot(),
  );
  if (result.errors.length > 0) {
    console.error(
      `premium traceability gate failed (${result.errors.length} findings):`,
    );
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    JSON.stringify({
      status: "PASS_WITH_GAPS",
      requirements: result.requirements,
      completeChains: result.completeChains,
      mappedWithGaps: result.mappedWithGaps,
      localEvidenceRows: result.localEvidenceRows,
      p0p1Requirements: result.p0p1Requirements,
      p0p1LocalEvidenceRows: result.p0p1LocalEvidenceRows,
      note: "A structurally complete matrix does not promote the score or release; gap rows remain explicit until code, tests, commit and artifact evidence exist.",
    }),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
