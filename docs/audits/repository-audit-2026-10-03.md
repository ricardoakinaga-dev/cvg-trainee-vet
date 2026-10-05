# Auditoria do repositório CVG — 2026-10-03

## Conclusão

O CVG possui implementação substancial, arquitetura bem separada, controles de
autorização e uma suíte extensa que passa no recorte habitual. A cobertura atual
atinge os pisos definidos, a matriz RLS passa em banco descartável e a jornada
real do participante funciona. **O repositório ainda exige revisão antes de
release:** a integração PostgreSQL tem dois testes vermelhos, o comando E2E real
mistura cenários com autenticações incompatíveis, o gate de complexidade falha,
o audit de ferramentas de desenvolvimento tem alertas e existem problemas na
validade e no encadeamento da evidência de certificação. A revisão também
identificou riscos de perda da última edição de resposta, retomada incompleta,
recuperação editorial sem isolamento de identidade e progressão curricular.
Foram reproduzidos, em módulos com adaptadores controlados, defeitos de replay,
classificação de erro, progressão e ordenação de indexação.

**Veredito desta auditoria: REVISE.** Auditoria local concluída com gaps
identificados. Produção, aceite AAA-001, decisões same-UID/somativas, workflows
remotos e publicação clínica continuam sujeitos aos seus gates existentes.
As notas abaixo são consultivas e não substituem esses gates.

## Escopo, identidade e método

- Task: `AUDIT-REPOSITORY-20261003`; solicitação direta de leitura de `docs/` e
  auditoria do repositório com notas por item.
- Branch `main`, HEAD `3cd7bc32751d59d0142e7d1b21a5a5a79a0103ff`, mais worktree
  local. A observação inicial registrou 98 entradas rastreadas modificadas e
  53 entradas não rastreadas; estas últimas incluem diretórios e não equivalem
  a 53 arquivos individuais. Nenhuma alteração de produto foi feita nesta auditoria.
- Inventário documental inicial: **85 arquivos, 1.619.627 bytes e 40.445 linhas**.
  Todos os arquivos foram abertos e processados; o inventário registra path,
  tamanho, linhas e SHA-256 anterior aos registros desta rodada.
- Leitura semântica distribuída: arquitetura, segurança, ADRs, operação,
  runbooks, qualidade, modernização, auditorias, históricos e arquivos 40–59.
  Estado e backlog foram lidos integralmente. O log de 15.881 linhas foi
  processado integralmente e percorrido por seus 339 blocos de nível 2,
  com extração de ações/resultados/decisões e leitura aprofundada dos registros
  relevantes. Isso é leitura documental assistida por processamento, não uma
  declaração de inspeção manual linha a linha de todos os registros históricos.
- Foram confrontados AGENTS, gates Discovery/PRD/SPEC, planejamento BUILD,
  contratos, fontes, testes, migrations, CI e manifesto de rastreabilidade.
  Os prompts arquivados foram tratados como histórico.
- Revisão em três lanes de leitura, com integração e execução dos comandos pelo
  agente principal. As opiniões dos revisores foram confrontadas com fontes;
  resultados comunicados pelo integrador não foram reexecutados pelos revisores.
- Ambiente dos comandos: **Node 22.23.2 e pnpm 10.33.0**. O shell inicial usava
  Node 24.20.0, fora do contrato; os comandos de auditoria usaram PATH explícito.
- PostgreSQL 18.4 embedded foi usado nas suítes live/RLS e no E2E real;
  PostgreSQL 16 foi usado no drill histórico de restore. Redis 7.0.15 foi
  executado em instâncias novas e descartáveis com o toolkit local.
  PostgreSQL 18 não prova por si só equivalência ao PostgreSQL 16 do CI.
- Apenas dados sintéticos e bancos criados para esta auditoria foram usados.
  Não houve consulta a prontuários, credenciais reais, produção ou serviços
  existentes para executar fixtures.

O inventário e os logs estão em
[`repository-audit-2026-10-03-evidence`](repository-audit-2026-10-03-evidence/docs-inventory.json).
Cada comando registrado possui exit code, duração, path do log e SHA-256.
Os arquivos novos de evidência surgiram depois do inventário e não integram os
85 arquivos iniciais. O SHA de Git identifica a base; não identifica sozinho
todos os bytes deste worktree com alterações.

## Como interpretar as notas

Escala: 0 = ausente; 25 = esqueleto ou evidência insuficiente; 50 = parcial;
75 = implementação relevante com lacunas; 90 = forte e demonstrado no recorte;
100 = completo e comprovado no escopo declarado. As notas consideram correção,
cobertura funcional, evidência executada, manutenção e consistência documental.
São julgamento técnico fundamentado, não medidas de eficácia clínica, percentual
de requisitos entregues ou classificação AAA automática.

PASS significa procedimento executado com resultado positivo naquele escopo.
PARTIAL significa evidência ou comportamento incompleto. FAIL significa falha
reproduzida ou requisito ausente. NOT_EXECUTED significa que não houve execução.
Um bom score em arquitetura ou testes não compensa um gate de release aberto;
por esse motivo não se calcula uma média global que sugira aprovação.

## Notas de 0–100 por item analisado

### Produto, documentação e controle de execução

