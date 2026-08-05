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
- [ ] Decisores nomeados — modelo segregado aprovado como insumo em D-071; apenas o patrocinador está nomeado, demais titulares/suplentes e aceites pendentes (B-03).

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
| B-03 | governança incompleta | impede aprovações segregadas | nomear titulares/suplentes, registrar aceites e instalar comitês conforme D-071/0006 | direção CVG | PARCIAL — MODELO APROVADO; NOMEAÇÕES PENDENTES |
| B-04 | direitos de uso não verificados | risco legal | análise de licença | jurídico/gestão | PENDENTE |
| B-05 | política de dados sem validação LGPD | risco LGPD | validar finalidade, acesso e retenção | responsável LGPD | PENDENTE |
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

Enquanto o gate estiver reprovado, são permitidas somente correção documental, desenho de instrumentos, levantamentos estritamente agregados e anônimos, nomeações, verificação jurídica, validação LGPD e preparação do checkpoint. **B-05 deve ser validado antes de entrevistas ou inventários identificáveis, gravações, diagnóstico individual, acesso a prontuários/casos reais, indicadores vinculáveis e coleta da baseline B-07.** São proibidos PRD formal, SPEC, BUILD, arquitetura, código e qualquer produção de conteúdo clínico.

## Compromissos históricos preservados como plano de correção (2026-08-05)

| ID | Condição | Compromisso | Prazo-alvo |
|---|---|---|---|
| B-01 | fluxo atual desconhecido | mapear fluxo e práticas isoladas via entrevistas | antes da nova submissão Discovery |
| B-02 | público não dimensionado | inventário de usuários e definição da coorte piloto | antes da nova submissão Discovery |
| B-03 | modelo aprovado, responsáveis não nomeados | nomear titulares e suplentes de PO, responsável clínico/RT, coordenação educacional, comitê científico e LGPD/segurança; registrar aceites/conflitos e instalar comitês conforme D-071/0006 | antes da nova submissão Discovery |
| B-04 | direitos de uso não verificados | análise jurídica das três obras; **conteúdo clínico derivado bloqueado até a resolução** | antes da nova submissão Discovery |
| B-05 | política de dados sem validação formal | validar finalidade, acesso e retenção com responsável LGPD | antes da nova submissão Discovery |
| B-06 | áreas clínicas do piloto | decisão confirmada: núcleo + Emergência + Internação | fechado como insumo; revalidar no gate |
| B-07 | baseline ausente | aplicar diagnóstico inicial na coorte definida | antes da nova submissão Discovery |

Regra de efeito: qualquer artefato do PRD cujo conteúdo dependa de um bloqueio não resolvido deverá declarar `PENDENTE` e referenciar o ID do bloqueio, sem inventar a informação.

## Critério para nova submissão canônica

O gate somente poderá ser novamente submetido quando os itens abaixo estiverem satisfeitos e acompanhados de evidência. Não existe aprovação condicional nem waiver nesta alternativa:

1. usuários tiverem sido entrevistados (B-01, B-02);
2. o fluxo atual estiver validado (B-01);
3. a coorte e as áreas piloto estiverem definidas (B-02, B-06);
4. responsáveis estiverem nomeados (B-03);
5. direitos e política de fontes estiverem decididos (B-04);
6. política de dados estiver aprovada (B-05);
7. após a validação de B-05, houver baseline mínima (B-07).

## Aprovação humana

| Papel | Nome | Decisão | Data |
|---|---|---|---|
| Patrocinador executivo | MV. Ricardo Akinaga — CEO | RECLASSIFICAÇÃO CANÔNICA APROVADA; DECISÕES DE PRODUTO PRESERVADAS COMO INSUMOS | 2026-08-05 |
| Product owner | `VAGO — BLOQUEIA B-03` | modelo/autoridade definidos em D-071; aceite pendente | PENDENTE |
| Coordenação clínica/RT | `VAGO — BLOQUEIA B-03` | modelo/autoridade definidos em D-071; aceite pendente | PENDENTE |
| Coordenação educacional | `VAGO — BLOQUEIA B-03` | modelo/autoridade definidos em D-071; aceite pendente | PENDENTE |
| LGPD/segurança | `VAGO — BLOQUEIA B-03` | modelo/autoridade definidos em D-071; aceite pendente | PENDENTE |

O registro nominal completo, incluindo comitê científico, suplentes, qualificações, impedimentos e ato de instalação, é controlado pelo documento 0006.

Registro vigente: B-01 a B-07 formam o plano de correção; o PRD existente é rascunho não autorizado para SPEC/BUILD, deverá refletir pendências sem inventar informações, e nenhuma decisão de conteúdo clínico será executada antes de B-04 e B-03. Após o fechamento, o gate Discovery deverá ser reexecutado integralmente.
