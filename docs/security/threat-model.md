# Threat Model — CVG Trainee Vet

- **Data:** 2026-09-09 · **Status:** vivo (revisar a cada mudança de superfície)
- **Escopo:** API (`apps/api`), worker (`apps/worker`), web (`apps/web`),
  PostgreSQL (source of truth), Qdrant (índice derivado), IA assistiva.
- **Fora de escopo neste corte:** infraestrutura de produção real, IdP externo,
  entrega de e-mail/SMS (sem provider configurado).

## 1. Assets

| # | Asset | Impacto se comprometido |
|---|-------|-------------------------|
| A1 | Sessões (`__Host-cvg_session`) | personificação de participante/staff |
| A2 | Tokens one-time (convite, recovery) | tomada de conta |
| A3 | Dados de aprendizagem (tentativas, diagnósticos, feedback) | privacidade + integridade avaliativa |
| A4 | Conteúdo editorial e gabaritos | vazamento de avaliação, fraude |
| A5 | Audit trail | repúdio, ocultação de ataque |
| A6 | Segredos de ambiente (DATABASE_URL, API keys) | compromisso total |
| A7 | Artefatos de release (SBOM, provenance) | supply-chain, deploy trojanizado |

## 2. Actors

Participante autenticado, staff (moderador/aprovador clínico/admin), anônimo
externo, operador CI, dependência comprometida (pacote npm, Action, imagem base),
insider curioso. Clínica permanece humana: nenhuma actor-IA decide nota,
gabarito, publicação, papel ou estado transacional.

## 3. Trust boundaries

1. Browser ↔ Web/API (cookies `__Host-`, CSRF, security headers).
2. API ↔ PostgreSQL (role app least-privilege, RLS contextual, sem BYPASSRLS).
3. API/Worker ↔ Qdrant (índice derivado; falha = DEGRADED, nunca decisão).
4. App ↔ provedor IA (desligável, structured-output, timeout/quota; sem segredo no cliente).
5. CI ↔ repositório (OIDC preferido, artefatos com digest, sem chave fixa).
6. Teste ↔ produção (fixtures sintéticas; nenhum dado real em teste/seed/log).

## 4. Attack surface (resumo)

~60 templates de rota (§6 registry), cookies de sessão, tokens one-time,
query/body/headers, migrations append-only, outbox/worker, proxy web, métricas
internas autenticadas, artefatos CI.

## 5. STRIDE por superfície

| Superfície | S | T | R | I | D | E | Mitigação principal |
|---|:-:|:-:|:-:|:-:|:-:|:-:|---|
| Sessão/cookie | · | ✓ | ✓ | ✓ | · | ✓ | `__Host-`, HttpOnly, SameSite, rotação, revogação |
| CSRF | ✓ | · | · | · | · | · | origin/referer/`sec-fetch-site` + cookie SameSite |
| Convite/recovery | ✓ | · | ✓ | ✓ | · | · | token crypto, hash-only, consumo atômico, expiração |
| IDOR/BOLA | · | · | · | ✓ | · | ✓ | capability + scope server-side + RLS (defesa em profundidade) |
| Rate limit | · | · | · | · | ✓ | · | classes de risco; distribuído em curso (P1-03) |
| Input | · | ✓ | · | ✓ | · | · | schemas strict, body-limit 64 KiB, duplicate-query reject |
| SQL | · | ✓ | · | ✓ | · | · | Drizzle parametrizado + RLS + role sem bypass |
| SSRF/outbound | · | · | · | · | · | ✓ | allowlist de esquemas/hosts, sem proxy-header confiável |
| XSS web | · | ✓ | · | ✓ | · | · | React escaped, CSP `frame-ancestors 'none'`, sem `dangerouslySetInnerHTML` p/ dados |
| Dependências | · | ✓ | · | ✓ | · | ✓ | lockfile, audit, CodeQL/review/OSV (fase 3), SBOM |
| Audit trail | · | ✓ | ✓ | · | · | · | append-only, actor/scope/outcome, sem payload sensível |
| Release | ✓ | ✓ | · | · | · | · | provenance, digest, evidence bundle, sem chave no repo |

## 6. Abuse cases (seleção)

1. **Força bruta em accept/recovery** → limites `authentication`/`recovery` (20/10 por min) + consumo atômico + expiração.
2. **Replay de submit/finalize** → idempotency key + CAS + conflito 409.
3. **Cross-scope read** → `principal.scopes` avaliado no servidor + RLS nega por padrão; testes live negativos.
4. **Unmatched-telemetry** (F-REG-001…006) → rotas autenticadas fora do `routeTemplate()`: métricas agregadas em `unmatched`, rate-limit por bucket compartilhado. Registry novo detecta; correção = migrar runtime p/ registry (backlog).
5. **Worker duplicado** → lease + fencing token + dead-letter; efeitos at-least-once idempotentes.
6. **Prompt injection via conteúdo** → IA nunca decide estado; output validado por schema; desligável.
7. **Secret em log/artefato** → redaction tests, secret scan no gate, `.env.example` só placeholders.

## 7. Riscos residuais aceitos neste corte

- Rate-limit single-node até o store distribuído entrar em produção (P1-03).
- 6 gaps de telemetria documentados (F-REG-001…006) até migração do runtime.
- Sem HSTS fora de produção HTTPS garantido (por desenho).
- Sem prova contra PostgreSQL/RLS prod, IdP real ou tráfego real (AAA-001).
