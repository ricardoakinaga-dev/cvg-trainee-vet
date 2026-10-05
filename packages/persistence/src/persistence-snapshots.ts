export type PersistedAttemptSnapshot = Readonly<{
  attemptId: string;
  participantId: string;
  activityId: string;
  status: string;
  version: number;
  submittedAt?: string;
}>;

export type PersistedAnswerSnapshot = Readonly<{
  readonly attempt: PersistedAttemptSnapshot;
  readonly answer: Readonly<{
    readonly answerId: string;
    readonly attemptId: string;
    readonly itemId: string;
    readonly response: string;
    readonly savedAt: string;
  }>;
}>;

export type PersistedCorrectionSnapshot = Readonly<{
  readonly attempt: PersistedAttemptSnapshot;
  readonly result: Readonly<{
    readonly resultId: string;
    readonly attemptId: string;
    readonly version: number;
    readonly kind: string;
    readonly score: number;
    readonly outcome: string;
    readonly feedback: string;
    readonly ruleVersion: string;
    readonly correctedBy: string;
    readonly correctedAt: string;
  }>;
}>;
