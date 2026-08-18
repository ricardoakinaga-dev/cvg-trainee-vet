# Auditoria independente de qualidade do código construído — 2026-08-16

> **Baseline congelada:** este relatório preserva o corte e a nota `64,20/100`;
> melhorias posteriores não alteram retroativamente suas 16 notas. A avaliação
> corrente pós-hardening está em
> `docs/133_dual_98_post_hardening_assessment_2026-08-16.md`, coordenada por
> `BRIEFING/03.BUILD/0308_dual_98_executive_program.md`; Dual 95 permanece
> histórico.

## 1. Resultado executivo

**Nota consolidada independente: 64,20/100.**

- recorte de documentação, aderência e qualidade interna do código: **70,62/100**;
- recorte de runtime, operação, release e proveniência: **43,88/100**;
- classificação do runtime local: **PASS_WITH_GAPS** para disponibilidade imediata e checks locais;
- classificação de segurança, operação e release: **FAIL** enquanto os achados P1 permanecerem abertos;
- disposição: **PILOT_BLOCKED** e **não aprovado para produção**;
- P0 identificado: **nenhum**;
- achados P1: existem em proveniência, autorização clínica, revogação de privilégios, request lifecycle, E2E canônico, readiness, alertas, canário, credenciais locais, telemetria e fluxos web.

A base possui engenharia acima da média em tipagem, imutabilidade, validação, limites arquiteturais, testes de backend e controles defensivos. A nota cai porque alguns gates verdes medem estrutura ou igualdade interna, mas não provam a propriedade declarada. O caso mais grave é a proveniência: o runtime declara um SHA de 40 caracteres que não existe no repositório, e o verificador atual ainda assim retorna `PASS` quando recebe esse mesmo valor.

Esta é uma avaliação independente de qualidade e evidência atual. Ela **não substitui nem altera automaticamente** a baseline histórica de maturidade integral `83,24/100` registrada no AUD-0491.

## 2. Escopo congelado

| Campo | Valor auditado |
|---|---|
| Data/hora de corte | `2026-08-16T00:53:39-03:00` |
| Branch | `agent/publish-production-hardening` |
| HEAD documental/código | `1579442fa3dcf9a32bf5e7e1ce73977f2d8a60cd` |
| Estado inicial do worktree | limpo |
| Divergência remota | 93 commits à frente da branch remota correspondente; PR #1 no head antigo `d3964a9e45b624a4e3c3967ca8f684cb00210e8c` |
| Documentação em `docs/` | 19 arquivos, 13.757 linhas |
| Documentação complementar | gates Discovery/PRD/SPEC, BUILD, AUDIT, manifesto e matrizes de governança |
| Workspaces | 12 |
| Código de produção inventariado | 50.427 linhas, incluindo web e scripts operacionais |
| Runtime observado | web, edge, PostgreSQL, Qdrant, API A/B, worker A/B, OTel, Tempo, Prometheus e Grafana locais ativos |
| Fonte declarada pelo runtime | `8859c6c1ae1f11ff9a0ae55f79027469aaf21ee6` — **objeto Git inexistente** |
| Commit real com prefixo `8859c6c` | `8859c6c5cc2409441689ed1cdd00c0a15e77e05a` |

Foram lidos o estado, o log, o backlog, os relatórios 100–115, o registro canônico e os documentos vigentes de Discovery, PRD, SPEC, BUILD e AUDIT. A inspeção do código cobriu arquitetura, contratos, aplicação, persistência, API, worker, web, testes, CI, containers, observabilidade, deploy, backup e rastreabilidade.

## 3. Rubrica e cálculo

- `90–100`: evidência atual, reproduzível e adequada a release;
- `80–89`: forte, com gaps delimitados;
- `70–79`: funcional, mas com dívida ou evidência materialmente incompleta;
- `50–69`: frágil, com risco relevante ou cobertura parcial;
- `0–49`: falha de controle, caminho quebrado ou evidência insuficiente.

O status não deriva apenas da média. Um P1 pode tornar o item `FAIL` mesmo quando controles adjacentes elevam sua nota. A nota global é `Σ(peso × nota) / 100`.

