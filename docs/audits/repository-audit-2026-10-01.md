# Auditoria estática do repositório — 2026-10-01

## Escopo, revisão e limites

- Repositório: `cvg-trainee-vet`, branch `main`, HEAD `3cd7bc32751d59d0142e7d1b21a5a5a79a0103ff`.
- Baseline observado antes deste relatório: 40 arquivos rastreados modificados e 23 não rastreados. As alterações existentes foram preservadas.
- Escopo documental: inventário inicial dos 81 arquivos em `docs/` (36.309 linhas); leitura aprofundada do estado/log/backlog, planos 55–57, auditorias e scorecards, arquitetura, segurança, ADRs, operação, runbooks e riscos. Os prompts arquivados 46–54 foram tratados como histórico, não como instruções vigentes.
- Escopo técnico: manifests, CI, boundaries, rastreabilidade, testes/configuração, superfícies API/web/worker, persistência, observabilidade e diffs locais ligados à SOA-31/33/36.
- Classificação: auditoria **estática de documentação e código**. Não houve observação de runtime, banco, serviços externos ou workflows remotos; portanto não é uma auditoria operacional AUDIT completa.
- Não foram executados testes, lint, typecheck, build, scanners, drills, migrations ou comandos de CI nesta revisão. A última evidência registrada é de 2026-09-17 e não foi repetida; ela não certifica o estado atual.
- Não houve revisor independente. As notas e conclusões são desta revisão estática e devem ser reavaliadas antes de qualquer gate de promoção.

## Critério das notas

Notas consultivas por dimensão: 0 = ausente; 25 = esqueleto; 50 = parcial; 75 = substancial, com lacunas; 90 = integrado e bem evidenciado no recorte; 100 = completo e comprovado atualmente. Não são percentuais de requisitos concluídos. Não calculo média global, pois um bom resultado numa dimensão não compensa gate ou fluxo crítico ausente.

## Notas por dimensão

### Produto e governança

| Item analisado | Nota /100 | Fundamentação |
|---|---:|---|
| Gates Discovery, PRD e SPEC | 86 | Validações formais aprovadas e requisitos extensos; persistem conflitos de regra editorial e de metas operacionais. |
| Planejamento BUILD e rastreabilidade | 72 | Masters, roadmaps e manifesto existem; há backlog mestre mais backlog SOA sobreposto e artefatos locais ainda sem commit. |
| Estado, log e backlog atuais | 48 | No início da revisão, o checkpoint mais recente era de 17/09 e o worktree tinha 63 entradas modificadas/não rastreadas; estado/log/backlog mestre foram atualizados nesta rodada, mas o overlay SOA segue no checkpoint de 17/09. |
| Auditorias, scorecards e proveniência documental | 55 | Limitações são frequentemente declaradas; scorecard v7 é histórico, aponta evidência de SHA diferente e não representa o worktree atual. |

### Arquitetura e implementação

| Item analisado | Nota /100 | Fundamentação |
|---|---:|---|
| Arquitetura e fronteiras de módulos | 84 | Monorepo com 3 apps e 9 packages, regras executáveis de dependência e separação de domínio; composição real não foi exercitada nesta revisão. |
| Domínio e regras locais | 74 | Domínio tem políticas e testes próprios; a política somativa não está ligada a consumidores do runtime encontrados na busca estática. |
| API, contratos e validação | 84 | Registry, handlers e schemas concretos; não houve execução atual dos contratos e `apps/api/src/http.ts` ainda tem 895 linhas. |
| Identidade, autorização e fronteiras públicas | 80 | Autorização server-side, sessão e projeções estão implementadas; trusted proxies e falha de rate limit permanecem riscos registrados, sem prova live atual. |
| Persistência, transações e migrations | 80 | Repositórios, migrations e mecanismos de idempotência existem; a cadeia não foi reaplicada nem verificada em banco nesta revisão. |
| RLS e isolamento em banco real | 60 | Políticas e harnesses estão presentes; não há evidência live atual de matriz completa sob roles sem bypass. |
| Tentativa, resposta, correção e jornada | 70 | Fluxos de tentativa e resposta existem; a jornada completa até avaliação, progressão e recuperação não está demonstrada aqui. |
| Avaliação somativa e elegibilidade | 45 | Regras existem no domínio e têm testes, mas não encontrei consumidores em application/API/worker; `StartAttempt` não carrega modalidade/versão. |
| Currículo e conteúdo clínico | 42 | Catálogo e runtime existem; a auditoria anterior descreve itens genéricos/rascunhos e publicação clínica ainda não aprovada. |
| Autoria, revisão e publicação | 58 | Workflow e controles estão implementados, mas RN-044 permite autorrevisão por Ricardo enquanto a SPEC/código exige revisor diferente. |
| Web, interação e UX | 68 | Cinco superfícies estão presentes; não houve inspeção visual/browser atual. |
| Manutenibilidade frontend e componentes compartilhados | 42 | Páginas extensas (por exemplo, operações com 4.295 linhas); a camada compartilhada de UI é mínima. |
| Acessibilidade | 55 | Há testes/evidência histórica de axe; não há validação atual com tecnologia assistiva, zoom nativo ou revisão manual. |
| Worker e processamento assíncrono | 74 | Outbox, leases e retries existem; não foram observados worker e dependências em execução nesta revisão. |
| Qdrant e IA assistiva | 64 | Adaptadores e controles de desligamento estão descritos; provider real e Qdrant live não foram comprovados agora. |

