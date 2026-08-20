# 0493 — Backlog executável do Programa Premium Enterprise 95

> **Backlog da trilha de maturidade:** os requisitos `ENT95-*` permanecem válidos; o status executivo transversal é coordenado pelos IDs `U95-*` em `0515_dual_95_backlog.md`.

- program_id: CVG-PREMIUM-ENTERPRISE-95
- status: IN_PROGRESS
- baseline: 0491_full_construction_audit.md — 83/100
- target: ENT95-01–ENT95-16 >=95/100
- delivery_model: TDD, sprints de duas semanas, evidência no mesmo SHA

## 1. Como usar este backlog

Este backlog substitui a versão histórica que declarava 95 em recortes incompletos. As tasks `COMPLETED` têm evidência local explícita; as demais são trabalho futuro ou gates ainda não comprovados. Nenhuma task altera a nota atual sem reauditoria independente.

### Campos

- **Status:** somente `READY_FOR_NEXT_STEP`, `IN_PROGRESS`, `WAITING_HUMAN_APPROVAL`, `BLOCKED` ou `COMPLETED`.
- **Prioridade:** P0 impede release; P1 impede a nota 95 do item; P2 melhora robustez sem substituir P0/P1.
- **Esforço:** pessoa-dias de foco, sem incluir espera externa ou revisão de Ricardo.
- **Onde:** superfícies prováveis; a task deve confirmar o desenho antes de editar.
- **RED/evidência:** teste ou prova que deve falhar/estar ausente antes da implementação.
- **Pronto:** condição objetiva para `COMPLETED`.

### Política de entrada

Uma task entra em sprint somente quando tiver owner, dependências satisfeitas, critério de aceite verificável, risco avaliado e ambiente disponível. Tasks externas permanecem `WAITING_HUMAN_APPROVAL` sem bloquear tarefas locais independentes.

## 2. Mobilização transversal

### ENT95-00-A — Aprovar charter, equipe, T0 e capacidade

- prioridade/status/esforço: P0 / WAITING_HUMAN_APPROVAL / 1 dia;
- owner/dependência/sprint: Ricardo + Program / programa 0304 pronto / S0;
- o que: aprovar equipe, disponibilidade clínica, T0, cadência, rates/cotações, teto orçamentário e tolerância de ±30% da estimativa;
- onde/como: ata de steering ligada a D-ENT-01 e D-ENT-07, sem segredo ou dado pessoal;
- RED/evidência: ausência de aprovação mantém o roadmap sem data comprometida;
- pronto: responsáveis, capacidade semanal, data de início e autoridade de go/no-go registrados.

### ENT95-00-B — Resolver recursos externos do caminho crítico

- prioridade/status/esforço: P0 / WAITING_HUMAN_APPROVAL / 3 dias de coordenação;
- owner/dependência/sprint: Program + SRE + Security / ENT95-00-A / S0–S1;
- o que: decidir IdP, domínio/TLS, telemetria, backup, registry e ambiente de deploy;
- onde/como: D-ENT-02–06, ADRs e secret manager; credenciais nunca entram no Git;
- RED/evidência: gates produtivos continuam fail-closed sem os recursos;
- pronto: fornecedor/serviço, owner, ambiente, SLA, custo, retenção e acesso autorizados.

### ENT95-00-C — Estabelecer scorecard e dashboard de programa

- prioridade/status/esforço: P1 / COMPLETED / 2 dias;
- owner/dependência/sprint: Program + QA / ENT95-00-A / S0;
- o que: medir 16 itens, requisitos cobertos, fila clínica, defeitos, riscos e gates;
- onde/como: documentos existentes e artefatos CI, sem criar fonte paralela de verdade;
- RED/evidência: teste documental rejeita item ausente ou baseline diferente de 83;
- pronto: scorecard calcula estado sem promover nota automaticamente e aponta evidência por item.
- resultado/evidência: `scripts/verify-premium-enterprise-scorecard.mjs` e `tests/integration/premium-enterprise-scorecard.test.ts` passaram; `pnpm verify:premium-scorecard` validou 16 itens, 70 tasks, baseline ponderada 83,24/100 e ausência de promoção automática da nota.

## 3. ENT95-01 — Documentação, gates e governança (90 → 95)

### ENT95-01-A — Canonicalizar documentos vigentes e históricos

- prioridade/status/esforço: P1 / COMPLETED / 3 dias;
- owner/dependência/sprint: Program + Docs review / ENT95-00-A / S0;
- o que: classificar cada roadmap, auditoria e evidência como vigente, histórico ou substituído;
- onde/como: `BRIEFING/`, `docs/` e links canônicos, preservando histórico no Git;
- RED/evidência: verificador falha se documento obsoleto se declarar atual ou contradizer o 0491;
- pronto: uma única baseline e um único projeto/roadmap/backlog atuais, sem status conflitante.
- resultado/evidência: `docs/canonical-document-registry.json` define uma única fonte `CURRENT` para programa (`0304`), auditoria (`0491`), roadmap (`0492`) e backlog (`0493`), e relaciona `0490`/`0303` como históricos ou substituídos com seus sucessores;
- verificação: RED/GREEN passou 3/3 em `tests/integration/canonical-document-governance.test.ts`; `pnpm verify:documentation`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck` e `git diff --check` passaram;
- artefato: `PREMIUM-ENTERPRISE-95-DOCUMENT-REGISTRY-042`;
- limites: o registro controla os documentos canônicos do programa; não congela worktree/SHA, não substitui auditoria independente e não promove score ou release.

### ENT95-01-B — Endurecer o gate documental

- prioridade/status/esforço: P1 / COMPLETED / 3 dias;
- owner/dependência/sprint: QA + Eng / ENT95-01-A / S0;
- o que: validar programa 0304, baseline 83, piso 95, presença ENT95-01–16 e artifact de rastreabilidade;
- onde/como: `scripts/verify-documentation.mjs` e teste de governança;
- RED/evidência: fixture incompleta deve falhar antes do verificador ser ampliado;
- pronto: atendido em 2026-08-11; teste RED/GREEN, `pnpm verify:documentation`, `pnpm verify:traceability` e `pnpm verify` passaram no worktree planejado.

### ENT95-01-C — Governar decisões, riscos e mudanças

- prioridade/status/esforço: P1 / IN_PROGRESS / 3 dias;
- owner/dependência/sprint: Program + Tech lead / ENT95-00-C / S0–S1;
- o que: manter decision log, risk register, change request e score impact por sprint;
- onde/como: estrutura documental existente, estado/log/backlog e ADRs apropriados;
- RED/evidência: cenário de mudança sem impacto deve ser rejeitado pelo checklist/gate;
- pronto: toda mudança material tem owner, motivo, impacto, aceite e rollback rastreados.
- avanço local 2026-08-12: `change-control-governance.json` registra dois decision records, dois riscos abertos e dois change requests, cada um com owner, motivo, impacto, aceite, rollback, artifacts e vínculo de sprint; cada change request possui score impact explícito e mantém `scoreChanged: false`/`PILOT_BLOCKED`;
- RED/GREEN: `tests/integration/change-control-governance.test.ts` passou 2/2; o RED reproduziu o gate ausente e o GREEN rejeita rollback ausente, score impact ausente, decisão desconhecida e promoção sem aprovação humana; `pnpm verify:change-control-governance`, typecheck, lint, format check e `git diff --check` passaram;
- artefato: `PREMIUM-ENTERPRISE-95-CHANGE-CONTROL-051`;
- limite/status: a task permanece `IN_PROGRESS` até decisão humana/independente sobre mudanças materiais, SHA/release e fechamento dos riscos externos; a policy local não promove score nem libera piloto.

### ENT95-01-D — Auditoria documental independente de fechamento

- prioridade/status/esforço: P1 / READY_FOR_NEXT_STEP / 2 dias;
- owner/dependência/sprint: Auditor / ENT95-01-A–C / S12;
- o que: confrontar declarações com testes, runtime, SHA e ambiente;
- onde/como: `audit-engine`, documentos 0400–0491 e evidência do RC;
- RED/evidência: amostra de afirmações sem prova precisa ser classificada como gap;
- pronto: zero divergência material e item 01 elegível à reavaliação.

## 4. ENT95-02 — Discovery, PRD e escopo (manter 95)

### ENT95-02-A — Matriz integral RF/RNF e decisões

- prioridade/status/esforço: P1 / IN_PROGRESS / 5 dias;
- owner/dependência/sprint: Product + BA + QA / ENT95-00-A / S0–S1;
- o que: mapear cada RF/RNF e decisão aprovada para SPEC, task, teste, estado e release;
- onde/como: PRD 0013/0014, SPEC e `traceability.yml`;
- RED/evidência: gate falha para requisito P0/P1 sem destino ou com status contraditório;
- pronto: 100% P0/P1 mapeado e pendências P2/P3 explicitamente classificadas.
- andamento/evidência: matriz `PREMIUM-ENTERPRISE-95-REQUIREMENTS-MATRIX` foi adicionada ao `traceability.yml` com 145 RF/RNF e 12 campos por linha: SPEC, task, módulo, contrato, teste, decisões, estado, release, commit e artefato. O verificador encontra todos os requisitos sem drift estrutural e valida caminhos/artefatos referenciados; 49 linhas têm evidência local de módulo/contrato/teste/artefato, incluindo 43/87 RF P0/P1. As 44 linhas P0/P1 sem elo local, o SHA e o release continuam explicitamente `GAP`, portanto a task não está concluída.

### ENT95-02-B — Teste de drift de produto

- prioridade/status/esforço: P1 / COMPLETED / 3 dias;
- owner/dependência/sprint: QA + Product / ENT95-02-A / S1;
- o que: detectar requisito removido, prioridade alterada ou capacidade criada sem decisão;
- onde/como: verificador de product definition e snapshots canônicos;
- RED/evidência: fixture com RF P0 omitido precisa falhar;
- pronto: CI bloqueia drift e gera lista objetiva das divergências.
- evidência de execução: `scripts/verify-premium-enterprise-traceability.mjs` e `tests/integration/premium-enterprise-traceability.test.ts` cobrem requisito omitido, prioridade/estado e disposição de release contraditória; `scripts/verify-scope-drift.mjs` e `tests/integration/scope-drift-governance.test.ts` adicionam catálogo de capacidades, fontes de decisão canônicas e vínculo capability→decision→requirement, rejeitando capacidade sem decisão, decisão/requisito desconhecido, duplicidade e status não aprovado;
- verificação: RED reproduzido com o verificador ausente; GREEN passou 3/3 testes TDD; `pnpm verify:scope-drift` passou com 10 capacidades, 26 decisões usadas e 27 requisitos; typecheck, lint, format check e `git diff --check` passaram;
- resultado: drift de capacidade fica bloqueado no gate local; scorecard passa a registrar 12 tasks `COMPLETED`, 37 `READY_FOR_NEXT_STEP`, 3 `IN_PROGRESS` e 18 `WAITING_HUMAN_APPROVAL`;
- gaps: ENT95-02-A continua `IN_PROGRESS` porque os elos módulo/contrato/teste, commit/SHA e release da matriz de 145 requisitos ainda não estão completos; snapshot histórico e capacidade real fora do catálogo exigem revisão de produto autorizada.

### ENT95-02-C — Review de escopo por marco

- prioridade/status/esforço: P1 / READY_FOR_NEXT_STEP / 1 dia por marco;
- owner/dependência/sprint: Product + Ricardo / ENT95-02-A / M1–M5;
- o que: confirmar que a execução continua fiel e que exclusões são decisões, não omissões;
- onde/como: ata de marco, scorecard e matriz RF/RNF;
- RED/evidência: requisito sem evidência bloqueia aceite do marco;
- pronto: decisão assinada e gaps devolvidos ao backlog com prioridade.

## 5. ENT95-03 — Currículo e conteúdo clínico (72 → 95)

### ENT95-03-A — Inventariar e estratificar o corpus completo

- prioridade/status/esforço: P0 / COMPLETED / 5 dias;
- owner/dependência/sprint: Content lead + QA / ENT95-00-A / S0–S1;
- o que: reconciliar 24 módulos, 96 sessões, 796 registros e 763 pendências por tipo, risco, objetivo e release;
- onde/como: packs autorais, PostgreSQL e verificador curricular read-only;
- RED/evidência: contagem divergente, item sem módulo/objetivo ou duplicidade deve falhar;
- pronto: inventário versionado fecha 100% das contagens e prioriza alto risco primeiro.
- resultado/evidência: `curriculum-inventory.json` registra o currículo `CVG-CURRICULUM-24M` versão `3.0.0`, 24 módulos, 96 sessões e 796 registros, com itens/objetivos/criticidade por módulo, ordem de risco derivada da criticidade e disposição `PILOT_BLOCKED`;
- verificação: RED reproduzido antes do verificador; GREEN passou 2/2 em `tests/integration/curriculum-inventory-governance.test.ts`; `pnpm verify:curriculum-inventory`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck` e `git diff --check` passaram;
- artefato: `PREMIUM-ENTERPRISE-95-CURRICULUM-INVENTORY-043`;
- limites: a task fecha inventário/estratificação estrutural e não equivale a aprovação clínica, publicação ou liberação dos 763 itens; `ENT95-03-B`, `ENT95-03-C` e `ENT95-03-D` continuam abertas.

