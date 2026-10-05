# 0191 — Adendo de decisão: autorrevisão clínica no MVP

**Data da decisão:** 2026-10-01  
**Responsável pelo produto:** Ricardo  
**Estado:** decisão aprovada; implementação e revisão técnica em execução.

## Decisão

Para o MVP interno, Ricardo pode criar, revisar, aprovar e publicar conteúdo
clínico, conforme `RF-034`, `RN-043` e `RN-044` aprovados em `D-083`. A revisão
adicional por outro médico-veterinário é opcional. Esta decisão resolve o
conflito de redação identificado entre o PRD e `SPEC-0106 §9`.

## Contrato executável

- Todo revisor clínico precisa estar ativo, possuir `CLINICAL_APPROVER`, a
  capability correspondente à decisão e o escopo solicitado.
- Se o revisor também for o autor do registro, a autorrevisão somente é
  permitida quando `principalId` é igual ao `approvedClinicalApproverId`
  configurado pelo servidor. Ausência ou divergência desse identificador
  bloqueia a autorrevisão. Não se usa nome, papel enviado pelo cliente ou
  `authorId` do corpo da requisição como prova de identidade.
- Um revisor distinto com `CLINICAL_APPROVER` pode aprovar clinicamente o
  registro de outro autor sem coincidir com a identidade configurada para
  autorrevisão. Solicitar ajustes continua exigindo `MODERATE_CONTENT`, de
  acordo com `SPEC-0111` (`MODERATOR` ou `ADMIN`); `CLINICAL_APPROVER` isolado
  não concede essa capacidade. Outros autores não ganham autorrevisão.
- A aprovação por revisor distinto registra uma decisão clínica válida no
  fluxo editorial, mas não satisfaz a aprovação humana de Ricardo exigida por
  `RF-035`. O gate de publicação exige que a decisão clínica mais recente tenha
  sido registrada pelo `approvedClinicalApproverId` configurado no servidor.
- O preflight, a persistência versionada da decisão, a trilha de auditoria e as
  transições existentes permanecem obrigatórios. Para uma revisão concluída,
  preflight, decisão, status, outbox e auditoria são confirmados na mesma
  transação PostgreSQL; se alguma gravação falhar, todas são revertidas. Uma
  aprovação bloqueada pode persistir somente o resultado do preflight antes de
  rejeitar a decisão. As decisões de aprovação e ajuste só passam por
  `ReviewAuthoringContent` e sua rota interna de revisão;
  a transição genérica de conteúdo rejeita esses eventos para não alterar
  estado sem persistir a decisão.
- A aprovação não publica conteúdo. Publicação continua exigindo registro
  editorial, checks técnicos, `readyForPublication === true`,
  `checks.publicationBlocked === false`, aprovação clínica mais recente pela
  identidade configurada e os demais requisitos de `RF-035`. O hold global
  H-CONTENT permanece ativo nesta implementação: o preflight mantém
  `readyForPublication === false` e `checks.publicationBlocked === true`, e o
  repositório verifica ambos os campos antes de autorizar publicação ou
  materializar atividade participante. A capacidade prevista em `RF-034`
  descreve o fluxo após eventual liberação do hold; nenhum conteúdo clínico será
  publicado por esta implementação.

## Rastreabilidade e validação

`RF-034`/`RN-043`/`RN-044` → `SPEC-0106 §9` e este adendo →
`packages/application/src/authoring-use-cases.ts` →
`packages/application/src/authoring-use-cases.test.ts` e testes de fronteira da
API. A revisão técnica exige caso positivo para a identidade clínica
configurada, negativos para identidade ausente/divergente e regressão do
preflight/publicação.

## Limites

Esta decisão vale para o MVP interno e não aprova conteúdo, protocolo clínico,
publicação, piloto ou produção. Extensões futuras do fluxo de autoria podem
reabrir a regra mediante decisão explícita.
