import { expect, it } from "vitest";
import {
  isParticipantMutationReceipt,
  ParticipantMutationReceiptAnchors,
} from "./participant-mutation-receipt";

const activityId = "11111111-1111-4111-8111-111111111111";
const attemptId = "22222222-2222-4222-8222-222222222222";
const start = { operation: "start" as const, activityId };
const submit = {
  operation: "submit" as const,
  activityId,
  attemptId,
  version: 2,
};
const receipt = {
  activityId,
  attemptId,
  status: "EM_ANDAMENTO",
  version: 1,
  answers: [],
};

const answer = {
  operation: "answer" as const,
  activityId,
  attemptId,
  version: 2,
  itemId: "33333333-3333-4333-8333-333333333333",
  response: "Original synthetic answer",
};
const savedReceipt = {
  ...receipt,
  status: "SALVA",
  version: 3,
  answers: [
    {
      itemId: answer.itemId,
      response: answer.response,
      savedAt: "2026-10-03T12:00:00.000Z",
    },
  ],
};

it("R14 accepts canonical normalized response without changing original anchor bytes", () => {
  const original = {
    ...answer,
    activityId: "11111111-1111-4111-8111-111111111111",
    attemptId: "22222222-2222-4222-8222-222222222222",
    itemId: "33333333-3333-4333-8333-333333333333",
    response: "  Canonical original answer  ",
  };
  const anchors = new ParticipantMutationReceiptAnchors();
  const captured = anchors.capture("original", "original-key", original);
  expect(
    isParticipantMutationReceipt(
      {
        activityId: original.activityId,
        attemptId: original.attemptId,
        status: "SALVA",
        version: 3,
        answers: [
          {
            itemId: original.itemId,
            response: "Canonical original answer",
            savedAt: "2026-10-03T12:00:00.000Z",
          },
        ],
      },
      captured,
    ),
  ).toBe(true);
  expect(captured.operation).toBe("answer");
  if (captured.operation !== "answer")
    throw new Error("expected answer anchor");
  expect(captured.response).toBe(original.response);
  expect(
    anchors.capture("original", "original-key", { ...original, version: 19 }),
  ).toBe(captured);
});

