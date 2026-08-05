# Anexo 0011 — Política Conservadora de Dados e LGPD

**Projeto:** Sistema CVG de Treinamento Veterinário
**Data do rascunho:** 2026-08-05
**Decisão associada:** D-073 — Alternativa 1
**Status:** `RASCUNHO CONSERVADOR — NÃO APROVADO`
**Bloqueio:** B-05 permanece `PARCIAL — APROVAÇÃO OPERACIONAL PENDENTE`

> Este documento é um rascunho operacional e não autoriza novo tratamento de dados pessoais para Discovery, piloto ou plataforma. Por D-076, MV. Ricardo Akinaga é o responsável por dados e segurança no MVP e aprovará a versão mínima antes do piloto.

## 1. Decisão conservadora vigente antes de B-05

Até a aprovação formal de B-05:

1. nenhuma nova coleta, importação, consulta, gravação, armazenamento ou compartilhamento de dado pessoal de participantes, colaboradores, pacientes ou tutores é autorizada para Discovery, piloto ou plataforma;
2. somente podem ser usados dados estritamente agregados e efetivamente anonimizados, sem chave, código, campo ou combinação que permita vincular o registro a uma pessoa;
3. todos os casos, personagens, respostas e simulações devem ser integralmente fictícios;
4. não podem ser iniciados cadastro individual, diagnóstico, prova, trilha personalizada, painel individual, baseline B-07 ou integração com sistemas do CVG;
5. nenhum dado pode ser usado para RH, punição, decisão disciplinar, ranking ou inferência de competência prática;
6. o trabalho autorizado limita-se a correção documental, desenho de instrumentos vazios, levantamento agregado efetivamente anônimo e preparação da política mínima que Ricardo deverá aprovar.

O registro profissional de MV. Ricardo Akinaga como responsável do MVP por D-076 não autoriza ampliar o tratamento para participantes, pacientes ou tutores.

Dados pseudonimizados, identificadores substituídos por códigos ou tabelas com chave separada continuam tratados como dados pessoais nesta política. A remoção de nome, isoladamente, não prova anonimização.

## 2. Escopo e titulares potenciais

O rascunho cobre qualquer futuro tratamento relacionado ao programa, inclusive dados de:

- colaboradores e candidatos a participante;
- mentores, autores, revisores, gestores e administradores;
- tutores de animais, quando um caso real puder revelar informação sobre pessoa natural;
- pessoas presentes em imagem, áudio, vídeo, chat, documento ou prontuário;
- prestadores e representantes de fornecedores.

Dados relativos ao animal não devem ser automaticamente tratados como livres de risco: texto clínico, prontuário, imagem ou metadado pode identificar ou tornar identificável o tutor, o colaborador ou outra pessoa natural.

## 3. Princípios obrigatórios

Qualquer versão futura deverá demonstrar finalidade específica, adequação, necessidade, livre acesso, qualidade, transparência, segurança, prevenção, não discriminação e prestação de contas. O programa adotará ainda:

- minimização por padrão;
- separação entre aprendizagem e disciplina/RH;
- acesso pelo menor privilégio;
- proibição de reutilização incompatível;
- revisão humana de decisões com impacto relevante;
- rastreabilidade de acesso, alteração, exportação e exclusão;
- proteção desde o desenho e por padrão.

## 4. Agentes de tratamento e governança

| Papel | Situação deste rascunho | Condição para aprovação |
|---|---|---|
| Controlador | `CANDIDATO: Centro Veterinário Guarapiranga — A CONFIRMAR FORMALMENTE` | confirmar a pessoa jurídica que toma as decisões sobre o tratamento |
| Operadores | `NÃO DEFINIDOS` | inventariar plataforma, hospedagem, comunicação, suporte, analytics e demais fornecedores |
| Encarregado/canal | `PENDENTE, SE APLICÁVEL` | definir na política mínima antes do piloto |
| Responsável por dados e segurança do MVP | MV. Ricardo Akinaga | definido por D-076; aprova B-05 sobre commit identificado |

Ricardo pode preparar e aprovar B-05 no modelo enxuto do MVP. A decisão deve identificar a versão e o commit examinados.

### 4.1 Registro nominal mínimo de governança preexistente

O repositório contém o nome e a função profissional informados em D-076. D-073 não amplia esse tratamento. Até B-05 ser aprovado:

