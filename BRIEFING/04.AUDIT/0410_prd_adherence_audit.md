# 0410 — PRD Adherence Audit

Resultado da janela F3-S3 + complemento F3-S4: PARTIAL — requisitos de núcleo, sessão, convite, resposta, atividade publicada, transição editorial, correção humana, feedback, progresso, superfície inicial do participante e fronteira autoral têm evidência; produto completo ainda não foi construído.

## Verificar

| Área | Evidência | Critério |
|---|---|---|
| acesso/conta | E2E + API | convite, login, sessão e conta conforme PRD |
| aprendizagem | E2E + eventos | trilha, módulo, sessão, progresso e retomada |
| avaliações | integração + E2E | tentativa, respostas, correção, remediação, retenção e contestação |
| conteúdo | preflight + API | versão, retirada, protocolo interno e aprovação clínica |
| experiência | Playwright/axe | telas e estados previstos, sem ranking/uso punitivo |
| dados | schema + logs | dados mínimos, sem prontuário/tutor/caso real |
| fronteira autoral | testes negativos | participante sem fonte, foto, PDF, gabarito ou metadado |

## Saída

Para cada requisito: ID, comportamento observado, evidência, status, divergência, impacto e ação. Não alterar PRD silenciosamente; divergência de produto exige decisão e atualização documental.

## Classificação observada

- PASS: dados sintéticos, sessão server-side/revogável, tentativa e resposta idempotentes, submissão única no agregado, atividade atribuída/publicada lida por escopo, transição editorial deny-by-default, progresso/retomada e projeções sem `participantId`/`scopeId`/gabarito/fonte;
- PARTIAL: trilha/atividade existem em schema mínimo e leitura/progresso, convite, rotação/revogação, correção humana e feedback básico estão prontos; autoria web, recuperação além do convite, correção automática, remediação, retenção e contestação ainda não;
- PARTIAL: E2E sintético da superfície participante cobre convite, erro limitado, projeção sem campos proibidos e iniciar–salvar–submeter; API real, acessibilidade completa e fluxo de usuário completo ainda não.
