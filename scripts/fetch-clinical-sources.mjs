// Downloads the three licensed clinical-source PDFs from a private
// S3-compatible bucket into a directory OUTSIDE the repository, so the CI can
// satisfy `verify:clinical-sources` without versioning the PDFs.
//
// Security contract:
// - only reads the three SHA-pinned files listed in clinical-sources.json;
// - writes to an absolute path outside the repository;
// - prints no secret, key, token, hash or file content;
// - fails closed on any missing env, non-2xx, or size/hash mismatch.
//
// Expected environment (all provided by CI secrets, never committed):
//   CLINICAL_SOURCES_S3_ENDPOINT  e.g. https://s3.amazonaws.com
//   CLINICAL_SOURCES_S3_REGION    e.g. us-east-1 (or "auto")
//   CLINICAL_SOURCES_S3_BUCKET    e.g. cvg-clinical-sources
//   CLINICAL_SOURCES_S3_ACCESS_KEY
//   CLINICAL_SOURCES_S3_SECRET_KEY
//   CLINICAL_SOURCES_PREFIX       optional, default "clinical"
//   CLINICAL_SOURCES_DIRECTORY    absolute read-only destination dir

import { Buffer } from "node:buffer";
import { createHash, createHmac } from "node:crypto";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join, isAbsolute } from "node:path";

const SOURCES = Object.freeze([
  {
    code: "BOOK_ETTINGER_9E",
    fileName:
      "Ettinger's Textbook of Veterinary Internal Medicine, 9th Edition (VetBooks.ir).pdf",
    sha256: "429d0fbf568664c9e01d984cd272bc54195bf8d2aa54ce7caa902f28859875b8",
  },
  {
    code: "BOOK_FOSSUM_4E",
    fileName:
      "Fossum.Cirurgia de Pequenos Animais_ 4ª Edição-ilovepdf-compressed.pdf",
    sha256: "df0138e8b5c2b25adce71f8a6549e3f9d6e26e97bdc2a9b559b22bcafd04d2a0",
  },
  {
    code: "BOOK_JERICO_CAES_GATOS",
    fileName:
      "Tratado de Medicina Interna de - Marcia Marques Jerico, Joao Ped-ilovepdf-compressed-1.pdf",
    sha256: "ef781de2bd48e940f193926b62b71375871da586e080d8e1dbf7526d16b04628",
  },
]);

function requireEnv(name) {
  const value = process.env[name];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${name} is required`);
  }
  return value;
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
function encodeS3UriSegment(segment) {
  return Array.from(Buffer.from(segment, "utf8"))
    .map((byte) => {
      const c = String.fromCharCode(byte);
      if (/[A-Za-z0-9\-_.~]/.test(c)) return c;
      return `%${byte.toString(16).toUpperCase().padStart(2, "0")}`;
    })
    .join("");
}

function amzTimestamp() {
  const now = new Date();
  const stamp = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  return { dateStamp: stamp.slice(0, 8), amzDate: stamp };
}

// AWS Signature Version 4 for a single S3 GET request.
function signingKey(secret, region, dateStamp) {
  const kDate = hmac(`AWS4${secret}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, "s3");
  return hmac(kService, "aws4_request");
}

async function s3Get(
  endpoint,
  region,
  bucket,
  prefix,
  fileName,
  accessKey,
  secretKey,
) {
  const key = prefix ? `${prefix}/${fileName}` : fileName;
  // Canonical URI must URI-encode each path segment once, preserving slashes.
  // AWS SigV4 requires encoding every non-unreserved byte (RFC 3986 unreserved:
  // A-Z a-z 0-9 - _ . ~), so characters like ' ( ) ! * must be percent-encoded.
  const canonicalUri = `/${bucket}/${key
    .split("/")
    .map(encodeS3UriSegment)
    .join("/")}`;
  const url = `${endpoint.replace(/\/$/, "")}${canonicalUri}`;
  const host = new URL(endpoint).host;
  const { dateStamp, amzDate } = amzTimestamp();
  const canonicalQuery = "";
  // SHA-256 of an empty body (GET has no request body).
  const EMPTY_PAYLOAD_HASH =
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
  const canonicalHeaders =
    `host:${host}\n` +
    `x-amz-content-sha256:${EMPTY_PAYLOAD_HASH}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const payloadHash = EMPTY_PAYLOAD_HASH;

  const canonicalRequest = [
    "GET",
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
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
  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      authorization,
    },
  });
  if (!response.ok) {
    throw new Error(`GET ${fileName} failed with status ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return { buffer, hash: sha256Hex(buffer), key };
}

async function main() {
  const endpoint = requireEnv("CLINICAL_SOURCES_S3_ENDPOINT");
  const region = requireEnv("CLINICAL_SOURCES_S3_REGION");
  const bucket = requireEnv("CLINICAL_SOURCES_S3_BUCKET");
  const accessKey = requireEnv("CLINICAL_SOURCES_S3_ACCESS_KEY");
  const secretKey = requireEnv("CLINICAL_SOURCES_S3_SECRET_KEY");
  const prefix = process.env.CLINICAL_SOURCES_PREFIX ?? "clinical";
  const destination = requireEnv("CLINICAL_SOURCES_DIRECTORY");

  if (!isAbsolute(destination)) {
    throw new Error("CLINICAL_SOURCES_DIRECTORY must be an absolute path");
  }
  if (destination.trim() === "/") {
    throw new Error("CLINICAL_SOURCES_DIRECTORY must not be the root");
  }
  mkdirSync(destination, { recursive: true });

  for (const source of SOURCES) {
    const { buffer, hash, key } = await s3Get(
      endpoint,
      region,
      bucket,
      prefix,
      source.fileName,
      accessKey,
      secretKey,
    );
    if (hash !== source.sha256) {
      throw new Error(`SHA-256 mismatch for ${source.code} (${key})`);
    }
    const target = join(destination, source.fileName);
    if (existsSync(target)) {
      const existing = readFileSync(target);
      if (sha256Hex(existing) === source.sha256) continue;
    }
    writeFileSync(target, buffer);
    process.stdout.write(`downloaded ${source.code}\n`);
  }

  process.stdout.write(
    `clinical sources materialized to ${destination} (${SOURCES.length} files)\n`,
  );
}

main().catch((error) => {
  process.stderr.write(
    error instanceof Error ? error.message : "download failed",
  );
  process.exitCode = 1;
});
