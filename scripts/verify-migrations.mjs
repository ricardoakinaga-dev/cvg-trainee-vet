import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath, URL } from "node:url";
import { join } from "node:path";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const migrationDirectoryName = "packages/persistence/drizzle";

function migrationError(message) {
  return new Error(`migration manifest is invalid: ${message}`);
}

function migrationRecords(sqlNames) {
  return sqlNames.map((name) => {
    const match = /^(\d{4})_(.+)\.sql$/u.exec(name);
    if (match === null) throw migrationError(`invalid filename: ${name}`);
    return Object.freeze({
      index: Number(match[1]),
      tag: `${match[1]}_${match[2]}`,
      name,
    });
  });
}

export function validateMigrationManifest(manifest) {
  const sqlRecords = migrationRecords(
    [...manifest.sqlNames].sort((left, right) => left.localeCompare(right)),
  );
  if (sqlRecords.length === 0) throw migrationError("no SQL migrations found");

  for (const [position, record] of sqlRecords.entries()) {
    if (record.index !== position) {
      throw migrationError("migration indexes must be contiguous from 0000");
    }
  }

  const entries = [...manifest.journal.entries].sort(
    (left, right) => left.idx - right.idx,
  );
  if (entries.length !== sqlRecords.length) {
    throw migrationError("journal and SQL migration counts differ");
  }

  for (const [position, record] of sqlRecords.entries()) {
    const entry = entries[position];
    if (entry === undefined || entry.idx !== position) {
      throw migrationError("journal indexes must be contiguous from 0000");
    }
    if (entry.tag !== record.tag) {
      throw migrationError(
        `journal tag ${String(entry.tag)} does not match ${record.tag}`,
      );
    }
  }

  const latest = sqlRecords.at(-1);
  if (latest === undefined) throw migrationError("latest migration is missing");
  return Object.freeze({
    migrationCount: sqlRecords.length,
    lastIndex: latest.index,
    latestTag: latest.tag,
  });
}

export async function readMigrationManifest(rootDirectory = projectRoot) {
  const migrationDirectory = join(rootDirectory, migrationDirectoryName);
  const directoryEntries = await readdir(migrationDirectory, {
    withFileTypes: true,
  });
  const sqlNames = directoryEntries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
  const journalText = await readFile(
    join(migrationDirectory, "meta", "_journal.json"),
    "utf8",
  );
  const journal = JSON.parse(journalText);
  if (!Array.isArray(journal.entries)) {
    throw migrationError("journal entries must be an array");
  }
  return Object.freeze({ sqlNames, journal });
}

try {
  const manifest = await readMigrationManifest();
  console.log(
    JSON.stringify({ status: "PASS", ...validateMigrationManifest(manifest) }),
  );
} catch (error) {
  console.error(
    JSON.stringify({
      status: "FAIL",
      code: "migration_manifest_invalid",
      message: error instanceof Error ? error.message : "unknown error",
    }),
  );
  process.exitCode = 1;
}
