# AUDIT-REM-09 — contrato documental de restore e migrations

**Data:** 2026-10-02  
**Estado:** IN_PROGRESS; drill histórico sintético passou, com gaps operacionais registrados.

## Evidência observada

- No modo local sem URL externa de origem, `write-restore-summary.mjs` prepara
  PostgreSQL 16 descartável, aplica o manifesto de migrations corrente e chama
  o verificador de restore.
- `verify-postgres-restore.mjs` grava marcador sintético na origem, cria dump
  custom, restaura em um banco de nome aleatório com
  `--exit-on-error --no-owner --no-privileges`, verifica o marcador e limpa
  tabela auxiliar, banco-alvo e diretório temporário.
- `rtoMs` cobre dump, criação do destino, restore e leitura do marcador. Não
  mede a recuperação operacional completa nem migrations pós-snapshot.
- Follow-up local: produtor e gate agora usam o contrato versionado
  `cvg-restore-summary/v2`. A duração parcial está em
  `verificationDurationMs`; o gate exige SHA válida same-candidate, marcador
  verificado, destino isolado e integridade, além de rejeitar formato v1,
  alias `rtoMs` e duração ausente, negativa ou fracionária. O helper de
  produção e as rejeições do gate têm cobertura de teste.
- Registros correntes de SPEC, backlog e traceability agora rotulam os 2.581 ms
  como duração parcial, não RTO operacional. Arquivos históricos e log
  append-only foram preservados; esta nota fornece a interpretação corrigida.
- `verify:migrations` valida nomes, contagem, índices contíguos e tags dos SQLs
  do repositório contra `meta/_journal.json`; não consulta o banco restaurado.
- O journal atual encerra em `0054_aaa_content_indexer_service`; a inspeção do
  verificador confirma 55 migrations de `0000` a `0054`.
- O executor `scripts/verify-restore-migrations.mjs` cria uma fixture até
  `0053_aaa_content_integrity`, faz dump/restore isolado `--no-owner`, confere
  o marcador e o prefixo de hash/timestamp, aplica a pendente `0054` e valida
  o head final, quatro policies, `ENABLE/FORCE RLS` e ownership de
  `content_versions`/`ai_suggestions`. A migration pendente passa sob o role
  restaurador `NOSUPERUSER NOBYPASSRLS`.

## Contrato documental registrado

Restaurar primeiro em destino PostgreSQL 16 vazio e isolado; confirmar formato,
integridade, versão do schema/journal e compatibilidade com a versão-alvo;
aplicar somente migrations posteriores ao snapshot; validar constraints,
owners, grants, RLS e integridade antes de writes. Metadado ausente ou
incompatível exige abortar antes de writes e investigar em destino descartável.
O runbook deixa explícito que `verify:migrations` não compara o backup com o
banco nem valida seu journal persistido.

## Trabalho restante

- Cobrir abort para snapshot incompatível/corrompido, validar constraints e
  grants de um ambiente autorizado e confirmar o principal de migration
  aprovado. A fixture histórica local exige o principal privilegiado
  `postgres`: com um role sem `BYPASSRLS`, a cadeia reproduziu recursão na
  policy de `learning_activities` durante a migration `0030`.
- Executar qualquer drill adicional somente em ambiente descartável H-LIVE e
  comparar medições com RNF-015/D-107 sem tratá-las como prova de produção.

O baseline desta nota começou por inspeção estática/documental; o drill
descartável executado em seguida está registrado na seção de verificação
abaixo. Nenhum banco externo ou produção foi acessado.

## Verificação do contrato v2 — 2026-10-02

- TDD: cinco casos negativos do gate falharam antes da primeira correção; a
  suíte `tests/integration/triple-aaa-verifier.test.ts` então passou 31/31. O
  critic fresh encontrou dois P2 adicionais: SHA não ligada ao same-SHA e
  isolamento do destino não exigido. RED reproduziu ambos; após ampliar o
  contrato para exigir SHA válida, marcador verificado e destino isolado, a
  suíte passou 35/35.
