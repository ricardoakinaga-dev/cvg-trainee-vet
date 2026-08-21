import { join } from "node:path";
import { TextDecoder } from "node:util";
import { planGitBatchRequests as planGitBatchRequestsInternal } from "./secret-scanner-git-batch.mjs";
import { deduplicateFindings } from "./secret-scanner-findings.mjs";
import {
  createGitSurfaceScanner,
  parseObjectList,
} from "./secret-scanner-git-surfaces.mjs";
import {
  closeGitMetadata,
  createGitOptions,
  openGitMetadata,
} from "./secret-scanner-git-metadata.mjs";
import {
  openWorkspaceDirectory,
  scanWorkspaceFile,
  withWorkspaceRoot,
} from "./secret-scanner-workspace.mjs";

const ignoredDirectories = new Set([
  ".git",
  "node_modules",
  "dist",
  "coverage",
  ".next",
  "playwright-report",
]);

const MAX_SCAN_BYTES = 2 * 1024 * 1024;
const MAX_WORKSPACE_TOTAL_ENTRIES = 4096;
const MAX_WORKSPACE_DEPTH = 256;
const MAX_WORKSPACE_TOTAL_BYTES = 64 * 1024 * 1024;
const MAX_GIT_BATCH_BODY_BYTES = 8 * 1024 * 1024;
const MAX_GIT_BATCH_HEADER_BYTES = 128;

// Enumerate assets; only bounded binary content is skipped.
const ignoredBinaryAssetExtensions = new Set(
  ".7z .avi .bmp .class .dll .doc .docx .gif .gz .ico .jpeg .jpg .mov .mp3 .mp4 .ogg .pdf .png .ppt .pptx .tar .ttf .wav .webm .webp .woff .woff2 .xls .xlsx .zip".split(
    " ",
  ),
);

const boundedSyntheticPlaceholders = new Set([
  "<synthetic>",
  "<redacted>",
  "cvg_test_password",
  "fixture-value-not-a-secret",
  "postgres_test_password",
  "cvg_app_password",
  "Acesso-CVG-2026!Seguro",
  "Novo-Acesso-CVG-2026!",
]);

const syntheticCredentialUri =
  "https://user:" + "password@" + "identity.example";
const boundedSyntheticCredentialUris = new Set([
  syntheticCredentialUri,
  `${syntheticCredentialUri}/`,
]);
const textExtensions = new Set([
  ".cjs",
  ".conf",
  ".css",
  ".env",
  ".graphql",
  ".html",
  ".ini",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".properties",
  ".sh",
  ".sql",
  ".toml",
  ".ts",
  ".tsx",
  ".yaml",
  ".yml",
]);

const textFileNames = new Set(["Caddyfile", "Dockerfile", "Makefile"]);