| ID | Item | Nota | Evidência e desconto principal |
|---|---|---:|---|
| N01 | Gates Discovery → PRD → SPEC → BUILD | 92 | Cadeia documental verificada; gates aprovados não comprovam produto integralmente implementado. |
| N02 | Aderência funcional ao PRD | 61 | Jornada e gestão amplas; somativa sem integração, calendário de retenção divergente e progressão baseada em domínio parcial. |
| N03 | Aderência técnica à SPEC | 81 | Separação, contratos, dados e testes concretos; drift nos contratos dos testes live e de certificação. |
| N04 | Planejamento de phases, sprints e tasks | 82 | Masters/roadmaps/backlogs existem; múltiplos overlays e próximos passos históricos aumentam custo de retomada. |
| N05 | Documentação e decisões de arquitetura | 78 | Os 85 arquivos foram cobertos pelo inventário/leitura; decisões e runbooks úteis, com snapshots e métricas supersedidos. |
| N06 | Estado, log e continuidade | 72 | Evidências e limites são explícitos; estado corrente de 319 linhas acumula checkpoints e o log tem ordem histórica irregular. |
| N07 | Backlog e gestão de dívida | 72 | Remediações e autoridade humana são registradas; sobreposição de backlogs e instruções antigas exigem precedência. |
| N08 | Rastreabilidade requisito → evidência | 67 | Gate estrutural passa; release falha em worktree dirty e textos antigos aparecem como “Current”. |
| N09 | Governança e integridade dos gates | 68 | Fail-closed global preservado; subchecks de freshness/readiness e fluxo candidate têm inconsistências. |

### Arquitetura, backend e dados

| ID | Item | Nota | Evidência e desconto principal |
|---|---|---:|---|
| N10 | Arquitetura e fronteiras entre módulos | 91 | Monorepo, domínio/aplicação/adaptadores, teste de arquitetura e ausência de ciclos atuais. |
| N11 | Modularidade e tamanho dos módulos | 69 | Features separadas; funções grandes, páginas concentradas e três violações de budget atuais. |
| N12 | Domínio e políticas educacionais | 78 | Políticas puras, estados e testes; somativa fora do fluxo e retenção/progressão com divergências atuais. |
| N13 | Camada de aplicação e composição | 84 | Casos de uso e dependências explícitas; contrato editorial mudou sem migração de todos os consumidores de teste. |
| N14 | API, rotas e contratos | 92 | 57 entradas e 57 rotas em paridade; validação e envelopes cobertos, sem certificação externa de todas as rotas. |
| N15 | Validação de entrada e exposição pública | 91 | Schemas e projeções restritas, testes negativos e gate de exposição passam; amostragem de código não equivale a pentest. |
| N16 | Identidade, sessão, convite e recuperação | 92 | Testes e jornada real exercitam ativação, cookie, persistência e isolamento; não houve auditoria de provedor produtivo. |
| N17 | Autorização server-side e escopos | 88 | Guards/proxy e RLS live positivos; recuperação de rascunho local não vincula principal/escopo e trusted proxy produtivo permanece gap. |
| N18 | CSRF, proxies e proteção HTTP | 90 | Controles e testes atuais; configuração de proxy e topologia produtiva não observadas. |
| N19 | PostgreSQL, transações e integridade | 91 | Migrations aplicadas, idempotência e constraints exercitadas por 245 testes live aprovados; dois testes de workflow falham. |
| N20 | RLS, grants e isolamento do pool | 93 | Matriz live PASS, oito invariantes verdadeiras; role sem superuser/BYPASSRLS e contexto isolado, em ambiente sintético. |
| N21 | Migrations e compatibilidade de restore | 89 | 55 migrations; drill 0053 → restore → 0054 PASS em PG16. Outros backups/cadeias/roles operacionais não certificados. |
| N22 | Tentativa, resposta, correção e jornada | 65 | Happy path real passa; replay com horário novo conflita e frontend não garante submissão da última edição/retomada comum. |
| N23 | Avaliação somativa e elegibilidade | 45 | Política e testes no domínio; falta boundary/consumidor persistido aprovado, explicitado em REM-06. |
| N24 | Currículo e prontidão editorial | 52 | Quiz pode produzir DOMINIO_DIGITAL com respostas abertas ausentes; retenção usa 7/30/90 contra RF-049 30/60/90. |
| N25 | Conteúdo clínico pronto para uso | 35 | Autoria e bloqueios existem; H-CONTENT e revisão humana/publicação permanecem abertos. |
| N26 | Autoria, revisão e publicação | 70 | Guardrails/MVP alinhados; dois workflows live falham, justificativa UI é constante e rascunho local não vincula identidade. |
| N27 | Worker, outbox, lease e retries | 72 | Testes positivos; leases simultâneas/lote sequencial, ordenação publish/withdraw e drain mantêm riscos concretos. |
| N28 | Qdrant como índice derivado | 68 | Índice reconstruível; corrida de handlers reproduz delete seguido de upsert atrasado; serviço Qdrant não iniciado. |
| N29 | IA assistiva e desligável | 68 | Controles assistivos presentes; wrapper de erro perde classificação timeout e provider real não foi avaliado. |

### Frontend e experiência

| ID | Item | Nota | Evidência e desconto principal |
|---|---|---:|---|
| N30 | Frontend e experiência de uso | 72 | Suítes comuns passam; última edição, reidratação, retry e consultas fora de ordem têm cenários sem cobertura discriminante. |
| N31 | Arquitetura e manutenção do frontend | 58 | Páginas muito extensas e estado concentrado; comportamento coberto, custo de evolução alto. |
| N32 | Acessibilidade e responsividade | 76 | Axe/reflow/foco positivos; erro por campo e nome de progress incompletos, sem tecnologia assistiva real/zoom nativo manual. |

### Qualidade, segurança e operação