- Typecheck, ESLint focal, `verify:documentation`, `verify:traceability` e
  `git diff --check` passaram. Prettier passou após alinhar os dois arquivos
  com diferenças de formatação; o estado de orquestração minificado segue o
  formato local desse ledger.
- O scan de segredos e `node --check` nos quatro scripts alterados também
  passaram.
- O follow-up fresh confirmou os dois P2 de código fechados e encontrou uma
  lacuna na checklist manual de `docs/53`. A lista de aceitação foi alinhada
  com v2, SHA, status, marcador, isolamento, integridade e duração. Uma última
  revisão fresh está pendente; o pacote não foi marcado como aprovado.
- Após o ajuste de `docs/53`, `verify:documentation`, `verify:traceability`,
  Prettier e `git diff --check` passaram novamente.
- O terceiro review observou que G45 ainda omitia o valor explícito `PASS`;
  a linha foi corrigida e os mesmos quatro gates documentais passaram. Uma
  revisão fresh final da checklist/matriz está pendente.
- A quarta revisão pediu que G45 explicite duração como inteiro seguro não
  negativo e que não seja RTO operacional; a matriz foi alinhada e documentação,
  traceability, Prettier e diff-check passaram novamente. Parecer fresh final
  ainda pendente.
- O critic fresh final retornou **PASS** para §125.13, §23 e G45; o fingerprint
  anterior/posterior coincidiu. Esse PASS é restrito à paridade do contrato;
- REM-09 segue `IN_PROGRESS` para evidência operacional e residual.
- O drill opt-in passou `4/4` em Node 22.23.2; saída direta:
  `status=PASS`, snapshot `0053_aaa_content_integrity`, target/repository head
  `0054_aaa_content_indexer_service`, `appliedMigrationTags=[0054]`, marcador,
  histórico, RLS/policies, owner e privilégio do role verificados. A duração
  local foi `verificationDurationMs=1764`; é parcial e não representa RTO.
- RED reproduziu ausência do executor, journal fora de ordem e timestamps
  incompatíveis. GREEN passou unitários e drill `4/4`; typecheck, ESLint
  focal, Prettier, `verify:migrations` (55, head 0054), `verify:secrets`,
  sintaxe e diff-check passaram. Cleanup removeu o cluster, os bancos e os
  arquivos temporários.
- Após sincronizar os documentos também passaram `verify:documentation`,
  `verify:traceability`, `verify:audit-consistency` e
  `verify:product-definition`; o ledger `.orchestrate` foi parseado.
- Gaps: grants/constraints de ambiente real, abort de backup corrompido,
  validação do principal privilegiado contra o contrato operacional e prova
  de RPO/RTO. O status permanece `IN_PROGRESS`; nenhum aceite de produção é
  inferido.

## Follow-up da crítica fresh P1/P2 — 2026-10-02

- O critic fresh encontrou P1: o cluster do drill escolhia uma porta TCP sem
  vincular a identidade da conexão ao processo local antes de executar DDL.
  Também encontrou P2: a validação conferia nomes/RLS, mas não tabela,
  comando, roles e predicados das policies.
- O executor agora inicia PostgreSQL com `listen_addresses` vazio e socket Unix
  em diretório temporário privado. Confere PID e diretório do `postmaster` antes
  de DDL; todos os clientes e ferramentas usam o socket, e a conexão final
  exige `inet_client_addr() IS NULL`. O writer de evidência local delega ao
  executor histórico; o modo externo permanece explicitamente opt-in.
- `restore-policy-contract.mjs` valida as quatro policies por nome, tabela,
  permissividade, `public`, comando, contexto `content-indexer`, status
  publicado e vínculo `content_id`/`version` em `content_versions`. O teste RED
  provou que a versão anterior aceitava `NOT(service_role)`; a suíte também
  cobre `COALESCE(service_role, true)`. A implementação GREEN rejeita `NOT`,
  `OR`,
  `CASE` e chamadas de função fora da allowlist, preservando agrupamentos
  canônicos `AND`/`WHERE` emitidos pelo PostgreSQL 16.