const sensitiveAssignmentPattern =
  /\b(?:(?:[A-Za-z0-9]+[_-])+(?:password|secret|token|key)|api[_-]?key|client[_-]?secret|private[_-]?key|access[_-]?token|refresh[_-]?token|database[_-]?url|[_-]?auth[_-]?token|[_-]?(?:password|secret|token))\b\s*[:=]\s*(["'`])([^"'`\\\r\n]{12,})\1/giu;
const unquotedSensitiveAssignmentPattern =
  /\b(?:(?:[A-Za-z0-9]+[_-])+(?:password|secret|token|key)|api[_-]?key|client[_-]?secret|private[_-]?key|access[_-]?token|refresh[_-]?token|database[_-]?url|[_-]?auth[_-]?token|[_-]?(?:password|secret|token))\b\s*[:=]\s*([^\s#"'`]{12,})/giu;
const quotedSensitiveAssignmentPattern =
  /["'`](?:(?:[A-Za-z0-9]+[_-])+(?:password|secret|token|key)|api[_-]?key|client[_-]?secret|private[_-]?key|access[_-]?token|refresh[_-]?token|database[_-]?url|[_-]?auth[_-]?token|[_-]?(?:password|secret|token))["'`]\s*[:=]\s*(["'`])([^"'`\\\r\n]{12,})\1/giu;
const highEntropyAssignmentPattern =
  /\b(?:credential|api[_-]?key|client[_-]?secret|private[_-]?key|access[_-]?token|refresh[_-]?token|database[_-]?url|[_-]?auth[_-]?token)\w*\s*[:=]\s*(["'`])([^"'`\\\r\n]{24,})\1/giu;
const unquotedHighEntropyAssignmentPattern =
  /\b(?:credential|api[_-]?key|client[_-]?secret|private[_-]?key|access[_-]?token|refresh[_-]?token|database[_-]?url|[_-]?auth[_-]?token)\w*\s*[:=]\s*([^\s#"'`]{24,})/giu;
const quotedHighEntropyAssignmentPattern =
  /["'`](?:credential|api[_-]?key|client[_-]?secret|private[_-]?key|access[_-]?token|refresh[_-]?token|database[_-]?url|[_-]?auth[_-]?token)\w*["'`]\s*[:=]\s*(["'`])([^"'`\\\r\n]{24,})\1/giu;
const sensitiveAssignmentKeyPattern =
  /\b(?:(?:[A-Za-z0-9]+[_-])+(?:password|secret|token|key)|api[_-]?key|client[_-]?secret|private[_-]?key|access[_-]?token|refresh[_-]?token|database[_-]?url|[_-]?auth[_-]?token|[_-]?(?:password|secret|token))\b\s*(?:[:=](?![=>]))/giu;
const quotedExpressionLiteralPattern = /(["'`])([^"'`\\\r\n]+)\1/gu;
const quotedRhsLiteralPattern = /(["'`])([^"'`\\\r\n]{12,})\1/gu;
const providerTokenPattern =
  /\b(?:sk|rk)-[A-Za-z0-9]{20,}\b|\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b|\bgithub_pat_[A-Za-z0-9_]{20,}\b|\bxox[baprs]-[A-Za-z0-9-]{20,}\b|\bAKIA[0-9A-Z]{16}\b/gu;
const jwtPattern =
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/gu;
const uriCredentialPattern =
  /\b[a-z][a-z0-9+.-]*:\/\/[^\s/:@]+:[^\s/@]{8,}[^\s/@]*@[^\s"'`<>]+/giu;
const privateKeyPattern =
  /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/gu;

/** @typedef {"private-key" | "provider-token" | "jwt" | "uri-credential" | "sensitive-assignment" | "high-entropy" | "unreadable-file" | "oversize-file" | "binary-file" | "git-object-unreadable"} SecretRule */

/** @typedef {Readonly<{path: string, line: number, rule: SecretRule, evidence: string}>} SecretFinding */

function isTextPath(path) {
  const basename = path.split("/").at(-1) ?? path;
  if (
    basename === ".env" ||
    basename.startsWith(".env.") ||
    basename === ".npmrc" ||
    basename === ".yarnrc" ||
    basename === ".pypirc" ||
    basename === ".netrc" ||
    basename === ".git-credentials"
  ) {
    return true;
  }
  if (textFileNames.has(basename)) return true;
  const dot = basename.lastIndexOf(".");
  return (
    dot >= 0 &&
    (textExtensions.has(basename.slice(dot).toLowerCase()) ||
      [".crt", ".cer", ".key", ".pem"].includes(
        basename.slice(dot).toLowerCase(),
      ))
  );
}

function isIgnoredBinaryAssetPath(path) {
  const basename = path.split("/").at(-1) ?? path;
  const dot = basename.lastIndexOf(".");
  return (
    dot >= 0 &&
    ignoredBinaryAssetExtensions.has(basename.slice(dot).toLowerCase())
  );
}

function isSyntheticPlaceholder(value, path) {
  const logicalPath = path.replace(/^(?:history|staged):/u, "");
  const normalizedValue = value.trim();
  const fixturePath =
    /^tests(?:\/|$)/u.test(logicalPath) ||
    /^\.github\/workflows(?:\/|$)/u.test(logicalPath) ||
    /(?:^|\/)[^/]+(?:\.test|\.spec)\.(?:ts|tsx|mjs)$/u.test(logicalPath);
  return (
    fixturePath &&
    (boundedSyntheticPlaceholders.has(normalizedValue) ||
      /^(?:synthetic-token|synthetic-invitation-token-\d+|(?:review|publish)-http-\d+|(?:authoring|start)-key-\d{4}(?:-[a-z])?)(?:&(?:form=1|locale=pt-BR))?$/iu.test(
        normalizedValue,
      ))
  );
}

function isCodeExpression(value) {
  // Code expressions are not literals; high-entropy credentials still trigger.
  if (
    /\$\{|\b(?:process|import\.meta)\.env\b/u.test(value) ||
    /^\??[A-Z][A-Z0-9_]*(?:\s+is\s+required)?$/u.test(value.trim()) ||
    /^\/(?:run\/secrets|etc|tmp)\//u.test(value.trim())
  )
    return true;
  if (/^\$[A-Za-z_][A-Za-z0-9_]*$/u.test(value.trim())) return true;
  const highEntropy = entropy(value) >= 4.0;
  if (
    !highEntropy &&
    /[A-Za-z_][A-Za-z0-9_]*\.[A-Za-z_][A-Za-z0-9_]*\s*\(/u.test(value)
  ) {
    return true;
  }
  if (
    !highEntropy &&
    /\.[A-Za-z_][A-Za-z0-9_]*\.[A-Za-z_][A-Za-z0-9_]*/u.test(value)
  ) {
    return true;
  }
  if (
    /^[a-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*\([^;]*$/u.test(
      value.trim(),
    )
  ) {
    return true;
  }
  return false;
}

function isBareIdentifierExpression(value) {
  const normalized = value.trim().replace(/[;,}\]]+$/gu, "");
  if (entropy(normalized) >= 4.0) {
    const expressionPattern =
      /^[a-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*(?:\([^()]*\))?(?:\.[A-Za-z_$][A-Za-z0-9_$]*(?:\([^()]*\))?)*(?:\s+as\s+[A-Za-z_$][A-Za-z0-9_$]*)?$/u;
    return (
      (normalized.includes("(") || normalized.includes(".")) &&
      expressionPattern.test(normalized)
    );
  }
  if (/[A-Za-z_][A-Za-z0-9_]*\.[A-Za-z_][A-Za-z0-9_]*/u.test(normalized))
    return true;
  if (/^[a-z][a-z0-9]*(?:[A-Z][a-z0-9]*)+$/u.test(normalized)) return true;
  if (
    /^[a-z_$][A-Za-z0-9_$]*(?:\([^()]*\))?(?:\.[A-Za-z_$][A-Za-z0-9_$]*(?:\([^()]*\))?)*(?:\s+as\s+[A-Za-z_$][A-Za-z0-9_$]*)?$/u.test(
      normalized,
    ) &&
    (normalized.includes("(") || normalized.includes("."))
  ) {
    return true;
  }
  if (
    /^[a-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*\([^;]*$/u.test(
      normalized,
    )
  ) {
    return true;
  }
  return false;
}

function isSecretReferenceUri(value) {
  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === "secret:" &&
      parsed.username.length === 0 &&
      parsed.password.length === 0 &&
      parsed.hostname.length > 0
    );
  } catch {
    return false;
  }
}

function isLocalUri(value) {
  if (value.includes("<") || value.includes(">") || value.includes("${")) {
    return true;
  }
  try {
    const parsed = new URL(value);
    return (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "[::1]"
    );
  } catch {
    return false;
  }
}

function isKnownSyntheticCredentialUri(value, path) {
  const logicalPath = path.replace(/^(?:history|staged):/u, "");
  return (
    (/^tests(?:\/|$)/u.test(logicalPath) ||
      logicalPath === "scripts/secret-scanner.mjs") &&
    boundedSyntheticCredentialUris.has(value.trim())
  );
}

function isNonSecretValue(value, path) {
  return (
    isCodeExpression(value) ||
    isSyntheticPlaceholder(value, path) ||
    isKnownSyntheticCredentialUri(value, path) ||
    isSecretReferenceUri(value) ||
    (value.includes("://") && isLocalUri(value))
  );
}

function isSecretReferenceFragment(value, line) {
  return line.includes("secret://") && /^\/\//u.test(value.trim());
}

function entropy(value) {
  if (value.length === 0) return 0;
  const counts = new Map();
  for (const character of value) {
    counts.set(character, (counts.get(character) ?? 0) + 1);
  }
  let result = 0;
  for (const count of counts.values()) {
    const probability = count / value.length;
    result -= probability * Math.log2(probability);
  }
  return result;
}

function redact(value) {
  const normalized = value.replace(/\s+/gu, " ");
  return `${normalized.slice(0, 3)}…redacted`;
}

function finding(path, line, rule, value) {
  return Object.freeze({
    path,
    line,
    rule,
    evidence: redact(value),
  });
}

/**
 * Scan one text blob. Rules deliberately require a concrete secret shape or
 * a sensitive assignment; generic words such as "token" are not findings.
 * @param {string} content
 * @param {string} path
 * @returns {readonly SecretFinding[]}
 */
function addAssignmentFindings(
  findings,
  path,
  line,
  lineNumber,
  pattern,
  rule,
  readValue,
  isAllowed,
) {
  for (const match of line.matchAll(pattern)) {
    const value = readValue(match);
    if (value !== undefined && isAllowed(value)) {
      findings.push(finding(path, lineNumber, rule, value));
    }
  }
}

function isSecretAssignmentValue(value, path, line) {
  return (
    !isNonSecretValue(value, path) && !isSecretReferenceFragment(value, line)
  );
}

function isUnquotedSecretAssignmentValue(value, path, line) {
  return (
    isSecretAssignmentValue(value, path, line) &&
    !isBareIdentifierExpression(value)
  );
}

function isHighEntropySecretAssignmentValue(value, path, line) {
  return isSecretAssignmentValue(value, path, line) && entropy(value) >= 4.0;
}

function isUnquotedHighEntropySecretAssignmentValue(value, path, line) {
  return (
    isUnquotedSecretAssignmentValue(value, path, line) && entropy(value) >= 4.0
  );
}

function scanSecretShapes(line, path, lineNumber, findings) {
  const matches = [
    ["private-key", privateKeyPattern],
    ["provider-token", providerTokenPattern],
    ["jwt", jwtPattern],
    ["uri-credential", uriCredentialPattern],
  ];
  for (const [rule, pattern] of matches) {
    for (const match of line.matchAll(pattern)) {
      if (
        match[0] !== undefined &&
        !(
          rule === "uri-credential" &&
          (isLocalUri(match[0]) ||
            isKnownSyntheticCredentialUri(match[0], path))
        )
      ) {
        findings.push(finding(path, lineNumber, rule, match[0]));
      }
    }
  }
}

function scanSecretAssignments(line, path, lineNumber, findings) {
  addAssignmentFindings(
    findings,
    path,
    line,
    lineNumber,
    sensitiveAssignmentPattern,
    "sensitive-assignment",
    (match) => match[2],
    (value) => isSecretAssignmentValue(value, path, line),
  );
  addAssignmentFindings(
    findings,
    path,
    line,
    lineNumber,
    unquotedSensitiveAssignmentPattern,
    "sensitive-assignment",
    (match) => match[1]?.replace(/[;,}\]]+$/gu, ""),
    (value) => isUnquotedSecretAssignmentValue(value, path, line),
  );
  addAssignmentFindings(
    findings,
    path,
    line,
    lineNumber,
    quotedSensitiveAssignmentPattern,
    "sensitive-assignment",
    (match) => match[2],
    (value) => isSecretAssignmentValue(value, path, line),
  );
  addAssignmentFindings(
    findings,
    path,
    line,
    lineNumber,
    highEntropyAssignmentPattern,
    "high-entropy",
    (match) => match[2],
    (value) => isHighEntropySecretAssignmentValue(value, path, line),
  );
  addAssignmentFindings(
    findings,
    path,
    line,
    lineNumber,
    unquotedHighEntropyAssignmentPattern,
    "high-entropy",
    (match) => match[1]?.replace(/[;,}\]]+$/gu, ""),
    (value) => isUnquotedHighEntropySecretAssignmentValue(value, path, line),
  );
  addAssignmentFindings(
    findings,
    path,
    line,
    lineNumber,
    quotedHighEntropyAssignmentPattern,
    "high-entropy",
    (match) => match[2],
    (value) => isHighEntropySecretAssignmentValue(value, path, line),
  );
}

function scanSensitiveExpressionLiterals(line, path, lineNumber, findings) {
  for (const assignment of line.matchAll(sensitiveAssignmentKeyPattern)) {
    const assignmentEnd = (assignment.index ?? 0) + assignment[0].length;
    const rhs = line.slice(assignmentEnd);
    const literals = [...rhs.matchAll(quotedExpressionLiteralPattern)];
    const nonLiteralExpression = rhs.replace(
      quotedExpressionLiteralPattern,
      "",
    );
    const isBoundedSyntheticExpression =
      literals.length > 1 &&
      !/[^+\s,;()[\]{}]/u.test(nonLiteralExpression) &&
      isSyntheticPlaceholder(
        literals.map((literal) => literal[2] ?? "").join(""),
        path,
      );
    for (const literal of rhs.matchAll(quotedRhsLiteralPattern)) {
      const literalStart = literal.index ?? 0;
      const expressionPrefix = rhs.slice(0, literalStart);
      if (
        isBoundedSyntheticExpression ||
        !/(?:\|\||\?\?|&&|\+|\?|\[|\()/u.test(expressionPrefix)
      ) {
        continue;
      }
      const value = literal[2];
      if (value !== undefined && isSecretAssignmentValue(value, path, line)) {
        findings.push(finding(path, lineNumber, "sensitive-assignment", value));
      }
    }
  }
}

function scanLine(line, path, lineNumber) {
  const findings = [];
  scanSecretShapes(line, path, lineNumber, findings);
  scanSecretAssignments(line, path, lineNumber, findings);
  scanSensitiveExpressionLiterals(line, path, lineNumber, findings);
  return findings;
}

export function scanText(content, path) {
  const findings = [];
  for (const [index, line] of content.split(/\r?\n/u).entries()) {
    findings.push(...scanLine(line, path, index + 1));
  }
  return Object.freeze(findings);
}

export function summarizeSecretFindings(findings) {
  return [...findings]
    .sort(
      (left, right) =>
        left.path.localeCompare(right.path) ||
        left.line - right.line ||
        left.rule.localeCompare(right.rule),
    )
    .map((item) => `${item.path}:${item.line} [${item.rule}] ${item.evidence}`)
    .join("; ");
}
async function walk(
  directory,
  logicalDirectory = "",
  openedDirectory,
  remainingEntries = MAX_WORKSPACE_TOTAL_ENTRIES,
  workspaceDepth = 0,
  remainingBytes = MAX_WORKSPACE_TOTAL_BYTES,
) {
  const access =
    openedDirectory === undefined
      ? await openWorkspaceDirectory(directory)
      : openedDirectory;
  const { entries, handle, path: safeDirectory } = access;
  try {
    const findings = [];
    let remaining = remainingEntries;
    for (const entry of entries) {
      if (remaining <= 0) {
        throw new Error("workspace total entry budget exceeded");
      }
      remaining -= 1;
      const logicalPath = logicalDirectory
        ? `${logicalDirectory}/${entry.name}`
        : entry.name;
      const absolutePath = join(safeDirectory, entry.name);
      if (entry.isSymbolicLink()) {
        const scanned = await scanFile(
          absolutePath,
          logicalPath,
          remainingBytes,
        );
        findings.push(...scanned.findings);
        remainingBytes -= scanned.bytesConsumed;
        continue;
      }
      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name)) {
          if (workspaceDepth >= MAX_WORKSPACE_DEPTH) {
            throw new Error("workspace recursion depth exceeded");
          }
          const child = await walk(
            absolutePath,
            logicalPath,
            undefined,
            remaining,
            workspaceDepth + 1,
            remainingBytes,
          );
          findings.push(...child.findings);
          remaining = child.remainingEntries;
          remainingBytes = child.remainingBytes;
        }
        continue;
      }
      const scanned = await scanFile(absolutePath, logicalPath, remainingBytes);
      findings.push(...scanned.findings);
      remainingBytes -= scanned.bytesConsumed;
    }
    return Object.freeze({
      findings,
      remainingEntries: remaining,
      remainingBytes,
    });
  } finally {
    if (openedDirectory === undefined) await handle.close();
  }
}
function unscannedFinding(path, rule, evidence) {
  return finding(path, 1, rule, evidence);
}

function decodeTextBuffer(buffer) {
  if (buffer.includes(0)) return null;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return null;
  }
}

function scanBuffer(buffer, path) {
  if (buffer.length > MAX_SCAN_BYTES) {
    return [unscannedFinding(path, "oversize-file", `${buffer.length} bytes`)];
  }
  if (buffer.includes(0)) {
    return [unscannedFinding(path, "binary-file", "NUL byte")];
  }
  const content = decodeTextBuffer(buffer);
  return content === null
    ? [unscannedFinding(path, "binary-file", "invalid UTF-8")]
    : scanText(content, path);
}
function scanPathBuffer(buffer, path) {
  if (isIgnoredBinaryAssetPath(path)) {
    if (buffer.length > MAX_SCAN_BYTES) return [];
    const content = decodeTextBuffer(buffer);
    return content === null ? [] : scanText(content, path);
  }
  return scanBuffer(buffer, path);
}
function scanFile(file, path, remainingBytes) {
  return scanWorkspaceFile(file, path, remainingBytes, MAX_SCAN_BYTES, {
    isIgnoredBinaryAssetPath,
    scanPathBuffer,
    unscannedFinding,
  });
}

async function scanWorkspace(root, openedRoot) {
  try {
    return (await walk(root, "", openedRoot)).findings;
  } catch {
    return [
      unscannedFinding("<workspace>", "unreadable-file", "workspace tree"),
    ];
  }
}

function readBatchOutput(buffer, objects, source = "history") {
  const findings = [];
  const addUnreadable = (path, evidence) =>
    findings.push(unscannedFinding(path, "git-object-unreadable", evidence));
  let offset = 0;
  while (offset < buffer.length) {
    const headerEnd = buffer.indexOf(0x0a, offset);
    if (headerEnd < 0) {
      addUnreadable(`${source}:<git>`, "malformed git object header");
      break;
    }
    const header = buffer.subarray(offset, headerEnd).toString("utf8");
    offset = headerEnd + 1;
    const [objectId, type, sizeText] = header.split(/\s+/u);
    const validHeader =
      /^[0-9a-f]{40} (?:blob|tag|tree|commit) [0-9]+$/u.test(header) ||
      /^[0-9a-f]{40} (?:missing|error)(?: .*)?$/u.test(header);
    const path = objects.get(objectId);
    const identity =
      path ?? (/^[0-9a-f]{40}$/u.test(objectId ?? "") ? objectId : "<git>");
    const logicalPath = `${source}:${identity || "<git>"}`;
    if (!validHeader) {
      addUnreadable(logicalPath, "malformed git object header");
      offset = buffer.length;
      continue;
    }
    if (!objects.has(objectId)) {
      addUnreadable(logicalPath, "unexpected git object response");
      offset = buffer.length;
      continue;
    }
    if (type === "missing" || type === "error") {
      addUnreadable(logicalPath, header);
      continue;
    }
    const size = Number(sizeText);
    // Validate framing before skipping Git structure; tags remain text-bearing.
    if (type === "tree" || type === "commit") {
      const bodyEnd = offset + size;
      if (
        !Number.isSafeInteger(size) ||
        size < 0 ||
        bodyEnd > buffer.length ||
        buffer[bodyEnd] !== 0x0a
      ) {
        addUnreadable(logicalPath, "malformed or truncated git object body");
        offset = buffer.length;
        continue;
      }
      offset = bodyEnd + 1;
      continue;
    }
    if (
      (type !== "blob" && type !== "tag") ||
      !Number.isSafeInteger(size) ||
      size < 0
    ) {
      addUnreadable(logicalPath, header);
      continue;
    }
    if (size > MAX_SCAN_BYTES && !isIgnoredBinaryAssetPath(path ?? "")) {
      findings.push(
        unscannedFinding(logicalPath, "oversize-file", `${size} bytes`),
      );
    }
    const bodyEnd = offset + size;
    const body = buffer.subarray(offset, Math.min(bodyEnd, buffer.length));
    const hasDelimiter =
      Number.isSafeInteger(bodyEnd) &&
      bodyEnd < buffer.length &&
      buffer[bodyEnd] === 0x0a;
    if (body.length !== size || !hasDelimiter) {
      addUnreadable(logicalPath, "truncated or missing git object delimiter");
      offset = buffer.length;
      continue;
    }
    offset = bodyEnd + 1;
    if (path === undefined || size > MAX_SCAN_BYTES) continue;
    findings.push(...scanPathBuffer(body, logicalPath));
  }
  return findings;
}

function planGitBatchRequests(buffer, objects, source = "history") {
  return planGitBatchRequestsInternal(buffer, objects, {
    maxScanBytes: MAX_SCAN_BYTES,
    maxBatchBytes: MAX_GIT_BATCH_BODY_BYTES,
    isIgnoredBinaryAssetPath,
    source,
    unscannedFinding,
  });
}

const { scanStaged, scanHistory } = createGitSurfaceScanner({
  maxScanBytes: MAX_SCAN_BYTES,
  maxGitBatchBodyBytes: MAX_GIT_BATCH_BODY_BYTES,
  maxGitBatchHeaderBytes: MAX_GIT_BATCH_HEADER_BYTES,
  isIgnoredBinaryAssetPath,
  unscannedFinding,
  parseObjectList,
  readBatchOutput,
  scanPathBuffer,
});

async function appendGitFindings(
  findings,
  enabled,
  options,
  scan,
  path,
  evidence,
) {
  if (!enabled) return;
  try {
    if (options === undefined) throw new Error("Git metadata unavailable");
    findings.push(...(await scan(options)));
  } catch {
    findings.push(unscannedFinding(path, "git-object-unreadable", evidence));
  }
}

export async function scanProject(
  root,
  { includeStaged = true, includeHistory = true } = {},
) {
  const findings = await withWorkspaceRoot(
    root,
    async (gitRoot, rootAccess) => {
      const findings = [...(await scanWorkspace(gitRoot, rootAccess))];
      const gitMetadata =
        includeStaged || includeHistory ? await openGitMetadata(gitRoot) : null;
      const gitOptions = createGitOptions(gitMetadata);
      try {
        await appendGitFindings(
          findings,
          includeStaged,
          gitOptions,
          (options) => scanStaged(gitRoot, options),
          "staged:<git>",
          "staged index",
        );
        await appendGitFindings(
          findings,
          includeHistory,
          gitOptions,
          (options) => scanHistory(gitRoot, options),
          "history:<git>",
          "reachable history",
        );
        return deduplicateFindings(findings);
      } finally {
        await closeGitMetadata(gitMetadata);
      }
    },
  );
  return (
    findings ?? [
      unscannedFinding("<workspace>", "unreadable-file", "workspace root"),
    ]
  );
}
export { isTextPath, parseObjectList, planGitBatchRequests, readBatchOutput };
