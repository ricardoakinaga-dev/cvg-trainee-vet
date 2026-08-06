# 0014 — Requisitos Não Funcionais (Produto)

**Projeto:** Sistema CVG de Treinamento Veterinário  
**Fase:** PRD — Definição de produto  
**Data:** 2026-08-06
**Regra:** requisitos de produto; o Anexo 0020 registra decisões arquiteturais recomendadas, ainda sem iniciar a SPEC ou escolher fornecedor.

Legenda: `FATO INFORMADO` / `PROPOSTA` / `PENDENTE`.

---

## 1. Performance esperada

| ID | Requisito | Classificação |
|---|---|---|
| RNF-001 | O sistema deve responder adequadamente durante avaliações em horários de pico do hospital (24h, escala 12×36) | HIPÓTESE |
| RNF-002 | Interação de estudo e quiz deve ser fluida em dispositivos móveis e computadores | PROPOSTA |
| RNF-003 | O MVP deve atender com folga a equipe informada de aproximadamente 10 veterinários | PROPOSTA; B-02 FECHADO POR D-079 |
| RNF-004 | Não deve haver perda de resposta por lentidão durante avaliação; política de tolerância definida no piloto | PROPOSTA |
| RNF-005 | A jornada do colaborador deve priorizar linguagem simples, uma próxima ação clara e nenhum acesso a telas administrativas | APROVADA PELO PATROCINADOR (D-080) |
| RNF-006 | Login, conta, treinamento, formulários e dashboards devem atender WCAG 2.2 nível AA, com teclado, foco visível, mensagens de erro identificáveis e estados anunciados | APROVADA PELO PATROCINADOR (D-099, 2026-08-06) |

## 2. Confiabilidade

| ID | Requisito | Classificação |
|---|---|---|
| RNF-010 | Tentativas de avaliação devem ser preservadas em caso de interrupção (conexão, queda de energia) | FATO INFORMADO |
| RNF-011 | Nenhuma resposta registrada pode ser perdida ou alterada silenciosamente | FATO INFORMADO |
| RNF-012 | Disponibilidade deve ser planejada para operação contínua; janelas de manutenção fora do horário crítico do hospital | HIPÓTESE |
| RNF-013 | Recuperação de falha deve restaurar o estado consistente da tentativa (sem respostas duplicadas) | PROPOSTA |
| RNF-014 | Login, salvamento, submissão, correção e tarefas agendadas devem emitir telemetria estruturada e alertas acionáveis, sem conteúdo sensível | APROVADA PELO PATROCINADOR (D-098, 2026-08-06) |
| RNF-015 | O banco deve ter backups automáticos e restauração testada; RPO e RTO serão definidos antes da SPEC ser considerada pronta | APROVADA PELO PATROCINADOR (D-098, 2026-08-06); RPO/RTO ainda pendentes |
| RNF-016 | O MVP não deve usar gravação de tela, session replay ou coleta comportamental invasiva | APROVADA PELO PATROCINADOR (D-098, 2026-08-06) |
| RNF-017 | Operações de submissão e correção devem ser idempotentes e transacionais para impedir duplicidade ou estado parcial | APROVADA PELO PATROCINADOR (D-096, 2026-08-06) |

## 3. Rastreabilidade

| ID | Requisito | Classificação |
|---|---|---|
| RNF-020 | Toda ação sensível (aprovação, publicação, alteração de nota/gabarito, permissão, retirada) deve gerar trilha de auditoria com responsável e data | FATO INFORMADO |
| RNF-021 | Decisões de aprovação devem ser reproduzíveis: conteúdo, itens aplicados, respostas, horário, tentativa, regra, cálculo, resultado, alterações | FATO INFORMADO |
| RNF-022 | Cada módulo deve manter referência interna simples à obra e ao capítulo/seção consultados; esses metadados não são exibidos ao aluno | APROVADA PELO PATROCINADOR COMO INSUMO (D-075, 2026-08-05) |
| RNF-023 | Versões de conteúdo, prova e gabarito devem ser preservadas | FATO INFORMADO |

## 4. Segurança operacional

