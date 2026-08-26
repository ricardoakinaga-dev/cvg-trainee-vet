# Auditoria live de isolamento contextual e integridade adaptativa

**Data:** 2026-08-26
**Escopo:** `FEEDBACK-055` + `LIVE-056`
**Decisão:** `CONDITIONAL PASS / COMPLETED_WITH_GAPS`
**Release:** não autorizado

## 1. Objetivo

Verificar o comportamento real, em PostgreSQL local descartável, das correções
de isolamento de feedback e das projeções participant-only de atividade,
progresso, tentativa e jornada. A auditoria também verifica que bindings
adaptativos não atravessem participante, escopo, assignment curricular,
membership, status de estado ou conteúdo não publicado.

Este documento não representa auditoria de produção, aprovação clínica,
competência prática ou autorização de piloto.

## 2. Ambiente e limites da evidência

- Banco descartável: `cvg_gauntlet_20260826`, PostgreSQL `16.15`, recriado
  antes da execução final para remover resíduos de rodadas anteriores.
- Migrations aplicadas: `51/51`, última `0050_learning_assignment_status_integrity_rls`.
- Role de migration: owner das tabelas e funções; superuser apenas para a
  operação controlada de migrations.
- Role de aplicação: `NOSUPERUSER`, `NOBYPASSRLS`, `NOCREATEDB`,
  `NOCREATEROLE`.
- Role administrativa de teste: `NOSUPERUSER`, `BYPASSRLS`, `CREATEROLE`, usada
  somente para fixtures e cleanup do harness.
- Nenhuma senha, token, prontuário, tutor, foto, PDF ou dado clínico real foi
  usado ou registrado.
- O provisionamento deste ambiente de teste concede DML amplo à role app para
  permitir a matriz live. Isso não é matriz de least privilege produtiva e
  permanece um gap operacional explícito.

## 3. Controles exercitados

| Controle | Evidência observada |
| --- | --- |
| Contexto participant-only | O escopo da atividade é resolvido por `cvg_learning_activity_scope_for_participant` antes da leitura e reaplicado na transação; ausência de contexto falha fechado. |
| Feedback owner/scope | Participante lê seu ticket/histórico, não lê o ticket de outro participante, não atualiza/apaga ticket e não forja histórico; staff lê/transiciona somente no escopo. |
| Histórico e auditoria | Fluxos live preservam trigger, CAS, histórico append-only, rollback transacional e IDs sintéticos de request/correlation. |
| Journey/activity/progress/attempt | Contexto de participante e escopo incompatível não atravessa as policies `FORCE RLS`; o oracle de jornada rejeita atividade de outro escopo, participante divergente e ausência de participante. |
| Binding adaptativo | `activity_assignments` exige activity publicada, assignment do participante e módulo/escopo compatíveis, conta ativa, membership `PARTICIPANT` aceita, status permitido e conjunto completo de itens `PUBLICADO` no mesmo escopo. |
| Estados inválidos | `NAO_ATRIBUIDO` no assignment curricular e status inválido no vínculo de atividade são rejeitados pelo helper privado/policy. |
| Conteúdo misto | Atividade com item publicado e item em `RASCUNHO` não é descoberta pela materialização; insert direto do vínculo é negado. |
| Replay/concorrência | Duas materializações concorrentes geram um único assignment e um único binding; o caminho usa unique constraint, transação e advisory lock por participante/atividade. |
| Privilégio do helper | `cvg_learning_activity_assignment_write_allowed(uuid,uuid,uuid,text,text)` é `SECURITY DEFINER`, pertence à role de migration, tem `search_path=public`, `PUBLIC EXECUTE=false` e execução explícita para a role app. |
| RLS | `activity_assignments`, `learning_activities`, `learning_activity_items`, `learning_assignments` e `feedback_ticket_history` foram observadas com `relrowsecurity=true` e `relforcerowsecurity=true`. |

## 4. Resultado verificável

No commit `b66acc125fac0e022ce5837c4eb14d1eca862401`:

- `pnpm verify` passou com 141 arquivos de teste, 708 testes PASS, 29
  arquivos/37 testes skipped e cobertura global de 84,36% statements, 80,35%
  branches, 86,35% functions e 85,05% lines.
- Contratos: `86/86` PASS.
- Worker: `27/27` PASS.
- Migrations: `51/51` PASS.
- `pnpm test:integration:live` passou com `35` arquivos e `75` testes PASS.
- A suíte live inclui os caminhos de feedback, RLS de segurança, privilégios
  dos helpers, atividade/conteúdo e assignment adaptativo; os fixtures são
  sintéticos e fazem cleanup escopado.

## 5. Gaps e remediação

1. A prova é local e descartável. Ainda não há execução em produção, workflow
   remoto same-SHA, owners/grants de produção ou conexão produtiva realmente
   least-privilege.
2. Não foi validado o caminho completo browser→API→PostgreSQL com a matriz
   live, nem carga, múltiplas réplicas, failover, restore operacional,
   collector, retenção de telemetria ou traces distribuídos.
3. A matriz negativa individual pode ser ampliada para cada tabela e cada
   combinação de participante/escopo/assignment/membership em uma rodada
   operacional dedicada; o recorte atual prova os caminhos críticos agregados.
4. Resposta ao participante, SLA, notificação, atribuição a terceiro e
   debrief/reflexão completa permanecem fora de `FEEDBACK-055`.
5. Conteúdo B-07/M02 e qualquer protocolo clínico dependem de autoria,
   revisão item a item e decisão humana de Ricardo. Nenhuma publicação clínica
   foi feita.

## 6. Conclusão

O recorte técnico de isolamento contextual, integridade de binding adaptativo,
privacidade dos helpers e concorrência passou em runtime PostgreSQL sintético
limpo. O resultado é `CONDITIONAL PASS`: permite avançar para outra fatia
bounded (`JOURNEY-056` ou `FEEDBACK-057`), mas não permite declarar release,
produção, piloto, conformidade operacional completa ou competência clínica.
