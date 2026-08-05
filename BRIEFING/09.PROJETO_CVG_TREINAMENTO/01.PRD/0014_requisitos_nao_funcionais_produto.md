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
| RNF-022 | Conteúdo deve ser rastreável até fonte, edição, volume, parte/seção, capítulo e páginas | FATO INFORMADO |
| RNF-023 | Versões de conteúdo, prova e gabarito devem ser preservadas | FATO INFORMADO |

## 4. Segurança operacional

| ID | Requisito | Classificação |
|---|---|---|
| RNF-030 | Acesso por papéis e escopos; mínimo necessário | FATO INFORMADO |
| RNF-031 | Proteção do banco de questões contra vazamento e compartilhamento | PROPOSTA (D-048) |
| RNF-032 | Dados pessoais e de desempenho tratados conforme LGPD; finalidade registrada | FATO INFORMADO |
| RNF-033 | Casos clínicos usam dados anonimizados ou fictícios | FATO INFORMADO |
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
| RNF-060 | Minimização de dados pessoais coletados | PROPOSTA |
| RNF-061 | Registro de finalidade e consentimento | PENDENTE (B-05) |
| RNF-062 | Retenção e descarte definidos e auditáveis | PENDENTE (D-053) |
| RNF-063 | Acesso de gestores restrito ao necessário; respostas detalhadas protegidas | PROPOSTA |
| RNF-064 | Uso de resultados em RH sujeito a política aprovada | PENDENTE (D-052) |
| RNF-065 | Direito do titular: acesso, correção e contestação dos próprios dados | PROPOSTA |

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
| RNF-080 | O sistema não emite certificação de competência prática | FATO INFORMADO |
| RNF-081 | O sistema não substitui protocolos clínicos nem julgamento do RT | FATO INFORMADO |
| RNF-082 | O sistema não reproduz as obras-fonte | FATO INFORMADO |
| RNF-083 | O sistema não permite ranking público | FATO INFORMADO |
| RNF-084 | Decisões automatizadas com impacto relevante exigem transparência e revisão humana | PROPOSTA |

## 10. Critérios de aceite gerais (PROPOSTA)

1. Fluxo completo do piloto executável sem intervenção manual (diagnóstico → trilha → estudo → avaliação → remediação → retenção);
2. Auditoria reconstituível de qualquer nota, decisão editorial e alteração de gabarito;
3. Nenhuma informação inventada: todos os campos desconhecidos marcados `PENDENTE` nos documentos;
4. Conteúdo clínico publicado somente após revisão humana e resolução de licença (B-04);
5. Acessibilidade e tratamento de interrupção validados no piloto;
6. Métricas calculadas conforme dicionário do anexo 0003, com população, exceções e dados faltantes definidos.
