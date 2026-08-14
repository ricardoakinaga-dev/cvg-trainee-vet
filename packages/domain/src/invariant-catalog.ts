export type InvariantPriority = "P0" | "P1";

export type CriticalInvariant = Readonly<{
  readonly id: string;
  readonly title: string;
  readonly priority: InvariantPriority;
  readonly requirementIds: readonly string[];
  readonly authority: string;
  readonly failureCode: string;
  readonly codePaths: readonly string[];
  readonly contractPaths: readonly string[];
  readonly testPaths: readonly string[];
}>;

const invariant = (
  id: string,
  title: string,
  priority: InvariantPriority,
  requirementIds: readonly string[],
  authority: string,
  failureCode: string,
  codePaths: readonly string[],
  contractPaths: readonly string[],
  testPaths: readonly string[],
): CriticalInvariant =>
  Object.freeze({
    id,
    title,
    priority,
    requirementIds: Object.freeze([...requirementIds]),
    authority,
    failureCode,
    codePaths: Object.freeze([...codePaths]),
    contractPaths: Object.freeze([...contractPaths]),
    testPaths: Object.freeze([...testPaths]),
  });

export const criticalInvariantCatalog: readonly CriticalInvariant[] =
  Object.freeze([
    invariant(
      "INV-CONTENT-001",
      "Conteúdo publicado precisa de transição editorial válida",
      "P0",
      ["RF-034", "RF-035", "RF-036", "RNF-050"],
      "domain/content + application/content-use-cases",
      "state_conflict",
      [
        "packages/domain/src/content.ts",
        "packages/application/src/content-use-cases.ts",
      ],
      [
        "packages/contracts/src/content.ts",
        "packages/contracts/src/authoring.ts",
      ],
      [
        "packages/domain/src/content.test.ts",
        "packages/application/src/content-use-cases.test.ts",
        "tests/integration/postgres-content-workflow.test.ts",
      ],
    ),
    invariant(
      "INV-CONTENT-002",
      "Publicação exige aprovação clínica persistida e independente",
      "P0",
      ["RF-034", "RF-035", "RNF-050"],
      "clinical review repository + approved reviewer identity",
      "state_conflict",
      [
        "packages/application/src/authoring-use-cases.ts",
        "packages/persistence/src/content-repository.ts",
      ],
      [
        "packages/contracts/src/authoring.ts",
        "packages/contracts/src/content.ts",
      ],
      [
        "packages/application/src/authoring-use-cases.test.ts",
        "packages/application/src/content-use-cases.test.ts",
        "tests/integration/postgres-authoring-workflow.test.ts",
      ],
    ),
    invariant(
      "INV-CONTENT-003",
      "Conteúdo retirado ou vencido não pode voltar à exposição",
      "P0",
      ["RF-032", "RF-039"],
      "domain/content + participant projection",
      "state_conflict",
      [
        "packages/domain/src/content.ts",
        "packages/persistence/src/content-repository.ts",
      ],
      ["packages/contracts/src/content.ts"],
      [
        "packages/domain/src/content.test.ts",
        "tests/integration/postgres-authoring-workflow.test.ts",
      ],
    ),
    invariant(
      "INV-CONTENT-004",
      "Preflight bloqueia item sem correção ou fronteira pública válida",
      "P0",
      ["RF-035", "RF-096"],
      "application/authoring preflight",
      "state_conflict",
      ["packages/application/src/authoring-use-cases.ts"],
      ["packages/contracts/src/authoring.ts"],
      [
        "packages/application/src/authoring-use-cases.test.ts",
        "tests/integration/postgres-authoring-workflow.test.ts",
      ],
    ),
    invariant(
      "INV-AUTHZ-001",
      "Conta inativa nunca atravessa uma capacidade protegida",
      "P0",
      ["RF-001", "RF-002", "RF-003"],
      "application/authorization",
      "forbidden",
      ["packages/application/src/authorization.ts"],
      ["packages/contracts/src/account.ts"],
      [
        "packages/application/src/authorization.test.ts",
        "tests/integration/postgres-security-isolation.test.ts",
      ],
    ),
    invariant(
      "INV-AUTHZ-002",
      "Acesso scoped exige papel e escopo correspondentes",
      "P0",
      ["RF-001", "RF-003", "RF-004"],
      "application/authorization + server boundary",
      "forbidden",
      ["packages/application/src/authorization.ts", "apps/api/src/http.ts"],
      ["packages/contracts/src/api.ts"],
      [
        "packages/application/src/authorization.test.ts",
        "apps/api/src/http.test.ts",
        "tests/integration/postgres-security-isolation.test.ts",
      ],
    ),
    invariant(
      "INV-AUTHZ-003",
      "Aprovador clínico deve ser identidade aprovada e não autor",
      "P0",
      ["RF-008", "RF-009", "RF-034", "RF-035"],
      "approved clinical identity + application/authoring",
      "forbidden",
      [
        "packages/application/src/authorization.ts",
        "packages/application/src/authoring-use-cases.ts",
      ],
      ["packages/contracts/src/authoring.ts"],
      [
        "packages/application/src/authorization.test.ts",
        "packages/application/src/authoring-use-cases.test.ts",
        "tests/integration/postgres-security-isolation.test.ts",
      ],
    ),
    invariant(
      "INV-PUBLIC-001",
      "Projeções públicas não carregam autoria, fonte ou gabarito",
      "P0",
      ["RF-031", "RF-038", "RF-096"],
      "contracts/public-boundary allowlist",
      "validation_error",
      ["packages/contracts/src/public-boundary.ts"],
      [
        "packages/contracts/src/public-boundary.ts",
        "packages/contracts/src/learning.ts",
      ],
      [
        "packages/contracts/src/public-boundary.test.ts",
        "packages/contracts/src/learning.test.ts",
        "packages/contracts/src/assessment.test.ts",
      ],
    ),
    invariant(
      "INV-ATTEMPT-001",
      "Tentativa congela versão e começa em estado válido",
      "P0",
      ["RF-020", "RF-021", "RF-023"],
      "domain/attempt",
      "state_conflict",
      [
        "packages/domain/src/attempt.ts",
        "packages/application/src/attempt-use-cases.ts",
      ],
      ["packages/contracts/src/assessment.ts"],
      [
        "packages/domain/src/attempt.test.ts",
        "packages/application/src/attempt-use-cases.test.ts",
        "tests/integration/postgres-attempt-repository.test.ts",
      ],
    ),
    invariant(
      "INV-ATTEMPT-002",
      "Submissão é única e idempotente",
      "P0",
      ["RF-021", "RF-023"],
      "application/attempt + PostgreSQL idempotency",
      "idempotency_conflict",
      [
        "packages/application/src/attempt-use-cases.ts",
        "packages/persistence/src/attempt-repository.ts",
      ],
      ["packages/contracts/src/assessment.ts"],
      [
        "packages/domain/src/attempt.test.ts",
        "packages/application/src/attempt-use-cases.test.ts",
        "tests/integration/postgres-attempt-repository.test.ts",
      ],
    ),
    invariant(
      "INV-ANSWER-001",
      "Resposta submetida não pode ser editada",
      "P0",
      ["RF-022", "RF-023"],
      "domain/answer + attempt state",
      "state_conflict",
      ["packages/domain/src/answer.ts", "packages/domain/src/attempt.ts"],
      ["packages/contracts/src/assessment.ts"],
      [
        "packages/domain/src/answer.test.ts",
        "packages/domain/src/attempt.test.ts",
        "tests/integration/postgres-answer-session.test.ts",
      ],
    ),
    invariant(
      "INV-ASSESSMENT-001",
      "Nota é bounded, versionada e não criada por dado incompleto",
      "P0",
      ["RF-040", "RF-041", "RF-042"],
      "domain/assessment + assessment policy",
      "validation_error",
      [
        "packages/domain/src/assessment.ts",
        "packages/domain/src/assessment-policy.ts",
      ],
      ["packages/contracts/src/assessment.ts"],
      [
        "packages/domain/src/assessment.test.ts",
        "packages/domain/src/assessment-policy.test.ts",
        "packages/contracts/src/assessment.test.ts",
      ],
    ),
    invariant(
      "INV-ASSESSMENT-002",
      "Erro crítico bloqueia apenas objetivo afetado e exige remediação",
      "P0",
      ["RF-043", "RF-044", "RF-045"],
      "domain/assessment-policy",
      "state_conflict",
      [
        "packages/domain/src/assessment-policy.ts",
        "packages/domain/src/learning-state.ts",
      ],
      ["packages/contracts/src/learning-state.ts"],
      [
        "packages/domain/src/assessment-policy.test.ts",
        "packages/domain/src/learning-state.test.ts",
        "packages/application/src/learning-state-use-cases.test.ts",
      ],
    ),
    invariant(
      "INV-LEARNING-001",
      "Atribuição futura não é elegível antes da disponibilidade",
      "P0",
      ["RF-010", "RF-011", "RF-012"],
      "domain/learning-state",
      "state_conflict",
      ["packages/domain/src/learning-state.ts"],
      ["packages/contracts/src/learning-state.ts"],
      [
        "packages/domain/src/learning-state.test.ts",
        "packages/application/src/learning-state-use-cases.test.ts",
      ],
    ),
    invariant(
      "INV-LEARNING-002",
      "Progresso e resultado não conferem competência prática",
      "P0",
      ["RF-015", "RF-016", "RF-048"],
      "domain learning state + public projection",
      "forbidden",
      [
        "packages/domain/src/learning-state.ts",
        "packages/application/src/journey-use-cases.ts",
      ],
      [
        "packages/contracts/src/journey.ts",
        "packages/contracts/src/learning.ts",
      ],
      [
        "packages/domain/src/learning-state.test.ts",
        "packages/application/src/journey-use-cases.test.ts",
        "packages/contracts/src/journey.test.ts",
      ],
    ),
    invariant(
      "INV-LEARNING-003",
      "Pausa preserva motivo e só retoma após a janela autorizada",
      "P1",
      ["RF-026", "RF-097"],
      "domain learning state + persisted assignment context",
      "state_conflict",
      [
        "packages/domain/src/learning-state.ts",
        "packages/persistence/src/learning-state-repository.ts",
      ],
      ["packages/contracts/src/learning-state.ts"],
      [
        "packages/domain/src/learning-state.test.ts",
        "packages/persistence/src/learning-state-repository.test.ts",
        "packages/contracts/src/learning-state.test.ts",
      ],
    ),
    invariant(
      "INV-LEARNING-004",
      "Trilha não aceita domínio digital sem pré-requisito concluído",
      "P0",
      ["RF-022", "RF-023"],
      "curriculum runtime prerequisite path",
      "state_conflict",
      ["packages/curriculum/src/learning-runtime.ts"],
      ["packages/contracts/src/learning.ts"],
      ["packages/curriculum/src/learning-runtime.test.ts"],
    ),
    invariant(
      "INV-REMEDIATION-001",
      "Retenção não revoga conclusão anterior",
      "P1",
      ["RF-026", "RF-027"],
      "domain/assessment-policy + learning state",
      "state_conflict",
      [
        "packages/domain/src/assessment-policy.ts",
        "packages/domain/src/learning-state.ts",
      ],
      ["packages/contracts/src/learning-state.ts"],
      [
        "packages/domain/src/assessment-policy.test.ts",
        "packages/domain/src/learning-state.test.ts",
      ],
    ),
    invariant(
      "INV-REMEDIATION-002",
      "Segunda reprovação cria plano individual com mentor sem punição",
      "P0",
      ["RF-048", "RF-095"],
      "domain remediation policy",
      "state_conflict",
      [
        "packages/domain/src/remediation-policy.ts",
        "packages/domain/src/assessment-policy.ts",
      ],
      ["packages/contracts/src/assessment.ts"],
      [
        "packages/domain/src/remediation-policy.test.ts",
        "packages/domain/src/assessment-policy.test.ts",
      ],
    ),
    invariant(
      "INV-RETENTION-001",
      "Retenção usa janelas 30/60/90 e formas equivalentes distintas",
      "P1",
      ["RF-049", "RF-059"],
      "curriculum retention blueprint + public runtime contract",
      "validation_error",
      [
        "packages/curriculum/src/catalog.ts",
        "packages/curriculum/src/learning-runtime.ts",
      ],
      ["packages/contracts/src/learning.ts"],
      [
        "packages/curriculum/src/learning-runtime.test.ts",
        "packages/contracts/src/learning.test.ts",
        "tests/integration/curriculum-catalog.test.ts",
      ],
    ),
    invariant(
      "INV-FEEDBACK-001",
      "Relato não aceita anexo ou dado proibido",
      "P0",
      ["RF-060", "RF-061", "RF-062"],
      "contracts feedback boundary",
      "validation_error",
      ["packages/application/src/feedback-use-cases.ts"],
      ["packages/contracts/src/learning-state.ts"],
      [
        "packages/application/src/feedback-use-cases.test.ts",
        "packages/contracts/src/learning-state.test.ts",
      ],
    ),
    invariant(
      "INV-APPEAL-001",
      "Contestação exige revisor independente e decisão versionada",
      "P0",
      ["RF-064", "RF-065", "RF-070"],
      "domain/appeal + correction application",
      "forbidden",
      [
        "packages/domain/src/appeal.ts",
        "packages/application/src/correction-use-cases.ts",
      ],
      [
        "packages/contracts/src/learning-state.ts",
        "packages/contracts/src/correction.ts",
      ],
      [
        "packages/domain/src/appeal.test.ts",
        "packages/application/src/correction-use-cases.test.ts",
        "tests/integration/postgres-correction.test.ts",
      ],
    ),
    invariant(
      "INV-AUDIT-001",
      "Ação sensível gera trilha metadata-only append-only",
      "P0",
      ["RF-080", "RF-081", "RNF-020", "RNF-021"],
      "application/audit + persistence/audit",
      "validation_error",
      [
        "packages/application/src/audit.ts",
        "packages/persistence/src/audit-repository.ts",
      ],
      ["packages/contracts/src/api.ts"],
      [
        "packages/application/src/audit.test.ts",
        "packages/persistence/src/audit-repository.test.ts",
        "tests/integration/postgres-content-workflow.test.ts",
      ],
    ),
    invariant(
      "INV-DATA-001",
      "Persistência mantém escopo, versão e unicidade transacionais",
      "P0",
      ["RF-081", "RNF-023"],
      "PostgreSQL constraints + repository transactions",
      "state_conflict",
      [
        "packages/persistence/src/schema.ts",
        "packages/persistence/src/content-repository.ts",
        "packages/persistence/src/attempt-repository.ts",
      ],
      [
        "packages/contracts/src/content.ts",
        "packages/contracts/src/assessment.ts",
      ],
      [
        "packages/persistence/src/content-repository.test.ts",
        "tests/integration/postgres-learning-state.test.ts",
        "tests/integration/postgres-content-workflow.test.ts",
      ],
    ),
    invariant(
      "INV-SESSION-001",
      "Sessão guarda somente hash e usa cookie protegido",
      "P0",
      ["RF-001", "RNF-030"],
      "application/session + password auth",
      "unauthenticated",
      [
        "packages/application/src/session.ts",
        "packages/application/src/password-auth.ts",
      ],
      ["packages/contracts/src/auth.ts", "packages/contracts/src/session.ts"],
      [
        "packages/application/src/session.test.ts",
        "packages/application/src/password-auth.test.ts",
        "tests/e2e/account-security.spec.ts",
      ],
    ),
    invariant(
      "INV-RATE-001",
      "Entrada externa é validada e limitada na borda",
      "P0",
      ["RNF-001", "RNF-002", "RNF-003"],
      "contracts schemas + HTTP validation",
      "validation_error",
      ["apps/api/src/http.ts"],
      ["packages/contracts/src/api.ts", "packages/contracts/src/auth.ts"],
      [
        "packages/contracts/src/api.test.ts",
        "packages/contracts/src/auth.test.ts",
        "apps/api/src/http.test.ts",
      ],
    ),
    invariant(
      "INV-IA-001",
      "IA e Qdrant não possuem autoridade transacional",
      "P0",
      ["RF-038", "RNF-080", "RNF-081"],
      "application ports + integrations adapters",
      "forbidden",
      [
        "packages/integrations/src/ai.ts",
        "packages/integrations/src/qdrant.ts",
        "apps/worker/src/handlers.ts",
      ],
      ["packages/contracts/src/authoring.ts"],
      [
        "packages/integrations/src/ai.test.ts",
        "packages/integrations/src/qdrant.test.ts",
        "apps/worker/src/handlers.test.ts",
      ],
    ),
    invariant(
      "INV-OUTBOX-001",
      "Efeito transacional e evento de saída não divergem",
      "P0",
      ["RNF-020", "RNF-021", "RNF-050"],
      "PostgreSQL transaction + outbox",
      "state_conflict",
      [
        "packages/persistence/src/content-repository.ts",
        "packages/persistence/src/outbox-repository.ts",
      ],
      ["packages/contracts/src/content.ts"],
      [
        "packages/persistence/src/outbox-repository.test.ts",
        "tests/integration/postgres-content-workflow.test.ts",
        "tests/integration/postgres-worker.test.ts",
      ],
    ),
    invariant(
      "INV-QDRANT-001",
      "Índice derivado pode ser reconstruído do PostgreSQL",
      "P0",
      ["RF-038", "RNF-080"],
      "worker reconciliation + PostgreSQL source of truth",
      "internal_error",
      ["apps/worker/src/reconcile.ts", "packages/integrations/src/qdrant.ts"],
      ["packages/contracts/src/authoring.ts"],
      [
        "apps/worker/src/reconcile.test.ts",
        "tests/integration/worker-qdrant-live.test.ts",
      ],
    ),
    invariant(
      "INV-RETRY-001",
      "Retry de worker é bounded e dead-lettered",
      "P0",
      ["RNF-015", "RNF-016", "RNF-017"],
      "worker loop + outbox repository",
      "internal_error",
      [
        "apps/worker/src/loop.ts",
        "packages/persistence/src/outbox-repository.ts",
      ],
      ["packages/contracts/src/content.ts"],
      [
        "apps/worker/src/loop.test.ts",
        "tests/integration/postgres-worker.test.ts",
      ],
    ),
    invariant(
      "INV-PRIVACY-001",
      "Fonte e gabarito não entram em experiência pública ou logs públicos",
      "P0",
      ["RF-031", "RF-038", "RNF-022"],
      "public projection + event redaction",
      "forbidden",
      [
        "packages/contracts/src/public-boundary.ts",
        "packages/application/src/content-use-cases.ts",
      ],
      [
        "packages/contracts/src/learning.ts",
        "packages/contracts/src/authoring.ts",
      ],
      [
        "packages/contracts/src/public-boundary.test.ts",
        "packages/application/src/content-use-cases.test.ts",
        "tests/e2e/participant-access.spec.ts",
      ],
    ),
  ]);

export function validateInvariantCatalog(
  catalog: readonly CriticalInvariant[],
): readonly string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const record of catalog) {
    if (ids.has(record.id)) errors.push(`duplicate invariant id ${record.id}`);
    ids.add(record.id);
    if (record.requirementIds.length === 0) {
      errors.push(`${record.id} has no requirement mapping`);
    }
    if (record.codePaths.length === 0) {
      errors.push(`${record.id} has no executable code evidence`);
    }
    if (record.contractPaths.length === 0) {
      errors.push(`${record.id} has no executable contract evidence`);
    }
    if (record.testPaths.length === 0) {
      errors.push(`${record.id} has no executable test evidence`);
    }
    if (record.authority.trim().length === 0) {
      errors.push(`${record.id} has no authority`);
    }
    if (record.failureCode.trim().length === 0) {
      errors.push(`${record.id} has no failure code`);
    }
  }
  return Object.freeze(errors);
}
