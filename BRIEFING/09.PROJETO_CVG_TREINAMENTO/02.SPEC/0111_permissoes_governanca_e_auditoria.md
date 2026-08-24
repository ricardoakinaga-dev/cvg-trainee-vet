# 0111 — Permissões, Governança e Auditoria

**Princípio:** negar por padrão, conceder o mínimo necessário e verificar autorização no servidor em toda requisição.

## 1. Papéis e capacidades

| Papel/capacidade | Escopo | Pode fazer | Não pode fazer |
|---|---|---|---|
| `PARTICIPANT` | próprio vínculo | estudar, responder, consultar progresso, acompanhar protocolos próprios e relatar problema | ver gabarito, fontes, auditoria ou outro participante |
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

`VIEW_PROGRAM_METRICS` é uma capacidade de leitura interna para `ADMIN`,
`MODERATOR` e a identidade clínica aprovada, sempre com conta ativa e escopo
correspondente. Ela permite os relatórios agregados de participação digital e
reflexão por escopo/módulo, mas não concede leitura de resposta livre, identidade
individual fora do mínimo operacional, alteração de atribuição, nota, gabarito,
conteúdo, papel ou competência.

`VIEW_OWN_APPEALS` é uma capacidade participante separada de
`CREATE_APPEAL`: exige conta `ACTIVE`, papel `PARTICIPANT`, `ownerId` igual ao
principal e escopo presente na sessão. Ela só permite ler protocolos vinculados
à tentativa própria. A projeção não contém justificativa, `reviewerId`, resposta,
score, gabarito, fontes ou competência prática. `REVIEW_APPEAL` continua
restrita a equipe interna escopada e não é concedida por alterar a URL.

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
  "actor_kind": "AUTHENTICATED",
  "principal_id": "uuid|null",
  "action": "content.publish",
  "resource_type": "content_version",
  "resource_id": "uuid|normalized-route|null",
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

- toda ação sensível tem `request_id`, ator (`principal_id` quando autenticado ou `actor_kind=ANONYMOUS`), recurso, escopo quando aplicável, resultado e versão;
- rejeições de autenticação, autorização, não enumeração, validação, rate limit e falhas internas passam pela borda HTTP e criam auditoria negativa; o recurso HTTP usa rota normalizada, nunca caminho bruto, cookie, token ou corpo;
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
- o reenvio de convite copia somente o escopo explicitamente autorizado na requisição, nunca a união de memberships persistidos; reenvios concorrentes da mesma conta são serializados na transação para manter um único convite não aceito vigente;
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

## 7.1 Recuperação controlada materializada no BUILD — ACCOUNT-RECOVERY-028

- somente uma sessão interna com `MANAGE_ACCOUNT_LIFECYCLE` e escopo presente pode emitir recuperação para outra conta;
- a conta alvo deve estar `ACTIVE`; o fluxo não reativa `INVITED`, `SUSPENDED` ou `DEACTIVATED` e não substitui decisão administrativa;
- o link é aleatório, expirável, de uso único e armazenado somente como hash SHA-256; nova emissão revoga links anteriores do mesmo alvo/escopo;
- a emissão revoga sessões abertas do alvo na mesma transação e registra apenas metadados redigidos na auditoria; token bruto, cookie e senha não entram em log, auditoria, Qdrant ou IA;
- o aceite anônimo usa comparação por hash e consumo atômico, cria uma sessão nova com snapshot server-side de papéis/escopos e responde somente `{status:"active"}` com cookie seguro;
- token inválido, expirado, revogado ou consumido usa resposta uniforme `not_found`; não há enumeração de conta, e-mail ou estado;
- o MVP não implementa senha, MFA, provedor gerenciado, e-mail ou entrega externa; esses adapters e o runbook operacional permanecem gates de produção;
- a migration `0021_audit_anonymous_rejections.sql` adiciona `actor_kind`, permite `principal_id`/`resource_id` nulos somente para rejeições anônimas e converte o recurso textual para permitir a rota normalizada sem UUID sentinela; a tabela permanece `ENABLE/FORCE RLS` e append-only;
- `account_invitations` e `account_recovery_requests` agora usam `ENABLE/FORCE RLS` na migration `0019_identity_token_rls.sql`: operações internas exigem `cvg.scope_id`, e aceite anônimo só alcança o hash apresentado por contexto transacional `cvg.invitation_token_hash`/`cvg.recovery_token_hash`;
- `accounts` e `sessions` usam `ENABLE/FORCE RLS` na migration `0020_identity_accounts_sessions_rls.sql`: contas só são inseridas com `cvg.account_provisioning_id` para o alvo convidado; contas existentes são alcançadas por escopo, hash de convite/recuperação ou hash de sessão; sessões são lidas/atualizadas por `cvg.session_token_hash` ou escopo e inseridas somente com snapshot que contém o escopo transacional. `create`, `findActive`, `revoke` e `rotate` estabelecem o contexto na mesma transação da operação. A auditoria negativa uniforme foi materializada na migration `0021_audit_anonymous_rejections.sql`; grants/ownership de produção, rotação de credenciais e operação real continuam gates separados; a autorização server-side permanece a fonte de decisão.

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
- com `requireLeastPrivilege=true`, o healthcheck também rejeita `CREATEROLE`, `CREATEDB`, `CREATE` no schema `public` e qualquer relação do schema público pertencente à role de aplicação; migrations devem rodar com owner separado e a aplicação deve receber somente os grants operacionais provisionados pelo ambiente;
- `0013_shared_rate_limit.sql` e `createPostgresRateLimiter` mantêm bucket transacional PostgreSQL para o limite compartilhado entre instâncias; a borda HTTP continua aplicando CSRF/origem antes do caso de uso;
- a migration `0017_editorial_scope_rls.sql` aplica `ENABLE/FORCE ROW LEVEL SECURITY` a `content_editorial_records` e `content_review_decisions`; contexto ausente não lê nem grava material editorial, e a fila/autoria aplicam o `scopeId` em transação antes de consultar;
- o agregado interno de reflexão não amplia a leitura staff de `answers`: o repositório primeiro enumera somente participantes pertencentes ao escopo e, na mesma transação, usa contexto `{cvg.scope_id, cvg.participant_id}` para selecionar apenas `answers.item_id`; `answers.response` nunca é selecionado nem serializado;
- `VIEW_CONTENT_REVIEW_QUEUE` é separado de moderação/aprovação/publicação; `AUTHOR` vê somente seus registros, enquanto equipe escopada recebe a fila operacional. `VIEW_INTERNAL_SCOPES` retorna apenas memberships já presentes na sessão, sem permitir fabricar escopo;
- o escopo protegido cobre execução e material editorial. Tabelas de identidade/administrativas adicionais, grants de produção, backup/restore e runbook permanecem nos respectivos itens de operação e jornada.

