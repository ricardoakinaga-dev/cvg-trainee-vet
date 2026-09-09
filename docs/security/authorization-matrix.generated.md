# Authorization Matrix — generated from route registry

> Gerado por `node scripts/generate-auth-matrix.mjs`. NÃO editar à mão:
> a fonte canônica é `apps/api/src/routing/route-registry.ts` e o teste
> `tests/integration/auth-matrix-generated.test.ts` falha se este arquivo
> estiver desatualizado.

Total: 57 entradas.

| Method | Route | Auth | Capability | Enforcement | Risk |
|---|---|---|---|---|---|
| GET | `/health/live` | public | — | http | public-low-risk |
| GET | `/health/ready` | public | — | http | public-low-risk |
| GET | `/health/dependencies` | public | — | http | public-low-risk |
| GET | `/internal/metrics` | internal | VIEW_INTERNAL_AUDIT | http | internal |
| GET | `/internal/operations` | internal | VIEW_INTERNAL_AUDIT | http | internal |
| POST | `/api/v1/invitations/accept` | public | — | token | authentication |
| POST | `/api/v1/recovery/accept` | public | — | token | recovery |
| POST | `/api/v1/session/revoke` | session | — | http | authentication |
| GET | `/api/v1/session/current` | session | — | http | authentication |
| POST | `/api/v1/session/rotate` | session | — | http | authentication |
| POST | `/api/v1/internal/invitations` | internal | MANAGE_ACCOUNT_LIFECYCLE | application | mutation |
| POST | `/api/v1/internal/learning-assignments` | internal | MANAGE_LEARNING_ASSIGNMENTS | http | mutation |
| POST | `/api/v1/internal/assessment-workflows` | internal | MANAGE_ASSESSMENT_WORKFLOWS | http | mutation |
| POST | `/api/v1/feedback` | session | CREATE_FEEDBACK_TICKET | http | mutation |
| GET | `/api/v1/feedback` | session | VIEW_OWN_FEEDBACK | http | expensive-read |
| GET | `/api/v1/appeals` | session | VIEW_OWN_APPEALS | http | expensive-read |
| POST | `/api/v1/appeals` | session | CREATE_APPEAL | http | mutation |
| POST | `/api/v1/attempts` | session | START_OWN_ATTEMPT | http | mutation |
| GET | `/api/v1/learning-path` | session | VIEW_OWN_ACTIVITY | http | expensive-read |
| GET | `/api/v1/dashboard` | session | VIEW_OWN_ACTIVITY, VIEW_STAFF_DASHBOARD | http | expensive-read |
| GET | `/api/v1/audit` | session | VIEW_AUDIT_TRAIL | http | expensive-read |
| GET | `/api/v1/internal/reports/continuing-education` | internal | VIEW_PROGRAM_METRICS | http | expensive-read |
| GET | `/api/v1/internal/reports/reflections` | internal | VIEW_PROGRAM_METRICS | http | expensive-read |
| GET | `/api/v1/internal/content/review-queue` | internal | VIEW_CONTENT_REVIEW_QUEUE | http | expensive-read |
| POST | `/api/v1/content/drafts` | internal | AUTHOR_CONTENT | application | mutation |
| GET | `/api/v1/internal/appeals/review-queue` | internal | REVIEW_APPEAL | http | expensive-read |
| GET | `/api/v1/internal/feedback` | internal | VIEW_FEEDBACK_QUEUE | http | expensive-read |
| GET | `/api/v1/internal/session/scopes` | internal | VIEW_INTERNAL_SCOPES | http | expensive-read |
| POST | `/api/v1/diagnostics/b07/sessions` | session | START_OWN_DIAGNOSTIC_SESSION | http | mutation |
| GET | `/api/v1/diagnostics/b07/sessions/current` | session | VIEW_OWN_DIAGNOSTIC_SESSION | http | expensive-read |
| PUT | `/api/v1/diagnostics/b07/sessions/:sessionId/answers/:itemId` | session | SAVE_OWN_DIAGNOSTIC_ANSWER | http | mutation |
| POST | `/api/v1/diagnostics/b07/sessions/:sessionId/finalize` | session | FINALIZE_OWN_DIAGNOSTIC_SESSION | http | mutation |
| GET | `/api/v1/diagnostics/b07/sessions/:sessionId` | session | VIEW_OWN_DIAGNOSTIC_SESSION | http | expensive-read |
| * | `/api/v1/activities/:activityId` | session | VIEW_OWN_ACTIVITY | http | expensive-read |
| * | `/api/v1/activities/:activityId/progress` | session | VIEW_OWN_ACTIVITY | http | expensive-read |
| * | `/api/v1/curriculum/modules/:moduleId/runtime` | session | VIEW_OWN_ACTIVITY | http | expensive-read |
| * | `/api/v1/attempts/:attemptId/answers` | session | SAVE_OWN_ANSWER | http | mutation |
| * | `/api/v1/attempts/:attemptId/submit` | session | SUBMIT_OWN_ATTEMPT | http | mutation |
| * | `/api/v1/attempts/:attemptId/feedback` | session | VIEW_OWN_FEEDBACK | http | expensive-read |
| * | `/api/v1/internal/attempts/:attemptId/correct` | internal | CORRECT_ATTEMPT | application | mutation |
| * | `/api/v1/internal/content/:contentId/transition` | internal | AUTHOR_CONTENT, MODERATE_CONTENT, APPROVE_CLINICAL_CONTENT, PUBLISH_CONTENT | application | mutation |
| GET | `/api/v1/internal/content/:contentId/versions/:version/authoring` | internal | VIEW_INTERNAL_SOURCE | http | expensive-read |
| POST | `/api/v1/internal/content/:contentId/review` | internal | MODERATE_CONTENT, APPROVE_CLINICAL_CONTENT | http | mutation |
| * | `/api/v1/internal/curriculum/modules/:moduleId/evaluate` | internal | MODERATE_CONTENT | http | internal |
| POST | `/api/v1/internal/diagnostics/b07/evaluate` | internal | MODERATE_CONTENT | http | internal |
| POST | `/api/v1/internal/diagnostics/:diagnosticResultId/assign` | internal | MANAGE_LEARNING_ASSIGNMENTS | http | mutation |
| * | `/api/v1/internal/learning-assignments/:assignmentId/transition` | internal | MANAGE_LEARNING_ASSIGNMENTS | http | mutation |
| * | `/api/v1/internal/assessment-workflows/:resultId/transition` | internal | MANAGE_ASSESSMENT_WORKFLOWS | http | mutation |
| GET | `/api/v1/internal/feedback/:ticketId/history` | internal | VIEW_FEEDBACK_QUEUE | http | expensive-read |
| PATCH | `/api/v1/internal/feedback/:ticketId/triage-metadata` | internal | MANAGE_FEEDBACK_METADATA | http | mutation |
| GET | `/api/v1/internal/appeals/:appealId/impact-preview` | internal | REVIEW_APPEAL | http | expensive-read |
| GET | `/api/v1/internal/appeals/:appealId/history` | internal | REVIEW_APPEAL | http | expensive-read |
| * | `/api/v1/internal/feedback/:ticketId` | internal | TRANSITION_FEEDBACK_TICKET | http | mutation |
| * | `/api/v1/internal/accounts/:accountId/recovery` | internal | MANAGE_ACCOUNT_LIFECYCLE | http | recovery |
| * | `/api/v1/internal/appeals/:appealId/transition` | internal | REVIEW_APPEAL | http | mutation |
| PATCH | `/api/v1/internal/accounts/:accountId/status` | internal | MANAGE_ACCOUNT_LIFECYCLE | http | mutation |
| POST | `/api/v1/internal/accounts/:accountId/invitation` | internal | MANAGE_ACCOUNT_LIFECYCLE | http | mutation |

