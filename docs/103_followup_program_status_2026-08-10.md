# Relatório de acompanhamento do programa CVG

**Data:** 2026-08-10
**Base de comparação:** [`100_full_program_audit_2026-08-10.md`](100_full_program_audit_2026-08-10.md), 73/100 no SHA histórico `fbbc692979c99a8e5dd359efd54675c35f61a314`
**Estado avaliado:** worktree atual, ainda não commitado; após remoção literal do caminho executável de revisão clínica
**Nota técnica de acompanhamento:** **87/100**

Esta nota mede a mudança verificável desde a auditoria baseline. Não é declaração de liberação clínica, competência prática, deployment hospitalar ou perfeição. As notas anteriores permanecem históricas; esta rodada acrescenta código, testes e evidência operacional.

## Matriz atualizada

| # | Domínio | Peso | Nota | Evidência e limite atual |
|---:|---|---:|---:|---|
| 1 | Documentação, gates e governança | 7% | **94** | Estado, log, backlog, relatório, política de fonte e manifesto foram reconciliados; o worktree ainda não tem commit final. |
| 2 | Discovery, PRD e definição de escopo | 5% | **95** | Cadeia documental e gates canônicos continuam verificados. |
| 3 | Currículo e conteúdo | 10% | **82** | 24 módulos/96 sessões, B-07 120 itens e três fontes imutáveis estão materializados; falta prova semântica texto-a-texto contra os livros e piloto real. |
| 4 | Arquitetura e modularidade | 7% | **90** | Novas superfícies preservam contracts/application/API/web e o boundary gate passa; deployment externo ainda não foi executado. |
| 5 | Domínio, contratos e regras de negócio | 6% | **88** | Publicação automática, projeções, conta e KPIs têm contratos estritos; ciclo mensal persistido completo e identidade externa ainda não. |
| 6 | Persistência, migrações e integridade | 7% | **82** | Migrações e invariantes existentes continuam válidas; a prova HA usou dados descartáveis e não fecha recuperação de produção. |
| 7 | API e backend | 7% | **84** | Dashboard participante, dashboard interno, account security, recuperação/MFA adapter e métricas raw foram adicionados; provider externo e superfícies completas continuam configuração/dependência externa. |
| 8 | Segurança, identidade e privacidade | 9% | **82** | Autorização server-side, redaction, token de scrape e adapter sem segredo local; MFA/recuperação reais dependem de provider e hardening de deployment. |
| 9 | Jornada do participante | 7% | **82** | Roadmap estrita de 24 meses, estados de runtime e próximas ações foram projetados; as 24 mensalidades ainda não têm fluxo persistido/E2E completo individual. |
| 10 | Autoria e governança de conteúdo | 7% | **88** | B-07/24 packs usam pré-voo automático e publicação `PUBLICADO`; rota, contrato e caso de uso de revisão clínica humana foram removidos, enquanto a tabela histórica permanece apenas por compatibilidade; a verificação semântica completa não foi executada. |
| 11 | Worker, Qdrant, IA e resiliência | 6% | **88** | Worker/Qdrant/reconciliação permanecem verificados e a topologia tem dois workers; provider real e recovery externo continuam não comprovados. |
| 12 | Observabilidade e operação | 5% | **90** | Collector OTLP recebeu spans, Prometheus reteve métricas por 15d/20GB, carga e failover passaram; traces ainda usam debug exporter, sem backend durável. |
| 13 | Web, UX e acessibilidade | 4% | **88** | `/dashboard`, `/account` e `/admin` foram adicionados; build e E2E 12/12 passam, mas não houve user test nem E2E específico de cada nova tela contra provider real. |
| 14 | Testes, qualidade e evidência | 6% | **91** | 378 testes passaram na execução de cobertura (17 skips condicionais), 84,95% statements, 80,03% branches, 86,17% functions e 85,66% lines; cobertura funcional de produção continua desigual. |
| 15 | CI e reprodutibilidade | 5% | **95** | Build dos 12 workspaces, audit sem vulnerabilidades conhecidas, E2E 12/12, HA topology e smoke local passaram; rollback/deployment externo não foi exercitado. |
| 16 | Rastreabilidade e controle de mudanças | 2% | **80** | `traceability.yml`, backlog, runtime state, log, source policy e ops evidence estão ligados; as alterações desta rodada permanecem não commitadas. |

**Cálculo ponderado:** 87,12 → **87/100**.

## Entregas concluídas nesta rodada

- Fonte clínica automática limitada aos três PDFs e hashes registrados em [`101_clinical_source_policy.md`](101_clinical_source_policy.md).
- B-07 e os 24 packs no caminho `PUBLICADO` após pré-voo automático; nenhum gate clínico humano ativo nesse caminho.
- Roadmap completa de 24 meses, dashboard participante, dashboard operacional/KPIs e telas de conta/admin.
- Adapter server-side para recuperação/MFA, com estado `NOT_CONFIGURED` honesto sem provedor externo.
- Collector OTLP, IDs W3C/OTLP, métricas Prometheus raw protegidas, p95 e dashboards provisionados.
- Topologia Docker HA com `api-a/api-b`, `worker-a/worker-b`, Caddy, Postgres, Qdrant, collector, Prometheus e Grafana.
- Reconciliação do item 16 em `traceability.yml`, backlog, runtime state, log e evidências.

## Verificações finais

```text
pnpm verify                         PASS
  378 testes pass / 17 skips; 84,95% / 80,03% / 86,17% / 85,66%
pnpm build                          PASS — 12 workspaces
pnpm test:e2e                       PASS — 12/12
pnpm audit --audit-level=high       PASS — nenhuma vulnerabilidade conhecida
pnpm verify:clinical-sources        PASS — 3 PDFs, hashes verificados
pnpm ops:verify-ha                  PASS — 2 APIs, 2 workers, collector, retenção 15d
```

Na prova Docker descartável, o edge manteve 200/200 respostas 2xx com API-A ativa, 200/200 após a parada de API-A, e API-A retornou a `healthy` depois do restart. O Prometheus observou `api-a`, `api-b` e `otel-collector` como `up`; o collector registrou lotes OTLP de spans.

## Gaps não mascarados

1. A regra de três fontes está aplicada por registry/hash e rejeição de referências externas; ainda não há prova automática de correspondência semântica de cada frase com páginas dos livros.
2. MFA e recuperação têm integração de adapter, mas não estão operacionais sem URL/token de um provedor de identidade externo.
3. Traces são recebidos pelo collector, porém esta topologia não possui armazenamento durável de traces.
4. O HA foi comprovado em Docker local sintético; não é prova de deployment hospitalar, RPO/RTO produtivo ou rollback externo.
5. O conteúdo não declara competência prática e nenhum piloto real foi executado.
6. O worktree contém mudanças não commitadas; não existe novo SHA de release para atribuir a esta rodada.
