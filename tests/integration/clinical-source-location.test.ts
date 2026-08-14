import { describe, expect, it } from "vitest";

import {
  resolveClinicalSourceFile,
  resolveClinicalSourcesDirectory,
} from "../../scripts/clinical-source-location.mjs";

describe("clinical source bundle location", () => {
  it("uses the repository root when no external bundle is configured", () => {
    expect(
      resolveClinicalSourcesDirectory({
        rootDirectory: "/workspace/cvg",
        environment: {},
      }),
    ).toBe("/workspace/cvg");
  });

  it("accepts an absolute directory outside the repository", () => {
    expect(
      resolveClinicalSourcesDirectory({
        rootDirectory: "/workspace/cvg",
        environment: {
          CVG_CLINICAL_SOURCES_DIRECTORY: "/runner/temp/cvg-sources",
        },
      }),
    ).toBe("/runner/temp/cvg-sources");
  });

  it("rejects a relative external bundle path", () => {
    expect(() =>
      resolveClinicalSourcesDirectory({
        rootDirectory: "/workspace/cvg",
        environment: { CVG_CLINICAL_SOURCES_DIRECTORY: "../sources" },
      }),
    ).toThrow(/absolute/i);
  });

  it("rejects a configured bundle inside the repository", () => {
    expect(() =>
      resolveClinicalSourcesDirectory({
        rootDirectory: "/workspace/cvg",
        environment: {
          CVG_CLINICAL_SOURCES_DIRECTORY: "/workspace/cvg/.cache/sources",
        },
      }),
    ).toThrow(/outside the repository/i);
  });

  it("resolves only a manifest basename and prevents traversal", () => {
    expect(
      resolveClinicalSourceFile(
        "/runner/temp/cvg-sources",
        "Ettinger's Textbook.pdf",
      ),
    ).toBe("/runner/temp/cvg-sources/Ettinger's Textbook.pdf");

    expect(() =>
      resolveClinicalSourceFile("/runner/temp/cvg-sources", "../secret.pdf"),
    ).toThrow(/basename/i);
  });
});
