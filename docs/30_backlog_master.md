# BACKLOG MASTER — CVG

Backlog operacional vivo. Itens só podem avançar quando suas dependências e gates estiverem satisfeitos.

## P0 — CRÍTICO

### PRE-SPEC-01 — Alinhamento de produto e arquitetura

- título: aprovar as decisões de conta, dashboards, feedback, KPIs e base técnica antes da SPEC
- descrição: congelar autenticação, papéis, cartões, fluxo de relatos, métricas, arquitetura proporcional, fronteira de RAG, observabilidade, acessibilidade e agente operacional de IA
- módulo: produto / arquitetura pré-SPEC
- dependência: direção D-090 confirmada; Anexo 0020 revisado
- fase: PRD — alinhamento anterior à SPEC
- risco: alto — iniciar SPEC sem essas fronteiras gera retrabalho e permissões inconsistentes
- impacto: alto
- status: COMPLETED
- evidência: BRIEFING/09.PROJETO_CVG_TREINAMENTO/90.ANEXOS/0020_alinhamento_produto_pre_spec.md
- resultado: D-091 a D-100 aprovadas integralmente por MV. Ricardo Akinaga em 2026-08-06; alinhamento congelado como baseline da futura SPEC

### B07-01 — Blueprint diagnóstico

- título: validar blueprint das 120 questões diagnósticas
- descrição: revisar a matriz das três sessões, cobertura clínica, estrutura cognitiva, avaliabilidade, equidade e aderência à política D-077
- módulo: conteúdo / avaliação diagnóstica
- dependência: PRD 0017, D-070, D-077, D-082, D-083 a D-086
- fase: pré-piloto — conteúdo diagnóstico
- risco: alto — blueprint inadequado contamina a baseline e a personalização
- impacto: alto
- status: WAITING_HUMAN_APPROVAL
- evidência: BRIEFING/09.PROJETO_CVG_TREINAMENTO/90.ANEXOS/0012_blueprint_diagnostico_b07.md; conteúdo 8bed361; checkpoint ddc8383

### B07-02 — Produção dos itens diagnósticos

- título: produzir 120 itens originais em três sessões de 40
- descrição: escrever os itens conforme o blueprint, com cenários fictícios, gabaritos/rubricas testados, respostas aceitas e rastreabilidade interna por módulo/fonte
- módulo: conteúdo e avaliação
- dependência: B07-01 aprovado clinicamente por Ricardo
- fase: pré-piloto — produção de conteúdo
- risco: crítico — erro clínico, ambiguidade ou cópia bloqueia a aplicação
- impacto: alto
- status: PENDENTE

### B07-03 — Revisão e pré-voo

- título: executar revisão clínica de Ricardo e testar a avaliabilidade dos 120 itens
- descrição: verificar redação original, cobertura, fontes atuais, scoring determinístico, respostas aceitas, feedback e comportamento de interrupção com dados sintéticos
- módulo: governança clínica e qualidade da avaliação
- dependência: B07-02 concluído
- fase: pré-piloto — qualidade de conteúdo
- risco: crítico
- impacto: alto
- status: PENDENTE

### CUR-24-01 — Fatia vertical do Mês 2

- título: produzir e validar um módulo completo de emergência
- descrição: criar quatro sessões, dois casos fictícios, quiz, questões objetivas, duas respostas abertas, rubricas, feedback e referências; medir carga do participante e correção por Ricardo
- módulo: programa curricular V3 / emergência
- dependência: aprovação humana do PRD 0017 e da carga mensal — satisfeita em D-087
- fase: PRD — validação da proposta curricular
- risco: alto — sem protótipo a carga de autoria e correção é apenas estimativa
- impacto: alto
- status: READY_FOR_NEXT_STEP
- evidência: PRD 0017; Anexos 0013 a 0019; commit curricular c1d3023; fatia vertical 91cb9e7; protocolo/T0/T1 2d0d608; aprovação D-088
- próxima ação: selecionar e agendar dois a três veterinários autorizados para executar T2 conforme o Anexo 0018

### B07-04 — Aplicação da baseline

- título: aplicar o diagnóstico à coorte inicial
- descrição: aplicar as três sessões aos aproximadamente 10 veterinários e consolidar somente os dados permitidos, sem gravações, prontuários, tutores ou casos reais identificáveis
- módulo: piloto / baseline
- dependência: B07-03 aprovado; autorização de Ricardo; controles mínimos de D-077 prontos
- fase: piloto — baseline
- risco: crítico — envolve dados pessoais e decisão operacional externa
- impacto: alto
- status: PENDENTE

