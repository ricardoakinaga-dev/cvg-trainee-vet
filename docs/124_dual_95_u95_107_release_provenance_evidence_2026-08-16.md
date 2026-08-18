# U95-107 — warm-up, proveniência e rollback versionado

**Data:** 2026-08-16 14:20 BRT  
**Fase:** BUILD / DUAL 95 / F0  
**Estado:** implementação local concluída; critério de rollback entre versões distintas pendente de artefato aprovado

## Escopo

U95-107 trata três lacunas do release local:

1. recuperação de falha transitória durante warm-up/canário;
2. vínculo verificável entre `sourceSha`, digest imutável e runtime;
3. rollback para uma versão anterior realmente distinta.

As baselines permanecem congeladas em maturidade `83,24/100`, qualidade `64,20/100`, `1/16` e `0/16` itens ≥95. Nenhum score, release, promoção, publicação clínica ou commit foi executado.

## Implementação

- `scripts/release-manifest.mjs` agora exige `sourceSha`, `rollbackSourceSha`, os dois digests imutáveis e `canaryStableProbes`; a política padrão exige três probes consecutivos bem-sucedidos.
- `scripts/release-execution.mjs` usa estado imutável do canário: uma falha transitória zera a sequência de estabilidade, mas não reprova imediatamente; o gate só passa após a janela de sucesso consecutivo e falha fechado no timeout.
- `scripts/verify-runtime-provenance.mjs` exige que cada container esteja `running/healthy`, use `image@sha256`, tenha digest igual ao digest esperado pelo manifesto e mantenha o mesmo SHA no label OCI e em `CVG_SOURCE_SHA`. O SHA também precisa existir como commit Git no checkout.
- `scripts/deploy-release.mjs` verifica a proveniência no canário e na promoção; `scripts/rollback-release.mjs` verifica a proveniência da versão restaurada. Fora do modo local explícito, ambos rejeitam rollback com o mesmo `sourceSha`.
- `scripts/local-release-rehearsal.mjs` mantém o clone sintético apenas como compatibilidade local e exige `CVG_REQUIRE_VERSIONED_ROLLBACK=true` + `CVG_LOCAL_RELEASE_ROLLBACK_IMAGE` para uma prova versionada.

A checagem é uma atestação local de vínculo `SHA↔digest↔runtime` por label OCI, variável de ambiente e inspeção Docker. Ela não é uma assinatura criptográfica Cosign/Sigstore; assinatura/SBOM/registry permanecem gates de F2/F3.

## RED → GREEN

- RED: a primeira execução focal produziu `6` falhas em `20` testes, cobrindo a ausência da política de canário, campos SHA do manifesto, digest esperado e distinção de versões.
- GREEN: `tests/integration/local-release-rehearsal.test.ts` e `tests/integration/runtime-provenance.test.ts` passaram `20/20` após a implementação.
- Cobertura global: `177` arquivos passaram, `805` testes passaram, `18` skips governados; `84,55%` statements, `80,05%` branches, `86,58%` functions e `85,36%` lines.
- `ops:verify-release-manifest`, `ops:deploy-release` e `ops:rollback-release` passaram no dry-run e exibiram source SHA, rollback SHA, digests e `canaryStableProbes=3`.

## Runtime local atual

Após cada ensaio, o runtime foi restaurado e conferido:

- quatro serviços `api-a`, `api-b`, `worker-a`, `worker-b`: `running/healthy`;
- release atual: `cvg-trainee-vet@sha256:231bb5733b51eb8a20fada20eae86af6ff082dd442ec52323b6ec286f76fe4cf`;
- source SHA: `1579442fa3dcf9a32bf5e7e1ce73977f2d8a60cd`;
- `CVG_VERIFY_RUNTIME_PROVENANCE=true` com digest esperado passou nos quatro containers.

O rehearsal local sintético também passou `deploy=PASS`, `rollback=PASS`, `runtimeRestored=true`, três probes estáveis e proveniência `PASS`, mas retornou `versionedRollback=false` e portanto não satisfaz o critério U95-107/G95-2.

## Limitação live encontrada

As imagens históricas locais disponíveis foram testadas sem mascarar o health gate:

- `rc-local`, SHA `e3aff802fe7ec104917e8cc6aa77bb0aea4f6229`, digest `sha256:ac7eac66e96c38cc31ccf01c9911cd112dae1ae6bac79dba6f98f3821c7637ea`: APIs saudáveis, workers `unhealthy`;
- `rc-head-1e41369f4ac6`, SHA `1e41369f4ac62f1587ac41c789f53fb5d4fef2fa`, digest `sha256:74d9483fbbfd0ed97fd20079c44559cecb7eedc7268e620da8e23b9d8c8fdc6b`: APIs saudáveis, workers `unhealthy`.

Nos dois casos o rollback parou no gate `rollback health gate failed`; os processos antigos continuaram executando, mas não expuseram o endpoint de health do worker exigido pelo Compose atual. A imagem `worktree-uncommitted` foi descartada como evidência porque não possui um source SHA Git válido. Não foi feito rebaixamento do gate para transformar incompatibilidade em PASS.

## Disposição

`U95-107` fica **PARCIAL/BLOCKED**: a correção de código e a atestação runtime estão prontas localmente; falta um artefato anterior, imutável, construído a partir de um SHA Git válido e compatível com o contrato atual de health dos workers para completar o rollback versionado. `U95-117` continua bloqueada, as baselines e `0/145` permanecem inalterados, e a próxima ação é obter/aprovar esse artefato no fluxo RC-alpha antes de repetir o ensaio.