## 4. Matriz principal de notas

| # | Item analisado | Peso | Nota | Contribuição | Estado | Fundamentação resumida |
|---:|---|---:|---:|---:|---|---|
| 1 | Documentação e governança | 3% | **78** | 2,34 | PARTIAL | Ampla e honesta sobre gates, mas com snapshots conflitantes, supersessão ambígua e pesos incorretos no plano 0305. |
| 2 | Aderência ao PRD | 3% | **75** | 2,25 | PARTIAL | Escopo e regras principais existem; jornadas humanas, métricas e aceite produtivo seguem incompletos. |
| 3 | Aderência à SPEC | 4% | **85** | 3,40 | PASS_WITH_GAPS | Arquitetura, contratos e dados aderentes; operação, release e rastreabilidade não fecham a SPEC. |
| 4 | Arquitetura e boundaries | 7% | **84** | 5,88 | PASS_WITH_GAPS | Grafo acíclico e gate 2/2; routers, composition roots e componentes concentram responsabilidades. |
| 5 | Manutenibilidade, coesão e complexidade | 9% | **52** | 4,68 | PARTIAL | Oito arquivos acima de 800 linhas, 149 funções acima de 50 e gate de hotspots apenas informativo. |
| 6 | Type safety, imutabilidade e legibilidade | 7% | **84** | 5,88 | PASS_WITH_GAPS | TypeScript estrito, zero `any` explícito e forte uso readonly; casts duplos e contratos web duplicados reduzem a garantia. |
| 7 | API, contratos e validação de entrada | 6% | **86** | 5,16 | PASS_WITH_GAPS | Zod, body limit, envelopes e RBAC server-side fortes; três fontes de verdade de rotas e dispatcher monolítico. |
| 8 | Tratamento de erros e resiliência da aplicação | 6% | **48** | 2,88 | FAIL | Rejeição do rate limiter pode pendurar a requisição e gerar `unhandledRejection`; causas inesperadas são pouco diagnosticadas. |
| 9 | Persistência e integridade de dados | 6% | **70** | 4,20 | PARTIAL | PostgreSQL, transações, migrations e RLS são fortes; append de auditoria pode perder contexto RLS e há 22 double assertions de transação. |
| 10 | Segurança, privacidade e controle de acesso | 10% | **68** | 6,80 | FAIL | Bons controles de cookie, CSRF, validação e SQL; identidade clínica fail-open, privilégio em sessão fica obsoleto e infraestrutura local expõe riscos P1. |
| 11 | Frontend, UX, acessibilidade e performance | 6% | **65** | 3,90 | PARTIAL | Fluxos funcionais e bons Vitals locais; falta logout, há estados parciais, contraste insuficiente, somente Chromium e componentes cliente gigantes. |
| 12 | Testes, cobertura e E2E | 9% | **70** | 6,30 | PARTIAL | 720 testes passam e thresholds agregados superam 80%; 27,4% das linhas inventariadas ficam fora da cobertura, E2E canônico quebra e 0/87 provas de risco estão completas. |
| 13 | Runtime e HA | 5% | **46** | 2,30 | FAIL | Processos locais redundantes e health 200; edge usa liveness, componentes centrais são single-host/singleton e a proveniência é inválida. |
| 14 | Observabilidade, backup e DR | 5% | **40** | 2,00 | FAIL | Stack local ativa; zero regras de alerta carregadas, workers invisíveis, sem Alertmanager, backup externo, PITR, soak ou DR. |
| 15 | CI, reprodutibilidade e release | 7% | **47** | 3,29 | FAIL | Build local e lockfile passam; CI remoto vermelho, E2E padrão quebra, canário não isola versão e não existe CD produtivo. |
| 16 | Rastreabilidade e proveniência | 7% | **42** | 2,94 | FAIL | 145/145 linhas têm evidência local, mas 0/145 cadeias completas; quatro links quebrados e SHA inexistente aceito como válido. |
|  | **Total** | **100%** | **64,20** | **64,20** | **PILOT_BLOCKED** | A qualidade interna é utilizável; as garantias de segurança, operação e release ainda não são confiáveis. |