| ID | Item | Nota | Evidência e desconto principal |
|---|---|---:|---|
| N33 | Testes unitários, contratos e browser | 93 | Execução integrada: 1.571 PASS em 217 arquivos; 69 skips explicitamente limitam o que esse verde prova. |
| N34 | Testes de integração real | 75 | 245 PASS / 2 FAIL / 16 skips; falhas editoriais atuais bloqueiam fechamento da integração. |
| N35 | E2E e separação de ambientes | 68 | Comum 45/45; real 30/46, incluindo jornada real PASS; cenários staff mockados selecionados em modo real falham. |
| N36 | Cobertura de produção TS/TSX | 90 | 90,03/85,31/94,71/91,24; inventário 174 incluídos/212 excluídos validado. Statements têm só 0,03 ponto acima do piso. |
| N37 | TDD e verificação de regressões | 80 | Histórico RED/GREEN e suíte forte; ordem histórica de TDD não foi reconstruída para cada commit, e testes live ficaram stale. |
| N38 | Assurance por mutação | 45 | Harness/proveniência existem; sem run ID atual e execução Stryker válida do candidato final. Same-UID segue decisão aberta. |
| N39 | Gates de qualidade e manutenibilidade geral | 65 | Lint/typecheck/formato/ciclos passam; complexidade falha e typecheck principal não cobre testes raiz. |
| N40 | Dependências e supply chain | 68 | Audit de produção 0; ferramentas dev com 4 alertas high e 3 moderate, barrando audit global. |
| N41 | Segredos e minimização de dados | 91 | Scan limpo e fixtures sintéticos; scanner não prova ausência universal de segredo ou PII. |
| N42 | Logs, trilha e redaction | 75 | Append-only/redaction positivos; rejeições autenticadas sem escopo explícito/permitido são descartadas. |
| N43 | Observabilidade, OTel e métricas | 78 | Instrumentação e testes atuais; sem collector/drill OTel ponta a ponta ou janela de SLO real nesta rodada. |
| N44 | Health, readiness e shutdown | 78 | Readiness/API positivas; entrypoint API sem signal handlers e worker sem espera do lote ativo no close. |
| N45 | Redis e rate limit distribuído | 80 | Redis 5+2 PASS; orçamento HTTP geral 120/min não aplica limits menores das classes auth/recovery. |
| N46 | Resiliência, timeouts e degradação | 70 | Mecanismos presentes; replay HTTP, leases, wrapper de timeout IA e shutdown têm gaps. |
| N47 | Backup, restore, DR e runbooks | 82 | Restore sintético PG16 PASS, grants/constraints e abortos verificados; sem medição operacional de RPO/RTO. |
| N48 | Desempenho, carga e capacidade | 52 | Políticas/histogramas e baseline histórico; k6 atual e saturação/capacidade não executados. |
| N49 | CI/CD e workflow candidate | 48 | Pipelines e pins existem; dois problemas estáticos de encadeamento, E2E real e gates locais vermelhos. |
| N50 | Proveniência de release e same-SHA | 35 | Artefatos históricos, freshness local incorreta, run de mutação atual ausente e remoto sem prova atual. |
| N51 | Prontidão de release/produção | 20 | Gates técnicos e humanos abertos; o relatório não libera piloto, produção nem publicação clínica. |

## Verificações efetivamente executadas

| Procedimento | Resultado observado | Interpretação |
|---|---|---|
| `pnpm format:check`, `pnpm lint`, `pnpm typecheck` | PASS | Estilo, lint e project references atuais; testes raiz não integram o `tsc -b`. |
| `pnpm test:coverage` | PASS: 217 arquivos / 1.571 testes; 36 arquivos / 69 testes skipped | Suíte integrada unit/integration/browser, com live condicionalmente desligado. |
| `pnpm verify:coverage-floor` | PASS: 174 incluídos / 212 excluídos | Statements 90,03%, branches 85,31%, funções 94,71%, linhas 91,24%. |
| `pnpm test:integration:live`, primeira tentativa | Pré-condição ausente, exit 2 | Sem URLs de fixture; esse resultado foi substituído por execução em banco novo provisionado. |
| `pnpm db:migrate` em bancos novos | PASS | Cadeia atual aplicada; nenhum banco existente recebeu migrations. |
| `pnpm test:integration:live` provisionado | FAIL: 245 PASS / 2 FAIL / 16 skips; 49 arquivos PASS / 2 FAIL / 3 skipped | Duas regressões de contrato/fixture editorial detalhadas abaixo. |
| `pnpm test:rls:live` | PASS | Oito flags verificadas: leitura/escrita cruzada negadas, anônimo negado, serviço confinado, pool isolado, FORCE RLS, sem superuser/BYPASSRLS. |
| `pnpm verify:restore-migrations` | PASS | PG16, snapshot 0053 restaurado e migration 0054 aplicada; flags do catálogo/grants/roles/abortos verdadeiras. |
| `pnpm test:ratelimit:live`, primeira tentativa | NOT_EXECUTED, embora exit 0 | Script emitiu SKIP por binário fora de PATH; não foi contado como teste aprovado. |
| Rate limit com Redis descartável provisionado | PASS: 5/5 | Toolkit local e bibliotecas explícitas; instância encerrada. |
| Redis restart em instância descartável | PASS: 2/2 | Casos de reinício e falha do backend; não é prova operacional produtiva. |
| `pnpm test:e2e`, modo comum | PASS: 45/45 | Build dos workspaces concluído; frontend, proxy sintético, acessibilidade e reflow exercitados. |
| `CVG_RUN_REAL_E2E=true pnpm test:e2e` | FAIL: 30 PASS / 16 FAIL | O cenário participante real passou; 16 specs internas dependem de auth mockada não disponível nesse modo. |
| `verify:ci-contract`, `verify:documentation`, `verify:product-definition` | PASS | Concordância estrutural/documental local; não execução remota. |
| `verify:routes`, testes de arquitetura, `verify:cycles`, `verify:dead-code` | PASS | Registry em paridade; fronteiras testadas e sem ciclos encontrados. |
| `verify:migrations`, `verify:secrets`, `verify:traceability` | PASS | 55 migrations; scan limpo; manifesto estrutural válido. |
| `verify:traceability:release` | FAIL | Requer worktree limpo; alterações preexistentes e arquivos da auditoria não foram commitados. |
| `verify:complexity` | FAIL | Três violações de budget/ratchet. |
| `pnpm audit --json` | FAIL: 4 high / 3 moderate / 0 critical | Ocorrências de advisories em ferramentas dev, não sete bibliotecas distintas. |
| `pnpm audit --prod --json` | PASS: 0 vulnerabilidades reportadas | 133 dependências no inventário de produção consultado. |
| `verify:release-evidence` | PASS do self-test | Testa gerar/validar bundle sintético; não certifica o bundle real antigo. |
| `verify:audit-consistency` | PASS | Concordância entre relatórios históricos; não prova freshness do worktree atual. |
| `verify:evidence-consistency` | FAIL: 1 gate | Run ID atual de mutação ausente. |
| `verify:aaa-candidate` | FAIL: 8 gates | Relatórios stale, proveniência/mutação e audit global, entre outros. |
| `verify:triple-aaa` | REVISE: 10 pendências, exit 1 | Utiliza relatórios históricos; `STAGING_VERIFIED` emitido não foi aceito como certificação atual. |
| Reprodução de freshness com worktree dirty | Defeito CONFIRMADO | `fresh=true` para HEAD mesmo com 69 paths rastreados de runtime modificados. |
| Reprodução de replay e classificação IA, módulos compilados com adapters controlados | Defeitos CONFIRMADOS | Mesmo horário dá replay; horário novo dá idempotency_conflict para save/submit. Timeout direto é retryable, no wrapper vira unknown. |
| Reprodução de currículo, indexação e conflito de conteúdo, módulos/adapters controlados | Defeitos CONFIRMADOS | M02 DOMINIO_DIGITAL com 2 respostas abertas ausentes; retenção 7/30/90; handlers produzem delete→upsert; conflito CAS mapeia 500. |
| `git diff --check` | PASS | Sem erros de whitespace; não aprova lógica nem release. |

