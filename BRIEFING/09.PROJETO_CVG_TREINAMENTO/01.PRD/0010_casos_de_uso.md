# 0010 — Casos de Uso

**Projeto:** Sistema CVG de Treinamento Veterinário  
**Fase:** PRD — Definição de produto  
**Data:** 2026-08-05  
**Classificação:** os campos seguem as regras do briefing — `FATO INFORMADO`, `EVIDÊNCIA DOCUMENTAL`, `HIPÓTESE`, `PROPOSTA`, `PENDENTE`  
**Regra:** nenhuma tecnologia é definida aqui; os fluxos são de produto.

> **Precondição transversal de dados:** casos de uso que envolvam identificação, perfil, respostas, notas, painéis, logs ou auditoria descrevem comportamento futuro e não autorizam coleta. Sua execução depende da aprovação de B-05. Antes disso, prevalece D-073/[Anexo 0011](../90.ANEXOS/0011_politica_conservadora_dados_lgpd.md): nenhum dado pessoal de participante, paciente ou tutor; somente agregados efetivamente anonimizados e casos integralmente fictícios.

---

## 1. Visão geral dos atores

| Ator | Papel | Tipo |
|---|---|---|
| Colaborador | médico-veterinário que realiza a trilha | primário |
| Mentor/preceptor | acompanha lacunas autorizadas e orienta reforço | secundário |
| Autor/instrutor | propõe módulos, objetivos, casos e questões | secundário |
| Revisor clínico | valida correção científica e atualidade | secundário |
| Revisor pedagógico | valida alinhamento pedagógico dos itens | secundário |
| Gestor educacional | define trilhas, coortes, prazos e regras aprovadas | secundário |
| Gestor clínico | prioriza áreas e aprova critérios de domínio | secundário |
| Administrador | gere usuários, papéis e publicação | operador |
| Auditor/compliance | consulta trilhas de auditoria | operador |
| Gestão de pessoas | acesso restrito, conforme finalidade aprovada | secundário (restrito) |

---

## 2. Lista de casos de uso

| ID | Caso de uso | Ator primário |
|---|---|---|
| UC-001 | Realizar avaliação diagnóstica inicial | Colaborador |
| UC-002 | Receber trilha personalizada | Colaborador |
| UC-003 | Consumir conteúdo digital | Colaborador |
| UC-004 | Realizar quiz formativo | Colaborador |
| UC-005 | Realizar caso clínico ou simulação digital | Colaborador |
| UC-006 | Realizar prova somativa | Colaborador |
| UC-007 | Passar por remediação | Colaborador |
| UC-008 | Realizar avaliação de retenção | Colaborador |
| UC-009 | Acompanhar próprio progresso e métricas | Colaborador |
| UC-010 | Contestar questão ou resultado | Colaborador |
| UC-011 | Acompanhar lacunas da equipe (autorizado) | Mentor |
| UC-012 | Criar e submeter conteúdo | Autor |
| UC-013 | Revisar conteúdo | Revisor clínico / pedagógico |
| UC-014 | Aprovar e publicar conteúdo | Gestor educacional / comitê |
| UC-015 | Gerir usuários, papéis e configurações | Administrador |
| UC-016 | Acompanhar métricas do programa | Gestor educacional / clínico |
| UC-017 | Consultar trilha de auditoria | Auditor |
| UC-018 | Tratar contestação | Revisor independente |
| UC-019 | Retirar conteúdo por risco clínico | Revisor clínico / comitê |
| UC-020 | Gerenciar revisão e validade do conteúdo | Gestor educacional |

---

## 3. Detalhamento

### UC-001 — Realizar avaliação diagnóstica inicial

- **Ator:** Colaborador.
- **Objetivo:** estabelecer a linha de base individual de conhecimento e identificar lacunas por tema e competência.
- **Gatilho:** entrada no programa (novo colaborador) ou decisão da coordenação (colaborador ativo).
- **Fluxo principal:**
  1. O colaborador acessa a avaliação diagnóstica obrigatória;
  2. O sistema apresenta questões organizadas por competência e casos curtos;
  3. O colaborador responde e finaliza;
  4. O sistema registra a linha de base e o perfil de domínio por competência;
  5. O sistema recomenda a trilha inicial personalizada.
- **Exceções:**
  - Interrupção por perda de conexão: sessão preservada e retomada sem perda de respostas;
  - Acomodação de acessibilidade aprovada: tempo e formato ajustados;
  - Colaborador em afastamento/férias: prazo adiado conforme política aprovada.
