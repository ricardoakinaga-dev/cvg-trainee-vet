import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";

const DEFAULT_MAX_ERROR_BYTES = 4096;
const DEFAULT_MAX_OUTPUT_BYTES = 8 * 1024 * 1024;
const DEFAULT_MAX_BATCH_BYTES = 8 * 1024 * 1024;
const DEFAULT_MAX_TOTAL_BYTES = 256 * 1024 * 1024;
const GIT_METADATA_CHANGED_CODE = "ERR_GIT_METADATA_CHANGED";

function gitMetadataChangedError() {
  return Object.assign(new Error("git metadata changed"), {
    code: GIT_METADATA_CHANGED_CODE,
  });
}

async function assertGitMetadataStable(validateGitMetadata) {
  if (validateGitMetadata === undefined) return;
  let stable = false;
  try {
    stable = await validateGitMetadata();
  } catch {
    stable = false;
  }
  if (!stable) throw gitMetadataChangedError();
}

function finalizeGitProcess({
  validateGitMetadata,
  isSettled,
  markSettled,
  resolve,
  fail,
  value,
}) {
  void (async () => {
    try {
      await assertGitMetadataStable(validateGitMetadata);
      if (isSettled()) return;
      markSettled();
      resolve(value());
    } catch (error) {
      fail(error);
    }
  })();
}

