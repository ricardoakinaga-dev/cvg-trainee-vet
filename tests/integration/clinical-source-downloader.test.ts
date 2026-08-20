import { createHash } from "node:crypto";
import {
  lstat,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildS3Request,
  CLINICAL_SOURCES,
  materializeClinicalSources,
  validateS3Bucket,
  validateS3Endpoint,
  validateS3Prefix,
} from "../../scripts/fetch-clinical-sources.mjs";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

function sourceFor(content: string, fileName = "synthetic-source.pdf") {
  return {
    code: "SYNTHETIC_SOURCE",
    fileName,
    sha256: createHash("sha256").update(content).digest("hex"),
  };
}

function environmentFor(directory: string) {
  return {
    CLINICAL_SOURCES_S3_ENDPOINT: "https://s3.example.invalid",
    CLINICAL_SOURCES_S3_REGION: "us-east-1",
    CLINICAL_SOURCES_S3_BUCKET: "cvg-clinical-sources",
    CLINICAL_SOURCES_S3_ACCESS_KEY: ["synthetic", "access", "key"].join("-"),
    CLINICAL_SOURCES_S3_SECRET_KEY: ["synthetic", "secret", "key"].join("-"),
    CLINICAL_SOURCES_PREFIX: "clinical",
    CLINICAL_SOURCES_DIRECTORY: directory,
  };
}

async function makeExternalDirectory() {
  const directory = await mkdtemp(join(tmpdir(), "cvg-clinical-download-"));
  temporaryDirectories.push(directory);
  return directory;
}

