import {
  createProductionSummativeApproval,
  type CorrectionCompletionOptions,
} from "@cvg/persistence";

/**
 * P2 production wiring: correction completion receives the fail-closed
 * summative approval source. No completion receipt is approved until natively
 * authenticated critical grade evidence exists in the contract.
 */
export function createApiCorrectionCompletionOptions(): CorrectionCompletionOptions {
  return Object.freeze({
    summativeApproval: createProductionSummativeApproval(),
  });
}
