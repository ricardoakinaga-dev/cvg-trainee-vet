export type ContentStatus =
  | "RASCUNHO"
  | "AUTOVERIFICADO"
  | "EM_REVISAO_CLINICA"
  | "AJUSTES_SOLICITADOS"
  | "APROVADO_CLINICAMENTE"
  | "PROJECAO_VERIFICADA"
  | "AUTORIZADO_PARA_PUBLICACAO"
  | "PUBLICADO"
  | "RETIRADO"
  | "VENCIDO";

export interface ContentIdentity {
  readonly contentId: string;
  readonly version: number;
}

export interface ContentState extends ContentIdentity {
  readonly status: ContentStatus;
}

export type ContentEvent =
  | { readonly type: "AUTOVERIFICAR" }
  | { readonly type: "VERIFICAR_PROJECAO" }
  | { readonly type: "ENVIAR_PARA_REVISAO_CLINICA" }
  | { readonly type: "SOLICITAR_AJUSTES" }
  | { readonly type: "APROVAR_CLINICAMENTE" }
  | { readonly type: "AUTORIZAR_PUBLICACAO" }
  | { readonly type: "PUBLICAR" }
  | { readonly type: "PUBLICAR_AUTOMATICAMENTE" }
  | { readonly type: "RETIRAR" }
  | { readonly type: "VENCER" };

export class ContentDomainError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ContentDomainError";
  }
}

function assertValidState(state: ContentState): void {
  if (state === null || typeof state !== "object") {
    throw new ContentDomainError("content state must be an object");
  }
  if (
    typeof state.contentId !== "string" ||
    state.contentId.trim().length === 0
  ) {
    throw new ContentDomainError("contentId must not be empty");
  }
  if (!Number.isInteger(state.version) || state.version < 1) {
    throw new ContentDomainError("content version must be a positive integer");
  }
  if (!Object.prototype.hasOwnProperty.call(transitions, state.status)) {
    throw new ContentDomainError("content status is not supported");
  }
}

const transitions: Readonly<
  Record<
    ContentStatus,
    Readonly<Partial<Record<ContentEvent["type"], ContentStatus>>>
  >
> = {
  RASCUNHO: {
    AUTOVERIFICAR: "AUTOVERIFICADO",
  },
  AUTOVERIFICADO: {
    VERIFICAR_PROJECAO: "PROJECAO_VERIFICADA",
    ENVIAR_PARA_REVISAO_CLINICA: "EM_REVISAO_CLINICA",
  },
  EM_REVISAO_CLINICA: {
    APROVAR_CLINICAMENTE: "APROVADO_CLINICAMENTE",
    SOLICITAR_AJUSTES: "AJUSTES_SOLICITADOS",
  },
  AJUSTES_SOLICITADOS: {
    AUTOVERIFICAR: "AUTOVERIFICADO",
    ENVIAR_PARA_REVISAO_CLINICA: "EM_REVISAO_CLINICA",
  },
  PROJECAO_VERIFICADA: {
    ENVIAR_PARA_REVISAO_CLINICA: "EM_REVISAO_CLINICA",
  },
  APROVADO_CLINICAMENTE: {
    AUTORIZAR_PUBLICACAO: "AUTORIZADO_PARA_PUBLICACAO",
  },
  AUTORIZADO_PARA_PUBLICACAO: {
    PUBLICAR: "PUBLICADO",
  },
  PUBLICADO: { RETIRAR: "RETIRADO", VENCER: "VENCIDO" },
  RETIRADO: {},
  VENCIDO: {},
};

export function createContent(identity: ContentIdentity): ContentState {
  if (identity.contentId.trim().length === 0) {
    throw new ContentDomainError("contentId must not be empty");
  }
  if (!Number.isInteger(identity.version) || identity.version < 1) {
    throw new ContentDomainError("content version must be a positive integer");
  }

  return Object.freeze({ ...identity, status: "RASCUNHO" });
}

export function transitionContent(
  state: ContentState,
  event: ContentEvent,
): ContentState {
  assertValidState(state);
  const nextStatus = transitions[state.status][event.type];

  if (nextStatus === undefined) {
    throw new ContentDomainError(
      `Event ${event.type} is not allowed from state ${state.status}`,
    );
  }

  return Object.freeze({ ...state, status: nextStatus });
}
