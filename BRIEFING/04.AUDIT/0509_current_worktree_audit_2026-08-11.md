# 0509 — Reauditoria do worktree atual — CVG Trainee Vet

**Janela:** 2026-08-11, America/Sao_Paulo
**Identificador:** AUD-2026-08-11-WORKTREE-LOGIN
**Veredito:** PASS_WITH_GAPS; release, piloto e publicação clínica não aprovados.

## 1. Resumo executivo

O programa possui uma fundação técnica funcional e bem documentada, mas ainda não é o programa completo descrito no PRD. A nota ponderada do estado observado é **86/100**.

O que está construído e verificável:

- Discovery, PRD e SPEC aprovados, com gates e backlog do BUILD documentados;
- monorepo TypeScript strict com 12 workspaces, contratos Zod, PostgreSQL como fonte transacional, Qdrant como índice derivado e IA assistiva/desligável;
- modelo curricular de 24 módulos, 96 sessões, 24 packs e blueprint B-07 de 120 posições;
- autenticação local por e-mail/senha, hash scrypt, sessão server-side e restauração de sessão;
- stack local HA com API/worker replicados, PostgreSQL, Qdrant, Caddy, Prometheus, Grafana e collector OTLP.

O que não está comprovado ou está incompleto:

- os 24 meses estão modelados, mas o banco ativo possui somente uma atribuição M02 e nenhum estado curricular runtime persistido;
- os packs não-M02 são drafts parametrizados; não há prova semântica texto-a-texto nem piloto;
- o E2E real falhou no seed ao inserir activity_assignments por RLS (SQLSTATE 42501);
- o smoke de carga default falha porque 5_000 é tratado como string não numérica;
- o worktree está sujo e o novo caminho de autenticação permanece working-tree-pending.

## 2. Evidências executadas

| Verificação | Resultado | Evidência atual |
|---|---|---|
| pnpm verify | **PASS** | 84 arquivos de teste passaram, 16 foram ignorados; 392 testes passaram e 17 foram ignorados; 84,98% statements, 80,13% branches, 86,50% functions, 85,71% lines. |
| pnpm build | **PASS** | Os 12 workspaces compilaram; web Next 16.3.0 gerou as rotas previstas. |
| pnpm test:e2e | **PASS** | 12/12 cenários sintéticos passaram, incluindo teclado, axe, labels, retry, empty-state e viewport estreito. |
| CVG_RUN_REAL_E2E=true ... pnpm test:e2e | **FAIL NO FIXTURE** | Seed direto do fixture falhou em activity_assignments por RLS; o navegador não iniciou. |
| smoke HTTP | **PASS** | Web :3100, edge :3180, liveness/readiness/dependencies 200; rotas protegidas e login inválido responderam sem stack trace. |
| pnpm ops:load-smoke com timeout explícito | **PASS** | 100/100 respostas 200, throughput aproximado 262,98 req/s, p95 aproximado 115,47 ms. |
| pnpm ops:load-smoke no default | **FAIL DE HARNESS** | O default 5_000 é uma string não numérica para Number, falhando antes das requisições. |
| pnpm ops:verify-ha | **PASS** | Topologia API/worker replicada, Caddy com failover, collector e retenção declarada. |
| pnpm audit --audit-level=high | **PASS** | Nenhuma vulnerabilidade conhecida no audit executado. |
| pnpm verify:secrets e git diff --check | **PASS** | Scanner limpo e sem erro de whitespace. |
| consulta do PostgreSQL ativo | **PASS COM LIMITE** | 1 conta ativa, 1 atividade publicada, 1 atribuição disponível, 33 versões públicas, 33 itens, 0 estados curriculares, 5 sessões e 8 auditorias. |

Após a coleta, o serviço web foi reconstruído com o proxy interno correto, reiniciado e deixado saudável. Registros sintéticos criados pelo fixture foram removidos; o evento de auditoria append-only não foi apagado, conforme a política de integridade.

## 3. O que foi construído

### 3.1 Produto e currículo

Os documentos aprovados definem 24 meses, 24 módulos, 96 sessões e aproximadamente 149 horas. O pacote de currículo materializa o catálogo e 24 packs de draft. O B-07 materializa 120 posições (40/40/40 em seus blocos). O M02 possui 31 questões objetivas e 2 respostas abertas e é a única atividade que aparece atribuída no runtime ativo desta janela.

Isso comprova a infraestrutura de conteúdo e o desenho curricular; não comprova que todos os 24 packs estejam clinicamente autorados, revisados ou prontos para aplicação.

### 3.2 Aplicação e persistência

Há separação entre domínio, aplicação, contratos, persistência, API, web, worker e integrações. As migrações chegam à 0015. O PostgreSQL mantém o estado autoritativo; Qdrant é reconstruível e não decide nota, estado, publicação ou aprovação. A API oferece login, sessão, troca de senha, learning path e superfícies protegidas de dashboard, conta, operação e autoria.

O runtime ativo prova somente uma fatia inicial: conta participante, M02 publicada, atribuição disponível e acesso autenticado.

### 3.3 Runtime e operação

A stack Docker local inclui PostgreSQL, Qdrant, API-A/API-B, worker-A/worker-B, Caddy, Prometheus, Grafana e collector OTLP. Há healthchecks, readiness agregado, logs redigidos e prova anterior de failover local. Essa evidência é sintética e local; não equivale a deployment hospitalar ou produção pública.

## 4. Matriz de notas

As notas medem o que foi observado no estado atual, incluindo limites de evidência. A ponderação soma 100%.

