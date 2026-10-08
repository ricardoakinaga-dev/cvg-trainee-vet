# Procedimentos LGPD operacionais

Complementa a política aprovada
`BRIEFING/09.PROJETO_CVG_TREINAMENTO/90.ANEXOS/0011_politica_conservadora_dados_lgpd.md`
e `docs/security/data-classification.md` (achado DA-03 / M21). Dados pessoais
no sistema são apenas de colaboradores (nome, e-mail profissional, progresso,
tentativas, notas). Dados clínicos reais, de tutores e de pacientes são proibidos.

## Papéis

- Controlador: Centro Veterinário Guarapiranga. Responsável interno: Ricardo.
- Operador técnico: quem administra o ambiente (deploy, backup, acessos).

## Retenção

| Dado | Prazo | Base |
|---|---|---|
| Conta, progresso, tentativas, notas, contestações | enquanto houver vínculo + 5 anos | finalidade de desenvolvimento profissional e evidência de treinamento |
| Trilha de auditoria | 5 anos | proteção e auditoria (append-only) |
| Sessões e tokens | expiração do contrato (horas) | segurança |
| Backups | `CVG_BACKUP_RETENTION_DAYS` (14) no host; ≥ 30 dias off-host | continuidade |

Prazos acima são proposta operacional; mudar prazo exige decisão registrada
por Ricardo e atualização do anexo 0011.

## Exclusão e anonimização

1. Pedido do titular ou desligamento registrado no log mestre com data.
2. `changeAccountStatus` para encerrar a conta e revogar sessões (imediato).
3. Anonimização dos campos identificadores (nome, e-mail) por migration
   operacional ou procedimento SQL revisado, preservando tentativas e notas
   como registro agregado sem identidade. Não existe endpoint de exclusão:
   criar um é feature com PRD/SPEC (backlog).
4. Backups existentes expiram no prazo de retenção; não se edita backup.
5. Registrar conclusão e evidência no log mestre.

## Atendimento ao titular

Pedidos de acesso ou correção são respondidos em até 15 dias com exportação
dos dados do participante pelas projeções já existentes (progresso, tentativas,
feedback, contestações) feita por staff autorizado. Nenhum dado de terceiro
entra na exportação.

## Incidente de dados

Seguir `docs/runbooks/compromised-secret.md` para contenção. Avaliar impacto a
titulares; comunicação à ANPD e aos titulares quando houver risco relevante,
em prazo razoável, com registro no log mestre.