### Qualidade, segurança e operação

| Item analisado | Nota /100 | Fundamentação |
|---|---:|---|
| Instrumentação, métricas e SLOs | 72 | O diff conecta p95 por histograma; a medição é por processo, só para respostas 2xx registradas, antes da escrita HTTP, sem janela móvel ou agregação entre instâncias. Não foi executada. |
| Desenho da suíte unitária/contratos/integração | 78 | Há grande conjunto de testes e fixtures live condicionais; a evidência registrada em 17/09 não foi repetida no estado atual. |
| Cobertura, skips e seleção de E2E | 48 | Configuração de cobertura inclui somente `.ts`, sem páginas web TSX; o spec `real-runtime.spec.ts` é ignorado inclusive quando o modo real é selecionado. |
| Assurance de mutação | 45 | A nova implementação falha fechada e rejeita a métrica histórica; o workflow ainda chama a interface antiga e o harness não foi exercitado nesta revisão. |
| CI e controles de supply chain | 78 | Actions estão fixadas por SHA, há quality/security/candidate e scan de dependências; não consultei execuções remotas. |
| Proveniência de release e same-SHA | 35 | Há verificadores e bundles; a prova remota same-SHA continua pendente, branch protection está apenas recomendada e assinatura de artefato ainda não foi gerada. |
| Runbooks, DR e operação | 60 | Há runbooks e políticas úteis; restore não foi ensaiado agora, a ordem migration/restore precisa ser reconciliada e RPO difere entre documentos. |
| Manutenibilidade geral | 60 | As camadas e regras são explícitas; vários arquivos de produção/teste excedem mil linhas e a superfície web concentra milhares de linhas por página. |
| Prontidão para piloto, produção e publicação clínica | 25 | Sem runtime/produção observados; AAA-001, prova remota, RLS live e aprovação clínica permanecem pendentes. |

## Achados prioritários

### AUDIT-20261001-01 — Interface do workflow candidate incompatível (P1, confiança alta)

`.github/workflows/candidate.yml:127–134` chama `verify-mutation-closure.mjs --write-summary` e `verify-mutation-critical.mjs --write-summary`. Os dois scripts atuais aceitam `--bounded-manifest`; sem esse argumento retornam `NOT_VERIFIED` e exit 1. Assim, o workflow candidate falha na primeira etapa de fechamento de mutação e não chega à certificação. A quarentena do histórico é correta; falta conectar o fluxo candidate ao contrato novo.

### AUDIT-20261001-02 — Denominador de cobertura não atende à barra congelada (P1, confiança alta)

`vitest.config.ts:31–40` mede apenas `packages/**/src/**/*.ts` e `apps/**/src/**/*.ts`. Isso não inclui `.tsx` nem as páginas em `apps/web/app`, embora SOA-QB-v1 em `docs/55_executive_plan_state_of_art.md` exija todo código de produção próprio TS/TSX, incluindo páginas e arquivos sem import em testes. Um gate verde atual pode deixar a interface fora do denominador.

### AUDIT-20261001-03 — Verificação de symlink não cobre diretórios intermediários (P2, confiança alta)

Em `scripts/verify-mutation-closure.mjs:120–145`, `lstat(join(root, name))` detecta symlink no arquivo final, mas segue symlinks em diretórios pais. A escrita posterior usa `writeFile(join(root, source))`. Um manifesto com diretório intermediário symlink pode, portanto, escrever fora da raiz isolada apesar das verificações de raiz/arquivo. A proteção precisa validar cada componente ou a resolução real do caminho antes de escrever.

