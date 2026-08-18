# Avaliação independente pós-hardening — Dual 98

- assessment_id: `DUAL98-POST-HARDENING-ASSESSMENT-2026-08-16`
- corte da revisão: `2026-08-16T23:05:28-03:00`
- assessment anterior: `docs/131_dual_98_gap_assessment_2026-08-16.md`
- recibo da implementação avaliada: `docs/132_dual_98_local_hardening_evidence_2026-08-16.md`
- escopo: U98-107–113, gates locais, runtime disponível, segurança, código,
  persistência, documentação e elegibilidade das 32 células
- disposição: `PARTIAL` / `PILOT_BLOCKED`

## 1. Resultado executivo

O hardening é uma melhoria técnica real, porém a entrega não fecha o pacote
Dual 98. O veredito independente é `PARTIAL`: não foi encontrado `CRITICAL` nem
segredo real, mas seis propriedades de alta severidade continuam abertas. Em
especial, o scanner declarado fail-closed possui bypasses reproduzíveis, a
revogação de sessões tem uma corrida, a readiness não prova a outbox real, as
regras novas não estão carregadas no runtime corrente, loss-of-signal não cobre
a API e o rollout não protege mutações durante versões mistas.

As duas notas continuam independentes e congeladas:

| Trilha | Fonte | Baseline | Itens oficiais ≥98 | Meta |
|---|---|---:|---:|---:|
| maturidade | `BRIEFING/04.AUDIT/0491_full_construction_audit.md` | `83,24/100` | `0/16` | `16/16 ≥98` |
| qualidade | `docs/116_code_quality_audit_2026-08-16.md` | `64,20/100` | `0/16` | `16/16 ≥98` |
| Dual 98 | `0308/0516/0517` | sem média combinada | `0/32` | `32/32 ≥98` no mesmo RC |

Não houve commit, staging, release, RC, decisão clínica, promoção de score ou
mudança de `0/145`. O próximo avanço permitido é correção e evidência de task;
somente U98-603/U98-604 podem alterar as notas.

## 2. Evidência reproduzida

| Prova | Resultado independente | Classificação |
|---|---|---|
| `pnpm verify` | `195` arquivos passantes + `16` skipped = `211` descobertos; `947` testes passantes + `19` skipped = `966` descobertos | `PASS_LOCAL` |
| cobertura S/B/F/L | `90,43/85,14/93,61/91,84` | `PASS_LOCAL_WITH_98_GAP` |
| cobertura worker S/B/F/L | `77,60/78,64/78,37/77,88` | `FAIL` para piso local de 80%; threshold global não detecta |
| build | `12/12` workspaces | `PASS_LOCAL` |
| contratos / worker / migrations / decisões | `82/82`, `31/31`, `31/31`, `7/7` | `PASS_LOCAL` |
| risco | `11/87` linhas completas | `PASS_WITH_GAPS`; faltam `76` |
| skips/flakes | `19` governados, zero inexplicado, `3/20` runs | `PASS_WITH_GAPS`; faltam `17` runs |
| hotspots | `152` funções >50, `21` >100 (`22` ≥100), máximo `128` | `PASS_WITH_DEBT_RATCHET` |
| scanner sintético adversarial | `.env.local`, `.npmrc`, `.pem`, `.key`, JSON, `DB_PASSWORD` e literal com `.repeat(` escaparam | `FAIL` para fail-closed |
| revisão focal de segurança | `46/46` testes passaram; PostgreSQL authoring `1` skip | `PASS_LOCAL_WITH_LIVE_GAP` |
| revisão focal de código | `63/63` testes passaram | `PASS_LOCAL_WITH_PROPERTY_GAPS` |
| Prometheus montado | `promtool` aceita arquivo com `12` regras | `PASS_STATIC` |
| Prometheus em execução | API `/api/v1/rules` expõe `7` regras antigas e `clamp_min(...,1)` | `NOT_EXECUTED` para as 5 regras novas |
| worktree pré-relatório | `321`: `174` rastreadas/modificadas, `147` não rastreadas, `0` staged | `UNRELEASED`; U98-005 aberto |

