import { afterEach, expect, it, vi } from "vitest";
import { apiErrorResponse } from "@cvg/contracts";
import {
  DiagnosticSessionClient,
  parseDiagnosticSession,
  isDiagnosticReceipt,
  requestDiagnosticJson,
  DiagnosticRequestCancelled,
  DiagnosticRequestError,
} from "./diagnostic-session-client";

const sessionId = "44444444-4444-4444-8444-444444444444";
const items = Array.from({ length: 120 }, (_, index) => ({
  itemId: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  ordinal: index + 1,
  title: "Synthetic item",
  text: "Synthetic text",
  responseMode: "CHOICE",
  selectionMode: "SINGLE",
  choices: [
    { id: "A", label: "A", text: "Synthetic A" },
    { id: "B", label: "B", text: "Synthetic B" },
  ],
}));
const itemId = items[0]?.itemId ?? "";
const projection = {
  sessionId,
  diagnosticId: "B07-DIAGNOSTIC-V1",
  diagnosticVersion: "0.1.0",
  status: "EM_ANDAMENTO",
  version: 2,
  startedAt: "2026-10-03T12:00:00.000Z",
  itemCount: 120,
  answeredItemCount: 1,
  currentOrdinal: 2,
  items,
  answers: [{ itemId, selectedChoiceIds: ["A"] }],
};
const expected = {
  operation: "answer" as const,
  sessionId,
  version: 1,
  itemId,
  selectedChoiceIds: ["A"],
};
afterEach(() => vi.useRealTimers());
it("R25 diagnostic receipt acknowledges an older write without replacing newer answers", () => {
  const client = new DiagnosticSessionClient();
  const newer = parseDiagnosticSession({
    ...projection,
    version: 9,
    answeredItemCount: 2,
    answers: [
      ...projection.answers,
      { itemId: items[1]!.itemId, selectedChoiceIds: ["B"] },
    ],
  });
  client.readSession(parseDiagnosticSession({ ...projection, version: 1 }));
  client.readSession(newer);
  expect(client.acknowledgeSession(parseDiagnosticSession(projection))).toBe(
    newer,
  );
  expect(
    client.readSession(parseDiagnosticSession({ ...projection, version: 3 })),
  ).toBe(newer);
});
it.each(["answer", "count", "ordinal"] as const)(
  "R25 rejects contradictory same-version diagnostic %s without losing its checkpoint",
  (field) => {
    const client = new DiagnosticSessionClient();
    const known = parseDiagnosticSession(projection);
    client.readSession(known);
    const contradictory = parseDiagnosticSession({
      ...projection,
      ...(field === "answer"
        ? { answers: [{ itemId, selectedChoiceIds: ["B"] }] }
        : field === "count"
          ? { answeredItemCount: 0, answers: [] }
          : { currentOrdinal: 3 }),
    });
    expect(() => client.readSession(contradictory)).toThrow();
    expect(client.readSession(known)).toBe(known);
  },
);
it.each(["text", "startedAt"] as const)(
  "R25 rejects altered immutable diagnostic %s on an advanced receipt",
  (field) => {
    const client = new DiagnosticSessionClient();
    const known = parseDiagnosticSession(projection);
    client.readSession(known);
    const changed = parseDiagnosticSession({
      ...projection,
      version: 3,
      ...(field === "text"
        ? {
            items: items.map((item, index) =>
              index === 0
                ? { ...item, text: "Changed synthetic public form" }
                : item,
            ),
          }
        : { startedAt: "2026-10-04T12:00:00.000Z" }),
    });
    expect(() => client.acknowledgeSession(changed)).toThrow();
    expect(client.readSession(known)).toBe(known);
  },
);
it("R25 same diagnostic revision accepts answer array ordering without inventing a version", () => {
  const client = new DiagnosticSessionClient();
  const input = {
    ...projection,
    answeredItemCount: 2,
    answers: [
      ...projection.answers,
      { itemId: items[1]!.itemId, selectedChoiceIds: ["B"] },
    ],
  };
  client.readSession(parseDiagnosticSession(input));
  const same = parseDiagnosticSession({
    ...input,
    answers: [...input.answers].reverse(),
  });
  expect(client.readSession(same)).toBe(same);
  expect(same.version).toBe(input.version);
});
it("R25 pending original identity rejects a foreign read and releases after confirmation", () => {
  const client = new DiagnosticSessionClient();
  const original = client.prepare({
    path: "/original",
    method: "PUT",
    body: "original bytes",
    expected,
    advance: false,
  });
  const foreign = parseDiagnosticSession({
    ...projection,
    sessionId: "44444444-4444-4444-8444-444444444445",
  });
  expect(() => client.readSession(foreign)).toThrow();
  client.complete(original);
  expect(client.readSession(foreign)).toBe(foreign);
});
it("R17 ordering copies all published items without changing incoming wire snapshots", () => {
  const wire = { ...projection, items: [...items].reverse() };
  const original = JSON.stringify(wire);
  const normalized = parseDiagnosticSession(wire);
  expect(normalized.items.map((item) => item.ordinal)).toEqual(
    Array.from({ length: 120 }, (_, i) => i + 1),
  );
  expect(normalized.items).toHaveLength(120);
  expect(JSON.stringify(wire)).toBe(original);
  expect(isDiagnosticReceipt(normalized, expected)).toBe(true);
});
it("R14 diagnostic recognizes exact advanced choice receipt and original anchor", () => {
  expect(
    isDiagnosticReceipt(parseDiagnosticSession(projection), expected),
  ).toBe(true);
  expect(
    isDiagnosticReceipt(
      parseDiagnosticSession({ ...projection, version: 3 }),
      expected,
    ),
  ).toBe(true);
});
it.each([
  { sessionId: "55555555-5555-4555-8555-555555555555" },
  { version: 1 },
  { answers: [], answeredItemCount: 0 },
  { answers: [{ itemId, selectedChoiceIds: ["B"] }] },
])("R14 diagnostic rejects receipt disagreement %j", (change) => {
  expect(
    isDiagnosticReceipt(
      parseDiagnosticSession({ ...projection, ...change }),
      expected,
    ),
  ).toBe(false);
});
it("R14 clear receipt requires absence of original item answer", () => {
  const clear = { ...expected, selectedChoiceIds: [] };
  expect(isDiagnosticReceipt(parseDiagnosticSession(projection), clear)).toBe(
    false,
  );
  expect(
    isDiagnosticReceipt(
      parseDiagnosticSession({
        ...projection,
        answers: [],
        answeredItemCount: 0,
      }),
      clear,
    ),
  ).toBe(true);
});
it.each([
  { answer_key: "PRIVATE_SYNTHETIC" },
  {
    items: [
      { ...items[0], rubric_internal: "PRIVATE_SYNTHETIC" },
      ...items.slice(1),
    ],
  },
  { version: Number.MAX_SAFE_INTEGER + 1 },
  { answers: [{ itemId, selectedChoiceIds: ["unknown"] }] },
])(
  "R14 diagnostic canonical parsing denies private or malformed %j",
  (change) => {
    expect(() =>
      parseDiagnosticSession({ ...projection, ...change }),
    ).toThrow();
  },
);
it.each(["transport", "body"])(
  "R14 diagnostic deadline covers %s",
  async (phase) => {
    vi.useFakeTimers();
    let signal: AbortSignal | null | undefined;
    const fetcher: typeof fetch = async (_input, init) => {
      signal = init?.signal;
      if (phase === "transport") return new Promise<Response>(() => {});
      return {
        ok: true,
        json: () => new Promise<unknown>(() => {}),
      } as Response;
    };
    const request = requestDiagnosticJson(
      "/synthetic",
      { method: "GET" },
      { deadlineMs: 20, fetcher },
    );
    const rejection = expect(request).rejects.toMatchObject({
      code: "request_timeout",
    });
    await vi.advanceTimersByTimeAsync(20);
    await rejection;
    expect(signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  },
);
it("R14 diagnostic lifetime cancels requests and prevents future transport", async () => {
  const client = new DiagnosticSessionClient();
  client.cancel();
  const fetcher = vi.fn<typeof fetch>();
  await expect(
    requestDiagnosticJson(
      "/synthetic",
      { method: "GET", signal: client.signal },
      { fetcher },
    ),
  ).rejects.toBeInstanceOf(DiagnosticRequestCancelled);
  expect(fetcher).not.toHaveBeenCalled();
});

it("R14 diagnostic one pending snapshot pins immutable URI bytes choices and original version", () => {
  const client = new DiagnosticSessionClient();
  const choices = ["A"];
  const original = client.prepare({
    path: "/original",
    method: "PUT",
    body: '{"version":1,"idempotencyKey":"original-key","selectedChoiceIds":["A"]}',
    expected: { ...expected, selectedChoiceIds: choices },
    advance: true,
    draftChoiceIds: choices,
  });
  choices.push("B");
  const later = client.prepare({
    path: "/foreign",
    method: "PUT",
    body: "later",
    expected: { ...expected, version: 19 },
    advance: false,
  });
  expect(later).toBe(original);
  expect(original.expected?.selectedChoiceIds).toEqual(["A"]);
  expect(original.draftChoiceIds).toEqual(["A"]);
  expect(original.expected?.version).toBe(1);
  client.complete({ ...original });
  expect(client.pending).toBe(original);
  client.complete(original);
  expect(client.pending).toBeNull();
  expect(
    client.prepare({ ...original, path: "/next", body: "next" }).path,
  ).toBe("/next");
});
it.each([false, true])(
  "R14 diagnostic releases pending only on explicit validated rejection %s",
  (definitive) => {
    const client = new DiagnosticSessionClient();
    const original = client.prepare({
      path: "/original",
      method: "PUT",
      body: "original",
      advance: false,
    });
    client.reject(original, new TypeError("network"));
    expect(client.pending).toBe(original);
    client.reject(
      original,
      new DiagnosticRequestError("validation_error", definitive),
    );
    expect(client.pending).toBe(definitive ? null : original);
  },
);
it("R14 diagnostic replacing read cancels prior read and lifetime aborts current", () => {
  const client = new DiagnosticSessionClient();
  const first = client.beginRead();
  const second = client.beginRead();
  expect(first.signal.aborted).toBe(true);
  expect(first.current()).toBe(false);
  expect(second.current()).toBe(true);
  client.cancel();
  expect(second.signal.aborted).toBe(true);
  expect(second.current()).toBe(false);
  expect(() => client.beginRead()).toThrow(DiagnosticRequestCancelled);
});
it("R14 diagnostic abort during body cancels without late result or retained timer", async () => {
  vi.useFakeTimers();
  const controller = new AbortController();
  let resolveBody!: (value: unknown) => void;
  const fetcher: typeof fetch = async () =>
    ({
      ok: true,
      json: () =>
        new Promise<unknown>((resolve) => {
          resolveBody = resolve;
        }),
    }) as Response;
  const request = requestDiagnosticJson(
    "/synthetic",
    { method: "PUT", body: "original", signal: controller.signal },
    { fetcher },
  );
  const rejection = expect(request).rejects.toBeInstanceOf(
    DiagnosticRequestCancelled,
  );
  await vi.advanceTimersByTimeAsync(1);
  controller.abort();
  await rejection;
  resolveBody({ success: true, data: projection });
  await vi.advanceTimersByTimeAsync(1);
  expect(vi.getTimerCount()).toBe(0);
});
it.each([0, -1, Infinity, 15_001])(
  "R14 rejects unbounded deadline %s before transport",
  async (deadlineMs) => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(
      requestDiagnosticJson(
        "/synthetic",
        { method: "GET" },
        { deadlineMs, fetcher },
      ),
    ).rejects.toThrow("invalid diagnostic request deadline");
    expect(fetcher).not.toHaveBeenCalled();
  },
);
it.each([200, 422, 503])(
  "R14 rejection proof requires actual HTTP422 and valid error envelope at%s",
  async (status) => {
    const fetcher: typeof fetch = async () =>
      new Response(
        JSON.stringify(apiErrorResponse("validation_error", "synthetic-r50")),
        { status },
      );
    await expect(
      requestDiagnosticJson(
        "/synthetic",
        { method: "PUT", body: "original" },
        { fetcher },
      ),
    ).rejects.toMatchObject({ definitiveRejection: status === 422 });
  },
);

