import type {
  HospitalTeamBehavior,
  InternalSourceRef,
  TrainingAssessmentMode,
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

export const emergencySources = freeze([
  source("BOOK_ETTINGER_9E", "caps. 119–124", false),
  source(
    "BOOK_JERICO_CAES_GATOS",
    "seções de emergência e terapia intensiva",
    false,
  ),
]);

export const respiratorySources = freeze([
  source("BOOK_ETTINGER_9E", "caps. 90–96 e 123", false),
  source("BOOK_JERICO_CAES_GATOS", "seções de doenças respiratórias", false),
  source("BOOK_FOSSUM_4E", "caps. 29–31", false),
]);

export const resuscitationSources = freeze([
  source("BOOK_ETTINGER_9E", "cap. 123, ressuscitação cardiopulmonar", false),
  source(
    "BOOK_FOSSUM_4E",
    "cap. 12, anestesia e terapia perioperatória",
    false,
  ),
]);

export const surgerySources = freeze([
  source("BOOK_FOSSUM_4E", "caps. 4, 8, 12, 19, 24 e 29–31", false),
  source(
    "BOOK_JERICO_CAES_GATOS",
    "seções de cirurgia e perioperatório",
    false,
  ),
  source("BOOK_ETTINGER_9E", "seções de emergência e perioperatório", false),
]);

export type ModuleSpec = Readonly<{
  readonly month: number;
  readonly title: string;
  readonly competence: string;
  readonly objectives: readonly string[];
  readonly sessions: readonly [string, string, string, string];
}>;

export const moduleSpecs: readonly ModuleSpec[] = [
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

export const digitalAssessmentModes: readonly TrainingAssessmentMode[] = freeze(
  [
    "RECUPERACAO_ATIVA",
    "RACIOCINIO_CASO",
    "SIMULACAO_DIGITAL",
    "DEBRIEFING",
    "RETENCAO_ESPACADA",
  ],
);

export const operationalBehaviorsByMonth: Readonly<
  Record<number, readonly string[]>
> = Object.freeze({
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
  9: ["isolamento_por_sindrome", "coleta_segura", "stewardship_antimicrobiano"],
  10: [
    "localizacao_neurologica",
    "estabilizacao_toxica",
    "escalonamento_neurologico",
  ],
  11: ["prescricao_de_internacao", "metas_de_monitoramento", "passagem_e_alta"],
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
  18: ["descricao_de_lesoes", "coleta_dermatologica", "stewardship_otologico"],
  19: ["exame_oftalmico", "protecao_da_visao", "encaminhamento_no_tempo"],
  20: [
    "estadiamento_oncologico",
    "comunicacao_de_prognostico",
    "qualidade_de_vida",
  ],
  21: ["avaliacao_reprodutiva", "estabilizacao_neonatal", "ajuste_pediatrico"],
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

export const teamBehaviorsByMonth: Readonly<
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

export const multiprofessionalMonths: readonly number[] = freeze([
  2, 3, 4, 7, 8, 9, 11, 12, 13, 14, 15, 21, 22, 23, 24,
]);

export const transferMetricLabels: Readonly<Record<number, string>> =
  Object.freeze({
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