| ID | Requisito | Classificação |
|---|---|---|
| RNF-030 | Acesso por papéis e escopos; mínimo necessário | FATO INFORMADO |
| RNF-031 | Proteção do banco de questões contra vazamento e compartilhamento | PROPOSTA (D-048) |
| RNF-032 | O MVP trata somente nome/login profissional, progresso, tentativas, notas e logs mínimos definidos na política; o T2 não depende de gate documental adicional | APROVADA PELO PATROCINADOR COMO INSUMO (D-077/D-089) |
| RNF-033 | Casos e simulações do MVP são exclusivamente fictícios; prontuários, dados de tutores e casos reais identificáveis são proibidos | APROVADA PELO PATROCINADOR COMO INSUMO (D-077) |
| RNF-034 | Módulo clínico exige aprovação humana registrada de Ricardo; revisão adicional é opcional e alteração de nota nunca ocorre silenciosamente | APROVADA PELO PATROCINADOR EM D-083 (2026-08-06) |
| RNF-035 | Nenhuma decisão crítica clínica automatizada por IA sem revisão humana | FATO INFORMADO |
| RNF-036 | Alteração de gabarito/nota exige justificativa e fluxo formal | PROPOSTA |
| RNF-037 | Identidade, senha, recuperação e MFA devem usar provedor especializado; sessão usa cookie seguro, rotação, CSRF e rate limiting; a aplicação não armazena senha, segredo de recuperação ou token no banco comum | APROVADA PELO PATROCINADOR (D-091, 2026-08-06) |
| RNF-038 | MFA deve ser obrigatório para administrador e moderador e disponível para participante; ações sensíveis exigem reautenticação | APROVADA PELO PATROCINADOR (D-091, 2026-08-06) |
| RNF-039 | A autorização deve ser verificada no servidor, negar por padrão e aplicar mínimo privilégio; proteção por linha no banco funciona como defesa adicional | APROVADA PELO PATROCINADOR (D-091/D-092/D-096, 2026-08-06) |

## 5. Operação multiusuário

| ID | Requisito | Classificação |
|---|---|---|
| RNF-040 | O sistema deve suportar simultaneamente: colaboradores em estudo/avaliação, autores, revisores, gestores e auditor | HIPÓTESE |
| RNF-041 | Escala 12×36 exige uso assíncrono (treinamento em momentos livres) | FATO INFORMADO |
| RNF-042 | Acessibilidade para usuários com necessidades específicas inclui tempo/formato ajustável e compatibilidade com leitores, sem reduzir a segurança da avaliação | PADRÃO GERAL APROVADO EM D-099; necessidades concretas permanecem em D-018 |
| RNF-043 | O sistema deve indicar claramente estado de cada avaliação ao usuário (em andamento, concluída, em revisão) | PROPOSTA |
| RNF-044 | Administrador e moderador devem compartilhar a estrutura visual do dashboard, mas cada consulta, cartão e ação respeita o escopo autorizado | APROVADA PELO PATROCINADOR (D-092/D-093, 2026-08-06) |

## 6. Governança

| ID | Requisito | Classificação |
|---|---|---|
| RNF-050 | Fluxo editorial obrigatório antes de publicação | FATO INFORMADO |
| RNF-051 | Controle de validade e reciclagem do conteúdo | PROPOSTA |
| RNF-052 | Política mínima interna de dados aprovada antes do piloto (finalidade, acesso, retenção e descarte) | APROVADA PELO PATROCINADOR COMO INSUMO (D-077; B-05 FECHADO) |
| RNF-053 | Política de correção manual de nota | PENDENTE (D-054) |
| RNF-054 | Procedimento de contestação com revisor independente | PROPOSTA |

## 7. Privacidade (LGPD)

