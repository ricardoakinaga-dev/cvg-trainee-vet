# 0006 — Usuários e Stakeholders

**Projeto:** Sistema CVG de Treinamento Veterinário  
**Status:** modelo de governança mínima segregada aprovado como insumo (D-071); nomeações e aceites pendentes (B-03)

## Usuário primário

### Médico-veterinário colaborador

**Objetivos:**

- Conhecer sua trilha e os critérios;
- Realizar treinamentos teóricos;
- Responder quizzes, casos e provas;
- Receber feedback e reforço;
- Acompanhar progresso, domínio e retenção;
- Contestar questão ou resultado quando necessário.

**Dados necessários:**

- Identificação profissional;
- Vínculo, função e área;
- Trilha e prazos;
- Progresso, respostas, tentativas e notas;
- Feedback e histórico;
- Acomodações de acessibilidade, quando aplicável.

**Limite:** resultado de conteúdo, prova, caso ou simulação digital não equivale a competência prática nem autonomia clínica.

## Usuários secundários

### Mentor ou preceptor

- Acompanhar lacunas autorizadas;
- Orientar plano de reforço;
- Registrar feedback;
- Qualquer atividade ou evidência prática futura permanece fora da primeira versão e bloqueada pelo `GATE-EXP-PRAT-01`.

### Autor ou instrutor

- Propor módulos, objetivos, casos e questões;
- Referenciar fontes;
- Responder a revisões;
- Não publicar o próprio conteúdo sem revisão independente.

### Revisor clínico

- Validar correção científica;
- Verificar atualidade;
- Resolver divergências entre fontes;
- Aprovar ou bloquear publicação.

### Revisor pedagógico

- Validar alinhamento entre objetivo, atividade e avaliação;
- Revisar clareza, dificuldade e qualidade dos itens.

### Gestor educacional

- Definir trilhas, coortes, prazos, pré-requisitos e regras aprovadas;
- Acompanhar métricas;
- Coordenar remediação;
- Manter calendário de revisão.

### Gestor clínico

- Priorizar áreas;
- Aprovar critérios de domínio;
- Interpretar dados com contexto;
- Evitar uso punitivo ou simplista.

## Operadores

### Administrador

- Gerir usuários, papéis e configurações;
- Publicar conteúdo já aprovado;
- Operar integrações futuras;
- Não alterar silenciosamente nota, resposta ou histórico.

### Auditor/compliance

- Consultar trilhas de auditoria;
- Verificar versões, aprovações e alterações;
- Não editar resultados.

### Gestão de pessoas

- Acesso restrito a dados necessários para desenvolvimento e conformidade;
- Não deve receber automaticamente respostas detalhadas ou dados além da finalidade aprovada.

## Decisores

Papéis que precisam ser nomeados:

| Decisão | Papel recomendado | Nome |
|---|---|---|
| Patrocínio e orçamento | patrocinador executivo | MV. Ricardo Akinaga — CEO |
| Coordenação operacional temporária das correções | coordenador geral interino, sem cadeira ou assinatura de gate | MV. Ricardo Akinaga — D-072 |
| Escopo, prioridade e rastreabilidade | product owner, distinto do patrocinador e da coordenação educacional | `VAGO — BLOQUEIA B-03` |
| Segurança clínica e critério clínico | responsável clínico/RT | `VAGO — BLOQUEIA B-03` |
| Modelo pedagógico e operação educacional | coordenador educacional, distinto do PO | `VAGO — BLOQUEIA B-03` |
| Conteúdo, fontes e divergências | comitê científico: RT + 2 clínicos, um de Emergência e um de Internação/Medicina Interna | `VAGO — BLOQUEIA B-03` |
| Dados, privacidade e segurança da informação nesta fase | responsável LGPD/segurança, interno ou externo | `VAGO — BLOQUEIA B-03` |
| Aprovação dos gates | comitê de governança formado pelos titulares obrigatórios acima | `NÃO INSTALADO — BLOQUEIA B-03` |

## Modelo de governança mínima segregada (D-071)

A Alternativa 1 foi selecionada pelo patrocinador em 2026-08-05. A decisão aprova a estrutura e as incompatibilidades abaixo como insumos para correção documental; não nomeia pessoas por inferência e não aprova Discovery ou PRD.

### Registro de nomeações e aceites

