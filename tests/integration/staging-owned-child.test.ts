import { describe, expect, it } from "vitest";
import { spawn, execFile } from "node:child_process";
import { readFile, mkdtemp, writeFile, rm } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import ts from "typescript";

const root = process.cwd();
const modulePath = join(root, "scripts/staging-owned-child.mjs");
async function stagingFunction(name: string) {
  const text = await readFile(join(root, "scripts/run-staging.mjs"), "utf8");
  const file = ts.createSourceFile(
    "staging.mjs",
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  const node = file.statements.find(
    (entry) => ts.isFunctionDeclaration(entry) && entry.name?.text === name,
  );
  if (!node || !ts.isFunctionDeclaration(node))
    throw new Error("staging declaration absent");
  return node.getText(file);
}
async function logged() {
  // The baseline exercises the existing function; the repaired function imports
  // the leaf lifecycle. Missing-module fallback is restricted to the RED phase.
  const leaf = await import(modulePath).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === "ERR_MODULE_NOT_FOUND") return null;
      throw error;
    },
  );
  return new Function(
    "root",
    "log",
    "spawn",
    "process",
    "setTimeout",
    "clearTimeout",
    "createStagingOwnedChild",
    "return (" + (await stagingFunction("spawnLogged")) + ")",
  )(
    root,
    () => undefined,
    spawn,
    process,
    setTimeout,
    clearTimeout,
    leaf?.createStagingOwnedChild,
  );
}
function alive(pid: number) {
  try {
    return (
      readFileSync(`/proc/${pid}/stat`, "utf8").split(") ")[1]?.[0] !== "Z"
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}
function startIdentity(pid: number) {
  const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
  return stat.slice(stat.lastIndexOf(") ") + 2).split(" ")[19];
}
async function until(predicate: () => boolean, timeout = 3000) {
  const end = Date.now() + timeout;
  while (!predicate()) {
    if (Date.now() >= end) throw new Error("owned child observation timed out");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

describe("R22 actual owned child processes (no services)", () => {
  it("supervises native async ENOENT through the actual bootstrap and cleans acquired PG", async () => {
    const dir = await mkdtemp(join(tmpdir(), "cvg-r22-start-"));
    try {
      const main = await stagingFunction("main");
      const spawnLogged = await stagingFunction("spawnLogged");
      const script = `
import {spawn} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createStagingOwnedLifecycle} from ${JSON.stringify(join(root, "scripts/staging-owned-lifecycle.mjs"))};
const leaf=await import(${JSON.stringify(modulePath)}).catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e});
const createStagingOwnedChild=leaf.createStagingOwnedChild;
const root=${JSON.stringify(dir)},log=()=>{};
${spawnLogged}
process.argv=['node','staging','verify','--record-test-summary'];
process.env.CVG_OTEL_COLLECTOR_BIN='/synthetic/nonprovider';
delete process.env.CVG_STAGING_DATABASE_URL;
const startEvidenceMeasurement=async()=>({before:true,head:'a'.repeat(40),startedAt:new Date().toISOString()});
const randomUUID=()=> '11111111-1111-4111-8111-111111111111',requireVacantPort=async()=>{},mkdir=async()=>{},rm=async()=>{},required=()=> 'http://synthetic.invalid';
const startEmbeddedPostgres=async()=>({directory:'/synthetic/pg',maintenanceUrl:'postgresql://synthetic',dbUrl:()=> 'postgresql://synthetic',stop:()=>writeFile(join(root,'pg-stopped'),'synthetic acquired PG cleanup')});
const ephemeralPort=()=>5432,sqlExec=async()=>[],APP_ROLE='synthetic',APP_PASSWORD='synthetic',DATABASE='synthetic',execFileAsync=async()=>({}),findRedisServer=async()=>join(root,'absent-executable'),waitForTcp=async()=>new Promise(()=>{});
${main}
try{await main();process.exitCode=3;}catch(error){console.log('SUPERVISED '+error.code);process.exitCode=2;}
`;
      await writeFile(join(dir, "startup.mjs"), script);
      const result = await promisify(execFile)(
        process.execPath,
        [join(dir, "startup.mjs")],
        { env: process.env, timeout: 5000 },
      ).then(
        (r) => ({ code: 0, ...r }),
        (e) => ({ code: e.code, stdout: e.stdout, stderr: e.stderr }),
      );
      const cleanupCalled = await readFile(
        join(dir, "pg-stopped"),
        "utf8",
      ).then(
        () => true,
        () => false,
      );
      if (process.env.CVG_R22_ARTIFACT_DIR)
        await writeFile(
          join(
            process.env.CVG_R22_ARTIFACT_DIR,
            `${process.env.CVG_R22_ATTEMPT}-startup-child.raw.json`,
          ),
          JSON.stringify({ ...result, cleanupCalled }),
        );
      expect(result.code).toBe(2);
      expect(result.stdout).toContain("SUPERVISED ENOENT");
      expect(await readFile(join(dir, "pg-stopped"), "utf8")).toContain(
        "cleanup",
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
  it("stops an owned group descendant after the wrapper has exited", async () => {
    const launch = await logged();
    const program = `const {spawn}=require('node:child_process');const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});console.log(child.pid);child.unref();`;
    const owned = launch(
      "local-wrapper",
      process.execPath,
      ["-e", program],
      {},
    );
    let descendant = 0;
    let observedStart: string | undefined;
    try {
      await until(() => Boolean(owned.output().trim()));
      descendant = Number(owned.output().trim());
      observedStart = startIdentity(descendant);
      expect(Number.isSafeInteger(descendant)).toBe(true);
      await until(() => owned.child.exitCode !== null);
      expect(alive(descendant)).toBe(true);
      await owned.stop();
      await until(() => !alive(descendant), 500);
    } finally {
      // Baseline-only rescue of the exact PID whose start identity this test
      // observed. It never searches by executable/port or signals foreign PIDs.
      if (
        descendant &&
        alive(descendant) &&
        startIdentity(descendant) === observedStart
      )
        process.kill(descendant, "SIGKILL");
      await owned.stop();
    }
  });
  it("keeps the returned child PID equal to the actual executable PID", async () => {
    const launch = await logged();
    const owned = launch(
      "local-identity",
      process.execPath,
      ["-e", "console.log(process.pid);setInterval(()=>{},1000)"],
      {},
    );
    try {
      await until(() => Boolean(owned.output().trim()));
      expect(Number(owned.output().trim())).toBe(owned.child.pid);
      await owned.stop();
      await until(() => !alive(owned.child.pid));
    } finally {
      await owned.stop();
    }
  });
  it("escalates for a remaining owned descendant independently of the dead leader", async () => {
    const { createStagingOwnedChild } = await import(modulePath);
    const code =
      "process.on('SIGTERM',()=>{});process.send('ready');setInterval(()=>{},1000);";
    const wrapper = `const {spawn}=require('node:child_process');const child=spawn(process.execPath,['-e',${JSON.stringify(code)}],{stdio:['ignore','ignore','ignore','ipc']});child.once('message',()=>{console.log(child.pid);child.disconnect();child.unref();});`;
    const owned = createStagingOwnedChild(
      process.execPath,
      ["-e", wrapper],
      { stdio: ["ignore", "pipe", "pipe"] },
      100,
    );
    let output = "";
    owned.child.stdout.on("data", (data: Buffer) => {
      output += data.toString();
    });
    let descendant = 0,
      observedStart: string | undefined;
    try {
      await owned.started;
      await until(() => Boolean(output.trim()));
      descendant = Number(output.trim());
      observedStart = startIdentity(descendant);
      await until(() => owned.child.exitCode !== null);
      expect(alive(descendant)).toBe(true);
      await owned.stop();
      expect(alive(descendant)).toBe(false);
    } finally {
      if (
        descendant &&
        alive(descendant) &&
        startIdentity(descendant) === observedStart
      )
        process.kill(descendant, "SIGKILL");
      await owned.stop();
    }
  });
  it("refuses foreign/recycled group identity without signalling the unrelated child", async () => {
    const { signalOwnedGroup } = await import(modulePath);
    const foreign = spawn(
      process.execPath,
      ["-e", "setInterval(()=>{},1000)"],
      { detached: true, stdio: "ignore" },
    );
    await new Promise<void>((resolve, reject) => {
      foreign.once("spawn", resolve);
      foreign.once("error", reject);
    });
    const pid = foreign.pid!;
    const original = startIdentity(pid);
    try {
      expect(() =>
        signalOwnedGroup(
          { group: pid, start: original, token: "different-invocation" },
          "SIGKILL",
        ),
      ).toThrow(/identity/);
      expect(alive(pid)).toBe(true);
      expect(startIdentity(pid)).toBe(original);
    } finally {
      if (alive(pid) && startIdentity(pid) === original)
        foreign.kill("SIGKILL");
      await until(() => !alive(pid));
    }
  });
  it("preserves ordinary Redis actual PID/run-id binding through an explicit INFO IO double", async () => {
    const launch = await logged();
    const owned = launch(
      "identity-only",
      process.execPath,
      ["-e", "setInterval(()=>{},1000)"],
      {},
    );
    try {
      await owned.started;
      const invoke = new Function(
        "execFileAsync",
        "join",
        "dirname",
        "return (" + (await stagingFunction("observeOwnedRedis")) + ")",
      );
      const valid = invoke(
        async () => ({
          stdout: `process_id:${owned.child.pid}\r\nrun_id:${"a".repeat(40)}\r\n`,
        }),
        join,
        dirname,
      );
      await expect(
        valid(owned, "/synthetic/redis-server", "redis://synthetic.invalid"),
      ).resolves.toMatchObject({
        serverPid: owned.child.pid,
        runId: "a".repeat(40),
      });
      const foreign = invoke(
        async () => ({
          stdout: `process_id:${process.pid}\r\nrun_id:${"a".repeat(40)}\r\n`,
        }),
        join,
        dirname,
      );
      await expect(
        foreign(owned, "/synthetic/redis-server", "redis://synthetic.invalid"),
      ).rejects.toThrow(
        "owned ordinary profile Redis endpoint does not belong to its child",
      );
      const missing = invoke(
        async () => ({ stdout: `process_id:${owned.child.pid}\r\n` }),
        join,
        dirname,
      );
      await expect(
        missing(owned, "/synthetic/redis-server", "redis://synthetic.invalid"),
      ).rejects.toThrow(
        "owned ordinary profile Redis endpoint does not belong to its child",
      );
    } finally {
      await owned.stop();
    }
  });
});
