import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { basename, isAbsolute, relative, resolve } from "node:path";
import {
  readContainedMutationFile,
  writeExclusiveContainedMutationFile,
} from "./mutation-safe-files.mjs";

function safeRelativePath(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !isAbsolute(value) &&
    !value.includes("\\") &&
    !value.includes(":") &&
    value
      .split("/")
      .every((segment) => segment !== "" && segment !== "." && segment !== "..")
  );
}

function parseOptions(args) {
  const result = { scopes: [] };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (
      argument === "--bounded-manifest" ||
      argument === "--result-out" ||
      argument === "--scope"
    ) {
      const value = args[index + 1];
      if (typeof value !== "string" || value.startsWith("--")) {
        throw new Error(`${argument} requires a value`);
      }
      if (argument === "--bounded-manifest") result.manifestPath = value;
      else if (argument === "--result-out") result.resultPath = value;
      else result.scopes.push(value);
      index += 1;
    } else {
      throw new Error(`unknown mutation closure argument: ${argument}`);
    }
  }
  return result;
}

export async function runMutationClosureCli({
  scriptName,
  runBoundedClosure,
  verifyHistoricalClosure,
}) {
  if (!process.argv[1] || basename(resolve(process.argv[1])) !== scriptName) {
    return false;
  }
  try {
    const args = process.argv.slice(2);
    if (!args.includes("--bounded-manifest")) {
      const result = verifyHistoricalClosure();
      console.error(JSON.stringify(result));
      process.exitCode = result.exitCode;
      return true;
    }
    const options = parseOptions(args);
    const workingDirectory = resolve(process.cwd());
    const requestedManifestPath = resolve(options.manifestPath);
    const relativeManifestPath = relative(
      workingDirectory,
      requestedManifestPath,
    );
    if (!safeRelativePath(relativeManifestPath)) {
      throw new Error(
        "bounded manifest path must be within the working directory",
      );
    }
    const { bytes: manifestBytes } = await readContainedMutationFile(
      workingDirectory,
      relativeManifestPath,
    );
    const manifest = JSON.parse(manifestBytes.toString("utf8"));
    const digest = createHash("sha256").update(manifestBytes).digest("hex");
    const result = await runBoundedClosure(manifest, {
      expectedRunId: process.env.CVG_MUTATION_CANDIDATE_ID,
      manifestSha256: digest,
      ...(options.scopes.length === 0 ? {} : { scopeIds: options.scopes }),
    });
    if (options.resultPath !== undefined) {
      if (!safeRelativePath(options.resultPath)) {
        throw new Error("mutation result path must be a safe relative path");
      }
      await writeExclusiveContainedMutationFile(
        process.cwd(),
        options.resultPath,
        Buffer.from(`${JSON.stringify(result, null, 2)}\n`),
      );
    }
    console.log(JSON.stringify(result));
    process.exitCode = result.exitCode;
  } catch (error) {
    console.log(
      JSON.stringify({
        status: "HARNESS_ERROR",
        exitCode: 1,
        detail: error.message,
        results: [],
      }),
    );
    process.exitCode = 1;
  }
  return true;
}