- a finalidade fica limitada a responsabilidade, impedimento e evidência de decisão do projeto;
- somente nome profissional, papel, estado do aceite/conflito, data e referência ao ato/commit podem ser registrados;
- CPF, documento, endereço, contato pessoal, assinatura digitalizada e dado não necessário são proibidos no Git;
- o acesso fica limitado aos participantes autorizados do repositório, sem reutilização para treinamento, avaliação ou RH;
- base legal, aviso, prazo de retenção e descarte permanecem `PENDENTES DE VALIDAÇÃO` e deverão ser incluídos no inventário de B-05;
- nova nomeação exige informação prévia sobre esse registro mínimo e não autoriza anexar a ata integral ou documentos pessoais;
- qualquer correção necessária será registrada por processo seguro e auditável.

## 5. Inventário preliminar de tratamentos

Esta tabela descreve necessidades potenciais para futura validação; nenhuma linha autoriza coleta.

| Finalidade candidata | Dados candidatos | Titular | Acesso candidato | Base legal | Retenção | Estado |
|---|---|---|---|---|---|---|
| autenticar e administrar acesso | identificador corporativo, contato profissional, papel e estado da conta | colaborador/operador | administração autorizada | `PENDENTE` | `PENDENTE` | não autorizado |
| entregar trilha e registrar progresso | matrícula, turma, progresso, respostas, tentativas e datas | colaborador | próprio colaborador e funções estritamente necessárias | `PENDENTE` | `PENDENTE` | não autorizado |
| avaliar aprendizagem teórica | respostas, notas, remediações, contestações e decisões | colaborador | matriz candidata da seção 8 | `PENDENTE` | `PENDENTE` | não autorizado |
| manter segurança e auditoria | eventos de autenticação, acesso, alteração e exportação | usuários do sistema | segurança/auditoria autorizada | `PENDENTE` | `PENDENTE` | não autorizado |
| analisar efetividade do programa | indicadores agregados e efetivamente anonimizados | não aplicável se a anonimização for robusta | direção e gestão educacional | validar se permanece fora do escopo da LGPD | revisar necessidade | permitido antes de B-05 somente sob a seção 7 |

Não se adotará consentimento, legítimo interesse, contrato ou outra hipótese como base legal padrão. A base deverá ser escolhida por finalidade e categoria de dado, documentada e validada antes da coleta. Se consentimento for aplicável, seu registro, prova, revogação e efeitos deverão ser definidos; a participação em contexto de trabalho exige análise específica de liberdade e assimetria.

## 6. Dados proibidos nesta fase

Antes de B-05, é proibido inserir ou acessar no programa:

- nome, CPF, e-mail, telefone, matrícula, identificador, IP ou outro dado individual;
- respostas, notas, lacunas, diagnóstico, perfil, turno ou setor vinculável a pessoa;
- dados de saúde, biometria ou outras categorias sensíveis de pessoa natural;
- prontuário, caso real, prescrição, imagem diagnóstica ou relato clínico real;
- nome ou contato de tutor, imagem, voz, vídeo, chat ou gravação;
- credenciais, chaves, senhas, tokens, certificados privados ou segredos;
- planilha ou exportação com linhas individuais, mesmo sem nome;
- combinações de unidade, setor, turno, cargo, especialidade ou tempo de casa que permitam inferir identidade;
- dados reais usados como massa de teste, demonstração ou desenvolvimento.

## 7. Regra para agregados efetivamente anonimizados

Um resultado somente pode circular antes de B-05 quando houver verificação documentada de que não permite identificação razoável, direta ou indireta. Devem ser aplicados, conforme o caso:

1. supressão de campos e combinações raras;
2. generalização de intervalos e categorias;
3. agregação entre turnos/setores quando a segmentação criar grupos pequenos;
4. proibição de liberar linhas individuais ou chaves de ligação;
5. teste de singularidade e risco de reidentificação considerando conhecimento interno do CVG;
6. registro da origem, transformação, responsável pela verificação e finalidade da saída.

Como controle conservador provisório, células com menos de 5 pessoas devem ser suprimidas ou agregadas. Esse limiar é uma proposta técnica interna, não uma exigência legal nem prova suficiente de anonimização. Mesmo grupos maiores devem ser bloqueados quando contexto ou combinação de atributos permitir reidentificação.