- Durante a integração, um argumento `listen_addresses=''` chegou ao processo
  com aspas literais e impediu a inicialização antes de readiness/DDL; foi
  corrigido para valor vazio, e erros de stderr agora aparecem no diagnóstico.
  A primeira leitura mais estrita do catálogo também rejeitou os tokens de
  agrupamento `AND`/`WHERE`; a allowlist foi ajustada e o drill voltou a passar.
- RED/GREEN final: `CVG_RUN_RESTORE_MIGRATION_DRILL=true` com os testes de
  migration e policy passou 7/7 em Node 22.23.2. Execução direta do script
  retornou `status=PASS`, `targetIsolated=true`, `privateSocketVerified=true`,
  snapshot `0053_aaa_content_integrity`, head alvo/repositório
  `0054_aaa_content_indexer_service`, marker, journal, RLS, policies, owners e
  role corretos. `verificationDurationMs=1645` cobre o fixture histórico
  sintético completo; é medição parcial, não RTO. Cleanup removeu o cluster,
  bancos e arquivos temporários.
- Nova crítica fresh integrada está pendente. REM-09 continua `IN_PROGRESS`:
  faltam grants/constraints do ambiente autorizado, abort para snapshot
  incompatível/corrompido e confirmação do principal de migration aprovado.
  Global permanece `WAITING_HUMAN_APPROVAL`; nenhuma origem externa ou produção
  foi acessada.

## Follow-up de escopo da policy — 2026-10-02

- Uma regressão RED demonstrou que os vínculos `content_id`/`version` e o
  status publicado podiam ser encontrados em duas subconsultas diferentes,
  permitindo que a policy passasse sem restringir a versão ligada ao
  `ai_suggestion`.
- O contrato agora exige a expressão canônica do PostgreSQL 16 com os dois
  vínculos e `version_record.status='PUBLICADO'` dentro da mesma `EXISTS` de
  `content_versions`, sob o alias `version_record`. Testes de policy passaram
  3/3, incluindo o decoy entre subconsultas.
- O drill opt-in de migration/policy passou 7/7. Execução direta retornou PASS
  com socket privado verificado e `verificationDurationMs=1695` para o fixture
  histórico completo. Cleanup removeu o cluster, bancos e arquivos temporários.
- Nova crítica fresh read-only segue pendente. REM-09 permanece `IN_PROGRESS`
  com gaps de grants/constraints, snapshot incompatível/corrompido e principal
  operacional; o estado global continua `WAITING_HUMAN_APPROVAL`.

## Follow-up de expressão completa da policy — 2026-10-02 (14:42)

- RED reproduziu aceite de um decoy `EXISTS` com `status='PUBLICADO'` para a
  policy de `content_versions`. O helper agora compara a expressão completa
  normalizada, exigindo status publicado na linha-alvo; `ai_suggestions`
  continua exigindo `content_id`, `version` e status na mesma subconsulta.
- O catálogo real de PostgreSQL 16 foi inspecionado e o fixture positivo
  ajustado aos parênteses emitidos. Em Node 22.23.2, testes focais de policy
  passaram 3/3, integração opt-in passou 7/7 e o drill direto retornou PASS
  (`targetIsolated=true`, `privateSocketVerified=true`) com
  `verificationDurationMs=1668` no fixture completo. Cleanup removeu cluster,
  bancos e temporários.
- Aguardam critic fresh e sync Gauntlet. Permanecem gaps de grants,
  constraints, abort para snapshot incompatível/corrompido e validação do
  principal de migration. Sem alegação de RTO ou aprovação operacional.

## Follow-up de casts do predicado — 2026-10-02 (14:50)

