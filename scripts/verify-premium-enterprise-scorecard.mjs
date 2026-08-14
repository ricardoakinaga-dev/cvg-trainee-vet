import { readFile } from "node:fs/promises";

const programPath = "BRIEFING/03.BUILD/0304_premium_enterprise_95_program.md";
const reportPath = "BRIEFING/04.AUDIT/0491_full_construction_audit.md";
const roadmapPath = "BRIEFING/04.AUDIT/0492_score_95_roadmap.md";
const backlogPath = "BRIEFING/04.AUDIT/0493_score_95_backlog.md";
const itemIds = Object.freeze(
  Array.from(
    { length: 16 },
    (_, index) => `ENT95-${String(index + 1).padStart(2, "0")}`,
  ),
);
const allowedStatuses = Object.freeze([
  "READY_FOR_NEXT_STEP",
  "IN_PROGRESS",
  "WAITING_HUMAN_APPROVAL",
  "BLOCKED",
  "COMPLETED",
]);
const scoreRowPattern =
  /^\|\s*(\d+)\.\s*.+?\|\s*(\d+)%\s*\|\s*\*\*(\d+)\*\*\s*\|/;
const taskHeadingPattern = /^###\s+(ENT95-(?:00|0[1-9]|1[0-6])-[A-Z])\s+—/gm;
const statusPattern =
  /- prioridade\/status\/esforço:\s*[^/]+\/\s*([^/]+?)\s*\/\s*[^;]+;/;

function text(snapshot, path) {
  const value = snapshot.get(path);
  return typeof value === "string" ? value : null;
}

function parseReport(report, errors) {
  const rows = report
    .split("\n")
    .map((line) => line.match(scoreRowPattern))
    .filter((match) => match !== null);
  if (rows.length !== 16) {
    errors.push(
      `scorecard report must contain 16 score rows, found ${rows.length}`,
    );
  }
  const weights = rows.reduce((sum, row) => sum + Number(row[2]), 0);
  if (weights !== 100)
    errors.push(`scorecard weights must total 100, found ${weights}`);
  const weightedScore =
    rows.reduce((sum, row) => sum + Number(row[2]) * Number(row[3]), 0) / 100;
  const declaredMatch = report.match(/Nota geral ponderada:\s*(\d+)\/100/);
  if (declaredMatch === null)
    errors.push("scorecard report has no declared weighted score");
  const declaredScore =
    declaredMatch === null ? null : Number(declaredMatch[1]);
  if (declaredScore !== null && Math.round(weightedScore) !== declaredScore) {
    errors.push("baseline weighted score does not match the report score");
  }
  return Object.freeze({
    rows,
    weightedScore: Number(weightedScore.toFixed(2)),
    declaredScore,
    itemScores: Object.freeze(rows.map((row) => Number(row[3]))),
  });
}

function parseTasks(backlog, errors) {
  const matches = [...backlog.matchAll(taskHeadingPattern)];
  const statuses = {};
  const tasks = [];
  for (const [index, match] of matches.entries()) {
    const taskId = match[1];
    const start = match.index ?? 0;
    const end = matches[index + 1]?.index ?? backlog.length;
    const block = backlog.slice(start, end);
    const statusMatch = block.match(statusPattern);
    if (statusMatch === null) {
      errors.push(`task ${taskId} has no status`);
      continue;
    }
    const status = statusMatch[1].trim();
    if (!allowedStatuses.includes(status)) {
      errors.push(`task ${taskId} has unknown status ${status}`);
    }
    statuses[status] = (statuses[status] ?? 0) + 1;
    tasks.push(Object.freeze({ id: taskId, status }));
  }
  if (tasks.length !== 70)
    errors.push(`premium backlog must contain 70 tasks, found ${tasks.length}`);
  for (const itemId of itemIds) {
    if (!tasks.some(({ id }) => id.startsWith(`${itemId}-`))) {
      errors.push(`premium backlog has no task for ${itemId}`);
    }
  }
  return Object.freeze({
    tasks: Object.freeze(tasks),
    statuses: Object.freeze(statuses),
  });
}

export function buildPremiumEnterpriseScorecard(snapshot) {
  const errors = validatePremiumEnterpriseScorecard(snapshot);
  if (errors.length > 0) throw new Error(errors.join("; "));
  const program = text(snapshot, programPath);
  const report = text(snapshot, reportPath);
  const backlog = text(snapshot, backlogPath);
  if (program === null || report === null || backlog === null) {
    throw new Error("premium enterprise scorecard inputs are missing");
  }
  const reportData = parseReport(report, []);
  const taskData = parseTasks(backlog, []);
  return Object.freeze({
    programId: "CVG-PREMIUM-ENTERPRISE-95",
    baselineScore: reportData.declaredScore,
    weightedScore: reportData.weightedScore,
    targetFloor: 95,
    itemCount: reportData.rows.length,
    itemsAtTarget: reportData.itemScores.filter((score) => score >= 95).length,
    taskCount: taskData.tasks.length,
    taskStatuses: Object.freeze({ ...taskData.statuses }),
    scoreChanged: false,
  });
}

export function validatePremiumEnterpriseScorecard(snapshot) {
  const errors = [];
  const program = text(snapshot, programPath);
  const report = text(snapshot, reportPath);
  const roadmap = text(snapshot, roadmapPath);
  const backlog = text(snapshot, backlogPath);
  for (const path of [programPath, reportPath, roadmapPath, backlogPath]) {
    if (text(snapshot, path)?.trim() === undefined)
      errors.push(`missing scorecard input ${path}`);
  }
  if (program !== null) {
    if (!program.includes("program_id: CVG-PREMIUM-ENTERPRISE-95"))
      errors.push("scorecard program id is not canonical");
    if (!program.includes("baseline_score: 83/100"))
      errors.push("scorecard program baseline must be 83/100");
    if (!program.includes("target_floor_per_item: 95/100"))
      errors.push("scorecard target floor must be 95/100");
  }
  const reportData = report === null ? null : parseReport(report, errors);
  if (reportData !== null && reportData.declaredScore !== 83)
    errors.push("scorecard report baseline must be 83/100");
  if (roadmap !== null) {
    if (!roadmap.includes("baseline_report: 0491_full_construction_audit.md"))
      errors.push("scorecard roadmap baseline is not canonical");
    for (const itemId of itemIds)
      if (!roadmap.includes(itemId))
        errors.push(`scorecard roadmap has no ${itemId}`);
  }
  if (backlog !== null) parseTasks(backlog, errors);
  return Object.freeze(errors);
}

async function main() {
  const files = await Promise.all(
    [programPath, reportPath, roadmapPath, backlogPath].map(async (path) => [
      path,
      await readFile(path, "utf8"),
    ]),
  );
  const scorecard = buildPremiumEnterpriseScorecard(new Map(files));
  console.log(JSON.stringify(scorecard, null, 2));
}

if (process.argv[1]?.endsWith("verify-premium-enterprise-scorecard.mjs")) {
  await main();
}
