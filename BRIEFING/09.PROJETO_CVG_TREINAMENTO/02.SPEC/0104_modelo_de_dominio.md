# 0104 — Modelo de Domínio

## 1. Entidades e value objects

| Entidade/value object | Identidade | Campos conceituais | Invariantes principais |
|---|---|---|---|
| `Account` | `account_id` | estado, e-mail profissional, perfil permitido | conta inativa não inicia atividade; senha não pertence ao agregado |
| `Invitation` | `invitation_id` | e-mail, expiração, estado, emissor | uso único; revogação invalida o token |
| `RoleAssignment` | `assignment_id` | papel, escopo, início/fim, aprovador | mudança sensível auditada; `CLINICAL_APPROVER` não delegável |
| `Curriculum` | `curriculum_id` | versão, duração, partes, estado | uma versão publicada é imutável |
| `Module` | `module_id` | currículo, mês, título, pré-requisitos | só versão autorizada aparece ao participante |
| `Session` | `session_id` | módulo, ordem, duração, estado | ordem única por módulo; atividade elegível depende de pré-requisito |
| `ContentItem` | `content_id` | objetivo, formato, espécie, texto autoral, estado | sem gabarito/rubrica testados não publica |
| `ContentVersion` | `content_version_id` | versão, validade, aprovação, projeção | publicação congela versão; vencido/retirado não inicia nova atividade |
| `LearningAssignment` | `assignment_id` | participante, trilha, módulo, estado | atribuição futura não conta como elegível |
| `Attempt` | `attempt_id` | atividade, participante, forma, estado, regra | submissão única por etapa; versões ficam congeladas |
| `Answer` | `answer_id` | tentativa, item, resposta sanitizada, horário | resposta imutável após submissão |
| `AssessmentResult` | `result_id` | tentativa, cálculo, estado, componentes | nota oficial só por transação e regra versionada |
| `RemediationPlan` | `plan_id` | objetivo, motivo, conteúdo equivalente, estado | erro crítico bloqueia somente o objetivo afetado |
| `RetentionReview` | `review_id` | janela 30/60/90, forma equivalente, resultado | não revoga conclusão anterior |
| `FeedbackTicket` | `ticket_id` | tipo, descrição redigida, prioridade, responsável opcional, estado, versão | sem anexos e sem dados proibidos; metadata de triagem não altera o estado |
| `Appeal` | `appeal_id` | alvo, justificativa, decisão, versão | não altera passado sem recálculo auditado |
| `InternalSourceRecord` | `source_record_id` | fonte/localizador/conflito/corte | interno; nunca entra em contrato participante |
| `AuditEntry` | `audit_id` | ator, ação, alvo, antes/depois, correlação | append-only; sem segredo ou texto protegido |

## 2. Agregados e limites

- **Conta:** `Account`, `Invitation` e estado de sessão referenciada; não contém credencial.
- **Acesso:** `RoleAssignment` e escopo; só comandos de Governança alteram.
- **Currículo:** `Curriculum`, `Module` e `Session`; publicação da estrutura é versionada.
- **Conteúdo:** `ContentItem` + `ContentVersion` + revisão/projeção; fontes internas ficam em agregado separado e relação protegida.
- **Tentativa:** `Attempt`, `Answer` e `AssessmentResult`; submissão/correção são transacionais.
- **Remediação:** `RemediationPlan` e `RetentionReview`; evolução lê seus resultados.
- **Relato:** `FeedbackTicket` e histórico; prioridade/responsabilidade operacional são metadata interna versionada; `Appeal` possui fluxo independente e referência ao alvo.
- **Auditoria:** `AuditEntry` não aceita update/delete de aplicação.

## 3. Regras de domínio críticas

1. Conteúdo para participante só pode ser derivado de `ContentVersion` em estado publicado e válido.
2. O serializer de participante recebe uma projeção permitida, nunca a entidade editorial completa.
3. `InternalSourceRecord` é inacessível a endpoints de participante por tipo e política de autorização.
4. Uma tentativa registra a versão do item, rubrica e regra usada; mudanças futuras não reescrevem a tentativa.
5. A nota oficial não pode ser alterada por update direto; somente comando de contestação/recálculo versionado.
6. Erro crítico cria remediação educativa no objetivo afetado, sem ranking, punição ou reprovação definitiva.
7. Afastamento, acomodação ou dado ausente não é convertido em zero.
8. Conteúdo retirado bloqueia novas exposições e conserva histórico mínimo de afetados permitido.
9. Toda concessão/revogação de papel, aprovação, publicação, retirada, alteração de gabarito ou nota gera auditoria.
10. Nenhuma entidade guarda PDF, OCR, foto, figura, tabela, trecho ou embedding da obra.

### 3.1 Metadata bounded de triagem — FEEDBACK-054

`FeedbackTicket` nasce com prioridade `NORMAL` e sem responsável. O comando de
triagem pode alterar somente a prioridade (`BAIXA`, `NORMAL`, `ALTA` ou
`URGENTE`) e a responsabilidade operacional por ações `MANTER`, `ASSUMIR` ou
`LIBERAR`. `ASSUMIR` deriva o responsável do principal autenticado; o cliente
nunca envia `participantId`, `scopeId` de autoridade ou um `assigneeId` de
terceiro. A operação incrementa a mesma versão otimista do ticket, preserva
tipo, descrição, participante e estado, e produz `METADATA_ALTERADO` na
timeline. Resposta ao participante, SLA, notificação, duplicidade e decisão
clínica permanecem fora deste agregado bounded.
