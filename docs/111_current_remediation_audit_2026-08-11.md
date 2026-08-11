# Reauditoria atual da remediação — 2026-08-11

## Escopo

Esta reauditoria confronta as limitações originais com o runtime HA local ativo e o commit `dfe58311156ca908082dbb2f16fa3a67b8b511c6`. O resultado distingue prova local/sintética, falha esperada de gate e dependência externa; não há credenciais, dados clínicos reais ou aprovação clínica inferida.

## Evidências locais atuais

- E2E real navegador → web → edge/Caddy → API → PostgreSQL: `pnpm test:e2e:active-ha` passou 2/2, com cleanup do fixture concluído.
- Papel transacional: `cvg_app` permanece `rolsuper=false` e `rolbypassrls=false`; `cvg_admin` é usado somente por verificadores/jobs autorizados.
- PostgreSQL HA, verificador com conexão administrativa explícita: 24 atividades, 796 conteúdos/editorial/itens, 24 atribuições e 24 estados; módulos M01–M24; atribuições `NAO_ATRIBUIDO=24`; estados `PENDENTE=24`.
- Fila clínica: 796 totais, 763 pendentes, 763 não revisados e 0 falhas técnicas; `PASS_WITH_GAPS`.
- Publicação clínica estrita falha de forma esperada com `clinical publication is incomplete: 763 items`; nenhum item foi aprovado automaticamente.
- Load smoke no alvo HA `http://127.0.0.1:3180/health/live`: 200/200, 100% de sucesso, p95 observado de 64,25 ms; o teste do parser default passou 4/4.
- Edge, HA, manifesto de release e durabilidade local passaram: headers/redirect e topologia local válidos, duas réplicas de API e worker, Tempo em volume local e manifesto imutável com rollback digest sintético.
- E2E da conta após reinício do processo web com o build atual: provider-mediated recovery/MFA passou 1/1; códigos não permanecem na interface.

## Hardening desta rodada

- `packages/application/src/identity-provider.ts` rejeita `operationId` retornado pelo provedor com tamanho inválido ou caracteres de controle antes de expor o resultado.
- `packages/contracts/src/account.ts` aplica a mesma fronteira ao projection da operação.
- RED foi observado no teste de projection; GREEN passou em 12 testes direcionados. O commit convencional é `dfe58311156ca908082dbb2f16fa3a67b8b511c6` (`fix: validate provider operation projections`).

## Quality gate

- `pnpm verify`: 95 arquivos de teste passaram, 16 foram pulados condicionalmente; 448 testes passaram e 18 foram pulados.
- Cobertura: 85,04% statements, 80,33% branches, 86,85% functions e 85,79% lines.
- `pnpm build`, lint, typecheck, format, secret scan, `pnpm audit --audit-level=high`, documentação, rastreabilidade, migrações, arquitetura, definição de produto e fronteira pública passaram.

## Gates ainda não fechados

- `CVG_VERIFY_PRODUCTION_SECURITY=true pnpm ops:verify-production-security` falha de modo fail-closed porque faltam IdP/probe, origem HTTPS pública, backend/retenção de traces, URI/chave de backup e digests autorizados de release/rollback.
- IdP/sandbox externo, enrollment/challenge/recovery codes reais, step-up, revogação e sincronização de papéis não foram executados.
- Domínio/DNS/certificado gerenciado, traces externos duráveis, backup/restore de produção, RPO/RTO produtivo, registry/deploy/rollback autorizado e observabilidade pública continuam sem prova.
- A aprovação semântica independente dos 763 conteúdos permanece necessária antes de publicação clínica.

## Estado

`WAITING_HUMAN_APPROVAL`: o núcleo local está verificável e o release produtivo permanece bloqueado até decisões, credenciais e evidências externas autorizadas.
