# ExecPlan — AAA-700: resiliência bounded da IA assistiva

## Objetivo

Fechar a camada local e determinística de resiliência dos adaptadores de IA e
embeddings, sem tornar a IA parte do caminho crítico de aprendizagem, nota,
publicação, autorização ou resposta ao participante.

## Quality bar congelada

- somente chamadas server-side e saída estruturada já validada;
- no máximo três tentativas por operação lógica, com backoff exponencial,
  jitter injetável e respeito a `Retry-After` quando disponível;
- retry somente para timeout, rede, `408`, `409`, `429` e `5xx`; erro de
  schema, autenticação, autorização, entrada ou configuração falha fechado;
- orçamento por instância limita operações lógicas e caracteres enviados;
- nenhum prompt, resposta completa, chave, token ou dado clínico entra no erro,
  teste ou métrica desta fatia;
- relógio, aleatoriedade e espera injetáveis para RED/GREEN determinístico;
- testes unitários cobrem sucesso, retry, backoff, limite, classificação e
  falha permanente; o fallback permanece responsabilidade do worker e não
  publica nem altera estado.

## Escopo técnico

- `packages/integrations/src/ai.ts`: política, classificação, orçamento e
  wrappers para `AiTextPort`/`EmbeddingPort`;
- `packages/integrations/src/ai.test.ts`: RED/GREEN/REFACTOR dos invariantes;
- `packages/integrations/src/composition.ts`: composição server-side dos
  wrappers para IA e embeddings configurados;
- `packages/integrations/src/index.ts`: exportação pública do contrato;
- `traceability.yml`, backlog, log e runtime state: cadeia de evidência.

## Fora do escopo

Fornecedor real, credencial real, collector externo, decisão de produto sobre
custos globais, fallback clínico, alteração de estado editorial, banco/RLS,
produção, deploy, piloto ou publicação de conteúdo.

## Verificação

1. RED: testes focais falhando antes do wrapper.
2. GREEN: implementação mínima e composição.
3. REFACTOR: typecheck, lint, format, cobertura e testes de integração local.
4. Evidência bounded com limitações explícitas; sem claim live ou produtivo.
