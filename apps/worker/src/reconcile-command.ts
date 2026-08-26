import { createWorkerRuntime } from "./main.js";
import { runReconcileCommand } from "./reconcile-command-runner.js";

const runtime = createWorkerRuntime(process.env);

try {
  const result = await runReconcileCommand(runtime);
  process.stdout.write(
    `${JSON.stringify({ service: "worker", operation: "qdrant.reconcile", ...result })}\n`,
  );
} catch {
  process.stderr.write("qdrant reconciliation failed\n");
  process.exitCode = 1;
} finally {
  await runtime.close();
}
