# 59 — Backlog de remediação da auditoria do repositório

**Revisão:** 2026-10-01 · **Estado:** execução local em andamento; checkpoints correntes e evidências de 2026-10-02 são registrados abaixo.
**Roadmap:** [58](58_roadmap_repository_remediation_2026-10-01.md).
**Auditoria:** [relatório e evidências estáticas](audits/repository-audit-2026-10-01.md).
**SOA existente:** [backlog SOA-01–40](57_backlog_state_of_art.md).

## Regras

Este backlog detalha os achados da auditoria de 2026-10-01. As tasks SOA já
existentes continuam sendo a fonte executável para os gaps de produto,
acessibilidade, integração, segurança e operação; os IDs abaixo não duplicam
essas implementações.

Estados oficiais: READY_FOR_NEXT_STEP, IN_PROGRESS,
WAITING_HUMAN_APPROVAL, BLOCKED e COMPLETED. READY_FOR_NEXT_STEP significa
selecionável, sujeito às dependências descritas. Nenhuma task pode ser fechada
por histórico, intenção ou nota. Os critérios abaixo são requisitos de aceite;
os resultados atuais estão na atualização de execução ao final deste arquivo.

Na execução, tasks de código seguem PHASE → SPRINT → TASK → RED → GREEN →
REFACTOR → REVIEW → SECURITY REVIEW → AUDIT, com mudança pequena, evidência e
rollback. Uma task de decisão humana ou reconciliação documental não inventa
teste de aplicação.

## Tasks diretas dos achados

### AUDIT-REM-01 — Corrigir o contrato do workflow candidate

- **Achado/prioridade:** AUDIT-20261001-01, P1.
- **Estado:** IN_PROGRESS — producer e consumidores ligados ao mesmo manifesto candidato; testes sintéticos passaram; execução Stryker no candidato committed e prova remota permanecem pendentes.
- **Origem:** SOA-31/38; 0300 §4–8; SOA-QB-v1.
- **O que / onde / como:** alinhar .github/workflows/candidate.yml com os
  argumentos e artefatos suportados por
  scripts/verify-mutation-closure.mjs e
  scripts/verify-mutation-critical.mjs. Localizar a origem autorizada do
  bounded manifest e passá-lo explicitamente nos dois passos. Não converter
  o resumo histórico em resultado verificado.
- **Dependências:** contrato do manifest confirmado; nenhuma decisão humana
  necessária para a correção local.
- **RED e verificações:** reproduzir que o workflow falha com
  --write-summary; validar que manifest ausente, inválido ou identidade
  divergente falha fechado e que o manifest válido produz artefato rastreável.
  Executar o job candidate apenas no contexto local autorizado; CI remota
  depende de H-REMOTE.
- **Pronto:** os dois verificadores recebem a mesma entrada válida, falhas
  continuam não verificadas, artefato inclui origem/hash e o caminho candidate
  não depende da interface removida.
- **Rollback:** reverter somente a ligação do workflow; manter a falha do gate
  explícita e nenhum claim de certificação.

### AUDIT-REM-02 — Incluir TSX e páginas no denominador de cobertura

- **Achado/prioridade:** AUDIT-20261001-02, P1.
- **Estado:** COMPLETED localmente — inventário inclui TS/TSX e rotas não importadas; Browser Mode cobre participante, autoria, Operações, diagnóstico e recuperação. Medição integrada corrente: 90,03% statements, 85,31% branches, 94,71% functions e 91,24% lines; as quatro métricas atendem aos pisos congelados 90/85/90/90. Jornadas cobrem retry de histórico de feedback após JSON inválido, filtro de status e paginação cursorada, além de retomada B-07, retries de jornada/atividade e transições de tickets. A revisão R05 fresh do snapshot final retornou PASS sem achados P0–P2 no delta. O gate global `verify:evidence-consistency` continua aberto por ausência de mutation run ID real de candidato committed compatível.
- **Origem:** SOA-30 e barra SOA-QB-v1.
- **O que / onde / como:** ajustar vitest.config.ts e o manifesto/verificador
  de cobertura para abranger o código de produção TS/TSX próprio, incluindo
  apps/web/app e arquivos de produção sem import direto em testes. Excluir
  somente itens justificados pela barra vigente.
- **Dependências:** inventário de arquivos de produção e política de exclusão
  SOA-QB-v1; coordenar alteração de configuração com REM-05.
- **RED e verificações:** criar um arquivo de produção TSX sem teste e provar
  que ele entra no denominador; validar que exclusão genérica de TSX reprova
  e que os pisos existentes não são reduzidos.
- **Pronto:** manifesto reproduzível mostra inclusão/exclusão por arquivo,
  denominador inclui as páginas e métricas atuais são recalculadas sem
  arredondamento favorável.
- **Rollback:** reverter somente a configuração incorreta; manter o gate de
  cobertura como não comprovado.

### AUDIT-REM-03 — Conter caminhos com symlink intermediário

- **Achado/prioridade:** AUDIT-20261001-03, P2.
- **Estado:** WAITING_HUMAN_APPROVAL — contenção, digest por fonte e caminhos relativos implementados; casos conhecidos passam em Node 22.23.2; Bernoulli retornou NOT PASS P2 para tampering same-UID; escopo do threat model aguarda decisão explícita.
- **Origem:** SOA-31; threat model e limites do harness.
- **O que / onde / como:** endurecer scripts/verify-mutation-closure.mjs
  para verificar cada componente de caminho ou provar que a resolução real
  permanece dentro da raiz isolada antes de qualquer escrita.
- **Dependências:** contrato atual de raiz isolada; coordenar com REM-04 sem
  misturar as duas correções.
- **RED e verificações:** manifesto com symlink em diretório pai apontando
  para fora da raiz deve ser recusado; confirmar que nenhum arquivo externo é
  criado ou alterado. Cobrir também symlink no arquivo final e traversal.
- **Pronto:** todo caminho de escrita permanece confinado à raiz, casos
  maliciosos falham fechados e diretório temporário é limpo.
- **Rollback:** reverter somente a validação defeituosa e manter a execução do
  harness bloqueada para manifestos que não provem contenção.

### AUDIT-REM-04 — Calcular digest por arquivo de origem

- **Achado/prioridade:** AUDIT-20261001-04, P2.
- **Estado:** WAITING_HUMAN_APPROVAL — contenção, digest por fonte e caminhos relativos implementados; casos conhecidos passam em Node 22.23.2; Bernoulli retornou NOT PASS P2 para tampering same-UID; escopo do threat model aguarda decisão explícita.
- **Origem:** SOA-31.
- **O que / onde / como:** corrigir runBoundedClosure em
  scripts/verify-mutation-closure.mjs para obter e verificar o digest
  correspondente a cada fonte/identidade, com restauração verificada por
  arquivo.
- **Dependências:** REM-03 pode compartilhar revisão, mas testes e commits da
  correção devem permanecer isoláveis.
- **RED e verificações:** manifestos com duas ou mais fontes, identidades
  cruzadas e falha de restauração devem demonstrar comparação individual;
  digest divergente nunca pode ser classificado como resultado válido.
- **Pronto:** todos os arquivos são restaurados ao digest inicial próprio,
  identidades de arquivos diferentes não compartilham baseline e o resultado
  detalha a fonte correspondente.
- **Rollback:** reverter apenas a mudança de cálculo e classificar o modo
  multifile como NOT_VERIFIED.

### AUDIT-REM-05 — Tornar E2E real selecionável no modo real

- **Achado/prioridade:** AUDIT-20261001-05, P2.
- **Estado:** COMPLETED localmente — seleção comum/real, falha segura sem runtime e jornada browser→web/proxy→API→PostgreSQL descartável passaram em Node 22.23.2. H-REMOTE permanece separado.
- **Origem:** SOA-32, SOA-38 e RNF-010/013/017/039.
- **O que / onde / como:** ajustar playwright.config.ts para que
  real-runtime.spec.ts seja excluído do modo comum e selecionado somente
  quando o modo real explicitamente configurado estiver ativo. Alinhar job e
  variáveis requeridas sem fallback para mock.
- **Dependências:** H-LIVE para qualquer execução contra serviços
  descartáveis; H-REMOTE para workflow remoto. REM-02 é um gate paralelo de
  cobertura, não uma dependência técnica da seleção do spec.
- **RED e verificações:** inspecionar a lista de testes nos modos comum e
  real; modo comum não seleciona real-runtime; modo real seleciona o spec;
  variáveis/DB ausentes não podem produzir PASS.
- **Pronto:** seleção negativa e positiva é demonstrada; browser→web/proxy→API→PostgreSQL descartável concluiu a jornada e confirmou persistência/retomada. O fixture usa conteúdo sintético pré-provisionado sem executar revisão ou publicação editorial. A evidência local não representa workflow remoto nem liberação de H-CONTENT.
- **Rollback:** reverter a seleção e deixar SOA-32 aberto; nunca renomear E2E
  sintético como real.

### AUDIT-REM-06 — Integrar elegibilidade somativa conforme contrato

- **Achado:** AUDIT-20261001-06, gap de produto; a auditoria não atribuiu
  severidade P0/P1/P2.
- **Estado:** READY_FOR_NEXT_STEP (PRD/SPEC) — boundary server-side aprovado
  por Ricardo em 2026-10-08; detalhamento de modalidade, versão e fontes
  persistidas ainda obrigatório antes de código. Implementação não concluída.
- **Origem:** SOA-14/15/16; PRD RF-041/043–047, RN-020–022/026 e SPEC 0106.
- **O que / onde / como:** primeiro localizar o contrato aprovado de
  modalidade, versão e gatilho de elegibilidade; depois propagar os dados e
  aplicar evaluateSummativeAttemptEligibility no boundary de aplicação
  correspondente. Atualizar API/worker somente se exigido pelo contrato.
- **Resultado da inspeção (2026-10-02):** PRD UC-006 descreve o gatilho, mas
  SPEC 0104/0106/0107 não define a fonte/runtime desses dados. O fluxo atual de
  `StartAttempt` recebe atividade/escopo e a porta de atividade retorna apenas
  disponibilidade booleana. Proposta server-side e pergunta objetiva em
  [docs/decisions/2026-10-02-rem06-summative-eligibility.md](decisions/2026-10-02-rem06-summative-eligibility.md).
- **Dependências:** revisar UC-006 e StartAttempt; requisito ou campo ausente
  vira proposta de decisão/documentação antes de ampliar contrato. Não depende
  de H-EDITORIAL se a alteração ficar no fluxo educacional.
