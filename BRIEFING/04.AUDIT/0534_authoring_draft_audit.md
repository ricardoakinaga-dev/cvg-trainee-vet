# AUDIT — criação idempotente de conteúdo autoral em `RASCUNHO`

## Escopo e decisão de limite

Esta auditoria fecha a fatia `AUTHORING-DRAFT-052`: um autor ativo, autorizado
por `AUTHOR_CONTENT` e pertencente ao escopo pode criar um item sintético em
`RASCUNHO` pela rota `POST /api/v1/content/drafts`. O servidor deriva a
identidade editorial, IDs, versão, status, projeção participante e preflight.

O recorte não publica, não aprova clinicamente, não cria atividade, não chama
IA/Qdrant e não usa conteúdo clínico real, prontuário, tutor, foto, PDF,
segredo ou dado de participante. A projeção com fonte, rubrica e gabarito é
exclusiva da superfície interna autorizada; a fronteira participante continua
redigida.

## Falha RED

Os testes focais foram escritos antes da implementação e falharam porque o
contrato de criação e o caso de uso ainda não existiam. O RED cobriu payload
strict, campos server-owned, autorização, binding curricular, projeção
server-side, preflight bloqueado, conflito de idempotência e rollback.

Uma regressão posterior também encontrou um erro de tipagem no fake do teste:
`createDraft` estava exposto somente como função de interface e não como mock.
O fake foi corrigido com `vi.mocked`, e o `tsc` passou antes do commit técnico.

## GREEN / REFACTOR

- `packages/contracts/src/authoring.ts` adiciona schema `strict` para o payload
  editorial, com códigos de fonte allowlisted, binding M01–M24, regras de
  escolhas/gabarito/rubrica e rejeição de identidade/status/preflight/
  projeção enviados pelo cliente;
- `packages/application/src/authoring-use-cases.ts` valida UUIDs, capability,
  conta ativa, escopo, currículo e conteúdo; deriva quatro IDs distintos,
  cria `RASCUNHO` versão 1, omite gabarito da projeção participante e força
  `readyForPublication: false`;
- `packages/persistence/drizzle/0036_authoring_draft_idempotency.sql` e
  `packages/persistence/src/schema.ts` materializam a chave idempotente com
  RLS `ENABLE/FORCE`, políticas separadas de `SELECT`/`INSERT`, privilégio de
  atualização/remoção revogado, FKs compostas de identidade e índices;
- `packages/persistence/src/authoring-repository.ts` usa transação,
  `pg_advisory_xact_lock`, fingerprint, replay determinístico, conflito
  explícito e auditoria atômica; o replay confere IDs, versão e escopo antes
  de reidratar o registro;
- a policy de `audit_entries` agora vincula entradas autenticadas ao
  `cvg.audit_scope_id`; o repositório valida principal, escopo, recurso e ação
  do audit de criação. Rejeições HTTP não inventam o primeiro escopo da sessão;
- `apps/api/src/http.ts` registra a rota, autentica, valida contrato, aplica
  capability e devolve somente projeção interna; `apps/api/src/server.ts`
  registra a rota para rate limit, métricas e auditoria operacional;
- `apps/web/app/authoring/page.tsx` fornece o formulário sintético, estados de
  carregamento/vazio/erro com retry, timeout de 15 s e recuperação da tentativa
  (chave + dados editoriais) em `sessionStorage`; o servidor continua sendo a
  autoridade e a recuperação é apenas um auxílio de retry. Após conflito de
  idempotência, a tela oferece explicitamente iniciar uma nova tentativa;
- a E2E cobre criação sem campos client-owned e retry após falha de carregamento
  dos escopos.

## Evidência executada

- `pnpm verify`: **PASS**, 131 arquivos, 647 testes aprovados e 35 skips
  condicionais;
- cobertura global: **84,33% statements**, **80,16% branches**, **86,04%
  functions**, **85,01% lines**;
- `pnpm build`: **PASS**, 12 workspaces, Next.js gerando as rotas web;
- E2E autoral: **5/5 PASS** (`authoring-review.spec.ts`), incluindo criação,
  retry de escopos e nova tentativa após conflito;
- E2E completa: **31/31 PASS**, incluindo accessibility, participante,
  operações e recuperação;
- focal após as correções: **91/91 PASS** em HTTP/server/governança/application;
- `pnpm verify:migrations`: **PASS**, 37 migrations alinhadas até `0036`;
- `pnpm audit --audit-level=high`: nenhum advisory conhecido;
- `pnpm verify:secrets`, `verify:ci-contract`, arquitetura, documentação,
  product-definition, exposure, lint, typecheck, Prettier e `git diff --check`:
  **PASS**;
- commits técnicos: `6630d8ca4514ce49c34fd2f013c7cacaa83adab0` e
  `f6a123462a02fefbba9168cf974d9c824b78433b` (SHA final).

## Crítica independente e correções

A primeira crítica independente encontrou cinco riscos P1: rota ausente da
telemetria/rate limit, retry inexistente para escopos, mutação sem timeout e
recuperação após reload, chave idempotente mutável/removível, replay sem
identidade composta e auditoria com fallback de escopo/policy insuficiente.
Todos foram tratados nesta rodada; os testes de rota, retry, governança,
composição de FKs, replay e auditoria foram adicionados ou atualizados antes
do commit técnico. A crítica final independente retornou **CONDITIONAL PASS**:
nenhum P0/P1 permaneceu demonstrado estaticamente; o único P2 de ergonomia
(nova tentativa após `409`) foi fechado com ação explícita na UI.

## Limites observados

`pnpm test:integration:live` saiu com código 2 porque
`CVG_TEST_DATABASE_URL` não está configurada. Portanto não há nesta sessão
prova live de PostgreSQL/RLS/grants, do privilégio negativo de `UPDATE/DELETE`,
da atomicidade sob uma role sem bypass, nem do browser→API→PostgreSQL com
persistência real. Também não há evidência de grants/owners produtivos,
workflow remoto same-SHA, collector/retention/traces externos, carga,
failover/restore, provider/MFA ou autorização clínica.

O item permanece `COMPLETED_WITH_GAPS`: a implementação local é verificável,
mas não é release, piloto, aprovação clínica nem demonstração de competência
prática.

## Alinhamento de aprendizagem e governança

As decisões de recuperação, retrieval practice, espaçamento, feedback
formativo, debrief e separação entre evidência digital e competência prática
seguem o artefato interno
[`0509_pesquisa_atual_plataformas_e_praticas.md`](0509_pesquisa_atual_plataformas_e_praticas.md).
A literatura consultada sustenta a combinação de prática de recuperação e
feedback em educação em saúde, mas não autoriza inferir competência clínica:
[revisão sistemática de retrieval/distributed practice em profissões da saúde](https://pubmed.ncbi.nlm.nih.gov/37615780/),
[framework CBVE](https://pubmed.ncbi.nlm.nih.gov/32530802/) e
[meta-análise de feedback](https://pubmed.ncbi.nlm.nih.gov/34956714/).

## Rastreabilidade

`AUTHORING-DRAFT-052` · SHA final
`f6a123462a02fefbba9168cf974d9c824b78433b` (descendente de
`6630d8ca4514ce49c34fd2f013c7cacaa83adab0`) · PRD-RF-034/035/036/038/091/096 ·
SPEC-0106/0107/0109/0111/0112/0118 · AGENTS-TDD.
