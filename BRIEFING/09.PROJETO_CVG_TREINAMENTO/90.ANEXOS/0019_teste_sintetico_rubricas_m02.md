# Anexo 0019 — Teste sintético das rubricas RA01 e RA02

**Módulo:** M02 — Emergência e Terapia Intensiva
**Versão das rubricas:** 0.1.0
**Fase:** T0 do Anexo 0018
**Dados reais:** nenhum
**Estado:** `PASS_SINTETICO_COM_LIMITACOES`

## 1. Objetivo e limite

Verificar se as rubricas:

1. distinguem resposta completa, parcial, criticamente insegura e vazia;
2. impedem que texto bem escrito compense erro crítico;
3. geram feedback relacionado ao campo deficiente;
4. podem ser aplicadas sem alterar os critérios durante a correção.

As oito respostas abaixo são artificiais. O teste de mesa foi aplicado por um único executor documental; portanto, não mede concordância entre avaliadores, tempo real de Ricardo ou comportamento de participantes.

## 2. RA01 — plano de Bento

### RA01-SYN-A — completa e segura

> Nos primeiros 15 minutos, trato Bento como paciente em choque circulatório com forte suspeita de hemorragia. Organizo a equipe para avaliar via aérea, ventilação, circulação, estado neurológico e exposição com prevenção de hipotermia. Ofereço oxigênio conforme tolerado, obtenho acessos vasculares, inicio analgesia titulada e monitorização. Prescrevo ressuscitação individualizada em alíquota, não uma taxa fixa, e reavalio em intervalos curtos estado mental, pulsos, mucosas/TPC, pressão, temperatura, padrão respiratório e resposta global. Lactato, hematócrito e proteína total serão interpretados em tendência.
>
> Entre 15 e 60 minutos, a melhora apenas parcial, o líquido abdominal, a distensão progressiva e a queda de hematócrito/proteína mantêm hemorragia ativa como prioridade. Solicito exames dirigidos que não atrasem tratamento, preparo tipagem/compatibilidade e hemocomponentes e aciono precocemente a equipe capaz de controlar a fonte. Não repetirei cristaloide automaticamente. Interrompo ou reduzo se não houver ganho de perfusão, se aumentar o esforço respiratório ou se surgirem outros sinais de dano/sobrecarga; escalono para sangue e controle definitivo diante de hipoperfusão persistente ou deterioração.
>
> Explico ao tutor que Bento permanece instável, que a causa e o prognóstico ainda têm incerteza e que transfusão e procedimento de controle de fonte podem ser necessários em tempo hábil. Fontes: AAHA Fluid Therapy Guidelines 2024 e Ettinger 9ª ed., caps. 119–124, consultados em 2026-08-06.

Pontuação:

| Dimensão | Escore | Evidência |
|---|---:|---|
| prioridade | 2 | choque/hemorragia e `ABCDE` ordenados |
| intervenção | 2 | medidas tituladas e em sequência temporal |
| metas/reavaliação | 2 | desfechos e tendências definidos |
| parada/escalonamento | 2 | pontos de parada, sangue e controle de fonte |
| evidência/comunicação | 2 | fonte/data e comunicação de risco |
| **Total** | **10/10** | sem erro crítico |

Decisão: `DECISAO_SEGURA_NO_CENARIO`.

### RA01-SYN-B — parcial sem metas operacionais

> Bento deve receber atendimento ABCDE, oxigênio, acesso venoso, aquecimento e analgesia. O quadro é compatível com choque hemorrágico. Eu daria fluido com cautela, repetiria o exame e faria hemograma, lactato e ultrassom. Como o abdômen está mais distendido, deixaria sangue preparado e avisaria a cirurgia para possível controle da hemorragia. Explicaria ao tutor que o caso é grave. Consultei AAHA 2024 em 2026-08-06.

Pontuação:

| Dimensão | Escore | Motivo |
|---|---:|---|
| prioridade | 2 | reconhece e ordena a ameaça |
| intervenção | 1 | medidas corretas, mas genéricas |
| metas/reavaliação | 0 | não define frequência, desfecho ou tendência esperada |
| parada/escalonamento | 1 | prepara sangue/controle de fonte sem gatilhos |
| evidência/comunicação | 1 | fonte e comunicação incompletas |
| **Total** | **5/10** | sem erro crítico afirmativo |

