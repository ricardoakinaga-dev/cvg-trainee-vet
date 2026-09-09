# Pacote de decisão AAA-001 — opções recomendadas (PROPOSED)

**Data:** 2026-09-09
**Status:** `WAITING_HUMAN_APPROVAL` — nada aqui vigora sem o aceite explícito de Ricardo.
**Como decidir:** marque APROVO / REJEITO / AJUSTO em cada item e devolva. Sem resposta, nenhum gate live/produção/clínica/piloto abre.

## D1 — Barra de qualidade AAA (AAA-Q01–Q11)

- Recomendado: **APROVO** os 11 alvos de `docs/41_executive_plan_triple_aaa.md` §3 como barra interna (não certificação externa).
- [ ] APROVO / [ ] REJEITO / [ ] AJUSTO: ___

## D2 — SLOs do piloto (tráfego digital, sem risco clínico direto)

- Recomendado: **APROVO** — API p95 < 1,5 s; web LCP < 2,5 s; disponibilidade 99,5% mensal em horário comercial; taxa de erro 5xx < 1%; qualque estouro abre incidente P1 e congela piloto.
- [ ] APROVO / [ ] REJEITO / [ ] AJUSTO: ___

## D3 — RPO / RTO do piloto

- Recomendado: **APROVO** — RPO ≤ 24 h (backup diário automatizado), RTO ≤ 4 h (runbook de restore exercitado antes do piloto). Medição real no `AAA-605`; se exceder, piloto não abre.
- [ ] APROVO / [ ] REJEITO / [ ] AJUSTO: ___

## D4 — Capacidade do piloto

- Recomendado: **APROVO** — até 50 participantes, 5 escopos, 3 autores concorrentes; teste de carga em `AAA-604` a 3× (150 sessões concorrentes sintéticas). Acima disso, novo dimensionamento.
- [ ] APROVO / [ ] REJEITO / [ ] AJUSTO: ___

## D5 — Escopo do piloto

- Recomendado: **APROVO** — 1 coorte, conteúdo M02 + B-07 **formativo**, 8 semanas, somente digital, sem declaração de competência prática; critérios de aborto: P0, exposição de dado/gabarito, perda de integridade, sinal clínico imprevisto.
- [ ] APROVO / [ ] REJEITO / [ ] AJUSTO: ___

## D6 — Autoridade de ambientes e segredos

- Recomendado: **APROVO** — (a) CI descartável com PG16+Qdrant efêmeros (padrão já declarado em `.github/workflows/quality.yml`); (b) staging descartável sob demanda com seed sintético; (c) produção somente após G4 com owners/grants dedicados; (d) segredos só via ambiente, nunca no Git; (e) papéis separados migration/app/admin como no workflow.
- [ ] APROVO / [ ] REJEITO / [ ] AJUSTO: ___

## D7 — Ordem da próxima onda

- Recomendado: **APROVO** — `AAA-107` + `AAA-202` primeiro no CI remoto (branch `aaa/round-10-verification`), depois `AAA-300–305` com revisão clínica, depois readiness/piloto.
- [ ] APROVO / [ ] REJEITO / [ ] AJUSTO: ___

## Efeito do aceite

Cada APROVO libera somente a fatia indicada, com evidência corrente obrigatória. Publicação clínica continua exigindo revisão item a item (`AAA-304`); produção continua exigindo G4; competência prática nunca decorre de sinal digital.
