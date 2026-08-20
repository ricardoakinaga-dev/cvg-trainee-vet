# 0514 — Roadmap Dual 95

> **Registro histórico:** absorvido por `BRIEFING/04.AUDIT/0516_dual_98_roadmap.md`; os marcos U95 permanecem evidência/aliases, não estado executivo concorrente.

**Programa:** `BRIEFING/03.BUILD/0307_dual_95_executive_program.md`
**Avaliação de prontidão:** `docs/117_dual_95_readiness_assessment_2026-08-16.md`
**Backlog:** `BRIEFING/04.AUDIT/0515_dual_95_backlog.md`
**Disposição:** `PILOT_BLOCKED`

## 1. Regra de calendário

As semanas são relativas ao T0 aprovado. Não são promessa de data. Trabalho local seguro pode avançar antes do T0; CI, provedores, revisão clínica, UAT, produção e auditoria dependem de autoridade e ambiente. Toda sprint termina em `TESTE → REVIEW → AUDIT → STATE/LOG/BACKLOG/TRACEABILITY`.

## 2. Visão executiva

| Fase | Janela indicativa | Fluxo | Saída |
|---|---|---|---|
| F0 — verdade/mobilização | S0, 1 semana | controle | `G95-0` |
| F1 — fechamento local | S1–S2, 4 semanas | engenharia | `G95-1` |
| F2 — RC-alpha | S3, 2 semanas | release local | `G95-2` |
| F3 — fundação externa | S3–S5, 6 semanas, paralela | plataforma/operação | `G95-3` |
| F4 — produto/clínico | S1–S10+, paralela | produto/clínica | `G95-4` |
| F5 — aceitação/resiliência | após F3/F4, 2–3 semanas | validação | `G95-5` |
| F6 — RC final/reauditoria | após G95-0–5, 2 semanas | evidência/auditoria | `G95-6` e `G95-7` |

O horizonte total é dominado pela fila clínica: aproximadamente 13, 16 ou 20 semanas para 60, 50 ou 40 itens por semana, antes de calibração e retrabalho.

## 3. Sprints e marcos

### S0 — Controle factual e triagem

Entregas:

- confirmar as duas rubricas e a regra `32/32`;
- reconciliar contagem clínica (`763` no corte), runtime, skips e worktree;
- revisar/classificar as `221` entradas correntes sem apagar trabalho do usuário;
- reproduzir e registrar `D95-H01–H06`;
- definir owner, prioridade, dependência, teste de saída e validade de evidência;
- obter ou registrar como pendentes T0, equipe, orçamento, revisores e ambientes.

Gate: `G95-0`. Nenhum item pode ser marcado pronto para reauditoria se o seu fato corrente divergir.

### S1 — Segurança, atomicidade e observabilidade

Entregas:

- corrigir renderer Prometheus com HELP/TYPE uma vez por família e parser/promtool para múltiplas séries;
- corrigir ownership/mode do token, carregar targets de API/workers, rules e Alertmanager; provar fire→ack→resolve local;
- tornar revisão e publicação clínicas transacionais e idempotentes, com fault injection;
- exigir que a aprovação usada na publicação pertença ao aprovador configurado atual;
- corrigir fixture PostgreSQL live e manter caso negativo de aprovador divergente;
- exigir worker A/B healthy em deploy e rollback;
- corrigir warm-up/canary e o cálculo PromQL em tráfego baixo.

Gate parcial: nenhum dos seis achados altos permanece aberto.

### S2 — Qualidade integral e risco

Entregas:

- completar provas aplicáveis da matriz de risco até `87/87` ou justificar `N/A` auditável;
- apertar ratchet de hotspots para o estado observado e reduzir funções críticas;
- tipar transações e remover double assertions evitáveis;
- consolidar inventário de rotas, contratos, autorização e erros;
- adotar contratos compartilhados na web e ampliar os guards bounded;
- incluir toda produção relevante no denominador de cobertura;
- testar hooks, retry, cross-browser/mobile e a11y automatizada;
- limitar o diagnóstico de dependências e remover token de convite do histórico.

Gate: `G95-1`, com zero P1 local, build/verify/E2E ativo/fault injection verdes.

### S3 — RC-alpha e cadeia de supply

Entregas:

- revisar diff/secret/data policy e criar commits intencionais somente após aprovação;
- congelar SHA alcançável;
- produzir imagem/digest/SBOM/attestation/manifest com vínculo source↔artifact;
- executar browser→web→API→PostgreSQL, HA, crash/replay, Qdrant rebuild e IA fallback;
- executar deploy/canário/rollback local entre versões distintas, com health de API e workers;
- repetir alertas, restore e teardown no RC-alpha.

Gate: `G95-2`. Dry-run, `worktree-uncommitted` ou rollback para a mesma versão não satisfazem o gate.