Não executados: Stryker genuíno do candidato final, Qdrant live, provider de IA,
k6 atual, collector OTel e drill conjunto completo, workflow remoto, assinatura
real de artefatos, deploy, RPO/RTO operacional, tecnologia assistiva e uso clínico.
As durações de 2.854 ms do restore sintético e 8,1 s do E2E participante não são
RTO de produção ou métricas de latência do serviço.

## Achados prioritários e evidências

### A01 — P1: testes live editoriais divergem dos contratos atuais

**Confirmado por execução.**
`tests/integration/postgres-authoring-workflow.test.ts:179` fornece `repository`
e `transition`, mas o contrato em `authoring-use-cases.ts:180` exige `idFactory`.
O caso chama `dependencies.idFactory()` na linha 757 e falha com TypeError.
O teste de publicação em `postgres-content-workflow.test.ts:155` usa fixture que
não satisfaz o gate atual de `publicationReady`, rejeitado em
`content-use-cases.ts:190`. O resultado completo é 245 PASS / 2 FAIL / 16 skips.

Impacto: integração de autoria/publicação e CI não fecham. A segunda rejeição
é compatível com o bloqueio de segurança do produto; não se demonstrou bypass.
Atualizar consumidores e fixtures para o contrato aprovado e testar aprovação,
recusa, transação/outbox/audit e rollback sem reduzir os gates de publicação.
Evidência: `live-postgres-provisioned.log`.

### A02 — P1: seleção E2E real incompatível com specs de autenticação mockada

**Confirmado por execução e inspeção.** `playwright.config.ts:30` remove o cookie
sintético no modo real, mas a seleção mantém as specs mockadas. O proxy em
`apps/web/proxy.ts:77` consulta autorização server-side, fora de `page.route`.
Os cenários authoring/operations/visual são redirecionados para o acesso inicial.
O comando real termina com 30 PASS / 16 FAIL; o único cenário `real-runtime`
passa. O modo comum passa 45/45.

Impacto: `quality.yml` e `candidate.yml` chamam um comando que falha nesse
arranjo. Separar projetos/seleção de mocks e runtime real, e fornecer sessões
reais de staff para comprovar fluxos internos. Não remover a autorização do
proxy para tornar o teste verde. Evidências: `real-e2e.log`, `mocked-e2e.log`.

### A03 — P1: subgate aceita auditoria “fresh” apesar de runtime local alterado

**Confirmado por reprodução.** `scripts/evidence-freshness.mjs:60` aceita
`sha === head` imediatamente. O caminho alternativo compara commits, não o
worktree. `verify-aaa-candidate.mjs:417` prioriza `candidate_sha`, que coincide
com HEAD, sobre a identificação da evidência medida. A reprodução retornou
`fresh=true` com **69 arquivos rastreados de runtime modificados**.

Impacto: o subgate declara válido um relatório que não mede o código local
atual. O gate AAA total ainda falha; não foi demonstrado bypass completo.
Separar identidade do candidato/evidência, incluir o snapshot efetivo ou recusar
worktree sujo no boundary de promoção. Evidência: `freshness-dirty-reproduction.log`.

### A04 — P1: etapa de segurança do candidate sem token de consulta

**Confirmado estaticamente; workflow remoto não executado.**
`.github/workflows/candidate.yml:160` chama `write-security-summary.mjs` sem
injetar `GH_TOKEN`/`GITHUB_TOKEN`. O token só aparece explicitamente em etapas
posteriores. Sem token, `write-security-summary.mjs:28` retorna scanners unknown;
linhas 167–172 exigem CodeQL/OSV PASS e lançam erro.

