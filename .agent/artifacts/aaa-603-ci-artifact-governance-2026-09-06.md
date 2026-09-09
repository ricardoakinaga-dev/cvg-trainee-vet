# AAA-603 — Governança de CI e artefatos

**Data:** 2026-09-06 18:48 -03:00  
**Escopo:** fatia local bounded de proveniência same-SHA, SBOM, manifesto de
hash e redaction no workflow de qualidade

## RED

O teste focal foi executado antes da implementação:

```text
corepack pnpm exec vitest run tests/integration/ci-governance.test.ts --project integration
```

Resultado RED: `18` testes, com `2` falhas novas porque o contrato ainda não
exigia a verificação de checkout same-SHA nem a etapa de governança de
artefatos.

## GREEN / REFACTOR

Implementados:

- `.github/workflows/quality.yml`: verificação de
  `EXPECTED_SHA == git rev-parse HEAD` antes da instalação; execução bounded de
  governança após os gates; publicação de `ci-artifacts/` com os relatórios;
- `scripts/ci-artifact-governance.mjs`: SBOM CycloneDX 1.5 determinístico,
  `artifact-manifest.sha256`, hash SHA-256, ordenação estável, exclusão de
  symlink fora do projeto e redaction sem imprimir o valor encontrado;
- `scripts/verify-ci-contract.mjs`: contrato estático para ordem same-SHA,
  invocação, script de governança e paths publicados;
- `tests/integration/ci-governance.test.ts`: cobertura do contrato, SBOM
  determinístico, exclusão de workspace links, redaction e manifesto.

Verificações locais:

```text
ci-governance.test.ts: 21/21 PASS
node scripts/verify-ci-contract.mjs: PASS (24 workflow checks)
node scripts/ci-artifact-governance.mjs ...: PASS (203 artefatos)
```

A execução local produziu, em diretório ignorado de `coverage/`,
`sbom.cdx.json`, `artifact-governance.json` e
`artifact-manifest.sha256`; não contém dados reais nem segredos.

## Limitações e decisão

Esta é evidência local contra worktree. O SHA informado foi o `HEAD` local,
mas o worktree contém alterações não commitadas; portanto não é prova de
execução same-SHA remota. Retenção/ACL do provedor CI, assinatura externa,
inspeção do artefato publicado, cache hit/miss, execução do workflow e política
de SBOM da organização permanecem pendentes. O shell local também usa Node
18.19.1, enquanto a verificação foi executada pelo toolchain disponível
Node 24.20.0/pnpm 10.33.0; o contrato declarado continua Node 22.22.0/pnpm
10.33.0.

Nenhum deploy, workflow remoto, mudança de dependência, migration produtiva ou
publicação clínica foi executado.
