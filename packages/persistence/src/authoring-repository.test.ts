import { describe, expect, it } from "vitest";

import { createFakeDatabase } from "./test-support/fake-database.js";
import {
  authoringRowToRecord,
  createAuthoringRepository,
  reviewRowToState,
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
  contentStatus: "EM_REVISAO_CLINICA",
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
      { code: "F-02", locator: "localizador", updateRequired: true },
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
    readyForClinicalReview: true,
    readyForPublication: false,
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

const draftRecord = {
  ...row.item,
  editorialRecordId: row.editorialRecordId,
  contentVersionId: row.contentVersionId,
  contentId: row.contentId,
  scopeId: row.scopeId,
  version: 1,
  moduleId: row.moduleId,
  sessionId: row.sessionId,
  objectiveId: row.objectiveId,
  authorId: row.authorId,
  contentStatus: "RASCUNHO",
  preflight: row.preflight,
} as const;

const draftOptions = {
  idempotencyKey: "draft-key-0001",
  fingerprint: "fp-0001",
  audit: {
    auditId: "88888888-8888-4888-8888-888888888888",
    actorKind: "AUTHENTICATED",
    principalId: row.authorId,
    scopeId: row.scopeId,
    action: "CONTENT_DRAFT_CREATED",
    resourceType: "content_version",
    resourceId: row.contentId,
    outcome: "SUCCESS",
    requestId: "req-0001",
    correlationId: "corr-0001",
    occurredAt: "2026-08-10T05:00:00.000Z",
  },
} as const;

describe("authoring persistence mapping", () => {
  it("maps internal correction metadata and keeps it separate from participant fields", () => {
    const record = authoringRowToRecord(row);
    expect(record).toMatchObject({
      contentId: row.contentId,
      contentStatus: "EM_REVISAO_CLINICA",
      correctChoiceIds: ["a"],
      preflight: { technicalChecksPassed: true },
    });
    expect(record.participant).not.toHaveProperty("correctChoiceIds");
    expect(record.participant).not.toHaveProperty("sourceRefs");
    expect(record.latestReview).toBeUndefined();
  });

  it("maps optional rubric and preflight publication flags", () => {
    const record = authoringRowToRecord({
      ...row,
      item: {
        ...row.item,
        rubric: [{ id: "r1", label: "Rubrica", text: "Critério." }],
      },
      preflight: {
        ...row.preflight,
        readyForPublication: true,
      },
    });
    expect(record.rubric).toHaveLength(1);
    expect(record.preflight.readyForPublication).toBe(true);
  });

  it("rejects rows with empty identity fields", () => {
    for (const field of [
      "editorialRecordId",
      "contentVersionId",
      "contentId",
      "scopeId",
      "moduleId",
      "sessionId",
      "objectiveId",
      "authorId",
    ] as const) {
      expect(() =>
        authoringRowToRecord({ ...row, [field]: "   " }),
      ).toThrow();
    }
  });

  it("rejects rows with invalid versions", () => {
    expect(() => authoringRowToRecord({ ...row, version: 0 })).toThrow();
    expect(() => authoringRowToRecord({ ...row, version: 1.5 })).toThrow();
  });

  it("rejects malformed items", () => {
    expect(() =>
      authoringRowToRecord({ ...row, item: null }),
    ).toThrow();
    expect(() =>
      authoringRowToRecord({ ...row, item: [] }),
    ).toThrow();
    expect(() =>
      authoringRowToRecord({
        ...row,
        item: { ...row.item, participant: null },
      }),
    ).toThrow();
    expect(() =>
      authoringRowToRecord({
        ...row,
        item: { ...row.item, responseMode: "ESSAY" },
      }),
    ).toThrow();
    expect(() =>
      authoringRowToRecord({
        ...row,
        item: {
          ...row.item,
          participant: { ...row.item.participant, responseMode: "ESSAY" },
        },
      }),
    ).toThrow();
    expect(() =>
      authoringRowToRecord({
        ...row,
        item: { ...row.item, sourceRefs: undefined },
      }),
    ).toThrow();
    expect(() =>
      authoringRowToRecord({
        ...row,
        item: { ...row.item, sourceRefs: [] },
      }),
    ).toThrow();
    expect(() =>
      authoringRowToRecord({
        ...row,
        item: { ...row.item, sourceRefs: ["not-an-object"] },
      }),
    ).toThrow();
    expect(() =>
      authoringRowToRecord({
        ...row,
        item: {
          ...row.item,
          sourceRefs: [{ code: "", locator: "x", updateRequired: true }],
        },
      }),
    ).toThrow();
    expect(() =>
      authoringRowToRecord({
        ...row,
        item: {
          ...row.item,
          sourceRefs: [{ code: "x", locator: "", updateRequired: true }],
        },
      }),
    ).toThrow();
    expect(() =>
      authoringRowToRecord({
        ...row,
        item: {
          ...row.item,
          sourceRefs: [{ code: "x", locator: "x", updateRequired: "yes" }],
        },
      }),
    ).toThrow();
    expect(() =>
      authoringRowToRecord({
        ...row,
        item: { ...row.item, title: "" },
      }),
    ).toThrow();
    expect(() =>
      authoringRowToRecord({
        ...row,
        item: { ...row.item, prompt: "" },
      }),
    ).toThrow();
    expect(() =>
      authoringRowToRecord({
        ...row,
        item: { ...row.item, feedback: "" },
      }),
    ).toThrow();
    expect(() =>
      authoringRowToRecord({
        ...row,
        item: { ...row.item, critical: "yes" },
      }),
    ).toThrow();
    expect(() =>
      authoringRowToRecord({
        ...row,
        item: { ...row.item, remediationTargetObjectiveId: "" },
      }),
    ).toThrow();
    expect(() =>
      authoringRowToRecord({
        ...row,
        item: {
          ...row.item,
          correctChoiceIds: [],
        },
      }),
    ).toThrow();
    expect(() =>
      authoringRowToRecord({
        ...row,
        item: {
          ...row.item,
          participant: { ...row.item.participant, id: "" },
        },
      }),
    ).toThrow();
    expect(() =>
      authoringRowToRecord({
        ...row,
        item: {
          ...row.item,
          participant: { ...row.item.participant, ordinal: 0 },
        },
      }),
    ).toThrow();
    expect(() =>
      authoringRowToRecord({
        ...row,
        item: {
          ...row.item,
          participant: { ...row.item.participant, ordinal: 1.5 },
        },
      }),
    ).toThrow();
    expect(() =>
      authoringRowToRecord({
        ...row,
        item: {
          ...row.item,
          participant: { ...row.item.participant, kind: "TEXTO" },
        },
      }),
    ).toThrow();
    expect(() =>
      authoringRowToRecord({
        ...row,
        item: {
          ...row.item,
          participant: { ...row.item.participant, title: "" },
        },
      }),
    ).toThrow();
    expect(() =>
      authoringRowToRecord({
        ...row,
        item: {
          ...row.item,
          participant: { ...row.item.participant, prompt: "" },
        },
      }),
    ).toThrow();
    expect(() =>
      authoringRowToRecord({
        ...row,
        item: {
          ...row.item,
          participant: { ...row.item.participant, selectionMode: "BOTH" },
        },
      }),
    ).toThrow();
  });

  it("rejects malformed preflight data", () => {
    expect(() =>
      authoringRowToRecord({ ...row, preflight: null }),
    ).toThrow();
    expect(() =>
      authoringRowToRecord({ ...row, preflight: { ...row.preflight, ruleVersion: "unknown" } }),
    ).toThrow();
    expect(() =>
      authoringRowToRecord({ ...row, preflight: { ...row.preflight, checks: null } }),
    ).toThrow();
    expect(() =>
      authoringRowToRecord({
        ...row,
        preflight: { ...row.preflight, technicalChecksPassed: "yes" },
      }),
    ).toThrow();
    expect(() =>
      authoringRowToRecord({
        ...row,
        preflight: { ...row.preflight, readyForClinicalReview: "yes" },
      }),
    ).toThrow();
    expect(() =>
      authoringRowToRecord({
        ...row,
        preflight: { ...row.preflight, readyForPublication: "yes" },
      }),
    ).toThrow();
    expect(() =>
      authoringRowToRecord({
        ...row,
        preflight: {
          ...row.preflight,
          checks: { ...row.preflight.checks, requiredFields: "yes" },
        },
      }),
    ).toThrow();
    expect(() =>
      authoringRowToRecord({
        ...row,
        preflight: { ...row.preflight, checkedAt: "" },
      }),
    ).toThrow();
  });

  it("rejects invalid content statuses", () => {
    expect(() =>
      authoringRowToRecord({ ...row, contentStatus: "DESCONHECIDO" }),
    ).toThrow();
  });

  it("maps and validates the latest clinical review decision", () => {
    const reviewedAt = new Date("2026-08-10T05:00:00.000Z");
    const review = reviewRowToState({
      reviewerId: "66666666-6666-4666-8666-666666666666",
      decision: "APROVAR_CLINICAMENTE",
      rationale: "Revisão sintética concluída.",
      reviewedAt,
      correlationId: "77777777-7777-4777-8777-777777777777",
    });
    expect(authoringRowToRecord(row, review).latestReview).toEqual(review);
    expect(() =>
      reviewRowToState({
        reviewerId: "66666666-6666-4666-8666-666666666666",
        decision: "INVALIDO",
        rationale: "Revisão inválida.",
        reviewedAt,
        correlationId: "77777777-7777-4777-8777-777777777777",
      }),
    ).toThrow();
    expect(() =>
      reviewRowToState({
        reviewerId: "66666666-6666-4666-8666-666666666666",
        decision: "SOLICITAR_AJUSTES",
        rationale: "Data inválida.",
        reviewedAt: new Date("invalid"),
        correlationId: "77777777-7777-4777-8777-777777777777",
      }),
    ).toThrow();
    expect(() =>
      reviewRowToState({
        reviewerId: "",
        decision: "APROVAR_CLINICAMENTE",
        rationale: "x",
        reviewedAt,
        correlationId: "77777777-7777-4777-8777-777777777777",
      }),
    ).toThrow();
    expect(() =>
      reviewRowToState({
        reviewerId: "66666666-6666-4666-8666-666666666666",
        decision: "APROVAR_CLINICAMENTE",
        rationale: "",
        reviewedAt,
        correlationId: "77777777-7777-4777-8777-777777777777",
      }),
    ).toThrow();
    expect(() =>
      reviewRowToState({
        reviewerId: "66666666-6666-4666-8666-666666666666",
        decision: "APROVAR_CLINICAMENTE",
        rationale: "x",
        reviewedAt,
        correlationId: "",
      }),
    ).toThrow();
  });
});

describe("authoring repository operations", () => {
  it("persists a new draft in a transaction", async () => {
    const db = createFakeDatabase({
      rows: [[], [], []],
    });
    const repository = createAuthoringRepository(
      db as unknown as Parameters<typeof createAuthoringRepository>[0],
    );
    const created = await repository.createDraft(
      { ...draftRecord },
      { ...draftOptions },
    );
    expect(created.contentId).toBe(row.contentId);
    expect(created.contentStatus).toBe("RASCUNHO");
  });

  it("rejects drafts that are not version-one RASCUNHO records", async () => {
    const db = createFakeDatabase();
    const repository = createAuthoringRepository(
      db as unknown as Parameters<typeof createAuthoringRepository>[0],
    );
    await expect(
      repository.createDraft(
        { ...draftRecord, contentStatus: "PUBLICADO" },
        { ...draftOptions },
      ),
    ).rejects.toThrow();
    await expect(
      repository.createDraft(
        { ...draftRecord, version: 2 },
        { ...draftOptions },
      ),
    ).rejects.toThrow();
  });

  it("rejects drafts with incomplete identity", async () => {
    const db = createFakeDatabase();
    const repository = createAuthoringRepository(
      db as unknown as Parameters<typeof createAuthoringRepository>[0],
    );
    await expect(
      repository.createDraft(
        { ...draftRecord, contentId: "   " },
        { ...draftOptions },
      ),
    ).rejects.toThrow();
  });

  it("rejects drafts with an invalid idempotency key", async () => {
    const db = createFakeDatabase();
    const repository = createAuthoringRepository(
      db as unknown as Parameters<typeof createAuthoringRepository>[0],
    );
    await expect(
      repository.createDraft(
        { ...draftRecord },
        { ...draftOptions, idempotencyKey: "bad key!" },
      ),
    ).rejects.toThrow();
  });

  it("rejects drafts whose audit context does not match", async () => {
    const db = createFakeDatabase();
    const repository = createAuthoringRepository(
      db as unknown as Parameters<typeof createAuthoringRepository>[0],
    );
    await expect(
      repository.createDraft(
        { ...draftRecord },
        {
          ...draftOptions,
          audit: { ...draftOptions.audit, action: "CONTENT_DRAFT_DELETED" },
        },
      ),
    ).rejects.toThrow();
  });

  it("replays an existing idempotency record when fingerprints match", async () => {
    const idempotencyRow = {
      fingerprint: "fp-0001",
      contentEditorialRecordId: row.editorialRecordId,
      contentVersionId: row.contentVersionId,
      contentId: row.contentId,
      version: 1,
      scopeId: row.scopeId,
    };
    const db = createFakeDatabase({
      rows: [
        [],
        [],
        [idempotencyRow],
        [row],
        [],
      ],
    });
    const repository = createAuthoringRepository(
      db as unknown as Parameters<typeof createAuthoringRepository>[0],
    );
    const replayed = await repository.createDraft(
      { ...draftRecord },
      { ...draftOptions },
    );
    expect(replayed.editorialRecordId).toBe(row.editorialRecordId);
  });

  it("rejects an idempotency key replayed with a different fingerprint", async () => {
    const db = createFakeDatabase({
      rows: [[], [], [{ fingerprint: "fp-other" }]],
    });
    const repository = createAuthoringRepository(
      db as unknown as Parameters<typeof createAuthoringRepository>[0],
    );
    await expect(
      repository.createDraft(
        { ...draftRecord },
        { ...draftOptions },
      ),
    ).rejects.toThrow("fingerprint");
  });

  it("rejects an idempotency record whose content is gone", async () => {
    const idempotencyRow = {
      fingerprint: "fp-0001",
      contentEditorialRecordId: row.editorialRecordId,
      contentVersionId: row.contentVersionId,
      contentId: row.contentId,
      version: 1,
      scopeId: row.scopeId,
    };
    const db = createFakeDatabase({
      rows: [[], [], [idempotencyRow], []],
    });
    const repository = createAuthoringRepository(
      db as unknown as Parameters<typeof createAuthoringRepository>[0],
    );
    await expect(
      repository.createDraft(
        { ...draftRecord },
        { ...draftOptions },
      ),
    ).rejects.toThrow("no content");
  });

  it("rejects an idempotency record whose identity does not match", async () => {
    const idempotencyRow = {
      fingerprint: "fp-0001",
      contentEditorialRecordId: row.editorialRecordId,
      contentVersionId: row.contentVersionId,
      contentId: row.contentId,
      version: 1,
      scopeId: row.scopeId,
    };
    const db = createFakeDatabase({
      rows: [[], [], [idempotencyRow], [{ ...row, contentId: "other" }]],
    });
    const repository = createAuthoringRepository(
      db as unknown as Parameters<typeof createAuthoringRepository>[0],
    );
    await expect(
      repository.createDraft(
        { ...draftRecord },
        { ...draftOptions },
      ),
    ).rejects.toThrow("identity mismatch");
  });

  it("converts unique violations into persistence conflicts", async () => {
    const db = createFakeDatabase({
      onExecute: () => {
        throw { code: "23505" };
      },
    });
    const repository = createAuthoringRepository(
      db as unknown as Parameters<typeof createAuthoringRepository>[0],
    );
    await expect(
      repository.createDraft(
        { ...draftRecord },
        { ...draftOptions },
      ),
    ).rejects.toThrow("already in use");
  });

  it("finds a record with its latest review", async () => {
    const reviewedAt = new Date("2026-08-10T05:00:00.000Z");
    const db = createFakeDatabase({
      rows: [
        [],
        [row],
        [
          {
            reviewerId: "66666666-6666-4666-8666-666666666666",
            decision: "APROVAR_CLINICAMENTE",
            rationale: "Revisão sintética concluída.",
            reviewedAt,
            correlationId: "77777777-7777-4777-8777-777777777777",
          },
        ],
      ],
    });
    const repository = createAuthoringRepository(
      db as unknown as Parameters<typeof createAuthoringRepository>[0],
    );
    const found = await repository.find(
      row.contentId,
      row.version,
      row.scopeId,
    );
    expect(found?.latestReview?.decision).toBe("APROVAR_CLINICAMENTE");
  });

  it("finds a record without a review", async () => {
    const db = createFakeDatabase({ rows: [[], [row], []] });
    const repository = createAuthoringRepository(
      db as unknown as Parameters<typeof createAuthoringRepository>[0],
    );
    const found = await repository.find(
      row.contentId,
      row.version,
      row.scopeId,
    );
    expect(found?.latestReview).toBeUndefined();
  });

  it("returns null when no record matches", async () => {
    const db = createFakeDatabase({ rows: [[]] });
    const repository = createAuthoringRepository(
      db as unknown as Parameters<typeof createAuthoringRepository>[0],
    );
    const found = await repository.find(
      row.contentId,
      row.version,
      row.scopeId,
    );
    expect(found).toBeNull();
  });

  it("saves a preflight snapshot", async () => {
    const db = createFakeDatabase();
    const repository = createAuthoringRepository(
      db as unknown as Parameters<typeof createAuthoringRepository>[0],
    );
    const updated = await repository.savePreflight(
      { ...draftRecord },
      { ...row.preflight, readyForPublication: true },
    );
    expect(updated.preflight.readyForPublication).toBe(true);
  });

  it("saves a clinical review decision", async () => {
    const db = createFakeDatabase();
    const repository = createAuthoringRepository(
      db as unknown as Parameters<typeof createAuthoringRepository>[0],
    );
    const updated = await repository.saveReview(
      { ...draftRecord },
      {
        reviewerId: "66666666-6666-4666-8666-666666666666",
        decision: "APROVAR_CLINICAMENTE",
        rationale: "Revisão sintética concluída.",
        reviewedAt: "2026-08-10T05:00:00.000Z",
        correlationId: "77777777-7777-4777-8777-777777777777",
      },
    );
    expect(updated.latestReview?.decision).toBe("APROVAR_CLINICAMENTE");
  });

  it("rolls back a clinical review decision", async () => {
    const db = createFakeDatabase();
    const repository = createAuthoringRepository(
      db as unknown as Parameters<typeof createAuthoringRepository>[0],
    );
    await expect(
      repository.rollbackReview(
        { ...draftRecord },
        { ...row.preflight },
        {
          reviewerId: "66666666-6666-4666-8666-666666666666",
          decision: "SOLICITAR_AJUSTES",
          rationale: "Revisão sintética concluída.",
          reviewedAt: "2026-08-10T05:00:00.000Z",
          correlationId: "77777777-7777-4777-8777-777777777777",
        },
      ),
    ).resolves.toBeUndefined();
  });
});
