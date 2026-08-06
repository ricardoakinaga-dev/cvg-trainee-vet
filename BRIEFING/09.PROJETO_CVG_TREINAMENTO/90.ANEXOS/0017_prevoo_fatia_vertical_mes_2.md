# Anexo 0017 — Pré-voo da fatia vertical do Mês 2

**Escopo:** Anexos 0014, 0015 e 0016
**Versão verificada:** 0.1.0
**Data:** 2026-08-06
**Estado:** `APROVADO_PARA_ENSAIO_CONTROLADO` em 2026-08-06 — não publicado

## 1. Resultado executivo

A fatia vertical atingiu o estado `GREEN ESTRUTURAL`: os três artefatos existem, as quatro sessões totalizam 360 minutos planejados, os dois casos são fictícios, existem 31 itens objetivos/estruturados e exatamente duas respostas abertas principais, e todos os IDs avaliáveis aparecem no guia do facilitador.

A aprovação clínica de MV. Ricardo Akinaga, registrada em 2026-08-06, permite o ensaio controlado e cronometrado. Ela não equivale a publicação geral; clareza, tempo real e capacidade de correção continuam sendo hipóteses do ensaio.

## 2. Testes de aceite

| ID | Resultado | Evidência | Pendência residual |
|---|---|---|---|
| FV-M02-01 | PASS estrutural | quatro cabeçalhos `M02-S1` a `M02-S4`; matriz 60+120+120+60 | medir duração real |
| FV-M02-02 | PASS clínico/documental | Caso A canino e Caso B felino fictícios; plausibilidade aprovada por Ricardo para ensaio | observar clareza e realismo percebido em T2 |
| FV-M02-03 | PASS | quiz, seleção, ordenação, interpretação, reflexão e duas RA principais | observar carga cognitiva |
| FV-M02-04 | PASS estrutural | 31 IDs únicos no participante e os mesmos 31 no facilitador; duas rubricas analíticas | testar respostas limítrofes |
| FV-M02-05 | PASS | itens críticos, erros críticos e remediação por objetivo definidos; aprovação clínica registrada | observar ocorrências no ensaio |
| FV-M02-06 | PASS | capítulos internos mapeados nas três obras + AAHA 2024 + RECOVER 2024 + WSAVA 2022 + AVHTM/TRACS; interpretação aprovada para ensaio | atualizar se surgir nova divergência |
| FV-M02-07 | PASS | nenhum PDF rastreado; conteúdo autoral; sem reprodução de figura/tabela | manter checagem antes da publicação |
| FV-M02-08 | PASS | nenhum código interno F-01/F-02/F-03 no artefato do participante; gabaritos em arquivo separado | validar projeção na futura plataforma |
| FV-M02-09 | PASS de desenho | duas RA, rubricas 0–2 por dimensão, SLA de cinco dias úteis | medir minutos de correção por resposta |
| FV-M02-10 | PASS | decisão, data, versão e commits registrados como `APROVADO_PARA_ENSAIO_CONTROLADO` | impedir ampliação de escopo |

## 3. Comandos e resultados estruturais

```text
sessões no participante: 4
respostas abertas principais: 2
IDs avaliáveis únicos no participante: 31
IDs avaliáveis únicos no facilitador: 31
diferença entre conjuntos de IDs: 0
códigos internos restritos no participante: 0
PDFs rastreados pelo Git: 0
padrões de segredo encontrados: 0
git diff --check: PASS
```

## 4. Avaliação de carga

### Participante

| Sessão | Leitura/ativação | Pesquisa/casos | Respostas/revisão | Total planejado |
|---|---:|---:|---:|---:|
| S1 | 20 min | 30 min | 10 min | 60 min |
| S2 | 25 min | 25 min | 70 min | 120 min |
| S3 | 15 min | 60 min | 45 min | 120 min |
| S4 | 15 min | 20 min | 25 min | 60 min |
| **Total** | **75 min** | **135 min** | **150 min** | **360 min** |

O tempo inclui pesquisa, mas deve ser testado com cronômetro. O participante poderá pausar S2 e S3 na janela de sete dias.

### Correção de Ricardo

Hipótese para dez participantes:

