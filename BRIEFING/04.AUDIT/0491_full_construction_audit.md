# 0491 — Relatório completo da documentação e da construção

**Data da verificação:** 2026-08-10, America/Sao_Paulo  
**Projeto:** `cvg-trainee-vet`  
**Escopo:** documentação `BRIEFING/`, documentação operacional `docs/`, construção existente em `apps/`, `packages/`, `tests/`, scripts, CI, runtime local e prontidão do programa curricular.  
**Estado auditado:** working tree local no HEAD `1337163a1d7785cb288dac45db797f077de2e290`; a construção não estava congelada em um commit, e os diretórios de aplicação/pacotes estavam fora do índice Git no momento da auditoria.  
**Método:** leitura do corpus documental, inspeção de código/configuração, execução de gates locais, smoke HTTP, integração PostgreSQL/Qdrant local e E2E Playwright.

## 1. Veredito executivo

**Nota geral ponderada reavaliada: 93/100 (93,25/100 antes do arredondamento).** A nota anterior era 90/100 (90,41 antes do arredondamento); o item 14 subiu de 72 para **96**, o item 15 evoluiu localmente de 50 para **78**, enquanto os itens 1–12 permanecem em **95** e o item 13 em **96**. A média ainda não representa prontidão para release.

**Status técnico:** `BLOCKED` para release.  
**Status do produto:** fundação funcional parcial; produto ainda não está completo.  
**Status do programa curricular:** planejado e governado documentalmente, mas não pronto para aplicação; B-07 e a primeira fatia curricular ainda dependem de aprovação/execução humana.

A construção tem uma base técnica boa e disciplinada: TypeScript strict, separação em monorepo, PostgreSQL como fonte transacional, Qdrant tratado como índice derivado, IA server-side desligável, contratos Zod, idempotência, outbox, sessão server-side, cookie `__Host-`, convite hash-only, auditoria append-only com RLS específico, logs redigidos, typecheck/build verdes e testes acima de 80% global.

Ela ainda não constitui o programa completo descrito no PRD. A superfície funcional persistida implementada agora inclui uma jornada mínima agregada: convite, atividade atribuída, tentativa, salvamento de resposta, submissão, correção/feedback/progresso, atribuições, workflow de resultado, runtime de remediação/retenção, próxima ação, autoria/revisão interna em contratos/API/web e processamento resiliente do worker com reconciliação Qdrant não vazia. A camada web também possui estado operacional agregado e proxy configurável, com E2E navegador→API real para health/dependencies e para o fluxo participante persistido. Continuam ausentes a jornada completa de currículo de 24 meses, prova/contestação operacional completa, dashboards completos, aplicação clínica em escala e recuperação de conta além do convite administrativo.

O bloqueio imediato deixou de ser o build: os dois `TS2532` foram corrigidos e os gates foram reexecutados com sucesso. O bloqueio vigente é de completude do produto e governança clínica: o catálogo, os blueprints e a integração digital do runtime estão materializados, mas o banco autoral clínico dos 24 módulos, a revisão item a item e a aprovação clínica para publicação em escala ainda não estão fechados.

## 2. O que foi lido e verificado

| Corpus | Evidência encontrada |
|---|---:|
| Arquivos em `BRIEFING/` | 122 |
| Arquivos em `docs/` | 3 |
| Linhas em `BRIEFING/` | aproximadamente 18.038 |
| Linhas em `docs/` | aproximadamente 2.184 |
| Arquivos técnicos em `apps/`, `packages/`, `tests/` e `scripts/` | 258 na enumeração atual |
| Testes Vitest encontrados | 92 arquivos |
| Specs E2E Playwright | 4 arquivos; 12 cenários no modo padrão e 14 no modo real |

Foram conferidos os gates de Discovery, PRD, SPEC, BUILD e AUDIT; o roadmap, backlog, runtime state, log mestre, matriz curricular, requisitos, contratos, dados, integrações, segurança, observabilidade, operação, skills/agents e traceability manifest. A documentação é extensa e coerente em suas regras de proteção, mas parte dos documentos de auditoria registra execuções históricas anteriores à reexecução desta rodada.

## 3. Evidências executadas nesta rodada