### ENT95-03-B — Calibrar padrão clínico em lote de 25 itens

- prioridade/status/esforço: P0 / WAITING_HUMAN_APPROVAL / 5 dias + decisão humana;
- owner/dependência/sprint: Content + Ricardo / ENT95-03-A / S0;
- o que: revisar amostra estratificada e calibrar fonte, rubrica, gabarito, feedback, linguagem e criticidade;
- onde/como: fila de revisão interna, sem projeção de metadado bibliográfico;
- RED/evidência: preflight deve reprovar item incompleto ou sem aprovação independente;
- pronto: concordância e rework medidos, checklist aprovado e throughput recalculado.

### ENT95-03-C — Completar 24 módulos e 96 sessões

- prioridade/status/esforço: P0 / READY_FOR_NEXT_STEP / 35 dias;
- owner/dependência/sprint: Instructional design + Content / ENT95-03-B / S1–S8;
- o que: garantir objetivos, sessões, carga, atividades, avaliação, remediação e retenção por módulo;
- onde/como: packs versionados e catálogo transacional, mantendo somente conteúdo autoral autorizado;
- RED/evidência: verificador falha para módulo incompleto, sessão ausente ou carga incoerente;
- pronto: 24/24 e 96/96 passam validação estrutural/pedagógica e amostra funcional.

### ENT95-03-D — Revisar e decidir os 763 itens pendentes

- prioridade/status/esforço: P0 / WAITING_HUMAN_APPROVAL / 90–130 dias de capacidade distribuída;
- owner/dependência/sprint: Pre-review + Ricardo / ENT95-03-B / S1–S9;
- o que: executar pré-revisão, rework, decisão independente e preflight em lotes de 40–60/semana;
- onde/como: workflow autoral versionado e fila paginada, com actor, data, versão e justificativa;
- RED/evidência: fila estrita permanece vermelha enquanto existir item liberável sem decisão;
- pronto: zero pendência no corpus do release, rejeições documentadas e nenhuma autopublicação.

### ENT95-03-E — Validar B-07 e blueprint diagnóstico

- prioridade/status/esforço: P0 / WAITING_HUMAN_APPROVAL / 12 dias;
- owner/dependência/sprint: Clinical + Psychometrics + Ricardo / ENT95-03-B / S3–S6;
- o que: validar 120 itens, três blocos, cobertura por tema, equivalência e não-punitividade;
- onde/como: banco autoral interno e testes de blueprint/forma;
- RED/evidência: forma com cobertura, tamanho ou exposição inadequada deve ser recusada;
- pronto: blueprint aprovado, formas reproduzíveis e resultado por tema testado.

### ENT95-03-F — Medir eficácia e saúde dos itens no piloto

- prioridade/status/esforço: P1 / WAITING_HUMAN_APPROVAL / 8 dias;
- owner/dependência/sprint: Product analytics + Clinical / ENT95-03-D/E e piloto autorizado / S13;
- o que: observar conclusão, dificuldade, discriminação, distratores, contestação e retenção;
- onde/como: analytics agregados e minimizados, sem ranking ou inferência prática;
- RED/evidência: item anômalo gera sinal para revisão, nunca correção automática;
- pronto: critérios de saúde aplicados e anomalias triadas por humano.

## 6. ENT95-04 — Arquitetura e modularidade (92 → 95)

### ENT95-04-A — Atualizar arquitetura para a superfície enterprise

- prioridade/status/esforço: P1 / COMPLETED / 5 dias;
- owner/dependência/sprint: Architect + Tech lead / ENT95-02-A / S1;
- o que: revisar contextos, ports, integrações, topologia e fronteiras para o produto integral;
- onde/como: SPEC 0101–0118, ADRs e policy de imports;
- RED/evidência: cenários de dependência proibida e autoridade de IA/Qdrant devem falhar;
- pronto: ADRs aceitos, sem regra de negócio em HTTP/SQL/SDK e sem dependência cíclica.
- resultado/evidência: `architecture-boundaries.json` materializa os documentos SPEC 0101–0103, a política de dependências permitidas para 12 workspaces e as importações proibidas por camada; o teste percorre manifests e código de produção e mantém PostgreSQL como fonte transacional, Qdrant/IA como adapters derivados e desligáveis.
- verificação: RED reproduzido antes da policy; GREEN passou 2/2 em `tests/integration/architecture-boundaries.test.ts`; `pnpm verify:architecture`, `pnpm verify`, `pnpm typecheck`, `pnpm build`, E2E sintético e `git diff --check` passaram.
- limites: a task fecha a fundação arquitetural local e não reavalia a nota 92 do item 4; capacidade enterprise, carga, failover, operação externa, SHA e reauditoria permanecem em `ENT95-04-C`, itens 11/12/15/16 e gates próprios.

### ENT95-04-B — Refatorar hotspots e limites de tamanho

