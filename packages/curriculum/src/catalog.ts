import type {
  Assessment,
  AssessmentQuestion,
  B07Blueprint,
  B07BlueprintItem,
  Choice,
  Curriculum,
  CurriculumModule,
  CurriculumSession,
  HospitalTeamBehavior,
  HospitalTrainingBlueprint,
  HospitalTrainingDesign,
  InternalSourceRef,
  MasteryRule,
  ModuleAssessmentBlueprint,
  OpenResponse,
  TrainingAssessmentMode,
  TrainingAudience,
} from "./types.js";

function freeze<T>(value: T): Readonly<T> {
  return Object.freeze(value);
}

function source(
  code: InternalSourceRef["code"],
  locator: string,
  updateRequired: boolean,
): InternalSourceRef {
  return freeze({ code, locator, updateRequired });
}

const emergencySources = freeze([
  source("F-02", "caps. 119–124", true),
  source("F-01", "Partes 2, 3, 12 e 20", true),
  source("AAHA-2024", "fluidoterapia e reavaliação", false),
]);

const respiratorySources = freeze([
  source("F-02", "caps. 90–96 e 123", true),
  source("F-01", "Parte 2, caps. 3–5 e 11", true),
  source("F-03", "caps. 29–31", true),
]);

const resuscitationSources = freeze([
  source("RECOVER-2024", "BLS/ALS e monitoramento", false),
  source("F-02", "cap. 131 como referência histórica", true),
]);

const surgerySources = freeze([
  source("F-03", "caps. 4, 8, 12, 19, 24 e 29–31", true),
  source("F-01", "Partes 2, 3, 12 e 20", true),
  source("F-02", "emergência e perioperatório", true),
]);

type ModuleSpec = Readonly<{
  readonly month: number;
  readonly title: string;
  readonly competence: string;
  readonly objectives: readonly string[];
  readonly sessions: readonly [string, string, string, string];
}>;