- **Resultado esperado:** linha de base registrada, perfil por competência e recomendação de trilha (não confere nota de aprovação nem autonomia clínica).
- **Observações:** caráter formativo, sem punição. `PENDENTE` (B-07): blueprint e quantidade de itens do diagnóstico.

### UC-002 — Receber trilha personalizada

- **Ator:** Colaborador.
- **Objetivo:** ter uma jornada de aprendizagem adequada ao perfil identificado no diagnóstico.
- **Gatilho:** conclusão do diagnóstico inicial.
- **Fluxo principal:**
  1. O sistema consolida o perfil do diagnóstico;
  2. A trilha inicial é atribuída (núcleo obrigatório + reforços por lacuna);
  3. O colaborador visualiza trilha, prazos e pré-requisitos;
  4. O colaborador inicia o primeiro módulo elegível.
- **Exceções:**
  - Lacuna em tema crítico: item adicionado ao núcleo obrigatório (não dispensável);
  - Domínio comprovado em conteúdo obrigatório: dispensa **não aplicada no piloto** (APROVADO PELO PATROCINADOR COMO INSUMO em 2026-08-05; reavaliar com dados — D-045).
- **Resultado esperado:** trilha atribuída e visível, com progressão condicionada a pré-requisitos.
- **Observações:** personalização não pode dispensar automaticamente conteúdos obrigatórios nem temas críticos (`FATO INFORMADO` — ver 0001).

### UC-003 — Consumir conteúdo digital

- **Ator:** Colaborador.
- **Objetivo:** estudar unidades curtas de conteúdo revisado e rastreável.
- **Gatilho:** módulo desbloqueado na trilha.
- **Fluxo principal:**
  1. O colaborador abre a unidade de aprendizagem;
  2. O sistema apresenta o conteúdo autorizado (sínteses autorais, sem reprodução extensiva das obras);
  3. O colaborador conclui a unidade;
  4. O sistema registra a conclusão e desbloqueia a próxima etapa conforme pré-requisitos.
- **Exceções:**
  - Conteúdo retirado por risco clínico: módulo bloqueado e notificação registrada;
  - Conteúdo vencido: alerta de reciclagem; retenção da conclusão anterior preservada.
- **Resultado esperado:** progresso registrado e próximas etapas desbloqueadas conforme regras.
- **Observações:** conteúdo somente é publicado após revisão humana (`FATO INFORMADO` — regra de segurança).

### UC-004 — Realizar quiz formativo

- **Ator:** Colaborador.
- **Objetivo:** recuperação ativa com feedback imediato, sem impacto somativo.
- **Gatilho:** unidade concluída (recomendação) ou iniciativa do colaborador.
- **Fluxo principal:**
  1. O sistema seleciona itens do banco por objetivo;
  2. O colaborador responde;
  3. O sistema corrige e apresenta feedback com justificativa e fonte;
  4. O sistema recomenda revisão quando o desempenho indica lacuna.
- **Exceções:** questão contestada/anulada: recálculo da sessão conforme regra.
- **Resultado esperado:** feedback de aprendizagem; múltiplas tentativas permitidas; peso zero na decisão somativa (`PROPOSTA`).
- **Observações:** variação de ordem e seleção aleatória (`PROPOSTA` — integridade).

### UC-005 — Realizar caso clínico ou simulação digital

- **Ator:** Colaborador.
- **Objetivo:** avaliar conhecimento e raciocínio clínico em cenário digital progressivo, sem avaliar execução prática.
- **Gatilho:** módulo em andamento (caso formativo e/ou somativo conforme regra aprovada).
- **Fluxo principal:**
  1. O sistema identifica a atividade como simulação digital e apresenta dados clínicos fictícios em etapas;
  2. O colaborador decide por etapa (priorização, diferenciais, exames, conduta);
  3. O sistema registra as decisões e fornece feedback;
  4. Quando somativo, o sistema calcula o resultado por rubrica/gabarito revisado.
- **Exceções:** resposta construída — `PENDENTE` (D-070, avaliadores e dupla correção); interrupção preserva etapas concluídas.
- **Resultado esperado:** evidência de conhecimento e raciocínio em cenário digital; peso na nota conforme regra de composição.
- **Observações:** peso de 30% quando somativo, compondo o escore com prova 70% e quiz 0% (APROVADO PELO PATROCINADOR COMO INSUMO em 2026-08-05, D-044). O resultado nunca comprova habilidade psicomotora, competência prática ou autonomia clínica (D-068).