## 5. Notas detalhadas por trilha

### 5.1 Arquitetura e qualidade de código

| Subitem | Nota |
|---|---:|
| Arquitetura e camadas | 84 |
| Coesão e acoplamento | 57 |
| Imutabilidade | 94 |
| Naming e legibilidade | 82 |
| Complexidade e hotspots | 40 |
| Error handling e observabilidade no código | 52 |
| Validação | 90 |
| Type safety | 76 |
| Duplicação/DRY | 54 |
| Configuração de build, lint e testes | 66 |
| Manutenibilidade | 63 |

### 5.2 Segurança

| Subitem | Nota |
|---|---:|
| Autenticação e sessões | 68 |
| Autorização, RBAC e isolamento | 45 |
| Validação e injeção | 94 |
| XSS, CSRF, CORS e headers | 86 |
| Rate limiting e abuso | 55 |
| Segredos, logs e integridade de auditoria | 45 |
| Dependências e supply chain | 84 |
| Containers e infraestrutura | 42 |
| Dados sensíveis e privacidade | 86 |
| Testes e assurance de segurança | 72 |
| **Segurança global** | **68** |

### 5.3 Testes e runtime

| Subitem | Nota |
|---|---:|
| Build | 96 |
| Tipos | 100 |
| Lint | 100 |
| Testes | 82 |
| Cobertura | 78 |
| E2E canônico | 55 |
| Evidência de runtime | 72 |

### 5.4 Frontend e experiência

| Subitem | Nota |
|---|---:|
| Consistência UX | 70 |
| Acessibilidade | 64 |
| Arquitetura frontend | 55 |
| Prontidão de performance | 72 |
| E2E de fluxos críticos | 66 |

### 5.5 Operação

| Subitem | Nota |
|---|---:|
| Observabilidade | 42 |
| Confiabilidade/HA | 46 |
| Reprodutibilidade CI/CD | 52 |
| Backup/DR | 30 |
| Deploy/rollback | 35 |
| Prontidão de integrações | 50 |

### 5.6 Documentação e aderência

| Subitem | Nota |
|---|---:|
| Qualidade documental | 78 |
| Rastreabilidade | 62 |
| Aderência ao PRD | 75 |
| Aderência à SPEC | 85 |

As subnotas acima são diagnósticos de cada trilha e não devem ser novamente promediadas. A matriz principal aplica os pesos declarados e penaliza controles P1 que atravessam mais de uma trilha, como proveniência, autorização e request lifecycle.

## 6. Evidência executada

| Verificação | Resultado observado |
|---|---|
| `pnpm verify` | PASS em 130,25 s; 163 arquivos aprovados, 16 condicionais; 720 testes aprovados, 18 condicionais; contratos 81/81; worker 24/24 |
| Cobertura do `pnpm verify` | statements 83,78%; branches 80,41%; functions 84,95%; lines 84,55% |
| `CVG_API_INTERNAL_URL=http://127.0.0.1:3000 pnpm build` | PASS em 29,07 s; 12 workspaces participantes construídos |
| `pnpm test:e2e` | **FAIL** em 4,56 s, antes do Playwright: `CVG_API_INTERNAL_URL is required for production web builds` |
| Diagnóstico direto dos sete specs web sintéticos | PASS, 25/25 em Chromium |
| Testes focais de segurança | PASS, 9 arquivos/60 testes |
| `pnpm audit --prod --audit-level high` | PASS; nenhuma vulnerabilidade conhecida |
| Gate de arquitetura | PASS, 2/2 |
| Gate de hotspots | `PASS_WITH_PLANNED_HOTSPOTS`; oito arquivos de produção acima de 800 linhas |
| Matriz de risco P0/P1 | `PASS_WITH_GAPS`; 87 requisitos, sucesso 87, erro 0, negado 26, conflito 36, linhas completas 0 |
| Governança de skips | `PASS_WITH_GAPS`; 18 skips explicados, apenas 3/20 execuções qualificantes |
| Evidência de testes | `PASS_WITH_GAPS`; 3 registros sintéticos, 0 completos |
| Rastreabilidade premium | `PASS_WITH_GAPS`; 145/145 evidências locais, 87/87 P0/P1, 0/145 cadeias completas |
| Runtime local | web e health live/ready/dependencies em HTTP 200; API A/B e worker A/B `healthy`, zero restarts |
| Prometheus | targets API A/B e collector `up`; **zero grupos de regras carregados**; nenhuma série de worker observada |
| Proveniência com SHA documentado | o gate retorna PASS, mas `git cat-file -e <sha>^{commit}` retorna 128 |
| Proveniência com SHA Git real | o gate retorna FAIL porque labels/env do runtime carregam o SHA inexistente |
| CI remoto | **FAIL** nos runs 31402470511 e 31402464508; ausência das três fontes licenciadas no checkout remoto |
| `git diff --check` antes do registro | PASS; worktree inicialmente limpo |

