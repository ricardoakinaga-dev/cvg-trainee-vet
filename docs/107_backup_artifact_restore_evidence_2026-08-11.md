# Evidência de backup e restore por artefato — 2026-08-11

## Escopo

Esta rodada fortalece a prova local de recuperação sem declarar backup, RPO/RTO ou restore de produção. Foram usados somente dados sintéticos do PostgreSQL HA ativo; nenhum segredo, dado clínico, prontuário, tutor, foto ou PDF foi registrado.

## Alteração implementada

- `scripts/backup-artifact.mjs` valida manifesto custom-format, nome do dump, tamanho, timestamp, checksum SHA-256 e referência do verificador;
- caminhos de dump e manifesto devem estar fora do repositório e o dump precisa ser arquivo regular;
- `scripts/verify-postgres-restore.mjs` aceita `CVG_RESTORE_BACKUP_FILE` e `CVG_RESTORE_BACKUP_MANIFEST`, valida o artefato antes de consumi-lo e restaura o dump em banco descartável isolado;
- o modo de artefato verifica que o banco restaurado contém objetos PostgreSQL de aplicação, enquanto o modo sintético continua validando marcador criado antes do dump;
- `scripts/create-postgres-backup.mjs` valida o próprio manifesto antes de persistir o arquivo;
- variáveis de container vazias são tratadas como não configuradas, evitando comandos Docker malformados.

## TDD e verificações

```text
RED       importação do contrato sem implementação: falha
GREEN     tests/integration/backup-artifact.test.ts: 4/4
GREEN     lint: PASS
GREEN     typecheck: PASS
GREEN     restore integration default: 2/2 quando executado no HA ativo
```

Prova live no HA ativo, com dump temporário externo ao repositório:

```text
backup custom: PASS — 197097 bytes, SHA-256 validado
restore de artefato persistido: PASS
verificationMode: stored-artifact
restoredObjects: 27
rtoMs observado: 2357
```

O teste oficial `pnpm test:integration:restore`, com o container PostgreSQL declarado, passou nos dois cenários: marcador sintético e artefato checksummed existente. O diretório temporário foi removido após a execução; nenhum dump foi versionado.

## Limites ainda abertos

Esta evidência prova o contrato e o mecanismo de consumo de um artefato em ambiente local/HA sintético. Ainda não prova:

- agendamento real, retenção, criptografia e acesso em storage externo;
- destino, owner, janela ou política de backup de produção;
- RPO ≤ 1 hora e RTO ≤ 4 horas medidos em ambiente produtivo declarado;
- restauração de produção, failover, monitoramento, alerta ou autorização operacional.

Esses itens continuam `WAITING_HUMAN_APPROVAL` e exigem destino, credenciais e ambiente autorizados.
