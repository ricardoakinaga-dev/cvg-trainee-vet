# Evidência de prontidão do provedor de identidade — 2026-08-11

## Objetivo

Fechar a lacuna de configuração falsa-positiva: a presença de URL e token não basta para declarar MFA e recuperação disponíveis. O gate agora pode consultar o endpoint de segurança do provedor no ambiente aprovado.

## Contrato implementado

`scripts/verify-identity-provider-readiness.mjs`:

- exige execução explícita por `CVG_VERIFY_IDENTITY_PROVIDER=true`;
- exige `IDENTITY_PROVIDER_URL`, `IDENTITY_PROVIDER_TOKEN` e `CVG_IDENTITY_PROVIDER_PROBE_PRINCIPAL` somente no ambiente autorizado;
- aceita apenas URL HTTPS sem credenciais embutidas;
- chama `GET /v1/accounts/{principal}/security` com principal codificado e token somente no header `Authorization`;
- exige `provider=EXTERNAL_IDENTITY_PROVIDER`, `recovery=AVAILABLE` e `mfa=ENABLED`;
- não imprime token, corpo de erro, principal ou payload do provedor;
- o gate `ops:verify-production-security` agora exige o principal de probe e executa essa verificação live antes de retornar `PASS`.

## TDD e evidência

```text
RED       importação do verificador sem implementação: falha
GREEN     tests/integration/identity-provider-readiness.test.ts: 5/5
GREEN     pnpm lint: PASS
GREEN     pnpm typecheck: PASS
NOT_EXECUTED  pnpm ops:verify-identity-provider sem flag explícita
FAIL_CLOSED   com CVG_VERIFY_IDENTITY_PROVIDER=true e sem IdP: identity_provider_not_ready
```

O teste usa somente respostas HTTP sintéticas e verifica URL codificada, HTTPS, ausência de segredo no resultado, respostas inválidas, falhas HTTP e status não pronto. Nenhuma chamada a provedor real foi feita nesta rodada.

## Limites

Este gate melhora a prova de disponibilidade declarada, mas não substitui sandbox/E2E real de enrollment, challenge, recovery code, step-up, revogação ou sincronização de papéis. O provedor, a política MFA/recovery, o principal de probe e as credenciais continuam dependentes de decisão humana e secret manager.