## P1 — ALTA PRIORIDADE

### GATE-01 — Aprovar reexecução do Discovery

- título: reexecutar e submeter 0090 Discovery Validation
- descrição: aprovar D-101 a D-108 e a reexecução técnica do gate sobre o checkpoint Git identificado
- módulo: governança de gates
- dependência: pacote técnico do Anexo 0021 e checkpoint Git revisado
- fase: Discovery
- risco: alto
- impacto: alto
- status: COMPLETED
- evidência: commit f6fefa1; BRIEFING/09.PROJETO_CVG_TREINAMENTO/00.DISCOVERY/0090_discovery_validation.md; BRIEFING/09.PROJETO_CVG_TREINAMENTO/90.ANEXOS/0021_pacote_fechamento_gates_pre_spec.md
- resultado: aprovado por MV. Ricardo Akinaga em 2026-08-07

### GATE-02 — Aprovar reexecução do PRD

- título: reexecutar e submeter 0090 PRD Validation
- descrição: depois do Discovery, aprovar o PRD tecnicamente validado no mesmo checkpoint Git
- módulo: governança de gates
- dependência: aprovação humana de GATE-01; pode ocorrer sequencialmente na mesma manifestação
- fase: PRD
- risco: alto
- impacto: alto
- status: COMPLETED
- evidência: commit f6fefa1; BRIEFING/09.PROJETO_CVG_TREINAMENTO/01.PRD/0090_prd_validation.md; BRIEFING/09.PROJETO_CVG_TREINAMENTO/90.ANEXOS/0021_pacote_fechamento_gates_pre_spec.md
- resultado: aprovado por MV. Ricardo Akinaga em 2026-08-07, depois do Discovery

### LIT-01 — Consolidar leitura da literatura e matriz curricular

- título: registrar a leitura dos três PDFs e a aplicação curricular por fonte
- descrição: validar páginas, hashes, estrutura, capítulos prioritários, matriz dos 24 meses e regras de conversão da literatura em conteúdo autoral do CVG
- módulo: conteúdo / governança de fontes
- dependência: D-075, D-086 e D-109 aprovadas/refinadas; PDFs locais disponíveis
- fase: PRD — preparação de conteúdo antes da autoria em escala
- risco: alto — fonte sem rastreabilidade aumenta risco clínico, autoral e de atualização
- impacto: alto
- status: COMPLETED
- evidência: BRIEFING/09.PROJETO_CVG_TREINAMENTO/90.ANEXOS/0022_leitura_literatura_e_matriz_curricular.md; hashes conferidos contra Anexo 0010
- resultado: leitura integral processada; matriz pronta para autoria; rastreabilidade restrita ao workflow interno por D-109; nenhum PDF ou derivado foi versionado

## P2 — MÉDIO

### SPEC-01 — Preparar SPEC

- título: iniciar SPEC somente após aprovação canônica do PRD
- descrição: criar readiness, visão arquitetural, domínio, contratos, dados, segurança, observabilidade e plano de build derivados do PRD aprovado
- módulo: SPEC
- dependência: PRE-SPEC-01 concluído; aprovação humana sequencial de GATE-01/GATE-02
- fase: SPEC
- risco: alto
- impacto: alto
- status: READY_FOR_NEXT_STEP
- evidência: commit f8e1e08; BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC/0100_spec_readiness_review.md; revisão independente `PASS`
- próxima ação: obter autorização humana para iniciar `0101_visao_arquitetural.md`; BUILD permanece bloqueado

## P3 — BAIXO

### FUT-01 — Decisões futuras

- título: avaliar automação de PDFs e expansão prática
- descrição: manter D-033 e GATE-EXP-PRAT-01 fora do MVP; qualquer abertura futura exige nova decisão, política, gate e checkpoint
- módulo: expansão e governança
- dependência: piloto, audit e decisão do patrocinador
- fase: backlog futuro
- risco: médio
- impacto: baixo
- status: BACKLOG FUTURO

## REGRAS DE USO

- Atualizar este arquivo sempre que um item mudar de status, prioridade, dependência ou risco.
- Não marcar B-07 como concluído somente por criar o blueprint.
- Não tratar B-07 como bloqueio da SPEC; ele bloqueia baseline e piloto completo por D-101.
- Adicionar imediatamente qualquer nova pendência descoberta durante revisão ou aplicação.
- Usar este backlog junto com docs/99_runtime_state.md e docs/20_master_execution_log.md.
