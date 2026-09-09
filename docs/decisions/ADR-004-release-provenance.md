# ADR-004 — Release provenance + evidence bundle

- **Status:** aceito · **Data:** 2026-09-09
- **Contexto:** release atual 25/100: sem SBOM, provenance, digest ou bundle.
- **Decisão:** todo release gera bundle (`manifest.json`, `commit.txt`, `sbom.json`
  CycloneDX, `provenance.json`, resumos de testes/cobertura/segurança,
  `migration-head.txt`, `artifact-digests.txt`) via `scripts/release-evidence.mjs`;
  assinatura keyless (Cosign/OIDC) quando houver artefato publicável; nunca chave
  no repo.
- **Consequências:** rastreabilidade commit→artefato verificável; gate de release
  bloqueia candidato sem bundle.
