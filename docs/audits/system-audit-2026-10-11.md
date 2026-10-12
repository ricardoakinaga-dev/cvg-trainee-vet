# Auditoria de sistema com pontuação — 2026-10-11

- Task: `AUDIT-SYSTEM-20261011`; solicitação direta de Ricardo: ler a documentação,
  auditar o sistema e entregar relatório com nota 0–100 por item analisado.
- HEAD auditado `1ae1f8d53733be2afa8bcf9fc7a1dfcfdfe0fb34` (`main` local, worktree
  limpo no início); `origin/main` está em `c5cb444`; os commits `2420ffb`
  (remediação CI-LIVE) e `1ae1f8d` (registro documental) ainda não foram publicados.
- Toolchain: Node 22.23.2 via nvm (contrato `>=22.22 <23`), pnpm 10.33.0. Nota: o
  shell padrão do host segue em Node 24 (item já registrado como OP-11/M27).
- Método: leitura do corpus (AGENTS.md, estado/log/backlog, BRIEFING PRD/SPEC/AUDIT,
  `docs/operations`, `docs/audits`), congelamento do HEAD, execução dos gates e das
  suítes, integração live em PostgreSQL descartável e verificação da cadeia AAA.
- Nenhum arquivo de produto foi alterado. Evidência bruta em
  `.agent/artifacts/audit-20261011/` (logs integrais por suíte).

## 1. Evidências executadas nesta rodada

| Verificação | Resultado |
|---|---|
| `pnpm verify` (23 gates, Node 22.23.2) | **EXIT 0** — format, ci-contract, lint, typecheck, coverage, coverage-floor, evidence-consistency, contract, worker, migrations, secrets, traceability, architecture, routes, complexity, cycles, dead-code, security, otel, release-evidence (self-test), documentation, product-definition, exposure |
| `pnpm test:coverage` (dentro do verify) | 308 arquivos PASS / 44 skip; **3.929 testes PASS / 212 skip**; cobertura **91,07 / 86,97 / 95,07 / 92,40** (pisos 90/85/90/90) |
| `pnpm test:contract` / `pnpm test:worker` | 124 PASS / 148 PASS |
| `pnpm verify:routes` | 58 registros / 58 rotas dispatch, consistência bidirecional |
| `pnpm verify:migrations` | 59 SQL alinhados ao journal (head 0058) |
| `pnpm audit` e `pnpm audit --prod` | **0 vulnerabilidades** (M09 confirmado) |
| `git diff --check` | PASS |
| `pnpm verify:triple-aaa` | **FAIL** (1 fatal + 16 REVISE; P0=0, P1=0, P2=9; readiness `NOT_VERIFIED`; decisão `REVISE`) |
| `pnpm verify:aaa-candidate` | **FAIL** (9 gates) |
| `pnpm test:integration` (não-live) | 39 arquivos PASS; **779 PASS / 210 skip** |
| `pnpm test:integration:live` (PG 18.4 descartável, migrado + provisionado, `CVG_OWNED_DISPOSABLE_BINDING_DATABASE=true`) | **882 PASS / 103 skip / 0 FAIL** (74 arquivos) — reproduz localmente a remediação CI-LIVE-01…05 do commit `2420ffb` |
| `pnpm test:browser` | **290/290 PASS** (14 arquivos) |
| `pnpm test:e2e` (modo mockado) | **45/45 PASS** — executado em modo servidores externos na porta 3110 porque a porta 3100 estava ocupada por processo externo do editor (`code`), que não foi interrompido; mesmos testes e mesmas fixtures |
| E2E real (`CVG_RUN_REAL_E2E=true`, browser→proxy→API→PostgreSQL descartável) | **2/2 PASS**; fixture de limpeza verificada; auditoria append-only preservada (3 entradas) |

Limitações de coleta: Qdrant live, Redis live, restore, k6, Stryker/mutação, staging
script e workflows remotos **não foram reexecutados** nesta rodada (ver §5).

## 2. Veredito

- **Nota ponderada técnica desta matriz: 84/100** (84,34 antes do arredondamento).
- Componentes independentes do verificador AAA (método próprio): Engenharia 94 /
  Segurança 95 / Operações 90,8; P0=0; P1=0; P2=9; **readiness `NOT_VERIFIED`**.
- **Prontidão: NÃO PRONTO para produção, piloto ou publicação clínica.** O bloqueio
  não é o núcleo técnico — que está verde, gateado e reproduzido — mas: cadeia de
  evidência de release obsoleta para o HEAD, CI remota nunca verde no SHA remediado,
  conteúdo clínico não revisado/publicado, somativa sem receipts nativos e ambiente
  real (host, RPO/RTO, alertas, HTTPS) inexistente.
- Escala de leitura: 80–100 pronto ou próximo para o escopo declarado; 60–79 base
  funcional com riscos a fechar; 40–59 protótipo/fundação útil; 0–39 inicial. As
  notas medem o estado observado, não a intenção documental, e itens com escopo
  externo (clínica, ambiente, CI remota) são descontados por isso.

