import type {
  Assessment,
  AssessmentQuestion,
  Choice,
  InternalSourceRef,
  OpenResponse,
} from "./types.js";
import {
  emergencySources,
  respiratorySources,
  resuscitationSources,
  surgerySources,
} from "./catalog-module-data.js";

function freeze<T>(value: T): Readonly<T> {
  return Object.freeze(value);
}

function choices(...values: readonly [string, string][]): readonly Choice[] {
  return freeze(
    values.map(([id, text]) => freeze({ id, label: id.toUpperCase(), text })),
  );
}

function question(
  input: Omit<AssessmentQuestion, "choices" | "sourceRefs"> & {
    readonly choices: readonly Choice[];
    readonly sourceRefs: readonly InternalSourceRef[];
  },
): AssessmentQuestion {
  return freeze({
    ...input,
    choices: freeze([...input.choices]),
    sourceRefs: freeze([...input.sourceRefs]),
    correctChoiceIds: freeze([...input.correctChoiceIds]),
  });
}

const s1Questions: readonly AssessmentQuestion[] = [
  question({
    id: "M02-S1-Q01",
    sessionId: "M02-S1",
    title: "Função da triagem",
    prompt: "A função principal da triagem é:",
    kind: "MULTIPLE_CHOICE",
    choices: choices(
      ["a", "estabelecer imediatamente o diagnóstico definitivo"],
      [
        "b",
        "identificar ameaças imediatas e definir prioridade de atendimento",
      ],
      ["c", "obter toda a história antes de tocar no paciente"],
      ["d", "selecionar os exames mais sofisticados disponíveis"],
    ),
    correctChoiceIds: ["b"],
    feedback:
      "Priorize ameaças imediatas e estabilização antes do diagnóstico definitivo.",
    critical: false,
    sourceRefs: emergencySources,
  }),
  question({
    id: "M02-S1-Q02",
    sessionId: "M02-S1",
    title: "Avaliação primária",
    prompt: "Qual sequência representa a avaliação primária ABCDE?",
    kind: "MULTIPLE_CHOICE",
    choices: choices(
      ["a", "via aérea, respiração, circulação, estado neurológico, exposição"],
      ["b", "analgesia, bioquímica, cardiologia, diagnóstico, encaminhamento"],
      ["c", "ausculta, balanço hídrico, coleta, drogas, eletrocardiograma"],
      ["d", "acesso venoso, bolus, cateter, drenagem, extubação"],
    ),
    correctChoiceIds: ["a"],
    feedback:
      "ABCDE organiza ameaças imediatas; a equipe pode executar tarefas em paralelo.",
    critical: true,
    sourceRefs: emergencySources,
  }),
  question({
    id: "M02-S1-Q03",
    sessionId: "M02-S1",
    title: "Perfusão inadequada",
    prompt: "Qual conjunto é mais compatível com perfusão inadequada?",
    kind: "MULTIPLE_CHOICE",
    choices: choices(
      ["a", "mucosas rosadas, pulso forte e estado mental normal"],
      ["b", "taquicardia isolada após transporte"],
      [
        "c",
        "alteração de consciência, pulsos fracos, extremidades frias e TPC prolongado",
      ],
      ["d", "temperatura normal e apetite reduzido"],
    ),
    correctChoiceIds: ["c"],
    feedback:
      "Integre estado mental, pulso, extremidades, mucosas e tendência de resposta.",
    critical: true,
    sourceRefs: emergencySources,
  }),
  question({
    id: "M02-S1-Q04",
    sessionId: "M02-S1",
    title: "Lactato em contexto",
    prompt: "Um valor isolado de lactato deve ser usado:",
    kind: "MULTIPLE_CHOICE",
    choices: choices(
      ["a", "como diagnóstico independente da causa do choque"],
      ["b", "junto ao exame e, quando indicado, à tendência após intervenção"],
      ["c", "para substituir a avaliação de perfusão"],
      ["d", "para definir sozinho alta ou internação"],
    ),
    correctChoiceIds: ["b"],
    feedback:
      "Lactato é um dado contextual e seriado, não um diagnóstico isolado.",
    critical: false,
    sourceRefs: emergencySources,
  }),
  question({
    id: "M02-S1-Q05",
    sessionId: "M02-S1",
    title: "Hipovolemia e desidratação",
    prompt: "Qual afirmação diferencia melhor hipovolemia de desidratação?",
    kind: "MULTIPLE_CHOICE",
    choices: choices(
      ["a", "são sinônimos e sempre recebem a mesma prescrição"],
      [
        "b",
        "hipovolemia reduz o volume circulante efetivo; desidratação é déficit de água corporal e podem coexistir",
      ],
      ["c", "desidratação sempre causa hipotensão grave"],
      ["d", "hipovolemia deve ser corrigida apenas por via subcutânea"],
    ),
    correctChoiceIds: ["b"],
    feedback:
      "Os compartimentos e o risco hemodinâmico precisam ser diferenciados antes da prescrição.",
    critical: true,
    sourceRefs: emergencySources,
  }),
  question({
    id: "M02-S1-Q06",
    sessionId: "M02-S1",
    title: "Dor no paciente instável",
    prompt: "No paciente doloroso e instável, a abordagem mais adequada é:",
    kind: "MULTIPLE_CHOICE",
    choices: choices(
      ["a", "ignorar a dor até o diagnóstico definitivo"],
      [
        "b",
        "integrar analgesia ao plano sem atrasar intervenções que salvam a vida",
      ],
      ["c", "usar sempre o mesmo analgésico e dose"],
      ["d", "evitar reavaliar a dor para não manipular o paciente"],
    ),
    correctChoiceIds: ["b"],
    feedback:
      "Analgesia faz parte do cuidado e deve ser titulada e reavaliada.",
    critical: false,
    sourceRefs: emergencySources,
  }),
  question({
    id: "M02-S1-Q07",
    sessionId: "M02-S1",
    title: "Fluidos como intervenção",
    prompt: "A frase ‘fluidos são fármacos’ significa que:",
    kind: "MULTIPLE_CHOICE",
    choices: choices(
      ["a", "toda alteração cardiovascular exige fluido"],
      [
        "b",
        "tipo, via, quantidade, velocidade, metas e efeitos adversos devem ser prescritos e monitorados",
      ],
      ["c", "a taxa inicial deve permanecer fixa até a alta"],
      ["d", "cristaloides não causam complicações"],
    ),
    correctChoiceIds: ["b"],
    feedback:
      "Fluido exige indicação, meta, monitoramento e critérios de interrupção.",
    critical: true,
    sourceRefs: emergencySources,
  }),
  question({
    id: "M02-S1-Q08",
    sessionId: "M02-S1",
    title: "Reavaliação",
    prompt:
      "Depois de uma intervenção de ressuscitação, a melhor próxima ação é:",
    kind: "MULTIPLE_CHOICE",
    choices: choices(
      ["a", "aguardar algumas horas sem nova avaliação"],
      ["b", "repetir automaticamente a intervenção"],
      [
        "c",
        "reavaliar os desfechos definidos e ajustar, interromper ou escalonar",
      ],
      ["d", "solicitar todos os exames antes de observar a resposta"],
    ),
    correctChoiceIds: ["c"],
    feedback:
      "A resposta observada determina a próxima decisão, não a repetição automática.",
    critical: true,
    sourceRefs: emergencySources,
  }),
];