| Verificação | Resultado | Interpretação |
|---|---|---|
| `pnpm format:check` | **PASS** | Formatação consistente. |
| `pnpm lint` | **PASS** | ESLint sem achados. |
| `pnpm typecheck` | **PASS** | TypeScript strict passou após a correção dos dois acessos potencialmente indefinidos em `packages/integrations`. |
| `pnpm build` | **PASS** | Os 12 workspaces executáveis, incluindo curriculum, persistence, API, worker e web, compilaram. |
| `pnpm test:coverage` | **PASS** | 76 arquivos passaram, 16 ficaram fora por dependências live; 352 testes passaram, 17 ficaram fora. Statements 84,92%; branches 80,34%; functions 85,89%; lines 85,61%. |
| `pnpm test:e2e` | **PASS** | 12 cenários Chromium passaram em build de produção; axe, teclado, retry, empty, stale, viewport estreito e revisão interna foram exercitados com fixtures sintéticos. |
| `CVG_RUN_REAL_E2E=true ... pnpm test:e2e` | **PASS** | 14 cenários passaram sem skips; o navegador aceitou convite, carregou atividade persistida, iniciou tentativa, salvou resposta e submeteu pela web proxy→API→PostgreSQL. A fixture é sintética, efêmera e removida ao encerrar. |
| `pnpm test:integration:live` | **PASS** | 18 arquivos e 26 testes PostgreSQL live passaram sem skips; migrações 0000–0014, autoria/revisão, jornada, RLS contextual, menor privilégio, rate limit compartilhado e health core foram exercitados. |
| Integração Qdrant estendida | **PASS COM ESCOPO LIMITADO** | 21 arquivos e 29 testes passaram sem skips com URL/chave fornecidas fora do repositório; o worker foi exercitado com conteúdo não vazio, escopo isolado, divergência, órfão, replay e retirada. |
| `pnpm test:integration:restore` | **PASS** | 1 teste restaurou marcador sintético em alvo PostgreSQL isolado via container descartável; ferramentas e destino permanecem pré-condições operacionais explícitas. |
| `pnpm test:contract` / `pnpm test:worker` / `pnpm verify:migrations` | **PASS** | 12/36 testes de contrato, 4/24 testes de worker e journal 0000–0014 alinhado aos 15 SQLs. |
| Smoke HTTP local | **PASS** | `/health/live`, `/health/ready`, `/health/dependencies`, exportação interna protegida, envelopes 401/404/422 e proteção cross-origin 403 responderam conforme esperado. |
| Logs do API | **PASS COM LIMITES** | JSON estruturado com request/correlation ID, duração, rota, status e outcome; não foram observados payloads, tokens ou segredos. |
| `pnpm reconcile:qdrant` | **PASS COM ESCOPO LIMITADO** | O comando operacional continua respondendo somente com contadores técnicos e, na execução sem conteúdo publicado, retornou `expected: 0`; a prova não vazia agora está no teste live conjunto `worker-qdrant-live.test.ts`, com divergência, órfão, replay e retirada. |
| `pnpm verify:secrets` | **PASS** | `secret scan: clean`. |
| `pnpm verify:traceability` | **PASS** | O manifesto liga o desenho curricular a requisitos, documentos, código, testes e verificações; a completude clínica continua explicitamente pendente. |
| `pnpm verify:exposure` | **PASS BASELINE** | Campos proibidos estão registrados na fronteira pública. |
| Runtime curricular e B-07 | **PASS TÉCNICO** | `pnpm vitest run packages/curriculum/src/learning-runtime.test.ts tests/integration/curriculum-catalog.test.ts` passou com 15 testes; `pnpm --filter @cvg/curriculum typecheck` passou; preflight materializa 24 packs e B-07 120/40/40/40. |
| Runtime persistido/API/web | **PASS COM ESCOPO LIMITADO** | Use cases, tabela `curriculum_runtime_states`, migração 0009, contratos, GET público, POST interno moderado, projeção web e integração PostgreSQL live passaram; a primeira fatia de API dos estados de aprendizagem também foi ligada ao repositório; a projeção remove IDs internos e não declara competência prática. |
| Primeira fatia de API dos estados de aprendizagem | **PASS COM ESCOPO LIMITADO** | Criação/transição de atribuições, workflows, tickets e contestações têm contratos estritos, autorização server-side, escopo, projeções redigidas, versionamento e envelopes de erro; dashboard, jornada completa e idempotência distribuída permanecem pendentes. |
| Persistência dos estados de aprendizagem | **PASS COM ESCOPO LIMITADO** | `learning_assignments`, `assessment_workflows`, `feedback_tickets` e `appeals` têm FKs, constraints, índices, versionamento otimista, rollback e RLS contextual; migrations 0010/0011 e teste live passaram com papel temporário sem `SUPERUSER`/`BYPASSRLS`. |
| Seed editorial | **PASS DE SEGURANÇA** | M02, módulos e B-07 são projetados/seedados em `RASCUNHO`; atividade não é marcada `PUBLISHED` antes de autorização. |
| `pnpm verify:documentation` | **PASS** | Gate executável validou arquivos canônicos, matriz de 16 scores, estado/log/backlog, 0490 histórico e artifact de auditoria no manifesto. |
| `pnpm verify:product-definition` | **PASS** | Gate executável validou a ordem Discovery → PRD → SPEC, os documentos do PRD/SPEC, dez domínios de definição e a regra de não alteração silenciosa de escopo. |
| `pnpm audit --audit-level=high` | **PASS** | Nenhuma vulnerabilidade conhecida reportada pelo audit executado. |
| `pnpm verify` | **PASS** | Todos os gates configurados passaram no working tree atual; coverage, contract, worker, migrations, documentação, traceability, exposure, secrets, arquitetura e product-definition passaram. |
| `git diff --check` | **PASS** | Sem erro de whitespace. |

### 3.1 Evidência positiva de runtime

O API foi iniciado localmente com PostgreSQL e Qdrant configurados sem revelar credenciais. Readiness e `/health/dependencies` verificaram as dependências, e a exportação interna de métricas foi exercitada com auditor sintético. Também foram observados: rejeição de JSON inválido com 422, rejeição de atividade sem sessão com 401, rejeição de origem não permitida antes do caso de uso com 403 e resposta pública limitada para convite inexistente com 404. O restore descartável recuperou um marcador sintético sem perda.

A tentativa de iniciar em `NODE_ENV=production` usando o embedding determinístico foi recusada pela configuração, como deveria ocorrer: o provider fake é permitido somente em desenvolvimento/teste. Isso é uma proteção correta, mas mostra que ainda falta configurar e provar o provider de produção antes de qualquer rollout.

### 3.2 Limitações da evidência

- o E2E real cobre health/dependencies e o fluxo participante completo mínimo navegador→web proxy→API→PostgreSQL com convite/atividade persistidos; os demais fluxos do PRD permanecem fora;
- backup/restore foi exercitado somente com marcador sintético em banco descartável; crash/recovery completo, carga, failover ou múltiplas réplicas não foram executados;
- não houve collector/OTel externo, dashboard provisionado, retenção efetiva no fornecedor ou traces distribuídos;
- não houve auditoria axe/manual completa;
- não houve IA externa real;
- não houve conteúdo clínico real, PDF, foto, prontuário, tutor ou caso identificável;
- a execução live local usou fixtures sintéticos e não prova prontidão de produção;
- o working tree não estava congelado em commit com código rastreado.

## 4. Matriz de notas 0–100

As notas medem o estado real observado, não apenas a qualidade da intenção documental. A nota geral é a média ponderada pelos pesos abaixo: **93,25/100**, arredondada para **93/100**.

