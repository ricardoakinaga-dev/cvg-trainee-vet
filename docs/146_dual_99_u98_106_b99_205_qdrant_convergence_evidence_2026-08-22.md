# 146 — Evidência Dual 99 U98-106/B99-205 — convergência Qdrant

**Data:** 2026-08-22
**Registro:** `DUAL99-U98-106-B99-205-QDRANT-CONVERGENCE-312`
**Predecessor:** `docs/145_dual_99_u98_106_ai_suggestion_idempotency_evidence_2026-08-22.md`
**Disposição:** `LOCAL_PASS_WITH_LIMITATIONS / IN_PROGRESS / PILOT_BLOCKED`

## Objetivo e limite

Fechar o gap local de consistência do índice derivado quando Qdrant está
desligado, um write resolve parcialmente, a fonte PostgreSQL muda durante a
reconciliação ou o volume ultrapassa os limites de uma chamada do provider.
PostgreSQL continua autoritativo; Qdrant permanece interno, assistivo,
reconstruível e sem autoridade sobre estado, nota, publicação ou permissão.

A evidência prova uma instância local N e single-node. Ela não alega scheduler
produtivo, multi-réplica, rollout N/N-1, provider OpenAI real, release, score,
piloto, decisão clínica ou cadeia completa de rastreabilidade.

## RED → GREEN → REFACTOR

Os REDs reproduziram:

- reconciliação e eventos de publish/withdraw reportando sucesso com Qdrant
  ou embeddings desligados;
- delete e upsert resolvidos parcialmente sem postcondition;
- snapshot `PUBLICADO` stale reinserindo um ponto depois de retirada no banco;
- coleção antiga ou ponto malformado escondido por filtros do censo;
- 2.049 registros enviados em uma chamada de embeddings;
- índice já convergido ainda chamando o provider;
- falha no segundo lote obrigando re-embedding do conjunto inteiro;
- resposta de embeddings com índices duplicados ou fora da faixa sendo
  associada silenciosamente ao texto errado.

A implementação final:

- falha explicitamente quando Qdrant/embedding estão desabilitados;
- calcula ID e hash antes do vetor, lista o índice e gera embeddings somente
  para registros realmente alterados;
- limita cada chamada a `2.048` entradas e `300.000` bytes UTF-8, e cada
  upsert/delete a `100` pontos;
- exige do provider uma resposta com índices inteiros exatamente `0..n-1`;
- verifica todos os metadados esperados depois dos upserts, antes de remover
  órfãos, e faz censo exato depois dos deletes;
- faz até três passes e relê o PostgreSQL após cada convergência para fechar
  publicação/retirada concorrente ou falhar de forma bounded e redigida;
- percorre toda a coleção dedicada sem filtro e rejeita ponto malformado,
  status oculto, `index_version` ou `embedding_model` incompatível;
- indexa também `embedding_model` e inclui modelo/versão nos filtros de busca;
- preserva payload mínimo: nenhum texto, fonte, PDF, foto ou dado real entra
  no Qdrant, erro ou contador.

Os contadores `upserted` e `removed` registram os pontos solicitados e
confirmados na execução bem-sucedida. Depois de uma execução abortada, o retry
relê o censo e conta somente o restante; eles não representam chamadas HTTP.

## Faults, retries e serviços reais sintéticos

A matriz unitária provou:

- partial upsert impede qualquer delete; partial delete é detectado;
- retry posterior converge sem re-embeddar os `100` pontos já persistidos;
- `2.049` registros viram batches `[2.048, 1]`;
- dois textos multibyte que excedem o budget conjunto viram `[1, 1]`;
- `201` órfãos viram deletes `[100, 100, 1]`;
- índice inalterado faz zero chamadas ao provider;
- retirada PostgreSQL injetada dentro do upsert produz uma escrita stale
  detectada, seguida de remoção e censo vazio na mesma reconciliação bounded.

PostgreSQL 16 e Qdrant `v1.15.5` descartáveis passaram `4/4` nos dois arquivos
live Qdrant. O fluxo PostgreSQL do worker afetado passou `1/1` (`6` cenários
não selecionados). As duas coleções e o banco continham somente UUIDs e textos
sintéticos. Os contêineres exatos `cvg-gauntlet-qdrant-pg` e
`cvg-gauntlet-qdrant` foram parados e removidos ao fim.

