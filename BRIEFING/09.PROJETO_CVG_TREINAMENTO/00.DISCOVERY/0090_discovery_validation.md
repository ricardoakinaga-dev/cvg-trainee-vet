# 0090 — Discovery Validation

**Projeto:** Sistema CVG de Treinamento Veterinário  
**Data da revisão:** 2026-07-29  
**Revisão da decisão:** 2026-08-05  
**Resultado anterior:** `REPROVADO — NÃO AVANÇAR PARA PRD`  
**Decisão gerencial histórica:** o patrocinador autorizou a elaboração de um rascunho de PRD em 2026-08-05, sem eliminar B-01 a B-07
**Atualização vigente:** D-078 validou o processo atual diretamente com o responsável por todas as áreas do MVP e fechou B-01
**Resultado canônico atual:** `REPROVADO — EM CORREÇÃO; PRD FORMAL NÃO AUTORIZADO`

## Checklist obrigatório

### Problema

- [x] Problema claramente definido;
- [x] Dimensões de mensuração definidas;
- [ ] Impacto real medido;
- [x] Dor operacional validada com MV. Ricardo Akinaga, responsável por todas as áreas do MVP (D-078).

### Contexto

- [x] Contexto inicial registrado;
- [x] Restrições desta etapa registradas;
- [ ] Ferramentas atuais inventariadas;
- [x] Processo atual descrito e confirmado pelo responsável (D-078);
- [x] Aprendizado informal conforme disponibilidade dos profissionais confirmado como mecanismo atual;
- [ ] Linha de base coletada.

### Fluxo

- [x] Fluxo atual institucional descrito: aprendizagem informal, sem trilha, avaliação ou registro centralizado;
- [x] Responsabilidades atuais confirmadas como não padronizadas;
- [x] Handoffs atuais confirmados como informais e dependentes do profissional disponível;
- [x] Gargalos centrais validados por D-078;
- [ ] Exceções validadas.

### Escopo

- [x] Escopo do problema definido;
- [x] Fora de escopo definido;
- [x] Limites da avaliação teórica definidos;
- [x] Áreas clínicas do piloto confirmadas pelo patrocinador — núcleo + Emergência + Internação (B-06);
- [x] Público/coorte delimitado por D-079: aproximadamente 10 veterinários; todos participam da primeira aplicação.

### Usuários

- [x] Usuário primário definido;
- [x] Usuários secundários propostos;
- [x] Impactados indiretos mapeados;
- [x] Quantidade informada: aproximadamente 10 veterinários; segmentação individual dispensada por D-079;
- [x] Público confirmado pelo responsável do MVP; entrevistas permanecem opcionais;
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
| B-01 | fluxo atual do treinamento | estabelecer ponto de partida | descrição confirmada por Ricardo em D-078 | MV. Ricardo Akinaga | FECHADO — aprendizado informal, sem trilha, avaliação ou registro centralizado |
| B-02 | público e coorte | dimensionar a primeira aplicação | confirmação direta de Ricardo | MV. Ricardo Akinaga | FECHADO POR D-079 — aproximadamente 10 veterinários; todos participam |
| B-03 | responsável pelo MVP | responsabilidade concentrada e registrada | aplicar D-076; segundo MV somente antes da publicação de cada módulo clínico | MV. Ricardo Akinaga | FECHADO PARA O MVP INTERNO |
| B-04 | uso das fontes no MVP interno | risco controlado | aplicar D-075: consulta manual, conteúdo original, PDFs fora da plataforma/Git e referência simples por módulo | patrocinador | FECHADO PARA O MVP INTERNO |
| B-05 | política mínima interna de dados | limitar coleta e acesso | aplicar o Anexo 0011 | MV. Ricardo Akinaga | FECHADO POR D-077 — dados do treinamento permitidos; prontuários, tutores, gravações e casos reais identificáveis proibidos |
| B-06 | áreas clínicas do piloto | escopo clínico | decisão registrada: núcleo + Emergência + Internação | coordenação clínica | FECHADO COMO INSUMO |
| B-07 | baseline ausente | metas não calibradas | blueprint, produção, revisão e aplicação do diagnóstico | PENDENTE — blueprint de trabalho criado no Anexo 0012; itens e aplicação ainda pendentes | PENDENTE |

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

Enquanto o gate estiver reprovado, são permitidas correção documental e preparação de conteúdo original em rascunho, sem publicar o programa. **Por D-077, o diagnóstico pode tratar apenas os dados mínimos do treinamento; gravações, prontuários, dados de tutores e casos reais identificáveis continuam proibidos.** PRD formal, SPEC, BUILD, arquitetura, código e publicação continuam sujeitos aos gates aplicáveis.

Por D-076, MV. Ricardo Akinaga é o responsável efetivo pelo MVP e pode decidir e aprovar os documentos sobre commits identificados.

## Compromissos históricos preservados como plano de correção (2026-08-05)

| ID | Condição | Compromisso | Prazo-alvo |
|---|---|---|---|
| B-01 | fluxo atual validado por D-078 | manter a descrição como ponto de partida; detalhes informais são opcionais | concluído |
| B-02 | público/coorte confirmado por D-079 | aproximadamente 10 veterinários; todos participam; sem inventário nominal ou segmentação obrigatória | concluído |
| B-03 | responsável do MVP | Ricardo nomeado por D-076; segundo MV será identificado por módulo antes da publicação | concluído |
| B-04 | governança de fontes recalibrada por D-075 | fechado para o MVP interno; D-033 permanece separada e não bloqueia a autoria manual | concluído |
| B-05 | fechado por D-077 | aplicar a política mínima interna; nenhuma ampliação de dados sem nova decisão | controle contínuo |
| B-06 | áreas clínicas do piloto | decisão confirmada: núcleo + Emergência + Internação | fechado como insumo; revalidar no gate |
| B-07 | baseline ausente | validar, produzir e aplicar diagnóstico de 120 itens em três sessões | antes da nova submissão Discovery |

Regra de efeito: qualquer artefato do PRD cujo conteúdo dependa de um bloqueio não resolvido deverá declarar `PENDENTE` e referenciar o ID do bloqueio, sem inventar a informação.

## Critério para nova submissão canônica

O gate somente poderá ser novamente submetido quando os itens abaixo estiverem satisfeitos e acompanhados de evidência. Não existe aprovação condicional nem waiver nesta alternativa:

1. o fluxo atual validado em D-078 for preservado (B-01 fechado);
2. o público/coorte de aproximadamente 10 veterinários for preservado (B-02 fechado);
3. as áreas piloto continuarem definidas (B-06);
4. responsável do MVP estiver registrado (B-03 — concluído);
5. direitos e política de fontes estiverem decididos (B-04);
6. política mínima de dados D-077 for respeitada (B-05 fechado);
7. houver baseline mínima (B-07).

O Anexo 0012 registra somente o blueprint de trabalho. Ele não substitui a validação clínica, a produção dos itens, a aplicação à coorte ou a evidência de baseline exigidas para fechar B-07.

## Aprovação humana

| Papel | Nome | Decisão | Data |
|---|---|---|---|
| Responsável pelo MVP interno | MV. Ricardo Akinaga | patrocinador, produto, coordenação clínica/educacional, operação, dados, segurança e aprovação dos gates documentais | 2026-08-05 |
| Revisor de conteúdo clínico | outro MV escolhido por módulo | exigido somente antes da publicação do módulo | POR MÓDULO |

Registro vigente: B-01, B-02, B-03, B-04 e B-05 estão fechados por D-078, D-079, D-076, D-075 e D-077. O gate Discovery continua pendente pelos demais itens.