| Item avaliado | Peso | Nota | Julgamento resumido |
|---|---:|---:|---|
| 1. Documentação, gates e governança | 7% | **95** | Corpus canônico, separação histórica/vigente, roadmap/backlog de score, estado/log e manifesto possuem gate executável e evidência atual. Os gates técnicos também passaram, sem apagar os gaps de produto. |
| 2. Discovery, PRD e SPEC como definição do produto | 5% | **95** | Gates aprovados na ordem, requisitos e decisões mapeados para a SPEC, matriz DEF-01–DEF-10 executável e diferença entre definição completa e construção parcial explicitada sem reduzir escopo. |
| 3. Programa curricular e prontidão de conteúdo | 10% | **95** | Catálogo de 24 módulos, packs versionados, B-07 com 120 itens, diagnóstico por tema, domínio/remediação/retenção, integração persistida/API/web, projeção segura e preflight técnico foram construídos/testados; autoria clínica específica e aprovação continuam pendentes. |
| 4. Arquitetura e modularidade | 7% | **95** | Monorepo modular, contextos, composição de adapters, direção de dependências e imports proibidos possuem policy executável e gate TDD; gaps de ports compartilhados, web/contratos e commit rastreável permanecem explícitos. |
| 5. Domínio, contratos e regras de negócio implementadas | 6% | **95** | Invariantes, máquinas de estado, política somativa, remediação/retensão, contestação, tickets, idempotência, versionamento e contratos públicos estritos estão implementados e testados; persistência e superfícies permanecem nos itens seguintes. |
| 6. Persistência, migrações e integridade transacional | 7% | **95** | Quatro entidades de aprendizagem têm migrações 0010/0011, FKs, índices, constraints condicionais, versionamento otimista, rollback e RLS contextual comprovados live com papel sem bypass; legado, retenção e restore seguem nos itens próprios. |
| 7. API e superfície funcional backend | 7% | **95** | Primeira fatia persistida exposta com contratos estritos, autorização por papel/escopo, projeções redigidas, transições versionadas e erros públicos consistentes; o produto completo ainda não está coberto. |
| 8. Segurança, identidade, autorização e privacidade | 9% | **95** | RLS contextual, contexto transacional, menor privilégio, rotação/revogação, CSRF/origem, rate limit PostgreSQL compartilhado e testes live negativos foram materializados; rollout produtivo, tabelas fora do escopo e E2E real permanecem gaps. |
| 9. Jornada mínima do participante | 7% | **95** | Contrato agregado, próxima ação, leitura contextual de atribuições/atividades/results/runtime, rota segura, web sem deep link e E2E sintético estão implementados; jornada completa do PRD, dashboard e E2E real permanecem gaps. |
| 10. Autoria, revisão, avaliação e governança clínica executável | 7% | **95** | Autoria versionada, bancos internos M02/24/B-07, preflight, revisão independente, persistência, gate de publicação, API/web interna e projeção pública segura estão executáveis; aplicação clínica em escala, prova/recurso completo e aprovação humana continuam pendentes. |
| 11. Worker, Qdrant, IA e resiliência | 6% | **95** | Matriz de eventos reconhecidos, reconciliação live não vazia com divergência/órfão/replay/retirada, lease expirado, retry e dead-letter foram provados; provider produtivo, restart observável e telemetria externa permanecem gaps. |
| 12. Observabilidade e operação | 5% | **95** | Health/dependencies, exporter protegido, redaction, SLO/alertas, correlação, runbooks e restore sintético foram provados; collector externo, retenção efetiva, dashboards, traces distribuídos, carga e failover permanecem gaps operacionais. |
| 13. Web, UX e acessibilidade | 4% | **96** | Participante, autoria e operação possuem estados de experiência, foco/teclado, axe, viewport estreito, fronteira pública redigida e E2E real de health e do fluxo persistido mínimo; revisão manual ampliada permanece gap. |
| 14. Testes, cobertura e qualidade de evidência | 6% | **96** | `0507` fecha comandos por camada, cobertura global, live PostgreSQL/Qdrant/restore, migrations e E2E navegador→API→PostgreSQL persistido; cobertura por módulo e execução remota do CI ainda têm limites explícitos. |
| 15. CI, reprodutibilidade e prontidão de build | 5% | **78** | `0508` fecha pins, contrato de ambiente, serviços descartáveis, migrations, live PostgreSQL/Qdrant, restore, build, E2E e upload condicional de artefatos localmente; execução remota, SHA, artefatos do Actions, rollback e cache observado continuam pendentes. |
| 16. Rastreabilidade de código e controle de mudança | 2% | **45** | Manifesto, docs e caminhos existem; código/pacotes não estavam rastreados no commit auditado e os status declarados superam o estado atual. |

### 4.1 Leitura da nota geral

- **80–100:** pronto ou muito próximo de pronto para o escopo declarado;
- **60–79:** base funcional relevante, ainda requer fechamento de riscos;
- **40–59:** protótipo/fundação com utilidade real, mas não pronto para release;
- **0–39:** planejamento ou construção inicial sem evidência suficiente.

O 93/100 não significa que a fundação esteja pronta para release. Significa que a base técnica, as regras de domínio, a primeira camada curricular, a jornada mínima, a autoria/revisão interna, o worker/Qdrant resiliente, a primeira fatia de API, a baseline de segurança, a superfície web, o gate de qualidade de evidência e o contrato local de CI já têm comprovação executável, mas a execução remota, o produto completo, a aplicação clínica em escala e a operação externa ainda não estão fechados.

## 5. Achados detalhados

### 5.1 Documentação e governança — 95/100

Pontos fortes:

- Discovery, PRD, SPEC, BUILD, AUDIT, runtime, skills, agents e backlog têm estrutura explícita;
- os gates canônicos estão nomeados e as dependências são visíveis;
- limites de privacidade, autoria, IA assistiva e ausência de dados reais aparecem repetidamente;
- `docs/99_runtime_state.md`, log e backlog fornecem continuidade;
- 0400–0490 já classificam gaps e não aprovam release.

Correções que fecharam os descontos:

- 0490 foi marcado explicitamente como registro histórico e aponta para o 0491 vigente;
- `scripts/verify-documentation.mjs` e `pnpm verify:documentation` validam a existência do corpus canônico, os campos do runtime state, a entrada atual do log/backlog, os 16 scores e pesos do relatório, a separação histórica/vigente e o artifact de auditoria;
- `0492_score_95_roadmap.md` e `0493_score_95_backlog.md` congelam a ordem, a meta, as dependências, os critérios de saída e a regra de não avançar;
- `traceability.yml` agora liga requisitos, documentos, código, testes e comandos de verificação do ciclo AUD-0491;
- o build/typecheck foi corrigido e reexecutado; os gaps de produto, conteúdo clínico e operação continuam visíveis no estado/log/backlog e não foram mascarados.

O item atinge 95/100 no escopo específico de documentação, gates e governança. O resultado não autoriza promover as notas dos outros itens nem aprovar release.

### 5.2 Definição do produto — 95/100

