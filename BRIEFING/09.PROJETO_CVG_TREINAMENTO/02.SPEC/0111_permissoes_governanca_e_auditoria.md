# 0111 — Permissões, Governança e Auditoria

**Princípio:** negar por padrão, conceder o mínimo necessário e verificar autorização no servidor em toda requisição.

## 1. Papéis e capacidades

| Papel/capacidade | Escopo | Pode fazer | Não pode fazer |
|---|---|---|---|
| `PARTICIPANT` | próprio vínculo | estudar, responder, consultar progresso e relatar problema | ver gabarito, fontes, auditoria ou outro participante |
| `MODERATOR` | participantes/filas atribuídos | triar feedback e acompanhar evolução autorizada | corrigir oficialmente, conceder papel, publicar conteúdo ou consultar fontes completas |
| `ADMIN` | coorte administrativa | convidar, atribuir trilha, gerir contas, operar filas e consultar indicadores | aprovar conteúdo clínico ou alterar nota fora de fluxo |
| `CLINICAL_APPROVER` | conteúdo clínico | aprovar/retirar conteúdo e protocolo interno após revisão | delegar a própria capacidade ou publicar sem versão |
| `AUDITOR` | leitura operacional autorizada | consultar trilhas de auditoria e evidências redigidas | alterar dados, gabaritos, papéis ou conteúdo |
| `AUTHOR` | registros internos atribuídos | redigir conteúdo/protocolo e anexar metadados de construção | publicar, aprovar ou projetar fonte ao participante |

No MVP, `CLINICAL_APPROVER` é concedido somente à identidade de Ricardo no bootstrap controlado. Não existe comitê obrigatório, segunda aprovação ou consulta externa como condição técnica. Revisões adicionais podem ser registradas como contribuição, mas não criam uma etapa operacional obrigatória.

## 2. Autorização em camadas

1. autenticação valida sessão, conta ativa e reautenticação quando o risco exigir;
2. autorização de aplicação verifica capacidade, recurso, escopo e transição permitida;
3. repositório aplica filtro de escopo, nunca aceita `scope_id` confiado pelo navegador;
4. PostgreSQL usa RLS como defesa adicional, com usuário de conexão sem privilégio amplo;
5. serializers públicos possuem tipos distintos dos registros internos;
6. Qdrant só é acessado depois de o escopo ser validado no PostgreSQL;
7. IA só recebe contexto selecionado pelo caso de uso interno e nunca uma sessão de participante.

Toda falha de autorização responde `403` ou `404` conforme a política de não enumeração. Ocultar botão, rota ou menu no web não é controle de segurança.

## 3. Segregação de gabaritos e autoria

- enunciado/projeção participante, resposta correta, rubrica, erro crítico e decisão clínica usam repositórios e DTOs diferentes;
- a API de participante nunca seleciona colunas internas “por conveniência”;
- `source_record_id`, obra, autor, edição, capítulo, página, hash, protocolo, prompt, resposta de IA e decisões internas ficam fora de DTOs, exportações, notificações e analytics de participante;
- qualquer busca interna reidrata o resultado pelo PostgreSQL após verificar papel e escopo;
- a IA pode sugerir texto apenas em `DRAFT` interno; publicação exige o comando humano já definido no domínio.

## 4. Trilha de auditoria

Cada ação sensível cria uma entrada append-only:

```json
{
  "audit_id": "uuid",
  "occurred_at": "iso-8601",
  "principal_id": "uuid",
  "action": "content.publish",
  "resource_type": "content_version",
  "resource_id": "uuid",
  "scope_id": "uuid",
  "outcome": "allowed",
  "reason_code": "clinical_approval",
  "request_id": "uuid",
  "correlation_id": "uuid",
  "before_hash": "sha256",
  "after_hash": "sha256"
}
```

Auditar no mínimo: login/recovery sensível, convite, concessão/revogação, criação/revisão/publicação/retirada, correção, contestação, mudança de regra, indexação, chamada de IA, falha de integração, migração, backup/restauração e alteração operacional. Não gravar senha, token, prompt completo, resposta clínica completa ou conteúdo protegido em log.

## 5. Critérios de auditoria

- toda ação sensível tem `request_id`, principal, recurso, escopo, resultado e versão;
- uma entrada não pode ser alterada pelo fluxo normal da aplicação;
- auditoria de IA registra modelo, versão, hash de entrada/saída, status, latência e uso técnico, sem conteúdo bruto por padrão;
- reconciliação compara eventos, PostgreSQL e Qdrant sem autorizar pelo vetor;
- exportação de auditoria é redigida por papel e registrada como nova ação;
- testes negativos verificam que cada DTO participante rejeita chaves internas, inclusive chaves desconhecidas.

## 6. Identidade interna por convite