Decisão: `FEEDBACK_DIRIGIDO_E_REVISAO`. Feedback: definir quando reavaliar, quais metas observar e quais achados interrompem fluido ou acionam transfusão/controle de fonte.

### RA01-SYN-C — texto elaborado com erro crítico

> Para evitar decisões precipitadas, eu concluiria primeiro radiografias de tórax, abdômen e membros e aguardaria o hemograma completo. Depois administraria cristaloide continuamente até a pressão ficar normal, repetindo o volume sem interrupção mesmo que o abdômen aumentasse, porque a normalização da pressão é o objetivo principal. Somente após corrigir a pressão eu discutiria sangue ou cirurgia. A linguagem com o tutor deve ser otimista para evitar ansiedade. Baseio-me em um protocolo antigo de choque, sem registrar data.

Pontuação:

| Dimensão | Escore |
|---|---:|
| prioridade | 0 |
| intervenção | 0 |
| metas/reavaliação | 0 |
| parada/escalonamento | 0 |
| evidência/comunicação | 0 |
| **Total bruto** | **0/10** |

Erros críticos detectados: atraso de `ABCDE`; fluido automático sem reavaliação; atraso de sangue/controle de fonte; omissão deliberada de risco. Decisão: `REMEDIACAO_OBRIGATORIA`, independentemente da fluência do texto.

### RA01-SYN-D — vazia/fora de escopo

> Eu faria exames e trataria de acordo com os resultados. Não consultei fonte.

Pontuação: 0/10. Decisão: `RESPOSTA_INSUFICIENTE`; solicitar nova submissão orientada pelos sete componentes da atividade.

## 3. RA02 — passagem de Lua

### RA02-SYN-A — completa e segura

> Situação: Lua é uma gata de 4,2 kg admitida com emergência respiratória, respiração de boca aberta, ortopneia e piora ao manuseio. A ameaça imediata foi falha respiratória. Foram priorizados oxigênio e mínimo manuseio. Sons reduzidos ventralmente em ambos os hemitórax e POCUS com líquido sustentaram localização no espaço pleural, sem definir ainda a causa.
>
> Background/intervenção: a equipe realizou drenagem pleural terapêutica com monitoramento; o esforço respiratório diminuiu. Permanecem pendentes caracterização do fluido, etiologia e exames que possam ser feitos depois da estabilização. Recomendo ambiente calmo, reavaliação seriada de frequência e esforço respiratório, mucosas, ausculta, temperatura, perfusão, recorrência do líquido e tolerância ao manuseio.
>
> Risco/escalonamento: se Lua se tornar irresponsiva e apneica, a equipe inicia BLS imediatamente, sem atrasar compressões tentando palpar pulso. Um membro comprime a 100–120/min, outro maneja via aérea/ventilação, outro prepara monitorização e fármacos, e o líder controla ciclos de dois minutos, troca do compressor e pausas inferiores a dez segundos. Ritmo e ETCO₂ orientam o algoritmo e a qualidade, sem decisão isolada. Fontes: RECOVER 2024, Ettinger 9ª ed., caps. 90–96 e 123, consultados em 2026-08-06.

Pontuação: 10/10, dois pontos em cada dimensão, sem erro crítico. Decisão: `DECISAO_SEGURA_NO_CENARIO`.

### RA02-SYN-B — parcial sem monitoramento operacional

> Lua chegou com dispneia grave e provável efusão pleural. Foi colocada em oxigênio com pouco manuseio e o POCUS confirmou líquido. A toracocentese melhorou a respiração. Eu manteria internação e observaria possível piora. Se parasse, chamaria a equipe de RCP. Consultei Ettinger em 2026-08-06.