- prioridade/status/esforço: P1 / COMPLETED / 10 dias;
- owner/dependência/sprint: Tech lead + Eng / ENT95-04-A / S1–S4;
- o que: identificar arquivos >800 linhas, funções complexas e composições com baixa coesão;
- onde/como: módulos afetados por feature, preservando APIs públicas e imutabilidade;
- RED/evidência: characterization tests e arquitetura ficam verdes antes/depois;
- pronto: nenhum hotspot crítico sem plano, limites mantidos e regressão inexistente.
- resultado/evidência: `code-hotspot-policy.json` classifica os 7 arquivos de produção acima de 800 linhas, com owner, severidade, plano de decomposição, orçamento-alvo e testes de caracterização; `scripts/verify-code-hotspots.mjs` percorre `apps`, `packages` e `scripts`, rejeita hotspot não classificado, caminho de teste ausente, duplicidade e regressão abaixo do limiar.
- verificação: RED reproduzido antes do verificador; GREEN passou 2/2 em `tests/integration/code-hotspot-policy.test.ts`; `pnpm verify:hotspots`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck` e `git diff --check` passaram.
- limites: a task conclui o inventário e a governança local dos hotspots; a decomposição física dos 7 módulos permanece planejada e deve ser feita em fatias reversíveis com os testes de caracterização verdes. Capacidade/carga/failover, SHA, gates externos e reauditoria continuam fora desta evidência.

### ENT95-04-C — Provar capacidade e escalabilidade da arquitetura

- prioridade/status/esforço: P1 / IN_PROGRESS / 6 dias;
- owner/dependência/sprint: SRE + Architect + QA / E2 completo / S11;
- o que: testar concorrência, replicas, filas, backpressure e degradação no perfil aprovado;
- onde/como: ambiente staging equivalente, carga sintética e telemetria;
- RED/evidência: baseline identifica gargalo/limite antes de tuning;
- pronto: SLOs atendidos, gargalos explicados e arquitetura sem alteração estrutural emergencial.
- avanço local 2026-08-12: `capacity-governance.json` registra o smoke HA sintético 200/200 HTTP 200, concorrência 20, throughput 458,14 req/s, p95 102,37 ms, teardown verificado e artefato 056; `scripts/verify-capacity-governance.mjs` rejeita métricas inconsistentes e gap não documentado;
- RED/GREEN: `tests/integration/capacity-governance.test.ts` passou 2/2; `pnpm verify:capacity-governance` reportou 100% de sucesso e 4 gaps explícitos de saturação, soak, failover/recuperação e perfil/SLO aprovado;
- artefato: `PREMIUM-ENTERPRISE-95-CAPACITY-GOVERNANCE-056`;
- limite/status: a task permanece `IN_PROGRESS`; smoke curto não prova capacidade, saturação, soak, failover ou SLO produtivo.

## 7. ENT95-05 — Domínio, contratos e regras (88 → 95)

### ENT95-05-A — Matriz completa de invariantes

- prioridade/status/esforço: P0 / COMPLETED / 6 dias;
- owner/dependência/sprint: Domain lead + QA / ENT95-02-A / S1;
- o que: enumerar estados, transições e autoridade de diagnóstico, trilha, prova, remediação, retenção, recurso e conteúdo;
- onde/como: domain/contracts/SPEC, com decisões críticas explicitadas;
- RED/evidência: transição ilegal, score incorreto ou campo interno precisa falhar;
- pronto: 100% das invariantes críticas implementadas no núcleo atual têm contrato, erro e teste associado;
- evidência: `packages/domain/src/invariant-catalog.ts`; artifact `PREMIUM-ENTERPRISE-95-INVARIANT-MATRIX-034`; estados e transições em `packages/domain/src/content.ts`, `attempt.ts`, `learning-state.ts` e `appeal.ts`; políticas de avaliação em `packages/domain/src/assessment-policy.ts`;
- testes/verificação: `packages/domain/src/invariant-catalog.test.ts` (2/2); suíte domínio/contratos/aplicação da fatia 46 arquivos/198 testes; `pnpm verify:invariants`; `pnpm typecheck`; `pnpm lint`; `pnpm format:check`;
- resultado: catálogo imutável de 27 invariantes críticas no fechamento da task, ampliado para 31 invariantes no fechamento da fatia seguinte, com requisito, autoridade, erro, código, contrato e teste; o gate rejeita duplicidade, ausência de requisito/evidência e registros sem teste executável;
- gaps: invariantes de capacidades ainda não implementadas no produto integral permanecem nas tasks `ENT95-05-B/C`, `ENT95-09-C`, `ENT95-10-C`, `ENT95-12-B` e `ENT95-14-A`; esta conclusão não promove a baseline nem declara cobertura funcional integral do PRD.

### ENT95-05-B — Implementar regras faltantes do ciclo educacional

- prioridade/status/esforço: P0 / COMPLETED / 15 dias;
- owner/dependência/sprint: Eng + Domain lead / ENT95-05-A / S2–S6;
- o que: pré-requisitos, pausa/acomodação, formas equivalentes, 2+remediação, D+30/60/90, recurso e retirada;
- onde/como: `packages/domain`, `contracts` e application ports, sem IO no domínio;
- RED/evidência: testes unitários e de propriedade escritos por regra antes da implementação;
- pronto: regras puras, imutáveis, determinísticas e sem branch crítico descoberto.
- evidência de execução: RED reproduzido nos contratos/catálogo/pré-requisito antes do GREEN; `packages/domain/src/learning-state.ts` agora exige motivo explícito, preserva janela de retomada e rejeita estado persistido com motivo fora da allowlist; `packages/curriculum/src/learning-runtime.ts` materializa formas equivalentes distintas em D+30/D+60/D+90 e bloqueia pré-requisito não dominado; `packages/domain/src/remediation-policy.ts` escolhe reforço digital na primeira tentativa e plano individual com mentor a partir da segunda, sempre não punitivo; appeal/withdrawal permanecem ligados às máquinas existentes;
- persistência/contratos: migration `0017_assignment_pause_context.sql`, constraint fail-closed e projeções/requests atualizados em `packages/contracts/src/learning-state.ts` e `packages/persistence/src/learning-state-repository.ts`;
- verificação: fatia focada 7 arquivos/47 testes; `pnpm verify:invariants` 2/2 com 31 invariantes; `pnpm verify:migrations` 18 migrações, última `0017_assignment_pause_context`; `pnpm typecheck`; `pnpm lint`; `pnpm format:check`; integração live serial PostgreSQL/Qdrant 32 arquivos/79 testes passantes, 1 arquivo/2 testes condicionais pulados; `pnpm verify:premium-traceability` 145 requisitos, 0 cadeias completas e 145 gaps explícitos;
- resultado: regras locais concluídas no escopo verificável, sem promoção da baseline; o scorecard passa a registrar 10 tasks `COMPLETED`, 38 `READY_FOR_NEXT_STEP`, 4 `IN_PROGRESS` e 18 `WAITING_HUMAN_APPROVAL`;
- gaps: cobertura de decisão/mutation completa permanece em `ENT95-05-C`; ciclo integral de API/E2E, conteúdo clínico, calibração humana, corpus de 763 itens, SHA, release, piloto e reauditoria independente continuam abertos.

### ENT95-05-C — Cobertura de decisão crítica

- prioridade/status/esforço: P0 / COMPLETED / 5 dias;
- owner/dependência/sprint: QA + Domain lead / ENT95-05-B / S6/S11;
- o que: medir e completar todas as combinações de nota, gabarito, publicação, permissão e estado;
- onde/como: suites domain/application/contracts e matriz de decisão;
- RED/evidência: mutation/branch sample ou checklist revela caminho não exercitado;
- pronto: decisão completa comprovada, incluindo erros e idempotência.
- evidência de execução: RED reproduzido ao importar a matriz ausente; GREEN implementou `packages/domain/src/critical-decision-matrix.ts` com 11 casos e cobertura mínima de todos os resultados obrigatórios; `tests/integration/critical-decision-coverage.test.ts` executa cada caso contra as regras reais de nota, gabarito público, publicação, permissão e estado;
- cobertura por decisão: nota 98,85% de branches; publicação 100%; permissão 98,46%; estado 96,15%; contrato de estado 90,16%; matriz 100%; cobertura global 86,39% statements, 82,35% branches, 87,29% functions e 87,17% lines;
- verificação: 7 arquivos/46 testes focados passaram; gate TDD do verificador passou 2/2; `pnpm test:coverage` passou 109 arquivos/528 testes, com 16 arquivos/18 testes condicionais ignorados; `pnpm verify:critical-decisions` passou com 5 decisões e 11 casos; typecheck, lint, format check e `git diff --check` permanecem obrigatórios para o fechamento;
- resultado: cobertura de decisão crítica concluída no escopo local verificável, sem alteração da baseline 83,24/100; o scorecard passa a registrar 11 tasks `COMPLETED`, 37 `READY_FOR_NEXT_STEP`, 4 `IN_PROGRESS` e 18 `WAITING_HUMAN_APPROVAL`;
- gaps: mutation testing independente, idempotência persistida em todas as superfícies, ciclo integral de API/E2E, conteúdo clínico, calibração humana, corpus de 763 itens, SHA, release, piloto e reauditoria independente continuam abertos.

## 8. ENT95-06 — Persistência, migrações e integridade (90 → 95)

### ENT95-06-A — Fechar schema, constraints, grants e RLS

- prioridade/status/esforço: P0 / READY_FOR_NEXT_STEP / 8 dias;
- owner/dependência/sprint: Database lead + Security / ENT95-05-A / S2;
- o que: cobrir todas as entidades P0/P1 com FK, unicidade, checks, versionamento, grants mínimos e FORCE RLS;
- onde/como: migrations forward-only e repositórios PostgreSQL parametrizados;
- RED/evidência: acesso sem contexto/cruzado e estado inconsistente devem falhar no banco real;
- pronto: migration up/down operacional, role sem SUPERUSER/BYPASSRLS e zero tabela sensível fora da matriz.

### ENT95-06-B — Lifecycle, retenção e anonimização

- prioridade/status/esforço: P0 / READY_FOR_NEXT_STEP / 8 dias;
- owner/dependência/sprint: Database + Privacy / ENT95-06-A / S2–S4;
- o que: implementar emprego +2 anos, legal hold aplicável, expurgo/anonimização e preservação de auditoria mínima;
- onde/como: jobs/repositories/policy e dry-run auditável;
- RED/evidência: fixtures vencidas continuam presentes antes do job e dados em hold não podem ser removidos;
- pronto: dry-run, execução sintética, idempotência e trilha de auditoria passam.

### ENT95-06-C — Concorrência, atomicidade e idempotência

- prioridade/status/esforço: P0 / COMPLETED / 7 dias;
- owner/dependência/sprint: Database + Eng + QA / ENT95-06-A / S3–S6;
- o que: provar optimistic locking, outbox, tentativa imutável e transações editoriais/educacionais;
- onde/como: integração PostgreSQL com chamadas paralelas e falha injetada;
- RED/evidência: corrida deve reproduzir conflito/duplicidade antes da correção;
- pronto: um único efeito, rollback completo e resposta de conflito estável.
- resultado/evidência: a suíte PostgreSQL live passou 29/29 arquivos e 76/76 testes contra o HA sintético, incluindo corrida de optimistic locking em `tests/integration/postgres-learning-state.test.ts`, rollback transacional, tentativa imutável/idempotência em `postgres-attempt-repository.test.ts`/`postgres-answer-session.test.ts`, workflow editorial atômico com decisão clínica e outbox redigido em `postgres-content-workflow.test.ts`, e correção transacional. Exatamente um efeito venceu a corrida, o conflito foi estável e os teardowns não deixaram resíduo. Artefato: `PREMIUM-ENTERPRISE-95-CONCURRENCY-028`.

### ENT95-06-D — Backup, restore e integridade pós-recuperação

- prioridade/status/esforço: P0 / WAITING_HUMAN_APPROVAL / 6 dias;
- owner/dependência/sprint: SRE + Database / D-ENT-05 e ENT95-06-A / S8–S9;
- o que: backup criptografado externo, checksum, restore isolado e verificação de constraints/auditoria;
- onde/como: ambiente autorizado e scripts operacionais sem segredo em output;
- RED/evidência: gate produtivo falha sem artifact ou com checksum incorreto;
- pronto: restore repetível, dados sintéticos íntegros, RPO/RTO medidos e evidência retida.

## 9. ENT95-07 — API e backend funcional (82 → 95)

### ENT95-07-A — Inventário de API e cobertura P0/P1

- prioridade/status/esforço: P0 / COMPLETED / 5 dias;
- owner/dependência/sprint: Backend lead + Product / ENT95-02-A/05-A / S3;
- o que: mapear operações de identidade, diagnóstico, trilha, atividade, avaliação, recurso, dashboards e autoria;
- onde/como: contratos versionados/OpenAPI e mapa rota→capability→scope→use case;
- RED/evidência: gate falha para RF P0/P1 sem operação ou operação sem autorização;
- pronto: 100% da superfície necessária classificada como existente, faltante ou deliberadamente fora.
- resultado/evidência: `packages/contracts/src/api-surface.ts` registra 46 rotas existentes com método, caminho parametrizado, capability, autenticação, escopo, caso de uso, contrato de entrada e projeção de saída; a revisão editorial recebeu o template `/api/v1/internal/content/:contentId/review`, corrigindo a divergência entre handler e telemetria.
- verificação: RED reproduzido com o inventário ausente e com a rota editorial classificada como `unmatched`; GREEN passou 13/13 testes focados em contratos/API/server, incluindo `tests/integration/api-surface-inventory.test.ts`; `pnpm --filter @cvg/contracts typecheck`, `pnpm lint`, `pnpm verify:traceability` e `pnpm verify:premium-traceability` passaram.
- limites: a inventory fecha a superfície atualmente implementada; capacidades ainda não existentes permanecem explicitamente no backlog de `ENT95-07-C`, `ENT95-09` e `ENT95-10`, sem serem promovidas como rotas implementadas.

### ENT95-07-B — Lifecycle de conta e administração

- prioridade/status/esforço: P0 / COMPLETED / 10 dias;
- owner/dependência/sprint: Backend + Web / ENT95-08-A e 07-A / S3–S4;
- o que: reenviar convite, ativar/desativar, papéis, trilha, revogar sessões e consultar auditoria;
- onde/como: contracts/application/persistence/API/web com deny-by-default;
- RED/evidência: acesso cruzado, escalada ADMIN e reuso de convite devem falhar;
- pronto: RF-008/009 cobertos em contrato, live integration e E2E.
- resultado/evidência: lifecycle implementado em contracts/application/persistence/API/web, com migração `0016_account_lifecycle_version.sql`; autorização deny-by-default, escopo, proteção contra escalada para `ADMIN`, optimistic locking, auditoria sem token e revogação de sessões estão cobertos por `packages/application/src/account-management-use-cases.test.ts`, `apps/api/src/http.test.ts`, `packages/contracts/src/account-management.test.ts`, `packages/persistence/src/account-management-repository.test.ts` e `tests/e2e/admin-user-management.spec.ts`. A suíte focal passou 71/71; `pnpm typecheck`, `pnpm format:check`, migração HA, E2E administrativo 4/4 e E2E HA real 3/3 passaram.

### ENT95-07-C — API do ciclo educacional integral

- prioridade/status/esforço: P0 / READY_FOR_NEXT_STEP / 20 dias;
- owner/dependência/sprint: Backend + Domain / ENT95-05-B/06-C/07-A / S4–S6;
- o que: completar diagnóstico, trilha, prova, correção, resultado, remediação, retenção e recurso;
- onde/como: versioned contracts, use cases, repositories e rotas finas;
- RED/evidência: teste de contrato por operação cobre entrada, sucesso, negação e conflito;
- pronto: 100% P0/P1 da jornada com envelopes consistentes e projeções allowlist.

### ENT95-07-D — Paginação, filtros, idempotência e performance

- prioridade/status/esforço: P1 / READY_FOR_NEXT_STEP / 8 dias;
- owner/dependência/sprint: Backend + QA / ENT95-07-B/C / S5–S7;
- o que: padronizar cursor/limite, filtros bounded, idempotency keys e limites de payload;
- onde/como: API/contracts/repositories e testes de carga focal;
- RED/evidência: cursor inválido, limite excessivo e replay concorrente devem falhar de modo bounded;
- pronto: contrato consistente, sem duplicidade e p95 dentro do SLO.

## 10. ENT95-08 — Segurança, identidade e privacidade (86 → 95)

### ENT95-08-A — Integrar IdP externo, MFA, recovery e step-up

- prioridade/status/esforço: P0 / WAITING_HUMAN_APPROVAL / 15 dias;
- owner/dependência/sprint: Security + Backend + SRE / D-ENT-02 / S1–S4;
- o que: enrollment, challenge, recovery, revogação, sincronização de papel e reautenticação sensível;
- onde/como: adapter IdP server-side, secret manager e sandbox autorizado;
- RED/evidência: provider ausente/indisponível fica fail-closed; MFA ausente nega admin/moderador;
- pronto: E2E provider-mediated real cobre happy path, recovery, revogação e ataques de replay.

### ENT95-08-B — Autorização contextual e privacidade completa

- prioridade/status/esforço: P0 / COMPLETED / 10 dias;
- owner/dependência/sprint: Security + Backend + Database / ENT95-06-A/07-A / S2–S6;
- o que: revisar capabilities, roles, scopes, RLS, ownership, admin/moderador/auditor e minimização;
- onde/como: authorization policy central, transaction context e allowlist schemas;
- RED/evidência: matriz negativa cobre cada papel e acesso cruzado em API e PostgreSQL;
- pronto: deny-by-default comprovado, sem depender do frontend e sem campo interno em projeção.
- resultado/evidência: `packages/application/src/authorization.test.ts` e `apps/api/src/http.test.ts` passaram 48 testes focados; `tests/integration/postgres-security-isolation.test.ts` passou 1/1 no PostgreSQL HA com timeout operacional de 20s, cobrindo role sem `SUPERUSER/BYPASSRLS`, ausência de contexto, isolamento por participante/escopo, transações de tentativa/resposta/correção e caminho staff; E2E/API e `pnpm verify:exposure` confirmam projeções sem campos internos. Artefato: `PREMIUM-ENTERPRISE-95-AUTHORIZATION-030`.

### ENT95-08-C — Threat model e testes ofensivos

- prioridade/status/esforço: P0 / READY_FOR_NEXT_STEP / 8 dias;
- owner/dependência/sprint: Security reviewer + QA / superfície E2 completa / S10;
- o que: modelar assets/atores/ameaças e testar auth bypass, IDOR, CSRF, XSS, injection, rate abuse e leakage;
- onde/como: threat model versionado, SAST/DAST e pentest focal em staging;
- RED/evidência: findings reproduzíveis entram no backlog antes de correção;
- pronto: zero crítico/alto aberto e exceções médias formalizadas com prazo.

### ENT95-08-D — Operação de segredos e incidente de privacidade

- prioridade/status/esforço: P1 / WAITING_HUMAN_APPROVAL / 5 dias;
- owner/dependência/sprint: Security + SRE / ambientes externos / S8–S10;
- o que: rotação, revogação, acesso auditado, break-glass e tabletop de incidente;
- onde/como: secret manager e runbooks, sem valor bruto em evidência;
- RED/evidência: segredo expirado/revogado deve interromper acesso sem indisponibilizar recovery autorizado;
- pronto: drill executado, tempos e decisões registrados e scans continuam limpos.

## 11. ENT95-09 — Jornada do participante (75 → 95)

### ENT95-09-A — Diagnóstico, perfil e trilha recomendada

- prioridade/status/esforço: P0 / READY_FOR_NEXT_STEP / 12 dias;
- owner/dependência/sprint: Product + Full-stack / ENT95-03-E/05-B/07-C / S4;
- o que: entregar três blocos, pausa/retomada, perfil por tema e recomendação sem aprovação/reprovação;
- onde/como: domain→persistence→API→web, com item/version/rule imutáveis;
- RED/evidência: interrupção e refresh devem preservar respostas; nota global punitiva deve ser impossível;
- pronto: E2E real completa B-07 e gera trilha autorizada com projeção segura.

### ENT95-09-B — Estudo, progresso e próxima ação

- prioridade/status/esforço: P0 / COMPLETED / 10 dias;
- owner/dependência/sprint: Full-stack + UX / ENT95-07-C / S4–S5;
- o que: exibir progresso 24 meses, pré-requisitos, deadlines, acomodação e uma próxima ação;
- onde/como: journey aggregate e dashboard participante responsivo;
- RED/evidência: estados vazio/stale/erro/offline e conflito de prioridade precisam ser testados;
- pronto: próxima ação determinística, progresso correto e nenhum campo administrativo.

### ENT95-09-C — Avaliação, resultado, remediação e retenção

- prioridade/status/esforço: P0 / READY_FOR_NEXT_STEP / 18 dias;
- owner/dependência/sprint: Full-stack + QA / ENT95-05-B/07-C / S5–S6;
- o que: prova, caso, aberta, correção, limiares, 2 tentativas, reforço e D+30/60/90;
- onde/como: fatias verticais com resultado por objetivo e aviso de não competência prática;
- RED/evidência: item repetido, prazo <7 dias, score incorreto e alteração prática devem falhar;
- pronto: E2E cobre sucesso, lacuna crítica, rework e retenção sem intervenção indevida.

### ENT95-09-D — Contestação, feedback e histórico

- prioridade/status/esforço: P0 / READY_FOR_NEXT_STEP / 10 dias;
- owner/dependência/sprint: Full-stack + Product / ENT95-07-C/10-C / S5–S7;
- o que: protocolo, acompanhamento, revisor independente, decisão, SLA e histórico pessoal;
- onde/como: tickets/appeals/audit e UI owner-scoped sem anexos;
- RED/evidência: participante cruzado, payload sensível e decisão sem justificativa devem falhar;
- pronto: fluxo E2E completo, SLA observável e relato seguro.

### ENT95-09-E — UAT da jornada em turnos e dispositivos

- prioridade/status/esforço: P1 / WAITING_HUMAN_APPROVAL / 5 dias;
- owner/dependência/sprint: UX + Product + usuários autorizados / ENT95-09-A–D / S10–S12;
- o que: validar tarefas críticas em celular/desktop e contexto de turno 12x36;
- onde/como: roteiro, observação consentida e dados sintéticos; sem gravação proibida;
- RED/evidência: erro, abandono ou incompreensão vira finding priorizado;
- pronto: 100% das tarefas críticas concluídas ou P0/P1 corrigidos e revalidados.

## 12. ENT95-10 — Autoria, revisão e governança clínica (68 → 95)

### ENT95-10-A — Completar workflow editorial atômico

- prioridade/status/esforço: P0 / COMPLETED / 10 dias;
- owner/dependência/sprint: Backend + Database / ENT95-05-A/06-C / S2–S4;
- o que: autoria→revisão→ajuste→aprovação→publicação→retirada com versionamento;
- onde/como: domain/application/persistence/outbox em transação apropriada;
- RED/evidência: publicação sem Ricardo, self-review ou falha no outbox deve fazer rollback; a aprovação clínica precisa existir na persistência transacional antes da publicação;
- pronto: transições autorizadas, imutáveis e reconstruíveis pela auditoria — satisfeito localmente para o workflow editorial implementado;
- evidência: `packages/domain/src/content.ts`; `packages/application/src/content-use-cases.ts`; `packages/application/src/authoring-use-cases.ts`; `packages/persistence/src/content-repository.ts`; `packages/persistence/src/authoring-repository.ts`; `packages/persistence/src/schema.ts`; `packages/contracts/src/content.ts`; `packages/contracts/src/authoring.ts`; `traceability.yml` artifact `PREMIUM-ENTERPRISE-95-EDITORIAL-WORKFLOW-033`;
- testes/verificação: `packages/application/src/content-use-cases.test.ts` (8/8); `packages/application/src/authoring-use-cases.test.ts` (7/7); `tests/integration/postgres-content-workflow.test.ts`; `tests/integration/postgres-authoring-workflow.test.ts`; integração live PostgreSQL/Qdrant 32 arquivos e 79 testes; typecheck e lint verdes;
- resultado: fluxo autoria→revisão→ajuste→aprovação→autorização→publicação→retirada passa com versionamento, revisão independente, aprovação persistida, outbox e auditoria; publicação direta sem contexto ou sem decisão clínica persistida é rejeitada fail-closed;
- gaps: corpus com 763 decisões humanas, validade/retirada emergencial completa, auditoria independente, commit/release e piloto permanecem nos gates próprios.

### ENT95-10-B — Executar a governança clínica do corpus

- prioridade/status/esforço: P0 / WAITING_HUMAN_APPROVAL / compartilhado com ENT95-03-D;
- owner/dependência/sprint: Ricardo + Content / ENT95-10-A e 03-B / S1–S9;
- o que: decidir os 763 itens e registrar aprovação/rejeição independente;
- onde/como: fila clínica, preflight e trilha auditável;
- RED/evidência: modo estrito continua vermelho até zero pendência no release;
- pronto: corpus liberável com 100% de decisões humanas e nenhuma decisão de IA.

### ENT95-10-C — Correção, recurso, anulação e recálculo

- prioridade/status/esforço: P0 / READY_FOR_NEXT_STEP / 12 dias;
- owner/dependência/sprint: Domain + Backend + Clinical / ENT95-05-B/10-A / S5–S7;
- o que: respostas abertas, rubrica humana, revisor independente, alteração de gabarito e afetados;
- onde/como: workflows versionados e audit log append-only;
- RED/evidência: recalculo deve preservar versão anterior e nunca editar tentativa original;
- pronto: testes de caso/integração/E2E comprovam decisão e comunicação interna.

### ENT95-10-D — Validade e retirada emergencial de conteúdo

- prioridade/status/esforço: P0 / READY_FOR_NEXT_STEP / 7 dias;
- owner/dependência/sprint: Content ops + Backend / ENT95-10-A / S7–S9;
- o que: data de corte/próxima revisão internas, expiração, retirada e participantes afetados;
- onde/como: scheduler/worker, audit e dashboards internos;
- RED/evidência: conteúdo vencido/retirado deve desaparecer da projeção e gerar evento idempotente;
- pronto: drill de retirada passa sem expor fonte ou resposta correta.

### ENT95-10-E — QA editorial e amostragem pós-publicação

- prioridade/status/esforço: P1 / WAITING_HUMAN_APPROVAL / 5 dias;
- owner/dependência/sprint: Clinical QA + QA / ENT95-10-B–D / S9–S12;
- o que: amostrar cada módulo/tipo/risco e confirmar projeção, gabarito, rubrica e feedback;
- onde/como: ambiente de staging com personas sintéticas;
- RED/evidência: qualquer vazamento ou incoerência reabre lote e item;
- pronto: amostra aprovada e zero finding P0/P1 sem correção.

## 13. ENT95-11 — Worker, Qdrant, IA e resiliência (88 → 95)

### ENT95-11-A — Crash, lease, retry, dead-letter e replay

- prioridade/status/esforço: P0 / COMPLETED / 7 dias;
- owner/dependência/sprint: Backend + QA / E2 eventos estáveis / S7;
- o que: interromper worker entre claim/efeito/ack e provar recuperação idempotente;
- onde/como: worker/outbox/PostgreSQL com fault injection;
- RED/evidência: cenário inicial reproduz lease expirado ou efeito duplicado;
- pronto: nenhum evento perdido/duplicado, DLQ observável e replay auditado.
- resultado/evidência: `apps/worker/src/loop.ts` e `packages/persistence/src/outbox-repository.ts` implementam claim com lease, retry exponencial limitado, dead-letter e replay idempotente. `apps/worker/src/loop.test.ts` cobre RED/GREEN de sucesso, retry, evento não tratado, DLQ e telemetria redigida; `tests/integration/postgres-worker.test.ts` confirmou lease expirado, recuperação e DLQ bounded com PostgreSQL live (2/2 testes live).

### ENT95-11-B — Reconstrução integral do Qdrant

- prioridade/status/esforço: P0 / COMPLETED / 6 dias;
- owner/dependência/sprint: Backend + SRE / ENT95-10-D / S7;
- o que: apagar coleção derivada, rebuild a partir do PostgreSQL e reconciliar órfão/divergência;
- onde/como: job versionado, metadata allowlist e coleção isolada;
- RED/evidência: hash/count divergente antes do rebuild;
- pronto: reconstrução determinística, sem dado proibido e sem alterar fonte transacional.
- resultado/evidência: `apps/worker/src/reconcile.ts` reconstrói a coleção derivada a partir do PostgreSQL, corrige divergência, remove órfãos/versões antigas e é idempotente; `apps/worker/src/reconcile.test.ts` cobre o contrato unitário e `tests/integration/worker-qdrant-live.test.ts` confirmou rebuild não vazio, órfão, divergência, replay determinístico, retirada e idempotência com PostgreSQL/Qdrant live (1/1 teste live).

### ENT95-11-C — Provider de IA opcional e fallback seguro

- prioridade/status/esforço: P1 / WAITING_HUMAN_APPROVAL / 8 dias;
- owner/dependência/sprint: Integrations + Security / provider autorizado / S8;
- o que: se habilitada, provar IA real com resposta estruturada, timeout, retry bounded, circuit breaker e fallback; se não adotada, provar feature flag desligada e zero chamada externa;
- onde/como: server-side, contexto redigido, sem autoridade editorial/nota/papel;
- RED/evidência: timeout/schema inválido/injection devem produzir fallback sem mudança de estado;
- pronto: decisão de adoção registrada; o modo escolhido passa contrato, segurança e telemetria redigida sem autoridade transacional.

### ENT95-11-D — Carga, backpressure e degradação

- prioridade/status/esforço: P1 / READY_FOR_NEXT_STEP / 6 dias;
- owner/dependência/sprint: QA + SRE / ENT95-11-A–C / S11;
- o que: testar bursts, backlog, replicas, Qdrant/IA indisponíveis e recovery;
- onde/como: staging sintético e dashboards de fila;
- RED/evidência: estabelecer ponto de saturação antes do tuning;
- pronto: backpressure bounded, alertas e núcleo transacional disponível.

## 14. ENT95-12 — Observabilidade e operação (78 → 95)

### ENT95-12-A — Telemetria externa, retenção e acesso

- prioridade/status/esforço: P0 / WAITING_HUMAN_APPROVAL / 8 dias;
- owner/dependência/sprint: SRE + Security / D-ENT-04 / S7;
- o que: exportar logs/métricas/traces correlacionados para backend aprovado com retenção e RBAC;
- onde/como: collector/agents/config/secrets externos, payload redigido;
- RED/evidência: probe externo e retenção falham enquanto backend não existir;
- pronto: consulta ponta a ponta, acesso auditado, criptografia e política de retenção comprovados.

### ENT95-12-B — SLOs, dashboards e alertas acionáveis

- prioridade/status/esforço: P0 / IN_PROGRESS / 7 dias;
- owner/dependência/sprint: SRE + Product / ENT95-12-A / S7–S8;
- o que: instrumentar disponibilidade, latência, erros, indexação, IA, fila e experiência;
- onde/como: dashboards versionados e alert rules com owner/escalation;
- RED/evidência: falha sintética deve cruzar threshold e alertar;
- pronto: alertas sem PII, baixo ruído, links para runbook e acknowledgement medido.

- avanço local 2026-08-12: `observability-governance.json` agora versiona 7 sinais, 7 alertas, owner, escalation, janelas de acknowledgement/deduplicação, dashboard e runbook; `infra/observability/prometheus-alerts.yml` contém as regras redigidas; o dashboard Grafana cobre disponibilidade, p95, erros, fila, indexação, IA assistiva e experiência; o exporter Prometheus passou a expor gauge p95 derivado de amostras limitadas; `worker.events.claimed` foi instrumentado para o painel de fila;
- RED/GREEN: `tests/integration/observability-governance.test.ts` passou 2/2 e `packages/observability/src/observability.test.ts` passou 10/10, incluindo p95; `pnpm verify:observability-governance`, lint, typecheck e `git diff --check` passaram;
- artefato: `PREMIUM-ENTERPRISE-95-OBSERVABILITY-GOVERNANCE-045`;
- limite/status: a fatia permanece `IN_PROGRESS`: collector/backend externo, retenção efetiva, consulta ponta a ponta, acknowledgement real e medição de ruído em operação ainda dependem de `D-ENT-04` e ambiente autorizado; nenhum SLO produtivo é declarado e o item 12 continua em 78/100 até reauditoria.

### ENT95-12-C — Backup/restore, RPO/RTO e DR

- prioridade/status/esforço: P0 / WAITING_HUMAN_APPROVAL / 8 dias;
- owner/dependência/sprint: SRE + Database / ENT95-06-D e D-ENT-05 / S8–S9;
- o que: executar perda de nó/ambiente, restore isolado e retorno controlado;
- onde/como: runbooks, backup externo, DNS/secret rotation e evidência imutável;
- RED/evidência: RPO/RTO não podem ser declarados antes da medição;
- pronto: RPO <=1h, RTO <=4h e integridade funcional pós-restore comprovados.

### ENT95-12-D — Incident drills e on-call readiness

- prioridade/status/esforço: P1 / READY_FOR_NEXT_STEP / 5 dias;
- owner/dependência/sprint: SRE + Security + Product / ENT95-12-B/C / S9–S10;
- o que: simular API indisponível, backlog, IdP down, vazamento suspeito e retirada clínica;
- onde/como: tabletop + drill técnico em staging, com papéis e comunicação;
- RED/evidência: medir detecção, resposta e recovery antes de corrigir runbooks;
- pronto: gaps corrigidos, owners treinados e evidência de segundo drill verde.

### ENT95-12-E — Soak e failover de aceitação

- prioridade/status/esforço: P1 / READY_FOR_NEXT_STEP / 5 dias + 24h de execução;
- owner/dependência/sprint: SRE + QA / ENT95-12-A/B / S11;
- o que: carga sustentada, troca de replica e restart controlado durante operações sintéticas;
- onde/como: staging equivalente e perfil aprovado;
- RED/evidência: baseline registra erro/latência/recovery sem ocultar anomalia;
- pronto: SLO, zero perda/duplicidade e telemetria contínua durante failover.

## 15. ENT95-13 — Web, UX e acessibilidade (78 → 95)

### ENT95-13-A — Design system premium e estados completos

- prioridade/status/esforço: P1 / READY_FOR_NEXT_STEP / 10 dias;
- owner/dependência/sprint: UX + Frontend / inventário de superfícies E2 / S3–S6;
- o que: unificar tokens, componentes e estados loading/empty/error/stale/offline/success;
- onde/como: web/componentes por feature, responsivos e sem duplicar regra de autorização;
- RED/evidência: visual/component tests para estados faltantes e viewport estreito;
- pronto: todas as jornadas críticas usam componentes consistentes e mensagens acionáveis.

### ENT95-13-B — Auditoria WCAG 2.2 AA automatizada e manual

- prioridade/status/esforço: P0 / IN_PROGRESS / 8 dias;
- owner/dependência/sprint: Accessibility specialist + QA / ENT95-13-A e E2 completo / S10;
- o que: teclado, foco, semântica, contraste, zoom 200/400%, reflow, erros, labels e motion;
- onde/como: Playwright/axe mais checklist manual em todas as jornadas P0;
- RED/evidência: registrar violações antes da correção;
- pronto: zero violação A/AA e regressão automatizada no CI.
- andamento/evidência: `tests/e2e/experience-accessibility.spec.ts` passou 6/6 no HA ativo, incluindo axe sem violações nas superfícies de participante/autoria, caminho de teclado, landmarks, labels, IDs únicos, erro/retry, estado vazio, viewport estreito e reflow equivalente a 200%/400%. A checklist manual em todas as jornadas P0, contraste/zoom real, motion e validação com usuários continuam abertas.
- avanço local 2026-08-12: `accessibility-governance.json` transforma essa prova em policy executável com 6 critérios automatizados, 2 superfícies e 5 gaps manuais nomeados; `scripts/verify-accessibility-governance.mjs` valida status PASS, caminhos, dados sintéticos, critério WCAG-2.2-AA e gaps sem permitir promoção;
- RED/GREEN: `tests/integration/accessibility-governance.test.ts` passou 2/2; `pnpm verify:accessibility-governance` reportou 6/6 evidências automatizadas, 5 gaps manuais, `PASS_WITH_GAPS` e `PILOT_BLOCKED`;
- artefato: `PREMIUM-ENTERPRISE-95-ACCESSIBILITY-GOVERNANCE-054`;
- limite/status: a task permanece `IN_PROGRESS` até checklist manual das jornadas P0, contraste/zoom/motion, leitores de tela e validação com usuários autorizados.

### ENT95-13-C — Screen reader e testes com usuários representativos

- prioridade/status/esforço: P0 / WAITING_HUMAN_APPROVAL / 6 dias;
- owner/dependência/sprint: UX + Accessibility + usuários / ENT95-13-B / S10–S12;
- o que: testar login, trilha, atividade, prova, resultado, conta, admin e autoria;
- onde/como: NVDA/VoiceOver conforme matriz aprovada e dados sintéticos;
- RED/evidência: barreiras observadas viram findings com severidade;
- pronto: P0/P1 corrigidos e tarefas críticas reexecutadas com sucesso.

### ENT95-13-D — Performance web e resiliência de rede

- prioridade/status/esforço: P1 / READY_FOR_NEXT_STEP / 6 dias;
- owner/dependência/sprint: Frontend + QA / ENT95-13-A / S10–S11;
- o que: budgets de bundle/LCP/INP/CLS, rede lenta, retry e preservação de resposta;
- onde/como: build analysis, browser E2E e throttling controlado;
- RED/evidência: medir baseline e perda/duplicidade em interrupção;
- pronto: budgets aprovados e nenhuma resposta perdida em cenários suportados.

## 16. ENT95-14 — Testes, cobertura e evidência (93 → 95)

### ENT95-14-A — Matriz de testes por requisito e risco

- prioridade/status/esforço: P1 / IN_PROGRESS / 5 dias;
- owner/dependência/sprint: QA lead / ENT95-02-A / S1;
- o que: mapear unit/application/contract/integration/worker/web/E2E/security por RF/RNF;
- onde/como: test strategy/traceability e tags estáveis;
- RED/evidência: gate aponta requisito crítico sem tipo de prova adequado;
- pronto: 100% P0/P1 tem sucesso, erro, acesso negado e conflito aplicáveis.

- avanço local 2026-08-12: `test-risk-matrix.json` define quatro provas obrigatórias (`success`, `error`, `denied`, `conflict`) e oito camadas de teste; `scripts/verify-test-risk-matrix.mjs` deriva os 87 RF P0/P1 da matriz canônica e reporta cobertura sem transformar caminho de teste em prova completa;
- RED/GREEN: `tests/integration/test-risk-matrix-governance.test.ts` passou 2/2 e `pnpm verify:test-risk-matrix` passou com `PASS_WITH_GAPS`: 43/87 success, 0/87 error, 8/87 denied, 24/87 conflict e 0/87 linhas com as quatro provas;
- artefato: `PREMIUM-ENTERPRISE-95-TEST-RISK-MATRIX-046`;
- limite/status: a task permanece `IN_PROGRESS`; 44 RF P0/P1 continuam sem evidência local suficiente, e a cadeia de commit/SHA/release permanece aberta.

### ENT95-14-B — Elevar cobertura global e crítica

- prioridade/status/esforço: P1 / READY_FOR_NEXT_STEP / 15 dias distribuídos;
- owner/dependência/sprint: QA + Eng / implementação de cada sprint / S1–S11;
- o que: atingir >=90% nas quatro métricas e decisão completa nos invariantes críticos;
- onde/como: testes orientados a risco, sem testes vazios para inflar número;
- RED/evidência: thresholds sobem incrementalmente e falham abaixo do alvo;
- pronto: thresholds verdes e coverage review mostra distribuição funcional adequada.

### ENT95-14-C — Eliminar skips inexplicados e flakiness

- prioridade/status/esforço: P1 / IN_PROGRESS / 7 dias;
- owner/dependência/sprint: QA + SRE / ambientes CI / S8–S11;
- o que: classificar 18 skips, remover os evitáveis e monitorar retry/flaky rate;
- onde/como: suites, CI reports e quarentena com owner/prazo somente quando necessária;
- RED/evidência: CI falha para skip sem motivo/issue ou flaky acima do limite;
- pronto: zero skip inexplicado e flaky rate <1% por 20 execuções.
- avanço local 2026-08-12: `skip-governance.json` cataloga os 16 arquivos/18 testes condicionais, as variáveis de guarda e a justificativa de ambiente; `scripts/verify-skip-governance.mjs` rejeita skip não classificado, caminho inexistente e taxa flaky acima do limite;
- RED/GREEN: `tests/integration/skip-governance.test.ts` passou 2/2 e `pnpm verify:skip-governance` reportou `PASS_WITH_GAPS`, 0 skips inexplicados, 0 falhas flaky e 3 execuções observadas de 20 exigidas;
- artefato: `PREMIUM-ENTERPRISE-95-SKIP-GOVERNANCE-047`;
- limite/status: a task permanece `IN_PROGRESS`; ainda faltam 17 execuções qualificadas para demonstrar a taxa flaky <1% por 20 execuções e a execução remota/CI do mesmo contrato.

### ENT95-14-D — Evidência imutável e test data governance

- prioridade/status/esforço: P1 / IN_PROGRESS / 5 dias;
- owner/dependência/sprint: QA + Security / ENT95-15-A/B / S10–S12;
- o que: artifacts, timestamps, SHA, ambiente, seeds sintéticos e teardown verificável;
- onde/como: CI artifacts/manifests e scanners de exposição;
- RED/evidência: artifact sem SHA ou fixture proibida deve ser recusado;
- pronto: prova reproduzível, sanitizada, retida e ligada ao requirement/task/commit.
- avanço local 2026-08-12: `test-evidence-governance.json` registra três evidências sintéticas com timestamp, ambiente, seed, sanitização, teardown, vínculo requirement/task, commit e artifact; `scripts/verify-test-evidence-governance.mjs` rejeita commit inválido, dados não sintéticos, path inexistente, falta de teardown ou segredo não redigido;
- RED/GREEN: `tests/integration/test-evidence-governance.test.ts` passou 2/2 e `pnpm verify:test-evidence-governance` reportou `PASS_WITH_GAPS`, 3 evidências sintéticas, 3 teardowns verificados, 0 evidências completas e 3 gaps explícitos de SHA/artifact/retention;
- artefato: `PREMIUM-ENTERPRISE-95-TEST-EVIDENCE-049`;
- limite/status: a task permanece `IN_PROGRESS` até CI artifact/retention e SHA imutável existirem; ENT95-15-A/B e autorização de commit continuam dependências externas.

### ENT95-14-E — Suite de aceitação final

- prioridade/status/esforço: P0 / READY_FOR_NEXT_STEP / 5 dias;
- owner/dependência/sprint: QA + Auditor / todas as frentes / S12–S13;
- o que: executar todos os gates sem seleção conveniente e consolidar resultados;
- onde/como: RC imutável, staging declarado e runtime evidence;
- RED/evidência: qualquer gate vermelho impede score final;
- pronto: suites e evidências verdes no mesmo SHA, sem suppressions novas.

## 17. ENT95-15 — CI e reprodutibilidade (86 → 95)

### ENT95-15-A — CI remoto completo por PR e SHA

- prioridade/status/esforço: P0 / READY_FOR_NEXT_STEP / 6 dias;
- owner/dependência/sprint: SRE + QA / ENT95-00-A / S1;
- o que: executar lint, typecheck, build, coverage, migrations, live, E2E, security e docs remotamente;
- onde/como: workflow com Node/pnpm/services fixados e cache por lockfile;
- RED/evidência: PR de teste com gate intencionalmente vermelho não pode mesclar;
- pronto: branch protection exige todos os checks e artifacts referenciam o SHA.

### ENT95-15-B — Supply chain, SBOM e provenance

- prioridade/status/esforço: P0 / READY_FOR_NEXT_STEP / 6 dias;
- owner/dependência/sprint: SRE + Security / ENT95-15-A / S1–S3;
- o que: gerar SBOM, digests, provenance, dependency review e assinatura onde suportada;
- onde/como: CI/registry, permissões mínimas e secrets OIDC/manager;
- RED/evidência: artifact adulterado ou dependência alta deve falhar validação;
- pronto: artifact verificável do source ao deploy e zero high/critical sem exceção.

### ENT95-15-C — Deploy progressivo e rollback ensaiado

- prioridade/status/esforço: P0 / WAITING_HUMAN_APPROVAL / 8 dias;
- owner/dependência/sprint: SRE + Product / D-ENT-03/06 e ENT95-15-B / S12–S13;
- o que: migrate compatível, canary/blue-green, health gate, abort e rollback por digest;
- onde/como: ambiente autorizado e runbook sem mutation fora do escopo;
- RED/evidência: canary com health sintético vermelho deve abortar e restaurar versão anterior;
- pronto: rehearsal completo com tempos, digests, dados íntegros e aprovação registrada.

### ENT95-15-D — Reprodutibilidade e cache confiável

- prioridade/status/esforço: P1 / READY_FOR_NEXT_STEP / 4 dias;
- owner/dependência/sprint: SRE / ENT95-15-A/B / S8–S11;
- o que: provar builds repetidos, cache hit/miss, lockfile e imagens por digest;
- onde/como: duas execuções limpas e comparação de manifests;
- RED/evidência: drift de ferramenta/dependência deve produzir artifact diferente e gate vermelho;
- pronto: inputs fixados, diferenças explicadas e release reconstruível.

## 18. ENT95-16 — Rastreabilidade e controle de mudanças (65 → 95)

### ENT95-16-A — Fechar o worktree atual em commits intencionais

- prioridade/status/esforço: P0 / WAITING_HUMAN_APPROVAL / 3 dias;
- owner/dependência/sprint: Tech lead + Ricardo / diff review e autorização de commit / S0;
- o que: separar alterações por escopo, revisar segredos/dados e criar commits convencionais;
- onde/como: Git, sem reset destrutivo e preservando mudanças do usuário;
- RED/evidência: `git status --short` atual demonstra worktree não congelado;
- pronto: commits aprovados, worktree limpo e baseline/release manifest apontam SHA correto.

### ENT95-16-B — Traceability 100% automatizada

- prioridade/status/esforço: P0 / IN_PROGRESS / 7 dias;
- owner/dependência/sprint: QA + Tech lead / ENT95-02-A/14-A / S1–S4;
- o que: ligar requirement→SPEC→task→module→contract→test→commit→artifact;
- onde/como: `traceability.yml` e verificador com IDs canônicos;
- RED/evidência: fixture sem qualquer elo deve falhar com mensagem específica;
- pronto: 100% P0/P1 e cada ENT95 têm cadeia completa, sem link inexistente.
- andamento/evidência: verificador canônico, teste TDD 6/6 e matriz de 12 campos estão verdes com `145` requisitos; o gate também rejeita caminho local ou artefato inexistente. Há 49 linhas com evidência local de módulo/contrato/teste/artefato, sendo 43/87 RF P0/P1; o resultado ainda é `0` cadeias completas e `145` gaps porque o commit/SHA e a disposição de release permanecem abertos. A task permanece aberta até substituir os gaps restantes por elos reais e fechar commit/artifact no mesmo SHA.

### ENT95-16-C — Change control e release manifest por sprint

- prioridade/status/esforço: P1 / READY_FOR_NEXT_STEP / 4 dias;
- owner/dependência/sprint: Program + SRE / ENT95-16-B / S1–S12;
- o que: registrar escopo, migrations, flags, compatibilidade, riscos, rollback e evidência;
- onde/como: PR template/release manifest e log mestre, sem duplicar conhecimento;
- RED/evidência: release sem migration/rollback/owner aplicável deve ser bloqueado;
- pronto: cada incremento tem cadeia de aprovação e rollback verificável.

### ENT95-16-D — Congelar RC e executar auditoria no mesmo SHA

- prioridade/status/esforço: P0 / READY_FOR_NEXT_STEP / 4 dias;
- owner/dependência/sprint: Auditor + QA + SRE / G0–G8 / S13;
- o que: congelar RC, coletar evidência, impedir drift e reavaliar 16 itens;
- onde/como: tag/digest/manifest, CI remoto e audit-engine independente;
- RED/evidência: SHA/ambiente divergente invalida toda evidência afetada;
- pronto: worktree limpo, artifacts verificáveis e relatório final com cada item >=95.

## 19. Mapa de sprints e capacidade sugerida

| Sprint | Tasks comprometíveis | Capacidade principal | Gate |
|---|---|---|---|
| S0 | 00-A/C, 01-A/B, 02-A, 03-A/B, 16-A | Program, QA, Content, Tech lead | M0 |
| S1 | 00-B, 01-C, 02-B, 03-C/D, 04-A/B, 05-A, 14-A, 15-A/B, 16-B/C | fundação + fábrica clínica | parcial M1 |
| S2 | 03-C/D, 05-B, 06-A/B, 08-A/B, 10-A | dados, identity, domain, clinical | M1 |
| S3 | 03-D/E, 07-A/B, 08-A/B, 10-A, 13-A | API/lifecycle/design | incremento E2 |
| S4 | 03-C/D/E, 06-B, 07-B/C, 09-A/B, 13-A | diagnóstico/trilha | incremento E2 |
| S5 | 03-D, 05-B, 06-C, 07-C/D, 09-B/C/D, 10-C | avaliação/recurso | incremento E2 |
| S6 | 03-D/E, 05-C, 07-C/D, 09-C/D, 10-C, 13-A | jornada/retention/dashboards | M2 |
| S7 | 03-D, 10-D, 11-A/B, 12-A/B | async/telemetria | incremento E4 |
| S8 | 03-D, 10-D, 11-C, 12-B/C, 14-C, 15-D | IA/backup/reliability | incremento E4 |
| S9 | 03-D, 06-D, 10-B/D/E, 12-C/D | fechamento clínico/DR | M3/M4 parcial |
| S10 | 08-C/D, 09-E, 12-D, 13-B/C/D, 14-D | UX/a11y/security | M4 |
| S11 | 04-C, 11-D, 12-E, 14-B/C, 15-D | carga/soak/coverage | hardening |
| S12 | 01-D, 09-E, 10-E, 13-C, 14-D/E, 15-C, 16-C | UAT/pre-audit/RC | M5 |
| S13 | 03-F, 14-E, 15-C, 16-D | rehearsal/piloto/audit | M6 |

O commitment real de cada sprint deve respeitar a capacidade aprovada e o WIP. A tabela é um mapa de janela, não autoriza iniciar todas as tasks simultaneamente.

## 20. Dependências humanas e externas abertas

| Task | Dependência | Owner da decisão | Estado |
|---|---|---|---|
| ENT95-00-A | equipe, T0 e capacidade | Ricardo | WAITING_HUMAN_APPROVAL |
| ENT95-00-B / 08-A | IdP/MFA/recovery | Ricardo + Security | WAITING_HUMAN_APPROVAL |
| ENT95-03-B/D/E/F, 10-B/E | revisão/aprovação clínica e piloto | Ricardo | WAITING_HUMAN_APPROVAL |
| ENT95-06-D / 12-A/C | storage/telemetria/backup autorizados | Ricardo + SRE | WAITING_HUMAN_APPROVAL |
| ENT95-08-D | secret manager e drill | Ricardo + Security | WAITING_HUMAN_APPROVAL |
| ENT95-09-E / 13-C | usuários representativos autorizados | Product/Ricardo | WAITING_HUMAN_APPROVAL |
| ENT95-11-C | provider real de IA, se adotado | Ricardo + Security | WAITING_HUMAN_APPROVAL |
| ENT95-15-C | registry/ambiente de deploy/rollback | Ricardo + SRE | WAITING_HUMAN_APPROVAL |
| ENT95-16-A | autorização para commits do worktree existente | Ricardo | WAITING_HUMAN_APPROVAL |

## 21. Definition of done do backlog

O backlog do programa só pode ser marcado `COMPLETED` quando:

1. todas as tasks P0/P1 estão `COMPLETED`;
2. tasks P2 restantes não escondem requisito ou risco material;
3. todos os gates G0–G9 passam;
4. `pnpm verify`, integrações live, E2E, segurança, a11y, carga, DR e CI remoto passam no RC;
5. fila clínica estrita está em zero para o corpus de release;
6. worktree está limpo e a evidência aponta para o mesmo SHA/digest;
7. auditor independente atribui >=95 a ENT95-01–ENT95-16;
8. Ricardo registra go/no-go do piloto/release.

Até isso ocorrer, a baseline oficial permanece a do 0491: **83/100**.

## 22. Checkpoint de rastreabilidade local — 2026-08-12

`ENT95-02-A` e `ENT95-16-B` receberam endurecimento do gate: `scripts/verify-premium-enterprise-traceability.mjs` verifica a presença real de cada caminho local e artefato declarado, e `scripts/verify-traceability.mjs` incorpora o catálogo de drift. O RED/GREEN focado passou 6/6 em rastreabilidade, além de 3/3 em scope drift.

Resultado atual: matriz estrutural `145/145`, `PASS_WITH_GAPS`, `0/145` cadeias completas, `49/145` linhas com evidência local de módulo/contrato/teste/artefato e `43/87` RF P0/P1 com essa evidência. As 44 linhas P0/P1 ainda sem elo local, todos os commits/SHA e o release continuam gaps explícitos. Scorecard: baseline 83,24/100, 12 tasks `COMPLETED`, 37 `READY_FOR_NEXT_STEP`, 3 `IN_PROGRESS` e 18 `WAITING_HUMAN_APPROVAL`; nenhuma nota ou release foi promovida.

## 23. Checkpoint de inventário da API — 2026-08-12

`ENT95-07-A` foi marcada `COMPLETED` após evidência executável. `packages/contracts/src/api-surface.ts` mantém 46 rotas existentes com método, caminho parametrizado, capability, autenticação, escopo, use case, contrato e resposta; `tests/integration/api-surface-inventory.test.ts` materializa os parâmetros e bloqueia qualquer rota sem template de telemetria. O bug de `POST /api/v1/internal/content/:contentId/review` classificado como `unmatched` foi corrigido em `apps/api/src/server.ts`.

RED/GREEN: 13/13 testes focados passaram; `pnpm --filter @cvg/contracts typecheck`, `pnpm lint`, `pnpm verify:traceability` e `pnpm verify:premium-traceability` passaram. Artefato: `PREMIUM-ENTERPRISE-95-API-SURFACE-039`. Scorecard: 14 `COMPLETED`, 35 `READY_FOR_NEXT_STEP`, 3 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`; baseline 83,24/100 sem promoção. A superfície ainda faltante permanece no backlog de `ENT95-07-C`, `ENT95-09` e `ENT95-10`.