Um gate estrutural verde comprova apenas o que ele mede. `verify:secrets`, por
exemplo, executa o scanner atual, mas não torna completas as extensões, regras e
provas do próprio scanner.

## 3. Veredito por alegação

| Alegação | Veredito | Evidência e limite |
|---|---|---|
| scanner worktree/staged/history fail-closed | `FAIL` | árvore e regras têm bypasses; não há teste de `scanProject`, index ou blobs históricos |
| Idempotency-Key e transação autoral obrigatória | `PASS_STATIC` | boundary HTTP e composição transacional existem |
| TTL, lock, hashes, payload, RLS/FK e 0030 | `PARTIAL` | sem concorrência PostgreSQL real; chave global curta; clock/purge da app; legado não verificado; RLS por GUC de convenção |
| revalidação/reabertura no authoring | `PASS_LOCAL` | transação, row lock e reaprovação estão compostos |
| revalidação clínica global | `PARTIAL` | correção, conflito de fonte e recálculo ainda usam identidade estática |
| senha atual e expiração absoluta | `PASS_LOCAL` | contrato HTTP e limite absoluto estão presentes |
| rejeição de senha igual e revogação total | `PARTIAL` | invariância não existe no use case e rotação concorrente pode sobreviver à revogação |
| heartbeat/freshness do worker | `PASS_LOCAL` | estado futuro/ausente/expirado falha fechado |
| claim→ack real da outbox | `FAIL_AS_CLAIMED` | o probe usa repository em memória e handler no-op |
| PromQL e regras no arquivo | `PASS_STATIC` | sintaxe e denominadores do arquivo foram corrigidos |
| loss-of-signal em runtime | `PARTIAL/NOT_EXECUTED` | runtime não recarregado; API down/absent não está coberta; dead-man externo ausente |
| diagnostics autenticado | `PASS_RUNTIME`, contrato `PARTIAL` | handler protege, mas catálogo canônico ainda declara rota pública |
| convite sem token na URL | `PARTIAL` | `replaceState` mitiga após hidratação; link inicial ainda usa query e pode entrar em logs |

## 4. Achados bloqueantes pós-hardening

| ID | Sev. | Achado | Saída mínima verificável |
|---|---|---|---|
| `D98-RH01` | alta | scanner não é fail-closed e sua cobertura declarada excede os testes reais | enumeração segura de candidatos, formatos sensíveis, nenhum bypass genérico, blobs não examinados como erro e testes temporários de worktree/index/history |
| `D98-RH02` | alta | rotação e troca de senha não são serializadas; uma sessão nova pode permanecer ativa | `session_generation`/`password_changed_at` ou lock comum; teste PostgreSQL concorrente e validação em toda autenticação |
| `D98-RH03` | alta | readiness promove claim→ack em memória com handler no-op | probe transacional na outbox real, claim/lease/ack reais, cleanup idempotente e falha de permissão/SQL exercitada |
| `D98-RH04` | alta | runtime corrente mantém 7 regras antigas; API loss-of-signal não existe | reload/restart controlado, 12+ regras visíveis/saudáveis, API e worker down/absent e dead-man externo testados |
| `D98-RH05` | alta | decisões clínicas fora de authoring ainda dependem de `CLINICAL_APPROVER_ID` estático | uma política transacional de identidade corrente para toda decisão clínica, com suspensão/rotação/escopo e fault tests |
| `D98-RH06` | alta | canário mantém API antiga e nova recebendo mutações incompatíveis | expand/contract comprovado, feature gate ou drain de mutações, matriz N/N-1 e rollback entre versões distintas |

Achados médios prioritários:

- namespace idempotente por principal/operação/tenant, chave com entropia mínima,
  confirmação do vencedor de conflito, TTL pelo PostgreSQL e cleanup em lote;
- migração/rejeição verificável dos hashes `legacy:md5`, `response_hash` não nulo,
  snapshot de schema atualizado e RLS comprovada com role restrita;
- incluir `tests/integration` no typecheck ou criar gate equivalente; o teste
  PostgreSQL authoring está guardado e seus comandos não fornecem
  `idempotencyKey`;
