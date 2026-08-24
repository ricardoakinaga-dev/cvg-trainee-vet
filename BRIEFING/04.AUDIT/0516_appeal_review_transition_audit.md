# 0516 — Auditoria da Transição Interna de Contestação

**Data:** 2026-08-24
**Item:** APPEAL-038 / AUD-P1-001
**Resultado final:** `PASS_WITH_GAPS` — o limite local foi implementado,
endurecido após crítica independente e validado pelos gates locais. A prova
PostgreSQL/RLS live continua explicitamente ausente sem ambiente autorizado.

## Escopo

Esta fatia endurece a transição interna existente sem implementar o motor de
recálculo. A rota aceita somente autoatribuição, decisão pelo revisor atribuído
e solicitação de recálculo pendente. `participantId` e `reviewerId` não entram
no corpo; o primeiro é resolvido do protocolo persistido e o segundo vem da
sessão autenticada. `CONCLUIR_RECALCULO` e `ENCERRAR` permanecem fora do contrato.

## Evidência consolidada

- `packages/contracts/src/learning-state.ts` define o contrato strict de
  `appealReviewTransitionRequestSchema`, com escopo e versão bounded e sem
  identidades escolhidas pelo cliente;
- `packages/application/src/appeal-review-transition-use-cases.ts` liga o ator
  autenticado à autoatribuição, exige o revisor persistido para decidir ou
  solicitar recálculo e normaliza ausência/conflito/transição inválida;
- `packages/persistence/src/appeal-review-transition-repository.ts` usa o
  contexto `cvg.appeal_review_scope_id` e atualiza somente status, versão,
  reviewer, decision e updated_at com optimistic locking;
- `packages/persistence/drizzle/0023_appeal_review_transition_rls.sql` adiciona
  a policy `UPDATE` dedicada ao escopo de revisão e substitui a policy de
  participante `FOR ALL` por `SELECT`/`INSERT`, retirando mutação de revisão do
  contexto de participante;
- `apps/api/src/http.ts` deriva `actorId` de `principal.principalId` e não
  encaminha `participantId`/`reviewerId` do corpo;
- `packages/domain/src/appeal.ts` não possui mais evento de encerramento direto;
  o caminho legado `transitionAppealState` e o contrato inseguro correspondente
  foram removidos, mantendo fechamento somente após `CONCLUIR_RECALCULO`;
- `tests/integration/postgres-appeal-review-transition.test.ts` prepara a
  prova de leitura, mutação, escopo cruzado e ausência de contexto; sem
  `CVG_TEST_DATABASE_URL`, o teste fica `SKIPPED`, nunca `PASS` live.

## TDD e verificação final

O RED inicial falhou porque o contrato, o caso de uso e a dependência HTTP
segura ainda não existiam. Depois do GREEN/REFACTOR, o conjunto focado final
passou em 6 arquivos/80 testes; a regressão de cobertura passou em 109 arquivos,
522 testes e 27 skips.

`PATH=/tmp:$PATH pnpm verify` — PASS: cobertura 84,69% statements, 80,62%
branches, 85,81% functions e 85,40% lines; format, CI contract, lint,
typecheck, contratos 64/64, worker 24/24, migrations, secrets, traceability
estrutural, arquitetura, documentação, product-definition e exposure passaram.

`PATH=/tmp:$PATH pnpm build` — PASS nos 12 workspaces.

`PATH=/tmp:$PATH pnpm test:e2e` — PASS, 22/22 cenários.

`PATH=/tmp:$PATH pnpm test:integration` — PASS nos 8 arquivos/20 testes
configurados; 25 arquivos/27 testes ficaram `SKIPPED` sem dependências live,
incluindo 1/1 do cenário APPEAL-038.

`PATH=/tmp:$PATH pnpm audit --audit-level=high` — `No known vulnerabilities
found`.

`PATH=/tmp:$PATH pnpm verify:migrations` — PASS, 24 migrations, latest
`0023_appeal_review_transition_rls`.

O critic independente read-only encontrou inicialmente dois gaps materiais:
o domínio ainda permitia `DECIDIDA → ENCERRADA` direto e o use case legado
aceitava contexto de participante. Ambos foram removidos antes do commit
`91bd3e0`; também foram adicionadas negativas HTTP para identidade injetada,
encerramento direto, ator não atribuído e versão obsoleta. A crítica não é
contada como PASS independente; o resultado é a correção verificável desses
achados.

## Gaps de fechamento

`CVG_TRACEABILITY_RELEASE=true pnpm verify:traceability` passou em worktree
limpo após o commit documental `4b564adc456f46d9518326ad197a84eb5b5dbee9`;
os paths de código/teste resolvem para commits alcançáveis e rastreados.
Também permanecem fora desta fatia: justificativa persistida, recálculo
versionado/idempotente, snapshots, `CONCLUIR_RECALCULO`, encerramento,
notificação, auditoria consultável, provider/MFA, aprovação clínica, piloto e
produção. A policy SQL e a integração live ainda precisam de prova em
PostgreSQL com role administrativa/autorizada; a ausência do ambiente não foi
convertida em PASS.

Nenhum dado real, prontuário, tutor, foto, PDF, fonte protegida ou decisão
clínica foi usado.
