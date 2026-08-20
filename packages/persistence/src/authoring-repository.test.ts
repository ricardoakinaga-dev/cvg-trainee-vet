import { describe, expect, it, vi } from "vitest";

import type {
  AuthoringIdempotencyRecord,
  ClinicalReviewRecord,
} from "@cvg/application";

import {
  authoringRowToRecord,
  createClinicalApproverPort,
  createAuthoringRepository,
  createAuthoringTransactionPort,
} from "./authoring-repository.js";

const row = {
  editorialRecordId: "11111111-1111-4111-8111-111111111111",
  contentVersionId: "22222222-2222-4222-8222-222222222222",
  contentId: "33333333-3333-4333-8333-333333333333",
  scopeId: "44444444-4444-4444-8444-444444444444",
  version: 1,
  moduleId: "M02",
  sessionId: "M02-S1",
  objectiveId: "M02-OBJ-01",
  authorId: "55555555-5555-4555-8555-555555555555",
  contentStatus: "AUTOVERIFICADO",
  item: {
    title: "Item sintético",
    prompt: "Escolha a prioridade segura.",
    responseMode: "CHOICE",
    choices: [
      { id: "a", label: "A", text: "Priorizar." },
      { id: "b", label: "B", text: "Aguardar." },
    ],
    correctChoiceIds: ["a"],
    feedback: "Reavalie.",
    critical: true,
    remediationTargetObjectiveId: "M02-OBJ-01",
    sourceRefs: [
      {
        code: "BOOK_ETTINGER_9E",
        locator: "capítulo 123, seção de ressuscitação",
        updateRequired: false,
      },
    ],
    participant: {
      id: "33333333-3333-4333-8333-333333333333",
      ordinal: 1,
      kind: "QUESTAO",
      title: "Item sintético",
      prompt: "Escolha a prioridade segura.",
      responseMode: "CHOICE",
      choices: [
        { id: "a", label: "A", text: "Priorizar." },
        { id: "b", label: "B", text: "Aguardar." },
      ],
      selectionMode: "SINGLE",
    },
  },
  preflight: {
    ruleVersion: "authoring-preflight-v1",
    technicalChecksPassed: true,
    readyForPublication: true,
    checks: {
      requiredFields: true,
      correctionMetadata: true,
      publicBoundary: true,
      sourceTraceability: true,
      publicationBlocked: true,
    },
    checkedAt: "2026-08-10T05:00:00.000Z",
  },
} as const;

function fakeDatabase(input?: {
  readonly selectResults?: readonly unknown[][];
}) {
  const selectResults = [...(input?.selectResults ?? [])];
  const inserted: unknown[] = [];
  const deleted: unknown[] = [];
  const createQuery = (result: readonly unknown[]) => {
    const query = {
      from: vi.fn(),
      innerJoin: vi.fn(),
      where: vi.fn(),
      orderBy: vi.fn(),
      limit: vi.fn(),
      for: vi.fn(),
      then: (
        resolve: (value: readonly unknown[]) => unknown,
        reject: (reason: unknown) => unknown,
      ) => Promise.resolve(result).then(resolve, reject),
    };
    query.from.mockReturnValue(query);
    query.innerJoin.mockReturnValue(query);
    query.where.mockReturnValue(query);
    query.orderBy.mockReturnValue(query);
    query.for.mockReturnValue(query);
    query.limit.mockReturnValue(query);
    return query;
  };
  const tx = {
    select: vi.fn(() => createQuery(selectResults.shift() ?? [])),
    update: vi.fn(() => ({
      set: vi.fn(() => ({ where: vi.fn(async () => undefined) })),
    })),
    insert: vi.fn(() => {
      const insertQuery = {
        values: vi.fn((value: unknown) => {
          inserted.push(value);
          return insertQuery;
        }),
        onConflictDoUpdate: vi.fn(),
        onConflictDoNothing: vi.fn(() => insertQuery),
      };
      insertQuery.onConflictDoUpdate.mockReturnValue(insertQuery);
      return insertQuery;
    }),
    delete: vi.fn(() => ({
      where: vi.fn(async (condition: unknown) => {
        deleted.push(condition);
      }),
    })),
    execute: vi.fn(async () => []),
  };
  const db = {
    ...tx,
    transaction: vi.fn(async (work: (executor: typeof tx) => unknown) =>
      work(tx),
    ),
  };
  return { db, tx, inserted, deleted };
}

