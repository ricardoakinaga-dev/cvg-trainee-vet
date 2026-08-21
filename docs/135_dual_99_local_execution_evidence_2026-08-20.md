# Evidência local de execução Dual99 — 2026-08-20

- programa: `CVG-DUAL-99`
- corte: `2026-08-21T02:51:17-03:00`
- última atualização: `2026-08-21T02:51:17-03:00`
- disposição: `IN_PROGRESS` / `PILOT_BLOCKED`
- commit publicado: `0f575d1` em
  `origin/agent/publish-production-hardening`
- evidência documental publicada: `22de927` em
  `origin/agent/publish-production-hardening`
- paridade documental final: confirmada no pós-push em `22de927`; nenhum código
  ou estado externo foi alterado depois desse corte
- pacote documental de auditoria anterior: `2af57e6`; a auditoria registrada
  nele observou `HEAD == origin` em `6ddc37b`
- fonte de avaliação: `docs/133_dual_98_post_hardening_assessment_2026-08-16.md`
- manifesto: `dual-99-program.json`
- limitação: esta evidência é de worktree local e não promove nota, release,
  piloto, decisão clínica ou reauditoria independente.

## Plano materializado

- programa executivo: `BRIEFING/03.BUILD/0309_dual_99_executive_program.md`
- roadmap: `BRIEFING/04.AUDIT/0518_dual_99_roadmap.md`
- backlog: `BRIEFING/04.AUDIT/0519_dual_99_backlog.md`
- gate estrutural: `pnpm verify:dual99-program`
- registry: `docs/canonical-document-registry.json`

## Implementações locais desta rodada

- Git cwd root boundary: a validação da raiz agora abre e mantém um descritor
  `O_DIRECTORY | O_NOFOLLOW` vivo durante workspace, staged e history; Git usa
  `/proc/self/fd/<fd>` como `cwd`, e falhas de abertura retornam finding
  redigido. O RED reproduziu vazamento externo em `7/500` tentativas; os probes
  pós-GREEN não vazaram.
- workspace directory boundary: a travessia recursiva agora mantém o descritor
  pai aberto, abre cada diretório com `O_DIRECTORY | O_NOFOLLOW` e enumera por
  `/proc/self/fd/<fd>`; falhas de abertura/readdir viram finding redigido em
  `<workspace>`. O RED reproduziu follow e `ENOENT`; o probe pós-GREEN executou
  `5000` trocas sem vazamento nem exceção e o foco passou `48/48`.
- workspace open boundary: `readScanBuffer` agora abre arquivos regulares com
  `O_RDONLY | O_NOFOLLOW`, evitando follow de symlink no componente final
  depois de `lstat`; se `O_NOFOLLOW` não existir, a leitura falha fechado. RED
  reproduziu a troca TOCTOU e o probe pós-GREEN completou `5000` trocas sem
  vazamento; o foco passou `47/47`.
- workspace root boundary: `scanProject` agora valida a raiz com `lstat`
  antes de enumerar worktree, staged ou history; symlink, ausência e arquivo
  regular retornam um finding redigido em `<workspace>` com
  `unreadable-file`, sem atravessar a raiz e sem invocar Git. O guard foi
  extraído para `scripts/secret-scanner-workspace.mjs` para manter o scanner
  principal em `800` linhas; a regressão focal passou `46/46`.
- bounded workspace reads: `scanFile` agora descarta por metadata os assets
  ignorados acima de `MAX_SCAN_BYTES`, sem abrir o arquivo, e `readScanBuffer`
  lê arquivos regulares em buffer máximo de `MAX_SCAN_BYTES + 1`; uma regressão
  com `.png` esparso, oversized e sem permissão passou `43/43` sem produzir
  `unreadable-file`, e crescimento concorrente não pode exceder o limite;
- qualidade da rodada: cobertura integral passou `205/1139/21` em
  `95,03/90,95/95,31/95,73`, build `12/12` com endpoint sintético explícito,
  hotspots `0`, contratos `87/87`, worker `51/51`, decisões `7/7`, mutation
  `7/7`, migration safety `33/33`, lint, typecheck, formato, audit e
  `diff-check`; sem a variável de build o guard de produção bloqueou conforme
  esperado;

- scanner de segredos: enumeração de worktree/index/history, tags anotadas,
  referências `secret://`, expressões de código e placeholders sintéticos
  delimitados foram cobertos por testes adversariais; paths com extensão de
  asset agora também são enumerados, texto UTF-8 limitado é escaneado e bytes
  binários/oversize de assets não são tratados como texto; o scanner continua
  fail-closed e ainda acusa `infra/production/.env.local` sem imprimir valores.
- preflight de histórico: `git cat-file --batch-check` agora valida tipo e
  tamanho antes de requisitar corpos; assets acima de `MAX_SCAN_BYTES` não têm
  corpo materializado, enquanto paths não-asset oversized geram
  `oversize-file` e assets textuais limitados continuam escaneáveis.
- limite agregado de histórico: corpos bounded são particionados em batches de
  até `8 MiB`, cada saída de subprocesso recebe cap derivado dos tamanhos
  preflightados e overflow gera finding `git-object-unreadable` redigido.
- consumo incremental de histórico: `runGitBatch` entrega chunks ao parser
  framed; somente o header e o corpo do objeto corrente bounded são retidos,
  sem `Buffer.concat` do stdout inteiro da batch, e corpos oversized continuam
  sendo descartados sem materialização.
- stderr do subprocesso: `runGitBatch` aplica limite independente de `4 KiB`,
  encerra fail-closed em stderr excessivo e substitui stderr não-zero por
  mensagens genéricas, sem reter ou expor o texto bruto.
- default de stdout: o fallback de `runGitBatch` agora tem cap finito de `8 MiB`
  em vez de `Infinity`; callsites com preflight continuam podendo passar
  limites explícitos maiores quando necessário.
- auditoria pós-publicação: no momento da execução, `HEAD` e
  `origin/agent/publish-production-hardening` estavam em `6ddc37b`; o pacote
  documental que a registrou foi publicado depois em `2af57e6`. Foco `39/39` e
  hotspots `0` permanecem verdes. A auditoria de fonte confirmou caps finitos
  em todos os callsites do scanner; não foi selecionado novo gap local de
  produção.
- qualidade: dashboard, jornada, runner HA, fixture real sintético, authoring,
  política somativa e parser de interação foram decompostos com caracterização
  TDD; o ratchet passou em `144` funções longas / `113` linhas máximas, sem
  hotspot não classificado; conflito de fontes passou a cobrir normalização de
  domínio, persistência e aprovador ausente.
- mutation crítica: `scripts/verify-critical-mutation.mjs` executa baseline e
  sete mutações reais em diretório temporário; `7/7` foram mortas, score `100%`
  com mínimo `90%`; evidência em `docs/137_dual_99_critical_mutation_evidence_2026-08-20.md`.
- governança: manifesto executável Dual99 valida `16+16`, `C1–C8`,
  `RH01–RH06`, `145` requisitos, `9` gates e `46` tasks do backlog.
- worker: o inventário de skips foi atualizado de `20` para `21` testes e o
  teste PostgreSQL cobre claim→lease→ack→cleanup real, ACK stale após reclaim,
  retry e DLQ; o ambiente local sem banco live mantém os três testes guardados.
- identidade clínica corrente: `CLINICAL_APPROVER_ID` foi removido do runtime,
  API, Compose HA, `.env.example` e verificador de topologia; os fluxos de
  source-conflict, recalculation, correction e content withdrawal derivam o
  principal autenticado, revalidam a conta persistida como `ACTIVE` +
  `CLINICAL_APPROVER` + escopo e, quando aplicável, executam leitura e write no
  mesmo transaction executor com contexto de escopo.
- integridade de idempotência: B99-105 adicionou validação 16–128 no boundary
  HTTP/persistência, lock advisory namespaced, TTL/cleanup pelo
  `CURRENT_TIMESTAMP`, constraints e response hash SHA-256; a migration 0032
  rejeita legado, força RLS, revoga `PUBLIC` e permite cleanup somente pelo
  contexto de participante/escopo.
- revisão final: o default server-clock ausente no schema Drizzle de
  `authoringWorkflowIdempotency.expiresAt` foi corrigido para refletir a
  migration 0032; um probe somente leitura confirmou que o PostgreSQL HA ativo
  ainda está em migration count `30`, usa `cvg_admin` com
  `SUPERUSER/BYPASSRLS` e não tem RLS de authoring aplicado, portanto não é o
  RC desta rodada.
- diagnóstico/convite: B99-106 alinhou o catálogo de
  `/health/dependencies` a `VIEW_INTERNAL_AUDIT`/`INTERNAL`/`audit`, passou o
  convite para `/invite#token=...`, restringiu leitura ao fragmento e limpou
  tokens do fragmento e de query legada.
- observabilidade runtime: B99-203 adicionou verificador read-only da API
  Prometheus, fixture `promtool` e comandos operacionais; o source versionado
  contém 14 rules, e a execução local confirmou rules saudáveis, targets A/B,
  Alertmanager conectado e watchdog firing sem alterar o HA.
- B99-204: logs e spans passaram a compartilhar IDs técnicos sanitizados, o
  worker emite spans correlacionáveis por evento, OTLP não carrega payload,
  Tempo local tem retenção explícita de 14 dias e os verificadores live
  confirmaram persistência de trace sintético e o ciclo interno sintético
  fire→ack→resolve do Alertmanager.
- B99-205: o probe de readiness passou a capturar o relógio de claim depois do
  insert PostgreSQL; a reconciliação PostgreSQL→Qdrant foi exercitada com
  conteúdo sintético não vazio, reparando divergência e órfão, replay e
  retirada sem expor payload.
- B99-307: o gate de migrations passou a rejeitar operações destrutivas,
  colunas obrigatórias sem default e `SET NOT NULL` sem guarda de backfill;
  a checagem entrou no `pnpm verify`, sem remover o bloqueio fail-closed para
  dados legados incompatíveis.

- B99-308: a auditoria de fonte encontrou leitura direta de propriedades
  desconhecidas em `validateApiSurface`, permitindo que getter/proxy hostil
  lançasse fora do contrato. `readUnknown` agora captura a exceção e falha
  fechado; a campanha seeded exercitou `512` descritores malformados, incluindo
  accessors que lançam, e `512` pares de método/path. Nenhum caso lançou,
  descritores inválidos produziram erros, o inventário válido de `57` rotas
  permaneceu sem erro e lookup malformado não resolveu. Foco `7/7`, integração
  `11/11`, contratos `28/87`, cobertura `205/1135/21` em
  `95,03/90,95/95,31/95,73`, build `12/12`, hotspots `0`, decisões `7/7`,
  mutation `7/7`, lint, typecheck, formato e diff-check passaram. Código/teste
  estão em `9b3f71e`.

- B99-101 default do planner Git: a auditoria read-only reproduziu que
  `planGitBatchRequests` aceitava `maxBatchBytes` omitido como
  `Number.MAX_SAFE_INTEGER`; três objetos sintéticos de `3 MiB` formavam uma
  batch de `9 MiB`. RED/GREEN fixou default finito de `8 MiB`, rejeitou limites
  não positivos, não seguros, `NaN` e infinitos, e gerou
  `git-object-unreadable` para objeto individual acima do orçamento. A produção
  continua passando `8 MiB` explicitamente. Foco `40/40`, cobertura
  `205/1136/21` em `95,03/90,95/95,31/95,73`, build `12/12`, hotspots `0` com
  maior função de `97` linhas, contratos `87/87`, decisões `7/7`, mutation
  `7/7`, migration safety, lint, typecheck, formato e diff-check passaram. A
  prova sintética produziu batches omitidos `[6291456,3145728]`, três batches
  de `3 MiB` com limite explícito de `5 MiB` e finding redigido para objeto de
  `9 MiB`. Código/teste estão em `87717ed`; o gate `pnpm verify:secrets`
  continua fail-closed nos quatro assignments redigidos preexistentes de
  `infra/production/.env.local`, que não foi lido nem alterado.

- B99-101 caps explícitos do helper Git: a auditoria read-only reproduziu que
  `runGitBatch` aceitava `maxOutputBytes: Infinity`, `maxOutputBytes: NaN` e
  `maxErrorBytes: Infinity`, permitindo alcançar o child apesar do contrato
  bounded. RED/GREEN passou a validar ambos os caps como inteiros seguros
  positivos dentro da Promise e antes do spawn, preservando defaults finitos,
  `onChunk`, limites válidos e mensagens genéricas/redigidas. Foco `41/41`,
  cobertura `205/1137/21` em `95,03/90,95/95,31/95,73`, build `12/12`, hotspots
  `0` com maior função de `97` linhas, contratos `87/87`, decisões `7/7`,
  mutation `7/7`, migration safety, lint, typecheck, formato e diff-check
  passaram. Probes sintéticos rejeitaram caps inválidos antes de `spawn` e
  aceitaram cap finito de `64` bytes. Código/teste estão em `f79cce6`; o gate
  `pnpm verify:secrets` continua fail-closed nos quatro assignments redigidos
  preexistentes de `infra/production/.env.local`, que não foi lido nem
  alterado.

- B99-101 caps de scan/header do parser Git: a auditoria read-only reproduziu
  que `planGitBatchRequests` aceitava `maxScanBytes: Infinity`, planejando
  objeto sintético de `9 MiB` sem finding, e que
  `createGitBatchStreamParser` aceitava `maxHeaderBytes: Infinity` em header
  incompleto. RED/GREEN passou a validar caps de scan/header como inteiros
  seguros positivos em planner, parser e reader antes de processar,
  preservando cap finito, framing bounded e `oversize-file`. Foco `42/42`,
  cobertura `205/1138/21` em `95,03/90,95/95,31/95,73`, build `12/12`, hotspots
  `0` com maior função de `98` linhas, contratos `87/87`, decisões `7/7`,
  mutation `7/7`, migration safety, lint, typecheck, formato e diff-check
  passaram. Cap finito de scan de `2 MiB` gerou finding redigido para objeto de
  `9 MiB` sem batch e header finito de `128` bytes permaneceu válido.
  Código/teste estão em `3410d52`; `pnpm verify:secrets` continua fail-closed
  nos quatro assignments redigidos preexistentes de
  `infra/production/.env.local`, que não foi lido nem alterado.

- B99-305: auditoria de fonte encontrou `createGitBatchStreamParser` com `104`
  linhas apesar do ratchet permitir `117`. O RED adicionou a regressão da
  barra exata de `100`; o GREEN extraiu `consumeGitBatchChunk` preservando
  framing Git, retenção bounded, redaction, overflow/truncamento e findings.
  Foco hotspot `6/6`, scanner `39/39`, cobertura `205/1134/21` em
  `95,02/90,95/95,31/95,71`, maior função `98`, `hotspotCount: 0`, mutation
  `7/7`, contratos `86/86`, worker `51/51`, migrations `33/33`, migration
  safety, lint, typecheck, formato, diff-check, CI contract e documentation
  passaram. O código/teste está em `593619e` e
  `maxLongestFunctionLines` foi fixado em `100`.

