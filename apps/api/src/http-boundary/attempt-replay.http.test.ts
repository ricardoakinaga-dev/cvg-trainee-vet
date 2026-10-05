import { afterEach, expect, it, vi } from "vitest";
import type { AnswerState, AttemptState } from "@cvg/domain";
import {
  saveAnswer,
  submitAttempt,
  type AnswerIdempotencyRecord,
  type AnswerUseCaseDependencies,
  type AttemptUseCaseDependencies,
  type IdempotencyRecord,
} from "@cvg/application";

import { handleApiRequest } from "../http.js";
import { answer, attempt, dependencies } from "./fixtures.js";

afterEach(() => vi.useRealTimers());

it("replays authorized HTTP save/submit after commit despite a new server clock", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-03T12:00:00.000Z"));
  let state: AttemptState = attempt;
  let sequence = 0;
  const answers = new Map<string, AnswerState>();
  const answerRecords = new Map<string, AnswerIdempotencyRecord>();
  const attemptRecords = new Map<string, IdempotencyRecord>();
  const events: unknown[] = [];
  const audits: unknown[] = [];
  const attemptsPort = {
    findById: async (id: string) => (id === state.attemptId ? state : null),
    findOpenByParticipantAndActivity: async () => state,
    insert: async (next: AttemptState) => {
      state = next;
    },
    update: async (next: AttemptState) => {
      state = next;
    },
  };
  const idFactory = () => `synthetic-replay-${++sequence}`;
  const eventPublisher = {
    publish: async (event: unknown) => {
      events.push(event);
    },
  };
  const audit = {
    append: async (entry: unknown) => {
      audits.push(entry);
    },
  };
  const answerOperations = {
    attemptsPort,
    hasActivityItem: async () => true,
    answersPort: {
      findByAttemptAndItem: async (_attemptId: string, itemId: string) =>
        answers.get(itemId) ?? null,
      save: async (value: AnswerState) => {
        answers.set(value.itemId, value);
      },
    },
    idempotency: {
      find: async (key: string) => answerRecords.get(key) ?? null,
      store: async (key: string, value: AnswerIdempotencyRecord) => {
        answerRecords.set(key, value);
      },
    },
    eventPublisher,
    audit,
  };
  const answerDependencies: AnswerUseCaseDependencies = {
    ...answerOperations,
    idFactory,
    transaction: { run: async (work) => work(answerOperations) },
  };
  const attemptOperations = {
    attemptsPort,
    activity: { isAvailable: async () => true },
    idempotency: {
      find: async (key: string) => attemptRecords.get(key) ?? null,
      store: async (key: string, value: IdempotencyRecord) => {
        attemptRecords.set(key, value);
      },
    },
    eventPublisher,
    audit,
  };
  const attemptDependencies: AttemptUseCaseDependencies = {
    ...attemptOperations,
    idFactory,
    transaction: { run: async (work) => work(attemptOperations) },
  };
  const api = dependencies({
    resolveAttempt: async () => state,
    hasParticipantActivityItem: async () => true,
    saveAnswer: (command) => saveAnswer(command, answerDependencies),
    submitAttempt: (command) => submitAttempt(command, attemptDependencies),
  });
  const saveRequest = {
    method: "POST" as const,
    path: `/api/v1/attempts/${attempt.attemptId}/answers`,
    body: {
      attemptId: attempt.attemptId,
      activityId: attempt.activityId,
      itemId: answer.itemId,
      response: "synthetic own response",
      idempotencyKey: "http-replay-save",
    },
  };
  const firstSave = await handleApiRequest(saveRequest, api);
  expect(firstSave.status).toBe(200);
  vi.setSystemTime(new Date("2026-10-03T12:05:00.000Z"));
  const replaySave = await handleApiRequest(saveRequest, api);
  expect(replaySave.status).toBe(200);
  expect(replaySave.body).toEqual(firstSave.body);
  expect(answers.size).toBe(1);
  expect(events).toHaveLength(1);
  expect(audits).toHaveLength(1);
  const changedSave = await handleApiRequest(
    { ...saveRequest, body: { ...saveRequest.body, response: "changed" } },
    api,
  );
  expect(changedSave.status).toBe(409);

  const submitRequest = {
    method: "POST" as const,
    path: `/api/v1/attempts/${attempt.attemptId}/submit`,
    body: { idempotencyKey: "http-replay-submit" },
  };
  const firstSubmit = await handleApiRequest(submitRequest, api);
  expect(firstSubmit.status).toBe(200);
  const submittedAt = state.submittedAt;
  vi.setSystemTime(new Date("2026-10-03T12:10:00.000Z"));
  const replaySubmit = await handleApiRequest(submitRequest, api);
  expect(replaySubmit.status).toBe(200);
  expect(replaySubmit.body).toEqual(firstSubmit.body);
  expect(state.submittedAt).toBe(submittedAt);
  expect(events).toHaveLength(2);
  expect(audits).toHaveLength(2);
  expect(JSON.stringify(replaySubmit.body)).not.toContain("participantId");
});
