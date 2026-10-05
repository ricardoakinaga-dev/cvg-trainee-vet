# Parecer independente — hold clínico e fronteira HTTP

- Data: 2026-10-02.
- Revisor fresh: Raman (`01a0fac6-e810-7f53-9eb4-266537602da5`).
- Veredito recebido: REVISE; um P1 e um P2.
- Escopo: solicitação de ajustes por moderador, exposição da projeção editorial,
  preflight persistido e caminho de publicação/materialização.
- Método: revisão estática independente; sem runtime ou publicação.

## Achados e disposição

1. **P1 — a resposta de `SOLICITAR_AJUSTES` retornava a projeção interna
   completa.** Um `MODERATOR`/`ADMIN` sem `VIEW_INTERNAL_SOURCE` recebia
   `sourceRefs`, gabarito e rubrica. A rota agora retorna apenas recibo com
   identificadores, estado, decisão, justificativa, horário e correlation ID.
   Teste HTTP verifica a ausência dos campos editoriais internos.
2. **P2 — o hold clínico dependia de `current.publicationReady` fornecido pelo
   chamador.** O adaptador de persistência agora força o preflight bloqueado ao
   criar rascunho, salvar preflight e gravar revisão/transição. O gate de
   publicação exige o hold inativo e checks de prontidão explícitos; a
   materialização também verifica o hold e a gravação direta de `PUBLICADO`
   falha enquanto H-CONTENT estiver ativo.

## Evidência posterior às correções

- Cinco arquivos unitários editoriais: 65/65 PASS em Node 22.23.2.
- Suíte de cobertura completa executou todos os testes: 1459 PASS e 68
  skipped; o processo terminou em exit 1 somente pelos pisos globais de
  cobertura agora aplicados às páginas TSX (registro em
  `remediation-verification-20261002.md`).
- `pnpm typecheck` e o E2E sintético de autoria 5/5 PASS.
- `H-CONTENT` permanece ativo; nenhuma publicação foi feita.

Uma nova revisão fresh das correções e da cadeia do manifesto está registrada
como pendente até o parecer integrado seguinte.

## Parecer independente integrado — 2026-10-02

- Revisor: Fermat (`01a0fae7-9e3d-7bb0-8835-064fca1014a7`), leitura estática
  read-only.
- Veredito inicial: `REVISE`, sem P0/P1 e com um P2 no uso standalone de
  `release-evidence --check --strict`. A chamada podia aceitar ID de run
  escolhido por argumento e verificava formato/digest declarado sem recomputar
  o resumo contra manifesto, relatórios e fechamentos. `verify-evidence-consistency`
  também deixava o resumo ser a própria origem do ID quando o ambiente não
  fornecia `CVG_MUTATION_CANDIDATE_ID`.
- Correção: strict bundle validation agora lê o run ID apenas do ambiente do
  workflow, rejeita sua ausência, e chama `validateCurrentMutationSummary` com
  run ID e HEAD esperados. A opção de ID manual saiu do caminho CLI. A
  consistência de evidência exige `requireExpectedRunId`; fixture sintético só
  dispensa a cadeia dentro do modo de fixture do Triple AAA, que permanece
  marcado como sintético.
- Revalidação: as cinco integrações de manifesto/harness/release/Triple AAA
  passaram 63/63 em Node 22.23.2; a persistência editorial passou 26/26;
  typecheck, Prettier, CI contract, release evidence self-test, traceability,
  documentation gate, sintaxe e `git diff --check` passaram.
- O revisor foi solicitado a confirmar especificamente o fechamento deste P2;
  a revalidação retornou `PASS`: o P2 está fechado nos caminhos strict do
  release, Triple AAA e evidence consistency; nenhum P0/P1/P2 restante foi
  encontrado no escopo revisado.
- TDD do P2: ao remover temporariamente a reconstrução da cadeia, o teste novo
  falhou em RED (1 falha/7 skips; faltou a rejeição de proveniência current).
  Com a validação restaurada, o teste passou em GREEN (1/1).
- Limite residual observado pelo crítico: o diretório da árvore candidata
  não é incluído nos artifacts enviados; a cadeia é recalculável durante o
  mesmo job, enquanto a recomputação pós-job precisa reconstruir a árvore pelo
  SHA e não pode reutilizar o caminho temporário gravado no manifesto.
