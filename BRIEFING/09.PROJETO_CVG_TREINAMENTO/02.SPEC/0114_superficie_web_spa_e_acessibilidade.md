# 0114 — Superfície Web/SPA e Acessibilidade

## 1. Direção de implementação

`apps/web` usa React/Next.js com renderização server-first quando não houver interação local necessária. Componentes interativos ficam isolados, recebem DTOs públicos tipados e não acessam banco, Qdrant, IA ou segredo. Formulários compartilham schemas de contrato e exibem erro por campo sem vazar detalhes internos.

## 2. Superfícies

| Área | Rotas/superfícies | Estado principal |
|---|---|---|
| acesso | login, convite, recuperação, conta | não autenticado/autenticado/erro |
| participante | próxima ação, trilha, módulo, sessão, tentativa, resultado | disponível/em andamento/retomável/concluído |
| progresso | evolução, remediação, retenção e histórico | vazio/carregando/erro/sem permissão |
| relatos | criar e acompanhar feedback/contestação | novo/triado/em tratamento/resolvido |
| operação | contas, atribuições, filas, conteúdo e indicadores | escopado por papel |
| autoria | rascunho, fonte interna, protocolo, revisão, busca Qdrant e sugestão IA | somente papéis internos |

## 3. Estados de experiência

Toda rota possui estados explícitos de `loading`, `ready`, `empty`, `error`, `forbidden`, `stale` e `retry`. Mutação usa feedback de envio, bloqueio contra duplo clique, idempotência e recuperação de timeout sem apagar rascunho.

O web nunca calcula nota oficial, autorização, transição, próxima ação ou estado clínico. Ele mostra a projeção da API e invalida/refaz query após mutação confirmada. Na jornada participante, uma CTA de atividade só aparece para o `nextActionTarget` server-side já contido na projeção autorizada; a seleção mantém a sessão, codifica `activityId` no query string e não transforma o deep link em autorização.

Na tentativa corrigida, a web consulta o endpoint público existente de feedback
e mantém um estado separado para `loading`, resultado disponível, ausência
`not_found`, erro e retry. O cartão renderiza somente score, outcome, feedback
plain text e a `nextAction` já recebida do servidor. Para tentativa submetida ou
aguardando revisão humana sem resultado, mostra “A correção digital ainda não
está disponível.”; não calcula nota, não expõe `resultId`, `correctedBy`,
`ruleVersion`, gabarito, fonte ou resposta.

## 4. Acessibilidade e segurança de conteúdo

- WCAG 2.2 AA: teclado, foco visível, labels, contraste, semântica, live regions e mensagens de erro associadas;
- navegação responsiva para celular e computador sem exigir app nativo;
- nenhum HTML livre vindo do usuário; conteúdo autoral passa por sanitizer/renderer seguro;
- não renderizar Markdown/HTML produzido por IA sem sanitização e aprovação;
- telas de participante não contêm fonte, autor, obra, capítulo, página, PDF, foto, tabela, link de terceiro, prompt, gabarito ou metadado interno;
- erros exibidos são amigáveis; detalhes técnicos aparecem somente em `request_id` e suporte interno autorizado.
- o resultado digital inclui disclaimer de evidência formativa e não sugere competência prática, autonomia clínica ou autorização de procedimento;

## 5. Verificações do web

- testes de componente para estados e permissões;
- testes de contrato para garantir que DTO público não tenha chaves internas;
- Playwright para login, convite, retomada, submissão, feedback e bloqueio de acesso cruzado;
- axe/checagem automatizada mais revisão manual de teclado e foco;
- screenshot apenas de interfaces sintéticas, sem conteúdo clínico real ou fonte protegida;
- teste de segurança que tenta injetar HTML, prompt, URL externa e dados proibidos em campos livres.

## 6. Implementação verificada no BUILD F3-S4 e item 9

`apps/web` já possui uma superfície inicial de participante para aceite de convite, leitura de atividade atribuída, início de tentativa, salvamento de resposta, submissão e leitura do feedback de correção digital persistido. A página consome somente envelopes públicos da API, mantém a sessão em cookie e não modela fonte, foto, PDF, OCR, prompt, gabarito ou identificadores internos proibidos.

O E2E participante cobre o cartão de resultado corrigido, a restauração da
tentativa e o estado bounded quando o feedback ainda não existe. O endpoint
continua sendo a autoridade para o resultado; a UI apenas projeta o contrato e
reutiliza a próxima ação server-side.

Na superfície interna de operações, a seção de participação digital consome o
relatório escopado de `UC-016`, permite filtrar módulo e status da conta por
query autorizada no servidor e mostra minutos/horas do catálogo com o aviso de
que não são horas CPD credenciadas nem evidência de competência prática. A
interface não exibe IDs de participante, escopos, fontes, gabaritos ou
certificados.

As ações de reenvio e mudança de status usam o `scopeIds` interno do
participante retornado pelo dashboard para selecionar um membership autorizado
mesmo quando a conta aparece em mais de um escopo; esse metadado não é
renderizado e a API continua exigindo a validação server-side do escopo.