## 8. Matriz candidata de acesso futuro

Esta matriz não entra em vigor antes de B-05.

| Papel | Acesso candidato | Vedação |
|---|---|---|
| Colaborador | seus próprios dados, resultados e histórico, com explicação e contestação | dados de terceiros e banco protegido de itens |
| Mentor | lacunas necessárias dos mentorados formalmente atribuídos | exportação ampla, uso disciplinar e acesso fora da atribuição |
| Gestão educacional | agregado; individual somente com finalidade, necessidade e autorização formal validadas | uso para RH, punição ou ranking |
| Gestão de pessoas | somente estado de conclusão/conformidade, se finalidade e base forem validadas | respostas, notas detalhadas, lacunas e perfil de aprendizagem |
| Direção | agregado efetivamente anonimizado | detalhe individual |
| Segurança/auditoria | eventos necessários para investigar segurança e integridade | uso educacional, clínico ou disciplinar incompatível |
| Administrador | metadados técnicos estritamente necessários; acesso excepcional a dado pessoal somente por mecanismo emergencial autorizado, temporário e auditado | consulta rotineira a respostas/notas, exportação ampla e privilégio permanente sem necessidade |
| Suporte/fornecedor | acesso excepcional, temporário, autorizado e auditado | acesso permanente ou uso próprio |

Toda concessão futura deverá ter owner, justificativa, prazo, revisão periódica e revogação no desligamento ou mudança de função.

## 9. Retenção, descarte e preservação

A proposta empresarial registrada em RN-065 — duração do vínculo mais 2 anos — permanece como insumo histórico, não como prazo validado. Ela não autoriza coleta nem retenção.

O cronograma definitivo deverá ser definido por finalidade, categoria de dado e obrigação aplicável, com:

- evento inicial e final de contagem;
- justificativa da necessidade;
- exceções legais e preservação por litígio/incidente;
- eliminação em sistemas primários, cópias, exportações e backups dentro de limites documentados;
- evidência auditável de descarte ou anonimização;
- revisão periódica para excluir o que deixou de ser necessário.

Enquanto não houver cronograma aprovado, nenhum prazo de retenção pessoal entra em vigor porque o tratamento pessoal continua bloqueado.

## 10. Direitos dos titulares e transparência

Antes do tratamento pessoal, deverão existir aviso claro e canal testado para, conforme aplicável:

- confirmação e acesso;
- correção;
- informações sobre finalidade, duração, controlador, compartilhamentos e responsabilidades;
- anonimização, bloqueio ou eliminação quando cabível;
- portabilidade, quando regulamentada e aplicável;
- informação sobre consequências e revogação do consentimento, se essa for a base;
- revisão/contestação de decisão ou nota com impacto relevante.

O procedimento deverá definir autenticação do solicitante, responsáveis, prazos aplicáveis, registro das respostas, exceções e forma de comunicação.

## 11. Fornecedores, compartilhamento e transferência internacional

Nenhum fornecedor pode receber dados pessoais antes de:

1. ser classificado como operador, controlador independente ou outro papel aplicável;
2. ter finalidade, instruções, dados, local de tratamento e suboperadores inventariados;
3. passar por diligência de segurança e privacidade;
4. assumir contrato com confidencialidade, segurança, incidentes, exclusão/devolução, auditoria e subcontratação;
5. ter eventual transferência internacional identificada e validada pelo mecanismo aplicável.

Hospedagem, analytics, e-mail, mensageria, suporte, IA e integrações permanecem `PENDENTES`; sua escolha é assunto de SPEC futura e continua bloqueada pelos gates.

## 12. Segurança mínima a especificar antes da operação

A futura SPEC deverá transformar em controles verificáveis, no mínimo:

- autenticação forte e MFA para funções privilegiadas;
- menor privilégio e revisão periódica de acessos;
- criptografia em trânsito e em repouso, com gestão separada de chaves;
- proibição de segredos no Git e uso de gestor de segredos/variáveis protegidas;
- separação entre produção, teste e desenvolvimento, sem dados pessoais reais fora de produção;
- logs protegidos e minimizados, com alerta para acesso/exportação anômalos;
- backups protegidos, testes de restauração e descarte coerente;
- correção de vulnerabilidades, gestão de ativos e resposta a incidentes;
- testes de autorização e de isolamento entre usuários;
- exportação desabilitada por padrão e liberada somente quando necessária.

