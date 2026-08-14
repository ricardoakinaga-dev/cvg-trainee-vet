import { z } from "zod";

const idSchema = z.string().uuid();
const versionSchema = z.number().int().nonnegative();
const timestampSchema = z.iso.datetime();
const moduleIdSchema = z.string().regex(/^M(?:0[1-9]|1[0-9]|2[0-4])$/u);
const plainTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(10_000)
  .refine((value) => !/<[^>]*>/u.test(value), "plain text is required");
const feedbackPlainTextSchema = plainTextSchema.max(2_000);
const logicalPageSchema = z
  .string()
  .regex(/^\/[A-Za-z0-9][A-Za-z0-9/_:-]{0,127}$/u);
const appVersionSchema = z
  .string()
  .regex(/^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}$/u);
const errorCodeSchema = z.string().regex(/^[A-Z0-9][A-Z0-9_.:-]{0,63}$/u);

export const feedbackTechnicalContextSchema = z
  .object({
    logicalPage: logicalPageSchema,
    appVersion: appVersionSchema,
    occurredAt: timestampSchema.optional(),
    errorCode: errorCodeSchema.optional(),
  })
  .strict();

const learningAssignmentStatusSchema = z.enum([
  "NAO_ATRIBUIDO",
  "ATRIBUIDO",
  "DISPONIVEL",
  "EM_ANDAMENTO",
  "CONCLUIDO",
  "EM_REFORCO",
  "CONCLUIDO_COM_RETENCAO_PENDENTE",
  "PAUSADO",
  "BLOQUEADO",
]);
const learningAssignmentBlockReasonSchema = z.enum([
  "PRE_REQUISITO",
  "CONTEUDO_RETIRADO",
  "OBJETIVO_EM_REMEDIACAO",
]);
const learningAssignmentPauseReasonSchema = z.enum([
  "AFASTAMENTO",
  "ACOMODACAO",
  "JANELA_OPERACIONAL",
]);
const assessmentWorkflowStatusSchema = z.enum([
  "RESULTADO_EM_PROCESSAMENTO",
  "RESULTADO_DISPONIVEL",
  "RESULTADO_EM_REVISAO",
  "RESULTADO_CORRIGIDO",
  "RESULTADO_ANULADO",
]);
const feedbackTicketTypeSchema = z.enum([
  "BUG_TECNICO",
  "USABILIDADE",
  "ERRO_CONTEUDO",
  "MELHORIA",
  "CONTESTACAO",
]);
const feedbackTicketStatusSchema = z.enum([
  "NOVO",
  "TRIADO",
  "EM_TRATAMENTO",
  "AGUARDA_USUARIO",
  "RESOLVIDO",
  "DUPLICADO",
  "NAO_REPRODUZIDO",
  "NAO_PLANEJADO",
]);
const feedbackTicketPrioritySchema = z.enum([
  "BAIXA",
  "NORMAL",
  "ALTA",
  "URGENTE",
]);
const feedbackTicketHistoryEntrySchema = z
  .object({
    status: feedbackTicketStatusSchema,
    changedAt: timestampSchema,
  })
  .strict();
const internalFeedbackTicketHistoryEntrySchema =
  feedbackTicketHistoryEntrySchema
    .extend({ actorId: idSchema.optional() })
    .strict();
const feedbackTicketResponseSchema = z
  .object({
    message: feedbackPlainTextSchema,
    respondedAt: timestampSchema,
  })
  .strict();
const internalFeedbackTicketResponseSchema = feedbackTicketResponseSchema
  .extend({ respondedBy: idSchema.optional() })
  .strict();
const appealStatusSchema = z.enum([
  "ABERTA",
  "EM_REVISAO",
  "DECIDIDA",
  "RECALCULO_PENDENTE",
  "ENCERRADA",
]);
const appealDecisionSchema = z.enum([
  "MANTER_RESULTADO",
  "ANULAR_ITEM",
  "ALTERAR_RESULTADO",
]);

export const learningAssignmentCreateRequestSchema = z
  .object({
    assignmentId: idSchema,
    participantId: idSchema,
    scopeId: idSchema,
    moduleId: moduleIdSchema,
    availableAt: timestampSchema,
  })
  .strict();

export const assessmentWorkflowCreateRequestSchema = z
  .object({
    resultId: idSchema,
    attemptId: idSchema,
    participantId: idSchema,
    scopeId: idSchema,
    ruleVersion: z.string().trim().min(1).max(128),
  })
  .strict();