## 9. Governança editorial materializada no item 10

- `VIEW_INTERNAL_SOURCE` exige autor ou identidade clínica aprovada e escopo correspondente;
- `MODERATE_CONTENT` permite solicitar ajustes, mas não substitui `APPROVE_CLINICAL_CONTENT`;
- `APPROVE_CLINICAL_CONTENT` exige `CLINICAL_APPROVER`, identidade aprovada por configuração e escopo;
- o autor não pode aprovar o próprio registro;
- cada decisão grava revisor, justificativa, correlação e data no PostgreSQL e alimenta a auditoria de transição;
- `publicationReady` é derivado do preflight e da última aprovação, nunca de IA, Qdrant ou frontend;
- a fonte, gabarito e rubrica são internos e ficam fora de contratos/projeções do participante;
- aprovação técnica não equivale à aprovação clínica de Ricardo nem à competência prática.

`VIEW_CONTENT_REVIEW_QUEUE` é uma capability separada para leitura da fila
editorial. Exige conta `ACTIVE`, papel `AUTHOR`, `MODERATOR`, `ADMIN` ou
identidade clínica aprovada, além de `scopeId` presente nos escopos da sessão.
O resultado é uma projeção operacional redigida; possuir essa capability não
concede `MODERATE_CONTENT`, `APPROVE_CLINICAL_CONTENT` ou `PUBLISH_CONTENT`.
Reenvio, decisão clínica e publicação continuam casos de uso distintos e
autorizados no servidor.

## 9.1 Contexto de revisão de contestação — APPEAL-037

`REVIEW_APPEAL` é uma capability interna separada de `CREATE_APPEAL` e
`VIEW_OWN_APPEALS`. Exige conta `ACTIVE`, `MODERATOR`/`ADMIN` ou identidade
clínica aprovada e `scopeId` presente nos escopos da sessão; `PARTICIPANT` e
`AUTHOR` não obtêm acesso por URL. A capability somente autoriza a query de
triagem: atribuição, decisão, recálculo, publicação e notificação continuam
comandos independentes.

Como `appeals` já possui policy de participante/escopo, a migration
`0022_appeal_review_queue_rls.sql` adiciona uma policy `SELECT` separada que
exige `cvg.appeal_review_scope_id = scope_id`. O repositório define esse GUC
como `LOCAL` na transação antes do `SELECT`, limpa identidade de participante e
limpa os demais contextos sensíveis. Os setters de participante, sessão,
convite, recuperação e provisionamento também limpam o contexto de revisão;
assim, um contexto não pode vazar entre operações. Nenhuma policy de escrita é
adicionada pela fila de leitura; PostgreSQL continua sendo a autoridade
transacional.

A projeção interna inclui apenas metadados mínimos para localizar/triá-las: IDs
operacionais, justificativa, datas, estado, versão e metadados opcionais de
revisor/decisão. Resposta, pontuação, gabarito, fonte, prompt, rubrica e
alegação de competência prática permanecem fora do `SELECT`, DTO, web e logs.

## 9.2 Transição segura de contestação — APPEAL-038

