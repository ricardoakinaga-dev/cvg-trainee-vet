import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath, URL } from "node:url";
import { join } from "node:path";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const migrationDirectoryName = "packages/persistence/drizzle";

// Destructive, non-expand/contract schema changes that break a running N-1
// deployment when N is applied on top of it. DROP CONSTRAINT is allowed
// because it removes a restriction (safe for old code) rather than removing
// data or changing a column type that N-1 still writes to.
const destructivePatterns = [
  { name: "drop-column", pattern: /\bDROP\s+COLUMN\b/iu },
  { name: "drop-table", pattern: /\bDROP\s+TABLE\b/iu },
  { name: "truncate-table", pattern: /\bTRUNCATE(?:\s+TABLE)?\b/iu },
  { name: "delete-data", pattern: /\bDELETE\s+FROM\b/iu },
  {
    name: "alter-column-type",
    pattern: /\bALTER\s+COLUMN\b[\s\S]{0,80}?\bTYPE\b/iu,
  },
  { name: "rename-column", pattern: /\bRENAME\s+COLUMN\b/iu },
  {
    name: "rename-table",
    pattern: /\bALTER\s+TABLE\b[\s\S]{0,80}?\bRENAME\s+TO\b/iu,
  },
];

const setNotNullPattern =
  /\bALTER\s+TABLE\b[\s\S]{0,120}?\bALTER\s+COLUMN\b[\s\S]{0,80}?\bSET\s+NOT\s+NULL\b/iu;
const backfillGuardPattern =
  /\bIF\s+EXISTS\s*\([\s\S]{0,1600}?\b(?:IS\s+NULL|!~|<=)\b[\s\S]{0,600}?\bRAISE\s+EXCEPTION\b/iu;

function requiredColumnWithoutDefaultFindings(sqlContent, migrationName) {
  const findings = [];
  const addColumnPattern =
    /\bALTER\s+TABLE\b[\s\S]{0,120}?\bADD\s+COLUMN\b[\s\S]*?(?:;|$)/giu;
  for (const match of sqlContent.matchAll(addColumnPattern)) {
    const statement = match[0];
    if (
      /\bNOT\s+NULL\b/iu.test(statement) &&
      !/\bDEFAULT\b/iu.test(statement)
    ) {
      findings.push(
        Object.freeze({
          migrationName,
          rule: "required-column-without-default",
        }),
      );
    }
  }
  return findings;
}

export function validateMigrationSafety(sqlContent, migrationName) {
  const findings = [];
  for (const { name, pattern } of destructivePatterns) {
    if (pattern.test(sqlContent)) {
      findings.push(Object.freeze({ migrationName, rule: name }));
    }
  }
  if (
    setNotNullPattern.test(sqlContent) &&
    !backfillGuardPattern.test(sqlContent)
  ) {
    findings.push(
      Object.freeze({
        migrationName,
        rule: "set-not-null-without-backfill-guard",
      }),
    );
  }
  findings.push(
    ...requiredColumnWithoutDefaultFindings(sqlContent, migrationName),
  );
  return Object.freeze(findings);
}

export async function readMigrationSql(rootDirectory = projectRoot) {
  const directory = join(rootDirectory, migrationDirectoryName);
  const entries = await readdir(directory, { withFileTypes: true });
  const sqlNames = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
  const contents = await Promise.all(
    sqlNames.map(async (name) => ({
      name,
      sql: await readFile(join(directory, name), "utf8"),
    })),
  );
  return Object.freeze(contents);
}

async function main() {
  const migrations = await readMigrationSql();
  const findings = [];
  for (const { name, sql } of migrations) {
    findings.push(...validateMigrationSafety(sql, name));
  }
  if (findings.length > 0) {
    console.error(
      JSON.stringify({
        status: "FAIL",
        code: "destructive_migration_found",
        findings: findings.map((f) => `${f.migrationName}: ${f.rule}`),
      }),
    );
    process.exitCode = 1;
    return;
  }
  console.log(
    JSON.stringify({
      status: "PASS",
      checkedMigrations: migrations.length,
      destructiveMigrations: 0,
    }),
  );
}

if (
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === process.argv[1]
) {
  await main();
}
