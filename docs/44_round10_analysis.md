# Análise Round-10 — 2026-09-09 (terceira crítica + melhores caminhos)

**Pergunta:** fechar os gaps pelos melhores caminhos sugeridos.
**Resposta executiva:** tudo que era fechável localmente foi fechado e verificado; lives locais são impossíveis neste ambiente (sem daemon docker, sem postgres, sem sudo) — o caminho é o CI remoto, que já provê PG16+Qdrant+`CVG_TEST_DATABASE_URL`; branch `aaa/round-10-verification` leva o snapshot para prova same-SHA.

## 1. Terceira crítica fresh — PASS

Verificou as 7 propriedades (busca por modelo nos 4 pontos, validação pré-I/O, scroll tolerante × busca estrita, matriz de reconciliação, lock por outcome, evals, ports) com 40/40 do slice verdes. Restaram 3 P2 de força de teste (caso legado sem campo, assert tautológico, injeção de falha de lock) — **todos fechados nesta rodada** (282/282 nos slices + 835 no total).

## 2. Lives: melhor caminho disponível

| Opção | Veredito |
|---|---|
| Banco descartável local | **Inviável** — docker sem permissão, sem binários postgres, sem sudo |
| CI remoto (push + Actions) | **Adotado** — workflow `quality` roda em qualquer push com PG16 + Qdrant v1.15.5 + URLs de app/admin; branch dedicada e reversível, `main` intocado |
| Produção / piloto real | Bloqueado por `AAA-001` + decisão humana (correto) |

## 3. Evidência fresca desta rodada

- `pnpm verify` PASS ponta a ponta (todos os gates, incluindo secrets/architecture/documentation/product-definition/exposure).
- Coverage: 151 arquivos / 835 testes PASS (30/42 skipped); 84,49% / 80,35% / 87,37% / 85,24%.
- `pnpm test:e2e` 45/45 (duas execuções).
- Pacote de decisão `AAA-001` em `docs/45_aaa001_decision_packet.md` (7 itens PROPOSED, nada vigora sem aceite).

## 4. Notas revisadas (pós-Round-10 local, pré-CI-remoto)

Item 11 → **85/100** (terceiro PASS; live pendente). Item 14 → **90/100**. Item 16 → **78/100** (três críticas fresh registradas em artefato + traceability; o rebaseline do `.gauntlet/` aguarda o helper oficial de fingerprint + CI remoto — nenhum hash foi inventado). Média simples **~76/100**; release segue **25/100** por gate. Se o CI remoto passar, os itens 6/11/15 serão reavaliados com evidência live/same-SHA real.

## 5. Adendo — lives em descartável local + fix 0054 (mesma data)

Melhor caminho executado até o fim: sem docker/postgres/sudo, subi PG16.15 e Qdrant 1.15.5 em userland (`/tmp`, fora do repo) e rodei a suíte live idêntica à do CI.

- Reproduzidas 2 falhas RLS reais (regressão da 0053): worker e activity-content negados pelo `FORCE RLS` — o worker de produção ficaria cego (retornaria `expected: 0`).
- Fix: migration `0054_aaa_content_indexer_service` (identidade de serviço `content-indexer`, SELECT em PUBLICADO + INSERT/UPDATE de drafts), `setDatabaseServiceContext` no `security-context.ts` (com limpeza cruzada entre contextos), source e sink do worker sob a identidade; fixtures lives sob contexto staff (padrão AAA-104); restore passa a usar a URL operadora.
- **Lives verdes: 41 arquivos / 111 testes** (PG + Qdrant + restore com RTO), 1 skip.
- `pnpm verify` PASS: **151/840**, cobertura **84,52/80,35/87,4/85,27**, migrations 55; E2E **45/45**.
- Notas finais: item 6 → **88**, 8 → **82**, 9 → **80**, 11 → **90**, 12 → **75**, 14 → **92**, 15 → **75** (2 runs remotos executados; verde total pendente). **Média ~78/100**; release segue 25/100 por gate humano.
