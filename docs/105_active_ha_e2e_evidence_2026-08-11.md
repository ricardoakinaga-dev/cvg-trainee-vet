# Evidência atual — E2E no HA ativo e fechamento operacional local

## Escopo

Esta evidência complementa `docs/104_remediation_evidence_2026-08-11.md` e registra a correção da rota web→API no runtime HA, a execução do E2E contra o serviço ativo e a repetição dos gates após a recriação da imagem. Todos os dados da fixture são sintéticos; nenhum prontuário, tutor, foto, PDF, segredo ou credencial é registrado.

## Correção de topologia

O edge público continua separado do canal interno:

| Canal | Host | Caddy | Uso |
|---|---:|---:|---|
| HTTP público/staging | `3180` | `8080` | health e redirect HTTP→HTTPS |
| HTTPS interno/staging | `3181` | `8443` | TLS interno para verificação |
| API interno loopback | `3182` (`127.0.0.1`) | `8081` | web service e E2E HA ativo |
| Web | `3100` | — | interface Next.js |

O serviço [cvg-trainee-vet-web.service](/home/ricardo/.config/systemd/user/cvg-trainee-vet-web.service) aponta para `http://127.0.0.1:3182`. Isso evita que o proxy atravesse o redirect intencional do canal público `3180` em requisições de API. O canal `3182` não é ingress público nem rota de participante.

## E2E contra o runtime existente

Com API-A/API-B e worker-A/worker-B recriados a partir da imagem final e saudáveis:

```text
pnpm test:e2e:active-ha
PASS — 2/2 cenários Chromium
```

Os cenários provaram browser→web proxy→edge interno→API real→PostgreSQL real para health/login e para iniciar, salvar e submeter uma atividade sintética persistida. A fixture administrativa foi iniciada apenas pelo serviço Compose `real-e2e-fixture`, copiada para um arquivo temporário e removida no teardown.

Após o teardown, a consulta administrativa encontrou:

```text
accounts=0
activities=0
items=0
content=0
sessions=0
activity_assignments=0
learning_assignments=0
runtime_states=0
```

Foram preservados 11 registros sintéticos recentes de auditoria append-only, distribuídos entre convite, login, tentativa, resposta e envio. A tabela de auditoria possui trigger de imutabilidade; portanto, esses registros não são apagados como parte do cleanup. Não restou container de fixture.

## E2E descartável e restore

Em PostgreSQL efêmero, com papel da aplicação `NOSUPERUSER`/`NOBYPASSRLS` e papel administrativo separado:

```text
CVG_RUN_REAL_E2E=true pnpm test:e2e        PASS — 14/14
pnpm test:integration:restore              PASS — 1/1, marcador em banco isolado
```

O teste de restore recebeu timeout de 60 s porque o dump/restore do catálogo HA excede o timeout unitário padrão de 5 s. Após a execução, não havia tabela marcador nem banco temporário remanescente.

## Gates finais locais

```text
pnpm verify                                PASS — 410 testes, 17 skips
coverage                                   84,85% statements / 80,07% branches
                                           86,55% functions / 85,61% lines
pnpm build                                 PASS
pnpm audit --audit-level=high              PASS — sem vulnerabilidades conhecidas
pnpm ops:verify-ha                         PASS — portas 8080/8081/8443
pnpm ops:verify-edge-security              PASS — HTTP/HTTPS/redirect/headers
pnpm ops:verify-durable-traces             PASS — trace após restart do Tempo
pnpm ops:verify-release-manifest           PASS
CVG_LOAD_TARGET=... pnpm ops:load-smoke    PASS — 200/200, 100%, p95 75,21 ms
```

A imagem local ativa é `cvg-trainee-vet:local`, digest local `sha256:bf457dddf975ac1e6c3b6acb48d50acab6f608ce9af3a7fd1c3f96cac475`. A implementação desta janela está no commit `80fc9cb5c48e772d9b2cc0a27795bbb2f6eacde9`; o commit de pinagem `9e9759310542b8f3e7a85aa1f1cc772cd41b8c5f` fixa esse SHA no manifesto de rastreabilidade.

## Limites não resolvidos como produção

O gate `pnpm ops:verify-production-security` permanece explicitamente `NOT_EXECUTED` fora de ambiente aprovado. Ainda dependem de decisão/ambiente humano: provedor externo de identidade com MFA e recuperação, domínio/DNS/certificado gerenciado, storage externo de traces e backups, RPO/RTO de produção, deploy/rollback autorizado, CI remoto e revisão clínica semântica dos packs. Nenhuma prova local acima é declarada equivalente a esses gates.
