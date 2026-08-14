# 0303 — Projeto de Remediação Integral das Limitações

> **Registro histórico do ciclo R0–R6.** Para a elevação vigente da baseline de 83/100 até o piso de 95 em cada item, usar `0304_premium_enterprise_95_program.md`, `0492_score_95_roadmap.md` e `0493_score_95_backlog.md`. Este documento não altera a auditoria atual nem autoriza release/publicação.

**Projeto:** CVG Trainee Vet
**Origem:** reauditoria AUD-2026-08-11-WORKTREE-LOGIN
**Status:** EM EXECUÇÃO — gates locais R1–R6 comprovados; gates externos e aprovação clínica pendentes
**Responsável técnico:** Codex, sob revisão de Ricardo
**Critério de segurança:** nenhum dado clínico real, prontuário, tutor, foto, PDF, token, senha ou segredo entra em código, teste, seed, log ou artefato.

## 1. Objetivo

Eliminar, provar ou encaminhar com dependência explícita todas as limitações registradas na reauditoria:

1. fazer o E2E real atravessar web → API → PostgreSQL sem quebrar a defesa RLS;
2. materializar atribuições e estados curriculares autorizados para os 24 módulos;
3. transformar os packs curriculares de drafts parametrizados em conteúdo autorado, pré-verificado e revisado antes de qualquer publicação;
4. entregar recuperação e MFA através de um provedor externo configurado e verificável;
5. fechar headers, TLS e domínio no edge;
6. tornar traces duráveis, deployment e rollback operacionais;
7. comprovar backup/restore com RPO/RTO;
8. corrigir o default do smoke de carga;
9. congelar código, testes, documentos e manifesto em um SHA auditável.

O projeto separa construção local, prova de homologação e dependências de produção. Um adapter ou teste sintético não será contado como MFA, TLS, trace durável ou restore de produção.

## 2. Baseline confirmado

| Limitação | Causa observada | Resultado necessário |
|---|---|---|
| E2E real/RLS | O fixture usa a conexão da aplicação para seed direto em activity_assignments; a policy corretamente nega a escrita sem contexto | Fixture com conexão administrativa de teste segregada, API sempre least-privilege, seed/cleanup idempotentes e E2E real verde |
| Atribuições/estados | O banco ativo tem uma atribuição M02 e zero curriculum_runtime_states | Job administrativo idempotente cria a projeção autorizada dos 24 módulos e seus estados iniciais, sem declarar competência |
| Conteúdo draft | Packs não-M02 são parametrizados; somente M02 está operacionalmente publicado | Banco autoral de 24 packs, preflight, revisão registrada, publicação apenas após critério de cada pack |
| MFA/recuperação | Adapter HTTP existe, mas IDENTITY_PROVIDER_URL não está configurado | Provedor escolhido, segredo fora do Git, operações reais de recovery/MFA e status AVAILABLE/ENABLED comprovados |
| TLS/headers | Caddy local opera em HTTP e não há headers completos | Domínio autorizado, TLS automático ou certificado gerenciado, headers testados e redirecionamento HTTP→HTTPS |
| Traces duráveis | Collector exporta para debug; não há backend persistente | Collector → backend de traces com volume/storage durável, retenção, acesso controlado e teste de consulta |
| Deploy/rollback | Compose local existe, mas não há release promotion/rollback comprovado | Artefato versionado, preflight, migração compatível, canário, health gate, rollback e relatório |
| Restore | Há somente restore sintético descartável | Backup agendado, retenção, restore isolado, verificação de hash/contagem, RPO/RTO e runbook |
| Load smoke | Default usa 5_000 e Number não aceita esse formato | Default numérico, teste unitário do parser e smoke sem variáveis customizadas |
| Commit auditável | Worktree contém código e documentos sem SHA final | Commit intencional, manifesto fechado, diff limpo, gates verdes e reauditoria no mesmo SHA |

## 3. Regras não negociáveis