| Item analisado | Peso | Nota | Status | Fundamentação |
|---|---:|---:|---|---|
| 1. Documentação, gates e governança | 7% | **88** | PARTIAL | Corpus, gates e regras existem; estado/log/auditoria vigente ainda estavam defasados em relação à falha real e o worktree não está congelado. |
| 2. Discovery, PRD e SPEC | 5% | **95** | PASS | Gates Discovery, PRD e SPEC aprovados; escopo, riscos e requisitos estão definidos. |
| 3. Currículo e conteúdo | 10% | **82** | PARTIAL | 24 módulos/packs e B-07 estão materializados, mas há apenas uma fatia M02 operacional, drafts parametrizados, sem prova semântica e sem piloto. |
| 4. Arquitetura e modularidade | 7% | **90** | PARTIAL | Limites de módulo, monorepo e HA local funcionam; deployment externo e operação de produção não foram comprovados. |
| 5. Domínio, contratos e regras | 6% | **90** | PARTIAL | Contratos estritos, invariantes, sessão e autorização estão fortes; o ciclo educacional completo ainda não está operacional. |
| 6. Persistência e integridade | 7% | **84** | PARTIAL | 16 migrações, constraints, auditoria e RLS existem; não há estado curricular ativo e o fixture real é incompatível com RLS. |
| 7. API e backend | 7% | **88** | PARTIAL | Rotas de autenticação e aprendizagem funcionam localmente; E2E real e cobertura integral das superfícies ainda faltam. |
| 8. Segurança, identidade e privacidade | 9% | **86** | PARTIAL | Hash scrypt, sessão HttpOnly, CSRF, rate limit, RLS e scans passam; MFA/recuperação, TLS, headers e rate limit dedicado de login faltam. |
| 9. Jornada do participante | 7% | **84** | PARTIAL | Login e M02 atribuída funcionam; somente uma atribuição existe no banco ativo e a trilha de 24 meses não está persistida. |
| 10. Autoria e governança de conteúdo | 7% | **88** | PARTIAL | Registry/preflight, versionamento e superfícies internas existem; falta validação semântica e aplicação/piloto em escala. |
| 11. Worker, Qdrant, IA e resiliência | 6% | **88** | PARTIAL | Testes de worker/Qdrant e prova HA local existem; execução externa durável, recuperação e provider real não foram comprovados. |
| 12. Observabilidade e operação | 5% | **88** | PARTIAL | Health, Prometheus, collector local, Grafana e smoke/failover existem; traces duráveis, alertas efetivos e restore de produção faltam. |
| 13. Web, UX e acessibilidade | 4% | **87** | PARTIAL | E2E padrão 12/12, axe e teclado passam; o fluxo real falhou no fixture e a configuração de proxy no build não é automática. |
| 14. Testes e qualidade | 6% | **86** | PARTIAL | Gates locais e cobertura global passam; E2E real falha no seed, default do load smoke é defeituoso e há módulos abaixo de 80%. |
| 15. CI e reprodutibilidade | 5% | **78** | PARTIAL | Contrato local e histórico remoto passam; não há SHA atual, o env do proxy não está garantido e o E2E real não fecha. |
| 16. Rastreabilidade e controle de mudança | 2% | **60** | PARTIAL | Manifesto e caminhos existem, mas há alterações não commitadas e o artefato de autenticação está working-tree-pending. |

**Nota ponderada:** **86,05/100 → 86/100**.

## 5. Achados de segurança e risco

Não foi observado P0, segredo exposto, stack trace público ou acesso cruzado nos caminhos testados. A base de segurança é boa: entradas Zod estritas, hash de senha com scrypt, verificação em tempo constante, mensagem uniforme para credencial inválida, cookie HttpOnly/Secure/SameSite, hash do token de sessão no banco, CSRF por origem/referer/metadados Fetch, autorização server-side, RLS e scans limpos.

Permanecem bloqueadores P1:

1. fixture de E2E real incompatível com RLS no seed de activity_assignments;
2. ausência de MFA e recuperação externa;
3. ausência de TLS e headers de segurança de produção;
4. ausência de traces duráveis, restore de produção, deployment/rollback e rate limit distribuído;
5. worktree sem commit final auditável;
6. conteúdo completo e piloto ainda não comprovados.

Há também um defeito P2 de reprodutibilidade no default do load smoke e uma dependência de variável de build que não está declarada no contrato padrão.

## 6. Conclusão

**Classificação atual:** fundação funcional parcial, com boa qualidade técnica local, mas **não pronta para release, piloto ou publicação clínica**.

O próximo ciclo deve corrigir o fixture/RLS e o contrato de build, repetir o E2E real, congelar as alterações em commit intencional e então reauditar o mesmo SHA. Em paralelo, devem ser tratados identidade externa/MFA/recuperação, TLS/headers, traces duráveis, restore/rollback, atribuição curricular completa e prova semântica/piloto.

O projeto executável para esse fechamento está em BRIEFING/03.BUILD/0303_remediation_program.md, com fases R0–R6, critérios de aceite, testes, rollback e dependências humanas.

## 7. Artefatos relacionados

- escopo e plano: 0400_audit_scope.md e 0401_audit_plan.md;
- aderência e gaps: 0410–0418, 0420_gap_analysis.md e 0421_remediation_plan.md;
- relatório histórico anterior: 0491_full_construction_audit.md;
- estado, log e backlog: docs/99_runtime_state.md, docs/20_master_execution_log.md e docs/30_backlog_master.md.