## Round 57 — B99-101 / Git cwd root symlink TOCTOU — 2026-08-21T02:47:53-03:00

### RED → GREEN → REFACTOR

- RED usou um worker sintético para alternar a própria raiz entre diretório
  regular e symlink para outro repositório Git; o scanner anterior passou o
  pathname mutável como `cwd` e encontrou `staged:victim.env` externo em `3/300`
  tentativas. A regressão focal reproduziu `7` vazamentos em `500` tentativas;
- GREEN abriu a raiz com `O_DIRECTORY | O_NOFOLLOW`, manteve o descritor aberto
  durante workspace, staged e history e passou `/proc/self/fd/<fd>` como `cwd`
  de todos os comandos Git; falha na abertura da raiz retorna
  `<workspace> / unreadable-file`;
- REFACTOR moveu a deduplicação para `secret-scanner-findings.mjs` e preservou
  leituras bounded, recusa de symlinks finais e findings redigidos.

### VERIFICAÇÃO TRANSVERSAL

- foco de integração do secret scanner: `49/49`;
- cobertura completa: `205` arquivos, `1145` testes passantes e `21` guardados;
  `95,03%` statements, `90,95%` branches, `95,31%` functions e `95,73%`
  lines;
- probe staged pós-correção: `5000` trocas, zero vazamentos, zero exceções,
  `4933` resultados unreadable e `67` clean;
- probe history pós-correção: `1000` trocas, zero vazamentos, zero exceções,
  `977` resultados unreadable e `23` clean;
- build sintético `12/12`; hotspots `0`, maior função `98` linhas; contratos
  `87/87`, worker `51/51`, decisões `7/7`, mutation `7/7`, migration safety
  `33/33`, audit, lint, typecheck, formato e diff-check passaram.

### LIMITES / PUBLICAÇÃO

O `pnpm verify` no SHA `0f575d1` passou todos os gates até migration safety e
parou fail-closed em `verify:secrets` somente nos quatro assignments redigidos
preexistentes de `infra/production/.env.local`; o arquivo não foi lido nem
alterado. O commit de código/teste `0f575d1` e a reconciliação documental
`22de927` foram publicados no branch remoto; o pós-push confirmou
`HEAD == origin` em `22de927`. A
crítica foi fresca e read-only, porém não independente porque o backend de
critic não estava disponível. A solução depende de descritores POSIX e
`/proc/self/fd`; parent path races, secret manager/rotação, provider/CI,
RC/runtime, WebKit aprovado, clínica, `0/145`, gates externos, aprovação
humana e reauditoria independente continuam abertos; não houve score, release,
piloto ou mutação de produção.

## Round 56 — B99-101 / workspace directory-open symlink TOCTOU — 2026-08-21T02:16:26-03:00

### RED → GREEN → REFACTOR

- RED usou um worker sintético para alternar `root/nested` entre diretório
  regular e symlink para uma árvore externa; em `178` tentativas a travessia
  antiga encontrou `nested/victim.env` com `sensitive-assignment` e também
  expôs falha `ENOENT` quando o diretório desaparecia durante `readdir`;
- GREEN abriu cada diretório com `O_DIRECTORY | O_NOFOLLOW`, enumerou o
  descritor por `/proc/self/fd/<fd>` e manteve o pai aberto durante a recursão;
  falhas de abertura ou enumeração retornam um finding redigido
  `<workspace> / unreadable-file`;
- REFACTOR preservou a leitura bounded dos arquivos, a recusa de symlinks
  finais com `O_NOFOLLOW`, os diretórios ignorados e a deduplicação posterior
  dos findings.

### VERIFICAÇÃO TRANSVERSAL

- foco de integração do secret scanner: `48/48`;
- cobertura completa: `205` arquivos, `1144` testes passantes e `21` guardados;
  `95,03%` statements, `90,95%` branches, `95,31%` functions e `95,73%`
  lines;
- probe pós-correção em profundidade: `5000` trocas concorrentes sintéticas,
  sem `sensitive-assignment`, sem exceção e com findings genéricos redigidos
  quando a árvore não pôde ser enumerada;
- build sintético: `12/12`; hotspots `0`, maior função `98` linhas;
  contratos `87/87`, worker `51/51`, decisões `7/7`, mutation `7/7`, migration
  safety `33/33`, audit, lint, typecheck, formato e diff-check passaram;
- `pnpm verify` oficial passou todos os gates até migration safety e parou
  fail-closed em `verify:secrets` somente nos quatro assignments redigidos
  preexistentes de `infra/production/.env.local`.

### LIMITES / PUBLICAÇÃO

O arquivo `.env.local` não foi lido nem alterado. O commit de código/teste é
`4af5821` e a reconciliação documental `41cf20c`, ambos publicados no branch
remoto; o pós-push confirmou `HEAD == origin` em `41cf20c`. A crítica foi fresca e read-only, porém
não independente porque o backend de critic não estava disponível. A
travessia segura depende de descritores POSIX e `/proc/self/fd`; em plataformas
sem as flags necessárias ela falha fechado. Secret manager/rotação, provider/CI,
RC/runtime, WebKit aprovado, clínica, `0/145`, gates externos, aprovação humana
e reauditoria independente continuam abertos; não houve score, release, piloto
ou mutação de produção.

## Round 55 — B99-101 / workspace file-open symlink TOCTOU — 2026-08-21T01:56:15-03:00

### RED → GREEN → REFACTOR

- RED usou um worker sintético para alternar `victim.env` entre arquivo
  regular e symlink durante `scanProject`; em `164` tentativas o scanner
  anterior seguiu o alvo externo e emitiu `sensitive-assignment`;
- GREEN moveu `readScanBuffer` para `scripts/secret-scanner-workspace.mjs` e
  abriu o arquivo com `O_RDONLY | O_NOFOLLOW`; a abertura final rejeita
  symlink e a ausência da flag na plataforma também falha fechado;
- REFACTOR preservou a leitura bounded de `MAX_SCAN_BYTES + 1`, o tratamento
  fail-closed do `scanFile` e a fronteira existente da raiz `lstat`.

### VERIFICAÇÃO TRANSVERSAL

- foco de integração do secret scanner: `47/47`;
- cobertura completa: `205` arquivos, `1143` testes passantes e `21` guardados;
  `95,03%` statements, `90,95%` branches, `95,31%` functions e `95,73%`
  lines;
- probe pós-correção: `5000` trocas concorrentes sintéticas sem finding
  `sensitive-assignment`; tentativas com symlink foram tratadas como
  `unreadable-file`;
- build sintético: `12/12`; hotspots `0`, maior função `98` linhas;
  contratos `87/87`, worker `51/51`, decisões `7/7`, mutation `7/7`, migration
  safety `33/33`, audit, lint, typecheck, formato e diff-check passaram;
- `pnpm verify` oficial passou todos os gates até migration safety e parou
  fail-closed em `verify:secrets` somente nos quatro assignments redigidos
  preexistentes de `infra/production/.env.local`.

### LIMITES / PUBLICAÇÃO

O arquivo `.env.local` não foi lido nem alterado. O commit de código/teste é
`ee0ebc9` e a reconciliação documental é `5998266`, ambos publicados no branch
remoto; o pós-push confirmou `HEAD == origin` em `5998266`. A crítica foi
fresca e read-only, porém não independente porque o backend de critic não
estava disponível. A proteção fecha o follow do componente final; condições de
corrida em componentes-pai ou validação live permanecem fora desta prova
local. Secret manager/rotação, provider/CI, RC/runtime, WebKit aprovado,
clínica, `0/145`, gates externos, aprovação humana e reauditoria independente
continuam abertos; não houve score, release, piloto ou mutação de produção.

## Round 54 — B99-101 / workspace root symlink boundary — 2026-08-21T01:32:38-03:00

### RED → GREEN → REFACTOR

- RED criou uma raiz sintética symlink para um diretório temporário com
  `config.env` sintético; o scanner antigo atravessou a raiz fornecida e
  encontrou o conteúdo do alvo, além de continuar nas superfícies staged e
  history;
- GREEN adicionou `validateWorkspaceRoot`, baseado em `lstat`, no início de
  `scanProject`; symlink, caminho ausente e arquivo regular não são aceitos
  como raiz, retornam somente `<workspace> / unreadable-file` e encerram antes
  de worktree/staged/history ou Git;
- REFACTOR extraiu o guard para `scripts/secret-scanner-workspace.mjs`,
  mantendo o scanner principal em `800` linhas e preservando a redaction dos
  findings.

### VERIFICAÇÃO TRANSVERSAL

- foco de integração do secret scanner: `46/46`;
- cobertura completa: `205` arquivos, `1142` testes passantes e `21` guardados;
  `95,03%` statements, `90,95%` branches, `95,31%` functions e `95,73%`
  lines;
- build sintético: `12/12`; hotspots `0`, maior função `98` linhas;
  contratos `87/87`, worker `51/51`, decisões `7/7`, mutation `7/7`, migration
  safety `33/33`, audit, lint, typecheck, formato e diff-check passaram;
- `pnpm verify` oficial passou todos os gates até migration safety e parou
  fail-closed em `verify:secrets` somente nos quatro assignments redigidos
  preexistentes de `infra/production/.env.local`.

### LIMITES / PUBLICAÇÃO

O arquivo `.env.local` não foi lido nem alterado. O commit de código/teste é
`1ab557e` e a reconciliação documental é `3217e13`, ambos publicados no branch
remoto; o pós-push confirmou `HEAD == origin` em `3217e13`. A crítica foi
fresca e read-only, porém não independente porque o backend de critic não
estava disponível. Secret manager/rotação, provider/CI, RC/runtime, WebKit
aprovado, clínica, `0/145`, gates externos, aprovação humana e reauditoria
independente continuam abertos; não houve score, release, piloto ou mutação de
produção.

## Round 49 — B99-308 / API-surface adversarial fuzz boundary — 2026-08-21T00:04:17-03:00

### RED → GREEN → REFACTOR

- RED adicionou o primeiro getter sintético que lança e reproduziu a exceção
  na validação da superfície; a barra também exigiu `512` descritores
  malformados e `512` pares de lookup em um gerador seeded e reproduzível;
- GREEN introduziu `readUnknown`, que captura falhas de leitura de propriedades
  e transforma o valor em desconhecido, deixando a validação fail-closed;
- REFACTOR manteve a materialização da rota válida, o inventário canônico de
  `57` rotas e a resolução negativa sem alterar contratos ou produção.

### VERIFICAÇÃO TRANSVERSAL

- campanha adversarial: `512` descritores inválidos com accessors que lançam e
  `512` pares de método/path, sem exceções escapadas;
- foco `7/7`, integração `11/11`, contratos `28` arquivos / `87` testes;
- cobertura completa: `205` arquivos, `17` guardados, `1135` testes passantes,
  `21` guardados; `95,03%` statements, `90,95%` branches, `95,31%` functions e
  `95,73%` lines;
- build com endpoint local sintético `12/12`; hotspots `0`, decisões críticas
  `7/7`, mutation `7/7` (`100%`), lint, typecheck, formato e diff-check
  passaram;
- o `pnpm verify` oficial percorreu os gates até `verify:secrets` e parou
  fail-closed nos quatro assignments redigidos preexistentes de
  `infra/production/.env.local`.

### LIMITES / PUBLICAÇÃO

O arquivo `.env.local` não foi lido nem alterado. B99-308 está concluído no
escopo local da barra de fronteira; secret manager/rotação, provider/CI,
RC/proveniência, WebKit aprovado, runtime live, clínica, `0/145`, gates
externos, aprovação humana e reauditoria independente permanecem abertos. O
  commit de código/teste é `9b3f71e`, já publicado no branch remoto; a
  reconciliação documental desta rodada foi publicada em `47b6a6c`, com paridade
  final em `392ac11`. O programa
permanece `IN_PROGRESS / PILOT_BLOCKED`.

## Round 48 — B99-305 / function-length closure — 2026-08-20T22:25:53-03:00

### RED → GREEN → REFACTOR

- RED reproduziu a violação local: `createGitBatchStreamParser` tinha `104`
  linhas e a política permitia um ratchet de `117`, portanto o gate oficial
  não provava a barra de B99-305;
- GREEN adicionou a asserção `maxLongestFunctionLines === 100`, detecta toda
  função de produção acima de `100` e extraiu o consumidor de chunks para
  `consumeGitBatchChunk`;
- REFACTOR preservou o estado do parser, framing de header/corpo/delimitador,
  retenção de um único corpo bounded corrente, redaction, findings de
  truncamento/overflow e descarte de assets oversized.

### VERIFICAÇÃO TRANSVERSAL

- hotspot policy `6/6`; secret scanner `39/39`;
- cobertura completa: `205` arquivos passantes, `17` guardados, `1134` testes
  passantes, `21` guardados; `95,02%` statements, `90,95%` branches,
  `95,31%` functions e `95,71%` lines;
- `verify:hotspots`: `PASS_WITH_DEBT_RATCHET`, `hotspotCount: 0`, maior função
  `98` linhas, `maxLongestFunctionLines: 100`;
- lint, typecheck, formato, diff-check, decisões críticas `7/7`, mutation
  `7/7` (`100%`), contratos `86/86`, worker `51/51`, migrations `33/33`,
  migration safety, CI contract e documentation passaram;
- `pnpm verify` percorreu os gates até `verify:secrets` e falhou fail-closed
  somente nos quatro assignments redigidos preexistentes de
  `infra/production/.env.local`.

### LIMITES / PUBLICAÇÃO

O arquivo `.env.local` não foi lido nem alterado. B99-305 está concluído no
escopo local da barra de comprimento; secret manager/rotação, provider/CI,
RC/proveniência, WebKit aprovado, runtime live, clínica, `0/145`, gates
externos, aprovação humana e reauditoria independente permanecem abertos. O
commit de código/teste é `593619e` e esta evidência foi publicada em
`aebe16a`. O programa permanece `IN_PROGRESS / PILOT_BLOCKED`.

## Round 17 — B99-106 / diagnostics, authorization and invitation URL — 2026-08-20T10:53:52-03:00

### RED → GREEN

- RED reproduziu o catálogo canônico declarando `/health/dependencies` como
  público embora o handler exigisse capability interna ou credencial de scrape;
  também reproduziu convite administrativo com token em query;
- GREEN alinhou o catálogo a `VIEW_INTERNAL_AUDIT`/`INTERNAL`/`audit`, passou
  links para `/invite#token=...`, restringiu a leitura ao fragmento e sanitizou
  tokens do fragmento e de query legada no `replaceState`;
- os testes existentes do handler preservaram negativos 401/403/503 e o foco
  de contrato/modelo/estado/view/health passou `22/22`;
- Playwright sintético Chromium passou `3/3` na porta isolada `3213`, incluindo
  link em fragmento, ativação e remoção do token da URL.

### VERIFICAÇÃO TRANSVERSAL

- `pnpm test:coverage`: `202` arquivos, `1.060` testes, `17` arquivos e `21`
  testes guardados; `95,05%` statements, `91,06%` branches, `95,31%`
  functions e `95,75%` lines;
