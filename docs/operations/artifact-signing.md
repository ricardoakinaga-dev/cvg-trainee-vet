# Artifact Signing — readiness (sem fake signing)

Não existe hoje artefato/container publicável neste repositório; portanto
nenhuma assinatura foi gerada (gerar assinatura sem artefato seria fake).

Implementação pronta, condicionada ao primeiro artefato real:

1. Publicar imagem/artefato com digest imutável (provenance já registra
   `treeDigest`, `lockfileSha256`, manifests e migration head).
2. Assinar com Cosign keyless via OIDC no CI:
   `cosign sign --yes <digest>` com `permissions: id-token: write`.
3. Anexar SBOM + provenance assinados ao release (`sbom.cyclonedx.json`
   validado por `validateSbom`, digests em `artifact-digests.json`).
4. Verificação: `cosign verify` + `validateBundle` no gate de release.

Nenhuma chave privada entra no repositório em nenhuma hipótese.

## Estado em 2026-10-07 (M08)

`.github/workflows/release.yml` materializa os passos acima: imagens
`cvg-api`, `cvg-api-migrator`, `cvg-worker` e `cvg-web` construídas do SHA
verificado, publicadas no GHCR com provenance/SBOM do BuildKit, assinadas com
`cosign sign --yes <image>@<digest>` (keyless, `id-token: write`) e digests
gravados como artefato. A verificação do consumidor está em
`docs/operations/deploy.md`. A primeira execução real depende de H-REMOTE.