- RED provou que remover `::text` durante a normalização fazia
  `status::text` coincidir com a expressão permitida. GREEN preserva casts;
  somente whitespace, pontuação e caixa fora dos literais SQL são normalizados.
- Node 22.23.2: teste focal 3/3, integração opt-in PG16 7/7 e drill direto
  PASS (`targetIsolated=true`, `privateSocketVerified=true`), com
  `verificationDurationMs=1664`. Cleanup removeu cluster, bancos e temporários.
- Critic fresh segue pendente. Grants/constraints, snapshot incompatível e
  principal aprovado permanecem sem evidência operacional.

## Tentativa de crítica independente sem veredito — 2026-10-02 (15:08)

- O revisor fresh-context foi encerrado após permanecer `running` por cerca de
  seis minutos e não produziu parecer. Pedido explícito para retornar achados
  ou declarar ausência de veredito também não teve resposta.
- Fingerprint oficial pré/pós: `594920cbd4cb7c80e50e4d78eade6376309713e099dd939e9ba845f17ddc17a1`; hash
  do conjunto de escopo pré/pós: `4f4caefbe78df62bf3de28ccd89f55e412a138ec1149e92f924e613167cf9934`;
  hash do status do Git e contagem de 148 caminhos também coincidiram.
- Nenhum PASS foi inferido; Gauntlet permanece stale e não foi rebaselineado.

## Preflight de archive e aborto antes do banco-alvo — 2026-10-02 (15:19)

- TDD: a asserção opt-in dos campos `snapshotPreflightVerified` e
  `corruptSnapshotAbortVerified` falhou antes da implementação.
- O drill agora valida archive custom válido executando `pg_restore --list` e
  extraindo o conteúdo para SQL temporário privado antes de criar o destino.
  A cópia sintética corrompida altera o primeiro byte do magic header e é
  rejeitada pelo mesmo preflight; consulta ao catálogo prova que o banco-alvo
  continua ausente. O SQL temporário é removido em sucesso e falha.
- Node 22.23.2: `tests/integration/restore-migrations.test.ts` passou 4/4 e o
  conjunto opt-in migration/policy passou 7/7. Execução direta PostgreSQL 16
  retornou PASS com os dois campos verdadeiros e
  `verificationDurationMs=1730`; cleanup removeu cluster, bancos e arquivos.
- A evidência é limitada a archive custom sintético e corrupção de cabeçalho.
  Não demonstra incompatibilidade semântica do schema, backup fornecido,
  grants/constraints produtivos, principal de migration aprovado ou RPO/RTO.
- A crítica fresh anterior não teve veredito. Nenhum PASS de review foi
  inferido; Gauntlet continua `ACTIVE/FIX_RETEST/STALE`, sem rebaseline.

## Estado das críticas fresh — 2026-10-02 (15:46)

- A primeira crítica fresh retornou `APPROVE`, mas o fingerprint Gauntlet
  divergiu: mudou somente o arquivo ignorado de cache
  `node_modules/.vite/vitest/da39a3ee5e6b4b0d3255bfef95601890afd80709/results.json`
  durante o teste executado pelo revisor. O hash do diff tracked/untracked
  permaneceu `404dfacb6d598ee5cda1cb7716004c979703a337cce299d9aee677cf7228bd04`.
  Pelo contrato de crítica read-only, o parecer é `INVALID`; o cache foi
  preservado, sem limpeza ou edição do conteúdo.
- Uma segunda crítica fresh recebeu pacote selado sem comandos que gravem
  caches. Ficou `running` por cerca de 150 segundos; após pedido de conclusão
  e interrupção, foi fechada ainda `running`, sem veredito. Fingerprint
  Gauntlet pré/pós coincidiu em
  `91ff3be61e12b4c3fe4c1b9215d405c0ae15cefeb6c3968368a0db5196676256`.
- Não há crítica fresh válida nesta etapa. O estado oficial permanece
  `ACTIVE/FIX_RETEST/STALE`; nenhuma evidência foi rebaselineada.

