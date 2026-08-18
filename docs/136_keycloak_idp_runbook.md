# Runbook — IdP self-hosted (Keycloak): MFA, step-up e recovery

> **Objetivo:** provisionar um provedor de identidade real (Keycloak
> self-hosted) que satisfaça o gate `verify-identity-provider-readiness.mjs`
> (que exige `provider=EXTERNAL_IDENTITY_PROVIDER`, `recovery=AVAILABLE`,
> `mfa=ENABLED`) e os requisitos de MFA/step-up/revogação/rotação do PRD.
>
> **Status:** runbook de provisionamento. A execução exige credenciais e
> decisões do sponsor; não há evidência de runtime sem o ambiente aprovado.

## Pré-condições

- `IDENTITY_PROVIDER_REQUIRED` migra de `false` para `true` no ambiente aprovado;
- domínio/TLS público aprovado (o gate `parseHttpsUrl` **rejeita** `http://`);
- reuso do contrato existente `GET /v1/accounts/{principal}/security`.

## 1. Topologia

```text
Caddy edge (TLS)
  └── Keycloak  (https://id.cvg.example)
        ├── realm: cvg
        ├── client: cvg-api  (confidential, OIDC authorization-code + PKCE)
        ├── users: sujeitos técnicos + aprovadores clínicos (não participantes reais)
        └── federation/step-up: MFA (TOTP) + recovery codes
```

## 2. Provisionamento (Compose)

Adicionar serviço ao `infra/production/docker-compose.ha.yml` (exemplo):

```yaml
keycloak:
  image: quay.io/keycloak/keycloak:26.0  # versão fixada
  command: ["start", "--proxy-headers=xforwarded"]
  environment:
    KC_HOSTNAME: id.cvg.example
    KC_DB: postgres
    KC_DB_URL: jdbc:postgresql://postgres:5432/keycloak
    KC_DB_USERNAME: ${KEYCLOAK_DB_USER}
    KC_DB_PASSWORD: ${KEYCLOAK_DB_PASSWORD}
    KEYCLOAK_ADMIN: ${KEYCLOAK_ADMIN}
    KEYCLOAK_ADMIN_PASSWORD: ${KEYCLOAK_ADMIN_PASSWORD}
  depends_on:
    postgres: {condition: service_healthy}
  networks: [default]
```

> Segredos (`KEYCLOAK_*`) entram só por secret manager / `.env.local` (0600),
> nunca no Git. O PostgreSQL do Keycloak pode ser o mesmo host com um database
> dedicado `keycloak`; não reutilizar a role `cvg_app`.

## 3. Realm, client e MFA/recovery

Requisitos a configurar no realm `cvg`:

| Item | Valor exigido pelo gate | Observação |
|---|---|---|
| MFA | `mfa=ENABLED` | fluxo de login com TOTP/OTP obrigatório para papéis sensíveis |
| Recovery | `recovery=AVAILABLE` | recovery codes e/ou e-mail de recuperação habilitados |
| Step-up | exigir reautenticação MFA | para troca de senha, rotação e ações administrativas |
| Revogação | revogação imediata de sessões | em troca de senha, remoção de papel e suspensão de conta |
| Rotação de papel | sincronização de roles/scopes | para o lifecycle de `CLINICAL_APPROVER` |

Comandos `kcadm.sh` (executados no ambiente aprovado, com admin):

```bash
kcadm.sh config credentials --server https://id.cvg.example --realm master \
  --user "$KEYCLOAK_ADMIN" --password "$KEYCLOAK_ADMIN_PASSWORD"
kcadm.sh create realms -s realm=cvg -s enabled=true
kcadm.sh create clients -r cvg -s clientId=cvg-api -s publicClient=false \
  -s standardFlowEnabled=true -s directAccessGrantsEnabled=false
# habilitar MFA obrigatório no fluxo do browser para o realm cvg
```

## 4. Contrato de prontidão (gate existente)

O gate já exige `GET /v1/accounts/{principal}/security` com Bearer, retornando:

```json
{ "provider": "EXTERNAL_IDENTITY_PROVIDER", "recovery": "AVAILABLE", "mfa": "ENABLED" }
```

O Keycloak não expõe essa rota nativamente. É necessário um **adapter thin**
server-side (ex.: script Node no ambiente de execução, ou extensão SPI) que:
- autentica o token do probe;
- consulta o realm (MFA obrigatório? recovery habilitado?);
- responde o JSON do contrato, sem expor segredos/dados.

O adapter vive fora do Git junto à infraestrutura; o gate permanece o mesmo.

## 5. Validação (execução real, depois do provisionamento)

```bash
CVG_VERIFY_IDENTITY_PROVIDER=true \
IDENTITY_PROVIDER_URL=https://id.cvg.example \
IDENTITY_PROVIDER_TOKEN=<fornecido pelo secret manager> \
CVG_IDENTITY_PROVIDER_PROBE_PRINCIPAL=cvg-idp-probe \
pnpm ops:verify-identity-provider
```

Saída esperada: `PASS` (com `recovery=AVAILABLE` e `mfa=ENABLED`).

## 6. Passos posteriores (end-to-end, não cobertos pelo probe simples)

O gate só prova a *disponibilidade*. Para fechar o item de segurança o caminho
completo exige E2E provider-mediated:

- enrollment (convite → conta → senha → MFA);
- challenge/step-up na troca de senha e na rotação;
- revogação de sessão em remoção de papel;
- recovery code / fluxo de reset;
- sync de roles `CLINICAL_APPROVER`/`MODERATOR`/`ADMIN`.

Cada um vira teste E2E no RC, com dados sintéticos e teardown.

## 7. Segurança e limites

- `IDENTITY_PROVIDER_URL` deve ser HTTPS sem credencial embutida (o gate valida);
- `IDENTITY_PROVIDER_TOKEN` e senhas nunca em log/Git/prompt;
- Keycloak roda com `read_only`, non-root, capabilities mínimas (mesmo padrão do
  `0803` para os demais serviços);
- chave de signing do realm armazenada no secret manager, com rotação documentada.
