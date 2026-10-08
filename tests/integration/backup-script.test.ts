import { execFileSync } from "node:child_process";
import {
  chmod,
  mkdtemp,
  readdir,
  rm,
  utimes,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const SCRIPT = join(process.cwd(), "deploy/backup/backup.sh");
const temps: string[] = [];

async function sandbox(options: {
  dumpFails?: boolean;
  verifyFails?: boolean;
}) {
  const root = await mkdtemp(join(tmpdir(), "cvg-backup-"));
  temps.push(root);
  const bin = join(root, "bin");
  const backups = join(root, "backups");
  await Promise.all([
    writeFile(
      join(root, "pg_dump"),
      `#!/bin/sh\nfor arg in "$@"; do case "$arg" in --file=*) file="\${arg#--file=}";; esac; done\n${
        options.dumpFails ? "exit 1" : 'printf "PGDMP synthetic" > "$file"'
      }\n`,
    ),
    writeFile(
      join(root, "pg_restore"),
      `#!/bin/sh\n${options.verifyFails ? "exit 1" : "exit 0"}\n`,
    ),
  ]);
  await Promise.all([
    chmod(join(root, "pg_dump"), 0o755),
    chmod(join(root, "pg_restore"), 0o755),
  ]);
  execFileSync("mkdir", ["-p", bin, backups]);
  execFileSync("mv", [join(root, "pg_dump"), join(root, "pg_restore"), bin]);
  return { root, bin, backups };
}

function run(bin: string, env: Record<string, string>) {
  try {
    const stdout = execFileSync("sh", [SCRIPT], {
      encoding: "utf8",
      env: { PATH: `${bin}:/usr/bin:/bin`, ...env },
    });
    return {
      status: 0,
      events: stdout
        .trim()
        .split("\n")
        .map((l) => JSON.parse(l)),
    };
  } catch (error) {
    const failure = error as { status: number; stdout: string };
    return {
      status: failure.status,
      events: failure.stdout
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l)),
    };
  }
}

afterEach(async () => {
  await Promise.all(
    temps.splice(0).map((d) => rm(d, { recursive: true, force: true })),
  );
});

describe("deploy/backup/backup.sh (M06)", () => {
  it("fails closed without a database url or with invalid numbers", async () => {
    const { bin, backups } = await sandbox({});
    expect(
      run(bin, { CVG_BACKUP_DIR: backups, CVG_BACKUP_ONCE: "true" }),
    ).toMatchObject({
      status: 2,
      events: [
        { event: "backup.config_missing", field: "CVG_BACKUP_DATABASE_URL" },
      ],
    });
    expect(
      run(bin, {
        CVG_BACKUP_DATABASE_URL: "postgresql://u:p@h/db",
        CVG_BACKUP_DIR: backups,
        CVG_BACKUP_ONCE: "true",
        CVG_BACKUP_RETENTION_DAYS: "soon",
      }),
    ).toMatchObject({
      status: 2,
      events: [{ event: "backup.config_invalid" }],
    });
  });

  it("dumps, verifies, names the archive by UTC stamp and prunes beyond retention", async () => {
    const { bin, backups } = await sandbox({});
    const old = join(backups, "cvg-20200101T000000Z.dump");
    await writeFile(old, "old");
    const past = new Date(Date.now() - 40 * 86_400_000);
    await utimes(old, past, past);
    const recent = join(backups, "cvg-20990101T000000Z.dump");
    await writeFile(recent, "recent");
    const result = run(bin, {
      CVG_BACKUP_DATABASE_URL: "postgresql://u:p@h/db",
      CVG_BACKUP_DIR: backups,
      CVG_BACKUP_ONCE: "true",
      CVG_BACKUP_RETENTION_DAYS: "14",
    });
    expect(result.status).toBe(0);
    const names = result.events.map((e) => e.event);
    expect(names).toEqual([
      "backup.started",
      "backup.completed",
      "backup.pruned",
    ]);
    expect(result.events[1].target).toMatch(/\/cvg-\d{8}T\d{6}Z\.dump$/u);
    expect(result.events[1].bytes).toBeGreaterThan(0);
    const files = await readdir(backups);
    expect(files).not.toContain("cvg-20200101T000000Z.dump");
    expect(files).toContain("cvg-20990101T000000Z.dump");
    expect(files.some((f) => f.endsWith(".partial"))).toBe(false);
  });

  it("keeps no partial archive when pg_dump or verification fails", async () => {
    for (const failure of [{ dumpFails: true }, { verifyFails: true }]) {
      const { bin, backups } = await sandbox(failure);
      const result = run(bin, {
        CVG_BACKUP_DATABASE_URL: "postgresql://u:p@h/db",
        CVG_BACKUP_DIR: backups,
        CVG_BACKUP_ONCE: "true",
      });
      expect(result.status).toBe(1);
      expect(result.events.at(-1)).toMatchObject({
        event: "backup.failed",
        stage: failure.dumpFails ? "pg_dump" : "verify",
      });
      expect(await readdir(backups)).toEqual([]);
    }
  });

  it("plans without touching the database in dry-run mode", async () => {
    const { bin, backups } = await sandbox({ dumpFails: true });
    const result = run(bin, {
      CVG_BACKUP_DATABASE_URL: "postgresql://u:p@h/db",
      CVG_BACKUP_DIR: backups,
      CVG_BACKUP_ONCE: "true",
      CVG_BACKUP_DRY_RUN: "true",
    });
    expect(result.status).toBe(0);
    expect(result.events).toEqual([
      expect.objectContaining({ event: "backup.plan", retentionDays: 14 }),
    ]);
    expect(await readdir(backups)).toEqual([]);
  });
});