## Paridade do catálogo estrutural — 2026-10-02 (15:51)

- RED exigiu `constraintsVerified=true` no resultado do drill; a integração
  passou a falhar porque não havia comparação entre o banco de origem e o alvo.
- GREEN compara, para `content_versions` e `ai_suggestions`, colunas (tipo,
  nulabilidade, identidade/geração e default), constraints catalogadas e
  validadas, e índices (unique/primary, valid/ready e definição) da origem
  sintética `0053` com o alvo restaurado após migration `0054`.
- Em Node 22.23.2, `restore-migrations.test.ts` passou 4/4 e o conjunto
  migration/policy opt-in passou 7/7 com `--no-cache`; SHA-256 de
  `node_modules/.vite/vitest/.../results.json` permaneceu igual durante a
  execução sem cache. O drill direto retornou PASS, `constraintsVerified=true`
  e `verificationDurationMs=1723`.
- Isso não valida constraints fora das duas tabelas, grants de produção,
  backup externo, incompatibilidade semântica ou principal de migration.
  Crítica fresh válida permanece pendente; Gauntlet não foi rebaselineado.

## Revalidação sem cache — 2026-10-02 (16:00)

- Repetição final no Node 22.23.2: `restore-migrations` 4/4 e suíte combinada
  migration/policy 7/7 com Vitest `--no-cache`. O SHA do cache Vitest ignorado
  permaneceu `6013aaa8f1bb8d6ac472f678d1a2328e30c40de66b01d195c9a5656c48035ef8`.
- O drill PostgreSQL 16 descartável retornou `status=PASS`,
  `snapshotPreflightVerified=true`, `corruptSnapshotAbortVerified=true`,
  `constraintsVerified=true` e `verificationDurationMs=1762`.
- A evidência continua limitada a duas tabelas sintéticas e corrupção de
  cabeçalho antes da criação do alvo. Não prova incompatibilidade semântica,
  backup externo, grants ou constraints do banco inteiro, principal autorizado
  ou RPO/RTO operacional. Revisão fresh bounded e sync oficial Gauntlet seguem
  pendentes; não houve rebaseline.

## Rejeição de divergência estrutural e crítica sem veredito — 2026-10-02 (16:19)

- O SPEC 0118 §32 fornece o oracle contratado para as duas tabelas. RED falhou
  pela ausência do módulo comparador; GREEN extraiu
  `restoreIntegrityCatalogMatches` e o drill usa o mesmo helper. Testes cobrem
  catálogo igual, diferenças de tipo/constraint/índice, metadata ausente,
  constraint não validada e índice não pronto.
- Teste focal: 6 passed/1 skipped sem opt-in. Suíte PG16 migration/policy:
  10/10 com `--no-cache`; SHA do cache preexistente estável. Drill direto
  `status=PASS`, flags de preflight/catálogo verdadeiros e
  `verificationDurationMs=1774`.
- A crítica C3 foi encerrada sem parecer após pedido de conclusão. Fingerprint
  oficial completo pré/pós coincidiu em
  `1175c8824ab98a2924e53d5c97764065a320118c81304cf41cbd5b540393b4c9`; não há
  veredito aceito nem rebaseline.
- O teste verifica rejeição de desvios do catálogo nas duas tabelas; não cria
  archive legível com journal válido e schema semanticamente incompatível.
  Outras tabelas, grants produtivos, principal aprovado e operação continuam
  sem evidência.

## Crítica fresh C4 bounded — 2026-10-02 (16:48)

- Newton, em contexto fresh sealed e somente leitura, retornou `APPROVE` para o
  delta então corrente: paridade estrutural das duas tabelas e correção das
  dependências de produção. Confirmou limites sintéticos do runbook e que o
  verificador independente para origem externa valida marcador, sem catálogo.
