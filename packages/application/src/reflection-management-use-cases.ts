import type { AttemptStatus } from "@cvg/domain";

import { ApplicationError } from "./errors.js";
import {
  deriveReflectionStatus,
  type ReflectionStatus,
} from "./reflection-use-cases.js";

export type ReflectionManagementCounts = Readonly<{
  readonly NAO_INICIADA: number;
  readonly EM_ANDAMENTO: number;
  readonly CONCLUIDA: number;
}>;

export type ReflectionManagementModule = Readonly<{
  readonly moduleId: string;
  readonly totalAssignments: number;
  readonly counts: ReflectionManagementCounts;
}>;

export type ReflectionManagementState = Readonly<{
  readonly kind: "reflection_management_aggregate";
  readonly scopeId: string;
  readonly generatedAt: string;
  readonly modules: readonly ReflectionManagementModule[];
  readonly evidence: "REFLEXAO_DIGITAL";
  readonly practicalCompetenceClaim: "PROIBIDO_MVP";
}>;

export type ReflectionManagementInstance = Readonly<{
  readonly participantId: string;
  readonly activityId: string;
  readonly moduleId: string;
  readonly itemCount: number;
  readonly answeredItemCount: number;
  readonly attemptStatus?: AttemptStatus;
}>;

export type AggregateReflectionManagementCommand = Readonly<{
  readonly scopeId: string;
  readonly generatedAt: string;
  readonly instances: readonly ReflectionManagementInstance[];
}>;

export type ReflectionManagementQuery = Readonly<{
  readonly scopeId: string;
}>;

export type GetReflectionManagementCommand = Readonly<{
  readonly principalId: string;
  readonly query: ReflectionManagementQuery;
}>;

export interface ReflectionManagementReadPort {
  readonly findReflectionManagement: (
    query: ReflectionManagementQuery,
  ) => Promise<ReflectionManagementState>;
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const modulePattern = /^M(?:0[1-9]|1[0-9]|2[0-4])$/u;
const statuses: readonly ReflectionStatus[] = [
  "NAO_INICIADA",
  "EM_ANDAMENTO",
  "CONCLUIDA",
];

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new ApplicationError("validation_error", `${field} is required`);
  }
}

function assertCount(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new ApplicationError("validation_error", `${field} is invalid`);
  }
}

function normalizeScopeId(scopeId: string): string {
  assertNonEmpty(scopeId, "scopeId");
  const normalized = scopeId.trim();
  if (!uuidPattern.test(normalized)) {
    throw new ApplicationError("validation_error", "scopeId is invalid");
  }
  return normalized;
}

function normalizeModuleId(moduleId: string): string {
  assertNonEmpty(moduleId, "moduleId");
  const normalized = moduleId.trim();
  if (!modulePattern.test(normalized)) {
    throw new ApplicationError("validation_error", "moduleId is invalid");
  }
  return normalized;
}

function freezeCounts(
  counts: ReflectionManagementCounts,
): ReflectionManagementCounts {
  for (const status of statuses)
    assertCount(counts[status], `counts.${status}`);
  return Object.freeze({
    NAO_INICIADA: counts.NAO_INICIADA,
    EM_ANDAMENTO: counts.EM_ANDAMENTO,
    CONCLUIDA: counts.CONCLUIDA,
  });
}

export function aggregateReflectionManagement(
  command: AggregateReflectionManagementCommand,
): ReflectionManagementState {
  const scopeId = normalizeScopeId(command.scopeId);
  assertNonEmpty(command.generatedAt, "generatedAt");
  const seen = new Set<string>();
  const grouped = new Map<
    string,
    {
      readonly counts: Record<ReflectionStatus, number>;
      totalAssignments: number;
    }
  >();

  for (const instance of command.instances) {
    assertNonEmpty(instance.participantId, "participantId");
    assertNonEmpty(instance.activityId, "activityId");
    const moduleId = normalizeModuleId(instance.moduleId);
    assertCount(instance.itemCount, "itemCount");
    if (instance.itemCount < 1) {
      throw new ApplicationError("validation_error", "itemCount is invalid");
    }
    assertCount(instance.answeredItemCount, "answeredItemCount");
    if (instance.answeredItemCount > instance.itemCount) {
      throw new ApplicationError(
        "validation_error",
        "answeredItemCount cannot exceed itemCount",
      );
    }
    const key = `${instance.participantId.trim()}:${instance.activityId.trim()}`;
    if (seen.has(key)) {
      throw new ApplicationError(
        "validation_error",
        "reflection management instances must be unique",
      );
    }
    seen.add(key);
    const status = deriveReflectionStatus({
      itemCount: instance.itemCount,
      answeredItemCount: instance.answeredItemCount,
      attemptStatus: instance.attemptStatus,
    });
    const current = grouped.get(moduleId) ?? {
      totalAssignments: 0,
      counts: {
        NAO_INICIADA: 0,
        EM_ANDAMENTO: 0,
        CONCLUIDA: 0,
      },
    };
    current.totalAssignments += 1;
    current.counts[status] += 1;
    grouped.set(moduleId, current);
  }

  const modules = [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([moduleId, value]) =>
      Object.freeze({
        moduleId,
        totalAssignments: value.totalAssignments,
        counts: freezeCounts(value.counts),
      }),
    );
  return Object.freeze({
    kind: "reflection_management_aggregate" as const,
    scopeId,
    generatedAt: command.generatedAt,
    modules: Object.freeze(modules),
    evidence: "REFLEXAO_DIGITAL" as const,
    practicalCompetenceClaim: "PROIBIDO_MVP" as const,
  });
}

function freezeState(
  state: ReflectionManagementState,
  query: ReflectionManagementQuery,
): ReflectionManagementState {
  const scopeId = normalizeScopeId(query.scopeId);
  if (state.scopeId !== scopeId) {
    throw new ApplicationError(
      "forbidden",
      "Reflection report contains data outside the current scope",
    );
  }
  const seen = new Set<string>();
  const modules = state.modules.map((module) => {
    const moduleId = normalizeModuleId(module.moduleId);
    if (seen.has(moduleId)) {
      throw new ApplicationError(
        "forbidden",
        "Reflection report contains duplicate modules",
      );
    }
    seen.add(moduleId);
    assertCount(module.totalAssignments, "totalAssignments");
    const counts = freezeCounts(module.counts);
    if (
      counts.NAO_INICIADA + counts.EM_ANDAMENTO + counts.CONCLUIDA !==
      module.totalAssignments
    ) {
      throw new ApplicationError(
        "forbidden",
        "Reflection report counts are inconsistent",
      );
    }
    return Object.freeze({
      moduleId,
      totalAssignments: module.totalAssignments,
      counts,
    });
  });
  return Object.freeze({
    ...state,
    scopeId,
    modules: Object.freeze(modules),
  });
}

export async function getReflectionManagementReport(
  command: GetReflectionManagementCommand,
  repository: ReflectionManagementReadPort,
): Promise<ReflectionManagementState> {
  assertNonEmpty(command.principalId, "principalId");
  const query = Object.freeze({
    scopeId: normalizeScopeId(command.query.scopeId),
  });
  return freezeState(await repository.findReflectionManagement(query), query);
}