### AUDIT-20261001-04 — Digest único para mutações em múltiplos arquivos (P2, confiança alta)

`runBoundedClosure` calcula `baselineDigest` apenas do arquivo da primeira identidade (`scripts/verify-mutation-closure.mjs:271–289`) e reutiliza o valor para todas. O manifesto permite fontes e identidades múltiplas; identidades em outro arquivo podem ser classificadas como erro de restauração, em vez de comparar com o digest daquele arquivo. Os testes adicionados cobrem somente um arquivo.

### AUDIT-20261001-05 — Spec de E2E real sempre excluído (P2, confiança alta)

`playwright.config.ts:11–14` inclui `**/real-runtime.spec.ts` em `testIgnore` tanto no modo comum quanto no staging. O próprio spec só roda quando `CVG_RUN_REAL_E2E=true` (`tests/e2e/real-runtime.spec.ts:89`), mas o filtro o remove antes da seleção. Corrigir a seleção e confirmar que o comando de CI executa a suíte pretendida.

### AUDIT-20261001-06 — Elegibilidade somativa sem integração de runtime (gap de produto, confiança alta no escopo pesquisado)

A busca encontrou `evaluateSummativeAssessment` e `evaluateSummativeAttemptEligibility` no domínio, export e testes de domínio, sem consumidor em application/API/worker. `StartAttempt` não transporta modalidade ou versão. A regra precisa ser conectada conforme o contrato aprovado, sem impor elegibilidade somativa aos quizzes formativos.

### AUDIT-20261001-07 — Decisões de produto e operação ainda conflitantes (decisão humana)

RN-044 autoriza Ricardo a criar, revisar, aprovar e publicar no MVP; SPEC 0106 §9 exige revisor diferente do autor. Além disso, PRD RNF-015 fixa RPO ≤1h, enquanto o pacote AAA-001 recomenda RPO ≤24h. `docs/55` mantém H-EDITORIAL e H-OPS abertos. Nenhuma regra foi escolhida nesta auditoria.

### AUDIT-20261001-08 — Continuidade e evidência de release não refletem a revisão atual (P2, confiança alta)

Antes desta rodada, `docs/99_runtime_state.md` e o fim do log paravam em 17/09; ambos foram atualizados para registrar a auditoria. O overlay `docs/57_backlog_state_of_art.md` ainda mostra checkpoint de 17/09. O scorecard v7 aponta HEAD 3cd7bc3, mas sua linha de título registra evidência 14b97a8. Há mudanças locais não commitadas; o scorecard continua histórico e não deve ser apresentado como evidência do worktree atual.

### AUDIT-20261001-09 — Procedimento de restore requer reconciliação (P2, confiança média)

`docs/operations/disaster-recovery.md:11–14` manda aplicar migrations até o head e depois restaurar backup. O procedimento não define a compatibilidade entre schema do backup e head atual; `docs/57` já identifica a ordem como questão para reconciliar. Não executar em ambiente real antes de especificar precondições e validar o procedimento num banco descartável.

## Próximas ações recomendadas

1. Reparar o encadeamento do workflow candidate com o novo contrato `--bounded-manifest` e sua evidência.
2. Endurecer contenção de caminhos do harness e calcular/restaurar digest por arquivo; cobrir symlink intermediário e manifestos multifile.
3. Ajustar o denominador TS/TSX à barra SOA-QB-v1 e fazer o spec E2E real ser selecionável no job correto.
4. Continuar SOA-14/15 com RED para modalidade somativa, preservando o fluxo formativo; obter as decisões H-EDITORIAL/H-OPS antes de alterar essas regras.
5. Após os gates locais, executar live somente em ambiente descartável autorizado e gerar evidência vinculada ao candidato; não inferir produção ou CI remoto.

## Verificações e evidências

- Inspeções feitas: estado Git, diffs locais, árvore/manifests, docs operacionais e de produto, config de testes, workflows e busca estática dos consumidores somativos.
- `git diff --check` — PASS (exit 0).
- Testes, build, lint, typecheck, scanners, bancos, browser, serviço externo e CI remoto: **não executados**.
- Última execução registrada em documentos: `pnpm verify` em 2026-09-17, exit 0 registrado, 1.441 testes aprovados e 68 skipped; permanece evidência histórica, não resultado desta auditoria.
- Limitação: esta avaliação não observou comportamento em runtime e não aprova release, piloto, clínica ou produção.