- **RED e verificações:** tentativa somativa elegível/ineligível com versão
  correta; modalidade ou versão inválida falha fechada; tentativa formativa
  continua iniciável sem a barreira somativa. Cobrir domínio, aplicação,
  contrato/API e jornada aplicáveis.
- **Pronto:** consumidor de runtime rastreável, modalidade/versão vêm do
  contrato aprovado e o fluxo formativo não sofre regressão.
- **Rollback:** desabilitar somente o caminho somativo alterado; preservar
  comportamento formativo e dados de tentativas existentes.

### AUDIT-REM-07A — Resolver decisão editorial H-EDITORIAL

- **Achado:** AUDIT-20261001-07; conflito RN-044/RF-034 versus SPEC 0106 §9.
- **Estado:** COMPLETED (remediação local) — decisão registrada, SPEC 0106/0111/0191 alinhadas, fronteira HTTP allowlisted, hold de publicação aplicado na persistência/materialização e transição interna direta para `PUBLICADO` recusada. Revisão fresh integrada PASS sem P0/P1/P2 restante no escopo. H-CONTENT continua hold separado; esta task não publica conteúdo.
- **Origem:** SOA-20 e AUD-0917-A04.
- **O que / onde / como:** implementar a decisão registrada em
  `BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC/0191_adendo_decisao_autorrevisao_mvp.md`:
  todo revisor deve ser `CLINICAL_APPROVER` ativo no escopo; revisores
  distintos podem analisar registros de outros autores. Autorrevisão exige
  `principalId == approvedClinicalApproverId` configurado no servidor.
  Preservar preflight, trilha e gate de publicação restrito à identidade
  configurada.
- **Decisão recebida (2026-10-01):** Ricardo permite autorrevisão no MVP; a
  revisão adicional por outro MV é opcional.
- **Dependência:** implementar e revisar o contrato 0191; H-CONTENT permanece
  separado para qualquer publicação clínica.
- **Verificação:** RED reproduziu seis falhas esperadas nos testes de política,
  fila, caso de uso e fronteira API. GREEN passou 56/56 testes focais em Node
  22.23.2, cobrindo identidade configurada ausente/divergente, corpo com campos
  de identidade forjados, aprovação por revisor distinto, solicitação de ajustes
  sem `MODERATE_CONTENT`, linha de escopo cruzado e filtro de autor. Build de
  `@cvg/application`, typecheck da API e Playwright de autoria passaram (5/5).
  Listagem Playwright registrou 45 specs comuns e 47 no modo real;
  `real-runtime.spec.ts` só aparece neste último. A primeira crítica não encontrou
  P0/P1; segunda revisão fresh da matriz clarificada ainda pendente.
- **Pronto:** decisão rastreável; contratos e comportamento concordam; nenhum
  conteúdo é publicado por esta task.
- **Rollback:** se a decisão não existir ou divergir, bloquear a revisão
  afetada; preservar o gate separado de publicação e o histórico versionado.

### AUDIT-REM-07B — Resolver metas H-OPS e AAA-001

- **Achado:** AUDIT-20261001-07; PRD RNF-015 fixa RPO ≤1h/RTO ≤4h e AAA-001
  contém recomendação conflitante de RPO ≤24h.
- **Estado:** COMPLETED (reconciliação documental local, 2026-10-02) — RPO ≤1h/RTO ≤4h continuam normativos; RPO ≤24h foi explicitamente mantido como recomendação proposta do AAA-001, sem alterar o PRD. O gate operacional/produção permanece aberto em AAA-001.
- **Origem:** SOA-01/35/36/37/40 e decisão AAA-001.
- **O que / onde / como:** preservar RNF-015/D-107 (RPO ≤1h/RTO ≤4h), atualizar
  runbooks e separar os alvos aprovados da recomendação AAA de 24h. Registrar
  qualquer owner operacional somente quando sustentado pelos documentos.
- **Decisão recebida (2026-10-01):** manter RPO ≤1h e RTO ≤4h; nenhuma alteração
  ao PRD. H-LIVE autoriza apenas testes locais efêmeros com Docker e dados
  sintéticos. AAA-001 continua sendo gate para aceite operacional/produção.
- **Dependência:** reconciliação documental e teste local autorizado; produção
  continua sem autorização.
- **Verificação:** localizar uma única meta aprovada por dimensão nos docs de
  produto/operação e verificar referências cruzadas; RNF-015/D-107, os
  runbooks, SLO e contrato operacional agora identificam ≤1h/≤4h, enquanto D3
  marca ≤24h como recomendação sem força normativa. Nenhum número é escolhido
  por implementação; medições locais continuam sintéticas e não provam
  capacidade operacional ou produção.
- **Evidência:**
  [rem-07b-rpo-rto-reconciliation-20261002.md](../.agent/artifacts/remediation/rem-07b-rpo-rto-reconciliation-20261002.md).
- **Pronto:** decisão registrada e refletida nos runbooks/monitoramento
  aplicável; evidência de laboratório identificada como sintética e nenhum
  compromisso de produção inferido.
- **Rollback:** manter o valor normativo existente e rotular recomendações
  conflitantes como não aprovadas até a decisão.

### AUDIT-REM-08 — Reconciliar checkpoint, scorecard e proveniência

- **Achado/prioridade:** AUDIT-20261001-08, P2.
- **Estado:** IN_PROGRESS — os checkpoints são reconciliados nesta rodada; scorecard v7 permanece histórica e nenhuma scorecard nova será emitida antes do candidato remediado final. A crítica C6 do delta de grants retornou REVISE P2 por possível eco de SQL/credencial em stderr; a saída sensível foi suprimida, a cobertura de linha malformada foi acrescentada e um reteste fresh permanece pendente.
- **Origem:** SOA-02/06/07/39 e auditoria 2026-10-01.
- **O que / onde / como:** manter docs/55–59, docs/99_runtime_state.md,
  docs/20_master_execution_log.md, docs/30_backlog_master.md e traceability.yml
  coerentes; preservar scorecard v7 como histórico e gerar novo pacote somente
  depois de congelar e verificar o candidato remediado.
- **Dependências:** registro da presente rodada; novo scorecard depende de
  REM-01–06 e tarefas SOA aplicáveis concluídas no mesmo candidato.
- **RED e verificações:** auditoria de consistência deve detectar caminho,
  hash, estado ou checkpoint stale; comparar origem e SHA declarados com
  artefatos efetivamente usados. Não tratar worktree sujo como SHA certificado.
- **Pronto:** checkpoint vigente está no topo dos documentos; cada artefato
  tem origem/data/hash e status; scorecard antigo está rotulado histórico e o
  scorecard novo referencia somente evidência do candidato final.
- **Rollback:** reverter apenas o novo índice/pacote inconsistente; preservar
  históricos e registrar o gap, sem editar retroativamente resultados.

### AUDIT-REM-09 — Definir compatibilidade entre backup e migrations

- **Achado/prioridade:** AUDIT-20261001-09, P2.
- **Estado:** IN_PROGRESS — o contrato v2 e o drill local `0053 → restore →
  0054` passaram em PostgreSQL 16 descartável por socket Unix privado sem
  listener TCP. O preflight válido/corrompido também passou antes da criação do
  destino. O catálogo de colunas, constraints e indexes também coincide para
  `content_versions` e `ai_suggestions`; testes também rejeitam drift de coluna
  com journal válido. No destino sintético, o provisionador local de CI aplica
  sua matriz de grants e o drill confirma permissões efetivas, default-deny,
  role sem ownership/capacidades administrativas e tabela excluída sem acesso.
  Grants/constraints de ambientes autorizados, restore de backup fornecido,
  compatibilidade semântica arbitrária e operação continuam sem evidência;
  H-LIVE não abre produção.
- **Origem:** SOA-12/37; docs/operations/disaster-recovery.md.
- **O que / onde / como:** definir pré-condições de versão do schema no backup,
  compatibilidade com migrations, ordem de restore/migrate e validações antes
  de habilitar writes. Escolher a sequência com base nos formatos reais de
  dump e nas migrations existentes, sem presumir que head e backup são
  intercambiáveis.
- **Evidência atual (2026-10-02):** além do clone same-head do
  `write-restore-summary.mjs`, `pnpm verify:restore-migrations` cria uma
  origem sintética até `0053_aaa_content_integrity`, faz dump custom, restaura
  isoladamente com `--no-owner`, confere marcador e prefixo de hashes/timestamps
  do journal, depois aplica `0054_aaa_content_indexer_service`. O drill direto
  mais recente levou 2.226 ms em `verificationDurationMs` para o fixture
  completo, medição parcial sem valor de RTO. `snapshotPreflightVerified=true`
  e `corruptSnapshotAbortVerified=true`: o archive válido passa
  `pg_restore --list`/decode, enquanto um header sintético adulterado é
  rejeitado antes da criação do destino, cuja ausência é consultada no
  catálogo. Confirmou head final `0054`,
  metadados e predicados das quatro policies, com os vínculos de sugestão e o
  status publicado na mesma subconsulta de versão, `ENABLE/FORCE RLS` nas tabelas
  de conteúdo, owners iguais ao role restaurador e role
  `NOSUPERUSER NOBYPASSRLS`; `constraintsVerified=true` compara tipos,
  nulabilidade/defaults, constraints validadas e índices válidos das duas
  tabelas com a origem sintética. O comparador também rejeita diferença de
  coluna, constraint ou índice e metadados ausentes/inválidos. O drill aplica
  `roleProvisionSql` e verifica a matriz efetiva do app role em todas as
  relações públicas, inclusive negação em `knowledge_documents`, default-deny
  para tabela nova, ausência de ownership e capacidades administrativas. Com
  o drill opt-in, restore-migrations, policy e migration-governance passaram
  40/40 em Node 22.23.2 com Vitest `--no-cache`; o manifesto segue 55 migrations,
  índice 54. O cluster, bancos, roles e arquivos temporários foram removidos.
- **Limite descoberto:** aplicar a cadeia histórica como role sem
  `BYPASSRLS` reproduziu avaliação recursiva da policy de `learning_activities`
  durante a migration `0030`. Por isso, a origem sintética é construída pelo
  principal local privilegiado `postgres`; após restore, a migration pendente
  `0054` é aplicada pelo role dedicado não superusuário/sem `BYPASSRLS`. A
  exigência do principal de migration em ambiente real ainda precisa ser
  confirmada contra o contrato operacional aprovado.
