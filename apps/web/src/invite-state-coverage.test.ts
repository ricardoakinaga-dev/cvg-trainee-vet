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
    useEffect(effect: () => void): void {
      const index = cursor;
      cursor += 1;
      if (effectsRun.has(index)) return;
      effectsRun.add(index);
      effect();
    },
    useCallback<T extends (...args: never[]) => unknown>(callback: T): T {
      return callback;
    },
  };
});

vi.mock("react", () => reactHarness);

import { useInviteActivation } from "../app/invite/invite-state.js";

const invitationToken = "i".repeat(32);
const validPassword = "L".repeat(12);

function renderHook() {
  reactHarness.beginRender();
  return useInviteActivation("/api");
}

function submitEvent() {
  return { preventDefault: vi.fn() } as never;
}

beforeEach(() => {
  reactHarness.reset();
  vi.stubGlobal("window", {
    location: {
      search: `?token=${invitationToken}&locale=pt-BR`,
      href: `https://web.internal/invite?token=${invitationToken}&locale=pt-BR`,
    },
    history: { state: null, replaceState: vi.fn() },
  });
});

describe("invite activation hook production coverage", () => {
  it("reads and removes the invitation token, then completes activation", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const initial = renderHook();
    expect(initial.token).toBeNull();
    const state = renderHook();
    expect(state.token).toBe(invitationToken);
    expect(window.history.replaceState).toHaveBeenCalledWith(
      null,
      "",
      "/invite?locale=pt-BR",
    );

    state.setPassword(validPassword);
    state.setConfirmation(validPassword);
    const readyState = renderHook();
    const event = submitEvent();
    await readyState.handleSubmit(event);

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/api/v1/invitations/accept",
      expect.objectContaining({ method: "POST" }),
    );
    const completed = renderHook();
    expect(completed.complete).toBe(true);
    expect(completed.token).toBeNull();
    expect(completed.password).toBe("");
    expect(completed.confirmation).toBe("");
    expect(completed.busy).toBe(false);
  });

  it("reports validation and provider failures without leaking details", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ success: false }),
      }),
    );
    renderHook();
    const invalid = renderHook();
    const invalidEvent = submitEvent();
    await invalid.handleSubmit(invalidEvent);
    const invalidAfter = renderHook();
    expect(invalidAfter.error).toBe(
      "A senha deve ter pelo menos 12 caracteres.",
    );

    reactHarness.reset();
    const failure = renderHook();
    const validState = renderHook();
    validState.setPassword(validPassword);
    validState.setConfirmation(validPassword);
    const readyState = renderHook();
    await readyState.handleSubmit(submitEvent());
    const failureAfter = renderHook();
    expect(failureAfter.error).toBe(
      "Não foi possível ativar este acesso. Solicite um novo link ao superadmin.",
    );
    expect(failure.busy).toBe(false);
  });
});
