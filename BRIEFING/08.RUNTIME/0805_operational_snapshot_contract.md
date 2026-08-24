# 0805 — Contrato de Snapshot Operacional Local

**Status:** fatia local em execução; não equivale a collector ou aprovação de produção.

## Objetivo

Materializar uma leitura operacional agregada para o runtime CVG. A leitura combina o
estado redigido de dependências com os contadores allowlisted do processo e avalia os
SLOs mínimos sem tocar em estado educacional, nota, gabarito, publicação ou conteúdo
clínico.

## Contrato

- `GET /internal/operations` exige autenticação e a capability `VIEW_INTERNAL_AUDIT`;
- a resposta contém somente `status`, estados redigidos de dependências, avaliações de
  SLO e códigos/severidade de alertas;
- disponibilidade usa os contadores `api.requests.total` e considera apenas eventos
  classificados como `success` como bons;
- latências sem amostra p95 não são inferidas: ficam `NO_DATA` e abrem `slo_no_data`;
- `NOT_READY` do agregado abre `postgres_not_ready` crítico; `DEGRADED` abre
  `qdrant_degraded` de atenção;
- query parameters e body presentes são rejeitados com `422`; estados de dependência
  são validados em runtime e somente `status`, `postgres`, `qdrant` e `ai` entram na
  projeção;
- a superfície não aceita query, payload ou identificador de participante e não
  substitui o endpoint de métricas, um collector, retenção, tracing distribuído,
  failover ou restore operacional.

## Barra de aceitação

1. testes RED/GREEN cobrem disponibilidade PASS/BREACHED/NO_DATA, latência sem dados,
   degradação e redaction;
2. HTTP retorna 401/403 para acesso inválido, 503 quando o estado de dependências não
   pode ser obtido e 200 somente a auditor autorizado;
3. nenhum teste ou snapshot contém token, cookie, e-mail, participante, prompt, fonte,
   foto, PDF, prontuário ou texto clínico;
4. typecheck, lint, cobertura, build, E2E e verificações documentais continuam verdes;
5. a evidência declara explicitamente o que permanece dependente de ambiente,
   fornecedor, autoridade operacional ou aprovação clínica.