const moduleSpecs: readonly ModuleSpec[] = [
  {
    month: 1,
    title: "Diagnóstico, raciocínio clínico e estudo orientado",
    competence:
      "Organizar dados, reconhecer risco e justificar um plano inicial.",
    objectives: [
      "obter história e exame dirigidos",
      "formular problemas e diferenciais",
      "comunicar incerteza e próxima ação",
    ],
    sessions: [
      "diagnóstico, história, exame e segurança terapêutica",
      "emergência, priorização, perfusão e dor",
      "internação, monitoramento, comunicação e integração",
      "devolutiva, plano individual e revisão espaçada",
    ],
  },
  {
    month: 2,
    title: "Emergência e terapia intensiva",
    competence:
      "Reconhecer instabilidade, intervir em sequência e reavaliar resposta.",
    objectives: [
      "priorizar ABCDE e ameaças imediatas",
      "prescrever suporte com metas e pontos de parada",
      "escalar hemorragia, dispneia e parada simulada",
    ],
    sessions: [
      "triagem, ABCDE, choque e metas de ressuscitação",
      "perfusão, fluidoterapia, eletrólitos, dor e monitoramento",
      "oxigênio, ventilação, trauma, hemorragia e RCP",
      "caso integrado, reavaliação, escalonamento e registro",
    ],
  },
  {
    month: 3,
    title: "Cardiologia",
    competence:
      "Integrar exame cardiovascular, dados complementares e risco hemodinâmico.",
    objectives: [
      "localizar o problema cardiovascular",
      "diferenciar insuficiência, arritmia e tromboembolismo",
      "monitorar resposta e decidir encaminhamento",
    ],
    sessions: [
      "exame cardiovascular, ECG, imagem e biomarcadores",
      "doença valvar, cardiomiopatias e cardiopatias congênitas",
      "insuficiência, arritmias, hipertensão e pericárdio",
      "contraste cão/gato, terapia e encaminhamento",
    ],
  },
  {
    month: 4,
    title: "Sistema respiratório",
    competence:
      "Localizar insuficiência respiratória e preservar estabilidade durante investigação.",
    objectives: [
      "localizar padrão respiratório",
      "escalar suporte conforme resposta",
      "reconhecer quando intervenção torácica é urgente",
    ],
    sessions: [
      "oximetria, capnografia, gasometria e imagem torácica",
      "vias aéreas superiores, laringe e traqueia",
      "asma, bronquite, pneumonia e edema pulmonar",
      "espaço pleural, mediastino e suporte simulado",
    ],
  },
  {
    month: 5,
    title: "Nefrologia e urologia",
    competence:
      "Interpretar função renal e tratar risco urinário com monitoramento proporcional.",
    objectives: [
      "interpretar urinálise e azotemia",
      "estadiar doença renal e risco de hipertensão",
      "priorizar obstrução, ajuste terapêutico e nutrição",
    ],
    sessions: [
      "urinálise, lesão renal aguda e doença renal crônica",
      "estadiamento, proteinúria, hipertensão e monitoramento",
      "urolitíase, obstrução uretral e doença urinária felina",
      "casos contrastantes e ajuste de plano",
    ],
  },
  {
    month: 6,
    title: "Endocrinologia e metabolismo",
    competence:
      "Reconhecer síndromes endócrinas e corrigir risco metabólico de modo seguro.",
    objectives: [
      "escolher testes hormonais adequados",
      "manejar risco glicêmico e eletrolítico",
      "integrar comorbidades e monitoramento",
    ],
    sessions: [
      "poliúria, polidipsia e testes hormonais",
      "diabetes, hipoglicemia e cetoacidose",
      "adrenais, tireoide e cálcio",
      "obesidade, insulinoma e comorbidades",
    ],
  },
  {
    month: 7,
    title: "Gastroenterologia, fígado e pâncreas",
    competence:
      "Construir investigação digestiva e decidir suporte, imagem e controle de foco.",
    objectives: [
      "diferenciar vômito, regurgitação e diarreia",
      "integrar laboratório e imagem digestiva",
      "reconhecer abdômen agudo e necessidade de suporte",
    ],
    sessions: [
      "sinais digestivos, dor, laboratório e imagem",
      "esôfago, estômago, intestino e enteropatias",
      "fígado, colestase, shunts e vias biliares",
      "pâncreas, obstrução, nutrição e controle de foco",
    ],
  },
  {
    month: 8,
    title: "Hematologia, imunologia e transfusão",
    competence:
      "Interpretar citopenias e planejar hemostasia e hemoterapia com segurança.",
    objectives: [
      "classificar anemia e alterações hematológicas",
      "reconhecer doença imunomediada e coagulopatia",
      "selecionar hemocomponente e monitorar reação",
    ],
    sessions: [
      "hemograma, esfregaço e anemias",
      "hemólise, trombocitopenia e imunomediação",
      "hemostasia, coagulopatia e trombose",
      "compatibilidade, administração e reação transfusional",
    ],
  },
  {
    month: 9,
    title: "Infectologia, parasitologia e One Health",
    competence:
      "Investigar infecção, biossegurança e uso responsável de antimicrobianos.",
    objectives: [
      "organizar isolamento e coleta",
      "diferenciar síndromes infecciosas relevantes",
      "comunicar risco e stewardship",
    ],
    sessions: [
      "imunidade, vacinação, biossegurança e surtos",
      "doenças infecciosas caninas e vetoriais",
      "doenças felinas, fungos e zoonoses",
      "amostras, cultura e stewardship",
    ],
  },
  {
    month: 10,
    title: "Neurologia e toxicologia",
    competence:
      "Localizar síndrome neurológica ou tóxica e estabilizar ameaças reversíveis.",
    objectives: [
      "executar exame neurológico organizado",
      "priorizar convulsão, trauma e alteração de consciência",
      "reconhecer toxíndrome e descontaminação segura",
    ],
    sessions: [
      "exame neurológico e localização",
      "convulsão, doença intracraniana e vestibular",
      "medula, trauma, disco e dor neuropática",
      "toxíndromes, descontaminação e hipertermia",
    ],
  },
  {
    month: 11,
    title: "Internação, dor, nutrição e continuidade",
    competence:
      "Transformar problemas em plano hospitalar, metas, passagem e alta segura.",
    objectives: [
      "prescrever monitoramento e suporte",
      "integrar dor, balanço e nutrição",
      "comunicar deterioração, alta e prognóstico",
    ],
    sessions: [
      "admissão, problemas, metas e prescrição",
      "dor, sedação, balanço e nutrição",
      "dispositivos, feridas, isolamento e prevenção",
      "evolução, passagem, alta e limites terapêuticos",
    ],
  },
  {
    month: 12,
    title: "Integração da Parte 1",
    competence:
      "Integrar triagem, diagnóstico, suporte e continuidade em paciente multissistêmico.",
    objectives: [
      "priorizar múltiplas ameaças",
      "revisar hipóteses com dados novos",
      "defender plano, comunicação e remediação",
    ],
    sessions: [
      "entrada multissistêmica, triagem e prioridades",
      "diferenciais, exames, evidência e plano",
      "complicações, internação e reavaliação",
      "debriefing, retenção e plano individual",
    ],
  },
  {
    month: 13,
    title: "Princípios cirúrgicos, anestesia e perioperatório",
    competence:
      "Reduzir risco perioperatório e acompanhar recuperação e complicações.",
    objectives: [
      "aplicar assepsia e segurança cirúrgica",
      "avaliar risco anestésico e monitoramento",
      "planejar analgesia, ferida e recuperação",
    ],
    sessions: [
      "assepsia, esterilização, ambiente e instrumentos",
      "avaliação pré-operatória e monitoramento",
      "sutura, hemostasia, antimicrobianos e nutrição",
      "analgesia, ferida, infecção e deiscência",
    ],
  },
  {
    month: 14,
    title: "Cirurgia abdominal e de tecidos moles",
    competence:
      "Reconhecer indicação, estabilizar e acompanhar cirurgia abdominal fictícia.",
    objectives: [
      "priorizar estabilização e controle de foco",
      "integrar trato digestivo, fígado e pâncreas",
      "detectar vazamento, sepse e reintervenção",
    ],
    sessions: [
      "indicação, exploração e estabilização",
      "estômago, intestino, obstrução e anastomose",
      "fígado, pâncreas, baço e hérnias",
      "peritonite, nutrição e complicações",
    ],
  },
  {
    month: 15,
    title: "Cirurgia torácica e urogenital",
    competence:
      "Reconhecer urgências torácicas e urogenitais e organizar encaminhamento.",
    objectives: [
      "preservar ventilação em cirurgia torácica",
      "localizar doença urogenital cirúrgica",
      "monitorar drenos, obstrução e complicações",
    ],
    sessions: [
      "tórax, pulmão, esôfago e drenos",
      "pericárdio, coração e encaminhamento",
      "rim, ureter, bexiga e uretra",
      "reprodução, piometra e complicações",
    ],
  },
  {
    month: 16,
    title: "Ortopedia e trauma musculoesquelético",
    competence:
      "Priorizar trauma, selecionar imagem e acompanhar recuperação funcional.",
    objectives: [
      "avaliar trauma e exame ortopédico",
      "interpretar consolidação e biomecânica",
      "reconhecer falha de implante e dor",
    ],
    sessions: [
      "trauma, exame, imagem e estabilização",
      "osso, redução, fixação e enxertos",
      "articulações, ligamentos e crescimento",
      "infecção, falha, analgesia e reabilitação",
    ],
  },
  {
    month: 17,
    title: "Neurocirurgia e reabilitação",
    competence:
      "Selecionar caso neurológico, acompanhar cuidado perioperatório e função.",
    objectives: [
      "correlacionar sinais, imagem e encaminhamento",
      "planejar cuidado de compressões e trauma",
      "integrar dor, fisioterapia e qualidade de vida",
    ],
    sessions: [
      "correlação neurológica, imagem e encaminhamento",
      "disco, compressão e síndrome lombossacra",
      "trauma, cérebro e cuidado perioperatório",
      "recuperação, mobilidade e dor crônica",
    ],
  },
  {
    month: 18,
    title: "Dermatologia e otologia",
    competence:
      "Descrever lesões, escolher testes e tratar doença dermatológica com continuidade.",
    objectives: [
      "descrever lesões e coletar amostras",
      "diferenciar alergia, infecção e imunomediação",
      "manejar otite e stewardship",
    ],
    sessions: [
      "lesões, raspado, citologia e biópsia",
      "ectoparasitas, alergias e infecções",
      "autoimunidade, endocrinopatias e neoplasia",
      "otite, cronicidade e antimicrobianos",
    ],
  },
  {
    month: 19,
    title: "Oftalmologia",
    competence:
      "Localizar urgência ocular, proteger o globo e encaminhar no tempo adequado.",
    objectives: [
      "executar exame oftálmico básico",
      "diferenciar córnea, úvea, glaucoma e retina",
      "proteger visão e planejar encaminhamento",
    ],
    sessions: [
      "exame, testes e perda visual",
      "córnea, conjuntiva, úvea, cristalino e glaucoma",
      "retina, órbita e neuro-oftalmologia",
      "emergências, cirurgia e encaminhamento",
    ],
  },
  {
    month: 20,
    title: "Oncologia",
    competence:
      "Integrar diagnóstico, estadiamento, tratamento e qualidade de vida.",
    objectives: [
      "interpretar citologia e histopatologia",
      "reconhecer síndromes e urgências oncológicas",
      "comunicar prognóstico e opções de cuidado",
    ],
    sessions: [
      "citologia, histopatologia e estadiamento",
      "tumores frequentes e síndromes paraneoplásicas",
      "cirurgia, quimioterapia e monitoramento",
      "prognóstico, paliativos e qualidade de vida",
    ],
  },
  {
    month: 21,
    title: "Reprodução, neonatologia e pediatria",
    competence:
      "Reconhecer risco reprodutivo e estabilizar neonatos e pacientes jovens.",
    objectives: [
      "avaliar ciclo, gestação e distocia",
      "priorizar puerpério e doenças uterinas",
      "adaptar nutrição e terapêutica pediátrica",
    ],
    sessions: [
      "ciclo, fertilidade e diagnóstico gestacional",
      "gestação, distocia, puerpério e mama",
      "neonato, nutrição e estabilização",
      "genética, imunoprofilaxia e aconselhamento",
    ],
  },
  {
    month: 22,
    title: "Prevenção, odontologia, nutrição e comportamento",
    competence:
      "Construir cuidado preventivo e comunicação adaptada ao ciclo de vida.",
    objectives: [
      "planejar prevenção e rastreamento",
      "avaliar nutrição e doença oral",
      "reduzir estresse e risco comportamental",
    ],
    sessions: [
      "fases de vida, vacinação e rastreamento",
      "nutrição, obesidade e dietas terapêuticas",
      "exame oral, dor e indicação de procedimento",
      "comportamento, bem-estar e manejo de baixo estresse",
    ],
  },
  {
    month: 23,
    title: "Geriatria, multimorbidade e cuidados paliativos",
    competence:
      "Priorizar objetivos de cuidado em pacientes frágeis e com múltiplas doenças.",
    objectives: [
      "reconhecer fragilidade e multimorbidade",
      "reduzir risco de polifarmácia",
      "comunicar qualidade de vida e limites",
    ],
    sessions: [
      "envelhecimento, fragilidade e rastreamento",
      "polifarmácia, função renal/hepática e interações",
      "dor crônica, mobilidade e suporte domiciliar",
      "qualidade de vida, paliativos e ética",
    ],
  },
  {
    month: 24,
    title: "Capstone e plano de desenvolvimento seguinte",
    competence:
      "Integrar clínica, cirurgia, comunicação e plano de desenvolvimento futuro.",
    objectives: [
      "resolver caso multissistêmico progressivo",
      "defender plano canino e felino",
      "identificar lacunas e próxima trilha",
    ],
    sessions: [
      "emergência multissistêmica e segurança",
      "caso aberto canino e plano de monitoramento",
      "caso aberto felino e integração cirúrgica",
      "debriefing final, portfólio e retenção",
    ],
  },
];