## 7. Achados prioritários

### P1-01 — A proveniência do runtime é um falso positivo

O SHA documentado e carregado nos quatro containers, `8859c6c1ae1f11ff9a0ae55f79027469aaf21ee6`, não é um objeto Git deste repositório não-shallow. O commit real iniciado por `8859c6c` é `8859c6c5cc2409441689ed1cdd00c0a15e77e05a`. `scripts/verify-runtime-provenance.mjs` valida formato e igualdade entre valor esperado, label OCI e env, mas não existência/alcançabilidade do commit. Por isso, documentação, labels e gate concordam entre si sobre um identificador inexistente.

Impacto: a imagem saudável não pode ser ligada reproduzivelmente ao código auditado, invalidando a afirmação de RC imutável e parte das evidências 139–145.

### P1-02 — A identidade do aprovador clínico é fail-open

`CLINICAL_APPROVER_ID` é opcional inclusive em produção. Na ausência do valor, a API e o use case promovem o próprio caller a identidade aprovada. Assim, qualquer principal ativo com papel `CLINICAL_APPROVER` e escopo compatível pode produzir a decisão final consumida pelo gate de publicação.

Impacto: o controle de aprovador designado/independente declarado na política clínica não é garantido pelo código.

### P1-03 — Remoção de papel ou escopo não invalida sessões existentes

A sessão persiste o snapshot de roles/scopes e a autenticação posterior recarrega apenas o status atual da conta. A atualização administrativa revoga sessões quando a conta deixa de ser ativa, mas não quando roles/scopes mudam. Uma autorização removida pode continuar efetiva até expiração ou revogação manual.

### P1-04 — Falha assíncrona do rate limiter pode pendurar requisições

O listener HTTP assíncrono não envolve todo o ciclo em `try/catch`. Uma rejeição controlada de `rateLimiter.check`, que em produção depende de PostgreSQL, produziu `unhandledRejection` e cliente abortado sem resposta. O dispatcher também converte falhas inesperadas em `internal_error` sem registrar causa sanitizada; worker e startup descartam erros relevantes.

### P1-05 — O comando E2E usado por desenvolvedores e CI está quebrado

`pnpm test:e2e` falha no build porque o wrapper não fornece `CVG_API_INTERNAL_URL` no modo padrão. O workflow chama o mesmo comando. O gate de contrato CI passa porque verifica texto/configuração, não executa esse caminho. Os 25 cenários sintéticos passam quando executados diretamente, mas isso não corrige o entrypoint canônico.

### P1-06 — Health e edge usam liveness onde precisam de readiness

O container e o Caddy verificam `/health/live`; PostgreSQL só é testado em `/health/ready`. Uma API viva e sem banco pode permanecer `healthy` e continuar recebendo tráfego.

### P1-07 — Alertas versionados não estão ativos

Existem regras em `prometheus-alerts.yml`, mas o Prometheus não configura `rule_files`; a API live retornou zero grupos. Não há Alertmanager/roteamento, workers não são coletados e o dashboard consulta um nome de métrica divergente do exportado.

### P1-08 — O canário pode ser aprovado pela réplica antiga

O deploy sobe `api-a`, mas sonda a URL do Caddy, que também pode responder por `api-b`. A primeira resposta 2xx encerra o gate e `canarySeconds` atua como timeout, não como janela sustentada. O `canaryService` validado no manifesto não é usado no probe.

