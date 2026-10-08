# Gestão de segredos

Achado SE-06 / M24. Regras já vigentes: nenhum segredo em Git, issue, log,
prompt ou interface; `verify:secrets` no gate; `.env*` ignorado.

## Inventário

| Segredo | Onde vive | Dono | Rotação |
|---|---|---|---|
| `CVG_MIGRATOR_DB_PASSWORD` (role `cvg`) | secret store do provedor → `deploy/.env` | operador técnico | semestral ou a qualquer suspeita |
| `CVG_APP_DB_PASSWORD` (role `cvg_app`) | idem | operador técnico | semestral |
| `AUDIT_CURSOR_SECRET` (≥ 32 bytes) | idem | operador técnico | anual; rotação invalida cursores ativos (sem perda de dados) |
| `CVG_ALERT_WEBHOOK_URL` | idem | dono do canal de alertas | ao trocar canal |
| `AI_API_KEY`, `EMBEDDING_API_KEY`, `QDRANT_API_KEY` | idem; ausentes enquanto `AI_ENABLED`/`QDRANT_ENABLED=false` | Ricardo | ao ligar a feature e semestral |
| `GITHUB_TOKEN` do CI | emitido por run | GitHub | automático |
| Assinatura de imagens | Cosign keyless OIDC; sem chave | GitHub | não há chave |

## Regras

- Um segredo por ambiente; homologação e produção nunca compartilham valores.
- Geração: `openssl rand -base64 32` (ou gerador do provedor).
- `deploy/.env` fica somente no host, permissão `0600`, dono do serviço.
- Rotação de senha de banco: criar a nova senha no PostgreSQL, atualizar o
  secret store, `docker compose up -d` dos serviços afetados, confirmar
  `/health/ready` 200, só então remover a senha antiga.
- Vazamento ou suspeita: `docs/runbooks/compromised-secret.md`.
- Ensaiar uma rotação completa em homologação antes do piloto e registrar.
