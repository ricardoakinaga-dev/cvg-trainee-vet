import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";

const DEFAULT_MAX_ERROR_BYTES = 4096;

export function runGitBatch(
  root,
  args,
  objectIds,
  {
    maxOutputBytes = Number.POSITIVE_INFINITY,
    maxErrorBytes = DEFAULT_MAX_ERROR_BYTES,
    onChunk,
    spawnProcess = spawn,
  } = {},
) {
  return new Promise((resolve, reject) => {
    const child = spawnProcess("git", args, { cwd: root });
    const chunks = [];
    let settled = false;
    let outputBytes = 0;
    let errorBytes = 0;
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
      if (onChunk) {
        try {
          onChunk(Buffer.from(chunk));
        } catch (error) {
          fail(error);
          child.kill();
        }
        return;
      }
      chunks.push(Buffer.from(chunk));
    });
    child.stderr.on("data", (chunk) => {
      if (settled) return;
      if (errorBytes + chunk.length > maxErrorBytes) {
        fail(new Error("git batch stderr exceeds configured limit"));
        child.kill();
        return;
      }
      errorBytes += chunk.length;
    });
    child.once("error", fail);
    child.stdin.once("error", (error) => {
      if (!settled) fail(error);
    });
    child.once("close", (code) => {
      if (code !== 0) {
        fail(
          new Error(
            errorBytes > 0
              ? "git batch command failed"
              : `git exited with ${code}`,
          ),
        );
        return;
      }
      if (settled) return;
      settled = true;
      resolve(onChunk ? undefined : Buffer.concat(chunks));
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

function parseGitBatchRecord(
  headerBuffer,
  {
    objects,
    maxScanBytes,
    isIgnoredBinaryAssetPath,
    unscannedFinding,
    readBatchOutput,
    source,
  },
) {
  const findings = [];
  const addUnreadable = (path, evidence) =>
    findings.push(unscannedFinding(path, "git-object-unreadable", evidence));
  const header = headerBuffer.toString("utf8");
  const [objectId, type, sizeText] = header.split(/\s+/u);
  const validHeader =
    /^[0-9a-f]{40} (?:blob|tag|tree|commit) [0-9]+$/u.test(header) ||
    /^[0-9a-f]{40} (?:missing|error)(?: .*)?$/u.test(header);
  const path = objects.get(objectId);
  const identity =
    path ?? (/^[0-9a-f]{40}$/u.test(objectId ?? "") ? objectId : "<git>");
  const logicalPath = `${source}:${identity}`;
  if (!validHeader) {
    addUnreadable(`${source}:<git>`, "malformed git object header");
    return { aborted: true, findings, record: null };
  }
  if (!objects.has(objectId)) {
    addUnreadable(logicalPath, "unexpected git object response");
    return { aborted: true, findings, record: null };
  }
  if (type === "missing" || type === "error") {
    findings.push(
      ...readBatchOutput(Buffer.from(`${header}\n`), objects, source),
    );
    return { aborted: false, findings, record: null };
  }
  const size = Number(sizeText);
  if (!Number.isSafeInteger(size) || size < 0) {
    addUnreadable(logicalPath, "malformed git object size");
    return { aborted: true, findings, record: null };
  }
  const isOversized = size > maxScanBytes;
  if (
    isOversized &&
    type !== "tree" &&
    type !== "commit" &&
    !isIgnoredBinaryAssetPath(path ?? "")
  ) {
    findings.push(
      unscannedFinding(logicalPath, "oversize-file", `${size} bytes`),
    );
  }
  return {
    aborted: false,
    findings,
    record: {
      body: isOversized ? null : Buffer.allocUnsafe(size),
      bodyOffset: 0,
      header: Buffer.from(`${header}\n`),
      logicalPath,
      remaining: size,
    },
  };
}

export function createGitBatchStreamParser({
  objects,
  maxScanBytes,
  maxHeaderBytes,
  isIgnoredBinaryAssetPath,
  unscannedFinding,
  readBatchOutput,
  source = "history",
}) {
  const findings = [];
  let headerParts = [];
  let headerBytes = 0;
  let record = null;
  let aborted = false;
  const addUnreadable = (path, evidence) =>
    findings.push(unscannedFinding(path, "git-object-unreadable", evidence));
  const resetRecord = () => {
    record = null;
  };
  const consume = (chunk) => {
    let offset = 0;
    while (offset < chunk.length && !aborted) {
      if (record === null) {
        const headerEnd = chunk.indexOf(0x0a, offset);
        if (headerEnd < 0) {
          const part = chunk.subarray(offset);
          headerBytes += part.length;
          if (headerBytes > maxHeaderBytes) {
            addUnreadable(`${source}:<git>`, "malformed git object header");
            aborted = true;
            return;
          }
          headerParts.push(Buffer.from(part));
          return;
        }
        const part = chunk.subarray(offset, headerEnd);
        headerBytes += part.length;
        if (headerBytes > maxHeaderBytes) {
          addUnreadable(`${source}:<git>`, "malformed git object header");
          aborted = true;
          return;
        }
        const header = Buffer.concat([...headerParts, part]);
        headerParts = [];
        headerBytes = 0;
        offset = headerEnd + 1;
        const parsed = parseGitBatchRecord(header, {
          objects,
          maxScanBytes,
          isIgnoredBinaryAssetPath,
          unscannedFinding,
          readBatchOutput,
          source,
        });
        findings.push(...parsed.findings);
        record = parsed.record;
        aborted = parsed.aborted;
        continue;
      }
      const amount = Math.min(record.remaining, chunk.length - offset);
      if (record.body !== null && amount > 0) {
        chunk.copy(record.body, record.bodyOffset, offset, offset + amount);
        record.bodyOffset += amount;
      }
      record.remaining -= amount;
      offset += amount;
      if (record.remaining > 0) continue;
      if (offset >= chunk.length) return;
      if (chunk[offset] !== 0x0a) {
        addUnreadable(
          record.logicalPath,
          "truncated or missing git object delimiter",
        );
        aborted = true;
        return;
      }
      offset += 1;
      if (record.body !== null) {
        findings.push(
          ...readBatchOutput(
            Buffer.concat([record.header, record.body, Buffer.from("\n")]),
            objects,
            source,
          ),
        );
      }
      resetRecord();
    }
  };
  return {
    findings,
    push: consume,
    finish: () => {
      if (aborted) return;
      if (record !== null || headerParts.length > 0) {
        addUnreadable(
          record?.logicalPath ?? `${source}:<git>`,
          "truncated git batch stream",
        );
        aborted = true;
      }
    },
  };
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
    const parser = createGitBatchStreamParser({
      objects: requestedObjects,
      maxScanBytes,
      maxHeaderBytes,
      isIgnoredBinaryAssetPath,
      unscannedFinding,
      readBatchOutput,
      source,
    });
    try {
      await runGitBatch(root, ["cat-file", "--batch"], batch, {
        maxOutputBytes:
          plan.batchSizes[index] + batch.length * maxHeaderBytes + 1,
        onChunk: (chunk) => parser.push(chunk),
      });
      parser.finish();
      findings.push(...parser.findings);
    } catch {
      findings.push(
        ...parser.findings,
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
