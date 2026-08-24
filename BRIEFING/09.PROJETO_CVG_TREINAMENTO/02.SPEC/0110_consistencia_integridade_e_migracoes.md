# 0110 — Consistência, Integridade e Migrações

## 1. Integridade conceitual

- todos os IDs são UUID/ULID gerados no servidor;
- chaves estrangeiras impedem tentativa órfã, versão sem módulo e correção sem submissão;
- e-mail normalizado e único no perfil educacional;
- estados usam enumeração controlada e transições no domínio;
- `version` e `effective_at` são obrigatórios em conteúdo, rubrica, regra, nota e protocolo;
- cada registro indexável possui `content_version_id`, `content_hash`, `embedding_model`, `embedding_version` e `visibility=INTERNAL` explícitos;
- constraints impedem mais de uma publicação ativa incompatível para o mesmo conteúdo;
- índices cobrem `participant_id`, `module_id`, `status`, `due_at`, `scope_id` e `created_at` conforme queries reais;
- textos têm limites de tamanho e não aceitam HTML não sanitizado;
- source/internal fields nunca entram em views públicas.
- Qdrant não possui relação de negócio própria: `point_id` referencia uma versão interna e não pode ser usado para autorizar acesso;
- uma resposta de IA só é válida quando satisfaz o schema esperado, limites de tamanho e filtros de conteúdo; texto inválido vira falha do job.

## 2. Migrações

1. cada mudança de schema é um arquivo versionado e revisado;
2. migrações são aplicadas em ordem em CI e ambiente local;
3. mudanças destrutivas usam expand/contract: adicionar, migrar, trocar leitura, remover em etapa posterior;
4. não editar migração já aplicada;
5. cada migração declara impacto, rollback operacional e verificação pós-aplicação;
6. dados educacionais históricos não são reescritos para “corrigir” código;
7. mudanças de cálculo criam nova versão de regra e preservam o resultado antigo;
8. backup e restauração são testados antes de migração de alto risco.
9. alterações de coleção Qdrant declaram dimensão, distância, modelo, versão e procedimento de reconstrução; não há edição manual de ponto em produção;
10. migrações que mudem dados indexáveis publicam evento de reindexação e verificam contagem/hash no worker;
11. troca de modelo de embedding cria nova versão/coleção, mantém a anterior até a reconciliação e permite rollback sem reescrever PostgreSQL.

## 3. Seeds e ambiente

- seed inicial contém somente usuários sintéticos, casos fictícios e conteúdo CVG de demonstração;
- nenhum PDF, dado real, tutor, prontuário, foto clínica ou segredo entra em seed;
- seed de desenvolvimento é idempotente e pode ser recriado;
- bootstrap de Ricardo e `CLINICAL_APPROVER` é explícito, auditado e executado por variável de ambiente/ação administrativa segura;
- produção começa vazia ou com conteúdo autoral aprovado, sem copiar derivado de obra.
- Qdrant de desenvolvimento/teste é descartável; seeds criam apenas conteúdo CVG sintético e nunca chamam IA externa;
- testes usam `AI_PROVIDER=fake` determinístico, sem chave real e sem tráfego para serviços externos.

## 4. Compatibilidade de contratos

- mudanças aditivas são compatíveis quando não alteram semântica;
- remoção/renomeação exige `/api/v2` ou período de compatibilidade documentado;
- schemas Zod e OpenAPI são atualizados no mesmo commit da API;
- web e worker usam o pacote de contratos versionado;
- migração e código podem conviver durante deploy gradual.

## 5. Verificações de integração

- healthcheck verifica PostgreSQL, Qdrant e IA separadamente e expõe somente estado operacional redigido;
- readiness não declara o sistema pronto quando PostgreSQL está indisponível; Qdrant/IA opcionais podem ficar `DEGRADED` sem interromper o núcleo;
- CI executa migrações em banco efêmero, cria coleção Qdrant efêmera, indexa um registro sintético e valida busca com filtro de escopo;
- CI usa adaptador de IA fake para validar timeout, retry, refusal, schema inválido e resposta duplicada;
- nenhum teste de CI imprime URL completa com segredo, prompt, resposta clínica ou payload interno.

## 6. Migração e verificação atuais

`0006_unknown_randall_flagg.sql` foi gerada pelo Drizzle e aplicada no PostgreSQL efêmero. O teste live de identidade comprovou: criação de conta `INVITED`, token armazenado apenas como digest, aceite único, ativação para `ACTIVE`, sessão com hash e rejeição do segundo aceite. A migração é aditiva e o rollback operacional é restaurar o snapshot anterior ou desabilitar as rotas de convite; não se edita o arquivo depois de aplicado.

## 7. Migrações 0028–0030 — projeção autoral de sessão

`0028_authoring_activity_session.sql` é expand/contract: adiciona `session_id`
nullable, check de não vazio e unicidade por `{ scope_id, module_id,
session_id }`, preservando atividades legadas. `0029` adiciona a invariável de
correspondência módulo/sessão e habilita/força RLS nas duas tabelas da
projeção. `0030` substitui as policies que precisavam consultar as próprias
tabelas por funções SQL `SECURITY DEFINER` de retorno booleano com
`search_path=public`, mantendo escopo/participante e inserção autoral sem
expor dados.

O verificador de migrações confirmou journal contínuo `0000`–`0030` (31
migrations, último índice 30). O rollback operacional é restaurar snapshot ou
desabilitar a rota de publicação em ambiente descartável; não se edita SQL já
aplicado. A remoção de `session_id`/projeções legadas exige migration posterior
com evidência de retenção e aprovação operacional.