| Função | Titular | Suplente | Aceite e início | Estado |
|---|---|---|---|---|
| Patrocinador executivo | MV. Ricardo Akinaga — CEO | `VAGO` | patrocinador confirmado em 2026-08-05; suplência pendente | `PARCIAL` |
| Coordenador geral interino das correções | MV. Ricardo Akinaga | não aplicável; ausência pausa a coordenação | aceite do patrocinador em 2026-08-05 | `ATIVO — SEM CADEIRA OU VOTO DE GATE` |
| Product owner | `VAGO` | `VAGO` | `PENDENTE` | `VAGO — BLOQUEIA B-03` |
| Responsável clínico/RT | `VAGO` | `VAGO` | `PENDENTE` | `VAGO — BLOQUEIA B-03` |
| Coordenação educacional | `VAGO` | `VAGO` | `PENDENTE` | `VAGO — BLOQUEIA B-03` |
| Comitê científico — clínico de Emergência | `VAGO` | `VAGO` | `PENDENTE` | `VAGO — BLOQUEIA B-03` |
| Comitê científico — clínico de Internação/Medicina Interna | `VAGO` | `VAGO` | `PENDENTE` | `VAGO — BLOQUEIA B-03` |
| Responsável LGPD/segurança | `VAGO` | `VAGO` | `PENDENTE` | `VAGO — BLOQUEIA B-03` |

Cada nomeação exige nome profissional completo, função institucional, qualificação aplicável, autoridade e limites, titularidade ou suplência, data de início, aceite explícito e declaração de conflito. Não devem ser versionados CPF, endereço, contato pessoal, assinatura digitalizada ou documento pessoal; a ata de aceite pode permanecer em repositório institucional controlado, com apenas um identificador interno não secreto registrado aqui, nunca URL com token ou contato pessoal.

Qualificações mínimas: o responsável clínico/RT e os revisores clínicos devem ter registro profissional ativo quando aplicável e competência documentada nas áreas sob sua responsabilidade; a coordenação educacional deve demonstrar competência em desenho educacional e avaliação de adultos; o responsável LGPD/segurança deve demonstrar competência em privacidade, proteção de dados e segurança da informação, além de autoridade institucional para bloquear tratamento inadequado. Titulares e suplentes obedecem aos mesmos requisitos.

O comitê de governança não cria uma nova cadeira: é composto pelo patrocinador, PO, responsável clínico/RT, coordenação educacional e responsável LGPD/segurança. Sua instalação exige identificador interno do ato, data de início e mandato; na ausência de prazo menor, o mandato termina com a decisão de encerramento do piloto. O quórum de cada gate corresponde a todas as assinaturas exigidas na matriz abaixo, sem decisão por maioria; impedimento exige suplente e nunca reduz o quórum.

### Coordenação geral interina (D-072)

Enquanto as cadeiras formais permanecerem vagas, MV. Ricardo Akinaga atuará como coordenador geral interino das frentes de correção. Essa função operacional é externa à matriz de assinaturas e termina automaticamente quando B-03 for fechado ou por decisão anterior do patrocinador.

**Pode:** organizar a fila de pendências, convocar reuniões, solicitar evidências, consolidar administrativamente e sincronizar rascunhos, acompanhar prazos e coordenar trabalhos que usem somente dados estritamente agregados e efetivamente anonimizados, sem campos/células vinculáveis ou grupos pequenos reidentificáveis.

**Não pode:** assinar como PO, responsável clínico/RT, coordenação educacional, comitê científico ou LGPD/segurança; emitir parecer independente nessas funções; validar B-04, B-05, B-06 ou B-07 sozinho; fechar B-03; aprovar Discovery/PRD; iniciar SPEC, BUILD, arquitetura, código ou produção de conteúdo clínico.

Se Ricardo contribuir materialmente para o conteúdo de um artefato, será registrado como autor/preparador e ficará impedido de assiná-lo também como patrocinador. O impedimento permanece vinculado à versão e ao commit mesmo após o término de D-072; a aprovação exigirá suplente da cadeira do patrocinador formalmente nomeado, aceito e não impedido, sem redução do quórum. Enquanto esse suplente não existir, o gate permanece bloqueado.

O trabalho pode continuar nos demais itens de correção sem aguardar as nomeações, respeitando suas dependências: B-05 antes de coleta identificável e baseline; B-04 antes de conteúdo clínico; B-03 antes de B-06 formal e antes da nova submissão dos gates. Avanço de correção não significa avanço de fase.

### Segregação e impedimentos

