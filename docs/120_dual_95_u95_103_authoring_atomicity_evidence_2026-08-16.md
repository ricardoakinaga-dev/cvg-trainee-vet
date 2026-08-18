# Evidência Dual 95 — U95-103 — atomicidade da autoria clínica

**Data:** 2026-08-16  
**Ambiente:** Compose HA local `cvg-trainee-vet-ha`, PostgreSQL local, dados sintéticos  
**Status:** `LOCAL_PASS_WITH_LIMITATIONS`  
**Escopo:** tratar localmente o `D95-H03`; não é promoção de score, release, publicação clínica ou autorização de piloto.

## Critério e desenho

O fluxo de revisão clínica passou a executar a decisão e as transições de
conteúdo dentro de uma mesma transação PostgreSQL. O fluxo de autorização e
publicação usa a mesma fronteira transacional. Cada operação aceita uma chave
de idempotência derivada do `correlationId`, compara um fingerprint da entrada
e persiste a resposta no mesmo commit, com retenção local de 24 horas.

O recurso transacional é composto no API runtime por
`createAuthoringTransactionPort`, que mantém repositório de autoria,
idempotência e transição de conteúdo no mesmo executor transacional. O
fallback sem transação existe somente para compatibilidade dos testes
unitários legados; a composição de produção passa explicitamente a porta
transacional.

## RED → GREEN → REFACTOR

- **RED:** dois testes novos de atomicidade falharam antes de a fronteira
  transacional ser conectada ao use case.
- **GREEN:** a revisão e a publicação passaram a executar todos os writes
  relevantes dentro da transação, com replay idempotente e conflito de
  fingerprint fail-closed.
- **REFACTOR:** a operação transacional de conteúdo foi extraída para
  `advanceContentWithinTransaction`; o repositório passou a fornecer a porta
  transacional e a tabela `authoring_workflow_idempotency` foi adicionada pela
  migração `0029_authoring_workflow_idempotency`.

## Evidência positiva e negativa

O teste live de PostgreSQL executou fault injection depois da segunda
transição em ambos os fluxos:

| Fluxo | Falha injetada | Estado após rollback | Retry/replay |
| --- | --- | --- | --- |
| review + decisão clínica | erro sintético após a segunda transição | conteúdo permaneceu `PROJECAO_VERIFICADA`; zero decisão clínica e zero outbox | comando repetido concluiu uma vez; replay retornou resposta igual e manteve uma decisão |
| authorize + publish | erro sintético após a segunda transição | conteúdo permaneceu `APROVADO_CLINICAMENTE` | publicação concluída uma vez; retry com a mesma chave retornou resposta igual |

O fixture usa uma conexão administrativa somente para preparar e limpar dados
sintéticos sob RLS. O workflow é executado com a conexão da aplicação; a
separação evita que a fixture esconda falhas de autorização do caminho real.
O teste live passou `1/1`, incluindo rollback, retry, ausência de duplicidade,
outbox e limpeza completa.

## Verificações executadas

- `pnpm vitest run packages/application/src/authoring-use-cases.test.ts`:
  `14/14`;
- teste live `tests/integration/postgres-authoring-workflow.test.ts`:
  `1/1` com `CVG_RUN_LIVE_DB_TESTS=true`;
- `pnpm db:generate` foi usado apenas para validar o schema; o drift amplo
  gerado foi descartado e a migração mínima `0029` foi mantida manualmente;
  `pnpm verify:migrations` passou com `30/30` migrações e a migração foi
  aplicada no PostgreSQL HA local;
- a imagem local foi reconstruída e API A/B + worker A/B foram recriados; os
  quatro processos ficaram `healthy`; `pnpm ops:verify-ha` retornou `PASS`;
- `CLINICAL_APPROVER_ID=local-verification-approver TRUSTED_PROXY_CIDRS=127.0.0.1/32 pnpm verify`:
  `177` arquivos de teste, `797` testes aprovados, `18` skips governados;
  cobertura `84,55%` statements / `80,02%` branches / `86,58%` functions /
  `85,36%` lines;
- `pnpm typecheck`, lint, contratos, segurança, secrets, documentação,
  rastreabilidade, `git diff --check` e todos os gates do `pnpm verify`:
  `PASS`.

## Limitações e continuidade

Esta evidência é local e usa imagem sem SHA de release, sem registry, CI,
assinatura, ambiente produtivo, retenção externa ou reauditoria independente.
A chave de idempotência tem retenção de 24 horas e o teste comprovou replay
sequencial e fault injection; concorrência distribuída em produção ainda
depende do RC imutável e dos gates externos.

O vínculo da publicação ao `CLINICAL_APPROVER_ID` corrente continua no
`U95-104`; o caso negativo completo da fixture autoral continua no `U95-105`;
o gate de worker no deploy/rollback continua no `U95-106`. As baselines
`83,24/100` e `64,20/100`, `0/145` cadeias completas e `PILOT_BLOCKED`
permanecem inalterados. Nenhum commit, release, score ou publicação foi
promovido.