## 24. Checkpoint de governança de hotspots — 2026-08-12

`ENT95-04-A` e `ENT95-04-B` estão `COMPLETED` no escopo local verificável. A policy `code-hotspot-policy.json` enumera os 7 arquivos de produção acima de 800 linhas e exige owner, severidade, plano, orçamento-alvo e testes de caracterização; `scripts/verify-code-hotspots.mjs` executa a verificação sobre `apps`, `packages` e `scripts`.

RED/GREEN passou 2/2 em `tests/integration/code-hotspot-policy.test.ts`; `pnpm verify:hotspots`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck` e `git diff --check` passaram. O artefato é `PREMIUM-ENTERPRISE-95-HOTSPOT-POLICY-040`. Scorecard: 16 `COMPLETED`, 33 `READY_FOR_NEXT_STEP`, 3 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`, baseline 83,24/100 sem promoção.

O inventário fecha a governança dos hotspots, não a decomposição física dos 7 módulos. A extração deve seguir os planos e testes de caracterização em fatias reversíveis; capacidade/carga/failover, SHA, gates externos, release, piloto e reauditoria permanecem abertos.

## 25. Checkpoint de documentos canônicos — 2026-08-12

`ENT95-01-A` está `COMPLETED` no escopo local verificável. `docs/canonical-document-registry.json` define `0304` como programa vigente, `0491` como auditoria vigente, `0492` como roadmap vigente e `0493` como backlog vigente; `0490` e `0303` estão declarados históricos/substituídos e apontam para seus sucessores.

