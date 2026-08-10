# 0109 — Dados e Persistência

## 1. Armazenamento

O sistema usa PostgreSQL como fonte transacional. O monorepo possui repositórios tipados e queries explícitas; nenhum componente de apresentação consulta SQL diretamente.

| Área lógica | Dados | Acesso |
|---|---|---|
| `app` | contas educacionais, currículo, conteúdo publicado, tentativas, progresso, feedback | API autorizada; RLS adicional |
| `audit` | ações sensíveis, decisões, correlações e versões | somente auditoria/admin/Ricardo |
| `internal` | autoria, fontes, localizadores, conflitos, protocolos internos e revisão | somente autoria/revisão/Ricardo |
| `outbox` | eventos ainda não processados e estado de retry | API/worker |
| `integration` | configuração não secreta, estado de jobs, versões de embedding e referências de integração | API/worker/operação escopados |

No núcleo materializado, `accounts` contém somente e-mail profissional normalizado e estado (`INVITED`, `ACTIVE`, `SUSPENDED`, `DEACTIVATED`). `account_invitations` contém `account_id`, hash SHA-256 do token, papéis/escopos concedidos, expiração, aceite e criador. Não há coluna de senha, token bruto, foto, PDF ou fonte.

As áreas podem ser schemas PostgreSQL separados ou tabelas com políticas equivalentes, conforme o adaptador de execução. PostgreSQL é a fonte de verdade. Qdrant é um índice derivado e reconstruível; guarda vetores e payload mínimo de registros autorais internos autorizados, nunca PDFs, fotos, OCR, cópias protegidas ou dados reais. A IA não é armazenamento: prompts e respostas completas não são persistidos por padrão; ficam apenas hash, modelo, versão, status, uso e decisão de retenção técnica.

## 2. Estratégia de leitura/escrita

- comandos escrevem por repositórios e transações explícitas;
- queries de dashboard usam views/projeções somente leitura;
- tentativas e respostas são append-only após submissão;
- conteúdo publicado é imutável por versão;
- auditoria é append-only;
- cache é opcional e nunca fonte de verdade;
- Qdrant é atualizado somente por outbox/worker, com `point_id` determinístico, filtro de escopo e reconciliação periódica;
- o adaptador de IA é chamado somente por casos de uso internos, com contexto redigido, schema de saída e chave server-side;
- joins e agregações continuam no PostgreSQL na escala inicial para manter consistência.

## 2.1 Leitura agregada da jornada — item 9

`createParticipantJourneyRepository` executa uma transação de leitura com três contextos controlados: participante para atividades/attempts/runtime e participante+escopo para `learning_assignments` e `assessment_workflows`. Os escopos são normalizados e deduplicados; uma consulta sem escopo retorna vazio. A atividade publicada é ligada à tentativa mais recente por `updated_at`/versão, enquanto atribuições, resultados e runtime são mapeados pelos mappers versionados já existentes. O contexto é restaurado para participante antes do fim da transação. PostgreSQL continua sendo a fonte de verdade; a agregação não é cacheada nem delegada ao Qdrant/IA.

## 3. Transações obrigatórias

| Fluxo | Unidade transacional |
|---|---|
| salvar resposta | resposta + checkpoint de tentativa + idempotência |
| submeter tentativa | submissão + congelamento de versão + outbox |
| corrigir | correção + resultado + remediação/retensão + outbox |
| publicar | projeção aprovada + estado publicado + auditoria + outbox |
| retirar | estado retirado + alcance de exposição + auditoria + outbox |
| decidir contestação | decisão + recálculo + versões + auditoria + outbox |
| conceder/revogar papel | assignment + auditoria |
| criar convite | conta convidada + convite com hash + auditoria operacional futura, na mesma transação |
| aceitar convite | validação de expiração + ativação da conta + consumo único + sessão server-side |
| indexar autoria interna | registro aprovado/permitido + evento de indexação + versão do vetor no PostgreSQL; ponto no Qdrant é derivado |
| gerar sugestão de autoria | job + auditoria técnica + resultado estruturado interno; nenhum efeito publicado automático |

