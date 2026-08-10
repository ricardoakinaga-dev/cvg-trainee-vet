# 0508 — Auditoria de CI, reprodutibilidade e prontidão de build

**Data:** 2026-08-10, America/Sao_Paulo  
**Item:** 15 — CI, reprodutibilidade e prontidão de build  
**Backlog:** `CI-15-01`  
**Baseline:** 50/100 em `0491_full_construction_audit.md`  
**Resultado atual:** **78/100 — INCOMPLETO, AGUARDANDO EXECUÇÃO REMOTA**  
**Escopo:** contrato técnico de ambiente, workflow, gates, artefatos e reprodução local; não é aprovação clínica, piloto ou release.

## Veredito

O incremento local de `CI-15-01` fechou o contrato verificável de Node/pnpm, lockfile, ambiente, serviços descartáveis, migrations, live PostgreSQL/Qdrant, restore, build, E2E e publicação condicional de `coverage/`, `playwright-report/` e `test-results/`. A imagem Qdrant foi validada no pin `qdrant/qdrant:v1.15.5`; como ela não contém `curl`, a prontidão foi implementada no runner Ubuntu contra `127.0.0.1:6333/readyz`, sem depender de um healthcheck inválido dentro do container.

O baseline verificado foi congelado localmente no commit `241a04ce4ba77245b46782d2f37732cf616b4baf` (`feat: establish CVG build and CI contract`), com worktree limpo após o commit. O workflow remoto ainda não pode ser executado: o checkout não possui `origin`, nenhum repositório `cvg-trainee-vet` foi localizado na conta GitHub autenticada e o conector disponível não consulta nem dispara Actions. Portanto não há SHA remoto, duração de job, artefato do Actions, confirmação de cache ou rollback remoto. O item 15 não atinge 95/100 e o item 16 não é aberto.

## Matriz de avaliação

| Dimensão | Peso | Nota | Evidência |
|---|---:|---:|---|
| Contrato de ambiente e pins | 20 | 20 | `.nvmrc`, `package.json`, lockfile, `.env.example`, `verify:ci-contract` e teste RED/GREEN. |
| Workflow e dependências descartáveis | 20 | 18 | PostgreSQL 16, Qdrant 1.15.5, readiness no runner, migrations, live, restore, E2E padrão/real, audit e artefatos `always()`. |
| Reprodução local no mesmo contrato | 25 | 22 | `pnpm verify`, build, migrations e containers descartáveis pinados; live estendido 23/32; restore isolado. |
| Artefatos e diagnóstico | 15 | 12 | `coverage/`, `playwright-report/` e `test-results/playwright.xml` produzidos localmente; upload está no workflow, mas ainda sem job remoto. |
| SHA, execução remota, rollback e cache observáveis | 20 | 6 | SHA local intencional `241a04ce4ba77245b46782d2f37732cf616b4baf` e worktree limpo; cache `pnpm` e retenção de artefatos declarados; sem remoto, rollback exercitado ou logs de infraestrutura. |
| **Total** | **100** | **78** | **INCOMPLETO** |

## RED → GREEN → REFACTOR

- **RED:** `pnpm vitest run --project integration tests/integration/ci-governance.test.ts` falhou em 2/2 porque `.nvmrc` ainda não existia; o workflow também não tinha Qdrant, contrato de integração, artefatos ou `verify:ci-contract`.
- **GREEN:** o teste passou em 2/2 e `pnpm verify:ci-contract` retornou `PASS`, com Node `22.22.0`, pnpm `10.33.0`, 12 chaves de ambiente e 19 verificações de workflow.
- **REFACTOR:** a prontidão Qdrant foi movida do container para o runner após a verificação da imagem mostrar que `curl` não está instalado; chaves opcionais vazias foram retiradas do ambiente CI para não violar o schema.

## Evidência executada

| Verificação | Resultado |
|---|---|
| `pnpm verify` | PASS — 77 arquivos/354 testes; 17 skips condicionais; 84,92% statements, 80,34% branches, 85,89% functions, 85,61% lines. |
| `pnpm build` | PASS — 12 workspaces. |
| `pnpm audit --audit-level=high` | PASS — nenhuma vulnerabilidade conhecida. |
| `pnpm db:migrate` | PASS — migrations 0000–0014 em PostgreSQL 16 descartável. |
| `pnpm test:integration:extended` | PASS — 23 arquivos/32 testes, PostgreSQL + Qdrant pinados + restore isolado. |
| `pnpm test:e2e` | PASS — 12/12. |
| `CVG_RUN_REAL_E2E=true pnpm test:e2e` | PASS — 14/14, fluxo participante persistido em PostgreSQL. |
| `pnpm verify:ci-contract`, `pnpm format:check`, `git diff --check` | PASS. |
| Commit local intencional | PASS — `241a04ce4ba77245b46782d2f37732cf616b4baf`; `git status --short --branch` limpo. |
| Artefatos locais | `coverage/`, `playwright-report/` e `test-results/playwright.xml` gerados; não contêm dados reais e permanecem ignorados pelo Git. |

Os containers `cvg-score95-15-postgres` e `cvg-score95-15-qdrant` foram removidos após a execução; nenhum serviço pré-existente foi alterado.

## Gaps e decisão

- falta um repositório GitHub identificado, um `origin` configurado e autorização para publicar o baseline local em branch/commit intencional;
- a execução remota, SHA, duração, artefatos efetivamente anexados, cache observado, falha de infraestrutura e rollback continuam sem evidência;
- carga, failover, restart, múltiplas réplicas e operação externa permanecem gaps próprios, mesmo depois do CI remoto;
- release, piloto, publicação clínica e transição para `PUBLICADO` continuam bloqueados pelos gates humanos e clínicos já registrados.

**Decisão operacional:** manter `CI-15-01` em `WAITING_HUMAN_APPROVAL`, não abrir o item 16 e não declarar 95/100 por inferência local. Próxima ação: Ricardo deve informar/aprovar o repositório GitHub e a publicação do commit local `241a04ce4ba77245b46782d2f37732cf616b4baf` para que o workflow seja executado no SHA correto.
