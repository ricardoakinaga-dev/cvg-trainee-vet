# 0117 — Backlog Estruturado da Construção

**Formato de rastreabilidade:** cada item usa IDs de requisito/decisão, entrega, teste e evidência. O backlog organiza a execução; não cria produto novo.

## 1. P0 — núcleo de produção interna

| ID | Entrega | Rastreia | Aceite/teste |
|---|---|---|---|
| BLD-001 | scaffold pnpm + TypeScript strict | SPEC-0101 | build limpo e teste smoke |
| BLD-002 | lint, format, tipos, cobertura e CI | SPEC-0118 | pipeline falha em erro deliberado |
| BLD-003 | configuração/env/redaction | SPEC-0112/0113 | segredo ausente não inicia integração |
| BLD-004 | domínio de conta, papéis e escopo | PRD-0010/0012; SPEC-0104/0111 | unitários de invariantes |
| BLD-005 | PostgreSQL, migrações e RLS | PRD-0014; SPEC-0109/0110 | integração em banco efêmero |
| BLD-006 | sessão, convite e recuperação | PRD-0010/0013; SPEC-0107 | E2E de login e revogação |
| BLD-007 | currículo, módulos e atribuição | PRD-0016/0017 | unitário + API + E2E |
| BLD-008 | conteúdo versionado e projeção pública | D-109; SPEC-0104/0107 | teste negativo de exposição |
| BLD-009 | tentativa, resposta, submissão e idempotência | PRD-0012/0013 | integração + concorrência |
| BLD-010 | correção, resultado e contestação | PRD-0012/0013 | unitário + E2E |
| BLD-011 | progresso, remediação e retenção | PRD-0013/0017 | máquina de estados + integração |
| BLD-012 | autoria/protocolo interno e aprovação de Ricardo | D-109; SPEC-0111 | autorização + auditoria |
| BLD-013 | outbox e worker | SPEC-0108 | retry/crash/replay idempotente |
| BLD-014 | Qdrant: coleção, upsert, busca e reconciliação | SPEC-0112 | Qdrant efêmero + filtro de escopo |
| BLD-015 | IA: adapter, schema, timeout e fake | SPEC-0112 | testes sem chamada externa |
| BLD-016 | auditoria técnica e redaction | SPEC-0111/0113 | scan de logs/DTO |
| BLD-017 | web participante e operações | PRD-0010/0013; SPEC-0114 | Playwright + axe |
| BLD-018 | health, métricas, traces e runbook | SPEC-0113 | health/degraded/alertas |

## 2. P1 — qualidade e operação

| ID | Entrega | Aceite |
|---|---|---|
| BLD-019 | backup/restauração e RPO/RTO | restauração sintética documentada |
| BLD-020 | migração expand/contract e compatibilidade de API | teste de deploy gradual |
| BLD-021 | carga pequena e concorrência de submissão | sem duplicação ou perda |
| BLD-022 | scanner autoral e dados proibidos | corpus sintético bloqueado corretamente |
| BLD-023 | revisão de dependências e licença | relatório sem segredo/vulnerabilidade crítica |
| BLD-024 | smoke pós-deploy e rollback | release reversível |

## 3. P2/P3 — evolução sem bloquear o núcleo

- P2: busca interna avançada, métricas pedagógicas adicionais, melhoria de prompt, segundo adaptador de IA, exportações internas e otimizações de Qdrant;
- P3: OCR/RAG de ativos autorizados, app nativo, microserviço de domínio ou infraestrutura distribuída somente com evidência e nova decisão.

P2/P3 não podem introduzir fontes, fotos, dados reais ou rastreabilidade na superfície do participante sem mudança explícita de requisito e revisão autoral.

## 4. Regra de execução

O item entra em execução somente com teste/critério de aceite escrito. O agente registra `trace_id`, branch/commit, arquivos alterados, comandos executados, resultado e pendência residual. Item que falhar não é marcado como concluído; corrigir implementação ou atualizar requisito com decisão explícita.

