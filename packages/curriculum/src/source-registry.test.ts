import { describe, expect, it } from "vitest";

import {
  CLINICAL_SOURCES,
  isAllowedClinicalSourceCode,
  validateClinicalSourceRefs,
} from "./source-registry.js";

describe("clinical source registry", () => {
  it("contains exactly the three immutable PDF sources", () => {
    expect(Object.keys(CLINICAL_SOURCES).sort()).toEqual([
      "BOOK_ETTINGER_9E",
      "BOOK_FOSSUM_4E",
      "BOOK_JERICO_CAES_GATOS",
    ]);
  });

  it("accepts only an allowed source code and a non-empty internal locator", () => {
    expect(isAllowedClinicalSourceCode("BOOK_ETTINGER_9E")).toBe(true);
    expect(isAllowedClinicalSourceCode("AAHA-2024")).toBe(false);
    expect(
      validateClinicalSourceRefs([
        {
          code: "BOOK_ETTINGER_9E",
          locator: "capítulo 123, seção de ressuscitação",
          updateRequired: false,
        },
      ]),
    ).toEqual({ valid: true, invalidReasons: [] });
  });

  it("rejects source refs that are not grounded in the immutable registry", () => {
    expect(
      validateClinicalSourceRefs([
        {
          code: "AAHA-2024",
          locator: "diretriz externa",
          updateRequired: true,
        },
      ]),
    ).toEqual({
      valid: false,
      invalidReasons: ["source code is not in the immutable clinical registry"],
    });
    expect(
      validateClinicalSourceRefs([
        { code: "BOOK_FOSSUM_4E", locator: "", updateRequired: false },
      ]),
    ).toEqual({
      valid: false,
      invalidReasons: ["source locator is required"],
    });
  });
});