it("recognizes a matching advanced saved answer", () => {
  expect(isParticipantMutationReceipt(savedReceipt, answer)).toBe(true);
});
it.each(["SUBMETIDA", "EM_ANDAMENTO", "CRIADA", "ANULADA", "unknown"])(
  "rejects incompatible answer %s",
  (status) => {
    expect(
      isParticipantMutationReceipt({ ...savedReceipt, status }, answer),
    ).toBe(false);
  },
);
it.each([-1, 0, 2, 2.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
  "rejects nonadvancing or malformed answer version %s",
  (version) => {
    expect(
      isParticipantMutationReceipt({ ...savedReceipt, version }, answer),
    ).toBe(false);
  },
);
it.each([
  { attemptId: "foreign" },
  { activityId: "foreign" },
  {
    answers: [
      {
        itemId: "44444444-4444-4444-8444-444444444444",
        response: answer.response,
        savedAt: "2026-10-03T12:00:00.000Z",
      },
    ],
  },
  {
    answers: [
      {
        itemId: answer.itemId,
        response: "Later draft",
        savedAt: "2026-10-03T12:00:00.000Z",
      },
    ],
  },
  { answers: [] },
])("rejects answer receipt disagreement %j", (change) => {
  expect(
    isParticipantMutationReceipt({ ...savedReceipt, ...change }, answer),
  ).toBe(false);
});
it("same pending key preserves original answer anchor after a newer GET", () => {
  const anchors = new ParticipantMutationReceiptAnchors();
  const original = anchors.capture("answer:synthetic", "pending", answer);
  expect(isParticipantMutationReceipt(savedReceipt, original)).toBe(true);
  expect(
    anchors.capture("answer:synthetic", "pending", { ...answer, version: 19 }),
  ).toBe(original);
  expect(isParticipantMutationReceipt(savedReceipt, original)).toBe(true);
});
it.each(["submit", "answer"] as const)(
  "blocks %s identity replacement only for exact unresolved key",
  (operation) => {
    const anchors = new ParticipantMutationReceiptAnchors();
    const expected = operation === "answer" ? answer : submit;
    anchors.capture("pending-operation", "original-key", expected);
    const unresolved = (name: string, key: string) =>
      name === "pending-operation" && key === "original-key";
    expect(anchors.hasUnresolved(unresolved)).toBe(true);
    expect(
      anchors.blocksReplacement(
        { activityId, attemptId: "replacement" },
        unresolved,
      ),
    ).toBe(true);
    expect(
      anchors.blocksReplacement(
        { activityId: "replacement", attemptId },
        unresolved,
      ),
    ).toBe(true);
    expect(
      anchors.blocksReplacement({ activityId, attemptId: null }, unresolved),
    ).toBe(true);
    expect(
      anchors.blocksReplacement({ activityId, attemptId }, unresolved),
    ).toBe(false);
    expect(anchors.blocksReplacement({ activityId }, unresolved)).toBe(false);
    expect(
      anchors.blocksReplacement(
        { activityId, attemptId: "replacement" },
        () => false,
      ),
    ).toBe(false);
    anchors.complete("pending-operation", "original-key");
    expect(anchors.hasUnresolved(unresolved)).toBe(false);
    expect(
      anchors.blocksReplacement(
        { activityId, attemptId: "replacement" },
        unresolved,
      ),
    ).toBe(false);
  },
);
it("unresolved start preserves its action when a GET introduces an attempt", () => {
  const anchors = new ParticipantMutationReceiptAnchors();
  anchors.capture("start:synthetic", "pending", start);
  expect(anchors.blocksReplacement({ activityId, attemptId }, () => true)).toBe(
    true,
  );
  expect(anchors.blocksReplacement({ activityId }, () => true)).toBe(false);
  expect(
    anchors.blocksReplacement({ activityId, attemptId: null }, () => true),
  ).toBe(false);
});
it("resolved old ledger keys cannot block newly authorized identities", () => {
  const anchors = new ParticipantMutationReceiptAnchors();
  anchors.capture("answer:synthetic", "cleared", answer);
  expect(
    anchors.blocksReplacement(
      { activityId, attemptId: "replacement" },
      (_, key) => key === "new-current-key",
    ),
  ).toBe(false);
});
it("same-identity refresh preserves retry controls if a read would close the original editor", () => {
  const anchors = new ParticipantMutationReceiptAnchors();
  anchors.capture("answer:synthetic", "pending", answer);
  expect(
    anchors.blocksReplacement(
      { activityId, attemptId, status: "SUBMETIDA" },
      () => true,
    ),
  ).toBe(true);
  expect(
    anchors.blocksReplacement(
      { activityId, attemptId, status: "SALVA" },
      () => true,
    ),
  ).toBe(false);
});

it("pins first expectation across refresh and retries with the same pending key", () => {
  const anchors = new ParticipantMutationReceiptAnchors();
  const first = anchors.capture("submit:synthetic", "key-original", submit);
  expect(
    anchors.capture("submit:synthetic", "key-original", {
      ...submit,
      version: 12,
    }),
  ).toBe(first);
  expect(first).toEqual(submit);
});
it("copies the anchor so later caller mutation cannot move its deadline version", () => {
  const anchors = new ParticipantMutationReceiptAnchors();
  const mutable = { ...submit };
  const first = anchors.capture("submit:synthetic", "key", mutable);
  mutable.version = 12;
  expect(first).toEqual(submit);
});
it("new key after definitive resolution establishes a new anchor", () => {
  const anchors = new ParticipantMutationReceiptAnchors();
  anchors.capture("submit:synthetic", "old", submit);
  const updated = { ...submit, version: 12 };
  expect(anchors.capture("submit:synthetic", "new", updated)).toEqual(updated);
});
it("matching completion releases but stale completion cannot clear a newer pending anchor", () => {
  const anchors = new ParticipantMutationReceiptAnchors();
  const first = anchors.capture("submit:synthetic", "new", submit);
  anchors.complete("submit:synthetic", "old");
  expect(
    anchors.capture("submit:synthetic", "new", { ...submit, version: 12 }),
  ).toBe(first);
  anchors.complete("submit:synthetic", "new");
  expect(
    anchors.capture("submit:synthetic", "new", { ...submit, version: 12 }),
  ).not.toBe(first);
});
it("separates pending operation anchors", () => {
  const anchors = new ParticipantMutationReceiptAnchors();
  anchors.capture("start:synthetic", "key", start);
  expect(anchors.capture("submit:synthetic", "key", submit)).toEqual(submit);
});

it.each(["CRIADA", "EM_ANDAMENTO"])(
  "recognizes compatible start %s",
  (status) => {
    expect(isParticipantMutationReceipt({ ...receipt, status }, start)).toBe(
      true,
    );
  },
);
it.each([
  "SUBMETIDA",
  "AGUARDA_CORRECAO_HUMANA",
  "CORRIGIDA_AUTOMATICAMENTE",
  "CORRIGIDA_HUMANAMENTE",
])("recognizes submission %s", (status) => {
  expect(
    isParticipantMutationReceipt({ ...receipt, status, version: 3 }, submit),
  ).toBe(true);
});
it.each(["start", "submit"] as const)(
  "rejects foreign %s activity",
  (operation) => {
    expect(
      isParticipantMutationReceipt(
        {
          ...receipt,
          activityId: "foreign",
          status: operation === "submit" ? "SUBMETIDA" : "EM_ANDAMENTO",
          version: 3,
        },
        operation === "start" ? start : submit,
      ),
    ).toBe(false);
  },
);
it("rejects foreign submit attempt", () => {
  expect(
    isParticipantMutationReceipt(
      { ...receipt, attemptId: "foreign", status: "SUBMETIDA", version: 3 },
      submit,
    ),
  ).toBe(false);
});
it.each(["SALVA", "SUBMETIDA", "ANULADA", "unknown"])(
  "rejects incompatible start %s",
  (status) => {
    expect(isParticipantMutationReceipt({ ...receipt, status }, start)).toBe(
      false,
    );
  },
);
it.each(["CRIADA", "EM_ANDAMENTO", "SALVA", "ANULADA", "unknown"])(
  "rejects incompatible submit %s",
  (status) => {
    expect(
      isParticipantMutationReceipt({ ...receipt, status, version: 3 }, submit),
    ).toBe(false);
  },
);
it.each([-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, "1", null])(
  "rejects invalid version %s",
  (version) => {
    expect(isParticipantMutationReceipt({ ...receipt, version }, start)).toBe(
      false,
    );
    expect(
      isParticipantMutationReceipt(
        { ...receipt, status: "SUBMETIDA", version },
        submit,
      ),
    ).toBe(false);
  },
);
it.each([0, 1, 2])("rejects nonadvancing submission version %s", (version) => {
  expect(
    isParticipantMutationReceipt(
      { ...receipt, status: "SUBMETIDA", version },
      submit,
    ),
  ).toBe(false);
});
it("preserves nonnegative start versions in the public protocol", () => {
  expect(
    isParticipantMutationReceipt(
      { ...receipt, status: "CRIADA", version: 0 },
      start,
    ),
  ).toBe(true);
  expect(isParticipantMutationReceipt({ ...receipt, version: 0 }, start)).toBe(
    true,
  );
});
it.each([
  null,
  {},
  { ...receipt, answers: null },
  { ...receipt, attemptId: "" },
  { ...receipt, attemptId: " " },
  { ...receipt, activityId: "" },
])("rejects malformed projection %j", (value) => {
  expect(isParticipantMutationReceipt(value, start)).toBe(false);
});

it.each([-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
  "rejects malformed original submit anchor %s",
  (version) => {
    expect(
      isParticipantMutationReceipt(
        { ...receipt, status: "SUBMETIDA", version: 3 },
        { ...submit, version },
      ),
    ).toBe(false);
  },
);
