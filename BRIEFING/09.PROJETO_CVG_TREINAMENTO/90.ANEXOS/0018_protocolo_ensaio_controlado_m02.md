# Anexo 0018 — Protocolo do ensaio controlado e cronometrado da M02

**Módulo:** M02 — Emergência e Terapia Intensiva
**Versão em teste:** 0.1.0
**Autorização:** D-088, MV. Ricardo Akinaga, 2026-08-06
**Estado:** `AUTHORIZED_BUT_BLOCKED_FOR_PRIVACY_NOTICE`
**Natureza:** ensaio educacional formativo; não é aplicação somativa nem estudo clínico

## 1. Objetivo

Verificar, em ambiente controlado, se a M02:

1. cabe em 360 minutos sem induzir pressa insegura;
2. apresenta instruções, casos, alternativas e feedback compreensíveis;
3. permite pesquisar e responder sem expor gabaritos ou metadados internos;
4. produz correção consistente nas duas respostas abertas;
5. permite que Ricardo cumpra o SLA de cinco dias úteis;
6. não coleta dados clínicos reais ou pessoais além do mínimo autorizado.

O ensaio não mede competência prática, autonomia, desempenho trabalhista ou eficácia clínica em pacientes.

## 2. Fases e participantes

| Fase | Participantes | Finalidade | Estado |
|---|---:|---|---|
| T0 — pré-teste sintético | nenhum participante real | testar rubricas com oito respostas artificiais | REEXECUTADO — `PASS_SINTETICO_COM_LIMITACOES` no Anexo 0019 |
| T1 — ensaio de mesa | Ricardo ou executor autorizado | percorrer links, instruções, gabaritos e formulário de coleta | CONCLUÍDO NO ESCOPO DOCUMENTAL |
| T2 — ensaio controlado | 2 a 3 veterinários autorizados | medir tempo, clareza, pesquisa e correção antes da coorte completa | AUTORIZADO; BLOQUEADO ATÉ AVISO DE PRIVACIDADE COMPLETO |
| T3 — decisão | Ricardo | manter v0.1.0, corrigir para v0.1.1 ou bloquear | PENDENTE |

Usar dois a três participantes reduz exposição a um protótipo ainda não calibrado. A coorte aproximada de dez veterinários não entra automaticamente neste ensaio.

## 3. Condições de participação

Antes do início, cada participante deve receber informação clara de que:

- os casos são fictícios e o ensaio é formativo;
- o resultado não será usado para RH, punição, ranking ou autorização de procedimento;
- pode pausar S2 e S3 e deve registrar o tempo de pausa;
- não deve inserir caso, prontuário, nome de tutor, imagem, gravação ou dado real;
- pode relatar ambiguidade ou insegurança sem prejuízo;
- qualquer item inseguro será retirado do ensaio.

### 3.1 Aviso de privacidade obrigatório antes de T2

T2 permanece bloqueado até Ricardo disponibilizar o aviso simples exigido por D-077. O aviso deve informar, antes da primeira coleta real:

| Campo do aviso | Conteúdo mínimo |
|---|---|
| controlador/responsável | CVG e MV. Ricardo Akinaga como responsável operacional pelo treinamento |
| dados | login/identificador, respostas, versões, progresso, horários, pausas, escores, feedback e registros mínimos do ensaio |
| finalidade | aplicar e calibrar a M02, fornecer feedback, medir tempo/clareza e auditar correção |
| acesso | participante aos próprios dados; Ricardo ao necessário; suporte delegado somente se indispensável e registrado |
| retenção | durante o vínculo + dois anos; depois eliminar ou anonimizar, ressalvadas obrigações aplicáveis |
| direitos/canal | acesso, correção, contestação e eliminação/anonimização quando aplicável, pelo canal indicado por Ricardo |
| base legal | preencher com a base legal aplicável antes da coleta; este protocolo não a presume |

Checklist de liberação:

- [ ] base legal preenchida;
- [ ] canal de direitos/contato preenchido;
- [ ] texto entregue aos participantes antes do primeiro registro;
- [ ] versão e data do aviso registradas;
- [ ] confirmação de ciência registrada sem ampliar os dados coletados.

## 4. Dados mínimos permitidos

