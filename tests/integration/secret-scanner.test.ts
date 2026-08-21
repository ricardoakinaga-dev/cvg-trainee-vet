import {
  chmod,
  mkdir,
  mkdtemp,
  rename,
  rm,
  symlink,
  truncate,
  writeFile,
} from "node:fs/promises";
import { EventEmitter } from "node:events";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { Worker } from "node:worker_threads";
import { afterEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

import {
  scanText,
  scanProject,
  summarizeSecretFindings,
  type SecretFinding,
  parseObjectList,
  planGitBatchRequests,
  readBatchOutput,
} from "../../scripts/secret-scanner.mjs";
import {
  readScanBuffer,
  readWorkspaceEntries,
} from "../../scripts/secret-scanner-workspace.mjs";
import {
  createGitBatchStreamParser,
  planGitBatchRequests as planGitBatchRequestsInternal,
  runGitBatch,
} from "../../scripts/secret-scanner-git-batch.mjs";

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
    const objectId = "1".repeat(40);
    const body = Buffer.from(
      `object 1111111111111111111111111111111111111111\ntype commit\ntag synthetic-release\ntagger Synthetic <synthetic@example.invalid> 0 +0000\n\nrelease notes\n`,
    );
    const findings = readBatchOutput(
      Buffer.concat([
        Buffer.from(`${objectId} tag ${body.byteLength}\n`),
        body,
        Buffer.from("\n"),
      ]),
      new Map([[objectId, "synthetic-release"]]),
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

  it("does not follow symlinks when opening workspace files", async () => {
    const directory = await mkdtemp(
      join(tmpdir(), "cvg-secret-scanner-open-symlink-"),
    );
    temporaryDirectories.push(directory);
    const target = join(directory, "target.env");
    const link = join(directory, "linked.env");
    await writeFile(target, "synthetic\n");
    await symlink(target, link);

    await expect(readScanBuffer(link, 2 * 1024 * 1024)).rejects.toThrow();
  });

  it("does not follow symlinks when opening workspace directories", async () => {
    const directory = await mkdtemp(
      join(tmpdir(), "cvg-secret-scanner-open-directory-symlink-"),
    );
    temporaryDirectories.push(directory);
    const target = join(directory, "target");
    const link = join(directory, "linked");
    await mkdir(target);
    await symlink(target, link, "dir");

    await expect(readWorkspaceEntries(link)).rejects.toThrow();
  });

  it("rejects a symlink supplied as the scan root", async () => {
    const parent = await mkdtemp(
      join(tmpdir(), "cvg-secret-scanner-root-link-"),
    );
    temporaryDirectories.push(parent);
    const target = join(parent, "target");
    const root = join(parent, "root-link");
    const secret = ["Qz", "7m", "P4", "xL", "9s", "T2", "vK", "8n"].join("");
    await mkdir(target);
    await writeFile(
      join(target, "config.env"),
      `API_TOKEN="${secret.repeat(4)}"\n`,
    );
    await symlink(target, root);

    const findings = await scanProject(root, {
      includeStaged: true,
      includeHistory: true,
    });

    expect(findings).toEqual([
      expect.objectContaining({
        path: "<workspace>",
        rule: "unreadable-file",
      }),
    ]);
    expect(JSON.stringify(findings)).not.toContain(secret);
  });

  it("does not scan a different directory after a root identity swap", async () => {
    const base = await mkdtemp(
      join(tmpdir(), "cvg-secret-scanner-root-identity-race-"),
    );
    temporaryDirectories.push(base);
    const parent = join(
      base,
      ...Array.from({ length: 180 }, (_, index) => `p${index}`),
    );
    const root = join(parent, "root");
    const external = join(parent, "external");
    const backup = join(parent, "backup");
    await mkdir(parent, { recursive: true });
    await mkdir(root);
    await mkdir(external);
    const syntheticKeyName = ["API", "KEY"].join("_");
    await writeFile(
      join(external, "victim.env"),
      `${syntheticKeyName}="synthetic-external-only"\n`,
    );

    const worker = new Worker(
      `
        import { workerData } from "node:worker_threads";
        import { rename } from "node:fs/promises";
        await new Promise((resolve) => setTimeout(resolve, workerData.delay));
        try { await rename(workerData.root, workerData.backup); } catch {}
        try { await rename(workerData.external, workerData.root); } catch {}
        await new Promise((resolve) => setTimeout(resolve, workerData.hold));
        try { await rename(workerData.root, workerData.external); } catch {}
        try { await rename(workerData.backup, workerData.root); } catch {}
      `,
      {
        eval: true,
        workerData: { root, external, backup, delay: 5, hold: 100 },
      },
    );

    try {
      const findings = await scanProject(root, {
        includeStaged: false,
        includeHistory: false,
      });

      expect(findings).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: "victim.env",
            rule: "sensitive-assignment",
          }),
        ]),
      );
    } finally {
      await worker.terminate();
    }
  });

  it("pins staged Git reads to the validated workspace root", async () => {
    const parent = await mkdtemp(
      join(tmpdir(), "cvg-secret-scanner-root-git-race-"),
    );
    temporaryDirectories.push(parent);
    const realRoot = join(parent, "root-real");
    const root = join(parent, "root");
    const externalRoot = join(parent, "external");
    await mkdir(realRoot);
    await mkdir(externalRoot);
    await execFileAsync("git", ["init", "-q"], { cwd: realRoot });
    await execFileAsync("git", ["init", "-q"], { cwd: externalRoot });
    const syntheticKeyName = ["API", "KEY"].join("_");
    await writeFile(
      join(externalRoot, "victim.env"),
      `${syntheticKeyName}="synthetic-external-only"\n`,
    );
    await execFileAsync("git", ["add", "victim.env"], {
      cwd: externalRoot,
    });
    await execFileAsync(
      "git",
      [
        "-c",
        "user.email=synthetic@example.invalid",
        "-c",
        "user.name=synthetic",
        "commit",
        "-qm",
        "synthetic",
      ],
      { cwd: externalRoot },
    );
    await rename(realRoot, root);

    const worker = new Worker(
      `
        import { parentPort, workerData } from "node:worker_threads";
        import { rename, symlink, unlink } from "node:fs/promises";
        let running = true;
        parentPort.on("message", (message) => {
          if (message === "stop") running = false;
        });
        while (running) {
          try { await rename(workerData.root, workerData.backup); } catch {}
          try { await symlink(workerData.external, workerData.root, "dir"); } catch {}
          try { await unlink(workerData.root); } catch {}
          try { await rename(workerData.backup, workerData.root); } catch {}
        }
      `,
      {
        eval: true,
        workerData: {
          root,
          backup: join(parent, "root-backup"),
          external: externalRoot,
        },
      },
    );

    try {
      const leakedFindings = [];
      for (let attempt = 0; attempt < 500; attempt += 1) {
        const findings = await scanProject(root, {
          includeStaged: true,
          includeHistory: false,
        });
        leakedFindings.push(
          ...findings.filter(
            (finding) =>
              finding.path === "staged:victim.env" &&
              finding.rule === "sensitive-assignment",
          ),
        );
      }

      expect(leakedFindings).toHaveLength(0);
    } finally {
      worker.postMessage("stop");
      await worker.terminate();
    }
  });

  it("does not follow symlinked parent components when opening the workspace root", async () => {
    const base = await mkdtemp(
      join(tmpdir(), "cvg-secret-scanner-parent-path-race-"),
    );
    temporaryDirectories.push(base);
    const realParent = join(base, "slot-real");
    const parentPath = join(base, "slot");
    const externalParent = join(base, "slot-external");
    const root = join(parentPath, "root");
    const externalRoot = join(externalParent, "root");
    await mkdir(join(realParent, "root"), { recursive: true });
    await mkdir(externalRoot, { recursive: true });
    const syntheticKeyName = ["API", "KEY"].join("_");
    await writeFile(
      join(externalRoot, "victim.env"),
      `${syntheticKeyName}="synthetic-external-only"\n`,
    );
    await rename(realParent, parentPath);

    const worker = new Worker(
      `
        import { parentPort, workerData } from "node:worker_threads";
        import { rename, symlink, unlink } from "node:fs/promises";
        let running = true;
        parentPort.on("message", (message) => {
          if (message === "stop") running = false;
        });
        while (running) {
          try { await rename(workerData.parentPath, workerData.backup); } catch {}
          try { await symlink(workerData.external, workerData.parentPath, "dir"); } catch {}
          try { await unlink(workerData.parentPath); } catch {}
          try { await rename(workerData.backup, workerData.parentPath); } catch {}
        }
      `,
      {
        eval: true,
        workerData: {
          parentPath,
          backup: join(base, "slot-backup"),
          external: externalParent,
        },
      },
    );

    try {
      const leakedFindings = [];
      for (let attempt = 0; attempt < 500; attempt += 1) {
        const findings = await scanProject(root, {
          includeStaged: false,
          includeHistory: false,
        });
        leakedFindings.push(
          ...findings.filter(
            (finding) =>
              finding.path === "victim.env" &&
              finding.rule === "sensitive-assignment",
          ),
        );
      }

      expect(leakedFindings).toHaveLength(0);
    } finally {
      worker.postMessage("stop");
      await worker.terminate();
    }
  });

  it("does not follow symlinked Git metadata", async () => {
    const parent = await mkdtemp(
      join(tmpdir(), "cvg-secret-scanner-git-metadata-link-"),
    );
    temporaryDirectories.push(parent);
    const root = join(parent, "root");
    const external = join(parent, "external");
    await mkdir(root);
    await mkdir(external);
    await execFileAsync("git", ["init", "-q"], { cwd: external });
    const syntheticKeyName = ["API", "KEY"].join("_");
    await writeFile(
      join(external, "victim.env"),
      `${syntheticKeyName}="synthetic-external-only"\n`,
    );
    await execFileAsync("git", ["add", "victim.env"], { cwd: external });
    await execFileAsync(
      "git",
      [
        "-c",
        "user.email=synthetic@example.invalid",
        "-c",
        "user.name=synthetic",
        "commit",
        "-qm",
        "synthetic",
      ],
      { cwd: external },
    );
    await symlink(join(external, ".git"), join(root, ".git"), "dir");

    const findings = await scanProject(root, {
      includeStaged: true,
      includeHistory: true,
    });

    expect(findings).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "staged:victim.env",
          rule: "sensitive-assignment",
        }),
        expect.objectContaining({
          path: "history:victim.env",
          rule: "sensitive-assignment",
        }),
      ]),
    );
    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "staged:<git>",
          rule: "git-object-unreadable",
        }),
        expect.objectContaining({
          path: "history:<git>",
          rule: "git-object-unreadable",
        }),
      ]),
    );
  });

  it("does not honor inherited Git path redirection variables", async () => {
    const parent = await mkdtemp(
      join(tmpdir(), "cvg-secret-scanner-git-env-redirect-"),
    );
    temporaryDirectories.push(parent);
    const root = join(parent, "root");
    const external = join(parent, "external");
    await mkdir(root);
    await mkdir(external);
    await execFileAsync("git", ["init", "-q"], { cwd: root });
    await execFileAsync("git", ["init", "-q"], { cwd: external });
    const syntheticKeyName = ["API", "KEY"].join("_");
    await writeFile(
      join(external, "victim.env"),
      `${syntheticKeyName}="synthetic-external-only"\n`,
    );
    await execFileAsync("git", ["add", "victim.env"], { cwd: external });

    const previousEnvironment = {
      GIT_INDEX_FILE: process.env.GIT_INDEX_FILE,
      GIT_OBJECT_DIRECTORY: process.env.GIT_OBJECT_DIRECTORY,
    };
    process.env.GIT_INDEX_FILE = join(external, ".git", "index");
    process.env.GIT_OBJECT_DIRECTORY = join(external, ".git", "objects");

    try {
      const findings = await scanProject(root, {
        includeStaged: true,
        includeHistory: false,
      });

      expect(findings).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: "staged:victim.env",
            rule: "sensitive-assignment",
          }),
        ]),
      );
    } finally {
      if (previousEnvironment.GIT_INDEX_FILE === undefined) {
        delete process.env.GIT_INDEX_FILE;
      } else {
        process.env.GIT_INDEX_FILE = previousEnvironment.GIT_INDEX_FILE;
      }
      if (previousEnvironment.GIT_OBJECT_DIRECTORY === undefined) {
        delete process.env.GIT_OBJECT_DIRECTORY;
      } else {
        process.env.GIT_OBJECT_DIRECTORY =
          previousEnvironment.GIT_OBJECT_DIRECTORY;
      }
    }
  });

  it("does not follow symlinked internal Git index and object directories", async () => {
    const parent = await mkdtemp(
      join(tmpdir(), "cvg-secret-scanner-git-internal-link-"),
    );
    temporaryDirectories.push(parent);
    const root = join(parent, "root");
    const external = join(parent, "external");
    await mkdir(root);
    await mkdir(external);
    await execFileAsync("git", ["init", "-q"], { cwd: root });
    await execFileAsync("git", ["init", "-q"], { cwd: external });
    const syntheticKeyName = ["API", "KEY"].join("_");
    await writeFile(
      join(external, "victim.env"),
      `${syntheticKeyName}="synthetic-external-only"\n`,
    );
    await execFileAsync("git", ["add", "victim.env"], { cwd: external });
    await execFileAsync(
      "git",
      [
        "-c",
        "user.email=synthetic@example.invalid",
        "-c",
        "user.name=synthetic",
        "commit",
        "-qm",
        "synthetic",
      ],
      { cwd: external },
    );
    await rename(
      join(root, ".git", "objects"),
      join(root, ".git", "objects-backup"),
    );
    await symlink(
      join(external, ".git", "objects"),
      join(root, ".git", "objects"),
      "dir",
    );
    await symlink(join(external, ".git", "index"), join(root, ".git", "index"));

    const findings = await scanProject(root, {
      includeStaged: true,
      includeHistory: false,
    });

    expect(findings).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "staged:victim.env",
          rule: "sensitive-assignment",
        }),
      ]),
    );
    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "staged:<git>",
          rule: "git-object-unreadable",
        }),
      ]),
    );
  });

  it("does not follow Git object alternates", async () => {
    const parent = await mkdtemp(
      join(tmpdir(), "cvg-secret-scanner-git-alternates-"),
    );
    temporaryDirectories.push(parent);
    const root = join(parent, "root");
    const external = join(parent, "external");
    await mkdir(root);
    await mkdir(external);
    await execFileAsync("git", ["init", "-q"], { cwd: root });
    await execFileAsync("git", ["init", "-q"], { cwd: external });
    const syntheticKeyName = ["API", "KEY"].join("_");
    await writeFile(
      join(external, "victim.env"),
      `${syntheticKeyName}="synthetic-external-only"\n`,
    );
    await execFileAsync("git", ["add", "victim.env"], { cwd: external });
    await execFileAsync(
      "git",
      [
        "-c",
        "user.email=synthetic@example.invalid",
        "-c",
        "user.name=synthetic",
        "commit",
        "-qm",
        "synthetic",
      ],
      { cwd: external },
    );
    const externalHead = (
      await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: external })
    ).stdout.trim();
    await mkdir(join(root, ".git", "refs", "heads"), { recursive: true });
    await writeFile(join(root, ".git", "HEAD"), "ref: refs/heads/main\n");
    await writeFile(
      join(root, ".git", "refs", "heads", "main"),
      `${externalHead}\n`,
    );
    await writeFile(
      join(root, ".git", "objects", "info", "alternates"),
      `${join(external, ".git", "objects")}\n`,
    );

    const findings = await scanProject(root, {
      includeStaged: false,
      includeHistory: true,
    });

    expect(findings).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "history:victim.env",
          rule: "sensitive-assignment",
        }),
      ]),
    );
    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "history:<git>",
          rule: "git-object-unreadable",
        }),
      ]),
    );
  });

  it("fails closed when Git alternates appear after metadata validation", async () => {
    const parent = await mkdtemp(
      join(tmpdir(), "cvg-secret-scanner-git-alternates-race-"),
    );
    temporaryDirectories.push(parent);
    const root = join(parent, "root");
    const external = join(parent, "external");
    await mkdir(root);
    await mkdir(external);
    await execFileAsync("git", ["init", "-q"], { cwd: root });
    await execFileAsync("git", ["init", "-q"], { cwd: external });
    const syntheticKeyName = ["API", "KEY"].join("_");
    await writeFile(
      join(external, "victim.env"),
      `${syntheticKeyName}="synthetic-external-only"\n`,
    );
    await execFileAsync("git", ["add", "victim.env"], { cwd: external });
    await execFileAsync(
      "git",
      [
        "-c",
        "user.email=synthetic@example.invalid",
        "-c",
        "user.name=synthetic",
        "commit",
        "-qm",
        "synthetic",
      ],
      { cwd: external },
    );
    const externalHead = (
      await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: external })
    ).stdout.trim();
    await writeFile(join(root, ".git", "HEAD"), "ref: refs/heads/main\n");
    await mkdir(join(root, ".git", "refs", "heads"), { recursive: true });
    await writeFile(
      join(root, ".git", "refs", "heads", "main"),
      `${externalHead}\n`,
    );

    const alternates = join(root, ".git", "objects", "info", "alternates");
    const worker = new Worker(
      `
        import { parentPort, workerData } from "node:worker_threads";
        import { unlink, writeFile } from "node:fs/promises";
        let running = true;
        parentPort.on("message", (message) => {
          if (message === "stop") running = false;
        });
        while (running) {
          try { await writeFile(workerData.file, workerData.target + "\\n"); } catch {}
          try { await unlink(workerData.file); } catch {}
        }
      `,
      {
        eval: true,
        workerData: {
          file: alternates,
          target: join(external, ".git", "objects"),
        },
      },
    );

    try {
      const leakedFindings = [];
      for (let attempt = 0; attempt < 1000; attempt += 1) {
        const findings = await scanProject(root, {
          includeStaged: false,
          includeHistory: true,
        });
        leakedFindings.push(
          ...findings.filter(
            (finding) =>
              finding.path === "history:victim.env" &&
              finding.rule === "sensitive-assignment",
          ),
        );
      }

      expect(leakedFindings).toHaveLength(0);
    } finally {
      worker.postMessage("stop");
      await worker.terminate();
    }
  }, 15_000);

  it("pins Git metadata while staged content is being read", async () => {
    const parent = await mkdtemp(
      join(tmpdir(), "cvg-secret-scanner-git-metadata-race-"),
    );
    temporaryDirectories.push(parent);
    const root = join(parent, "root");
    const external = join(parent, "external");
    await mkdir(root);
    await mkdir(external);
    await execFileAsync("git", ["init", "-q"], { cwd: root });
    await execFileAsync("git", ["init", "-q"], { cwd: external });
    const syntheticKeyName = ["API", "KEY"].join("_");
    await writeFile(
      join(external, "victim.env"),
      `${syntheticKeyName}="synthetic-external-only"\n`,
    );
    await execFileAsync("git", ["add", "victim.env"], { cwd: external });
    await execFileAsync(
      "git",
      [
        "-c",
        "user.email=synthetic@example.invalid",
        "-c",
        "user.name=synthetic",
        "commit",
        "-qm",
        "synthetic",
      ],
      { cwd: external },
    );

    const worker = new Worker(
      `
        import { parentPort, workerData } from "node:worker_threads";
        import { rename, symlink, unlink } from "node:fs/promises";
        let running = true;
        parentPort.on("message", (message) => {
          if (message === "stop") running = false;
        });
        while (running) {
          try { await rename(workerData.git, workerData.backup); } catch {}
          try { await symlink(workerData.external, workerData.git, "dir"); } catch {}
          try { await unlink(workerData.git); } catch {}
          try { await rename(workerData.backup, workerData.git); } catch {}
        }
      `,
      {
        eval: true,
        workerData: {
          git: join(root, ".git"),
          backup: join(parent, "git-backup"),
          external: join(external, ".git"),
        },
      },
    );

    try {
      const leakedFindings = [];
      for (let attempt = 0; attempt < 500; attempt += 1) {
        const findings = await scanProject(root, {
          includeStaged: true,
          includeHistory: false,
        });
        leakedFindings.push(
          ...findings.filter(
            (finding) =>
              finding.path === "staged:victim.env" &&
              finding.rule === "sensitive-assignment",
          ),
        );
      }

      expect(leakedFindings).toHaveLength(0);
    } finally {
      worker.postMessage("stop");
      await worker.terminate();
    }
  });

  it("fails closed when Git metadata entry budget is exceeded", async () => {
    const directory = await mkdtemp(
      join(tmpdir(), "cvg-secret-scanner-git-metadata-budget-"),
    );
    temporaryDirectories.push(directory);
    await execFileAsync("git", ["init", "-q"], { cwd: directory });
    const info = join(directory, ".git", "objects", "info");
    await Promise.all(
      Array.from({ length: 1025 }, (_, index) =>
        writeFile(
          join(info, `synthetic-entry-${String(index).padStart(4, "0")}`),
          "",
        ),
      ),
    );

    const findings = await scanProject(directory, {
      includeStaged: false,
      includeHistory: true,
    });

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "history:<git>",
          rule: "git-object-unreadable",
        }),
      ]),
    );
  });

  it("fails closed when workspace entry budget is exceeded", async () => {
    const directory = await mkdtemp(
      join(tmpdir(), "cvg-secret-scanner-workspace-entry-budget-"),
    );
    temporaryDirectories.push(directory);
    await Promise.all(
      Array.from({ length: 1025 }, (_, index) =>
        writeFile(
          join(directory, `synthetic-entry-${String(index).padStart(4, "0")}`),
          "",
        ),
      ),
    );

    const findings = await scanProject(directory, {
      includeStaged: false,
      includeHistory: false,
    });

    expect(findings).toEqual([
      expect.objectContaining({
        path: "<workspace>",
        rule: "unreadable-file",
      }),
    ]);
  });

  it("fails closed when the total workspace entry budget is exceeded", async () => {
    const directory = await mkdtemp(
      join(tmpdir(), "cvg-secret-scanner-workspace-total-budget-"),
    );
    temporaryDirectories.push(directory);
    const groups = 32;
    const leavesPerGroup = 64;
    await Promise.all(
      Array.from({ length: groups * leavesPerGroup }, async (_, index) => {
        const group = Math.floor(index / leavesPerGroup);
        const leaf = index % leavesPerGroup;
        const leafDirectory = join(
          directory,
          `group-${String(group).padStart(2, "0")}`,
          `leaf-${String(leaf).padStart(2, "0")}`,
        );
        await mkdir(leafDirectory, { recursive: true });
        await writeFile(join(leafDirectory, "empty.txt"), "");
      }),
    );

    const findings = await scanProject(directory, {
      includeStaged: false,
      includeHistory: false,
    });

    expect(findings).toEqual([
      expect.objectContaining({
        path: "<workspace>",
        rule: "unreadable-file",
      }),
    ]);
  });

  it("fails closed when workspace recursion depth budget is exceeded", async () => {
    const directory = await mkdtemp(
      join(tmpdir(), "cvg-secret-scanner-workspace-depth-budget-"),
    );
    temporaryDirectories.push(directory);
    let current = directory;
    const depth = 257;
    for (let index = 0; index < depth; index += 1) {
      current = join(current, `level-${String(index).padStart(3, "0")}`);
      await mkdir(current);
    }
    await writeFile(join(current, "empty.txt"), "");

    const findings = await scanProject(directory, {
      includeStaged: false,
      includeHistory: false,
    });

    expect(findings).toEqual([
      expect.objectContaining({
        path: "<workspace>",
        rule: "unreadable-file",
      }),
    ]);
  });

  it("fails closed when workspace byte budget is exceeded", async () => {
    const directory = await mkdtemp(
      join(tmpdir(), "cvg-secret-scanner-workspace-byte-budget-"),
    );
    temporaryDirectories.push(directory);
    const fileCount = 65;
    const fileSize = 1024 * 1024;
    const prefix = "synthetic-total-bytes-fixture\n";
    const content = prefix + "x".repeat(fileSize - prefix.length);
    for (let index = 0; index < fileCount; index += 1) {
      await writeFile(
        join(directory, `fixture-${String(index).padStart(3, "0")}.env`),
        content,
      );
    }

    const findings = await scanProject(directory, {
      includeStaged: false,
      includeHistory: false,
    });

    expect(findings).toEqual([
      expect.objectContaining({
        path: "<workspace>",
        rule: "unreadable-file",
      }),
    ]);
  }, 15000);

  it("fails closed when aggregate Git scan bytes are exceeded", async () => {
    const directory = await mkdtemp(
      join(tmpdir(), "cvg-secret-scanner-git-byte-budget-"),
    );
    temporaryDirectories.push(directory);
    await execFileAsync("git", ["init", "-q"], { cwd: directory });
    await execFileAsync(
      "git",
      ["config", "user.email", "synthetic@example.invalid"],
      { cwd: directory },
    );
    await execFileAsync("git", ["config", "user.name", "Synthetic Test"], {
      cwd: directory,
    });
    const fileCount = 129;
    const fileSize = 2 * 1024 * 1024;
    await mkdir(join(directory, "dist"));
    for (let index = 0; index < fileCount; index += 1) {
      const prefix = `synthetic-git-byte-fixture-${index}\n`;
      await writeFile(
        join(
          directory,
          "dist",
          `fixture-${String(index).padStart(3, "0")}.env`,
        ),
        prefix + "x".repeat(fileSize - prefix.length),
      );
    }
    await execFileAsync("git", ["add", "dist"], { cwd: directory });
    await execFileAsync("git", ["commit", "-qm", "synthetic git byte cap"], {
      cwd: directory,
    });

    const stagedFindings = await scanProject(directory, {
      includeStaged: true,
      includeHistory: false,
    });
    const historyFindings = await scanProject(directory, {
      includeStaged: false,
      includeHistory: true,
    });

    expect(stagedFindings).toEqual([
      expect.objectContaining({
        path: "staged:<git>",
        rule: "git-object-unreadable",
      }),
    ]);
    expect(historyFindings).toEqual([
      expect.objectContaining({
        path: "history:<git>",
        rule: "git-object-unreadable",
      }),
    ]);
  }, 60000);

  it("counts bounded reads that exceed the per-file staged cap", async () => {
    const directory = await mkdtemp(
      join(tmpdir(), "cvg-secret-scanner-staged-oversize-budget-"),
    );
    temporaryDirectories.push(directory);
    await execFileAsync("git", ["init", "-q"], { cwd: directory });
    await execFileAsync(
      "git",
      ["config", "user.email", "synthetic@example.invalid"],
      { cwd: directory },
    );
    await execFileAsync("git", ["config", "user.name", "Synthetic Test"], {
      cwd: directory,
    });
    const fileCount = 129;
    const fileSize = 2 * 1024 * 1024 + 2;
    await mkdir(join(directory, "dist"));
    for (let index = 0; index < fileCount; index += 1) {
      const prefix = `synthetic-staged-oversize-${index}\n`;
      await writeFile(
        join(
          directory,
          "dist",
          `fixture-${String(index).padStart(3, "0")}.env`,
        ),
        prefix + "x".repeat(fileSize - prefix.length),
      );
    }
    await execFileAsync("git", ["add", "dist"], { cwd: directory });
    await execFileAsync(
      "git",
      ["commit", "-qm", "synthetic staged oversize cap"],
      { cwd: directory },
    );

    const findings = await scanProject(directory, {
      includeStaged: true,
      includeHistory: false,
    });

    expect(findings).toEqual([
      expect.objectContaining({
        path: "staged:<git>",
        rule: "git-object-unreadable",
      }),
    ]);
  }, 60000);

  it.each(["missing", "regular-file"])(
    "rejects a %s supplied as the scan root",
    async (name) => {
      const directory = await mkdtemp(
        join(tmpdir(), "cvg-secret-scanner-invalid-root-"),
      );
      temporaryDirectories.push(directory);
      const root = join(directory, name);
      if (name === "regular-file") await writeFile(root, "synthetic\n");

      const findings = await scanProject(root, {
        includeStaged: true,
        includeHistory: true,
      });

      expect(findings).toEqual([
        expect.objectContaining({
          path: "<workspace>",
          rule: "unreadable-file",
        }),
      ]);
    },
  );

  it("skips oversized ignored assets before attempting to read them", async () => {
    const directory = await mkdtemp(
      join(tmpdir(), "cvg-secret-scanner-oversized-asset-"),
    );
    temporaryDirectories.push(directory);
    const asset = join(directory, "large.png");
    await writeFile(asset, Buffer.from([0]));
    await truncate(asset, 2 * 1024 * 1024 + 1);
    await chmod(asset, 0o000);

    try {
      const findings = await scanProject(directory, {
        includeStaged: false,
        includeHistory: false,
      });

      expect(findings).toEqual([]);
    } finally {
      await chmod(asset, 0o600);
    }
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

  it("scans text under binary-looking paths across all surfaces without exposing bytes", async () => {
    const directory = await mkdtemp(
      join(tmpdir(), "cvg-secret-scanner-binary-extension-"),
    );
    temporaryDirectories.push(directory);
    const secret = ["Qz", "7m", "P4", "xL", "9s", "T2", "vK", "8n"].join("");
    const marker = "SYNTHETIC_BINARY_EXTENSION_MARKER";
    const worktreePath = "worktree.png";
    const stagedPath = "staged.png";
    const historyPath = "history.png";
    const binaryPath = "binary.png";
    await execFileAsync("git", ["init", "-q"], { cwd: directory });
    await execFileAsync(
      "git",
      ["config", "user.email", "synthetic@example.invalid"],
      { cwd: directory },
    );
    await execFileAsync("git", ["config", "user.name", "Synthetic Test"], {
      cwd: directory,
    });
    const textContent = `client_secret="${secret.repeat(4)}"\n`;
    await writeFile(join(directory, worktreePath), textContent);
    await writeFile(join(directory, stagedPath), textContent);
    await writeFile(join(directory, historyPath), textContent);
    await writeFile(
      join(directory, binaryPath),
      Buffer.concat([Buffer.from([0, 1, 2]), Buffer.from(marker)]),
    );

    const worktreeFindings = await scanProject(directory, {
      includeStaged: false,
      includeHistory: false,
    });
    expect(worktreeFindings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: worktreePath,
          rule: "sensitive-assignment",
        }),
      ]),
    );
    expect(JSON.stringify(worktreeFindings)).not.toContain(marker);
    expect(
      worktreeFindings.some((finding) => finding.path === binaryPath),
    ).toBe(false);

    await execFileAsync(
      "git",
      ["add", "--", worktreePath, stagedPath, historyPath],
      { cwd: directory },
    );
    const stagedFindings = await scanProject(directory, {
      includeStaged: true,
      includeHistory: false,
    });
    expect(stagedFindings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: `staged:${stagedPath}`,
          rule: "sensitive-assignment",
        }),
      ]),
    );

    await execFileAsync("git", ["commit", "-qm", "synthetic png paths"], {
      cwd: directory,
    });
    await Promise.all(
      [worktreePath, stagedPath, historyPath].map((path) =>
        rm(join(directory, path)),
      ),
    );
    const historyFindings = await scanProject(directory, {
      includeStaged: false,
      includeHistory: true,
    });
    expect(historyFindings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: `history:${historyPath}`,
          rule: "sensitive-assignment",
        }),
      ]),
    );
    expect(JSON.stringify(historyFindings)).not.toContain(secret);
  });

  it("preserves findings across bounded Git body batches", async () => {
    const directory = await mkdtemp(
      join(tmpdir(), "cvg-secret-scanner-batched-history-"),
    );
    temporaryDirectories.push(directory);
    const secret = ["Qz", "7m", "P4", "xL", "9s", "T2", "vK", "8n"].join("");
    await execFileAsync("git", ["init", "-q"], { cwd: directory });
    await execFileAsync(
      "git",
      ["config", "user.email", "synthetic@example.invalid"],
      { cwd: directory },
    );
    await execFileAsync("git", ["config", "user.name", "Synthetic Test"], {
      cwd: directory,
    });
    const paths = Array.from(
      { length: 5 },
      (_, index) => `history-batch-${index}.txt`,
    );
    await Promise.all(
      paths.map((path, index) => {
        const filler = Buffer.alloc(1_800_000, 0x20);
        filler[filler.length - 1] = index + 1;
        return writeFile(
          join(directory, path),
          Buffer.concat([
            Buffer.from(`client_secret="${secret.repeat(4)}"\n`),
            filler,
          ]),
        );
      }),
    );
    await execFileAsync("git", ["add", "."], { cwd: directory });
    await execFileAsync("git", ["commit", "-qm", "synthetic batched history"], {
      cwd: directory,
    });
    await Promise.all(paths.map((path) => rm(join(directory, path))));

    const findings = await scanProject(directory, {
      includeStaged: false,
      includeHistory: true,
    });

    expect(
      findings.filter((finding) => finding.rule === "sensitive-assignment"),
    ).toHaveLength(5);
    expect(findings.map((finding) => finding.path)).toEqual(
      expect.arrayContaining(paths.map((path) => `history:${path}`)),
    );
    expect(JSON.stringify(findings)).not.toContain(secret);
  });

  it("preserves boundary whitespace in staged paths", async () => {
    const directory = await mkdtemp(join(tmpdir(), "cvg-secret-scanner-path-"));
    temporaryDirectories.push(directory);
    const paddedPath = " .env.local ";
    const trimmedPath = ".env.local";
    const secret = ["Qz", "7m", "P4", "xL", "9s", "T2", "vK", "8n"].join("");
    await execFileAsync("git", ["init", "-q"], { cwd: directory });
    await execFileAsync(
      "git",
      ["config", "user.email", "synthetic@example.invalid"],
      { cwd: directory },
    );
    await execFileAsync("git", ["config", "user.name", "Synthetic Test"], {
      cwd: directory,
    });
    await writeFile(
      join(directory, paddedPath),
      `API_TOKEN="${secret.repeat(4)}"\n`,
    );
    await writeFile(join(directory, trimmedPath), 'API_TOKEN="<redacted>"\n');
    await execFileAsync("git", ["add", "--", paddedPath, trimmedPath], {
      cwd: directory,
    });
    await rm(join(directory, paddedPath));

    const findings = await scanProject(directory, {
      includeStaged: true,
      includeHistory: false,
    });

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: `staged:${paddedPath}`,
          rule: "sensitive-assignment",
        }),
      ]),
    );
    expect(JSON.stringify(findings)).not.toContain(secret);
  });

  it("preserves trailing whitespace in reachable history paths", async () => {
    const directory = await mkdtemp(
      join(tmpdir(), "cvg-secret-scanner-history-path-"),
    );
    temporaryDirectories.push(directory);
    const historyPath = "secret.png ";
    const secret = ["Qz", "7m", "P4", "xL", "9s", "T2", "vK", "8n"].join("");
    await execFileAsync("git", ["init", "-q"], { cwd: directory });
    await execFileAsync(
      "git",
      ["config", "user.email", "synthetic@example.invalid"],
      { cwd: directory },
    );
    await execFileAsync("git", ["config", "user.name", "Synthetic Test"], {
      cwd: directory,
    });
    await writeFile(
      join(directory, historyPath),
      `API_TOKEN="${secret.repeat(4)}"\n`,
    );
    await execFileAsync("git", ["add", "--", historyPath], {
      cwd: directory,
    });
    await execFileAsync("git", ["commit", "-qm", "synthetic history"], {
      cwd: directory,
    });
    await rm(join(directory, historyPath));

    const findings = await scanProject(directory, {
      includeStaged: false,
      includeHistory: true,
    });

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: `history:${historyPath}`,
          rule: "sensitive-assignment",
        }),
      ]),
    );
    expect(JSON.stringify(findings)).not.toContain(secret);
  });

  it("rejects malformed rev-list object records instead of silently skipping them", () => {
    const structureObjectId = "a".repeat(40);
    const contentObjectId = "b".repeat(40);
    const binaryAssetObjectId = "c".repeat(40);
    const objects = parseObjectList(
      [
        structureObjectId,
        `${contentObjectId} src/config.ts`,
        `${binaryAssetObjectId} public/icon.png`,
      ].join("\n"),
    );

    expect([...objects.entries()]).toEqual([
      [contentObjectId, "src/config.ts"],
      [binaryAssetObjectId, "public/icon.png"],
    ]);
    expect(() => parseObjectList("not-a-valid-rev-list-record\n")).toThrow(
      /malformed git object list/iu,
    );
  });

  it("reports malformed, binary and oversized history objects instead of silently skipping them", () => {
    const binaryObject = Buffer.concat([
      Buffer.from(`${"2".repeat(40)} blob 3\n`),
      Buffer.from([0, 1, 2]),
      Buffer.from("\n"),
    ]);
    const oversizedObject = Buffer.from(`${"3".repeat(40)} blob 2097153\n`);
    const findings = readBatchOutput(
      Buffer.concat([
        Buffer.from(`${"4".repeat(40)} missing\n`),
        binaryObject,
        oversizedObject,
      ]),
      new Map([
        ["4".repeat(40), "missing.txt"],
        ["2".repeat(40), "binary.bin"],
        ["3".repeat(40), "large.txt"],
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

  it("plans bounded Git body requests from batch-check metadata", () => {
    const oversizedAssetId = "a".repeat(40);
    const oversizedTextId = "b".repeat(40);
    const boundedTextId = "c".repeat(40);
    const structuralId = "d".repeat(40);
    const plan = planGitBatchRequests(
      Buffer.from(
        [
          `${oversizedAssetId} blob 2097153`,
          `${oversizedTextId} blob 2097153`,
          `${boundedTextId} blob 32`,
          `${structuralId} tree 512`,
          "",
        ].join("\n"),
      ),
      new Map([
        [oversizedAssetId, "large.pdf"],
        [oversizedTextId, "large.txt"],
        [boundedTextId, "text.png"],
        [structuralId, "src"],
      ]),
    );

    expect(plan.objectIds).toEqual([boundedTextId]);
    expect(plan.findings).toEqual([
      expect.objectContaining({
        path: "history:large.txt",
        rule: "oversize-file",
      }),
    ]);
  });

  it("partitions bounded Git body requests by aggregate budget", () => {
    const objectIds = ["a", "b", "c", "d", "e"].map((prefix) =>
      prefix.repeat(40),
    );
    const plan = planGitBatchRequests(
      Buffer.from(
        objectIds
          .map((objectId) => `${objectId} blob 2097152`)
          .concat("")
          .join("\n"),
      ),
      new Map(
        objectIds.map((objectId, index) => [objectId, `history-${index}.txt`]),
      ),
    );

    expect(plan.objectIds).toEqual(objectIds);
    expect(plan.batches).toEqual([objectIds.slice(0, 4), objectIds.slice(4)]);
    expect(plan.batchSizes).toEqual([8 * 1024 * 1024, 2 * 1024 * 1024]);
  });

  it("keeps the low-level Git batch planner fail-closed by default", () => {
    const megabyte = 1024 * 1024;
    const objectIds = ["a", "b", "c"].map((prefix) => prefix.repeat(40));
    const objects = new Map(
      objectIds.map((objectId, index) => [objectId, `bounded-${index}.txt`]),
    );
    const metadata = Buffer.from(
      objectIds
        .map((objectId) => `${objectId} blob ${3 * megabyte}`)
        .concat("")
        .join("\n"),
    );
    const options = {
      maxScanBytes: 4 * megabyte,
      isIgnoredBinaryAssetPath: () => false,
      unscannedFinding: (path: string, rule: string, evidence: string) => ({
        path,
        rule,
        evidence,
      }),
      source: "history",
    };

    const plan = planGitBatchRequestsInternal(metadata, objects, options);

    expect(plan.batchSizes).toEqual([6 * megabyte, 3 * megabyte]);
    expect(Math.max(...plan.batchSizes)).toBeLessThanOrEqual(8 * megabyte);
    for (const maxBatchBytes of [
      0,
      -1,
      Number.NaN,
      1.5,
      Number.POSITIVE_INFINITY,
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      expect(() =>
        planGitBatchRequestsInternal(metadata, objects, {
          ...options,
          maxBatchBytes,
        }),
      ).toThrow(/maxBatchBytes/iu);
    }

    const oversizedId = "d".repeat(40);
    const oversized = planGitBatchRequestsInternal(
      Buffer.from(`${oversizedId} blob ${9 * megabyte}\n`),
      new Map([[oversizedId, "oversized.txt"]]),
      { ...options, maxScanBytes: 10 * megabyte },
    );
    expect(oversized.batches).toEqual([]);
    expect(oversized.findings).toEqual([
      expect.objectContaining({
        path: "history:oversized.txt",
        rule: "git-object-unreadable",
      }),
    ]);
  });

  it("rejects invalid explicit Git batch byte caps before spawning", async () => {
    let spawnCalls = 0;
    const spawnProcess = () => {
      spawnCalls += 1;
      throw new Error("synthetic spawn should not be reached");
    };
    const invalidLimits = [
      0,
      -1,
      Number.NaN,
      1.5,
      Number.POSITIVE_INFINITY,
      Number.MAX_SAFE_INTEGER + 1,
    ];

    for (const maxOutputBytes of invalidLimits) {
      await expect(
        runGitBatch(process.cwd(), ["cat-file", "--batch"], [], {
          maxOutputBytes,
          spawnProcess,
        }),
      ).rejects.toThrow(/maxOutputBytes/iu);
    }
    for (const maxErrorBytes of invalidLimits) {
      await expect(
        runGitBatch(process.cwd(), ["cat-file", "--batch"], [], {
          maxErrorBytes,
          spawnProcess,
        }),
      ).rejects.toThrow(/maxErrorBytes/iu);
    }
    expect(spawnCalls).toBe(0);
  });

  it("rejects invalid low-level Git scan and header caps", () => {
    const megabyte = 1024 * 1024;
    const objectId = "a".repeat(40);
    const objects = new Map([[objectId, "synthetic-large.txt"]]);
    const metadata = Buffer.from(`${objectId} blob ${9 * megabyte}\n`);
    const invalidLimits = [
      0,
      -1,
      Number.NaN,
      1.5,
      Number.POSITIVE_INFINITY,
      Number.MAX_SAFE_INTEGER + 1,
    ];
    const plannerOptions = {
      maxBatchBytes: 16 * megabyte,
      isIgnoredBinaryAssetPath: () => false,
      unscannedFinding: (path: string, rule: string, evidence: string) => ({
        path,
        rule,
        evidence,
      }),
      source: "history",
    };

    for (const maxScanBytes of invalidLimits) {
      expect(() =>
        planGitBatchRequestsInternal(metadata, objects, {
          ...plannerOptions,
          maxScanBytes,
        }),
      ).toThrow(/maxScanBytes/iu);
    }
    for (const maxHeaderBytes of invalidLimits) {
      expect(() =>
        createGitBatchStreamParser({
          objects,
          maxScanBytes: 2 * megabyte,
          maxHeaderBytes,
          isIgnoredBinaryAssetPath: () => false,
          unscannedFinding: plannerOptions.unscannedFinding,
          readBatchOutput: () => [],
          source: "history",
        }),
      ).toThrow(/maxHeaderBytes/iu);
    }
  });

  it("rejects Git batch output above its configured cap", async () => {
    const directory = await mkdtemp(join(tmpdir(), "cvg-secret-scanner-cap-"));
    temporaryDirectories.push(directory);
    await execFileAsync("git", ["init", "-q"], { cwd: directory });
    await execFileAsync(
      "git",
      ["config", "user.email", "synthetic@example.invalid"],
      { cwd: directory },
    );
    await execFileAsync("git", ["config", "user.name", "Synthetic Test"], {
      cwd: directory,
    });
    await writeFile(join(directory, "payload.txt"), "synthetic batch body\n");
    await execFileAsync("git", ["add", "payload.txt"], { cwd: directory });
    await execFileAsync("git", ["commit", "-qm", "synthetic batch cap"], {
      cwd: directory,
    });
    const { stdout } = await execFileAsync(
      "git",
      ["rev-parse", "HEAD:payload.txt"],
      { cwd: directory },
    );

    await expect(
      runGitBatch(directory, ["cat-file", "--batch"], [stdout.trim()], {
        maxOutputBytes: 16,
      }),
    ).rejects.toThrow(/output exceeds configured limit/iu);

    const chunks = [];
    const streamed = await runGitBatch(
      directory,
      ["cat-file", "--batch"],
      [stdout.trim()],
      {
        maxOutputBytes: 512,
        onChunk: (chunk) => chunks.push(chunk),
      },
    );

    expect(streamed).toBeUndefined();
    expect(chunks.length).toBeGreaterThan(0);
  });

  it("fails closed when the default Git batch stdout cap is exceeded", async () => {
    const marker = "SYNTHETIC_DEFAULT_STDOUT_MARKER";
    type FakeChild = EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      stdin: EventEmitter & { end: (input: string) => void };
      kill: () => void;
    };
    const child = Object.assign(new EventEmitter(), {
      stdout: new EventEmitter(),
      stderr: new EventEmitter(),
      stdin: Object.assign(new EventEmitter(), {
        end: (_input: string) => undefined,
      }),
      kill: () => undefined,
    }) as FakeChild;
    const spawnProcess = () => {
      queueMicrotask(() => {
        child.stdout.emit(
          "data",
          Buffer.concat([Buffer.alloc(8 * 1024 * 1024), Buffer.from(marker)]),
        );
        child.emit("close", 0);
      });
      return child;
    };

    const error = await runGitBatch(
      process.cwd(),
      ["cat-file", "--batch"],
      [],
      { spawnProcess },
    ).catch((caught) => caught as Error);

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toMatch(/output exceeds configured limit/iu);
    expect(error.message).not.toContain(marker);
  });

  it("bounds and redacts noisy Git batch stderr", async () => {
    const marker = "SYNTHETIC_GIT_STDERR_MARKER";
    type FakeChild = EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      stdin: EventEmitter & { end: (input: string) => void };
      kill: () => void;
    };
    const child = Object.assign(new EventEmitter(), {
      stdout: new EventEmitter(),
      stderr: new EventEmitter(),
      stdin: Object.assign(new EventEmitter(), {
        end: (_input: string) => undefined,
      }),
      kill: () => undefined,
    }) as FakeChild;
    const spawnProcess = () => {
      queueMicrotask(() => {
        child.stderr.emit("data", Buffer.from(marker.repeat(100)));
        child.emit("close", 1);
      });
      return child;
    };

    const error = await runGitBatch(
      process.cwd(),
      ["cat-file", "--batch"],
      [],
      { maxErrorBytes: 64, spawnProcess },
    ).catch((caught) => caught as Error);

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toMatch(/stderr exceeds configured limit/iu);
    expect(error.message).not.toContain(marker);
  });

  it("keeps regular non-zero Git failures redacted and bounded", async () => {
    await expect(
      runGitBatch(process.cwd(), ["cat-file", "--not-a-real-option"], [], {
        maxErrorBytes: 4096,
      }),
    ).rejects.toThrow(/git batch command failed/iu);
  });

  it("redacts malformed streamed Git headers", () => {
    const marker = "SYNTHETIC_STREAM_HEADER_MARKER";
    const parser = createGitBatchStreamParser({
      objects: new Map(),
      maxScanBytes: 128,
      maxHeaderBytes: 128,
      isIgnoredBinaryAssetPath: () => false,
      unscannedFinding: (path, rule, evidence) => ({
        path,
        rule,
        evidence,
      }),
      readBatchOutput,
    });

    parser.push(Buffer.from(`invalid ${marker}\n`));
    parser.finish();

    expect(parser.findings).toEqual([
      expect.objectContaining({
        path: "history:<git>",
        rule: "git-object-unreadable",
      }),
    ]);
    expect(JSON.stringify(parser.findings)).not.toContain(marker);
  });

  it("fails closed on truncated streamed Git bodies", () => {
    const objectId = "f".repeat(40);
    const marker = "SYNTHETIC_STREAM_BODY_MARKER";
    const parser = createGitBatchStreamParser({
      objects: new Map([[objectId, "history.txt"]]),
      maxScanBytes: 128,
      maxHeaderBytes: 128,
      isIgnoredBinaryAssetPath: () => false,
      unscannedFinding: (path, rule, evidence) => ({
        path,
        rule,
        evidence,
      }),
      readBatchOutput,
    });

    parser.push(
      Buffer.from(`${objectId} blob ${marker.length}\n${marker.slice(0, 5)}`),
    );
    parser.finish();

    expect(parser.findings).toEqual([
      expect.objectContaining({
        path: "history:history.txt",
        rule: "git-object-unreadable",
      }),
    ]);
    expect(JSON.stringify(parser.findings)).not.toContain(marker);
  });

  it("does not report git tree or commit objects as unreadable blobs", () => {
    const treeObject = Buffer.concat([
      Buffer.from(`${"5".repeat(40)} tree 8\n`),
      Buffer.from("100644 x"),
      Buffer.from("\n"),
    ]);
    const commitObject = Buffer.concat([
      Buffer.from(`${"6".repeat(40)} commit 11\n`),
      Buffer.from("tree abcdef"),
      Buffer.from("\n"),
    ]);
    const findings = readBatchOutput(
      Buffer.concat([treeObject, commitObject]),
      new Map([
        ["5".repeat(40), "src"],
        ["6".repeat(40), "docs"],
      ]),
    );

    // trees and commits are git structure, not scannable text: they must not
    // be reported as "git-object-unreadable" nor as any other finding.
    expect(findings).toEqual([]);
  });

  it("reports malformed tree and commit objects instead of silently skipping them", () => {
    const treeId = "7".repeat(40);
    const commitId = "8".repeat(40);
    const missingDelimiterId = "9".repeat(40);
    const malformedHeaderFindings = readBatchOutput(
      Buffer.from(`${treeId} tree not-a-size\n`),
      new Map([[treeId, "src"]]),
    );
    const truncatedBodyFindings = readBatchOutput(
      Buffer.concat([
        Buffer.from(`${commitId} commit 12\n`),
        Buffer.from("tree abcde"),
      ]),
      new Map([[commitId, "docs"]]),
    );
    const missingDelimiterFindings = readBatchOutput(
      Buffer.concat([
        Buffer.from(`${missingDelimiterId} tree 8\n`),
        Buffer.from("100644 x"),
      ]),
      new Map([[missingDelimiterId, "missing-tree"]]),
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

  it("rejects malformed cat-file headers before scanning their bodies", () => {
    const syntheticValue = ["synthetic", "-secret", "-value"].join("");
    const body = Buffer.from(
      [["client", "_secret"].join(""), '="', syntheticValue, '"'].join(""),
    );
    const cases = [
      {
        objectId: "z".repeat(40),
        path: "malformed-id.txt",
        header: (objectId: string, size: number) => `${objectId} blob ${size}`,
      },
      {
        objectId: "a".repeat(40),
        path: "extra-field.txt",
        header: (objectId: string, size: number) =>
          `${objectId} blob ${size} extra`,
      },
      {
        objectId: "b".repeat(40),
        path: "non-decimal-size.txt",
        header: (objectId: string, size: number) => `${objectId} blob +${size}`,
      },
    ];

    for (const testCase of cases) {
      const findings = readBatchOutput(
        Buffer.concat([
          Buffer.from(
            `${testCase.header(testCase.objectId, body.byteLength)}\n`,
          ),
          body,
          Buffer.from("\n"),
        ]),
        new Map([[testCase.objectId, testCase.path]]),
      );

      expect(findings).toEqual([
        expect.objectContaining({
          path: `history:${testCase.path}`,
          rule: "git-object-unreadable",
        }),
      ]);
      expect(JSON.stringify(findings)).not.toContain("synthetic-secret-value");
    }
  });

  it("preserves valid missing and error batch responses", () => {
    const missingId = "c".repeat(40);
    const errorId = "d".repeat(40);
    const findings = readBatchOutput(
      Buffer.from(
        `${missingId} missing\n${errorId} error object unavailable\n`,
      ),
      new Map([
        [missingId, "missing.txt"],
        [errorId, "error.txt"],
      ]),
    );

    expect(findings).toEqual([
      expect.objectContaining({
        path: "history:missing.txt",
        rule: "git-object-unreadable",
      }),
      expect.objectContaining({
        path: "history:error.txt",
        rule: "git-object-unreadable",
      }),
    ]);
  });

  it("rejects unexpected cat-file object responses before scanning", () => {
    const requestedId = "e".repeat(40);
    const unexpectedId = "f".repeat(40);
    const secret = ["Qz", "7m", "P4", "xL", "9s", "T2", "vK", "8n"].join("");
    const body = Buffer.from(
      [["client", "_secret"].join(""), '="', secret, '"'].join(""),
    );
    const findings = readBatchOutput(
      Buffer.concat([
        Buffer.from(`${unexpectedId} blob ${body.byteLength}\n`),
        body,
        Buffer.from("\n"),
      ]),
      new Map([[requestedId, "requested.txt"]]),
    );

    expect(findings).toEqual([
      expect.objectContaining({
        path: `history:${unexpectedId}`,
        rule: "git-object-unreadable",
      }),
    ]);
    expect(JSON.stringify(findings)).not.toContain(secret);
  });

  it("does not expose incomplete cat-file header bytes in findings", () => {
    const objectId = "a".repeat(40);
    const marker = "SYNTHETIC_BODY_MARKER";
    const findings = readBatchOutput(
      Buffer.from(`${objectId} blob 12 client_secret="${marker}"`),
      new Map([[objectId, "requested.txt"]]),
    );

    expect(findings).toEqual([
      expect.objectContaining({
        path: "history:<git>",
        rule: "git-object-unreadable",
      }),
    ]);
    expect(JSON.stringify(findings)).not.toContain(marker);
  });

  it("does not expose malformed cat-file header tokens in findings", () => {
    const marker = "SYNTHETIC_HEADER_MARKER";
    const findings = readBatchOutput(
      Buffer.from(`client_secret="${marker}" blob 3\nabc\n`),
      new Map(),
    );

    expect(findings).toEqual([
      expect.objectContaining({
        path: "history:<git>",
        rule: "git-object-unreadable",
      }),
    ]);
    expect(JSON.stringify(findings)).not.toContain(marker);
  });

  it.each(["blob", "tag"])(
    "reports a %s object without its batch delimiter before scanning content",
    (type) => {
      const secret = ["Qz", "7m", "P4", "xL", "9s", "T2", "vK", "8n"].join("");
      const body = Buffer.from(`client_secret="${secret}"`);
      const objectId = type === "blob" ? "a".repeat(40) : "b".repeat(40);
      const findings = readBatchOutput(
        Buffer.concat([
          Buffer.from(`${objectId} ${type} ${body.byteLength}\n`),
          body,
        ]),
        new Map([[objectId, `${type}.txt`]]),
      );

      expect(findings).toEqual([
        expect.objectContaining({
          path: `history:${type}.txt`,
          rule: "git-object-unreadable",
        }),
      ]);
      expect(JSON.stringify(findings)).not.toContain(secret);

      const validBody = Buffer.from("synthetic-valid-body");
      expect(
        readBatchOutput(
          Buffer.concat([
            Buffer.from(`${objectId} ${type} ${validBody.byteLength}\n`),
            validBody,
            Buffer.from("\n"),
          ]),
          new Map([[objectId, `${type}.txt`]]),
        ),
      ).toEqual([]);
    },
  );

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