- `verify:migrations` continua validando nomes/índices SQL contra o journal
  local; o novo drill compara o histórico persistido do destino com o prefixo
  esperado e as tabelas de conteúdo acima. A checagem de grants executa somente
  a matriz local de CI; não valida grants/ownership produtivos, todas as
  constraints do banco, backup externo ou compatibilidade semântica arbitrária.
  A duração histórica `rtoMs=2581`
  continua corrigida nos registros correntes como medição parcial, não RTO.
  Relatórios históricos foram preservados.
- **Correção local (2026-10-02):** produtor e consumidor agora compartilham o
  contrato `cvg-restore-summary/v2`, que chama o intervalo técnico
  `verificationDurationMs`; o gate exige SHA válida same-candidate, marcador
  verificado, destino isolado, integridade e duração inteira segura não
  negativa, além de rejeitar `rtoMs`. RED/GREEN cobre v1, duração
  ausente/negativa/fracionária, alias, SHA ausente/stale e marcador/destino
  inválidos. Isso corrige o contrato do artefato, sem ampliar a evidência de
  restore histórico nem medir RTO operacional.
- **Follow-up de crítica fresh (2026-10-02):** P1 de identidade do cluster foi
  fechado removendo TCP do executor local, usando socket Unix em diretório
  temporário privado, conferindo PID/diretório antes de DDL e validando
  `inet_client_addr() IS NULL`. P2 de policies foi fechado validando tabela,
  comando, role, permissividade e predicados. RED reproduziu aceitação de
  `NOT`; a suíte também cobre `COALESCE`. A validação GREEN rejeita ambos,
  `OR`, `CASE` e chamadas fora da allowlist. O escritor de evidência local
  delega ao drill isolado.
  Uma revisão independente de follow-up está pendente.
- **Registro:**
  [rem-09-restore-migration-contract-20261002.md](../.agent/artifacts/remediation/rem-09-restore-migration-contract-20261002.md).
- **Dependências:** inventário de formato/schema e revisão de persistência;
  qualquer execução de restore exige banco descartável autorizado.
- **RED e verificações:** backup incompatível ou corrompido interrompe antes
  de writes; cenários de snapshot em schema suportado verificam migrations,
  constraints, owners e RLS no destino isolado.
- **Verificações executadas:** RED/GREEN do planejador de prefixo, ordem do
  journal e timestamps; `CVG_RUN_RESTORE_MIGRATION_DRILL=true` com 7/7,
  `pnpm typecheck`, ESLint focal, Prettier, `pnpm verify:migrations`,
  `pnpm verify:secrets`, sintaxe e `git diff --check` passaram. Após sincronizar
  runbook e traceability, também passaram `verify:documentation`,
  `verify:traceability`, `verify:audit-consistency` e
  `verify:product-definition`.
- **Pronto:** runbook e procedimento automatizado declaram precondições,
  sequência, validação, abort e cleanup; drill mede resultado contra metas
  aprovadas sem extrapolar laboratório para produção.
- **Rollback:** interromper o drill e descartar somente o destino temporário
  identificado; nunca tocar banco real.

### Revalidação integrada do follow-up — 2026-10-02 (14:02)

- A configuração literal do socket foi corrigida depois de falhar antes de
  readiness/DDL. A leitura dos predicados usa agora a forma canônica que o
  catálogo PostgreSQL 16 produz, mantendo o fechamento a `NOT`, `OR`, `CASE` e
  chamadas de função não permitidas.
- `CVG_RUN_RESTORE_MIGRATION_DRILL=true` com os testes de migration e policy
  passou 7/7. Execução direta: `PASS`, `targetIsolated=true`,
  `privateSocketVerified=true`, marker, prefixo/head, RLS, policies, owners e
  role verificados; `verificationDurationMs=1645`. Cleanup removeu o cluster,
  bancos e temporários. Nenhum banco externo foi acessado.
- Critic fresh de follow-up e sincronização do Gauntlet oficial ainda pendentes.
  Permanecem grants/constraints, aborto de snapshot incompatível/corrompido e
  confirmação do principal operacional.

### Escopo da policy de publicação — 2026-10-02 (14:27)

- Uma nova regressão RED mostrou que o validador encontrava o vínculo
  `content_id`/`version` e o status publicado em subconsultas diferentes e
  ainda aceitava a policy. A expressão agora exige esses três termos dentro da
  mesma `EXISTS` sobre `content_versions` e o mesmo alias `version_record`.
- O teste unitário passou 3/3 e a suíte opt-in PostgreSQL 16 passou 7/7. O
  drill direto retornou PASS com socket privado, destino isolado e as quatro
  policies aprovadas; `verificationDurationMs=1695` cobre o fixture completo.
- Nova crítica fresh read-only pendente antes do sync oficial Gauntlet.

### Validação da expressão integral — AUDIT-REM-09 (2026-10-02, 14:42)

- RED reproduziu que uma subconsulta decoy com `status='PUBLICADO'` fazia a
  policy de `content_versions` passar. O verificador passou a comparar a
  expressão catalogada completa; status deve pertencer à linha protegida, e
  em `ai_suggestions` os vínculos e status devem estar na mesma `EXISTS`.
- O teste focal passou 3/3. A suíte opt-in PG16 passou 7/7 em Node 22.23.2;
  o drill direto retornou PASS com `verificationDurationMs=1668` no fixture
  completo. A expressão positiva foi alinhada ao `pg_policies.qual` real,
  incluindo o agrupamento canônico emitido pelo PostgreSQL 16.
- Critic fresh e sync oficial do Gauntlet seguem pendentes. REM-09 continua
  `IN_PROGRESS`, com grants, constraints, abort de snapshot inválido e
  principal operacional sem evidência.

### Preservação de casts na policy — AUDIT-REM-09 (2026-10-02, 14:50)

- RED reproduziu aceitação de `status::text` quando o normalizador removia
  casts `::text` antes da comparação. GREEN mantém casts intactos e normaliza
  somente espaços, pontuação e caixa de tokens fora dos literais.
- Teste focal 3/3 e integração opt-in PG16 7/7 passaram em Node 22.23.2; drill
  direto PASS com `verificationDurationMs=1664` no fixture completo.
- Critic fresh permanece pendente; REM-09 não fecha grants/constraints,
  snapshot incompatível/corrompido nem principal de migration.

### Crítica fresh ainda pendente — AUDIT-REM-09 (2026-10-02, 15:08)

- A tentativa read-only ficou `running` por aproximadamente seis minutos e foi
  fechada sem veredito. Hashes oficial, escopo e `git status` coincidiram antes
  e depois; nenhum PASS foi inferido e não houve rebaseline.
- Repetir a crítica independente responsiva antes de registrar PASS local
  bounded ou sincronizar o Gauntlet. Gaps operacionais permanecem abertos.

### Preflight e abort de archive corrompido — AUDIT-REM-09 (2026-10-02, 15:19)

- RED: o teste opt-in exigiu `snapshotPreflightVerified` e
  `corruptSnapshotAbortVerified`; falhou porque o drill ainda não inspecionava
  archives antes de criar o destino.
- GREEN: o drill executa `pg_restore --list` e decodifica o archive válido para
  SQL temporário privado. Uma cópia sintética com o magic header alterado é
  rejeitada pelo mesmo helper antes da criação do banco-alvo; uma consulta ao
  catálogo confirma que o destino segue inexistente. A saída temporária é
  removida em sucesso ou falha.
- `restore-migrations.test.ts` passou 4/4 com PostgreSQL 16 opt-in; o conjunto
  migration/policy passou 7/7 em Node 22.23.2. Execução direta retornou PASS
  em `verificationDurationMs=1730`, com `snapshotPreflightVerified=true` e
  `corruptSnapshotAbortVerified=true`; cleanup removeu cluster, bancos e
  temporários.
- O caso cobre archive sintético corrompido antes da criação do destino; não
  cobre incompatibilidade semântica de schema, backup fornecido, grants e
  constraints produtivos, aprovação do principal de migration ou RPO/RTO.
  Critic fresh permanece sem veredito; Gauntlet segue stale, sem rebaseline.

### Integridade das críticas independentes — AUDIT-REM-09 (2026-10-02, 15:46)

- A primeira crítica fresh retornou `APPROVE`, mas executou a suíte e alterou
  apenas o cache ignorado do Vitest em `node_modules/.vite`. O fingerprint
  completo mudou, portanto o parecer é `INVALID` sob a exigência read-only;
  o hash do diff Git ficou igual e o cache foi preservado.
- A segunda crítica usou contexto fresh e pacote selado sem comandos que
  gravassem cache. Após cerca de 150 segundos continuava `running`; foi
  encerrada sem veredito após pedido de conclusão/interrupção. Fingerprints
  pré/pós coincidiram; nenhum PASS/REVISE foi inferido.
- Gauntlet permanece `ACTIVE/FIX_RETEST/STALE`. Próxima fatia local elegível:
  comparar constraints catalogadas entre a origem sintética `0053` e o alvo
  restaurado nas tabelas `content_versions` e `ai_suggestions`. Matriz de
  grants e principal de migration seguem sem contrato operacional aprovado.

### Paridade das constraints após restore — AUDIT-REM-09 (2026-10-02, 15:51)

- RED adicionou a asserção `constraintsVerified=true`; a integração falhou
  porque o drill não reportava comparação estrutural entre a origem e o alvo.
- GREEN compara, em `content_versions` e `ai_suggestions`, colunas (tipo,
  nulabilidade, identidade/geração e default), todas as constraints catalogadas
  e validadas (`pg_constraint`) e os índices catalogados (unique/primary,
  valid/ready e definição) entre a origem sintética parada em `0053` e o alvo
  após restore e `0054`.
- Teste opt-in `restore-migrations` passou 4/4 em Node 22.23.2; o drill direto
  retornou PASS com `constraintsVerified=true` e
  `verificationDurationMs=1723`. A evidência não cobre tabelas fora dessas
  duas, grants produtivos, backup externo nem principal aprovado.
- C1 continua INVALID por mutação do cache Vitest durante o review; C2 foi
  encerrada sem parecer com fingerprint estável. Gauntlet permanece stale.

### Revalidação final bounded — AUDIT-REM-09 (2026-10-02, 16:00)

