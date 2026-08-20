import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const persistenceSourceDirectory = resolve(
  repositoryRoot,
  "packages/persistence/src",
);

function transactionDoubleCastFiles(): readonly string[] {
  return readdirSync(persistenceSourceDirectory)
    .filter((fileName) => fileName.endsWith(".ts"))
    .filter((fileName) => !fileName.endsWith(".test.ts"))
    .filter((fileName) =>
      /\btransaction\s+as\s+unknown\s+as\s+DatabaseExecutor\b/u.test(
        readFileSync(resolve(persistenceSourceDirectory, fileName), "utf8"),
      ),
    );
}

describe("type-safety governance", () => {
  it("does not double-cast database transactions in production persistence code", () => {
    expect(transactionDoubleCastFiles()).toEqual([]);
  });
});
