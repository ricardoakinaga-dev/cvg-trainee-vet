import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";

const tokenKey = "CVG_STAGING_OWNED_GROUP";
const missing = (error) => ["ENOENT", "ESRCH"].includes(error.code);

function processIdentity(pid) {
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
    const fields = stat.slice(stat.lastIndexOf(") ") + 2).split(" ");
    return {
      pid,
      state: fields[0],
      group: Number(fields[2]),
      session: Number(fields[3]),
      start: fields[19],
    };
  } catch (error) {
    if (missing(error)) return null;
    throw error;
  }
}

// Group ownership survives its original leader. The random inherited marker,
// session and original start identity distinguish this invocation from a
// recycled numeric PGID. Unverifiable or foreign members prevent signalling.
export function ownedGroupMembers(identity) {
  const members = [];
  for (const entry of readdirSync("/proc")) {
    if (!/^\d+$/u.test(entry)) continue;
    const member = processIdentity(Number(entry));
    if (
      !member ||
      member.group !== identity.group ||
      ["Z", "X"].includes(member.state)
    )
      continue;
    let environment;
    try {
      environment = readFileSync(`/proc/${member.pid}/environ`, "utf8");
    } catch (error) {
      if (missing(error)) continue;
      throw error;
    }
    if (
      member.session !== identity.group ||
      BigInt(member.start) < BigInt(identity.start) ||
      (member.pid === identity.group && member.start !== identity.start) ||
      !environment.split("\0").includes(`${tokenKey}=${identity.token}`)
    )
      throw new Error("owned process group identity cannot be verified");
    members.push(member);
  }
  return members;
}

export function signalOwnedGroup(identity, signal) {
  const members = ownedGroupMembers(identity);
  if (!members.length) return false;
  // Recheck the observed members immediately before the group operation.
  const current = ownedGroupMembers(identity);
  if (
    !current.some((member) =>
      members.some(
        (before) => before.pid === member.pid && before.start === member.start,
      ),
    )
  )
    throw new Error("owned process group changed before signalling");
  try {
    process.kill(-identity.group, signal);
  } catch (error) {
    if (!missing(error)) throw error;
  }
  return true;
}

export function createStagingOwnedChild(
  command,
  args,
  options,
  stopBudgetMs = 10000,
) {
  if (process.platform !== "linux")
    throw new Error("owned process group verification requires Linux /proc");
  if (!Number.isSafeInteger(stopBudgetMs) || stopBudgetMs <= 0)
    throw new Error("owned process cleanup budget invalid");
  const token = randomUUID();
  const child = spawn(command, args, {
    ...options,
    env: { ...process.env, ...options.env, [tokenKey]: token },
    detached: true,
  });
  let identity;
  const started = new Promise((resolve, reject) => {
    // Attach before the asynchronous error event; rejection is awaited by the
    // staging resource owner so its finally block still releases acquired PG.
    child.on("error", reject);
    child.once("spawn", () => {
      try {
        const initial = processIdentity(child.pid);
        if (
          !initial ||
          initial.group !== child.pid ||
          initial.session !== child.pid
        )
          throw new Error("owned child initial process identity missing");
        identity = Object.freeze({
          group: child.pid,
          start: initial.start,
          token,
        });
        resolve(child);
      } catch (error) {
        reject(error);
      }
    });
  });
  void started.catch(() => undefined);
  const waitForGroup = async () => {
    const end = Date.now() + stopBudgetMs;
    while (ownedGroupMembers(identity).length > 0) {
      if (Date.now() >= end) return false;
      await delay(Math.min(25, end - Date.now()));
    }
    return true;
  };
  let closing;
  const stop = (signal = "SIGTERM") =>
    (closing ??= (async () => {
      await started.catch(() => undefined);
      if (!identity) return;
      signalOwnedGroup(identity, signal);
      if (await waitForGroup()) return;
      signalOwnedGroup(identity, "SIGKILL");
      if (!(await waitForGroup()))
        throw new Error("owned process group cleanup timed out");
    })());
  return Object.freeze({ child, started, stop });
}
