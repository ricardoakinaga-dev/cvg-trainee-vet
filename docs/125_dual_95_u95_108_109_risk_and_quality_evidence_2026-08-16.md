# Dual 95 — U95-108 e U95-109 — evidência local

**Data:** 2026-08-16 14:39 BRT  
**Estado:** `PASS_WITH_GAPS` / `PILOT_BLOCKED`  
**Escopo:** matriz de risco P0/P1 e ratchet de funções longas; sem alteração de score, release, SHA, commit, staging ou publicação.

## U95-108 — matriz de risco

O gate `pnpm verify:test-risk-matrix` continua derivando `87` requisitos P0/P1 da matriz canônica. O resultado observado foi:

| prova | linhas cobertas |
|---|---:|
| success | 87/87 |
| error | 63/87 |
| denied | 26/87 |
| conflict | 36/87 |
| quatro provas na mesma linha | 11/87 |

Os `87/87` possuem destinos de teste, mas isso não prova, por si só, cada ramo de risco. Não foi criada classificação `N/A`: as linhas sem `denied`/`conflict` ainda não têm justificativa explícita e aprovação correspondente no repositório. Portanto, U95-108 permanece aberto; não há evidência honesta para promovê-lo a `COMPLETED`.

## U95-109 — ratchet e redução local

O ciclo de refatoração de proveniência/release:

- extraiu a resolução de configuração e o ciclo deploy→rollback→restore do rehearsal local;
- separou validação de identidade/digest/política do manifesto;
- separou leitura de imagem e validação por container na atestação de runtime;
- preservou limpeza de container/imagem sintética, health gates, digest esperado e vínculo SHA↔digest.

O ratchet executável em `code-hotspot-policy.json` foi reduzido de `193/741` para `152/128` (`maxLongFunctions`/`maxLongestFunctionLines`). A leitura atual retorna exatamente `152` funções longas e maior função de `128` linhas; não há margem para regressão. Ainda existem `22` funções acima de `100` linhas, sem matriz de exceção com owner e prazo; por isso U95-109 fica em `IN_PROGRESS`, e não como concluída.

## Verificações

- RED da nova caracterização de configuração: falha por helper ausente;
- GREEN focal: `24/24` testes, incluindo local rehearsal, runtime provenance e hotspot policy;
- cobertura global: `177` arquivos, `806` testes, `18` skips; `84,55%` statements, `80,05%` branches, `86,58%` functions, `85,36%` lines;
- `pnpm verify:hotspots`, `pnpm typecheck`, `pnpm lint` e os dry-runs de manifesto/deploy/rollback passaram;
- a atestação live local passou nos quatro containers com source SHA `1579442fa3dcf9a32bf5e7e1ce73977f2d8a60cd` e digest `sha256:231bb5733b51eb8a20fada20eae86af6ff082dd442ec52323b6ec286f76fe4cf`.

## Revisão final pós-diff — 14:50 BRT

A revisão encontrou um caso de cleanup: uma imagem sintética criada por `docker commit` poderia não ser marcada para recuperação se o `inspect` seguinte falhasse. A marcação foi antecipada para o início do ciclo; focais, dry-runs, hotspots, typecheck/lint, `git diff --check` e `pnpm verify` passaram novamente. O status e os gaps acima não mudaram.

## Limites e próxima ação

O ratchet e a refatoração são evidência do worktree atual. A matriz de risco ainda depende de testes/provas por linha ou de justificativas `N/A` aprovadas; as funções acima de `100` precisam ser decompostas ou governadas por exceção temporária com owner/prazo. Baselines `83,24/100` e `64,20/100`, `0/145`, `PILOT_BLOCKED` e o bloqueio de U95-107 permanecem inalterados.
