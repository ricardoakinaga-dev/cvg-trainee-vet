import type { WorkerInitializationOptions } from "./main.js";
import type { VectorReconciliationResult } from "./reconcile.js";

export type ReconcileCommandRuntime = Readonly<{
  initialize: (options?: WorkerInitializationOptions) => Promise<void>;
  reconcile: () => Promise<VectorReconciliationResult>;
}>;

export async function runReconcileCommand(
  runtime: ReconcileCommandRuntime,
): Promise<VectorReconciliationResult> {
  await runtime.initialize({ waitForOptionalDependencies: true });
  return runtime.reconcile();
}