export const feedbackTicketParticipantCreateRequestSchema = z
  .object({
    scopeId: idSchema.optional(),
    type: feedbackTicketTypeSchema,
    description: feedbackPlainTextSchema,
    technicalContext: feedbackTechnicalContextSchema.optional(),
  })
  .strict();

export const participantLearningAssignmentProjectionSchema = z
  .object({
    assignmentId: idSchema,
    moduleId: moduleIdSchema,
    availableAt: timestampSchema,
    status: learningAssignmentStatusSchema,
    version: versionSchema,
    blockReason: learningAssignmentBlockReasonSchema.optional(),
    resumeAt: timestampSchema.optional(),
  })
  .strict();

export const participantAssessmentWorkflowProjectionSchema = z
  .object({
    resultId: idSchema,
    status: assessmentWorkflowStatusSchema,
    version: versionSchema,
  })
  .strict();

export const participantFeedbackTicketProjectionSchema = z
  .object({
    ticketId: idSchema,
    type: feedbackTicketTypeSchema,
    description: feedbackPlainTextSchema,
    createdAt: timestampSchema,
    alertedAt: timestampSchema.optional(),
    status: feedbackTicketStatusSchema,
    version: versionSchema,
    technicalContext: feedbackTechnicalContextSchema.optional(),
    priority: feedbackTicketPrioritySchema.optional(),
    response: feedbackTicketResponseSchema.optional(),
    history: z.array(feedbackTicketHistoryEntrySchema).max(100).optional(),
  })
  .strict();

export const internalFeedbackTicketProjectionSchema = z
  .object({
    ticketId: idSchema,
    participantId: idSchema,
    scopeId: idSchema,
    type: feedbackTicketTypeSchema,
    description: feedbackPlainTextSchema,
    createdAt: timestampSchema,
    alertedAt: timestampSchema.optional(),
    status: feedbackTicketStatusSchema,
    version: versionSchema,
    technicalContext: feedbackTechnicalContextSchema.optional(),
    priority: feedbackTicketPrioritySchema.optional(),
    assigneeId: idSchema.optional(),
    response: internalFeedbackTicketResponseSchema.optional(),
    history: z
      .array(internalFeedbackTicketHistoryEntrySchema)
      .max(100)
      .optional(),
  })
  .strict();

export const feedbackTicketListProjectionSchema = z
  .object({
    tickets: z.array(
      z.union([
        participantFeedbackTicketProjectionSchema,
        internalFeedbackTicketProjectionSchema,
      ]),
    ),
  })
  .strict();

export const feedbackTicketListQuerySchema = z
  .object({
    scopeId: idSchema.optional(),
    status: feedbackTicketStatusSchema.optional(),
    priority: feedbackTicketPrioritySchema.optional(),
  })
  .strict();

export const participantAppealProjectionSchema = z
  .object({
    appealId: idSchema,
    attemptId: idSchema,
    itemId: idSchema,
    status: appealStatusSchema,
    version: versionSchema,
    decision: appealDecisionSchema.optional(),
  })
  .strict();

