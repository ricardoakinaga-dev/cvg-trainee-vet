# 0300 — BUILD Engineer Master — CVG

**Projeto:** Sistema CVG de Treinamento Veterinário  
**Fonte de verdade:** `BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC/0190_spec_validation.md`  
**Status:** `BUILD — DUAL 95 / F0 VERDADE E CONTROLE — READY_FOR_NEXT_STEP`
**Regra:** o código foi autorizado somente depois do fechamento documental 04–08 no gate 0391; cada fase seguinte ainda exige o respectivo critério de aceite.

**Extensão vigente:** a baseline técnica deste master permanece válida. As baselines independentes `0491` (`83,24/100`) e `docs/116` (`64,20/100`) são coordenadas, sem mistura de notas, pelo programa `0307_dual_95_executive_program.md`, roadmap `../04.AUDIT/0514_dual_95_roadmap.md` e backlog `../04.AUDIT/0515_dual_95_backlog.md`. O aceite final exige `32/32` itens ≥95 no mesmo RC.

## 1. Objetivo da construção

Entregar uma plataforma interna de treinamento veterinário, responsiva e auditável, usando TypeScript strict em monorepo modular com `web`/SPA, API autoritativa e worker. O núcleo atende convite/login, conta, currículo, conteúdo autoral, avaliações, progresso, feedback, remediação, retenção e governança clínica.

PostgreSQL será a fonte transacional. Qdrant será um índice interno derivado para busca semântica de autoria/revisão. A IA server-side será assistiva, estruturada e desligável. Nenhuma dessas integrações pode expor fonte, obra, PDF, foto, metadado bibliográfico, gabarito ou decisão interna ao participante.

## 2. Pré-condições do BUILD

- [x] PRD auditado e apto para derivação;
- [x] SPEC 0100–0190 presente e aprovada tecnicamente;
- [x] arquitetura, domínio, contratos, dados e testes definidos;
- [x] baseline PostgreSQL + Qdrant + IA registrada;
- [x] documentação 04.AUDIT completa;
- [x] documentação 05.AGENT_LOOP-SESSION_PERSISTENCE completa;
- [x] documentação 06.SKILL completa;
- [x] documentação 07.AGENTS completa;
- [x] documentação 08.RUNTIME completa;
- [x] gate 03.BUILD/0390 aprovado para iniciar código.

O gate documental foi fechado em 100%; o código está autorizado e cada nova fase possui seu próprio quality gate.

## 3. Escopo executável

### Incluído

- `apps/web`: experiência participante, operação e autoria com DTOs públicos/internos separados;
- `apps/api`: HTTP `/api/v1`, sessão, autorização, casos de uso, serializers e health;
- `apps/worker`: outbox, jobs, retry, retenção, indexação Qdrant e IA assistiva;
- `packages/domain`, `application`, `contracts`, `persistence`, `integrations` e `ui`;
- PostgreSQL, RLS, migrações, auditoria, outbox e dados sintéticos;
- Qdrant com coleção interna versionada, filtro de escopo e reconciliação;
- IA por porta tipada, saída JSON Schema/Zod, timeout, retry e `FakeAiProvider`;
- pipeline de qualidade, testes, rastreabilidade, observabilidade, rollback e smoke.

### Excluído

- código que leia ou distribua PDFs, fotos, OCR, cópias protegidas ou dados reais;
- competência prática, prontuários, tutores, gravações, ranking ou uso em RH;
- microserviços de domínio, Kafka, Redis obrigatório, data warehouse e app nativo;
- decisão clínica, nota, publicação, gabarito ou autorização delegados à IA;
- consulta, contratação, cotação ou gate de fornecedor;
- calibração obrigatória como pré-requisito de construção.

## 4. Organização de execução

```text
PHASE → SPRINT → TASK → TESTE → REVIEW → AUDIT → RELATÓRIO
```

Toda task deve apontar para requisito/decisão/SPEC, arquivos ou módulo, abordagem, dependências, risco, teste e critério de pronto. Toda sprint fecha com validação e auditoria; toda phase fecha com relatório e backlog atualizado.

## 5. Estratégia técnica