Impacto inferido do encadeamento: mesmo corrigidos os gates anteriores, essa
etapa não fecha na configuração declarada. Vincular consulta autenticada aos
workflows corretos do SHA e distinguir scanner pendente de resultado negativo.

### A05 — P1: candidate exige sua conclusão dentro do próprio run

**Confirmado estaticamente; comportamento remoto inferido.**
`same-sha.mjs:89` admite o self-run in_progress. Porém
`verify-same-sha.mjs:210` transforma apenas conclusão success em PASS, e
`verify-triple-aaa.mjs:353` exige candidate.status PASS enquanto essa etapa está
rodando dentro do próprio candidate. O workflow usa esses scripts nas linhas
190–194 e na etapa final de promoção.

Impacto: requisito circular entre evidência do run e gate que precisa encerrar
esse run. Distinguir validação prévia do próprio candidato e verificação
pós-conclusão, mantendo a exigência final de runs concluídos no mesmo SHA.

### A06 — P1 de CI/supply chain: audit global com alertas novos em ferramentas

**Confirmado por registry e advisories.** São quatro ocorrências high e três
moderate; duas versões de `brace-expansion` concentram várias ocorrências.
Produção tem zero alertas no audit separado. Os paths reportados são:

| Dependência instalada | Caminho | Ocorrências | Correção indicada pelos advisories consultados |
|---|---|---|---|
| `brace-expansion@1.1.18` | eslint → minimatch | 2 high + 1 moderate | Linha 1.x ≥1.1.21 cobre o conjunto consultado. |
| `brace-expansion@5.0.9` | Stryker → minimatch | 2 high + 1 moderate | Linha 5.x ≥5.0.12 cobre o conjunto consultado. |
| `fast-uri@3.1.7` | Stryker → ajv | 1 moderate | ≥3.1.8. |

