# 0101 — Visão Arquitetural

**Projeto:** Sistema CVG de Treinamento Veterinário  
**Fase:** SPEC — Fase 1  
**Status:** `DERIVADA_DO_PRD; EM_REVISÃO_DE_CONSISTÊNCIA`  
**Entradas:** PRD 0010–0017, 0020, 0090; Anexos 0020–0026; D-090–D-109

## 1. Objetivo

Definir uma arquitetura executável para uma plataforma web responsiva, interna e pequena, que entregue login, conta, diagnóstico, trilha, atividades, progresso, dashboards, feedback e governança clínica sem transformar rastreabilidade bibliográfica em funcionalidade do participante.

## 2. Decisões arquiteturais

| Decisão | Escolha | Motivo |
|---|---|---|
| estilo | monorepo modular com API autoritativa, web/SPA e worker separado | permite atualizar interface e tarefas sem duplicar domínio; mantém auditoria e regras centrais |
| linguagem | TypeScript em modo `strict`, sem `any` implícito | tipos compartilhados e falhas detectadas antes do deploy |
| interface | React/Next.js responsiva, server-first quando possível e componentes interativos isolados | atende computador e celular sem duplicar produto |
| aplicação | casos de uso em serviços de aplicação, separados de HTTP e persistência | permite testar regras sem banco ou navegador |
| domínio | entidades/agregados e máquinas de estado determinísticas | evita estado implícito e decisões automáticas não auditadas |
| dados | PostgreSQL, Drizzle ORM tipado, migrações versionadas e RLS como defesa adicional | fonte transacional, integridade relacional, auditoria e consultas de dashboard |
| identidade | provedor gerenciado, adaptado por uma porta de autenticação | não armazenar senhas na aplicação |
| assíncrono | worker Node.js com jobs idempotentes, retry limitado e fila mínima | não introduzir mensageria distribuída sem necessidade |
| busca semântica | Qdrant como índice auxiliar, somente para o workflow interno de autoria/revisão | recuperação rápida sem transformar vetor em fonte de verdade |
| IA | adaptador de IA server-side, com Responses API estruturada, opcional e assistiva | acelera autoria e revisão sem autoridade de estado, nota ou decisão clínica |
| fontes | registro interno separado da projeção participante | protege autoria e impede exposição de obras/PDFs/metadados |

A baseline de implementação para o BUILD é **TypeScript strict em monorepo pnpm, React/Next.js para `web`, API HTTP `/api/v1`, worker Node.js, contratos Zod/OpenAPI, Drizzle ORM, PostgreSQL, Qdrant e adaptador de IA**. Testes unitários/integrados usam Vitest, testes de integração usam serviços efêmeros e fluxos críticos usam Playwright; ESLint, Prettier, typecheck, cobertura, verificação de migrações, auditoria de dependências e scan de segredos são obrigatórios no CI. A identidade usa uma porta de autenticação com sessão segura; o ambiente de execução pode ser local ou hospedado sem alterar o domínio. Não existe etapa de consulta, cotação ou aprovação de fornecedor: a implementação segue esta baseline e mantém adaptadores pequenos somente para portabilidade operacional.

## 3. Visão de blocos

```text
                         ┌──────────────┐
Navegador ─HTTPS/CSRF───▶│ web / SPA    │
                         └──────┬───────┘
                                │ contratos /api/v1
                         ┌──────▼───────┐
                         │ API CVG      │  ← única autoridade de regra/estado
                         └──┬────────┬──┘
                            │        │ comandos internos/eventos
                  ┌─────────▼──┐ ┌──▼──────────┐
                  │ PostgreSQL │ │ worker CVG  │
                  │ + RLS      │ │ jobs/retry  │
                  └────────────┘ └─────────────┘

                  ┌────────────┐     ┌──────────────┐
                  │ Qdrant     │◀────│ IA server-side│
                  │ índice      │     │ assistiva     │
                  └────────────┘     └──────────────┘

Monorepo compartilhado: domain → application → contracts → adapters.
```

### 3.1 Fronteiras

