import { createWorkerRuntime } from "./main.js";

const runtime = createWorkerRuntime(process.env);

try {
  await runtime.initialize({ waitForOptionalDependencies: true });
  const result = await runtime.reconcile();
  process.stdout.write(
    `${JSON.stringify({ service: "worker", operation: "qdrant.reconcile", ...result })}\n`,
  );
} catch {
  process.stderr.write("qdrant reconciliation failed\n");
  process.exitCode = 1;
} finally {
  await runtime.close();
}
