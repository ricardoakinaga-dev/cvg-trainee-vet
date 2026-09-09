# Trust Boundaries

1. **Browser ↔ Web/API** — cookies `__Host-`, CSRF (origin/referer/sec-fetch-site),
   security headers (CSP, nosniff, same-origin referrer, DENY framing; HSTS só
   com HTTPS de produção garantido).
2. **Web proxy ↔ API** — proxy server-side encaminha somente `__Host-cvg_session`;
   upstream nunca confia em header de cliente para identidade.
3. **API ↔ PostgreSQL** — role app least-privilege (allowlist de tabelas), sem
   `SUPERUSER`/`BYPASSRLS`; contexto transacional de escopo; `FORCE RLS` onde
   aplicável; roles de migration/admin separadas.
4. **App ↔ Qdrant** — índice derivado; credencial escopada; falha = DEGRADED.
5. **App ↔ IA** — server-side, structured-output validado, timeout/quota,
   desligável; sem chave no cliente, sem decisão automática.
6. **CI ↔ repo** — OIDC preferido; artefatos com digest; SBOM + provenance;
   sem segredo no Git; Actions com SHA imutável (fase 3).
7. **Teste ↔ realidade** — fixtures sintéticas; `CVG_TEST_DATABASE_URL` descartável;
   nada aqui prova produção (ver classificação de evidência no master prompt §81).
