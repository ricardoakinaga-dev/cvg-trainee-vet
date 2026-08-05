# 0090 — Discovery Validation

**Projeto:** Sistema CVG de Treinamento Veterinário  
**Data da revisão:** 2026-07-29  
**Revisão da decisão:** 2026-08-05  
**Resultado anterior:** `REPROVADO — NÃO AVANÇAR PARA PRD`  
**Decisão gerencial histórica:** o patrocinador autorizou a elaboração de um rascunho de PRD em 2026-08-05, sem eliminar B-01 a B-07
**Resultado canônico atual:** `REPROVADO — EM CORREÇÃO; PRD FORMAL NÃO AUTORIZADO`

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
- [x] Áreas clínicas do piloto confirmadas pelo patrocinador — núcleo + Emergência + Internação (B-06);
- [ ] Coorte piloto delimitada.

### Usuários

- [x] Usuário primário definido;
- [x] Usuários secundários propostos;
- [x] Impactados indiretos mapeados;
- [ ] Quantidade e perfis levantados;
- [ ] Usuários entrevistados;
- [x] Decisor do MVP nomeado — MV. Ricardo Akinaga acumula as responsabilidades por D-076; B-03 fechado.

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
- [x] Uso interno das fontes definido por D-075;
- [x] Responsável do MVP definido por D-076;
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
| B-03 | responsável pelo MVP | responsabilidade concentrada e registrada | aplicar D-076; segundo MV somente antes da publicação de cada módulo clínico | MV. Ricardo Akinaga | FECHADO PARA O MVP INTERNO |
| B-04 | uso das fontes no MVP interno | risco controlado | aplicar D-075: consulta manual, conteúdo original, PDFs fora da plataforma/Git e referência simples por módulo | patrocinador | FECHADO PARA O MVP INTERNO |
| B-05 | política mínima interna de dados | limitar coleta e acesso | aplicar o Anexo 0011 | MV. Ricardo Akinaga | FECHADO POR D-077 — dados do treinamento permitidos; prontuários, tutores, gravações e casos reais identificáveis proibidos |
| B-06 | áreas clínicas do piloto | escopo clínico | decisão registrada: núcleo + Emergência + Internação | coordenação clínica | FECHADO COMO INSUMO |
| B-07 | baseline ausente | metas não calibradas | diagnóstico e coleta inicial | PENDENTE | PENDENTE |

## Decisão

Segundo o Discovery Engine canônico, a ausência de qualquer item obrigatório reprova o gate. A autorização gerencial de 2026-08-05 permitiu apenas elaborar um rascunho controlado do PRD e preservar decisões do patrocinador como insumos; ela não substitui a aprovação canônica nem converte pendências em waiver. Pela Alternativa 1 aprovada, o gate permanece reprovado até todos os itens obrigatórios serem concluídos e revalidados.

```text
STATUS: REPROVADO — EM CORREÇÃO (RECLASSIFICAÇÃO CANÔNICA, 2026-08-05)
AÇÃO: FECHAR ITENS OBRIGATÓRIOS E REEXECUTAR 0090_DISCOVERY_VALIDATION
PRD FORMAL: BLOQUEADO; ARTEFATOS EXISTENTES SÃO RASCUNHO CONTROLADO
SPEC: PROIBIDA
BUILD: PROIBIDO
AUDIT: NÃO APLICÁVEL
```

Enquanto o gate estiver reprovado, são permitidas correção documental e preparação de conteúdo original em rascunho, sem publicar o programa. **Por D-077, entrevistas, inventário e baseline podem tratar apenas os dados mínimos do treinamento; gravações, prontuários, dados de tutores e casos reais identificáveis continuam proibidos.** PRD formal, SPEC, BUILD, arquitetura, código e publicação continuam sujeitos aos gates aplicáveis.

Por D-076, MV. Ricardo Akinaga é o responsável efetivo pelo MVP e pode decidir e aprovar os documentos sobre commits identificados.

## Compromissos históricos preservados como plano de correção (2026-08-05)

| ID | Condição | Compromisso | Prazo-alvo |
|---|---|---|---|
| B-01 | fluxo atual desconhecido | mapear fluxo e práticas isoladas via entrevistas | antes da nova submissão Discovery |
| B-02 | público não dimensionado | inventário de usuários e definição da coorte piloto | antes da nova submissão Discovery |
| B-03 | responsável do MVP | Ricardo nomeado por D-076; segundo MV será identificado por módulo antes da publicação | concluído |
| B-04 | governança de fontes recalibrada por D-075 | fechado para o MVP interno; D-033 permanece separada e não bloqueia a autoria manual | concluído |
| B-05 | fechado por D-077 | aplicar a política mínima interna; nenhuma ampliação de dados sem nova decisão | controle contínuo |
| B-06 | áreas clínicas do piloto | decisão confirmada: núcleo + Emergência + Internação | fechado como insumo; revalidar no gate |
| B-07 | baseline ausente | aplicar diagnóstico inicial na coorte definida | antes da nova submissão Discovery |

Regra de efeito: qualquer artefato do PRD cujo conteúdo dependa de um bloqueio não resolvido deverá declarar `PENDENTE` e referenciar o ID do bloqueio, sem inventar a informação.

## Critério para nova submissão canônica

O gate somente poderá ser novamente submetido quando os itens abaixo estiverem satisfeitos e acompanhados de evidência. Não existe aprovação condicional nem waiver nesta alternativa:

1. usuários tiverem sido entrevistados (B-01, B-02);
2. o fluxo atual estiver validado (B-01);
3. a coorte e as áreas piloto estiverem definidas (B-02, B-06);
4. responsável do MVP estiver registrado (B-03 — concluído);
5. direitos e política de fontes estiverem decididos (B-04);
6. política mínima de dados D-077 for respeitada (B-05 fechado);
7. houver baseline mínima (B-07).

## Aprovação humana

| Papel | Nome | Decisão | Data |
|---|---|---|---|
| Responsável pelo MVP interno | MV. Ricardo Akinaga | patrocinador, produto, coordenação clínica/educacional, operação, dados, segurança e aprovação dos gates documentais | 2026-08-05 |
| Revisor de conteúdo clínico | outro MV escolhido por módulo | exigido somente antes da publicação do módulo | POR MÓDULO |

Registro vigente: B-03, B-04 e B-05 estão fechados para o MVP interno por D-076, D-075 e D-077. O gate Discovery continua pendente pelos demais itens.
