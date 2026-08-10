import { readFile } from "node:fs/promises";

const boundary = await readFile(
  "packages/contracts/src/public-boundary.ts",
  "utf8",
);
const requiredFields = [
  "source_record_id",
  "source",
  "pdf",
  "photo",
  "prompt",
  "answer_key",
];
const missing = requiredFields.filter((field) => !boundary.includes(field));

if (missing.length > 0) {
  console.error(
    `public boundary is missing forbidden fields: ${missing.join(", ")}`,
  );
  process.exitCode = 1;
} else {
  console.log("public boundary: forbidden fields registered");
}