- Fingerprint oficial completo, incluindo `.gauntlet`, coincidiu antes/depois:
  `38bdac60a9ef3aa8144d6369abe0fdf252141436c5719daeb388daf41629ce6b`;
  43.357 entradas e mesmo HEAD. O revisor não executou testes nem alterou o
  worktree. O parecer é bounded e não aprova a remediação global; não houve
  rebaseline.

## Rejeição de drift em archive com journal válido — 2026-10-02 (16:54)

- RED: a integração opt-in falhou pela ausência do campo
  `semanticSnapshotMismatchRejected`. GREEN gera segunda archive custom a
  partir da origem sintética após adicionar coluna extra em
  `content_versions`, preservando o histórico Drizzle até `0053`. O preflight
  lê e decodifica a archive; o alvo restaura e aplica `0054`; o journal segue
  válido e o comparador contra o catálogo de referência limpo rejeita o drift.
- Sob Node 22.23.2, `restore-migrations.test.ts` passou 7/7 com o caso PG16
  opt-in. Execução direta PostgreSQL 16 retornou PASS com
  `semanticSnapshotMismatchRejected=true`, demais flags verdadeiros e
  `verificationDurationMs=2172`; limpeza removeu cluster, bancos/roles e
  temporários.
- A fixture cobre uma alteração estrutural controlada em `content_versions`;
  não generaliza para backup externo, schema arbitrário ou outros objetos.
  REM-09 permanece `IN_PROGRESS`; C5 fresh e gates operacionais/humanos ainda
  são necessários.

## Crítica fresh C5 — 2026-10-02 (17:09)

- Reviewer Peirce, fresh sealed e read-only, retornou `APPROVE` sem achados
  para o novo cenário: journal válido em `0053`, coluna sintética extra,
  preflight, restore, aplicação de `0054`, rejeição pelo comparador e cleanup.
  Confirmou que runbook/SPEC limitam a evidência a esse drift estrutural
  controlado e não fazem claim de archive externo ou RPO/RTO.
- Fingerprint oficial completo pré/pós, incluindo `.gauntlet`, coincidiu em
  `673584d9c4ed3c2674a2fc53a6a99456212d899859ad840759fb541826c2a6da`;
  43.357 entradas e HEAD igual. Crítica estática; não executou testes ou alterou
  arquivos. Não houve rebaseline, e o Gauntlet global continua stale.
- A aprovação é bounded ao estado revisto e não fecha REM-09. Grants, outras
  tabelas, archive externo, principal de migration, RPO/RTO e decisões humanas
  continuam pendentes.

## Matriz local de grants no restore — 2026-10-02 (17:24)

- RED: o teste opt-in exigiu os sinais de grants/capacidades; o drill falhou
  porque ainda não aplicava nem verificava a matriz de role da aplicação.
- GREEN: após restaurar `0053` e aplicar `0054`, o fixture executa o
  `roleProvisionSql` do provisionador local de CI com migration/app/admin roles
  sintéticos separados. Consulta privilégios efetivos em todas as relações da
  schema pública e compara com `applicationTablePrivileges`.
- A verificação exige o conjunto exato de grants do app role, nega acesso a
  `knowledge_documents`, confirma ausência de ownership e capabilities elevadas,
  e cria uma tabela após provisionamento para provar default-deny.
- Node 22.23.2: `restore-migrations`, `restore-policy-contract` e
  `migration-governance` passaram 40/40 com `--no-cache`; execução direta PG16
  retornou PASS com os quatro novos flags verdadeiros e
  `verificationDurationMs=2186`. Lint e typecheck passaram. O primeiro
  `format:check` detectou diferenças; após ajuste com `apply_patch`, o formato
  final e os gates documentais passaram.
- Limite: prova somente a matriz do provisionador local em destino sintético;
  não atesta grants/ownership produtivos nem aprova o principal operacional de
  migration. REM-09 segue `IN_PROGRESS`, sem commit/deploy ou rebaseline global.
