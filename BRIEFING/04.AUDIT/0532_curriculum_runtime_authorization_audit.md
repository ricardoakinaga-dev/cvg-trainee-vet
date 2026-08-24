# AUDIT — autorização da avaliação curricular e isolamento por escopo

## Escopo

Esta auditoria fecha uma lacuna de segurança encontrada durante a revisão da
rota interna de avaliação curricular. O recorte cobre somente a autorização do
par `participantId + scopeId` e a defesa PostgreSQL do estado
`curriculum_runtime_states`. Não publica conteúdo clínico, não altera nota,
gabarito, aprovação ou competência prática.

## Falha RED

Antes do hardening, um moderador autorizado no escopo `A` podia enviar um
`participantId` pertencente a outro escopo junto com `scopeId = A`. A rota
validava a capability do moderador, mas não consultava
`isParticipantInScope` antes de chamar `evaluateCurriculumRuntime`.

O teste focal foi adicionado em `apps/api/src/http.test.ts` e reproduziu a
falha com `200` e chamada do caso de uso, quando o comportamento requerido era
`403` sem persistência.

## GREEN / REFACTOR

- `apps/api/src/http.ts` agora falha fechado com `403` quando o resolver de
  membership está ausente ou retorna falso;
- o caso de uso não é chamado antes da prova de pertencimento;
- a migration `0034_curriculum_runtime_membership_rls.sql` cria a função
  server-side `cvg_participant_in_scope` e reaplica as policies de leitura,
  inserção e atualização do runtime exigindo conta ativa, membership aceita,
  papel `PARTICIPANT` e o mesmo escopo;
- a policy staff de leitura só é elegível sem contexto de participante, para
  não ampliar uma transação que recebeu `participant_id`;
- o teste live do runtime foi preparado para criar membership sintética e
  tentar escrita em escopo estrangeiro;
- a projeção pública permanece sem `participantId`, `scopeId`, objetivos,
  gabarito, fontes ou rubricas internas.

## Evidência executada

- RED focal: `apps/api/src/http.test.ts` falhou com `200` antes da guarda;
- GREEN focal: 70/70 testes HTTP passaram;
- persistência/mapeamento focal: 72/72 testes unitários passaram;
- `pnpm verify:migrations`: 35 migrations, cadeia 0000–0034 alinhada ao
  journal;
- lint dos arquivos alterados e `tsc -b --pretty false`: passaram;
- `tests/integration/curriculum-runtime.test.ts` continua explicitamente
  condicionado a `CVG_RUN_LIVE_DB_TESTS` e a `CVG_TEST_DATABASE_URL`.

## Limites e próximos gates

Não houve PostgreSQL/RLS live nesta rodada: a migração e o teste SQL negativo
foram preparados, mas não executados sem banco CVG descartável e autorizado.
Também permanecem sem evidência browser→API→PostgreSQL, concorrência real,
grants/owners produtivos, workflow remoto same-SHA, observabilidade externa,
backup/restore, publicação clínica e aprovação humana.

O fluxo de retenção continua deliberadamente sem CTA. Há uma divergência
documental que exige decisão antes de ativação: RF-049 registra 30/60/90,
enquanto o desenho curricular complementar usa D+7/D+30/D+90. Nenhuma forma
equivalente ou janela foi inventada nesta auditoria.

## Rastreabilidade

`CURRICULUM-RUNTIME-AUTHZ-050` · PRD-RF-070 · SPEC-0106 · SPEC-0107 ·
SPEC-0109 · SPEC-0111 · SPEC-0118 · AGENTS-TDD.
