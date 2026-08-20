import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

import {
  scanText,
  scanProject,
  summarizeSecretFindings,
  type SecretFinding,
  readBatchOutput,
} from "../../scripts/secret-scanner.mjs";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("secret scanner", () => {
  it("detects provider tokens, JWTs, URI credentials and high-entropy values", () => {
    const providerPrefix = ["s", "k-"].join("");
    const jwt = [
      "eyJ",
      "a".repeat(24),
      ".",
      "b".repeat(24),
      ".",
      "c".repeat(24),
    ].join("");
    const credentialValue = [
      "Qz",
      "7m",
      "P4",
      "xL",
      "9s",
      "T2",
      "vK",
      "8n",
    ].join("");
    const databaseUri = [
      "postgres://synthetic-user:",
      "synthetic-password@db.example.invalid/cvg",
    ].join("");
    const findings = scanText(
      [
        `provider = "${providerPrefix}${"a".repeat(24)}"`,
        `session = "${jwt}"`,
        `database = "${databaseUri}"`,
        `credential = "${credentialValue.repeat(4)}"`,
      ].join("\n"),
      "apps/api/src/runtime.ts",
    );

    expect(new Set(findings.map((finding) => finding.rule))).toEqual(
      new Set(["provider-token", "jwt", "uri-credential", "high-entropy"]),
    );
  });

  it("detects private-key material and sensitive assignments without generic bypass markers", () => {
    const privateKeyMarker = ["-----BEGIN ", "PRIVATE KEY-----"].join("");
    const findings = scanText(
      [
        privateKeyMarker,
        "-----BEGIN synthetic material-----",
        'client_secret = "' + "a".repeat(24) + '"',
      ].join("\n"),
      "apps/api/src/config.ts",
    );

    expect(findings.map((finding) => finding.rule)).toEqual([
      "private-key",
      "sensitive-assignment",
    ]);
  });

  it("does not report explicit redacted or synthetic placeholders", () => {
    expect(
      scanText(
        [
          'password: "<synthetic>"',
          'token: "<redacted>"',
          'secret: "fixture-value-not-a-secret"',
        ].join("\n"),
        "tests/fixtures/synthetic.ts",
      ),
    ).toEqual([]);
  });

  it("does not report bounded idempotency-key fixtures used by API tests", () => {
    expect(
      scanText(
        [
          '"idempotency-key": "authoring-key-2026"',
          'idempotencyKey: "start-key-2026-a"',
        ].join("\n"),
        "apps/api/src/http-optional-dependencies-coverage.test.ts",
      ),
    ).toEqual([]);
  });

  it("does not let a synthetic prefix or an earlier placeholder hide a secret", () => {
    const randomValue = ["Qz", "7m", "P4", "xL", "9s", "T2", "vK", "8n"].join(
      "",
    );
    const findings = scanText(
      [
        `token: "<synthetic>" credential: "${randomValue.repeat(4)}"`,
        `password: "synthetic-${randomValue.repeat(3)}"`,
      ].join("\n"),
      "tests/fixtures/synthetic.ts",
    );

    expect(
      findings.some((finding) => finding.rule === "sensitive-assignment"),
    ).toBe(true);
    expect(findings.some((finding) => finding.rule === "high-entropy")).toBe(
      true,
    );
  });

  it("does not treat a literal value containing .repeat( as executable code", () => {
    const literal = ["Qz", "7m", "P4", "xL", "9s", "T2", "vK", "8n"].join("");

    const findings = scanText(
      `token = "${literal}.repeat("`,
      "config/.env.local",
    );

    expect(
      findings.some((finding) => finding.rule === "sensitive-assignment"),
    ).toBe(true);
  });

  it("detects hardcoded literals hidden in sensitive RHS expressions", () => {
    const secret = ["Qz7m", "P4xL", "9sT2", "vK8n"].join("").repeat(4);
    const findings = scanText(
      [
        `password = process.env.PASSWORD || "${secret}"`,
        `token = process.env.TOKEN ?? "${secret}"`,
        `client_secret = getSecret() ?? "${secret}"`,
        `password = [process.env.PASSWORD, "${secret}"].find(Boolean)`,
      ].join("\n"),
      "apps/api/src/runtime.ts",
    );

    expect(
      findings.filter((finding) => finding.rule === "sensitive-assignment"),
    ).toHaveLength(4);
  });

  it("does not report bounded synthetic credentials split across fixture literals", () => {
    const field = ["pass", "word"].join("");
    const firstPrefix = ["Acesso", ""].join("-");
    const firstSuffix = ["CVG", "2026!Seguro"].join("-");
    const secondPrefix = "N";
    const secondSuffix = ["ovo", "Acesso", "CVG", "2026!"].join("-");
    const findings = scanText(
      [
        `${field}: "${firstPrefix}" + "${firstSuffix}",`,
        `body: { ${field}: "${secondPrefix}" + "${secondSuffix}" },`,
      ].join("\n"),
      "apps/api/src/http.test.ts",
    );

    expect(findings).toEqual([]);
  });

  it("does not treat comparisons or adjacent object fields as RHS literals", () => {
    const findings = scanText(
      [
        'expect(token === "synthetic-token-value").toBe(true);',
        'password: config.password, model: "synthetic-model-name",',
        'password = process.env.PASSWORD, model: "synthetic-model-name",',
      ].join("\n"),
      "apps/api/src/runtime.ts",
    );

    expect(findings).toEqual([]);
  });

  it("does not report unquoted code references or calls as secret literals", () => {
    const secret = ["Qz7m", "P4xL", "9sT2", "vK8n"].join("").repeat(3);
    const findings = scanText(
      [
        "password: loginPassword,",
        "token: readCookieToken(cookieHeader),",
        "databaseUrl: databaseUrl,",
        "apiKey: config.qdrant.embeddingApiKey as string,",
        `password: ${secret},`,
      ].join("\n"),
      "apps/api/src/runtime.ts",
    );

    expect(findings.filter((finding) => finding.line <= 4)).toEqual([]);
    expect(
      findings
        .filter((finding) => finding.line === 5)
        .map((finding) => finding.rule),
    ).toEqual(expect.arrayContaining(["sensitive-assignment"]));
  });

  it("scans annotated tag bodies without classifying the tag object as unreadable", () => {
    const body = Buffer.from(
      `object 1111111111111111111111111111111111111111\ntype commit\ntag synthetic-release\ntagger Synthetic <synthetic@example.invalid> 0 +0000\n\nrelease notes\n`,
    );
    const findings = readBatchOutput(
      Buffer.concat([
        Buffer.from(`tagid tag ${body.byteLength}\n`),
        body,
        Buffer.from("\n"),
      ]),
      new Map([["tagid", "synthetic-release"]]),
    );

    expect(findings).toEqual([]);
  });

  it("detects secrets assigned to quoted JSON and object keys", () => {
    const secret = ["Qz7m", "P4xL", "9sT2", "vK8n"].join("").repeat(4);
    const findings = scanText(
      JSON.stringify({ DB_PASSWORD: secret, client_secret: secret }),
      "config/settings.json",
    );

    expect(
      findings.filter((finding) => finding.rule === "sensitive-assignment"),
    ).toHaveLength(2);
  });

  it("scans hidden configuration and certificate-like files in the project", async () => {
    const directory = await mkdtemp(join(tmpdir(), "cvg-secret-scanner-"));
    temporaryDirectories.push(directory);
    const secret = ["Qz", "7m", "P4", "xL", "9s", "T2", "vK", "8n"].join("");
    await writeFile(
      join(directory, ".env.local"),
      `API_TOKEN="${secret.repeat(4)}"\n`,
    );
    await writeFile(
      join(directory, "credentials.pem"),
      [
        "-----BEGIN ",
        ["PRIVATE", "KEY-----"].join(" "),
        "\nsynthetic material\n",
      ].join(""),
    );

    const findings = await scanProject(directory, {
      includeStaged: false,
      includeHistory: false,
    });

    expect(findings.map((finding) => finding.path)).toEqual(
      expect.arrayContaining([".env.local", "credentials.pem"]),
    );
    expect(findings.map((finding) => finding.rule)).toEqual(
      expect.arrayContaining(["sensitive-assignment", "private-key"]),
    );
  });

  it("reports workspace symlinks without following or exposing their targets", async () => {
    const directory = await mkdtemp(
      join(tmpdir(), "cvg-secret-scanner-symlink-"),
    );
    temporaryDirectories.push(directory);
    const outsideDirectory = await mkdtemp(
      join(tmpdir(), "cvg-secret-scanner-target-"),
    );
    temporaryDirectories.push(outsideDirectory);
    const secret = ["Qz", "7m", "P4", "xL", "9s", "T2", "vK", "8n"].join("");
    const target = join(outsideDirectory, "outside.env");
    const link = join(directory, "linked.env");
    await writeFile(target, `API_TOKEN="${secret.repeat(4)}"\n`);
    await symlink(target, link);

    const findings = await scanProject(directory, {
      includeStaged: false,
      includeHistory: false,
    });
    const linkedFindings = findings.filter(
      (finding) => finding.path === "linked.env",
    );

    expect(linkedFindings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rule: "unreadable-file",
        }),
      ]),
    );
    expect(linkedFindings).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rule: "sensitive-assignment",
        }),
      ]),
    );
    expect(JSON.stringify(linkedFindings)).not.toContain(secret);
  });

  it("scans the working tree, index and reachable history instead of only common extensions", async () => {
    const directory = await mkdtemp(join(tmpdir(), "cvg-secret-scanner-git-"));
    temporaryDirectories.push(directory);
    const secret = ["Qz", "7m", "P4", "xL", "9s", "T2", "vK", "8n"].join("");
    await execFileAsync("git", ["init", "-q"], { cwd: directory });
    await execFileAsync(
      "git",
      ["config", "user.email", "synthetic@example.invalid"],
      {
        cwd: directory,
      },
    );
    await execFileAsync("git", ["config", "user.name", "Synthetic Test"], {
      cwd: directory,
    });
    await writeFile(
      join(directory, ".env.local"),
      `client_secret="${secret.repeat(4)}"\n`,
    );
    await execFileAsync("git", ["add", ".env.local"], { cwd: directory });
    await execFileAsync("git", ["commit", "-qm", "synthetic fixture"], {
      cwd: directory,
    });

    await writeFile(
      join(directory, ".npmrc"),
      `//registry.example.invalid/:_authToken=${secret.repeat(4)}\n`,
    );
    await execFileAsync("git", ["add", ".npmrc"], { cwd: directory });

    const findings = await scanProject(directory, {
      includeStaged: true,
      includeHistory: true,
    });
    const paths = findings.map((finding) => finding.path);

    expect(paths).toEqual(
      expect.arrayContaining([
        ".env.local",
        "history:.env.local",
        "staged:.npmrc",
      ]),
    );
  });

  it("reports malformed, binary and oversized history objects instead of silently skipping them", () => {
    const binaryObject = Buffer.concat([
      Buffer.from("binaryid blob 3\n"),
      Buffer.from([0, 1, 2]),
      Buffer.from("\n"),
    ]);
    const oversizedObject = Buffer.from("largeid blob 2097153\n");
    const findings = readBatchOutput(
      Buffer.concat([
        Buffer.from("missingid missing\n"),
        binaryObject,
        oversizedObject,
      ]),
      new Map([
        ["missingid", "missing.txt"],
        ["binaryid", "binary.bin"],
        ["largeid", "large.txt"],
      ]),
    );

    expect(findings.map((finding) => finding.rule)).toEqual(
      expect.arrayContaining([
        "git-object-unreadable",
        "binary-file",
        "oversize-file",
      ]),
    );
  });

  it("does not report git tree or commit objects as unreadable blobs", () => {
    const treeObject = Buffer.concat([
      Buffer.from("treeid tree 8\n"),
      Buffer.from("100644 x"),
      Buffer.from("\n"),
    ]);
    const commitObject = Buffer.concat([
      Buffer.from("commitid commit 11\n"),
      Buffer.from("tree abcdef"),
      Buffer.from("\n"),
    ]);
    const findings = readBatchOutput(
      Buffer.concat([treeObject, commitObject]),
      new Map([
        ["treeid", "src"],
        ["commitid", "docs"],
      ]),
    );

    // trees and commits are git structure, not scannable text: they must not
    // be reported as "git-object-unreadable" nor as any other finding.
    expect(findings).toEqual([]);
  });

  it("reports malformed tree and commit objects instead of silently skipping them", () => {
    const malformedHeaderFindings = readBatchOutput(
      Buffer.from("malformed-tree tree not-a-size\n"),
      new Map([["malformed-tree", "src"]]),
    );
    const truncatedBodyFindings = readBatchOutput(
      Buffer.concat([
        Buffer.from("truncated-commit commit 12\n"),
        Buffer.from("tree abcde"),
      ]),
      new Map([["truncated-commit", "docs"]]),
    );
    const missingDelimiterFindings = readBatchOutput(
      Buffer.concat([
        Buffer.from("missing-delimiter tree 8\n"),
        Buffer.from("100644 x"),
      ]),
      new Map([["missing-delimiter", "missing-tree"]]),
    );

    expect(malformedHeaderFindings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "history:src",
          rule: "git-object-unreadable",
        }),
      ]),
    );
    expect(truncatedBodyFindings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "history:docs",
          rule: "git-object-unreadable",
        }),
      ]),
    );
    expect(missingDelimiterFindings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "history:missing-tree",
          rule: "git-object-unreadable",
        }),
      ]),
    );
  });

  it("reports stable, redacted summaries suitable for CI output", () => {
    const findings: readonly SecretFinding[] = [
      {
        path: "b.ts",
        line: 4,
        rule: "jwt",
        evidence: "eyJ…redacted",
      },
      {
        path: "a.ts",
        line: 2,
        rule: "jwt",
        evidence: "eyJ…redacted",
      },
    ];

    expect(summarizeSecretFindings(findings)).toBe(
      "a.ts:2 [jwt] eyJ…redacted; b.ts:4 [jwt] eyJ…redacted",
    );
  });
});
