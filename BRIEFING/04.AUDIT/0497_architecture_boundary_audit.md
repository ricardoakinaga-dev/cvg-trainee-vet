# 0497 — Auditoria do item 4: arquitetura e modularidade

**Data:** 2026-08-10, America/Sao_Paulo  
**Base:** `BRIEFING/04.AUDIT/0491_full_construction_audit.md`  
**Item:** 4 — Arquitetura e modularidade  
**Baseline:** 80/100  
**Reavaliação técnica:** **95/100**  
**Estado:** `COMPLETED_WITH_GAPS`

## 1. Escopo e critério

Esta auditoria avalia somente a arquitetura e a modularidade: responsabilidades, direção de dependências, fronteiras entre processos, composição de adaptadores, testabilidade, rollback e rastreabilidade. Não transforma funcionalidades ainda não implementadas em funcionalidades prontas e não altera os itens posteriores do 0491.

O desenho de referência permanece nos documentos SPEC 0101–0103, 0115–0118. O novo artefato `architecture-boundaries.json` torna o mapa de dependências executável: os manifests de workspace precisam coincidir com as dependências permitidas e os imports de produção precisam respeitar as proibições por camada.

## 2. Evidência materializada

| Evidência | Resultado |
|---|---|
| Monorepo pnpm com 12 pacotes/apps declarados | `@cvg/domain`, `@cvg/curriculum`, `@cvg/contracts`, `@cvg/application`, `@cvg/persistence`, `@cvg/integrations`, `@cvg/config`, `@cvg/observability`, `@cvg/ui`, API, web e worker |
| Matriz executável | `architecture-boundaries.json` registra documentos-fonte, dependências permitidas e imports proibidos |
| Teste de dependência | `tests/integration/architecture-boundaries.test.ts` valida o grafo real dos manifests |
| Teste de isolamento de imports | O mesmo teste percorre somente produção, exclui fixtures/testes e rejeita acoplamento server-only, SQL/ORM na borda e dependências inversas proibidas |
| Composição | API e worker montam adapters; domínio/currículo não conhecem HTTP, SQL, cookies, filesystem, Qdrant ou IA |
| Fonte de verdade | PostgreSQL permanece transacional; Qdrant/IA ficam atrás de adapters e não decidem estado, nota, publicação ou aprovação clínica |
| Rollback | Mudanças de boundary são reversíveis removendo a entrada da policy e o consumidor; migrações seguem Drizzle versionado; nenhum conteúdo clínico é promovido por este artefato |

## 3. Regras verificadas

1. `domain`, `curriculum` e `contracts` são independentes de pacotes internos server-side.
2. `application` depende apenas de domínio/currículo; persistência e integrações implementam portas sem serem importadas pela regra de aplicação.
3. `persistence` pode usar tipos de portas da aplicação, mas não importa configuração, contratos HTTP, observabilidade ou SDKs externos.
4. `integrations` contém Qdrant/IA/configuração e não conhece API, web ou casos de uso.
5. API não acessa Drizzle/PostgreSQL/SDK externo diretamente; worker também usa composição e adapters.
6. Web não recebe configuração server-side, banco, IA, Qdrant ou regra clínica.
7. Testes de arquitetura ignoram fixtures e verificam o código de produção, evitando false positives em testes de integração.
8. Uma alteração proibida falha no gate `pnpm verify:architecture` antes do build de release.

## 4. Nota

| Dimensão | Nota | Evidência | Desconto restante |
|---|---:|---|---|
| Contextos e responsabilidades | 20/20 | SPEC 0101–0103, bounded contexts e mapa de módulos coerentes | Não há desconto nesta dimensão |
| Direção e isolamento de dependências | 24/25 | policy executável cobre 12 manifests e imports proibidos por camada | A persistência ainda referencia tipos de portas da aplicação no mesmo workspace, uma decisão aceitável, mas que pode ser extraída para pacote de ports se o domínio crescer |
| Composição, adapters e fonte de verdade | 19/20 | API/worker fazem composição; PostgreSQL é transacional; Qdrant/IA são derivados e desligáveis | A web ainda não consome um pacote compartilhado de UI/contratos; usa a borda HTTP como integração, adequado ao recorte atual |
| Testabilidade e mudança segura | 15/15 | TDD RED→GREEN, teste estático de boundary, typecheck, build, cobertura e traceability | Nenhum desconto nesta dimensão |
| Falha, rollback e operação arquitetural | 12/12 | portas, adapters, retry/outbox, migrations versionadas e rollback documentado | RPO/RTO e operação real continuam avaliados em item 12, não são mascarados aqui |
| Evidência e rastreabilidade | 5/8 | policy, teste, SPEC, backlog, log e manifesto ligados | O código ainda está em working tree não congelado; a cadeia de commit será fechada no item 16 |
| **Total** | **95/100** |  |  |

## 5. Verificação TDD

### RED

Antes da policy existir, o teste foi executado e falhou em 2 casos por ausência de `architecture-boundaries.json`.

### GREEN

Após a criação da policy, o teste passou:

```text
pnpm vitest run tests/integration/architecture-boundaries.test.ts
Test Files  1 passed (1)
Tests       2 passed (2)
```

O gate foi adicionado ao pipeline:

```text
pnpm verify:architecture
```

Os gates gerais passaram serialmente no mesmo working tree: `pnpm verify` com 59 arquivos/260 testes e 9 skips, `pnpm typecheck`, `pnpm build`, `pnpm test:e2e` com 5/5 cenários, integração live com 13 arquivos/19 testes e 1 skip, `pnpm audit --audit-level=high` sem vulnerabilidades conhecidas e `git diff --check`. O score não substitui nenhum gate.

## 6. Riscos e rollback

- Se a policy reprovar uma dependência legítima, a alteração deve primeiro atualizar SPEC 0103, policy e teste no mesmo diff; não se deve desabilitar o gate.
- Se uma mudança exigir uma dependência inversa, criar uma porta/tipo em pacote apropriado ou registrar decisão arquitetural antes de liberar o import.
- Se a integração nova falhar, remover o consumidor e sua entrada de policy é reversível; nenhuma migração de conteúdo é necessária para este item.
- Se o build ou typecheck ficar vermelho, o item volta para `IN_PROGRESS` e a nota não é considerada concluída.

## 7. Limites

Esta reavaliação não declara prontidão do produto completo, não fecha RLS contextual, não cria E2E navegador→API real, não aprova conteúdo clínico e não afirma competência prática. Esses limites permanecem nos itens correspondentes e no gate clínico do programa curricular.

## 8. Decisão

O item 4 alcança **95/100** no escopo arquitetural e está liberado para a próxima etapa da ordem controlada. A publicação clínica permanece bloqueada independentemente desta nota. O item 5 pode iniciar; seus próprios requisitos, testes e gates continuam obrigatórios.