- Pós-sincronização: lint/typecheck/format, Prettier focal, documentation,
  traceability, audit-consistency, product-definition, exposure, CI contract,
  migrations, secrets, audit de produção, parse do ledger e diff-check passaram.
  `verify:evidence-consistency` falha somente pela exigência de mutation run ID
  genuíno de candidato committed; coverage e audit estão consistentes.

## Credenciais efêmeras sem exposição em argv — 2026-10-02 (17:37)

- A revisão local encontrou senha sintética nos argumentos `psql --command`.
  O provisionamento agora escreve o SQL com senha aleatória em arquivo privado
  de modo `0600`, dentro do diretório temporário do cluster, que é apagado no
  cleanup.
- Após a mudança, o drill direto PG16 passou com os quatro sinais de grants e
  `verificationDurationMs=2230`; a suíte `restore-migrations` + policy +
  `migration-governance` passou 40/40 com `--no-cache`. Lint, typecheck,
  `format:check` e sintaxe passaram.
- Não foram usados segredos reais. A evidência continua sintética e local;
  gates documentais pós-sync e crítica fresh ainda serão repetidos.

## Gates finais antes da crítica C6 — 2026-10-02 (17:40)

- Após o hardening, migration/policy/governance passou 40/40 e o drill PG16
  direto passou em `verificationDurationMs=2230`.
- Formato, Prettier focal, documentation, traceability, audit-consistency,
  product-definition, exposure, CI contract, migrations, secrets e audit de
  produção passaram; lint/typecheck, JSON do ledger, sintaxe e diff-check
  também passaram.
- `verify:evidence-consistency` permanece bloqueado somente porque exige um
  mutation run ID genuíno de candidato committed; coverage e audit passam.
  Crítica fresh ainda pendente; Gauntlet não foi rebaselineado.

## Crítica fresh C6 e correção do diagnóstico — 2026-10-02 (17:53)

- Archimedes retornou `REVISE` no delta local de grants. O único P2 observou
  que `psql` poderia incluir a linha SQL em `stderr` após falha; `runTool`
  repassava esse texto ao handler que imprime a falha. A revisão também pediu
  uma asserção explícita para linhas malformadas no catálogo, embora o helper
  já as rejeitasse.
- O fingerprint oficial completo pré/pós coincidiu em
  `17f5373ca79eb7ffd36fb864427fc210a3dac4123a73f08da528a341fa9ef12a`, escopo
  repository+state, HEAD `3cd7bc32751d59d0142e7d1b21a5a5a79a0103ff`. O parecer é
  válido para aquele snapshot e não promove o Gauntlet global.
- TDD: o novo teste RED falhou porque ainda não existia o formatador seguro.
  GREEN adicionou supressão explícita do `stderr` somente na chamada `psql`
  que lê o arquivo privado de provisionamento; a falha resultante informa
  apenas `psql failed (stderr suppressed)`. Regressões cobrem não-vazamento da
  senha e linhas malformadas. Sob Node 22.23.2, a suíte focal passou 10/10 com
  um teste live condicionalmente ignorado; restore/policy/governance passou
  42/42 com `--no-cache`. O drill PG16 direto passou com todos os flags
  verdadeiros e `verificationDurationMs=2215`.
- A evidência permanece sintética/local e limitada à matriz do provisionador
  de CI. Crítica fresh pós-correção, grants produtivos, principal operacional
  aprovado e scorecard de candidato final ainda estão pendentes. Sem
  rebaseline global.

## Follow-up fresh Kepler — cobertura do caminho de falha — 2026-10-02 (18:24)

- A revisão estática de Kepler retornou `REVISE` P2 porque a regressão anterior
  chamava o formatador diretamente e não provaria que o call-site de
  provisionamento passasse `suppressStderr: true`. A revisão confirmou que o
  wiring atual não propagava causa, não incluía senha em argv e o cleanup não
  imprimia stderr capturado.
- O fingerprint oficial completo pré/pós coincidiu em
  `02afceb869730af4291e3c5e9fff255a63521bc7652e736e36b552a2e7437455`, escopo
  repository+state, HEAD `3cd7bc32751d59d0142e7d1b21a5a5a79a0103ff`. Kepler não
  executou testes ou verificações.
