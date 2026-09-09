# Runbook — Compromised secret

## Symptoms

Audit trail anômalo, auth failures elevadas, segredo exposto em log/artefato.

## Detection

Alertas de autenticação + revisão de audit trail + `verify:secrets`.

## Immediate action

1. Revogar sessões e tokens one-time afetados.
2. Rodar o segredo fora do Git (nunca commitar o novo valor).
3. Remover o valor exposto de logs/artefatos ao alcance.

## Diagnosis

Escopo do vazamento (qual segredo, onde apareceu, por quanto tempo);
checar `.env.example` (só placeholders) e histórico do Git.

## Recovery

Reemitir credencial, revalidar ACLs/owners (matriz least-privilege),
reexecutar live negativo.

## Verification

`verify:secrets` verde + matriz de privilégios + ausência do valor em artefatos.

## Escalation

Compromisso de `DATABASE_URL` produtiva ou chave de assinatura → DR completo
+ rotação ampla + post-incident.
