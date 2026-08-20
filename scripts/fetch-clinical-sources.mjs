// Downloads the three licensed clinical-source PDFs from a private
// S3-compatible bucket into a directory outside the repository, so CI can
// satisfy `verify:clinical-sources` without versioning the PDFs.
//
// Security contract:
// - only reads the three SHA-pinned files listed in clinical-sources.json;
// - accepts only an HTTPS, origin-only S3 endpoint;
// - writes to an absolute path outside the repository;
// - streams through a bounded, restrictive, atomic temporary file;
// - follows no redirects and aborts stalled requests;
// - prints no secret, key, hash, response body or credential-bearing URL;
// - fails closed on any missing env, non-2xx, size/hash mismatch or unsafe path.
//
// Expected environment (all provided by CI secrets, never committed):
//   CLINICAL_SOURCES_S3_ENDPOINT  e.g. https://s3.amazonaws.com
//   CLINICAL_SOURCES_S3_REGION    e.g. us-east-1 (or "auto")
//   CLINICAL_SOURCES_S3_BUCKET    e.g. cvg-clinical-sources
//   CLINICAL_SOURCES_S3_ACCESS_KEY
//   CLINICAL_SOURCES_S3_SECRET_KEY
//   CLINICAL_SOURCES_PREFIX       optional, default "clinical"
//   CLINICAL_SOURCES_DIRECTORY    absolute read-only destination dir
//   CLINICAL_SOURCES_MAX_BYTES    optional per-file bound, default 2 GiB
//   CLINICAL_SOURCES_TIMEOUT_MS   optional request/body timeout, default 120 s

import { Buffer } from "node:buffer";
import { createHash, createHmac } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { lstat, mkdir, mkdtemp, rm, rename } from "node:fs/promises";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import {
  dirname,
  isAbsolute,
  join,
  parse as parsePath,
  resolve,
  sep,
} from "node:path";

import {
  resolveClinicalSourceFile,
  resolveClinicalSourcesDirectory,
} from "./clinical-source-location.mjs";

export const CLINICAL_SOURCES = Object.freeze(
  [
    {
      code: "BOOK_ETTINGER_9E",
      fileName:
        "Ettinger's Textbook of Veterinary Internal Medicine, 9th Edition (VetBooks.ir).pdf",
      sha256:
        "429d0fbf568664c9e01d984cd272bc54195bf8d2aa54ce7caa902f28859875b8",
    },
    {
      code: "BOOK_FOSSUM_4E",
      fileName:
        "Fossum.Cirurgia de Pequenos Animais_ 4ª Edição-ilovepdf-compressed.pdf",
      sha256:
        "df0138e8b5c2b25adce71f8a6549e3f9d6e26e97bdc2a9b559b22bcafd04d2a0",
    },
    {
      code: "BOOK_JERICO_CAES_GATOS",
      fileName:
        "Tratado de Medicina Interna de - Marcia Marques Jerico, Joao Ped-ilovepdf-compressed-1.pdf",
      sha256:
        "ef781de2bd48e940f193926b62b71375871da586e080d8e1dbf7526d16b04628",
    },
  ].map((source) => Object.freeze(source)),
);

export const DEFAULT_MAX_SOURCE_BYTES = 2 * 1024 * 1024 * 1024;
export const DEFAULT_TIMEOUT_MS = 120_000;

const EMPTY_PAYLOAD_HASH =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const BODY_LIMIT_MESSAGE = "response exceeds maximum allowed size";