1. criar testes antes da implementação em cada caso de uso;
2. manter domínio puro e imutável, sem ORM/framework/SDK;
3. validar `unknown` com Zod na borda e invariantes no domínio;
4. manter PostgreSQL como fonte única, com transação + outbox + auditoria;
5. tratar Qdrant como derivado, reconstruível e isolado por escopo;
6. chamar IA somente server-side, com contexto mínimo/redigido e saída estruturada; embeddings e texto usam adaptadores separados;
7. rodar unitários, integração, contratos, worker, web, E2E e segurança em CI;
8. impedir merge se houver segredo, quebra de contrato, exposição autoral, cobertura abaixo de 80% ou erro de typecheck.

### Estado materializado no F3-S2

- o worker já reserva outbox com lease e `SKIP LOCKED`, processa `content.published.v1`, `content.withdrawn.v1` e `ai.suggestion.requested.v1`, com retry e falha terminal;
- PostgreSQL mantém o texto interno e os rascunhos IA; Qdrant recebe apenas payload vetorial mínimo com hash/IDs/escopo; a IA só opera no servidor e grava `DRAFT_AI` para revisão;
- a rota de transição editorial devolve somente `contentId`, `version` e `status`; a rota de progresso devolve somente a projeção pública;
- teste live PostgreSQL e Qdrant comprova o fluxo sintético; nenhum dado real, foto, PDF, OCR, fonte ou prompt completo foi usado.

### Estado materializado em F3-S3 — identidade, correção e feedback

- convite interno por `ADMIN`, token de uso único com hash no PostgreSQL, ativação transacional e sessão `__Host-` foram implementados;
- correção humana versionada, feedback exclusivo do participante dono e evento de correção sem feedback foram implementados;
- migrações `0005` e `0006` foram aplicadas no PostgreSQL efêmero com dados sintéticos;
- permanecem para o fechamento de produção: web/SPA completo, E2E contra API real, observabilidade externa, RLS contextual, execução operacional conjunta da reconciliação, backup/restore e IA externa controlada.

### Estado materializado em F3-S4 — web participante e E2E

- `apps/web` possui uma primeira superfície participante para aceite de convite, leitura de atividade, iniciar tentativa, salvar resposta e submeter;
- três cenários Playwright passam com fixtures sintéticas: projeção sem campos proibidos, erro público limitado e ciclo iniciar–salvar–submeter;
- o CI instala Chromium e executa `pnpm test:e2e` depois do build; a dependência foi atualizada para `@playwright/test 1.55.1` após correção do alerta de auditoria;
- a superfície não acessa PostgreSQL, Qdrant, IA ou segredos e não expõe fontes, fotos, PDFs, OCR, prompts, gabaritos ou dados reais;
- permanece para o fechamento: navegador contra API real, autoria/operação web, axe/revisão manual, observabilidade externa, execução operacional conjunta da reconciliação, backup/restore e IA externa real.

### Estado materializado em F3-S5 — observabilidade e redaction

- `@cvg/observability` fornece logger JSON tipado, allowlist de campos, validação de correlação, duração limitada e métricas em memória sem fornecedor;
- API e worker registram somente rota/evento/status/resultado/duração e IDs técnicos necessários; payloads, respostas, tokens, fontes, fotos, PDFs, OCR e prompts são descartados;
- testes unitários, API e worker cobrem redaction, filtragem de nível, repetição de métricas, falhas/retry e correlação;
- permanece para o fechamento: exporter/collector OpenTelemetry, retenção/acesso ao sink, alertas/SLOs, dashboards, traces distribuídos, RLS contextual, rate limit compartilhado se houver escala horizontal, execução operacional conjunta da reconciliação e backup/restore.

### Estado materializado em F3-S6 — hardening de borda

- `WEB_ORIGINS` e origem padrão local foram conectados ao servidor API;
- mutações autenticadas com cookie `__Host-cvg_session` passam por CSRF antes do corpo/caso de uso; aceite anônimo de convite permanece disponível;
- rate limit por processo, rota e endereço remoto usa janela/mapa bounded, `429` e `Retry-After`; liveness/readiness são excluídos;
- corpos de requisições rejeitadas são drenados sem chegar à aplicação e a telemetria registra somente rota/status/resultado, sem payload;
- testes unitários e HTTP direcionados passaram; permanece o limite técnico de rate limit distribuído, além de E2E real e observabilidade externa.

