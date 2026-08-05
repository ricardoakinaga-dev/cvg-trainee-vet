# 0015 — Métricas de Sucesso

**Projeto:** Sistema CVG de Treinamento Veterinário  
**Fase:** PRD — Definição de produto  
**Data:** 2026-08-05  
**Regra:** as metas abaixo são `PROPOSTA`; nenhuma meta definitiva é adotada sem linha de base (B-07) e aprovação humana no gate.

---

## 1. Níveis de sucesso

1. **Aprendizagem:** domínio, ganho e retenção;
2. **Competência teórica:** progressão de níveis e domínio por competência;
3. **Engajamento e adesão:** ativação, conclusão, abandono;
4. **Governança de conteúdo:** validade, rastreabilidade e revisão;
5. **Operação e cultura:** carga sustentável, segurança psicológica, ausência de uso punitivo.

## 2. KPIs primários (definição de sucesso do MVP/piloto)

| KPI | Fórmula resumida | Meta provisória | Classificação |
|---|---|---|---|
| Ativação | iniciaram ÷ convidados elegíveis | ≥ 90% em 14 dias | PROPOSTA |
| Conclusão no prazo | concluídos no prazo ÷ elegíveis | ≥ 80% | PROPOSTA |
| Abandono | inativos além do limite ÷ iniciados elegíveis | ≤ 15% | PROPOSTA |
| Ganho de conhecimento | pós − pré (módulos com pré/pós) | mediana ≥ 15 p.p. | PROPOSTA |
| Domínio na 1ª tentativa | aprovados na 1ª ÷ avaliados | baseline antes de meta | PROPOSTA |
| Recuperação | aprovados após remediação ÷ remediados | ≥ 75% | PROPOSTA |
| Conteúdo em validade | módulos válidos ÷ publicados | 100% | PROPOSTA |
| Itens rastreáveis | itens completos ÷ ativos | 100% | PROPOSTA |
| Itens anulados | anulados ÷ itens únicos aplicados | baseline | PROPOSTA |
| Contestações respondidas | respondidas dentro do prazo ÷ totais | 100% (prazo: 7 dias úteis — RN-053) | APROVADA |

## 3. KPIs do colaborador (painel individual)

| KPI | Fórmula | Janela | Meta |
|---|---|---|---|
| Progresso | unidades concluídas ÷ obrigatórias | atual | conforme prazo |
| Nota diagnóstica | acertos ponderados ÷ itens | entrada | sem meta (baseline) |
| Nota por competência | pontos obtidos ÷ possíveis | módulo | ≥ limiar aprovado |
| Ganho absoluto | pós − pré | módulo | calibrar no piloto |
| Ganho normalizado | (pós−pré) ÷ (100−pré) | módulo | calibrar |
| Domínio tardio absoluto | pontos tardios ÷ possíveis | 30/60/90 dias | padrão a definir |
| Retenção relativa | tardia ÷ pós (se domínio pós e equivalência) | 30/60/90 dias | baseline |
| Consistência | variação entre avaliações equivalentes | longitudinal | calibrar |
| Tempo até domínio | mediana entre início e aprovação | módulo/nível | baseline |

Regras (anexo 0003 §10): retenção relativa nunca substitui limiar absoluto; dados faltantes e exclusões definidos por KPI; acomodações de acessibilidade registradas.

## 4. Critérios de sucesso do piloto (PROPOSTA)

O piloto será considerado **bem-sucedido** quando:

1. Fluxo completo operacional sem intervenção manual (diagnóstico → trilha → estudo → avaliação → remediação → retenção);
2. Ativação e conclusão nos patamares provisórios da seção 2;
3. Ganho mediano ≥ 15 p.p. entre diagnóstico e pós-teste, onde aplicável;
4. Retenção com tendência estável ou ascendente (baseline definido no piloto);
5. Nenhum risco crítico aberto (segurança clínica, licença, privacidade);
6. Carga de coordenação e autoria/revisão sustentável;
7. Percepção dos usuários: sem sensação de vigilância ou punição;
8. Nenhuma divergência crítica de fonte sem decisão registrada.

## 5. Critérios de insucesso / pausa (anexo 0004 §6)

- Erro clínico crítico no conteúdo;
- Licença não resolvida (B-04);
- Falha de privacidade (B-05);
- Inconsistência de notas ou gabaritos não resolvida;
- Uso punitivo indevido de resultados;
- Baixa adesão sem mitigação;
- Conteúdo sem owner.

## 6. Regras de uso das métricas

1. Não usar nota isolada como avaliação total do colaborador;
2. Não fazer ranking público;
3. Não comparar áreas com dificuldade diferente sem ajuste;
4. Separar desenvolvimento de disciplina;
5. Mostrar ao colaborador os dados utilizados sobre si;
6. Restringir acesso ao mínimo necessário;
7. Permitir correção e contestação;
8. Registrar finalidade, retenção e descarte (B-05);
9. Não inferir competência prática;
10. Não atribuir causalidade clínica sem desenho adequado.

## 7. Dados que precisam existir para calcular as métricas

- Perfil do colaborador (função, área, turno, data de entrada);
- Resultados do diagnóstico e das avaliações (item, resposta, horário, tentativa, versão da regra);
- Progresso e conclusões de unidades/módulos;
- Eventos de remediação e retenção;
- Metadados de conteúdo (versão, validade, revisores, data de corte);
- Eventos de auditoria (aprovações, alterações, retiradas, contestações);
- População elegível por KPI e exclusões (afastados, desligados, dispensados, transferidos).

## 8. Metas que dependem de baseline (não definidas)

- Domínio tardio absoluto (padrão por standard setting);
- Retenção relativa;
- Domínio na 1ª tentativa;
- Tempo até domínio;
- Custo por concluinte;
- Satisfação percebida.