### P1-09 — Exposição e permissão local de segredos/telemetria

Arquivos locais consumidos pelo perfil de produção estavam em modo `0664`; nenhum valor foi copiado para esta auditoria. O receiver OTLP sem autenticação está publicado em todas as interfaces do host. O scanner versionado tem padrões e cobertura insuficientes para esses nomes de arquivo e para histórico Git.

### P1-10 — Fluxos web não encerram sessão e podem deixar estado parcial

Não há logout na interface embora exista endpoint de revogação. Qualquer autenticado recebe link para `/admin`, sem navegação coerente por papel. Primeiro acesso consome convite antes de definir senha em outra requisição; atribuição administrativa executa três comandos separados. Falhas intermediárias podem deixar estado parcial sem retomada clara.

### P1-11 — A cobertura de decisões críticas não cumpre a regra de completude

A constituição do projeto exige cobertura completa de decisão para invariantes críticas, mas o gate aceita limites de 90% e 80%. A execução verde inclui categorias em 98,85%, 98,65%, 96,14% e 85%. A matriz P0/P1 registra zero provas de erro e zero linhas completas.

## 8. Outros gaps materiais

1. Oito hotspots excedem 800 linhas: `apps/api/src/http.ts` (3.516), `apps/web/app/page.tsx` (2.023), `packages/curriculum/src/catalog.ts` (1.607), `packages/curriculum/src/learning-runtime.ts` (1.584), `packages/persistence/src/learning-state-repository.ts` (1.385), `packages/persistence/src/schema.ts` (1.260), `apps/web/app/admin/page.tsx` (1.236) e `packages/domain/src/learning-state.ts` (887). O gate apenas exige cadastro do hotspot; não cobra redução ou prazo.
2. Foram encontradas 149 funções acima de 50 linhas, 43 acima de 100 e 13 acima de 200. `HomePage` possui 1.347 linhas, `AdminPage` 935 e `handleApiRequest` 820.
3. A cobertura atual não inclui `apps/web/app/**` nem scripts operacionais; 13.817 de 50.427 linhas inventariadas, 27,4%, ficam fora da métrica global. API, worker e persistência possuem subárvores abaixo de 80%.
4. O web não depende de `@cvg/contracts`, duplica parsers e aceita projeções mais frouxas. O pacote `@cvg/ui` é apenas um marcador sem consumidores.
5. Há 57 rotas canônicas, mas template de telemetria e dispatcher formam outras fontes de verdade; o teste de inventário não liga inventário ao handler.
6. Foram encontradas 25 definições locais de executor de banco e 22 ocorrências de `transaction as unknown as DatabaseExecutor`.
7. O rate limit usa `socket.remoteAddress|route` atrás do Caddy. Usuários compartilham o bucket do proxy e um cliente pode esgotar o limite de uma rota para todos.
8. Mudança de senha não exige senha atual/step-up nem revoga sessões. Containers de aplicação executam como root, sem `read_only`, `cap_drop` ou `no-new-privileges`.
9. O CSP web ainda permite `script-src 'unsafe-inline'`. O token de convite permanece na URL após captura. Health de dependências é exposto em HTTP.
10. Axe passou sem violações confirmadas, mas deixou 44 checks de contraste e dois de ARIA como `incomplete`; foram confirmados contrastes aproximados de 2,91:1 e 3,1:1 em texto pequeno.
11. Playwright configura somente Desktop Chrome; não há Firefox, WebKit, projeto mobile, UAT, leitor de tela ou RUM real. O dashboard permanece em três colunas até 320 px.
12. O runtime chamado HA duplica API e worker apenas no mesmo host. PostgreSQL, edge e observabilidade são singletons; não há HA de host/zona.
13. Backup/restore local tem checksum, mas não há agenda, offsite, PITR, retenção, invariantes de domínio no restore nem prova externa de RPO/RTO.
14. CI remoto está vermelho e o RC local não foi publicado. Não há environments, deployments, registry/CD, SBOM, assinatura ou attestation.
15. Quatro entradas do `traceability.yml` apontam para `0105_dominio_regras_de_negocio.md`, que não existe; o arquivo real é `0105_maquina_de_estados_e_fluxos.md`.
16. O plano 0305 altera os pesos canônicos de cinco itens. Com os pesos do AUD-0491, o ganho máximo correto é 7,72 e a projeção 90,96, não 9,30/92,54.
17. Os documentos 0400–0421, 0490, 103, 112 e 114 misturam snapshots históricos, atuais ou revogados sem sinalização suficientemente inequívoca.

