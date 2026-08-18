# Evidência Dual 95 — U95-104 — aprovador clínico corrente

**Data:** 2026-08-16  
**Ambiente:** Compose HA local `cvg-trainee-vet-ha`, PostgreSQL local, dados sintéticos  
**Status:** `LOCAL_PASS_WITH_LIMITATIONS`  
**Escopo:** tratar localmente o `D95-H04`; não é promoção de score, release, publicação clínica ou autorização de piloto.

## Regra fail-closed

`PublishAuthoringCommand` agora exige `approvedClinicalApproverId`. A rota
recusa a publicação com `403` quando `CLINICAL_APPROVER_ID` não está
configurado ou está vazio. No use case, a decisão clínica persistida é lida
novamente e seu `reviewerId` precisa ser exatamente igual ao aprovador
corrente; ausência, divergência e rotação resultam em `state_conflict` antes
de qualquer transição.

O ID corrente também entra no fingerprint de idempotência. Assim, uma rotação
de aprovador não pode reaproveitar silenciosamente uma correlação criada sob
outra configuração. A transição de publicação recebe o `reviewerId` persistido
somente depois da comparação, mantendo o vínculo entre decisão, configuração
vigente e auditoria.

## RED → GREEN → REFACTOR

- **RED:** os novos testes produziram `3` falhas antes da implementação: a
  rota publicava sem configuração e o use case não rejeitava ausência/
  divergência do aprovador corrente;
- **GREEN:** o contrato, a fronteira HTTP e a regra de publicação passaram a
  falhar fechados; os testes focais passaram `74/74`;
- **REFACTOR:** a validação de entrada foi tornada segura para valores ausentes
  ou não textuais, a comparação de aprovação foi separada da validação de
  estado e o fingerprint foi atualizado sem mutar comandos existentes.

## Evidência positiva e negativa

| Caminho | Evidência | Resultado |
| --- | --- | --- |
| configuração ausente | HTTP sem `approvedClinicalApproverId` | `403`; o use case de publicação não foi chamado |
| configuração vazia | comando direto com ID em branco | `validation_error` antes de consultar ou transicionar |
| divergência/rotação | PostgreSQL live com ID corrente sintético diferente do `reviewerId` persistido | `state_conflict`; nenhum boundary de publicação foi executado |
| caminho correto | ID corrente igual ao revisor da decisão persistida | autorização + publicação concluídas; replay idempotente continuou igual |

O teste live de PostgreSQL passou `1/1` contra a conexão da aplicação, com
fixture/limpeza administrativa separadas por causa do RLS. A prova usa somente
contas, conteúdo e IDs sintéticos; não há dado clínico real.

## Verificações executadas

- `pnpm vitest run packages/application/src/authoring-use-cases.test.ts apps/api/src/http.test.ts`:
  `74/74`;
- `tests/integration/postgres-authoring-workflow.test.ts` contra PostgreSQL
  live: `1/1`, incluindo rotação/divergência, fault injection, publicação
  correta e replay;
- `pnpm test:coverage`: `177` arquivos, `799` testes aprovados, `18` skips
  governados; cobertura `84,55%` statements / `80,05%` branches / `86,58%`
  functions / `85,36%` lines;
- `pnpm typecheck`, lint, `pnpm verify:migrations` (`30/30`),
  `pnpm ops:verify-ha`, `pnpm verify:secrets` e `git diff --check`: `PASS`;
- `CLINICAL_APPROVER_ID` foi fornecido somente como variável de ambiente
  sintética ao `pnpm verify`; nenhum valor de configuração foi armazenado no
  Git ou exibido como segredo;
- `pnpm verify` completo passou, preservando o `PILOT_BLOCKED`, sem commit,
  release, score ou publicação promovidos.

## Limitações e continuidade

Esta evidência continua local: não houve CI remoto, registry, assinatura,
ambiente produtivo, rotação real de identidade, auditoria independente ou
revalidação de RC imutável. O aprovador corrente ainda é uma configuração de
runtime; a política de identidade/MFA e a rotação operacional pertencem aos
gates externos.

D95-H01–H04 estão tratados no worktree local, condicionados à revalidação no
RC. O caso negativo completo da fixture PostgreSQL permanece no `U95-105` e o
gate de worker em deploy/rollback no `U95-106`. As baselines `83,24/100` e
`64,20/100`, `0/145` cadeias completas e `PILOT_BLOCKED` permanecem
inalterados.