- RED falhou ao importar o runner/caller ainda inexistentes. GREEN criou
  `restore-tool-runner.mjs`, que fornece runner injetável e helper
  `runRoleProvisioningCommand`; o drill usa essa mesma função. O teste injeta
  falha `psql` com senha sintética em stderr, percorre runner e call-site e
  verifica a mensagem rejeitada, ausência de `cause` e ausência da senha na
  lista de argumentos.
- Node 22.23.2: focal restore-migrations passou 10/10 com um skip live
  condicional; restore/policy/migration-governance passou 42/42 com
  `--no-cache`; drill PostgreSQL 16 direto PASS em 2.226 ms, todos os flags
  verdadeiros e cleanup concluído. A crítica fresh do novo snapshot permanece
  pendente; o Gauntlet global não foi rebaselineado.

## Review fresh C7 — integridade estrutural de linhas de catálogo (2026-10-02)

- Schrodinger retornou `REVISE` P2: `restoreIntegrityCatalogMatches` aceitava
  catálogos de origem e destino idênticos mesmo quando rows de colunas,
  constraints ou índices não tinham os campos usados para comparação. O
  fingerprint oficial repository+state pré/pós coincidiu em
  `183b1b9810604a6187f7306d2138fb84004de40129febf940e7be8353e7b3807`; o crítico
  foi somente leitura e não executou testes.
- RED reproduziu a aceitação com rows incompletas iguais nos dois lados. GREEN
  valida objeto/campos/tipos das três seções, rejeita tabelas não contratadas e
  duplicatas, e mantém as exigências de constraints validadas/índices prontos.
  O teste também fornece tipos inválidos iguais para `data_type`,
  `constraint_type` e `definition`.
- Node 22.23.2: suites restore-migrations/policy/migration-governance passaram
  42 testes, com um skip live condicional; `tsc -b`, lint focal e Prettier
  focal passaram. O drill direto PostgreSQL 16 retornou PASS, flags verdadeiros
  e `verificationDurationMs=2192`.
- O P2 está corrigido localmente, mas a aprovação independente desse
  follow-up aguarda nova crítica fresh após sincronização e gates documentais.
  A prova permanece limitada ao esquema sintético das tabelas contratadas.

## Review fresh C8 e follow-up C9 — nome de tabela vazio (2026-10-02)

- Faraday retornou `REVISE` P2: os nomes de tabela recebidos por
  `restoreIntegrityCatalogMatches` eram checados como strings, mas não como
  strings não vazias. Com `tableNames: [""]` e catálogos fonte/alvo idênticos
  cujas rows também tinham `table_name: ""`, o comparador retornava `true`.
  O fingerprint oficial completo repository+state pré/pós coincidiu em
  `cc3fd50ba26b1a3a41da59328e7c31f0de2917e0d0e54a5c46796e221dbf0041`; a crítica
  foi read-only e não executou testes.
- RED reproduziu o resultado incorreto; GREEN exige `isNonEmptyString` para
  cada nome de tabela, e o teste verifica a rejeição de catálogos iguais com
  nomes vazios. A crítica aprovou os demais aspectos delimitados: shape/tipos
  das rows, tabelas conhecidas, duplicatas, flags e caminho de stderr.
- Node 22.23.2: restore-migrations/policy/migration-governance passou 43 testes
  e ignorou 1 teste live condicional; typecheck, lint completo, formato,
  Prettier e gates CI/secrets/traceability/migrations/product/exposure/
  documentation/audit-consistency passaram. Drill direto PG16 PASS com todos
  os flags e `verificationDurationMs=2343`.
- O P2 C8 está corrigido em C9; a revisão fresh do estado sincronizado aguarda
  fingerprint novo. O drill continua evidência sintética local e duração parcial,
  não RTO; sem rebaseline global.