- PostgreSQL permanece a autoridade transacional.
- RLS continua deny-by-default; o usuário de aplicação não recebe BYPASSRLS.
- A conexão administrativa de fixture existe somente em teste/homologação, é identificada por variável separada e não é usada pela API.
- A IA não publica, corrige, altera estado, define nota, define papel ou aprova conteúdo.
- Qdrant é derivado e reconstruível desde PostgreSQL.
- Conteúdo não revisado continua RASCUNHO e não pode ser atribuído como atividade publicada.
- Estado inicial de um módulo não é evidência de domínio ou competência.
- Recovery e MFA não retornam sucesso enquanto o provedor externo não estiver configurado e respondendo.
- HSTS só é ativado no domínio TLS aprovado; o ambiente HTTP local não deve fingir segurança de produção.
- Segredos ficam no secret manager/ambiente do deploy; nomes de variáveis podem ser documentados, valores não.
- Toda task fecha com teste, evidência, rollback e ligação requisito → SPEC → código → teste → commit → artefato.

## 4. Arquitetura-alvo

CI/homologação:

- app DATABASE_URL com least privilege e RLS;
- fixture DATABASE_ADMIN_URL somente para seed/cleanup;
- web E2E → edge/API real;
- PostgreSQL e Qdrant descartáveis.

Produção interna:

- Caddy HTTPS com headers;
- web → edge interno loopback `3182` → Caddy `8081` → api-a/api-b; o edge público permanece em `3180`/`3181`;
- PostgreSQL com backup/restore;
- worker-a/worker-b → Qdrant derivado;
- OTEL collector → backend de traces durável;
- release controller: preflight → canário → health → promoção/rollback.

Nenhuma porta nova de host será escolhida sem consultar inventory/ports.md. Componentes internos devem preferir a rede Docker; o edge público continua no port 3180 até decisão de domínio.

## 5. Fases e sprints

### R0 — Controle de mudança e preparação

**Objetivo:** congelar a linha de base sem apagar alterações do usuário e preparar o contrato de evidência.

#### R0-S1 — Baseline auditável

- **O que:** revisar git status/diff, separar alterações pré-existentes, definir branch/commit de remediação e atualizar o manifesto.
- **Onde:** git, traceability.yml, docs/99_runtime_state.md, docs/20_master_execution_log.md.
- **Dependências:** autorização desta rodada.
- **Teste:** format, lint, typecheck, verify:documentation, verify:traceability, git diff --check.
- **Aceite:** todos os arquivos da janela aparecem no manifesto; nenhum segredo; baseline registrado com SHA.
- **Rollback:** nenhum reset destrutivo; desfazer somente commits próprios por commit reversível.
- **Status:** READY_FOR_NEXT_STEP.

### R1 — E2E real e RLS

**Objetivo:** provar o caminho real sem enfraquecer a segurança.

#### R1-S1 — Conexões segregadas de fixture

- **O que:** adicionar CVG_REAL_E2E_DATABASE_URL para a aplicação e CVG_REAL_E2E_ADMIN_DATABASE_URL para seed/cleanup; recusar iniciar o fixture sem a conexão administrativa explícita.
- **Onde:** scripts/real-e2e-fixture-server.mjs, .github/workflows/quality.yml, contrato de CI, documentação de runtime.
- **Dependências:** R0-S1.
- **Teste RED:** iniciar fixture sem admin URL deve falhar com erro seguro; tentar insert em activity_assignments com app URL deve continuar falhando por RLS.
- **Teste GREEN:** seed com admin URL passa; health da API continua usando app URL non-superuser.
- **Aceite:** o fixture nunca usa a conexão da API para seed; healthcheck comprova que a API não é superuser nem BYPASSRLS.
- **Rollback:** manter o fluxo real desativado no CI até o fixture segregado estar verde.

#### R1-S2 — Seed e cleanup transacionais