- `restore-migrations` passou 4/4 e a suíte combinada migration/policy passou
  7/7 com Vitest `--no-cache`; o SHA do cache persistente preexistente ficou
  estável. O drill direto retornou `constraintsVerified=true`, preflight do
  archive válido e aborto do header corrompido verdadeiros, `status=PASS` e
  `verificationDurationMs=1762` para o fixture sintético completo.
- A paridade cobre colunas, constraints catalogadas/validadas e índices
  somente de `content_versions` e `ai_suggestions`, entre origem sintética
  `0053` e alvo após `0054`. Não valida todo o banco, grants produtivos,
  incompatibilidade semântica, backup externo, principal aprovado ou RPO/RTO.
- Próximo passo: crítica fresh bounded e fingerprint Gauntlet completo pré/pós.
  Executar testes do revisor somente com `--no-cache`; sem veredito válido, não
  rebaselinear. REM-09 continua `IN_PROGRESS`, Gauntlet
  `ACTIVE/FIX_RETEST/STALE`.

### Rejeição de divergência estrutural e crítica sem veredito — AUDIT-REM-09 (2026-10-02, 16:19)

- O contrato do SPEC 0118 §32 fornece o oracle local para duas tabelas. RED
  falhou pela ausência do comparador; GREEN extraiu
  `restoreIntegrityCatalogMatches` e ligou o resultado ao drill. Testes cobrem
  igualdade positiva, diferenças de tipo/definição de constraint/índice,
  catálogo incompleto e entradas não validadas/inválidas.
- O foco passou 6/6 (o caso PG16 foi skipped sem opt-in). A execução opt-in
  passou 10/10; o drill direto passou em `verificationDurationMs=1774` com
  todos os flags de integridade verdadeiros. O cache persistente manteve o SHA
  `6013aaa8f1bb8d6ac472f678d1a2328e30c40de66b01d195c9a5656c48035ef8`.
- A crítica C3 foi encerrada após pedido de conclusão sem produzir veredito;
  fingerprint completo pré/pós coincidiu em
  `1175c8824ab98a2924e53d5c97764065a320118c81304cf41cbd5b540393b4c9`. Sem
  parecer válido ou rebaseline. O teste cobre divergência do catálogo esperado
  nas duas tabelas; archive semanticamente incompatível, schema arbitrário,
  demais tabelas, grants, principal aprovado e operação seguem abertos.

### Archive sintético com journal válido e drift — AUDIT-REM-09 (2026-10-02, 16:54)

- C4 fresh sealed aprovou o delta bounded anterior de catálogo e dependências;
  o fingerprint oficial completo pré/pós coincidiu em
  `38bdac60a9ef3aa8144d6369abe0fdf252141436c5719daeb388daf41629ce6b`. O
  parecer é apenas daquele estado e não cobre a implementação abaixo; nenhum
  rebaseline global foi feito.
- RED: o teste opt-in falhou porque o drill ainda não reportava a rejeição de
  archive com incompatibilidade semântica. GREEN: a fixture gera um segundo
  dump custom com uma coluna extra em `content_versions`, preserva journal
  válido até `0053`, passa no preflight, restaura, aplica `0054` e exige
  divergência do catálogo contra a origem limpa.
- `restore-migrations.test.ts` passou 7/7 com o drill opt-in em PostgreSQL 16;
  execução direta retornou `status=PASS`,
  `semanticSnapshotMismatchRejected=true`, demais flags verdadeiros e
  `verificationDurationMs=2172`. A fixture cobre um drift estrutural
  controlado, não archives externos nem incompatibilidades arbitrárias.
- REM-09 segue `IN_PROGRESS`: grants, constraints do banco restante, principal
  de migration aprovado e RPO/RTO operacional continuam sem evidência. Solicitar
  crítica fresh para este novo delta; Gauntlet permanece
  `ACTIVE/FIX_RETEST/STALE`, sem rebaseline.
- C5 fresh sealed aprovou esta fixture, sem achados; fingerprint oficial
  completo pré/pós coincidiu em
  `673584d9c4ed3c2674a2fc53a6a99456212d899859ad840759fb541826c2a6da`. A
  revisão foi estática, não executou testes e não altera gates globais.

### AUDIT-REM-10 — Reauditoria e fechamento do pacote

- **Achados:** AUDIT-20261001-01–09 e dimensões mapeadas no roadmap 58.
- **Estado:** READY_FOR_NEXT_STEP após conclusão das dependências.
- **Origem:** SOA-34/38/39/40, barra SOA-QB-v1 e BUILD G4–G6.
- **O que / onde / como:** revisar os achados, as tasks SOA relacionadas e as
  evidências no candidato congelado; produzir relatório atual em docs/audits,
  atualizar scorecard, estado/log/backlog e rastreabilidade.
- **Dependências:** REM-01–09 conforme aplicável; revisão independente fresh;
  H-REMOTE para evidência remota e decisões humanas para seus respectivos gates.
- **Verificação:** repetir verificações focais, análise de segurança e
  consistência de artefatos; registrar versões, exits, skips, hash e limitações.
  Runtime audit completo só quando o sistema for funcional e observável.
- **Pronto:** todos os nove achados têm disposição suportada por evidência;
  P0/P1 aplicáveis estão fechados; scorecard é do mesmo candidato; gaps
  residuais, UNKNOWNs e aprovações ausentes continuam explícitos.
- **Rollback:** retirar qualquer claim de prontidão sem suporte, preservar o
  relatório e classificar como REVISE com as dependências abertas.

## Trabalho herdado do backlog SOA

Estes itens cobrem dimensões baixas ou sem evidência atual identificadas nas
28 notas. Devem ser executados com seus critérios originais em 57; esta lista
é crosswalk, não uma segunda definição de aceite:

- SOA-13: prova RLS live e isolamento sob roles sem bypass.
- SOA-14–17 e SOA-25: jornada de tentativa, avaliação, progressão, feedback
  e processamento assíncrono.
- SOA-18–20: currículo, conteúdo e governança editorial; publicação depende
  das aprovações humanas pertinentes.
- SOA-22–24: fluxos web, componentes compartilhados e acessibilidade manual.
- SOA-26/27: reconciliação Qdrant e assistência de IA; provider real permanece
  desligado até autorização específica.
- SOA-29–33: suíte, cobertura, mutation assurance, E2E real e gates de código.
- SOA-34–36: segurança de dependências, observabilidade, SLO e deadline.
- SOA-37–40: restore, CI, proveniência same-SHA e prontidão.

## Atualização de execução — 2026-10-02

Toolchain das verificações: Node 22.23.2, pnpm 10.33.0 e Vitest 4.1.11.
Resultados detalhados e limites estão em
`.agent/artifacts/remediation/remediation-verification-20261002.md`.

- **AUDIT-REM-01 — IN_PROGRESS:** workflow candidate agora cria um manifesto
  ligado ao HEAD/run ID e fornece o mesmo arquivo aos dois fechamentos; testes
  de manifesto/harness passaram 30/30, release evidence/Triple AAA 32/32,
  `verify:ci-contract` e self-test de release evidence passaram. O produtor
  Stryker não foi executado no worktree sujo, e H-REMOTE continua pendente;
  nenhum relatório histórico foi promovido.
- **AUDIT-REM-02 — IN_PROGRESS / gate vermelho:** inventário de produção passou
  com 174 fontes incluídas e 207 excluídas. A cobertura completa executou
  209 arquivos/1459 testes PASS e 36 arquivos/68 testes skipped, mas terminou
  em exit 1 nos pisos: 76,24% statements, 66,20% branches, 79,09% functions e
  77,19% lines, contra 90/85/90/90. As páginas TSX sem execução Vitest agora
  aparecem no denominador; nenhum piso ou exclusão genérica foi reduzido.
- **AUDIT-REM-03/04 — IN_PROGRESS:** a integração bounded de caminhos e
  digests por fonte passou 30/30 em Node 22.23.2. O parecer fresh integrado
  continua pendente; a execução Stryker real não foi alegada.
- **AUDIT-REM-05 — IN_PROGRESS:** Playwright lista 45 testes comuns/8 arquivos
  e 47 testes reais/9 arquivos em Node 22; o probe real sem fixture falhou
  fechado antes de alcançar banco/API. O E2E de autoria sintético passou 5/5
  após build dos 12 workspaces; a prova browser→web→API→PostgreSQL continua
  separada e não foi executada nesta rodada.
- **AUDIT-REM-07A — IN_PROGRESS:** solicitação de ajustes retorna somente
  recibo público; o hold H-CONTENT é imposto ao preflight persistido e a
  publicação/materialização persistentes rejeitam bypass. Cinco arquivos
  editoriais passaram 65/65; typecheck e E2E sintético de autoria 5/5 passaram.
  Revisão independente fresh das correções atuais continua pendente.

`git diff --check`, `node --check` nos scripts de mutação, typecheck,
`pnpm verify:ci-contract`, self-test de release evidence e Prettier focal
passaram. H-CONTENT continua ativo; H-REMOTE, AAA-001 e decisões de produção
continuam pendentes. Nenhum commit, push, workflow remoto ou publicação foi
realizado.

### Revalidação integrada — 2026-10-02

- **AUDIT-REM-01:** o producer `discover-candidate-mutation.mjs` agora cria a
  árvore do candidato com `git archive HEAD`, roda install/build/Stryker dentro
  dela, recusa controles locais divergentes e registra digests dos testes,
  configurações e scripts de gate contra os arquivos committed. Os dois
  fechamentos e o resumo usam o mesmo manifesto/run ID. O Triple AAA exige o
  run ID corrente e reconstitui a cadeia atual; `validateBundle` estrito também
  exige e compara esse ID. A cobertura de testes sintéticos temporários passou
  63/63 integrações. O producer Stryker real segue sem execução porque a árvore
  local ainda difere do HEAD; H-REMOTE continua pendente.
- **AUDIT-REM-02:** a medição atual passou 1461 testes e teve 68 skips; o comando
  terminou em exit 1 pelos pisos inalterados, com 76,24% statements, 66,22%
  branches, 79,09% functions e 77,20% lines. O inventário permanece 174 fontes
  incluídas e 207 excluídas. O item segue IN_PROGRESS/gate vermelho.
- **AUDIT-REM-03/04:** as suítes de contenção e digests por fonte fazem parte
  das 63 integrações PASS em Node 22.23.2; a revisão fresh integrada retornou
  PASS sem P0/P1/P2 restante no escopo de proveniência/harness.