## 3. Matriz de notas 0–100

| # | Item avaliado | Peso | Nota | Julgamento resumido |
|---|---|---:|---:|---|
| 1 | Documentação, gates e governança | 6% | **93** | Corpus canônico, gates executáveis e estado/log/backlog consistentes (`verify:documentation` PASS); desconto: cadeia de evidência do candidato aponta para `3cd7bc3`, decisões humanas antigas ainda abertas. |
| 2 | Discovery, PRD e SPEC como definição | 6% | **90** | Ordem e cobertura verificadas por gate; a distância definição→construção está explícita; desconto por pendências de produto formalmente abertas (somativa, conteúdo). |
| 3 | Currículo e conteúdo clínico | 10% | **52** | Estrutura, 24 packs, B-07 120 itens e runtime persistido existem, mas **0/153 itens revisados** nesta fase e nenhum módulo `PUBLICADO`; H-CONTENT aberto. Maior bloqueio de produto. |
| 4 | Arquitetura e modularidade | 6% | **95** | Policy de fronteiras executável, sem ciclos, dead-code limpo, direção de dependências validada no verify. |
| 5 | Domínio, contratos e regras | 6% | **93** | Contratos estritos, máquinas de estado, política somativa composta e testada; desconto pelo provedor somativo retornar `null` no caminho produtivo (débito P2 condicional). |
| 6 | Persistência, migrações e integridade | 7% | **94** | 59 migrações; integração live completa (RLS, fencing, obrigações 0058, grants) 882 PASS; desconto: T01 live editorial provado só localmente e provisionamento de produção ainda sem runbook próprio (DA-02). |
| 7 | API e superfície backend | 7% | **93** | 58 rotas bidirecionalmente consistentes, envelopes e autorização cobertos; desconto: correções de jornada T13–T22/T24 ainda sob hold (M12/M23). |
| 8 | Segurança, identidade e privacidade | 9% | **92** | RLS live, menor privilégio, secret scan e audit limpos, sem CVE; desconto: rate limit por classe auth (T20), recuperação além do convite, HTTPS real, branch protection e cofre de segredos pendentes. |
| 9 | Jornada do participante e produto | 8% | **70** | Diagnóstico, reflexão, recurso, remediação/retenção e receipts F02 existem; somativa não grava receipts, holdovers de jornada abertos e nenhum piloto. |
| 10 | Autoria, avaliação somativa e governança clínica | 8% | **62** | Workflow editorial versionado e gate de publicação funcionam; revisão clínica 0/153, REM-06 pendente e publicação bloqueada. |
| 11 | Worker, Qdrant, IA e resiliência | 5% | **86** | Lease/fencing/replay/retry live verdes; Qdrant live e IA real não reexecutados nesta rodada; IA/Qdrant desligados por default no lançamento (M17). |
| 12 | Observabilidade e operação | 5% | **72** | Health/readiness, métricas redigidas, SLO/alertas, backup testado e smoke do stack já ensaiados; sem collector ativo, dashboard, alerta roteado ou RPO/RTO medido (M05/M06/M10/M14). |
| 13 | Web, UX e acessibilidade | 5% | **93** | 290 browser + 45 E2E mockado + 2 E2E real verdes, axe sem violações; desconto: aceitação manual/leitor de tela (M16) e decomposição de páginas (M25). |
| 14 | Testes, cobertura e qualidade de evidência | 6% | **94** | 3.929 unit + 882 live PG + 779 integração + 290 browser + 47 E2E; cobertura acima dos pisos; desconto: mutação (Stryker) não reexecutada no candidato. |
| 15 | CI remota, reprodutibilidade e release | 6% | **52** | `quality` remoto nunca verde no SHA remediado; same-SHA FAIL; bundle de release sem digests k6/otel/ratelimit; release/dispatch não executados (H-REMOTE). |
| 16 | Infraestrutura e deployabilidade | 4% | **55** | Dockerfiles, compose, backup, assinatura e observabilidade definidos e ensaiados localmente; VPS não contratada (M05), sem deploy real, TLS, DNS ou capacidade. |
| 17 | Rastreabilidade e controle de mudança | 2% | **72** | Manifesto estruturalmente válido e gates de documentação/rastreabilidade PASS; desconto: artifact digests inválidos (fatal do AAA), candidato `3cd7bc3` e 2 commits não publicados. |

**Média ponderada = 84/100** (Σ peso×nota; cálculo em §7).

## 4. Achados priorizados

