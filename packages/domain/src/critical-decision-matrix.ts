export type CriticalDecision =
  "NOTA" | "GABARITO" | "PUBLICACAO" | "PERMISSAO" | "ESTADO";

export type CriticalDecisionOutcome = "ACEITO" | "REJEITADO" | "PENDENTE";

export type CriticalDecisionCase = Readonly<{
  readonly decision: CriticalDecision;
  readonly caseId: string;
  readonly outcome: CriticalDecisionOutcome;
  readonly expected: string;
}>;

const decisionCase = (
  decision: CriticalDecision,
  caseId: string,
  outcome: CriticalDecisionOutcome,
  expected: string,
): CriticalDecisionCase =>
  Object.freeze({ decision, caseId, outcome, expected });

export const criticalDecisionMatrix: readonly CriticalDecisionCase[] =
  Object.freeze([
    decisionCase("NOTA", "NOTA-APROVADA", "ACEITO", "APROVADO"),
    decisionCase("NOTA", "NOTA-REFORCO", "REJEITADO", "REFORCO"),
    decisionCase("NOTA", "NOTA-PENDENTE", "PENDENTE", "PENDENTE_DADOS"),
    decisionCase(
      "GABARITO",
      "GABARITO-PUBLICO-SEM-CHAVE",
      "ACEITO",
      "PUBLIC_PROJECTION",
    ),
    decisionCase(
      "GABARITO",
      "GABARITO-PUBLICO-COM-CHAVE",
      "REJEITADO",
      "PUBLIC_PROJECTION_REJECTED",
    ),
    decisionCase("PUBLICACAO", "PUBLICACAO-COM-REVISAO", "ACEITO", "PUBLICADO"),
    decisionCase(
      "PUBLICACAO",
      "PUBLICACAO-SEM-GATE",
      "REJEITADO",
      "PUBLICATION_REJECTED",
    ),
    decisionCase("PERMISSAO", "PERMISSAO-STAFF-SCOPED", "ACEITO", "AUTHORIZED"),
    decisionCase(
      "PERMISSAO",
      "PERMISSAO-PARTICIPANT-CROSS-SCOPE",
      "REJEITADO",
      "DENIED",
    ),
    decisionCase("ESTADO", "ESTADO-TRANSICAO-VALIDA", "ACEITO", "ATRIBUIDO"),
    decisionCase(
      "ESTADO",
      "ESTADO-TRANSICAO-ILEGAL",
      "REJEITADO",
      "STATE_REJECTED",
    ),
    decisionCase(
      "ESTADO",
      "ESTADO-IDEMPOTENT-REPLAY",
      "ACEITO",
      "IDEMPOTENT_REPLAY",
    ),
    decisionCase(
      "ESTADO",
      "ESTADO-IDEMPOTENT-CONFLICT",
      "REJEITADO",
      "IDEMPOTENCY_CONFLICT",
    ),
  ]);

const outcomeSet = (...outcomes: CriticalDecisionOutcome[]) =>
  Object.freeze(outcomes);

const requiredOutcomes: Readonly<
  Record<CriticalDecision, readonly CriticalDecisionOutcome[]>
> = Object.freeze({
  NOTA: outcomeSet("ACEITO", "REJEITADO", "PENDENTE"),
  GABARITO: outcomeSet("ACEITO", "REJEITADO"),
  PUBLICACAO: outcomeSet("ACEITO", "REJEITADO"),
  PERMISSAO: outcomeSet("ACEITO", "REJEITADO"),
  ESTADO: outcomeSet("ACEITO", "REJEITADO"),
});

export function validateCriticalDecisionMatrix(
  matrix: readonly CriticalDecisionCase[],
): readonly string[] {
  const errors: string[] = [];
  const caseIds = new Set<string>();
  for (const entry of matrix) {
    if (caseIds.has(entry.caseId)) {
      errors.push("duplicate critical decision case " + entry.caseId);
    }
    caseIds.add(entry.caseId);
  }

  for (const [decision, outcomes] of Object.entries(requiredOutcomes) as [
    CriticalDecision,
    readonly CriticalDecisionOutcome[],
  ][]) {
    const decisionCases = matrix.filter((entry) => entry.decision === decision);
    if (decisionCases.length === 0) {
      errors.push("critical decision " + decision + " has no cases");
      continue;
    }
    for (const outcome of outcomes) {
      if (!decisionCases.some((entry) => entry.outcome === outcome)) {
        errors.push(
          "critical decision " + decision + " has no " + outcome + " outcome",
        );
      }
    }
  }

  return Object.freeze(errors);
}