const digitalAssessmentModes: readonly TrainingAssessmentMode[] = freeze([
  "RECUPERACAO_ATIVA",
  "RACIOCINIO_CASO",
  "SIMULACAO_DIGITAL",
  "DEBRIEFING",
  "RETENCAO_ESPACADA",
]);

const operationalBehaviorsByMonth: Readonly<Record<number, readonly string[]>> =
  Object.freeze({
    1: [
      "historia_exame_estruturados",
      "lista_de_problemas",
      "plano_e_reavaliacao",
    ],
    2: [
      "priorizacao_ABCDE",
      "meta_de_intervencao",
      "reavaliacao_e_escalonamento",
    ],
    3: [
      "exame_cardiovascular",
      "interpretacao_de_tendencias",
      "encaminhamento_seguro",
    ],
    4: [
      "localizacao_respiratoria",
      "minimo_manuseio",
      "escalonamento_respiratorio",
    ],
    5: ["interpretacao_renal", "monitoramento_urinario", "ajuste_terapeutico"],
    6: [
      "reconhecimento_metabolico",
      "seguranca_eletrolitica",
      "monitoramento_glicemico",
    ],
    7: ["investigacao_digestiva", "controle_de_foco", "suporte_nutricional"],
    8: [
      "interpretacao_hematologica",
      "seguranca_transfusional",
      "monitoramento_de_reacao",
    ],
    9: [
      "isolamento_por_sindrome",
      "coleta_segura",
      "stewardship_antimicrobiano",
    ],
    10: [
      "localizacao_neurologica",
      "estabilizacao_toxica",
      "escalonamento_neurologico",
    ],
    11: [
      "prescricao_de_internacao",
      "metas_de_monitoramento",
      "passagem_e_alta",
    ],
    12: [
      "integracao_multissistemica",
      "priorizacao_de_ameaças",
      "plano_contingencial",
    ],
    13: [
      "checklist_perioperatorio",
      "monitoramento_anestesico",
      "recuperacao_segura",
    ],
    14: [
      "estabilizacao_abdominal",
      "controle_de_foco_cirurgico",
      "deteccao_de_complicacao",
    ],
    15: ["suporte_toracico", "drenos_e_obstrucao", "encaminhamento_cirurgico"],
    16: [
      "avaliacao_de_trauma",
      "imagem_musculoesqueletica",
      "seguimento_funcional",
    ],
    17: [
      "correlacao_neurologica",
      "cuidado_perioperatorio",
      "reabilitacao_planejada",
    ],
    18: [
      "descricao_de_lesoes",
      "coleta_dermatologica",
      "stewardship_otologico",
    ],
    19: ["exame_oftalmico", "protecao_da_visao", "encaminhamento_no_tempo"],
    20: [
      "estadiamento_oncologico",
      "comunicacao_de_prognostico",
      "qualidade_de_vida",
    ],
    21: [
      "avaliacao_reprodutiva",
      "estabilizacao_neonatal",
      "ajuste_pediatrico",
    ],
    22: [
      "prevencao_por_ciclo_de_vida",
      "avaliacao_nutricional",
      "manejo_de_baixo_estresse",
    ],
    23: [
      "avaliacao_de_fragilidade",
      "seguranca_na_polifarmacia",
      "objetivos_de_cuidado",
    ],
    24: [
      "integracao_final",
      "plano_de_monitoramento",
      "proximo_objetivo_de_desenvolvimento",
    ],
  });