## 9. Pontos fortes comprovados

1. TypeScript strict com `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns` e zero `any` explícito no código de produção.
2. Grafo arquitetural acíclico, boundaries executáveis e separação clara de domain/application/contracts/persistence/adapters.
3. Uso amplo de objetos/coleções readonly e `Object.freeze`; nomes de domínio são consistentes.
4. Zod nas fronteiras, limite de body de 64 KiB, SQL parametrizado via Drizzle, autenticação e autorização server-side.
5. Cookie `__Host-`, `HttpOnly`, `Secure`, `SameSite=Lax`, token de sessão armazenado por hash, scrypt com salt aleatório e comparação segura.
6. CSRF por origin/referrer/fetch-site, RLS/FORCE RLS, projeções públicas redigidas e logs por allowlist.
7. Dependências exatas, lockfile congelado e nenhum advisory conhecido no audit de produção.
8. Suíte extensa: 127 arquivos unitários, 52 de integração e oito E2E; build, lint e typecheck atuais passam quando o contrato de ambiente é satisfeito.
9. PostgreSQL é fonte transacional, Qdrant permanece derivado/reconstruível e IA não decide nota, estado, publicação ou aprovação clínica.
10. Os documentos preservam honestamente `PILOT_BLOCKED`, 763 revisões clínicas pendentes e gates externos `NOT_EXECUTED`.

## 10. Classificação AUDIT 0410–0418

| Artefato lógico | Classificação | Motivo |
|---|---|---|
| 0410 — aderência ao PRD | PARTIAL | Escopo principal implementado; jornadas humanas, aceite e métricas produtivas incompletos. |
| 0411 — aderência à SPEC | PARTIAL | Núcleo arquitetural forte; operação, segurança e release divergem de garantias declaradas. |
| 0412 — runtime | FAIL | Health local passa, mas proveniência é inválida e routing usa liveness. |
| 0413 — logs | PARTIAL | Redaction/mascaramento é forte; erros relevantes são silenciados e não há backend de logs. |
| 0414 — métricas | FAIL | Targets existem, porém regras/alertas não carregam e worker está invisível. |
| 0415 — integrações | NOT_EXECUTED | IdP real, edge público, storage externo, registry, deploy e alertas externos não foram executados. |
| 0416 — integridade de dados | PARTIAL | Migrations/RLS fortes; append de auditoria e restore de invariantes precisam de prova/correção. |
| 0417 — segurança/governança | FAIL | P1 em aprovador, revogação, segredos locais e OTLP impedem aprovação. |
| 0418 — experiência operacional | PARTIAL | Fluxos funcionam, mas logout, estados parciais, a11y, mobile e cross-browser estão incompletos. |

## 11. Plano de remediação recomendado

