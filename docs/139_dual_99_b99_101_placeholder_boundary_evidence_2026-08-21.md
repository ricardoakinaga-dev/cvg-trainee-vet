# Evidência Dual99 — B99-101 — fronteira de placeholders do scanner

**Data:** 2026-08-21 08:33 -03:00
**Task:** B99-101 — scanner de segredos fail-closed
**ID:** `DUAL99-B99-101-PLACEHOLDER-SUFFIX-290`
**Commit de código/teste:** `2c0a35fac6b68ec375964d3211885551e3c1e433`
**Branch:** `agent/publish-production-hardening`

## Gap reproduzido

`isSyntheticPlaceholder` removia tudo depois de `&` ou `#` antes de consultar a
allowlist. Em fixtures, isso permitia que um valor como
`<synthetic>#<conteúdo>` ou `synthetic-token&<conteúdo>` herdasse a isenção do
prefixo e escondesse um segredo no sufixo.

O RED adicionou o teste `does not let a synthetic placeholder hide a secret
suffix`. Antes da correção, os dois casos retornavam zero findings; a asserção
esperava dois findings `sensitive-assignment`.

## Correção

- a comparação de placeholder passou a ser exata, sem truncar query ou
  fragmento;
- os dois URLs sintéticos históricos legítimos continuam cobertos por uma
  allowlist explícita e limitada: `&form=1` e `&locale=pt-BR` após tokens
  sintéticos conhecidos;
- nenhum sufixo arbitrário recebe isenção;
- o código não recebe segredo, PDF, fonte clínica ou dado real.

## Verificação

- RED: `0` findings para os dois casos antes do fix;
- GREEN: `65/65` testes do scanner passaram;
- cobertura: `205` arquivos passantes, `17` guardados, `1161` testes passantes,
  `21` guardados; `95,03%` statements, `90,95%` branches, `95,31%` functions,
  `95,73%` lines;
- `pnpm format:check`: PASS;
- `pnpm lint`: PASS;
- `pnpm typecheck`: PASS;
- `pnpm verify:ci-contract`: PASS;
- `pnpm verify:hotspots`: PASS, zero hotspots, scanner com `799` linhas;
- `CVG_API_INTERNAL_URL=http://127.0.0.1:4000 pnpm build`: PASS, `12/12`;
- `pnpm verify:secrets`: falha fail-closed somente nos quatro assignments
  redigidos preexistentes de `infra/production/.env.local`; nenhum novo finding
  foi introduzido;
- `git diff --check`: PASS.

## Limites e decisão

O commit foi publicado no branch remoto. A crítica foi fresca e read-only, mas
não independente porque o backend de critic continua indisponível. Secret
manager/rotação, provider/CI, RC/runtime, WebKit aprovado, PostgreSQL/RLS live,
clínica, `0/145`, gates externos, aprovação humana e reauditoria independente
continuam abertos. O resultado não promove score, release, piloto ou decisão
clínica.

**Rollback:** reverter o commit `2c0a35f` caso a allowlist explícita deixe de
corresponder ao contrato aprovado; preservar o teste de regressão até existir
uma decisão documentada de mudança de contrato.
