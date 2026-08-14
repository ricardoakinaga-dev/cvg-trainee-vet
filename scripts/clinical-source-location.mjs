import { existsSync, realpathSync } from "node:fs";
import { basename, isAbsolute, relative, resolve } from "node:path";

const externalDirectoryVariable = "CVG_CLINICAL_SOURCES_DIRECTORY";

export function resolveClinicalSourcesDirectory({
  rootDirectory = process.cwd(),
  environment = process.env,
} = {}) {
  const repositoryRoot = resolve(rootDirectory);
  const configuredDirectory = environment[externalDirectoryVariable]?.trim();

  if (configuredDirectory === undefined || configuredDirectory.length === 0) {
    return repositoryRoot;
  }

  if (!isAbsolute(configuredDirectory)) {
    throw new Error(
      `${externalDirectoryVariable} must be an absolute path when configured`,
    );
  }

  const candidateDirectory = resolve(configuredDirectory);
  assertOutsideRepository(candidateDirectory, repositoryRoot);

  if (existsSync(candidateDirectory)) {
    const realDirectory = realpathSync(candidateDirectory);
    assertOutsideRepository(realDirectory, repositoryRoot);
  }

  return candidateDirectory;
}

export function resolveClinicalSourceFile(directory, fileName) {
  if (!isAbsolute(directory)) {
    throw new Error("clinical source directory must be absolute");
  }
  if (
    typeof fileName !== "string" ||
    fileName.trim().length === 0 ||
    fileName.includes("/") ||
    fileName.includes("\\") ||
    fileName.includes("\0") ||
    basename(fileName) !== fileName
  ) {
    throw new Error(
      "clinical source file must be a basename without traversal",
    );
  }
  return resolve(directory, fileName);
}

function assertOutsideRepository(candidateDirectory, repositoryRoot) {
  const relativePath = relative(repositoryRoot, candidateDirectory);
  const isInsideRepository =
    relativePath === "" ||
    (!isAbsolute(relativePath) &&
      relativePath !== ".." &&
      !relativePath.startsWith(
        `..${process.platform === "win32" ? "\\" : "/"}`,
      ));
  if (isInsideRepository) {
    throw new Error(
      `${externalDirectoryVariable} must point outside the repository`,
    );
  }
}