const invalidValidationProofs = [
  ["missing-message", { success: false, error: { code: "validation_error" } }],
  [
    "blank-message",
    {
      ...apiErrorResponse("validation_error", "synthetic-r50"),
      error: {
        ...apiErrorResponse("validation_error", "synthetic-r50").error,
        message: "",
      },
    },
  ],
  [
    "whitespace-message",
    {
      ...apiErrorResponse("validation_error", "synthetic-r50"),
      error: {
        ...apiErrorResponse("validation_error", "synthetic-r50").error,
        message: "   ",
      },
    },
  ],
  [
    "nonstring-message",
    {
      ...apiErrorResponse("validation_error", "synthetic-r50"),
      error: {
        ...apiErrorResponse("validation_error", "synthetic-r50").error,
        message: 12,
      },
    },
  ],
  [
    "invalid-details",
    {
      ...apiErrorResponse("validation_error", "synthetic-r50"),
      error: {
        ...apiErrorResponse("validation_error", "synthetic-r50").error,
        details: { code: "invalid" },
      },
    },
  ],
  [
    "invalid-detail-field",
    {
      ...apiErrorResponse("validation_error", "synthetic-r50"),
      error: {
        ...apiErrorResponse("validation_error", "synthetic-r50").error,
        details: [{ code: "invalid", field: 12 }],
      },
    },
  ],
  [
    "missing-meta",
    {
      success: false,
      error: apiErrorResponse("validation_error", "synthetic-r50").error,
    },
  ],
  [
    "invalid-request-id",
    {
      ...apiErrorResponse("validation_error", "synthetic-r50"),
      meta: { request_id: " " },
    },
  ],
  [
    "private-envelope",
    {
      ...apiErrorResponse("validation_error", "synthetic-r50"),
      source: "PRIVATE_R50",
    },
  ],
  [
    "private-details",
    {
      ...apiErrorResponse("validation_error", "synthetic-r50"),
      error: {
        ...apiErrorResponse("validation_error", "synthetic-r50").error,
        details: [{ code: "invalid", source: "PRIVATE_R50" }],
      },
    },
  ],
  [
    "unknown-error-field",
    {
      ...apiErrorResponse("validation_error", "synthetic-r50"),
      error: {
        ...apiErrorResponse("validation_error", "synthetic-r50").error,
        debug: "PRIVATE_R50",
      },
    },
  ],
  [
    "private-message",
    {
      ...apiErrorResponse("validation_error", "synthetic-r50"),
      error: {
        ...apiErrorResponse("validation_error", "synthetic-r50").error,
        message: "PRIVATE_R50",
      },
    },
  ],
] as const;