const teamBehaviorsByMonth: Readonly<
  Record<number, readonly HospitalTeamBehavior[]>
> = Object.freeze({
  1: ["COMUNICACAO_FECHADA", "MONITORAMENTO_DA_SITUACAO"],
  2: [
    "COMUNICACAO_FECHADA",
    "MONITORAMENTO_DA_SITUACAO",
    "APOIO_MUTUO",
    "LIDERANCA",
  ],
  3: ["COMUNICACAO_FECHADA", "HANDOFF", "MONITORAMENTO_DA_SITUACAO"],
  4: ["COMUNICACAO_FECHADA", "APOIO_MUTUO", "LIDERANCA"],
  5: ["HANDOFF", "MONITORAMENTO_DA_SITUACAO"],
  6: ["COMUNICACAO_FECHADA", "HANDOFF"],
  7: ["COMUNICACAO_FECHADA", "MONITORAMENTO_DA_SITUACAO", "APOIO_MUTUO"],
  8: ["COMUNICACAO_FECHADA", "APOIO_MUTUO", "MONITORAMENTO_DA_SITUACAO"],
  9: ["COMUNICACAO_FECHADA", "HANDOFF", "APOIO_MUTUO"],
  10: ["LIDERANCA", "COMUNICACAO_FECHADA", "MONITORAMENTO_DA_SITUACAO"],
  11: ["HANDOFF", "COMUNICACAO_FECHADA", "MONITORAMENTO_DA_SITUACAO"],
  12: ["LIDERANCA", "COMUNICACAO_FECHADA", "APOIO_MUTUO", "HANDOFF"],
  13: ["COMUNICACAO_FECHADA", "APOIO_MUTUO", "MONITORAMENTO_DA_SITUACAO"],
  14: ["LIDERANCA", "COMUNICACAO_FECHADA", "HANDOFF"],
  15: ["COMUNICACAO_FECHADA", "APOIO_MUTUO", "HANDOFF"],
  16: ["HANDOFF", "MONITORAMENTO_DA_SITUACAO"],
  17: ["COMUNICACAO_FECHADA", "HANDOFF", "APOIO_MUTUO"],
  18: ["COMUNICACAO_FECHADA", "HANDOFF"],
  19: ["COMUNICACAO_FECHADA", "LIDERANCA"],
  20: ["COMUNICACAO_FECHADA", "HANDOFF", "APOIO_MUTUO"],
  21: ["LIDERANCA", "COMUNICACAO_FECHADA", "APOIO_MUTUO"],
  22: ["COMUNICACAO_FECHADA", "HANDOFF"],
  23: ["COMUNICACAO_FECHADA", "APOIO_MUTUO", "HANDOFF"],
  24: [
    "LIDERANCA",
    "COMUNICACAO_FECHADA",
    "MONITORAMENTO_DA_SITUACAO",
    "HANDOFF",
  ],
});