### Estado materializado em F3-S7 — reconciliação Qdrant desde PostgreSQL

- a porta interna PostgreSQL lista conteúdo `PUBLICADO` sem expor o texto para API, evento, log ou Qdrant;
- `apps/worker/src/reconcile.ts` calcula o conjunto esperado, compara ID/hash/metadado, atualiza somente divergentes e remove órfãos;
- `VectorStorePort.list` usa `scroll` do Qdrant somente com payload técnico, incluindo versões antigas para remoção segura;
- `runtime.reconcile()` é explícito e repetível, não roda no boot nem altera estado educacional; `pnpm reconcile:qdrant` expõe o runbook sem imprimir conteúdo;
- testes TDD do worker, persistência e adapter Qdrant passam; teste live Qdrant validou `list`/scroll; a composição PostgreSQL+Qdrant completa no runbook continua evidência complementar.

### Estado materializado em F3-S8 — rotação e revogação de sessão

- `POST /api/v1/session/rotate` troca o registro por transação PostgreSQL, preservando no servidor conta, papéis e escopos;
- `POST /api/v1/session/revoke` revoga por hash e entrega cookie expirado de forma uniforme;
- nenhum token, cookie ou payload de sessão entra em Qdrant, IA, log ou envelope de participante;
- testes unitários, contratos, HTTP e PostgreSQL cobrem rotação, invalidação antiga, logout uniforme e campos desconhecidos;
- recuperação por e-mail/terceiro não faz parte do runtime interno; recuperação operacional continua sendo convite administrativo controlado.

## 6. Dependências críticas

| Dependência | Uso | Contingência |
|---|---|---|
| Node.js LTS/pnpm/TypeScript | runtime/build | versão pinada no lockfile |
| PostgreSQL | transação e estado | operação correspondente fica indisponível até recuperação |
| Qdrant | busca interna | busca textual/manual + `INDEX_PENDING` |
| IA | sugestão interna | fluxo manual; núcleo continua |
| Playwright/Vitest | verificação | gate não fecha sem evidência equivalente |

Não existe dependência humana externa de fornecedor. Protocolos clínicos são autoria interna a partir da literatura, com revisão de Ricardo antes da publicação da unidade dependente.

## 7. Riscos e controles

| Risco | Controle |
|---|---|
| monólito desorganizado | limites de import, módulos, contratos, revisão e teste de arquitetura |
| alteração de estado sem trilha | agregado versionado, transação, outbox e auditoria append-only |
| exposição autoral | DTOs separados, redaction, scan de chaves e E2E negativo |
| duplicação de job | idempotency key, lease e teste de replay |
| Qdrant divergente | hash, versão, reconciliação e reconstrução desde PostgreSQL |
| IA inadequada | schema, filtro, fake, timeout, revisão e sem publicação automática |
| migração perigosa | expand/contract, backup/restauração e rollback documentado |

## 8. Estratégia de rollback

- feature flag para Qdrant/IA e desligamento sem impactar o núcleo;
- deploy compatível com migração expand/contract;
- rollback de aplicação para artefato anterior quando schema ainda for compatível;
- rollback de dados por comando compensatório versionado, nunca edição manual;
- restauração PostgreSQL validada em ambiente isolado;
- reconstrução do Qdrant pelo PostgreSQL/outbox;
- conteúdo publicado retirado por estado versionado, preservando histórico;
- todo rollback gera auditoria, `request_id`/`correlation_id` e relatório.

## 9. Critério de sucesso do BUILD

O BUILD só será considerado concluído quando os fluxos críticos passarem em CI e smoke, cobertura global for ≥80%, sem vulnerabilidade crítica/segredo, contratos/migrações forem compatíveis, Qdrant puder ser reconstruído, IA puder ser desligada, trilha requisito→código→teste→commit→artefato estiver completa e o AUDIT não tiver gap crítico aberto.
