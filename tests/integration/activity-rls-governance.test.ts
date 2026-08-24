import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workspaceRoot = resolve(process.cwd());
const migration0031Path = join(
  workspaceRoot,
  "packages/persistence/drizzle/0031_learning_activity_participant_rls_hardening.sql",
);
const migration0032Path = join(
  workspaceRoot,
  "packages/persistence/drizzle/0032_learning_activity_journey_visibility.sql",
);

describe("learning activity RLS contract", () => {
  it("preserves every persisted journey assignment state", async () => {
    const migration = await readFile(migration0032Path, "utf8");

    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION cvg_learning_activity_for_participant",
    );
    for (const status of [
      "ATRIBUIDO",
      "DISPONIVEL",
      "EM_ANDAMENTO",
      "CONCLUIDO",
      "EM_REFORCO",
      "CONCLUIDO_COM_RETENCAO_PENDENTE",
      "PAUSADO",
      "BLOQUEADO",
    ]) {
      expect(migration).toContain(`'${status}'`);
    }
  });

  it("keeps participant content reads bounded to startable assignments", async () => {
    const [migration0031, migration0032] = await Promise.all([
      readFile(migration0031Path, "utf8"),
      readFile(migration0032Path, "utf8"),
    ]);

    expect(migration0031).toContain(
      "CREATE OR REPLACE FUNCTION cvg_learning_activity_for_participant",
    );
    expect(migration0032).toContain(
      "CREATE OR REPLACE FUNCTION cvg_learning_activity_content_for_participant",
    );
    expect(migration0032).toContain(
      "AND assignment.status IN ('DISPONIVEL', 'EM_ANDAMENTO', 'EM_REFORCO')",
    );
    expect(migration0032).toContain(
      "cvg_learning_activity_content_for_participant(",
    );
    expect(migration0032).toContain(
      'DROP POLICY "learning_activity_items_participant_select_policy"',
    );
  });
});