const multiprofessionalMonths: readonly number[] = freeze([
  2, 3, 4, 7, 8, 9, 11, 12, 13, 14, 15, 21, 22, 23, 24,
]);

const transferMetricLabels: Readonly<Record<number, string>> = Object.freeze({
  1: "qualidade_da_historia_e_plano_inicial",
  2: "completude_da_reavaliacao_e_escalonamento",
  3: "qualidade_do_handoff_cardiovascular",
  4: "tempo_para_suporte_respiratorio_simulado",
  5: "completude_do_monitoramento_urinario",
  6: "seguranca_do_monitoramento_glicemico",
  7: "completude_do_plano_digestivo",
  8: "seguranca_da_transfusao_simulada",
  9: "adesao_ao_isolamento_e_stewardship",
  10: "tempo_para_estabilizacao_neurologica_simulada",
  11: "completude_da_prescricao_de_internacao",
  12: "integridade_da_priorizacao_multissistemica",
  13: "completude_do_checklist_perioperatorio",
  14: "deteccao_de_complicacao_abdominal",
  15: "seguranca_de_drenos_e_encaminhamento",
  16: "qualidade_do_plano_de_trauma",
  17: "continuidade_do_cuidado_neurologico",
  18: "adequacao_da_coleta_dermatologica",
  19: "tempo_para_protecao_da_visao",
  20: "qualidade_da_comunicacao_oncologica",
  21: "seguranca_da_estabilizacao_neonatal",
  22: "completude_da_prevencao_por_ciclo_de_vida",
  23: "clareza_dos_objetivos_de_cuidado",
  24: "integracao_do_plano_de_desenvolvimento",
});