- typecheck, lint, formato, diff-check, migrations `33/33`, decisões críticas
  `7/7`, mutation dirigida `7/7`, documentation, traceability, Dual99,
  risk-matrix, skip-governance, architecture e public-boundary passaram;
- o teste de hotspots recebeu timeout explícito de `30s` para o scan AST sob
  instrumentação; nenhum critério de classificação foi relaxado.

### LIMITES

O E2E usou mocks sintéticos e a API em `3101` estava indisponível, logo não é
prova de HA/API/DB ativo. O runtime PostgreSQL observado continua stale em
relação ao worktree; `verify:secrets` permanece fail-closed somente nos quatro
valores redigidos do `infra/production/.env.local` ignorado. Não houve dado
real, alteração live, score, release ou promoção clínica; gates externos,
clínicos, RC e reauditoria independente continuam abertos.

### PUBLICAÇÃO

Código, testes e evidência desta rodada foram publicados no commit
`4e4cd4e04718ca26c0cd1979152225301fbd249a` em
`origin/agent/publish-production-hardening`. O diretório `.gauntlet/` continua
local e não versionado.

## Round 18 — B99-107 / rate limit, headers and CORS boundary — 2026-08-20T11:21:39-03:00

### RED → GREEN

- RED confirmou que `/health/dependencies` permanecia fora do rate limit,
  que a API direta não devolvia os headers de defesa já exigidos na borda e que
  `allowedOrigins` podia ser alterado pelo chamador depois da construção do
  servidor;
- GREEN limitou somente liveness/readiness como health probes não metrados,
  manteve diagnóstico interno com `429`/`Retry-After`, aplicou os headers
  `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`, COOP, CORP e CSP às respostas da API e congelou uma
  cópia da política de origens. Não foi introduzido CORS permissivo: mutações
  com cookie continuam deny-by-default para origem não autorizada;
- os testes novos cobrem headers, abuso repetido e mutação da configuração;
  foco API passou `24/24`, regressão API `12/118` e E2E sintético Chromium
  passou `3/3` na porta isolada `3214`.

### VERIFICAÇÃO TRANSVERSAL

- `pnpm test:coverage`: `202` arquivos, `1.062` testes, `17` arquivos e `21`
  testes guardados; `95,05%` statements, `91,06%` branches, `95,31%`
  functions e `95,75%` lines;
- typecheck, lint, formato, build `12/12`, `pnpm audit --audit-level=high`,
  edge security estático (`7` diretivas), migrations `33/33`, decisões `7/7`,
  mutation `7/7`, documentation, traceability, Dual99, risk matrix,
  skip-governance `20/20`, architecture, hotspots, public-boundary e
  `git diff --check` passaram;
- Playwright administrativo sintético Chromium `3/3` passou em `3214`.
- publicação: implementação e testes desta rodada estão no commit
  `6e4dc60def99a83143a70f06e95ab2db33fff123` enviado para
  `origin/agent/publish-production-hardening`.

### LIMITES / STATUS

O secret scan fail-closed acusa apenas os quatro valores redigidos de
`infra/production/.env.local`, que não foi lido nem alterado. A rodada não
executou live HA/API/DB, migration 0032, role restrita, RC, score, release,
promoção clínica ou reauditoria independente. B99-107 está pronto localmente,
mas permanece `READY_FOR_NEXT_STEP`; o programa permanece
`IN_PROGRESS / PILOT_BLOCKED`.

## Round 19 — B99-201 / outbox lease fencing and bounded cleanup — 2026-08-20T11:59:51-03:00

### RED → GREEN

- RED reproduziu ACK contado como processado mesmo quando a lease fence
  recusava a mutação, a assinatura de `markProcessed` não carregava a tentativa
  reclamada e não existia cleanup bounded no adapter SQL;
- GREEN passou tentativa + lease vigente no `UPDATE` de ACK/retry, retornou
  booleano de linhas afetadas, fez o worker usar o relógio atual no ACK/falha e
  adicionou cleanup terminal por lote com `FOR UPDATE SKIP LOCKED`; cleanup não
  toca eventos `PENDING`/`PROCESSING` ou leases ativas;
- a prova de integração PostgreSQL agora inclui cleanup real e rejeição de ACK
  de uma lease antiga depois do reclaim; poison/retry/DLQ existentes foram
  preservados e os focos passaram `2/19`.

### VERIFICAÇÃO TRANSVERSAL

- foco worker/persistência passou `38` arquivos / `246` testes; o teste
  PostgreSQL real ficou com `3` testes guardados por ausência de
  `CVG_RUN_LIVE_DB_TESTS` + `CVG_TEST_DATABASE_URL` autorizados;
- `pnpm test:coverage` passou `202` arquivos / `1.067` testes / `17` arquivos
  e `21` testes guardados, com `95,03%` statements, `90,99%` branches, `95,32%`
  functions e `95,71%` lines;
- typecheck, lint, formato, `git diff --check`, build `12/12`, decisões `7/7`,
  mutation dirigida `7/7`, migrations `33/33`, audit de dependências, edge
  security, documentação, traceability, Dual99, risk matrix, skips `20/20`,
  architecture, hotspots, public-boundary e Playwright sintético Chromium
  `3/3` em `3215` passaram.

### LIMITES / PUBLICAÇÃO / STATUS

`pnpm verify:secrets` falha fechado somente nos quatro valores redigidos de
`infra/production/.env.local`, que não foi lido nem alterado. A prova
PostgreSQL live, permissões/SQL fault, HA/API/DB ativo, RC, score, release,
promoção clínica e reauditoria independente permanecem sem evidência. O código
foi publicado no commit `388db21d262eb10bbaebcaae25559997c04556ca` em
`origin/agent/publish-production-hardening`; B99-201 está
`READY_FOR_NEXT_STEP` localmente e o programa permanece
`IN_PROGRESS / PILOT_BLOCKED`.

## Round 20 — B99-202 / readiness recovery after dependency loss — 2026-08-20T12:09:09-03:00

### CARACTERIZAÇÃO TDD

- foi adicionada uma caracterização de recuperação que força a segunda
  verificação de dependência a falhar e confirma que nenhum batch é processado
  durante a janela fechada;
- após o ciclo de espera, o worker precisa executar novamente dependency health
  e claim→ACK antes de processar, preservando heartbeat, estado fail-closed e
  fechamento durante a indisponibilidade;
- a topologia declarativa mantém `worker-a` e `worker-b` com healthcheck de
  `/health/ready`, e `pnpm ops:verify-ha` confirmou as duas réplicas.

### VERIFICAÇÃO TRANSVERSAL

- `pnpm test:worker` passou `50/50`; health/main/active-HA focais passaram
  `28/28`;
- `pnpm test:coverage` passou `202` arquivos / `1.068` testes / `17` arquivos
  e `21` testes guardados, com `95,03%` statements, `90,99%` branches, `95,32%`
  functions e `95,71%` lines;
- build `12/12`, typecheck, lint, formato, `git diff --check`, topologia HA,
  documentation, traceability, Dual99, risk, skips, architecture, hotspots,
  public-boundary, edge security, dependency audit e gates críticos da rodada
  anterior permaneceram verdes.

### LIMITES / PUBLICAÇÃO / STATUS

Esta é evidência local/sintética de recuperação; não executa probes consecutivos
nos dois workers contra runtime HA/API/DB ativo. `verify:secrets` continua
fail-closed somente nos quatro valores redigidos de
`infra/production/.env.local`. O teste foi publicado em
`8f40c41ca090e26fe1ccb7e87e409c1cde8cd7b7`; B99-202 está
`READY_FOR_NEXT_STEP` localmente e o programa permanece
`IN_PROGRESS / PILOT_BLOCKED`.

## Round 21 — B99-203 / Prometheus rules, targets and loss-of-signal — 2026-08-20T12:25:25-03:00

### RED → GREEN

- RED confirmou que a cobertura anterior validava somente o texto de
  `prometheus.yml`/`prometheus-alerts.yml`, sem verificar `/api/v1/rules`, a
  saúde dos targets, o destino Alertmanager ou o watchdog;
- GREEN adicionou `scripts/verify-prometheus-runtime.mjs`, com execução opt-in
  e somente leitura, e `scripts/verify-prometheus-rules.mjs`, com `promtool`
  pinado em `prom/prometheus:v2.55.1`;
- `infra/observability/prometheus-alerts.test.yml` prova semanticamente API e
  worker down, API e worker absent e Alertmanager desconectado sem parar,
  recarregar ou injetar falha no HA ativo.

### VERIFICAÇÃO TRANSVERSAL

- `pnpm ops:verify-prometheus-rules`: sintaxe `SUCCESS: 14 rules found` e
  semântica `SUCCESS` nos cinco cenários;
- `CVG_VERIFY_PROMETHEUS_RUNTIME=true CVG_PROMETHEUS_RUNTIME_URL=<runtime>
  pnpm ops:verify-prometheus-runtime`: `14/14` rules `health=ok`, `cvg-api`
  `2/2`, `cvg-worker` `2/2`, `alertmanager` `1/1`, um Alertmanager ativo,
  watchdog `firing` e `errors=[]`;
- os hashes dos dois arquivos montados no Prometheus coincidiram com os hashes
  do worktree; o foco de integração passou `4/4`, coverage passou `203/1072/21`
  com `95,03%` statements, `90,99%` branches, `95,32%` functions e `95,71%`
  lines;
- build `12/12`, typecheck, lint, formato, contrato CI, governança de
  observabilidade, topologia HA e gates documentais/estruturais da rodada
  passaram.

### LIMITES / PUBLICAÇÃO / STATUS

O snapshot live é saudável, portanto down/absent permanecem inativos nele; o
firing foi comprovado no teste semântico. Notify→ack→resolve externo, dead-man
externo, PostgreSQL live, RC/proveniência, secret manager, clínica, `0/145` e
reauditoria independente continuam sem evidência autorizada. B99-203 está
`READY_FOR_NEXT_STEP` localmente; o programa permanece `IN_PROGRESS /
PILOT_BLOCKED`. Código e testes foram publicados no commit `e913d23` em
`origin/agent/publish-production-hardening`.

## Checkpoint corrente — 2026-08-20T12:25:25-03:00

| Evidência | Resultado |
|---|---|
| cobertura oficial | `203` arquivos aprovados / `17` guardados; `1.072` testes aprovados / `21` guardados; `95,03%` statements, `90,99%` branches, `95,32%` functions, `95,71%` lines |
| gates técnicos | format, lint, typecheck, decisões críticas `7/7`, dependency audit, CI contract, Prometheus semantic rules e diff-check verdes |
| hotspots | `PASS_WITH_DEBT_RATCHET`, `113` funções >50 linhas, maior `76`, zero hotspot não classificado |
| scanner | focal `17/17`; execução integral falha somente nas quatro atribuições redigidas de `infra/production/.env.local` |
| mutation crítica | `7/7 killed`, `0` sobreviventes, score `100%` / mínimo `90%` |
| build/E2E | build `12/12`; E2E administrativo/convite sintético em porta alternativa `3215`, Chromium `3/3` |
| observabilidade runtime | `14/14` rules `health=ok`; API `2/2`, worker `2/2`, Alertmanager `1/1`, destino ativo e watchdog `firing`; hashes dos arquivos montados coincidentes |
| loss-of-signal | `promtool` `SUCCESS` em API/worker down, API/worker absent e Alertmanager desconectado; sem fault injection no HA ativo |
| governança Dual99 | `PASS_WITH_GAPS`, `eligibleForIndependentReaudit=false`, `PILOT_BLOCKED`; traceabilidade `0/145` cadeias, `145` evidências locais; skips `20/20` runs, `0` flaky, `17` arquivos guardados |

## Round 16 — B99-105 / schema contract and runtime boundary — 2026-08-20T10:32:23-03:00

- a revisão final corrigiu o default `CURRENT_TIMESTAMP + interval '24 hours'`
  no schema Drizzle de authoring, alinhando o contrato TypeScript à migration
  `0032`;
- `pnpm test:coverage` fresco passou `202` arquivos / `1.060` testes / `17`
  arquivos e `21` testes guardados, com `95,06%` statements, `91,06%`
  branches, `95,31%` functions e `95,76%` lines; typecheck, lint, formato,
  migrations `33/33` e diff-check passaram;
- após a correção do diff final, o comando foi repetido no worktree exato e
  retornou os mesmos números;
- o probe read-only no PostgreSQL HA ativo retornou migration count `30`,
  `cvg_admin` com `SUPERUSER/BYPASSRLS` e authoring idempotency sem RLS; isto
  confirma runtime stale, não prova live do RC B99-105;
- não houve alteração de migration aplicada, dados, role, container, score,
  release, commit ou push. Permanecem pendentes role restrita, migration sobre
  legado, same-key, TTL/RLS live e gates externos.

As refatorações alteraram apenas a decomposição, mantendo contratos, decisões
críticas e projeções imutáveis. O E2E permanece sintético: os avisos de proxy
para `127.0.0.1:3101` não constituem evidência de API/DB/HA real.

## Verificações reproduzidas

| Comando | Resultado |
|---|---|
| `pnpm test:coverage` (checkpoint anterior) | `197` arquivos passantes, `974` testes passantes, `17` arquivos/`21` testes guardados; `90,42%` statements, `85,38%` branches, `93,65%` functions, `91,78%` lines |
| `pnpm lint` / `pnpm typecheck` / `pnpm format:check` | PASS |
| `pnpm verify:critical-decisions` | PASS, `7/7` decisões críticas em `100%` de branches |
| `pnpm verify:dual99-program` | PASS_WITH_GAPS estrutural; `eligibleForIndependentReaudit=false` |
| `pnpm verify:documentation` | PASS |
| `pnpm verify:traceability` / `pnpm verify:premium-traceability` | PASS estrutural / `PASS_WITH_GAPS`, `0/145` cadeias completas |
| `pnpm verify:skip-governance` | PASS, `17` arquivos/`21` testes guardados, `20/20` runs observadas, `0` flaky |
| `pnpm verify` | FAIL fechado em `verify:secrets`; todas as etapas anteriores do encadeamento passaram, e o scanner acusa somente `infra/production/.env.local` |
| `pnpm verify:hotspots` | PASS_WITH_DEBT_RATCHET, limite atual preservado |
| `CVG_API_INTERNAL_URL=http://127.0.0.1:3182 pnpm build` | PASS, `12/12` workspaces |
| `CVG_E2E_WEB_PORT=3112 CVG_E2E_BROWSERS=chromium CVG_API_INTERNAL_URL=http://127.0.0.1:3182 pnpm test:e2e` | PASS, build `12/12` e `27/27` Chromium sintéticos |
| `pnpm test:e2e:active-ha` | FAIL controlado: fixture isolado iniciou e foi removido; runtime web não alcançou prontidão em `127.0.0.1:3100` |

## Round 12 — B99-101 / RHS expression hardening — 2026-08-20T08:35:37-03:00

- RED reproduziu literais hardcoded não detectados depois de fallback, chamada,
  concatenação e array em uma atribuição sensível; a mesma rodada identificou
  falsos positivos em comparações, campos adjacentes e concatenações sintéticas
  de blobs históricos;