- **O que:** encapsular seed em namespace sintético, gerar identificadores únicos, inserir contas/atividade/conteúdo/atribuição com admin, registrar somente IDs técnicos e limpar dados mutáveis em ordem FK.
- **Onde:** fixture server, testes de integração PostgreSQL.
- **Dependências:** R1-S1.
- **Teste:** seed idempotente, rerun sem duplicação, interrupção no meio, cleanup após SIGTERM e preservação do evento append-only.
- **Aceite:** zero dados sintéticos mutáveis remanescentes; auditoria append-only é preservada; nenhum token/senha vai para log.
- **Rollback:** cleanup por namespace e expiração de fixtures abandonados.

#### R1-S3 — E2E real completo

- **O que:** executar login, sessão, learning path, atividade, iniciar, salvar, submeter, feedback e logout pela web contra API e PostgreSQL reais.
- **Onde:** tests/e2e/real-runtime.spec.ts, playwright.config.ts, workflow CI.
- **Dependências:** R1-S2.
- **Teste:** CVG_RUN_REAL_E2E=true pnpm test:e2e.
- **Aceite:** todos os cenários passam sem interceptação; relatório Playwright/JUnit é publicado; caso negativo de acesso cruzado retorna 401/403.
- **Rollback:** remover somente a fixture nova, mantendo os E2E sintéticos existentes.

#### R1-S4 — E2E contra o runtime HA ativo

- **O que:** executar a mesma jornada Chromium contra o web service e o HA já implantados, iniciando somente uma fixture sintética temporária no projeto Compose e encerrando-a com cleanup verificável.
- **Onde:** `scripts/active-ha-e2e.mjs`, `infra/production/docker-compose.ha.yml`, `infra/production/Caddyfile`, `playwright.config.ts`, `tests/integration/active-ha-e2e.test.ts`.
- **Dependências:** R1-S1/R1-S2/R1-S3; edge local em `3180`/`3181` e canal interno loopback `3182 → 8081`.
- **Teste:** `pnpm test:e2e:active-ha`; teste de integração do orquestrador; consulta administrativa pós-cleanup sem dados mutáveis `real-e2e-*`.
- **Aceite:** navegador alcança API real pelo proxy web ativo; 2/2 cenários passam; container fixture sai com código 0; contas, atividade, conteúdo, sessões, atribuições e estados sintéticos ficam em zero; auditoria append-only não é apagada.
- **Rollback:** parar/remover somente `real-e2e-fixture`, apagar apenas o arquivo temporário local e preservar o runtime HA, o volume PostgreSQL e os registros de auditoria imutáveis.
- **Status:** COMPLETED localmente; CI remoto e ambientes públicos continuam gates separados.

### R2 — Currículo operacional e conteúdo

**Objetivo:** sair de uma única atribuição M02 e tornar o caminho de 24 meses verificável sem fabricar competência.

#### R2-S1 — Seed de atribuições e estados

- **O que:** criar job administrativo idempotente que deriva os módulos da fonte curriculumV3, cria uma learning_assignment por módulo e um curriculum_runtime_state inicial por participante/escopo, com status explícito e próxima ação honesta.
- **Onde:** packages/application, packages/persistence, `scripts/materialize-curriculum.mjs`, `scripts/verify-curriculum-runtime.mjs`, migration apenas se o contrato exigir.
- **Dependências:** R1-S1; conta/escopo sintéticos autorizados.
- **Teste RED:** participante sem escopo não pode criar/ler estado de outro participante; rerun não duplica; estado inicial não pode declarar mastery.
- **Teste GREEN:** 24 atribuições e 24 estados são criados e lidos pelo learning path autorizado; `pnpm ops:verify-curriculum-runtime` valida a projeção no PostgreSQL administrativo.
- **Aceite:** banco ativo/homologação mostra 24 estados e 24 atribuições para o fixture; conteúdo não publicado aparece como bloqueado/aguardando conteúdo, não como atividade disponível.
- **Rollback:** job idempotente com modo dry-run e remoção somente do namespace sintético.
- **Status:** COMPLETED localmente / PASS_WITH_GAPS para conteúdo clínico.
- **Evidência:** verificador live confirmou 24 atividades, 796 conteúdos/editorial/itens, 24 atribuições e 24 estados; módulos M01–M24 estão presentes, atribuições permanecem `NAO_ATRIBUIDO` e estados `PENDENTE`; o modo clínico estrito falha honestamente enquanto 763 itens estiverem `PROJECAO_VERIFICADA`.

