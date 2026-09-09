# CVG — checkpoint de continuidade para reset de sessão

- checkpoint_id: `2026-09-06-frontend-visual-round11`
- recorded_at: `2026-09-06T20:22:13-0300`
- repository: `/home/ricardo/cvg-trainee-vet`
- status: `IN_PROGRESS`
- execution_mode: `BUILD / GAUNTLET LOOP / ORCHESTRATE / RUNTIME CONTROLLER`

## Objetivo preservado

Continuar a melhoria bounded do frontend do CVG com acabamento sofisticado,
layout customizado, movimento, textura, efeitos e validação real. A solicitação
original não está concluída e este checkpoint não autoriza declarar AAA, “perfeito”,
produção, publicação clínica ou competência.

## Último ponto confirmado

- Round 11 visual bounded concluído localmente para `/operations`, `/authoring` e
  `/recovery`; o item `UI-VIS-001` continua `IN_PROGRESS`.
- `tests/e2e/visual-gauntlet.spec.ts`: `11/11` PASS em 1440/768/390.
- `tests/e2e/authoring-review.spec.ts`: `5/5` PASS.
- Web `typecheck` e `build`: PASS; `verify:traceability`,
  `verify:documentation` e `git diff --check`: PASS no registro Round 11.
- Asset visual preservado:
  `apps/web/public/assets/cvg-orbit-render-v2.png`, SHA256
  `ffc30f974ac2ab070c6bf0ee7a138965e971e2323ff3dcf00be8aef1fc968271`.
- Evidência principal: `.agent/artifacts/ui-visual-round11-final.md`.
- O estado operacional atual do repositório também registra `AAA-701` como
  fatia local ativa: integrar o parecer do crítico fresh `Euler`, tratar P0/P1/P2
  se houver, atualizar a evidência e só então rebaselinear o Gauntlet.

## MCPs e runtime

- Blender MCP: saudável; cena `CVG_Visual_Asset`, workspace `Layout`, EEVEE,
  câmera `CVG_V2_Camera`, coleção `CVG_Orbital_Asset_V2` com 17 objetos. A cena
  é sintética/efêmera; não há `.blend` persistido no repositório. Não parar o
  processo ao resetar a sessão.
- ComfyUI MCP: saudável em `http://127.0.0.1:8188`, local, sem workflow pago
  executado nesta fatia. Preservar o processo.
- OpenDesign MCP: `Transport closed`; não houve mutação, execução, exportação ou
  resultado OpenDesign utilizável como evidência.

## Fingerprint do checkpoint

O helper oficial do Gauntlet capturou um snapshot somente leitura com
`--include-state` em `2026-09-06T23:21:47Z`:

- repository head: `3490203038b52425a83e05989d47f1391de2949e`
- repository+state digest: `76224d427adcf9bcbf7e7284c33664430d5dfeee665eaa7d9aa7acff8329117e`
- arquivo temporário da captura: `/tmp/cvg-gauntlet-checkpoint-fingerprint-2026-09-06.json`
- SHA256 do arquivo temporário: `bdfa2184daa824927aac0b9771adc7d383caba13814ed61a7e964045f874bb31`

O arquivo em `/tmp` é apenas auxiliar e pode não sobreviver ao reset. Depois de
retomar, gerar um novo fingerprint fora do repositório e reconciliar o estado
com o helper oficial; não editar `.gauntlet/state.json` manualmente. O estado
`.gauntlet` existente estava stale/current round 7 no momento desta captura.

## Próxima ação exata após o reset

1. Ler `AGENTS.md`, `docs/99_runtime_state.md`,
   `docs/20_master_execution_log.md`, `docs/30_backlog_master.md` e este
   checkpoint.
2. Conferir `git status --short` e verificar os runtimes Blender/ComfyUI; não
   assumir que o OpenDesign voltou sem uma leitura MCP bem-sucedida.
3. Verificar o status real do crítico `Euler`/da fatia `AAA-701`, atualizar a
   evidência se necessário e executar o rebaseline controlado do Gauntlet somente
   após a crítica e os documentos estarem coerentes.
4. Ao retomar o frontend, tratar como uma nova rodada bounded o maior gap
   visual registrado pelo scout: a leitura linear de `/operations` no mobile e a
   ausência dos renders canônicos `home-*`/`diagnostic-*`. Antes de editar,
   congelar o escopo e registrar RED; preservar contratos, conteúdo clínico,
   autorização server-side e alterações concorrentes.
5. Fazer GREEN/REFACTOR, rodar testes proporcionais, obter crítica fresh,
   atualizar estado/log/backlog/traceabilidade e só então escolher a próxima
   fatia.

## Guardrails para a próxima sessão

- Não marcar `COMPLETED` nem encerrar o objetivo global.
- Não parar Blender ou ComfyUI; não inventar resultado OpenDesign.
- Não iniciar `AAA-203`/`AAA-204` sem contrato ou decisão de produto.
- Manter `AAA-001` e `CVG_TEST_DATABASE_URL` como dependências dos gates live.
- Não executar produção, deploy, publicação clínica, workflow remoto ou uso de
  dados reais sem autorização explícita e ambiente adequado.
- Preservar o worktree sujo e alterações concorrentes; editar arquivos locais com
  `apply_patch` e revisar o diff antes de qualquer conclusão.

## Arquivos de continuidade

- Estado: `docs/99_runtime_state.md`
- Log: `docs/20_master_execution_log.md`
- Backlog: `docs/30_backlog_master.md`
- Manifesto: `traceability.yml`
- Plano visual: `.agent/plans/2026-09-06-frontend-visual-gauntlet.md`
- Evidência Round 11: `.agent/artifacts/ui-visual-round11-final.md`