| Campo | Formato | Finalidade |
|---|---|---|
| `trial_participant_id` | código T01–T03 | separar resultados sem nome no relatório de teste |
| dispositivo | desktop/notebook/tablet/celular | identificar restrição de uso |
| conexão | estável/instável/interrompida | interpretar atrasos técnicos |
| início/fim por sessão | data e horário | calcular tempo bruto |
| pausas pessoais | minutos | excluir interrupções pessoais do tempo ativo |
| pausas técnicas/externas | minutos | excluir falhas alheias ao conteúdo do tempo ativo |
| respostas e versões | texto/seleção | testar correção e retomada |
| dificuldade percebida | 1 a 5 | avaliar carga percebida |
| clareza | 1 a 5 | localizar instrução ambígua |
| problema observado | categoria + descrição curta | corrigir conteúdo ou fluxo |
| tempo de correção RA01/RA02 | minutos | testar capacidade e SLA |
| `submitted_at` por RA | data/hora | marcar início do SLA |
| `available_to_reviewer_at` por RA | data/hora | separar atraso de sistema de fila de correção |
| `returned_at` por RA | data/hora | marcar devolução do feedback |
| dias úteis decorridos | número | auditar o SLA de cinco dias úteis |

Não coletar setor, turno, histórico disciplinar, prontuário, paciente, tutor, áudio, vídeo, tela gravada ou conversa clínica real.

Se for necessário relacionar `T01–T03` ao login para devolutiva, o mapa de correspondência fica sob acesso exclusivo de Ricardo e não entra no relatório. Retenção e eliminação seguem D-077: durante o vínculo + dois anos, com eliminação ou anonimização posterior, ressalvadas obrigações aplicáveis.

## 5. Execução cronometrada

### Antes de cada sessão

1. confirmar o código do participante;
2. registrar dispositivo e condição da conexão;
3. iniciar o cronômetro somente quando a instrução estiver visível;
4. interromper a contagem ativa em pausas pessoais ou falhas técnicas/externas, registradas separadamente;
5. não ajudar na resposta; registrar a dúvida com o ID do item.

### Depois de cada sessão

| Campo | S1 | S2 | S3 | S4 |
|---|---:|---:|---:|---:|
| tempo bruto (min) |  |  |  |  |
| pausas pessoais (min) |  |  |  |  |
| pausas técnicas/externas (min) |  |  |  |  |
| tempo ativo (min) |  |  |  |  |
| clareza 1–5 |  |  |  |  |
| dificuldade 1–5 |  |  |  |  |
| itens com dúvida |  |  |  |  |
| falha técnica |  |  |  |  |

Fórmulas:

```text
tempo_ativo = tempo_bruto - pausas_pessoais - pausas_tecnicas_externas
desvio_percentual = (tempo_ativo - tempo_planejado) / tempo_planejado × 100
```

## 6. Correção cronometrada

Para RA01 e RA02:

1. iniciar o cronômetro ao abrir a resposta completa;
2. aplicar as cinco dimensões da rubrica sem consultar identificação do participante;
3. verificar separadamente a presença de erro crítico;
4. redigir feedback acionável;
5. parar o cronômetro ao salvar a decisão;
6. registrar se foi necessário consultar fonte, reescrever feedback ou escalonar ambiguidade.

| ID | RA | submetida | disponível | devolvida | dias úteis | correção min | dimensões/total | erro crítico |
|---|---|---|---|---|---:|---:|---|---:|
| T01 | RA01 |  |  |  |  |  |  |  |
| T01 | RA02 |  |  |  |  |  |  |  |
| T02 | RA01 |  |  |  |  |  |  |  |
| T02 | RA02 |  |  |  |  |  |  |  |
| T03 | RA01 |  |  |  |  |  |  |  |
| T03 | RA02 |  |  |  |  |  |  |  |

## 7. Critérios de sucesso

| Dimensão | Critério inicial |
|---|---|
| carga total | mediana do tempo ativo entre 306 e 414 minutos, equivalente a 360 min ±15% |
| sessão individual | nenhuma mediana acima de 120% do planejado sem justificativa pedagógica |
| avaliabilidade objetiva | 100% dos 28 itens de alternativa corrigidos deterministicamente |
| avaliabilidade estruturada | os 3 itens estruturados usam equivalências declaradas; toda resposta limítrofe é sinalizada para revisão, sem aceitação insegura |
| respostas abertas | rubrica aplicável sem mudar critérios durante a correção |
| tempo de correção | preferencialmente até 10 min por RA; projeção total dentro de 2 h 20 min a 4 h para dez participantes |
| SLA | diferença auditável entre `submitted_at` e `returned_at` de até cinco dias úteis; atraso de disponibilidade registrado separadamente |
| clareza | mediana ≥4/5 por sessão e nenhum item crítico com ambiguidade recorrente |
| segurança | nenhum gabarito que aceite conduta insegura; erro crítico sempre aciona remediação |
| privacidade | zero dado clínico real, gravação ou identificador proibido |

