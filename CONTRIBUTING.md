# Contributing

Constituição operacional: `AGENTS.md` (leitura obrigatória antes de qualquer ação).
Pipeline `DISCOVERY → PRD → SPEC → BUILD → AUDIT`; TDD `RED → GREEN → REFACTOR`;
nunca usar dados reais.

## Setup

```bash
corepack enable && corepack prepare pnpm@10.33.0 --activate
pnpm install --frozen-lockfile
pnpm typecheck && pnpm verify:architecture
```

## Test commands (proporcionais à mudança)

```bash
pnpm vitest run --project unit <paths>  # focal TDD
pnpm test:coverage                        # pirâmide + cobertura (≥80%)
pnpm test:contract && pnpm test:worker
pnpm verify:migrations && pnpm verify:secrets
pnpm verify:traceability && pnpm verify:documentation
pnpm verify:product-definition && pnpm verify:exposure
pnpm build && pnpm test:e2e && pnpm audit --audit-level=high
git diff --check
```

## Migration rules

Append-only, ordenadas, imutáveis após aplicadas; `verify:migrations` deve
passar; forward-fix em vez de edição histórica.

## PR checklist

- [ ] TDD com evidência; sem teste inútil para cobertura
- [ ] Arquitetura: `verify:architecture` verde, sem novo God Module
- [ ] Segurança: capability + scope server-side; sem segredo/log sensível
- [ ] Docs/estado/log/backlog atualizados; rastreabilidade preservada
- [ ] `git diff --check` limpo; diff pequeno e coeso

## Security expectations

Reportar vulnerabilidades em privado (ver `SECURITY.md`); nunca commitar
segredo ou dado real; Actions com SHA pinado.