const caseQuestions: readonly AssessmentQuestion[] = [
  question({
    id: "M02-S1-CASO-A01",
    sessionId: "M02-S1",
    title: "Bento: primeiros minutos",
    prompt:
      "Selecione as seis ações prioritárias para os primeiros minutos de Bento.",
    kind: "MULTI_SELECT",
    choices: choices(
      ["a", "avaliar via aérea e oferecer oxigênio conforme tolerado"],
      ["b", "verificar ventilação e pesquisar lesões torácicas ameaçadoras"],
      ["c", "avaliar circulação/perfusão e obter acesso vascular"],
      ["d", "realizar avaliação neurológica breve e dirigida"],
      ["e", "expor, procurar lesões ocultas e prevenir hipotermia"],
      ["f", "designar funções e iniciar monitoramento compatível"],
      ["g", "realizar radiografias ortopédicas completas antes de estabilizar"],
      ["h", "administrar quantidade fixa máxima sem reavaliação"],
      ["i", "aguardar hemograma antes de intervir"],
    ),
    correctChoiceIds: ["a", "b", "c", "d", "e", "f"],
    feedback:
      "A ordem funcional é A–B–C–D–E, com equipe organizada e sem atrasar estabilização por exames tardios.",
    critical: true,
    sourceRefs: emergencySources,
  }),
  question({
    id: "M02-S1-CASO-A02",
    sessionId: "M02-S1",
    title: "Bento: síndrome inicial",
    prompt: "Qual síndrome deve orientar a estabilização inicial?",
    kind: "MULTIPLE_CHOICE",
    choices: choices(
      ["a", "paciente estável com dor isolada"],
      ["b", "choque circulatório com forte suspeita de componente hemorrágico"],
      ["c", "doença ortopédica sem ameaça sistêmica"],
      ["d", "desidratação leve sem hipoperfusão"],
    ),
    correctChoiceIds: ["b"],
    feedback:
      "Trauma, alteração de consciência, pulsos fracos, mucosas pálidas e distensão apoiam a hipótese sindrômica.",
    critical: true,
    sourceRefs: emergencySources,
  }),
  question({
    id: "M02-S1-CASO-A03",
    sessionId: "M02-S1",
    title: "Bento: parâmetros em tendência",
    prompt:
      "Escolha o conjunto de dados que melhor permite acompanhar resposta de perfusão nos primeiros 30 minutos.",
    kind: "MULTIPLE_CHOICE",
    choices: choices(
      ["a", "apenas peso e temperatura uma vez"],
      [
        "b",
        "estado mental, pulso, mucosas/TPC, pressão, lactato e resposta global",
      ],
      ["c", "somente hematócrito inicial"],
      ["d", "apenas resultado de radiografia ortopédica"],
    ),
    correctChoiceIds: ["b"],
    feedback:
      "Use exame, tendência e resposta; nenhum número isolado encerra o raciocínio.",
    critical: false,
    sourceRefs: emergencySources,
  }),
];