function requireEnv(name, environment = process.env) {
  const value = environment[name];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${name} is required`);
  }
  return value.trim();
}

function validateLimit(value, name) {
  const normalized = String(value).trim();
  if (!/^\d+$/u.test(normalized)) {
    throw new Error(`${name} must be a positive integer`);
  }
  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function configuredLimit(environment, name, fallback) {
  const value = environment[name];
  return value === undefined ? fallback : validateLimit(value, name);
}

export function validateS3Endpoint(endpoint) {
  if (typeof endpoint !== "string" || endpoint.trim() === "") {
    throw new Error("S3 endpoint is required");
  }
  let parsed;
  try {
    parsed = new URL(endpoint.trim());
  } catch {
    throw new Error("S3 endpoint must be a valid URL");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("S3 endpoint must use HTTPS");
  }
  if (parsed.username !== "" || parsed.password !== "") {
    throw new Error("S3 endpoint must not contain credentials");
  }
  if (parsed.search !== "" || parsed.hash !== "") {
    throw new Error("S3 endpoint must not contain a query or fragment");
  }
  if (parsed.pathname !== "/") {
    throw new Error("S3 endpoint must not contain a path");
  }
  return parsed;
}

export function validateS3Bucket(bucket) {
  if (
    typeof bucket !== "string" ||
    !/^[a-z0-9](?:[a-z0-9.-]{1,61})[a-z0-9]$/u.test(bucket)
  ) {
    throw new Error("S3 bucket must be a DNS-compatible bucket name");
  }
  return bucket;
}

export function validateS3Prefix(prefix) {
  if (typeof prefix !== "string") {
    throw new Error("S3 prefix must be a relative path");
  }
  const normalized = prefix.trim();
  if (normalized === "") return "";
  const segments = normalized.split("/");
  if (
    normalized.startsWith("/") ||
    normalized.endsWith("/") ||
    normalized.includes("\\") ||
    normalized.includes("\0") ||
    segments.some(
      (segment) => segment === "" || segment === "." || segment === "..",
    )
  ) {
    throw new Error("S3 prefix must be a relative path without traversal");
  }
  return normalized;
}

function validateObjectFileName(fileName) {
  if (
    typeof fileName !== "string" ||
    fileName.trim() === "" ||
    fileName.includes("/") ||
    fileName.includes("\\") ||
    fileName.includes("\0") ||
    fileName === "." ||
    fileName === ".."
  ) {
    throw new Error(
      "clinical source file must be a basename without traversal",
    );
  }
  return fileName;
}

function sha256Hex(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function hmac(key, data) {
  return createHmac("sha256", key).update(data).digest();
}

// AWS SigV4 canonical URI encoding: encode every byte except RFC 3986
// unreserved (A-Z a-z 0-9 - _ . ~). Unlike encodeURIComponent, this also
// encodes ' ( ) ! * which S3 requires to be percent-encoded in the path.
export function encodeS3UriSegment(segment) {
  return Array.from(Buffer.from(segment, "utf8"))
    .map((byte) => {
      const character = String.fromCharCode(byte);
      if (/[A-Za-z0-9\-_.~]/u.test(character)) return character;
      return `%${byte.toString(16).toUpperCase().padStart(2, "0")}`;
    })
    .join("");
}

function amzTimestamp(now = new Date()) {
  if (!(now instanceof Date) || Number.isNaN(now.valueOf())) {
    throw new Error("SigV4 timestamp must be a valid date");
  }
  const stamp = now
    .toISOString()
    .replace(/[-:]/gu, "")
    .replace(/\.\d{3}Z$/u, "Z");
  return { dateStamp: stamp.slice(0, 8), amzDate: stamp };
}

function buildCanonicalUri(bucket, prefix, fileName) {
  const key = prefix ? `${prefix}/${fileName}` : fileName;
  return `/${bucket}/${key.split("/").map(encodeS3UriSegment).join("/")}`;
}

function buildS3Authorization({
  canonicalUri,
  host,
  region,
  accessKey,
  secretKey,
  now,
}) {
  const { dateStamp, amzDate } = amzTimestamp(now);
  const canonicalHeaders =
    `host:${host}\n` +
    `x-amz-content-sha256:${EMPTY_PAYLOAD_HASH}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    "GET",
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    EMPTY_PAYLOAD_HASH,
  ].join("\n");
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(Buffer.from(canonicalRequest, "utf8")),
  ].join("\n");
  const signature = createHmac(
    "sha256",
    signingKey(secretKey, region, dateStamp),
  )
    .update(stringToSign)
    .digest("hex");
  return {
    amzDate,
    authorization:
      `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

// AWS Signature Version 4 for a single S3 GET request.
export function buildS3Request({
  endpoint,
  region,
  bucket,
  prefix,
  fileName,
  accessKey,
  secretKey,
  now = new Date(),
}) {
  const endpointUrl = validateS3Endpoint(endpoint);
  const validatedBucket = validateS3Bucket(bucket);
  const validatedPrefix = validateS3Prefix(prefix);
  const validatedFileName = validateObjectFileName(fileName);
  if (typeof region !== "string" || region.trim() === "") {
    throw new Error("S3 region is required");
  }
  if (typeof accessKey !== "string" || accessKey.trim() === "") {
    throw new Error("S3 access key is required");
  }
  if (typeof secretKey !== "string" || secretKey.trim() === "") {
    throw new Error("S3 secret key is required");
  }

  const canonicalUri = buildCanonicalUri(
    validatedBucket,
    validatedPrefix,
    validatedFileName,
  );
  const url = `${endpointUrl.origin}${canonicalUri}`;
  const host = endpointUrl.host;
  const { amzDate, authorization } = buildS3Authorization({
    canonicalUri,
    host,
    region: region.trim(),
    accessKey,
    secretKey,
    now,
  });

  return Object.freeze({
    url,
    init: Object.freeze({
      method: "GET",
      redirect: "error",
      headers: Object.freeze({
        host,
        "x-amz-content-sha256": EMPTY_PAYLOAD_HASH,
        "x-amz-date": amzDate,
        authorization,
      }),
    }),
  });
}

function signingKey(secret, region, dateStamp) {
  const kDate = hmac(`AWS4${secret}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, "s3");
  return hmac(kService, "aws4_request");
}

