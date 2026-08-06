# 0006 — Usuários e Stakeholders

**Projeto:** Sistema CVG de Treinamento Veterinário  
**Status:** governança enxuta aprovada por D-076 e atualizada por D-083; público confirmado por D-079; B-02/B-03 fechados

## Usuário primário

### Médico-veterinário colaborador

**Público informado:** aproximadamente 10 médicos-veterinários. Todos participam da primeira aplicação; não é necessário segmentar por setor ou turno nesta fase.

**Objetivos:**

- Conhecer sua trilha e os critérios;
- Realizar treinamentos teóricos;
- Responder quizzes, casos e provas;
- Receber feedback e reforço;
- Acompanhar progresso, domínio e retenção;
- Contestar questão ou resultado quando necessário.

**Dados necessários:**

Por D-077/B-05, a plataforma pode tratar somente:

- nome, identificador interno e login/e-mail profissional;
- módulos atribuídos, progresso, conclusões e datas;
- tentativas, itens/respostas aplicados, notas, remediação e contestações;
- logs mínimos de acesso e auditoria.

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
- Não publicar módulo clínico sem a revisão, a rastreabilidade e a aprovação humana de Ricardo.

### Aprovador clínico

- Papel exercido por MV. Ricardo Akinaga no MVP interno;
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

## Decisor e responsável pelo MVP interno (D-076/D-083)

MV. Ricardo Akinaga é o responsável único pelo MVP interno nesta fase. Ele acumula patrocínio, produto, coordenação educacional, coordenação clínica, operação, dados e segurança. Não são exigidos comitês, suplentes, atas de instalação ou cargos separados.

| Responsabilidade | Responsável | Regra |
|---|---|---|
| Escopo, prioridade e gates documentais | MV. Ricardo Akinaga | decide e registra no Git |
| Modelo educacional e operação | MV. Ricardo Akinaga | coordena o MVP |
| Dados e segurança | MV. Ricardo Akinaga | aplica as regras mínimas aprovadas antes do piloto |
| Conteúdo clínico | MV. Ricardo Akinaga | pode criar e coordenar |
| Revisão e aprovação antes da publicação clínica | MV. Ricardo Akinaga | fonte, data de corte, rubrica/gabarito e decisão registrados na versão |

### Regra de aprovação clínica única

Por D-083, nenhum módulo clínico é publicado sem revisão e aprovação humana de Ricardo. A conferência por outro médico-veterinário deixa de ser obrigatória e passa a ser opcional. Cada versão registra fonte, data de corte científico, rubrica/gabarito testado, data e decisão do aprovador.

### Estado de B-03

B-03 fica `FECHADO PARA O MVP INTERNO` por D-076/D-083. D-071 e D-072 permanecem apenas como histórico e foram substituídas quanto ao modelo vigente. Se o programa crescer, a separação de papéis poderá ser reavaliada sem bloquear a primeira versão.

## Impactados indiretos

- Demais profissionais assistenciais;
- Recepção e atendimento ao tutor;
- Pacientes cães e gatos;
- Tutores;
- Especialistas parceiros;
- Fornecedores de cursos;
- CFMV/CRMV e autoridades, quando aplicável.

## Dimensionamento do público

Por D-079, o público é de aproximadamente 10 veterinários e todos participam da primeira aplicação. Nomes, distribuição por turno, setor, experiência ou outros perfis não são necessários para fechar B-02 nem devem ser registrados no Git.

## Matriz resumida de acesso

| Papel | Acesso aos dados do treinamento |
|---|---|
| Colaborador | seus próprios dados, progresso, tentativas, notas e contestações |
| MV. Ricardo Akinaga | dados necessários para administrar o treinamento e auditar resultados |
| Mentor autorizado por Ricardo | lacunas e plano de remediação somente dos participantes atribuídos |
| Administrador técnico delegado | acesso excepcional, temporário e registrado para suporte |
| Demais gestores | somente indicadores agregados autorizados por Ricardo |

B-05 está fechado por D-077. Qualquer ampliação dessa matriz exige nova decisão antes do acesso.