- GREEN passou `17/17` no scanner focal, cobrindo os quatro formatos adversariais
  e a tolerância estreita de combinações sintéticas delimitadas em fixtures;
- `pnpm verify:secrets` agora falha somente nas quatro atribuições redigidas de
  `infra/production/.env.local`; o scanner não encontrou achados adicionais no
  worktree, index ou histórico alcançável;
- `pnpm test:coverage` passou `200` arquivos / `1.049` testes / `17` arquivos e
  `21` testes guardados, com cobertura `95,06%` / `91,06%` / `95,35%` /
  `95,77%` (statements / branches / functions / lines);
- decisões críticas `7/7`, mutation direcionada `7/7`, documentação, Dual99,
  rastreabilidade, skips `20/20`, hotspots, lint, typecheck e diff-check
  passaram. A resolução do `.env.local` continua dependente de secret manager,
  rotação e autorização; nenhum score ou release foi promovido.

## Round 13 — B99-103 / session revocation atomicity — 2026-08-20T08:55:50-03:00

- RED reproduziu que `revokeAll` não tinha uma transação observável envolvendo
  o avanço de `accounts.session_generation` e a revogação das linhas de
  `sessions`;
- GREEN colocou as duas atualizações no mesmo `db.transaction`, mantendo
  predicados de generation, SQL parametrizado, contagem retornada e validação
  fail-closed; o focal de persistência passou `8/8`;
- `pnpm test:coverage` teve um primeiro timeout de `5s` no teste existente de
  hotspots sob instrumentação; o foco isolado passou `3/3` e a repetição
  integral passou `200` arquivos / `1.050` testes / `21` guardados, com floors
  `95,06%` statements / `91,06%` branches / `95,35%` functions / `95,77%`
  lines;
- lint, typecheck, formato, audit, documentação, Dual99, rastreabilidade,
  skips `20/20`, decisões críticas `7/7`, mutation dirigida `7/7`, hotspots e
  diff-check passaram. `verify:secrets` permanece fail-closed somente nos
  quatro valores redigidos de `infra/production/.env.local`;
- limite: a concorrência PostgreSQL, generation, TTL, logout e replay seguem
  sem execução por falta de ambiente live autorizado; B99-103 continua
  `IN_PROGRESS` e o release `PILOT_BLOCKED`.

## Round 15 — B99-105 / idempotency integrity — 2026-08-20T10:19:27-03:00

- RED reproduziu a chave HTTP abaixo do piso, a ausência da migration 0032,
  adapters com `Date.now()`/sem lock same-key e cleanup incompatível com as
  policies RLS existentes;
- GREEN centralizou `assertIdempotencyKey` e
  `pg_advisory_xact_lock`, moveu leitura/TTL/cleanup para o relógio PostgreSQL,
  retirou `expiresAt` calculado da aplicação e adicionou conflito concorrente
  explícito na correção;
- `0032_idempotency_integrity_closure.sql` fecha constraints de operação,
  chave, fingerprint e expiry; torna `response_hash` não nulo/SHA-256; falha
  explicitamente diante de legado; força RLS, revoga `PUBLIC` e cria delete
  policies com contexto de participante/escopo;
- focais passaram `112/112`; coverage passou `202/1060/21` com floors
  `95,06/91,06/95,31/95,76`; migrations `33/33`, build `12/12`, audit,
  decisões `7/7`, mutation `7/7`, traceability, documentation, skips `20/20`,
  architecture, hotspots e diff-check passaram;
- limite: PostgreSQL live, aplicação da migration sobre legado, role restrita,
  concorrência same-key e RLS cleanup permanecem sem prova autorizada. O
  resultado segue local, sem score/release/commit/push adicional.

## Round 14 — B99-104 / current clinical identity — 2026-08-20T09:35:11-03:00

- RED reproduziu que a identidade clínica ainda era fornecida por configuração
  estática e que alguns fluxos não revalidavam o papel/estado/escopo persistidos
  no mesmo limite transacional antes da mutação;
- GREEN removeu `CLINICAL_APPROVER_ID` do schema de ambiente, composição do API,
  Compose HA, exemplo de ambiente e verificador de topologia. Handlers passam o
  principal autenticado, e application/persistence revalidam a conta corrente
  com lock, `ACTIVE`, papel `CLINICAL_APPROVER` e escopo;
- source-conflict e assessment recalculation passaram a compartilhar o executor
  transacional com contexto de escopo aplicado antes da leitura do aprovador e do
  write; correction e content withdrawal também falham fechado em suspensão,
  remoção de papel ou divergência de escopo;
- os focais de aplicação/persistência/API passaram `13` arquivos / `171`
  testes. A repetição integral passou `200` arquivos / `1.053` testes / `17`
  arquivos e `21` testes guardados, com floors `95,06%` statements /
  `91,07%` branches / `95,31%` functions / `95,75%` lines;
- build `12/12`, lint, typecheck, formato, audit, documentação, Dual99,
  traceability, skip governance `20/20`, decisões `7/7`, mutation `7/7`,
  hotspots e diff-check passaram. `verify:secrets` permanece fail-closed apenas
  nos quatro valores de `infra/production/.env.local`;
- limite: rotação/concurrency PostgreSQL live, RC/proveniência, revisão clínica,
  CI/release, reauditoria e gates externos continuam sem prova autorizada. B99-104
  permanece `IN_PROGRESS` e o release `PILOT_BLOCKED`.

## Round 22 — B99-204 / correlation, redaction, retention and alert lifecycle — 2026-08-20T12:50:47-03:00

### RED → GREEN

- RED reproduziu que o logger não carregava `traceId`, que o payload OTLP não
  carregava `requestId`/`correlationId` técnicos e que o Tempo local dependia do
  default de retenção em vez de uma configuração versionada;
- GREEN adicionou validação de trace/correlation IDs, derivação determinística
  de trace ID técnico por correlation ID, logs e spans API correlacionáveis e
  spans técnicos por evento no worker, sempre sem payload e com allowlist;
- `infra/observability/tempo.yaml` agora fixa
  `backend_worker.compaction.block_retention: 336h`; a imagem pinada passou
  `-config.verify`, e `pnpm verify` passou a executar o gate estático de traces;
- `scripts/verify-alertmanager-lifecycle.mjs` usa somente alerta/silence
  sintéticos, valida firing → acknowledgement → resolve e limpa o probe.

### VERIFICAÇÃO TRANSVERSAL

- focos de observabilidade, API, worker, governança e Alertmanager passaram
  localmente; o foco direto inicial passou `34/34` e a repetição transversal
  final passou `51/51`;
- `pnpm ops:verify-durable-traces` passou em modo estático e live: collector
  aceitou trace sintético e Tempo o devolveu pelo trace ID, sem restart;
- `CVG_VERIFY_ALERTMANAGER_LIFECYCLE=true ... pnpm ops:verify-alertmanager-lifecycle`
  passou com `firing`, `acknowledged` e `resolved` observados; consulta final
  não encontrou o alerta sintético ativo;
- `pnpm test:coverage` passou `204` arquivos, `1.077` testes e `21` testes
  guardados, com `95,00%` statements, `90,87%` branches, `95,29%`
  functions e `95,69%` lines; build com `CVG_API_INTERNAL_URL` passou
  `12/12` workspaces, e typecheck, lint, formato, hotspots, documentação,
  traceability, Dual99, mutation dirigida `7/7` e demais gates locais passaram;
- `traceId`/correlation IDs aparecem apenas como identificadores técnicos, e
  os testes confirmam que resposta clínica, payload e identificadores de
  participante não chegam ao log/OTLP.

### LIMITES / STATUS / NEXT

A retenção local declarada é Prometheus `15d` e Tempo `336h`; o container HA
ativo ainda monta a configuração/SHA anterior e não foi reiniciado. O ciclo de
acknowledgement validado é interno ao Alertmanager; notificação externa,
on-call, RBAC, retenção/acesso do fornecedor, dead-man externo, PostgreSQL live,
RC, secret manager, clínica, `0/145` e reauditoria continuam sem evidência
autorizada. B99-204 está `READY_FOR_NEXT_STEP` localmente; o programa segue
`IN_PROGRESS / PILOT_BLOCKED`.

### PUBLICAÇÃO

O código e os testes B99-204 foram commitados como
`12f93266a3d8a1f5fd4e4a5a38d55b6e01e8a7ac` (`feat: verify observability
correlation lifecycle`) e enviados para
`origin/agent/publish-production-hardening`. A publicação não promove a
evidência local para notificação externa, RBAC/retenção de fornecedor,
PostgreSQL live, RC, clínica, `0/145` ou reauditoria independente.

## Round 23 — B99-205 / readiness clock and Qdrant reconciliation — 2026-08-20T13:30:56-03:00

### RED → GREEN

- RED adicionou uma reprodução de insert atrasado: antes da correção, o
  resultado era `claimed=0`, `processed=0`, `acknowledged=false`; a execução
  operacional descartável expôs o mesmo efeito como `qdrant reconciliation
  failed` no readiness probe;
- GREEN preservou `occurredAt` antes do insert e passou a capturar `claimNow`
  depois do `insertProbe`, sem alterar payload, autorização ou estado
  educacional;
- a migração descartável PostgreSQL `33` + integração worker/Qdrant passou
  `2` arquivos e `4/4` testes: claim/lease/ack/cleanup PostgreSQL e
  divergência/orphan, replay e withdrawal no Qdrant com dados sintéticos não
  vazios;
- `pnpm reconcile:qdrant` passou duas vezes: primeira execução
  `expected=1/upserted=1/removed=0`; segunda
  `expected=1/upserted=0/removed=0`; a saída ficou limitada a contadores
  técnicos e não incluiu texto, payload ou dado de participante.

### VERIFICAÇÃO TRANSVERSAL

- foco unitário worker/reconcile passou `14/14`; cobertura passou `204`
  arquivos, `1.078` testes e `21` guardados, com floors `95,00%` statements,
  `90,87%` branches, `95,29%` functions e `95,69%` lines;
- integração descartável corrigida passou PostgreSQL worker + Qdrant live em
  `2` arquivos e `4/4` testes; build passou `12/12`, com lint, typecheck,
  formato, migrations `33/33`, decisões `7/7`, mutation crítica `7/7`,
  hotspots e diff-check verdes;
- `pnpm verify` percorreu os gates até `verify:secrets` e parou somente nos
  quatro valores redigidos de `infra/production/.env.local`; uma tentativa
  anterior de harness omitiu `DATABASE_URL` durante a migration e foi
  descartada, com a repetição explícita passando `4/4`.

### LIMITES / STATUS / NEXT

Os containers PostgreSQL/Qdrant foram temporários, usaram apenas fixtures
sintéticas e foram removidos. Isto não prova HA ativo, PostgreSQL restrito,
RLS/TTL/concurrency live, retenção/RBAC/notificação externa, secret manager,
RC/proveniência, clínica, `0/145` ou reauditoria independente. B99-205 está
`READY_FOR_NEXT_STEP` localmente; o programa permanece
`IN_PROGRESS / PILOT_BLOCKED`.

### PUBLICAÇÃO

O código e os testes foram commitados como
`43de2a2ff575c4fd9e11153a575c8dfbbb858008` (`fix: stabilize worker readiness
probe clock`) e enviados para `origin/agent/publish-production-hardening`.
Esta evidência documental segue para publicação separada e não promove
qualquer gate externo.

## Round 24 — B99-307 / migration compatibility and isolated restore — 2026-08-20T13:51:48-03:00

### RED → GREEN

- RED adicionou casos de contract incompatível e o verificador anterior
  aceitou `TRUNCATE`, `DELETE`, `SET NOT NULL` sem pré-condição e coluna
  `NOT NULL` sem `DEFAULT`;
- GREEN passou a rejeitar essas operações, aceitar somente `SET NOT NULL`
  precedido por guarda explícita de backfill/legado e expôs o comando
  `pnpm verify:migration-safety` no pipeline oficial `pnpm verify`;
- a alteração é fail-closed: a migration `0032` mantém a rejeição explícita de
  linhas legadas inválidas, em vez de transformar chaves ou snapshots de
  replay sem decisão segura.

### VERIFICAÇÃO TRANSVERSAL

- foco de governança/safety passou `2` arquivos e `8/8` testes; a cadeia
  versionada passou `33/33` (`0000`–`0032`) e o novo gate reportou
  `checkedMigrations=33`, `destructiveMigrations=0`;
- PostgreSQL descartável aplicou as `33` migrations do zero e o restore
  isolado passou `2/2`, cobrindo marcador sintético, artefato checksummed e
  invariantes de RLS/auditoria/índices;
- cobertura global passou `204` arquivos, `1.080` testes e `21` guardados, com
  floors `95,00%` statements, `90,87%` branches, `95,29%` functions e
  `95,69%` lines; build `12/12`, contratos `84/84`, worker `51/51`, decisões
  `7/7`, mutation crítica `7/7`, hotspots, lint, typecheck, formato e
  diff-check passaram;
- `pnpm verify` percorreu o novo gate e parou somente em
  `verify:secrets`, pelos quatro valores redigidos de
  `infra/production/.env.local`, que não foi lido nem alterado.

### LIMITES / STATUS / NEXT

O restore e a aplicação das migrations foram executados em container
PostgreSQL temporário com fixtures sintéticas e limpeza automática. Ainda não
há prova de rollout misto N/N-1 no RC autorizado, migração/rollback em
produção, backup externo, secret manager, CI/registry, clínica, `0/145` ou
reauditoria independente. B99-307 está `READY_FOR_NEXT_STEP` localmente; a
próxima frente local é B99-308, e o programa permanece
`IN_PROGRESS / PILOT_BLOCKED`.

### PUBLICAÇÃO

O código foi commitado como `8440f09` (`fix: harden migration compatibility
gate`) e enviado para `origin/agent/publish-production-hardening`. A publicação
não promove a prova descartável para um RC ou rollout externo.

## Round 25 — B99-308 / API contracts, authorization and negative routing — 2026-08-20T14:04:49-03:00

### RED → GREEN

- RED mostrou que `validateApiSurface` aceitava `requestContract` vazio e que
  as rotas `/api/v1/session/revoke` e `/api/v1/session/rotate`, embora
  catalogadas como `SESSION`, não passavam por `requirePrincipal`;
- a primeira prova de despacho foi ajustada para chamar `handleApiRequest`, a
  fronteira HTTP que normaliza `ApplicationError`; o dispatcher interno não
  foi duplicado com tratamento de erro;
- GREEN validou request contract, handler group e compatibilidade auth/escopo,
  e fechou a autenticação das duas rotas de sessão;
- o inventário executável agora percorre todas as `57/57` rotas por caminho
  materializado e garante que nenhuma cai em `404`, que protegidas sem
  principal retornam `401/403`, que as duas entradas públicas com corpo nulo
  retornam `422/422`, que a telemetria resolve cada template e que método
  `DELETE`/variantes de caminho com barra final não são aceitos.

### VERIFICAÇÃO