O PRD é particularmente forte em escopo, papéis, limites de uso, pesos de avaliação, privacidade, publicação clínica, ausência de ranking e retenção. A SPEC traduz essas decisões em arquitetura, domínio, contratos, dados, integrações, operação, web, testes e backlog.

O desconto original era a distância entre definição e execução. Essa distância agora está explicitamente modelada em `0494_product_definition_coverage.md`: cada domínio aponta para Discovery, PRD, destino na SPEC, estado da definição e estado atual da construção. O PRD continua listando diagnóstico, trilha personalizada, conteúdo, quiz/casos, prova somativa, remediação, retenção, dashboards, autoria, revisão, publicação, question bank, recurso, relatórios e tickets; a construção parcial não é usada para remover nem reclassificar esses requisitos.

O gate `pnpm verify:product-definition` confirma a ordem Discovery → PRD → SPEC, aprovação formal, cobertura DEF-01–DEF-10 e a regra de não alteração silenciosa de escopo. B-07, T2 e métricas propostas permanecem classificados como decisões/pendências próprias, sem serem confundidos com falha de definição.

### 5.3 Programa curricular e conteúdo — 95/100

O item saiu de 18 para 95 porque a grade deixou de ser apenas proposta e passou a ter catálogo, packs versionados, diagnóstico B-07, runtime de aprendizagem persistido/integrado, projeção pública segura e pré-voo técnico, sem ultrapassar a fronteira de publicação clínica. O desenho foi informado pela pesquisa mundial de 0495 e pela matriz interna F-01/F-02/F-03 — *Tratado de Medicina Interna de Cães e Gatos* de Jericó/Kogika/Andrade Neto, *Ettinger’s Textbook of Veterinary Internal Medicine* 9ª edição e *Cirurgia de Pequenos Animais* 4ª edição de Fossum — mantendo diretrizes atuais e protocolos aprovados como autoridade para temas dinâmicos.

| Dimensão avaliada | Nota | Evidência | Limite atual |
|---|---:|---|---|
| Estrutura e cobertura curricular | 20/20 | 24 módulos, 96 sessões, aproximadamente 149 horas, objetivos, audiências, comportamentos hospitalares, loop de eficácia e B-07 com 120 itens em 3 blocos de 40. | A aplicação real e a validação local de eficácia ainda não começaram. |
| Literatura, atualização e governança | 13/15 | Pesquisa 0495, matriz F-01/F-02/F-03, diretrizes dinâmicas, localizadores internos, data de corte e revisão humana previstos. | A redação dos temas dinâmicos e a revisão clínica item a item ainda estão pendentes. |
| Questões e instrumentos | 19/20 | M02 com 31 questões + 2 abertas; packs para os 24 módulos; B-07 materializado com 120 itens; escolha simples/múltipla, rubricas, remediação e preflight. | Os packs fora de M02 ainda são drafts parametrizados e não banco clínico publicado/revisado. |
| Eficácia hospitalar e aprendizagem | 15/15 | Baseline por tema, recuperação ativa, caso progressivo, simulação digital, debriefing, domínio por objetivo, remediação dirigida e D+7/D+30/D+90; prática/autonomia permanecem proibidas no MVP. | Transferência para indicadores reais depende de piloto humano autorizado. |
| Projeção pública, versionamento e segurança | 15/15 | Projeções removem fontes, gabaritos, rubricas, blueprint e criticidade; seeds de M02, módulos e B-07 permanecem `RASCUNHO` sem promoção automática. | A publicação clínica continua bloqueada até pré-voo e aprovação de Ricardo. |
| Runtime, integração e prontidão clínica | 13/15 | Diagnóstico, trilha, domínio, remediação e retenção estão persistidos por participante/módulo, possuem contratos/API, projeção web segura, migração 0009 e evidência PostgreSQL live; testes cobrem entradas inválidas, correção humana e fronteira pública. | RLS contextual, E2E navegador→API real, autoria clínica, pré-voo item a item e aprovação humana em escala continuam pendentes. |

O score técnico/documental é, portanto, **95/100**: a estrutura técnica e pedagógica do programa está materializada, integrada e testável. Isso não equivale a prontidão clínica ou autorização de aplicação ampla: a etapa de observação no trabalho, prática presencial, habilidade psicomotora e autonomia clínica permanece fora do MVP digital; os drafts clínicos exigem autoria, revisão e aprovação de Ricardo.

### 5.4 Arquitetura e construção — 95/100

A escolha de API autoritativa, SPA, worker, packages por fronteira, PostgreSQL transacional, Qdrant derivado e IA desligável é adequada ao escopo. O código evita microserviços e fornecedores obrigatórios sem necessidade documentada. A decisão agora possui policy executável e teste de boundary, reduzindo o risco de o monorepo modularizar apenas por convenção.

| Dimensão avaliada | Nota | Evidência | Limite atual |
|---|---:|---|---|
| Contextos e responsabilidades | 20/20 | SPEC 0101–0103, bounded contexts, mapa de módulos e composição API/worker coerentes. | Não há desconto nesta dimensão. |
| Direção e isolamento de dependências | 24/25 | `architecture-boundaries.json` cobre os 12 manifests e o teste rejeita imports proibidos por camada. | A persistência referencia tipos de portas da aplicação no mesmo workspace; é aceitável no recorte, mas pode ser extraído para um pacote de ports se o domínio crescer. |
| Composição, adapters e fonte de verdade | 19/20 | API/worker fazem composição; PostgreSQL é transacional; Qdrant/IA são derivados, server-side e desligáveis. | A web ainda usa a borda HTTP sem pacote compartilhado de UI/contratos. |
| Testabilidade e mudança segura | 15/15 | TDD RED→GREEN, `verify:architecture`, typecheck, build, cobertura e traceability. | Não há desconto nesta dimensão. |
| Falha, rollback e operação arquitetural | 12/12 | Portas, adapters, retry/outbox, migrações versionadas e rollback documentado. | RPO/RTO e operação real continuam itens próprios e não são mascarados aqui. |
| Evidência e rastreabilidade | 5/8 | Policy, teste, SPEC, relatório 0497, backlog, log e manifesto ligados. | O código ainda está em working tree não congelado; a cadeia commit/artefato será fechada no item 16. |