- rejeição de senha igual no boundary de aplicação e serialização de duas trocas
  concorrentes;
- desempate determinístico da última revisão e confirmação explícita de que a
  conta retornada é a solicitada;
- catálogo `/health/dependencies` alinhado a auth/capability reais;
- convite por fragmento/troca one-time ou POST, sem segredo em query de acesso;
- reconciliar o worktree pós-hardening e o drift documental de contagens,
  status e evidências.

## 5. Matriz de melhorias para 32/32 ≥98

As baselines abaixo permanecem congeladas. “Saída para candidatura” não é nova
nota; é o conjunto mínimo a ser reaplicado no mesmo RC por auditor independente.

### Maturidade

| ID/base | Estado após a entrega | Saída para candidatura a 98 | Tasks |
|---|---|---|---|
| `M1/90` | documentação local avançou, com drift e worktree `321+` | fonte vigente única, owners/validade, worktree reconciliado, duas execuções e pacote sem drift | U98-002/004/005/601–604 |
| `M2/95` | sem fechamento material | todos os essenciais ligados a métrica/UAT; B-07 e deferred aprovados | U98-403/404/502/603 |
| `M3/72` | fila humana inalterada | 24/96/B-07, calibração, `763` decisões, QA e fila liberável zero | U98-401–406 |
| `M4/92` | módulos focados, dívida `152/21/128` (`22` ≥100) | zero >100, zero crítica >50, fitness tests e failure domains | U98-103/115/305 |
| `M5/88` | lifecycle autoral melhorou | `87/87`, property/mutation e todas as invariantes críticas completas | U98-102/104/109 |
| `M6/90` | transação/0030 fortes, assurance live incompleta | concorrência/RLS/retention no RC e dois restores/PITR/DR | U98-108/106/304/505 |
| `M7/82` | Idempotency-Key e diagnostics avançaram | 100% rota→schema→authz→erro→telemetria; fuzz/negativos e SLO | U98-116/102/303 |
| `M8/86` | senha atual avançou; scanner/sessão incompletos | RH01/RH02/RH05, IdP/MFA/step-up/TLS e pentest sem bloqueante | U98-107/109/110/302/504 |
| `M9/75` | mitigação do convite | jornadas integrais, retomada e UAT cross-browser sem segredo em URL | U98-113/404/502 |
| `M10/68` | authoring local passa | identidade clínica global, idempotência live e `763` decisões com QA | U98-108/109/401–406 |
| `M11/88` | heartbeat passa; probe real falha | outbox real, fault matrix, HA, backpressure e soak | U98-106/111/305/505 |
| `M12/78` | arquivo de regras avançou; live está stale | API/worker LoS, dead-man, on-call/ack/retenção externos | U98-112/303/505 |
| `M13/78` | invite mitigado | WebKit/mobile ativo, WCAG/SR, UAT e RUM | U98-105/113/502/503 |
| `M14/93` | `195/947` verde | pisos `95/90/95/95`, `87/87`, mutation ≥90%, `20/20`, WebKit e E2E RC | U98-102/104/105 |
| `M15/86` | gates locais somente | CI/registry, supply chain assinada, rollout N/N-1 e rollback distinto | U98-101/117/201–204/301 |
| `M16/65` | evidência local sem SHA | worktree limpo, `145/145`, digests/manifest e reprodução independente | U98-005/601/602 |

### Qualidade

