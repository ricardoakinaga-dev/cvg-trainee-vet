# 0416 — Data Integrity Audit

## Reauditoria vigente — 2026-08-11

As consultas do banco ativo confirmaram 1 conta ativa, 1 atividade publicada, 1 atribuição disponível, 33 versões públicas, 33 itens, 0 estados curriculares, 5 sessões e 8 auditorias. A RLS bloqueou corretamente o seed direto do fixture em activity_assignments. Os registros sintéticos parciais foram removidos; o evento de auditoria append-only permaneceu preservado.

Resultado: PARTIAL — F3-S3.

## Verificar

- chaves estrangeiras, enums, unique, constraints e RLS;
- órfãos em tentativa, resposta, conteúdo, correção, papel, outbox e auditoria;
- duplicidade por idempotency key/event_id/point_id;
- versões de conteúdo, rubrica, regra, protocolo e embedding;
- histórico append-only de submissão, nota, publicação, retirada e contestação;
- consistência de projeções e reconstrução Qdrant;
- retenção/anonimização e ausência de dado proibido;
- backup e restauração com contagem/hash sintético.

Toda inconsistência deve gerar evidência reproduzível e plano de correção, sem editar produção manualmente.

## Evidência F3-S3

- PASS: checks de status/versão, FK atividade→item→content version→tentativa→resposta, índice único de tentativa aberta, idempotência, optimistic version, outbox e auditoria na mesma transação; sessão usa hash único e revogação;
- PASS: migrações 0002–0006 aplicadas em PostgreSQL efêmero; atividade atribuída/publicada retornou dois itens em ordem; SaveAnswer/replay preservou uma resposta e um evento; transição editorial/outbox/worker preservou dois eventos processados e um rascunho `DRAFT_AI` único por conteúdo/versão; convite preservou somente hash, foi consumido uma vez e ativou a conta; correção preservou versão, idempotência e feedback do dono;
- PASS: Qdrant live confirmou upsert e remoção determinística sem texto no payload; o sink IA usa upsert por conteúdo/versão e a projeção participante não lê a tabela interna;
- PARTIAL: RLS/trigger append-only, mutação negativa contextual, backup/restore, retenção e reconciliação completa ainda pendentes;
- NOT_EXECUTED: cálculo automático/rubrica completa, remediação, contestação, retenção de produção, backup/restore e dados de produção.
