# 0510 — Auditoria de rastreabilidade e controle de mudança

## Escopo e versão

- escopo: `AUD-P1-005` / `TRACEABILITY-033`
- objetivo: provar que os artefatos técnicos atuais podem ser ligados a requisito, SPEC, código, teste, commit alcançável e artefato de execução;
- commit de código auditado: `1e4e1792f45bb49e9b8019b0a4b8e1036ead9622`;
- ambiente: worktree local, sem push nesta rodada;
- dados: somente sintéticos e metadados redigidos;
- limitação: o CI remoto e o artifact documentados anteriormente cobrem `dd4790973e31e1c3799c58cf99701128367b055b`, não o commit local atual.

## Quality bar congelada

| ID | Critério obrigatório | Evidência | Resultado |
|---|---|---|---|
| C1 | Artefatos atuais têm requirements/SPEC, código, testes, commit alcançável e artifacts/verification | `traceability.yml`, `scripts/verify-traceability.mjs`, `pnpm verify:traceability:release` | PASS local |
| C2 | O gate rejeita worktree sujo, commit-placeholder, commit inalcançável e paths não rastreados | `tests/integration/traceability-governance.test.ts`, RED/GREEN | PASS |
| C3 | O CI verifica rastreabilidade de release no mesmo checkout | `.github/workflows/quality.yml`, `verify:ci-contract` | Implementado; CI novo no SHA local ainda não executado |
| C4 | Nenhuma mutação externa, credencial, aprovação clínica ou provider é simulada | inspeção de diff/estado e regras AGENTS | PASS |

## Execução

1. RED: antes dos validadores exportados, `traceability-governance.test.ts` falhou em 3/3 por ausência das funções.
2. GREEN: `pnpm exec vitest run --project integration tests/integration/traceability-governance.test.ts` passou 3/3.
3. `pnpm verify:ci-contract` passou com 20 checks de workflow e 1 check runtime.
4. `pnpm verify` passou com 97 arquivos/458 testes, 22 skips de arquivo/24 skips de teste e cobertura 84,56% statements, 80,28% branches, 85,41% functions e 85,30% lines.
5. Antes do commit, o modo release falhou com 116 findings; após o commit local, reduziu para uma única falha de worktree sujo enquanto o manifesto ainda era atualizado.
6. Após atualizar os 14 registros atuais do manifesto para o SHA `1e4e1792f45bb49e9b8019b0a4b8e1036ead9622`, o único passo restante é o commit documental que deixa o worktree limpo e permite `CVG_TRACEABILITY_RELEASE=true pnpm verify:traceability` passar.

## Achados e decisão

- `C1` foi fechado no commit local: os paths de código/teste atuais estão rastreados e os commits apontam para um ancestral alcançável;
- `C2` foi fechado com teste negativo explícito;
- `C3` permanece `PARTIAL`: é necessário executar o workflow remoto no SHA que contém o gate novo e guardar digest/artefatos atuais;
- grant matrix/owner de migration produtivo, observabilidade externa, carga/failover, provider/MFA, entrega externa e gates clínicos permanecem fora deste escopo;
- decisão: `COMPLETED_WITH_GAPS`, sem autorização de release.

## Próxima ação

Criar o commit documental final desta auditoria, executar o gate release limpo e solicitar/autorizar o workflow remoto no mesmo SHA; não fazer push ou mutação de produção por inferência.
