# Preflight dos bloqueios BLK-06 e BLK-08 — CVG

**Data:** 2026-08-14
**Escopo:** preparação local segura, sem commit, reset, deploy ou descarte de alteração.

## BLK-06-A — Inventário de worktree e runtime

### Evidência observada

- `HEAD`: `9803c85ca62cda0684802aaa68a5dd3418f43c88` (`feat: improve participant activity flow`).
- Alterações rastreadas: 95 arquivos.
- Arquivos não rastreados: 81.
- Entradas totais no status: 176.
- `git diff --check`: aprovado.
- As alterações abrangem código, testes, documentação, scripts, infraestrutura e artefatos de governança.
- Entre as 95 alterações rastreadas: 38 estão em `packages`, 23 em `BRIEFING`, 14 em `apps`, 8 em `tests`, 4 em `scripts`, 3 em `docs` e as demais em configuração/infraestrutura.
- Entre os 81 arquivos não rastreados: 24 estão em `packages`, 21 em `tests`, 16 em `scripts`, 4 em `BRIEFING`, 3 em `docs` e os demais em configuração/infraestrutura.
- APIs e workers ativos usam a imagem `cvg-trainee-vet:local` com digest `sha256:482e...`; a imagem e os containers foram criados em 12/08–13/08 e não possuem label de source SHA do commit atual.

### Resultado

`BLK-06-A` está `IN_PROGRESS`: o inventário foi realizado, mas o worktree não pode ser limpo automaticamente porque há alterações existentes do usuário. A conclusão exige revisão humana do diff, commits intencionais, tag/RC, digest e runtime derivados do mesmo SHA.

### Próximo passo seguro

Classificar os 176 entries por escopo e obter autorização de Ricardo antes de qualquer commit. É proibido usar reset destrutivo, checkout destrutivo ou apagar arquivos não rastreados.

## BLK-08-A — Preflight da matriz de requisitos

### Evidência observada

- `pnpm verify:premium-traceability` passou estruturalmente com `requirements=145`.
- Requisitos P0/P1: 87.
- Linhas com evidência local: 135/145.
- Linhas P0/P1 com evidência local: 82/87.
- Cadeias completas requisito → SPEC → task → módulo → contrato → teste → commit → artefato: 0/145.
- A matriz possui 87 IDs RF distintos no conjunto de requisitos P0/P1; os demais requisitos premium incluem RNF e linhas de governança.

### Resultado

`BLK-08-A` está `IN_PROGRESS`: o inventário estrutural de requisitos existe e o verificador detecta os gaps, mas a matriz ainda não possui evidência completa de execução, commit e artefato. O resultado permanece `PASS_WITH_GAPS` e `PILOT_BLOCKED`.

### Próximo passo seguro

Fechar cada linha com owner, risco, task, módulo, contrato, teste, comando, SHA, artifact, timestamp, ambiente e teardown; rejeitar placeholders e paths inexistentes. A meta é 145/145 no mesmo release candidate, não apenas 145 linhas preenchidas.

## Conclusão do preflight

O preflight produz evidência útil e reproduzível, mas nenhum dos dois bloqueios está resolvido. BLK-06-B/06-C/06-D e BLK-08-B/08-C/08-D dependem de revisão humana, execução adicional, release candidate e/ou ambiente autorizado.

## Readiness externo observado

- `pnpm ops:verify-identity-provider`: `NOT_EXECUTED`; o ambiente aprovado não foi fornecido.
- `pnpm ops:verify-production-security`: `NOT_EXECUTED` sem a flag de execução autorizada; a execução anterior com a flag falhou fechado pela ausência das referências externas obrigatórias.
- `pnpm ops:verify-release-manifest`: `PASS` apenas para o manifesto de exemplo local; isso não é um release real, nem prova registry, deploy ou rollback atuais.

Esses resultados confirmam que os gates externos continuam pendentes e não podem ser convertidos em `COMPLETED` por configuração local.

## Atualização de runtime — 2026-08-14T08:24:53-03:00

Após este preflight histórico, o runtime local foi reconstruído e reconciliado: API-A/API-B e worker-A/worker-B estão saudáveis no digest comum `sha256:51582f1cdfabf7deddd4a55c230526d19936ef139fc4171721c7cfafb43ccf01`, com `CVG_SOURCE_SHA=worktree-9803c85ca62cda0684802aaa68a5dd3418f43c88-dirty`. `pnpm test:e2e:active-ha` passou 3/3, dashboard/acessibilidade passaram 7/7 e a migração 0023 está aplicada. A inconsistência anterior de digest foi corrigida por um build único; o fixture agora encerra com código 0.

Isso não conclui BLK-06: o worktree continua sujo e a proveniência é um identificador dirty, não um SHA de release aprovado. Também não conclui BLK-08, que permanece em 0/145 cadeias completas e 10 gaps locais. Os gates clínicos, externos e humanos seguem aguardando autorização/ambiente.

## Atualização de higiene e verificação — 2026-08-14T08:44:18-03:00

O fixture foi ajustado para limpar apenas resíduos sintéticos com prefixo `real-e2e-*`; o E2E ativo passou 3/3 com teardown código 0 e a inspeção posterior encontrou zero contas, atividades, versões de conteúdo, estados de caso digital, estados curriculares e sessões sintéticas escopadas. `pnpm verify` passou com 138 arquivos/639 testes/18 skips e cobertura 85,28%/81,36%/86,88%/85,99%.

Essa correção encerra a inconsistência de higiene local, não BLK-06 nem BLK-08: o worktree segue dirty, não existe RC/SHA imutável aprovado, a matriz está em 0/145 cadeias completas e os 10 gaps locais continuam explícitos. BLK-06-B/C/D, BLK-08-B/C/D e os gates clínicos, externos e humanos permanecem pendentes.
