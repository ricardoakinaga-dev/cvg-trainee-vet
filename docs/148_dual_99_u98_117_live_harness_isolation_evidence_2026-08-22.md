# Evidência Dual 99 — U98-117 isolamento do harness live

**Registro:** `DUAL99-U98-117-LIVE-HARNESS-314`
**Data:** `2026-08-22T03:23:31-03:00`
**Escopo:** banco PostgreSQL descartável por execução, identidades distintas de
administração, API e worker, grants explícitos e execução live sem skip
silencioso
**Veredito:** `LOCAL_PASS_WITH_LIMITATIONS / IN_PROGRESS / PILOT_BLOCKED`

## Objetivo e recuperação do checkpoint

A revisão pré-commit encontrou um candidato local da Rodada 93 à frente do
estado persistido. O worktree já continha o executor isolado, seu contrato de
teste, a migration `0034` e a adaptação das fixtures live, enquanto estado,
log, backlog e traceability ainda declaravam esse recorte como próxima ação.
O snapshot completo foi rejeitado para commit até que a prova live e a
reconciliação documental fossem concluídas.

O teste de contrato existente caracteriza fail-closed para URL administrativa
ausente ou não PostgreSQL, gera banco e roles distintos, substitui identidades
de runtime fornecidas pelo chamador, ordena provisionamento/migração/grants/
verificação/testes e exige cleanup tanto no sucesso quanto na falha. Durante a
auditoria pré-commit, o scanner encontrou um token sintético literal nessa
fixture; o literal foi removido sem mudar o contrato, e o teste focal passou
`6/6`.

## Contrato implementado

- `CVG_TEST_ADMIN_DATABASE_URL` é obrigatória e não reutiliza a URL da aplicação;
- cada execução cria banco, role de API, role de worker e credenciais sintéticas
  com token hexadecimal validado;
- migrations rodam com a conexão administrativa; a API e o worker recebem URLs
  restritas e diferentes;
- grants de API e worker são explícitos, e a verificação rejeita
  `SUPERUSER/BYPASSRLS`, acesso da API às tabelas de IA ou contrato insuficiente
  do worker;
- o executor propaga sinais para o processo de teste, preserva a falha primária
  e sempre tenta encerrar conexões, remover o banco e remover as roles;
- as suites PostgreSQL usam a URL de administração somente para setup/teardown,
  a URL da API para o runtime e a URL do worker para consumidores;
- a migration `0034_content_withdrawal_scope_rls.sql` limita a enumeração de
  assignments durante retirada clínica ao `cvg.scope_id` corrente.

## Evidência verificável

| Gate | Resultado |
| --- | --- |
| contrato focal do harness | `6/6 PASS` |
| PostgreSQL 16 descartável | `61` arquivos / `320` testes live / `0` skips |
| migrations no banco novo | `35/35 PASS`; safety `0` destrutivas |
| cobertura integral | `206` arquivos, `1224` testes, `27` skips governados; `94,92%` statements, `90,77%` branches, `95,26%` functions, `95,64%` lines |
| focos worker/integrações/persistência/release | `105/105 + 37/37 PASS` |
| build com URL interna sintética | `12/12 PASS` |
| formato, lint, typecheck e diff-check | `PASS` |
| CI, migrations, traceability, Dual99, skips, hotspots, docs e exposure | `PASS` ou `PASS_WITH_GAPS` esperado, sem promoção |
| auditoria de dependências | nenhuma vulnerabilidade conhecida |
| scanner apó saneamento da fixture | somente quatro assignments locais ignorados e o finding genérico conhecido do histórico Git |
| cleanup | banco, roles, container PostgreSQL e shim efêmero do cliente removidos |

O host não possuía `psql`. A prova foi repetida com um shim temporário que
executou o cliente oficial da mesma imagem PostgreSQL 16 em rede local. O shim
e o container foram removidos apó o teste. Nenhum banco, role ou dado sintético
da rodada permaneceu ativo.

## Revisão e limites

A revisão geral pré-commit não confirmou CRITICAL/HIGH funcional no corte já
documentado, mas rejeitou corretamente o snapshot enquanto a Rodada 93 estava
sem evidência e sem estado. A revisão de segurança não encontrou segredo real
novo no diff e exigiu manter `.gauntlet/` fora do staging.

Este checkpoint não é release-pass:

- o Compose de produção ainda compartilha a role entre API e worker; as roles
  descartáveis provam o contrato do harness, não o deploy real;
- restore e Qdrant foram excluídos intencionalmente desta execução; provider,
  alias, scheduler/estado e lease multi-réplica continuam abertos;
- duas imagens históricas, SIGTERM/Docker real, tráfego, writers externos e a
  matriz comportamental N/N-1 ainda não foram executados;
- o gate de mutação segue declarativo e rollback com backlog ainda exige
  recuperação ou drain por um worker N saudável;
- quatro valores locais ignorados, o budget do histórico Git, secret manager,
  RC, CI/registry, IdP/TLS, backup/DR, clínica, `0/145`, UAT, aprovações humanas
  e reauditoria independente permanecem abertos.

## Arquivos principais

- `scripts/live-integration-environment.mjs` e
  `scripts/run-live-integration.mjs`;
- `tests/integration/live-integration-environment.test.ts` e fixtures
  PostgreSQL afetadas;
- `.env.example`, `.github/workflows/quality.yml` e `skip-governance.json`;
- `packages/persistence/drizzle/0034_content_withdrawal_scope_rls.sql` e
  `packages/persistence/drizzle/meta/_journal.json`.

## Disposição

O isolamento local do harness live está fechado e reproduzível. U98-117 segue
`IN_PROGRESS / PILOT_BLOCKED`: a próxima prova é a matriz comportamental com
duas imagens/digests históricos e SIGTERM/Docker real, seguida por drain seguro
do backlog, roles produtivas separadas, publisher, scheduler/lease e alias
Qdrant. Nenhum commit, push, release, score, piloto, decisão clínica ou mutação
externa foi realizado neste checkpoint.