- Patrocinador, PO, responsável clínico/RT, coordenação educacional e responsável LGPD/segurança devem ser pessoas distintas;
- A mesma pessoa não pode assinar duas funções no mesmo gate para simular segregação;
- Autor ou preparador deve se abster totalmente de revisar, votar ou aprovar o próprio artefato, inclusive em decisão colegiada;
- Para uma mesma versão de conteúdo clínico, autor, revisores clínico/pedagógico e votantes da aprovação final devem ser pessoas distintas; membro que tenha revisado deve se abster da aprovação e ser substituído sem redução do quórum;
- Conflito de interesse exige abstenção registrada e atuação de suplente não impedido;
- Ausência, vaga, recusa ou reprovação de signatário obrigatório mantém o gate bloqueado;
- O patrocinador não pode substituir parecer clínico, pedagógico ou LGPD nem conceder waiver contra checklist obrigatório;
- O comitê científico possui três cadeiras — RT, Emergência e Internação/Medicina Interna — e exige três votos elegíveis, por titulares ou suplentes não impedidos; divergência clínica crítica sem consenso bloqueia o item.

### Aprovação dos gates atuais

| Gate | Prepara | Revisões obrigatórias | Aprovação formal |
|---|---|---|---|
| Discovery | PO | usuários, RT, coordenação educacional e LGPD/segurança, todos com parecer explícito sobre o commit | patrocinador + RT + coordenação educacional + LGPD/segurança; PO presta contas e se abstém da aprovação do artefato que preparou |
| PRD | PO | RT, coordenação educacional e LGPD/segurança, todos com parecer explícito sobre o commit | patrocinador + RT + coordenação educacional + LGPD/segurança; PO presta contas e se abstém da aprovação do artefato que preparou |
| Conteúdo clínico | autor | revisor clínico + revisor pedagógico independentes | comitê científico, somente após B-04 e os gates aplicáveis |

SPEC e BUILD continuam bloqueados. Seus aprovadores técnicos deverão ser nomeados antes da abertura dessas fases, sem confundir o RT veterinário com o futuro líder técnico de software.
Antes que qualquer controle técnico de segurança seja desenhado ou implementado, deverá ser nomeado revisor de segurança independente; o responsável conjunto LGPD/segurança desta fase não poderá validar sozinho controle que tenha especificado ou implementado.
O responsável LGPD/segurança tem autoridade para bloquear tratamento, coleta ou acesso incompatível com a política validada. Se redigir ou especificar B-05, a validação deverá ser feita por suplente não impedido ou revisor independente de privacidade/LGPD, com parecer explícito registrado.

### Critério de fechamento de B-03

B-03 permanece `PARCIAL — MODELO APROVADO; NOMEAÇÕES PENDENTES` até que todos os titulares e suplentes sejam nomeados e aceitem, os dois comitês sejam instalados com ato, data e mandato, D-003 a D-007 sejam resolvidas, qualificações e impedimentos sejam verificados e o conjunto receba checkpoint Git e aprovação sobre o commit identificado. Depois do fechamento de B-03, a governança clínica deverá revalidar B-06 como etapa independente.

## Impactados indiretos

- Demais profissionais assistenciais;
- Recepção e atendimento ao tutor;
- Pacientes cães e gatos;
- Tutores;
- Especialistas parceiros;
- Fornecedores de cursos;
- CFMV/CRMV e autoridades, quando aplicável.

## Segmentações necessárias

- Experiência profissional;
- Tempo no CVG;
- Função;
- Área ou especialidade;
- Unidade;
- Turno;
- Nível atual;
- Necessidade de onboarding;
- Necessidade de reciclagem;
- Acessibilidade;
- Tipo de vínculo.

## Matriz resumida de acesso recomendada

| Papel | Próprio progresso | Progresso da equipe | Criar | Revisar | Publicar | Alterar nota | Auditar |
|---|---:|---:|---:|---:|---:|---:|---:|
| Colaborador | sim | não | não | não | não | não | própria contestação |
| Mentor | autorizado | autorizados | não | feedback | não | não | limitado |
| Autor | próprio | não | sim | não aprova o próprio | não | não | conteúdo próprio |
| Revisor clínico | não necessário | não | comentários | sim | não | não | versões |
| Gestor educacional | sim, se necessário | sim | estrutura | sim | conforme segregação | somente fluxo formal | sim |
| Administrador | técnico | conforme regra | não clínico | não clínico | somente aprovado | não silenciosamente | sim |
| Auditor | leitura | leitura autorizada | não | não | não | não | sim |

Essa matriz é uma proposta e deverá ser detalhada no PRD.
