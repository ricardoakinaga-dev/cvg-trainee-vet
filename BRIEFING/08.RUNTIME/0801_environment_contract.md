# 0801 — Contrato de Ambientes

| Ambiente | Uso | Dados | PostgreSQL | Qdrant | IA |
|---|---|---|---|---|---|
| local | desenvolvimento | sintéticos | Docker | Docker | fake por padrão |
| CI | testes | seed descartável | container efêmero | container efêmero | fake determinístico |
| homologação | validação interna | CVG fictício/permitido | protegido | protegido | feature flag |
| produção interna | treinamento | mínimo permitido | backup/RLS | protegido/reconstruível | limite e auditoria |

## Regras

- cada ambiente usa configuração e credenciais próprias;
- produção nunca é usada para teste ou seed;
- Qdrant/IA não são acessados diretamente pelo browser;
- CI nunca usa API key real ou endpoint produtivo;
- imagem/container e lockfile são reproduzíveis;
- deploy registra commit, digest, migração e configuração não secreta;
- health/readiness são verificados antes de liberar tráfego.

