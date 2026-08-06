# Anexo 0020 — Alinhamento de produto e arquitetura antes da SPEC

**Projeto:** Sistema CVG de Treinamento Veterinário
**Data:** 2026-08-06
**Patrocinador:** MV. Ricardo Akinaga
**Status:** `PACOTE_RECOMENDADO_AGUARDA_APROVACAO`
**Regra de avanço:** nenhuma SPEC ou construção começa antes da aprovação das decisões D-091 a D-100 e dos gates canônicos.

## 1. Resultado do alinhamento

O pedido do patrocinador confirma como direção do produto:

1. tela de login individual;
2. administração da própria conta, e-mail profissional e senha;
3. dashboard de administração e moderação;
4. tela individual de resumo e evolução do treinamento;
5. canal para registrar bugs, erros, correções e melhorias;
6. KPIs simples, úteis e não punitivos;
7. banco de dados e arquitetura construídos com práticas atuais;
8. uso de RAG somente se trouxer valor real para consulta técnica;
9. alinhamento completo desses pontos antes da SPEC.

Esses nove itens formam D-090. As decisões de implementação e fronteira abaixo ainda aguardam aprovação do patrocinador.

## 2. Conclusões da pesquisa

### 2.1 Identidade e acesso

Para um sistema interno pequeno, a opção mais segura e econômica é usar um provedor de identidade gerenciado em vez de implementar armazenamento e recuperação de senhas no banco da aplicação. O produto continua oferecendo cadastro, senha, recuperação e administração de conta, mas os segredos ficam sob o mecanismo especializado.

