# AAA-200/201 — Contrato da jornada diagnóstico → assignment

**Revisão:** 2026-09-06  
**Versão:** `AAA-JOURNEY-1.0`  
**Estado:** `COMPLETED_WITH_GAPS` — implementação local bounded; prova live,
produção e conteúdo clínico continuam fora do gate local

## Objetivo

Fechar o primeiro trecho vertical do programa Premium: uma sessão B-07
formativa sintética finaliza no servidor, gera um resultado imutável e
materializa uma trilha inicial persistida. O participante recebe apenas a
próxima ação pública autorizada; não recebe identidade, escopo, gabarito,
recomendação interna ou identificador de assignment.

Este contrato complementa `0560_jornada_sessao_diagnostica_contract.md`. Ele
não publica o B-07, não autoriza aplicação clínica, não declara competência
prática e não inclui resposta de feedback, retenção ou debrief — esses pontos
permanecem em `AAA-203`/`AAA-204`.

## Invariantes congeladas

1. A finalização da sessão, o resultado diagnóstico e a atribuição inicial
   usam a mesma transação server-side; falha em qualquer etapa reverte o
   agregado inteiro.
2. O comando de aplicação aceita somente `diagnosticResultId` e `scopeId`.
   `participantId` é derivado do resultado persistido e nunca é escolhido pelo
   cliente.
3. A regra determinística sempre inclui `M01`, `M02` e `M11`, preserva a
   ordem curricular e agrega recomendações válidas sem duplicidade. Módulo
   inexistente ou fora do catálogo falha fechado.
4. A unicidade `(participant_id, scope_id, module_id)` impede duplicação. Um
   replay retorna as mesmas linhas; uma linha `NAO_ATRIBUIDO` só avança com
   transição de domínio e CAS. Conflito concorrente não é convertido em
   sucesso silencioso.
5. A materialização de atividade considera somente atividade `PUBLISHED`,
   módulo explícito e conteúdo `PUBLICADO` no mesmo escopo. O vínculo de
   atividade conserva a proveniência do assignment e é seguro para replay.
6. A rota interna exige capability server-side e escopo autorizado. A resposta
   do assignment é um resumo allowlisted por item (`availableAt`, `status`,
   `version` e `blockReason` opcional) e não contém `participantId`, `scopeId`,
   `assignmentId`, `diagnosticResultId`, `sourceDiagnosticResultId`, módulos
   internos, gabarito ou fontes.
7. Replay de uma linha existente só é aceito quando
   `sourceDiagnosticResultId` é nulo/legado ou corresponde ao resultado atual.
   Um vínculo de atividade já existente só é aceito quando aponta para o
   assignment materializado para o módulo atual; divergências falham fechado.

## Interfaces e evidência

| Camada | Contrato/implementação | Evidência local |
| --- | --- | --- |
| Domínio/aplicação | `assignCurriculumFromDiagnostic` e `assignedModuleIdsForDiagnosticResult` | recomendado + obrigatório, resultado ausente, conflito e entrada sem identidade |
| Persistência | `materializeCurriculumAssignmentsInTransaction` | transação, unicidade, replay, promoção CAS, atividade publicada e escopo |
| API | `POST /api/v1/internal/diagnostics/:diagnosticResultId/assign` | strict body, capability, 403/404/409/422 e resumo allowlisted sem internals |
| Jornada | finalização da sessão B-07 | resultado e assignment no mesmo caminho; replay finalizado preserva a projeção |
| Testes | application, persistence, contracts, API, migration e E2E sintético | focal pós-correção `25/25` nos contratos/aplicação/persistência/jornada; E2E final `43/43` em `.agent/artifacts/aaa-200-201-e2e-final-2026-09-06.md` |

## Critério de saída desta versão

- RED/GREEN/REFACTOR implementado e ligado ao manifesto;
- crítica independente inicial encontrou um P1 de projeção/proveniência; a
  correção foi implementada e o foco local pós-correção passou `25/25`;
- `corepack pnpm verify` local PASS: `149` arquivos/`800` testes, `42`
  skipped, cobertura `84,45%` statements, `80,18%` branches, `87,30%`
  functions e `85,19%` lines;
- build e E2E sintético permanecem verdes, sem dados reais;
- E2E sintético final passou `43/43` em portas isoladas, cobrindo
  participante, diagnóstico, recovery, autoria, operações, proxy,
  acessibilidade e visual;
- integração PostgreSQL/RLS live, concorrência real, browser → web → API →
  PostgreSQL, grants/owners produtivos, carga, restore, publicação clínica,
  piloto e release continuam gaps explícitos.
- a releitura independente pós-correção retornou `REVISE` porque não pôde
  inspecionar os arquivos atuais sob a restrição declarada; o lead não a trata
  como aprovação.

## Próxima decisão

Com ambiente descartável autorizado e `CVG_TEST_DATABASE_URL`, executar a
matriz live com role de aplicação e oracle administrativo separado, provar
RLS/corrência/rollback e depois abrir `AAA-202`. Sem essa autoridade, o
contrato permanece apto para desenvolvimento local, não para G2, produção ou
uso clínico.