### S3–S5 — Fundação externa paralela

Trilhas independentes:

1. CI privado/licenciado, registry, assinatura, deploy e rollback;
2. IdP, MFA, recovery, step-up, DNS e TLS gerenciado;
3. collector/backend/retention, Prometheus e Alertmanager com RBAC e ack;
4. backup offsite, PITR, restore isolado, RPO/RTO e DR;
5. capacidade aprovada, failure domains, soak e failover.

Gate: `G95-3`. Configuração versionada sem execução externa é `NOT_EXECUTED`.

### S1–S10+ — Produto e fábrica clínica paralelos

Entregas:

- completar 24 módulos, 96 sessões, B-07 e QA estrutural;
- concluir diagnóstico, trilha, tentativa, correção, recurso, retenção e autoria por papel;
- calibrar amostra de 25 itens com revisores independentes e limiar de concordância aprovado;
- revisar a fila em lotes auditáveis; monitorar throughput, desacordo e rework;
- recontar `N` no PostgreSQL a cada lote; zero publicação sem decisão válida;
- atingir fila liberável zero e registrar decisão clínica final.

Gate: `G95-4`. A fila não é reduzida por seed, fixture, bulk approval ou IA.

### S10–S11 — Aceitação e resiliência

Entregas:

- UAT por participante, moderador, autor, aprovador e administrador;
- turnos, dispositivos, Firefox/WebKit/Chromium, mobile, teclado e screen reader;
- checklist WCAG 2.2 AA, RUM e Web Vitals reais;
- DAST/pentest focal e revisão de threat model;
- soak ≥24h, degradação, failover, backup/restore e DR com SLOs medidos;
- piloto controlado somente se os gates anteriores autorizarem.

Gate: `G95-5`, zero P0/P1 e critérios humanos assinados.

### S12 — RC final e reauditoria

Entregas:

- congelar RC final e repetir todos os gates sem cherry-pick posterior;
- fechar `145/145` cadeias com artefatos retidos;
- auditor independente da maturidade reaplica 16 itens;
- auditor independente da qualidade reaplica 16 itens;
- registrar `itemsAt95` e a decisão go/no-go.

Gates: `G95-6` e `G95-7`. Qualquer célula <95 reabre o workstream correspondente e invalida a liberação.

## 4. Caminhos críticos

```text
CONTROLE TÉCNICO
U95-000/001/003/004
→ U95-101–117
→ U95-201/202
→ U95-301–305
→ U95-501/502
→ U95-503/504

PRODUTO/CLÍNICA
U95-002
→ U95-401
→ U95-402/403/404
→ U95-405/406
──────────────────────→ U95-501
```

Os caminhos convergem em `U95-501`. O RC final não pode ser congelado enquanto qualquer gate técnico, externo, produto/clínico ou humano estiver incompleto.

## 5. Paralelismo seguro

- observabilidade, clinical workflow e worker release gate podem avançar em branches/fatias distintas após a triagem do worktree;
- currículo/revisão clínica podem avançar em paralelo à plataforma, sem publicar;
- IdP, telemetria e backup podem ser provisionados em paralelo quando aprovados;
- UAT só começa em ambiente estável com regras e dados autorizados;
- reauditorias são sequenciadas depois do freeze, mas usam exatamente o mesmo RC.

Não paralelizar mudanças que compartilhem migration, fixture mutável, composition root ou manifesto sem owner explícito e integração seriada.

## 6. Critérios de parada

Interromper promoção, não necessariamente todo trabalho seguro, quando houver:

- P0 ou P1 novo;
- falha de autorização, atomicidade, integridade ou exposição;
- drift entre SHA, digest, manifesto ou runtime;
- suite vermelha, skip não governado ou evidência expirada;
- perda de rastreabilidade, auditoria ou capacidade de rollback;
- decisão clínica/negócio necessária e não concedida.

O estado então deve registrar causa, impacto, ação e dependência. Nenhum prazo autoriza ignorar o gate.

## 7. Indicadores por checkpoint

| Checkpoint | Indicadores mínimos |
|---|---|
| semanal | P0/P1, worktree, funções/casts, testes/skips/coverage, risco, targets/alerts, fila clínica, cadeias |
| por sprint | gate, diff/review, RED/GREEN, artifact, limitações, owners e validade |
| por RC | SHA/digest/SBOM/manifest, CI, E2E/HA, alerts, restore/rollback, security, UAT e `145/145` |
| final | `16/16` maturidade, `16/16` qualidade, zero P0/P1, go/no-go |

## 8. Próximo marco autorizado

Executar F0 por `U95-003` sobre as `221` entradas correntes, seguido dos seis achados altos. Não solicitar reauditoria e não aumentar score antes de `G95-6`.