O score é **95/100** no escopo arquitetural. Os descontos remanescentes são limites de evolução e rastreabilidade, não autorização para violar fronteiras. As funcionalidades de domínio, persistência, API, segurança e operação continuam avaliadas nos itens próprios.

### 5.5 Domínio, contratos e regras de negócio — 95/100

O item 5 foi reavaliado em **95/100** na matriz `0498_domain_contract_matrix.md`. O domínio agora valida timestamps completos, identificadores, textos simples, enums, versionamento e estados armazenados; suas transições retornam novos objetos congelados. Foram materializados fluxos separados para tentativa, conteúdo, atribuição, resultado, ticket de feedback e contestação, além da política determinística de avaliação somativa com composição 0/30/70, limiares 70/80, dados incompletos, não aplicabilidade, remediação e intervalo entre tentativas.

Os contratos públicos correspondentes são estritos, rejeitam HTML, campos internos, escolhas vazias e payloads condicionais ausentes. A política permanece pura e não depende de SQL, HTTP, cookies, SDK ou IA. Persistência das novas entidades, rotas, autorização contextual e telas continuam corretamente avaliadas nos itens 6, 7, 8 e 9; portanto a nota não afirma que a API completa do produto já exista.

### 5.6 Dados, persistência e integridade transacional — 95/100

O item 6 foi reavaliado em **95/100** na auditoria `0499_persistence_integrity_audit.md`. As migrations `0010_classy_kronos.sql` e `0011_daffy_nova.sql` materializam `learning_assignments`, `assessment_workflows`, `feedback_tickets` e `appeals`, ligando as entidades do item 5 a contas/tentativas por FK, índices de participante/escopo/status, unicidade e constraints de módulo, estado, texto, prazo, decisão e versão. A migration 0011 corrige explicitamente as condições SQL que poderiam aceitar `NULL` em estados condicionais.

O repositório `learning-state-repository.ts` valida e mapeia o domínio, configura o contexto `cvg.participant_id`/`cvg.scope_id` dentro da transação, cria em versão 0, atualiza somente contra a versão anterior esperada e retorna conflito explícito para concorrência obsoleta. O teste live comprovou rollback, FK/constraint, leitura sem contexto e leitura em contexto cruzado negadas, além de `ENABLE/FORCE ROW LEVEL SECURITY` nas quatro tabelas usando papel temporário sem `SUPERUSER`/`BYPASSRLS`.

O score é 95 no escopo de persistência das entidades novas. O item 8 agora materializa RLS contextual nos caminhos participantes/execução cobertos, contexto transacional, menor privilégio e rate limit compartilhado; permanecem transferidos para operação os grants do usuário de produção, retenção/anonimização, backup/restore, RPO/RTO e recuperação. A configuração local observada usa o usuário `cvg` como superusuário/bypass; por isso a prova de RLS foi feita por papel restrito criado no teste, não por esse usuário.

### 5.7 API e superfície funcional backend — 95/100

O item 7 foi reavaliado em **95/100** na auditoria `0500_api_surface_audit.md`, no escopo da primeira fatia backend persistida. A API agora expõe criação e transição de `learning_assignments`, `assessment_workflows`, `feedback_tickets` e `appeals`, com schemas Zod strict, validação de UUID/contexto/versão, autorização server-side por capacidade, papel e escopo, e composição pelo port da aplicação ao repositório PostgreSQL.

As projeções públicas removem `participantId`, `scopeId`, `reviewerId`, regras internas, fontes, gabaritos, rubricas e metadados editoriais. Os envelopes preservam os códigos esperados: entrada inválida 422, ausência de sessão 401, papel/escopo 403, recurso ausente 404, conflito de estado ou versão 409 e erro interno 500 sem detalhes de infraestrutura. A rota parametrizada continua sendo normalizada no `routeTemplate` para observabilidade sem vazar identificadores.

O score detalhado é: contratos/validação/projeções 20/20; rotas e composição 24/25; autorização/papéis/escopo 20/20; versionamento/erros 16/18; testes/evidência 10/12; compatibilidade/exposição 5/5. O desconto não é por falha observada na fatia entregue, mas por escopo: dashboard, trilha completa, filas editoriais, GETs paginados, E2E navegador→API real, idempotência distribuída e operação de produção ainda pertencem aos itens próprios.

### 5.8 Segurança, identidade, autorização e privacidade — 95/100

O item 8 foi reavaliado em **95/100** na auditoria `0501_security_isolation_audit.md`. O contexto `cvg.participant_id`/`cvg.scope_id` é aplicado dentro das transações de leitura e escrita; a migration `0012_secure_participant_rls.sql` habilita/força policies nos caminhos participantes de atribuição, runtime, tentativa, resposta, idempotência e resultado. Contexto vazio e contexto cruzado foram testados com papel `NOSUPERUSER NOBYPASSRLS` no PostgreSQL real.

O `healthcheck` com `requireLeastPrivilege` rejeita conexão superusuária ou com `BYPASSRLS`, e a produção liga a exigência por configuração. A migration `0013_shared_rate_limit.sql` e `createPostgresRateLimiter` usam bucket transacional PostgreSQL; duas instâncias compartilharam a janela no teste live. CSRF, origem, convite hash-only, rotação e revogação permanecem ativos e não transportam token, fonte, PDF, foto ou dado real para projeções/logs.

O detalhamento é: RLS/isolamento 28/30; menor privilégio 20/20; identidade 15/15; CSRF/origem/rate limit 15/15; redaction/evidência 12/12; rollout operacional 5/8. Os descontos restantes cobrem provisionamento de produção, backup/restore, tabelas editoriais/administrativas fora da fatia, múltiplas réplicas de produção e E2E navegador→API real.

### 5.9 Jornada mínima do participante — 95/100

O item 9 foi reavaliado em **95/100** no artifact `0502_learning_journey_audit.md`. A jornada agora possui um contrato agregado estrito (`packages/contracts/src/journey.ts`), caso de uso contextual e imutável (`packages/application/src/journey-use-cases.ts`), repositório PostgreSQL (`packages/persistence/src/journey-repository.ts`), rota autenticada `GET /api/v1/learning-path` e consumo web após o aceite de convite.