| ID | Sev. | Achado | Evidência |
|---|---|---|---|
| AUD-S-01 | **P0** | Cadeia de evidência de release não pertence ao HEAD: candidato auditado `3cd7bc3`, digest mismatch fatal, same-SHA ausente (quality/security/candidate nunca rodaram no SHA remediado). | `verify:triple-aaa` FAIL; `verify:aaa-candidate` FAIL (9 gates); `staging-evidence/remote-ci-summary.json` |
| AUD-S-02 | **P0** | Conteúdo clínico do piloto não publicado: 0/153 itens revisados; vivem apenas drafts/packs sintéticos. | `docs/clinical/review-m02-b07-2026-10-08.md`; backlog 30 PROD-M03 |
| AUD-S-03 | **P0** | Ambiente real inexistente: sem homologação/produção, RPO/RTO, alertas roteados, HTTPS com proxy confiável ou entrega de convites. | `docs/operations/homologation-vps.md`; PROD-M05/M06/M10/M14/M15 |
| AUD-S-04 | P1 | Somativa incompleta no caminho produtivo (`summativeApproval` retorna `null`; sem produtor nativo de inventário/audit); receipts somativos não gravam. | `packages/persistence/src/module-obligation-summative-approval.ts`; log R63; REM-06 |
| AUD-S-05 | P1 | Holdovers de jornada/segurança sem crítica fresca: T13–T24 (rate limit por classe, recuperação, trilha de negações, etc.) e M12/M23 em andamento. | backlog 61; PROD-M12/M23 |
| AUD-S-06 | P1 | Bundle de release sem sumários k6/otel/ratelimit; mutação crítica não reexecutada no candidato. | `verify:triple-aaa` (mutation FAIL; digests ausentes) |
| AUD-S-07 | P1 | Capacidade/RPO/RTO nunca medidos em ambiente real; k6 apenas histórico. | release-evidence; PROD-M14 |
| AUD-S-08 | P2 | Qdrant/Redis/IA live não reexecutados nesta rodada; provedor real de IA nunca avaliado (decisão de lançamento mantém desligados). | §5; PROD-M17; G06 |
| AUD-S-09 | P2 | Shell padrão do host em Node 24 contra contrato `>=22.22 <23`; estado de runtime extenso e caro de retomar. | OP-11/M27; `docs/99_runtime_state.md` |
| AUD-S-10 | P2 | Porta 3100 ocupada por processo externo do editor no host de auditoria; E2E rodou em 3110 (mesmos testes). Não é defeito do produto. | `ss -ltnp`; logs do E2E |

## 5. Não executado nesta rodada (registrado como limite)

- Qdrant live (`test:integration:qdrant`), Redis live/restart, restore e staging script;
- Stryker (mutações), k6 (carga), collector/OTel externo, dashboards;
- Workflows remotos (`quality`, `security`, `candidate`, `release`) e dispatch;
- Provisionamento real de VPS/HTTPS/alertas e aceitação manual com leitor de tela.

Cada item pertence a M05–M18 do backlog 30 e permanece com o estado lá registrado.

## 6. O que melhorou e foi confirmado

- M09 confirmado: `pnpm audit` e `--prod` sem vulnerabilidades; M22/M26 confirmados no código.
- Remediação CI-LIVE-01…05 (`2420ffb`) reproduzida localmente: 882 PASS/0 FAIL na suíte
  live em PostgreSQL descartável recém-migrado e provisionado.
- Browser 290/290, E2E mockado 45/45 e E2E real 2/2 verdes no HEAD atual, incluindo
  browser→proxy→API→PostgreSQL com limpeza de fixture verificada.
- 23 gates do `pnpm verify` verdes, cobertura 91,07/86,97/95,07/92,40 e 3.929 testes unitários.

## 7. Cálculo da média ponderada

Σ(peso × nota) = 5,58+5,40+5,20+5,70+5,58+6,58+6,51+8,28+5,60+4,96+4,30+3,60+4,65+5,64+3,12+2,20+1,44 = **84,34 → 84/100**.

## 8. Recomendações imediatas (ordem de desbloqueio)

1. Publicar `2420ffb`+`1ae1f8d` e rodar `quality`/`security` no mesmo SHA; registrar run IDs (M07 → fecha AUD-S-01 parcialmente).
2. Concluir a revisão clínica item a item (M03) e decidir REM-06/M02 com implementação nativa.
3. Provisionar a VPS (M05) e executar M06/M10/M14/M15/M16 com evidência real.
4. Re-congelar o candidato (M13): Stryker, k6, RLS/Redis, staging, bundle completo de release.
5. Fechar holdovers M12/M23/M25 e a decomposição web, com crítica fresh.

## 9. Evidência

- `.agent/artifacts/audit-20261011/verify-full.log`
- `.agent/artifacts/audit-20261011/verify-triple-aaa.log` · `verify-aaa-candidate.log`
- `.agent/artifacts/audit-20261011/test-integration.log` · `test-integration-live.log`
- `.agent/artifacts/audit-20261011/test-browser.log` · `test-e2e-external.log` · `test-e2e-real.log`
- `docs/99_runtime_state.md`, `docs/20_master_execution_log.md`, `docs/30_backlog_master.md`

## 10. Decisão final

**Não aprovar release, piloto ou publicação clínica.** Repetir a auditoria por item
quando M07 (same-SHA verde), M03 (conteúdo clínico) e M05 (ambiente) tiverem
evidência; a base técnica já está pronta para esse fechamento.
