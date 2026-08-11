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
pnpm verify                                PASS — 417 testes, 17 skips
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

## Reauditoria após isolamento do build descartável

O E2E descartável reconstruía anteriormente o `.next` operacional com o destino temporário `3101`. Isso fazia o serviço systemd voltar a responder 500 depois do teste, apesar de `3182` e das APIs estarem saudáveis. A correção adiciona `CVG_WEB_DIST_DIR`, usa `.next-e2e-real` no fluxo descartável e preserva `.next` para o runtime operacional. O runner também aguarda `health/dependencies` do web proxy antes do browser.

```text
fix: isolate disposable E2E build artifact       57ed11985312a573a3649ed48c6b15b399e7bf8f
web root/dependencies após teardown              200/200
pnpm test:e2e:active-ha                          PASS — 2/2
fixture mutável após teardown                    0
```

O artefato operacional foi reconstruído com `CVG_API_INTERNAL_URL=http://127.0.0.1:3182` e o serviço web permaneceu saudável depois da execução. Esta correção elimina a interferência local entre o E2E descartável e o runtime HA; não altera os limites de produção listados acima.

O pin da evidência anterior era `9c585a9`, com código em
`57ed11985312a573a3649ed48c6b15b399e7bf8f`; a extensão de release/rollback
local está congelada no commit `35d5c57` (sobre `cfaeed3`) e foi fixada no manifesto após a
execução dos gates.

## Rehearsal local de deploy e rollback — 2026-08-11

Foi adicionado um caminho explícito de rehearsal local, protegido por
`CVG_RUN_LOCAL_RELEASE_REHEARSAL=true`. O release normal continua exigindo
`pull` de imagem imutável; `CVG_RELEASE_PULL=skip` é rejeitado fora desse modo
local. O rehearsal não aceita imagem externa nem alvo de health público: usa
somente o daemon local, o projeto HA local e um endpoint loopback.

```text
pnpm ops:rehearse-local-release                         PASS
release digest       sha256:bf457ddf...cac475
rollback digest      sha256:14a55265...32cc1a7
canário/promoção     PASS — /health/ready 200
rollback             PASS — /health/ready 200
restauração final    PASS — api-a/api-b/worker-a/worker-b saudáveis
artefato temporário  removido após a prova
```

O digest de rollback foi gerado como artefato sintético local com o mesmo
filesystem da imagem operacional e um label de rehearsal. Isso prova o
controlador, o health gate, a troca de digest e a restauração sem declarar que
existe uma versão anterior de produção. Deploy/rollback autorizado em
produção, registry externo, CI remoto e aprovação do ambiente continuam sendo
gates separados.

O manifesto de rastreabilidade `REMEDIATION-EVIDENCE-026` aponta agora para
`35d5c57`, que adiciona o rollback por imagem local versionada ao controlador
de rehearsal e seus testes; a guarda de pull e o controlador-base estão em
`cfaeed3`.

## Rehearsal com duas imagens versionadas locais — 2026-08-11

Para fortalecer a prova de rollback, foi construída uma segunda imagem a partir
do commit anterior `b30c85d`, fora do worktree, usando contexto Git em stream.
O runner recebeu `CVG_LOCAL_RELEASE_ROLLBACK_IMAGE` e executou a troca entre
dois artefatos locais distintos:

```text
release atual       sha256:bf457ddf...cac475
rollback b30c85d    sha256:6ca763bb...e6e570
rollbackMode        EXISTING_LOCAL_IMAGE
canário/promoção    PASS — /health/ready 200
rollback            PASS — /health/ready 200
restauração final   PASS — api-a/api-b/worker-a/worker-b saudáveis
```

Esta é a melhor evidência local do controlador de rollback, mas ainda não é
promoção produtiva: não houve registry externo, CI remoto, autorização de
ambiente, assinatura/verificação de supply chain ou tráfego público.

## Verificação live do catálogo e runtime curricular — 2026-08-11

Foi criado `scripts/verify-curriculum-runtime.mjs` com modo read-only e
conexão administrativa explicitamente separada da API. Contra o PostgreSQL HA
ativo, o resultado foi:

```text
ops:verify-curriculum-runtime                  PASS_WITH_GAPS
activities/content/editorial/items             24 / 796 / 796 / 796
learning_assignments/curriculum_runtime_states 24 / 24
assignment modules                              M01–M24
assignment status                               NAO_ATRIBUIDO (24)
runtime status                                  PENDENTE (24)
content status                                  PROJECAO_VERIFICADA (763), PUBLICADO (33)
```

O modo `CVG_CURRICULUM_REQUIRE_CLINICAL_PUBLICATION=true` falhou com a causa
esperada: `clinical publication is incomplete: 763 items`. Assim, o verificador
fecha a limitação estrutural do catálogo sem declarar conteúdo clínico como
aprovado.