| Ordem | ID | Prioridade | Ação | Prova de pronto |
|---:|---|---|---|---|
| 1 | AUD-CQ-001 | P1 | Validar existência/alcançabilidade Git no gate, corrigir o SHA, reconstruir as imagens e reemitir a evidência do mesmo commit. | `git cat-file`, label/env/digest, build reproduzível e gate negativo/positivo em TDD. |
| 2 | AUD-CQ-002 | P1 | Tornar o aprovador clínico designado obrigatório em produção e propagá-lo por API/use case/transição. | Testes de ID ausente, diferente e correto; publicação continua fail-closed. |
| 3 | AUD-CQ-003 | P1 | Revogar/invalidar sessões em toda mudança de roles/scopes e exigir step-up/invalidação em troca de senha. | Testes de autorização removida e sessão antiga negada. |
| 4 | AUD-CQ-004 | P1 | Envolver todo request lifecycle em tratamento de erro, responder 503/500 seguro e registrar código sanitizado. | Teste com rate limiter rejeitando, sem hang nem `unhandledRejection`. |
| 5 | AUD-CQ-005 | P1 | Corrigir `pnpm test:e2e` e fazer o gate CI executar o entrypoint real. | Comando canônico verde do zero em ambiente limpo e artefatos retidos. |
| 6 | AUD-CQ-006 | P1 | Usar readiness no edge/containers, carregar regras, coletar workers e configurar Alertmanager. | API sem DB removida do tráfego; grupos/alertas ativos e teste de disparo/ack. |
| 7 | AUD-CQ-007 | P1 | Sondar diretamente a versão canário por janela sustentada e corrigir rollback. | Probe identifica SHA/digest da nova réplica e falha se a antiga responder. |
| 8 | AUD-CQ-008 | P1 | Restringir OTLP, rotacionar credencial se válida, aplicar `0600`, non-root, read-only FS e capabilities mínimas. | Inspeção de portas/permissões/container e secret scan ampliado. |
| 9 | AUD-CQ-009 | P1 | Implementar logout e tornar primeiro acesso/atribuição atômicos ou retomáveis. | E2E de logout, falha intermediária e retry idempotente. |
| 10 | AUD-CQ-010 | P1 | Tornar 100% real a cobertura de decisões críticas e completar cenários error/denied/conflict P0/P1. | Gate falha abaixo de 100%; matriz sem prova crítica ausente. |
| 11 | AUD-CQ-011 | P2 | Criar ratchet de linhas/funções e decompor API, web, currículo e persistência. | Redução mensurável sem regressão e limites executáveis. |
| 12 | AUD-CQ-012 | P2 | Incluir web/scripts na cobertura ou criar thresholds explícitos por camada; ampliar browser/mobile/a11y. | Cobertura declarada sem 27,4% omitido e matriz Chromium/Firefox/WebKit/mobile. |
| 13 | AUD-CQ-013 | P2 | Corrigir links, pesos e supersessão; fortalecer verificador documental. | Todos os caminhos existem e projeção usa os pesos canônicos. |
| 14 | AUD-CQ-014 | P2 | Corrigir rate limit por proxy confiável/principal e políticas por rota. | Testes multiusuário atrás do Caddy sem bucket global. |
| 15 | AUD-CQ-015 | P2 | Executar gates externos no mesmo RC somente após os P1 locais. | CI verde, registry/attestation, deploy/rollback, IdP, TLS, backup/RPO/RTO, UAT, soak e DR. |

## 12. Limitações desta auditoria

- Não foram feitos writes em PostgreSQL, interrupção de réplicas, restore, deploy, rollback ou alteração remota nesta rodada.
- O E2E HA ativo 3/3 foi aceito como evidência persistida anterior; não foi reexecutado porque muta fixture/runtime.
- Não foram executados DAST externo, Gitleaks, TruffleHog, Semgrep, Syft ou Grype.
- Exposição externa real de portas/firewall, IdP/MFA/recovery, DNS/TLS público, backup externo, RPO/RTO, registry, deploy, UAT, RUM, soak e DR permanecem `NOT_EXECUTED`.
- Revisão veterinária dos 763 itens e evidência clínica humana permanecem pendentes.
- Nenhum segredo, dado real, prontuário, foto, PDF ou conteúdo licenciado foi copiado para este relatório.

## 13. Conclusão

O CVG tem um núcleo técnico promissor e amplamente testado, mas a qualidade atual é desigual. O código é forte em tipos, validação, imutabilidade, contratos e controles defensivos; é frágil em complexidade, diagnóstico de erro, frontend e completude de prova. A camada operacional não sustenta uma afirmação de release: proveniência, readiness, alertas, canário, segurança de infraestrutura e CI possuem falhas concretas.

A decisão correta é manter `PILOT_BLOCKED`, tratar AUD-CQ-001–010 em TDD e somente depois reconstruir um RC atribuível, executar os gates locais e externos no mesmo artefato e realizar nova auditoria independente. A nota `64,20/100` não deve ser promovida por narrativa; deve mudar apenas com evidência reproduzível dos controles corrigidos.
