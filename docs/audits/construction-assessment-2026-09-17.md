# Auditoria de construção real — 2026-09-17

## Escopo e veredito

Repositório: cvg-trainee-vet, HEAD 3cd7bc32751d59d0142e7d1b21a5a5a79a0103ff mais alterações locais preexistentes. Leitura distribuída dos arquivos de docs, gates PRD/SPEC/BUILD e inspeção de apps, packages, testes, scripts e evidências. Goal, engineering-framework, orchestrate e gauntlet-loop utilizados; runtime-controller para continuidade.

**Veredito: avaliação limitada; não certificado para release/produção/AAA.** Existe plataforma técnica substancial, mas o programa educacional completo não está demonstrado ponta a ponta. Não é mero scaffold, nem produto concluído.

Notas são julgamentos consultivos inteiros, não porcentagem de requisitos concluídos. Âncoras: 0 ausente, 25 esqueleto, 50 parcial, 75 substancial com lacunas, 90 integrado e bem evidenciado no recorte, 100 completo e atualmente comprovado. Não agregamos dimensões sobrepostas nem permitimos que média compense gate ausente. Conteúdo clínico não foi validado por especialista.

## Construção observada

- Três apps: API Node HTTP, web Next.js e worker PostgreSQL outbox.
- Nove packages: application, config, contracts, curriculum, domain, integrations, observability, persistence e ui.
- Inventário estático: 33 tabelas Drizzle, 55 migrations SQL (0000–0054), 35 arquivos de repositório, registry de 57 entradas (não necessariamente 57 combinações concretas método/rota).
- Cinco páginas: participante, diagnóstico, autoria, operações e recuperação.
- 240 arquivos Vitest; dez arquivos Playwright, dos quais dois excluídos por padrão.
- UI compartilhada é placeholder; currículo tem catálogo de 24 módulos, M02 específico e maioria dos demais bancos gerada genericamente.

## Notas por item

### Documentação e governança

| Item analisado | Nota /100 | Fundamentação |
|---|---:|---|
| Definição do produto e gates Discovery/PRD/SPEC | 85 | Documentos e aprovações registrados; persistem contradições de regra editorial |
| Planejamento BUILD e rastreabilidade | 75 | Master, roadmap, backlog e manifesto existem; snapshots e estados se sobrepõem |
| Documentação arquitetural | 70 | Fronteiras claras, mas diagramas e estado do registry desatualizados |
| ADRs e documentação de segurança | 65 | Controles explicitados; rate limit e gaps descritos como futuros já têm implementação |
| Runbooks e operação documentada | 60 | Procedimentos úteis; conflito na ordem restore/migrations e afirmações sem prova live correspondente |
| Estado, log e backlog atuais | 50 | Histórico abundante, mas estado corrente contém HEADs e métricas de épocas diferentes |
| Auditorias e scorecards históricos | 50 | Limites frequentemente declarados, porém notas e PASS não equivalem a evidência atual |

### Produto e implementação

| Item analisado | Nota /100 | Fundamentação |
|---|---:|---|
| Arquitetura e composição backend | 80 | Camadas, portas e adaptadores reais; algumas estruturas ainda desconectadas |
| API e contratos | 85 | Handlers, validação Zod e projeções concretas, testes locais passando |
| Contas, convite, sessão e recuperação | 80 | Fluxos implementados; HTTPS e dependências reais não revalidados nesta rodada |
| Autorização e fronteiras públicas | 75 | Regras server-side, proprietário/escopo e publicação clínica controlados; sem certificação live |
| Persistência e integridade transacional | 80 | Transações, idempotência, versões e migrations; aplicação real das migrations não rerodada |
| RLS e isolamento em banco real | 60 | Políticas e testes presentes; execução atual live ausente |
| Tentativas, respostas e correção | 75 | Fluxo web/API/repositórios conectado; fechamento curricular permanece separado |
| Avaliação somativa e elegibilidade | 45 | Políticas 30/70 e intervalos existem, mas consumidores de runtime não encontrados |
| Jornada e progressão | 65 | Consultas, atribuições e projeções concretas; ciclo completo não demonstrado |
| Remediação e retenção | 50 | Datas e estados implementados; aplicação de formas equivalentes e automação incompletas |
| Diagnóstico B-07 | 55 | Sessão persistida e UI existem; banco genérico e disponibilidade por flag de draft |
| Currículo e conteúdo pedagógico | 40 | Catálogo amplo, mas bancos genéricos; publicação/revisão clínica pendentes |
| Autoria, revisão e publicação | 60 | Workflow concreto; PRD permite auto-revisão de Ricardo e SPEC/código exigem autor diferente |
| Feedback, recursos e operação administrativa | 75 | Filas, histórico e ações implementados; recálculo limitado a manter resultado |
| Web funcional | 65 | Cinco superfícies reais, sem validação browser atual nesta rodada |
| Manutenibilidade frontend/UI compartilhada | 40 | Páginas muito grandes e pacote ui de uma linha, sem componentes compartilhados |
| Acessibilidade | 55 | Testes e evidência histórica; sem nova observação ou auditoria assistiva |
| Worker/outbox | 75 | Lease, fencing, retries e processamento concretos; eventos educacionais incluem no-op |
| Qdrant | 65 | Adaptador, indexação e reconciliação existem; índice derivado, sem live atual |
| IA assistiva | 55 | Adaptador estruturado/desligável e fronteiras presentes; provider real não validado |
| Rate limiting distribuído | 70 | PostgreSQL e Redis implementados; wiring de trusted proxies incompleto |