`REVIEW_APPEAL` também protege a mutação interna, mas a capability de escopo não
substitui a vinculação do ator. `ATRIBUIR_REVISOR` grava somente o principal
autenticado como revisor; `DECIDIR` e `SOLICITAR_RECALCULO` falham com `403` se o
principal não for o revisor persistido. O corpo não pode fabricar
`participantId` ou `reviewerId`, e um escopo autorizado não libera protocolos de
outro escopo.

A migration `0023_appeal_review_transition_rls.sql` adiciona policy `UPDATE`
para `cvg.appeal_review_scope_id`, em complemento à policy `SELECT` da 0022, e
restringe o contexto de participante a `SELECT`/`INSERT`. O port de transição
usa predicado de versão otimista e escreve apenas estado/versionamento e
metadados de revisão permitidos; não altera participante, tentativa, item ou
justificativa. `CONCLUIR_RECALCULO` e `ENCERRAR` permanecem fora da rota e o
evento de encerramento direto foi removido do domínio até haver recálculo real,
preservação de versões e trilha de auditoria consultável. A marca
`RECALCULO_PENDENTE` não equivale a nota, aprovação clínica ou competência
prática.

## 9.3 Metadados protegidos de decisão — APPEAL-039

`DECIDIR` exige rationale plain text bounded. `decisionAt` e
`decisionCorrelationId` são gerados pelo servidor e persistidos no PostgreSQL
com a decisão, sob a allowlist do port de revisão e o contexto
`cvg.appeal_review_scope_id`. O cliente não escolhe esses valores nem pode
alterar `participantId`, tentativa, item ou justificativa do protocolo.

Os três campos podem aparecer somente na projeção interna da fila, após
`REVIEW_APPEAL` e escopo autorizado. A projeção participante e os logs públicos
não os recebem. Esses metadados não são apresentados como histórico append-only:
backfill/validação de registros legados, trilha imutável, snapshots, recálculo,
notificação e encerramento permanecem gaps posteriores e exigem ambiente ou
decisão autorizada.

## 9.4 Atribuição adaptativa e identidade server-side — ADAPTIVE-044

`MANAGE_LEARNING_ASSIGNMENTS` protege a rota interna de materialização e exige
conta ativa, papel interno permitido e `scopeId` presente na sessão. O corpo
não aceita `participantId`; o caso de uso reidrata o diagnóstico pelo
`diagnosticResultId + scopeId` e o adapter deriva a identidade da linha
persistida. Assim, escopo autorizado não se converte em permissão para escolher
outro participante.

O contexto PostgreSQL de escopo é aplicado antes de selecionar o resultado; o
contexto de participante + escopo é aplicado antes de selecionar ou mutar
`learning_assignments`. A saída passa por schema público separado e remove
identidade, autoria, gabarito, fonte, rubrica, prompt, objetivo interno e
competência prática. A recomendação somente adiciona módulos; não remove o
núcleo obrigatório, não altera nota e não publica conteúdo.

Auditoria operacional detalhada de cada materialização, métricas distribuídas,
grants/owners produtivos e prova RLS live continuam gates de ambiente e não são
simulados por esta implementação local.

Na relação `JOURNEY-REL-001`, o vínculo interno usa FKs e é escrito dentro da
mesma transação que a atribuição adaptativa. O contexto de participante + escopo
continua aplicado antes das leituras/escritas; a rota e a projeção não recebem
nem devolvem `learningAssignmentId` ou `sourceDiagnosticResultId`. O reparo de
uma linha de atividade legada só preenche uma proveniência nula e preserva seu
status. A confirmação com papel PostgreSQL sem `SUPERUSER`/`BYPASSRLS`, rollback e
concorrência real ainda depende do ambiente de teste autorizado.

Na extensão `JOURNEY-REL-002`, a transição posterior do assignment sincroniza
`activity_assignments.status` somente por `learning_assignment_id`, identidade
do participante e conjunto de atividades `PUBLISHED` no escopo transacional.
Linhas legadas sem provenance e atividades retiradas não entram na escrita. A
policy de `UPDATE` da migration `0026_assignment_activity_provenance.sql`
continua exigindo a correspondência assignment–atividade–módulo e o contexto de
RLS; uma rejeição deve abortar a transação inteira. O cenário com papel sem
`SUPERUSER`/`BYPASSRLS` foi observado no live sintético; rollback provocado por
policy independente e concorrência permanecem dependentes de ambiente
autorizado.

Atualização de evidência: o cenário PostgreSQL efêmero confirmou a policy com
role de aplicação `NOSUPERUSER/NOBYPASSRLS` e fixture administrativa separada
`NOSUPERUSER/BYPASSRLS/CREATEROLE`. A tentativa de vínculo publicado com módulo
incompatível falha fechada e preserva o status anterior do assignment. O script
`scripts/provision-ci-postgres.mjs` reproduz a separação no CI; isso não substitui
grants/ownership, rotação de credenciais, observabilidade ou restore do ambiente
produtivo.
