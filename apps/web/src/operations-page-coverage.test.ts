import { beforeEach, describe, expect, it, vi } from "vitest";

const reactHarness = vi.hoisted(() => {
  const values: unknown[] = [];
  const effectsRun = new Set<number>();
  let cursor = 0;
  return {
    reset(): void {
      values.length = 0;
      effectsRun.clear();
      cursor = 0;
    },
    beginRender(): void {
      cursor = 0;
    },
    useState<T>(initial: T): readonly [T, (next: T) => void] {
      const index = cursor;
      cursor += 1;
      if (values[index] === undefined) values[index] = initial;
      return [
        values[index] as T,
        (next: T) => {
          values[index] = next;
        },
      ] as const;
    },
    useCallback<T extends (...args: never[]) => unknown>(callback: T): T {
      return callback;
    },
    useEffect(effect: () => void): void {
      const index = cursor;
      cursor += 1;
      if (effectsRun.has(index)) return;
      effectsRun.add(index);
      effect();
    },
  };
});

vi.mock("react", () => reactHarness);

import { renderToStaticMarkup } from "react-dom/server";

import OperationsPage from "../app/operations/page.js";

const readyState = {
  status: "READY",
  dependencies: { postgres: "UP", qdrant: "DISABLED", ai: "DISABLED" },
} as const;

function renderPage(): string {
  reactHarness.beginRender();
  return renderToStaticMarkup(OperationsPage() as never);
}

beforeEach(() => {
  reactHarness.reset();
});

describe("operations page production coverage", () => {
  it("renders loading and then the redacted dependency projection", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({ success: true, data: readyState }),
      }),
    );

    expect(renderPage()).toContain("operations-loading");
    await vi.waitFor(() => expect(renderPage()).toContain("operations-ready"));
    expect(renderPage()).toContain("DISABLED");
    expect(renderPage()).not.toContain("DATABASE_URL");
  });

  it("fails closed when the response envelope or JSON is invalid", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({ success: false }),
      }),
    );
    renderPage();
    await vi.waitFor(() =>
      expect(renderPage()).toContain("Não foi possível consultar"),
    );

    reactHarness.reset();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => {
          throw new Error("malformed json");
        },
      }),
    );
    renderPage();
    await vi.waitFor(() => expect(renderPage()).toContain("Tentar novamente"));
  });
});
