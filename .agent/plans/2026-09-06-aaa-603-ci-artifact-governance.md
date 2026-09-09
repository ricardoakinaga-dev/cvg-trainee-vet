# AAA-603 — Governança determinística de CI e artefatos

## Objetivo

Fechar a fatia local de reprodutibilidade e proveniência do pipeline sem
alegar evidência de GitHub Actions que ainda não foi executada. O pipeline deve
verificar que o checkout corresponde ao SHA esperado, produzir um SBOM
determinístico, gerar manifesto SHA-256 e rejeitar padrões de segredo/redaction
nos artefatos publicados.

## Limites

- Node e pnpm já fixados no repositório; não adicionar fornecedor externo nem
  depender de download não fixado.
- O gerador usa apenas Node.js e o lockfile/saída local do pnpm.
- O teste local valida contrato, determinismo, hashes e redaction sintética.
- Retenção, ACL, execução real do workflow, assinatura externa e inspeção de
  artefato continuam dependentes de GitHub/owner humano.

## RED → GREEN → REFACTOR

1. RED: exigir no contrato o mesmo-SHA antes da instalação e o passo de
   governança/publicação com SBOM, manifesto e redaction.
2. GREEN: adicionar o passo workflow, o gerador/verificador local e os testes
   determinísticos.
3. REFACTOR: manter saída sem segredos, paths explícitos, ordenação estável e
   validação estática contra drift do workflow.

## Critério de pronto local

Contrato CI, testes focais, format, lint, typecheck, build e `git diff --check`
passam. O artefato de evidência registra as limitações que não podem ser
provadas sem execução remota.