#### R2-S2 — Produção dos packs

- **O que:** transformar cada pack draft em banco autoral com itens, objetivos, rubrica, resposta esperada interna e referências permitidas, sem exposição na projeção participante.
- **Onde:** packages/curriculum, packages/application, packages/persistence, authoring web/API.
- **Dependências:** R2-S1; decisão de conteúdo e source registry.
- **Teste:** preflight por pack, schemas estritos, fronteira pública, acesso por papel, retirada/republicação e reconciliação.
- **Aceite:** 24 packs possuem status de produção individual; nenhum pack é marcado PUBLICADO sem preflight e revisão registrada.
- **Rollback:** manter versão publicada anterior ou retirar o pack para RASCUNHO sem apagar histórico.

#### R2-S3 — Revisão e publicação controlada

- **O que:** criar fila de revisão item a item, registrar decisão, permitir solicitar ajustes, publicar somente o pack aprovado e gerar auditoria metadata-only.
- **Onde:** authoring API/web, migration editorial existente, testes E2E de authoring.
- **Dependências:** R2-S2 e revisão de Ricardo.
- **Teste:** autor não aprova o próprio item; participante nunca recebe fonte/gabarito; publicação parcial é recusada.
- **Aceite:** cada módulo tem decisão rastreável; prova semântica e revisão humana são artefatos separados; piloto somente após gate.
- **Rollback:** retirar versão publicada e apontar atribuição para estado aguardando conteúdo.
- **Progresso local:** a tela `apps/web/app/authoring/page.tsx` passou a exigir justificativa e decisão clínica explícita; o botão de publicação permanece desabilitado até `APROVADO_CLINICAMENTE`. O E2E `tests/e2e/authoring-review.spec.ts` comprovou a ordem revisão → publicação no commit `c7a591b`. Isso torna o gate humano executável, mas não substitui a revisão item a item dos 763 conteúdos.
- **Progresso adicional:** a fila paginada `GET /api/v1/internal/authoring/review-queue` e a capability `VIEW_CLINICAL_REVIEW_QUEUE` permitem descoberta controlada por aprovador clínico; a projeção é metadata-only e a web agora lista a fila e abre o item. `scripts/verify-clinical-review-queue.mjs` confirmou live 796 registros, 763 pendentes, 763 sem revisão e 0 falhas de pré-voo; o modo estrito falha com `clinical review queue is incomplete: 763 pending items`. E2E de autoria passou 2/2. Evidência: `docs/106_clinical_review_queue_evidence_2026-08-11.md`.

### R3 — Identidade, recuperação e MFA

**Objetivo:** substituir NOT_CONFIGURED por operações externas reais e verificáveis.

#### R3-S1 — Decisão do provedor

- **O que:** escolher provedor externo autorizado, protocolo, domínio, política de MFA, recuperação, expiração, grupos/roles e armazenamento de segredos.
- **Dependências:** decisão humana de fornecedor/domínio; nenhuma contratação é inferida.
- **Aceite:** ADR com provedor, endpoints, threat model, política de dados, secret names e plano de saída.
- **Status:** WAITING_HUMAN_APPROVAL.

#### R3-S2 — Adapter e sincronização

