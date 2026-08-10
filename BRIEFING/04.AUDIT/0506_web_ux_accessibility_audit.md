# 0506 — Auditoria do item 13: Web, UX e acessibilidade

Baseline: BRIEFING/04.AUDIT/0491_full_construction_audit.md
Backlog: EXPERIENCE-13-01
Data: 2026-08-10
Escopo: superfícies web implementadas nesta rodada, contratos públicos redigidos e operação web observável. O score não representa aprovação clínica, competência prática ou autorização de piloto.

## 1. Resultado

Score reavaliado: 96/100 — meta >=95 atingida.

| Dimensão | Peso | Nota | Evidência |
|---|---:|---:|---|
| Jornada participante e superfície interna | 25 | 24 | convite, jornada, atividade, tentativa, autoria/revisão e operação com projeções distintas |
| Estados de experiência | 20 | 20 | loading, empty, error, stale, retry e mensagens limitadas |
| Acessibilidade e interação | 25 | 24 | axe nas entradas, teclado/skip link/foco, labels, IDs únicos, reduced motion |
| Integração navegador→API e segurança de fronteira | 20 | 20 | proxy configurável, API real, health redigido e testes de campos proibidos |
| Responsividade e manutenção | 10 | 8 | viewport estreito validado; cobertura visual completa e auditoria manual contínua permanecem necessárias |
| Total | 100 | 96 | APROVADO PARA ABRIR O ITEM 14, COM GAPS EXPLÍCITOS |

## 2. Alterações verificadas

- apps/web/app/page.tsx mantém estados de jornada/atividade, loading acessível, estado vazio explícito, erro limitado, retry e aviso de dado stale sem substituir uma projeção existente por erro silencioso.
- apps/web/app/authoring/page.tsx recebeu foco semântico, descrição dos campos, estado de busy e superfície interna separada da participante.
- apps/web/app/operations/page.tsx materializa o estado agregado redigido de dependências; não renderiza URL, segredo, payload ou identificador de participante.
- apps/web/app/layout.tsx fornece lang=pt-BR e skip link; globals.css cobre foco visível, reduced motion e breakpoint estreito.
- apps/web/next.config.ts permite proxy somente quando CVG_API_INTERNAL_URL é configurado; sem essa variável, a web continua executável com os mocks de E2E.
- tests/e2e/experience-accessibility.spec.ts cobre teclado, IDs, loading/erro/retry, jornada vazia, viewport de 390px e axe nas entradas pública/interna.
- tests/e2e/real-runtime.spec.ts comprova que o navegador chama /health/dependencies pela web e recebe resposta da API real sem interceptação.

## 3. Evidência executada

| Verificação | Resultado |
|---|---|
| pnpm --filter @cvg/web typecheck | PASS |
| pnpm --filter @cvg/web build | PASS; rotas /, /authoring, /operations |
| pnpm exec playwright test | PASS — 12/12, sem skips |
| CVG_RUN_REAL_E2E=true ... pnpm test:e2e | PASS — 13/13, sem skips; API real + PostgreSQL local, Qdrant desativado explicitamente |
| axe Playwright | PASS nas entradas participante e autoria |
| fronteira pública | PASS; nenhum participantId, source, photo, password, api_key ou URL de banco renderizado |
| keyboard/focus/IDs | PASS; skip link concentra main, IDs sem duplicidade |
| viewport estreito | PASS; 390×844 sem overflow horizontal |

## 4. Decisões e limites

O proxy da web só é habilitado por variável de ambiente server-side e não move autorização para o frontend. A API continua sendo a autoridade para sessão, autorização, projeção e estado. A tela de operação consome apenas o contrato agregado já redigido pela API.

O E2E real desta rodada valida a cadeia navegador→Next→API→PostgreSQL para health/dependencies. Ele não substitui a criação de fixtures sintéticas de convite/atividade para o fluxo participante completo, que permanece tarefa do item 14/15. Axe não substitui revisão manual de conteúdo, contraste em todos os estados, leitor de tela, múltiplos navegadores ou teste com usuários.

## 5. Gate

O item 13 pode ser encerrado em 96/100 e o item 14 pode ser aberto. Permanecem bloqueados release, piloto e publicação clínica por aprovação de Ricardo, conteúdo clínico, operação de ambiente, CI live e demais gates registrados.

## 6. Atualização posterior

Este artifact registra o fechamento do item 13 antes da execução do item 14. A extensão do fluxo participante persistido foi executada e auditada em `0507_test_quality_evidence_audit.md`, que registra o modo real final em 14/14.