const spacedReviewDays = freeze([7, 30, 90] as const);
const masteryRule: MasteryRule = freeze({
  knowledgeMinimumPercent: 70,
  criticalObjectiveMinimumPercent: 80,
  criticalDigitalBehaviorGate: true,
  practicalCompetenceClaim: "PROIBIDO_MVP",
});

export const hospitalTrainingBlueprint: HospitalTrainingBlueprint = freeze({
  id: "CVG-HOSPITAL-TRAINING-LOOP",
  version: "1.0.0",
  sequence: freeze([
    "BASELINE",
    "MICROLEARNING",
    "CASO_PROGRESSIVO",
    "SIMULACAO_DIGITAL",
    "DEBRIEFING",
    "RETENCAO_ESPACADA",
    "TRANSFERENCIA_PILOTO",
  ] as const),
  defaultSpacedReviewDays: spacedReviewDays,
  digitalBoundary: "CONHECIMENTO_RACIOCINIO_COMUNICACAO_SIMULADA",
  practicalBoundary: "NAO_COMPROVA_COMPETENCIA_PRATICA",
});

function createHospitalTrainingDesign(month: number): HospitalTrainingDesign {
  const audiences: readonly TrainingAudience[] =
    multiprofessionalMonths.includes(month)
      ? freeze(["VETERINARIO", "ENFERMAGEM_TECNICO", "MULTIPROFISSIONAL"])
      : freeze(["VETERINARIO"]);
  const hospitalBehaviors = operationalBehaviorsByMonth[month] ?? [
    "raciocinio_clinico_estruturado",
  ];
  const teamBehaviors = teamBehaviorsByMonth[month] ?? ["COMUNICACAO_FECHADA"];
  const metricLabel =
    transferMetricLabels[month] ?? "qualidade_da_aplicacao_do_modulo";

  return freeze({
    audiences: freeze([...audiences]),
    hospitalBehaviors: freeze([...hospitalBehaviors]),
    teamBehaviors: freeze([...teamBehaviors]),
    assessmentModes: freeze([...digitalAssessmentModes]),
    spacedReviewDays,
    transferMetric: freeze({
      id: `M${String(month).padStart(2, "0")}-TRANSFER`,
      label: metricLabel,
      cadenceDays: freeze([30, 90] as const),
      collectionMode: "PILOTO_MANUAL",
    }),
    masteryRule,
  });
}

