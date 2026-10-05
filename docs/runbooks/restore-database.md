# Runbook — Restore database

## Symptoms

Necessidade de restore (DR, corrupção, ambiente descartável).

## Detection

Decisão humana/operacional; nunca automática em produção sem AAA-001.

## Immediate action

1. Restore sempre em instância isolada primeiro.
2. Usar apenas backups com integrity verification registrada.

## Diagnosis

Confirmar formato e integridade do dump, versão major do PostgreSQL, versão do
schema e journal de migrations no snapshot, e compatibilidade declarada com a
versão-alvo da aplicação. `pnpm verify:migrations` confirma apenas que os SQLs
do repositório e `meta/_journal.json` concordam; ele não inspeciona o journal do
backup nem determina sozinho essa compatibilidade. Divergência ou metadado
ausente exige abortar antes de habilitar writes.

## Recovery

1. Criar uma instância vazia e isolada e restaurar o dump nela.
2. Ler novamente schema e journal restaurados; não aplicar o schema `head`
   antes do dump e não repetir migrations já registradas.
3. Confirmar compatibilidade com a versão-alvo e aplicar somente migrations
   posteriores ao snapshot usando `pnpm db:migrate` apontado ao destino isolado.
4. Rodar `pnpm verify:migrations` para validar o manifesto atual; validar
   constraints, owners, grants, RLS e integridade do banco restaurado antes de
   habilitar writes.
5. Se dump, journal, schema ou aplicação forem desconhecidos/incompatíveis,
   abortar sem writes e descartar somente o destino descartável identificado.

Para dump custom, fazer preflight offline antes de criar o banco-alvo: executar
`pg_restore --list` e extrair o archive para um arquivo SQL temporário privado
com `pg_restore --no-owner --no-privileges --file`. Qualquer falha ou saída
vazia aborta a operação. Esse preflight confirma que o archive pode ser lido e
decodificado; ainda é necessário conferir o schema/journal persistido e a
compatibilidade semântica com a aplicação antes de writes.

## Drill local de migration histórica

Execute `pnpm verify:restore-migrations` para o drill sintético de regressão
em PostgreSQL 16. O script inicia um cluster descartável acessível somente
por socket Unix dentro do diretório temporário privado; não abre listener TCP.
Antes de qualquer DDL, confere o PID/diretório do cluster e exige que o cliente
esteja conectado por socket (`inet_client_addr()` nulo). Cria uma origem até
`0053_aaa_content_integrity`, gera o dump, restaura com
`--no-owner` em outro banco, verifica journal e marcador restaurados e aplica
a migration pendente `0054_aaa_content_indexer_service`. Não lê
`DATABASE_URL` nem conecta a banco externo. Bancos, cluster e arquivos
temporários são removidos ao terminar.

O drill executa `pg_restore --list` e decodifica o dump válido para SQL antes
de criar o banco-alvo. Uma cópia sintética com o magic header adulterado é
rejeitada nesse preflight, e o catálogo confirma que o destino continua
inexistente; essa evidência cobre abort de archive corrompido antes da criação
do destino. Testes do comparador de catálogo também rejeitam diferenças
sintéticas de coluna, constraint, índice ou entradas ausentes/inválidas nas
duas tabelas monitoradas. O drill constrói uma segunda archive sintética com
uma coluna extra em `content_versions`, sem alterar o journal `0053`. Esse
archive passa no preflight e mantém o prefixo de migration válido; depois do
restore e da aplicação de `0054`, a comparação com o catálogo de referência
rejeita o drift (`semanticSnapshotMismatchRejected=true`). Esse caso cobre uma
incompatibilidade estrutural controlada nas duas tabelas; archives externos e
outras formas de incompatibilidade continuam fora da evidência.

A fixture aplica as migrations históricas pelo principal local privilegiado
`postgres`: um teste com role não superusuário e sem `BYPASSRLS` reproduziu
recursão de policy na migration `0030`. Depois do restore, a migration
pendente roda como owner dedicado, não superusuário e `NOBYPASSRLS`. O drill
confere o prefixo de hashes/timestamps do Drizzle, marcador, RLS habilitado e
forçado, ownership de `content_versions` e `ai_suggestions`, e as quatro
policies do indexer por tabela, comando, modo permissivo, role e expressão
catalogada completa. `content_versions` exige `status='PUBLICADO'` na própria
linha; `ai_suggestions` exige `content_id`, `version` e
`version_record.status='PUBLICADO'` juntos na mesma subconsulta `EXISTS`.
Predicados diferentes, com ampliação booleana ou chamadas fora da allowlist
são rejeitados. A conexão final confirma o socket Unix privado.

O drill compara também o catálogo da origem `0053` com o alvo restaurado para
`content_versions` e `ai_suggestions`: colunas e defaults, nulabilidade,
constraints validadas e índices válidos/prontos precisam coincidir. Isso
verifica a integridade estrutural dessas duas tabelas sintéticas. Depois das
migrations, o fixture aplica `roleProvisionSql` do provisionador local de CI e
consulta os privilégios efetivos do role de aplicação em todas as relações da
schema pública. O comparador exige a matriz de grants do provisionador,
mantém `knowledge_documents` sem acesso, rejeita ownership e capacidades
administrativas, e cria uma relação nova para confirmar default-deny. Essa
matriz é somente o contrato do harness local: não certifica grants ou owners de
um ambiente autorizado, nem todas as constraints do banco.
`write-restore-summary.mjs`, no modo local, delega a este drill;
só o modo explicitamente configurado com origem externa usa o verificador
operador separado.

O `verificationDurationMs` do drill mede a execução técnica completa do
fixture histórico; o verificador de uma origem explicitamente fornecida mede
dump, criação do destino, restore e leitura do marcador. Ambos são medições
parciais, não RPO/RTO operacional. O drill valida apenas a matriz sintética do
provisionador local, não grants de produção, backup fornecido, todas as
constraints nem RPO/RTO; essas provas continuam necessárias antes de qualquer
promoção.

Os alvos aprovados por RNF-015/D-107 são RPO ≤1h e RTO ≤4h; qualquer promoção
para operação/produção continua sujeita a AAA-001.

## Verification

Live integration + E2E real + RLS negativo no restaurado; registrar duração e
perda observadas, identificando o ambiente. Uma medição local sintética não
prova os alvos operacionais nem libera produção.

## Escalation

Incompatibilidade de migration → forward-fix revisado; nunca `down` invisível.
