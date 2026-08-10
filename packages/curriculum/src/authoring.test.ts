import { describe, expect, it } from "vitest";

import {
  createCurriculumAuthoringBank,
  createDiagnosticAuthoringBank,
  createM02AuthoringBank,
} from "./authoring.js";

const scopeId = "11111111-1111-4111-8111-111111111111";
const authorId = "22222222-2222-4222-8222-222222222222";

describe("internal authoring banks", () => {
  it("materializes M02 with internal correction metadata and automatic publication", () => {
    const bank = createM02AuthoringBank(scopeId, authorId);

    expect(bank.moduleId).toBe("M02");
    expect(bank.items).toHaveLength(33);
    expect(bank.items.every((item) => item.scopeId === scopeId)).toBe(true);
    expect(bank.items.every((item) => item.authorId === authorId)).toBe(true);
    expect(bank.items.every((item) => item.sourceRefs.length > 0)).toBe(true);
    expect(
      bank.items.every(
        (item) =>
          item.correctChoiceIds !== undefined || item.rubric !== undefined,
      ),
    ).toBe(true);
    expect(bank.publicationAuthorized).toBe(true);
    expect(bank.sourceVerification).toBe("VERIFICADO_AUTOMATICAMENTE");
    expect(bank.status).toBe("PUBLICADO");
  });

  it("materializes the full curriculum and the 120-item diagnostic bank", () => {
    const curriculum = createCurriculumAuthoringBank(scopeId, authorId);
    const diagnostic = createDiagnosticAuthoringBank(scopeId, authorId);

    expect(curriculum).toHaveLength(24);
    expect(curriculum.every((bank) => bank.items.length > 0)).toBe(true);
    expect(diagnostic.items).toHaveLength(120);
    expect(
      diagnostic.items.every(
        (item) =>
          item.correctChoiceIds !== undefined || item.rubric !== undefined,
      ),
    ).toBe(true);
    expect(JSON.stringify(diagnostic)).toContain("PUBLICADO");
  });

  it("does not expose internal authoring fields in the participant projection input", () => {
    const bank = createM02AuthoringBank(scopeId, authorId);
    const participantItem = bank.items[0]?.participant;

    expect(participantItem).toBeDefined();
    expect(JSON.stringify(participantItem)).not.toContain("sourceRefs");
    expect(JSON.stringify(participantItem)).not.toContain("correctChoiceIds");
    expect(JSON.stringify(participantItem)).not.toContain("rubric");
    expect(JSON.stringify(participantItem)).not.toContain("authorId");
  });

  it("rejects non-UUID authoring identities before materialization", () => {
    expect(() => createM02AuthoringBank("scope-invalido", authorId)).toThrow();
    expect(() => createM02AuthoringBank(scopeId, "author-invalido")).toThrow();
  });
});
