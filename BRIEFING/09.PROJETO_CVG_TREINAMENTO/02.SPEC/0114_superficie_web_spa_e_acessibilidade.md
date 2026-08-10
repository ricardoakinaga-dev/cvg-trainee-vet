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

O web nunca calcula nota oficial, autorização, transição, próxima ação ou estado clínico. Ele mostra a projeção da API e invalida/refaz query após mutação confirmada.

## 4. Acessibilidade e segurança de conteúdo

- WCAG 2.2 AA: teclado, foco visível, labels, contraste, semântica, live regions e mensagens de erro associadas;
- navegação responsiva para celular e computador sem exigir app nativo;
- nenhum HTML livre vindo do usuário; conteúdo autoral passa por sanitizer/renderer seguro;
- não renderizar Markdown/HTML produzido por IA sem sanitização e aprovação;
- telas de participante não contêm fonte, autor, obra, capítulo, página, PDF, foto, tabela, link de terceiro, prompt, gabarito ou metadado interno;
- erros exibidos são amigáveis; detalhes técnicos aparecem somente em `request_id` e suporte interno autorizado.

## 5. Verificações do web

- testes de componente para estados e permissões;
- testes de contrato para garantir que DTO público não tenha chaves internas;
- Playwright para login, convite, retomada, submissão, feedback e bloqueio de acesso cruzado;
- axe/checagem automatizada mais revisão manual de teclado e foco;
- screenshot apenas de interfaces sintéticas, sem conteúdo clínico real ou fonte protegida;
- teste de segurança que tenta injetar HTML, prompt, URL externa e dados proibidos em campos livres.

## 6. Implementação verificada no BUILD F3-S4 e item 9

`apps/web` já possui uma superfície inicial de participante para aceite de convite, leitura de atividade atribuída, início de tentativa, salvamento de resposta e submissão. A página consome somente envelopes públicos da API, mantém a sessão em cookie e não modela fonte, foto, PDF, OCR, prompt, gabarito ou identificadores internos proibidos.

O Playwright executa sete cenários sintéticos, incluindo consulta de `/api/v1/learning-path` sem `activityId`, escolha da atividade da próxima ação, ciclo iniciar–salvar–submeter e inspeção/decisão de um item de autoria interno. O recorte é `implemented-verified-with-gaps`: ainda faltam a integração do navegador com API real no ambiente de execução, superfícies completas de operação, axe e revisão manual de acessibilidade, recuperação/rotação e os fluxos educacionais completos.

## 14. Evidência adicional — autoria interna no item 10

`apps/web/app/authoring/page.tsx` consome somente a rota interna autorizada e exibe prompt, alternativas, gabarito, rubrica, preflight e fontes para o revisor. As ações de `Solicitar ajustes` e `Aprovar clinicamente` enviam justificativa ao servidor; o navegador não calcula autorização, nota ou publicação. `tests/e2e/authoring-review.spec.ts` cobre a leitura redigida e o aviso de decisão usando fixtures sintéticos; o E2E real e a auditoria de acessibilidade continuam pendentes.
