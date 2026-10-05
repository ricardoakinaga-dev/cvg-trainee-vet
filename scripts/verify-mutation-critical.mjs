import {
  runBoundedClosure,
  verifyHistoricalClosure as verifyAuthorizationHistory,
} from "./verify-mutation-closure.mjs";
import { runMutationClosureCli } from "./mutation-closure-cli.mjs";

export function verifyHistoricalClosure() {
  const result = verifyAuthorizationHistory();
  return {
    ...result,
    missing_proof: [
      ...result.missing_proof,
      "Critical and worker history reconciled one-to-one; nearby lines, fixed authorization credits and numerator clamps are not evidence",
      "Complete frozen scope including survivors, no-coverage and unresolved harness errors",
    ],
  };
}

export { runBoundedClosure };

await runMutationClosureCli({
  scriptName: "verify-mutation-critical.mjs",
  runBoundedClosure,
  verifyHistoricalClosure,
});