function sessionMinutes(
  month: number,
): readonly [number, number, number, number] {
  if (month === 1) return [120, 120, 120, 60];
  if (month === 12 || month === 24) return [90, 150, 150, 90];
  return [60, 120, 120, 60];
}

function sessionFormat(number: 1 | 2 | 3 | 4): CurriculumSession["format"] {
  if (number === 1) return "ATIVACAO_CASO";
  if (number === 2) return "ESTUDO_GUIADO";
  if (number === 3) return "CASO_PROGRESSIVO";
  return "DEBRIEF_RETENCAO";
}

function createModule(spec: ModuleSpec): CurriculumModule {
  const id = `M${String(spec.month).padStart(2, "0")}`;
  const objectiveIds = spec.objectives.map(
    (_, index) => `${id}-OBJ-${String(index + 1).padStart(2, "0")}`,
  );
  const minutes = sessionMinutes(spec.month);
  const sessions = spec.sessions.map((title, index) => {
    const number = (index + 1) as 1 | 2 | 3 | 4;
    return freeze({
      id: `${id}-S${number}`,
      number,
      title,
      minutes: minutes[index] ?? 0,
      format: sessionFormat(number),
      objectiveIds: freeze([...objectiveIds]),
    });
  });
  return freeze({
    id,
    month: spec.month,
    part: spec.month <= 12 ? "PARTE_1" : "PARTE_2",
    title: spec.title,
    competence: spec.competence,
    objectives: freeze([...spec.objectives]),
    sessions: freeze(sessions),
    caseCount: spec.month === 12 || spec.month === 24 ? 3 : 2,
    minutes: minutes.reduce((total, value) => total + value, 0),
    hospitalTraining: createHospitalTrainingDesign(spec.month),
  });
}

