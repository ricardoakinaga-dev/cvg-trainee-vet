# Evidência Dual99 — B99-101 — crescimento de workspace e completude Git

**Data:** 2026-08-21 11:03 -03:00
**Task:** B99-101 — scanner de segredos fail-closed
**IDs:** `DUAL99-B99-101-WORKSPACE-GROWTH-303`,
`DUAL99-B99-101-GIT-BATCH-COMPLETE-304`
**Predecessora:** `docs/140_dual_99_b99_101_git_workspace_boundaries_evidence_2026-08-21.md`
**Branch:** `agent/publish-production-hardening`

## Gaps reproduzidos

Dois boundaries locais adicionais foram reproduzidos com fixtures descartáveis:

- um arquivo regular com tamanho dentro do limite no `lstat` podia crescer
  antes da leitura; a leitura sentinel retornava `MAX_SCAN_BYTES + 1`, que
  antes alcançava `scanPathBuffer` e era contabilizada como bytes consumidos;
- um parser `cat-file --batch` podia receber uma resposta limpa para apenas
  parte do conjunto solicitado e terminar sem finding, omitindo silenciosamente
  os objetos restantes.

O primeiro probe real observou `1025` bytes consumidos para um limite de `1024`
e nenhum finding antes da correção. O segundo probe com objetos sintéticos `A,B`
recebeu somente `A` e retornou `[]`. Nenhum segredo real, prontuário, fonte
clínica, PDF ou ambiente de produção foi usado.

## RED → GREEN → REFACTOR

- **Workspace growth:** o RED determinístico confirmou que o reader real, após
  uma mutação sintética entre `lstat` e leitura, retorna apenas o sentinel
  `max+1`; o scanner agora rejeita o buffer antes de `scanPathBuffer`, retorna
  `oversize-file` redigido para texto, mantém a política de asset binário
  ignorado e não consome o orçamento. O teste também cobre
  `remainingBytes < maxScanBytes` e confirma que um marcador sintético não
  aparece no resultado.
- **Git batch completeness:** o RED confirmou que `finish()` não verificava a
  cardinalidade do conjunto de objetos. O GREEN exige que todos os IDs
  solicitados tenham uma resposta única; resposta incompleta produz somente
  `history:<git> / git-object-unreadable` com evidência genérica.

## Commits de código/teste

- `87ca28d` — crescimento pós-`lstat` fail-closed e completude do stream Git;
  regressões determinísticas adicionadas em
  `tests/integration/secret-scanner.test.ts`.

## Verificação local

- foco do scanner: `76/76` passantes;
- suíte com cobertura: `205` arquivos passantes, `17` guardados, `1172`
  testes passantes e `21` guardados;
- cobertura: `95,03%` statements, `90,95%` branches, `95,31%` functions e
  `95,73%` lines;
- `pnpm format:check`: PASS;
- `pnpm lint`: PASS;
- `pnpm typecheck`: PASS;
- `pnpm verify:hotspots`: PASS, `0` hotspots;
- `CVG_API_INTERNAL_URL=http://127.0.0.1:4000 pnpm build`: PASS, `12/12`;
- `git diff --check`: PASS;
- `pnpm verify:secrets`: fail-closed somente nos quatro assignments redigidos
  preexistentes de `infra/production/.env.local`; nenhum finding novo;
- publicação: `87ca28d` enviado a
  `origin/agent/publish-production-hardening`, com `HEAD == origin` confirmado.

## Crítica, limites e decisão

A crítica independente focal encontrou uma limitação válida: a primeira
regressão usava callbacks injetados e não demonstrava o reader real. Essa
limitação foi corrigida com o reader real, mutação pós-`lstat`, sentinel
bounded, orçamento menor e verificação de redaction. A nova tentativa de
crítica integrada read-only não devolveu relatório dentro da janela e foi
encerrada; portanto não há `PASS` independente final.

Secret manager/rotação, provider/CI, RC e proveniência, WebKit aprovado,
runtime/HA/API/DB live, rollout N/N-1, retenção/RBAC/notificação externos,
clínica, `0/145`, gates externos, aprovação humana e reauditoria independente
continuam abertos. O programa permanece `IN_PROGRESS / PILOT_BLOCKED`; não há
promoção de score, release, piloto ou decisão clínica.

**Rollback:** reverter `87ca28d` somente mediante decisão registrada;
preservar as regressões de crescimento e completude Git até a mudança de
contrato ser aprovada.
