export type ClinicalSourceCode =
  "BOOK_ETTINGER_9E" | "BOOK_FOSSUM_4E" | "BOOK_JERICO_CAES_GATOS";

export type ClinicalSource = Readonly<{
  readonly code: ClinicalSourceCode;
  readonly title: string;
  readonly fileName: string;
  readonly sha256: string;
  readonly pages: number;
}>;

export type ClinicalSourceRef = Readonly<{
  readonly code: string;
  readonly locator: string;
  readonly updateRequired: boolean;
}>;

const source = (
  code: ClinicalSourceCode,
  title: string,
  fileName: string,
  sha256: string,
  pages: number,
): ClinicalSource => Object.freeze({ code, title, fileName, sha256, pages });

export const CLINICAL_SOURCES: Readonly<
  Record<ClinicalSourceCode, ClinicalSource>
> = Object.freeze({
  BOOK_ETTINGER_9E: source(
    "BOOK_ETTINGER_9E",
    "Ettinger's Textbook of Veterinary Internal Medicine, 9th Edition",
    "Ettinger's Textbook of Veterinary Internal Medicine, 9th Edition (VetBooks.ir).pdf",
    "429d0fbf568664c9e01d984cd272bc54195bf8d2aa54ce7caa902f28859875b8",
    2801,
  ),
  BOOK_FOSSUM_4E: source(
    "BOOK_FOSSUM_4E",
    "Cirurgia de Pequenos Animais, 4ª Edição",
    "Fossum.Cirurgia de Pequenos Animais_ 4ª Edição-ilovepdf-compressed.pdf",
    "df0138e8b5c2b25adce71f8a6549e3f9d6e26e97bdc2a9b559b22bcafd04d2a0",
    5008,
  ),
  BOOK_JERICO_CAES_GATOS: source(
    "BOOK_JERICO_CAES_GATOS",
    "Tratado de Medicina Interna de Cães e Gatos",
    "Tratado de Medicina Interna de - Marcia Marques Jerico, Joao Ped-ilovepdf-compressed-1.pdf",
    "ef781de2bd48e940f193926b62b71375871da586e080d8e1dbf7526d16b04628",
    7047,
  ),
});

const allowedCodes = new Set<ClinicalSourceCode>(
  Object.keys(CLINICAL_SOURCES) as ClinicalSourceCode[],
);

export function isAllowedClinicalSourceCode(
  value: string,
): value is ClinicalSourceCode {
  return allowedCodes.has(value as ClinicalSourceCode);
}

export type ClinicalSourceValidation = Readonly<{
  readonly valid: boolean;
  readonly invalidReasons: readonly string[];
}>;

export function validateClinicalSourceRefs(
  refs: readonly ClinicalSourceRef[],
): ClinicalSourceValidation {
  const invalidReasons: string[] = [];
  if (refs.length === 0)
    invalidReasons.push("at least one source ref is required");

  for (const ref of refs) {
    if (!isAllowedClinicalSourceCode(ref.code)) {
      invalidReasons.push(
        "source code is not in the immutable clinical registry",
      );
      continue;
    }
    if (ref.locator.trim().length === 0) {
      invalidReasons.push("source locator is required");
    }
  }

  return Object.freeze({
    valid: invalidReasons.length === 0,
    invalidReasons: Object.freeze([...invalidReasons]),
  });
}
