# 0015 — Métricas de Sucesso

**Projeto:** Sistema CVG de Treinamento Veterinário  
**Fase:** PRD — Definição de produto  
**Data:** 2026-08-06
**Regra:** as metas abaixo são `PROPOSTA`; nenhuma meta definitiva é adotada sem linha de base (B-07) e aprovação humana no gate.

---

## 1. Níveis de sucesso

1. **Aprendizagem:** domínio, ganho e retenção;
2. **Conhecimento e raciocínio digital:** progressão de complexidade, domínio por objetivo e desempenho em casos/simulações digitais;
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

### 3.1 Recorte simples do dashboard do participante

O MVP não precisa exibir todas as métricas analíticas da seção 3. A interface prioriza, nesta ordem:

1. próxima ação;
2. progresso da trilha e do módulo atual;
3. sessões concluídas e pendentes;
4. correções, reforços e retenções pendentes;
5. evolução por competência e por período;
6. histórico de módulos, tentativas, resultados e contestações.

Não há ranking, comparação entre colegas ou inferência de competência prática. Este recorte foi aprovado em D-093/D-095.

### 3.2 Recorte simples do dashboard administrativo e de moderação

| KPI | Leitura mínima | Uso |
|---|---|---|
| Contas | convidadas, ativadas, desativadas e pendentes | ativação e acesso |
| Usuários ativos | acesso ou atividade educacional nos últimos 14 dias | identificar necessidade de apoio |
| Conclusão no prazo | concluídos no prazo ÷ elegíveis | acompanhar a cadência |
| Progresso mediano | mediana dos participantes elegíveis | visão da coorte, sem ranking |
| Correções | abertas, vencendo, vencidas e dentro do SLA | gerir fila de trabalho |
| Remediação | participantes/objetivos em reforço e recuperados | priorizar apoio |
| Conteúdo | válido, próximo da revisão, vencido e retirado | governança clínica |
| Feedback | relatos abertos por tipo/prioridade e tempo mediano de resolução | qualidade e melhoria |
| Confiabilidade | erros por sessão, falhas de login/salvamento/submissão e disponibilidade | operação do produto |

Cada cartão deve mostrar período, data de atualização, numerador e denominador quando houver taxa. Moderador vê apenas seu escopo; administrador vê a coorte e a operação autorizadas. O conjunto foi aprovado em D-093/D-095/D-098.

### 3.3 Regras operacionais comuns

- Fuso: `America/Sao_Paulo`, com fechamento diário às 23h59min59s;
- Elegibilidade: conta ativa com trilha/módulo atribuído no período; convite não ativado entra somente no KPI de ativação;
- Exclusões: atribuição futura, desativação anterior ao período e afastamento/acomodação formalmente registrados, sempre com quantidade e motivo visíveis;
- Dado faltante: exibir `DADO_INCOMPLETO`, nunca converter para zero;
- Denominador zero: exibir `NÃO_APLICÁVEL`, nunca `0%` ou `100%`;
- Atualização: individual em até 60 segundos; cartões educacionais administrativos em até 15 minutos; saúde e alertas em até 5 minutos;
- Escopo: moderador agrega somente atribuições próprias; administrador agrega somente a coorte autorizada;
- Versão: mudança de fórmula cria nova versão e preserva o cálculo histórico anterior.

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
- PDF ou material copiado das obras detectado na plataforma;
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
9. Não inferir competência prática, habilidade psicomotora ou autonomia a partir de qualquer métrica digital;
10. Não atribuir causalidade clínica sem desenho adequado.

## 7. Dados que precisam existir para calcular as métricas

Esta lista respeita a política mínima aprovada por D-077/B-05. A plataforma não deve acrescentar campos de perfil ou segmentação individual apenas para produzir métricas.

- Resultados do diagnóstico e das avaliações (item, resposta, horário, tentativa, versão da regra);
- Progresso e conclusões de unidades/módulos;
- Eventos de remediação e retenção;
- Metadados de conteúdo (versão, validade, revisores, data de corte);
- Eventos de auditoria (aprovações, alterações, retiradas, contestações);
- Quantidade agregada de participantes elegíveis por KPI e exclusões, sem novos campos individuais na plataforma.
- Conforme D-094 aprovada: tipo, prioridade, estado, datas e responsável dos relatos de produto, sem gravação de sessão ou captura automática de conteúdo sensível.
- Eventos operacionais mínimos de login, salvamento, submissão e erro, sem senha, token ou resposta de avaliação.

## 8. Metas que dependem de baseline (não definidas)

- Domínio tardio absoluto (padrão por standard setting);
- Retenção relativa;
- Domínio na 1ª tentativa;
- Tempo até domínio;
- Custo por concluinte;
- Satisfação percebida.
