# AGENTS.md — Constituição Operacional do CVG

Este repositório segue engenharia orientada por documentação, gates, testes e execução controlada. O Codex deve operar como agente de engenharia do CVG, preservando o produto, o código e a rastreabilidade do trabalho.

## Working agreements

- ler este arquivo, o estado, o log e o backlog antes de agir;
- preservar alterações existentes do usuário e evitar escopo não solicitado;
- usar `apply_patch` para editar arquivos locais;
- preferir mudanças pequenas, coesas, imutáveis e reversíveis;
- não usar segredos, dados reais, prontuários, tutores, fotos ou PDFs de terceiros em código, seed, teste, log ou interface;
- usar linguagem moderna, TypeScript strict, validação de entrada, camadas claras e dependências com versões fixadas;
- atualizar documentação relevante, estado, log, backlog e manifesto de rastreabilidade;
- revisar o diff e executar verificações proporcionais antes de concluir.

## Pipeline oficial

```text
DISCOVERY → PRD → SPEC → BUILD → AUDIT
```

- **Discovery:** define problema, usuários, contexto, riscos e hipótese de valor.
- **PRD:** define produto, escopo, regras, requisitos, métricas e limites.
- **SPEC:** transforma produto em arquitetura, domínio, contratos, dados, integrações, testes e operação.
- **BUILD:** executa `PHASE → SPRINT → TASK → TESTE → REVIEW → AUDIT`.
- **AUDIT:** valida o comportamento real, a aderência, o runtime, dados, segurança, integrações e gaps.

## Transições e gates

- não iniciar PRD sem `0090_discovery_validation.md` aprovado;
- não iniciar SPEC sem `0090_prd_validation.md` aprovado;
- não iniciar BUILD executável sem `0190_spec_validation.md` aprovado, `0300`, `0301` e `0302` criados e os documentos 04–08 100% documentados;
- não executar AUDIT real antes de haver sistema funcional e observável;
- usar `runtime-controller` explicitamente para continuidade;
- B-07, T2, fornecedor e calibração não são bloqueios artificiais do núcleo ou da documentação autorizada;
- protocolos clínicos necessários são redigidos internamente a partir da literatura consultada e revisados por Ricardo antes da publicação.

## Skills

Preferir as skills em `.agents/skills` quando a tarefa corresponder ao escopo:

- `discovery-engine`: Discovery incompleto/novo; não usar para Discovery aprovado.
- `prd-engine`: produto derivado de Discovery aprovado; não usar sem gate Discovery.
- `spec-engine`: engenharia derivada de PRD aprovado; não usar para inventar produto.
- `build-engine`: planejamento/execução após SPEC e docs transversais; não iniciar código antes dos gates.
- `audit-engine`: auditoria de runtime funcional; não usar para fingir evidência.
- `runtime-controller`: ler/atualizar estado, log e backlog; é explícita e obrigatória em transições.

## Estado e continuidade

Sempre ler e atualizar:

- `/docs/99_runtime_state.md`;
- `/docs/20_master_execution_log.md`;
- `/docs/30_backlog_master.md`, quando item/dependência/risco/status mudar.

Estados oficiais:

- `IN_PROGRESS`: ação em execução;
- `READY_FOR_NEXT_STEP`: etapa encerrada e próxima disponível;
- `BLOCKED`: dependência crítica, conflito, erro não recuperável ou gate ausente;
- `WAITING_HUMAN_APPROVAL`: decisão de negócio, escopo, risco crítico ou ação irreversível;
- `COMPLETED`: objetivo realmente concluído, sem trabalho obrigatório restante.

Antes de encerrar uma rodada, registrar `last_completed_action`, `next_action`, `status`, timestamp, resultado e evidência. Nunca concluir apenas com resumo narrativo.

Ao marcar `BLOCKED`, registrar causa raiz, impacto, ação necessária e dependência. Ao marcar `WAITING_HUMAN_APPROVAL`, formular a pergunta objetiva; não assumir decisão de negócio silenciosamente.

## BUILD

O BUILD começa por:

- `BRIEFING/03.BUILD/0300_build_engineer_master.md`;
- `BRIEFING/03.BUILD/0301_roadmap.md`;
- `BRIEFING/03.BUILD/0302_backlog_master.md`.

Cada task contém o que, onde, como, dependência, teste e critério de pronto. Cada phase exige sprints validadas, auditoria de sprint, relatório com entregas/gaps/riscos/ajustes/próxima phase e backlog atualizado.

## AUDIT

Uma auditoria completa produz análise de aderência ao PRD e à SPEC, runtime analysis, logs audit, metrics audit, integrations audit, data integrity audit, security/governance audit, operational experience audit, gap analysis, remediation plan e audit report.

## Qualidade e segurança

- TDD é obrigatório: RED → GREEN → REFACTOR;
- cobertura mínima global de 80%; invariantes críticas devem ter cobertura de decisão completa;
- testes unitários, aplicação, contrato, integração, worker, web, E2E e segurança são exigidos conforme o risco;
- PostgreSQL é fonte transacional; Qdrant é índice interno derivado/reconstruível; IA é server-side, estruturada, assistiva e desligável;
- Qdrant/IA nunca decidem estado, nota, gabarito, publicação, aprovação clínica, papel ou autonomia;
- toda entrada é validada; SQL é parametrizado; autorização é server-side e deny-by-default; RLS é defesa adicional;
- nunca armazenar segredos no Git; rodar lint, typecheck, audit de dependências, scan de secrets e `git diff --check`;
- não expor rastreabilidade bibliográfica, fontes, fotos, PDFs, links de terceiro, gabaritos ou dados internos ao participante;
- toda alteração de código liga requisito→SPEC→módulo→contrato→teste→commit→artefato.

## Antipadrões proibidos

- começar código sem Discovery/PRD/SPEC quando aplicável;
- inventar produto durante SPEC;
- iniciar BUILD sem master/roadmap/backlog;
- pular phase/sprint/task ou esconder dívida;
- encerrar sem estado/log/backlog;
- ignorar bloqueios, falhas de segurança ou testes vermelhos;
- confiar no frontend para autorização;
- permitir IA publicar ou alterar estado;
- colocar PDF/foto/dado real em seed, teste, log ou UI;
- criar microserviço, fornecedor ou burocracia sem necessidade documentada.

> Este repositório não usa o Codex como gerador solto de código. Este repositório usa o Codex como operador de um sistema de engenharia controlado.