RED/GREEN passou 3/3 em `tests/integration/canonical-document-governance.test.ts`; `pnpm verify:documentation`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck` e `git diff --check` passaram. Artefato: `PREMIUM-ENTERPRISE-95-DOCUMENT-REGISTRY-042`. Scorecard: 17 `COMPLETED`, 32 `READY_FOR_NEXT_STEP`, 3 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`, baseline 83,24/100 sem promoção.

O registro reduz ambiguidade documental, mas não fecha SHA/worktree, auditoria independente, gates humanos/externos, corpus clínico, release ou piloto.

## 26. Checkpoint de inventário curricular — 2026-08-12

`ENT95-03-A` está `COMPLETED` no escopo local verificável. `curriculum-inventory.json` reconcilia o currículo versão `3.0.0` em 24 módulos, 96 sessões e 796 registros, com 3 objetivos por módulo, itens críticos, ordem de risco (`M02`, `M12`, `M24` primeiro) e `PILOT_BLOCKED` em todos os módulos.

RED/GREEN passou 2/2 em `tests/integration/curriculum-inventory-governance.test.ts`; `pnpm verify:curriculum-inventory`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck` e `git diff --check` passaram. Artefato: `PREMIUM-ENTERPRISE-95-CURRICULUM-INVENTORY-043`. Scorecard: 18 `COMPLETED`, 31 `READY_FOR_NEXT_STEP`, 3 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`, baseline 83,24/100 sem promoção.

