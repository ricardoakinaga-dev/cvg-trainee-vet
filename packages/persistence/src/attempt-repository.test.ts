import { describe, expect, it } from "vitest";

import type { AttemptState } from "@cvg/domain";

import {
  PersistenceMappingError,
  attemptRowToState,
  attemptStateToRow,
  idempotencyRowToRecord,
  outboxEventToRow,
  validateOutboxPayload,
  type OutboxEventInput,
} from "./attempt-repository.js";
import { activityAssignments, attempts, outboxEvents } from "./schema.js";

const state: AttemptState = {
  attemptId: "11111111-1111-4111-8111-111111111111",
  participantId: "22222222-2222-4222-8222-222222222222",
  activityId: "33333333-3333-4333-8333-333333333333",
  status: "SUBMETIDA",
  version: 3,
  submittedAt: "2026-08-09T17:00:00.000Z",
};

describe("PostgreSQL attempt mapping", () => {
  it("maps a domain state to a persistence row without mutating it", () => {
    const row = attemptStateToRow(state);

    expect(row).toMatchObject({
      id: state.attemptId,
      participantId: state.participantId,
      activityId: state.activityId,
      status: state.status,
      version: state.version,
      submittedAt: new Date(state.submittedAt ?? ""),
    });
    expect(state).toEqual({
      ...state,
      submittedAt: "2026-08-09T17:00:00.000Z",
    });
  });

  it("maps nullable submission timestamps back without adding undefined fields", () => {
    const mapped = attemptRowToState({
      id: state.attemptId,
      participantId: state.participantId,
      activityId: state.activityId,
      status: "SALVA",
      version: 2,
      submittedAt: null,
    });

    expect(mapped).toEqual({
      attemptId: state.attemptId,
      participantId: state.participantId,
      activityId: state.activityId,
      status: "SALVA",
      version: 2,
    });
  });

  it("rejects invalid database state instead of inventing a domain state", () => {
    expect(() =>
      attemptRowToState({
        id: state.attemptId,
        participantId: state.participantId,
        activityId: state.activityId,
        status: "UNKNOWN",
        version: 2,
        submittedAt: null,
      }),
    ).toThrow(PersistenceMappingError);
    expect(() =>
      attemptRowToState({
        id: state.attemptId,
        participantId: state.participantId,
        activityId: state.activityId,
        status: "SALVA",
        version: -1,
        submittedAt: null,
      }),
    ).toThrow("version");
  });

  it("keeps the schema contract explicit for attempts, assignments, and outbox", () => {
    expect(attempts).toBeDefined();
    expect(activityAssignments).toBeDefined();
    expect(outboxEvents).toBeDefined();
  });
});

describe("outbox and idempotency protection", () => {
  it("creates a pending internal event with bounded payload metadata", () => {
    const input: OutboxEventInput = {
      eventId: "66666666-6666-4666-8666-666666666666",
      eventType: "attempt.submitted.v1",
      aggregateType: "attempt",
      aggregateId: state.attemptId,
      occurredAt: "2026-08-09T17:00:00.000Z",
      schemaVersion: 1,
      correlationId: "77777777-7777-4777-8777-777777777777",
      payload: { attempt_id: state.attemptId, status: "SUBMETIDA" },
    };

    expect(outboxEventToRow(input)).toMatchObject({
      id: input.eventId,
      eventType: input.eventType,
      status: "PENDING",
      attempts: 0,
    });
  });

  it("rejects raw source, image, prompt, and response content in event payloads", () => {
    [
      { source_record_id: "internal" },
      { photo: "data:image/png;base64,..." },
      { prompt: "internal prompt" },
      { response: "free text that does not belong in an event" },
    ].forEach((payload) => {
      expect(() => validateOutboxPayload(payload)).toThrow(
        PersistenceMappingError,
      );
    });
  });

  it("maps a stored idempotency snapshot back to an immutable attempt record", () => {
    const record = idempotencyRowToRecord({
      fingerprint: "fingerprint-1",
      response: state,
    });

    expect(record).toEqual({ fingerprint: "fingerprint-1", attempt: state });
  });

  it("rejects malformed idempotency snapshots", () => {
    expect(() =>
      idempotencyRowToRecord({ fingerprint: "", response: {} }),
    ).toThrow(PersistenceMappingError);
  });

  it("rejects invalid outbox metadata and oversized or deeply nested payloads", () => {
    const base: OutboxEventInput = {
      eventId: "66666666-6666-4666-8666-666666666666",
      eventType: "attempt.submitted.v1",
      aggregateType: "attempt",
      aggregateId: state.attemptId,
      occurredAt: "2026-08-09T17:00:00.000Z",
      schemaVersion: 1,
      correlationId: "77777777-7777-4777-8777-777777777777",
      payload: { attempt_id: state.attemptId },
    };

    expect(() => outboxEventToRow({ ...base, schemaVersion: 0 })).toThrow(
      "schemaVersion",
    );
    expect(() => outboxEventToRow({ ...base, occurredAt: "invalid" })).toThrow(
      "occurredAt",
    );
    expect(() => validateOutboxPayload([])).toThrow("object");
    expect(() =>
      validateOutboxPayload({ values: Array.from({ length: 101 }) }),
    ).toThrow("array");
    expect(() => validateOutboxPayload({ value: "x".repeat(64_001) })).toThrow(
      "large",
    );
    expect(() =>
      validateOutboxPayload({
        a: { b: { c: { d: { e: { f: { g: "too deep" } } } } } },
      }),
    ).toThrow("deep");
  });
});