### UC-006 — Realizar prova somativa

- **Ator:** Colaborador.
- **Objetivo:** verificar domínio teórico antes da progressão.
- **Gatilho:** módulo concluído e elegibilidade satisfeita.
- **Fluxo principal:**
  1. O sistema gera a prova a partir do banco conforme blueprint;
  2. O colaborador responde em janela e tempo definidos;
  3. O sistema corrige e calcula a nota por objetivo;
  4. Aprovação ou encaminhamento à remediação conforme limiares.
- **Exceções:**
  - Perda de conexão: tentativa preservada conforme regra; `PENDENTE` (D-043);
  - Limite de tentativas atingido: remediação obrigatória;
  - Questão anulada: recálculo das tentativas afetadas.
- **Resultado esperado:** nota por objetivo, decisão de aprovação/reprovação e registro auditável.
- **Observações:** limiar 70% geral e 80% críticos; 2 tentativas + remediação com intervalo mínimo de 7 dias (APROVADO PELO PATROCINADOR COMO INSUMO em 2026-08-05, D-040 a D-043).

### UC-007 — Passar por remediação

- **Ator:** Colaborador.
- **Objetivo:** fechar lacunas identificadas antes de nova tentativa.
- **Gatilho:** reprovação em prova somativa ou lacuna crítica.
- **Fluxo principal:**
  1. O sistema apresenta objetivos com lacuna;
  2. Atribui conteúdo de reforço e quiz/caso equivalente;
  3. Respeita intervalo mínimo entre tentativas;
  4. Aplica nova prova com itens diferentes;
  5. Registra plano e desfecho.
- **Exceções:** falhas repetidas (2ª reprovação): revisão humana — mentor + coordenação educacional montam plano individual de reforço; novo ciclo após plano; sem punição automática (APROVADO PELO PATROCINADOR COMO INSUMO em 2026-08-05, D-047).
- **Resultado esperado:** recuperação estruturada, sem exposição pública do resultado.
- **Observações:** remediação nunca é punitiva; reforço documentado.

### UC-008 — Realizar avaliação de retenção

- **Ator:** Colaborador.
- **Objetivo:** verificar manutenção do conhecimento em janela de 30/60/90 dias.
- **Gatilho:** janela programada após domínio.
- **Fluxo principal:**
  1. O sistema apresenta itens equivalentes (não repetição literal);
  2. O colaborador responde;
  3. O sistema calcula domínio tardio e preservação relativa;
  4. Resultado mostrado separadamente da nota pós-módulo.
- **Exceções:** queda relevante — alerta de micro-reforço (sem revogar conclusão anterior, conforme `PROPOSTA` A-05).
- **Resultado esperado:** métrica de retenção visível e ação de reforço, sem punição.
- **Observações:** exige equivalência entre formas pré/pós/tardia antes de comparar.

### UC-009 — Acompanhar próprio progresso e métricas

- **Ator:** Colaborador.
- **Objetivo:** visualizar progresso, domínio, retenção, confiança e histórico.
- **Gatilho:** consulta voluntária.
- **Fluxo principal:**
  1. O colaborador acessa o painel individual;
  2. O sistema apresenta progresso, conhecimento, desempenho em cenários digitais, retenção e consistência;
  3. O colaborador vê recomendações de estudo.
- **Exceções:** resultado em revisão: exibido como `RESULTADO_EM_REVISÃO` (vocabulário anexo 0003).
- **Resultado esperado:** transparência do desenvolvimento; sem ranking público.
- **Observações:** separação explícita entre desempenho digital e competência prática.

### UC-010 — Contestar questão ou resultado

- **Ator:** Colaborador.
- **Objetivo:** revisar decisão de correção ou item com erro.
- **Gatilho:** inconformidade percebida após resultado.
- **Fluxo principal:**
  1. O colaborador registra contestação com justificativa;
  2. O sistema gera protocolo de acompanhamento;
  3. Revisor independente avalia;
  4. Se anulada/alterada, o sistema recalcula tentativas afetadas e preserva versões anteriores;
  5. Usuários afetados são identificados e notificados.
