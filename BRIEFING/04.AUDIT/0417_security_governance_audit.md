# 0417 — Security and Governance Audit

## Reauditoria vigente — 2026-08-11

Sem P0 observado. Hash scrypt, cookie HttpOnly/Secure/SameSite, sessão por hash, mensagens uniformes de login, validação estrita, CSRF, autorização server-side, RLS e scans de segredo/dependência passaram. Permanecem P1: MFA/recuperação externa, TLS e headers de produção, rate limit dedicado/distribuído, traces duráveis, deployment/rollback e fechamento do worktree em SHA.

Resultado: PARTIAL — sem achado P0 no recorte F3-S3 + complementos F3-S4/F3-S5/F3-S6/F3-S8; sessão, convite hash-only, aceite único, rotação/revogação, correção por identidade clínica, auditoria, atividade por atribuição, transição editorial, worker redigido, RLS mínima, superfície participante sem campos proibidos, redaction do sink e hardening de borda foram verificadas, escala operacional e recuperação além do convite ainda pendentes.

## Verificar

- sessão `HttpOnly/Secure/SameSite`, CSRF, rate limit e recuperação;
- deny-by-default, ownership, escopo e RLS;
- `CLINICAL_APPROVER` somente Ricardo e sem delegação indevida;
- separação de gabarito, autoria, fonte e projeção participante;
- SQL parametrizado, validação Zod, XSS/HTML seguro e dependências sem crítica;
- segredos fora do Git e rotação se encontrados;
- auditoria de ações sensíveis e redaction;
- Qdrant/IA sem acesso do navegador e sem dados proibidos.

Achado crítico de segredo, acesso cruzado, exposição autoral ou alteração não autorizada de nota interrompe o release e gera remediação P0.

## Evidência

- PASS: secret scan limpo, pnpm audit sem vulnerabilidades conhecidas, schemas Zod estritos, SQL via Drizzle parametrizado, política deny-by-default, convite somente para `ADMIN`, token hash-only, sessão com cookie `__Host-`/HttpOnly/Secure/SameSite, revogação, correção somente por identidade clínica configurada, atividade filtrada por atribuição/estado/publicação e testes de escopo/exposição;
- PASS: auditoria metadata-only com RLS contextual mínima e trigger append-only; Qdrant/IA não são acessíveis pelo browser, payloads de evento rejeitam campos proibidos, o worker não grava texto no vetor e o sink IA permanece `DRAFT_AI`;
- PASS: CSRF por origem/referer/metadado Fetch, rate limit local bounded, `Retry-After`, health isento e rejeição antes do caso de uso foram construídos e testados;
- PARTIAL: recuperação além do convite administrativo, rate limit compartilhado para escala horizontal e RLS contextual completo por participante/escopo ainda não foram construídos;
- NOT_EXECUTED: análise dinâmica web contra API real, axe/revisão manual, collector/retention de observabilidade, restore e rotação real de segredo.
