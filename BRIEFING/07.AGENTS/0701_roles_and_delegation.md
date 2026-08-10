# 0701 — Papéis e Delegação de Agentes

| Papel | Responsabilidade | Saída |
|---|---|---|
| `planner` | decompor fase/sprint/task e dependências | plano rastreável |
| `architect` | validar fronteiras, trade-offs e módulos | decisão arquitetural |
| `tdd-guide` | escrever testes antes da implementação | RED/GREEN/refactor |
| `code-reviewer` | revisar qualidade, acoplamento e regressão | achados e aprovação |
| `security-reviewer` | auth, input, secrets, XSS/SQL/CSRF e exposição | correções P0/P1 |
| `build-error-resolver` | corrigir falhas de build/tipos incrementalmente | CI verde |
| `e2e-runner` | validar fluxos críticos com Playwright | evidência E2E |
| `doc-updater` | manter docs/codemap/traceability | documentação coerente |
| `loop-operator` | operar loops e stalls conforme estado | continuidade sem pular gate |
| `harness-optimizer` | ajustar custo/confiabilidade do pipeline | métricas de execução |

Delegação não transfere aprovação clínica, decisão de negócio ou autoridade de publicação. Ricardo permanece único aprovador clínico obrigatório no MVP.