- **O que:** completar o adapter de identidade para status, recovery, enrollment/verify MFA, revogação e sincronização de papel/escopo sem aceitar autorização do cliente.
- **Onde:** packages/application/src/identity-provider.ts, config, API, contracts.
- **Teste:** unitário de respostas inválidas, timeout, 401/409/5xx, replay e ausência de segredo; integração com sandbox do provedor.
- **Aceite:** security status retorna EXTERNAL_IDENTITY_PROVIDER; recovery e MFA retornam operationId sem secret; sessão e papéis continuam server-side.
- **Rollback:** feature flag retorna ao convite administrativo e desabilita mutações externas.
- **Progresso local:** o adapter e o runtime agora rejeitam transporte HTTP para o IdP; `NODE_ENV=production` exige URL `https://`, coberto por teste RED/GREEN. O gate `scripts/verify-identity-provider-readiness.mjs` passou a consultar o endpoint de segurança por HTTPS e exigir recuperação `AVAILABLE` + MFA `ENABLED` antes do gate produtivo aceitar configuração. O adapter também suporta `verifyMfaEnrollment` e `completeRecovery`, com rotas autenticadas, códigos limitados e não persistidos; projections de operação retornadas pelo provedor rejeitam caracteres de controle. O sandbox/provedor real, challenge real, recovery codes, step-up, revogação e sincronização continuam pendentes por decisão humana.

#### R3-S3 — Jornada web e MFA obrigatório

- **O que:** adicionar recuperação, enrollment, challenge, recovery codes conforme o provedor e política de step-up para operações sensíveis.
- **Onde:** apps/web/app/account, login/session API, E2E.
- **Teste:** login sem MFA quando obrigatório é bloqueado; recovery expirado/replay falha; code não aparece em log/telemetria.
- **Aceite:** E2E em sandbox prova enrollment, challenge, recovery e revogação; status no banco e UI é coerente.
- **Rollback:** revogar enrollment e bloquear rollout, nunca fazer fallback silencioso para senha.
- **Progresso local:** `/account` agora executa início → código provider-mediated → confirmação para recovery e MFA; o E2E sintético passou 1/1 e verifica que os códigos não permanecem na UI. Isso prepara o sandbox, mas não substitui a prova com IdP externo.

### R4 — TLS, headers e edge

**Objetivo:** entregar transporte e política de browser reais.

#### R4-S1 — Headers de segurança

- **O que:** definir CSP compatível com Next, HSTS condicional a HTTPS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy e cache-control sensível.
- **Onde:** infra/production/Caddyfile, apps/web/next.config.ts, testes HTTP.
- **Dependências:** inventário de rotas e domínio.
- **Teste:** curl/Playwright verifica cada header; CSP não quebra login/atividade; scanner não encontra mixed content.
- **Aceite:** headers presentes no edge e no web, sem duplicação contraditória.
- **Rollback:** remover somente o header incompatível mantendo X-Content-Type-Options e no-store.

#### R4-S2 — Domínio e TLS

- **O que:** configurar domínio autorizado, DNS, certificado automático/gerenciado, redirect HTTP→HTTPS e origem exata em WEB_ORIGINS.
- **Dependências:** decisão humana de domínio/DNS e acesso à infraestrutura.
- **Teste:** TLS handshake, cadeia válida, renovação em staging, HSTS após HTTPS, cookie Secure e E2E externo.
- **Aceite:** domínio responde HTTPS, sem certificado expirado, sem HTTP de sessão, health e API preservados.
- **Rollback:** manter edge interno, remover rota pública e revogar certificado conforme runbook.
- **Status:** WAITING_HUMAN_APPROVAL até haver domínio.
- **Progresso local:** criado `infra/production/Caddyfile.production.example`, sem `tls internal`, com FQDN parametrizado, HSTS e HTTPS automático; Compose agora permite selecionar esse perfil e parametrizar os targets 80/443 sem alterar os defaults locais. `caddy validate` e Compose com configuração sintética passaram. Handshake público, DNS, ACME/renovação e E2E externo ainda dependem do domínio autorizado.

### R5 — Traces, deployment, rollback e restore

**Objetivo:** provar operação recuperável além do compose local.

#### R5-S1 — Backend de traces durável