- **Exceções:** prazo de resposta: 7 dias úteis (APROVADO PELO PATROCINADOR COMO INSUMO em 2026-08-05, D-046); contestação duplicada.
- **Resultado esperado:** decisão auditável e recálculo correto.
- **Observações:** nenhuma alteração silenciosa de nota (regra de governança).

### UC-011 — Acompanhar lacunas da equipe (autorizado)

- **Ator:** Mentor/preceptor.
- **Objetivo:** orientar planos de reforço com base em lacunas autorizadas.
- **Gatilho:** decisão de mentoria.
- **Fluxo principal:**
  1. O mentor acessa somente os colaboradores autorizados;
  2. Visualiza lacunas e recomendações;
  3. Registra feedback e plano de reforço digital, sem observação ou validação de prática.
- **Exceções:** acesso negado a quem não tem autorização.
- **Resultado esperado:** orientação baseada em evidência, sem exposição indevida.
- **Observações:** limite de visibilidade conforme matriz de acesso (0006).

### UC-012 — Criar e submeter conteúdo

- **Ator:** Autor/instrutor.
- **Objetivo:** propor módulos, objetivos, casos e questões com rastreabilidade.
- **Gatilho:** demanda de trilha ou lacuna identificada.
- **Fluxo principal:**
  1. O autor cria a unidade/item no rascunho;
  2. Preenche rastreabilidade (objetivo, competência, nível, fonte, versão);
  3. Submete à revisão independente (não pode publicar o próprio conteúdo).
- **Exceções:** conteúdo exigindo alerta clínico — campo obrigatório.
- **Resultado esperado:** item em revisão com metadados completos.
- **Observações:** rastreabilidade mínima `100%` para itens ativos (métrica).

### UC-013 — Revisar conteúdo

- **Ator:** Revisor clínico (correção/atualidade) e revisor pedagógico (alinhamento).
- **Objetivo:** garantir correção científica, atualidade e qualidade pedagógica.
- **Gatilho:** submissão do autor.
- **Fluxo principal:**
  1. O revisor analisa conteúdo/questão;
  2. Verifica fonte, edição, capítulo e atualidade;
  3. Aprova, solicita ajustes ou rejeita;
  4. Divergências entre fontes seguem a regra de conflito (anexo 0001).
- **Exceções:** divergência crítica — nunca resolvida automaticamente por IA; encaminhada a especialista.
- **Resultado esperado:** conteúdo aprovado com data de corte e validade.
- **Observações:** revisor clínico e pedagógico são independentes do autor.

### UC-014 — Aprovar e publicar conteúdo

- **Ator:** Gestor educacional (comitê, conforme segregação).
- **Objetivo:** liberar conteúdo aprovado para a trilha.
- **Gatilho:** revisões concluídas.
- **Fluxo principal:**
  1. O gestor verifica aprovações e licenças;
  2. Agenda a publicação;
  3. O sistema publica e registra versão e data.
- **Exceções:** licença de fonte pendente — publicação bloqueada (B-04).
- **Resultado esperado:** conteúdo ativo, versionado e rastreável.
- **Observações:** publicação só de conteúdo aprovado; alterações sempre versionadas.

### UC-015 — Gerir usuários, papéis e configurações

- **Ator:** Administrador.
- **Objetivo:** operar contas, papéis e parâmetros aprovados.
- **Gatilho:** solicitação da coordenação.
- **Fluxo principal:**
  1. O administrador cria/desativa usuários;
  2. Atribui papéis conforme regras;
  3. Aplica configurações aprovadas (prazos, coortes).
- **Exceções:** contas compartilhadas — proibidas (risco 0007).
- **Resultado esperado:** acesso correto e auditável.
- **Observações:** administrador não altera nota silenciosamente (0006).

### UC-016 — Acompanhar métricas do programa

- **Ator:** Gestor educacional / gestor clínico (escopos autorizados).
- **Objetivo:** monitorar ativação, progresso, lacunas e retenção.
- **Gatilho:** periodicidade definida — `PENDENTE` (D-055).
- **Fluxo principal:**
  1. O gestor acessa o painel agregado;
  2. Filtra por coorte, área, nível ou módulo;
  3. Analisa indicadores com contexto e define ações.
- **Exceções:** uso fora da finalidade — proibido (0007).
- **Resultado esperado:** decisões de reforço/priorização baseadas em dados, sem ranking público.
- **Observações:** métricas separadas por finalidade; nunca uso punitivo automático.

