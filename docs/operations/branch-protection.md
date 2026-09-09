# Branch Protection — recomendação (não aplicada remotamente sem autorização)

Aplicar em `main` via Settings → Branches:

- Require a pull request before merging (sem direct push)
- Required approvals: 1+ (stale approvals dismissed on push)
- Require conversation resolution before merging
- Required status checks (branches up to date antes do merge):
  - `quality` (`.github/workflows/quality.yml`)
  - `security` + `CodeQL` (`.github/workflows/security.yml`)
- Require linear history; squash merge permitido
- Do not allow force pushes; do not allow deletions
- Include administrators (sem bypass silencioso)

CODEOWNERS permanece template até owners reais serem designados
(`.github/CODEOWNERS`); a exigência de revisão humana não depende dele.