O inventário é estrutural e não clínico: 763 itens permanecem sem revisão/aprovação humana; `ENT95-03-B/C/D`, publicação, release, piloto e reauditoria continuam abertos.

## 27. Checkpoint de observabilidade e alertas — 2026-08-12

`ENT95-12-B` avançou para `IN_PROGRESS` com uma fatia local executável. `observability-governance.json` registra sete sinais operacionais — disponibilidade, latência, erros, indexação, IA assistiva, fila e experiência — e sete alertas com owner, escalation, runbook, janela de acknowledgement, deduplicação e marcação `piiSafe`. O dashboard `infra/observability/grafana/dashboards/cvg-overview.json` foi ampliado para esses sinais; as regras Prometheus ficam em `infra/observability/prometheus-alerts.yml`.

O RED/GREEN passou 2/2 em `tests/integration/observability-governance.test.ts` e 10/10 em `packages/observability/src/observability.test.ts`; `pnpm verify:observability-governance`, lint, typecheck e `git diff --check` passaram. O exporter passou a publicar o gauge p95 derivado da janela limitada de observações, e o worker passou a contar eventos reclamados para permitir alerta de backlog. Artefato: `PREMIUM-ENTERPRISE-95-OBSERVABILITY-GOVERNANCE-045`.

O gate é `PASS_WITH_EXTERNAL_OPERATIONAL_GAPS`: não há PII nas regras e a configuração é determinística, mas acknowledgement real, baixo ruído medido, collector/backend externo, retenção e operação ponta a ponta continuam dependentes de `D-ENT-04`. A baseline 83,24/100 e a nota 78 do item 12 não mudam; release, piloto, SHA e reauditoria seguem bloqueados.