| ID/base | Estado após a entrega | Saída para candidatura a 98 | Tasks |
|---|---|---|---|
| `Q1/78` | docs132 registra execução, mas conclusão foi superada | supersessão inequívoca, registry sem ambiguidade e auditoria documental sem drift | U98-004/005/601 |
| `Q2/75` | sem fechamento material | 100% requisitos essenciais com implementação, métrica e aceite | U98-403/404/502 |
| `Q3/85` | controles locais reforçados | SPEC integral no mesmo RC; divergências por ADR; DR/capacidade executados | U98-304/305/501 |
| `Q4/84` | extrações focadas | roots/dispatchers/boundaries pequenos, fitness e multi-host | U98-103/115/305 |
| `Q5/52` | ratchet verde, dívida permanece | zero >100, zero crítica >50 e ratchets de complexidade/duplicação por dois ciclos | U98-103 |
| `Q6/84` | schemas melhoraram | zero cast inseguro em boundary, schemas únicos, unions exaustivas e type tests | U98-115 |
| `Q7/86` | API avançou parcialmente | fonte executável única, zero rota órfã, fuzz/negativos/compatibilidade | U98-116 |
| `Q8/48` | atomicidade autoral melhorou; probe/readiness incompletos | fault/chaos sem hang, write parcial ou retry inseguro; concorrência real | U98-106/108/110/111 |
| `Q9/70` | 0030 avança estrutura | RLS/clock/legado/idempotência live e dois restores/PITR/DR | U98-108/304/505 |
| `Q10/68` | current password e auth diagnostics passam | scanner/sessão/clínica fechados, provider real e pentest | U98-107/109/110/302/504 |
| `Q11/65` | replaceState é mitigação | segredo fora da query, quatro browsers, WCAG/SR, UAT e Vitals | U98-105/113/502/503 |
| `Q12/70` | suíte ampliada | mesmos pisos de M14, mutation/risco/20 runs e E2E ativo no RC | U98-102/104/105 |
| `Q13/46` | heartbeat local passa | outbox real, RC, multi-host, rollout N/N-1, failover e soak | U98-111/117/203/305/505 |
| `Q14/40` | arquivo LoS melhorou; runtime não | API/worker/dead-man, on-call real, backup/PITR e dois drills | U98-112/303/304/505 |
| `Q15/47` | nenhum fechamento externo | CI limpa, registry, assinatura, canário seguro e rollback distinto | U98-101/117/201–204/301 |
| `Q16/42` | artefato local apenas | SHA/digests alcançáveis, `145/145`, pacote retido e reprodução | U98-601/602 |

## 6. Plano executivo revisado

Objetivo indivisível:

```text
32/32 células ≥98
+ 145/145 cadeias completas
+ mesmo RC/SHA/digests/configuração/conteúdo
+ duas execuções e duas reauditorias independentes
+ decisão humana de go/no-go
```

Prioridade executiva:

1. `F98-0R`: aprovar rubrica/T0/owners e reconciliar o worktree pós-hardening;
2. `F98-1R`: fechar RH01–RH05, dívida de risco/teste/hotspot/WebKit e executar
   preauditoria local sem promover score;
3. `F98-2`: autorizar commits, provar compatibilidade N/N-1, formar RC-alpha
   assinado e executar rollback entre versões distintas;
4. `F98-3/F98-4` em paralelo: fundação externa e fábrica clínica humana;
5. `F98-5`: congelar o RC final e executar UAT/WCAG/pentest/soak/failover/DR;
6. `F98-6`: completar `145/145`, reproduzir, reauditar 16+16 e decidir go/no-go.

Horizonte nominal revisado: `20–28` semanas após T0, assumindo 40–60 decisões
clínicas por semana e ambiente externo em até duas semanas; `30+` semanas se o
throughput cair, providers atrasarem ou surgir novo P0/P1.

O programa, roadmap e backlog executivos vigentes são, respectivamente,
`0308`, `0516` e `0517`, atualizados por esta avaliação. `docs/131` permanece
como fotografia pré-hardening e `docs/132` como recibo da execução alegada; este
documento passa a ser a avaliação corrente.

## 7. Decisão operacional

`G98-1` permanece aberto. U98-107–113 retornam a `IN_PROGRESS` até seus novos
critérios de pronto serem demonstrados; isso não apaga o trabalho já feito.
U98-101 deve ser fechado em F98-2, depois de U98-201, para eliminar a dependência
circular entre commit/RC e preauditoria local. `U98-114` é preauditoria local e
deve registrar itens externos como `NOT_EXECUTED`; a auditoria de RC ocorre em
U98-204/U98-602.

Estado final desta avaliação: `IN_PROGRESS` / `PILOT_BLOCKED`.