- foco de contrato: `4/4` testes;
- foco de inventário/rotas: `5/5` testes;
- regressão API: `60/60` testes;
- `pnpm test:coverage`: `204` arquivos passaram, `17` guardados; `1.083`
  testes passaram, `21` guardados; `95,01%` statements, `90,89%` branches,
  `95,29%` functions e `95,70%` lines;
- `pnpm test:contract`: `28` arquivos / `84/84` testes;
- build: `12/12` workspaces; typecheck, lint, Prettier, CI contract,
  critical decisions `7/7`, critical mutation `7/7`, scope drift, hotspots e
  `git diff --check`: PASS.
- `pnpm verify` oficial repetiu os gates até migration safety — cobertura,
  contratos `84/84`, worker `51/51`, migrations `33/33`, decisões `7/7` e
  mutation `7/7` — e parou fail-closed em `verify:secrets` nos quatro valores
  redigidos de `infra/production/.env.local`.

### LIMITES / STATUS / NEXT

O negativo é determinístico e cobre variações de método/caminho e entrada
inválida; não foi inventada prova de fuzz property-based. Não houve execução
contra HA/API/DB ativo, RC imutável, secret manager, rollout N/N-1, clínica,
`0/145`, gates externos ou reauditoria independente. `verify:secrets` continua
fail-closed nos quatro valores redigidos de `infra/production/.env.local`, que
não foi lido nem alterado. B99-308 está `READY_FOR_NEXT_STEP` localmente e o
programa permanece `IN_PROGRESS / PILOT_BLOCKED`.

### PUBLICAÇÃO

O código foi commitado como `31fed87` (`fix: harden API route contracts and
authz`) e enviado para `origin/agent/publish-production-hardening`. A
publicação não promove evidência local para RC, produção, score, piloto,
clínica ou reauditoria.

## Round 26 — B99-305 / critical hotspot decomposition — 2026-08-20T14:28:58-03:00

### RED → GREEN

- RED encontrou `startAttempt` e `submitAttempt` com 76 linhas e, após a
  primeira decomposição, `dependencyResponse` com 75 linhas;
- GREEN separou as etapas transacionais de tentativa e as funções de
  autorização, projeção/cache e carregamento de dependências;
- a primeira versão do cache quebrou a garantia de coalescimento e fez o foco
  chamar `dependencyStatus` duas vezes; a correção restaurou a escrita síncrona
  de `inFlight` antes do primeiro `await`;
- o teste de política agora verifica que os três hotspots críticos permanecem
  em até 50 linhas.

### VERIFICAÇÃO

- foco de política: `5/5`;
- regressão health: `10/10`; regressão relacionada API/servidor/tentativa:
  `97/97`;
- cobertura: `204` arquivos, `1.085` testes passantes, `17` arquivos e `21`
  testes guardados; `95,02%` statements, `90,92%` branches, `95,31%` functions
  e `95,70%` lines;
- build: `12/12`; contratos `84/84`; worker `51/51`; decisões críticas
  `7/7`; mutation crítica `7/7`; arquitetura, lint, typecheck, formato,
  hotspots e `git diff --check`: PASS;
- hotspot scan: `0` acima do limite, `111` funções longas e máximo `75`;
  nenhuma das três funções críticas excede `50` linhas;
- `pnpm verify` oficial percorreu formato, CI contract, fontes clínicas,
  inventário, observabilidade, topologia HA, regras Prometheus, traces, lint,
  typecheck, cobertura `204/1085/21`, decisões `7/7`, mutation `7/7`, scope
  drift, contratos `84/84`, worker `51/51`, migrations `33/33` e migration
  safety; parou fail-closed em `verify:secrets` com quatro atribuições
  redigidas de `infra/production/.env.local`, que não foi lido nem alterado;
- código publicado em `90f0a21` na branch
  `agent/publish-production-hardening`.

### LIMITES / STATUS / NEXT

Esta é uma prova local e determinística de complexidade e comportamento; não
prova Playwright/WebKit/HA/API/DB ativo, RC imutável, rollout N/N-1, secret
manager, clínica, `0/145`, gates externos ou reauditoria independente. B99-305
está `READY_FOR_NEXT_STEP` localmente; o programa permanece
`IN_PROGRESS / PILOT_BLOCKED`.

## Round 27 — B99-306 / active browser matrix and fixture isolation — 2026-08-20T14:56:53-03:00

### RED → GREEN

- RED com `BASE_URL=http://127.0.0.1:3180` reproduziu o redirect HTTP→TLS e
  erros de certificado nos browsers Chromium/Firefox/mobile; WebKit não
  iniciou por `libavif16` ausente no host;
- com a base web local correta (`3100`), o browser ainda não hidratava porque
  o serviço web iniciado antes do build servia HTML novo com o chunk
  `2fpl2raujli5f.js` em `404`. O diagnóstico Playwright observou
  `pageerror`, ausência de `POST /auth/login` e submit HTML nativo que levaria
  credenciais à query string;
- após reiniciar somente o serviço web local para alinhar processo e artefato,
  o fluxo passou a enviar `POST /auth/login` `200` sem query string;
- a primeira matriz conjunta revelou compartilhamento indevido da mesma
  fixture entre projetos: revogação do fluxo admin interferia no participante
  e o caso M24 avançava entre browsers. O RED TDD adicionou dois testes
  quebrados para exigir browsers únicos e argumento `--project` isolado;
- GREEN passou a resolver a matriz suportada, executar um projeto Playwright
  por vez e recriar a fixture PostgreSQL sintética antes de cada browser;
  não houve alteração da API de produção ou relaxamento das asserções.

### VERIFICAÇÃO

- foco do orquestrador: `9/9` testes;
- cobertura global: `204` arquivos, `1.087` testes passantes e `21` guardados;
  `95,02%` statements, `90,92%` branches, `95,31%` functions e `95,70%`
  lines;
- E2E ativo contra o web proxy `3100`, API/edge/HA e PostgreSQL real local:
  Chromium `3/3`, Firefox `3/3` e mobile Chromium `3/3`, com criação e
  teardown da fixture por browser confirmados;
- WebKit foi executado separadamente: `3` testes bloqueados antes do launch
  pela dependência ambiental `libavif16`; o teardown da fixture passou;
- lint, typecheck, Prettier e `git diff --check`: PASS;
- código/testes publicados em `b0fcbe8`
  (`fix: isolate active HA browser fixtures`) e enviados para
  `origin/agent/publish-production-hardening`.

### LIMITES / STATUS / NEXT

O resultado fecha a matriz local executável, mas não fecha o requisito de
WebKit em ambiente aprovado. O serviço web local foi reiniciado para
reconciliar um artefato `.next` reconstruído com processo antigo; isso não é
prova de rollout atômico, RC imutável, SHA do runtime API, CI/registry,
secret manager, produção, clínica, `0/145`, gates externos ou reauditoria
independente. O `pnpm verify` anterior continua fail-closed nos quatro valores
redigidos de `infra/production/.env.local`, que não foi lido nem alterado.
B99-306 permanece `BLOCKED` até ambiente WebKit aprovado; o programa segue
`IN_PROGRESS / PILOT_BLOCKED`.

## Round 28 — B99-306 / WebKit em container pinado e launch cross-browser — 2026-08-20T15:29:24-03:00

### RED → GREEN

- RED no container pinado `mcr.microsoft.com/playwright:v1.55.1-noble`
  (`sha256:2f29369043d81d6d69a815ceb80760f55e85f5020371ad06a4d996f18503ad1c`)
  reproduziu que os argumentos Chromium-only `--headless=new`, `--disable-gpu`
  e `--disable-software-rasterizer` eram enviados também ao WebKit; os três
  testes falharam antes do launch com `Unknown option --disable-gpu`;
- após separar os argumentos por projeto, o WebKit chegou ao app HTTP, mas o
  cookie de sessão `Secure` não foi persistido. O diagnóstico registrou apenas
  paths/status e confirmou `Set-Cookie` com `Secure` e cookie jar vazio; nenhum
  segredo, credencial ou payload foi registrado;
- com proxy TLS local descartável Caddy em `https://localhost:3210`, o primeiro
  POST foi corretamente rejeitado `403` pelo CSRF porque o HA local autorizava
  somente origens HTTP. A execução foi repetida com a origem HTTPS adicionada
  somente ao override temporário do ambiente HA; o CSRF permaneceu deny-by-default;
- GREEN passou a escopar launch flags somente a Chromium/mobile Chromium e a
  aceitar certificados locais apenas quando
  `CVG_E2E_IGNORE_HTTPS_ERRORS=true`. A configuração não altera cookies,
  CSRF, API, edge ou runtime de produção.

### VERIFICAÇÃO

- foco de configuração/orquestração: `16/16` testes;
- cobertura global: `204` arquivos, `1.089` testes passantes e `21` guardados;
  `95,02%` statements, `90,92%` branches, `95,31%` functions e `95,70%`
  lines;
- E2E ativo contra o web proxy `3100`, API/edge/HA e PostgreSQL sintético real
  local: Chromium `3/3`, Firefox `3/3` e mobile Chromium `3/3`, cada um com
  fixture nova e teardown confirmado;
- WebKit ativo no container pinado, via HTTPS local e API/DB HA, passou `3/3`
  incluindo health, atividade persistida e ciclo administrativo; a matriz
  executada nesta rodada soma `12/12` casos ativos;
- lint, typecheck, Prettier, `verify:hotspots` e `git diff --check`: PASS;
- `pnpm verify` percorreu formato, CI contract, fontes clínicas, inventário,
  observabilidade, HA, Prometheus, traces, lint, typecheck, coverage, decisões
  `7/7`, mutation `7/7`, scope drift, contratos `84/84`, worker `51/51`,
  migrations `33/33` e migration safety; parou fail-closed em
  `verify:secrets` pelos quatro achados redigidos de
  `infra/production/.env.local`, sem ler ou alterar o arquivo;
- código/testes publicados em `9959e44`
  (`fix: harden cross-browser E2E launch`) em
  `origin/agent/publish-production-hardening`.

### LIMITES / STATUS / NEXT

O host continua sem `libavif16`; portanto a execução WebKit dependeu do
ambiente containerizado pinado e ainda não é prova de ambiente aprovado, RC
imutável ou release. A origem HTTPS foi adicionada apenas em containers HA
descartáveis e removida ao final; a configuração de produção não foi alterada.
O runtime API observado continua com proveniência/SHA antigo e o
`verify:secrets` permanece fail-closed nos quatro valores redigidos de
`infra/production/.env.local`, que não foi lido nem alterado. B99-306 continua
`BLOCKED` até execução em ambiente WebKit aprovado no mesmo RC; o programa
segue `IN_PROGRESS / PILOT_BLOCKED`.

## Round 29 — B99-308 / bounded API-surface fuzz hardening — 2026-08-20T15:52:02-03:00

### RED → GREEN

- RED criou um corpus determinístico de mutações sintéticas sobre oito rotas e
  entradas primitivas/estruturais inválidas; `validateApiSurface` lançava
  `TypeError` para descritores incompletos e `findApiSurfaceRoute` lançava para
  `path` não-string;
- GREEN fez o contrato falhar fechado: descritores inválidos agora produzem
  erros de validação, inventário não-array é rejeitado e lookup com método/path
  malformados retorna `null`;
- a validação foi extraída para
  `packages/contracts/src/api-surface-validation.ts`, mantendo
  `packages/contracts/src/api-surface.ts` em `706` linhas e evitando criar um
  novo hotspot acima do limite de `800` linhas;
- o escopo não adiciona dependência de fuzz, aleatoriedade não reprodutível,
  alteração de política de autorização, rota, runtime, segredo, dado clínico ou
  ambiente externo.

### VERIFICAÇÃO

- RED focal: `2` testes falhando (`TypeError` em descriptor/lookup);
- GREEN focal: `6/6`; regressão de inventário ativo: `11/11`; contratos:
  `86/86`; arquitetura: `2/2`; CI contract e scope drift: `PASS`;
- cobertura ampla: `204` arquivos, `1.091` testes passantes, `17` arquivos e
  `21` testes guardados; `95,02%` statements, `90,95%` branches, `95,31%`
  functions e `95,71%` lines;
- build dos `12/12` workspaces, typecheck, lint, Prettier, `verify:hotspots`
  (`0` hotspots) e `git diff --check`: PASS;
- a primeira cobertura ampla encontrou corretamente o arquivo novo como
  hotspot não classificado; a extração da validação foi aplicada e a repetição
  fechou o gate sem adicionar dívida de hotspot;
- revisão read-only da mudança confirmou que rotas válidas preservam o
  comportamento anterior, entradas malformadas não escapam como exceção e o
  módulo não introduz import runtime circular;
- código/testes foram commitados em `7c46ad3`
  (`fix: harden API surface malformed input handling`);
- evidence pack, estado, backlog, roadmap, log e traceability foram publicados
  em `a4840eb` (`docs: record b99-308 bounded API fuzz evidence`);
- `pnpm verify` no worktree final passou formato, CI contract, fontes clínicas,
  inventário, observabilidade, configuração HA, Prometheus, traces, lint,
  typecheck, cobertura `204/1091/21`, decisões `7/7`, mutation `7/7`, scope
  drift, contratos `86/86`, worker `51/51`, migrations `33/33` e migration
  safety; parou fail-closed em `verify:secrets` pelos quatro valores redigidos
  de `infra/production/.env.local`, sem ler ou alterar o arquivo.

### LIMITES / STATUS / NEXT

Esta rodada fecha somente a lacuna local de fuzz bounded do B99-308. Não prova
fuzz property-based não determinístico, HA/API/DB ativo, WebKit em ambiente
aprovado, RC imutável, runtime com SHA, secret manager, clínica, `0/145`, gates
externos ou reauditoria independente. O `pnpm verify` final permanece
fail-closed nos quatro valores redigidos de `infra/production/.env.local`, que
não foi lido nem alterado. Próxima ação: revisar o diff e publicar o lote;
programa `IN_PROGRESS / PILOT_BLOCKED`.

## Auditoria read-only pós-Round 46 — 2026-08-20T21:47:42-03:00

No snapshot da auditoria, o Round 46 estava publicado e `HEAD == origin` em
`6ddc37b`; o pacote documental que registrou essa observação foi publicado
depois em `2af57e6`. A auditoria read-only de fonte repetiu o foco `39/39` e
`verify:hotspots = 0`, e verificou que `readGitBlobs` passa caps finitos tanto
para `cat-file --batch-check` quanto para batches corporais. O helper ainda
aceita que um chamador interno substitua deliberadamente limites por
`Infinity`, mas esse override não é usado pela composição do scanner; o
default agora é finito e não há novo gap local de produção justificável.

Nenhum arquivo de produção, `.env.local`, runtime ou ambiente externo foi
alterado. Permanecem bloqueios de secret manager/rotação, provider/CI,
RC/proveniência, runtime live, WebKit aprovado, clínica, `0/145`, gates
externos, aprovação humana e reauditoria independente. A disposição permanece
`IN_PROGRESS / PILOT_BLOCKED`.

## Round 46 — B99-101 / finite default Git batch stdout cap — 2026-08-20T21:41:55-03:00

