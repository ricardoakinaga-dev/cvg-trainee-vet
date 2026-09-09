# Security Policy

## Supported versions

Linha principal (`main`) e branches de verificação ativas (`aaa/*`).
Sem LTS declarado; vulnerabilidades são corrigidas por upgrade direcionado +
teste completo (ver P1-01/P1-02 na baseline).

## Vulnerability disclosure

Reporte ao mantenedor (Ricardo) por canal privado com: descrição, impacto,
reprodução com fixtures sintéticas e, se possível, correção sugerida.
Não abra issue pública com exploit antes da correção. Prazo-alvo de triagem:
5 dias úteis.

## Security expectations

- Autorização server-side deny-by-default; RLS como defesa adicional.
- PostgreSQL source of truth; Qdrant derivado; IA assistiva e desligável.
- Nenhum segredo no Git; `.env.example` só placeholders (`verify:secrets`).
- Nenhum dado real (prontuário, tutor, paciente, foto, PDF) em código, seed,
  teste, log ou UI.
- Ameaças e matriz: `docs/security/threat-model.md`,
  `docs/security/authorization-matrix.md`.

## Secret handling

Ver `docs/runbooks/compromised-secret.md`. Rotação fora do Git; artefatos sem
segredos; redaction tests para logs.

## Dependency policy

Lockfile fixado; `pnpm audit --audit-level=high` no gate; upgrades de segurança
direcionados (patch/minor justificado), nunca em massa sem relação com o
objetivo. Supply-chain (CodeQL, review, OSV, SBOM, SHA-pin) em `SECURITY_SUPPLY_CHAIN`
na fase 3; Actions com SHA imutável via `scripts/pin-actions.mjs`.
