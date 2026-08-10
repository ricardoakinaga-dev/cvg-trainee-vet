import type { ParticipantActivity } from "./types.js";
import { m02Assessment } from "./catalog.js";
import {
  toParticipantActivity,
  toParticipantActivityFromDiagnosticDraft,
  toParticipantActivityFromDraft,
} from "./projection.js";
import {
  b07DiagnosticDraftPack,
  getModuleDraftPack,
} from "./learning-runtime.js";

export type CurriculumContentSeedStatus = "PROJECAO_VERIFICADA" | "PUBLICADO";

export type CurriculumContentVersionSeed = Readonly<{
  readonly id: string;
  readonly contentId: string;
  readonly scopeId: string;
  readonly version: 1;
  readonly status: CurriculumContentSeedStatus;
  readonly kind: "QUESTAO" | "CASO";
  readonly title: string;
  readonly participantText: string;
  readonly responseMode: "CHOICE" | "TEXT";
  readonly participantOptions?: readonly Readonly<{
    readonly id: string;
    readonly label: string;
    readonly text: string;
  }>[];
  readonly participantSelectionMode?: "SINGLE" | "MULTIPLE";
}>;

export type CurriculumActivitySeed = Readonly<{
  readonly activity: Readonly<{
    readonly id: string;
    readonly scopeId: string;
    readonly slug: string;
    readonly title: string;
    readonly status: "PUBLISHED";
  }>;
  readonly contentVersions: readonly CurriculumContentVersionSeed[];
  readonly activityItems: readonly Readonly<{
    readonly activityId: string;
    readonly contentVersionId: string;
    readonly ordinal: number;
  }>[];
}>;

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function freeze<T>(value: T): Readonly<T> {
  return Object.freeze(value);
}

function assertScopeId(scopeId: string): void {
  if (!uuidPattern.test(scopeId)) {
    throw new Error("scopeId must be a UUID");
  }
}

function toContentVersion(
  scopeId: string,
  status: CurriculumContentSeedStatus,
  item: ParticipantActivity["items"][number],
): CurriculumContentVersionSeed {
  const choices = item.choices;
  const selectionMode = item.selectionMode;
  return freeze({
    id: item.itemId,
    contentId: item.itemId,
    scopeId,
    version: 1,
    status,
    kind: item.kind,
    title: item.title,
    participantText: item.text,
    responseMode: item.responseMode,
    ...(choices === undefined
      ? {}
      : { participantOptions: freeze([...choices]) }),
    ...(selectionMode === undefined
      ? {}
      : { participantSelectionMode: selectionMode }),
  });
}

function createSeedFromActivity(
  scopeId: string,
  status: CurriculumContentSeedStatus,
  activityStatus: "PUBLISHED",
  activity: ParticipantActivity,
): CurriculumActivitySeed {
  const contentVersions = activity.items.map((item) =>
    toContentVersion(scopeId, status, item),
  );
  const activityItems = activity.items.map((item) =>
    freeze({
      activityId: activity.activityId,
      contentVersionId: item.itemId,
      ordinal: item.ordinal,
    }),
  );
  return freeze({
    activity: freeze({
      id: activity.activityId,
      scopeId,
      slug: activity.slug,
      title: activity.title,
      status: activityStatus,
    }),
    contentVersions: freeze(contentVersions),
    activityItems: freeze(activityItems),
  });
}

export function createM02ContentSeed(
  scopeId: string,
  status: CurriculumContentSeedStatus = "PUBLICADO",
): CurriculumActivitySeed {
  assertScopeId(scopeId);
  return createSeedFromActivity(
    scopeId,
    status,
    "PUBLISHED",
    toParticipantActivity(m02Assessment),
  );
}

export function createCurriculumContentSeed(
  scopeId: string,
  moduleId: string,
  status: CurriculumContentSeedStatus = "PUBLICADO",
): CurriculumActivitySeed {
  assertScopeId(scopeId);
  return createSeedFromActivity(
    scopeId,
    status,
    "PUBLISHED",
    toParticipantActivityFromDraft(getModuleDraftPack(moduleId)),
  );
}

export function createDiagnosticContentSeed(
  scopeId: string,
  status: CurriculumContentSeedStatus = "PUBLICADO",
): CurriculumActivitySeed {
  assertScopeId(scopeId);
  return createSeedFromActivity(
    scopeId,
    status,
    "PUBLISHED",
    toParticipantActivityFromDiagnosticDraft(b07DiagnosticDraftPack),
  );
}