O agregado reúne atribuições, atividades publicadas, tentativa mais recente, workflows de resultado e runtimes de remediação/retenção. A próxima ação prioriza remediação, retenção e correção pendente antes de retomada/início de atividade; o servidor valida participante/escopo e a projeção remove IDs internos, fontes, gabaritos, rubricas e competência prática. O teste live com papel sem `SUPERUSER`/`BYPASSRLS` comprovou leitura própria e retorno vazio para participante cruzado.

A evidência da rodada foi: 70 arquivos/323 testes, 11 skips; cobertura 85,01%/80,19%/86,53%/85,72%; 6/6 E2E sintéticos; 1/1 teste live de isolamento/jornada; typecheck, lint, build, audit, secrets, exposure, documentação, traceability e diff-check verdes. O desconto restante cobre jornada completa de 24 meses, dashboard, autoria/contestação operacional, E2E navegador→API real e gates clínicos/operacionais.

### 5.10 Autoria, revisão, avaliação e governança clínica executável — 95/100

O item 10 foi reavaliado em **95/100** no artifact `0503_authoring_review_audit.md`. A construção materializa autoria interna versionada: M02 possui 31 questões objetivas e 2 abertas; os 24 bancos curriculares e B-07 possuem itens sintéticos com módulo, sessão, objetivo, autor, correção, remediação e referência interna. A projeção `participant` é separada do registro editorial e não contém gabarito, rubrica, fontes ou autoria.

O `runAuthoringPreflight` executa regras determinísticas para campos obrigatórios, correção, fronteira pública e rastreabilidade. `reviewAuthoringContent` exige papel e escopo, impede que o autor aprove o próprio item, persiste `APROVAR_CLINICAMENTE`/`SOLICITAR_AJUSTES` e liga a decisão à transição de conteúdo. O repositório calcula a prontidão de publicação somente quando há registro editorial, preflight técnico e última aprovação clínica; a IA não tem autoridade sobre esses estados.

As tabelas `content_editorial_records` e `content_review_decisions` foram aplicadas pela migration `0014_salty_penance.sql`. As rotas internas de leitura/revisão e a tela `apps/web/app/authoring/page.tsx` expõem gabarito, rubrica e fontes somente a papéis autorizados; participante recebe 403 e nenhuma projeção pública carrega os campos internos. Correção, resultado e contestação existentes permanecem ligados ao caminho educacional, mas a tela operacional completa de prova/recurso e a revisão clínica item a item de todos os packs ainda não foram encerradas.

A evidência atual é: 74 arquivos/341 testes, 12 skips; cobertura 84,69%/80,08%/85,74%/85,38%; 7/7 E2E sintéticos; 16 arquivos/22 testes live e 1 skip; migration 0014 aplicada; typecheck, lint, build, audit, secrets, exposure, documentação, traceability e diff-check verdes. O desconto restante cobre aplicação clínica em escala, aprovação de Ricardo, E2E navegador→API real e transação única entre decisão editorial e transição de conteúdo.

### 5.11 Worker, Qdrant e IA — 95/100

O item foi fechado na auditoria `0504_worker_resilience_audit.md`. O worker reconhece os sete eventos atuais — publicação, retirada, workflow editorial, submissão, resposta salva, avaliação corrigida e solicitação interna de IA — sem transformar eventos educacionais em segunda fonte de verdade. Publicação e retirada usam handlers explícitos; eventos educacionais sem efeito de integração são apenas reconhecidos e confirmados.

O cenário live conjunto `tests/integration/worker-qdrant-live.test.ts` criou duas versões sintéticas publicadas, semeou um vetor divergente e um órfão, provou `expected:2`, `upserted:2`, `removed:1`, repetiu a reconciliação com `upserted:0`/`removed:0`, alterou conteúdo e obteve `upserted:1`, repetiu o publish com o mesmo ID determinístico sem duplicação, retirou uma versão e confirmou a lista final. O Qdrant recebeu somente metadados internos; PostgreSQL permaneceu fonte da verdade.

O cenário live `tests/integration/postgres-worker.test.ts` abandonou um evento em `PROCESSING`, confirmou reclaim após lease expirado, executou retry e atingiu dead-letter no limite de tentativas. Os testes unitários mantêm backoff limitado, falha parcial, redaction de logs, fallback sem Qdrant e IA estruturada server-side desligável. A pontuação é **95/100** no escopo técnico do item 11.

Gaps mantidos: restart de processo observável, provider produtivo de embedding/IA, collector/exporter externo, alertas, traces, operação de múltiplas réplicas, restore e carga. Exactly-once não é declarado; o contrato é at-least-once com upsert/delete determinísticos e idempotentes. Nenhum worker, Qdrant ou IA decide publicação, nota, gabarito, papel, aprovação clínica ou estado educacional.

### 5.12 Observabilidade e operação — 95/100

O item foi fechado na auditoria `0505_observability_operations_audit.md` no recorte técnico/documental. A API agora expõe `/health/dependencies` com o estado agregado e redigido de PostgreSQL, Qdrant e IA; PostgreSQL em falha produz `NOT_READY`, Qdrant em falha produz `DEGRADED`, e nenhuma mensagem interna chega ao cliente.

Métricas contam e observam somente rotas, eventos, status e resultados allowlisted. `renderPrometheusMetrics` produz texto redigido; `/internal/metrics` exige capability interna e o teste HTTP confirma que participante não acessa a exportação. `evaluateSlo` e `evaluateOperationalAlerts` cobrem `PASS`, `BREACHED`, `NO_DATA`, PostgreSQL crítico e Qdrant degradado. Logs permanecem JSON estruturado com correlação API→outbox→worker e sem payload clínico.

O script `scripts/verify-postgres-restore.mjs` executa `pg_dump` custom, `pg_restore` e valida um marcador sintético em banco temporário isolado. A execução live desta rodada restaurou o marcador, limpou os artefatos e mediu RTO local de 2.581 ms; o RPO observado foi zero perda do marcador neste cenário.

Gaps mantidos: collector/OTel e retenção efetivos de ambiente, dashboard provisionado, spans distribuídos, crash/failover/carga e múltiplas réplicas. O contrato operacional 0804 define esses limites, alertas, acesso e retenção aprovada; a evidência local não autoriza release.

### 5.13 Web, UX e acessibilidade — 96/100