Uma execução diagnóstica anterior do agregador live terminou com `299` testes
passando, `8` falhando e `1` guardado. Duas falhas do recorte foram corrigidas
e reprovadas focalmente; as restantes expõem isolamento do harness: fixtures
estáticas concorrentes, cleanup com FKs, timeout de health sob carga e mistura
da role admin com cenário que exige RLS restrita. Esse diagnóstico não é
declarado como passe global do agregador.

## Verificações finais

| Gate | Resultado |
|---|---|
| Reconciliação + provider focal | `22/22 PASS` |
| Worker | `73/73 PASS` |
| Qdrant/PostgreSQL live focal | `4/4 + 1/1 PASS` |
| Cobertura integral | `205` arquivos, `1204` testes, `27` skips governados |
| Cobertura global | `95,00%` statements; `90,84%` branches; `95,36%` functions; `95,70%` lines |
| Reconciliador | `98,90%` statements; `97,43%` branches; `100%` functions; `98,85%` lines |
| Critical decisions / mutation | `7/7` a `100%`; `7/7` mutantes mortos |
| Skip governance | `17` arquivos, `27` testes, `20/20` runs, `0` flaky |
| Migrações / safety | `34/34`; `0` migrations destrutivas |
| Build | `12/12 PASS` com URL interna sintética |
| Formato, lint, typecheck, diff, arquitetura, exposure | `PASS` |
| Dependências | nenhuma vulnerabilidade conhecida no gate executado |
| Hotspots | `0`; ratchet de dívida preservado |
| Scanner de secrets | `FAIL_CLOSED`: quatro assignments redigidos e um finding genérico de histórico acima de `256 MiB` |

O teste de estresse que materializa `129 × 2 MiB` precisou de timeout de
harness `90 s` e passou isolado em `61,99 s`. O budget de `256 MiB`, as
assertions e o comportamento fail-closed não foram alterados.

## Crítica independente

O primeiro snapshot recebeu `REJECT` por enviar até 10 mil textos em uma
chamada. Depois do batching, dois revisores encontraram que a resposta do
provider ainda aceitava índices duplicados; o RED reproduziu e o contrato foi
fechado. O parecer fresco final foi **PASS local**, sem crítico/alto restante
no algoritmo Qdrant N, e separou explicitamente os limites de release abaixo.

## Gaps e rollback seguro

Permanecem abertos:

1. SIGKILL depois de um write converge quando o comando roda novamente, mas
   não existe scheduler automático nem estado durável
   `INDEX_PENDING/INDEX_BLOCKED` que garanta a nova execução em SLO;
2. múltiplos reconciliadores não possuem lease distribuída, e publish/withdraw
   entre réplicas ainda exige prova de ordenação;
3. rollout N/N-1 de modelo/versão exige coleção nova, alias/canário, drain,
   matriz mixed-version e rollback sem reutilizar IDs na coleção antiga;
4. não houve chamada live ao provider OpenAI, soak multi-réplica nem carga
   real de 2.049 pontos; o DB não possui constraint equivalente ao limite de
   texto da API e precisa de scan/marcação permanente antes de release;
5. o agregador live precisa de bancos/roles/fixtures isolados para se tornar
   uma prova global reproduzível;
6. secrets/histórico, roles API/worker, publisher, migration rehearsal,
   tombstone retention, RC/SHA, CI/registry, providers, runtime, clínica,
   UAT, `0/145`, gates externos, aprovação humana e reauditoria continuam
   abertos.

Rollback seguro desliga publishers/reconciliadores N, preserva PostgreSQL e a
coleção antiga e aponta o runtime para a identidade anterior. Não se deve
reescrever uma coleção antiga com novo modelo/versão. Não houve commit ou
push porque o gate de secrets permanece vermelho.

## Arquivos do recorte

- `apps/worker/src/handlers.ts`, `indexing.ts`, `reconcile.ts` e testes;
- `packages/integrations/src/ai.ts`, `qdrant.ts`, exports e testes;
- `tests/integration/qdrant-live.test.ts`;
- `tests/integration/worker-qdrant-live.test.ts`;
- `tests/integration/postgres-worker.test.ts`;
- `skip-governance.json` e o timeout do fixture pesado do scanner.
