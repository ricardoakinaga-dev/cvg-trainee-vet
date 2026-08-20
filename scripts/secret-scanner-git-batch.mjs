import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";

export function runGitBatch(root, args, objectIds) {
  return new Promise((resolve, reject) => {
    const child = spawn("git", args, { cwd: root });
    const chunks = [];
    const errors = [];
    let settled = false;
    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    child.stdout.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    child.stderr.on("data", (chunk) => errors.push(Buffer.from(chunk)));
    child.once("error", fail);
    child.once("close", (code) => {
      if (code !== 0) {
        fail(
          new Error(
            Buffer.concat(errors).toString("utf8") || `git exited with ${code}`,
          ),
        );
        return;
      }
      if (settled) return;
      settled = true;
      resolve(Buffer.concat(chunks));
    });
    child.stdin.end(`${objectIds.join("\n")}\n`);
  });
}

export function planGitBatchRequests(
  buffer,
  objects,
  { maxScanBytes, isIgnoredBinaryAssetPath, unscannedFinding, source },
) {
  const findings = [];
  const objectIds = [];
  const addUnreadable = (path, evidence) =>
    findings.push(unscannedFinding(path, "git-object-unreadable", evidence));
  let offset = 0;
  let responseCount = 0;
  let complete = true;

  while (offset < buffer.length) {
    const headerEnd = buffer.indexOf(0x0a, offset);
    if (headerEnd < 0) {
      addUnreadable(`${source}:<git>`, "malformed git batch-check header");
      complete = false;
      break;
    }
    const header = buffer.subarray(offset, headerEnd).toString("utf8");
    offset = headerEnd + 1;
    responseCount += 1;
    const [objectId, type, sizeText] = header.split(/\s+/u);
    const validHeader =
      /^[0-9a-f]{40} (?:blob|tag|tree|commit) [0-9]+$/u.test(header) ||
      /^[0-9a-f]{40} (?:missing|error)(?: .*)?$/u.test(header);
    const path = objects.get(objectId);
    const identity =
      path ?? (/^[0-9a-f]{40}$/u.test(objectId ?? "") ? objectId : "<git>");
    const logicalPath = `${source}:${identity || "<git>"}`;
    if (!validHeader) {
      addUnreadable(logicalPath, "malformed git batch-check header");
      complete = false;
      break;
    }
    if (!objects.has(objectId)) {
      addUnreadable(logicalPath, "unexpected git batch-check response");
      complete = false;
      break;
    }
    if (type === "missing" || type === "error") {
      addUnreadable(logicalPath, header);
      continue;
    }
    const size = Number(sizeText);
    if (!Number.isSafeInteger(size) || size < 0) {
      addUnreadable(logicalPath, "malformed git batch-check size");
      complete = false;
      break;
    }
    if (type === "tree" || type === "commit") continue;
    if (size > maxScanBytes) {
      if (!isIgnoredBinaryAssetPath(path ?? "")) {
        findings.push(
          unscannedFinding(logicalPath, "oversize-file", `${size} bytes`),
        );
      }
      continue;
    }
    objectIds.push(objectId);
  }

  if (complete && responseCount !== objects.size) {
    addUnreadable(`${source}:<git>`, "truncated git batch-check response");
    complete = false;
  }
  return Object.freeze({
    findings: Object.freeze(findings),
    objectIds: Object.freeze(objectIds),
    complete,
  });
}