const s2Questions: readonly AssessmentQuestion[] = [
  question({
    id: "M02-S2-Q01",
    sessionId: "M02-S2",
    title: "Resposta parcial",
    prompt:
      "Após a primeira intervenção, qual é a melhor interpretação conjunta?",
    kind: "MULTIPLE_CHOICE",
    choices: choices(
      ["a", "resposta completa; manter a mesma terapia sem reavaliar"],
      [
        "b",
        "melhora parcial com preocupação de hemorragia em curso e necessidade de escalonamento",
      ],
      ["c", "ausência de choque porque o hematócrito inicial era normal"],
      ["d", "sobrecarga confirmada apenas pela redução do hematócrito"],
    ),
    correctChoiceIds: ["b"],
    feedback:
      "Persistência de hipoperfusão, líquido abdominal e tendência hematológica exigem nova decisão.",
    critical: true,
    sourceRefs: emergencySources,
  }),
  question({
    id: "M02-S2-Q02",
    sessionId: "M02-S2",
    title: "Risco da repetição automática",
    prompt: "Qual conduta é menos segura neste momento?",
    kind: "MULTIPLE_CHOICE",
    choices: choices(
      ["a", "reavaliar perfusão após cada intervenção"],
      ["b", "preparar compatibilidade e discutir hemocomponentes"],
      [
        "c",
        "repetir grandes volumes de cristaloide automaticamente até normalizar um número",
      ],
      ["d", "organizar controle de fonte e suporte definitivo"],
    ),
    correctChoiceIds: ["c"],
    feedback:
      "Volume sem meta pode causar dano e atrasar sangue ou controle da hemorragia.",
    critical: true,
    sourceRefs: emergencySources,
  }),
  question({
    id: "M02-S2-Q03",
    sessionId: "M02-S2",
    title: "Prescrição de fluido",
    prompt: "Uma prescrição de fluido completa deve conter:",
    kind: "MULTIPLE_CHOICE",
    choices: choices(
      ["a", "apenas o nome do fluido"],
      [
        "b",
        "indicação, tipo, via, quantidade/velocidade, metas e critérios de interrupção",
      ],
      ["c", "somente uma taxa por hora"],
      ["d", "a expressão ‘fluido conforme necessário’"],
    ),
    correctChoiceIds: ["b"],
    feedback: "A prescrição precisa ser executável, monitorável e reversível.",
    critical: true,
    sourceRefs: emergencySources,
  }),
  question({
    id: "M02-S2-Q04",
    sessionId: "M02-S2",
    title: "Hematócrito inicial",
    prompt:
      "Qual dado isolado não deve encerrar o raciocínio sobre hemorragia?",
    kind: "MULTIPLE_CHOICE",
    choices: choices(
      ["a", "hematócrito inicial dentro do intervalo esperado"],
      ["b", "tendência de perfusão"],
      ["c", "progressão da distensão abdominal"],
      ["d", "resposta cardiovascular à intervenção"],
    ),
    correctChoiceIds: ["a"],
    feedback:
      "A fase inicial da hemorragia pode não refletir sua magnitude em um único hematócrito.",
    critical: true,
    sourceRefs: emergencySources,
  }),
  question({
    id: "M02-S2-Q05",
    sessionId: "M02-S2",
    title: "Próxima etapa no trauma",
    prompt: "Qual conjunto melhor representa a próxima etapa?",
    kind: "MULTIPLE_CHOICE",
    choices: choices(
      ["a", "radiografia ortopédica detalhada e alta se não houver fratura"],
      [
        "b",
        "reavaliação seriada, exames dirigidos, preparo transfusional e controle de fonte",
      ],
      ["c", "interromper monitoramento para reduzir estresse"],
      ["d", "aguardar normalização espontânea do lactato"],
    ),
    correctChoiceIds: ["b"],
    feedback:
      "Diagnóstico dirigido acompanha a ressuscitação; não a substitui.",
    critical: true,
    sourceRefs: emergencySources,
  }),
  question({
    id: "M02-S2-Q06",
    sessionId: "M02-S2",
    title: "Comunicação de urgência",
    prompt: "Na comunicação com o tutor, deve-se:",
    kind: "MULTIPLE_CHOICE",
    choices: choices(
      ["a", "garantir desfecho favorável se houver cirurgia"],
      [
        "b",
        "explicar instabilidade, incerteza, intervenções, riscos e decisão em tempo hábil",
      ],
      ["c", "omitir deterioração para evitar preocupação"],
      ["d", "apresentar apenas custos, sem prioridade clínica"],
    ),
    correctChoiceIds: ["b"],
    feedback:
      "Comunicação segura informa urgência e incerteza sem prometer resultado.",
    critical: false,
    sourceRefs: emergencySources,
  }),
];

