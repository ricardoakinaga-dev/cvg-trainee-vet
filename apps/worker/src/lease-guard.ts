import { AsyncLocalStorage } from "node:async_hooks";
import type { OutboxRepositoryPort } from "@cvg/persistence";

export class WorkerLeaseLostError extends Error {
  public constructor(message = "worker lease is no longer owned") {
    super(message);
    this.name = "WorkerLeaseLostError";
  }
}

type EffectGuard = {
  readonly effect: <T>(work: () => Promise<T>) => Promise<T>;
};
const context = new AsyncLocalStorage<EffectGuard>();

export async function guardWorkerEffect<T>(work: () => Promise<T>): Promise<T> {
  const guard = context.getStore();
  return guard === undefined ? work() : guard.effect(work);
}

export async function checkWorkerLease(): Promise<void> {
  await guardWorkerEffect(async () => {});
}

export async function withWorkerLease(
  repository: OutboxRepositoryPort,
  id: string,
  token: string,
  seconds: number,
  work: () => Promise<void>,
): Promise<void> {
  const renew = repository.renewLease;
  const fence = repository.withLeaseFence;
  if (renew === undefined || fence === undefined)
    throw new WorkerLeaseLostError("worker lease fencing is not configured");
  let lost = false;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let inFlight: Promise<void> | undefined;
  const effect = async <T>(operation: () => Promise<T>): Promise<T> => {
    if (lost) throw new WorkerLeaseLostError();
    const result = await fence(id, token, seconds, operation);
    if (!result.owned) {
      lost = true;
      throw new WorkerLeaseLostError();
    }
    return result.value;
  };
  const schedule = (): void => {
    if (stopped || lost) return;
    timer = setTimeout(
      () => {
        inFlight = renew(id, token, seconds)
          .then((owned) => {
            if (!owned) lost = true;
          })
          .catch(() => {
            lost = true;
          })
          .finally(schedule);
      },
      Math.max(1, Math.floor((seconds * 1000) / 3)),
    );
  };
  let failure: { readonly error: unknown } | undefined;
  try {
    await effect(async () => {});
    schedule();
    await context.run({ effect }, work);
  } catch (error) {
    failure = { error };
  } finally {
    stopped = true;
    if (timer !== undefined) clearTimeout(timer);
    await inFlight;
  }
  if (lost) throw new WorkerLeaseLostError();
  if (failure !== undefined) throw failure.error;
}
