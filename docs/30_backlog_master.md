# BACKLOG MASTER — CVG

Backlog operacional vivo. Itens só podem avançar quando suas dependências e gates estiverem satisfeitos.

## P0 — CRÍTICO

### B07-01 — Blueprint diagnóstico

- título: validar blueprint das 120 questões diagnósticas
- descrição: revisar a matriz das três sessões, cobertura clínica, estrutura cognitiva, avaliabilidade, equidade e aderência à política D-077
- módulo: Discovery / avaliação diagnóstica
- dependência: PRD 0017, D-070, D-077, D-082, D-083 a D-086
- fase: Discovery — correção B-07
- risco: alto — blueprint inadequado contamina a baseline e a personalização
- impacto: alto
- status: WAITING_HUMAN_APPROVAL
- evidência: BRIEFING/09.PROJETO_CVG_TREINAMENTO/90.ANEXOS/0012_blueprint_diagnostico_b07.md; conteúdo 8bed361; checkpoint ddc8383

### B07-02 — Produção dos itens diagnósticos

- título: produzir 120 itens originais em três sessões de 40
- descrição: escrever os itens conforme o blueprint, com cenários fictícios, gabaritos/rubricas testados, respostas aceitas e rastreabilidade interna por módulo/fonte
- módulo: conteúdo e avaliação
- dependência: B07-01 alinhado à V3; aprovação clínica de Ricardo; autorização humana para produção
- fase: Discovery/PRD — correção B-07
- risco: crítico — erro clínico, ambiguidade ou cópia bloqueia a aplicação
- impacto: alto
- status: PENDENTE

### B07-03 — Revisão e pré-voo

- título: executar revisão clínica de Ricardo e testar a avaliabilidade dos 120 itens
- descrição: verificar redação original, cobertura, fontes atuais, scoring determinístico, respostas aceitas, feedback e comportamento de interrupção com dados sintéticos
- módulo: governança clínica e qualidade da avaliação
- dependência: B07-02 concluído
- fase: Discovery/PRD — correção B-07
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
- status: WAITING_HUMAN_APPROVAL
- evidência: PRD 0017; Anexos 0013 a 0017; commit curricular c1d3023; fatia vertical 91cb9e7
- próxima decisão: Ricardo revisar clinicamente a versão 0.1.0 e autorizar ou rejeitar ensaio controlado/cronometrado

### B07-04 — Aplicação da baseline

- título: aplicar o diagnóstico à coorte inicial
- descrição: aplicar as três sessões aos aproximadamente 10 veterinários e consolidar somente os dados permitidos, sem gravações, prontuários, tutores ou casos reais identificáveis
- módulo: piloto / baseline
- dependência: B07-03 aprovado; autorização de Ricardo; aviso de privacidade e controles mínimos prontos
- fase: Discovery/PRD — correção B-07
- risco: crítico — envolve dados pessoais e decisão operacional externa
- impacto: alto
- status: PENDENTE

## P1 — ALTA PRIORIDADE

### GATE-01 — Reexecutar Discovery

- título: reexecutar e submeter 0090 Discovery Validation
- descrição: atualizar evidências de B-07, revisar pendências obrigatórias e registrar checkpoint Git com aprovação humana
- módulo: governança de gates
- dependência: B07-01, B07-02, B07-03 e B07-04; demais pendências do Discovery resolvidas
- fase: Discovery
- risco: alto
- impacto: alto
- status: BLOQUEADO POR GATE

### GATE-02 — Reexecutar PRD

- título: reexecutar e submeter 0090 PRD Validation
- descrição: resolver RN-015, RN-023, RN-074 e exceções/requisitos ainda pendentes; registrar commit distinto e aprovação
- módulo: governança de gates
- dependência: GATE-01 aprovado
- fase: PRD
- risco: alto
- impacto: alto
- status: BLOQUEADO POR GATE

## P2 — MÉDIO

### SPEC-01 — Preparar SPEC

- título: iniciar SPEC somente após aprovação canônica do PRD
- descrição: criar readiness, visão arquitetural, domínio, contratos, dados, segurança, observabilidade e plano de build derivados do PRD aprovado
- módulo: SPEC
- dependência: GATE-02 aprovado
- fase: SPEC
- risco: alto
- impacto: alto
- status: BLOQUEADO POR GATE

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
- Adicionar imediatamente qualquer nova pendência descoberta durante revisão ou aplicação.
- Usar este backlog junto com docs/99_runtime_state.md e docs/20_master_execution_log.md.
