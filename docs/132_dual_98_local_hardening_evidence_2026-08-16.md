# Evidência local de hardening Dual 98 — 2026-08-16

> **Adendo de revisão independente — 2026-08-16T23:15:43-03:00:** este
> documento permanece como recibo da implementação e dos comandos executados.
> Suas conclusões de fechamento foram superadas por
> `docs/133_dual_98_post_hardening_assessment_2026-08-16.md`. Em particular,
> U98-107–113 voltaram a `IN_PROGRESS`; a afirmação de testes staged/history do
> scanner não é sustentada pela suíte atual, e várias propriedades permanecem
> `PARTIAL`, `FAIL_AS_CLAIMED` ou `NOT_EXECUTED`. Os números brutos dos gates
> abaixo continuam históricos e reproduzíveis.

## Disposição

Esta evidência registra a execução local das fatias `U98-107` a `U98-113` no
worktree corrente. Ela não promove maturidade, qualidade, release candidate,
produção ou piloto. As baselines continuam maturidade `83,24/100`, qualidade
`64,20/100`, `0/32` células oficiais `≥98`, `0/145` cadeias completas e
`PILOT_BLOCKED`.

O resultado é evidência de código, testes e verificadores locais com dados
sintéticos. A validação em RC imutável, PostgreSQL/infra externos, WebKit,
auditoria independente e gates humanos permanece pendente.

Após esta coleta, a revisão final adicionou lock advisory também ao caminho de
`store` e repetiu `pnpm verify`, build, audit de dependências e `git diff --check`
em `2026-08-16T21:34:05-03:00`, todos verdes.

## Implementações

### U98-107 — scanner de segredos

- `scripts/secret-scanner.mjs` agora é o scanner dedicado da árvore de trabalho,
  staged e blobs alcançáveis no histórico Git;
- há regras para chaves privadas, tokens de provedores, JWT, URI com credencial,
  atribuições sensíveis e valores de alta entropia;
- blobs ilegíveis e conteúdo staged não lido geram achado fail-closed; achados
  são determinísticos e redigidos;
- a única tolerância sintética é limitada a placeholders exatos em `tests/`;
  não há allowlist por substring ou por nome de arquivo;
- `scripts/verify-secrets.mjs` usa o mesmo scanner para evitar divergência entre
  implementação e gate;
- `tests/integration/secret-scanner.test.ts` cobre segredo literal, staged,
  histórico, URI, JWT, entropia, redaction e regressão da allowlist.

### U98-108 — idempotência HTTP, transação e persistência

- `apps/api/src/http-support.ts` valida `Idempotency-Key` com limite de 128
  caracteres e alfabeto estável; review e publication rejeitam a ausência da
  chave antes do use case;
- o port transacional de autoria é obrigatório e o fluxo de review/publication
  executa leitura, revalidação, transição, auditoria e gravação no mesmo escopo;
- `packages/persistence/src/authoring-idempotency-repository.ts` usa lock
  advisory transacional por chave, `onConflictDoNothing`, TTL de 24 horas,
  purge de expirados, fingerprint SHA-256 e hash da resposta;
- o replay persiste somente um envelope mínimo versionado, reidrata o registro
  canônico e falha fechado se conteúdo, estado, preflight ou hash mudarem;
- `0030_authoring_workflow_hardening.sql` acrescenta hash, checks, FK composta
  `(content_id, version)`, índices, RLS `FORCE` e política explícita de contexto;
- `packages/persistence/src/authoring-repository.test.ts` cobre publicação e
  revisão clínica, replay, concorrência estrutural, TTL, payload inválido,
  expiração, hash, identidade e fingerprint.

### U98-109 — aprovador clínico corrente e reabertura

- review e publication consultam o aprovador persistido corrente dentro da
  transação, com lock de linha, estado `ACTIVE`, papel e escopo compatíveis;
- aprovação clínica já aprovada não é repetida silenciosamente: a máquina
  reabre em `EM_REVISAO_CLINICA` com `REABRIR_REVISAO_CLINICA`, exigindo nova
  revisão antes da publicação;
- suspensão, rotação, divergência de identidade e reaprovação possuem cobertura
  nos testes de aplicação e persistência;
- a fatia coberta é o caminho authoring. Outras operações clínicas que ainda
  dependem de `CLINICAL_APPROVER_ID` permanecem explicitamente limitadas até a
  próxima migração de identidade, sem alegar fechamento global do achado.