- **Web/SPA:** apresenta somente dados de projeção apropriados ao papel; não calcula autorização, nota oficial ou estado clínico.
- **API:** autentica a sessão, valida entrada, resolve escopo, chama um caso de uso e serializa uma resposta sem campos internos; é a única autoridade de estado.
- **Aplicação:** coordena transação, idempotência, regras de autorização e publicação de eventos internos.
- **Domínio:** decide transições e invariantes sem conhecer React, SQL, cookies ou provedor externo.
- **Persistência:** implementa interfaces de repositório, constraints, RLS, migrações e consultas projetadas.
- **Identidade:** mantém credenciais, sessão, MFA e recuperação; o banco do CVG guarda apenas o vínculo educacional permitido.
- **Worker:** executa somente comandos idempotentes de prazo, retenção, agregação, indexação no Qdrant e tarefas de IA internas; não decide aprovação, nota ou publicação.
- **Qdrant:** mantém apenas vetores e payload mínimo de registros autorizados para busca interna; é reconstruível, não é fonte de verdade e nunca é consultado diretamente pelo navegador.
- **IA:** é chamada somente pela API/worker por uma porta tipada; recebe contexto mínimo permitido, devolve schema validado e sugestão descartável. Não pode alterar estado, corrigir, publicar, aprovar, calcular nota ou falar diretamente com o participante.
- **Observabilidade:** registra operação mínima sem senha, token, texto clínico livre ou rastreabilidade bibliográfica em projeção participante.
- **Fontes internas:** acessíveis apenas ao workflow de autoria/revisão/auditoria; nunca atravessam o contrato de participante.

## 4. Organização do monorepo e fluxo de uma requisição

```text
apps/web       apresentação e navegação
apps/api       HTTP, autenticação, autorização e casos de uso
apps/worker    jobs, retry e tarefas agendadas
packages/domain       entidades, invariantes e estados
packages/application  comandos, queries e políticas
packages/contracts    DTOs, schemas e erros públicos
packages/persistence  repositórios, migrações e queries
packages/ui           componentes acessíveis sem regra de negócio
```

O `web` pode receber atualização visual independente. O `worker` pode ser reiniciado/deployado sem alterar a API. O domínio e a aplicação continuam em pacotes compartilhados e versionados no mesmo repositório, evitando divergência de regra.

```text
request
→ correlation/request id
→ limite de tamanho e rate limit
→ sessão autenticada
→ autorização por papel e escopo
→ schema validation
→ caso de uso
→ transação/repositórios
→ auditoria de ação sensível
→ projeção por papel
→ resposta envelopeada
```

Falhas são convertidas em códigos públicos estáveis; detalhes técnicos ficam somente no log interno redigido. Nenhum handler acessa o banco diretamente sem passar pelo caso de uso/repositório correspondente.

## 5. Trade-offs

### Aceitos

- API, SPA/web e worker como processos/deploys separados dentro de um monorepo modular, sem microserviços de domínio no início;
- tarefas assíncronas simples para prazos, revisão espaçada e agregação de KPIs;
- RLS como defesa adicional, sem delegar toda autorização às policies;
- server-first e interatividade apenas onde a atividade educacional exige estado local;
- material autoral armazenado somente quando aprovado e permitido; Qdrant/IA podem indexar ou transformar registros internos autorizados, mas não recebem PDFs-fonte, fotos, OCR, cópias, trechos protegidos ou dados reais.

### Rejeitados

- microserviços de domínio, Kafka, Redis obrigatório e data warehouse no MVP;
- Qdrant como fonte transacional ou mecanismo de autorização;
- senha, token de recuperação ou segredo no banco comum;
- autorização somente no frontend ou somente em RLS;
- resposta de IA como fonte de estado, gabarito, nota ou aprovação clínica;
- payload que carregue `source_id`, obra, autor, capítulo, página, PDF, foto, figura, tabela, link ou data de consulta para o participante.

## 6. Verificação da escolha da modularidade

### 6.1 Comparação aplicada ao CVG