function replayRow(
  response: unknown,
  operation: "clinical_review" | "publication" = "publication",
  overrides: Readonly<Record<string, unknown>> = {},
) {
  return {
    operation,
    fingerprint: `sha256:${"a".repeat(64)}`,
    contentId: row.contentId,
    version: row.version,
    response,
    responseHash: null,
    expiresAt: new Date(Date.now() + 60_000),
    ...overrides,
  };
}

async function expectReplayFailure(
  response: unknown,
  message: string,
  operation: "clinical_review" | "publication" = "publication",
  overrides: Readonly<Record<string, unknown>> = {},
  repositoryRows: readonly unknown[][] = [],
): Promise<void> {
  const database = fakeDatabase({
    selectResults: [
      [replayRow(response, operation, overrides)],
      ...repositoryRows,
    ],
  });
  const transaction = createAuthoringTransactionPort(
    database.db as never,
    () => "generated-id",
  );
  await expect(
    transaction.run((operations) =>
      operations.idempotency.find("malformed-replay-key"),
    ),
  ).rejects.toThrow(message);
}

describe("authoring persistence mapping", () => {
  it("maps internal correction metadata and keeps it separate from participant fields", () => {
    const record = authoringRowToRecord(row);

    expect(record).toMatchObject({
      contentId: row.contentId,
      contentStatus: "AUTOVERIFICADO",
      correctChoiceIds: ["a"],
      preflight: { technicalChecksPassed: true },
    });
    expect(record.participant).not.toHaveProperty("correctChoiceIds");
    expect(record.participant).not.toHaveProperty("sourceRefs");
  });

  it("rejects malformed internal source and preflight data", () => {
    expect(() =>
      authoringRowToRecord({
        ...row,
        item: {
          ...row.item,
          sourceRefs: [],
        },
      }),
    ).toThrow();
    expect(() =>
      authoringRowToRecord({
        ...row,
        preflight: { ...row.preflight, ruleVersion: "unknown" },
      }),
    ).toThrow();
  });

  it("rejects malformed identity fields and nested source metadata", () => {
    const identityFields = [
      "editorialRecordId",
      "contentVersionId",
      "contentId",
      "scopeId",
      "moduleId",
      "sessionId",
      "objectiveId",
      "authorId",
    ] as const;

    for (const field of identityFields) {
      expect(
        () => authoringRowToRecord({ ...row, [field]: " " }),
        field,
      ).toThrow();
    }

    const malformedSources = [
      [null],
      [{ ...row.item.sourceRefs[0], locator: " " }],
      [{ ...row.item.sourceRefs[0], updateRequired: "no" }],
    ] as const;
    for (const sourceRefs of malformedSources) {
      expect(() =>
        authoringRowToRecord({
          ...row,
          item: { ...row.item, sourceRefs },
        } as never),
      ).toThrow();
    }
  });

  it("rejects malformed bounded authoring fields", () => {
    const invalidCases: readonly [string, unknown][] = [
      ["item object", { ...row, item: null }],
      [
        "item response mode",
        { ...row, item: { ...row.item, responseMode: "UNKNOWN" } },
      ],
      ["item title", { ...row, item: { ...row.item, title: " " } }],
      ["item prompt", { ...row, item: { ...row.item, prompt: " " } }],
      [
        "item choices",
        {
          ...row,
          item: { ...row.item, correctChoiceIds: [] },
        },
      ],
      ["item feedback", { ...row, item: { ...row.item, feedback: " " } }],
      ["item critical", { ...row, item: { ...row.item, critical: "yes" } }],
      [
        "item remediation",
        {
          ...row,
          item: { ...row.item, remediationTargetObjectiveId: " " },
        },
      ],
      [
        "source reference",
        {
          ...row,
          item: {
            ...row.item,
            sourceRefs: [{ ...row.item.sourceRefs[0], code: " " }],
          },
        },
      ],
      [
        "participant object",
        { ...row, item: { ...row.item, participant: null } },
      ],
      [
        "participant ordinal",
        {
          ...row,
          item: {
            ...row.item,
            participant: { ...row.item.participant, ordinal: 0 },
          },
        },
      ],
      [
        "participant kind",
        {
          ...row,
          item: {
            ...row.item,
            participant: { ...row.item.participant, kind: "UNKNOWN" },
          },
        },
      ],
      [
        "participant response mode",
        {
          ...row,
          item: {
            ...row.item,
            participant: { ...row.item.participant, responseMode: "NONE" },
          },
        },
      ],
      [
        "participant selection mode",
        {
          ...row,
          item: {
            ...row.item,
            participant: {
              ...row.item.participant,
              selectionMode: "UNKNOWN",
            },
          },
        },
      ],
      ["preflight object", { ...row, preflight: null }],
      [
        "preflight checks",
        { ...row, preflight: { ...row.preflight, checks: null } },
      ],
      ["content version", { ...row, version: 0 }],
      ["content status", { ...row, contentStatus: "UNKNOWN" }],
    ];

    for (const [label, invalidRow] of invalidCases) {
      expect(() => authoringRowToRecord(invalidRow as never), label).toThrow();
    }
  });

  it("maps optional structured authoring metadata and participant variants", () => {
    const mapped = authoringRowToRecord({
      ...row,
      item: {
        ...row.item,
        responseMode: "STRUCTURED_FIELDS",
        rubric: { dimensions: [], passScore: 0 },
        interaction: {
          kind: "STRUCTURED_FIELDS",
          evaluationMode: "AUTOMATIC",
          fields: [],
        },
        humanCorrectionOwner: "RICARDO",
        digitalCaseStage: {
          caseId: "case-1",
          stage: 1,
          examSeries: [],
        },
        participant: {
          ...row.item.participant,
          kind: "CASO",
          responseMode: "TEXT",
          selectionMode: "MULTIPLE",
          interaction: {
            kind: "STRUCTURED_FIELDS",
            evaluationMode: "AUTOMATIC",
            fields: [],
          },
          digitalCaseStage: {
            caseId: "case-1",
            stage: 1,
            examSeries: [],
          },
        },
        sourceRefs: [{ ...row.item.sourceRefs[0], updateRequired: true }],
      },
      preflight: {
        ...row.preflight,
        readyForPublication: undefined,
      },
    });

    expect(mapped).toMatchObject({
      responseMode: "STRUCTURED_FIELDS",
      humanCorrectionOwner: "RICARDO",
      digitalCaseStage: { caseId: "case-1" },
      participant: { kind: "CASO", selectionMode: "MULTIPLE" },
    });
  });

  it("reads, updates and saves authoring records and clinical reviews", async () => {
    const record = authoringRowToRecord(row);
    const review: ClinicalReviewRecord = {
      reviewId: "66666666-6666-4666-8666-666666666666",
      contentId: row.contentId,
      version: row.version,
      contentEditorialRecordId: row.editorialRecordId,
      contentVersionId: row.contentVersionId,
      scopeId: row.scopeId,
      reviewerId: "77777777-7777-4777-8777-777777777777",
      decision: "APROVAR_CLINICAMENTE",
      rationale: "Revisão sintética aprovada.",
      correlationId: "88888888-8888-4888-8888-888888888888",
      reviewedAt: "2026-08-14T12:00:00.000Z",
    };
    const database = fakeDatabase({
      selectResults: [
        [row],
        [],
        [
          {
            reviewId: review.reviewId,
            contentId: review.contentId,
            version: review.version,
            contentEditorialRecordId: review.contentEditorialRecordId,
            contentVersionId: review.contentVersionId,
            scopeId: review.scopeId,
            reviewerId: review.reviewerId,
            decision: review.decision,
            rationale: review.rationale,
            correlationId: review.correlationId,
            reviewedAt: new Date(review.reviewedAt),
          },
        ],
        [],
        [{ ...review, decision: "UNKNOWN" }],
      ],
    });
    const repository = createAuthoringRepository(database.db as never);

    await expect(repository.find(row.contentId, row.version)).resolves.toEqual(
      record,
    );
    await expect(repository.find("missing", row.version)).resolves.toBeNull();
    await expect(
      repository.savePreflight(record, record.preflight),
    ).resolves.toMatchObject({
      contentId: record.contentId,
      preflight: record.preflight,
    });
    await expect(
      repository.findLatestClinicalReview(row.contentId, row.version),
    ).resolves.toEqual(review);
    await expect(
      repository.findLatestClinicalReview("missing", row.version),
    ).resolves.toBeNull();
    await expect(
      repository.findLatestClinicalReview(row.contentId, row.version),
    ).rejects.toThrow("clinical review decision");
    await repository.saveClinicalReview(review);

    expect(database.inserted).toHaveLength(1);
    expect(database.inserted[0]).toMatchObject({
      id: review.reviewId,
      decision: review.decision,
    });
  });

  it("maps and rejects clinical approver access data at the persistence boundary", async () => {
    const database = fakeDatabase({
      selectResults: [
        [],
        [
          {
            accountId: row.authorId,
            accountStatus: "ACTIVE",
            roles: ["CLINICAL_REVIEWER"],
            scopes: [row.scopeId],
          },
        ],
        [
          {
            accountId: row.authorId,
            accountStatus: "UNKNOWN",
            roles: ["CLINICAL_REVIEWER"],
            scopes: [row.scopeId],
          },
        ],
        [
          {
            accountId: row.authorId,
            accountStatus: "SUSPENDED",
            roles: [42],
            scopes: [row.scopeId],
          },
        ],
        [
          {
            accountId: row.authorId,
            accountStatus: "SUSPENDED",
            roles: ["CLINICAL_REVIEWER"],
            scopes: [42],
          },
        ],
      ],
    });
    const approver = createClinicalApproverPort(database.db as never);

    await expect(approver.findById("missing")).resolves.toBeNull();
    await expect(approver.findById(row.authorId)).resolves.toEqual({
      accountId: row.authorId,
      accountStatus: "ACTIVE",
      roles: ["CLINICAL_REVIEWER"],
      scopes: [row.scopeId],
    });
    await expect(approver.findById(row.authorId)).rejects.toThrow(
      "clinical approver status",
    );
    await expect(approver.findById(row.authorId)).rejects.toThrow(
      "clinical approver access data",
    );
    await expect(approver.findById(row.authorId)).rejects.toThrow(
      "clinical approver access data",
    );
  });

  it("executes idempotent authoring workflow storage inside a transaction", async () => {
    const record = authoringRowToRecord(row);
    const publication: AuthoringIdempotencyRecord = {
      operation: "publication",
      fingerprint: `sha256:${"a".repeat(64)}`,
      result: { record },
    };
    const stored = fakeDatabase({
      selectResults: [
        [
          {
            operation: publication.operation,
            fingerprint: publication.fingerprint,
            contentId: row.contentId,
            version: row.version,
            response: {
              schemaVersion: 1,
              contentId: row.contentId,
              version: row.version,
              contentStatus: record.contentStatus,
              preflight: record.preflight,
              recordHash: `legacy:${"c".repeat(32)}`,
            },
            responseHash: null,
            expiresAt: new Date(Date.now() + 60_000),
          },
        ],
        [row],
      ],
    });
    const transaction = createAuthoringTransactionPort(
      stored.db as never,
      () => "generated-id",
    );

    await expect(
      transaction.run(async (operations) => {
        expect(Object.isFrozen(operations)).toBe(true);
        await expect(
          operations.idempotency.find("publication-key"),
        ).resolves.toEqual(publication);
        await operations.idempotency.store("publication-key", publication);
        return Object.keys(operations).sort();
      }),
    ).resolves.toEqual([
      "approver",
      "idFactory",
      "idempotency",
      "repository",
      "transition",
    ]);
    expect(stored.inserted).toHaveLength(1);
    expect(stored.inserted[0]).toMatchObject({
      fingerprint: expect.stringMatching(/^sha256:[0-9a-f]{64}$/u),
      response: {
        schemaVersion: 1,
        contentId: row.contentId,
        version: row.version,
      },
    });
    expect(stored.inserted[0]).not.toHaveProperty("response.record");
    expect(stored.tx.execute).toHaveBeenCalled();

    const invalid = fakeDatabase({
      selectResults: [
        [{ operation: "unknown", fingerprint: "fp", response: {} }],
      ],
    });
    const invalidTransaction = createAuthoringTransactionPort(
      invalid.db as never,
      () => "generated-id",
    );
    await expect(
      invalidTransaction.run((operations) =>
        operations.idempotency.find("invalid-key"),
      ),
    ).rejects.toThrow("idempotency operation");
  });

  it("rehydrates clinical-review replays and rejects changed or expired state", async () => {
    const review: ClinicalReviewRecord = {
      reviewId: "66666666-6666-4666-8666-666666666666",
      contentId: row.contentId,
      version: row.version,
      contentEditorialRecordId: row.editorialRecordId,
      contentVersionId: row.contentVersionId,
      scopeId: row.scopeId,
      reviewerId: "77777777-7777-4777-8777-777777777777",
      decision: "SOLICITAR_AJUSTES",
      rationale: "Revisão sintética requer ajuste.",
      correlationId: "88888888-8888-4888-8888-888888888888",
      reviewedAt: "2026-08-14T12:00:00.000Z",
    };
    const database = fakeDatabase({
      selectResults: [
        [
          {
            operation: "clinical_review",
            fingerprint: `sha256:${"b".repeat(64)}`,
            contentId: row.contentId,
            version: row.version,
            response: {
              schemaVersion: 1,
              contentId: row.contentId,
              version: row.version,
              contentStatus: row.contentStatus,
              preflight: row.preflight,
              recordHash: `legacy:${"c".repeat(32)}`,
              review,
            },
            responseHash: null,
            expiresAt: new Date(Date.now() + 60_000),
          },
        ],
        [row],
      ],
    });
    const transaction = createAuthoringTransactionPort(
      database.db as never,
      () => "generated-id",
    );

    await expect(
      transaction.run((operations) =>
        operations.idempotency.find("clinical-review-key"),
      ),
    ).resolves.toEqual({
      operation: "clinical_review",
      fingerprint: `sha256:${"b".repeat(64)}`,
      result: { record: authoringRowToRecord(row), review },
    });

    const changed = fakeDatabase({
      selectResults: [
        [
          {
            operation: "publication",
            fingerprint: `sha256:${"a".repeat(64)}`,
            contentId: row.contentId,
            version: row.version,
            response: {
              schemaVersion: 1,
              contentId: row.contentId,
              version: row.version,
              contentStatus: "PUBLICADO",
              preflight: row.preflight,
              recordHash: `legacy:${"c".repeat(32)}`,
            },
            responseHash: null,
            expiresAt: new Date(Date.now() + 60_000),
          },
        ],
        [row],
      ],
    });
    const changedTransaction = createAuthoringTransactionPort(
      changed.db as never,
      () => "generated-id",
    );
    await expect(
      changedTransaction.run((operations) =>
        operations.idempotency.find("changed-key"),
      ),
    ).rejects.toThrow("content state has changed");

    const expired = fakeDatabase({
      selectResults: [
        [
          {
            operation: "publication",
            fingerprint: `sha256:${"a".repeat(64)}`,
            contentId: row.contentId,
            version: row.version,
            response: {
              schemaVersion: 1,
              contentId: row.contentId,
              version: row.version,
              contentStatus: row.contentStatus,
              preflight: row.preflight,
              recordHash: `legacy:${"c".repeat(32)}`,
            },
            responseHash: null,
            expiresAt: new Date(0),
          },
        ],
      ],
    });
    const expiredTransaction = createAuthoringTransactionPort(
      expired.db as never,
      () => "generated-id",
    );
    await expect(
      expiredTransaction.run((operations) =>
        operations.idempotency.find("expired-key"),
      ),
    ).resolves.toBeNull();
  });

  it("validates response hashes, keys and fingerprints on the idempotency boundary", async () => {
    const record = authoringRowToRecord(row);
    const publication: AuthoringIdempotencyRecord = {
      operation: "publication",
      fingerprint: `sha256:${"d".repeat(64)}`,
      result: { record },
    };
    const stored = fakeDatabase();
    const storingTransaction = createAuthoringTransactionPort(
      stored.db as never,
      () => "generated-id",
    );
    await storingTransaction.run((operations) =>
      operations.idempotency.store("round-trip-key", publication),
    );
    const storedRow = stored.inserted[0];
    expect(storedRow).toMatchObject({
      responseHash: expect.stringMatching(/^sha256:[0-9a-f]{64}$/u),
    });
    const clinical: AuthoringIdempotencyRecord = {
      operation: "clinical_review",
      fingerprint: `sha256:${"e".repeat(64)}`,
      result: {
        record: {
          ...record,
          choices: [undefined] as unknown as NonNullable<typeof record.choices>,
        },
        review: {
          reviewId: "66666666-6666-4666-8666-666666666666",
          contentId: row.contentId,
          version: row.version,
          contentEditorialRecordId: row.editorialRecordId,
          contentVersionId: row.contentVersionId,
          scopeId: row.scopeId,
          reviewerId: "77777777-7777-4777-8777-777777777777",
          decision: "APROVAR_CLINICAMENTE",
          rationale: "Revisão sintética aprovada.",
          correlationId: "88888888-8888-4888-8888-888888888888",
          reviewedAt: "2026-08-14T12:00:00.000Z",
        },
      },
    };
    await storingTransaction.run((operations) =>
      operations.idempotency.store("clinical-round-trip-key", clinical),
    );

    const replay = fakeDatabase({
      selectResults: [[storedRow], [row]],
    });
    const replayTransaction = createAuthoringTransactionPort(
      replay.db as never,
      () => "generated-id",
    );
    await expect(
      replayTransaction.run((operations) =>
        operations.idempotency.find("round-trip-key"),
      ),
    ).resolves.toEqual(publication);

    const tampered = fakeDatabase({
      selectResults: [
        [
          {
            ...(storedRow as Record<string, unknown>),
            responseHash: `sha256:${"e".repeat(64)}`,
          },
        ],
      ],
    });
    const tamperedTransaction = createAuthoringTransactionPort(
      tampered.db as never,
      () => "generated-id",
    );
    await expect(
      tamperedTransaction.run((operations) =>
        operations.idempotency.find("tampered-key"),
      ),
    ).rejects.toThrow("response hash is invalid");

    await expect(
      storingTransaction.run((operations) =>
        operations.idempotency.find("invalid key"),
      ),
    ).rejects.toThrow("idempotency key is invalid");
    await expect(
      storingTransaction.run((operations) =>
        operations.idempotency.store("invalid-fingerprint", {
          ...publication,
          fingerprint: "not-a-digest",
        }),
      ),
    ).rejects.toThrow("fingerprint must be a sha256 digest");
  });

  it("rejects malformed persisted replay payloads before rehydration", async () => {
    const base = {
      schemaVersion: 1,
      contentId: row.contentId,
      version: row.version,
      contentStatus: row.contentStatus,
      preflight: row.preflight,
      recordHash: `legacy:${"c".repeat(32)}`,
    };
    const invalidPayloads: readonly [unknown, string][] = [
      [undefined, "replay payload is invalid"],
      [{ ...base, schemaVersion: 2 }, "replay payload is invalid"],
      [{ ...base, version: "1" }, "replay version is invalid"],
      [{ ...base, contentStatus: 42 }, "replay status is invalid"],
      [{ ...base, recordHash: "invalid" }, "replay recordHash is invalid"],
      [{ ...base, contentStatus: "UNKNOWN" }, "content status is invalid"],
      [{ ...base, version: 0 }, "replay version must be a positive integer"],
      [{ ...base, preflight: null }, "preflight is invalid"],
      [
        { ...base, preflight: { ...row.preflight, checks: null } },
        "preflight checks are invalid",
      ],
      [
        {
          ...base,
          preflight: { ...row.preflight, technicalChecksPassed: "yes" },
        },
        "preflight.technicalChecksPassed must be boolean",
      ],
      [
        { ...base, recordHash: "" },
        "replay recordHash must be a non-empty string",
      ],
    ];
    for (const [response, message] of invalidPayloads) {
      await expectReplayFailure(response, message);
    }
  });

  it("rejects malformed clinical snapshots and replay identity mismatches", async () => {
    const review = {
      reviewId: "66666666-6666-4666-8666-666666666666",
      contentId: row.contentId,
      version: row.version,
      contentEditorialRecordId: row.editorialRecordId,
      contentVersionId: row.contentVersionId,
      scopeId: row.scopeId,
      reviewerId: "77777777-7777-4777-8777-777777777777",
      decision: "APROVAR_CLINICAMENTE",
      rationale: "Revisão sintética aprovada.",
      correlationId: "88888888-8888-4888-8888-888888888888",
      reviewedAt: "2026-08-14T12:00:00.000Z",
    } as const;
    const base = {
      schemaVersion: 1,
      contentId: row.contentId,
      version: row.version,
      contentStatus: row.contentStatus,
      preflight: row.preflight,
      recordHash: `legacy:${"c".repeat(32)}`,
      review,
    };
    const publicationBase = {
      schemaVersion: 1,
      contentId: row.contentId,
      version: row.version,
      contentStatus: row.contentStatus,
      preflight: row.preflight,
      recordHash: `legacy:${"c".repeat(32)}`,
    };
    await expectReplayFailure(
      { ...base, review: {} },
      "clinical review idempotency decision is invalid",
      "clinical_review",
    );
    await expectReplayFailure(
      {
        ...base,
        review: {
          ...review,
          decision: "APROVAR_CLINICAMENTE",
          version: undefined,
        },
      },
      "clinical review idempotency version is invalid",
      "clinical_review",
    );
    await expectReplayFailure(
      { ...base, review: { ...review, contentId: "different-content" } },
      "snapshot does not match content",
      "clinical_review",
    );
    await expectReplayFailure(
      { ...base, review: undefined },
      "clinical review idempotency snapshot is invalid",
      "clinical_review",
    );
    await expectReplayFailure(
      base,
      "publication idempotency snapshot contains a review",
    );
    await expectReplayFailure(
      publicationBase,
      "content identity is invalid",
      "publication",
      { contentId: "different-content" },
    );
    await expectReplayFailure(
      { ...publicationBase, recordHash: `sha256:${"f".repeat(64)}` },
      "content record is missing",
      "publication",
      {},
      [[]],
    );
    await expectReplayFailure(
      { ...publicationBase, recordHash: `sha256:${"f".repeat(64)}` },
      "record hash is invalid",
      "publication",
      {},
      [[row]],
    );
  });
});