O artifact `0506_web_ux_accessibility_audit.md` reavaliou o item. `apps/web/app/page.tsx` agora possui estados explícitos de loading, empty, error, stale e retry; o fluxo preserva projeção carregada quando uma atualização falha e mantém mensagens públicas limitadas. `apps/web/app/authoring/page.tsx` separa a superfície interna com campos descritos e busy state, enquanto `apps/web/app/operations/page.tsx` mostra somente o contrato agregado de dependências redigidas.

O layout fornece `lang=pt-BR`, skip link, foco visível, IDs únicos e reduced motion. Axe passou nas entradas participante e autoria; Playwright comprovou teclado/foco, labels, retry, jornada vazia, viewport 390×844 e ausência de campos internos. O modo real passou com 14/14 cenários: o navegador chamou `/health/dependencies` e também completou o fluxo participante persistido pela web até a API/PostgreSQL, sem interceptação.

O score é técnico e limitado à superfície existente. A revisão manual não substitui testes com leitor de tela/usuários e o produto completo do PRD (diagnóstico, dashboard, feedback e trilha integral) permanece para itens próprios.

### 5.14 Testes, cobertura e qualidade de evidência — 96/100

O artifact `0507_test_quality_evidence_audit.md` fecha o item 14. Os comandos por camada são executáveis: `test:contract` passou com 12 arquivos/36 testes, `test:worker` com 4/24 e `verify:migrations` validou 15 migrations SQL alinhadas ao journal. A cobertura final passou com 352 testes e 17 testes live fora do gate unitário por configuração; statements 84,92%, branches 80,34%, functions 85,89% e lines 85,61%.

O gate live PostgreSQL passou com 18 arquivos/26 testes sem skips; a extensão Qdrant passou com 21/29 e o restore com 1/1 em container descartável. O E2E padrão passou 12/12 e o modo real 14/14, incluindo aceite do convite, atividade, tentativa, resposta e submissão persistidos no PostgreSQL. A fixture é sintética, efêmera, limpa no shutdown e não expõe token, hash, fonte ou dado clínico.

O CI agora declara serviço PostgreSQL, aplica migrations, executa live integration, restore, E2E padrão, E2E real e audit; a execução remota ainda precisa ocorrer no próximo job. A cobertura por módulo continua desigual em entrypoints de composição e alguns repositórios e está registrada como gap, sem tornar a cobertura global falsa. O item 15 passa a tratar a prova remota e a reprodutibilidade final do ambiente.

### 5.15 CI, reprodutibilidade e prontidão de build — 78/100

O artifact `0508_ci_reproducibility_audit.md` reavaliou o item em 78/100. `.nvmrc`, engines Node/pnpm, lockfile, `.env.example`, `verify:ci-contract`, workflow com PostgreSQL/Qdrant pinados, readiness no runner, migrations, live, restore, E2E padrão/real, audit e upload condicional de `coverage/`, `playwright-report/` e `test-results/` estão materializados. A reprodução local passou `pnpm verify`, build, audit, migrations, live estendido 23/32 e E2E 12/12 + 14/14.

O score não alcança 95: o checkout não possui `origin`, o repositório GitHub não foi identificado, não há SHA remoto, duração, artefato do Actions, cache observado, rollback ou falha de infraestrutura registrada. O item 16 continua bloqueado pela ordem; a próxima ação depende de Ricardo informar/aprovar o repositório e a publicação do checkout.

### 5.16 Rastreabilidade de código e controle de mudança — 45/100

O manifesto e a cadeia documental estão atualizados, mas o working tree continua sem um commit final intencional que congele código, testes, documentação e artefatos desta construção. O item 16 permanece para fechar commit, diff, manifesto, evidência e reauditoria do mesmo SHA.

## 6. Bloqueios e riscos priorizados

| ID | Prioridade | Bloqueio/risco | Critério de saída |
|---|---|---|---|
| AUD-C0-001 | **ENCERRADO** | Os dois `TS2532` foram corrigidos sem alterar o comportamento da IA assistiva. | `pnpm typecheck`, `pnpm build` e `pnpm verify` verdes no working tree atual. |
| CUR-24-02 | P0 de item 3 | Catálogo/blueprints, 24 packs, B-07 diagnóstico e runtime persistido/API/web estão construídos; autoria clínica completa e aprovação em escala ainda faltam. | Produzir/revisar conteúdo autoral, executar pré-voo clínico, fechar RLS/E2E real e registrar aprovação antes de `PUBLICADO`. |
| AUD-C0-002 | P0 de piloto | Programa curricular sem blueprint B07 aprovado, itens produzidos/revisados e T2 executado. | Aprovação de Ricardo, pré-voo sintético e evidência de fatia curricular autorizada. |
| AUD-P1-001 | P1 | A jornada mínima de atribuição → atividade → tentativa → resultado/runtime → próxima ação está persistida e exposta em contratos/API/web; jornada completa, prova/contestação operacional e dashboards continuam ausentes. | Fechar a jornada completa e superfícies de resultado/contestação sem alterar a fronteira clínica. |
| AUD-P1-006 | P1 clínico | Packs fora de M02 e o B-07 ainda são drafts/blueprints sem autoria clínica item a item e sem aprovação para coorte. | Redigir, revisar, ensaiar e aprovar cada banco antes da transição para `PUBLICADO`. |
| AUD-P1-002 | P1 segurança | RLS contextual, contexto transacional, menor privilégio e rate limit compartilhado foram materializados no escopo da fatia participante/execução; tabelas editoriais/administrativas fora do escopo, grants produtivos e restore de ambiente real ainda exigem operação. | Provisionar e rotacionar usuário de aplicação sem privilégio amplo, ampliar policies somente onde o domínio exigir, repetir restore/RPO/RTO e testes negativos em homologação/produção descartável. |
| AUD-P1-003 | P1 integração | E2E real participante e jobs live foram materializados nesta rodada; a execução remota do workflow e a cobertura de todos os serviços do CI ainda precisam de prova no item 15. | Executar o workflow remoto com PostgreSQL/Qdrant sintéticos, guardar artefatos e manter dados descartáveis. |
| AUD-P1-004 | P1 operação | Núcleo de health/exporter/SLO/alertas/runbook/restore foi verificado; collector/OTel, dashboard, retenção efetiva, traces distribuídos, crash, carga e failover ainda não foram exercitados em ambiente operacional. | Provisionar collector/dashboards/retention, executar recovery e carga controlada, medir RPO/RTO de ambiente e anexar evidência sem dados proibidos. |
| AUD-P1-005 | P1 governança | Código não está congelado/rastreado no commit auditado; estados documentais estão à frente da execução atual. | Commit intencional com código, manifesto atualizado e reauditoria do mesmo artefato. |
| AUD-P2-001 | P2 | `.env.example` não reproduz o ambiente CVG observado e provider de produção não foi configurado. | Contrato de ambiente revisado, secrets externos e smoke de produção/homologação. |
| AUD-P2-002 | **ENCERRADO** | Reconciliação Qdrant antes só havia sido observada com conjunto esperado vazio. | `0504_worker_resilience_audit.md` e `tests/integration/worker-qdrant-live.test.ts` provaram cenário não vazio, divergência, órfão, remoção, replay e contadores técnicos. |