export const learningAssignmentTransitionRequestSchema = z
  .object({
    assignmentId: idSchema,
    version: versionSchema,
    event: z.enum([
      "ATRIBUIR",
      "DISPONIBILIZAR",
      "INICIAR",
      "CONCLUIR",
      "INICIAR_REFORCO",
      "CONCLUIR_REFORCO",
      "AGENDAR_RETENCAO",
      "RETENCAO_APROVADA",
      "RETENCAO_REFORCO",
      "PAUSAR",
      "RETOMAR",
      "BLOQUEAR",
      "DESBLOQUEAR",
    ]),
    now: timestampSchema.optional(),
    reason: z
      .union([
        learningAssignmentBlockReasonSchema,
        learningAssignmentPauseReasonSchema,
      ])
      .optional(),
    resumeAt: timestampSchema.optional(),
    to: z.enum(["ATRIBUIDO", "DISPONIVEL"]).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const add = (path: string[], message: string) =>
      context.addIssue({ code: "custom", path, message });
    if (value.event === "DISPONIBILIZAR" && value.now === undefined) {
      add(["now"], "availability transitions require now");
    }
    if (value.event === "RETOMAR" && value.now === undefined) {
      add(["now"], "resume transitions require now");
    }
    if (
      value.event !== "DISPONIBILIZAR" &&
      value.event !== "RETOMAR" &&
      value.now !== undefined
    ) {
      add(["now"], "now is only valid for availability or resume transitions");
    }
    if (
      (value.event === "BLOQUEAR" || value.event === "PAUSAR") &&
      value.reason === undefined
    ) {
      add(["reason"], "blocking and pause transitions require a reason");
    }
    if (
      value.event === "BLOQUEAR" &&
      value.reason !== undefined &&
      ![
        "PRE_REQUISITO",
        "CONTEUDO_RETIRADO",
        "OBJETIVO_EM_REMEDIACAO",
      ].includes(value.reason)
    ) {
      add(["reason"], "blocking transitions require a blocking reason");
    }
    if (
      value.event === "PAUSAR" &&
      value.reason !== undefined &&
      !["AFASTAMENTO", "ACOMODACAO", "JANELA_OPERACIONAL"].includes(
        value.reason,
      )
    ) {
      add(["reason"], "pause transitions require a pause reason");
    }
    if (
      value.event !== "BLOQUEAR" &&
      value.event !== "PAUSAR" &&
      value.reason !== undefined
    ) {
      add(["reason"], "reason is only valid for blocking or pause transitions");
    }
    if (value.event !== "PAUSAR" && value.resumeAt !== undefined) {
      add(["resumeAt"], "resumeAt is only valid for pause transitions");
    }
    if (value.event === "DESBLOQUEAR" && value.to === undefined) {
      add(["to"], "unblocking transitions require a destination");
    }
    if (value.event !== "DESBLOQUEAR" && value.to !== undefined) {
      add(["to"], "to is only valid for unblocking transitions");
    }
  });

export const assessmentWorkflowTransitionRequestSchema = z
  .object({
    resultId: idSchema,
    version: versionSchema,
    event: z.enum(["DISPONIBILIZAR", "INICIAR_REVISAO", "CORRIGIR", "ANULAR"]),
  })
  .strict();

export const feedbackTicketCreateRequestSchema = z
  .object({
    ticketId: idSchema,
    type: z.enum([
      "BUG_TECNICO",
      "USABILIDADE",
      "ERRO_CONTEUDO",
      "MELHORIA",
      "CONTESTACAO",
    ]),
    description: feedbackPlainTextSchema,
    createdAt: timestampSchema,
    technicalContext: feedbackTechnicalContextSchema.optional(),
  })
  .strict();

export const feedbackTicketTransitionRequestSchema = z
  .object({
    ticketId: idSchema,
    version: versionSchema,
    event: z.enum([
      "TRIAR",
      "INICIAR_TRATAMENTO",
      "AGUARDAR_USUARIO",
      "RESOLVER",
      "MARCAR_DUPLICADO",
      "MARCAR_NAO_REPRODUZIDO",
      "MARCAR_NAO_PLANEJADO",
      "RETOMAR_TRATAMENTO",
      "PRIORIZAR",
      "ATRIBUIR",
      "RESPONDER",
    ]),
    priority: feedbackTicketPrioritySchema.optional(),
    assigneeId: idSchema.optional(),
    response: feedbackPlainTextSchema.optional(),
    now: timestampSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const add = (path: string[], message: string) =>
      context.addIssue({ code: "custom", path, message });
    if (value.event === "PRIORIZAR" && value.priority === undefined) {
      add(["priority"], "priority is required when prioritizing");
    }
    if (value.event !== "PRIORIZAR" && value.priority !== undefined) {
      add(["priority"], "priority is only valid when prioritizing");
    }
    if (value.event === "ATRIBUIR" && value.assigneeId === undefined) {
      add(["assigneeId"], "assigneeId is required when assigning");
    }
    if (value.event !== "ATRIBUIR" && value.assigneeId !== undefined) {
      add(["assigneeId"], "assigneeId is only valid when assigning");
    }
    if (value.event === "RESPONDER" && value.response === undefined) {
      add(["response"], "response is required when responding");
    }
    if (value.event !== "RESPONDER" && value.response !== undefined) {
      add(["response"], "response is only valid when responding");
    }
  });

export const appealCreateRequestSchema = z
  .object({
    attemptId: idSchema,
    itemId: idSchema,
    justification: plainTextSchema,
  })
  .strict();

