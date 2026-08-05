# 0090 — Discovery Validation

**Projeto:** Sistema CVG de Treinamento Veterinário  
**Data da revisão:** 2026-07-29  
**Revisão da decisão:** 2026-08-05  
**Resultado anterior:** `REPROVADO — NÃO AVANÇAR PARA PRD`  
**Resultado atual:** `APROVADO COM CONDIÇÕES — AVANÇAR PARA PRD`

## Checklist obrigatório

### Problema

- [x] Problema claramente definido;
- [x] Dimensões de mensuração definidas;
- [ ] Impacto real medido;
- [ ] Dor validada com usuários.

### Contexto

- [x] Contexto inicial registrado;
- [x] Restrições desta etapa registradas;
- [ ] Ferramentas atuais inventariadas;
- [ ] Processo atual observado;
- [ ] Workarounds confirmados;
- [ ] Linha de base coletada.

### Fluxo

- [ ] Fluxo atual completo;
- [ ] Responsabilidades atuais claras;
- [ ] Handoffs atuais confirmados;
- [ ] Gargalos validados;
- [ ] Exceções validadas.

### Escopo

- [x] Escopo do problema definido;
- [x] Fora de escopo definido;
- [x] Limites da avaliação teórica definidos;
- [ ] Áreas clínicas do piloto aprovadas;
- [ ] Coorte piloto delimitada.

### Usuários

- [x] Usuário primário definido;
- [x] Usuários secundários propostos;
- [x] Impactados indiretos mapeados;
- [ ] Quantidade e perfis levantados;
- [ ] Usuários entrevistados;
- [ ] Decisores nomeados.

### Hipótese de valor

- [x] Hipótese explícita;
- [x] Indicadores candidatos definidos;
- [x] Metas provisórias registradas;
- [ ] Metas calibradas com baseline;
- [ ] Valor financeiro ou operacional estimado.

### Fontes e governança

- [x] Tratado brasileiro identificado;
- [x] Ettinger 9ª edição identificado;
- [x] Regra preliminar de atualização definida;
- [ ] Licença de uso do tratado verificada;
- [ ] Licença de uso do Ettinger verificada;
- [ ] Comitê científico nomeado;
- [ ] Protocolos internos inventariados.

### Riscos

- [x] Riscos clínicos;
- [x] Riscos pedagógicos;
- [x] Riscos operacionais;
- [x] Riscos de adoção;
- [x] Riscos legais e de privacidade;
- [ ] Owners e prazos de mitigação aprovados.

## Bloqueios

| ID | Bloqueio | Impacto | Ação necessária | Responsável | Prazo |
|---|---|---|---|---|---|
| B-01 | fluxo atual desconhecido | impede validar a dor | entrevistas e mapa | PENDENTE | PENDENTE |
| B-02 | público não dimensionado | impede recorte do piloto | inventário de usuários | PENDENTE | PENDENTE |
| B-03 | responsáveis não nomeados | impede governança | indicar owners e comitê | direção CVG | PENDENTE |
| B-04 | direitos de uso não verificados | risco legal | análise de licença | jurídico/gestão | PENDENTE |
| B-05 | política de dados ausente | risco LGPD | definir finalidade e acesso | PENDENTE | PENDENTE |
| B-06 | prioridades clínicas ausentes | escopo aberto | selecionar áreas do piloto | coordenação clínica | PENDENTE |
| B-07 | baseline ausente | metas não calibradas | diagnóstico e coleta inicial | PENDENTE | PENDENTE |

## Decisão

Segundo o Discovery Engine canônico, a ausência de qualquer item crítico impede o PRD. Em 2026-08-05, o patrocinador executivo **aprovou o avanço ao PRD sob condições explícitas**, registradas abaixo. A aprovação não elimina os bloqueios; converte-os em compromissos com prazo de resolução durante o PRD e o piloto, e o PRD deverá marcar como `PENDENTE` tudo o que depender deles.

```text
STATUS: APROVADO COM CONDIÇÕES (2026-08-05)
AÇÃO: INICIAR PRD, MANTENDO OS BLOQUEIOS B-01 A B-07 COMO COMPROMISSOS
PRD: LIBERADO COM CONDIÇÕES
SPEC: PROIBIDA ATÉ GATE 0090 PRD APROVADO
BUILD: PROIBIDO
AUDIT: NÃO APLICÁVEL
```

## Condições assumidas pelo patrocinador (2026-08-05)

| ID | Condição | Compromisso | Prazo-alvo |
|---|---|---|---|
| B-01 | fluxo atual desconhecido | mapear fluxo e práticas isoladas via entrevistas durante o PRD | antes do fim do PRD |
| B-02 | público não dimensionado | inventário de usuários e definição da coorte piloto | antes do piloto |
| B-03 | responsáveis não nomeados | nomear PO, coordenação educacional, comitê científico e responsável LGPD | antes do gate PRD |
| B-04 | direitos de uso não verificados | análise jurídica das três obras; **conteúdo clínico derivado bloqueado até a resolução** | antes da produção de conteúdo |
| B-05 | política de dados ausente | aprovar finalidade, acesso e retenção (LGPD) | antes do gate PRD |
| B-06 | prioridades clínicas ausentes | selecionar áreas do piloto (proposta: emergência e internação) | no gate PRD |
| B-07 | baseline ausente | aplicar diagnóstico inicial na coorte piloto | início do piloto |

Regra de efeito: qualquer artefato do PRD cujo conteúdo dependa de um bloqueio não resolvido deverá declarar `PENDENTE` e referenciar o ID do bloqueio, sem inventar a informação.

## Critério para nova submissão

Este gate foi aprovado com condições em 2026-08-05. Os itens abaixo são as condições que deverão estar satisfeitas **antes do gate PRD (0090_prd_validation.md)**, sob pena de reprovação do PRD:

1. usuários tiverem sido entrevistados (B-01, B-02);
2. o fluxo atual estiver validado (B-01);
3. a coorte e as áreas piloto estiverem definidas (B-02, B-06);
4. responsáveis estiverem nomeados (B-03);
5. direitos e política de fontes estiverem decididos (B-04);
6. política de dados estiver aprovada (B-05);
7. houver baseline mínima (B-07).

## Aprovação humana

| Papel | Nome | Decisão | Data |
|---|---|---|---|
| Patrocinador executivo | MV. Ricardo Akinaga — CEO | APROVADO COM CONDIÇÕES | 2026-08-05 |
| Product owner | PENDENTE | PENDENTE | PENDENTE |
| Coordenação clínica/RT | PENDENTE | PENDENTE | PENDENTE |
| Coordenação educacional | PENDENTE | PENDENTE | PENDENTE |
| LGPD/segurança | PENDENTE | PENDENTE | PENDENTE |

Registro da decisão do patrocinador: aprovação condicionada à execução dos compromissos B-01 a B-07 acima; o PRD deverá refletir as pendências sem inventar informações, e nenhuma decisão de conteúdo clínico será executada antes da resolução de B-04 e da nomeação de responsáveis (B-03).
