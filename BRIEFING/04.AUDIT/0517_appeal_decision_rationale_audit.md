# 0517 — Auditoria do Rationale e Metadados da Decisão de Contestação

**Data:** 2026-08-24
**Item:** APPEAL-039 / AUD-P1-001
**Resultado final da fatia:** `PASS_WITH_GAPS` — comportamento local verificado;
gates live, backfill legado e crítica independente permanecem explicitamente
abertos.

## Escopo congelado

Esta fatia completa somente o registro formal de `DECIDIR`: rationale interno
bounded e texto simples obrigatório, data da decisão e correlação geradas pelo
servidor, persistência allowlisted e leitura pela fila interna. A projeção do
participante continua sem rationale, identidade de revisor ou correlação.

Não fazem parte desta fatia recálculo de nota, alteração de tentativa ou
resultado, snapshots, histórico append-only separado, identificação/notificação,
`CONCLUIR_RECALCULO`, encerramento, provider/MFA, aprovação clínica, piloto ou
produção.

## Base de produto e engenharia

- PRD: `PRD-RF-064` e `UC-018` exigem decisão e justificativa por contestação;
- regras: `RN-052` e `RN-067`;
- SPEC: `0104`, `0106`, `0107` e `0111` definem decisão, contratos, rota,
  persistência e metadados de auditoria;
- dependência local: APPEAL-038 (`91bd3e0`), que já limita atores, eventos e
  colunas mutáveis da transição interna.

## TDD — RED observado

O RED foi observado em 2026-08-24 01:01:10: 7 arquivos/10 testes falharam e
63 testes existentes passaram. A falha confirmou o contrato estrito sem
rationale, o descarte dos metadados no domínio/aplicação, a ausência na fila e
no mapeamento de persistência e o retorno HTTP `422` para o request interno.

## Implementação e evidência local

- `DECIDIR` exige rationale bounded e texto simples no contrato e no domínio;
  eventos diferentes rejeitam rationale.
- `decisionAt` e `decisionCorrelationId` são gerados/derivados no servidor;
  data, correlação e rationale entram somente no estado interno allowlisted.
- A migration `0024_appeal_decision_metadata.sql` persiste os campos e aplica
  a invariante para novas alterações; a constraint é `NOT VALID` para não
  fingir que registros legados foram saneados.
- A fila interna expõe os metadados necessários para revisão; a projeção
  pública continua allowlisted e não contém rationale, identidade, data ou
  correlação da decisão.
- focused GREEN: 13 arquivos/97 testes.
- regressão final: 113 arquivos/532 testes, 27 skips; cobertura 84,64%
  statements, 80,71% branches, 85,85% functions e 85,33% lines.
- `pnpm build`: 12 workspaces; `pnpm test:e2e`: 22/22; migrations: 25/25;
  integração configurada: 8/20 testes PASS, 25 arquivos/27 testes SKIPPED;
  audit de dependências sem vulnerabilidades de nível alto.

## Crítica independente

Foram solicitadas duas críticas read-only a agentes novos. A primeira foi
encerrada após timeout; a segunda também não entregou relatório após espera e
interrupção controlada. Portanto, esta auditoria não atribui PASS independente
nem afirma que a revisão adversarial foi concluída.

## Gaps conhecidos

O histórico append-only separado, snapshots, recálculo versionado/idempotente,
notificação, encerramento, provider/MFA, aprovação clínica, piloto e produção
continuam fora da fatia. A prova PostgreSQL/RLS live depende de ambiente
autorizado. O backfill e a validação final da constraint `NOT VALID` exigem
plano operacional e registros legados controlados; não foram simulados. A
crítica independente não produziu relatório, o que permanece um gap de
assurance. Nenhum dado real, prontuário, tutor, foto, PDF, fonte externa ou
decisão clínica foi usado em código, seed, teste, log ou interface.