## 4. Retenção e dados mínimos

Persistir somente nome, login profissional, estado da conta, progresso, tentativas, notas, feedback mínimo, auditoria e dados operacionais necessários. Respeitar vínculo + dois anos para dados previstos no PRD; depois eliminar ou anonimizar conforme política interna. Respostas abertas devem ser retidas apenas pelo tempo necessário para feedback, contestação e melhoria do treinamento.

## 5. Proteção contra exposição autoral

O repositório interno pode manter `source_record_id`, obra, edição, capítulo, página, hash, protocolo e decisão porque isso é necessário à construção. O serializer público não tem esses campos no tipo. A API mantém consultas separadas e testes negativos que falham se qualquer chave interna aparecer na projeção participante.

## 6. Contrato das integrações

| Dependência | Papel | Fonte de verdade | Falha | Limite de exposição |
|---|---|---|---|---|
| PostgreSQL | estado, relações, auditoria, outbox e jobs | sim | erro transacional bloqueia a operação correspondente | API redige por papel |
| Qdrant | busca semântica interna e índice de embeddings | não | marcar `INDEX_PENDING`, retry/reconciliação; não perder estado educacional | somente autoria/revisão/operação autorizadas |
| IA server-side | sugestão estruturada de autoria/revisão | não | fallback manual, retry limitado ou recurso indisponível | sem fonte bruta, foto, PDF, dado real ou acesso do participante |

Configuração mínima por ambiente, sempre via segredo/variável de ambiente e nunca no Git:

```text
DATABASE_URL
QDRANT_URL
QDRANT_API_KEY             # obrigatório apenas quando o endpoint exigir
QDRANT_COLLECTION
AI_PROVIDER=openai
AI_API_KEY
AI_MODEL
EMBEDDING_MODEL
```

O adaptador deve permitir Qdrant local em desenvolvimento/teste e endpoint protegido em produção, sem alterar o domínio. A coleção é criada/migrada por comando operacional versionado; o worker verifica dimensão/distância/modelo antes de indexar. Um teste de contrato impede que a integração seja inicializada sem configuração válida ou que um payload interno seja aceito em rota participante.

## 7. Estado implementado e verificável

- PostgreSQL permanece a autoridade para conta, convite, sessão, tentativa, resultado, auditoria e outbox;
- migração `0006_unknown_randall_flagg.sql` adiciona `account_invitations`, FK para conta, hash único, índices de expiração/aceite e check de digest hexadecimal;
- token bruto existe somente no retorno imediato da operação administrativa e no fluxo transitório de aceite; não é escrito no banco, outbox, Qdrant, IA ou log;
- Qdrant recebe apenas ponto derivado com identificadores, hash, escopo, versão e status; texto participante e material de origem ficam no PostgreSQL interno;
- IA é chamada somente pelo worker server-side, com schema estruturado; no CI o adaptador é fake determinístico e o resultado permanece `DRAFT_AI`.

## 8. Persistência editorial materializada no item 10

`content_editorial_records` guarda a versão autoral, escopo, módulo, sessão, objetivo, autor, item interno e preflight. `content_review_decisions` guarda cada decisão clínica com revisor, justificativa, correlação e data. A migration `0014_salty_penance.sql` aplica as FKs para `content_versions`/`accounts`, unicidade de `content_id + version`, índices por escopo/versão e checks de versão/decisão.

O repositório lê a última decisão clínica, calcula motivos de bloqueio e nunca coloca o JSON editorial na projeção participante. A atualização do preflight e o registro da decisão são persistidos com mapeamento estrito; a transição de conteúdo permanece coordenada pelo caso de uso e deve ser tornada transação única antes de uma publicação operacional em escala.
