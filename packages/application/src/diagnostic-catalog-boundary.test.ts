import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { diagnosticSessionProjectionSchema } from "../../contracts/dist/diagnostic-session.js";
import {
  b07DiagnosticDraftPack,
  createDiagnosticContentSeed,
} from "@cvg/curriculum";
import {
  createB07DiagnosticSessionCatalog,
  toDiagnosticSessionProjection,
} from "./diagnostic-session-use-cases.js";

const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
describe("diagnostic catalog cross-layer public projection", () => {
  it("preserves exact session catalog/seed/blueprint hashes and a valid session120 DTO", () => {
    // Digests captured from the full120 producers before this boundary repair.
    const before = {
      catalog:
        "4635b053df0c99da67f15bd0db313240efec18c1ee1fdb72fa06a4c4ab17a6d3",
      seed: "fa7a04b3f1b81528c42848397b8c07154ac119650c6c3a3fad2fe61f465268ea",
      session:
        "48ecf4bdd12fd375daae0858978120be6a98c2fb56ca0c5b430284d2af4ece45",
      blueprint:
        "08e2edf19fefcab2cc69507b1d9e417a3f781dc4b78fa7e650be658f7cdb9dae",
    };
    const catalog = createB07DiagnosticSessionCatalog();
    const seed = createDiagnosticContentSeed(
      "44444444-4444-4444-8444-444444444444",
    );
    const session = toDiagnosticSessionProjection({
      session: {
        sessionId: "33333333-3333-4333-8333-333333333333",
        participantId: "11111111-1111-4111-8111-111111111111",
        scopeId: "44444444-4444-4444-8444-444444444444",
        diagnosticId: "B07-DIAGNOSTIC-V1",
        diagnosticVersion: "0.1.0",
        status: "EM_ANDAMENTO",
        version: 0,
        startedAt: "2026-08-26T14:00:00.000Z",
      },
      catalog: catalog.snapshot,
      answers: [],
    });
    expect(hash(catalog)).toBe(before.catalog);
    expect(hash(seed)).toBe(before.seed);
    expect(hash(session)).toBe(before.session);
    expect(hash(b07DiagnosticDraftPack)).toBe(before.blueprint);
    expect(diagnosticSessionProjectionSchema.parse(session).items).toHaveLength(
      120,
    );
    expect(seed.activity.status).toBe("RASCUNHO");
    expect(seed.contentVersions).toHaveLength(120);
  });
});