As falhas de brace expansion permitem negação de serviço quando recebem padrões
não confiáveis; não se comprovou exposição de rota CVG a esse código. Os
advisories oficiais descrevem
[recursão em grupos](https://github.com/advisories/GHSA-qhr7-859c-m2p7),
[reescrita quadrática](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr) e
[normalização de host no fast-uri](https://github.com/advisories/GHSA-hrr3-gc8f-f4qj).
O audit também retorna
[recursão em parseCommaParts](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p).
Atualizar o lockfile dentro das linhas compatíveis e repetir tooling/testes;
não alterar versões silenciosamente durante a auditoria.

### A07 — P2: complexidade excede budgets congelados

**Confirmado pelo gate.** `operations.browser.test.tsx`: 2.055 linhas >2.000;
`createAuthoringRepository` em `authoring-repository.ts:492`: 252 >215;
`materializePublishedAuthoringActivity` em `content-repository.ts:210`: 249 >246.
Mesmo com lint/typecheck verdes, `pnpm verify` não pode ser considerado verde.
Decompor comportamentos coesos e manter cobertura; não elevar caps sem decisão
técnica rastreada. A análise por função também não é uniforme nos arquivos que
o script exclui via exceções históricas de tamanho.

### A08 — P2: testes raiz escapam da verificação TypeScript principal

**Confirmado por configuração e falha live.** `tsconfig.json` referencia packages
e API/worker, mas não `tests/integration`; os configs dos packages cobrem `src`.
Assim, `pnpm typecheck` passou e a chamada live editorial com dependência antiga
foi transformada/executada pelo Vitest e falhou apenas em runtime. Acrescentar
uma verificação dedicada dos contratos de testes de integração/E2E, preservando
os builds de produção e sem mascarar o erro com casts.

### A09 — P2: filtros de freshness não incluem toda configuração relevante

**Confirmado estaticamente.** Os filtros de `evidence-freshness.mjs:16` e
`verify-triple-aaa.mjs:37` não incluem `config/triple-aaa-gates.json`,
`stryker.*.mjs` e `.nvmrc`. Alterações somente nesses paths podem ser tratadas
como ausência de delta de runtime, apesar de mudarem critérios/medição.
Derivar inventário do contrato completo de candidato e testar alterações de
threshold, mutação e toolchain. Não houve criação de commit para reproduzir isso.

### A10 — P2: readiness e seleção de auditoria não seguem uma única evidência

**Confirmado por saída atual e fonte.** `verify-triple-aaa.mjs:188` escolhe v6
por padrão; os outros verificadores selecionam v7. Na linha 824, readiness usa
`stagingPass` e pode emitir STAGING_VERIFIED junto a rejeições de freshness,
same-SHA e bundle. O log desta rodada apresenta exatamente essa combinação.
O relatório histórico permanece histórico, e esse rótulo não foi convertido
em prova de staging atual. Unificar seleção da auditoria e derivação da
readiness a partir dos invariantes de evidência válidos.

### A11 — P2: dívida documental de precedência e evidência agregada

**Confirmado por leitura.** Manifesto reúne execuções antigas com o texto
“Current full coverage run” e métricas 76,24/66,22/79,09/77,20, enquanto o
backlog posterior e esta rodada registram pisos atingidos. O documento 55 ainda
aponta um checkpoint de READY_FOR_NEXT_STEP; o estado prevalente anterior à
auditoria era WAITING_HUMAN_APPROVAL. O backlog mestre contém próximos passos
de JOURNEY-056 já resolvidos em entradas posteriores.

Notas de precedência mitigam a leitura humana, mas não removem ambiguidade
para automação. Preservar registros históricos e publicar um índice corrente
com referência/digest explícitos, sem reescrever resultados antigos como novos.
`verify:audit-consistency` prova concordância limitada entre documentos, não
identidade criptográfica completa com o snapshot.

### A12 — P2: exit 0 não distingue SKIP de teste live executado

**Confirmado por execução.** `run-ratelimit-live.mjs:59–63` retorna sem erro
quando não encontra redis-server. O primeiro comando desta rodada saiu 0 mas
não executou teste. A evidência foi classificada NOT_EXECUTED, o toolkit foi
localizado, e instâncias descartáveis passaram 5/5 e 2/2.
Em CI que exige live, impor evidência de execução e proibir converter esse
retorno inicial em PASS. Esse achado não invalida os sete testes realmente
executados depois.

### A13 — P1: replay HTTP depende de horário variável do servidor

**Reproduzido em aplicação com porta de idempotência controlada, confirmado na
composição HTTP.** `attempts.handler.ts:149/200` gera savedAt/submittedAt a cada
chamada. Esses horários entram nos fingerprints em `answer-use-cases.ts:121` e
`attempt-use-cases.ts:230`. Repetir a operação/chave mantendo o horário retorna
o registro; substituir somente o horário retorna `idempotency_conflict`.
O frontend em `page.tsx:1047/1618` também cria uma chave nova a cada envio.

Impacto: uma resposta HTTP perdida após persistência não permite retry
transparente. Preservar identidade/payload da operação e reutilizar timestamps
persistidos, sem tomar um horário de execução como identidade do pedido.
Evidência: `idempotency-ai-reproduction.log`; não foi simulado packet loss real.

### A14 — P1: submissão pode avaliar uma resposta anterior à edição visível

**Confirmado estaticamente; cenário browser específico não reproduzido.**
`apps/web/app/page.tsx:1608` submete a tentativa sem salvar/comparar campos locais;
o botão na linha 2073 não verifica alterações pendentes. Cenário: salvar A,
editar para B e enviar. O servidor mantém A, enquanto B permanece visível no
campo. Bloquear submissão enquanto houver edição não salva ou salvar e confirmar
todas as alterações antes de submeter. Os E2E atuais verificam o caminho que
salva antes de enviar, não esse cenário discriminante.

### A15 — P1: retomada comum não reidrata as respostas persistidas

**Confirmado estaticamente; cenário específico não reproduzido.**
`page.tsx:1223` reconstrói a tentativa com `answers: []`; `loadActivity` na linha
1166 só restaura respostas quando existe projeção de reflexão. Após salvar uma
escolha/texto comum e recarregar antes do envio, os campos podem reaparecer
vazios. Buscar a projeção de respostas da tentativa e inicializar os campos;
testar escolha/texto, múltipla seleção e reflexão separadamente. Não se constatou
apagamento do registro em PostgreSQL, mas há risco de sobrescrita induzida na UI.

### A16 — P1: recuperação editorial local não isola identidades

**Confirmado estaticamente; troca de sessão na mesma aba ainda deve ser
reproduzida.** `authoring/page.tsx:115` usa chave única de sessionStorage com
prompt, gabarito e fontes; na linha 468 restaura os campos antes da consulta de
memberships. `initialize` corrige scopeId posteriormente, sem vincular os outros
campos ao principal anterior. Uma conta interna de outro escopo na mesma aba
pode receber o rascunho anterior nos campos locais.

O proxy mantém acesso anônimo bloqueado e não foi demonstrada leitura de banco
fora do escopo. Vincular recuperação a principal/escopo, validar antes da
hidratação e limpar na troca/encerramento da sessão.

### A17 — P1: domínio formativo pode alimentar progressão sem conclusão aberta

**Reproduzido no evaluator; ligação posterior confirmada estaticamente.**
`evaluateModuleAttempt` exclui revisão aberta em FORMATIVE_CHOICE na linha 810.
Um quiz correto de M02, com suas duas respostas abertas ausentes, retornou
DOMINIO_DIGITAL e zero pendências abertas. `dashboard-use-cases.ts:343` inclui
esse módulo nos dominados, usados pelo pré-requisito de
`learning-runtime.ts:1002`. Isso mistura domínio do quiz com conclusão das
atividades obrigatórias de RF-025/RN-015.

Separar sinais de domínio, avaliação e conclusão e testar a jornada com quiz
completo/caso pendente. O desbloqueio browser ponta a ponta não foi reproduzido;
o output do evaluator consta em `domain-worker-reproduction.log`.

### A18 — P1: avaliação curricular não se ancora à tentativa e gabarito usados

**Confirmado estaticamente; alcance produtivo não demonstrado.**
`curriculum.handler.ts:347` recebe respostas sem ID de tentativa/versão de
avaliação. `learning-runtime.ts:768` corrige pelo draft global do módulo, cujos
packs na linha 599 mantêm publicação não autorizada. O resultado não demonstra
correspondência com respostas persistidas, itens publicados e gabarito congelado
da tentativa. Ancorar o resultado nos registros/versionamento autorizados.
O fluxo é técnico/formativo; o achado não prova publicação clínica por IA ou
exposição de gabarito ao participante.

### A19 — P1 de aderência: calendário e equivalência de retenção divergentes

**Confirmado por fonte e output do módulo.** `learning-runtime.ts:562/923` usa
7/30/90; RF-049 em `0013_requisitos_funcionais.md:83` exige 30/60/90.
O template reutiliza IDs do conjunto corrente e atribui `equivalentForm: true`
sem a prova de blueprint/ausência de repetição exigida por RN-092. O teste
`learning-runtime.test.ts:111` fixa a regra divergente.

Alinhar código/contrato/teste ao calendário aprovado e validar formas
equivalentes; preservar a condição de draft até revisão. Não houve aplicação
clínica real dessa retenção na auditoria.

### Outros achados de backend, experiência e documentação

Os itens marcados “estático” têm mecanismo identificado nas fontes, mas seu
cenário integrado ainda precisa de reprodução. Um PASS das suítes existentes
não substitui esses casos. São oportunidades de remediação identificadas, sem
declaração de incidente real, exploração ou dano ocorrido.

| ID | Severidade / evidência | Mecanismo e impacto | Remediação e caso discriminante |
|---|---|---|---|
| A20 | P2 / estático: `apps/api/src/main.ts:140`, `security/rate-limit-store.ts:83` | HTTP usa budget geral 120/min; classes auth 20/min e recovery 10/min não governam esse caminho. | Aplicar a política por classe no backend efetivo; testar limites HTTP, não só store. |
| A21 | P2 / estático: `worker/loop.ts:74`, `outbox-repository.ts:197` | Até 25 leases de 60s são obtidas juntas, processadas sequencialmente sem renovação; lease_lost não limita nova claim por attempts. | Garantir lease válida/renovação ou claim por capacidade, efeitos idempotentes e teto; testar handlers lentos em duas instâncias. |
| A22 | P2 / reprodução com adapters: `worker/handlers.ts:123/140` | Publish aguarda embedding; withdraw pode deletar antes do upsert atrasado. Reprodução emitiu delete→upsert. | Revalidar versão/status e ordenação; testar publicação/retirada concorrentes. Nenhum Qdrant real ou vazamento público foi observado. |
| A23 | P2 / estático: `api/main.ts:609`, `worker/main.ts:229`, `server.ts:480` | Entrypoint API não liga sinais ao close; worker fecha integrações sem aguardar lote; flush de traces começa antes do drain HTTP. | Conectar lifecycle e aguardar trabalho ativo antes de fechar/flush; enviar SIGTERM durante requisição/lote controlados. |
| A24 | P2 / estático: `http/rejection-audit.ts:53` | Rejeição autenticada sem escopo explícito permitido retorna antes de append; negações cross-scope e escopo resolvido no handler podem não entrar no audit. | Registrar negação sem permitir leitura/escrita cruzada, com metadados minimizados; testar scopes ausentes/estrangeiros. |
| A25 | P2 / reproduzido em aplicação: `content-repository.ts:569`, `content-use-cases.ts:120` | PersistenceConflictError de CAS passa pelo normalizador genérico e vira internal_error/500. | Mapear conflito concorrente para state_conflict/409; preservar rollback. Output em `domain-worker-reproduction.log`. |
| A26 | P2 / reproduzido: `integrations/ai.ts:327` | nestedErrorName retorna o nome do wrapper; TimeoutError direto é retryable, encapsulado em AiIntegrationError vira unknown/não retryable. | Percorrer causas relevantes preservando classificação/status; testar timeout, conexão e erro permanente encapsulados. |
| A27 | P2 documental/estático: `session-repository.ts:178`, `data-classification.md:11` | Autenticação valida expiresAt/revokedAt, mas não inatividade por lastSeenAt; documentação declara idle+absolute timeout. | Reconciliar contrato e implementação; não inventar prazo de sessão sem decisão de produto/segurança. |
| A28 | P2 / estático: `operations/page.tsx:1773/1836` | Relatórios não cancelam nem ignoram consulta antiga; resposta A lenta pode sobrescrever B e divergir do filtro exibido. | Versionar consulta/abortar e testar resolução fora de ordem, incluindo exportação. |
| A29 | P2 / estático: `page.tsx:1365/1263` | Retry compartilhado de relatos é apagado por sucesso posterior da jornada; requests sem timeout próprio podem permanecer pendentes. | Erro/retry por recurso e deadline explícita; testar falha parcial seguida de sucesso de outro recurso. |
| A30 | P2 / estático: `page.tsx:827`, `journey-repository.ts:190` | Apenas três atividades ordenadas por slug são mostradas; CTA do alvo server-side fora do recorte pode desaparecer. | Garantir nextActionTarget visível independentemente da posição; testar alvo posterior à terceira atividade. |
| A31 | P2 / estático: `page.tsx:1037/2357`, `diagnostic/page.tsx:656` | validation_error genérico sugere corrigir token até em respostas; alerta não aponta campo; progress não tem nome próprio. | Erros públicos por campo, aria-describedby/aria-invalid e nome do progress; verificar com leitor de tela. |
| A32 | P2 / estático: `authoring/page.tsx:642` | Pedido de ajuste clínico envia frase constante sem motivo humano específico. | Exigir fundamentação real da decisão e projetá-la ao autor autorizado. |
| A33 | P2 / estático: `authoring.browser.test.tsx:64` | Cleanup limpa localStorage, enquanto implementação recupera sessionStorage. | Limpar armazenamento correto e testar isolamento/recuperação explicitamente; contaminação da suíte não foi reproduzida. |
| A34 | P2 documental: `mutation-classification-v4.md:38` | Argumento histórico de equivalência afirma que remover label case mantém casamento no seguinte; sem label correspondente a execução pode chegar a default deny. | Rever a equivalência com comportamento executado e identidade do mutante; não usar essa justificativa histórica como prova do harness atual. |

## Gaps já conhecidos, reavaliados nesta rodada

- **REM-06 / somativa:** políticas do domínio existem, mas não estão conectadas
  a um contexto versionado e persistido de elegibilidade. A proposta de
  `docs/decisions/2026-10-02-rem06-summative-eligibility.md` permanece decisão
  humana; o fluxo formativo não deve receber bloqueios somativos inventados.
- **REM-03/04 / same-UID e mutação:** hardening de paths/proveniência existe;
  a fronteira de confiança ainda está em decisão. Não se obteve run Stryker
  genuíno do candidato final e o ID atual continua ausente.
- **REM-09 / restore:** houve avanço comprovado com grants, constraints,
  preflight e rejeição de snapshots sintéticos corrompidos/incompatíveis.
  Isso não aprova grants/roles produtivas, backup externo arbitrário, RPO/RTO
  operacional ou migration produtiva.
- **H-CONTENT:** revisão técnica, aprovação clínica e publicação são diferentes
  gates. A decisão de autorrevisão MVP foi documentada no adendo 0191, mas não
  significa aprovação de todo o acervo clínico.
- **H-REMOTE / RF-02 / RF-09 / AAA-001:** evidência remota, same-SHA e aceite
  operacional permanecem sem substituição por resultados locais.
- **Frontend e operação:** módulos grandes, validação manual de acessibilidade,
  carga atual, SLO observado, Qdrant/IA live e drill conjunto continuam abertos.

## Cobertura das fases AUDIT 0400–0490

Esta rodada possui escopo/identidade/método, plano executado, achados e plano de
remediação neste relatório. Não sobrescreve as auditorias anteriores em BRIEFING.

| Fase | Classificação | Observação |
|---|---|---|
| 0400/0401 — Escopo e plano | PASS | Repositório/worktree/ambientes identificados; evidência local isolada. |
| 0410 — Aderência ao PRD | PARTIAL | Somativa e prontidão clínica incompletas. |
| 0411 — Aderência à SPEC | PARTIAL | Arquitetura e gates estruturalmente coerentes; drift live/CI/evidência. |
| 0412 — Runtime | PARTIAL | API/web/banco na jornada real; Redis e restore; worker/Qdrant completo não observado. |
| 0413 — Logs | PARTIAL | Testes locais de audit/redaction/append-only; sem janela operacional produtiva. |
| 0414 — Métricas | PARTIAL | Instrumentação/testes; sem SLO/k6/collector atuais completos. |
| 0415 — Integrações | PARTIAL | PG/Redis executados; dois testes PG falham; Qdrant e IA não executados. |
| 0416 — Integridade de dados | PARTIAL | RLS/migrations/restore sintéticos positivos; workflow editorial e escopo operacional abertos. |
| 0417 — Segurança/governança | PARTIAL | Autorização positiva no recorte; dev audit/freshness/CI/same-UID pendentes. |
| 0418 — Experiência operacional | PARTIAL | Browser/axe comuns e participante real; staff real, AT e operação produtiva não provados. |
| 0420/0421 — Gaps e remediação | PASS | Achados, limites e ações estão explícitos abaixo. |
| 0490 — Relatório | PASS como entrega | A entrega da auditoria está concluída; o produto conserva veredito REVISE. |

## Plano de remediação proposto

Nenhuma correção de produto foi executada nesta rodada. As ações abaixo servem
ao backlog; implementação deve continuar pelas tasks/gates aplicáveis.

| Ordem | Ação | Critério de pronto | Dependência |
|---|---|---|---|
| 1 | Reconciliar contratos/fixtures dos dois testes PostgreSQL editoriais | Suíte live sem falhas; publicação legítima e recusas, rollback/outbox/audit cobertos | A01; regras editoriais vigentes |
| 2 | Separar suítes E2E comuns/reais e autenticação staff | Comandos oficiais verdes com seleção coerente; cenário participante persistido preservado; staff real testado | A02; fixtures descartáveis |
| 3 | Corrigir encadeamento do candidate e evidência de segurança | Consulta autenticada no SHA correto, ausência de requisito circular, testes dos estados pending/completed | A04/A05; remoto somente quando autorizado |
| 4 | Atualizar dependências dev vulneráveis | Audit global sem high/critical; versões fixadas e regressão de ESLint/Stryker | A06 |
| 5 | Corrigir freshness e readiness | Dirty/staged/untracked/config alterada recusados; identidade da evidência medida inequívoca; readiness sem rótulo stale | A03/A09/A10 |
| 6 | Decompor excessos e validar tipos dos testes raiz | Complexidade PASS sem reduzir barra; chamada antiga do fixture rejeitada pelo typecheck | A07/A08 |
| 7 | Reconciliar índice corrente de docs/traceability | Histórico preservado; checkpoint/claim corrente aponta snapshot/hash e comando verificável | A11 |
| 7A | Corrigir replay, submissão da última edição, retomada e isolamento editorial | Casos de perda de resposta/edição pendente/reload/troca de identidade passam sem perda de rascunho ou acesso cruzado | A13–A16 |
| 7B | Reconciliar progressão, avaliação e retenção com o PRD | Quiz não conclui casos pendentes; resultado ancora tentativa/versão; retenção 30/60/90 e formas equivalentes verificadas | A17–A19; contratos educacionais aprovados |
| 7C | Fechar gaps operacionais e de UX restantes | Leases/withdraw/shutdown/erros/audit/budgets e consultas fora de ordem com casos discriminantes; decisões documentais registradas | A20–A34; boundary de cada task |
| 8 | Decidir contratos somativos e same-UID pendentes | Decisão humana registrada e refletida na SPEC/tasks, sem alteração silenciosa | REM-06 e REM-03/04 |
| 9 | Congelar candidato e renovar mutação/evidência/review | Run genuíno, IDs/hashes válidos e verificação independente do mesmo candidato | Remediações anteriores; commit/freeze pelo fluxo autorizado |
| 10 | Executar gates remotos/operacionais/clínicos aplicáveis | Runs concluídos same-SHA, provas operacionais e aprovação clínica no próprio boundary | H-REMOTE, AAA-001, H-CONTENT |

**Próxima ação técnica recomendada:** abrir uma fatia BUILD delimitada para A13,
corrigindo identidade/replay das mutações de tentativa sem alterar regras de
produto; A01 deve integrar o fechamento dos testes live antes de release. A
aprovação da auditoria como entrega não encerra as remediações existentes nem
libera qualquer gate produtivo.
