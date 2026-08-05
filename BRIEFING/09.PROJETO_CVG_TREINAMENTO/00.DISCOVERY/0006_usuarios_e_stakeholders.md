# 0006 — Usuários e Stakeholders

**Projeto:** Sistema CVG de Treinamento Veterinário  
**Status:** governança enxuta aprovada por D-076; B-03 fechado para o MVP interno

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

> **Inventário futuro, não autorização de coleta:** os itens abaixo somente poderão ser tratados após a aprovação de B-05. Até lá, D-073/Anexo 0011 permite apenas agregados efetivamente anonimizados; os registros mínimos de nomeação e aceite da governança seguem a seção própria deste documento.

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
- Não publicar módulo clínico sem a segunda conferência de outro MV.

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

## Decisor e responsável pelo MVP interno (D-076)

MV. Ricardo Akinaga é o responsável único pelo MVP interno nesta fase. Ele acumula patrocínio, produto, coordenação educacional, coordenação clínica, operação, dados e segurança. Não são exigidos comitês, suplentes, atas de instalação ou cargos separados.

| Responsabilidade | Responsável | Regra |
|---|---|---|
| Escopo, prioridade e gates documentais | MV. Ricardo Akinaga | decide e registra no Git |
| Modelo educacional e operação | MV. Ricardo Akinaga | coordena o MVP |
| Dados e segurança | MV. Ricardo Akinaga | aplica as regras mínimas aprovadas antes do piloto |
| Conteúdo clínico | MV. Ricardo Akinaga | pode criar e coordenar |
| Revisão antes da publicação clínica | outro médico-veterinário | revisor escolhido por módulo; nome registrado na versão publicada |

### Regra única de segunda conferência

Nenhum módulo clínico é publicado sem revisão de outro médico-veterinário. O revisor não precisa ocupar cargo permanente, ter suplente ou integrar comitê; basta registrar nome, CRMV, data e resultado da revisão no módulo. Rascunhos, documentos de produto e decisões operacionais podem ser preparados e aprovados por Ricardo.

### Estado de B-03

B-03 fica `FECHADO PARA O MVP INTERNO` por D-076. D-071 e D-072 permanecem apenas como histórico e foram substituídas quanto ao modelo vigente. Se o programa crescer, a separação de papéis poderá ser reavaliada sem bloquear a primeira versão.

## Impactados indiretos

- Demais profissionais assistenciais;
- Recepção e atendimento ao tutor;
- Pacientes cães e gatos;
- Tutores;
- Especialistas parceiros;
- Fornecedores de cursos;
- CFMV/CRMV e autoridades, quando aplicável.

## Segmentações necessárias

As segmentações abaixo são candidatas para a futura política. Nenhuma segmentação individual ou combinação reidentificável pode ser coletada antes de B-05; em relatórios agregados, grupos pequenos devem ser suprimidos ou combinados conforme o [Anexo 0011](../90.ANEXOS/0011_politica_conservadora_dados_lgpd.md).

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
| Gestor educacional | sim, se necessário | sim | estrutura | sim | conforme necessidade | somente fluxo formal | sim |
| Administrador | metadados técnicos necessários; sem leitura rotineira de conteúdo pessoal | somente por acesso excepcional, autorizado, temporário e auditado | não clínico | não clínico | somente aprovado | não silenciosamente | eventos técnicos necessários |
| Auditor | leitura | leitura autorizada | não | não | não | não | sim |

Essa matriz é uma proposta e deverá ser validada em B-05 antes de ser detalhada no PRD aprovado. Auditoria e suporte não recebem acesso irrestrito: finalidade, escopo, prazo e registro são obrigatórios.