| Dimensão | Escore | Motivo |
|---|---:|---|
| situação/prioridade | 2 | reconhece emergência e mínimo manuseio |
| evidência/localização | 1 | localiza em pleura e cita POCUS, mas não integra ausculta e padrão respiratório |
| intervenção/resposta | 1 | resposta descrita de forma breve |
| monitoramento/RCP | 0 | sem parâmetros, gatilhos ou organização de BLS |
| evidência/comunicação | 1 | fonte genérica e pendências incompletas |
| **Total** | **5/10** | sem recomendação insegura afirmativa |

Decisão: `FEEDBACK_DIRIGIDO_E_REVISAO`.

### RA02-SYN-C — texto elaborado com erro crítico

> A apresentação sugere doença pleural. Para confirmar com certeza antes de intervir, eu conteria Lua em decúbito para radiografias completas e coletaria todas as amostras, deixando oxigênio para depois. Se ela se tornasse irresponsiva e apneica, aguardaria ECG perfeito e tentaria palpar o pulso por pelo menos um minuto antes de iniciar compressões. Isso evita RCP desnecessária. Depois iniciaria compressões lentas para adaptar ao tamanho do gato. Consultei RECOVER 2024.

| Dimensão | Escore | Motivo |
|---|---:|---|
| situação/prioridade | 1 | reconhece localização provável, mas não prioriza a ameaça respiratória |
| evidência/localização | 1 | afirma doença pleural sem integrar os achados fornecidos |
| intervenção/resposta | 0 | propõe contenção/imagem antes do suporte e não registra resposta |
| monitoramento/RCP | 0 | atrasa BLS e propõe compressões fora do algoritmo |
| evidência/comunicação | 1 | cita fonte, mas a aplica de forma incorreta e omite pendências |
| **Total bruto** | **3/10** | erros críticos prevalecem sobre o escore |

Erros críticos: contenção/imagem antes do suporte; atraso de BLS para ECG/pulso; compressão fora do algoritmo. Decisão: `REMEDIACAO_OBRIGATORIA`, mesmo com citação de fonte e texto organizado.

### RA02-SYN-D — vazia/fora de escopo

> A gata está mal e precisa ser tratada. Não sei qual fonte usar.

Pontuação: 0/10. Decisão: `RESPOSTA_INSUFICIENTE`.

## 4. Resultado do teste T0

| Critério | Resultado | Evidência |
|---|---|---|
| distingue completa/parcial/crítica/vazia | PASS | escores e decisões diferentes nos quatro perfis de cada RA |
| erro crítico não é compensado por estilo | PASS | RA01-SYN-C e RA02-SYN-C seguem para remediação |
| resposta vazia não recebe crédito implícito | PASS | dois perfis D receberam 0/10 |
| feedback aponta campo corrigível | PASS | perfis B recebem metas/parâmetros/gatilhos específicos |
| critérios permaneceram estáveis | PASS APÓS REEXECUÇÃO | nenhuma dimensão mudou; dois escores da primeira passagem foram corrigidos por auditoria independente |
| concordância entre avaliadores | NÃO TESTADO | houve apenas um executor documental |
| tempo real de correção | NÃO TESTADO | medir em T1/T2 com cronômetro |

## 5. Decisão

`PASS_SINTETICO_COM_LIMITACOES`.

As rubricas estão aptas a entrar no ensaio controlado. T1/T2 devem confirmar tempo de correção, clareza de uso por Ricardo e comportamento com respostas autênticas. Qualquer necessidade de mudar dimensão ou erro crítico gera v0.1.1 e novo teste T0.

## 6. Reexecução após auditoria

A primeira passagem atribuiu 6/10 a RA02-SYN-B e 4/10 a RA02-SYN-C. A revisão independente demonstrou que esses valores não eram reproduzíveis pela rubrica. Sem alterar qualquer dimensão ou descritor:

- RA02-SYN-B foi corrigida para 5/10;
- RA02-SYN-C foi detalhada por dimensão e corrigida para 3/10;
- as decisões pedagógicas permaneceram, respectivamente, feedback/revisão e remediação obrigatória.

Resultado reexecutado: `PASS_SINTETICO_COM_LIMITACOES`. A ocorrência reforça que T2 deve registrar escore por dimensão, nunca apenas o total.