- **AUDIT-REM-05:** permanecem válidos os resultados Playwright 45/8 no modo
  comum e 47/9 no modo real e o probe negativo fail-closed. Não houve execução
  contra PostgreSQL real nem runtime externo.
- **AUDIT-REM-07A:** o teste direto da persistência rejeita a transição interna
  para `PUBLICADO`, sem writes (26/26 testes do repositório editorial PASS).
  A resposta pública de solicitar ajustes permanece allowlisted e H-CONTENT
  continua bloqueando publicação. Revisão fresh integrada retornou PASS após
  fechar o P2 de validação de release estrita; decisão de autorrevisão e
  separação de capability seguem documentadas em SPEC 0106, 0111 e 0191.
- **P2 do release standalone:** RED reproduzido ao remover a reconstrução da
  cadeia; GREEN 1/1 com run ID somente do ambiente e validação atual de
  manifesto/relatórios/fechamentos. O crítico confirmou PASS. A árvore
  candidate não é incluída nos artifacts do workflow, então auditoria após o
  job precisa reconstruir a árvore pelo SHA.
- **Gates e limites:** `pnpm typecheck`, `pnpm format:check`,
  `pnpm verify:ci-contract`, self-test de release evidence, sintaxe Node e
  `git diff --check` passaram. Nenhum commit, push, dispatch remoto ou conteúdo
  publicado foi realizado. REM-01–05 e REM-07B/08 permanecem em andamento;
  REM-07A fechou localmente, enquanto H-CONTENT, H-REMOTE e AAA-001 permanecem
  gates independentes. A cobertura abaixo do piso não foi mascarada.

### Atualização local — 2026-10-02 (03:57)

- **AUDIT-REM-03/04 — IN_PROGRESS:** uma crítica fresh encontrou P2 na
  reabertura de relatórios de proveniência depois da verificação de caminho e
  apontou leituras FIFO no CLI/producer. A correção usa descritores
  `O_NOFOLLOW|O_NONBLOCK` para relatórios, manifesto CLI e controles do
  producer. Três suítes focais passaram 29/29 em Node 22.23.2; o terceiro
  parecer independente segue pendente. A corrida de rename pelo mesmo UID
  permanece documentada.
- **AUDIT-REM-05 — COMPLETED localmente:** lista comum 45 testes/8 arquivos;
  modo real 46/9. A jornada real com PostgreSQL 16 descartável passou 1/1,
  incluindo persistência e retomada. O fixture pré-provisiona estado sintético
  e não executa revisão/publicação editorial. O shutdown zerou entidades de
  negócio; eventos auditáveis append-only foram removidos com o container
  `--rm`, que foi removido ao final. H-REMOTE não foi usado.
- **Limites mantidos:** REM-02 segue abaixo dos floors globais e REM-01 ainda
  não executou Stryker real contra candidato committed. H-CONTENT, H-REMOTE e
  AAA-001 continuam gates independentes; nenhuma publicação ou promoção foi
  inferida.

### Atualização REM-03/04 — 2026-10-02 (04:17)

- Crítica fresh encontrou dois P2: root rebinding por symlink podia passar pela
  checagem de contenção e restaurar por descritor deslocado; o bypass de
  proveniência na API exportada podia emitir `KILLED`. RED reproduziu ambos
  (um teste falhando e 20 skipped em cada execução focal).
- GREEN prende a raiz por identidade dev/inode, reabre os pais sob o descritor
  original e recusa restauração quando o root/parent foi movido. Execuções sem
  proveniência recebem `TEST_ONLY_KILLED`, `testOnly: true` e nenhum run ID/SHA.
  O write final usa temporário completo e link exclusivo. Três suítes passaram
  31/31 em Node 22.23.2; typecheck e ESLint focado passaram.
- Uma nova revisão independente está em andamento. A corrida mínima de rename
  simultâneo pelo mesmo UID continua registrada como limitação da API pública
  do Node. Typecheck, ESLint focal, Prettier, rastreabilidade, documentação,
  contrato CI, product-definition, exposure, secrets, sintaxe e diff-check
  passaram sob Node 22.23.2. REM-03/04 segue IN_PROGRESS até o parecer.

### Atualização REM-03/04 — 2026-10-02 (04:43)

- Uma crítica fresh encontrou P1: teste/configuração podia mudar após
  validação de digest e baseline, contaminando resultados dos mutantes; e P2:
  a raiz podia ser substituída por diretório comum durante o baseline. Um caso
  misto também deixava resultado `KILLED` aninhado em saída test-only.
- RED reproduziu a execução no root substituto e a aceitação de um teste
  alterado; GREEN conserva a lease do root durante a closure, ancora o cwd do
  Vitest ao descritor aberto, confere digests dos runner inputs após baseline e
  cada mutante e para na primeira inconsistência. Após restauração compara os
  bytes baseline de todos os sources; cada kill sem proveniência é emitido como
  `TEST_ONLY_KILLED`.
- As três suítes focadas passaram 34/34 em Node 22.23.2. ESLint focal,
  typecheck, Prettier/`format:check`, sintaxe, CI contract, rastreabilidade,
  documentação, product-definition, exposure, secrets, audit-consistency,
  release-evidence self-test e diff-check excluindo `.gauntlet/` passaram.
- Revisão independente fresh do código corrigido está pendente; REM-03/04
  permanece IN_PROGRESS. A janela mínima para rename simultâneo pelo mesmo UID
  permanece registrada. REM-02 continua vermelha nos pisos atuais; REM-01
  ainda não executou Stryker real contra candidato committed. REM-05 permanece
  concluída localmente com E2E PostgreSQL 16 descartável 1/1.

### Atualização REM-03/04 — 2026-10-02 (05:06)

- O reviewer fresh Bohr retornou NOT PASS (high): embora o cwd do processo
  Vitest fosse ancorado ao FD, o argumento absoluto `--config` ainda podia
  carregar configuração/testes da raiz substituta durante um rename temporário.
- RED reproduziu esse redirecionamento. GREEN recusa `config` absoluto em cwd
  descriptor-backed; no modo strict, o entrypoint Vitest e o reporter agora
  usam paths relativos ao diretório aberto. O modo test-only mantém ferramentas
  externas explícitas e saída marcada como não autoritativa.
- A regressão move o root, cria config/test substitutos, exige recusa de config
  e Vitest absolutos e confirma execução verde com config/Vitest/reporter
  relativos. As três suítes passaram 35/35 em Node 22.23.2; ESLint focal,
  typecheck, Prettier, sintaxe Node e diff-check excluindo `.gauntlet/` passaram.
- Nova revisão fresh está em andamento. Comparações por digest são pontuais e
  não detectam mudanças transitórias revertidas antes da leitura; isolamento
  adversarial sob o mesmo UID continua uma limitação aberta. REM-03/04 segue
  IN_PROGRESS; REM-02 floors continuam vermelhos e REM-01 Stryker real aguarda
  candidato committed. REM-05 permanece concluída localmente.

### Atualização REM-03/04 — 2026-10-02 (05:21)

- Bernoulli concluiu a revisão fresh como **NOT PASS — P2**, assumindo que
  código de teste candidato sob o mesmo UID é adversarial. A raiz e os caminhos
  relativos de config/Vitest/reporter resistiram ao root rebind. O processo de
  teste ainda pode descobrir `--outputFile` e run ID, adulterar o relatório
  antes de sua leitura e alterar/restaurar runner inputs entre checkpoints.
- O reviewer não executou testes nem modificou o worktree. A definição REM-03/04
  exige contenção de escrita e integridade de digest, mas não explicita se o
  código executado sob o UID do runner é confiável. Foi solicitada ao usuário
  uma decisão entre isolamento desse processo e confiança explícita com a
  limitação formalizada; REM-03/04 fica em `WAITING_HUMAN_APPROVAL` até a
  resposta. Não há PASS de review.
- A evidência anterior 35/35 continua válida apenas para suas regressões; não
  cobre este P2. REM-02 permanece abaixo dos pisos e REM-01 aguarda candidato
  committed para Stryker real. Sem commit, push, dispatch, deploy ou publicação.

### Validação documental — 2026-10-02 (05:26)

- Sob Node 22.23.2 passaram traceability, documentation, audit-consistency, CI
  contract, release-evidence self-test, Prettier dos documentos, JSON do ledger
  e `git diff --check` com `.gauntlet/` excluído. Nenhum teste de código foi
  executado; REM-03/04 aguarda a decisão de threat model.

### Atualização REM-02 e experiência web — 2026-10-02 (06:15)

- `pnpm test:browser` passou 24/24 em cinco arquivos sob Chromium. A cobertura
  browser agora executa home/participante, recuperação, diagnóstico,
  autoria/revisão e operações. O novo teste autoral exercita RED→GREEN de
  tentativa 503: valida o payload sintético, preserva a recuperação em
  `sessionStorage` e reenvia com a mesma chave de idempotência.
- A suíte integrada executou 215 arquivos: 1506 testes passaram e 68 foram
  skipped. `pnpm test:coverage` terminou exit 1 pelos pisos, com 82,77%
  statements, 72,66% branches, 84,77% functions e 83,97% lines; os pisos
  permanecem 90/85/90/90. O ganho frente à medição de 02:12 foi
  +6,53/+6,44/+5,68/+6,77 pontos percentuais. Não houve falha de teste; o
  gate global segue vermelho.
- O inventário continua com 174 fontes incluídas; `--inventory-only` informa
  212 exclusões e o teste do denominador passou 3/3. Typecheck, ESLint dos
  testes browser, Prettier, contrato CI e a suíte browser passaram sob Node
  22.23.2.
- A matriz visual E2E previamente executada passou 11/11 em cinco rotas nas
  larguras 1440, 768 e 390, com verificações Axe, teclado e movimento reduzido.
  Os screenshots locais de home, operações e autoria foram inspecionados: a
  home mantém hierarquia e leitura responsiva; operações permanece longa e
  densa no viewport mobile, porém navegação por seção e conteúdo permanecem
  legíveis. Nenhum defeito visual observado justifica redesenho fora do escopo
  desta fatia; guardar a densidade como observação para a trilha SOA-22/24.
- REM-02 continua `IN_PROGRESS`: páginas TSX permanecem no denominador, nenhum
  floor foi reduzido e as quatro métricas ainda não atingem a barra. REM-03/04
  continua `WAITING_HUMAN_APPROVAL` pela escolha de threat model same-UID;
  nenhum PASS de review foi inferido. Sem commit, push, dispatch remoto, deploy
  ou publicação clínica.

