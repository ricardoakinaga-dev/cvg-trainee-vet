import { isValidIsoTimestamp } from "./timestamp.js";

export type SummativeExamChoice = Readonly<{
  readonly id: string;
  readonly text: string;
}>;

export type SummativeExamBankItem = Readonly<{
  readonly id: string;
  readonly objectiveId: string;
  readonly choices: readonly SummativeExamChoice[];
}>;

export type SummativeExamBlueprint = Readonly<{
  readonly id: string;
  readonly version: string;
  readonly itemCount: number;
  readonly timeLimitMinutes: number;
  readonly windowMinutes: number;
  readonly objectiveItemCounts: Readonly<Record<string, number>>;
}>;

export type SummativeExamSelection = Readonly<{
  readonly blueprintId: string;
  readonly blueprintVersion: string;
  readonly availableFrom: string;
  readonly expiresAt: string;
  readonly timeLimitMinutes: number;
  readonly windowMinutes: number;
  readonly items: readonly SummativeExamBankItem[];
}>;

export type SummativeExamSelectionInput = Readonly<{
  readonly blueprint: SummativeExamBlueprint;
  readonly bank: readonly SummativeExamBankItem[];
  readonly now: string;
  readonly random?: () => number;
}>;

export class SummativeExamPolicyError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "SummativeExamPolicyError";
  }
}

function freeze<T>(value: T): Readonly<T> {
  return Object.freeze(value);
}

function assertNonEmpty(
  value: unknown,
  field: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new SummativeExamPolicyError(`${field} must not be empty`);
  }
}

function assertPositiveInteger(
  value: unknown,
  field: string,
): asserts value is number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new SummativeExamPolicyError(`${field} must be a positive integer`);
  }
}

function assertRandomValue(value: number): void {
  if (typeof value !== "number" || value < 0 || value >= 1) {
    throw new SummativeExamPolicyError(
      "random must return a value from 0 to less than 1",
    );
  }
}

function shuffle<T>(values: readonly T[], random: () => number): readonly T[] {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomValue = random();
    assertRandomValue(randomValue);
    const swapIndex = Math.floor(randomValue * (index + 1));
    const current = copy[index];
    const replacement = copy[swapIndex];
    if (current === undefined || replacement === undefined) {
      throw new SummativeExamPolicyError("cannot shuffle an invalid item");
    }
    copy[index] = replacement;
    copy[swapIndex] = current;
  }
  return freeze(copy);
}

function validateBlueprint(blueprint: SummativeExamBlueprint): void {
  assertNonEmpty(blueprint.id, "blueprint.id");
  assertNonEmpty(blueprint.version, "blueprint.version");
  assertPositiveInteger(blueprint.itemCount, "blueprint.itemCount");
  assertPositiveInteger(
    blueprint.timeLimitMinutes,
    "blueprint.timeLimitMinutes",
  );
  assertPositiveInteger(blueprint.windowMinutes, "blueprint.windowMinutes");
  if (blueprint.windowMinutes < blueprint.timeLimitMinutes) {
    throw new SummativeExamPolicyError(
      "windowMinutes must cover timeLimitMinutes",
    );
  }
  const counts = Object.entries(blueprint.objectiveItemCounts);
  if (counts.length === 0) {
    throw new SummativeExamPolicyError("objectiveItemCounts must not be empty");
  }
  const countTotal = counts.reduce((total, [objectiveId, count]) => {
    assertNonEmpty(objectiveId, "objectiveId");
    assertPositiveInteger(count, `objectiveItemCounts.${objectiveId}`);
    if (count < 10 || count > 15) {
      throw new SummativeExamPolicyError(
        `objectiveItemCounts.${objectiveId} must be from 10 to 15`,
      );
    }
    return total + count;
  }, 0);
  if (countTotal !== blueprint.itemCount) {
    throw new SummativeExamPolicyError(
      "objective item counts must equal blueprint.itemCount",
    );
  }
}

function validateBankItem(item: SummativeExamBankItem): void {
  assertNonEmpty(item.id, "bank item id");
  assertNonEmpty(item.objectiveId, "bank item objectiveId");
  if (item.choices.length < 2) {
    throw new SummativeExamPolicyError(
      "bank item must have at least two choices",
    );
  }
  const choiceIds = new Set<string>();
  for (const choice of item.choices) {
    assertNonEmpty(choice.id, "choice id");
    assertNonEmpty(choice.text, "choice text");
    if (/<[^>]*>/u.test(choice.text)) {
      throw new SummativeExamPolicyError("choice text must be plain text");
    }
    if (choiceIds.has(choice.id)) {
      throw new SummativeExamPolicyError("choice ids must be unique");
    }
    choiceIds.add(choice.id);
  }
}

function selectedItem(
  item: SummativeExamBankItem,
  random: () => number,
): SummativeExamBankItem {
  return freeze({
    id: item.id,
    objectiveId: item.objectiveId,
    choices: shuffle(
      item.choices.map((choice) =>
        freeze({ id: choice.id, text: choice.text }),
      ),
      random,
    ),
  });
}

export function createSummativeExamSelection(
  input: SummativeExamSelectionInput,
): SummativeExamSelection {
  validateBlueprint(input.blueprint);
  if (!isValidIsoTimestamp(input.now)) {
    throw new SummativeExamPolicyError("now must be a valid timestamp");
  }
  const now = new Date(input.now);
  const bankIds = new Set<string>();
  for (const item of input.bank) {
    validateBankItem(item);
    if (bankIds.has(item.id)) {
      throw new SummativeExamPolicyError("bank item ids must be unique");
    }
    bankIds.add(item.id);
  }
  if (input.bank.length < Math.ceil(input.blueprint.itemCount * 1.5)) {
    throw new SummativeExamPolicyError(
      "bank must contain at least 1.5 times the applied item count",
    );
  }

  const random = input.random ?? Math.random;
  const selected: SummativeExamBankItem[] = [];
  for (const [objectiveId, count] of Object.entries(
    input.blueprint.objectiveItemCounts,
  )) {
    const candidates = input.bank.filter(
      (item) => item.objectiveId === objectiveId,
    );
    if (candidates.length < count) {
      throw new SummativeExamPolicyError(
        `bank does not cover objective ${objectiveId}`,
      );
    }
    for (const item of shuffle(candidates, random).slice(0, count)) {
      selected.push(selectedItem(item, random));
    }
  }

  const expiresAt = new Date(
    now.getTime() + input.blueprint.windowMinutes * 60_000,
  ).toISOString();
  return freeze({
    blueprintId: input.blueprint.id,
    blueprintVersion: input.blueprint.version,
    availableFrom: input.now,
    expiresAt,
    timeLimitMinutes: input.blueprint.timeLimitMinutes,
    windowMinutes: input.blueprint.windowMinutes,
    items: shuffle(selected, random),
  });
}
