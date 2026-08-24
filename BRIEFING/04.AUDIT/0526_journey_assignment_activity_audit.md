# Auditoria JOURNEY-REL-001 — vínculo assignment → atividade

**Data:** 2026-08-24

**Escopo:** materialização adaptativa local, persistência, contrato curricular,
proveniência e evidência de jornada

**Classificação:** PASS LOCAL WITH GAPS

**Não é:** prova de produção, aprovação clínica, aplicação real do B-07 ou
declaração de competência prática

## 1. Resultado executivo

O fluxo adaptativo agora liga `learning_assignments` a atividades publicadas
somente quando existe `learning_activities.module_id` explícito e válido. A
atividade não é escolhida por slug, título ou ordem. A atribuição de módulo, a
origem `source_diagnostic_result_id` e o vínculo `learning_assignment_id` são
persistidos na mesma transação PostgreSQL; replay não duplica linhas e uma linha
legada sem provenance recebe apenas o vínculo, preservando seu status de
progresso.

O complemento `AUTHORING-ACTIVITY-001` fecha a materialização anterior ao
assignment: a publicação editorial agora cria/recupera uma atividade pela chave
explícita `scopeId + moduleId + sessionId` e liga todos os itens atualmente
`PUBLICADO` por ordinal. A publicação clínica continua sendo decidida pelo caso
de uso e por autoridade humana; a projeção não é uma aprovação adicional.

Atividades antigas sem `module_id` continuam deliberadamente inelegíveis. Isso
evita transformar uma convenção de nome em autorização curricular e mantém a
publicação clínica independente da operação adaptativa.

## 2. Evidência implementada

| Camada | Evidência | Resultado |
|---|---|---|
| Currículo | `ParticipantActivity`/seed de módulo transporta `moduleId`; diagnóstico continua sem módulo | explícito, sem inferência por slug |
| Banco | migration `0026_assignment_activity_provenance.sql` adiciona coluna curricular, FKs, índices e checks | aditivo e compatível com linhas legadas |
| Persistência | `adaptive-assignment-repository.ts` consulta atividades publicadas por escopo+módulo com item `PUBLICADO` e materializa `activity_assignments` na transação existente | vínculo e provenance server-side |
| Replay | `onConflictDoUpdate` só preenche `learningAssignmentId` nulo | não altera progresso já iniciado |
| Contrato público | resposta interna de atribuição permanece allowlisted | nenhum ID de participante, diagnóstico de origem ou provenance é exposto |
| Jornada | `journey-repository.ts` continua lendo atividade somente pela atribuição de atividade autorizada | CTA permanece server-side |

## 3. Complemento AUTHORING-ACTIVITY-001 — authoring → atividade

| Camada | Evidência | Resultado |
|---|---|---|
| Identidade | `learning_activities.session_id`, índice único por escopo/módulo/sessão e checks `Mxx-S[1-4]` | sessão explícita, sem inferência por slug |
| Publicação | `content-repository.ts` materializa somente ao salvar `PUBLICADO`, no contexto transacional do caso de uso | conteúdo, escopo e versão conferidos antes da projeção |
| Itens | `learning_activity_items` recebe somente versões `PUBLICADO`, ordinal 1–100 e `on conflict` bounded | replay sequencial e concorrente idempotente |
| Falha fechada | mismatch editorial, módulo/sessão inválidos, duplicidade, vínculo em outra atividade, escrita incompleta ou item extra | erro antes de aceitar projeção inconsistente; a transação externa reverte |
| Banco | migrations `0028`, `0029` e `0030`; `ENABLE/FORCE RLS` nas tabelas da projeção | role app sem bypass lê/escreve somente o contexto permitido |
| Boundary | policies de escopo/participante e functions SQL booleanas `SECURITY DEFINER` | sem recursão RLS e sem retorno de payload interno |

## 4. TDD e verificações

- RED focal: o teste de atividade mapeada falhou quando o repositório ainda
  persistia somente `learning_assignments`.
- GREEN focal: cinco testes de persistência passaram, incluindo vínculo
  explícito, atividade legada sem módulo, replay e reparo sem alteração de
  status.
- `tests/integration/postgres-adaptive-assignment.test.ts` contém dois testes
  PostgreSQL live para provenance, replay e cadeia assignment→atividade; os dois
  passaram no banco efêmero com role de aplicação sem bypass e cleanup admin.
- `packages/persistence/src/content-repository.test.ts` passou 18/18 cenários,
  incluindo sessão incompatível, duplicidade, vínculo cruzado, item inesperado e
  replay idempotente.
- `tests/integration/postgres-authoring-workflow.test.ts` passou 1/1 no
  PostgreSQL live: publicação, RLS entre escopos, replay e duas transações
  concorrentes produziram uma atividade e dois itens ordenados.
- A suíte `tests/integration/postgres-worker.test.ts` passou 4/4 após tornar o
  fixture de lease determinístico; a suíte live completa passou 31 arquivos/50
  testes.
- `pnpm --filter @cvg/persistence typecheck` e
  `pnpm --filter @cvg/curriculum typecheck` passaram.
- `pnpm test:coverage` passou com 125 arquivos/592 testes/33 skips e cobertura
  84,57% statements, 80,50% branches, 86,08% functions e 85,30% lines.
- `pnpm verify:migrations` passou com 31 migrations e índice 0030 como último.
- O conteúdo de seed M02 foi verificado sem publicação automática e sem fontes,
  gabaritos ou dados reais.

## 5. Segurança e invariantes

- O servidor deriva participante, escopo e disponibilidade do diagnóstico
  persistido; o cliente não escolhe identidade, módulo ou atividade.
- A relação exige escopo coincidente, módulo válido e status `PUBLISHED`.
- A consulta exige ao menos um item de conteúdo `PUBLICADO`; atividade vazia ou
  sem conteúdo participante publicável não é escolhida.
- FKs impedem provenance órfã; a transação impede concluir somente metade da
  materialização quando o banco rejeita uma escrita.
- A publicação autoral valida o conjunto exato de itens persistidos: mapeamentos
  inesperados não são aceitos nem removidos silenciosamente.
- A migration adiciona policies `INSERT`/`UPDATE` limitadas ao contexto
  participante+escopo e à correspondência atividade–assignment.
- `learningAssignmentId` e `sourceDiagnosticResultId` permanecem internos e
  não entram nos contratos da participante.
- PostgreSQL segue autoridade; Qdrant e IA não participam da decisão.

## 6. Gaps e próxima ação

A suíte PostgreSQL live efêmera confirmou a cadeia de provenance, a
materialização authoring→atividade, RLS com role de aplicação sem
`SUPERUSER/BYPASSRLS`, cleanup administrativo separado, duas conexões
concorrentes e atomicidade da materialização. A prova não equivale a ambiente
produtivo; grants/owners produtivos e observabilidade continuam pendentes.
Também permanecem:

- sincronização posterior entre estados de `learning_assignments` e
  `activity_assignments` foi tratada e provada no live sintético em
  `JOURNEY-REL-002`/`0527`;
- E2E navegador→API→PostgreSQL usando uma atividade curricular materializada
  pelo pipeline autoral, em vez de fixture já persistida;
- workflow remoto no mesmo SHA, grants/owners produtivos, collector/retention/
  traces, carga/failover/restore, revisão clínica, aplicação real do B-07,
  piloto, provider/MFA e assurance operacional.

Próxima ação: executar o workflow remoto no mesmo SHA e, em ambiente autorizado,
provar no navegador a atividade criada pelo pipeline autoral. Até lá, o item
permanece `COMPLETED_WITH_GAPS`.
