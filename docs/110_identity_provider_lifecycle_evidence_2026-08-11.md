# Evidência do ciclo provider-mediated de MFA e recovery — 2026-08-11

## Escopo

Foi fechada a lacuna técnica entre iniciar uma operação no IdP e confirmar seu challenge. O CVG continua sem armazenar credenciais, códigos, QR codes ou recovery codes; a prova desta rodada é provider-neutral e sintética.

## Entrega

- `IdentityProviderPort` agora expõe `verifyMfaEnrollment` e `completeRecovery`.
- O adapter HTTPS chama exclusivamente:
  - `POST /v1/accounts/{principal}/mfa/enrollment/verify`;
  - `POST /v1/accounts/{principal}/recovery/complete`.
- A API expõe as rotas autenticadas correspondentes e valida `operationId`/`verificationCode` com limite de 256 caracteres e rejeição de caracteres de controle.
- A tela `/account` mantém os códigos somente em memória, usa campo de senha com `one-time-code`, nunca os renderiza e os limpa após confirmação.
- Falha sem IdP continua retornando `state_conflict`; não há fallback silencioso para senha.

## Segurança e rastreabilidade

- O adapter rejeita URL HTTP e credenciais vazias; o token segue somente no header de autorização server-side.
- O corpo do provider é descartado em erros; códigos não entram em envelopes, mensagens de erro, persistência ou logs da aplicação.
- O E2E verifica que recovery e MFA chegam às rotas provider-mediated e que os códigos não permanecem na interface após sucesso.

## Verificação

- RED: testes falharam antes da existência dos métodos/contratos e as novas rotas retornaram 404.
- GREEN: `packages/application/src/identity-provider.test.ts` 8/8; contrato de conta 3/3; API/servidor 44/44; E2E Chromium `account-security.spec.ts` 1/1.
- `pnpm verify`: 447 testes, 18 skips; cobertura 85,04% statements, 80,34% branches, 86,84% functions e 85,78% lines.
- `pnpm build`, lint, typecheck, format e secret scan passaram.

## Limites

Nenhum IdP, sandbox, enrollment real, challenge real, recovery code real, step-up, revogação ou sincronização de papéis foi executado. A decisão do provedor e as credenciais autorizadas continuam necessárias para fechar o gate de produção.

## Estado

`COMPLETED` para o contrato local/provider-neutral; `WAITING_HUMAN_APPROVAL` para o provedor externo e a prova de produção.