Este item define objetivos de controle, não arquitetura, tecnologia ou autorização de BUILD.

## 13. Incidentes de segurança

Antes da operação deverá existir fluxo aprovado para:

1. detectar, conter e preservar evidências sem ampliar a exposição;
2. comunicar imediatamente o incidente ao controlador e a MV. Ricardo Akinaga, responsável por dados e segurança do MVP;
3. registrar natureza, titulares, dados, medidas, riscos, linha do tempo e decisões;
4. avaliar risco ou dano relevante aos titulares;
5. quando aplicável, comunicar ANPD e titulares no prazo regulatório vigente;
6. corrigir a causa, verificar recorrência e acompanhar as medidas.

Na data deste rascunho, a orientação oficial baseada na Resolução CD/ANPD nº 15/2024 informa prazo de 3 dias úteis para a comunicação pelo controlador quando o incidente confirmado puder causar risco ou dano relevante. O operador deve informar o controlador sem demora injustificada. O prazo e o critério deverão ser novamente verificados antes da operação.

## 14. Registros, risco e relatório de impacto

Antes de B-05 ser aprovado, Ricardo deverá validar:

- registro das operações de tratamento;
- inventário de riscos por finalidade e titular;
- teste de necessidade e proporcionalidade;
- decisão fundamentada sobre a necessidade de Relatório de Impacto à Proteção de Dados Pessoais;
- plano de tratamento dos riscos e aceitação formal do risco residual;
- evidências de testes dos controles e do atendimento aos direitos.

## 15. Critérios objetivos para fechar B-05

B-05 somente poderá mudar para `FECHADO` quando houver, no mesmo checkpoint Git:

- [x] responsável por dados e segurança do MVP definido por D-076;
- [ ] controlador e todos os operadores confirmados;
- [ ] inventário completo de dados, titulares, finalidades, fluxos e compartilhamentos;
- [ ] base legal validada separadamente para cada finalidade e categoria de dado;
- [ ] matriz de acesso aprovada e testável;
- [ ] cronograma de retenção e descarte aprovado;
- [ ] aviso de privacidade e canal de direitos definidos;
- [ ] processo de incidente, registros e responsabilidades aprovados;
- [ ] fornecedores, contratos, suboperadores e transferências avaliados;
- [ ] análise de risco concluída e decisão sobre relatório de impacto registrada;
- [ ] regras de anonimização e teste de reidentificação aprovados;
- [ ] aprovação explícita de Ricardo sobre a versão/commit;
- [ ] checkpoint Git validado, sem segredos ou dados pessoais indevidos;

Fechar B-05 não aprova Discovery, PRD, SPEC ou BUILD. Depois do fechamento, qualquer coleta deve respeitar exatamente o escopo aprovado; B-07 continua dependendo de instrumento e coorte próprios.

## 16. Fontes normativas e orientativas

Consultadas em 2026-08-05:

- [Lei nº 13.709/2018 — LGPD, texto compilado](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm), especialmente arts. 5º, 6º, 7º, 11, 12, 15, 16, 17 a 19, 37 a 41 e 46 a 50;
- [Regulamentações da ANPD](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd), incluindo as Resoluções CD/ANPD nº 15/2024 e nº 18/2024;
- [Comunicação de Incidente de Segurança — ANPD](https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis);
- [Guia sobre agentes de tratamento e encarregado — ANPD](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-para-definicoes-dos-agentes-de-tratamento-de-dados-pessoais-e-do-encarregado).

## 17. Registro da pendência

| Item | Estado |
|---|---|
| Rascunho conservador | elaborado por decisão D-073 |
| Autorização para dados pessoais do Discovery, piloto ou plataforma | `NÃO AUTORIZADA`; preservado apenas o registro profissional de D-076 |
| Autorização para casos reais | `NÃO AUTORIZADA` |
| Base legal | `PENDENTE DE VALIDAÇÃO` |
| Retenção definitiva | `PENDENTE DE VALIDAÇÃO` |
| Responsável do MVP por dados e segurança | MV. Ricardo Akinaga — D-076 |
| Aprovação operacional de B-05 | `PENDENTE` |
| B-05 | `PARCIAL — NÃO FECHADO` |