it.each(invalidValidationProofs)(
  "R50 malformed public422 %s preserves the exact original path/body/key against a dirty replacement",
  async (_name, payload) => {
    const client = new DiagnosticSessionClient();
    const original = client.prepare({
      path: "/original",
      method: "PUT",
      body: '{"version":1,"idempotencyKey":"original-r50-key","selectedChoiceIds":["A"]}',
      expected,
      advance: true,
      draftChoiceIds: ["A"],
    });
    const wires: { path: string; body: string }[] = [];
    const fetcher: typeof fetch = async (input, init) => {
      wires.push({ path: String(input), body: String(init?.body) });
      return new Response(JSON.stringify(payload), { status: 422 });
    };
    let caught: unknown;
    try {
      await requestDiagnosticJson(original.path, original, { fetcher });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(DiagnosticRequestError);
    expect(caught).toMatchObject({ definitiveRejection: false });
    client.reject(original, caught);
    expect(client.pending).toBe(original);
    const dirty = client.prepare({
      ...original,
      path: "/edited",
      body: "changed-key-B",
      draftChoiceIds: ["B"],
    });
    expect(dirty).toBe(original);
    await requestDiagnosticJson(dirty.path, dirty, { fetcher }).catch(() => {});
    expect(wires).toHaveLength(2);
    expect(wires[1]).toEqual(wires[0]);
    expect(JSON.parse(wires[1]!.body)).toMatchObject({
      idempotencyKey: "original-r50-key",
      selectedChoiceIds: ["A"],
    });
  },
);

it.each([422, 500])(
  "R50 canonical public validation proof with details releases only at HTTP%s",
  async (status) => {
    const client = new DiagnosticSessionClient();
    const original = client.prepare({
      path: "/original",
      method: "PUT",
      body: "original",
      advance: false,
    });
    const payload = apiErrorResponse("validation_error", "synthetic-r50", [
      { code: "invalid_choice", field: "selectedChoiceIds" },
    ]);
    let caught: unknown;
    try {
      await requestDiagnosticJson(original.path, original, {
        fetcher: async () => new Response(JSON.stringify(payload), { status }),
      });
    } catch (error) {
      caught = error;
    }
    expect(caught).toMatchObject({
      code: "validation_error",
      definitiveRejection: status === 422,
    });
    client.reject(original, caught);
    expect(client.pending).toBe(status === 422 ? null : original);
  },
);
