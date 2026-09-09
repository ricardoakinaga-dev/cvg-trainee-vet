# AAA-701 — reconciliação Qdrant derivada

**Data do checkpoint:** 2026-09-06 20:19 -03:00  
**Status:** implementação local bounded concluída; crítica fresh final encerrada
sem parecer; não promover a `COMPLETED` antes de nova revisão independente e
dos gates live.

## Escopo implementado

- `VectorPointMetadata` agora carrega `indexVersion` e `embeddingModel`.
- `VectorStorePort` expõe a configuração efetiva do índice; o `EmbeddingPort`
  expõe o modelo efetivo que gerou os vetores.
- `Qdrant.list()` observa pontos internos aprovados de qualquer versão e usa
  allowlist explícita no `scroll`, sem solicitar payload arbitrário legado.
- O reconciliador calcula hash/ID/metadados antes de embeddar, chama o provider
  somente para registros novos ou divergentes e trata no-op sem custo de
  embedding.
- O reconciliador falha fechado se modelo de embedding e índice divergirem,
  remove órfãos/versões antigas e mantém PostgreSQL como fonte autoritativa.
- A execução passa por `pg_advisory_lock` estável
  (`cvg:qdrant:reconcile`) para impedir reconciliações concorrentes entre
  processos que compartilham o PostgreSQL; o unlock ocorre em `finally`.
- Nenhuma migration, rota pública, projeção participante ou conteúdo clínico
  foi alterado nesta fatia.

## TDD e verificações

- RED inicial: `qdrant.test.ts` falhou porque pontos de índice antigo eram
  descartados e não carregavam metadados de versão/modelo.
- GREEN focal final: `5` arquivos/`18` testes PASS (`ai`, `qdrant`,
  `database`, `reconcile`, `handlers`).
- Builds/typechecks: `@cvg/integrations build`, `@cvg/persistence build`,
  `@cvg/worker typecheck` e `@cvg/worker build` PASS.
- Verificação ampla: `corepack pnpm verify` PASS — `149` arquivos, `811`
  testes, `42` skips; cobertura `84,35%` statements, `80,21%` branches,
  `87,34%` functions e `85,09%` lines.
- Gates de migrations (`54/54`), secrets, CI contract (`24` checks),
  traceability, architecture, documentation, product-definition e public
  boundary PASS.

## Revisão independente e limites

A primeira crítica fresh encontrou P1 de concorrência e P2s de no-op,
allowlist e modelo; esses achados foram tratados na implementação acima. A
segunda crítica fresh foi encerrada no agente `Euler`
(`01a07903-d239-77e1-8e80-204781c8a175`) antes de entregar parecer; portanto
não há aprovação independente nesta rodada. Uma nova crítica fresh deve ser
executada e integrada antes do fechamento.

Não há `CVG_TEST_DATABASE_URL`, PostgreSQL/Qdrant live, teste de lock em banco
real, workflow remoto same-SHA, produção, collector, carga, restore, clínica,
piloto ou competência prática nesta rodada. Portanto a evidência é local,
sintética e não é evidência de release.