Uma auditoria read-only fresca encontrou que os callsites de produção já
passavam caps explícitos, mas o fallback genérico de `runGitBatch` ainda usava
`maxOutputBytes = Infinity`, permitindo acumular chunks se um chamador omitisse
o limite. O RED adicionou um subprocesso sintético que excede o default e
falhou ao observar a resolução de um Buffer completo.

O GREEN adotou cap default finito de `8 MiB`, mantendo caps explícitos
preflightados para `cat-file --batch-check` e batches corporais conhecidos. O
overflow continua fail-closed antes de inserir o chunk em `chunks`, e o
contrato de stdout incremental do Round 44 e stderr redigido do Round 45
permanece intacto.

O foco passou `39/39`; a cobertura passou `205/1133/21` em
`95,02/90,95/95,31/95,71`, o scanner ficou em `774` linhas, o helper em `415`
linhas e `verify:hotspots` em `0` hotspots não classificados. Formato, lint,
typecheck e `git diff --check` passaram. O `pnpm verify` oficial passou
coverage, decisões críticas `7/7`, mutation `7/7`, scope drift, contratos
`86/86`, worker `51/51`, migrações `33/33` e migration safety; parou
fail-closed em `verify:secrets` somente nos quatro assignments redigidos
preexistentes de `infra/production/.env.local`, que não foi lido nem alterado.

O código/teste está em `a6d7ce3` (`fix: bound default git batch stdout`) e foi
enviado para `origin/agent/publish-production-hardening`; esta evidência foi
publicada em `630509f` (`docs: record finite git batch stdout default`). Secret
manager/rotação, provider/CI, RC/proveniência, runtime live, WebKit aprovado,
clínica, `0/145`, gates externos e reauditoria independente continuam abertos.
B99-101 e o programa permanecem `IN_PROGRESS / PILOT_BLOCKED`.

## Round 45 — B99-101 / bounded and redacted Git batch stderr — 2026-08-20T21:25:32-03:00

Uma auditoria read-only fresca encontrou o limite residual do Round 44:
`runGitBatch` já consumia stdout de forma incremental, mas ainda acumulava
todos os chunks de stderr e os devolvia como mensagem de erro quando Git saía
com código diferente de zero. O RED adicionou um subprocesso sintético ruidoso
e um erro Git normal; os dois contratos falharam antes da implementação.

O GREEN adicionou limite independente padrão de `4 KiB` para stderr, encerra o
processo em overflow e usa somente mensagens genéricas redigidas para falhas
não-zero, sem reter ou expor o conteúdo bruto. A injeção de processo existe
somente para testar o boundary; o caminho de produção continua usando `spawn`
real. O foco de histórico Round 44 permaneceu intacto.

O foco passou `38/38`; a cobertura passou `205/1132/21` em
`95,02/90,95/95,31/95,71`, o scanner ficou em `774` linhas, o helper em `414`
linhas e `verify:hotspots` em `0` hotspots não classificados. Formato, lint,
typecheck e `git diff --check` passaram. O `pnpm verify` oficial passou
coverage, decisões críticas `7/7`, mutation `7/7`, scope drift, contratos
`86/86`, worker `51/51`, migrações `33/33` e migration safety; parou
fail-closed em `verify:secrets` somente nos quatro assignments redigidos
preexistentes de `infra/production/.env.local`, que não foi lido nem alterado.

O código/teste está em `208868b` (`fix: bound git batch stderr`) e foi enviado
para `origin/agent/publish-production-hardening`; esta evidência foi publicada
em `1685e63` (`docs: record bounded git batch stderr`). Secret manager/rotação,
provider/CI, RC/proveniência, runtime live, WebKit aprovado, clínica, `0/145`,
gates externos e reauditoria independente continuam abertos. B99-101 e o
programa permanecem `IN_PROGRESS / PILOT_BLOCKED`.

## Round 44 — B99-101 / incremental Git batch body consumption — 2026-08-20T20:55:39-03:00

B99-101 recebeu uma auditoria read-only fresca: o cap agregado do Round 43
limitava cada batch, mas `runGitBatch` ainda guardava todos os chunks e fazia
`Buffer.concat` da saída completa antes do parser. O RED adicionou contratos
para callback de chunks, header malformado e corpo truncado sem refletir bytes
não confiáveis em findings.

O GREEN passou a entregar stdout incrementalmente a um parser de framing que
retém somente o header e o corpo do objeto corrente, com limite individual de
`MAX_SCAN_BYTES`; objetos oversized são descartados durante o consumo, e
`missing/error`, identidade inesperada, delimiter ausente e truncamento
continuam fail-closed com evidência redigida. A fixture Git real sintética com
cinco blobs distintos de aproximadamente 1,8 MiB atravessou múltiplos chunks e
duas batches, preservando os cinco findings.

O foco passou `36/36`; a cobertura passou `205/1130/21` em
`95,02/90,95/95,31/95,71`, o scanner ficou em `774` linhas, o helper em `397`
linhas e `verify:hotspots` em `0` hotspots não classificados. Formato, lint,
typecheck e `git diff --check` passaram. O `pnpm verify` oficial passou
coverage, decisões críticas `7/7`, mutation `7/7`, scope drift, contratos
`86/86`, worker `51/51`, migrações `33/33` e migration safety; parou
fail-closed em `verify:secrets` somente nos quatro assignments redigidos
preexistentes de `infra/production/.env.local`, que não foi lido nem alterado.

O código/teste está em `11a6d10` (`fix: stream git history batch bodies`) e foi
enviado para `origin/agent/publish-production-hardening`; esta evidência foi
publicada em `0b393d5` (`docs: record incremental git batch parser`). O parser ainda
retém um único corpo bounded por vez para permitir o scan textual limitado;
isso não é uma alegação de ausência absoluta de buffers. Secret
manager/rotação, provider/CI, RC/proveniência, runtime live, WebKit aprovado,
clínica, `0/145`, gates externos e reauditoria independente continuam abertos.
B99-101 e o programa permanecem `IN_PROGRESS / PILOT_BLOCKED`.

## Round 43 — B99-101 / aggregate Git body batch bound — 2026-08-20T20:13:49-03:00

### Barra congelada

- impedir que muitos corpos históricos individualmente bounded formem um único
  buffer agregado sem limite, mantendo todos os findings e o fail-closed;
- particionar por orçamento de corpo, limitar stdout do subprocesso e não
  expor bytes quando o output exceder o cap;
- manter RED→GREEN, fixture Git descartável, ausência de segredo/dado real,
  formato/lint/typecheck/diff-check, cobertura, hotspots e governanças verdes.

### Auditoria fresca e RED → GREEN

Após Round 42, a auditoria read-only reproduziu que cinco blobs sintéticos de
2 MiB eram retornados por `planGitBatchRequests` em uma lista flat e enviados
para um único `runGitBatch`, cujo helper concatenava todos os chunks de stdout.
O RED adicionou o contrato de batches e do cap de subprocesso e falhou em
`2/33` testes.

O GREEN passou a agrupar corpos bounded em batches de até `8 MiB`, derivar um
limite de stdout por batch a partir dos tamanhos do `cat-file --batch-check` e
encerrar fail-closed quando o subprocesso excede o cap. A lógica foi extraída
para `scripts/secret-scanner-git-batch.mjs`, mantendo o scanner principal em
`774` linhas.

Uma fixture Git descartável com cinco blobs distintos de aproximadamente
1,8 MiB encontrou os cinco paths através de duas batches; o teste direto do
subprocesso confirmou rejeição acima do limite sem serializar o corpo.

### Evidência

- foco do scanner: `34/34`;
- cobertura integral: `205` arquivos, `1.128` testes passantes, `17` arquivos
  e `21` testes guardados, `95,02%` statements, `90,95%` branches, `95,31%`
  functions e `95,71%` lines;
- `scripts/secret-scanner.mjs` ficou em `774` linhas e o helper em `213`,
  `verify:hotspots` reportou `0` hotspots não classificados; formato, lint,
  typecheck e `git diff --check` passaram;
- o `pnpm verify` oficial passou todos os gates até `verify:migration-safety`
  e parou fail-closed em `verify:secrets` somente nos quatro assignments
  redigidos preexistentes de `infra/production/.env.local`; o arquivo não foi
  lido nem alterado;
- código/teste commitados em `b15f171` (`fix: bound git history batch memory`)
  e enviados para `origin/agent/publish-production-hardening`.
- pacote de evidências, estado, backlog, roadmap, log e rastreabilidade foi
  publicado em `1572192` (`docs: record bounded git history batches`) e enviado
  para o mesmo remoto.

### Limites / status / próxima ação

B99-101 permanece `IN_PROGRESS` porque os quatro valores reais exigem secret
manager/rotação/autorização. Esta evidência não prova streaming integral sem
buffers, provider, CI, RC imutável, runtime live, WebKit aprovado, clínica,
`0/145`, gates externos ou reauditoria independente. O programa permanece
`IN_PROGRESS / PILOT_BLOCKED`.

## Round 42 — B99-101 / oversized history body preflight — 2026-08-20T19:48:27-03:00

### Barra congelada

- impedir que o scanner solicite e concatene corpos históricos acima do limite
  antes de descartá-los, sem perder o scan textual limitado de assets e o
  fail-closed de conteúdo não-asset;
- validar strictamente os metadados `cat-file --batch-check`, não solicitar o
  corpo de asset oversized e manter `oversize-file` com metadados redigidos
  para não-assets;
- manter RED→GREEN, fixture Git descartável, ausência de segredo/dado real,
  formato/lint/typecheck/diff-check, cobertura, hotspots e governanças verdes.

### Auditoria fresca e RED → GREEN

Uma auditoria read-only identificou que `readGitBlobs` ainda requisitava todos
os objetos mapeados com `git cat-file --batch` e concatenava a saída inteira;
assim, um asset histórico oversized era materializado e só depois descartado.
O RED adicionou um plano sintético de requisições baseado em
`cat-file --batch-check` e falhou porque o planejador ainda não existia.

O GREEN adicionou `scripts/secret-scanner-git-batch.mjs`: o preflight valida
framing, identidade, tipo e tamanho, registra `oversize-file` somente para
paths não-asset e exclui corpos oversized da lista enviada ao batch de
conteúdo. `readGitBlobs` executa o preflight antes do batch corporal e mantém
o scan UTF-8 limitado sob `.png`; erro ou framing incompleto permanece
fail-closed sem expor bytes.

Uma fixture Git descartável com asset binário sintético acima de 2 MiB e texto
secret-shaped sob `text.png` confirmou `history:text.png` com os findings
esperados, sem finding ou corpo para o asset oversized.

### Evidência

- foco do scanner: `31/31`;
- cobertura integral: `205` arquivos, `1.125` testes passantes, `17` arquivos
  e `21` testes guardados, `95,02%` statements, `90,95%` branches, `95,31%`
  functions e `95,71%` lines;
- `scripts/secret-scanner.mjs` ficou em `785` linhas e o helper em `108`,
  `verify:hotspots` reportou `0` hotspots; formato, lint, typecheck e
  `git diff --check` passaram;
- o `pnpm verify` oficial passou todos os gates até `verify:migration-safety`
  e parou fail-closed em `verify:secrets` somente nos quatro assignments
  redigidos preexistentes de `infra/production/.env.local`; o arquivo não foi
  lido nem alterado;
- código/teste commitados em `69e5ff3` (`fix: preflight git history object
  sizes`) e enviados para `origin/agent/publish-production-hardening`.
- pacote de evidências, estado, backlog, roadmap, log e rastreabilidade foi
  publicado em `67b7b40` (`docs: record git history batch preflight`) e enviado
  para o mesmo remoto.

### Limites / status / próxima ação

B99-101 permanece `IN_PROGRESS` porque os quatro valores reais exigem secret
manager/rotação/autorização. Esta evidência não prova limite agregado de todos
os corpos bounded, provider, CI, RC imutável, runtime live, WebKit aprovado,
clínica, `0/145`, gates externos ou reauditoria independente. O programa
permanece `IN_PROGRESS / PILOT_BLOCKED`.

## Round 41 — B99-101 / binary-extension content bypass — 2026-08-20T19:25:00-03:00

### Barra congelada

- impedir que worktree, índice ou histórico descartem conteúdo textual
  secret-shaped somente porque o path termina em extensão de asset binário;
- provar cobertura das três superfícies com paths sintéticos `.png`, sem
  expor o valor, preservando a proteção para bytes binários/oversize de PDFs e
  demais assets e o fail-closed para binários fora dessa allowlist;
- manter RED→GREEN, conteúdo sintético, leitura sem produção, formato/lint/
  typecheck/diff-check, cobertura, hotspots e governanças verdes.

### Auditoria fresca e RED → GREEN

A auditoria read-only primeiro testou a hipótese de que detalhes de uma
resposta `error` válida de `git cat-file --batch` poderiam entrar em evidence.
O probe mostrou que o finding `git-object-unreadable` já redige a evidência e
não serializa o marcador sintético. Em seguida, uma fixture Git descartável
com conteúdo textual `client_secret` sob `worktree.png`, `staged.png` e
`history.png` reproduziu o bypass: `walk`, `git ls-files` e
`parseObjectList` descartavam os caminhos pela extensão.

O RED foi registrado no teste de integração e falhou com findings vazios. O
GREEN removeu o filtro de enumeração por extensão, reteve todos os paths e
introduziu uma fronteira de conteúdo: texto UTF-8 limitado em assets é
escaneado; bytes binários ou assets acima do limite não são tratados como
texto nem copiados para findings; caminhos não-asset mantêm
`binary-file`/`oversize-file` fail-closed. O teste também confirma que o
marcador presente em bytes binários não aparece na serialização.

### Evidência

- foco do scanner: `30/30`;
- cobertura integral: `205` arquivos, `1.124` testes passantes, `17` arquivos
  e `21` testes guardados, `95,02%` statements, `90,95%` branches, `95,31%`
  functions e `95,71%` lines;
- scanner em `776` linhas, `verify:hotspots` com `0` hotspots; lint,
  typecheck, Prettier, `git diff --check` e o foco de secrets passaram;
- `pnpm verify:secrets` percorreu o worktree/history sem reportar os PDFs
  históricos e falhou fail-closed somente nos quatro valores redigidos
  preexistentes de `infra/production/.env.local`; o arquivo não foi lido nem
  alterado;
- o `pnpm verify` oficial passou formatação, contratos CI, fontes clínicas,
  currículo, observabilidade/HA, Prometheus, traces, lint, typecheck, cobertura,
  decisões `7/7`, mutation `7/7`, scope drift, contratos `86/86`, worker `51/51`,
  migrations `33/33` e migration safety antes do mesmo bloqueio em
  `verify:secrets`;
- código/teste commitados em `de8cbdd` (`fix: scan text under binary asset
  paths`) e enviados para `origin/agent/publish-production-hardening`.

### Limites / status / próxima ação

B99-101 permanece `IN_PROGRESS` porque os quatro valores reais exigem secret
manager/rotação/autorização. Esta rodada não prova provider, CI, RC imutável,
runtime live, WebKit aprovado, clínica, `0/145`, gates externos ou reauditoria
independente. O programa permanece `IN_PROGRESS / PILOT_BLOCKED`.

