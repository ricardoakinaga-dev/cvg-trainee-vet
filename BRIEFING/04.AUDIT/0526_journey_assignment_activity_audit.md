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

## 3. TDD e verificações

- RED focal: o teste de atividade mapeada falhou quando o repositório ainda
  persistia somente `learning_assignments`.
- GREEN focal: cinco testes de persistência passaram, incluindo vínculo
  explícito, atividade legada sem módulo, replay e reparo sem alteração de
  status.
- `tests/integration/postgres-adaptive-assignment.test.ts` contém dois testes
  PostgreSQL live para provenance, replay e cadeia assignment→atividade; os dois
  passaram no banco efêmero com role de aplicação sem bypass e cleanup admin.
- `pnpm --filter @cvg/persistence typecheck` e
  `pnpm --filter @cvg/curriculum typecheck` passaram.
- `pnpm verify:migrations` passou com 27 migrations e índice 0026 como último.
- `pnpm verify` passou com 125 arquivos/576 testes e 31 skips, cobertura
  84,50%/80,34%/85,95%/85,22%; build dos 12 workspaces, E2E real 28/28,
  integração PostgreSQL live 31/48, audit high e gates estáticos passaram.
- O conteúdo de seed M02 foi verificado sem publicação automática e sem fontes,
  gabaritos ou dados reais.

## 4. Segurança e invariantes

- O servidor deriva participante, escopo e disponibilidade do diagnóstico
  persistido; o cliente não escolhe identidade, módulo ou atividade.
- A relação exige escopo coincidente, módulo válido e status `PUBLISHED`.
- A consulta exige ao menos um item de conteúdo `PUBLICADO`; atividade vazia ou
  sem conteúdo participante publicável não é escolhida.
- FKs impedem provenance órfã; a transação impede concluir somente metade da
  materialização quando o banco rejeita uma escrita.
- A migration adiciona policies `INSERT`/`UPDATE` limitadas ao contexto
  participante+escopo e à correspondência atividade–assignment.
- `learningAssignmentId` e `sourceDiagnosticResultId` permanecem internos e
  não entram nos contratos da participante.
- PostgreSQL segue autoridade; Qdrant e IA não participam da decisão.

## 5. Gaps e próxima ação

A suíte PostgreSQL live efêmera agora confirmou a cadeia de provenance, RLS com
role de aplicação sem `SUPERUSER/BYPASSRLS`, cleanup administrativo separado e
atomicidade da materialização. A prova não equivale a ambiente produtivo e
concorrência, grants/owners produtivos e observabilidade continuam pendentes.
Também permanecem:

- sincronização posterior entre estados de `learning_assignments` e
  `activity_assignments` foi tratada e provada no live sintético em
  `JOURNEY-REL-002`/`0527`;
- pipeline autoral/publicação que grave o `moduleId` em atividades aprovadas;
- E2E navegador→API→PostgreSQL usando uma atividade curricular persistida;
- rollback provocado por policy distinta, workflow remoto no mesmo SHA,
  revisão clínica, aplicação real do B-07, piloto, provider/MFA e assurance
  operacional.

Próxima ação: executar o workflow remoto no mesmo SHA e, em ambiente autorizado,
provar a atividade curricular persistida no navegador e a concorrência
controlada. Até lá, o item permanece `COMPLETED_WITH_GAPS`.
