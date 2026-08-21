# Evidência Dual99 — B99-101 — fronteiras Git e arquivos especiais

**Data:** 2026-08-21 10:24 -03:00
**Task:** B99-101 — scanner de segredos fail-closed
**IDs:** `DUAL99-B99-101-SYNTHETIC-CREDENTIAL-URI-292`,
`DUAL99-B99-101-STAGED-PATH-FRAMING-294`,
`DUAL99-B99-101-GIT-BATCH-IDENTITY-296`,
`DUAL99-B99-101-WORKSPACE-SPECIAL-FILE-298`,
`DUAL99-B99-101-STAGED-EMPTY-RECORD-302`
**Branch:** `agent/publish-production-hardening`

## Gaps reproduzidos

Cinco auditorias locais sucessivas encontraram bypasses de superfície no
scanner:

- a isenção de URI sintética aceitava sufixos arbitrários e também precisava
  permanecer segura quando o scanner percorria a própria fonte e o histórico;
- a listagem staged em formato NUL aceitava uma resposta sem o NUL terminal;
- o planner e o parser Git aceitavam a identidade válida `A,A` para uma
  requisição `A,B`, omitindo silenciosamente um objeto;
- o walker ignorava FIFO/socket e a abertura direta de um arquivo especial
  podia bloquear.
- o parser staged filtrava registros vazios, aceitando NUL isolado ou
  consecutivo como se fossem uma lista válida de caminhos.

Todos os casos usaram nomes, valores e repositórios temporários sintéticos.
Nenhum segredo real, prontuário, fonte clínica, PDF ou ambiente de produção foi
incluído.

## RED → GREEN → REFACTOR

- **URI sintética:** testes de sufixo em query, fragmento, caminho e porta
  falharam antes da correção. A comparação passou a exigir o valor completo;
  a fonte do scanner foi montada por fragmentos e o histórico antigo recebeu
  somente uma allowlist exata por caminho.
- **Stream staged:** o parser agora aceita apenas stream vazio ou stream não
  vazio terminado pelo NUL esperado. O scanner usa uma injeção de Git somente
  no teste para provar que resposta truncada é rejeitada antes de consumir
  caminhos.
- **Identidade Git:** planner e parser mantêm conjuntos de IDs vistos,
  rejeitam ID inesperado ou duplicado e descartam qualquer plano parcial antes
  de solicitar corpos. O parser também não reprocessa o corpo duplicado.
- **Arquivos especiais:** `lstat` exige arquivo regular antes da leitura; o
  walker encaminha entries não regulares para o finding redigido
  `unreadable-file`; as aberturas de arquivos são não bloqueantes e validam o
  tipo do descriptor para cobrir a janela de troca após `lstat`.
- **Registros staged vazios:** o RED aceitou `\0` e `safe.env\0\0`; o GREEN
  preserva o stream vazio como caso válido, mas rejeita registros vazios antes
  de consumir a superfície staged.

## Commits de código/teste

- `4fdf2b5` — URI sintética limitada ao fixture completo;
- `650b169` — histórico do scanner mantido bounded;
- `fb19a43` — saída antecipada de Git normalizada sem expor erro de pipe;
- `25233b6` — stream staged truncado rejeitado;
- `dfbb01c` — identidade bijetiva no batch Git;
- `7c70686` — arquivo especial do workspace fail-closed;
- `084e2d0` — descriptor regular e abertura não bloqueante.
- `5790ce8` — registros staged vazios rejeitados fail-closed.

## Verificação final local

- foco do scanner: `74/74` passantes;
- suíte com cobertura: `205` arquivos passantes, `17` guardados, `1170`
  testes passantes e `21` guardados;
- cobertura: `95,03%` statements, `90,95%` branches, `95,31%` functions e
  `95,73%` lines;
- `pnpm format:check`: PASS;
- `pnpm lint`: PASS;
- `pnpm typecheck`: PASS;
- `pnpm verify:hotspots`: PASS, `0` hotspots, scanner em `793` linhas;
- `CVG_API_INTERNAL_URL=http://127.0.0.1:4000 pnpm build`: PASS, `12/12`;
- `git diff --check`: PASS;
- `pnpm verify:secrets`: permanece fail-closed somente nos quatro assignments
  redigidos preexistentes de `infra/production/.env.local`; nenhum finding novo
  apareceu e o arquivo não foi lido nem alterado;
- publicação do código/teste: `5790ce8` enviado a
  `origin/agent/publish-production-hardening`, com `HEAD == origin` confirmado;
  a reconciliação documental desta evidência foi feita em seguida.

## Crítica, limites e decisão

A crítica read-only em `25233b6` foi independente o suficiente para reproduzir
os dois gaps `HIGH` de identidade Git e arquivo especial; ambos foram corrigidos
e cobertos. A tentativa de crítica final no `084e2d0` excedeu a janela temporal
mesmo após interrupção e foi encerrada sem emitir um veredito. Portanto esta
rodada não possui um `PASS` independente final e não pode ser tratada como
prova global de perfeição.

Secret manager/rotação, provider/CI, RC e proveniência, WebKit aprovado,
runtime/HA/API/DB live, rollout N/N-1, retenção/RBAC/notificação externos,
clínica, `0/145`, gates externos, aprovação humana e reauditoria independente
continuam abertos. O programa permanece `IN_PROGRESS / PILOT_BLOCKED`; não há
promoção de score, release, piloto ou decisão clínica.

**Rollback:** reverter, em ordem inversa, `084e2d0`, `7c70686`, `dfbb01c`,
`25233b6`, `fb19a43`, `650b169` e `4fdf2b5` somente mediante decisão registrada;
preservar os testes de regressão até a mudança de contrato ser aprovada.