### Continuidade REM-02 — 2026-10-02 (06:22)

- O teste de suspensão de participante ampliou a suíte Chromium para 25/25 em
  cinco arquivos. A requisição `PATCH` envia escopo autorizado, status esperado
  e novo status; o painel recarrega a projeção e mostra `Reativar` após o
  estado `SUSPENDED`. Fixtures e e-mail usam valores sintéticos `.invalid`.
- Nova cobertura integrada passou 215 arquivos/1507 testes e teve 36 arquivos/
  68 testes skipped. `pnpm test:coverage` e `pnpm verify:coverage-floor`
  continuam exit 1 nos floors preservados: 83,06% statements, 73,24% branches,
  85,16% functions e 84,26% lines versus 90/85/90/90. Comparado à medição
  completa de 02:12, ganho acumulado de +6,82/+7,02/+6,07/+7,06 pp.
- Resultado permanece parcial. Rotas não importadas continuam incluídas;
  nenhum piso/exclusão foi alterado. A cobertura de operações ainda está muito
  abaixo dos alvos e exige cenários adicionais; REM-03/04 aguarda a decisão
  same-UID. Nenhuma revisão independente fresh ou aprovação global foi
  presumida.

### Guarda de desativação e recálculo — 2026-10-02 (06:30)

- Foi acrescentado um teste browser para a confirmação de desativação: cancelar
  mantém a ação `Desativar` disponível e não envia PATCH. A suíte de operações
  passou 4/4 e a suíte Chromium completa passou 26/26 em cinco arquivos.
- Nova execução integrada passou 215 arquivos/1508 testes e teve 36 arquivos/
  68 testes skipped. Métricas: 83,07% statements, 73,27% branches, 85,21%
  functions e 84,28% lines. `pnpm verify:coverage-floor` manteve exit 1 e
  confirmou as floors 90/85/90/90 e o inventário de 174 fontes incluídas.
  Comparado à medição completa de 02:12, o ganho acumulado é
  +6,83/+7,05/+6,12/+7,08 pp.
- O teste não altera a decisão de produto nem envia dados reais; REM-02 segue
  `IN_PROGRESS`. REM-03/04 aguarda a decisão same-UID e não tem review PASS
  nesta rodada.

### Checkpoint Gauntlet — 2026-10-02 (06:35)

- O run existente `aaa-2026-09-06-r1` foi rebaselined para o artefato atual,
  preservando o quality bar congelado e marcando evidência anterior stale
  conforme o drift. `validate --check-drift` retornou `valid: true`, sem erros;
  o progresso permanece em `FIX_RETEST` e o run continua `ACTIVE`.
- A crítica independente fresh deste recorte não foi executada: o spawn foi
  rejeitado pelo limite de threads dos agentes. Não há PASS de crítica nem
  veredito Gauntlet global. Próxima ação: conseguir reviewer slot fresh para
  R05 e continuar elevando coverage sem alterar os pisos; a escolha same-UID
  segue aguardando Ricardo.
- O helper mantém `evidence_freshness: STALE`: os resultados locais foram
  reexecutados, mas nenhum round com crítica independente atual foi registrado.
  O run continua `ACTIVE`; isso não representa PASS nem fechamento.

### Atualização REM-02 — 2026-10-02 (06:43)

- O fluxo de confirmação positiva para desativação passou: API recebe PATCH
  com escopo, estado esperado e `DEACTIVATED`; a tela mostra revogação e oferece
  reativação. A suíte de operações passou 5/5 e a Browser completa 27/27.
- Medição integrada mais recente: 215 arquivos, 1509 testes PASS e 68 skipped;
  83,07% statements / 73,29% branches / 85,21% functions / 84,28% lines.
  `verify:coverage-floor` mantém exit 1 contra floors 90/85/90/90 e registra
  inventário 174/212. Ganho sobre 02:12: +6,83/+7,07/+6,12/+7,08 pp.
- REM-02 continua `IN_PROGRESS`. O checkpoint Gauntlet rebaselined está válido
  contra o fingerprint atual, mas `evidence_freshness` permanece `STALE` sem
  rodada independente; o spawn foi recusado por limite de threads. Nenhum
  revisor ou PASS foi presumido.

### Checkpoint final — 2026-10-02 (06:49)

- A sincronização final de documentação passou em Prettier, traceability,
  documentation, audit-consistency, product-definition, exposure, secret scan,
  CI contract e `git diff --check`.
- `aaa-2026-09-06-r1` permanece ACTIVE em `FIX_RETEST`; `validate
  --check-drift` retornou `valid: true`, sem erros. `evidence_freshness` segue
  `STALE` até crítica independente fresh, indisponível por limite de threads.
- Os resultados REM-02 permanecem 27/27 Browser e 1509/68 na suíte integrada,
  com coverage 83,07/73,29/85,21/84,28 abaixo dos pisos 90/85/90/90. A decisão
  same-UID de REM-03/04 continua aguardando Ricardo.

### Atualização REM-02 — 2026-10-02 (07:20)

- A jornada Browser da autoria cria um rascunho sintético, recebe a projeção
  `RASCUNHO`, confirma ações clínicas indisponíveis, publicação bloqueada,
  ausência de campos de identidade/estado derivados do request e limpeza do
  recovery após sucesso. Browser completo: 33/33 em cinco arquivos.
- Cobertura integrada: 215 arquivos, 1515 testes PASS, 68 skipped em 36
  arquivos; 85,66/77,80/88,64/86,94 contra pisos 90/85/90/90. O verificador
  confirma 174 fontes incluídas/212 excluídas e os quatro pisos vermelhos.
  Typecheck, ESLint focado, formato, secrets e diff-check passaram.
- A página de autoria ficou em 66,92/62,45/58,20/69,51. REM-02 permanece
  `IN_PROGRESS`; cobertura global ainda falha. O Gauntlet permanece
  `ACTIVE/FIX_RETEST/STALE` sem critic fresh por limite de agentes. A decisão
  same-UID REM-03/04 continua pendente; nenhum PASS independente ou global.
- `verify:evidence-consistency` falhou fechado por ausência de
  `CVG_MUTATION_CANDIDATE_ID`; o producer Stryker real ainda exige candidato
  committed compatível. Não foi criado run ID artificial.

### Sincronização documental — 2026-10-02 (07:27)

- Prettier, traceability, documentation, audit-consistency,
  product-definition, exposure, CI contract, secret scan e `git diff --check`
  passaram; estado de orquestração foi parseado e REM-02 permanece
  `IN_PROGRESS`.
- `verify:evidence-consistency` continua falhando fechado pelo run ID de
  mutação corrente ausente. O produtor real e a validação de consistência
  dependem de candidato committed compatível; não se fabricou evidência.

### Estado final do Gauntlet — 2026-10-02 (07:29)

- O run `aaa-2026-09-06-r1` foi rebaselined ao fingerprint da documentação e
  código corrente. `validate --check-drift` retornou `valid: true`, sem erros;
  fase `FIX_RETEST`, status ACTIVE, freshness STALE, round count 7. Não há
  crítica R05 nova nem verdict Gauntlet.

### Atualização REM-02 — 2026-10-02 (07:37)

- Browser Mode agora inclui feedback do participante após ativação sintética
  do convite: lista inicial vazia, envio autorizado e projeção de ticket
  `NOVO`, sem IDs internos. Browser completo 34/34.
- Cobertura integrada: 215 arquivos, 1516 PASS, 68 skipped em 36 arquivos;
  85,88/77,95/88,99/87,18. Inventário 174/212 confirmado; `verify:coverage-floor`
  permanece vermelho nos quatro pisos inalterados 90/85/90/90.
- Typecheck, ESLint focado, formato, secrets e diff-check passaram. A nova
  jornada tornou stale o fingerprint Gauntlet; sincronizar documentos e
  rebaseline/revalidar. `verify:evidence-consistency`, critic R05 e decisão
  same-UID continuam pendentes nos limites registrados.

### Checkpoint Gauntlet — 2026-10-02 (07:42)

- Rebaseline executado após a sincronização desta cobertura; `validate
  --check-drift` retornou `valid: true`, sem erros. O run permanece
  ACTIVE/FIX_RETEST/STALE, round count 7 e sem critic fresh. O rebaseline não
  conta como review nem como PASS.

### Atualização REM-02 — 2026-10-02 (08:07)

- Browser Mode passou 38/38 em cinco arquivos, incluindo acompanhamento
  individual com indicadores formativos, histórico e prévia operacional
  somente leitura de contestação, e relatórios de educação continuada e
  reflexão agregada. Filtros mantêm escopo, requests usam sessão incluída e as
  projeções testadas não mostram IDs de participante/revisor/escopo.
- A execução integrada passou 215 arquivos, 1520 testes e teve 68 skips em 36
  arquivos. Coverage: 87,36% statements (9402/10762), 81,89% branches
  (8205/10019), 91,15% functions (2071/2272), 88,71% lines (8977/10119).
  `verify:coverage-floor` confirma 174 incluídas/212 excluídas; statements,
  branches e lines falham, functions passa. Nenhum piso foi reduzido.
- Typecheck, ESLint, Prettier, secrets e diff-check passaram. REM-02 continua
  IN_PROGRESS. `verify:evidence-consistency` falha fechado sem mutation run ID
  corrente de Stryker; Gauntlet ainda precisa de rebaseline e continua sem
  critic fresh. O limite same-UID REM-03/04 permanece sujeito à decisão humana.

### Validação e Gauntlet — 2026-10-02 (08:16)

- Traceability, documentation, audit-consistency, product-definition,
  exposure, CI contract, format, secrets, JSON e diff-check passaram após a
  sincronização dos resultados.
- `verify:coverage-floor` confirma inventário 174/212; functions passa em
  91,15%, statements/branches/lines seguem abaixo dos pisos congelados.
  `verify:evidence-consistency` permanece fail-closed sem mutation run ID real.
- O run existente `aaa-2026-09-06-r1` foi rebaselined após a sincronização;
  `validate --check-drift` retornou `valid: true`, sem erros. Permanece
  ACTIVE/FIX_RETEST/STALE em sete rounds; nenhuma review ou rodada foi criada.

### Atualização REM-02 — 2026-10-02 (09:08)

