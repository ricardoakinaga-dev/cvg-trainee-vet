import {
  clinicalReviewQueuePageSchema,
  internalAuthoringRecordProjectionSchema,
} from "@cvg/contracts";
import type {
  ClinicalReviewQueuePage as ContractClinicalReviewQueuePage,
  InternalAuthoringRecordProjection as ContractInternalAuthoringRecord,
} from "@cvg/contracts";

export type ApiRecord = Readonly<Record<string, unknown>>;
export type InternalAuthoringRecord = ContractInternalAuthoringRecord;
export type ClinicalReviewQueuePage = ContractClinicalReviewQueuePage;
export type ClinicalReviewQueueItem =
  ContractClinicalReviewQueuePage["items"][number];

export function isRecord(value: unknown): value is ApiRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isInternalAuthoringRecord(
  value: unknown,
): value is InternalAuthoringRecord {
  return internalAuthoringRecordProjectionSchema.safeParse(value).success;
}

export function isClinicalReviewQueuePage(
  value: unknown,
): value is ClinicalReviewQueuePage {
  return clinicalReviewQueuePageSchema.safeParse(value).success;
}
