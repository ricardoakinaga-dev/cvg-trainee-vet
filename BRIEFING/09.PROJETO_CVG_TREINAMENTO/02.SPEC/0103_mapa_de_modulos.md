# 0103 — Mapa de Módulos

## 1. Módulos de aplicação

| Módulo | Entradas principais | Saídas principais | Depende de |
|---|---|---|---|
| `identity` | sessão/provedor, convite, e-mail profissional | principal autenticado, conta ativa/inativa | provedor de identidade |
| `authorization` | principal, papel, escopo, capacidade | decisão allow/deny, auditoria | identity |
| `curriculum` | trilha, módulo, sessão, pré-requisito | atividade elegível, progresso | authorization, content |
| `content` | draft autoral, rubrica, revisão, validade | versão publicada/retirada, projeção por papel | authorization, internal-authorship |
| `assessment` | atividade publicada, resposta, tentativa | feedback, resultado, remediação, retenção | curriculum, content, authorization |
| `progress` | eventos de conclusão, domínio e retenção | resumo individual e estado de próxima ação | curriculum, assessment |
| `reporting` | projeções autorizadas, período, escopo | dashboards, KPIs versionados | authorization, progress, reports |
| `feedback` | relato validado, tipo, prioridade | ticket e histórico de estado | identity, authorization |
| `appeals` | contestação, versão, justificativa | decisão, recálculo, notificação | assessment, content, governance |
| `internal-authorship` | registro de fonte, conflito, autoria, revisão | metadados internos não projetáveis | content, governance |
| `audit` | ação sensível, ator, alvo, antes/depois | trilha append-only | authorization, todos os módulos sensíveis |
| `operations` | jobs, logs, health, métricas | alertas e estado operacional | infraestrutura |

## 2. Dependências permitidas

```text
identity → authorization
authorization → todos os módulos protegidos
curriculum → content
assessment → curriculum + content
progress → curriculum + assessment
reporting → progress + assessment + feedback (somente projeções)
feedback → identity + authorization
appeals → assessment + content + audit
content → internal-authorship + governance
todos os comandos sensíveis → audit
operations → adaptadores, nunca regra de domínio
```

## 3. Dependências proibidas

- componente React → SQL, SDK de identidade privilegiado ou regra de nota;
- rota HTTP → tabela diretamente ou cálculo de escopo próprio;
- `assessment` → fonte interna para enviar ao participante;
- `reporting` → alterar resultado, nota, conteúdo ou papel;
- `operations` → decidir publicação ou aprovação clínica;
- IA → autorizar, calcular nota oficial, mudar estado ou decidir conflito;
- pacote público do participante → importar tipos de `internal-authorship` que carreguem localizadores de fonte;
- módulo de domínio → ler ambiente, cookies, filesystem de PDFs ou rede externa.

## 4. Ordem de construção sugerida

1. tipos, erros, relógio e identificadores;
2. identity/authorization e auditoria mínima;
3. curriculum/content com dados sintéticos;
4. assessment/progress;
5. feedback/appeals/reporting;
6. adaptadores PostgreSQL e identidade;
7. `apps/api` com contratos e autorização;
8. `apps/web`/SPA participante, dashboards e operações;
9. `apps/worker` com tarefas agendadas, retry e idempotência;
10. hardening e rollout controlado.

## 5. Pacotes técnicos materializados no B0

| Pacote | Responsabilidade | Proibição |
|---|---|---|
| `packages/config` | validar ambiente server-side e segredos por presença | não exportar configuração para `web` |
| `packages/persistence` | schema Drizzle, pool PostgreSQL e migrações | não conter regra de apresentação |
| `packages/integrations` | adaptadores Qdrant, embeddings e IA; composição server-side | não ser importado pela SPA |
| `apps/api` | montar runtime HTTP e portas de leitura/comando | não acessar SDK diretamente fora da composição |
| `apps/worker` | montar runtime assíncrono e processar outbox/indexação | não decidir publicação ou nota |

## 6. Policy executável de boundary

O mapa acima é materializado e verificado por `architecture-boundaries.json` e
`tests/integration/architecture-boundaries.test.ts`. O teste compara as
dependências `workspace:*` reais de cada manifest com a allowlist aprovada,
percorre apenas código de produção e rejeita imports proibidos por camada.

O gate `pnpm verify:architecture` deve passar antes do `pnpm verify` ser
considerado evidência de construção. A policy não libera acesso direto a banco,
SDK externo, fonte interna, IA ou regra de nota; uma exceção exige atualização
conjunta deste mapa, da policy, do teste e do traceability manifest.