- somente `ADMIN` ativo pode criar convite;
- o convite concede apenas papéis e escopos previamente validados pelo contrato;
- o token é aleatório, de uso único, expira e não é persistido em claro;
- aceite sem sessão prévia executa ativação da conta e criação de sessão server-side na mesma transação;
- tentativa inválida ou expirada responde uniformemente `not_found`, sem informar se o e-mail ou convite existiu;
- a rota administrativa é interna e não entrega token a participante, não chama e-mail/fornecedor e não registra o valor em logs;
- correção oficial exige identidade `CLINICAL_APPROVER` aprovada por configuração e escopo correspondente; `ADMIN` não pode alterar nota por atalho.

## 7. Proteção de requisições materializada no BUILD F3-S6

- a borda HTTP aplica CSRF antes de ler ou encaminhar o corpo quando existe cookie de sessão;
- somente origem/referer configurado ou contexto Fetch same-site/same-origin passa para mutações autenticadas;
- o fluxo anônimo de aceite de convite é exceção explícita porque ainda não possui cookie de sessão;
- rate limit local usa chave de endereço remoto + rota, janela limitada, capacidade máxima de chaves e resposta `429` com `Retry-After` como fallback controlado para testes/harness;
- a API composta usa `rate_limit_buckets` no PostgreSQL para compartilhar janela/contador entre réplicas; o bucket é atualizado em transação, tem expiração e não é público;
- liveness/readiness são excluídos do limite para permitir operação e diagnóstico;
- testes cobrem burst, expiração, limite de chaves, origem permitida/malformada, cross-origin e integração na borda HTTP;
- esse controle não substitui recuperação/rotação de sessão ou RLS contextual; o limite compartilhado PostgreSQL é a defesa para serviço replicado.

## 8. Rotação e revogação materializadas no BUILD F3-S8

- `POST /api/v1/session/rotate` usa o cookie atual somente para localizar a sessão ativa, preserva conta/papel/escopo no servidor e troca o hash em transação PostgreSQL;
- se a sessão já foi revogada/expirou, a rotação responde `401` sem indicar a causa;
- `POST /api/v1/session/revoke` é uniforme, grava somente o hash quando válido e sempre entrega cookie expirado;
- ambos são mutações submetidas ao guard CSRF/rate limit; nenhum caminho envia cookie, token ou texto de sessão a Qdrant, IA, log ou projeção participante;
- o fluxo é interno e não depende de e-mail, fornecedor, consulta externa ou calibração.

## 8.1 Hardening contextual materializado no BUILD

- `packages/persistence/src/security-context.ts` normaliza contexto não vazio e usa `set_config` transacional para `cvg.participant_id` e `cvg.scope_id`;
- a migration `0012_secure_participant_rls.sql` aplica `ENABLE/FORCE ROW LEVEL SECURITY` e policies de participante/escopo a `activity_assignments`, `curriculum_runtime_states`, `attempts`, `answers`, idempotências de tentativa/resposta, resultados e idempotência de avaliação;
- contexto ausente nega leitura/escrita; contexto de participante restringe a própria identidade e contexto de escopo limita os caminhos operacionais associados às atividades do escopo;
- repositórios protegidos só executam dentro de transação com o contexto aplicado antes da consulta; a aplicação não trata filtro de frontend como autorização;
- `requireLeastPrivilege` consulta `pg_roles` no healthcheck e rejeita role `SUPERUSER` ou `BYPASSRLS`; produção liga essa exigência por configuração;
- `0013_shared_rate_limit.sql` e `createPostgresRateLimiter` mantêm bucket transacional PostgreSQL para o limite compartilhado entre instâncias; a borda HTTP continua aplicando CSRF/origem antes do caso de uso;
- o escopo cobre a fatia participante/execução protegida. Tabelas editoriais e administrativas adicionais, grants de produção, backup/restore e runbook permanecem nos respectivos itens de operação e jornada.

## 9. Governança editorial materializada no item 10

- `VIEW_INTERNAL_SOURCE` exige autor ou identidade clínica aprovada e escopo correspondente;
- `MODERATE_CONTENT` permite solicitar ajustes, mas não substitui `APPROVE_CLINICAL_CONTENT`;
- `APPROVE_CLINICAL_CONTENT` exige `CLINICAL_APPROVER`, identidade aprovada por configuração e escopo;
- o autor não pode aprovar o próprio registro;
- cada decisão grava revisor, justificativa, correlação e data no PostgreSQL e alimenta a auditoria de transição;
- `publicationReady` é derivado do preflight e da última aprovação, nunca de IA, Qdrant ou frontend;
- a fonte, gabarito e rubrica são internos e ficam fora de contratos/projeções do participante;
- aprovação técnica não equivale à aprovação clínica de Ricardo nem à competência prática.