function assertPositiveSafeInteger(value, name) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${name} must be a positive safe integer`);
  }
  return value;
}

function assertMaxBatchBytes(value) {
  return assertPositiveSafeInteger(value, "maxBatchBytes");
}

function captureGitStdinError(child, state, isSettled, fail) {
  child.stdin.once("error", (error) => {
    if (isSettled()) return;
    if (error?.code === "EPIPE") {
      state.error = error;
      return;
    }
    fail(error);
  });
}

function createGitStdio(
  base,
  { gitDirectoryHandle, gitIndexHandle, gitObjectDirectoryHandle },
) {
  if (
    gitDirectoryHandle === undefined &&
    gitIndexHandle === undefined &&
    gitObjectDirectoryHandle === undefined
  ) {
    return undefined;
  }
  const stdio = [...base, "ignore", "ignore", "ignore"];
  stdio[3] = gitDirectoryHandle ?? "ignore";
  stdio[4] = gitIndexHandle ?? "ignore";
  stdio[5] = gitObjectDirectoryHandle ?? "ignore";
  return stdio;
}

function freezeGitBatchPlan(
  findings,
  objectIds,
  batches,
  batchSizes,
  complete,
) {
  return Object.freeze({
    findings: Object.freeze(findings),
    objectIds: Object.freeze(objectIds),
    batches: Object.freeze(batches),
    batchSizes: Object.freeze(batchSizes),
    complete,
  });
}

function exceedsGitTotalByteBudget(batchSizes, totalLimit) {
  return (
    batchSizes.reduce((total, batchSize) => total + batchSize, 0) > totalLimit
  );
}

function gitTotalByteBudgetFinding(source, unscannedFinding) {
  return unscannedFinding(
    `${source}:<git>`,
    "git-object-unreadable",
    "Git total byte budget",
  );
}

function acceptUniqueGitObjectIdentity(
  objectId,
  objects,
  seenObjectIds,
  logicalPath,
  addUnreadable,
  unexpectedEvidence,
  duplicateEvidence,
) {
  if (!objects.has(objectId)) {
    addUnreadable(logicalPath, unexpectedEvidence);
    return false;
  }
  if (seenObjectIds.has(objectId)) {
    addUnreadable(logicalPath, duplicateEvidence);
    return false;
  }
  seenObjectIds.add(objectId);
  return true;
}

function parseGitBatchCheckHeader(
  header,
  objects,
  seenObjectIds,
  source,
  addUnreadable,
) {
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
    return null;
  }
  if (
    !acceptUniqueGitObjectIdentity(
      objectId,
      objects,
      seenObjectIds,
      logicalPath,
      addUnreadable,
      "unexpected git batch-check response",
      "duplicate git batch-check response",
    )
  ) {
    return null;
  }
  return { objectId, type, sizeText, path, logicalPath };
}

export function runGitBatch(
  root,
  args,
  objectIds,
  {
    maxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES,
    maxErrorBytes = DEFAULT_MAX_ERROR_BYTES,
    onChunk,
    env,
    gitDirectoryHandle,
    gitIndexHandle,
    gitObjectDirectoryHandle,
    validateGitMetadata,
    spawnProcess = spawn,
  } = {},
) {
  return new Promise((resolve, reject) => {
    const outputLimit = assertPositiveSafeInteger(
      maxOutputBytes,
      "maxOutputBytes",
    );
    const errorLimit = assertPositiveSafeInteger(
      maxErrorBytes,
      "maxErrorBytes",
    );
    const spawnOptions = { cwd: root };
    if (env !== undefined) spawnOptions.env = env;
    const stdio = createGitStdio(["pipe", "pipe", "pipe"], {
      gitDirectoryHandle,
      gitIndexHandle,
      gitObjectDirectoryHandle,
    });
    if (stdio !== undefined) spawnOptions.stdio = stdio;
    const child = spawnProcess("git", args, spawnOptions);
    const chunks = [];
    let settled = false;
    let outputBytes = 0;
    let errorBytes = 0;
    const stdinState = { error: undefined };
    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    child.stdout.on("data", (chunk) => {
      if (settled) return;
      outputBytes += chunk.length;
      if (outputBytes > outputLimit) {
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
      if (errorBytes + chunk.length > errorLimit) {
        fail(new Error("git batch stderr exceeds configured limit"));
        child.kill();
        return;
      }
      errorBytes += chunk.length;
    });
    child.once("error", fail);
    captureGitStdinError(child, stdinState, () => settled, fail);
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
      if (stdinState.error !== undefined) return fail(stdinState.error);
      if (settled) return;
      finalizeGitProcess({
        validateGitMetadata,
        isSettled: () => settled,
        markSettled: () => (settled = true),
        resolve,
        fail,
        value: () => (onChunk ? undefined : Buffer.concat(chunks)),
      });
    });
    child.stdin.end(`${objectIds.join("\n")}\n`);
  });
}

export function runGitCommand(
  root,
  args,
  {
    maxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES,
    maxErrorBytes = DEFAULT_MAX_ERROR_BYTES,
    env,
    gitDirectoryHandle,
    gitIndexHandle,
    gitObjectDirectoryHandle,
    validateGitMetadata,
  } = {},
) {
  return new Promise((resolve, reject) => {
    const outputLimit = assertPositiveSafeInteger(
      maxOutputBytes,
      "maxOutputBytes",
    );
    const errorLimit = assertPositiveSafeInteger(
      maxErrorBytes,
      "maxErrorBytes",
    );
    const spawnOptions = { cwd: root };
    if (env !== undefined) spawnOptions.env = env;
    const stdio = createGitStdio(["ignore", "pipe", "pipe"], {
      gitDirectoryHandle,
      gitIndexHandle,
      gitObjectDirectoryHandle,
    });
    if (stdio !== undefined) spawnOptions.stdio = stdio;
    const child = spawn("git", args, spawnOptions);
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
      if (outputBytes > outputLimit) {
        fail(new Error("git command output exceeds configured limit"));
        child.kill();
        return;
      }
      chunks.push(Buffer.from(chunk));
    });
    child.stderr.on("data", (chunk) => {
      if (settled) return;
      errorBytes += chunk.length;
      if (errorBytes > errorLimit) {
        fail(new Error("git command stderr exceeds configured limit"));
        child.kill();
      }
    });
    child.once("error", fail);
    child.once("close", (code) => {
      if (code !== 0) {
        fail(new Error("git command failed"));
        return;
      }
      if (settled) return;
      finalizeGitProcess({
        validateGitMetadata,
        isSettled: () => settled,
        markSettled: () => (settled = true),
        resolve,
        fail,
        value: () => Buffer.concat(chunks),
      });
    });
  });
}

export function planGitBatchRequests(
  buffer,
  objects,
  {
    maxScanBytes,
    maxBatchBytes = DEFAULT_MAX_BATCH_BYTES,
    isIgnoredBinaryAssetPath,
    unscannedFinding,
    source,
  },
) {
  const scanLimit = assertPositiveSafeInteger(maxScanBytes, "maxScanBytes");
  const batchLimit = assertMaxBatchBytes(maxBatchBytes);
  const findings = [];
  const objectIds = [];
  const batches = [];
  const batchSizes = [];
  let currentBatch = [];
  let currentBatchSize = 0;
  const addUnreadable = (path, evidence) =>
    findings.push(unscannedFinding(path, "git-object-unreadable", evidence));
  const seenObjectIds = new Set();
  const flushBatch = () => {
    if (currentBatch.length === 0) return;
    batches.push(Object.freeze(currentBatch));
    batchSizes.push(currentBatchSize);
    currentBatch = [];
    currentBatchSize = 0;
  };
  let offset = 0;
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
    const parsed = parseGitBatchCheckHeader(
      header,
      objects,
      seenObjectIds,
      source,
      addUnreadable,
    );
    if (parsed === null) {
      complete = false;
      break;
    }
    const { objectId, type, sizeText, path, logicalPath } = parsed;
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
    if (size > scanLimit) {
      if (!isIgnoredBinaryAssetPath(path ?? "")) {
        findings.push(
          unscannedFinding(logicalPath, "oversize-file", `${size} bytes`),
        );
      }
      continue;
    }
    if (size > batchLimit) {
      addUnreadable(logicalPath, "git object exceeds batch budget");
      continue;
    }
    objectIds.push(objectId);
    if (currentBatch.length > 0 && currentBatchSize + size > batchLimit) {
      flushBatch();
    }
    currentBatch.push(objectId);
    currentBatchSize += size;
  }

  flushBatch();
  if (complete && seenObjectIds.size !== objects.size) {
    addUnreadable(`${source}:<git>`, "truncated git batch-check response");
    complete = false;
  }
  if (!complete) {
    return freezeGitBatchPlan(findings, [], [], [], false);
  }
  return freezeGitBatchPlan(findings, objectIds, batches, batchSizes, complete);
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
    seenObjectIds,
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
  if (
    !acceptUniqueGitObjectIdentity(
      objectId,
      objects,
      seenObjectIds,
      logicalPath,
      addUnreadable,
      "unexpected git object response",
      "duplicate git object response",
    )
  ) {
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

function consumeGitBatchChunk(
  chunk,
  {
    state,
    findings,
    objects,
    maxScanBytes,
    maxHeaderBytes,
    isIgnoredBinaryAssetPath,
    unscannedFinding,
    readBatchOutput,
    source,
    seenObjectIds,
  },
) {
  const addUnreadable = (path, evidence) =>
    findings.push(unscannedFinding(path, "git-object-unreadable", evidence));
  let offset = 0;
  while (offset < chunk.length && !state.aborted) {
    if (state.record === null) {
      const headerEnd = chunk.indexOf(0x0a, offset);
      if (headerEnd < 0) {
        const part = chunk.subarray(offset);
        state.headerBytes += part.length;
        if (state.headerBytes > maxHeaderBytes) {
          addUnreadable(`${source}:<git>`, "malformed git object header");
          state.aborted = true;
          return;
        }
        state.headerParts.push(Buffer.from(part));
        return;
      }
      const part = chunk.subarray(offset, headerEnd);
      state.headerBytes += part.length;
      if (state.headerBytes > maxHeaderBytes) {
        addUnreadable(`${source}:<git>`, "malformed git object header");
        state.aborted = true;
        return;
      }
      const header = Buffer.concat([...state.headerParts, part]);
      state.headerParts = [];
      state.headerBytes = 0;
      offset = headerEnd + 1;
      const parsed = parseGitBatchRecord(header, {
        objects,
        maxScanBytes,
        isIgnoredBinaryAssetPath,
        unscannedFinding,
        readBatchOutput,
        source,
        seenObjectIds,
      });
      findings.push(...parsed.findings);
      state.record = parsed.record;
      state.aborted = parsed.aborted;
      continue;
    }
    const record = state.record;
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
      state.aborted = true;
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
    state.record = null;
  }
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
  const scanLimit = assertPositiveSafeInteger(maxScanBytes, "maxScanBytes");
  const headerLimit = assertPositiveSafeInteger(
    maxHeaderBytes,
    "maxHeaderBytes",
  );
  const findings = [];
  const state = {
    headerParts: [],
    headerBytes: 0,
    record: null,
    aborted: false,
    seenObjectIds: new Set(),
  };
  const context = {
    state,
    findings,
    objects,
    maxScanBytes: scanLimit,
    maxHeaderBytes: headerLimit,
    isIgnoredBinaryAssetPath,
    unscannedFinding,
    readBatchOutput,
    source,
    seenObjectIds: state.seenObjectIds,
  };
  return {
    findings,
    push: (chunk) => consumeGitBatchChunk(chunk, context),
    finish: () => {
      if (state.aborted) return;
      if (state.record !== null || state.headerParts.length > 0) {
        findings.push(
          unscannedFinding(
            state.record?.logicalPath ?? `${source}:<git>`,
            "git-object-unreadable",
            "truncated git batch stream",
          ),
        );
        state.aborted = true;
        return;
      }
      if (state.seenObjectIds.size !== objects.size) {
        findings.push(
          unscannedFinding(
            `${source}:<git>`,
            "git-object-unreadable",
            "incomplete git object response",
          ),
        );
        state.aborted = true;
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
    maxTotalBytes = DEFAULT_MAX_TOTAL_BYTES,
    maxHeaderBytes,
    isIgnoredBinaryAssetPath,
    unscannedFinding,
    readBatchOutput,
    env,
    gitDirectoryHandle,
    gitIndexHandle,
    gitObjectDirectoryHandle,
    validateGitMetadata,
    source = "history",
  },
) {
  if (objects.size === 0) return [];
  const scanLimit = assertPositiveSafeInteger(maxScanBytes, "maxScanBytes");
  const batchLimit = assertMaxBatchBytes(maxBatchBytes);
  const totalLimit = assertPositiveSafeInteger(maxTotalBytes, "maxTotalBytes");
  const headerLimit = assertPositiveSafeInteger(
    maxHeaderBytes,
    "maxHeaderBytes",
  );
  const objectIds = [...objects.keys()];
  const checkOutput = await runGitBatch(
    root,
    ["cat-file", "--batch-check"],
    objectIds,
    {
      env,
      gitDirectoryHandle,
      gitIndexHandle,
      gitObjectDirectoryHandle,
      validateGitMetadata,
      maxOutputBytes: objectIds.length * headerLimit + 1,
    },
  );
  const plan = planGitBatchRequests(checkOutput, objects, {
    maxScanBytes: scanLimit,
    maxBatchBytes: batchLimit,
    isIgnoredBinaryAssetPath,
    source,
    unscannedFinding,
  });
  if (!plan.complete || plan.objectIds.length === 0) return plan.findings;
  if (exceedsGitTotalByteBudget(plan.batchSizes, totalLimit)) {
    return [gitTotalByteBudgetFinding(source, unscannedFinding)];
  }
  const findings = [...plan.findings];
  for (const [index, batch] of plan.batches.entries()) {
    const requestedObjects = new Map(
      batch.map((objectId) => [objectId, objects.get(objectId)]),
    );
    const parser = createGitBatchStreamParser({
      objects: requestedObjects,
      maxScanBytes: scanLimit,
      maxHeaderBytes: headerLimit,
      isIgnoredBinaryAssetPath,
      unscannedFinding,
      readBatchOutput,
      source,
    });
    try {
      await runGitBatch(root, ["cat-file", "--batch"], batch, {
        env,
        gitDirectoryHandle,
        gitIndexHandle,
        gitObjectDirectoryHandle,
        validateGitMetadata,
        maxOutputBytes: plan.batchSizes[index] + batch.length * headerLimit + 1,
        onChunk: (chunk) => parser.push(chunk),
      });
      parser.finish();
      findings.push(...parser.findings);
    } catch (error) {
      if (error?.code !== GIT_METADATA_CHANGED_CODE) {
        findings.push(...parser.findings);
      }
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
