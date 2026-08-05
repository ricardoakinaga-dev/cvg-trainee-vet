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

As segmentações abaixo podem ser levantadas de forma agregada para planejar a coorte, mas não entram no cadastro individual do MVP sem nova decisão de Ricardo e atualização do [Anexo 0011](../90.ANEXOS/0011_politica_conservadora_dados_lgpd.md).

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

## Matriz resumida de acesso

| Papel | Acesso aos dados do treinamento |
|---|---|
| Colaborador | seus próprios dados, progresso, tentativas, notas e contestações |
| MV. Ricardo Akinaga | dados necessários para administrar o treinamento e auditar resultados |
| Mentor autorizado por Ricardo | lacunas e plano de remediação somente dos participantes atribuídos |
| Administrador técnico delegado | acesso excepcional, temporário e registrado para suporte |
| Demais gestores | somente indicadores agregados autorizados por Ricardo |

B-05 está fechado por D-077. Qualquer ampliação dessa matriz exige nova decisão antes do acesso.
