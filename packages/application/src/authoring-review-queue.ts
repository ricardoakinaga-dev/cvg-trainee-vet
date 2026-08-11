import type { ContentStatus } from "@cvg/domain";

import type { ClinicalReviewDecision } from "./authoring-use-cases.js";

export type ClinicalReviewQueueFilter = "PENDING" | "ALL";

export type ClinicalReviewQueueQuery = Readonly<{
  readonly page: number;
  readonly perPage: number;
  readonly status: ClinicalReviewQueueFilter;
}>;

export type ClinicalReviewQueueItem = Readonly<{
  readonly contentId: string;
  readonly version: number;
  readonly scopeId: string;
  readonly moduleId: string;
  readonly sessionId: string;
  readonly objectiveId: string;
  readonly authorId: string;
  readonly contentStatus: ContentStatus;
  readonly reviewStatus: "PENDING" | "APPROVED" | "ADJUSTMENTS_REQUESTED";
  readonly technicalChecksPassed: boolean;
  readonly latestReview: Readonly<{
    readonly decision: ClinicalReviewDecision;
    readonly reviewedAt: string;
  }> | null;
}>;

export type ClinicalReviewQueuePage = Readonly<{
  readonly items: readonly ClinicalReviewQueueItem[];
  readonly page: number;
  readonly perPage: number;
  readonly total: number;
}>;

export interface ClinicalReviewQueuePort {
  readonly listClinicalReviewQueue: (
    scopeId: string,
    query: ClinicalReviewQueueQuery,
  ) => Promise<ClinicalReviewQueuePage>;
}
