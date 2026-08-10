# 0115 — Plano de BUILD por Fases

**Regra de avanço:** este plano libera a documentação do BUILD depois do 0190. Código executável só começa quando `03.BUILD`, `04.AUDIT`, `05.AGENT_LOOP-SESSION_PERSISTENCE`, `06.SKILL`, `07.AGENTS` e `08.RUNTIME` estiverem 100% documentados e verificados.

## 1. Fases

| Fase | Entrega | Dependências | Verificação mínima |
|---|---|---|---|
| B0 | scaffold do monorepo, configuração, CI e ambientes sintéticos | documentação 04–08 completa | lint, tipos, teste mínimo, scan de segredo |
| B1 | domínio, estados, políticas e contratos compartilhados | B0 | TDD de invariantes e schemas |
| B2 | PostgreSQL, migrações, repositórios, RLS e outbox | B1 | integração em banco efêmero, rollback e constraints |
| B3 | sessão, convite, papéis, conta e autorização | B2 | integração + E2E de acesso cruzado |
| B4 | currículo, conteúdo, tentativas, correção, progresso e retenção | B2/B3 | unitário, integração, contrato e E2E |
| B5 | autoria interna, protocolos CVG, auditoria, Qdrant e IA assistiva | B2 + adaptadores | Qdrant efêmero, `FakeAiProvider`, redaction e aprovação humana |
| B6 | web/SPA responsiva e acessível | B3/B4/B5 | componentes, axe, teclado e Playwright |
| B7 | worker, retries, reconciliação, métricas, health e runbooks | B2/B5 | crash/retry/idempotência e testes de recuperação |
| B8 | hardening e release interno | B0–B7 | cobertura ≥80%, segurança, migração, backup/restauração e smoke |

## 2. Ordem de execução

```text
documentação 100%
  → B0
  → B1 ───────────────┐
  → B2 ──┬→ B3 → B4 ──┼→ B6
         └→ B5 → B7 ──┘
  → B8 → release interno
```

B3, B4 e parte de B5 podem ser desenvolvidos em paralelo depois de B2, desde que os contratos compartilhados estejam estáveis. A interface pode evoluir sem reimplementar domínio. Qdrant e IA não atrasam o núcleo educacional: se indisponíveis, os recursos assistivos ficam degradados.

## 3. Critérios de pronto por fase

Uma fase só fecha quando:

1. cada requisito/decisão da fase possui item de backlog e teste vinculado;
2. TDD foi aplicado nos casos de uso novos: teste RED, implementação GREEN e refatoração;
3. lint, format, typecheck, testes aplicáveis e verificação de segurança passam;
4. migrações/contratos são compatíveis e há rollback operacional;
5. logs e auditoria não expõem dados proibidos;
6. `git diff --check` passa e o commit convencional registra a fase;
7. o relatório de CI guarda SHA, cobertura, artefatos e evidências redigidas.

## 4. Conteúdo clínico interno

Protocolos necessários serão redigidos internamente a partir da literatura consultada, com versionamento e revisão clínica de Ricardo. Isso é um fluxo editorial dentro de B5 e não uma dependência de fornecedor, calibração ou contratação. A plataforma só publica uma unidade dependente de protocolo após o registro interno aprovado; o participante vê apenas a projeção autoral CVG.

B-07 e T2 podem evoluir em paralelo como conteúdo/ensaio. Eles não bloqueiam a construção do núcleo, salvo se uma mudança explícita de produto alterar os contratos.

## 5. Riscos e resposta

| Risco | Resposta prática |
|---|---|
| escopo crescer durante o BUILD | registrar mudança, atualizar PRD/SPEC afetados e incluir teste antes de implementar |
| regra duplicada no web/worker | lint de imports, revisão e teste de contrato; regra somente no domínio/aplicação |
| Qdrant fora de sincronia | outbox, hash, reconciliação e reconstrução desde PostgreSQL |
| IA produzir texto inadequado | schema, redaction, `FakeAiProvider`, revisão interna e sem publicação automática |
| alteração de nota não auditável | aggregate versionado, transação, auditoria e E2E de contestação |
| dado autoral em DTO | testes negativos de serializer, scan de chaves e bloqueio de CI |

