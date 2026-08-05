# 0014 — Requisitos Não Funcionais (Produto)

**Projeto:** Sistema CVG de Treinamento Veterinário  
**Fase:** PRD — Definição de produto  
**Data:** 2026-08-05  
**Regra:** requisitos de produto, sem tecnologia; decisões de implementação ficam para a SPEC.

Legenda: `FATO INFORMADO` / `PROPOSTA` / `PENDENTE`.

---

## 1. Performance esperada

| ID | Requisito | Classificação |
|---|---|---|
| RNF-001 | O sistema deve responder adequadamente durante avaliações em horários de pico do hospital (24h, escala 12×36) | HIPÓTESE |
| RNF-002 | Interação de estudo e quiz deve ser fluida em dispositivos móveis e computadores | PROPOSTA |
| RNF-003 | O número de usuários simultâneos é desconhecido; deve ser dimensionado após inventário (B-02) | PENDENTE |
| RNF-004 | Não deve haver perda de resposta por lentidão durante avaliação; política de tolerância definida no piloto | PROPOSTA |

## 2. Confiabilidade

| ID | Requisito | Classificação |
|---|---|---|
| RNF-010 | Tentativas de avaliação devem ser preservadas em caso de interrupção (conexão, queda de energia) | FATO INFORMADO |
| RNF-011 | Nenhuma resposta registrada pode ser perdida ou alterada silenciosamente | FATO INFORMADO |
| RNF-012 | Disponibilidade deve ser planejada para operação contínua; janelas de manutenção fora do horário crítico do hospital | HIPÓTESE |
| RNF-013 | Recuperação de falha deve restaurar o estado consistente da tentativa (sem respostas duplicadas) | PROPOSTA |

## 3. Rastreabilidade

| ID | Requisito | Classificação |
|---|---|---|
| RNF-020 | Toda ação sensível (aprovação, publicação, alteração de nota/gabarito, permissão, retirada) deve gerar trilha de auditoria com responsável e data | FATO INFORMADO |
| RNF-021 | Decisões de aprovação devem ser reproduzíveis: conteúdo, itens aplicados, respostas, horário, tentativa, regra, cálculo, resultado, alterações | FATO INFORMADO |
| RNF-022 | Conteúdo deve ser rastreável internamente até fonte, edição, volume, parte/seção, capítulo e páginas; esses metadados não são exibidos ao aluno | APROVADA PELO PATROCINADOR COMO INSUMO (D-074, 2026-08-05) |
| RNF-023 | Versões de conteúdo, prova e gabarito devem ser preservadas | FATO INFORMADO |

## 4. Segurança operacional

| ID | Requisito | Classificação |
|---|---|---|
| RNF-030 | Acesso por papéis e escopos; mínimo necessário | FATO INFORMADO |
| RNF-031 | Proteção do banco de questões contra vazamento e compartilhamento | PROPOSTA (D-048) |
| RNF-032 | Dados pessoais e de desempenho somente podem ser tratados após B-05, conforme finalidade e base legal validadas | PENDENTE (B-05/D-073) |
| RNF-033 | Antes de B-05, casos clínicos são exclusivamente fictícios; uso futuro de caso real depende de anonimização e revisão formal | PENDENTE (B-05/D-073) |
| RNF-034 | Segregação de responsabilidades: autor não revisa o próprio conteúdo; administrador não altera notas silenciosamente | FATO INFORMADO |
| RNF-035 | Nenhuma decisão crítica clínica automatizada por IA sem revisão humana | FATO INFORMADO |
| RNF-036 | Alteração de gabarito/nota exige justificativa e fluxo formal | PROPOSTA |

## 5. Operação multiusuário

| ID | Requisito | Classificação |
|---|---|---|
| RNF-040 | O sistema deve suportar simultaneamente: colaboradores em estudo/avaliação, autores, revisores, gestores e auditor | HIPÓTESE |
| RNF-041 | Escala 12×36 exige uso assíncrono (treinamento em momentos livres) | FATO INFORMADO |
| RNF-042 | Acessibilidade para usuários com necessidades específicas (tempo, formato, leitores) | PENDENTE (D-018) |
| RNF-043 | O sistema deve indicar claramente estado de cada avaliação ao usuário (em andamento, concluída, em revisão) | PROPOSTA |

## 6. Governança

| ID | Requisito | Classificação |
|---|---|---|
| RNF-050 | Fluxo editorial obrigatório antes de publicação | FATO INFORMADO |
| RNF-051 | Controle de validade e reciclagem do conteúdo | PROPOSTA |
| RNF-052 | Política de dados aprovada antes do piloto (finalidade, acesso, retenção, descarte) | PENDENTE (B-05) |
| RNF-053 | Política de correção manual de nota | PENDENTE (D-054) |
| RNF-054 | Procedimento de contestação com revisor independente | PROPOSTA |

## 7. Privacidade (LGPD)

| ID | Requisito | Classificação |
|---|---|---|
| RNF-060 | Antes de B-05 não há coleta pessoal; depois, somente o mínimo validado para cada finalidade | PENDENTE (B-05/D-073) |
| RNF-061 | Registro de finalidade e base legal; registro de consentimento e revogação somente quando essa base for aplicável | PENDENTE (B-05/D-073) |
| RNF-062 | Retenção e descarte definidos por finalidade/categoria e auditáveis; `vínculo + 2 anos` é proposta não validada | PENDENTE (B-05/D-073) |
| RNF-063 | Acesso de gestores restrito ao necessário; respostas detalhadas protegidas | PENDENTE (B-05/D-073) |
| RNF-064 | Uso de resultados em RH proibido no piloto; mudança futura exige nova política formal e gate | INSUMO DO PATROCINADOR (D-052/D-073) |
| RNF-065 | Direito do titular: acesso, correção e contestação dos próprios dados | PENDENTE (B-05/D-073) |

O [Anexo 0011 — Política Conservadora de Dados e LGPD](../90.ANEXOS/0011_politica_conservadora_dados_lgpd.md) controla a preparação de B-05. Ele é rascunho não aprovado e não autoriza coleta pessoal, SPEC ou BUILD.

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
| RNF-082 | O sistema não reproduz nem adapta a expressão das obras-fonte e não expõe PDFs ou metadados bibliográficos ao aluno | APROVADA PELO PATROCINADOR COMO INSUMO (D-074, 2026-08-05) |
| RNF-083 | O sistema não permite ranking público | FATO INFORMADO |
| RNF-084 | Decisões automatizadas com impacto relevante exigem transparência e revisão humana | PROPOSTA |

## 10. Critérios de aceite gerais (PROPOSTA)

1. Fluxo completo do piloto executável sem intervenção manual (diagnóstico → trilha → estudo → avaliação → remediação → retenção);
2. Auditoria reconstituível de qualquer nota, decisão editorial e alteração de gabarito;
3. Nenhuma informação inventada: todos os campos desconhecidos marcados `PENDENTE` nos documentos;
4. Conteúdo clínico publicado somente após revisão humana e resolução de licença (B-04);
5. Acessibilidade e tratamento de interrupção validados no piloto;
6. Métricas calculadas conforme dicionário do anexo 0003, com população, exceções e dados faltantes definidos.
