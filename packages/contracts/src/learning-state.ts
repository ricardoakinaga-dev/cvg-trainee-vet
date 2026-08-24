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
    description: plainTextSchema,
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
    description: plainTextSchema,
    createdAt: timestampSchema,
    status: feedbackTicketStatusSchema,
    version: versionSchema,
  })
  .strict();

export const participantFeedbackTicketsProjectionSchema = z
  .object({
    tickets: z.array(participantFeedbackTicketProjectionSchema).max(100),
  })
  .strict();

export const participantAppealProjectionSchema = z
  .object({
    appealId: idSchema,
    attemptId: idSchema,
    itemId: idSchema,
    createdAt: timestampSchema,
    dueAt: timestampSchema,
    status: appealStatusSchema,
    version: versionSchema,
    decision: appealDecisionSchema.optional(),
  })
  .strict();

export const participantAppealsProjectionSchema = z
  .object({
    appeals: z.array(participantAppealProjectionSchema).max(100),
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
      .enum(["PRE_REQUISITO", "CONTEUDO_RETIRADO", "OBJETIVO_EM_REMEDIACAO"])
      .optional(),
    to: z.enum(["ATRIBUIDO", "DISPONIVEL"]).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const add = (path: string[], message: string) =>
      context.addIssue({ code: "custom", path, message });
    if (value.event === "DISPONIBILIZAR" && value.now === undefined) {
      add(["now"], "availability transitions require now");
    }
    if (value.event !== "DISPONIBILIZAR" && value.now !== undefined) {
      add(["now"], "now is only valid for availability transitions");
    }
    if (value.event === "BLOQUEAR" && value.reason === undefined) {
      add(["reason"], "blocking transitions require a reason");
    }
    if (value.event !== "BLOQUEAR" && value.reason !== undefined) {
      add(["reason"], "reason is only valid for blocking transitions");
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
    description: plainTextSchema,
    createdAt: timestampSchema,
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
    ]),
  })
  .strict();

export const appealCreateRequestSchema = z
  .object({
    attemptId: idSchema,
    itemId: idSchema,
    justification: plainTextSchema,
  })
  .strict();

export const appealQuerySchema = z
  .object({
    attemptId: idSchema,
  })
  .strict();

export const appealReviewTransitionRequestSchema = z
  .object({
    appealId: idSchema,
    scopeId: idSchema,
    version: versionSchema,
    event: z.enum(["ATRIBUIR_REVISOR", "DECIDIR", "SOLICITAR_RECALCULO"]),
    decision: z
      .enum(["MANTER_RESULTADO", "ANULAR_ITEM", "ALTERAR_RESULTADO"])
      .optional(),
    decisionRationale: plainTextSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.event === "DECIDIR" && value.decision === undefined) {
      context.addIssue({
        code: "custom",
        path: ["decision"],
        message: "decision is required",
      });
    }
    if (value.event === "DECIDIR" && value.decisionRationale === undefined) {
      context.addIssue({
        code: "custom",
        path: ["decisionRationale"],
        message: "decision rationale is required",
      });
    }
    if (value.event !== "DECIDIR" && value.decision !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["decision"],
        message: "decision is only valid for decision events",
      });
    }
    if (value.event !== "DECIDIR" && value.decisionRationale !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["decisionRationale"],
        message: "decision rationale is only valid for decision events",
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

export const appealScopedTransitionRequestSchema =
  appealReviewTransitionRequestSchema;

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
export type AppealQuery = z.infer<typeof appealQuerySchema>;
export type AppealReviewTransitionRequest = z.infer<
  typeof appealReviewTransitionRequestSchema
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
export type ParticipantFeedbackTicketsProjection = z.infer<
  typeof participantFeedbackTicketsProjectionSchema
>;
export type ParticipantAppealProjection = z.infer<
  typeof participantAppealProjectionSchema
>;
export type ParticipantAppealsProjection = z.infer<
  typeof participantAppealsProjectionSchema
>;