### UC-017 — Consultar trilha de auditoria

- **Ator:** Auditor/compliance.
- **Objetivo:** verificar versões, aprovações, alterações e decisões.
- **Gatilho:** auditoria programada ou apuração.
- **Fluxo principal:**
  1. O auditor consulta o histórico;
  2. Verifica rastreabilidade de conteúdo, notas, gabaritos e contestações;
  3. Emite achados (não edita resultados).
- **Exceções:** eventos sensíveis sem trilha — não conformidade.
- **Resultado esperado:** evidência de governança e reprodutibilidade das decisões.
- **Observações:** requisito de auditoria futura do anexo 0003.

### UC-018 — Tratar contestação

- **Ator:** Revisor independente (não o autor original).
- **Objetivo:** avaliar e decidir sobre questionamento de item/resultado.
- **Gatilho:** UC-010 registrada.
- **Fluxo principal:**
  1. O revisor analisa a contestação;
  2. Decide manter, anular ou alterar gabarito;
  3. Registra justificativa e versiona;
  4. O sistema recalcula e notifica afetados.
- **Exceções:** prazo de resposta estourado — alerta (anexo 0003, seção 11).
- **Resultado esperado:** decisão formal e auditável.
- **Observações:** independência do revisor em relação ao autor.

### UC-019 — Retirar conteúdo por risco clínico

- **Ator:** Revisor clínico / comitê.
- **Objetivo:** remover ou bloquear conteúdo com risco.
- **Gatilho:** alerta regulatório, erro identificado ou divergência crítica.
- **Fluxo principal:**
  1. O revisor sinaliza o risco;
  2. O comitê decide (crítico: decisão em até 24h — anexo 0001);
  3. O sistema bloqueia o conteúdo e registra itens afetados e usuários expostos;
  4. Ação corretiva é registrada.
- **Exceções:** decisão tardia em caso crítico — não conformidade.
- **Resultado esperado:** conteúdo inseguro fora de circulação, com trilha de retirada.
- **Observações:** regra do anexo 0001, seção 10.

### UC-020 — Gerenciar revisão e validade do conteúdo

- **Ator:** Gestor educacional.
- **Objetivo:** manter o conteúdo dentro da validade (ciclo editorial).
- **Gatilho:** vencimento próximo ou alerta (frequências 6/12/24 meses — anexo 0001).
- **Fluxo principal:**
  1. O gestor identifica itens a revisar;
  2. Aciona autores/revisores;
  3. Acompanha o ciclo até a nova publicação;
  4. Registra nova data de corte e validade.
- **Exceções:** conteúdo crítico vencido sem revisão — bloqueio de exibição, conforme política.
- **Resultado esperado:** 100% do conteúdo ativo dentro da validade (métrica).
- **Observações:** frequências são `PROPOSTA` (anexo 0001, seção 9).

---

## 4. Casos de uso fora do escopo desta fase

- Treinamento prático presencial, observação de trabalho real e registro de evidência prática (`FUTURE — BLOQUEADO POR GATE-EXP-PRAT-01`);
- Integrações com sistemas externos (futuro);
- Emissão de certificados formais (decisão `PENDENTE`, D-049);
- Notificações externas (e-mail/SMS) — decisão `PENDENTE`.

## 5. Rastreabilidade com os anexos

| Caso de uso | Origem principal |
|---|---|
| UC-001 a UC-010 | anexos 0002 e 0003 (hipóteses pedagógicas e de avaliação) |
| UC-011 a UC-020 | anexo 0001 (governança) e 0006 (usuários/estrutura) |
| Fluxos gerais | 0003 (fluxo atual/desejado) e 0002 (contexto operacional) |

## 6. Itens registrados como pendentes

- Blueprint e quantidade de itens do diagnóstico (UC-001, B-07) — banco de itens por objetivo definido em 10–15 (RN-078);
- Avaliadores e dupla correção de respostas construídas (UC-005, D-070);
- Periodicidade dos dashboards — resolvida: mensal (RN-080);
- Certificação interna — resolvida: status no piloto (RN-079);
- Integrações e notificações externas (fora de escopo);
- Intervalo entre tentativas — resolvido: 7 dias (RN-027);
- Consequência de reprovação recorrente — resolvida: plano individual (RN-034);
- Prazo de resposta de contestação — resolvido: 7 dias úteis (RN-053);
- Dispensa por domínio — resolvida: não no piloto (RN-017).