NIST diferencia níveis de garantia e recomenda autenticação multifator como opção já no nível básico; contas com acesso administrativo justificam proteção mais forte. OWASP recomenda senhas longas, compatibilidade com gerenciadores, bloqueio de senhas comprometidas, recuperação segura, reautenticação para ações sensíveis e sessões protegidas. Fontes: [NIST SP 800-63B](https://pages.nist.gov/800-63-4/sp800-63b.html), [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) e [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).

### 2.2 Permissões

Autenticação não substitui autorização. A regra será negar por padrão, conceder o mínimo necessário e conferir a permissão no servidor para cada recurso. O banco pode aplicar segurança por linha como segunda barreira. OWASP recomenda mínimo privilégio, negação por padrão e validação em toda requisição; PostgreSQL oferece políticas por linha e comportamento `default deny` quando RLS está habilitado sem política aplicável. Fontes: [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) e [PostgreSQL Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html).

### 2.3 Acessibilidade e experiência

Login, formulários, dashboards, mensagens de erro e indicadores devem atingir WCAG 2.2 nível AA. Isso inclui navegação por teclado, foco visível, identificação e sugestão de erro, alvos adequados, autenticação compatível com gerenciadores de senha e mensagens de estado anunciadas por tecnologias assistivas. Fonte: [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/).

### 2.4 Telemetria e aprendizagem

Logs operacionais precisam de esquema estável e correlação por identificador de requisição; não devem registrar senha, token ou resposta de avaliação. OpenTelemetry recomenda logs estruturados e correlacionáveis com traces. Para eventos educacionais, o projeto adotará um vocabulário próprio pequeno, inspirado no modelo de eventos da xAPI, sem implantar um LRS no MVP. Fontes: [OpenTelemetry — Logs](https://opentelemetry.io/docs/concepts/signals/logs/) e [ADL xAPI Profile Guidelines](https://profiles.adlnet.gov/).

### 2.5 RAG

RAG pode melhorar busca técnica, mas não transforma automaticamente a resposta em fonte confiável. Um sistema futuro precisa de proveniência, controle de acesso por trecho, citações, integridade do corpus, avaliação de recuperação e comportamento de recusa. A documentação da OpenAI mostra que busca em arquivos usa vector stores e pode devolver citações; o próprio cookbook recomenda avaliar recuperação com conjunto verificado. OWASP acrescenta controles contra envenenamento, vazamento entre escopos e respostas sem atribuição. Fontes: [OpenAI Retrieval](https://developers.openai.com/api/docs/guides/retrieval), [OpenAI File Search](https://developers.openai.com/api/docs/guides/tools-file-search), [avaliação de File Search](https://developers.openai.com/cookbook/examples/file_search_responses#evaluating) e [OWASP RAG Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/RAG_Security_Cheat_Sheet.html).

## 3. Arquitetura recomendada para o MVP

```text
Navegador responsivo
        │
        ▼
Aplicação web em monólito modular
        │
        ├── identidade, conta e permissões
        ├── treinamento, conteúdo e avaliações
        ├── progresso, correções e retenção
        ├── feedback de produto
        ├── dashboards e KPIs
        └── auditoria e operação
        │
        ├── autenticação gerenciada
        ├── PostgreSQL gerenciado
        ├── armazenamento privado somente de ativos autorais permitidos do CVG
        ├── tarefas agendadas simples
        └── logs, erros, alertas e backups
```

Esta é uma inferência arquitetural proporcional à coorte de aproximadamente dez usuários. Microsserviços, Kafka, Redis, data warehouse, BI externo e banco vetorial dedicado adicionariam operação sem benefício demonstrado no MVP.

“Ativos CVG” significa somente material autoral permitido para a plataforma. PDFs-fonte, páginas, trechos extraídos, OCR, embeddings e cópias das obras permanecem fora do armazenamento da aplicação.

### 3.1 Fronteiras do monólito

| Módulo | Responsabilidade |
|---|---|
| identidade | convite, conta, sessão, papel e estado da conta |
| aprendizagem | trilha, módulo, sessão, atribuição e progresso |
| conteúdo | versão, aprovação, validade, publicação e retirada |
| avaliação | tentativa, resposta, rubrica, correção, remediação e retenção |
| evolução | indicadores individuais e agregados autorizados |
| feedback | bugs, usabilidade, erro de conteúdo e melhorias |
| governança | contestação, ajuste de nota, auditoria e decisões |
| operação | telemetria, tarefas, alertas, backup e restauração |

## 4. Telas do MVP

### 4.1 Acesso e conta

| Tela | Conteúdo mínimo |
|---|---|
| Login | e-mail profissional, senha, mostrar/ocultar senha, entrar e recuperar acesso |
| Aceitar convite | confirmar e-mail, definir senha e ativar conta |
| Recuperar senha | solicitar link de uso único sem revelar se a conta existe |
| Minha conta | nome, identificador interno somente leitura, e-mail profissional, estado da conta, alterar senha e encerrar outras sessões |

Não haverá cadastro público. As contas serão criadas por convite do administrador. Avatar, telefone, turno, setor, endereço e outros campos não entram no MVP.

### 4.2 Dashboard do participante

Ordem recomendada:

1. próxima ação única;
2. progresso geral da trilha e do módulo atual;
3. sessões concluídas e pendentes;
4. correções humanas pendentes e respectivo prazo;
5. objetivos em reforço e revisões de retenção;
6. evolução por competência, sem ranking;
7. histórico de módulos, tentativas, resultados e contestações;
8. acesso a “Minha conta” e “Relatar problema ou melhoria”.

### 4.3 Dashboard de administrador e moderador

O dashboard usa a mesma estrutura visual, mas cada cartão e lista respeita o escopo da permissão.

| Área | Administrador | Moderador |
|---|---|---|
| contas | criar convite, ativar/desativar, atribuir papel e trilha | somente consultar participantes autorizados |
| acompanhamento | toda a coorte | participantes atribuídos |
| correções | fila completa e distribuição | fila atribuída |
| conteúdo | estados, validade, aprovação e publicação conforme capacidade | sinalizar problema e acompanhar revisão |
| feedback | priorizar, atribuir e encerrar | triar e tratar itens atribuídos |
| operação | saúde, erros, tarefas e auditoria | sem acesso a segredos ou detalhes de infraestrutura |

Cartões mínimos: usuários convidados/ativos; conclusão no prazo; progresso mediano; inatividade; correções pendentes e SLA; remediações; conteúdos próximos da revisão; bugs/erros abertos; falhas técnicas recentes.

## 5. Papéis e capacidades

| Capacidade | Participante | Moderador | Administrador |
|---|---:|---:|---:|
| ver e editar os próprios campos permitidos | sim | sim | sim |
| ver o próprio treinamento | sim | sim | sim |
| ver participantes atribuídos | não | sim | sim |
| corrigir respostas atribuídas | não | sim | sim |
| triar feedback | não | sim | sim |
| gerenciar contas, papéis e trilhas | não | não | sim |
| consultar auditoria completa | não | não | sim |
| alterar nota diretamente | não | não | não — somente fluxo versionado |
| aprovar conteúdo clínico | não | não | somente com capacidade `CLINICAL_APPROVER` |

No MVP, `CLINICAL_APPROVER` pertence exclusivamente a MV. Ricardo Akinaga. Mentor, suporte e auditor serão capacidades escopadas ou temporárias, não novos papéis permanentes sem necessidade demonstrada.

Ricardo autoriza por registro auditável toda concessão ou revogação de administrador e moderador. O administrador executa a gestão aprovada, mas o sistema impede qualquer pessoa de conceder `CLINICAL_APPROVER`; essa capacidade é criada somente para a identidade de Ricardo no bootstrap controlado. Moderador recebe participantes e filas explicitamente atribuídos, com data de início/fim opcional, e perde o acesso assim que a atribuição ou conta for revogada.

## 6. Regras de autenticação e conta recomendadas

1. convite somente para e-mail profissional;
2. e-mail verificado antes da ativação;
3. autenticação e recuperação por provedor gerenciado;
4. senha mínima de 15 caracteres quando sem MFA ou 8 com MFA, máximo aceito de pelo menos 64, sem regras artificiais de composição e sem troca periódica obrigatória;
5. bloqueio de senhas comuns ou comprometidas;
6. MFA obrigatório para administrador e moderador; disponível para participante;
7. sessão em cookie `HttpOnly`, `Secure` e `SameSite=Lax`, nunca em `localStorage`; requisições mutáveis exigem proteção CSRF adicional;
8. reautenticação para mudar e-mail, senha, papel ou permissões;
9. recuperação com link aleatório, expirável e de uso único;
10. desativação encerra sessões e preserva o histórico educacional;
11. nenhum segredo, token ou senha entra nos logs ou no banco comum da aplicação;
12. convite e recuperação usam link aleatório, de uso único, válido por 30 minutos, invalidado ao trocar senha/e-mail ou solicitar novo link;
13. autenticação aplica atraso progressivo por conta e origem após cinco falhas, rate limiting e resposta uniforme para impedir enumeração, sem bloqueio permanente automático;
14. a sessão e o identificador CSRF são rotacionados após login, recuperação, troca de senha/e-mail ou mudança de papel;
15. expiração por inatividade: 30 minutos para administrador/moderador e 8 horas para participante; duração absoluta máxima de 12 horas, com reautenticação sem perda do progresso salvo.

## 7. Feedback, bugs, correções e melhorias

O produto terá o comando persistente **“Relatar problema ou melhoria”**.

### 7.1 Tipos

- `BUG_TECNICO` — falha, travamento, perda ou comportamento incorreto;
- `USABILIDADE` — dificuldade de navegação ou entendimento da interface;
- `ERRO_CONTEUDO` — possível erro, ambiguidade ou desatualização clínica;
- `MELHORIA` — sugestão de produto ou treinamento;
- `CONTESTACAO` — redirecionada ao fluxo formal existente de questão/resultado.

### 7.2 Dados mínimos

`ticket_id`, tipo, categoria, descrição de até 2.000 caracteres, página lógica, versão da aplicação, autor, datas, responsável, prioridade, estado e resolução. Não coletar automaticamente resposta de avaliação, URL com parâmetros, IP completo, gravação de tela, áudio, vídeo ou captura de prontuário. Não haverá anexos no MVP.

Antes do envio, o formulário avisa para não incluir paciente, tutor, prontuário, imagem, prescrição ou caso real. A entrada passa por validação de tamanho/formato e detecção preventiva de padrões; achado suspeito é bloqueado para correção. Se dado proibido escapar, o relato é colocado em acesso restrito, o trecho é removido ou redigido e o incidente fica auditado antes da triagem continuar.

### 7.3 Estados

`NOVO → TRIADO → EM_TRATAMENTO → AGUARDA_USUARIO → RESOLVIDO`, com saídas `DUPLICADO`, `NAO_REPRODUZIDO` e `NAO_PLANEJADO` justificadas.

### 7.4 Roteamento

- risco clínico ou erro de conteúdo: alerta imediato a Ricardo e possibilidade de retirada;
- falha que bloqueia login, salvamento ou submissão: prioridade alta;
- contestação: protocolo auditável separado;
- melhoria: priorização por impacto, frequência e esforço.

O participante acompanha seus próprios relatos. Administrador e moderador veem somente o escopo autorizado.

## 8. KPIs simples

### 8.1 Participante

| KPI | Apresentação |
|---|---|
| progresso da trilha | concluído ÷ obrigatório |
| progresso do módulo | sessões concluídas ÷ quatro |
| próxima ação | atividade elegível de maior prioridade |
| correções pendentes | quantidade e prazo esperado |
| reforços pendentes | objetivos em remediação |
| retenções pendentes | revisões 30/60/90 dias elegíveis |
| evolução | resultado por competência e período, sem comparação entre colegas |

### 8.2 Administração e moderação

| KPI | Fórmula ou leitura |
|---|---|
| ativação | contas ativadas ÷ convidadas elegíveis |
| usuários ativos | acesso ou atividade educacional nos últimos 14 dias |
| conclusão no prazo | módulos concluídos no prazo ÷ elegíveis |
| progresso mediano | mediana do progresso dos elegíveis |
| correções no SLA | correções dentro de cinco dias úteis ÷ concluídas |
| fila de correção | abertas, vencendo e vencidas |
| remediação | participantes/objetivos em reforço e recuperados |
| conteúdo | válido, próximo da revisão, vencido ou retirado |
| feedback | abertos por tipo/prioridade e tempo mediano de resolução |
| confiabilidade | erros por sessão, falhas de salvamento/submissão e disponibilidade |

Todos os cartões exibem numerador, denominador, período e data de atualização. Com uma coorte pequena, não haverá ranking, percentis individuais nem falsa precisão estatística.

### 8.3 Regras comuns do dicionário de KPIs

1. fuso oficial: `America/Sao_Paulo`; dias fecham às 23h59min59s locais;
2. elegível: conta ativa com trilha/módulo atribuído no período; conta ainda não ativada entra somente em ativação;
3. exclusões: atribuição futura, conta desativada antes do período e afastamento/acomodação formalmente registrados; quantidade e motivo aparecem junto do KPI;
4. dado faltante nunca vira zero; o cartão mostra `DADO_INCOMPLETO` e a quantidade afetada;
5. denominador zero mostra `NÃO_APLICÁVEL`, nunca `0%` ou `100%`;
6. painel individual atualiza em até 60 segundos após evento confirmado; cartões administrativos educacionais em até 15 minutos; saúde/alertas em até 5 minutos;
7. moderador agrega apenas participantes/filas atribuídos; administrador agrega a coorte autorizada; filtros não podem ampliar o escopo;
8. taxas usam contagem de pessoas ou eventos explicitada no cartão; progresso da coorte usa mediana para reduzir distorção na amostra pequena;
9. toda mudança de fórmula ou regra cria nova versão e preserva o valor histórico calculado pela regra vigente.

## 9. Banco de dados e auditoria

Recomendação: PostgreSQL gerenciado, modelo relacional normalizado e migrações versionadas.

Princípios:

1. identidade do provedor separada do perfil educacional;
2. chaves internas aleatórias e e-mail não usado como chave primária;
3. autorização no servidor e RLS como defesa adicional;
4. tentativa congela versões de item, rubrica e regra;
5. submissão e cálculo usam transação e idempotência;
6. correção cria nova versão, nunca sobrescreve silenciosamente;
7. auditoria separada de logs operacionais;
8. índices derivados de consultas reais, não antecipados;
9. backups automáticos e restauração testada;
10. views SQL versionadas para KPIs; sem data warehouse no MVP.

## 10. Observabilidade e melhoria contínua

O MVP registra logs estruturados com `request_id`, rota lógica, resultado, latência, versão e código de erro. Tokens, senhas, respostas e texto clínico livre são removidos. Exceções de frontend e backend, disponibilidade, falhas de login, salvamento e submissão geram alertas.

Session replay, gravação de tela e analytics comportamental invasivo ficam fora do MVP. Métricas de produto usam somente eventos necessários para progresso, operação e feedback.

## 11. Decisão recomendada sobre RAG

**Não construir RAG no MVP.** O participante já precisa pesquisar nas obras e responder com curiosidade; uma resposta pronta da IA poderia reduzir esse objetivo pedagógico. Além disso, D-033 mantém OCR, embeddings e processamento automatizado dos PDFs fora do MVP.

Preparar apenas a pista de evolução:

- registro de obra, edição, capítulo/seção, versão e data de corte;
- vínculo entre conteúdo CVG e fontes consultadas;
- conteúdo autoral do CVG estruturado e versionado;
- nenhum PDF, trecho extraído ou embedding na aplicação inicial.

Se D-033 for aberta no futuro, o primeiro RAG será restrito a autor/revisor, com citações obrigatórias, filtro por versão, recusa quando não houver evidência, corpus aprovado, avaliação humana e testes de recuperação. PostgreSQL com extensão vetorial ou File Search gerenciado serão comparados somente nessa fase.

## 12. Agente de IA para apoiar a operação

A recomendação é usar IA como **assistente operacional**, nunca como banco de dados, relógio, calculadora de nota ou autoridade clínica. Agenda, estados, permissões, prazos, cálculo de progresso e transições do workflow permanecem determinísticos no sistema. A IA pode resumir filas, sugerir prioridade, preparar mensagens internas, investigar erros e recomendar a próxima ação, sempre por ferramentas com escopo limitado e saída validada.

### 12.1 Roteamento recomendado de modelo

| Trabalho | Rota inicial | Regra |
|---|---|---|
| resumo de fila, categorização e texto operacional | `gpt-5.6-luna`, esforço `medium` | menor custo/latência; saída estruturada e revisável |
| investigação difícil, planejamento ou ambiguidade relevante | `gpt-5.6-luna`, esforço `high` | usar somente quando o caso justificar mais raciocínio |
| tarefa excepcional que falha nos testes com Luna | `gpt-5.6-terra`, esforço calibrado | escalar por evidência, não por padrão |
| publicação clínica, alteração de nota/permissão ou ação externa | nenhuma decisão autônoma | exige regra determinística e/ou aprovação humana aplicável |

A documentação oficial posiciona `gpt-5.6-luna` para cargas eficientes e de alto volume, `gpt-5.6-terra` como equilíbrio entre desempenho e custo e recomenda calibrar o esforço com avaliações representativas. Fonte: [OpenAI — Using GPT-5.6](https://developers.openai.com/api/docs/guides/latest-model).

### 12.2 Controles mínimos

1. permitir somente ferramentas necessárias à tarefa e negar o restante;
2. validar entrada, saída e permissão antes de executar qualquer ação;
3. registrar modelo, esforço, versão do prompt, ferramentas e desfecho, sem senha, token ou resposta clínica livre;
4. impor limites de custo, chamadas, tempo e tentativas por execução;
5. exigir confirmação humana para publicar conteúdo clínico, alterar nota/gabarito/permissão, retirar conteúdo por risco ou enviar comunicação externa;
6. medir sucesso, custo, latência, erros e taxa de escalonamento em um conjunto de tarefas reais antes de promover configuração;
7. permitir desligar o agente sem interromper login, treinamento, avaliações ou dashboards.
8. tratar mensagem de usuário, ticket, conteúdo educacional e retorno de ferramenta como dados não confiáveis, nunca como nova instrução de sistema; tentativas de prompt injection são recusadas e registradas;
9. propagar a identidade, o papel e o escopo do solicitante em cada ferramenta; o agente não usa conta superadministradora compartilhada nem amplia a permissão do usuário;
10. enviar ao modelo somente os campos mínimos necessários, preferindo agregados e identificadores internos a texto livre ou dados pessoais;
11. registrar toda aprovação humana com aprovador, ação exata, parâmetros, horário e resultado; aprovação genérica não autoriza ações posteriores diferentes.

O ponto de partida econômico é Luna `medium`, com Luna `high` acionada para exceções complexas. Se Ricardo preferir simplicidade operacional acima da economia máxima, Luna `high` pode ser o perfil único do piloto, desde que o teto de custo seja configurado e medido.

## 13. Decisões antes da SPEC

| ID | Decisão | Recomendação | Estado |
|---|---|---|---|
| D-090 | superfícies obrigatórias do produto | login, conta, dashboards, evolução, feedback e KPIs simples | direção confirmada pelo pedido de 2026-08-06 |
| D-091 | modelo de autenticação | convite + provedor gerenciado + MFA admin/mod + sessão, CSRF, recuperação e rate limiting da seção 6 | aguarda aprovação |
| D-092 | papéis do MVP | participante, moderador e administrador; concessão auditada e aprovação clínica exclusiva de Ricardo | aguarda aprovação |
| D-093 | dashboards | painel individual em tempo quase real e painel administrativo/moderação por escopo | aguarda aprovação |
| D-094 | feedback | formulário sem anexo, prevenção/remoção de dado proibido, triagem e contestação separada | aguarda aprovação |
| D-095 | KPIs do MVP | conjunto e dicionário da seção 8, sem ranking ou BI externo | aguarda aprovação |
| D-096 | arquitetura | monólito modular web + autenticação e PostgreSQL gerenciados | aguarda aprovação |
| D-097 | RAG | fora do MVP; preparar metadados e reavaliar após D-033 | aguarda aprovação |
| D-098 | observabilidade e recuperação | logs estruturados, captura de erros, alertas, backups e teste de restauração | aguarda aprovação |
| D-099 | acessibilidade | WCAG 2.2 AA em login, formulários, treinamento e dashboards | aguarda aprovação |
| D-100 | agente operacional de IA | controle determinístico + Luna adaptativa, ferramentas escopadas, proteção contra injection e aprovação auditada | aguarda aprovação |

## 14. Definition of Ready da SPEC

A SPEC somente poderá começar quando:

- [ ] D-091 a D-100 aprovadas ou ajustadas;
- [ ] matriz de capacidades aceita;
- [ ] telas e cartões mínimos aceitos;
- [ ] fluxo de feedback e dados mínimos aceitos;
- [ ] catálogo de KPIs aceito;
- [ ] fronteira de RAG confirmada;
- [ ] papel, autonomia, roteamento e teto de custo do agente de IA confirmados;
- [ ] critérios de escolha do fornecedor definidos;
- [ ] RPO/RTO e política de sessão definidos na SPEC readiness;
- [ ] B-07 e gates Discovery/PRD tratados conforme governança canônica.

## 15. Método de pesquisa

Foram pesquisados autenticação, autorização, acessibilidade, segurança por linha, observabilidade, eventos educacionais, RAG e seleção de modelo. A síntese priorizou fontes primárias e oficiais de NIST, OWASP, W3C, PostgreSQL, OpenTelemetry, ADL e OpenAI. As escolhas de escala, simplicidade e roteamento de IA são inferências para a coorte informada de aproximadamente dez veterinários e deverão ser validadas durante a SPEC readiness.