Na superfície `/operations`, uma conta de participante `ACTIVE` pode iniciar a
recuperação controlada após confirmação explícita. A tela exibe o token somente
na resposta autorizada, sinaliza que ele é de uso único e não registra ou envia
o valor a analytics; contas inativas não exibem essa ação. A rota pública
`/recovery?token=...` remove o token da URL antes de concluir o aceite, envia o
token somente ao endpoint anônimo de recuperação e mostra estados de validação,
sucesso e erro sem revelar a causa específica. A nova sessão é entregue pelo
cookie seguro da API; a web não armazena senha nem tenta reativar conta.

O Playwright executa sete cenários sintéticos, incluindo consulta de `/api/v1/learning-path` sem `activityId`, escolha da atividade da próxima ação, ciclo iniciar–salvar–submeter e inspeção/decisão de um item de autoria interno. O recorte é `implemented-verified-with-gaps`: ainda faltam a integração do navegador com API real no ambiente de execução, superfícies completas de operação, axe e revisão manual de acessibilidade, recuperação/rotação e os fluxos educacionais completos.

## 14. Evidência adicional — autoria interna no item 10

`apps/web/app/authoring/page.tsx` consome somente a rota interna autorizada e exibe prompt, alternativas, gabarito, rubrica, preflight e fontes para o revisor. As ações de `Solicitar ajustes` e `Aprovar clinicamente` enviam justificativa ao servidor; o navegador não calcula autorização, nota ou publicação. `tests/e2e/authoring-review.spec.ts` cobre a leitura redigida e o aviso de decisão usando fixtures sintéticos; o E2E real e a auditoria de acessibilidade continuam pendentes.

## 15. Fila editorial interna no item EDITORIAL-QUEUE-027

A superfície `/authoring` carrega os escopos da sessão por
`GET /api/v1/internal/session/scopes` e consulta
`GET /api/v1/internal/content/review-queue` somente com uma membership retornada
pela sessão. A lista mostra somente título, módulo/sessão, versão, estado,
próxima ação, acesso calculado e última decisão resumida; não renderiza prompt,
gabarito, rubrica, fontes ou payload autoral. O link para a rota interna de
autoria aparece somente quando a projeção permite e quando a próxima ação é
revisão clínica; ajustes solicitados aguardam reenvio do autor.

O cliente trata a resposta como `unknown`, valida a projeção redigida e exibe
estados de carregamento, vazio e erro. O servidor continua sendo a autoridade
para capability e escopo; a lista de memberships vem da sessão e inserir ou
alterar o `scopeId` na URL não amplia acesso. O E2E sintético cobre consulta,
ausência de campos internos, abertura do item e ações role-aware; axe continua
cobrindo a entrada da superfície de autoria.

O E2E `tests/e2e/recovery-access.spec.ts` cobre o aceite de um link sintético,
a remoção do token da URL, o cookie de sessão e a mensagem de uso único. A
verificação continua sintética no navegador; entrega por provedor, MFA, revisão
manual de acessibilidade e operação com API real permanecem gaps explícitos.

## 16. Fila interna paginada — FEEDBACK-043

Na seção de relatos de `/operations`, a web consome `meta.has_next` e
`meta.next_cursor` sem interpretar ou persistir o conteúdo do cursor. Uma pilha
local permite voltar à página anterior; trocar escopo/status reinicia a pilha,
e um contador de request ignora respostas antigas. `loading`, `forbidden`,
`unauthenticated`, `error`, retry e empty continuam explícitos. A transição
confirmada recarrega a página corrente e não decide status no cliente.

Os controles são botões nativos, focáveis e `disabled` quando não há página
anterior/próxima. O E2E usa duas páginas sintéticas, avança e retorna, e valida
que a tela não mostra `participantId`, `scopeId` ou o token bruto. A fila
interna agora mostra prioridade allowlisted e apenas o rótulo de responsabilidade
(`Sem responsável`/`Responsável definido`), sem renderizar UUID. SLA, resposta,
notificação e conteúdo clínico continuam fora da superfície.

## 17. Metadata de triagem na operação — FEEDBACK-054

Em `/operations`, o moderador/administrador autorizado pode alterar a
prioridade por um `select` nativo e usar `Assumir para mim` ou `Liberar
responsável`. A web envia somente `expectedVersion`, prioridade e ação; não
envia escopo, participante ou identidade de terceiro. Após confirmação, a fila
é recarregada na mesma página/cursor. A resposta é validada como `unknown` e
allowlisted antes de qualquer renderização.

O controle usa a chave da consulta (escopo, status, cursor e pilha) para ignorar
respostas antigas quando o usuário troca filtro/escopo. O estado de envio
desabilita controles concorrentes, exibe erro bounded e permite retry/releitura;
um conflito otimista não é transformado em alteração local silenciosa. A
timeline interna renderiza somente rótulos de prioridade/responsabilidade e
status; IDs internos não são apresentados. A superfície participante continua
sem todos esses campos.