## 7. Plano recomendado de remediação

1. Manter `AUD-C0-001` verde em cada execução de CI e corrigir a divergência do contrato de ambiente.
2. Manter o gate clínico do item 3 separado: bancos autorais restantes, revisão item a item e pré-voo de M02/B-07 antes de qualquer publicação/piloto.
3. Manter os itens 6 e 7 fechados em 95 nos escopos `0499` e `0500`, manter o item 8 fechado em 95 no escopo `0501`, manter o item 9 fechado em 95 no escopo `0502`, manter o item 10 fechado em 95 no escopo `0503`, o item 11 fechado em 95 no escopo `0504` e o item 12 fechado em 95 no escopo `0505`.
4. Executar o hardening operacional restante — collector/OTel, retenção efetiva, dashboard, traces distribuídos, crash/failover, carga, grants produtivos e restore de ambiente — sem reabrir silenciosamente os scores técnicos nem autorizar release.
5. Manter no CI o PostgreSQL descartável, migrations, live integration, restore, API real no Playwright e artefatos de execução; manter os testes mockados como camada unitária, não como prova E2E de integração.
6. Manter o gate clínico dos itens 3 e 10; os itens 13 e 14 foram reavaliados em 96 e o item 15 está liberado pela ordem, sem permitir que worker, Qdrant ou IA alterem estado, nota, gabarito ou publicação.
7. Levar os gaps de ambiente do item 12 para a operação real: collector, traces, retenção, dashboard, recovery, carga e failover.

## 8. Decisão final

**Não aprovar release, piloto ou publicação clínica nesta rodada.**

A decisão não decorre de vulnerabilidade conhecida ou vazamento observado; decorre da combinação de produto incompleto, conteúdo clínico ainda não aprovado em escala, E2E sem API real, operação sem observabilidade/restore completos e ausência de um commit rastreável da construção.

O score técnico/documental do item 3 atingiu **95/100**, os itens 4, 5 e 6 atingiram **95/100** em seus escopos próprios, o item 7 atingiu **95/100** no escopo da primeira fatia backend persistida, o item 8 atingiu **95/100** no escopo de isolamento participante/execução, menor privilégio e rate limit compartilhado, o item 9 atingiu **95/100** no escopo da jornada mínima agregada, o item 10 atingiu **95/100** no escopo de autoria/revisão governada, o item 11 atingiu **95/100** no escopo de worker/Qdrant/IA assistiva/resiliência, o item 12 atingiu **95/100** no escopo técnico/documental de observabilidade/operação, o item 13 atingiu **96/100** no escopo de web/UX/acessibilidade e o item 14 atingiu **96/100** no escopo de testes/evidência. A construção pode prosseguir para o item 15 pela regra numérica da meta; isso não autoriza release, piloto ou publicação clínica. A aprovação de Ricardo, aplicação clínica em escala, execução remota do CI, collector/retention/traces de ambiente, operação completa e demais gates permanecem ativos.

## 9. Referências principais

- `BRIEFING/09.PROJETO_CVG_TREINAMENTO/01.PRD/0020_prd_master.md`
- `BRIEFING/09.PROJETO_CVG_TREINAMENTO/01.PRD/0016_programa_curricular_clinico.md`
- `BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC/0120_spec_master.md`
- `BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC/0118_estrategia_de_testes_rastreabilidade_e_verificacao.md`
- `BRIEFING/03.BUILD/0300_build_engineer_master.md`
- `BRIEFING/03.BUILD/0302_backlog_master.md`
- `BRIEFING/04.AUDIT/0400_audit_scope.md` a `0490_audit_report.md`
- `docs/99_runtime_state.md`
- `docs/20_master_execution_log.md`
- `docs/30_backlog_master.md`
- `package.json`, `.github/workflows/quality.yml`, `traceability.yml`
- `apps/api/src/http.ts`, `apps/web/app/page.tsx`, `tests/e2e/participant-access.spec.ts`
- `packages/curriculum/src/catalog.ts`, `packages/curriculum/src/projection.ts`, `packages/curriculum/src/content-seed.ts`
- `tests/integration/curriculum-catalog.test.ts`, `tests/integration/postgres-activity-content.test.ts`
- `BRIEFING/04.AUDIT/0495_pesquisa_praticas_mundiais_treinamento_hospitalar.md`
- `BRIEFING/04.AUDIT/0496_curriculum_runtime_preflight.md`
- `BRIEFING/04.AUDIT/0497_architecture_boundary_audit.md`
- `BRIEFING/04.AUDIT/0498_domain_contract_matrix.md`
- `BRIEFING/04.AUDIT/0499_persistence_integrity_audit.md`
- `BRIEFING/04.AUDIT/0500_api_surface_audit.md`
- `BRIEFING/04.AUDIT/0501_security_isolation_audit.md`
- `BRIEFING/04.AUDIT/0502_learning_journey_audit.md`
- `BRIEFING/04.AUDIT/0503_authoring_review_audit.md`
- `BRIEFING/04.AUDIT/0505_observability_operations_audit.md`
- `BRIEFING/04.AUDIT/0506_web_ux_accessibility_audit.md`
- `BRIEFING/08.RUNTIME/0804_observability_operational_contract.md`
- `architecture-boundaries.json`, `tests/integration/architecture-boundaries.test.ts`
- fontes internacionais listadas em 0495 e referências locais F-01/F-02/F-03 registradas em `0022_leitura_literatura_e_matriz_curricular.md`
- `packages/persistence/drizzle/0002_lovely_madelyne_pryor.sql`
