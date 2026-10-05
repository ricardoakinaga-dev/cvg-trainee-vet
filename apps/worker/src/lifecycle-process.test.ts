import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import ts from "typescript";
import { describe, expect, it } from "vitest";

function lifecycleModule(): Readonly<{ code: string; sourceSha256: string }> {
  const source = readFileSync(
    new URL("./lifecycle.ts", import.meta.url),
    "utf8",
  );
  const tree = ts.createSourceFile(
    "lifecycle.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const declarations = tree.statements.filter(
    (node) =>
      (ts.isClassDeclaration(node) &&
        node.name?.text === "WorkerStoppingError") ||
      (ts.isFunctionDeclaration(node) &&
        node.name?.text === "createWorkerLifecycle"),
  );
  expect(declarations).toHaveLength(2);
  // Execute these exact exported declarations in a native process. Initialization
  // imports and service adapters are outside this callback-contract proof.
  const compiled = ts.transpileModule(
    declarations.map((node) => node.getText(tree)).join("\n"),
    {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ES2022,
      },
      reportDiagnostics: true,
    },
  );
  expect(
    compiled.diagnostics?.filter(
      (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
    ),
  ).toEqual([]);
  return {
    code: `data:text/javascript;base64,${Buffer.from(compiled.outputText).toString("base64")}`,
    sourceSha256: createHash("sha256").update(source).digest("hex"),
  };
}

function runNative(mode: "work" | "resources" | "failures") {
  const module = lifecycleModule();
  const script = `
    import { createWorkerLifecycle, WorkerStoppingError } from ${JSON.stringify(module.code)};
    const mode = ${JSON.stringify(mode)};
    const events = [];
    let workComplete = false, resourcesComplete = false, workErrorPreserved = false;
    let closeErrorPreserved = false, repeatedCloseSame = false, admissionRejected = false;
    const workError = new Error('synthetic business failure');
    const closeError = new Error('synthetic close failure');
    const delay = () => new Promise(resolve => {
      const timer = setTimeout(resolve, 150);
      timer.unref();
    });
    const lifecycle = createWorkerLifecycle(() => events.push('stop'), async () => {
      events.push('resources-entered');
      await delay();
      resourcesComplete = true;
      events.push('resources-complete');
      if (mode === 'failures') throw closeError;
    });
    if (mode !== 'resources') {
      const admitted = lifecycle.admit(async () => {
        events.push('work-entered');
        await delay();
        workComplete = true;
        events.push('work-complete');
        if (mode === 'failures') throw workError;
      });
      admitted.catch(error => { workErrorPreserved = error === workError; });
    }
    const closing = lifecycle.close();
    repeatedCloseSame = closing === lifecycle.close();
    lifecycle.admit(async () => undefined).catch(error => {
      admissionRejected = error instanceof WorkerStoppingError;
    });
    closing.then(() => events.push('drained'), error => {
      closeErrorPreserved = error === closeError;
      events.push('close-rejected');
    });
    process.once('beforeExit', () => {
      console.log(JSON.stringify({ mode, events, workComplete, resourcesComplete,
        workErrorPreserved, closeErrorPreserved, repeatedCloseSame, admissionRejected,
        remainingTimeouts: process.getActiveResourcesInfo().filter(name => name === 'Timeout').length,
        sourceSha256: ${JSON.stringify(module.sourceSha256)} }));
    });
  `;
  const child = spawnSync(
    process.execPath,
    ["--input-type=module", "--eval", script],
    {
      encoding: "utf8",
      timeout: 3_000,
    },
  );
  expect(child.error).toBeUndefined();
  expect(child.signal).toBeNull();
  expect(child.status).toBe(0);
  expect(child.stderr).toBe("");
  const result = JSON.parse(child.stdout.trim()) as {
    mode: string;
    events: string[];
    workComplete: boolean;
    resourcesComplete: boolean;
    workErrorPreserved: boolean;
    closeErrorPreserved: boolean;
    repeatedCloseSame: boolean;
    admissionRejected: boolean;
    remainingTimeouts: number;
    sourceSha256: string;
  };
  console.info(
    "R43_NATIVE_RECEIPT",
    JSON.stringify({ exit: child.status, signal: child.signal, ...result }),
  );
  expect(result.sourceSha256).toBe(module.sourceSha256);
  expect(result.repeatedCloseSame).toBe(true);
  expect(result.admissionRejected).toBe(true);
  return result;
}

describe("worker native process completion ownership", () => {
  it("owns process liveness until admitted unreferenced work and resource close settle", () => {
    const result = runNative("work");
    expect(result.workComplete).toBe(true);
    expect(result.resourcesComplete).toBe(true);
    expect(result.events.indexOf("work-complete")).toBeLessThan(
      result.events.indexOf("resources-entered"),
    );
    expect(result.events.at(-1)).toBe("drained");
    expect(result.remainingTimeouts).toBe(0);
  });

  it("awaits unreferenced resource close even when no admitted work remains", () => {
    const result = runNative("resources");
    expect(result.resourcesComplete).toBe(true);
    expect(result.events).toEqual([
      "stop",
      "resources-entered",
      "resources-complete",
      "drained",
    ]);
    expect(result.remainingTimeouts).toBe(0);
  });

  it("preserves original work and close failures and releases the drain reference", () => {
    const result = runNative("failures");
    expect(result.workComplete).toBe(true);
    expect(result.resourcesComplete).toBe(true);
    expect(result.workErrorPreserved).toBe(true);
    expect(result.closeErrorPreserved).toBe(true);
    expect(result.events.at(-1)).toBe("close-rejected");
    expect(result.remainingTimeouts).toBe(0);
  });
});