function assertSource(source) {
  if (
    source === null ||
    typeof source !== "object" ||
    typeof source.code !== "string" ||
    typeof source.fileName !== "string" ||
    !/^[a-f0-9]{64}$/u.test(source.sha256)
  ) {
    throw new Error("clinical source manifest entry is invalid");
  }
  validateObjectFileName(source.fileName);
}

function assertSources(sources) {
  if (!Array.isArray(sources) || sources.length === 0) {
    throw new Error("clinical source manifest must contain sources");
  }
  for (const source of sources) assertSource(source);
}

async function assertNoSymlinkAncestors(directory) {
  const candidate = resolve(directory);
  const { root } = parsePath(candidate);
  const segments = candidate.slice(root.length).split(sep).filter(Boolean);
  let current = root;
  for (const segment of segments) {
    current = join(current, segment);
    try {
      const metadata = await lstat(current);
      if (metadata.isSymbolicLink()) {
        throw new Error(
          "clinical source destination must not contain symbolic-link ancestors",
        );
      }
    } catch (error) {
      if (error?.code === "ENOENT") return;
      throw error;
    }
  }
}

async function sha256File(filePath) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) {
    hash.update(chunk);
  }
  return hash.digest("hex");
}

async function targetMatches(target, expectedHash) {
  let metadata;
  try {
    metadata = await lstat(target);
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
  if (metadata.isSymbolicLink()) {
    throw new Error("clinical source target must not be a symbolic link");
  }
  if (!metadata.isFile()) {
    throw new Error("clinical source target must be a regular file");
  }
  return (await sha256File(target)) === expectedHash;
}

function responseContentLength(response, maximumBytes) {
  const rawLength = response.headers?.get?.("content-length");
  if (rawLength === null || rawLength === undefined) return null;
  const normalized = rawLength.trim();
  if (!/^\d+$/u.test(normalized)) {
    throw new Error("response content-length is invalid");
  }
  const length = Number(normalized);
  if (!Number.isSafeInteger(length)) {
    throw new Error("response content-length is invalid");
  }
  if (length > maximumBytes) {
    throw new Error(BODY_LIMIT_MESSAGE);
  }
  return length;
}

function bodyLimiter(maximumBytes, hash) {
  let bytes = 0;
  return new Transform({
    transform(chunk, encoding, callback) {
      const buffer = Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(chunk, encoding);
      bytes += buffer.byteLength;
      if (bytes > maximumBytes) {
        callback(new Error(BODY_LIMIT_MESSAGE));
        return;
      }
      hash.update(buffer);
      callback(null, buffer);
    },
  });
}

async function downloadSource({
  source,
  request,
  target,
  fetchImplementation,
  maximumBytes,
  timeoutMs,
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let temporaryDirectory;
  try {
    let response;
    try {
      response = await fetchImplementation(request.url, {
        ...request.init,
        signal: controller.signal,
      });
    } catch {
      if (controller.signal.aborted) {
        throw new Error(
          `GET ${source.fileName} timed out after ${timeoutMs}ms`,
        );
      }
      throw new Error(`GET ${source.fileName} failed`);
    }
    if (!response?.ok) {
      throw new Error(
        `GET ${source.fileName} failed with status ${response?.status}`,
      );
    }
    responseContentLength(response, maximumBytes);
    if (response.body === null || response.body === undefined) {
      throw new Error(`GET ${source.fileName} returned an empty body`);
    }

    temporaryDirectory = await mkdtemp(
      join(dirname(target), ".cvg-clinical-source-"),
    );
    const temporaryFile = join(temporaryDirectory, "download");
    const hash = createHash("sha256");
    try {
      await pipeline(
        Readable.fromWeb(response.body),
        bodyLimiter(maximumBytes, hash),
        createWriteStream(temporaryFile, { flags: "wx", mode: 0o600 }),
        { signal: controller.signal },
      );
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error(
          `GET ${source.fileName} timed out after ${timeoutMs}ms`,
        );
      }
      if (error instanceof Error && error.message === BODY_LIMIT_MESSAGE) {
        throw error;
      }
      throw new Error(`GET ${source.fileName} body could not be written`);
    }
    if (hash.digest("hex") !== source.sha256) {
      throw new Error(`SHA-256 mismatch for ${source.code}`);
    }
    await rename(temporaryFile, target);
  } finally {
    clearTimeout(timeout);
    if (temporaryDirectory !== undefined) {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  }
}

function readS3Config(environment) {
  return Object.freeze({
    endpoint: requireEnv("CLINICAL_SOURCES_S3_ENDPOINT", environment),
    region: requireEnv("CLINICAL_SOURCES_S3_REGION", environment),
    bucket: requireEnv("CLINICAL_SOURCES_S3_BUCKET", environment),
    accessKey: requireEnv("CLINICAL_SOURCES_S3_ACCESS_KEY", environment),
    secretKey: requireEnv("CLINICAL_SOURCES_S3_SECRET_KEY", environment),
    prefix: validateS3Prefix(environment.CLINICAL_SOURCES_PREFIX ?? "clinical"),
  });
}

function readDownloadLimits(environment, maxBytes, timeoutMs) {
  return Object.freeze({
    maximumBytes:
      maxBytes === undefined
        ? configuredLimit(
            environment,
            "CLINICAL_SOURCES_MAX_BYTES",
            DEFAULT_MAX_SOURCE_BYTES,
          )
        : validateLimit(maxBytes, "CLINICAL_SOURCES_MAX_BYTES"),
    requestTimeoutMs:
      timeoutMs === undefined
        ? configuredLimit(
            environment,
            "CLINICAL_SOURCES_TIMEOUT_MS",
            DEFAULT_TIMEOUT_MS,
          )
        : validateLimit(timeoutMs, "CLINICAL_SOURCES_TIMEOUT_MS"),
  });
}

async function prepareDestination(rootDirectory, environment) {
  const configuredDirectory = requireEnv(
    "CLINICAL_SOURCES_DIRECTORY",
    environment,
  );
  const destination = resolveClinicalSourcesDirectory({
    rootDirectory,
    environment: {
      CVG_CLINICAL_SOURCES_DIRECTORY: configuredDirectory,
    },
  });
  if (!isAbsolute(destination)) {
    throw new Error("CLINICAL_SOURCES_DIRECTORY must be absolute");
  }
  await assertNoSymlinkAncestors(destination);
  await mkdir(destination, { recursive: true, mode: 0o700 });
  return destination;
}

async function materializeSource({
  source,
  destination,
  s3Config,
  limits,
  fetchImplementation,
  now,
}) {
  const target = resolveClinicalSourceFile(destination, source.fileName);
  if (await targetMatches(target, source.sha256)) return;
  const request = buildS3Request({
    ...s3Config,
    fileName: source.fileName,
    now,
  });
  await downloadSource({
    source,
    request,
    target,
    fetchImplementation,
    maximumBytes: limits.maximumBytes,
    timeoutMs: limits.requestTimeoutMs,
  });
  process.stdout.write(`downloaded ${source.code}\n`);
}

export async function materializeClinicalSources({
  environment = process.env,
  rootDirectory = process.cwd(),
  sources = CLINICAL_SOURCES,
  fetchImplementation = globalThis.fetch,
  now = new Date(),
  maxBytes,
  timeoutMs,
} = {}) {
  if (typeof fetchImplementation !== "function") {
    throw new Error("fetch implementation is required");
  }
  assertSources(sources);
  const s3Config = readS3Config(environment);
  const destination = await prepareDestination(rootDirectory, environment);
  const limits = readDownloadLimits(environment, maxBytes, timeoutMs);

  for (const source of sources) {
    await materializeSource({
      source,
      destination,
      s3Config,
      limits,
      fetchImplementation,
      now,
    });
  }

  process.stdout.write(
    `clinical sources materialized to ${destination} (${sources.length} files)\n`,
  );
}

export async function main() {
  await materializeClinicalSources();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(
      error instanceof Error ? error.message : "download failed",
    );
    process.exitCode = 1;
  });
}
