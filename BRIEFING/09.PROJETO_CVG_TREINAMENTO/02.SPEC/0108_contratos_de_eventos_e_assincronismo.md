# 0108 — Contratos de Eventos e Assincronismo

## 1. Estratégia

O MVP usa uma tabela transacional de outbox no PostgreSQL e um worker separado. Não há Kafka, broker obrigatório ou arquitetura distribuída. Um evento só é publicado depois que a transação de negócio foi confirmada.

## 2. Eventos internos

| Evento | Emissor | Consumidor | Efeito |
|---|---|---|---|
| `attempt.submitted.v1` | avaliação | correção | agenda autocorreção ou fila humana |
| `assessment.corrected.v1` | correção | progresso/evolução | atualiza projeção e próxima ação |
| `critical-error.detected.v1` | avaliação | remediação | cria reforço no objetivo afetado |
| `content.published.v1` | conteúdo | aprendizagem/cache | torna versão elegível |
| `content.withdrawn.v1` | conteúdo | aprendizagem/operação | bloqueia nova exposição e registra alcance |
| `retention.due.v1` | worker | aprendizagem | cria revisão elegível |
| `feedback.created.v1` | relatos | moderação | cria fila por prioridade |
| `appeal.decided.v1` | contestação | avaliação/evolução | recálculo auditado quando aplicável |
| `knowledge.index.requested.v1` | autoria/conteúdo | worker de indexação | cria ou substitui vetor interno no Qdrant |
| `knowledge.indexed.v1` | worker | autoria/observabilidade | registra versão indexada e latência |
| `ai.suggestion.requested.v1` | autoria/revisão | worker de IA | executa tarefa assistiva com contexto autorizado |
| `ai.suggestion.completed.v1` | worker de IA | autoria/revisão | disponibiliza rascunho estruturado para revisão |
| `ai.suggestion.failed.v1` | worker de IA | operação | registra falha redigida e permite retry controlado |
| `audit.entry.created.v1` | governança | auditoria/retensão | preserva trilha append-only |

## 3. Envelope interno

```json
{
  "event_id": "uuid",
  "event_type": "attempt.submitted.v1",
  "aggregate_type": "attempt",
  "aggregate_id": "uuid",
  "occurred_at": "iso-8601",
  "schema_version": 1,
  "correlation_id": "uuid",
  "payload": {}
}
```

Payloads de operação não carregam senha, token, resposta livre desnecessária, PDF, OCR, foto, cópia protegida ou dado real. Eventos de autoria podem carregar somente IDs internos, hashes, versão do registro e escopo; nunca alimentam projeções do aluno. O worker busca o conteúdo autorizado no PostgreSQL, aplica redaction e só então chama Qdrant/IA.

## 4. Garantias

1. `event_id` único;
2. outbox grava na mesma transação do agregado;
3. worker reserva por lease e pode retomar após crash;
4. cada claim grava um `lease_token` opaco novo; a finalização ou falha só pode
   ocorrer com o token correspondente e enquanto o lease ainda estiver válido
   no relógio do PostgreSQL;
5. uma atualização sem linha afetada significa `lease_lost`: o worker não
   contabiliza sucesso nem tenta alterar o evento com o token antigo;
6. consumidor verifica `event_id` processado antes do efeito;
7. retry exponencial limitado, com estado `FAILED` e reprocessamento manual;
8. evento não dispara alteração irreversível sem comando idempotente;
9. nenhuma decisão clínica, de nota, papel ou publicação é delegada ao worker sem comando já autorizado.
10. indexação no Qdrant é reconstruível a partir do PostgreSQL e não bloqueia publicação, avaliação ou progresso;
11. chamadas de IA têm timeout, limite, retry limitado, circuit breaker operacional e saída validada; falha deixa o estado principal intacto;
12. Qdrant e IA nunca são chamados pelo navegador e nunca recebem segredo de sessão ou payload público ampliado.

## 5. Jobs do worker

- criar retenções elegíveis;
- sinalizar correções vencendo/vencidas;
- recalcular projeções derivadas idempotentes;
- processar outbox;
- indexar registros autorais permitidos no Qdrant e reconciliar itens ausentes;
- executar jobs de IA assistiva para autoria/revisão, sem publicar automaticamente;
- executar limpeza/anonimização conforme retenção;
- emitir alertas operacionais mínimos.

O worker não cria protocolo clínico sem comando autoral, não aprova conteúdo, não altera gabarito, não decide contestação e não envia bibliografia, fonte ou material protegido ao participante.

## 6. Matriz executável de consumidores — item 11

O worker reconhece os eventos atualmente emitidos pelos casos de uso e o evento interno de IA:

| Evento | Handler | Efeito permitido |
|---|---|---|
| `content.published.v1` | indexação | reidrata versão `PUBLICADO` e faz upsert determinístico no Qdrant |
| `content.withdrawn.v1` | retirada | remove o ponto determinístico da versão |
| `content.workflow.changed.v1` | acknowledge no-op | confirma o evento sem indexar nem alterar estado |
| `attempt.submitted.v1` | acknowledge no-op | não duplica correção ou estado educacional |
| `answer.saved.v1` | acknowledge no-op | não duplica resposta ou tentativa |
| `assessment.corrected.v1` | acknowledge no-op | não duplica resultado ou progresso |
| `ai.suggestion.requested.v1` | IA assistiva | salva somente rascunho interno estruturado e revisável |

`WORKER_RECOGNIZED_EVENT_TYPES` é a allowlist do consumidor. Um evento não mapeado continua falhando fechado e entra no retry/dead-letter; a adição de qualquer novo publisher exige atualizar a matriz e o teste correspondente.

O contrato de entrega é at-least-once. O fencing impede que um worker antigo
finalize o evento depois do reclaim, mas não desfaz um efeito externo iniciado
antes da perda do lease; cada consumidor deve continuar determinístico e
idempotente. IDs e hashes determinísticos tornam upsert, delete, replay e
reconciliação repetíveis sem declarar exactly-once. PostgreSQL continua a fonte
transacional; Qdrant é reconstruível e IA não possui autoridade editorial ou
educacional.
