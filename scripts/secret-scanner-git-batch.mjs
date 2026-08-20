import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";

export function runGitBatch(
  root,
  args,
  objectIds,
  { maxOutputBytes = Number.POSITIVE_INFINITY } = {},
) {
  return new Promise((resolve, reject) => {
    const child = spawn("git", args, { cwd: root });
    const chunks = [];
    const errors = [];
    let settled = false;
    let outputBytes = 0;
    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    child.stdout.on("data", (chunk) => {
      if (settled) return;
      outputBytes += chunk.length;
      if (outputBytes > maxOutputBytes) {
        fail(new Error("git batch output exceeds configured limit"));
        child.kill();
        return;
      }
      chunks.push(Buffer.from(chunk));
    });
    child.stderr.on("data", (chunk) => errors.push(Buffer.from(chunk)));
    child.once("error", fail);
    child.stdin.once("error", (error) => {
      if (!settled) fail(error);
    });
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
  {
    maxScanBytes,
    maxBatchBytes = Number.MAX_SAFE_INTEGER,
    isIgnoredBinaryAssetPath,
    unscannedFinding,
    source,
  },
) {
  const findings = [];
  const objectIds = [];
  const batches = [];
  const batchSizes = [];
  let currentBatch = [];
  let currentBatchSize = 0;
  const addUnreadable = (path, evidence) =>
    findings.push(unscannedFinding(path, "git-object-unreadable", evidence));
  const flushBatch = () => {
    if (currentBatch.length === 0) return;
    batches.push(Object.freeze(currentBatch));
    batchSizes.push(currentBatchSize);
    currentBatch = [];
    currentBatchSize = 0;
  };
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
    if (currentBatch.length > 0 && currentBatchSize + size > maxBatchBytes) {
      flushBatch();
    }
    currentBatch.push(objectId);
    currentBatchSize += size;
  }

  flushBatch();
  if (complete && responseCount !== objects.size) {
    addUnreadable(`${source}:<git>`, "truncated git batch-check response");
    complete = false;
  }
  return Object.freeze({
    findings: Object.freeze(findings),
    objectIds: Object.freeze(objectIds),
    batches: Object.freeze(batches),
    batchSizes: Object.freeze(batchSizes),
    complete,
  });
}

export async function readGitBlobs(
  root,
  objects,
  {
    maxScanBytes,
    maxBatchBytes,
    maxHeaderBytes,
    isIgnoredBinaryAssetPath,
    unscannedFinding,
    readBatchOutput,
    source = "history",
  },
) {
  if (objects.size === 0) return [];
  const objectIds = [...objects.keys()];
  const checkOutput = await runGitBatch(
    root,
    ["cat-file", "--batch-check"],
    objectIds,
    { maxOutputBytes: objectIds.length * maxHeaderBytes + 1 },
  );
  const plan = planGitBatchRequests(checkOutput, objects, {
    maxScanBytes,
    maxBatchBytes,
    isIgnoredBinaryAssetPath,
    source,
    unscannedFinding,
  });
  if (!plan.complete || plan.objectIds.length === 0) return plan.findings;
  const findings = [...plan.findings];
  for (const [index, batch] of plan.batches.entries()) {
    const requestedObjects = new Map(
      batch.map((objectId) => [objectId, objects.get(objectId)]),
    );
    try {
      const bodyOutput = await runGitBatch(
        root,
        ["cat-file", "--batch"],
        batch,
        {
          maxOutputBytes:
            plan.batchSizes[index] + batch.length * maxHeaderBytes + 1,
        },
      );
      findings.push(...readBatchOutput(bodyOutput, requestedObjects, source));
    } catch {
      findings.push(
        unscannedFinding(
          `${source}:<git>`,
          "git-object-unreadable",
          "bounded git batch output",
        ),
      );
      break;
    }
  }
  return findings;
}