- Browser Chromium passou 46/46 em cinco arquivos, incluindo fila editorial
  escopada somente leitura, exportação CSV com BOM UTF-8 e neutralização de
  fórmula, trilha de auditoria com paginação por cursor, rejeição de
  contrato/retry, negação 401/403 redigida, recuperação confirmada de conta e
  reenvio escopado de convite. Fixtures são sintéticas; não houve mudança de
  produção.
- Cobertura integrada: 215 arquivos, 1528 testes PASS e 68 skipped em 36
  arquivos. Statements 88,40% (9514/10762), branches 84,03% (8419/10019),
  functions 92,47% (2101/2272), lines 89,76% (9083/10119), ante pisos
  congelados 90/85/90/90. `verify:coverage-floor` confirmou 174 fontes
  incluídas e 212 excluídas; functions passa e os outros três pisos falham.
- Typecheck, ESLint focal, Prettier focal, `format:check`, secret scan e
  diff-check passaram. `verify:evidence-consistency` validou o resumo de
  cobertura e falhou somente sem mutation run ID real de candidato committed
  compatível. REM-02 permanece `IN_PROGRESS`; nenhum piso foi reduzido.
- O helper oficial rebaselineou `aaa-2026-09-06-r1`; `validate --check-drift`
  retornou válido, sem erros, nesta revisão pré-sync. O rebaseline final após
  atualizar os documentos ainda deve ser executado. O run permanece
  ACTIVE/FIX_RETEST/STALE, sete rounds e sem critic fresh; a decisão same-UID
  REM-03/04 continua humana.

### Gates documentais — 2026-10-02 (09:12)

- Traceability, documentation, audit-consistency, product-definition,
  exposure, CI contract, Prettier focado, `format:check`, secrets, JSON e
  diff-check passaram depois de sincronizar os resultados REM-02.
- O helper oficial rebaselineou `aaa-2026-09-06-r1` e
  `validate --check-drift` retornou `valid: true`, sem erros. Estado
  ACTIVE/FIX_RETEST/STALE em sete rounds; sem critic fresh ou PASS novo.
- REM-02 permanece IN_PROGRESS: 46/46 Browser; coverage 88,40/84,03/92,47/
  89,76 contra 90/85/90/90 e inventário 174/212. `verify:evidence-consistency`
  falha apenas pelo mutation run ID real ausente. A decisão same-UID
  REM-03/04 continua pendente.

### Retomada de reflexão digital — 2026-10-02 (08:32)

- Browser Mode passou 39/39. O novo cenário restaura sessão ativa e tentativa
  `SALVA` com resposta pré-existente, confirma o campo preenchido, atualiza a
  resposta, envia a tentativa e verifica a projeção concluída e os limites de
  reflexão sem nota/competência prática. Também cobre projeções sintéticas do
  dashboard, diagnóstico formativo e runtime M01.
- A integração executou 215 arquivos: 1521 PASS e 68 skipped em 36 arquivos.
  Statements 87,53% (9421/10762), branches 82,41% (8257/10019), functions
  91,59% (2081/2272) e lines 88,88% (8994/10119), contra os pisos congelados
  90/85/90/90. O inventário continua 174 incluídas/212 excluídas; `test:coverage`
  e `verify:coverage-floor` falham apenas nos pisos de statements, branches e
  lines. Typecheck, ESLint focal, Prettier focal, secret scan e diff-check
  passaram. Nenhum código de produção ou piso de cobertura foi alterado.
- REM-02 continua IN_PROGRESS. A escolha same-UID REM-03/04 segue pendente;
  evidência de mutação real aguarda candidato committed compatível, sem ID
  fabricado. Traceability, documentation, audit-consistency,
  product-definition, exposure, CI contract, formato, secrets e diff-check
  passaram. O Gauntlet permanece ACTIVE/FIX_RETEST/STALE em sete rounds; o
  helper oficial rebaselined o fingerprint e `validate --check-drift` retornou
  `valid: true`, sem erros. Isso não cria round, crítica ou PASS.

### Continuidade REM-02 — 2026-10-02 (09:43)

- Browser Chromium passou 48/48 em cinco arquivos sob Node 22.23.2. A jornada
  nova simula 403 ao solicitar ajustes em conteúdo sintético, confirma a
  mensagem genérica e a ausência de detalhe interno, decisão registrada ou
  publicação. Typecheck, ESLint e Prettier focais passaram.
- Cobertura integrada: 215 arquivos passaram, 36 foram skipped; 1530 testes
  passaram e 68 foram skipped. Statements 88,52% (9527/10762), branches
  84,15% (8431/10019), functions 92,56% (2103/2272) e lines 89,89%
  (9096/10119), ante pisos congelados 90/85/90/90. Inventário: 174 fontes
  incluídas e 212 excluídas. `verify:coverage-floor` reprova somente os três
  pisos ainda abertos. `verify:evidence-consistency` valida cobertura e falha
  somente pela falta de mutation run ID genuíno de candidato committed.
- Traceability, documentation, audit-consistency, product-definition,
  exposure, CI contract, formato, secrets, JSON e diff-check passaram.
  `verify:coverage-floor` confirma o inventário 174/212 e três pisos abertos;
  evidence-consistency falha somente sem mutation run ID genuíno.
- O helper oficial rebaselineou `aaa-2026-09-06-r1` após a sincronização e
  `validate --check-drift` retornou `valid: true`. O run permanece
  ACTIVE/FIX_RETEST/STALE em sete rounds, sem critic fresh, round ou PASS.
  REM-02 continua IN_PROGRESS; estado global WAITING_HUMAN_APPROVAL; REM-03/04
  aguarda decisão same-UID.

### Continuidade REM-02 — 2026-10-02 (10:22)

- Browser Chromium passou 57/57 em cinco arquivos. Nove novos casos sintéticos
  cobrem negação da prévia de impacto, transições de triagem de feedback,
  remediação priorizada, abertura de atividade com deep link, retry de
  atividade e retry da sessão de diagnóstico B-07 após falhas temporárias.
- Cobertura integrada: 215 arquivos, 1539 testes PASS e 68 skipped em 36
  arquivos. Statements 89,04% (9583/10762), branches 84,65% (8482/10019),
  functions 92,82% (2109/2272), lines 90,43% (9151/10119). O inventário
  permanece 174 incluídas/212 excluídas. Functions e lines passam; statements
  e branches seguem abaixo dos pisos congelados 90/85/90/90.
- Typecheck, ESLint focal e Prettier passaram. `verify:evidence-consistency`
  valida o resumo de cobertura e falha somente pela falta do mutation run ID
  genuíno de candidato committed compatível. Nenhum código de produção, piso
  ou exclusão foi alterado; REM-02 permanece IN_PROGRESS.

### Validação documental e Gauntlet — 2026-10-02 (10:28)

- Gates documentais e de formato passaram após a sincronização; `git diff
  --check` e parse do ledger JSON também passaram.
- O helper oficial rebaselineou `aaa-2026-09-06-r1`; `validate
  --check-drift` retornou `valid: true`. O run continua ACTIVE/FIX_RETEST/STALE
  em sete rounds, sem fresh critic ou novo PASS.
- REM-02 segue IN_PROGRESS: statements 89,04% e branches 84,65% abaixo dos
  pisos. Same-UID REM-03/04 permanece decisão humana pendente.

### Continuidade REM-02 — 2026-10-02 (11:09)

- Browser Chromium passou 61/61 em cinco arquivos. Foram acrescentados casos
  sintéticos de retry do histórico de feedback após resposta JSON malformada,
  alteração do filtro de status e navegação cursorada seguinte/anterior.
  Typecheck, ESLint focal, Prettier e diff-check focal passaram.
- Cobertura integrada: 215 arquivos, 1543 PASS e 68 skipped; statements
  90,03% (9690/10762), branches 85,31% (8548/10019), functions 94,71%
  (2152/2272) e lines 91,24% (9233/10119). `verify:coverage-floor` PASS,
  inventário 174 incluídas/212 excluídas; pisos e exclusões não foram alterados.
- `verify:evidence-consistency` valida cobertura e auditoria e falha somente
  no gate de mutation run ID, que exige candidato committed compatível. REM-02
  continua IN_PROGRESS aguardando R05 fresh; a decisão same-UID REM-03/04
  continua pendente. Nenhum código de produção mudou.

### Fechamento local de AUDIT-REM-02 — 2026-10-02 (11:31)

- O primeiro critic R05 fresh retornou REVISE P2 porque não se verificava a
  query emitida ao voltar de página. O teste captura o comprimento da lista de
  queries antes do clique e valida uma requisição posterior com
  `status=TRIADO` e cursor ausente. O teste focal passou 1/1 e Browser passou
  61/61 após a correção.
- Cobertura integrada passou: 215 arquivos, 1543 testes PASS/68 skipped;
  statements 90,03% (9690/10762), branches 85,31% (8548/10019), functions
  94,71% (2152/2272), lines 91,24% (9233/10119). `verify:coverage-floor`
  PASS com inventário 174/212 e pisos congelados.
- O follow-up critic fresh retornou PASS sem achados P0–P2 no delta limitado;
  o critic não executou testes. Typecheck, ESLint focal, Prettier e
  `git diff --check` também passaram localmente. AUDIT-REM-02 é COMPLETED
  localmente. A falha global de `verify:evidence-consistency` ainda exige
  mutation run ID de candidato committed compatível; REM-03/04 continua
  aguardando decisão humana same-UID.

### Continuidade de AUDIT-REM-09 — matriz de grants local (2026-10-02, 17:24)

- RED adicionou os sinais da matriz de privilégios ao resultado esperado e
  reproduziu a lacuna: o drill não afirmava grants efetivos, least privilege,
  default-deny nem ausência de ownership para o role da aplicação.
- GREEN aplica o `roleProvisionSql` do provisionador de CI ao destino isolado e
  compara grants efetivos em todas as relações públicas com
  `applicationTablePrivileges`. O app role sintético não recebe acesso a
  `knowledge_documents`, não tem ownership/capacidades elevadas, e uma tabela
  nova comprova que os default privileges seguem deny.
- `restore-migrations` + policy + `migration-governance` passaram 40/40 com
  `--no-cache`. Drill direto PG16 retornou PASS com
  `applicationGrantMatrixVerified=true`,
  `applicationRoleLeastPrivilegeVerified=true`,
  `applicationRoleDefaultPrivilegesDenied=true`,
  `applicationRoleHasNoOwnership=true` e `verificationDurationMs=2186`.