| ID | Requisito | Classificação |
|---|---|---|
| RNF-060 | Coleta limitada aos dados permitidos pelo Anexo 0011; qualquer ampliação exige nova decisão antes da coleta | APROVADA PELO PATROCINADOR COMO INSUMO (D-077) |
| RNF-061 | Comunicação operacional simples deve informar finalidade, dados mínimos, acesso e retenção antes do primeiro uso | APROVADA PELO PATROCINADOR COMO INSUMO (D-077/D-089) |
| RNF-062 | Retenção durante o vínculo com o CVG + 2 anos; depois eliminação ou anonimização, ressalvadas obrigações aplicáveis | APROVADA PELO PATROCINADOR COMO INSUMO (D-077) |
| RNF-063 | Participante acessa os próprios dados; Ricardo acessa o necessário; mentor autorizado acessa somente lacunas/remediação dos participantes atribuídos; suporte delegado é excepcional e auditado | APROVADA PELO PATROCINADOR COMO INSUMO (D-077) |
| RNF-064 | Uso de resultados em RH, punição automática e ranking público proibidos no MVP | APROVADA PELO PATROCINADOR COMO INSUMO (D-077) |
| RNF-065 | Participante pode acessar e corrigir cadastro e contestar nota ou resultado | APROVADA PELO PATROCINADOR COMO INSUMO (D-077) |
| RNF-066 | Relatos devem coletar somente os campos de D-094, sem anexos ou inserção automática/manual de resposta, URL com parâmetros, IP completo, tela, áudio, vídeo, prontuário ou dado de paciente/tutor; escape é restringido e redigido com auditoria | APROVADA PELO PATROCINADOR (D-094, 2026-08-06) |

O [Anexo 0011 — Política Mínima Interna de Dados](../90.ANEXOS/0011_politica_conservadora_dados_lgpd.md) foi aprovado por D-077 e fecha B-05 para o MVP. Os controles técnicos permanecem requisitos obrigatórios da futura SPEC e construção.

## 8. Exceções e tratamento de falhas (produto)

| ID | Requisito | Classificação |
|---|---|---|
| RNF-070 | Afastamento, férias, mudança de setor: prazos e trilha ajustáveis | PENDENTE (D-016) |
| RNF-071 | Perda de conexão durante avaliação: retomada sem perda de respostas | PROPOSTA |
| RNF-072 | Questão anulada: recálculo de afetados e notificação | PROPOSTA |
| RNF-073 | Conteúdo retirado: bloqueio imediato e registro de exposição | PROPOSTA |
| RNF-074 | Reprovação recorrente: encaminhamento a revisão humana | PENDENTE (D-047) |
| RNF-075 | Conflito entre fontes: registro de decisão com `conflict_id` | FATO INFORMADO |

## 9. Restrições e limites de produto

| ID | Requisito | Classificação |
|---|---|---|
| RNF-080 | O sistema não emite certificação de competência prática; provas, casos e simulações digitais não podem ser apresentados como evidência prática ou autonomia clínica | APROVADA PELO PATROCINADOR COMO INSUMO (D-068, 2026-08-05) |
| RNF-081 | O sistema não substitui protocolos clínicos nem julgamento do RT | FATO INFORMADO |
| RNF-082 | O sistema não copia nem expõe PDFs, páginas, tabelas, figuras ou imagens das obras ao aluno | APROVADA PELO PATROCINADOR COMO INSUMO (D-075, 2026-08-05) |
| RNF-083 | O sistema não permite ranking público | FATO INFORMADO |
| RNF-084 | Decisões automatizadas com impacto relevante exigem transparência e revisão humana | PROPOSTA |
| RNF-085 | OCR, indexação, embeddings, RAG e envio dos PDFs a serviços de IA permanecem fora do MVP; apenas metadados de obra, edição, capítulo, versão e data de corte são preparados | APROVADA PELO PATROCINADOR (D-097, 2026-08-06); D-033 permanece futura |
| RNF-086 | O agente operacional de IA não é fonte de estado nem autoridade clínica; ações usam ferramentas limitadas, saída validada, teto de custo e confirmação humana nos limites definidos em D-100 | APROVADA PELO PATROCINADOR (D-100, 2026-08-06) |

## 10. Critérios de aceite gerais (PROPOSTA)

1. Fluxo completo do piloto executável sem intervenção manual (diagnóstico → trilha → estudo → avaliação → remediação → retenção);
2. Auditoria reconstituível de qualquer nota, decisão editorial e alteração de gabarito;
3. Nenhuma informação inventada: todos os campos desconhecidos marcados `PENDENTE` nos documentos;
4. Conteúdo clínico publicado somente após revisão humana, com redação própria e sem PDFs ou material copiado das obras;
5. Acessibilidade e tratamento de interrupção validados no piloto;
6. Métricas calculadas conforme dicionário do anexo 0003, com população, exceções e dados faltantes definidos.
7. Fluxos de conta, dashboards, feedback, KPIs e agente operacional devem seguir o pacote D-091 a D-100 aprovado no [Anexo 0020](../90.ANEXOS/0020_alinhamento_produto_pre_spec.md).
