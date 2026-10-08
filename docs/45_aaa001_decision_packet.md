# Pacote de decisão AAA-001 — proposta histórica e decisão vigente

**Data:** 2026-09-09
**Status vigente:** `COMPLETED` (decisão D1–D7); aceite operacional e piloto ainda dependem de evidências.
**Decisão:** `docs/decisions/2026-10-08-production-unblock.md`, aprovada explicitamente por Ricardo.
**Histórico:** as recomendações abaixo são a proposta de 2026-09-09, preservada; D3 e D7 foram ajustadas na decisão vigente.
**Como decidir:** marque APROVO / REJEITO / AJUSTO em cada item e devolva. Sem resposta, nenhum gate live/produção/clínica/piloto abre.

## D1 — Barra de qualidade AAA (AAA-Q01–Q11)

- Recomendado: **APROVO** os 11 alvos de `docs/41_executive_plan_triple_aaa.md` §3 como barra interna (não certificação externa).
- [ ] APROVO / [ ] REJEITO / [ ] AJUSTO: ___

## D2 — SLOs do piloto (tráfego digital, sem risco clínico direto)

- Recomendado: **APROVO** — API p95 < 1,5 s; web LCP < 2,5 s; disponibilidade 99,5% mensal em horário comercial; taxa de erro 5xx < 1%; qualque estouro abre incidente P1 e congela piloto.
- [ ] APROVO / [ ] REJEITO / [ ] AJUSTO: ___

## D3 — RPO / RTO do piloto

- Recomendado: **APROVO** — RPO ≤ 24 h (backup diário automatizado), RTO ≤ 4 h (runbook de restore exercitado antes do piloto). Medição real no `AAA-605`; se exceder, piloto não abre.
- **Reconciliação normativa (2026-10-02):** RPO ≤24 h é somente a recomendação
  proposta de D3 e conflita com RNF-015/D-107, cujo alvo aprovado permanece
  RPO ≤1 h e RTO ≤4 h. D3 não altera o PRD; qualquer mudança do alvo exige
  decisão explícita e atualização documental do requisito. Os runbooks locais
  continuam usando o alvo aprovado, e AAA-001 segue como gate de aceite
  operacional/produção.
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

## Resposta vigente — 2026-10-08

Ricardo respondeu **“Aprovo pacote atualizado”**: D1/D2/D4/D5 aprovados como
descritos, mantendo pisos de cobertura atuais; D3 ajustado para RPO ≤1 h e
RTO ≤4 h; D6 autorizado para CI/homologação sintéticos e roles separados, com
topologia VPS dedicada escolhida e dados do host pendentes; D7 ajustado para CI
do candidato atual em `main`, revisão clínica, homologação/readiness e piloto
após gates. A decisão e os limites completos estão no registro acima.