## Round 40 — B99-101 / malformed cat-file header identity redaction — 2026-08-20T19:01:02-03:00

### Barra congelada

- impedir que o primeiro token não confiável de um header malformado com
  newline seja copiado para path, evidence ou resumo;
- provar que um header sintético com token `client_secret=...` produz
  `history:<git>` + `git-object-unreadable`, sem o marcador, preservando
  headers válidos e os casos já cobertos;
- manter RED→GREEN, conteúdo sintético, formato/lint/typecheck/diff-check,
  cobertura, hotspots e governanças verdes.

### RED → GREEN

Uma auditoria read-only enviou um header com newline, mas com primeiro token
malformado contendo marcador de corpo. O parser anterior usava esse token como
object ID lógico e o path do finding expunha o marcador. O RED falhou ao exigir
identidade estável. O GREEN aceita apenas path conhecido ou object ID de 40 hex
como identidade; qualquer outro header usa `history:<git>` e não expõe o token.

### Evidência

- foco do scanner: `29/29`;
- cobertura integral: `205` arquivos, `1.123` testes passantes, `17` arquivos
  e `21` testes guardados, `95,02%` statements, `90,95%` branches, `95,31%`
  functions e `95,71%` lines;
- scanner em `793` linhas, `verify:hotspots` com `0` hotspots; lint, typecheck,
  Prettier, audit, contratos `86/86`, worker `51/51`, migrações `33/33`,
  migration safety, decisões `7/7`, mutation `7/7` e `git diff --check`: PASS;
- `pnpm verify` percorreu todos os gates até `verify:secrets`, que falhou
  fail-closed somente nos quatro valores redigidos preexistentes de
  `infra/production/.env.local`; o arquivo não foi lido nem alterado;
- código/teste commitados em `87f759a` (`fix: redact malformed git header
  identities`) e enviados para `origin/agent/publish-production-hardening`;
  o teste prova que o marcador sintético não aparece nos findings.

### Limites / status / próxima ação

B99-101 permanece `IN_PROGRESS` porque os quatro valores reais exigem secret
manager/rotação/autorização. O pacote de evidências foi publicado em `9cc102a`
(`docs: record malformed git header identity redaction`) e enviado para
`origin/agent/publish-production-hardening`. Esta rodada não prova provider, CI,
RC imutável, runtime live, WebKit aprovado, clínica, `0/145`, gates externos
ou reauditoria independente. O programa permanece `IN_PROGRESS /
PILOT_BLOCKED`.

## Round 39 — B99-101 / truncated cat-file header redaction — 2026-08-20T18:50:39-03:00

### Barra congelada

- impedir que um header de `git cat-file --batch` sem newline copie bytes do
  buffer restante — inclusive corpo potencial — para path, evidence ou resumo;
- provar que o lote truncado produz `history:<git>` +
  `git-object-unreadable`, sem o marcador sintético, preservando headers
  válidos e os demais casos de framing malformado;
- manter RED→GREEN, conteúdo sintético, formato/lint/typecheck/diff-check,
  cobertura, hotspots e governanças verdes.

### RED → GREEN

Uma auditoria read-only construiu um header `blob` sem o newline final e
acrescentou um corpo sintético com marcador. O parser anterior tratava o
buffer inteiro como `objectId`, inserindo o marcador no path do finding. O RED
falhou ao exigir a ausência do marcador. O GREEN emite a identidade estável
`history:<git>` com `git-object-unreadable` e encerra o registro sem copiar ou
expor bytes do buffer.

### Evidência

- foco do scanner: `28/28`;
- cobertura integral: `205` arquivos, `1.122` testes passantes, `17` arquivos
  e `21` testes guardados, `95,02%` statements, `90,95%` branches, `95,31%`
  functions e `95,71%` lines;
- scanner em `791` linhas, `verify:hotspots` com `0` hotspots; lint, typecheck,
  Prettier, audit, contratos `86/86`, worker `51/51`, migrações `33/33`,
  migration safety, decisões `7/7`, mutation `7/7` e `git diff --check`: PASS;
- `pnpm verify` percorreu todos os gates até `verify:secrets`, que falhou
  fail-closed somente nos quatro valores redigidos preexistentes de
  `infra/production/.env.local`; o arquivo não foi lido nem alterado;
- código/teste commitados em `b528ff4` (`fix: redact truncated git headers`)
  e enviados para `origin/agent/publish-production-hardening`; o teste prova
  que o marcador sintético não aparece nos findings.

### Limites / status / próxima ação

B99-101 permanece `IN_PROGRESS` porque os quatro valores reais exigem secret
manager/rotação/autorização. O pacote de evidências foi publicado em `3520f85`
(`docs: record truncated git header redaction`) e enviado para
`origin/agent/publish-production-hardening`. Esta rodada não prova provider, CI,
RC imutável, runtime live, WebKit aprovado, clínica, `0/145`, gates externos
ou reauditoria independente. O programa permanece `IN_PROGRESS /
PILOT_BLOCKED`.

## Round 38 — B99-101 / cat-file response identity binding — 2026-08-20T18:36:22-03:00

### Barra congelada

- vincular cada resposta de `git cat-file --batch` a um object ID presente no
  mapa de objetos solicitado, antes de consumir ou escanear seu corpo;
- provar que uma resposta `blob` válida para um object ID inesperado emite
  `git-object-unreadable`, não expõe o corpo sintético e encerra o lote;
- manter respostas solicitadas válidas, framing estrutural e
  `missing/error`, sob RED→GREEN com formato/lint/typecheck/diff-check,
  cobertura, hotspots e governanças verdes.

### RED → GREEN

O RED criou um mapa contendo somente um object ID solicitado e uma resposta
`blob` sintética com outro ID de 40 hex, cujo corpo continha uma atribuição
sensível. A implementação anterior derivava `path` como `undefined` e seguia
sem finding, retornando scan limpo. O GREEN valida a identidade contra o mapa
antes de consumir o corpo, emite `git-object-unreadable` para
`history:<objectId>`, encerra o lote e não imprime o valor sintético.

### Evidência

- foco do scanner: `27/27`;
- cobertura integral: `205` arquivos, `1.121` testes passantes, `17` arquivos
  e `21` testes guardados, `95,02%` statements, `90,95%` branches, `95,31%`
  functions e `95,71%` lines;
- scanner em `798` linhas, `verify:hotspots` com `0` hotspots; lint, typecheck,
  Prettier, audit, contratos `86/86`, worker `51/51`, migrações `33/33`,
  migration safety, decisões `7/7`, mutation `7/7` e `git diff --check`: PASS;
- `pnpm verify` percorreu todos os gates até `verify:secrets`, que falhou
  fail-closed somente nos quatro valores redigidos preexistentes de
  `infra/production/.env.local`; o arquivo não foi lido nem alterado;
- código/teste commitados em `adc2b85` (`fix: reject unexpected git batch
  responses`) e enviados para `origin/agent/publish-production-hardening`;
  nenhum segredo, dado real, PDF, produção, score, release ou promoção de
  piloto foi tocado.

### Limites / status / próxima ação

B99-101 permanece `IN_PROGRESS` porque os quatro valores reais exigem secret
manager/rotação/autorização. O pacote de evidências foi publicado em `66cf8bb`
(`docs: record b99-101 cat-file response identity`) e enviado para
`origin/agent/publish-production-hardening`. Esta rodada não prova provider, CI,
RC imutável, runtime live, WebKit aprovado, clínica, `0/145`, gates externos
ou reauditoria independente. O programa permanece `IN_PROGRESS /
PILOT_BLOCKED`.

## Round 37 — B99-101 / rev-list path whitespace preservation — 2026-08-20T18:21:57-03:00

### Barra congelada

- preservar os bytes exatos do path emitido após o object ID por
  `git rev-list --objects --all`, sem aparar whitespace de borda; tratar apenas
  o marcador vazio de árvore como ausência de path de conteúdo;
- provar que um arquivo textual versionado como `secret.png ` não é
  reclassificado como `secret.png` binário ignorado e é encontrado no histórico,
  sem imprimir o valor;
- manter RED→GREEN, conteúdo sintético, leitura sem produção, formato/lint/
  typecheck/diff-check, cobertura, hotspots e governanças verdes.

### RED → GREEN

O RED criou um repositório Git sintético com `secret.png ` contendo uma
atribuição sensível, commitou o arquivo e o removeu do worktree. O `.trim()`
anterior convertia o path em `secret.png`, que entrava na lista de assets
binários ignorados, e o scan de histórico retornava `[]`. O GREEN preserva o
trecho exato após o separador do `rev-list`, mantendo a linha vazia de árvore
como marcador estrutural; o finding aparece como `history:secret.png ` sem
expor o valor sintético.

### Evidência

- foco do scanner: `26/26`;
- cobertura integral: `205` arquivos, `1.120` testes passantes, `17` arquivos
  e `21` testes guardados, `95,02%` statements, `90,95%` branches, `95,31%`
  functions e `95,71%` lines;
- scanner em `793` linhas, `verify:hotspots` com `0` hotspots; lint, typecheck,
  Prettier, audit, contratos `86/86`, worker `51/51`, migrações `33/33`,
  migration safety, decisões `7/7`, mutation `7/7` e `git diff --check`: PASS;
- `pnpm verify` percorreu todos os gates até `verify:secrets`, que falhou
  fail-closed somente nos quatro valores redigidos preexistentes de
  `infra/production/.env.local`; o arquivo não foi lido nem alterado;
- código/teste commitados em `53b96d8` (`fix: preserve git history path
  identity`), sem segredo, PDF, dado real, produção, score, release ou
  promoção de piloto.

### Limites / status / próxima ação

B99-101 permanece `IN_PROGRESS` porque os quatro valores reais exigem secret
manager/rotação/autorização. A evidência documental desta rodada foi publicada
em `1c2a68e` (`docs: record b99-101 rev-list path preservation`) e enviada para
`origin/agent/publish-production-hardening`. Esta rodada não prova provider, CI,
RC imutável, runtime live, WebKit aprovado, clínica, `0/145`, gates externos ou
reauditoria independente. O programa permanece `IN_PROGRESS / PILOT_BLOCKED`.

## Round 36 — B99-101 / cat-file batch header integrity — 2026-08-20T18:09:25-03:00

### Barra congelada

- validar o header estrutural de cada registro retornado por
  `git cat-file --batch` antes de consumir ou escanear o corpo;
- provar que object IDs inválidos, tamanhos não decimais e campos extras
  produzem `git-object-unreadable` sem escanear ou expor o corpo, enquanto
  `blob`/`tag`/`tree`/`commit` válidos e respostas `missing`/`error` permanecem
  compatíveis;
- manter RED→GREEN, bytes sintéticos, leitura sem produção, formato/lint/
  typecheck/diff-check, cobertura, hotspots e governanças verdes.

### RED → GREEN

O RED reproduziu que o parser aceitava um object ID que não era SHA-1 de 40
hex, um campo adicional e um tamanho com sinal `+`, e ainda escaneava o corpo
como blob válido. O GREEN exige ID estrutural, tipo permitido e tamanho decimal
para objetos de conteúdo/estrutura; `missing` e `error` mantêm suas formas de
resposta. Header inválido gera `git-object-unreadable`, encerra o lote antes do
corpo e não expõe o valor sintético. Os fixtures anteriores foram alinhados ao
framing real, com IDs de 40 hex.

### Evidência

- foco do scanner: `25/25`;
- cobertura integral: `205` arquivos, `1.119` testes passantes, `17` arquivos
  e `21` testes guardados, `95,02%` statements, `90,95%` branches, `95,31%`
  functions e `95,71%` lines;
- scanner em `793` linhas, `verify:hotspots` com `0` hotspots; lint, typecheck,
  Prettier, audit, contratos `86/86`, worker `51/51`, migrações `33/33`,
  migration safety, decisões `7/7`, mutation `7/7` e `git diff --check`: PASS;
- `pnpm verify` percorreu todos os gates até `verify:secrets`, que falhou
  fail-closed somente nos quatro valores redigidos preexistentes de
  `infra/production/.env.local`; o arquivo não foi lido nem alterado;
- código/teste commitados em `0b29af6` (`fix: validate git batch object
  headers`), sem segredo, PDF, dado real, produção, score, release ou
  promoção de piloto.

### Limites / status / próxima ação

B99-101 permanece `IN_PROGRESS` porque os quatro valores reais exigem secret
manager/rotação/autorização. A evidência documental desta rodada foi publicada
em `adfacbc` (`docs: record b99-101 cat-file header integrity`) e enviada para
`origin/agent/publish-production-hardening`. Esta rodada não prova provider, CI,
RC imutável, runtime live, WebKit aprovado, clínica, `0/145`, gates externos ou
reauditoria independente. O programa permanece `IN_PROGRESS / PILOT_BLOCKED`.

## Round 35 — B99-101 / staged path whitespace preservation — 2026-08-20T17:44:10-03:00

### Barra congelada

- preservar exatamente os bytes dos paths retornados por `git ls-files -z`,
  incluindo whitespace de borda, para que a identidade staged não seja
  confundida com outro path aparado;
- provar com índice Git sintético que um segredo em ` .env.local ` staged é
  detectado mesmo quando `.env.local` também existe, sem imprimir o valor;
- manter RED→GREEN, conteúdo sintético, leitura sem produção, formato/lint/
  typecheck/diff-check, cobertura, hotspots e governanças verdes.

### RED → GREEN

O RED criou um repositório Git sintético com ` .env.local ` contendo uma
atribuição sensível e `.env.local` contendo apenas um placeholder redigido. O
arquivo com whitespace foi staged e removido do worktree; o `.trim()` anterior
colidia as identidades e retornava `[]`. O GREEN preserva o path exato vindo de
`git ls-files -z`, consulta `git show :<path>` sem aparar os bytes e encontra o
finding como `staged: .env.local `, sem expor o valor sintético.

### Evidência

- foco do scanner: `23/23`;
- cobertura integral: `205` arquivos, `1.117` testes passantes, `17` arquivos
  e `21` testes guardados, `95,02%` statements, `90,95%` branches, `95,31%`
  functions e `95,71%` lines;
- scanner em `799` linhas, `verify:hotspots` com `0` hotspots; lint, typecheck,
  Prettier, audit, contratos `86/86`, worker `51/51`, migrações `33/33`,
  migration safety, decisões `7/7`, mutation `7/7` e `git diff --check`: PASS;
- `pnpm verify` percorreu todos os gates até `verify:secrets`, que falhou
  fail-closed somente nos quatro valores redigidos preexistentes de
  `infra/production/.env.local`; o arquivo não foi lido nem alterado;
- código/teste commitados em `4605371` (`fix: preserve exact staged scanner
  paths`), sem segredo, PDF, dado real, produção, score, release ou promoção
  de piloto.

### Limites / status / próxima ação

B99-101 permanece `IN_PROGRESS` porque os quatro valores reais exigem secret
manager/rotação/autorização. A evidência documental desta rodada foi publicada
em `5604793` (`docs: record b99-101 staged path preservation`) e enviada para
`origin/agent/publish-production-hardening`. Esta rodada não prova provider, CI,
RC imutável, runtime live, WebKit aprovado, clínica, `0/145`, gates externos ou
reauditoria independente. O programa permanece `IN_PROGRESS / PILOT_BLOCKED`.