export const appealTransitionRequestSchema = z
  .object({
    appealId: idSchema,
    version: versionSchema,
    event: z.enum([
      "ATRIBUIR_REVISOR",
      "DECIDIR",
      "SOLICITAR_RECALCULO",
      "CONCLUIR_RECALCULO",
      "ENCERRAR",
    ]),
    reviewerId: idSchema.optional(),
    decision: z
      .enum(["MANTER_RESULTADO", "ANULAR_ITEM", "ALTERAR_RESULTADO"])
      .optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.event === "ATRIBUIR_REVISOR" && value.reviewerId === undefined) {
      context.addIssue({
        code: "custom",
        path: ["reviewerId"],
        message: "reviewer assignment requires reviewerId",
      });
    }
    if (value.event !== "ATRIBUIR_REVISOR" && value.reviewerId !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["reviewerId"],
        message: "reviewerId is only valid when assigning a reviewer",
      });
    }
    if (value.event === "DECIDIR" && value.decision === undefined) {
      context.addIssue({
        code: "custom",
        path: ["decision"],
        message: "decision is required",
      });
    }
    if (value.event !== "DECIDIR" && value.decision !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["decision"],
        message: "decision is only valid for decision events",
      });
    }
  });

export const learningAssignmentScopedTransitionRequestSchema =
  learningAssignmentTransitionRequestSchema
    .extend({ participantId: idSchema, scopeId: idSchema })
    .strict();

export const assessmentWorkflowScopedTransitionRequestSchema =
  assessmentWorkflowTransitionRequestSchema
    .extend({ participantId: idSchema, scopeId: idSchema })
    .strict();

export const feedbackTicketScopedTransitionRequestSchema =
  feedbackTicketTransitionRequestSchema
    .extend({ participantId: idSchema, scopeId: idSchema })
    .strict();

export const appealScopedTransitionRequestSchema = appealTransitionRequestSchema
  .extend({ participantId: idSchema, scopeId: idSchema })
  .strict();

export type LearningAssignmentTransitionRequest = z.infer<
  typeof learningAssignmentTransitionRequestSchema
>;
export type LearningAssignmentCreateRequest = z.infer<
  typeof learningAssignmentCreateRequestSchema
>;
export type AssessmentWorkflowCreateRequest = z.infer<
  typeof assessmentWorkflowCreateRequestSchema
>;
export type FeedbackTicketParticipantCreateRequest = z.infer<
  typeof feedbackTicketParticipantCreateRequestSchema
>;
export type FeedbackTechnicalContext = z.infer<
  typeof feedbackTechnicalContextSchema
>;
export type AssessmentWorkflowTransitionRequest = z.infer<
  typeof assessmentWorkflowTransitionRequestSchema
>;
export type FeedbackTicketCreateRequest = z.infer<
  typeof feedbackTicketCreateRequestSchema
>;
export type FeedbackTicketTransitionRequest = z.infer<
  typeof feedbackTicketTransitionRequestSchema
>;
export type AppealCreateRequest = z.infer<typeof appealCreateRequestSchema>;
export type AppealTransitionRequest = z.infer<
  typeof appealTransitionRequestSchema
>;
export type LearningAssignmentScopedTransitionRequest = z.infer<
  typeof learningAssignmentScopedTransitionRequestSchema
>;
export type AssessmentWorkflowScopedTransitionRequest = z.infer<
  typeof assessmentWorkflowScopedTransitionRequestSchema
>;
export type FeedbackTicketScopedTransitionRequest = z.infer<
  typeof feedbackTicketScopedTransitionRequestSchema
>;
export type FeedbackTicketPriority = z.infer<
  typeof feedbackTicketPrioritySchema
>;
export type FeedbackTicketListQuery = z.infer<
  typeof feedbackTicketListQuerySchema
>;
export type InternalFeedbackTicketProjection = z.infer<
  typeof internalFeedbackTicketProjectionSchema
>;
export type FeedbackTicketListProjection = z.infer<
  typeof feedbackTicketListProjectionSchema
>;
export type AppealScopedTransitionRequest = z.infer<
  typeof appealScopedTransitionRequestSchema
>;
export type ParticipantLearningAssignmentProjection = z.infer<
  typeof participantLearningAssignmentProjectionSchema
>;
export type ParticipantAssessmentWorkflowProjection = z.infer<
  typeof participantAssessmentWorkflowProjectionSchema
>;
export type ParticipantFeedbackTicketProjection = z.infer<
  typeof participantFeedbackTicketProjectionSchema
>;
export type ParticipantAppealProjection = z.infer<
  typeof participantAppealProjectionSchema
>;
