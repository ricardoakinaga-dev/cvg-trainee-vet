# 0006 — Usuários e Stakeholders

**Projeto:** Sistema CVG de Treinamento Veterinário  
**Status:** papéis definidos; nomes pendentes

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
| Escopo e prioridade | product owner | PENDENTE |
| Critério clínico | diretor/coordenação clínica ou RT | PENDENTE |
| Conteúdo e fonte | comitê científico | PENDENTE |
| Modelo pedagógico | coordenador educacional | PENDENTE |
| Dados e LGPD | encarregado/responsável | PENDENTE |
| Segurança | responsável de segurança | PENDENTE |
| Aprovação dos gates | comitê de governança | PENDENTE |

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