const s3Questions: readonly AssessmentQuestion[] = [
  question({
    id: "M02-S3-Q01",
    sessionId: "M02-S3",
    title: "Gata dispneica",
    prompt: "A abordagem inicial mais segura para Lua é:",
    kind: "MULTIPLE_CHOICE",
    choices: choices(
      ["a", "contenção firme para radiografias imediatas"],
      [
        "b",
        "oxigênio, mínimo manuseio e avaliação focada sem agravar o esforço",
      ],
      ["c", "coleta completa de sangue antes de suporte"],
      ["d", "caminhada para avaliar tolerância ao exercício"],
    ),
    correctChoiceIds: ["b"],
    feedback:
      "Reduza estresse e preserve oxigenação enquanto localiza rapidamente a ameaça.",
    critical: true,
    sourceRefs: respiratorySources,
  }),
  question({
    id: "M02-S3-Q02",
    sessionId: "M02-S3",
    title: "Localização pleural",
    prompt:
      "Com redução ventral bilateral de sons e instabilidade, a prioridade diagnóstica é:",
    kind: "MULTIPLE_CHOICE",
    choices: choices(
      ["a", "excluir doença dentária"],
      ["b", "investigar rapidamente o espaço pleural à beira do leito"],
      ["c", "realizar tomografia antes de intervir"],
      ["d", "assumir asma sem investigar"],
    ),
    correctChoiceIds: ["b"],
    feedback:
      "A avaliação focada pode orientar intervenção sem exigir imagem completa primeiro.",
    critical: true,
    sourceRefs: respiratorySources,
  }),
  question({
    id: "M02-S3-Q03",
    sessionId: "M02-S3",
    title: "Intervenção pleural",
    prompt:
      "Com líquido pleural relevante e instabilidade, qual decisão deve ser considerada sem atraso por radiografias completas?",
    kind: "MULTIPLE_CHOICE",
    choices: choices(
      [
        "a",
        "toracocentese terapêutica por equipe habilitada, com monitoramento",
      ],
      ["b", "alta com reavaliação em uma semana"],
      ["c", "fluidoterapia em taxa fixa elevada"],
      ["d", "exercício leve para mobilizar o líquido"],
    ),
    correctChoiceIds: ["a"],
    feedback:
      "Em paciente instável, suporte e intervenção indicada precedem a caracterização completa.",
    critical: true,
    sourceRefs: respiratorySources,
  }),
  question({
    id: "M02-S3-Q04",
    sessionId: "M02-S3",
    title: "Início da RCP",
    prompt:
      "Se Lua se torna subitamente irresponsiva e apneica, a ação prioritária é:",
    kind: "MULTIPLE_CHOICE",
    choices: choices(
      ["a", "aguardar confirmação laboratorial"],
      ["b", "iniciar suporte básico de vida e acionar a equipe de RCP"],
      ["c", "realizar radiografia torácica"],
      ["d", "repetir a ausculta por dois minutos"],
    ),
    correctChoiceIds: ["b"],
    feedback:
      "Na parada simulada, não se atrasa BLS por exame ou checagem prolongada.",
    critical: true,
    sourceRefs: resuscitationSources,
  }),
  question({
    id: "M02-S3-Q05",
    sessionId: "M02-S3",
    title: "Frequência de compressões",
    prompt:
      "A frequência recomendada de compressões em cães e gatos adultos durante RCP é:",
    kind: "MULTIPLE_CHOICE",
    choices: choices(
      ["a", "40–60 por minuto"],
      ["b", "60–80 por minuto"],
      ["c", "100–120 por minuto"],
      ["d", "140–160 por minuto"],
    ),
    correctChoiceIds: ["c"],
    feedback:
      "Use o algoritmo de ressuscitação descrito no material interno baseado nos capítulos permitidos.",
    critical: true,
    sourceRefs: resuscitationSources,
  }),
  question({
    id: "M02-S3-Q06",
    sessionId: "M02-S3",
    title: "Qualidade da RCP",
    prompt: "Qual organização favorece qualidade durante ciclos de RCP?",
    kind: "MULTIPLE_CHOICE",
    choices: choices(
      [
        "a",
        "ciclos de dois minutos, troca do compressor e pausas inferiores a dez segundos",
      ],
      ["b", "compressor único sem troca para manter ritmo"],
      ["c", "pausas longas para cada análise e documentação"],
      ["d", "compressões lentas adaptadas ao porte sem algoritmo"],
    ),
    correctChoiceIds: ["a"],
    feedback: "Papéis claros e pausas curtas preservam qualidade e segurança.",
    critical: true,
    sourceRefs: resuscitationSources,
  }),
  question({
    id: "M02-S3-Q07",
    sessionId: "M02-S3",
    title: "Ritmo",
    prompt: "Durante a RCP, a análise do ritmo deve:",
    kind: "MULTIPLE_CHOICE",
    choices: choices(
      [
        "a",
        "ocorrer em pausa breve e preparada para definir o ramo do algoritmo",
      ],
      ["b", "ser feita somente depois de concluir todos os exames"],
      ["c", "substituir compressões durante a maior parte do ciclo"],
      ["d", "ser ignorada quando houver monitor conectado"],
    ),
    correctChoiceIds: ["a"],
    feedback:
      "A análise deve ser coordenada e não prolongar a interrupção das compressões.",
    critical: true,
    sourceRefs: resuscitationSources,
  }),
  question({
    id: "M02-S3-Q08",
    sessionId: "M02-S3",
    title: "ETCO₂",
    prompt: "O ETCO₂ durante RCP:",
    kind: "MULTIPLE_CHOICE",
    choices: choices(
      [
        "a",
        "auxilia a acompanhar qualidade e tendência, mas não decide sozinho o encerramento",
      ],
      ["b", "substitui avaliação de equipe e ritmo"],
      ["c", "é usado apenas depois da alta"],
      ["d", "define etiologia da parada isoladamente"],
    ),
    correctChoiceIds: ["a"],
    feedback:
      "Use ETCO₂ como dado de monitoramento dentro do algoritmo e da resposta global.",
    critical: false,
    sourceRefs: resuscitationSources,
  }),
];