Os limites são critérios de calibração do protótipo, não metas de desempenho dos veterinários.

## 8. Critérios de interrupção

Interromper imediatamente o item ou o ensaio se ocorrer:

1. gabarito potencialmente inseguro ou divergência clínica não resolvida;
2. exposição de gabarito, fonte restrita ou PDF;
3. inserção de dado real de paciente/tutor;
4. falha de correção que classifique conduta insegura como correta;
5. instrução que induza atraso em decisão tempo-dependente;
6. duas ocorrências da mesma ambiguidade crítica;
7. impossibilidade de salvar/retomar sem perda de resposta;
8. qualquer solicitação de interrupção pelo participante ou por Ricardo.

A interrupção de um item não exige descartar todos os dados válidos do ensaio. O item afetado fica bloqueado, recebe versão corretiva e deve ser testado novamente.

## 9. Relatório de saída

O relatório do ensaio deve conter apenas:

- quantidade de participantes e sessões concluídas;
- mediana e intervalo do tempo ativo por sessão;
- tempo de correção por RA, sem nome;
- itens com dúvida, ambiguidade ou falha;
- incidência de erro crítico por objetivo, sem ranking;
- falhas técnicas e de retomada;
- decisão de Ricardo e lista de ajustes.

Não inserir respostas integrais ou nomes no relatório executivo.

## 10. Decisão após o ensaio

| Decisão | Quando usar |
|---|---|
| `MANTER_V0.1.0` | todos os critérios essenciais passaram e não há ajuste material |
| `CRIAR_V0.1.1` | há ajustes de clareza, tempo, rubrica ou fluxo sem mudança curricular |
| `BLOQUEAR_M02` | existe risco clínico, de privacidade ou avaliabilidade ainda não resolvido |

Somente uma nova decisão explícita pode autorizar ampliação para a coorte completa ou produção dos demais módulos.

## 11. Resultado T1 — ensaio de mesa documental

**Data:** 2026-08-06
**Executor:** Codex, como executor documental autorizado pela aprovação D-088
**Resultado:** `PASS_DOCUMENTAL_COM_LIMITES`

| Verificação | Resultado |
|---|---|
| links Markdown locais | PASS em 40 arquivos |
| sessões e tempos planejados | PASS — 4 sessões, 360 min |
| IDs participante↔facilitador | PASS — 31/31, sem diferença |
| respostas abertas | PASS — 2 RA principais |
| perfis sintéticos | PASS — 8 perfis no Anexo 0019 |
| fases T0–T3 | PASS — quatro fases definidas |
| metadados restritos no participante | PASS — nenhum código F-01/F-02/F-03 |
| PDFs rastreados | PASS — zero |
| integridade Markdown | PASS — `git diff --check` |

Limites de T1:

- não houve interface ou plataforma para testar salvar/retomar;
- não houve dispositivo móvel real ou falha de conexão simulada;
- não houve participante real nem medição de 360 minutos;
- o tempo de correção de Ricardo continua não medido.

Próxima etapa elegível: completar base legal, canal e versão do aviso da seção 3.1; depois iniciar T2 com dois a três veterinários autorizados.

## 12. Revisão independente do protocolo

A primeira passagem encontrou zero achados críticos, três altos, dois médios e um baixo:

- dois escores T0 não reproduzíveis;
- ausência do aviso de privacidade obrigatório;
- SLA sem timestamps auditáveis;
- variáveis de pausa inconsistentes;
- 28 itens objetivos e três estruturados tratados como igualmente determinísticos;
- pendência clínica residual desatualizada no pré-voo.

Todos foram corrigidos. A segunda passagem retornou `PASS`, sem novo achado crítico ou alto. O parecer confirmou explicitamente que T2 permanece bloqueado até base legal, canal, entrega e versão do aviso D-077 estarem registrados.
