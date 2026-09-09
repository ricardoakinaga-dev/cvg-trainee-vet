# AAA-700 — Resiliência bounded de IA e embeddings

**Data:** 2026-09-06 18:50 -03:00  
**Escopo:** provider server-side assistivo, desligável e fora da autoridade do
domínio

## RED

Antes da implementação, o foco do provider foi executado com as três
assertions de resiliência novas:

```text
corepack pnpm exec vitest run packages/integrations/src/ai.test.ts --project unit
```

Resultado RED: `11` testes, `8` passaram e `3` falharam porque os wrappers
`createResilientAiTextProvider`/embedding ainda não existiam.

## GREEN / REFACTOR

Implementados em `packages/integrations/src/ai.ts` e ligados em
`composition.ts`/`index.ts`:

- no máximo três tentativas lógicas, com backoff, jitter injetável e
  `Retry-After` bounded;
- retry apenas para timeout, rede, `408`, `409`, `429` e `5xx`;
- abort/cancelamento, orçamento de operações e limite de caracteres;
- falhas de schema, autenticação, configuração e client error não repetem;
- erro público não incorpora mensagem bruta do fornecedor;
- IA e embeddings continuam server-side, estruturados, assistivos e
  desligáveis; nenhum estado, nota, gabarito ou publicação é delegado ao
  provider.

Após o primeiro GREEN, foi acrescentado um RED específico para um adapter que
já retornasse `AiIntegrationError` com detalhe bruto. A correção passou a
sanitizar também esse caminho; o foco final de `ai.test.ts` passou `11/11`.

Verificações locais:

```text
ai.test.ts + composition.test.ts: 20/20 PASS
packages/integrations/src: 31/31 PASS
packages/integrations typecheck: PASS
packages/integrations build: PASS
monorepo typecheck/build/lint/format: PASS
```

## Limitações e decisão

O resultado é local e sintético. Não foram usados chave real, prompt real,
dados de participante, provider externo, quota real, collector ou produção.
Ainda faltam fallback operacional medido, custo/latência, evals de injection/
PII/groundedness/formato, restart/failover e execução no Node 22 do CI.
`AAA-700` permanece `IN_PROGRESS`; esta fatia não autoriza publicação clínica,
autonomia da IA ou claim de competência.
