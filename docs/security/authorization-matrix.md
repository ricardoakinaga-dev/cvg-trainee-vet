# Authorization Matrix — derivada do route registry

- **Fonte canônica (gerada, §60):**
  `docs/security/authorization-matrix.generated.md`, produzida por
  `node scripts/generate-auth-matrix.mjs` a partir de
  `apps/api/src/routing/route-registry.ts` e verificada por
  `tests/integration/auth-matrix-generated.test.ts`. Esta página narrativa
  explica a leitura; em caso de divergência, vale o arquivo gerado.
- **Verificação manual adicional:** `apps/api/src/http.ts` e
  `packages/application/src/*use-cases.ts`.
- **Leitura:** `enforcement http` = checado em `http.ts` via `isAllowed`/`canAccess`;
  `application` = checado no caso de uso; `token` = token one-time sem sessão.
- **Regra executável:** `route-registry.test.ts` falha se rota privada surgir sem
  capability explícita. Rotas de ciclo de sessão autorizam por posse de sessão
  viva (allowlist explícita de 3 rotas no teste).

| Route | Auth | Capability | Enforcement | Scope | RLS | Tests |
|---|---|---|---|---|---|---|
| `GET /health/*` (3) | public | — | http | — | — | server.test |
| `POST /api/v1/invitations/accept` | public | — (one-time token) | token | — | invite hash | http.test |
| `POST /api/v1/recovery/accept` | public | — (one-time token) | token | — | recovery hash | http.test |
| `POST /session/revoke`, `GET /session/current`, `POST /session/rotate` | session | — (sessão viva) | http | próprio | sessions | http.test |
| `POST /api/v1/attempts` | session | START_OWN_ATTEMPT | http | owner+scope | attempts/answers | http.test |
| `POST .../answers` | session | SAVE_OWN_ANSWER | http | owner+scope | attempts | http.test |
| `POST .../submit` | session | SUBMIT_OWN_ATTEMPT | http | owner+scope | attempts | http.test |
| `GET .../feedback` | session | VIEW_OWN_FEEDBACK | http | owner+scope | attempts | http.test |
| `GET /activities/:id`, `/progress` | session | VIEW_OWN_ACTIVITY | http | member scope | activities/items | http.test |
| `GET /curriculum/modules/:id/runtime` | session | VIEW_OWN_ACTIVITY | http | member scope | runtime states | http.test |
| `GET /learning-path` | session | VIEW_OWN_ACTIVITY | http | member scope | assignments | journey tests |
| `GET /dashboard` | session | VIEW_OWN_ACTIVITY / VIEW_STAFF_DASHBOARD | http | member/staff scope | assignments | http.test |
| `GET /audit` | session | VIEW_AUDIT_TRAIL | http | scope | audit | audit tests |
| `POST /feedback`, `GET /feedback` | session | CREATE/VIEW_OWN_FEEDBACK | http | owner+scope | tickets | feedback tests |
| `GET/POST /appeals` | session | VIEW_OWN_APPEALS / CREATE_APPEAL | http | owner+scope | appeals | appeal tests |
| `POST /diagnostics/b07/sessions` | session | START_OWN_DIAGNOSTIC_SESSION | http | single scope | diagnostic_sessions | journey tests |
| `GET .../current`, `GET .../:id` | session | VIEW_OWN_DIAGNOSTIC_SESSION | http | single scope | diagnostic_sessions | journey tests |
| `PUT .../answers/:item` | session | SAVE_OWN_DIAGNOSTIC_ANSWER | http | single scope | diagnostic answers | journey tests |
| `POST .../finalize` | session | FINALIZE_OWN_DIAGNOSTIC_SESSION | http | single scope | diagnostic_sessions | journey tests |
| `POST /content/drafts` | internal | AUTHOR_CONTENT | application | scope | content tables | authoring tests |
| `POST /internal/invitations` | internal | MANAGE_ACCOUNT_LIFECYCLE | application | scope | invitations | account tests |
| `PATCH /accounts/:id/status` | internal | MANAGE_ACCOUNT_LIFECYCLE | http | scope | accounts | account tests |
| `POST /accounts/:id/invitation` | internal | MANAGE_ACCOUNT_LIFECYCLE | http | scope | invitations | account tests |
| `POST /accounts/:id/recovery` | internal | MANAGE_ACCOUNT_LIFECYCLE | http | scope | recovery | recovery tests |
| `POST /internal/learning-assignments` + `/transition` | internal | MANAGE_LEARNING_ASSIGNMENTS | http | scope | assignments | assignment tests |
| `POST /internal/assessment-workflows` + `/transition` | internal | MANAGE_ASSESSMENT_WORKFLOWS | http | scope | workflows | workflow tests |
| `PATCH /internal/feedback/:id` | internal | TRANSITION_FEEDBACK_TICKET | http | scope | tickets | feedback tests |
| `PATCH .../triage-metadata` | internal | MANAGE_FEEDBACK_METADATA | http | scope | tickets | feedback tests |
| `GET .../history`, `GET /internal/feedback` | internal | VIEW_FEEDBACK_QUEUE | http | scope | tickets/history | feedback tests |
| `GET /internal/content/review-queue` | internal | VIEW_CONTENT_REVIEW_QUEUE | http | scope | content | authoring tests |
| `GET /internal/appeals/review-queue|history|impact-preview`, `POST .../transition` | internal | REVIEW_APPEAL | http | scope | appeal tests |
| `GET /internal/reports/continuing-education|reflections` | internal | VIEW_PROGRAM_METRICS | http | scope | aggregates | report tests |
| `GET /internal/session/scopes` | internal | VIEW_INTERNAL_SCOPES | http | scope | sessions | session tests |
| `POST /internal/content/:id/transition` | internal | AUTHOR/MODERATE/APPROVE/PUBLISH por evento | application | scope | content | content tests |
| `GET .../versions/:v/authoring` | internal | VIEW_INTERNAL_SOURCE | http | scope | content versions | authoring tests |
| `POST .../review` | internal | MODERATE/APPROVE por decisão | http | scope | content | authoring tests |
| `POST .../curriculum/modules/:id/evaluate` | internal | MODERATE_CONTENT | http | scope | runtime | curriculum tests |
| `POST /internal/diagnostics/b07/evaluate` | internal | MODERATE_CONTENT | http | scope | diagnostic drafts | diagnostic tests |
| `POST /internal/diagnostics/:id/assign` | internal | MANAGE_LEARNING_ASSIGNMENTS | http | scope | assignments | assignment tests |
| `POST /internal/attempts/:id/correct` | internal | CORRECT_ATTEMPT | application | scope | attempts | correction tests |
| `GET /internal/metrics`, `/internal/operations` | internal | VIEW_INTERNAL_AUDIT | http | — | — | server tests |

Cross-scope: negado por padrão (capability exige `scopeId` do servidor + RLS
contextual; testes live negativos existentes). Auditoria RLS completa tabela a
tabela permanece backlog (P2-06 na baseline é policy; cobertura total é fase 2).