- 20 respostas abertas por módulo;
- 6–10 minutos por resposta usando rubrica;
- 120–200 minutos de correção;
- mais 20–40 minutos para contestações, erros críticos e consolidação;
- carga total estimada: **2 h 20 min a 4 h por módulo**, distribuída no SLA de cinco dias úteis.

Essa é uma hipótese de capacidade, não medição. O primeiro ensaio deve registrar tempo por RA01/RA02, incidência de erro crítico e necessidade de reescrita.

## 5. Casos sintéticos de correção a executar

Para cada resposta aberta, Ricardo ou um executor autorizado deve testar quatro respostas artificiais:

1. completa e segura;
2. parcialmente correta, mas sem metas;
3. bem escrita, porém com erro crítico;
4. vazia, fora de escopo ou com fonte divergente.

O resultado esperado é que a rubrica diferencie os quatro padrões e que um erro crítico nunca seja compensado por estilo ou quantidade de texto.

## 5.1 Alertas encontrados no mapeamento das obras

- o capítulo 131 do Ettinger 9ª edição reproduz RECOVER 2012; os itens de RCP foram subordinados a RECOVER 2024;
- o Tratado e o Fossum permanecem úteis para fundamentos e procedimentos, mas doses, volumes fixos, coloides sintéticos, antimicrobianos e transfusão exigem camada atual;
- `ABCDE` vale para avaliação inicial com sinais de vida; suspeita de parada muda imediatamente para BLS/RECOVER;
- lactato, pressão arterial e hematócrito foram usados somente em conjunto e em tendência;
- o protótipo evita doses medicamentosas e impede fluidoterapia automática sem metas/reavaliação.

## 5.2 Revisão independente e correções

A revisão independente somente leitura encontrou zero achados críticos, dois altos e quatro médios. Todos foram tratados antes deste pré-voo:

| Severidade | Achado | Correção |
|---|---|---|
| alta | tentativa de confirmar pulso poderia atrasar BLS | reconhecimento passou a usar irresponsividade + apneia, sem palpação de pulso, conforme RECOVER 2024 |
| alta | faltava a atividade executável dos 15 minutos de S4 | adicionada passagem estruturada de seis campos + seleção de remediação |
| média | RA01 cobrava comunicação não solicitada | comunicação ao tutor foi adicionada explicitamente ao enunciado |
| média | Caso A exercitava apenas A–B–C | adicionadas avaliação neurológica breve (`D`) e exposição com prevenção de hipotermia (`E`) |
| média | definição de desidratação excessivamente compartimental | redação alinhada à definição ampla da AAHA 2024 |
| média | fontes amplas demais para auditoria rápida | acrescentados capítulos e localizadores no PDF para F-01, F-02 e F-03 |

A revisão também confirmou: correspondência dos gabaritos, dois casos fictícios, duas RA principais, separação participante/facilitador, aplicabilidade das rubricas no SLA e ausência de reprodução protegida identificável.

Uma segunda passagem somente leitura, executada depois das correções, retornou `PASS`: os seis achados foram resolvidos e nenhuma nova ocorrência crítica ou alta foi identificada.

## 6. Revisões pendentes antes de aplicação

- [x] Ricardo confirmou clinicamente a v0.1.0, incluindo os Casos A e B, para ensaio controlado;
- [x] Ricardo aprovou as alternativas, gabaritos e rubricas da v0.1.0 para ensaio;
- [x] um executor documental aplicou as rubricas a quatro respostas sintéticas por RA, com resultado `PASS_SINTETICO_COM_LIMITACOES` no Anexo 0019;
- [ ] Ricardo confirmou a usabilidade das rubricas durante T1/T2;
- [ ] um ensaio cronometrado confirmou ou ajustou os 360 minutos;
- [ ] foi medido o tempo de correção e verificado o SLA de cinco dias úteis;
- [x] a versão aprovada, a data e os commits foram registrados no Anexo 0016;
- [x] não existe divergência de fonte conhecida e não resolvida na versão aprovada.

## 7. Decisão do pré-voo

**Resultado atual:** `APROVADO_PARA_ENSAIO_CONTROLADO`, com T2 bloqueado até o aviso de privacidade D-077 estar completo.

O protótipo pode ser usado apenas no ensaio definido no Anexo 0018. A próxima transição será decidida depois dos dados de tempo, clareza, correção e segurança: manter v0.1.0, corrigir para v0.1.1 ou bloquear o módulo.
