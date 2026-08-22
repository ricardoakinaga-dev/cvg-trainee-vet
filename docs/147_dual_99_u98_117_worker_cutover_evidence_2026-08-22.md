# Evidência Dual 99 — U98-117 cutover mecânico de workers

**Registro:** `DUAL99-U98-117-WORKER-CUTOVER-313`
**Data:** `2026-08-22T01:50:11-03:00`
**Escopo:** contrato local de drain, deploy e rollback para a migração expandida
`0033`
**Veredito:** `LOCAL_PASS_WITH_LIMITATIONS / IN_PROGRESS / PILOT_BLOCKED`

## Objetivo e limite

Este recorte impede que workers N e N-1 consumam simultaneamente o mesmo
outbox durante o cutover. Ele prova o plano mecânico por testes unitários,
contratos de integração e dry-run; não declara execução em produção, canário
com tráfego, disponibilidade zero-downtime nem matriz comportamental entre duas
imagens históricas.

O primeiro corte mantém `QDRANT_ENABLED=false` e identidade Qdrant
`disabled`. Qualquer mudança de modelo, versão ou coleção continua exigindo
coleção física versionada, censo, alias e rollback próprios.

## TDD — RED, GREEN e REFACTOR

O RED reproduziu:

- manifesto sem estratégia explícita de worker, gate de mutação ou identidade
  Qdrant;
- worker reivindicando lote depois de iniciado o drain e dependências fechadas
  enquanto um lote seguia em voo;
- deploy que misturava worker N com N-1 e rollback que recriava os quatro
  processos sem quiescência;
- rollback aceitando processo morto por force-kill, backlog do outbox e
  restauração direta insegura no rehearsal;
- proveniência que não vinculava a identidade Qdrant ao `Config.Env` efetivo e
  rehearsal da mesma imagem alegando compatibilidade N/N-1.

O GREEN/REFACTOR introduziu:

- estado `draining`, readiness negativa e bloqueio de novos claims;
- espera do lote ativo antes de fechar health e integrações, com fechamento
  único e preservação de falhas agregadas;
- manifesto fail-closed com `DRAIN_N_MINUS_1_BEFORE_N`,
  `REQUIRED_CLOSED_DURING_WORKER_CUTOVER`, budget de drain e identidade Qdrant
  imutável;
- gate externo explícito e parada física do `edge` antes de qualquer mutação;
- planos imutáveis, verificação de `exited/0`, saúde e proveniência por estágio;
- rollback que preserva o schema expandido, aceita recuperação somente de
  worker previamente falho e exige outbox sem `PENDING/PROCESSING` antes de
  reintroduzir N-1;
- rehearsal local sequencial `rollback → deploy → rollback → deploy`, sem
  atalho de restore, sempre classificado `PASS_WITH_LIMITATIONS`.

## Sequência aceita

Deploy:

1. provar API/worker A/B integralmente em N-1;
2. fechar o gate externo e parar o `edge`;
3. drenar/parar workers A/B N-1 e exigir `exited/0`;
4. aplicar somente migração expand;
5. iniciar e provar workers A/B N;
6. provar `api-b` N-1, iniciar/provar/canariar `api-a` N;
7. promover e provar `api-b` N; só então reabrir o `edge`.

Rollback:

1. fechar o gate externo e parar o `edge`;
2. parar workers A/B N; um processo já falho pode entrar em recuperação, mas
   ausência, restart ou falha causada pelo cutover abortam;
3. consultar PostgreSQL no contêiner e exigir zero eventos
   `PENDING/PROCESSING`;
4. iniciar e provar workers A/B N-1;
5. reverter e canariar `api-a`, depois promover `api-b` N-1;
6. preservar a migration `0033` e reabrir o `edge` somente após todas as
   provas.

## Evidência verificável

| Gate | Resultado |
| --- | --- |
| health/main do worker | `24/24 PASS` |
| contratos release/proveniência | `31/31 PASS` |
| regressão completa do worker | `75/75 PASS` |
| cobertura integral | `205` arquivos, `1216` testes, `27` skips governados; `94,94%` statements, `90,80%` branches, `95,26%` functions, `95,66%` lines |
| build com configuração sintética | `12/12 PASS` |
| migrations | `34/34 PASS`; safety `0` destrutivas |
| arquitetura/hotspots | `2/2 PASS`; `0` hotspots |
| dry-run deploy/rollback | `PASS / PASS` |
| formato, lint, typecheck e diff-check | `PASS` |
| crítica independente de cutover | `PASS local com limitações`; nenhum HIGH remanescente |
| crítica independente de segurança | `PASS_WITH_LIMITATIONS`; nenhum CRITICAL/HIGH local remanescente |

O build sem `CVG_API_INTERNAL_URL` falhou corretamente no guard; a prova de
build foi repetida com `http://127.0.0.1:3101`, valor sintético local, e passou.

## Limitações e riscos preservados

- parar o `edge` cria janela de manutenção; não é canário com tráfego real nem
  zero downtime;
- rollback bloqueia com backlog. Se N estiver saudável, uma evolução deverá
  drená-lo até zero antes do stop; se N estiver quebrado, recuperação ou
  quarentena manual continuam obrigatórias;
- SIGTERM/Docker real, carga e duas imagens/digests históricos distintos não
  foram ensaiados. `VERSIONED_IMAGES_ONLY` não equivale a compatibilidade
  comportamental;
- o gate externo é uma atestação do operador; ausência de publishers, rotas
  administrativas e writers externos precisa de evidência no RC autorizado;
- Qdrant permanece desligado neste corte; alias/censo/cutover versionado segue
  aberto;
- o harness live atual mistura conexão administrativa, API e worker e ainda
  possui fixtures/guards não reproduzíveis. Ele não fornece prova integral de
  RLS ou separação de papéis;
- secrets locais redigidos, histórico Git acima do budget, registry/CI, RC,
  IdP/TLS, backup/DR, clínica, `0/145`, UAT, gates externos, aprovação humana e
  reauditoria independente continuam abertos.

## Arquivos do recorte

- `apps/worker/src/health.ts`, `health.test.ts`, `main.ts`, `main.test.ts`;
- `scripts/release-manifest.mjs`, `release-execution.mjs`,
  `deploy-release.mjs`, `rollback-release.mjs`,
  `local-release-rehearsal.mjs`, `verify-release-manifest.mjs` e
  `verify-runtime-provenance.mjs`;
- `tests/integration/local-release-rehearsal.test.ts` e
  `tests/integration/runtime-provenance.test.ts`;
- `infra/production/release-manifest.example.json` e
  `BRIEFING/08.RUNTIME/0805_release_and_backup_runbook.md`.

## Disposição

O contrato mecânico local de U98-117 está fechado, mas U98-117 não recebe
release-pass. O próximo recorte local obrigatório é o isolamento do harness
live: banco descartável por execução, URLs e papéis distintos de admin/API/
worker, grants verificáveis, fixtures determinísticas e zero skip silencioso.

Nenhum commit, push, release, score, piloto, decisão clínica ou mutação externa
foi realizado porque o gate de secrets permanece fechado.
