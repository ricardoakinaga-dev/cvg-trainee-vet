# 0112 — Integrações e Dependências

## 1. Baseline adotada

As dependências-base são adotadas diretamente para o BUILD, sem etapa de consulta, cotação ou seleção de fornecedor:

| Dependência | Implementação inicial | Responsabilidade | Regra de isolamento |
|---|---|---|---|
| PostgreSQL | Drizzle ORM + driver PostgreSQL | estado transacional, relações, RLS, outbox e auditoria | fonte de verdade; acessado por repositórios |
| Qdrant | cliente TypeScript `@qdrant/js-client-rest` | índice semântico interno e busca de autoria/revisão | derivado, reconstruível e nunca autorização |
| IA | adaptadores server-side para OpenAI Responses API e Embeddings API | sugestões estruturadas de autoria/revisão e vetorização | sem chamada do browser; sem autoridade de estado |
| identidade | `AuthPort` atrás de adaptador de sessão | convite, login, recuperação, MFA e revogação | domínio não conhece SDK |
| telemetria | OpenTelemetry + logs estruturados | logs, métricas, traces e saúde | redaction central obrigatório |

O domínio conhece somente portas (`DatabasePort`, `VectorSearchPort`, `EmbeddingPort`, `AiTextPort`, `AuthPort` e `Clock`). SDKs e URLs ficam em `apps/api`/`apps/worker` e nos adaptadores. A implementação inicial materializa essa fronteira em `packages/persistence` e `packages/integrations`; API e worker montam os adaptadores server-side por `createServerIntegrations`.

## 2. PostgreSQL

- conexão somente server-side, pool limitado e timeouts explícitos;
- migrações versionadas e executadas pelo pipeline, nunca pelo navegador;
- transações cobrem mudança de estado + auditoria + outbox;
- prepared statements/ORM tipado e schema validation impedem SQL construído com entrada;
- backups, restauração e verificação de RPO/RTO pertencem à operação;
- ambiente de teste usa banco efêmero com seed sintético idempotente.

### 2.1 Isolamento e limite compartilhado materializados

- a migration `0012_secure_participant_rls.sql` e o contexto transacional da aplicação protegem os caminhos de participante, tentativa, resposta e resultado com RLS contextual;
- a configuração de produção exige healthcheck com role sem `SUPERUSER` e sem `BYPASSRLS` quando `requireLeastPrivilege` está ativo;
- a migration `0013_shared_rate_limit.sql` cria o bucket PostgreSQL para janela/contador compartilhados entre réplicas; o fallback local permanece limitado ao harness e a cenários sem composição persistida;
- nenhum desses componentes aceita autorização, escopo ou identidade confiados pelo navegador.

## 3. Qdrant

Coleção inicial: `cvg_internal_knowledge_v1`. O worker confirma configuração de dimensão, distância e modelo antes de indexar. Cada ponto tem ID determinístico e payload mínimo:

```json
{
  "index_version": "v1",
  "embedding_model": "configured-model",
  "visibility": "INTERNAL",
  "status": "APPROVED_FOR_INTERNAL_SEARCH",
  "knowledge_id": "uuid",
  "section_id": "uuid",
  "scope_id": "uuid",
  "content_hash": "sha256",
}
```

O payload não contém texto bruto, PDF, foto, OCR, trecho protegido, link bibliográfico, dado real ou gabarito. A coleção é criada com a dimensão configurada e índices de payload para `index_version`, `visibility`, `status` e `scope_id`. O adaptador valida a dimensão, filtra a versão do índice, visibilidade, status e escopo, e retorna somente IDs, hash e score; o conteúdo autorizado é reidratado no PostgreSQL e redigido pelo caso de uso. Se Qdrant estiver indisponível, a construção continua com busca textual/manual e o item fica `INDEX_PENDING`.

Operações permitidas: criar coleção, criar índice de payload necessário, upsert idempotente, busca com filtro, remover ponto de versão retirada e reconciliação. Nenhuma tela se conecta diretamente ao Qdrant.

## 4. IA server-side

O adaptador inicial usa a Responses API com saída estruturada por JSON Schema e a Embeddings API para vetores. A IA pode:

- sugerir objetivos, enunciados, distratores, rubricas ou feedback para um autor;
- resumir um registro autoral já autorizado para revisão interna;
- classificar um relato técnico para triagem operacional.

A IA não pode: aprovar conteúdo, criar protocolo clínico automaticamente, definir gabarito final, corrigir oficialmente, alterar nota, conceder acesso, chamar ferramentas externas não declaradas ou enviar resposta direta ao participante.

Controles obrigatórios:

1. `AI_API_KEY` e `EMBEDDING_API_KEY` somente no ambiente server-side; quando explicitamente configurado, a chave de IA pode ser reutilizada apenas para embeddings;
2. modelo e versão definidos por configuração auditável, nunca escolhidos pelo usuário;
3. contexto mínimo e redigido; não enviar PDF, foto, OCR, cópia protegida, dado real ou catálogo bibliográfico bruto;
4. timeout de cliente, limite de tamanho, `maxRetries=0` no adaptador inicial e evolução posterior para retry/circuit breaker no worker;
5. saída validada por schema, filtros de conteúdo e estado `DRAFT_AI`;
6. refusal, timeout ou schema inválido viram falha recuperável sem efeito no domínio;
7. prompt/resposta completos não entram em log; persistir somente hashes, modelo, versão, status e métricas técnicas por padrão;
8. testes usam `FakeAiProvider` determinístico e nunca chave real.

## 5. Fluxo de integração

```text
API/caso de uso interno
  → transação PostgreSQL + outbox
  → worker reserva evento com lease
  → redaction + validação de escopo
  → embedding/Qdrant ou IA
  → resultado validado + auditoria técnica
  → reidratação PostgreSQL
  → autor/revisor interno
```

Qdrant e IA não participam do caminho crítico de salvar resposta, submeter tentativa, corrigir, calcular resultado, publicar ou retirar conteúdo. PostgreSQL indisponível bloqueia a operação correspondente; Qdrant/IA indisponíveis degradam apenas os recursos internos assistivos.

## 6. Contrato de falhas e contingência

| Falha | Estado | Recuperação |
|---|---|---|
| PostgreSQL | `NOT_READY` | não aceitar escrita; reabrir após healthcheck e transação de verificação |
| Qdrant timeout | `INDEX_PENDING`/`DEGRADED` | retry limitado e reconciliação a partir do outbox |
| dimensão/modelo incompatível | `INDEX_BLOCKED` | corrigir configuração ou criar nova coleção versionada |
| IA timeout/429 | `AI_RETRYABLE` | retry com backoff; depois fallback manual |
| IA schema/refusal | `AI_INVALID` | descartar saída, registrar hash/status e permitir nova solicitação |
| segredo ausente | `CONFIG_INVALID` | não iniciar worker da integração; mensagem sem revelar segredo |
| rede externa indisponível | `DEGRADED` | núcleo educacional continua operacional |

Variáveis obrigatórias e não secretas ficam em `.env.example`; valores reais nunca são commitados:

```text
DATABASE_URL=
QDRANT_URL=
QDRANT_API_KEY=
QDRANT_COLLECTION=cvg_internal_knowledge_v1
QDRANT_INDEX_VERSION=v1
EMBEDDING_MODEL=
EMBEDDING_DIMENSION=
EMBEDDING_API_KEY=
AI_PROVIDER=openai
AI_API_KEY=
AI_MODEL=
AI_ENABLED=false
```

## 7. Implementação verificada no BUILD F2-S2/F3-S2/F3-S3

- `createServerIntegrations` monta PostgreSQL, Qdrant, embeddings e IA somente no servidor;
- `initialize` inicia a preparação da coleção Qdrant habilitada de forma não bloqueante para API/worker; falha ou atraso mantém o núcleo disponível e agenda retry cancelável, enquanto `healthcheck` agregado consulta PostgreSQL e Qdrant sem enviar conteúdo clínico;
- a API usa sessão server-side por cookie `__Host-cvg_session`, armazena somente hash do token e consulta a conta ativa no PostgreSQL;
- salvar resposta executa tentativa, resposta, idempotência, outbox e auditoria na mesma transação PostgreSQL; o evento/auditoria carregam apenas IDs, estado, hash/metadados técnicos e correlação;
- a projeção participante pode devolver somente a própria resposta autorizada; campos de autoria, fonte, foto, PDF, OCR, prompt, gabarito e resposta de IA são bloqueados por contratos/mapper/redaction;
- o worker reserva eventos com `FOR UPDATE SKIP LOCKED`, lease expirável, retry exponencial limitado e estado terminal `FAILED`; o processamento só marca o evento como concluído depois do efeito bem-sucedido;
- `content.published.v1` reidrata texto publicado somente no worker, gera embedding e grava no Qdrant um ponto determinístico com IDs, escopo, hash e estado; `content.withdrawn.v1` remove o ponto da versão retirada;
- `ai.suggestion.requested.v1` usa saída estruturada, validação de texto simples e sink interno `DRAFT_AI`; o rascunho é revisável e não é publicado, corrigido oficialmente ou enviado à projeção participante;
- a migração `0004_outstanding_green_goblin.sql` cria a persistência mínima da sugestão assistiva com unicidade por conteúdo/versão e sem campos bibliográficos, fotográficos ou de origem;
- evidência: testes live PostgreSQL de tentativa/resposta/sessão/auditoria, conteúdo/publicação, outbox/worker/sink de IA, teste live Qdrant e readiness HTTP com Qdrant habilitado; a reconciliação não vazia foi fechada posteriormente pelo item 11, enquanto RLS contextual, métricas/traces, E2E web e chamada externa real de IA permanecem fases seguintes.