const s4Questions: readonly AssessmentQuestion[] = [
  question({
    id: "M02-S4-Q01",
    sessionId: "M02-S4",
    title: "Exame que muda conduta",
    prompt:
      "No paciente instável, um exame complementar deve ser escolhido quando:",
    kind: "MULTIPLE_CHOICE",
    choices: choices(
      ["a", "pode mudar a conduta imediata sem atrasar suporte essencial"],
      ["b", "é o mais sofisticado disponível"],
      ["c", "substitui exame físico e reavaliação"],
      ["d", "pode ser feito somente depois da alta"],
    ),
    correctChoiceIds: ["a"],
    feedback:
      "O valor do exame depende da decisão que ele pode informar no tempo disponível.",
    critical: true,
    sourceRefs: emergencySources,
  }),
  question({
    id: "M02-S4-Q02",
    sessionId: "M02-S4",
    title: "Nova decisão de fluido",
    prompt: "Cada prescrição de fluido exige:",
    kind: "MULTIPLE_CHOICE",
    choices: choices(
      ["a", "nova decisão baseada em resposta e risco de dano"],
      ["b", "continuidade automática até a alta"],
      ["c", "somente a troca do equipo"],
      ["d", "uma meta fixa independente do paciente"],
    ),
    correctChoiceIds: ["a"],
    feedback: "Reavalie benefício e dano após cada intervenção.",
    critical: true,
    sourceRefs: emergencySources,
  }),
  question({
    id: "M02-S4-Q03",
    sessionId: "M02-S4",
    title: "Gato dispneico e manuseio",
    prompt: "Antes de uma imagem completa em uma gata instável, deve-se:",
    kind: "MULTIPLE_CHOICE",
    choices: choices(
      [
        "a",
        "reduzir manuseio, oferecer suporte e usar avaliação focada quando útil",
      ],
      ["b", "conter firmemente até concluir todas as projeções"],
      ["c", "adiar oxigênio para melhorar a qualidade da imagem"],
      ["d", "solicitar exercício para reproduzir sinais"],
    ),
    correctChoiceIds: ["a"],
    feedback: "A segurança respiratória vem antes da imagem não essencial.",
    critical: true,
    sourceRefs: respiratorySources,
  }),
  question({
    id: "M02-S4-Q04",
    sessionId: "M02-S4",
    title: "Pausa na RCP",
    prompt: "Na análise de ritmo durante a RCP, as pausas devem ser:",
    kind: "MULTIPLE_CHOICE",
    choices: choices(
      ["a", "prolongadas para documentar tudo"],
      ["b", "breves, com organização de equipe e retomada imediata"],
      ["c", "feitas a cada compressão"],
      ["d", "evitadas mesmo para análise necessária"],
    ),
    correctChoiceIds: ["b"],
    feedback: "A coordenação reduz pausas e mantém compressões de qualidade.",
    critical: true,
    sourceRefs: resuscitationSources,
  }),
  question({
    id: "M02-S4-Q05",
    sessionId: "M02-S4",
    title: "Passagem segura",
    prompt: "Uma passagem segura deve deixar explícitos:",
    kind: "MULTIPLE_CHOICE",
    choices: choices(
      ["a", "somente o diagnóstico final"],
      [
        "b",
        "situação, prioridade, intervenção/resposta, tendência, gatilho e pendência",
      ],
      ["c", "apenas a lista de medicamentos"],
      ["d", "somente a opinião de quem atendeu"],
    ),
    correctChoiceIds: ["b"],
    feedback: "A próxima equipe precisa saber o que ocorreu e quando agir.",
    critical: false,
    sourceRefs: emergencySources,
  }),
  question({
    id: "M02-S4-Q06",
    sessionId: "M02-S4",
    title: "Divergência crítica",
    prompt:
      "Se uma orientação crítica divergir entre registros, a equipe deve:",
    kind: "MULTIPLE_CHOICE",
    choices: choices(
      ["a", "escolher a versão mais antiga sem registrar"],
      [
        "b",
        "interromper o uso do item, registrar a divergência e buscar decisão autorizada",
      ],
      ["c", "publicar as duas versões para o participante decidir"],
      ["d", "remover o histórico para evitar confusão"],
    ),
    correctChoiceIds: ["b"],
    feedback:
      "Divergência não resolvida bloqueia a publicação do item crítico.",
    critical: true,
    sourceRefs: freeze([...emergencySources, ...surgerySources]),
  }),
];