- **O que:** substituir exporter debug por backend durável autorizado, configurar retenção/acesso, correlação de API/worker e redaction de atributos.
- **Onde:** infra/observability/otel-collector-config.yaml, compose, dashboards, runbooks.
- **Dependências:** escolha de backend/storage e retenção.
- **Teste:** request sintético gera trace consultável após reinício do collector; nenhum payload secreto; alerta de perda de exportação.
- **Aceite:** trace permanece após restart, possui request_id/correlation_id e retenção documentada.
- **Rollback:** exporter debug/local redigido, sem bloquear o núcleo da aplicação.
- **Progresso local:** o contrato RED/GREEN adicionou `infra/observability/otel-collector.production.example.yaml` com exporter OTLP HTTP HTTPS e autorização por ambiente, além do overlay Compose `infra/production/docker-compose.external-traces.example.yml`; o collector e o Compose foram validados com valores sintéticos, e Tempo ficou opcional no perfil `local-traces`. Backend, retenção, consulta, alertas, persistência externa e execução autorizada continuam pendentes.

#### R5-S2 — Artefato versionado e rollback

- **O que:** criar release manifest com SHA/image digest, preflight, migração expand/contract, canário, health gate, promoção e rollback.
- **Onde:** infra/production, scripts/deploy-release.mjs, scripts/rollback-release.mjs, scripts/release-execution.mjs, scripts/local-release-rehearsal.mjs, CI.
- **Dependências:** R0-S1 e R4-S2 para produção; staging pode usar edge interno.
- **Teste:** deploy de duas versões sintéticas, falha de health, rollback de app e migração compatível; `pnpm ops:rehearse-local-release` no HA local.
- **Aceite:** rollback restaura tráfego para digest anterior, registra auditoria e não perde transação confirmada.
- **Rollback:** próprio script de rollback e imagem anterior imutável.
- **Status:** COMPLETED localmente / WAITING_HUMAN_APPROVAL para registry, ambiente e produção.
- **Evidência local:** canário/promoção, rollback e restauração final passaram com health 200 nos dois sentidos usando também uma imagem construída do commit anterior `b30c85d` (`sha256:6ca763bb…e6e570`); o modo de pull local é fail-closed fora do rehearsal e os artefatos auxiliares são removidos ao final.

#### R5-S3 — Backup, restore e RPO/RTO

- **O que:** automatizar pg_dump/backup, retenção, checksum, isolamento de destino, restore drill e validação de contagens/constraints.
- **Onde:** scripts, infra/production, runbooks 0802/0804, CI/homologação.
- **Dependências:** storage autorizado e credenciais fora do Git.
- **Teste:** backup agendado, corrupção simulada, restore em banco descartável, perda máxima medida e tempo de recuperação.
- **Aceite:** RPO ≤ 1 hora e RTO ≤ 4 horas no ambiente declarado; dump não fica no repositório; evidência redigida.
- **Rollback:** interromper job e preservar último backup íntegro; nunca sobrescrever produção sem confirmação.
- **Progresso local:** o manifesto agora é validado contra nome, tamanho, formato, timestamp e SHA-256; o verificador aceita um dump existente fora do repositório e restaura esse artefato em banco descartável, além do marcador sintético. O teste live no HA passou 2/2; uma execução direta observou 197.097 bytes, 27 objetos restaurados e RTO de 2.357 ms.
- **Progresso adicional:** quando o PostgreSQL só está acessível pela rede Docker, `scripts/postgres-command.mjs` encaminha `PGPASSWORD` por ambiente ao `docker exec`; `pnpm test:integration:restore` passou 2/2 e a execução direta observou RTO de 2.546 ms, sem expor a senha nos argumentos.
- **Limite:** agendamento, retenção, criptografia, storage externo, owner, RPO/RTO produtivo e autorização de restore continuam pendentes; a prova local não fecha o gate de produção.

### R6 — Qualidade, carga, auditoria e fechamento

**Objetivo:** fechar a última limitação e emitir novo relatório no SHA.

#### R6-S1 — Smoke de carga determinístico