const modules = moduleSpecs.map(createModule);

export const curriculumV3: Curriculum = freeze({
  id: "CVG-CURRICULUM-24M",
  version: "3.0.0",
  title: "Trilha clínica CVG — 24 meses",
  modality: "DIGITAL_ASSINCRONA_CASOS_FICTICIOS",
  species: ["CAES", "GATOS"],
  totalMinutes: modules.reduce((total, module) => total + module.minutes, 0),
  modules: freeze(modules),
  hospitalTrainingBlueprintId: hospitalTrainingBlueprint.id,
});

function createModuleAssessmentBlueprint(
  module: CurriculumModule,
): ModuleAssessmentBlueprint {
  const questionCountsBySession =
    module.month === 2
      ? ([11, 6, 8, 6] as const)
      : module.month === 12 || module.month === 24
        ? ([8, 8, 8, 8] as const)
        : ([8, 8, 8, 7] as const);
  const questionTotal = questionCountsBySession.reduce(
    (total, count) => total + count,
    0,
  );
  const objectiveIds = module.sessions[0]?.objectiveIds ?? [];
  return freeze({
    id: `${module.id}-ASSESSMENT-BLUEPRINT-V1`,
    moduleId: module.id,
    questionCountsBySession,
    questionTotal,
    openResponseCount: module.month === 12 || module.month === 24 ? 3 : 2,
    objectiveIds: freeze([...objectiveIds]),
    assessmentModes: module.hospitalTraining.assessmentModes,
    publicProjectionReady: module.id === "M02",
    publicationAuthorized: false,
  });
}

export const moduleAssessmentBlueprints: readonly ModuleAssessmentBlueprint[] =
  freeze(modules.map(createModuleAssessmentBlueprint));

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
      "Use o algoritmo vigente do CVG baseado na recomendação RECOVER atual.",
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

const b07Sessions = [
  ["B07-S1", "Núcleo clínico e segurança"],
  ["B07-S2", "Emergência e priorização"],
  ["B07-S3", "Internação, monitoramento e integração"],
] as const;

function cognitiveTag(ordinal: number): B07BlueprintItem["cognitiveTag"] {
  if (ordinal <= 20) return "DECISAO_CLINICA";
  if (ordinal <= 28) return "CARACTERISTICA_CHAVE";
  if (ordinal <= 36) return "INTERPRETACAO";
  return "CONHECIMENTO_ESSENCIAL";
}

export const b07Blueprint: B07Blueprint = freeze({
  id: "B07-BLUEPRINT-V1",
  version: "0.1.0",
  items: freeze(
    b07Sessions.flatMap(([sessionId, domain]) =>
      Array.from({ length: 40 }, (_, index) => {
        const ordinal = index + 1;
        return freeze({
          id: `${sessionId}-I${String(ordinal).padStart(3, "0")}`,
          sessionId,
          domain,
          cognitiveTag: cognitiveTag(ordinal),
          format:
            ordinal <= 20
              ? "MELHOR_RESPOSTA"
              : ordinal <= 28
                ? "ASSOCIACAO"
                : "INTERPRETACAO",
          critical: ordinal <= 8,
        });
      }),
    ),
  ),
});