## Notes

- `POST /api/v1/invitations/accept`: one-time invitation token; no session required
- `POST /api/v1/recovery/accept`: one-time recovery token; no session required
- `POST /api/v1/session/revoke`: cookie-possession lifecycle; no principal capability, handler-enforced
- `GET /api/v1/session/current`: cookie-possession lifecycle; no principal capability, handler-enforced
- `POST /api/v1/session/rotate`: cookie-possession lifecycle; no principal capability, handler-enforced
- `GET /api/v1/feedback`: F-REG-004 closed in R2-001: registry governs the runtime
- `GET /api/v1/dashboard`: participant branch uses VIEW_OWN_ACTIVITY; staff branch VIEW_STAFF_DASHBOARD
- `GET /api/v1/internal/reports/reflections`: F-REG-006 closed in R2-001: registry governs the runtime
- `GET /api/v1/internal/feedback`: F-REG-005 closed in R2-001: registry governs the runtime
- `* /api/v1/activities/:activityId`: routeTemplate() classifies any method; dispatch serves GET
- `* /api/v1/activities/:activityId/progress`: routeTemplate() classifies any method; dispatch serves GET
- `* /api/v1/curriculum/modules/:moduleId/runtime`: routeTemplate() classifies any method; dispatch serves GET
- `* /api/v1/attempts/:attemptId/answers`: routeTemplate() classifies any method; dispatch serves POST
- `* /api/v1/attempts/:attemptId/submit`: routeTemplate() classifies any method; dispatch serves POST
- `* /api/v1/attempts/:attemptId/feedback`: routeTemplate() classifies any method; dispatch serves GET
- `* /api/v1/internal/attempts/:attemptId/correct`: routeTemplate() classifies any method; dispatch serves POST; capability enforced in correction use case
- `* /api/v1/internal/content/:contentId/transition`: routeTemplate() classifies any method; dispatch serves POST; capability selected by event in content use case
- `POST /api/v1/internal/content/:contentId/review`: capability selected by review decision at the http layer
- `* /api/v1/internal/curriculum/modules/:moduleId/evaluate`: routeTemplate() classifies any method; dispatch serves POST
- `* /api/v1/internal/learning-assignments/:assignmentId/transition`: routeTemplate() classifies any method; dispatch serves POST
- `* /api/v1/internal/assessment-workflows/:resultId/transition`: routeTemplate() classifies any method; dispatch serves POST
- `GET /api/v1/internal/appeals/:appealId/history`: F-REG-003 closed in R2-001: registry governs the runtime
- `* /api/v1/internal/feedback/:ticketId`: routeTemplate() classifies any method; dispatch serves PATCH
- `* /api/v1/internal/accounts/:accountId/recovery`: routeTemplate() classifies any method; dispatch serves POST
- `* /api/v1/internal/appeals/:appealId/transition`: routeTemplate() classifies any method; dispatch serves POST
- `PATCH /api/v1/internal/accounts/:accountId/status`: F-REG-001 closed in R2-001: registry governs the runtime
- `POST /api/v1/internal/accounts/:accountId/invitation`: F-REG-002 closed in R2-001: registry governs the runtime

