# Evidência de 20 execuções — governança de skips/flakiness Dual99

- programa: `CVG-DUAL-99`
- task: `B99-304` / `ENT95-14-C`
- data: `2026-08-20`
- comando das repetições: `pnpm test:coverage`
- janela registrada: execuções `04`–`20`, além das três observações anteriores
  já presentes em `skip-governance.json`
- escopo: suíte autoritativa local, sem banco/Qdrant live e com os 17 arquivos
  guardados explicitamente classificados

## Resultado consolidado

As 17 repetições adicionais passaram serialmente, sem falha ou flakiness. Cada
log foi validado por contagem de `199` arquivos passantes, `1038` testes
passantes e cobertura `95,01%` statements / `91,02%` branches / `95,19%`
functions / `95,73%` lines. Não houve sobreposição entre rodadas nem alteração
de código durante a janela.

| Run | Resultado | Skips | Flaky failures | Evidência operacional |
|---:|---|---:|---:|---|
| 04 | PASS | 21 | 0 | `/tmp/cvg-dual99-coverage-run-04.log` |
| 05 | PASS | 21 | 0 | `/tmp/cvg-dual99-coverage-run-05.log` |
| 06 | PASS | 21 | 0 | `/tmp/cvg-dual99-coverage-run-06.log` |
| 07 | PASS | 21 | 0 | `/tmp/cvg-dual99-coverage-run-07.log` |
| 08 | PASS | 21 | 0 | `/tmp/cvg-dual99-coverage-run-08.log` |
| 09 | PASS | 21 | 0 | `/tmp/cvg-dual99-coverage-run-09.log` |
| 10 | PASS | 21 | 0 | `/tmp/cvg-dual99-coverage-run-10.log` |
| 11 | PASS | 21 | 0 | `/tmp/cvg-dual99-coverage-run-11.log` |
| 12 | PASS | 21 | 0 | `/tmp/cvg-dual99-coverage-run-12.log` |
| 13 | PASS | 21 | 0 | `/tmp/cvg-dual99-coverage-run-13.log` |
| 14 | PASS | 21 | 0 | `/tmp/cvg-dual99-coverage-run-14.log` |
| 15 | PASS | 21 | 0 | `/tmp/cvg-dual99-coverage-run-15.log` |
| 16 | PASS | 21 | 0 | `/tmp/cvg-dual99-coverage-run-16.log` |
| 17 | PASS | 21 | 0 | `/tmp/cvg-dual99-coverage-run-17.log` |
| 18 | PASS | 21 | 0 | `/tmp/cvg-dual99-coverage-run-18.log` |
| 19 | PASS | 21 | 0 | `/tmp/cvg-dual99-coverage-run-19.log` |
| 20 | PASS | 21 | 0 | `/tmp/cvg-dual99-coverage-run-20.log` |

Com as três observações preexistentes, o verificador agora reporta `20/20`
execuções observadas, `0` falhas flaky e status `PASS`. Isso fecha somente a
janela local de estabilidade da suíte; não fecha os testes guardados, o E2E
ativo, a validação live do mesmo RC, mutation crítica, rastreabilidade ou
qualquer gate externo. O arquivo `.env.local` de produção não foi tocado.
