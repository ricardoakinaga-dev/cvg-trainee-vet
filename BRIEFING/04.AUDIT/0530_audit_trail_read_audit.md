# Auditoria AUDIT-TRAIL-034 — leitura escopada da trilha de auditoria

**Data:** 2026-08-24
**Escopo:** UC-017 / RF-080–082 — contrato, autorização, paginação cursorizada,
RLS contextual, API e painel interno de operações.
**Resultado:** **PASS LOCAL COM GAPS DE AMBIENTE E PRODUTO**.

Esta fatia é somente leitura. Ela não exporta, edita, publica, aprova conteúdo,
calcula nota, emite achado clínico ou delega decisão à IA.

## 1. Barra congelada

| Controle | Implementação | Evidência |
|---|---|---|
| Capability | `VIEW_AUDIT_TRAIL` separada de `VIEW_INTERNAL_AUDIT` | `packages/application/src/authorization.ts`, caso de uso e API |
| Escopo | `scopeId` obrigatório, comparado à sessão e aplicado no repositório | autorização, filtro SQL, RLS e testes negativos |
| Filtros | allowlist strict para ação, recurso, ator, resultado, janela, cursor e limite 1–100 | `packages/contracts/src/audit-trail.ts` |
| Ordenação | `occurred_at DESC, id DESC`, cursor opaco, consulta `limit + 1` | `packages/persistence/src/audit-trail-repository.ts` |
| Projeção | metadados redigidos; sem corpo, cookie, token, prompt ou conteúdo clínico | contrato strict, serializer HTTP e E2E de operações |
| Governança | `cvg.audit_read=on` + `cvg.audit_scope_id`, leitura append-only | migration `0033_audit_read_scope_hardening.sql` |
| Experiência | loading, vazio, erro, retry, escopo selecionável e próxima página | `apps/web/app/operations/page.tsx`, Playwright |

## 2. Correção crítica durante a rodada

A primeira policy proposta descrevia eventos globais anônimos, mas aceitava
qualquer linha com `scope_id IS NULL`. A revisão de segurança corrigiu o
desalinhamento antes do fechamento: RLS, repositório e caso de uso agora
admitem ausência de escopo somente com `actor_kind = 'ANONYMOUS'`; o contrato
rejeita evento autenticado sem escopo e o caso de uso rejeita uma resposta de
adaptador que tente introduzi-lo. Isso evita expor eventos autenticados legados
de um participante a outro escopo. O hardening seguinte fechou também a escrita:
`createAuditEntry`, o mapper PostgreSQL, tentativas, respostas e rejeições HTTP
agora exigem/propagam `scopeId` para eventos autenticados; uma entrada sem escopo
não é persistível.

A crítica também encontrou uma janela de corrida depois do parse da resposta
web e cursores estruturalmente válidos, mas semanticamente inválidos. A UI agora
revalida a versão da requisição antes de publicar estado, inclusive quando o
escopo desaparece; `TypeError` de cursor/query do repository é convertido em
`validation_error`/422 no caso de uso.

## 3. Evidência local

- RED/GREEN focal: contratos, caso de uso, cursor, API, writer e governança RLS —
  **126 testes passaram em 10 arquivos** na rodada de correção.
- Regressão global: **131 arquivos passaram, 27 foram ignorados; 623 testes
  passaram e 33 foram ignorados**; cobertura global ficou em 84,79% statements,
  80,92% branches, 86,29% functions e 85,54% lines.
- `pnpm verify`, `pnpm build`, `pnpm test:integration`, `pnpm test:e2e`,
  `pnpm audit --audit-level=high`, typecheck, lint, format, migrations e scan de
  secrets passaram localmente nesta rodada.
- O E2E sintético do painel reconhece a consulta, a projeção redigida e o
  estado de próxima página desabilitada; o browser não recebe payload interno.
- A rota responde por envelope API estável, autentica antes de ler e repete a
  autorização no caso de uso; `scopeId` vindo da URL nunca substitui a sessão.

## 4. Limites e gaps

Não houve `CVG_TEST_DATABASE_URL` nem banco PostgreSQL CVG descartável
autorizado nesta sessão. Portanto, a migration e o RLS têm prova estática e
contratual, não prova live com a role de aplicação sem `SUPERUSER/BYPASSRLS`.
Também não foram observados E2E browser→API→PostgreSQL deste recorte, workflow
remoto no mesmo SHA, grants/owners de produção, collector/retention/traces,
carga, failover, restore, provider/MFA, revisão clínica ou publicação de B-07.

A trilha atual lista metadados existentes; cobertura completa de eventos de
feedback, apelação, reflexão, atribuição e operações futuras depende de cada
caso de uso emitir `scopeId` consistente. O cursor está vinculado ao escopo e ao
fingerprint dos filtros, mas ainda não possui assinatura HMAC dedicada; isso é
um hardening P2 separado. O MVP continua sem claim de competência prática,
autonomia clínica, acreditação ou CPD jurisdicional.

## 5. Próxima ação

Registrar o estado como `COMPLETED_WITH_GAPS` somente para esta fatia. Quando
houver ambiente CVG
autorizado, aplicar a migration e provar leitura cruzada, ausência de contexto,
role sem bypass e fluxo de navegador real antes de qualquer declaração de
release.