| Critério | Monólito modular | Microserviços | Decisão CVG |
|---|---|---|---|
| auditoria de fluxo e dados | API central, um banco e correlação entre web/worker facilitam reconstruir o caminho completo | exige correlacionar chamadas, filas e bancos distribuídos | API modular + worker simples |
| manutenção e correção | alteração atravessa módulos no mesmo repositório e pode ser testada de ponta a ponta; web pode evoluir isoladamente | correção pode exigir contratos, deploys e compatibilidade entre serviços | monorepo modular |
| consistência de tentativa/nota | transação relacional direta | consistência distribuída e eventual seriam desnecessárias | monólito modular |
| operação para equipe pequena | três processos explícitos, um banco e contratos compartilhados | mais pontos de falha, observabilidade e coordenação por serviço | API + web + worker |
| escala inicial | suficiente para aproximadamente 10 participantes e equipe interna | escala independente não traz benefício demonstrado | monólito modular |
| isolamento de mudanças | web/worker isolam mudanças de apresentação e jobs; domínio continua único | isolamento maior, mas com custo de rede e governança | modularidade obrigatória dentro do monorepo |

As fontes consultadas tratam microserviços como uma opção com ganhos de implantação/escala independente, mas também registram maior complexidade sistêmica, comunicação entre serviços, consistência, testes e operação. A recomendação de começar com um monólito bem modularizado é coerente quando o domínio ainda está sendo aprendido e a equipe/escala não justificam a distribuição. Referências internas de decisão: [AWS Prescriptive Guidance — decomposing monoliths](https://docs.aws.amazon.com/prescriptive-guidance/latest/modernization-decomposing-monoliths/), [Microsoft Azure Architecture Center — microservices](https://learn.microsoft.com/en-us/azure/architecture/microservices/) e [Martin Fowler — Monolith First](https://martinfowler.com/bliki/MonolithFirst.html).

### 6.2 Condições para não virar um monólito desorganizado

1. cada módulo mantém domínio, aplicação, persistência e apresentação em camadas separadas;
2. imports seguem o mapa 0103; acesso direto a tabela, SDK externo e regra de nota é proibido;
3. casos de uso atravessam uma única unidade transacional quando necessário;
4. contratos de aplicação e API são testados sem depender de implementação de tela;
5. o pipeline executa lint, tipos, testes unitários, integração, E2E e verificação autoral;
6. métricas e logs permitem localizar falha por `request_id` sem capturar dado proibido;
7. extração para serviço só será considerada se houver dor observada de escala, isolamento, disponibilidade ou ownership — nunca por preferência estética;
8. web e worker não podem reimplementar regra de negócio: chamam contratos da API/aplicação;
9. alteração de contrato exige teste de compatibilidade e versão explícita;
10. tipos públicos são derivados de schemas e contratos compartilhados, evitando duplicação manual;
11. regras de domínio preferem funções puras, objetos imutáveis e injeção explícita de dependências;
12. exceções são tratadas por erros tipados, respostas públicas estáveis e logs estruturados redigidos.
13. Qdrant é atualizado por outbox/worker com chave determinística, versão de embedding e reconciliação; uma falha de indexação não interrompe o fluxo transacional.
14. toda chamada de IA tem timeout, retry limitado, limite de tokens, schema de saída, redaction e auditoria técnica sem armazenar prompt clínico completo.

## 7. Critérios de sucesso arquitetural

1. cada caso de uso do PRD possui um módulo e contrato correspondente;
2. estado de tentativa, nota, domínio, publicação e auditoria pode ser reconstruído entre API, web e worker;
3. ações sensíveis falham por padrão sem autorização explícita;
4. a aplicação funciona com Qdrant e IA desligados para os fluxos educacionais determinísticos; os recursos internos degradam com mensagem operacional clara;
5. a projeção participante não contém rastreabilidade bibliográfica ou ativos protegidos;
6. testes de domínio não exigem navegador, rede ou credencial real;
7. RPO de até uma hora, RTO de até quatro horas e WCAG 2.2 AA permanecem critérios de entrega;
8. uma correção de regra de negócio pode ser localizada, testada e auditada dentro do mesmo repositório e fluxo de deploy;
9. toda alteração possui vínculo com requisito, módulo, contrato, teste, commit e artefato de verificação.