describe("clinical source downloader", () => {
  it("preserves the three immutable source identifiers and hashes", () => {
    expect(CLINICAL_SOURCES).toHaveLength(3);
    expect(
      CLINICAL_SOURCES.map(({ code, sha256 }) => ({ code, sha256 })),
    ).toEqual([
      {
        code: "BOOK_ETTINGER_9E",
        sha256:
          "429d0fbf568664c9e01d984cd272bc54195bf8d2aa54ce7caa902f28859875b8",
      },
      {
        code: "BOOK_FOSSUM_4E",
        sha256:
          "df0138e8b5c2b25adce71f8a6549e3f9d6e26e97bdc2a9b559b22bcafd04d2a0",
      },
      {
        code: "BOOK_JERICO_CAES_GATOS",
        sha256:
          "ef781de2bd48e940f193926b62b71375871da586e080d8e1dbf7526d16b04628",
      },
    ]);
  });

  it.each([
    ["http://s3.example.invalid", /HTTPS/iu],
    ["https://user:pass@s3.example.invalid", /credentials/iu],
    ["https://s3.example.invalid/?redirect=1", /query|fragment/iu],
  ])("rejects an unsafe S3 endpoint: %s", (endpoint, message) => {
    expect(() => validateS3Endpoint(endpoint)).toThrow(message);
  });

  it.each([
    ["../bucket", /bucket/iu],
    ["bucket/name", /bucket/iu],
    ["ab", /bucket/iu],
  ])("rejects an unsafe bucket name: %s", (bucket, message) => {
    expect(() => validateS3Bucket(bucket)).toThrow(message);
  });

  it.each([
    "../clinical",
    "/clinical",
    "clinical/../../escape",
    "clinical\\escape",
  ])("rejects a traversal prefix: %s", (prefix) => {
    expect(() => validateS3Prefix(prefix)).toThrow(/prefix/iu);
  });

  it("builds a non-redirecting HTTPS SigV4 request with encoded object segments", () => {
    const request = buildS3Request({
      endpoint: "https://s3.example.invalid",
      region: "us-east-1",
      bucket: "cvg-clinical-sources",
      prefix: "clinical",
      fileName: "source name (synthetic).pdf",
      accessKey: ["synthetic", "access", "key"].join("-"),
      secretKey: ["synthetic", "secret", "key"].join("-"),
      now: new Date("2026-08-20T19:00:00.000Z"),
    });

    expect(request.url).toBe(
      "https://s3.example.invalid/cvg-clinical-sources/clinical/source%20name%20%28synthetic%29.pdf",
    );
    expect(request.init).toMatchObject({
      method: "GET",
      redirect: "error",
    });
    expect(request.init.headers).toMatchObject({
      "x-amz-content-sha256": expect.any(String),
      "x-amz-date": "20260820T190000Z",
      authorization: expect.stringContaining(
        ["Credential=synthetic", "access", "key/"].join("-"),
      ),
    });
  });

  it("rejects a repository destination before making a network request", async () => {
    const fetchImplementation = vi.fn();

    await expect(
      materializeClinicalSources({
        environment: environmentFor(process.cwd()),
        sources: [sourceFor("synthetic")],
        fetchImplementation,
      }),
    ).rejects.toThrow(/outside the repository/iu);
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it("streams a valid source atomically with restrictive permissions", async () => {
    const directory = await makeExternalDirectory();
    const source = sourceFor("synthetic");
    const fetchImplementation = vi.fn(
      async () => new Response("synthetic", { status: 200 }),
    );

    await materializeClinicalSources({
      environment: environmentFor(directory),
      sources: [source],
      fetchImplementation,
      maxBytes: 1024,
      timeoutMs: 5_000,
    });

    const target = join(directory, source.fileName);
    expect(await readFile(target, "utf8")).toBe("synthetic");
    expect((await stat(target)).mode & 0o777).toBe(0o600);
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
    expect(fetchImplementation.mock.calls[0]?.[1]).toMatchObject({
      method: "GET",
      redirect: "error",
    });
    expect(await readdir(directory)).toEqual([source.fileName]);
  });

  it("fails before consuming a response whose declared size exceeds the bound", async () => {
    const directory = await makeExternalDirectory();
    const source = sourceFor("synthetic");
    const fetchImplementation = vi.fn(
      async () =>
        new Response("synthetic", {
          status: 200,
          headers: { "content-length": "9" },
        }),
    );

    await expect(
      materializeClinicalSources({
        environment: environmentFor(directory),
        sources: [source],
        fetchImplementation,
        maxBytes: 4,
      }),
    ).rejects.toThrow(/maximum/iu);
    expect(await readdir(directory)).toEqual([]);
  });

  it("aborts a stalled request within the configured timeout", async () => {
    const directory = await makeExternalDirectory();
    const source = sourceFor("synthetic");
    const fetchImplementation = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener(
            "abort",
            () => reject(new Error("synthetic request aborted")),
            { once: true },
          );
        }),
    );

    await expect(
      materializeClinicalSources({
        environment: environmentFor(directory),
        sources: [source],
        fetchImplementation,
        timeoutMs: 10,
      }),
    ).rejects.toThrow(/timed out/iu);
    expect(await readdir(directory)).toEqual([]);
  });

  it("aborts a response body that stalls after headers", async () => {
    const directory = await makeExternalDirectory();
    const source = sourceFor("synthetic");
    const fetchImplementation = vi.fn(
      async () =>
        new Response(
          new ReadableStream({
            start() {},
          }),
          { status: 200 },
        ),
    );

    await expect(
      materializeClinicalSources({
        environment: environmentFor(directory),
        sources: [source],
        fetchImplementation,
        timeoutMs: 10,
      }),
    ).rejects.toThrow(/timed out/iu);
    expect(await readdir(directory)).toEqual([]);
  });

  it("fails closed when streaming crosses the body bound and leaves no partial file", async () => {
    const directory = await makeExternalDirectory();
    const source = sourceFor("synthetic");
    const fetchImplementation = vi.fn(
      async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode("synthetic"));
              controller.close();
            },
          }),
          { status: 200 },
        ),
    );

    await expect(
      materializeClinicalSources({
        environment: environmentFor(directory),
        sources: [source],
        fetchImplementation,
        maxBytes: 4,
      }),
    ).rejects.toThrow(/maximum/iu);
    expect(await readdir(directory)).toEqual([]);
  });

  it("never follows an existing target symlink", async () => {
    const directory = await makeExternalDirectory();
    const outside = await makeExternalDirectory();
    const source = sourceFor("synthetic");
    const outsideTarget = join(outside, "outside.txt");
    await writeFile(outsideTarget, "original");
    await symlink(outsideTarget, join(directory, source.fileName));
    const fetchImplementation = vi.fn(
      async () => new Response("synthetic", { status: 200 }),
    );

    await expect(
      materializeClinicalSources({
        environment: environmentFor(directory),
        sources: [source],
        fetchImplementation,
      }),
    ).rejects.toThrow(/symbolic link|symlink/iu);
    expect(fetchImplementation).not.toHaveBeenCalled();
    expect(await readFile(outsideTarget, "utf8")).toBe("original");
    expect(
      (await lstat(join(directory, source.fileName))).isSymbolicLink(),
    ).toBe(true);
  });

  it("removes a hash-mismatched temporary download without leaking credentials", async () => {
    const directory = await makeExternalDirectory();
    const source = sourceFor("expected");
    const fetchImplementation = vi.fn(
      async () => new Response("not-expected", { status: 200 }),
    );

    const result = materializeClinicalSources({
      environment: environmentFor(directory),
      sources: [source],
      fetchImplementation,
    });
    await expect(result).rejects.toThrow(/SHA-256 mismatch/iu);
    await expect(result).rejects.not.toThrow(
      ["synthetic", "secret", "key"].join("-"),
    );
    expect(await readdir(directory)).toEqual([]);
  });
});