- Evidência é somente do provisionador local e do ambiente sintético; não
  comprova grants/ownership produtivos nem escolhe o principal operacional de
  migration. REM-09 segue `IN_PROGRESS`.
- Gates pós-sync sob Node 22.23.2: lint, typecheck, `format:check`, Prettier
  focal, documentation, traceability, audit-consistency, product-definition,
  exposure, CI contract, migrations (55 até `0054`), secrets, `pnpm audit --prod`,
  parse do ledger e `git diff --check` passaram. `verify:evidence-consistency`
  confirmou coverage/audit e falhou somente pela ausência do mutation run ID
  atual de candidato committed.

### Proteção das credenciais sintéticas — AUDIT-REM-09 (2026-10-02, 17:37)

- A revisão identificou que `psql --command` exporia as senhas temporárias dos
  roles na lista de argumentos do processo. O drill agora escreve o SQL de
  provisionamento em arquivo temporário privado com modo `0600`; o diretório é
  removido pelo cleanup.
- O drill direto PG16 repetido passou com todos os flags e
  `verificationDurationMs=2230`; as três suites focais continuam 40/40.
  `pnpm lint`, `pnpm typecheck` e `pnpm format:check` passaram após o ajuste.
- A mudança mantém roles e dados sintéticos e não introduz credenciais reais.
  Ainda faltam os gates documentais pós-sync e a crítica fresh deste delta.

### Gates pós-hardening — AUDIT-REM-09 (2026-10-02, 17:40)

- As gates documentais, traceability, audit/product/exposure/CI, migrations,
  secrets, audit de dependências, Prettier focal, formato do código, ledger e
  diff-check passaram depois da atualização de evidência.
- `verify:evidence-consistency` confirma cobertura/audit e falha somente por
  mutation run ID ausente. C6 read-only com fingerprint completo está pendente;
  manter `WAITING_HUMAN_APPROVAL` e Gauntlet stale.

### Crítica C6 e follow-up seguro — AUDIT-REM-09 (2026-10-02, 17:57)

- A revisão fresh C6 retornou `REVISE` P2: falha do `psql` poderia incluir SQL
  com senha sintética no `stderr` repassado pelo executor. O reviewer também
  apontou falta de teste explícito para linhas malformadas, já rejeitadas pelo
  comparador. O fingerprint oficial completo pré/pós coincidiu em
  `17f5373ca79eb7ffd36fb864427fc210a3dac4123a73f08da528a341fa9ef12a`, com
  HEAD `3cd7bc32751d59d0142e7d1b21a5a5a79a0103ff`; este parecer não cobre
  alterações posteriores.
- RED falhou pela ausência do formatador seguro de diagnóstico. GREEN agora
  suprime `stderr` na chamada de provisionamento de roles, emitindo somente
  `psql failed (stderr suppressed)`. Foram adicionados casos para não-vazamento
  da senha e para rejeição de linhas nulas, primitivas, incompletas ou com
  tipos/valores inválidos.
- Node 22.23.2: suíte focal restore-migrations passou 10/10, com o teste live
  ignorado sem opt-in; restore/policy/migration-governance passou 42/42 com
  `--no-cache`. Drill PG16 direto passou com todos os flags verdadeiros e
  `verificationDurationMs=2215`.
- A revisão fresh do estado pós-correção está pendente. REM-09 permanece
  `IN_PROGRESS`; somente a matriz local sintética foi exercitada. Gauntlet
  global segue `ACTIVE/FIX_RETEST/STALE`, sem rebaseline; REM-08 não criou
  scorecard nova e preserva v7 como histórico.

### Regressão do call-site de provisionamento — AUDIT-REM-09 (2026-10-02, 18:24)

- A revisão fresh Kepler retornou `REVISE` P2: o teste verificava o formatador
  isolado e não falharia se a chamada real deixasse de passar a opção de
  supressão. O fingerprint oficial repository+state coincidiu pré/pós em
  `02afceb869730af4291e3c5e9fff255a63521bc7652e736e36b552a2e7437455`, HEAD
  `3cd7bc32751d59d0142e7d1b21a5a5a79a0103ff`.
- RED reproduziu import ausente para o runner injetável. GREEN extraiu o
  executor e a construção da chamada de provisionamento para
  `scripts/restore-tool-runner.mjs`; o teste injeta erro de `psql` cujo stderr
  contém senha sintética e valida a mensagem propagada, ausência de cause e
  ausência da senha em argv. Isso cobre a mesma função de provisionamento
  usada pelo drill.
- Sob Node 22.23.2, restore-migrations/policy/migration-governance passou
  42/42 com `--no-cache`; o drill PG16 direto passou com todos os flags e
  `verificationDurationMs=2226`. A nova revisão fresh do call-site ainda
  está pendente; produção e principal operacional permanecem fora da prova.

### Gates pós-extração do runner — AUDIT-REM-09 (2026-10-02, 18:29)

- Após a extração do runner passaram lint, typecheck, `format:check`, Prettier
  focal, documentation, traceability, audit-consistency, product-definition,
  exposure, CI contract, migrations (55 até `0054`), secrets, sintaxe, JSON do
  ledger e `git diff --check`.
- `verify:evidence-consistency` passou coverage e audit e falhou apenas pelo
  mutation run ID genuíno ausente de candidato committed. REM-09 permanece
  `IN_PROGRESS`; a nova crítica fresh e os gaps produtivos seguem pendentes.

### Gates documentais e continuidade — AUDIT-REM-08/09 (2026-10-02, 18:36)

- Corrigida a posição dos novos registros no log append-only: os checkpoints
  de 18:10, 18:24 e 18:29 agora seguem cronologicamente o registro C6 de 18:03,
  ao fim de `docs/20_master_execution_log.md`; a história anterior foi mantida.
- Prettier focal, `verify:documentation`, `verify:traceability`,
  `verify:audit-consistency`, parse do ledger e `git diff --check` passaram.
  A rodada documental usou Node v24.20.0, fora da faixa do projeto; os testes
  focais do runner e o drill permanecem evidência sob Node 22.23.2.
- A crítica fresh do runner e do teste que atravessa o call-site continua
  pendente; nenhum PASS independente foi atribuído. `verify:evidence-consistency`
  ainda requer um mutation run ID genuíno de candidato committed. REM-08/09
  seguem `IN_PROGRESS`; Gauntlet `ACTIVE/FIX_RETEST/STALE`.

### C7 — integridade dos rows de catálogo do restore (2026-10-02, 18:51)

- A crítica fresh de Schrodinger retornou `REVISE` P2: o comparador podia
  aceitar catálogos de origem e destino igualmente incompletos, porque apenas
  verificava a presença das tabelas e a igualdade serializada. O fingerprint
  oficial completo pré/pós coincidiu em
  `183b1b9810604a6187f7306d2138fb84004de40129febf940e7be8353e7b3807`; o review
  foi somente leitura e não executou testes.
- RED adicionou o teste de catálogos fonte/alvo idênticos com campos ausentes
  em colunas, constraints e índices; o teste falhou ao receber `true`. GREEN
  agora valida shape e tipos de todos os campos comparados, limita linhas às
  tabelas contratadas e rejeita chaves duplicadas. A regressão cobre campos
  ausentes e três valores de tipo incorreto nos dois catálogos.
- Node 22.23.2: restore-migrations/policy/migration-governance passou 42 testes
  e 1 teste live foi ignorado condicionalmente; `tsc -b`, lint e Prettier focais
  passaram. O drill direto PostgreSQL 16 retornou PASS com todos os flags e
  `verificationDurationMs=2192`.
- O parecer C7 aplica-se ao snapshot antes da correção; solicitar nova crítica
  fresh bounded após sincronizar os registros. REM-09 permanece `IN_PROGRESS`;
  a compatibilidade ainda é limitada às tabelas contratadas e ao fixture
  sintético. Sem rebaseline; mutação de candidato committed, operação produtiva
  e gates humanos seguem separados.

### Revalidação completa após C7 — 2026-10-02 (18:57)

- As três suites restore/policy/migration-governance passaram 42 testes com
  um skip live condicional; o drill direto PG16 passou com todos os flags em
  3.313 ms. Essa duração mede apenas a fixture técnica e não é RTO.
- Lint, `tsc -b`, formato, Prettier, CI contract, secrets, traceability,
  migrations, product-definition, exposure, documentation, audit-consistency,
  parse JSON e `git diff --check` passaram sob Node 22.23.2.
- A revisão C7 encontrou e o código corrigiu o P2 sobre linhas incompletas.
  A crítica fresh do estado pós-correção ainda precisa de fingerprint
  repository+state correspondente. O mutation run ID genuíno de candidato
  committed permanece bloqueador separado; sem rebaseline ou promoção global.

### C8/C9 — nome vazio no contrato do catálogo — 2026-10-02 (19:03)

- Faraday retornou `REVISE` P2 porque `tableNames` permitia string vazia; com
  origem/destino idênticos e row names vazios, o comparador podia retornar
  `true`. Fingerprint oficial repository+state pré/pós igual a
  `cc3fd50ba26b1a3a41da59328e7c31f0de2917e0d0e54a5c46796e221dbf0041`; review
  read-only, sem testes.
- RED reproduziu o caso; GREEN exige string não vazia com o helper
  `isNonEmptyString`. O teste prova rejeição de catalogs iguais com nome
  vazio. Sob Node 22.23.2, suites restore/policy/migration-governance passaram
  43 testes com um skip live condicional; lint, typecheck, formato, Prettier,
  scripts de gate e drill PG16 passaram; duração final 2.343 ms.
- A review C8 cobre o snapshot antes do fix. C9 fresh do snapshot atualizado
  ainda está pendente; nenhuma rebaseline global. Permanecem os bloqueios de
  candidate mutation ID, grants/produção, principal operacional e decisões
  humanas registradas acima.

### Checkpoint de retomada C9 — 2026-10-02 (19:17)

- Verificações pós-sync registradas em `docs/99_runtime_state.md`; nenhuma
  conclusão global foi inferida. REM-09 continua `IN_PROGRESS`.
- Próximo: fingerprint oficial repository+state; review fresh, read-only e
  bounded C10 do comparador/caller, incluindo vazios, linhas malformadas e
  duplicatas; fingerprint pré/pós coincidente; depois inventário de hashes
  REM-08.
- `verify:evidence-consistency` permanece aberta sem mutation run ID genuíno de
  candidato committed; estado geral aguarda decisões e gates já listados.
