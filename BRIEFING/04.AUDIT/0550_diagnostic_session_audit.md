# AUDIT-0550 — Sessão diagnóstica própria `JOURNEY-056`

## Veredito

- data: 2026-08-26
- escopo: BUILD técnico local da Opção A, sessão diagnóstica pública própria
- resultado: **CONDITIONAL PASS / COMPLETED_WITH_GAPS**
- estado operacional: `READY_FOR_NEXT_STEP`
- release, piloto, produção e publicação clínica: **não autorizados**

A fatia implementa um caminho técnico bounded para o B-07 sintético: iniciar ou
retomar uma sessão, exibir uma projeção pública segura, salvar checkpoints,
finalizar no servidor e materializar a atribuição inicial na mesma transação.
O catálogo permanece `RASCUNHO`, com `publicationAuthorized=false` e
`clinicalReview=PENDENTE`; portanto a evidência não é uma aprovação de conteúdo,
uma aplicação clínica ou um claim de competência prática.

## Escopo auditado

Foram auditados contratos strict, domínio, casos de uso, persistência
PostgreSQL, autorização HTTP, web, E2E sintético, migration governance e
continuidade documental de `JOURNEY-056`. O participante não fornece identidade,
escopo, módulo, nota, gabarito ou próxima atividade; o servidor deriva e
persiste esses dados.

O limite da fatia é deliberado. Ficam fora: conteúdo B-07 clinicamente
aprovado, repetição de baseline, debrief completo, feedback, notificações,
IA/Qdrant, retenção, prática presencial, provider/MFA, operação externa,
produção e fluxo browser→web→API→PostgreSQL com banco live.

## Aderência e controles

| Área | Evidência | Resultado |
| --- | --- | --- |
| Contrato público | schemas versionados para start, sessão, checkpoint e finalização; rejeição de campos internos/extra | PASS |
| Identidade e escopo | capability própria, membership server-side e conflito redigido quando há mais de um escopo elegível | PASS local |
| Catálogo | snapshot imutável por sessão e mapeamento item público→canônico; gabarito somente no perímetro interno | PASS |
| Estado | `EM_ANDAMENTO`/`FINALIZADA`, CAS, uma sessão aberta por participante/escopo/diagnóstico | PASS local |
| Idempotência | namespace por participante/escopo/operação/chave, fingerprint canônico, TTL de 24h, replay e conflito | PASS local |
| Concorrência | lock/releitura de sessão no START concorrente; checkpoint/finalização serializados | PASS sintético |
| Atomicidade | sessão, resultado, assignment, auditoria e outbox no caminho transacional; falha de assignment reverte o conjunto | PASS por teste de unidade/fake; live pendente |
| Privacidade | projeção sem `participantId`, `scopeId`, módulos recomendados, gabarito, fontes, assignment ou IDs internos | PASS |
| Banco | migration 0051, FK/índices/checks, `ENABLE/FORCE RLS`, policies de participante+escopo, DML de resposta limitado a sessão em andamento e vínculo composto sessão–resultado | PASS estrutural; prova live pendente |
| Disponibilidade | catálogo draft explicitamente opt-in em não-produção e sempre desligado em produção | PASS |

## RED → GREEN → REFACTOR

O RED inicial mostrou a ausência do módulo de contrato da sessão e dos seams de
domínio/aplicação/persistência/API. Os testes então fixaram os invariantes de
strictness, sessão própria, CAS, replay, fingerprint conflitante, rollback,
projeção redigida e retomada antes do caminho GREEN.

Durante a revisão independente, Huygens reproduziu uma corrida P1: um START
concorrente podia responder com um agregado antigo depois de um checkpoint já
persistido. A correção passou a adquirir o lock da sessão existente, reler a
linha e só então gravar/reler a idempotência; o teste de corrida falha sem essa
releitura e passa com ela.

A mesma revisão encontrou um risco P1 condicional: o catálogo draft era
habilitado para qualquer ambiente não produtivo. Foi adicionada a flag
`DIAGNOSTIC_SESSION_DRAFT_ENABLED`, desligada por padrão, explicitamente
desligada em produção e coberta por teste de configuração. Também foram
corrigidos os tipos de evento metadata-only e o formato dos arquivos alterados.

Na rodada final, a revisão independente apontou dois P2 de defesa em
profundidade. As policies de INSERT/UPDATE/DELETE de
`diagnostic_session_answers` passaram a exigir `status='EM_ANDAMENTO'`, e a
migration passou a vincular `(diagnostic_result_id, participant_id, scope_id)`
à identidade correspondente de `diagnostic_results`, com trigger que também
confere o `session_id`. A governança de migration cobre esses controles e a
integração live está preparada para tentar DML direto após a finalização.

A revisão independente final não confirmou P0 nem P1 no fluxo HTTP local. O
principal gap remanescente é evidencial: sem banco autorizado, não é possível
confirmar a combinação PostgreSQL/RLS, concorrência e browser→web→API→PostgreSQL
em runtime real.

O replay de uma resposta antiga após a finalização foi preservado como replay
idempotente, enquanto uma nova resposta continua falhando fechado. Isso evita
que a ordem de chegada de uma requisição atrasada transforme a finalização em
edição.

## Verificação executada

- `pnpm verify`: 147 arquivos PASS, 30 skipped; 770 testes PASS, 39 skipped;
  cobertura 84,31% statements, 80,13% branches, 87,08% functions e 85,07%
  lines.
- focal contracts/domain/application/persistence/config: 5 arquivos, 28/28
  testes PASS.
- focal API: 2 arquivos, 89/89 testes PASS.
- focal migration/governance + integração diagnóstica: 24 testes PASS e 1
  skipped; o skip é o PostgreSQL live condicional sem URL autorizada.
- `pnpm verify:migrations`: 52/52 migrations, última `0051_diagnostic_sessions`.
- `pnpm build`: 12 workspaces PASS; a rota `/diagnostic` foi compilada pelo
  Next.js.
- `pnpm test:e2e`: 33/33 cenários sintéticos de navegador PASS, incluindo
  iniciar, checkpoint, limpar, retomar, finalizar e verificar a projeção sem
  campos internos.
- `pnpm verify:ci-contract`, secrets, arquitetura, documentação,
  product-definition e public-boundary: PASS.
- `pnpm audit --audit-level=high`: nenhuma vulnerabilidade conhecida.
- `git diff --check`: PASS.

Esses resultados são locais e sintéticos. O teste PostgreSQL
`tests/integration/postgres-diagnostic-session.test.ts` está preparado para
executar com `CVG_RUN_LIVE_DB_TESTS=true` e `CVG_TEST_DATABASE_URL`, mas não foi
executado nesta rodada por ausência de banco descartável/autorizado. O E2E
diagnóstico usa fixture HTTP; não prova ainda browser→web→API→PostgreSQL para
este fluxo.

## Gaps e próxima ação

1. Executar a integração PostgreSQL/RLS em banco descartável autorizado,
   incluindo concorrência, rollback, isolamento cruzado e privilégios efetivos.
2. Executar E2E real browser→web→API→PostgreSQL para start/checkpoint/finalize e
   validar a atribuição persistida.
3. Validar grants/owners, configuração e observabilidade do ambiente alvo sem
   inferir qualquer resultado de produção a partir deste worktree.
4. Submeter o catálogo a revisão/aprovação clínica independente antes de
   qualquer publicação ou piloto.

Até esses gates, o item permanece `COMPLETED_WITH_GAPS`/`READY_FOR_NEXT_STEP`.
Não há autorização para release, publicação, aplicação clínica, produção,
workflow remoto, push, deploy ou claim de competência.