### Qualidade e operação comprovadas

| Item analisado | Nota /100 | Fundamentação |
|---|---:|---|
| Suíte unitária/contratos/aplicação | 85 | 1.409 testes passaram nesta rodada; 68 ignorados, Node não canônico |
| Abrangência da cobertura | 60 | Configuração tem pisos, mas exclui páginas TSX; percentual atual não remensurado |
| Validade da assurance de mutação | 25 | Equivalências e classificação de falhas no harness comprometem confiança na taxa ajustada |
| E2E com dependências reais | 50 | Harness existe, porém real-runtime.spec.ts sempre ignorado na configuração inspecionada |
| Gates arquiteturais e de qualidade | 55 | Automação real, mas checks de ciclos/dead code têm alcance inferior ao nome |
| Dependências e secrets | 80 | Audit sem vulnerabilidades conhecidas e scanner local limpo; não prova segurança total |
| Observabilidade, health e tracing | 70 | Instrumentação concreta; exportação/collector não rerodados |
| SLOs e deadlines conectados | 45 | p95 não alimentado no snapshot; deadline estruturado sem propagação demonstrada |
| Backup, restore, carga e drills | 55 | Scripts e evidência histórica, sem nova execução integrada |
| CI configurado | 70 | Quality/security/candidate definidos, sem runs remotos atuais verificados |
| Proveniência e same-SHA | 35 | Bundle ligado a commit anterior; remoto ausente nos artefatos |
| Prontidão para produção | 25 | Sem prova atual de rollout, operação produtiva ou fechamento de gates |

## Achados prioritários

### A01 — Assurance de mutação precisa de revisão antes de reutilizar 98,84%

`scripts/verify-mutation-closure.mjs:74–108` classifica mudanças de labels do switch como equivalentes. A seleção em `packages/application/src/authorization.ts:132–159` não preserva a capability cujo label foi removido/trocado. A justificativa de fall-through não sustenta esses casos.

`scripts/verify-mutation-closure.mjs:221–257` converte qualquer exceção do processo de testes em kill, sem distinguir infraestrutura de falha de assertion. O agregado histórico também merece reconciliação por identidade do mutante, não aproximação por linha. Não foi executada mutação nem demonstrado bypass de segurança. **A taxa ajustada publicada não é aceita como comprovada nesta auditoria.**

### A02 — Regras educacionais isoladas não equivalem ao ciclo integrado

`packages/domain/src/assessment-policy.ts:94–209,243–298` implementa composição e elegibilidade; busca dos símbolos não encontrou consumidores de runtime. `packages/application/src/attempt-use-cases.ts:162–193` abre tentativa com outras verificações. `apps/worker/src/handlers.ts:143–151` reconhece eventos educacionais sem efeito adicional.

É necessário provar tentativa → correção → avaliação curricular → progressão/remediação/retenção através de uma jornada real, antes de declarar o programa completo.

### A03 — Catálogo não é biblioteca clínica completa

`packages/curriculum/src/learning-runtime.ts:322–378,577–618` usa questões genéricas para a maioria dos módulos. `:686–703` mantém publicação desautorizada e revisão pendente. Pode existir conteúdo adicional num banco não inspecionado; não foi presumido.

### A04 — Conflito editorial é de contrato, não apenas de código

