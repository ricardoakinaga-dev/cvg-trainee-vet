# Evidência de revalidação local da remediação — 2026-08-11

## Escopo

Esta rodada reexecuta os gates locais que correspondem às limitações originais. Os resultados provam o runtime HA sintético/local e não são promovidos como evidência de produção hospitalar, provedor externo ou aprovação clínica.

## Resultados observados

| Limitação | Comando/prova | Resultado |
| --- | --- | --- |
| E2E real/RLS | `pnpm test:e2e:active-ha` | Chromium atravessou web → edge/Caddy → API → PostgreSQL em 2/2 cenários. Após o teardown, contas, atividades, atribuições, tentativas e sessões `real-e2e-*` ficaram em zero. |
| Role da aplicação | consulta live em `pg_roles` | `cvg_app` permaneceu `rolsuper=false` e `rolbypassrls=false`; a role administrativa foi usada somente pelo fixture/consulta operacional. |
| Atribuições/estados | `pnpm ops:verify-curriculum-runtime` com URL explícita do PostgreSQL HA | `PASS_WITH_GAPS`: 24 atividades, 796 registros de conteúdo/editorial/itens, 24 atribuições, 24 estados, módulos M01–M24, `NAO_ATRIBUIDO=24` e `PENDENTE=24`. |
| Conteúdo clínico | `pnpm ops:verify-clinical-review-queue` | `PASS_WITH_GAPS`: 796 itens, 763 pendentes, 763 sem revisão, 0 aprovados, 0 falhas técnicas; o modo estrito continua falhando até a revisão humana. |
| Headers/edge | `CVG_EDGE_HTTP_TARGET=http://127.0.0.1:3180/health/live pnpm ops:verify-edge-security` | 7 diretivas estáticas e resposta live HTTP 200. O perfil HTTPS gerenciado/público segue sem prova. |
| Traces duráveis locais | `CVG_VERIFY_DURABLE_TRACES=true CVG_VERIFY_DURABLE_TRACE_RESTART=true pnpm ops:verify-durable-traces` | `PASS`: trace sintético consultável após restart do Tempo; volume local e retenção de staging de 14 dias. Storage/retention externo continuam pendentes. |
| HA | `pnpm ops:verify-ha` | `PASS`: duas réplicas de API e worker, edge roteado por health, collector OTLP e Tempo local persistente. |
| Smoke de carga | `CVG_LOAD_TARGET=http://127.0.0.1:3180/health/live pnpm ops:load-smoke` | 200/200, taxa de sucesso 100%, p95 observado de 77,64 ms. O parser do default numérico é coberto por `packages/config/src/load-smoke.test.ts`. |
| Manifesto de release | `pnpm ops:verify-release-manifest` | `PASS`: digest imutável, digest de rollback, migração expand/contract e health de canário declarados. O registry e o ambiente produtivo não foram usados. |

## Limites que permanecem

- A revisão semântica e a aprovação clínica dos 763 itens não podem ser automatizadas sem decisão do aprovador.
- MFA, enrollment, challenge, recovery codes, step-up, revogação e sincronização dependem de um IdP externo real e sandbox autorizado.
- DNS, certificado gerenciado, handshake público, renovação e E2E externo ainda não foram observados.
- Traces com backend/retention externo, backup criptografado/agendado fora do host, RPO/RTO produtivo, registry, deploy e rollback autorizados continuam sem evidência.

## Estado

`COMPLETED` para a revalidação técnica local; `WAITING_HUMAN_APPROVAL` para os gates externos e clínicos. Nenhum segredo, endpoint real ou dado clínico foi registrado.