const m02RubricDimensions = freeze([
  freeze({
    id: "priority",
    label: "prioridade",
    description: "Ordena ameaças imediatas e não atrasa suporte essencial.",
    maxPoints: 2,
  }),
  freeze({
    id: "intervention",
    label: "intervenção",
    description:
      "Propõe medidas tituladas, justificadas e coerentes com o tempo.",
    maxPoints: 2,
  }),
  freeze({
    id: "reassessment",
    label: "metas e reavaliação",
    description: "Define desfechos, frequência e leitura de tendência.",
    maxPoints: 2,
  }),
  freeze({
    id: "escalation",
    label: "parada e escalonamento",
    description: "Explicita gatilhos, controle de fonte e remediação do risco.",
    maxPoints: 2,
  }),
  freeze({
    id: "communication",
    label: "evidência e comunicação",
    description: "Comunica fatos, incertezas, riscos e próxima decisão.",
    maxPoints: 2,
  }),
]);

const openResponses: readonly OpenResponse[] = [
  freeze({
    id: "M02-S2-RA01",
    sessionId: "M02-S2",
    title: "Plano de Bento",
    prompt:
      "Elabore o plano de Bento para 0–15 e 15–60 minutos, incluindo prioridades, intervenções, metas, reavaliação, pontos de parada, preparo transfusional, controle de fonte e comunicação.",
    rubric: freeze({
      dimensions: m02RubricDimensions,
      passScore: 8,
      criticalErrors: freeze([
        "atrasar ABCDE por exame tardio",
        "prescrever volume ilimitado sem reavaliação",
        "ignorar hipoperfusão persistente ou hemorragia provável",
        "omitir preparo transfusional e controle de fonte",
        "recomendar alta sem monitoramento",
      ]),
    }),
    feedback:
      "Acrescente meta observável, frequência de reavaliação e gatilho de interrupção ou escalonamento.",
    sourceRefs: freeze([...emergencySources, ...surgerySources]),
  }),
  freeze({
    id: "M02-S3-RA02",
    sessionId: "M02-S3",
    title: "Passagem de Lua",
    prompt:
      "Escreva uma passagem estruturada de Lua separando situação, achados, intervenção, resposta, riscos, gatilhos de RCP e pendências.",
    rubric: freeze({
      dimensions: m02RubricDimensions,
      passScore: 8,
      criticalErrors: freeze([
        "conter ou investigar antes de suportar a gata instável",
        "adiar drenagem indicada por imagem completa",
        "atrasar BLS por ECG ou checagem prolongada",
        "propor compressões fora do algoritmo vigente",
        "apresentar hipótese como etiologia confirmada",
      ]),
    }),
    feedback:
      "Separe fatos de hipóteses e informe a resposta, o gatilho e quem executará a próxima ação.",
    sourceRefs: freeze([...respiratorySources, ...resuscitationSources]),
  }),
];

export const m02Assessment: Assessment = freeze({
  id: "M02-ASSESSMENT-V1",
  moduleId: "M02",
  version: "0.1.0",
  questions: freeze([
    ...s1Questions,
    ...caseQuestions,
    ...s2Questions,
    ...s3Questions,
    ...s4Questions,
  ]),
  openResponses: freeze(openResponses),
});
