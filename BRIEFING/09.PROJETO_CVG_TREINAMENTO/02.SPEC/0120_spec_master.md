# 0120 — SPEC Master

**Projeto:** Sistema CVG de Treinamento Veterinário  
**Status:** `DERIVADA_E_VERIFICADA; LIBERADA_PARA_DOCUMENTAÇÃO_DO_BUILD`  
**Escopo:** arquitetura, domínio, contratos, dados, integrações, segurança, operação, web, testes e backlog.

## 1. Mapa da SPEC

| Documento | Resultado |
|---|---|
| [0100 — readiness](0100_spec_readiness_review.md) | PRD apto e autorização da Fase 1 |
| [0101 — arquitetura](0101_visao_arquitetural.md) | monorepo modular: web/SPA + API + worker |
| [0102 — contextos](0102_bounded_contexts.md) | fronteiras e relações |
| [0103 — módulos](0103_mapa_de_modulos.md) | dependências permitidas/proibidas |
| [0104 — domínio](0104_modelo_de_dominio.md) | entidades, agregados e invariantes |
| [0105 — estados](0105_maquina_de_estados_e_fluxos.md) | transições e falhas |
| [0106 — aplicação](0106_contratos_de_aplicacao.md) | comandos, queries, validação e idempotência |
| [0107 — API](0107_contratos_de_api.md) | REST `/api/v1`, DTOs e erros |
| [0108 — eventos](0108_contratos_de_eventos_e_assincronismo.md) | outbox, worker, Qdrant e IA |
| [0109 — dados](0109_dados_e_persistencia.md) | PostgreSQL como verdade e índices derivados |
| [0110 — integridade](0110_consistencia_integridade_e_migracoes.md) | constraints, migração e reconciliação |
| [0111 — governança](0111_permissoes_governanca_e_auditoria.md) | RBAC, escopo, RLS e auditoria |
| [0112 — integrações](0112_integracoes.md) | PostgreSQL, Qdrant, IA e contingência |
| [0113 — operação](0113_observabilidade_runtime_e_operacao.md) | logs, métricas, traces, SLO e recovery |
| [0114 — web](0114_superficie_web_spa_e_acessibilidade.md) | telas, estados e WCAG |
| [0115 — BUILD plan](0115_plano_de_build_por_fases.md) | fases, critérios e riscos |
| [0116 — dependências](0116_matriz_de_dependencias_e_versionamento.md) | grafo, ambientes e versões |
| [0117 — backlog](0117_backlog_estruturado.md) | entregas rastreáveis |
| [0118 — testes](0118_estrategia_de_testes_rastreabilidade_e_verificacao.md) | TDD, cobertura e pipeline |
| [0190 — validação](0190_spec_validation.md) | gate técnico da SPEC |

## 2. Decisões fechadas

1. API central mantém a autoridade de estado; web/SPA e worker são processos isolados no mesmo monorepo;
2. PostgreSQL é a fonte transacional; Qdrant é índice interno derivado e reconstruível;
3. IA server-side é assistiva, estruturada e desligável; nunca decide ou publica;
4. conteúdo clínico e protocolos são autorais CVG, redigidos internamente a partir da literatura consultada e revisados por Ricardo;
5. rastreabilidade bibliográfica existe somente no workflow de construção/revisão/auditoria;
6. participante recebe conteúdo autoral CVG, casos fictícios, feedback e estado educacional, sem fontes, fotos, obras ou metadados;
7. testes, rastreabilidade técnica, redaction e verificação automatizada são parte do produto, não etapa opcional posterior;
8. B-07, T2, calibração e consulta externa não são pré-requisitos para construir o núcleo.

## 3. Handoff

O pacote 03.BUILD pode ser documentado a partir desta SPEC. A implementação continua condicionada ao fechamento integral e verificado dos documentos 04–08, conforme ordem expressa do patrocinador. Nenhum código de produto foi iniciado nesta fase.