## 8. Limite de exposição da integração

O texto clínico de `content_versions.participant_text` existe apenas como fonte transacional interna para a atividade publicada e para a reidratação controlada do worker. Ele não é colocado em payload de outbox, payload de Qdrant, log, evento de auditoria ou DTO da API. A evidência usa textos sintéticos/redigidos; fotos, PDFs, OCR, prompts completos, fontes e dados reais não entram no fluxo de construção nem são expostos ao usuário.

## 9. Identidade e correção na mesma fronteira de integração

- `account_invitations` é PostgreSQL-only: a API recebe o token administrativo em uma resposta interna única, mas o repositório grava somente seu hash SHA-256;
- aceite não chama Qdrant nem IA: consulta o hash, ativa a conta, marca o convite aceito e cria a sessão dentro de uma transação PostgreSQL;
- correção humana não depende de fornecedor: o resultado é validado no domínio, versionado no PostgreSQL e emitido ao outbox somente com metadados de estado/nota/outcome/versão;
- feedback é reidratado pelo PostgreSQL usando `participant_id + attempt_id`; Qdrant e IA nunca são fonte de feedback ou autorização;
- a IA continua exclusivamente assistiva: pode produzir `DRAFT_AI`, nunca nota oficial, publicação, autorização, convite ou sessão.

## 9.1. Identidade server-side sem dependência assistiva

Rotação e revogação de sessão são PostgreSQL-only. O token é lido somente na borda de autenticação, convertido em SHA-256 e nunca persistido em claro. A rotação revoga o registro anterior e insere o novo dentro da mesma transação; o cookie novo é devolvido exclusivamente pela API. Qdrant, embeddings e IA não participam desse caminho.

## 10. Reconciliação do índice derivado materializada no BUILD F3-S7

- o worker expõe `reconcileVectorIndex`/`runtime.reconcile` como operação explícita, fora do caminho crítico da API;
- PostgreSQL lista as versões `PUBLICADO` por uma porta interna bounded; o limite de 10.000 registros faz a operação falhar fechada, sem reconciliar parcialmente, se o runtime interno excedê-lo;
- o worker calcula embeddings server-side, gera o ponto determinístico `contentId:version`, calcula hash do texto e envia ao Qdrant somente vetor + IDs/hash/escopo/estado;
- Qdrant oferece `list` por `scroll` somente com metadados internos, sem vetor retornado ao domínio e sem texto;
- pontos ausentes ou com hash/metadado divergente são atualizados; pontos órfãos, inclusive versões antigas presentes na coleção, são removidos;
- PostgreSQL continua a autoridade: falha de Qdrant/embedding não altera estado educacional e a operação pode ser repetida;
- a reconciliação não é chamada automaticamente no boot para evitar custo externo inesperado; deve ser executada pelo runbook `pnpm reconcile:qdrant` quando houver alerta de `INDEX_PENDING`/divergência, e esse comando aguarda explicitamente a preparação/validação da coleção antes de comparar ou alterar pontos;

Evidência: testes unitários do worker/Qdrant/persistência e teste live Qdrant de `scroll/list`; o fluxo completo contra PostgreSQL + Qdrant no mesmo comando operacional continua como complemento de runtime.

## 11. Evidência executável da resiliência — item 11

O cenário live `tests/integration/worker-qdrant-live.test.ts` agora exercita PostgreSQL e uma coleção Qdrant descartável com conteúdo publicado não vazio. O teste semeia um ponto divergente e um órfão, confirma a reconciliação `expected:2`, `upserted:2`, `removed:1`, repete a operação sem novos efeitos, altera hash por mudança de texto, repete publish com ID determinístico e remove uma versão retirada. A lista do vetor contém somente metadados internos.

`tests/integration/postgres-worker.test.ts` confirma reclaim de lease expirado, retry limitado e dead-letter. `apps/worker/src/handlers.ts` reconhece sete tipos de evento; os eventos de aprendizagem sem efeito de integração são no-op explícitos. Provider produtivo, telemetria externa, restart observável, restore e carga permanecem fora desta prova.