### U98-110 — troca de senha e sessão absoluta

- a troca de senha exige `currentPassword`, rejeita senha igual e valida a
  credencial anterior dentro de transação;
- sucesso atualiza o hash, revoga sessões e registra auditoria; o handler limpa
  o cookie de sessão;
- rotação de sessão preserva `createdAt` lógico e impõe expiração absoluta de
  sete dias, além do TTL de inatividade;
- testes de senha e sessão cobrem senha incorreta, rotação, revogação, cookie e
  expiração absoluta.

### U98-111 — readiness real de worker

- readiness depende de inicialização, dependências saudáveis, heartbeat fresco e
  probe sintético claim→ack pelo loop normal;
- heartbeat tem TTL validado e `/health/ready` retorna `503` quando está ausente,
  futuro ou expirado;
- o processo executa healthcheck, probe e heartbeat na inicialização e em cada
  ciclo; falha de dependência ou probe remove a prontidão;
- `apps/worker/src/main.ts`, `apps/worker/src/health.ts` e `apps/worker/src/loop.ts`
  mantêm o edge sem promoção baseada em estado estático.

### U98-112 — loss-of-signal e PromQL

- `observability-governance.json` declara oito sinais e doze alertas, incluindo
  target ausente, worker down, watchdog ausente e perda de conexão com
  Alertmanager;
- `infra/observability/prometheus-alerts.yml` protege denominadores zero e não
  usa `clamp_min` para mascarar ausência de tráfego;
- famílias de métricas são verificadas contra colisões e o dashboard usa
  duração derivada de `sum/count` com guardas explícitas;
- `pnpm verify:observability-governance` passou com
  `PASS_WITH_EXTERNAL_OPERATIONAL_GAPS`; operação externa, retenção e
  notificação real continuam não configuradas.

### U98-113 — diagnostics, convite e boundary

- `/health/live` permanece barato; `/health/ready` representa readiness e
  `/health/dependencies` exige autorização interna ou token de scrape, com cache
  curto e deduplicação de chamadas em voo;
- diagnósticos não autenticados retornam `401` e contas sem capacidade retornam
  `403`; métricas de worker também falham fechado sem token;
- token de convite não permanece na URL após captura: o estado remove o segredo
  via `history.replaceState`;
- o teste de contrato de edge cobre os status e o limite de exposição.

## Verificações executadas

Comandos executados no worktree corrente:

```text
pnpm verify
CVG_API_INTERNAL_URL=http://127.0.0.1:3101 pnpm build
pnpm audit --prod --audit-level high
git diff --check
```

Resultados:

- `pnpm verify`: PASS; `195` arquivos, `947` testes passantes e `19` testes
  guardados em `16` arquivos; cobertura `90,43%` statements,
  `85,14%` branches, `93,61%` functions e `91,84%` lines;
- decisões críticas `7/7`, contratos `82/82`, worker `31/31`, migrações `31/31`,
  secrets `clean`, documentação, produto, arquitetura, exposição e hotspots
  passaram;
- governança de skips: `16` arquivos, `19` testes, `0` skips inexplicados,
  `3/20` execuções observadas, `PASS_WITH_GAPS`;
- matriz de risco: `11/87` linhas completas, com
  `87` success, `63` error, `26` denied e `36` conflict;
- rastreabilidade: `145` requisitos com evidência local explícita,
  `0/145` cadeias completas até commit/digest/artefato;
- build: `12/12` workspaces passaram;
- audit de dependências de produção: nenhuma vulnerabilidade conhecida;
- nenhum commit, staging, push, release, RC ou promoção de nota foi feito.

## Limites que permanecem

Esta rodada não comprova os gates que dependem de estado externo ou autoridade
humana: RC imutável e rollback versionado, CI/registry/CD, WebKit (`libavif16`),
PostgreSQL externo/HA, IdP/MFA/step-up externo, telemetria/on-call, backup/PITR/
RPO/RTO/DR, soak/failover, UAT/WCAG manual/RUM, pentest, revisão das `763`
decisões clínicas, `145/145` cadeias, auditoria independente ou piloto.

O próximo passo seguro é atualizar o estado para a conclusão desta execução
local, manter `PILOT_BLOCKED`, e aguardar T0/RC/autorizações para a preauditoria
`U98-114` e os gates externos. Não há base para alterar as notas congeladas.