`BRIEFING/09.PROJETO_CVG_TREINAMENTO/01.PRD/0012_regras_de_negocio.md:68–69` permite Ricardo criar/revisar/aprovar/publicar. `packages/application/src/authoring-use-cases.ts:708–713` impede autor de revisar, alinhado à SPEC `0106_contratos_de_aplicacao.md:239`. Reconciliar a decisão antes de corrigir implementação.

### A05 — Instrumentação declarada ultrapassa integração observada

`packages/observability/src/operations.ts:203–220` não fornece p95 para os dois SLOs de latência; o avaliador retorna NO_DATA. O deadline em `apps/api/src/http/request-context.ts:118–149` não demonstrou propagação no handler HTTP. `apps/api/src/main.ts:472–486` não passa trustedProxies à composição inspecionada.

### A06 — Testes e gates precisam de denominador explícito

`vitest.config.ts:31–40` não inclui as páginas TSX. `playwright.config.ts:11–14` ignora real-runtime.spec.ts. `scripts/verify-cycles.mjs:57–69` não converte imports .js para fontes .ts. Não foi constatado ciclo; foi constatada limitação do detector.

### A07 — Estado e evidência estão defasados

`docs/99_runtime_state.md:26` e `:45` apresentavam HEADs diferentes; `:49` mantinha números antigos como frescos. O bundle em `release-evidence/coverage-summary.json:2–5` aponta 14b97a8, não o worktree auditado. Histórico preservado não equivale a certificação atual.

## Verificações executadas

| Comando | Resultado |
|---|---|
| pnpm test --reporter=dot | PASS: 204 arquivos passaram, 36 ignorados; 1.409 testes passaram, 68 ignorados; 33,80 s |
| pnpm lint | PASS; repetido após formatação |
| pnpm typecheck | PASS; repetido após formatação |
| pnpm format:check | Primeiro FAIL em scripts/verify-triple-aaa.mjs; depois PASS após Prettier |
| pnpm exec vitest run --project integration tests/integration/triple-aaa-verifier.test.ts | PASS pós-formatação: 25/25 |
| pnpm audit --audit-level=high | PASS: nenhuma vulnerabilidade conhecida reportada |
| pnpm verify:secrets | PASS do scanner local; alcance limitado |
| git diff --check | PASS |

Aviso Vitest: assertion assíncrona não aguardada em `apps/api/src/http-boundary/curriculum.http.test.ts:723`; ainda passa nesta versão. Ambiente: Node 24.20.0, fora de >=22.22.0 <23; pnpm 10.33.0.

Não executados: cobertura atual, mutation testing, Playwright, stack live PostgreSQL/RLS/Redis/Qdrant, carga, restore, CI remoto, build completo Next.js ou deploy. Cobertura histórica 91,56/86,10/95,94/92,17 não é resultado novo. Não foi executado o encadeamento completo pnpm verify.

## Orquestração, independência e limitações

Cinco scouts fizeram leitura/inventário; críticos fresh fizeram inspeção estática. Resultados executados vieram do Lead. O primeiro sentinel de duas críticas coincidiu (9923944b05a7ceae397c1100e313cc939ce9d366dd0732022680bdd9adab5934). Um crítico declarou contaminação por parecer anterior e não foi usado como aprovação independente.

Uma crítica final adicional aprovou a suficiência do relatório limitado, mas seu sentinel divergiu (esperado 95641eaf4e58226d5f7768721b263ba173763c7453e2f2fce9dd6263aca3fe48; observado 0fc0006bc05b828c8ce66d7d41a7df4e6ecfb895108152c0c77076689ecb07d4). A captura inicial ocorreu em paralelo com typecheck/teste focal; a causa do drift não foi isolada. **Parecer final não homologado; nenhuma acusação de escrita pelo crítico.** As notas finais são do Lead, não consenso certificado.

O protocolo não foi integralmente seguido: parte da descoberta precedeu a formalização da barra; não houve medição visual cega em dois revisores; checks rodaram no workspace, podendo atualizar caches/artefatos gerados. A formatação de um script foi feita pelo Lead apesar do escopo originalmente auditivo. Alterações preexistentes não foram revertidas. Estas limitações impedem um PASS Gauntlet pleno, não invalidam as observações explicitamente delimitadas.

## Próximo passo recomendado

Priorizar a integridade do harness de mutação e a reconciliação das regras educacionais/editoriais; depois demonstrar uma jornada vertical com conteúdo sintético revisado em Node 22 e banco descartável. Só então regenerar evidência vinculada ao candidato e obter revisão independente com sentinel estável. Não é necessário esperar publicação clínica para corrigir o núcleo. Autorizações AAA-001 e operações remotas continuam separadas.
