# 57 — Backlog State of Art: 40 itens verificáveis

**Revisão:** 2026-09-17 · **Fonte de ordem/notas:** [auditoria, tabelas de notas](audits/construction-assessment-2026-09-17.md#notas-por-item).
**Plano/barra:** [55](55_executive_plan_state_of_art.md). **Fases/sprints:** [56](56_roadmap_state_of_art.md).

## Checkpoint prevalente — 2026-10-02 (retomada após correção C9, 19:17)

O roadmap de remediação está em [58](58_roadmap_repository_remediation_2026-10-01.md), com tasks em [59](59_backlog_repository_remediation_2026-10-01.md). A auditoria de 01/10 foi estática; seus achados não promovem evidência histórica. Este checkpoint registra a execução local mais recente.

- SOA-02/06 e AUDIT-REM-08: IN_PROGRESS — checkpoint e proveniência estão em reconciliação; scorecard v7 permanece histórico e nenhuma nova scorecard foi criada sem candidato final congelado.
- SOA-14/15 e AUDIT-REM-06: IN_PROGRESS / WAITING_HUMAN_APPROVAL — modalidade, versão e fonte de elegibilidade somativa aguardam decisão; o fluxo formativo permanece preservado.
- SOA-30/31/32 e AUDIT-REM-01–05: estados locais e limitações constam em docs/59; permanecem pendências de candidato committed, prova remota e decisão same-UID para REM-03/04.
- Decisões: H-EDITORIAL (autorrevisão no MVP), H-OPS (RPO ≤1h/RTO ≤4h) e H-LIVE (Docker efêmero local com dados sintéticos) foram respondidas. AAA-001, H-REMOTE e H-CONTENT continuam gates independentes.
- SOA-20: IN_PROGRESS — autorrevisão, revisor distinto e `MODERATE_CONTENT` estão alinhados em SPEC 0106/0111/0191; a publicação clínica continua bloqueada por H-CONTENT.
- SOA-35/37 e AUDIT-REM-09: IN_PROGRESS — drill PG16 local `0053 → restore → 0054` passou com preflight, rejeição de header corrompido, drift estrutural controlado, catálogo limitado às tabelas contratadas e matriz local do app role. A execução direta mais recente passou em 2.343 ms, medição técnica parcial sem valor de RTO. Grants produtivos, principal privilegiado aprovado e compatibilidade arbitrária/externa seguem sem evidência.
- Revisões C6/Kepler/C7 encontraram P2s em stderr, wiring e rows de catálogo incompletas; C8 encontrou mais um P2: o argumento `tableNames` aceitava string vazia. O fingerprint oficial completo pré/pós C8 coincidiu em `cc3fd50ba26b1a3a41da59328e7c31f0de2917e0d0e54a5c46796e221dbf0041`; o reviewer não executou testes nem escreveu arquivos. RED reproduziu o aceite de catálogo válido sob `tableNames: [""]`; GREEN exige string não vazia e a regressão agora rejeita a entrada. A suíte restore/policy/migration-governance passou 43 testes com um skip live condicional; o drill direto PG16 passou em 2.343 ms. A revisão fresh do snapshot C9 corrigido continua pendente; Gauntlet permanece `ACTIVE/FIX_RETEST/STALE`, sem rebaseline.
- Após C9, lint, typecheck, `format:check`, Prettier, CI contract, secrets, traceability, migrations, product-definition, exposure, documentation, audit-consistency, JSON e diff-check passaram sob Node 22.23.2. Após o sync dos registros, os gates Prettier, documentation, traceability, audit-consistency, parse JSON e diff-check passaram novamente. `verify:evidence-consistency` segue aberta pela ausência do mutation run ID de candidato committed; coverage e audit passam. A próxima crítica fresh ainda é necessária.
- `verify:evidence-consistency` segue sem mutation run ID genuíno do candidato committed; coverage e audit passam. O estado global permanece `WAITING_HUMAN_APPROVAL`; nenhuma task SOA foi encerrada por este checkpoint.

## Checkpoint histórico — 2026-09-17 (09:30)

Esta seção registra o snapshot histórico abaixo. Nenhuma das 40 tasks estava concluída integralmente naquela data.

- SOA-02/06: IN_PROGRESS — plano, roadmap e 40 tasks criados; rastreabilidade e continuidade vinculadas; reconciliação documental desta rodada (correção de encaminhamento A02→SOA-14/15, contagens 1441/68, roadmap IN_PROGRESS).
- SOA-29: IN_PROGRESS — runtime Node 22.23.2/22.22.0 canônico; `pnpm verify` completo PASS com exit 0 honesto: 207 arquivos/1441 testes, 36/68 skipped, cobertura 91,57/86,15/95,94/92,18. Inventário de skips/assertion `curriculum.http.test.ts:723` pendente.
- SOA-31: IN_PROGRESS — harness fail-closed (histórico NOT_VERIFIED/exit 1), validação estruturada de resultado/identidade e fluxo bounded executável em root isolado, 20/20 focais; mutation-summary.json histórico segue não-endorseado para certificação.
- SOA-33: IN_PROGRESS — RED de ciclos .js→.ts, extração de contratos folha em API/currículo/persistência e gate real verde. Crítico identificou regex insuficiente; parser TypeScript passou seis fixtures incluindo sintaxe compacta, strings e type-only/workspace. Outros gates de qualidade ainda pendentes.
- SOA-36: IN_PROGRESS — amostras HTTP alimentam p95 por buckets cumulativos bounded; followup substituiu relógio civil por performance.now com teste RED/GREEN. Deadline, janela móvel e operação live ainda não concluídos. Chamadas de agentes usaram SOA-35 para esta fatia; ID canônico correto é SOA-36.
- SOA-14/15 (A02): IN_PROGRESS investigação — `evaluateSummativeAssessment`/`evaluateSummativeAttemptEligibility` sem consumidores runtime (só domínio + export); `StartAttempt` (SPEC 0106, UC-004–008) sem modalidade/versão; `AttemptActivityPort` só `isAvailable`. Contrato localizado: UC-006 (gatilho = módulo concluído + elegibilidade), RF-041/043–047, RN-020–022/026. Wiring agora inventaria modalidade; proposta mínima pendente sem impor elegibilidade ao quiz (RF-041/RN-020).
- Review inicial fresh REJECT, sentinel estável; correções feitas, revisão final ainda pendente. Demais tasks conservam pendências originais; nenhuma certificação AAA.
- Reordenação explícita: fatia local de instrumentação SOA-36 antecipada de F6, pois independe de alterações pedagógicas ou acesso live; não encerra SOA-35 nem H-OPS.
- Correção de encaminhamento: A02 mapeia para SOA-14/15/16/17/25 (handoff §Handoff), não SOA-06/13; o checkpoint anterior que indicava SOA-06/13 estava incorreto e fica supersedido por este.

## Convenções e origem dos contratos

SOA-01–40 preservam exatamente a ordem dos 40 itens; notas /100 são baseline consultiva, não progresso. Todos têm **execução pendente**, inclusive capacidades preexistentes: o trabalho é verificar/remediar gaps, não reimplementar tudo. READY_FOR_NEXT_STEP permite seleção, não ignora dependências; WAITING_HUMAN_APPROVAL limita a decisão indicada. Owners são papéis propostos, a alocar pelo Lead. Prioridade de planejamento: primeiro F1/F2 e integridade F3; não confundir com severidade P0/P1 de achado confirmado.

Referências abreviadas resolvem sob `BRIEFING/09.PROJETO_CVG_TREINAMENTO/`:

- RF = `01.PRD/0013_requisitos_funcionais.md`; RN = `01.PRD/0012_regras_de_negocio.md`; RNF = `01.PRD/0014_requisitos_nao_funcionais_produto.md`.
- S0101=`02.SPEC/0101_visao_arquitetural.md`; S0102=`0102_bounded_contexts.md`; S0103=`0103_mapa_de_modulos.md`; S0104=`0104_modelo_de_dominio.md`; S0105=`0105_maquina_de_estados_e_fluxos.md`.
- S0106=`02.SPEC/0106_contratos_de_aplicacao.md`; S0107=`0107_contratos_de_api.md`; S0108=`0108_contratos_de_eventos_e_assincronismo.md`; S0109=`0109_dados_e_persistencia.md`; S0110=`0110_consistencia_integridade_e_migracoes.md`.
- S0111=`02.SPEC/0111_permissoes_governanca_e_auditoria.md`; S0112=`0112_integracoes.md`; S0113=`0113_observabilidade_runtime_e_operacao.md`; S0114=`0114_superficie_web_spa_e_acessibilidade.md`; S0115=`0115_plano_de_build_por_fases.md`; S0116=`0116_matriz_de_dependencias_e_versionamento.md`; S0117=`0117_backlog_estruturado.md`; S0118=`0118_estrategia_de_testes_rastreabilidade_e_verificacao.md`. Nomes sem prefixo nas listas mantêm a pasta `02.SPEC/`.
- B0560/61/62 = contratos `0560_jornada_sessao_diagnostica_contract.md`, `0561_aaa_vertical_journey_contract.md`, `0562_aaa_recovery_resilience_contract.md` em `BRIEFING/03.BUILD/`.

RF/RN/RNF citados são origens conhecidas; referência temática a SPEC não prova paridade com código. Antes do RED, o owner localiza seção/versão exata e registra a cadeia requisito→SPEC→contrato→módulo→teste. Onde o contrato executável não é conhecido, **investigar**, não inventar endpoint, evento, schema ou regra. A01–A07 são hipóteses de auditoria; refutação demonstrada também é saída válida de investigação, nunca justificativa para mudança indevida.

Aceite comum a todos: evidência datada/hashada, resultado e limites, revisão independente e critérios aplicáveis da SOA-QB-v1; implementação só termina após regressão. Revert significa apenas a fatia própria revisada, preservando trabalho externo. Migrations produtivas e publicação estão proibidas nesta rodada. Lead é o único escritor de runtime/log/backlogs canônicos/manifesto; os locais abaixo são destinos futuros, não arquivos alterados por esta entrega.

## Documentação e governança

### SOA-01 — Definição do produto e gates Discovery/PRD/SPEC

- **Baseline:** 85/100 · **Fase:** F1 · **Owner:** Lead + Ricardo · **Estado:** READY_FOR_NEXT_STEP; execução pendente.
- **Origem → SPEC:** RN-043/044/074, RF-034/035 → S0106 §9, S0111; A04. Gates 0090/0190 citados no plano.
- **O que / onde / como:** reconciliar precedência e contradições em PRD/SPEC e decisões, inventariando regra aprovada, implementação observada e pergunta humana; não transformar parecer em norma.
- **Dependência:** leitura dos gates; H-EDITORIAL para mudar a regra, não para inventariar.
- **Teste/RED:** comparação RN-044 versus revisor diferente em S0106 produz conflito explícito; decisões não aprovadas não podem parecer vigentes.
- **Pronto:** matriz de contratos com fontes/versões e decisão pendente atribuída; núcleo liberável sem B-07/calibração artificial; alteração editorial somente após decisão registrada.
- **Rollback:** restaurar redação da fatia e registrar decisão supersedida, sem apagar aprovações históricas.

### SOA-02 — Planejamento BUILD e rastreabilidade

- **Baseline:** 75/100 · **Fase:** F1 · **Owner:** Lead · **Estado:** READY_FOR_NEXT_STEP; execução pendente.
- **Origem → SPEC:** AGENTS, RF-081, RNF-021 → S0115–S0118; AAA-000/002/003.
- **O que / onde / como:** reconciliar `BRIEFING/03.BUILD/0300–0302`, docs 55–57 e `traceability.yml`; anexar aliases SOA↔AAA/AUD por evidência, sem renumerar históricos.
- **Dependência:** SOA-01; ownership exclusivo do Lead.
- **Teste/RED:** item sem SPEC, teste ou evidência deve aparecer incompleto; link quebrado/ID duplicado reprova verificação documental.
- **Pronto:** 40/40 mapeados, sem órfãos, com fases/owners e evidência exigida; zero fechamento por mera existência de arquivo.
- **Rollback:** reverter somente vínculos novos incorretos, preservando IDs e histórico.

### SOA-03 — Documentação arquitetural

- **Baseline:** 70/100 · **Fase:** F1 · **Owner:** Arquitetura backend · **Estado:** READY_FOR_NEXT_STEP; execução pendente.
- **Origem → SPEC:** RNF-017/039 → S0101–S0103/S0107.
- **O que / onde / como:** confrontar `docs/architecture`, registry em `apps/api` e composição dos três apps; redesenhar dependências a partir de imports/rotas efetivas, não de números históricos.
- **Dependência:** SOA-02; confirmação do inventário de código.
- **Teste/RED:** rota ou dependência real omitida no inventário deve gerar divergência; distinguir entrada de registry de combinações método/rota.
- **Pronto:** diagramas e inventário reproduzíveis com snapshot/hash, limites e ligações às fronteiras reais.
- **Rollback:** reverter diagramas inexatos; manter snapshot anterior rotulado histórico.

### SOA-04 — ADRs e documentação de segurança

- **Baseline:** 65/100 · **Fase:** F1 · **Owner:** Segurança + arquitetura · **Estado:** READY_FOR_NEXT_STEP; execução pendente.
- **Origem → SPEC:** RNF-030/037/039 → S0111/S0112; A05.
- **O que / onde / como:** revisar `docs/decisions` e `docs/security` contra rate limit/identidade/composição; separar implementado, conectado e comprovado live.
- **Dependência:** SOA-03; SOA-28 fornece prova operacional posteriormente.
- **Teste/RED:** ADR que descreve como futuro um controle já implementado, ou como live algo sem artefato, deve ser sinalizado.
- **Pronto:** decisões com motivação, ameaça, alternativas, implementação e gaps atuais; nenhum requisito novo de produto inventado.
- **Rollback:** superseder ADR por registro rastreável, não reescrever decisão histórica silenciosamente.

### SOA-05 — Runbooks e operação documentada

- **Baseline:** 60/100 · **Fase:** F1 · **Owner:** Operações · **Estado:** READY_FOR_NEXT_STEP; execução pendente.
- **Origem → SPEC:** RNF-015/017 → S0110/S0113; AAA-605/606.
- **O que / onde / como:** reconciliar `docs/runbooks`, `docs/operations` e scripts de restore; especificar ordem conforme versão do backup/schema e compatibilidade, não escolher restore/migrate por opinião.
- **Dependência:** SOA-01; H-OPS para metas adicionais; ensaio posterior SOA-37.
- **Teste/RED:** cenário backup antigo vs aplicação nova revela ordem incompatível e deve abortar antes de promover DB inconsistente.
- **Pronto:** preconditions/abort/owners/comandos existentes documentados; procedimento não ensaiado rotulado não comprovado até SOA-37.
- **Rollback:** voltar procedimento aprovado anterior e suspender recomendação conflitante; nunca executar contra DB real.

### SOA-06 — Estado, log e backlog atuais

- **Baseline:** 50/100 · **Fase:** F1 · **Owner:** Lead/runtime-controller · **Estado:** READY_FOR_NEXT_STEP; execução pendente.
- **Origem → SPEC:** AGENTS continuidade → S0118; A07/AUD-0917-A07.
- **O que / onde / como:** reconciliar `docs/99_runtime_state.md`, `20_master_execution_log.md`, `30_backlog_master.md`; checkpoint prevalente único, histórico separado e métricas com data/SHA.
- **Dependência:** SOA-02; nenhum outro escritor desses arquivos.
- **Teste/RED:** dois HEADs declarados atuais ou métrica histórica rotulada fresca devem falhar na revisão de consistência.
- **Pronto:** timestamp/status/last_completed_action/next_action, falhas e decisões humanos inequívocos; histórico intacto.
- **Rollback:** nova entrada corretiva append-only e restauração do checkpoint válido, sem apagar log.

### SOA-07 — Auditorias e scorecards históricos

- **Baseline:** 50/100 · **Fase:** F1 · **Owner:** QA de evidência · **Estado:** READY_FOR_NEXT_STEP; execução pendente.
- **Origem → SPEC:** AGENTS AUDIT → S0118; A01/A07 e AUD-0917-REVIEW.
- **O que / onde / como:** indexar `docs/audits`, `docs/quality` e artefatos por escopo/SHA/ambiente; retirar uso de PASS antigo como prova corrente sem apagar pareceres.
- **Dependência:** SOA-06; parecer final novo depende SOA-39/40.
- **Teste/RED:** bundle de `14b97a8` não pode certificar worktree auditado de `3cd7bc3` mais mudanças; mutação inválida não entra em score atual.
- **Pronto:** cada claim localizável como histórico, atual comprovado ou não comprovado; revisão final divergente permanece não homologada.
- **Rollback:** restaurar índice anterior com nota corretiva; conservar todos os artefatos originais.

## Produto e implementação

### SOA-08 — Arquitetura e composição backend

- **Baseline:** 80/100 · **Fase:** F3 · **Owner:** Backend · **Estado:** READY_FOR_NEXT_STEP; execução pendente.
- **Origem → SPEC:** RNF-017/039 → S0101–S0103/S0106.
- **O que / onde / como:** rastrear wiring em `apps/api`, `apps/worker`, `packages/application` e adaptadores; ligar portas realmente requeridas, sem microserviços ou refatoração cosmética.
- **Dependência:** SOA-03/29/33.
- **Teste/RED:** composição com dependência obrigatória ausente deve falhar explicitamente; integração opcional desligada não deve impedir núcleo.
- **Pronto:** grafo de runtime corresponde a contratos; teste de composição prova caminho real e isolamento de camadas.
- **Rollback:** reverter wiring da fatia ou desligar integração opcional mantendo composição anterior testada.

### SOA-09 — API e contratos

- **Baseline:** 85/100 · **Fase:** F3 · **Owner:** API/contratos · **Estado:** READY_FOR_NEXT_STEP; execução pendente.
- **Origem → SPEC:** RF-074, RNF-039 → S0106/S0107; UC-004–008.
- **O que / onde / como:** confrontar registry/handlers de `apps/api` com `packages/contracts`; validar schemas, erros, limites e projeções por operação concreta.
- **Dependência:** SOA-08/29/33.
- **Teste/RED:** input fora do schema, versão conflitante e projeção com campo interno devem ser rejeitados; rota documentada sem handler é gap.
- **Pronto:** matriz método/rota/contrato/handler/teste completa; regressões de códigos públicos e idempotência passam.
- **Rollback:** reverter alteração compatível de handler/schema; não quebrar cliente congelado.

### SOA-10 — Contas, convite, sessão e recuperação

- **Baseline:** 80/100 · **Fase:** F3 · **Owner:** Identidade/backend · **Estado:** READY_FOR_NEXT_STEP; execução pendente.
- **Origem → SPEC:** RF-001/006/008/009, RNF-037/038 → S0106 §6/S0107/S0111; B0562.
- **O que / onde / como:** provar conta/convite/rotação/revogação/recuperação em API, proxy e persistência; investigar contrato de provedor/MFA, sem contratar ou fingir integração.
- **Dependência:** SOA-09/12; H-LIVE para HTTPS/DB descartável.
- **Teste/RED:** convite/recovery consumido duas vezes, sessão revogada após reload e cookie inseguro não podem autenticar; usar fixtures locais.
- **Pronto:** fluxos de sucesso/expiração/revogação/reidratação comprovados no boundary real; provider/MFA não comprovados permanecem gaps explícitos.
- **Rollback:** reverter fatia de sessão sem revalidar tokens revogados; desligar fluxo novo inseguro.

### SOA-11 — Autorização e fronteiras públicas

- **Baseline:** 75/100 · **Fase:** F3 · **Owner:** Segurança de aplicação · **Estado:** READY_FOR_NEXT_STEP; execução pendente.
- **Origem → SPEC:** RF-003/031/074, RNF-039/085 → S0111/S0106/S0107.
- **O que / onde / como:** matriz ator×capability×escopo×recurso em `packages/application`, API e projeções web; negar por padrão e verificar saída allowlisted em testes locais.
- **Dependência:** SOA-09/10; SOA-13 para defesa adicional live.
- **Teste/RED:** sessão sintética sem capability, recurso de outro escopo e campo bibliográfico/gabarito em DTO devem ser negados ou removidos pelo contrato.
- **Pronto:** matriz positiva/negativa completa nas operações críticas, sem confiar no frontend; revisão independente.
- **Rollback:** preservar deny-by-default, reverter expansão de acesso da fatia; não liberar regra editorial em conflito.

### SOA-12 — Persistência e integridade transacional

- **Baseline:** 80/100 · **Fase:** F3 · **Owner:** Persistência · **Estado:** READY_FOR_NEXT_STEP; execução pendente.
- **Origem → SPEC:** RF-051/081, RNF-011/017/023 → S0109/S0110/S0106 §5.
- **O que / onde / como:** inventariar migrations/repositórios em `packages/persistence`; reaplicar cadeia em DB vazio descartável e provar CAS, FKs, fingerprints, atomicidade e upgrade compatível.
- **Dependência:** SOA-08/29; H-LIVE.
- **Teste/RED:** submissões concorrentes, mesma chave com payload divergente e falha entre resposta/outbox não podem criar duplicidade ou commit parcial.
- **Pronto:** migrations e invariantes passam em DB real descartável; histórico e versões preservados, cleanup demonstrado.
- **Rollback:** descartar só DB de teste identificado; produto exige correção forward compatível, nunca reset de dados reais.

### SOA-13 — RLS e isolamento em banco real

- **Baseline:** 60/100 · **Fase:** F3 · **Owner:** Persistência + segurança · **Estado:** READY_FOR_NEXT_STEP; execução pendente.
- **Origem → SPEC:** RNF-030/039/063 → S0109/S0111; AAA-107.
- **O que / onde / como:** executar harness existente em `tests/integration` com owners/grants/runtime roles separados; registrar ENABLE/FORCE e contexto transacional efetivo.
- **Dependência:** SOA-12; H-LIVE e credenciais descartáveis sem exposição.
- **Teste/RED:** consultas locais por role runtime sem escopo ou de escopo distinto não veem/alteram linhas; pool reutilizado não herda contexto anterior.
- **Pronto:** matriz de operações e tabelas críticas exercitada sob role sem bypass, não apenas superuser; evidência redigida e revisão.
- **Rollback:** restaurar política testada via migration compatível; se impossível, bloquear operação afetada, não desabilitar RLS.

### SOA-14 — Tentativas, respostas e correção

- **Baseline:** 75/100 · **Fase:** F3 · **Owner:** Aplicação educacional · **Estado:** READY_FOR_NEXT_STEP; execução pendente.
- **Origem → SPEC:** RF-040/051/056/058/098 → S0106 StartAttempt/SaveAnswer/SubmitAttempt/CorrectOpenResponse; S0108.
- **O que / onde / como:** rastrear `attempt-use-cases`, API, worker e repositórios até feedback; preservar revisão humana e versões congeladas.
- **Dependência:** SOA-09/11/12/13.
- **Teste/RED:** submit repetido não corrige duas vezes; resposta aberta não vira corrigida sem decisão humana; interrupção retoma último estado confirmado.
- **Pronto:** ciclo tentativa→resposta→submissão→correção→feedback comprovado em DB; projeção correta para dono e histórico reconstruível.
- **Rollback:** reverter comando novo mantendo tentativas imutáveis; compensar resultado por versão, não sobrescrever nota.

### SOA-15 — Avaliação somativa e elegibilidade

- **Baseline:** 45/100 · **Fase:** F3 · **Owner:** Domínio/aplicação + Ricardo para dúvidas · **Estado:** READY_FOR_NEXT_STEP; execução pendente.
- **Origem → SPEC:** RN-020–029, RF-041/043–048 → S0104/S0105/S0106 StartAttempt; A02.
- **O que / onde / como:** investigar consumidores de `packages/domain/src/assessment-policy.ts` e abertura real em `packages/application/src/attempt-use-cases.ts`; conectar apenas políticas aplicáveis à modalidade e versão, sem impor elegibilidade somativa ao quiz.
- **Dependência:** SOA-01/14; contrato de disparo/resultado curricular a localizar e reconciliar antes de código.
- **Teste/RED:** quiz não entra na média; caso somativo 30/prova70; geral70 não compensa crítico79; retentativa somativa antes de7 dias falha; formativa mantém tentativas permitidas.
- **Pronto:** políticas demonstradas por chamadas de runtime com casos limítrofes, modalidades e versões; nenhuma mudança de regra por inferência da auditoria.
- **Rollback:** desativar novo encadeamento se incorreto e preservar resultados originais; correção versionada após revisão.

### SOA-16 — Jornada e progressão

- **Baseline:** 65/100 · **Fase:** F3 · **Owner:** Aplicação educacional · **Estado:** READY_FOR_NEXT_STEP; execução pendente.
- **Origem → SPEC:** RF-020–023/025/027/028/070 → S0105/S0106 §8; B0560/61.
- **O que / onde / como:** integrar queries/assignments/runtime curricular e próxima ação em aplicação/API/web; provar progresso, avaliação e domínio separados, sem dispensar núcleo.
- **Dependência:** SOA-14/15/25; harness preparado SOA-32, fixture sintética não depende biblioteca B-07 completa.
- **Teste/RED:** aprovação sem atividade obrigatória não conclui módulo; pré-requisito ausente não libera próximo; resultado digital não altera autonomia.
- **Pronto:** jornada completa e retomada atravessam browser→API→DB/RLS, com oracle separado e decisão explicável reproduzível.
- **Rollback:** voltar projeção/encadeamento anterior sem apagar assignments; reparar por transição versionada.

### SOA-17 — Remediação e retenção

- **Baseline:** 50/100 · **Fase:** F3 · **Owner:** Domínio/aplicação educacional · **Estado:** READY_FOR_NEXT_STEP; execução pendente.
- **Origem → SPEC:** RF-048/049/055/059/095, RN-030–034 → S0105/S0106 CreateRemediation/ScheduleRetention.
- **O que / onde / como:** ligar estados, agendamento e formas equivalentes nos casos de uso/currículo; usar clock injetável; investigar contrato de seleção/automação antes de inventar evento.
- **Dependência:** SOA-15/16/25; decisão humana se contrato encontrado divergir.
- **Teste/RED:** retenção30/60/90 com item literal repetido falha equivalência; baixa retenção não revoga conclusão; segunda reprovação encaminha plano humano sem punição.
- **Pronto:** datas, acomodações e reforço apenas do objetivo afetado testados em runtime; replay não duplica agendamento; formas têm evidência de equivalência.
- **Rollback:** pausar agendador novo e recompor agenda da fonte transacional, preservando histórico de avaliações.

### SOA-18 — Diagnóstico B-07

- **Baseline:** 55/100 · **Fase:** F4 · **Owner:** Conteúdo + aplicação; Ricardo revisa · **Estado:** READY_FOR_NEXT_STEP; execução pendente.
- **Origem → SPEC:** RF-010–016, RN-011/074 → S0106/B0560/61; PRD0090 §4.
- **O que / onde / como:** verificar sessão persistida/UI/flag draft e inventário B-07 em `packages/curriculum`; separar fixture genérica de instrumento clínico autoral e sua aprovação.
- **Dependência:** SOA-12/16; H-CONTENT só para publicar; não bloqueia núcleo/calibração/T2.
- **Teste/RED:** diagnóstico interrompido retoma; finalização duplicada não perde contagem; draft não publicado não aparece como instrumento clinicamente aprovado.
- **Pronto:** recorte técnico provado e banco individualmente inventariado; instrumento completo só declarado após itens/rubricas e revisão humana correspondentes.
- **Rollback:** desligar disponibilidade do instrumento novo; preservar sessão e versão já utilizada sem apagar respostas.

### SOA-19 — Currículo e conteúdo pedagógico

- **Baseline:** 40/100 · **Fase:** F4 · **Owner:** Autoria curricular + Ricardo · **Estado:** READY_FOR_NEXT_STEP; execução pendente.
- **Origem → SPEC:** RF-020/030–039/090/096, RN-071/075 → S0103/S0104/S0106/S0111; PRD0016/0017; A03.
- **O que / onde / como:** inventariar 24 módulos/96 sessões em `packages/curriculum` e dados autorizados de teste, distinguindo catálogo, banco genérico, conteúdo autoral, rubricas e revisão; produzir por ondas internamente, não copiar terceiros.
- **Dependência:** SOA-20 para publicação; H-CONTENT por versão, não B-07/calibração universal.
- **Teste/RED:** módulo com questões genéricas ou objetivo sem rubrica não passa pré-voo como completo; versão vencida/retirada não fica ativa.
- **Pronto:** cada módulo tem lacunas, owner e versão explícitos; aceites item a item e aprovação de Ricardo para conteúdo publicado, sem afirmar biblioteca pronta pelo catálogo.
- **Rollback:** retirar somente versão defeituosa e preservar histórico; manter rascunhos fora da projeção participante.

### SOA-20 — Autoria, revisão e publicação

- **Baseline:** 60/100 · **Fase:** F4 · **Owner:** Ricardo decide; aplicação editorial implementa · **Estado:** IN_PROGRESS — H-EDITORIAL registrada; autorização, fila, API e SPEC alinhadas; primeira crítica sem P0/P1; distinção `APPROVE_CLINICAL_CONTENT`/`MODERATE_CONTENT` documentada; segunda revisão fresh pendente.
- **Origem → SPEC:** RF-034/035/036, RN-043/044 → S0106 §9/S0111; A04/AUD-0917-A04.
- **O que / onde / como:** reconciliar guard em `packages/application/src/authoring-use-cases.ts` com PRD/SPEC; permitir revisor clínico distinto ativo e no escopo; restringir autorrevisão à identidade configurada no servidor e manter publicação separada.
- **Dependência:** SOA-01; decisão escrita H-EDITORIAL recebida; H-CONTENT antes de qualquer publicação.
- **Teste/RED:** identidade própria sem configuração/divergente é negada; revisor distinto autorizado passa; ator sem role/escopo é negado; publicação segue exigindo a identidade configurada e preflight completo.
- **Pronto:** decisão e contratos alinhados, matriz testada, audit trail/versionamento; não impor ou remover four-eyes por conta própria.
- **Rollback:** reverter alteração de regra, bloquear publicação afetada e preservar decisões/versões auditadas.

### SOA-21 — Feedback, recursos e operação administrativa

- **Baseline:** 75/100 · **Fase:** F3 · **Owner:** Aplicação administrativa · **Estado:** READY_FOR_NEXT_STEP; execução pendente.
- **Origem → SPEC:** RF-060–065/100–107, RNF-036/054/072 → S0106 §§9.1/9.2 e feedback, S0111.
- **O que / onde / como:** rastrear filas/decisões de contestação e feedback em API/aplicação/persistência; investigar contrato de recálculo/notificação além de manter resultado, sem ampliar projeção state-only.
- **Dependência:** SOA-11/14/15/25; contrato interno posterior de recálculo deve ser localizado/aprovado.
- **Teste/RED:** anulação deve recalcular afetados uma vez preservando nota anterior; recurso de outro dono não aparece; feedback não altera decisão educacional.
- **Pronto:** fluxos de manutenção/anulação/correção conforme contrato, resultado versionado, afetados e entrega rastreáveis; pendência não mascarada por fila existente.
- **Rollback:** suspender job novo e aplicar revisão compensatória versionada; nunca apagar justificativa ou histórico.

### SOA-22 — Web funcional

- **Baseline:** 65/100 · **Fase:** F5 · **Owner:** Frontend · **Estado:** READY_FOR_NEXT_STEP; execução pendente.
- **Origem → SPEC:** RF-028/070/074/100, RNF-005/071 → S0114/B0561/62.
- **O que / onde / como:** validar participante, diagnóstico, autoria, operações e recuperação em `apps/web/app`; ligar ações autorizadas, loading/empty/error/retry e retomada a dados reais de teste.
- **Dependência:** SOA-16/21/23; SOA-20 só para comportamento editorial aprovado; SOA-32 live.
- **Teste/RED:** reload durante tentativa conserva resposta; API indisponível anuncia erro e retry; shell interno não aparece antes da autorização.
- **Pronto:** cinco superfícies exercitadas no browser atual por papel e falha, build web e regressão E2E reais registrados.
- **Rollback:** reverter página/fluxo da fatia preservando API/estado; não trocar falha por mock silencioso.

### SOA-23 — Manutenibilidade frontend/UI compartilhada

- **Baseline:** 40/100 · **Fase:** F5 · **Owner:** Frontend/UI · **Estado:** READY_FOR_NEXT_STEP; execução pendente.
- **Origem → SPEC:** RNF-006/044 → S0114/S0103; AAA-400.
- **O que / onde / como:** identificar repetição e ownership de estado nas páginas grandes de `apps/web/app`; extrair componentes úteis em `packages/ui`, mantendo server/client boundaries e contratos.
- **Dependência:** SOA-09/30; baseline visual/funcional antes da extração.
- **Teste/RED:** fixture de formulário/erro/foco compartilhado revela divergência atual entre páginas; teste de interação fixa comportamento antes de refatorar.
- **Pronto:** componentes usados por consumidores reais, lógica de domínio fora da UI, cobertura TSX e regressão sem mudança funcional incidental; não extrair só para reduzir linhas.
- **Rollback:** reverter extração com suas importações, preservando comportamento anterior e estilos aprovados.

### SOA-24 — Acessibilidade

- **Baseline:** 55/100 · **Fase:** F5 · **Owner:** QA acessibilidade + frontend · **Estado:** READY_FOR_NEXT_STEP; execução pendente.
- **Origem → SPEC:** RNF-006/042, RF-026 → S0114.
- **O que / onde / como:** auditar cinco superfícies `apps/web` e `tests/e2e`; axe, teclado, foco, leitores, zoom nativo/reflow, contraste e mensagens, com acomodações sem reduzir objetivo.
- **Dependência:** SOA-22/23; disponibilidade de revisor assistivo para prova manual.
- **Teste/RED:** erro sem anúncio, foco perdido após retry e controle inacessível ao teclado devem reprovar; viewport estreito não substitui zoom nativo.
- **Pronto:** matriz WCAG2.2AA com evidências atuais automáticas/manuais e limitações; zero achado crítico aberto, revisão independente.
- **Rollback:** reverter componente regressivo; manter semântica/foco seguros anteriores e registrar limitação residual.

### SOA-25 — Worker/outbox

- **Baseline:** 75/100 · **Fase:** F3 · **Owner:** Worker/backend · **Estado:** READY_FOR_NEXT_STEP; execução pendente.
- **Origem → SPEC:** RNF-013/017, RF-049/063 → S0108/S0110; A02.
- **O que / onde / como:** mapear `apps/worker/src/handlers.ts` e outbox a efeitos exigidos; classificar no-op intencional vs efeito faltante pelo contrato, sem inventar consumidores.
- **Dependência:** SOA-12/14; contrato do evento educacional a investigar antes de wiring.
- **Teste/RED:** replay/lease vencido não duplica efeito; evento com efeito obrigatório não pode ser ack sem resultado persistido; no-op permitido permanece explícito.
- **Pronto:** efeitos/ack/retry/dead-letter/fencing demonstrados em DB descartável com falhas injetadas locais e rastreabilidade por evento.
- **Rollback:** pausar consumidor novo, manter eventos e reprocessar idempotentemente após correção; nunca apagar outbox para parecer verde.

### SOA-26 — Qdrant

- **Baseline:** 65/100 · **Fase:** F6 · **Owner:** Integrações · **Estado:** READY_FOR_NEXT_STEP; execução pendente.
- **Origem → SPEC:** RF-038, RNF-085 → S0112/S0106 ReconcileKnowledgeIndex; AAA-701.
- **O que / onde / como:** provar adaptador e reconciliação em `packages/integrations`/worker; reidratar pelo PostgreSQL, comparar versão/hash/escopo e reconstruir índice de fixtures autorizadas.
- **Dependência:** SOA-11/25/35; H-LIVE para instância descartável; não bloqueia núcleo.
- **Teste/RED:** ponto ausente/obsoleto e serviço desligado não alteram estado transacional nem expõem resultado fora do escopo.
- **Pronto:** reconciliação/replay/rebuild live e modo desligado testados; índice nunca decide publicação/nota/autorização.
- **Rollback:** desligar busca e reconstruir coleção descartável a partir da fonte; não usar Qdrant para restaurar estado de domínio.

### SOA-27 — IA assistiva

- **Baseline:** 55/100 · **Fase:** F6 · **Owner:** Integrações/segurança; Ricardo autoriza fornecedor · **Estado:** READY_FOR_NEXT_STEP; execução pendente.
- **Origem → SPEC:** RF-038, RNF-035/085/086 → S0112/S0106 GenerateAuthoringSuggestion; AAA-700/702.
- **O que / onde / como:** validar adapter em `packages/integrations/src/ai.ts`, composição e job; separar contratos/evals locais da integração de provider real, desligável e com custo limitado.
- **Dependência:** SOA-11/25/35; aprovação específica para provider/gasto real, ausente nesta rodada.
- **Teste/RED:** saída fora do schema, timeout e sugestão de alterar nota/publicar são rejeitados ou viram falha assistiva segura; IA desligada mantém núcleo.
- **Pronto:** evals sintéticos/redaction/retry/cancelamento aprovados; provider real só comprovado após autorização e artefato próprio, não por fake.
- **Rollback:** desabilitar provider/job e manter fluxo humano; preservar auditoria técnica sem prompt sensível.

### SOA-28 — Rate limiting distribuído

- **Baseline:** 70/100 · **Fase:** F6 · **Owner:** API/infra local · **Estado:** READY_FOR_NEXT_STEP; execução pendente.
- **Origem → SPEC:** RNF-037/039 → S0111/S0112/S0113; A05.
- **O que / onde / como:** verificar `apps/api/src/main.ts`, configuração de trusted proxies e stores PostgreSQL/Redis; conectar configuração validada e política de falha por classe de risco, sem confiar em headers arbitrários.
- **Dependência:** SOA-04/09/11; H-LIVE para prova distribuída.
- **Teste/RED:** duas instâncias locais devem compartilhar limite; header de proxy não confiável não redefine identidade; indisponibilidade segue política documentada.
- **Pronto:** composição/config e contadores multi-instância/restart comprovados; fallbacks declarados, sem mudança silenciosa de backend.
- **Rollback:** retornar store/config validada anterior ou negar operação sensível; não remover limite para restabelecer verde.

## Qualidade e operação comprovadas

### SOA-29 — Suíte unitária/contratos/aplicação

- **Baseline:** 85/100 · **Fase:** F2 · **Owner:** QA/Lead · **Estado:** READY_FOR_NEXT_STEP; execução pendente.
- **Origem → SPEC:** AGENTS TDD, RNF-017 → S0118; auditoria §verificações.
- **O que / onde / como:** reexecutar suíte em Node22/pnpm fixado; inventariar testes/skips e corrigir assertion assíncrona não aguardada em `apps/api/src/http-boundary/curriculum.http.test.ts` se confirmada.
- **Dependência:** SOA-02/06; runtime canônico disponível sem instalar bibliotecas.
- **Teste/RED:** falha assíncrona deliberada em fixture do teste deve falhar a suíte, não passar depois de encerrar; erro/skip obrigatório não vira sucesso.
- **Pronto:** resultados atuais com versões/exits, inventário e justificativa dos skips; nenhuma regressão ignorada.
- **Rollback:** reverter somente correção problemática; conservar teste que demonstra falha e manter gate aberto.

### SOA-30 — Abrangência da cobertura

- **Baseline:** 60/100 · **Fase:** F2 · **Owner:** QA/Frontend · **Estado:** READY_FOR_NEXT_STEP; execução pendente.
- **Origem → SPEC:** AGENTS cobertura → S0118; A06; barra SOA-QB-v1 (piso adicional, não falsa citação ao PRD).
- **O que / onde / como:** revisar `vitest.config.ts`, relatórios e verificador; incluir páginas TSX e arquivos de produção não importados; inventariar exclusões por motivo e separar harness.
- **Dependência:** SOA-29/33; SOA-23 ajuda cobertura frontend posteriormente.
- **Teste/RED:** arquivo TSX de produção não exercitado deve entrar no denominador; branch abaixo85% não passa por arredondamento ou exclusão.
- **Pronto:** statements90/branches85/functions90/lines90 com contagens/manifesto reproduzíveis e decisões críticas completas; remedir no candidato final.
- **Rollback:** preservar manifestos anteriores como históricos; reverter configuração incorreta sem proclamar piso atingido.

### SOA-31 — Validade da assurance de mutação

- **Baseline:** 25/100 · **Fase:** F2 · **Owner:** QA harness + revisor independente · **Estado:** READY_FOR_NEXT_STEP; execução pendente.
- **Origem → SPEC:** AGENTS testes de invariantes → S0118; A01/AUD-0917-A01; barra SOA-QB-v1.
- **O que / onde / como:** revisar `scripts/verify-mutation-closure.mjs`, demais harness e classificações; validar baseline, identidade individual e origem de falha; não tratar troca de label como equivalência por fall-through sem prova semântica.
- **Dependência:** SOA-29; nenhum uso de 98,84% como comprovado antes do aceite do harness.
- **Teste/RED:** processo indisponível/timeout/compilação quebrada não conta kill; mutante semanticamente diferente não conta equivalente; mutantes na mesma linha não se confundem.
- **Pronto:** self-tests/reconciliação individual/revisão independente validam medidor; depois mutação válida≥95% no escopo crítico congelado, bruto/ajustado publicados e inválidos explicitados.
- **Rollback:** suspender certificado/taxa ajustada e restaurar harness anterior rotulado não confiável, mantendo artefatos da investigação.

### SOA-32 — E2E com dependências reais

- **Baseline:** 50/100 · **Fase:** F2 (execução final após F3) · **Owner:** QA integração · **Estado:** READY_FOR_NEXT_STEP; execução pendente.
- **Origem → SPEC:** RNF-010/013/017/039 → S0118/S0109/B0561; A06/AAA-202/RF-09.
- **O que / onde / como:** revisar `playwright.config.ts`, `tests/e2e/real-runtime.spec.ts` e harness existentes; projeto explícito contra browser/web/API/DB descartável, migrations e roles separadas, sem fallback mock.
- **Dependência:** SOA-29 para harness; H-LIVE e SOA-13/16/17/21/25 para prova completa.
- **Teste/RED:** seleção deve incluir real-runtime; DB ausente ou mock no caminho obrigatório não pode produzir PASS; falha entre resposta e commit é observada.
- **Pronto:** marco1 seleção/config negativa provada; marco2 jornada ponta a ponta com fixtures, oracle separado, migrations, logs redigidos e cleanup; task só termina com ambos.
- **Rollback:** desligar projeto live novo se perigoso, preservar relatório de falha e não renomear sintético como real.

### SOA-33 — Gates arquiteturais e de qualidade

- **Baseline:** 55/100 · **Fase:** F2 · **Owner:** Tooling/QA · **Estado:** READY_FOR_NEXT_STEP; execução pendente.
- **Origem → SPEC:** AGENTS camadas/qualidade → S0103/S0118; A06.
- **O que / onde / como:** verificar `scripts/verify-cycles.mjs`, dead-code/complexity/routes e resolução de imports .js→.ts; definir alcance por inventário, sem afirmar análise total onde há heurística.
- **Dependência:** SOA-03/29.
- **Teste/RED:** fixtures com ciclo via import .js apontando fonte .ts e export morto conhecido devem ser detectadas; controle acíclico/liveness válido passa.
- **Pronto:** positivos/negativos demonstram cada gate, cobertura do grafo e limitações públicas; nenhum waiver silencioso para passar build.
- **Rollback:** reverter detector defeituoso, manter limitação e bloqueio correspondentes explícitos, não esconder fixture vermelha.

### SOA-34 — Dependências e secrets

- **Baseline:** 80/100 · **Fase:** F7 (transversal) · **Owner:** Segurança supply-chain · **Estado:** READY_FOR_NEXT_STEP; execução pendente.
- **Origem → SPEC:** AGENTS versões/secrets, RNF-032/085 → S0111/S0118.
- **O que / onde / como:** renovar audit do lockfile, pins/patches/SBOM e scanner local em candidato; revisar alcance e advisories sem assumir ausência de falhas pela ausência de alertas.
- **Dependência:** SOA-29/33; repetir depois de qualquer dependência alterada.
- **Teste/RED:** fixture de segredo fictício padronizado e metadata de dependência inconsistente reprovam self-test sem introduzir credenciais reais.
- **Pronto:** audit/secrets/SBOM atuais, exceções com prazo/owner quando aceitas, zero P0/P1; não instalar bibliotecas nesta fatia documental.
- **Rollback:** reverter upgrade/patch próprio se incompatível, registrar risco e impedir promoção; não expor tokens para diagnóstico.

### SOA-35 — Observabilidade, health e tracing

- **Baseline:** 70/100 · **Fase:** F6 · **Owner:** Observabilidade/operações · **Estado:** READY_FOR_NEXT_STEP; execução pendente.
- **Origem → SPEC:** RNF-014/016 → S0113; AAA-600.
- **O que / onde / como:** verificar `packages/observability`, API/worker e collector descartável; correlation atravessa operações críticas sem payload proibido; distinguir readiness de saúde agregada.
- **Dependência:** SOA-08/25; H-LIVE.
- **Teste/RED:** salvamento/correção sem sinal correspondente é detectado; queda de Qdrant mantém readiness PostgreSQL-only e saúde degradada conforme contrato; segredo sintético é redigido.
- **Pronto:** collector recebe sinais atuais de login/save/submit/correction/jobs, redaction provada e alertas rastreáveis; sem claim por instrumentação não exportada.
- **Rollback:** desligar exporter regressivo mantendo logs técnicos seguros e núcleo; nunca ocultar estado degradado.

### SOA-36 — SLOs e deadlines conectados

- **Baseline:** 45/100 · **Fase:** F6 · **Owner:** Observabilidade/backend; Ricardo metas · **Estado:** READY_FOR_NEXT_STEP; execução pendente.
- **Origem → SPEC:** RNF-001/004/014 → S0113; A05/AAA-601.
- **O que / onde / como:** rastrear p95 em `packages/observability/src/operations.ts` e deadline em `apps/api/src/http/request-context.ts`; propagar budget/cancelamento conforme contrato existente, a investigar no handler/adapters.
- **Dependência:** SOA-35; H-OPS para metas/aceite operacional, não para representar NO_DATA honestamente.
- **Teste/RED:** sem amostras retorna NO_DATA, não zero/saudável; amostras conhecidas alimentam p95; operação excedendo budget cancela efeitos não confirmados.
- **Pronto:** população/janela/unidade do SLO explícitas, latência realmente coletada e deadline observado ponta a ponta; thresholds aprovados, sem inventar meta.
- **Rollback:** reverter propagação incorreta e marcar SLO não comprovado; preservar transação confirmada mesmo após timeout do cliente.

### SOA-37 — Backup, restore, carga e drills

- **Baseline:** 55/100 · **Fase:** F6 · **Owner:** Operações/QA live · **Estado:** READY_FOR_NEXT_STEP; execução pendente.
- **Origem → SPEC:** RNF-003/015/017 → S0110/S0113; AAA-604/605/606.
- **O que / onde / como:** ensaiar scripts/runbooks existentes com backup sintético, DB descartável e carga bounded; verificar ordem restore/migrations, integridade pós-restauração e rollback.
- **Dependência:** SOA-05/12/13/35/36; H-LIVE/H-OPS; sem ambiente produtivo.
- **Teste/RED:** backup incompatível/corrompido ou migration fora de ordem interrompe restore; concorrência não perde resposta; falha durante drill mantém evidência e aborta.
- **Pronto:** RPO/RTO medidos contra RNF-015 (≤1h/≤4h), capacidade/limites e procedimentos reconciliados, donos e cleanup; nenhuma extrapolação de laboratório para produção.
- **Rollback:** descartar somente alvos de ensaio identificados; restaurar snapshot de teste validado e parar carga imediatamente.

### SOA-38 — CI configurado

- **Baseline:** 70/100 · **Fase:** F7 · **Owner:** Release engineering · **Estado:** READY_FOR_NEXT_STEP; execução pendente.
- **Origem → SPEC:** AGENTS gates → S0118/S0116; AAA-603/RF-02/RF-09.
- **O que / onde / como:** revisar `.github/workflows` quality/security/candidate, contrato CI e seleção E2E; garantir Node22, lockfile, artefatos de falha e gates de medição verificados.
- **Dependência:** SOA-29–34; H-REMOTE para executar remotamente, sem push/dispatch autorizado agora.
- **Teste/RED:** job omitindo E2E real, versão Node errada ou upload sem falhas não satisfaz contrato; não contar YAML presente como run aprovado.
- **Pronto:** checks locais do contrato e runs autorizados com logs/artefatos na revisão candidata; remoto ausente mantém comprovação pendente.
- **Rollback:** reverter workflow da fatia sem desabilitar gates; preservar logs de runs vermelhos.

### SOA-39 — Proveniência e same-SHA

- **Baseline:** 35/100 · **Fase:** F7 · **Owner:** Release/QA evidência · **Estado:** READY_FOR_NEXT_STEP; execução pendente.
- **Origem → SPEC:** AGENTS rastreabilidade → S0118; A07/AAA-003/RF-02.
- **O que / onde / como:** reconciliar `release-evidence`, manifestos e verificadores com SHA/dirty tree/digests; inventário imutável do candidato após checks e antes de revisão, sem reutilizar bundle antigo.
- **Dependência:** SOA-07/30/31/32/34/38; H-REMOTE para provas remotas.
- **Teste/RED:** SHA divergente, artefato alterado ou ausência de run autorizado reprova; sentinel antes/depois divergente invalida review independentemente de resultado narrativo.
- **Pronto:** cadeia comando→resultado→artefato→hash→candidato→revisor verificável; checks terminam antes do sentinel, review read-only, sentinel final sequencial estável; remoto UNKNOWN nunca PASS.
- **Rollback:** retirar declaração de candidato/certificação, preservar pacote inválido para análise e gerar novo somente após estabilização.

### SOA-40 — Prontidão para produção

- **Baseline:** 25/100 · **Fase:** F7 · **Owner:** Ricardo/Lead + auditor independente · **Estado:** WAITING_HUMAN_APPROVAL (AAA-001/H-PROD); execução pendente.
- **Origem → SPEC:** RNF-015/039/050/080, RN-079 → S0113/S0118; masters BUILD G4–G6.
- **O que / onde / como:** consolidar matriz de prontidão em `docs/audits`/operações e pacote de evidência; distinguir técnico local, live descartável, candidato remoto, conteúdo aprovado e autorização operacional.
- **Dependência:** aceites aplicáveis SOA-01–39, SOA-QB-v1, H-EDITORIAL/H-CONTENT no conteúdo publicado, H-OPS/H-REMOTE/H-PROD. B-07/calibração não são bloqueio genérico do núcleo.
- **Teste/RED:** verificador deve recusar prontidão com P0/P1, mutação inválida, cobertura fora do denominador, skip real-runtime, evidência stale ou aprovação ausente.
- **Pronto:** parecer independente no candidato estável e matriz completa com gaps/residuais/autoridades; sem autorização e prova operacional, resultado é prontidão limitada/não certificado. Deploy real exige nova autorização, não está contido na task documental.
- **Rollback:** suspender promoção e invalidar claim incorreto; usar procedimento aprovado somente em ambiente autorizado; nunca confundir certificação de software com competência clínica.

## Handoff dos 40 itens

Mapa dos achados prioritários: A01→SOA-31; A02→SOA-14/15/16/17/25; A03→SOA-18/19; A04→SOA-01/20; A05→SOA-28/35/36; A06→SOA-29/30/32/33; A07→SOA-02/06/07/39. Os demais itens preservam dimensões completas da auditoria, não apenas A01–A07.

Lead deve registrar primeira seleção e próximos RED, vincular aliases exatos AAA/AUD após inspeção e manter perguntas H-* do plano abertas até resposta objetiva. Este backlog contém 40 tasks pendentes; não é evidência de implementação, review independente ou certificação concluídos.

## Continuidade de remediação — 2026-10-02

O estado corrente de AUDIT-REM-01–05 e 07A está em
[docs/59](59_backlog_repository_remediation_2026-10-01.md), com a verificação
focal em `.agent/artifacts/remediation/remediation-verification-20261002.md`.
As correções de medição/harness passaram nos focais sob Node 22.23.2; o
denominador TSX agora mantém floors globais vermelhos até a cobertura subir.
Nenhum scorecard, mutação histórica ou execução remota foi promovido. AAA-001,
H-REMOTE e H-CONTENT continuam gates independentes.