## 28. Checkpoint de matriz de testes por risco — 2026-08-12

`ENT95-14-A` avançou para `IN_PROGRESS`. `test-risk-matrix.json` define as quatro provas obrigatórias para RF P0/P1 — sucesso, erro, acesso negado e conflito — e as camadas unit, application, contract, integration, worker, web, E2E e security. `scripts/verify-test-risk-matrix.mjs` deriva os 87 RF P0/P1 da matriz canônica, classifica referências existentes e mantém os gaps explícitos.

RED/GREEN passou 2/2 em `tests/integration/test-risk-matrix-governance.test.ts`; `pnpm verify:test-risk-matrix` reporta `PASS_WITH_GAPS`: 43/87 success, 0/87 error, 8/87 denied, 24/87 conflict e 0/87 linhas com as quatro provas. Artefato: `PREMIUM-ENTERPRISE-95-TEST-RISK-MATRIX-046`.

O checkpoint não declara cobertura completa: 44 RF P0/P1 continuam sem evidência local suficiente, os testes ainda não possuem tags completas de risco, commit/SHA e release permanecem abertos e a baseline 83,24/100 não muda.

## 2026-08-12 — Verificação final após ENT95-04-C

- **resultado:** `pnpm verify` passou com 123 arquivos/560 testes/18 skips condicionais e cobertura 86,63% statements, 82,61% branches, 87,34% functions e 87,39% lines;
- **runtime:** build dos 12 workspaces, E2E HA real 3/3, audit de dependências sem vulnerabilidades conhecidas e `git diff --check` passaram;
- **scorecard:** baseline 83,24/100 sem promoção; 1/16 itens no alvo; 18 `COMPLETED`, 25 `READY_FOR_NEXT_STEP`, 9 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`;
- **limites:** `ENT95-04-C` mantém 4 gaps e `ENT95-13-B` 5 gaps manuais; 0/145 cadeias completas, 145 gaps, SHA/worktree, CI artifact/retention, revisão clínica, gates externos, release, piloto e reauditoria continuam pendentes.

## 2026-08-12 — ENT95-04-C — Evidência exploratória de carga e failover

- **evidência:** três cargas HA sintéticas — 200/20, 1.000/50 e 5.000/100 — passaram 100% HTTP 200; com `api-a` parado, 1.000/50 passou 100% e a réplica foi restaurada saudável;
- **métricas:** p95 de 91,41 ms, 115,47 ms, 160,80 ms e 106,91 ms no failover; throughput de 466,72, 716,71, 1.014,10 e 565,82 req/s;
- **gate:** `pnpm verify:capacity-governance` e o teste focal 3/3 passaram; `steppedLoadRuns=3`, `failoverSuccessRatePercent=100`, `soakStatus=NOT_EXECUTED`;
- **limite/status:** a evidência é exploratória e sintética; saturação, soak, perfil/SLO aprovado, CI/SHA e capacidade produtiva continuam GAP; task `IN_PROGRESS`, `PILOT_BLOCKED`, sem promoção de nota;
- **artefato:** `PREMIUM-ENTERPRISE-95-CAPACITY-EXPLORATION-058`.

## 2026-08-12 — Verificação transversal final após ENT95-04-C

- **resultado:** `pnpm verify` passou com 123 arquivos/561 testes/18 skips condicionais e cobertura 86,63% statements, 82,61% branches, 87,34% functions e 87,39% lines;
- **runtime:** build dos 12 workspaces, E2E HA real 3/3, audit de dependências sem vulnerabilidades conhecidas e `git diff --check` passaram;
- **scorecard:** 83,24/100 sem promoção; 1/16 itens no alvo; 18 `COMPLETED`, 25 `READY_FOR_NEXT_STEP`, 9 `IN_PROGRESS`, 18 `WAITING_HUMAN_APPROVAL`;
- **limites:** `ENT95-04-C` conserva 4 gaps e `soakStatus=NOT_EXECUTED`; 0/145 cadeias completas, 145 gaps, 5 gaps manuais WCAG, SHA/worktree, CI artifact/retention, revisão clínica, gates externos, release, piloto e reauditoria continuam pendentes.

## 2026-08-12 — Visão filtrada dos itens abaixo de 80

O backlog suplementar `0511_sub80_to_95_backlog.md` reutiliza, sem renumerar, as 29 tasks dos itens 3/9/10/12/13/16. Snapshot da visão: 3 `COMPLETED`, 3 `IN_PROGRESS`, 12 `READY_FOR_NEXT_STEP` e 11 `WAITING_HUMAN_APPROVAL`. Este arquivo continua sendo a fonte canônica de estado; qualquer transição deve ser reconciliada na visão e em `sub80-to-95-program.json`.

O gate `pnpm verify:sub80-program` passou com seis itens, 29 tasks e 10 gates. A baseline 83,24 e as notas oficiais permanecem congeladas; nenhuma task concluída isoladamente promove item, release, piloto ou publicação clínica.