## Round 34 — B99-101 / rev-list object-list framing fail-closed — 2026-08-20T17:33:16-03:00

### Barra congelada

- validar todas as linhas não vazias de `git rev-list --objects --all`,
  aceitando IDs bare de 40 hex para estrutura e IDs de 40 hex seguidos de path
  para objetos de conteúdo;
- provar que uma linha malformada produz `git-object-unreadable` sem ser
  silenciosamente ignorada, enquanto IDs estruturais, paths válidos e paths de
  assets binários ignorados permanecem inalterados;
- manter RED→GREEN, teste sintético, sem segredo/corpo real, formato/lint/
  typecheck/diff-check, cobertura, hotspots e governanças verdes.

### RED → GREEN

O RED adicionou um inventário sintético com ID estrutural bare, objeto com path,
asset binário ignorado e uma linha inválida; o parser antigo retornava um mapa
vazio para a linha inválida, permitindo falso PASS de histórico. O GREEN valida
cada registro, aceita a forma bare ou ID+path e lança erro para a forma inválida;
`scanProject` já converte a falha do histórico em `git-object-unreadable`.

### Evidência

- foco do scanner: `22/22`;
- cobertura integral: `205` arquivos, `1.116` testes passantes, `17` arquivos
  e `21` testes guardados, `95,02%` statements, `90,95%` branches, `95,31%`
  functions e `95,71%` lines;
- lint, typecheck, Prettier, audit, `verify:hotspots` (`0` hotspots), contratos
  `86/86`, worker `51/51`, migrações `33/33`, migration safety, decisões `7/7`,
  mutation `7/7` e `git diff --check`: PASS;
- `pnpm verify` passou todos os gates até `verify:secrets`, que falhou somente
  nos quatro valores redigidos preexistentes de
  `infra/production/.env.local`; o arquivo não foi lido nem alterado;
- código/teste commitados em `b2f2cc0` (`fix: fail closed on malformed git object
  lists`), sem segredo, PDF, dado real, produção, score, release ou piloto.

### Limites / status / próxima ação

B99-101 permanece `IN_PROGRESS` porque os quatro valores reais exigem secret
manager/rotação/autorização. A evidência documental desta rodada foi publicada
em `3b35169` (`docs: record b99-101 rev-list framing`) e enviada para
`origin/agent/publish-production-hardening`; RC/proveniência, runtime live,
WebKit aprovado, clínica, `0/145`, gates externos e reauditoria independente
continuam abertos. O programa permanece `IN_PROGRESS / PILOT_BLOCKED`.

## Round 33 — B99-101 / blob-tag batch framing fail-closed — 2026-08-20T17:20:12-03:00

### Barra congelada

- tratar `blob`/`tag` do framing `git cat-file --batch` como registros de
  conteúdo somente quando o corpo declarado estiver completo e terminar com o
  delimitador `\n` exigido;
- provar que corpos sintéticos completos sem delimitador produzem
  `git-object-unreadable`, não são escaneados nem expostos, e que objetos
  válidos continuam sendo processados;
- manter RED→GREEN, teste sintético, sem segredo/corpo real, formato/lint/
  typecheck/diff-check, cobertura, hotspots e governanças verdes.

### RED → GREEN

O RED adicionou casos para `blob` e `tag` com corpo sintético contendo uma
atribuição sensível, tamanho declarado correto e sem o newline final. O parser
anterior escaneava o corpo e retornava somente `sensitive-assignment`, um falso
resultado de conteúdo válido. O GREEN exige corpo completo e delimitador,
emite `git-object-unreadable`, encerra o lote inválido sem escanear o corpo e
preserva o processamento de registros delimitados.

### Evidência

- foco do scanner: `21/21`;
- cobertura integral: `205` arquivos, `1.115` testes passantes, `17` arquivos
  e `21` testes guardados, `95,02%` statements, `90,95%` branches, `95,31%`
  functions e `95,71%` lines;
- lint, typecheck, Prettier, audit, `verify:hotspots` (`0` hotspots), contratos
  `86/86`, worker `51/51`, migrações `33/33`, migration safety, decisões `7/7`,
  mutation `7/7` e `git diff --check`: PASS;
- `pnpm verify` passou todos os gates até `verify:secrets`, que falhou somente
  nos quatro valores redigidos preexistentes de
  `infra/production/.env.local`; o arquivo não foi lido nem alterado;
- código/teste commitados em `1adef42` (`fix: reject unterminated git objects`),
  sem segredo, PDF, dado real, produção, score, release ou piloto.

### Limites / status / próxima ação

B99-101 permanece `IN_PROGRESS` porque os quatro valores reais exigem secret
manager/rotação/autorização. A evidência documental desta rodada foi publicada
em `b114236` (`docs: record b99-101 batch framing`) e enviada para
`origin/agent/publish-production-hardening`; RC/proveniência, runtime live,
WebKit aprovado, clínica, `0/145`, gates externos e reauditoria independente
continuam abertos. O programa permanece `IN_PROGRESS / PILOT_BLOCKED`.

## Round 32 — B99-101 / workspace symlink fail-closed hardening — 2026-08-20T17:07:01-03:00

### Barra congelada

- tratar symlinks do worktree como entradas explícitas sem segui-los ou ler
  fora da raiz escaneada;
- provar que um symlink para arquivo sensível produz `unreadable-file`, não
  expõe o alvo e não altera o comportamento de arquivos normais ou do scan de
  index/history;
- manter RED→GREEN, teste sintético, sem segredo/corpo real, formato/lint/
  typecheck/diff-check, cobertura, hotspots e governanças verdes.

### RED → GREEN

O RED criou uma raiz sintética com `linked.env` apontando para um `.env` fora da
raiz; o scanner antigo retornou `[]` porque ignorava symlinks. O GREEN enumera
links, usa `lstat` e retorna `unreadable-file` sem seguir o alvo. O teste também
confirma que o finding não contém o valor sensível. A redução de comentários
preservou a política de hotspots e deixou o scanner com `799` linhas.

### Evidência

- foco do scanner: `19/19`;
- cobertura integral: `205` arquivos, `1.113` testes passantes, `17` arquivos
  e `21` testes guardados, `95,02%` statements, `90,95%` branches, `95,31%`
  functions e `95,71%` lines;
- lint, typecheck, Prettier, audit, `verify:hotspots` (`0` hotspots) e
  `git diff --check`: PASS;
- `pnpm verify` passou todos os gates até `verify:secrets`, que falhou somente
  nos quatro valores redigidos preexistentes de `infra/production/.env.local`;
  o arquivo não foi lido nem alterado;
- código/teste commitados em `2bf5a45` (`fix: fail closed on workspace
  symlinks`), sem segredo, PDF, dado real, produção, score, release ou piloto.

### Limites / status / próxima ação

B99-101 permanece `IN_PROGRESS` porque os quatro valores reais exigem secret
manager/rotação/autorização. A evidência documental desta rodada foi publicada
em `c43034b` (`docs: record b99-101 symlink hardening`) e enviada para
`origin/agent/publish-production-hardening`; RC/proveniência, runtime live,
WebKit aprovado, clínica, `0/145`, gates externos e reauditoria independente
continuam abertos. O programa permanece `IN_PROGRESS / PILOT_BLOCKED`.

## Round 31 — B99-101 / Git history parser fail-closed hardening — 2026-08-20T16:49:21-03:00

### Barra congelada

- endurecer o parser de histórico alcançável do scanner de segredos sem mudar
  a política de fixtures sintéticas, os quatro achados reais de `.env.local`
  ou o contrato de rotação/secret manager;
- provar que headers não numéricos e corpos `tree`/`commit` truncados ou sem
  delimitador não são silenciosamente ignorados, enquanto objetos válidos e
  blobs/tags continuam com o comportamento anterior;
- manter RED→GREEN, teste sintético focal, sem saída de segredo/corpo,
  formato/lint/typecheck/diff-check, cobertura e governanças verdes.

### RED → GREEN

O RED adicionou uma matriz sintética para header `tree` sem tamanho numérico,
corpo `commit` menor que o declarado e corpo `tree` sem o delimitador final. O
teste reproduziu `[]`, evidenciando falso PASS para histórico ilegível. O GREEN
valida `Number.isSafeInteger`, tamanho não negativo, corpo completo e newline
do protocolo `git cat-file --batch`; em qualquer violação registra
`git-object-unreadable` e encerra o lote inválido fail-closed. O fixture de
objetos válidos foi alinhado ao framing real do protocolo.

### Evidência

- foco do scanner: `18/18`;
- cobertura integral: `205` arquivos, `1.112` testes passantes, `17` arquivos
  e `21` testes guardados, `95,02%` statements, `90,95%` branches, `95,31%`
  functions e `95,71%` lines;
- lint, typecheck, Prettier, audit de dependências, hotspots (`0`) e
  `git diff --check`: PASS;
- `pnpm verify` passou todos os gates até `verify:secrets`, que falhou
  fail-closed somente nos quatro valores redigidos preexistentes de
  `infra/production/.env.local`; o arquivo não foi lido nem alterado;
- código/teste commitados em `16a4f82` (`fix: harden git history secret
  scanning`), sem segredo, PDF, dado real, produção, score, release ou
  promoção de piloto.

### Limites / status / próxima ação

B99-101 permanece `IN_PROGRESS` porque os quatro valores reais exigem
secret manager/rotação/autorização. Esta rodada não prova provider, CI, RC
imutável, runtime live, WebKit aprovado, clínica, `0/145`, gates externos ou
reauditoria independente. A evidência documental desta rodada foi publicada
em `73ae862` (`docs: record b99-101 parser hardening`) e enviada para
`origin/agent/publish-production-hardening`. O programa permanece
`IN_PROGRESS / PILOT_BLOCKED`.

## Round 30 — B99-102 / clinical-source downloader hardening — 2026-08-20T16:21:01-03:00

### RED → GREEN

- RED adicionou uma matriz adversarial sintética para endpoint HTTP, endpoint
  com credenciais/query/path, bucket/prefixo com traversal, destino dentro do
  repositório, SigV4, redirect, timeout antes e depois dos headers, limite de
  `Content-Length` e streaming, symlink, SHA mismatch e gravação parcial;
- GREEN tornou o downloader fail-closed: endpoint HTTPS origin-only, bucket
  DNS-compatible, prefixo relativo, `redirect: "error"`, AbortController com
  timeout cobrindo fetch e pipeline, limite configurável por arquivo com
  padrão de `2 GiB`, streaming para temp `0600`, hash antes de `rename` atômico
  e rejeição de symlink no destino e em ancestrais;
- a superfície foi extraída em helpers pequenos para manter a coesão da
  fronteira de credenciais, sem alterar os três códigos/SHA-256 canônicos nem
  o resolver clínico existente.

### VERIFICAÇÃO

- RED focal reproduziu as lacunas de contrato do downloader; GREEN passou
  `20/20` testes de `tests/integration/clinical-source-downloader.test.ts`;
- regressão de localização clínica passou `5/5`; cobertura ampla passou
  `205` arquivos, `1.111` testes passantes, `17` arquivos e `21` testes
  guardados, em `95,02%` statements, `90,95%` branches, `95,31%` functions e
  `95,71%` lines;
- build dos `12/12` workspaces, arquitetura `2/2`, scope drift, migration
  safety (`33` migrações sem destrutividade), CI contract, fontes clínicas,
  lint, typecheck, Prettier, `verify:hotspots` (`0` hotspots) e
  `git diff --check`: PASS;
- execução da CLI sem ambiente falhou fechado em variável obrigatória, sem
  iniciar rede ou escrever destino; a governança de fontes passou com os três
  PDFs já presentes no ambiente local, sem materializar ou copiar qualquer
  fonte nesta rodada;
- código/teste foram commitados em `7b06233`
  (`fix: harden clinical source downloader`); a documentação desta rodada foi
  publicada em `45b8141` (`docs: record b99-102 downloader hardening`) e
  enviada para `origin/agent/publish-production-hardening`;
- a execução final de `pnpm verify` passou todos os gates locais até parar em
  `verify:secrets` pelos quatro valores já redigidos de
  `infra/production/.env.local`, sem ler ou alterar o arquivo.

### LIMITES / STATUS / NEXT

B99-102 fica `IN_PROGRESS`: os testes usam apenas bytes sintéticos e não
  provam acesso ao bucket privado, licença, secret manager, CI, provider,
  runtime HA/API/DB, RC/SHA, WebKit aprovado, clínica, `0/145`, gates externos
  ou reauditoria. Não houve segredo, PDF, dado real, produção, score, release
  ou promoção de piloto. O programa permanece `IN_PROGRESS / PILOT_BLOCKED`.

## Gaps que permanecem abertos

- `pnpm verify:secrets` acusa quatro entradas reais de
  `infra/production/.env.local`; o arquivo não foi alterado nem seus valores
  expostos. A resolução exige secret manager/rotação/autorização de ambiente.
- a barra técnica local `95/90/95/95` foi atingida nesta medição e a janela
  local de skips/flakiness passou `20/20`; mutation crítica, browser/HA ativos,
  API/DB live e os gates de release ainda não foram comprovados.
- A mutation direcionada dos sete caminhos críticos passou `7/7`; mutation
  integral de todo o sistema e os gates de release ainda não foram comprovados.
- `0/145` cadeias completas, `763` decisões clínicas, B-07, revisão manual
  WCAG, WebKit/mobile ativo, CI/registry, IdP/TLS, backup/DR, soak/failover,
  SBOM/attestation, RC imutável, duas reauditorias e go/no-go humano não foram
  inventados nem fechados.
- o E2E acima é sintético/Chromium; o E2E contra API/DB real e a operação HA
  exigem ambiente live autorizado.

## Crítica independente

A crítica read-only compatível concluiu `REJECT` com alta confiança. Ela
confirmou que as baselines permanecem `83,24/64,20`, que `C1–C8` e `RH01–RH06`
estão `OPEN`, que a rastreabilidade está em `0/145`, que o secret scan falha
por quatro entradas redigidas do `.env.local`, que o runtime ativo usa SHA
antigo e que TLS/IdP/RC/HA/clinical/DR/UAT/reauditorias permanecem sem prova.
O resultado independente não alterou arquivos, thresholds, score ou release.

## Verificação composta final — 2026-08-20T01:06:45-03:00

`pnpm verify` percorreu formato, CI contract, fontes clínicas, inventário,
observabilidade, configuração HA, lint, typecheck, cobertura (`197/974/21`,
`90,42/85,38/93,65/91,78`), decisões críticas `7/7`, scope drift, contratos
`82/82`, worker `31/31` e migrações `32/32`. O comando parou, como deve, em
`verify:secrets` com quatro achados redigidos do `.env.local`; não houve
supressão, rotação ou alteração do arquivo.

A reconciliação final às `01:09:45-03:00` repetiu formato, lint, typecheck,
documentação, gate Dual99, decisões críticas e `git diff --check` com PASS.
