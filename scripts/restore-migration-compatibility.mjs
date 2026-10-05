const MIGRATION_TAG_RE = /^\d{4}_.+$/u;
const SHA256_RE = /^[0-9a-f]{64}$/u;

function incompatible(message) {
  return new Error(`snapshot migration history is incompatible: ${message}`);
}

function parseCreatedAt(value) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^\d+$/u.test(value)
        ? Number(value)
        : Number.NaN;
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw incompatible("created_at is invalid");
  }
  return parsed;
}

export function buildRestoreMigrationPlan(
  journalEntries,
  hashesByTag,
  appliedRows,
) {
  if (!Array.isArray(journalEntries) || journalEntries.length === 0) {
    throw incompatible("journal has no entries");
  }
  if (
    hashesByTag === null ||
    typeof hashesByTag !== "object" ||
    Array.isArray(hashesByTag)
  ) {
    throw incompatible("migration hashes are missing");
  }
  if (!Array.isArray(appliedRows) || appliedRows.length === 0) {
    throw new Error("snapshot has no applied migration history");
  }

  const entries = [...journalEntries];
  const seenTimes = new Set();
  let previousJournalTimestamp = -1;
  for (const [position, entry] of entries.entries()) {
    const expectedPrefix = `${String(position).padStart(4, "0")}_`;
    if (
      entry === null ||
      typeof entry !== "object" ||
      entry.idx !== position ||
      typeof entry.tag !== "string" ||
      !MIGRATION_TAG_RE.test(entry.tag) ||
      !entry.tag.startsWith(expectedPrefix)
    ) {
      throw new Error("journal indexes must be contiguous");
    }
    if (
      !Number.isSafeInteger(entry.when) ||
      entry.when <= previousJournalTimestamp ||
      seenTimes.has(entry.when)
    ) {
      throw incompatible(
        "journal timestamps are invalid, repeated, or out of order",
      );
    }
    previousJournalTimestamp = entry.when;
    seenTimes.add(entry.when);
    if (
      typeof hashesByTag[entry.tag] !== "string" ||
      !SHA256_RE.test(hashesByTag[entry.tag])
    ) {
      throw incompatible(`hash for ${entry.tag} is missing or invalid`);
    }
  }
  if (appliedRows.length > entries.length) {
    throw incompatible(
      "database contains migrations newer than the repository",
    );
  }

  let previousTimestamp = -1;
  for (const [position, row] of appliedRows.entries()) {
    const entry = entries[position];
    const createdAt = parseCreatedAt(row?.created_at);
    if (createdAt <= previousTimestamp) {
      throw incompatible(
        "applied migration timestamps are not strictly increasing",
      );
    }
    previousTimestamp = createdAt;
    if (
      entry === undefined ||
      row?.hash !== hashesByTag[entry.tag] ||
      createdAt !== entry.when
    ) {
      throw incompatible(
        `applied row ${position} does not match the journal prefix`,
      );
    }
  }

  const snapshotHead = entries[appliedRows.length - 1];
  if (snapshotHead === undefined) {
    throw incompatible("snapshot head is missing");
  }
  return Object.freeze({
    snapshotHeadTag: snapshotHead.tag,
    appliedMigrationCount: appliedRows.length,
    pendingTags: Object.freeze(
      entries.slice(appliedRows.length).map((entry) => entry.tag),
    ),
  });
}