- **O que:** corrigir o default 5_000 para valor numérico e adicionar teste do parser/saída; executar smoke normal, durante failover e após recuperação.
- **Onde:** scripts/run-load-smoke.mjs, scripts testáveis ou unit test.
- **Teste:** pnpm ops:load-smoke sem variáveis; 100/100; p95 documentado; status não-2xx falha o processo.
- **Aceite:** comando default funciona em shell local e CI.
- **Rollback:** retornar somente ao parser anterior se o gate de compatibilidade exigir, mantendo teste de regressão.
- **Progresso adicional:** o build web de produção agora falha fechado sem `CVG_API_INTERNAL_URL`; o workflow CI injeta o alvo de proxy no build e o contrato `tests/integration/ci-governance.test.ts` cobre a configuração.

#### R6-S2 — Quality gate completo

- **O que:** executar verify, build, contract, worker, live PostgreSQL/Qdrant, restore, E2E sintético/real, security, dependency audit, headers/TLS, traces e load.
- **Dependências:** R1–R5 conforme o ambiente.
- **Aceite:** nenhum P0/P1 aberto no escopo de release; todo skip possui causa e owner; cobertura global ≥80%.
- **Progresso adicional:** `scripts/verify-production-security-config.mjs` separa validação pura da probe externa e rejeita configuração insegura para IdP, origem pública, traces, backup, retenção e digests; `tests/integration/production-security-config.test.ts` passou 7/7. O gate produtivo permanece dependente do ambiente autorizado.
- **Rollback:** não promover release; manter estado WAITING_HUMAN_APPROVAL.

#### R6-S3 — Commit e auditoria final

- **O que:** revisar diff, atualizar traceability, backlog, runtime state, log, 0400–0421 e relatório de auditoria; criar commit convencional e reauditar o SHA.
- **Teste:** git diff --check, verify-documentation, verify-traceability, git show do SHA e repetição dos gates.
- **Aceite:** nenhum artefato da construção fica fora do commit; relatório aponta SHA; worktree limpo após commit.
- **Rollback:** commit reversível e tag de release somente após aprovação.

## 6. Matriz de testes obrigatória

| Camada | Prova |
|---|---|
| Unitária | parser do load, RLS context, adapter IdP, headers, estado curricular, redaction, retry e rollback |
| Aplicação/contrato | schemas de recovery/MFA, atribuições/estados, publicação, papéis e envelopes |
| PostgreSQL live | seed admin, usuário app sem BYPASSRLS, isolamento, 24 estados/atribuições, idempotência e cleanup |
| Worker/integrações | exportação OTEL, retry, Qdrant reconstruível, backup manifest e recovery |
| Web/E2E | login, MFA, recovery, 24-month roadmap, atividade publicada, headers e HTTP→HTTPS |
| Segurança | secrets, dependency audit, CSRF, rate limit, XSS/CSP, cookie, acesso cruzado e erro sem stack |
| Operação | health, canário, rollback, trace após restart, backup/restore, failover e load smoke default |

## 7. Dependências e decisões humanas

Antes de fechar R3–R5 em produção, Ricardo precisa registrar:

1. provedor externo de identidade e política MFA/recovery;
2. domínio, DNS, certificado e origem pública;
3. backend/storage de traces e retenção;
4. destino de backup, janela, retenção e responsáveis;
5. ambiente autorizado para deploy/rollback.

Enquanto essas decisões não existirem, a execução local pode fechar adapters, testes, headers condicionais, backend descartável e runbooks, mas o status de produção permanece NOT_EXECUTED.

## 8. Gate final de pronto

O projeto só é encerrado quando:

- E2E real passa com seed segregado e RLS intacta;
- existem 24 estados e atribuições idempotentes no ambiente de prova;
- cada pack tem status autoral, preflight, revisão e decisão rastreável;
- recovery/MFA estão disponíveis em provedor real e o step-up é provado;
- HTTPS e headers estão observados no edge aprovado;
- traces sobrevivem a restart e têm retenção/acesso documentados;
- deploy, canário, rollback e restore têm evidência;
- smoke de carga default passa;
- verify/build/security/E2E/live/restore passam;
- worktree está limpo, commit contém código/docs/testes/manifesto e a auditoria foi repetida no SHA.

Até esse gate, o status oficial é WAITING_HUMAN_APPROVAL ou IN_PROGRESS, nunca COMPLETED.
