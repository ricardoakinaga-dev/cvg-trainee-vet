# 0496 — Pré-voo técnico do runtime curricular

**Data:** 2026-08-10, America/Sao_Paulo  
**Escopo:** item 3 do `0491`, grade V3, banco B-07, questões, testes, remediação, domínio digital, retenção, projeção pública e seed.  
**Estado:** `PASS_WITH_GAPS` — gate técnico executado; gate clínico e publicação continuam pendentes.

## 1. Base de desenho

O runtime foi derivado do catálogo V3, da matriz interna de literatura e da pesquisa mundial registrada em [0495](0495_pesquisa_praticas_mundiais_treinamento_hospitalar.md). A matriz clínica usa como referências internas F-01 (*Tratado de Medicina Interna de Cães e Gatos*, Jericó/Kogika/Andrade Neto), F-02 (*Ettinger’s Textbook of Veterinary Internal Medicine*, 9ª edição) e F-03 (*Cirurgia de Pequenos Animais*, 4ª edição, Theresa Welch Fossum), além de diretrizes atuais para temas dinâmicos.

As referências orientam objetivos, segurança, desenho de casos e revisão. Nenhum trecho de obra, PDF, foto, prontuário, tutor, caso real ou dado identificável foi copiado para a projeção, seed, teste ou interface. Todo item clínico ainda depende de redação autoral, revisão e aprovação de Ricardo antes de publicação.

## 2. Materialização da grade

| Camada | Materialização | Estado |
|---|---:|---|
| Catálogo | 24 módulos, 96 sessões e aproximadamente 149 horas | construído |
| Packs regulares | 24 packs versionados; M02 com 31 questões + 2 abertas; módulos regulares com blueprint de 31 questões + 2 abertas, e M12/M24 com 31 + 3 | técnico, sem publicação |
| B-07 | 120 itens, 40 em B07-S1, 40 em B07-S2 e 40 em B07-S3 | blueprint + draft técnico |
| Instrumentos | recuperação ativa, caso progressivo, simulação digital, debriefing e retenção | construído como loop |
| Retenção | D+7, D+30 e D+90 com forma equivalente | construído |
| Domínio | 70% geral, 80% em objetivo crítico, erro crítico direcionado ao objetivo afetado | construído no runtime educacional e integrado no recorte digital |
| Prática | não declarada como competência; `PROIBIDO_MVP` | limite preservado |

Os packs não-M02 são drafts autorais parametrizados pelos objetivos e sessões do catálogo. Eles fornecem a estrutura, os campos avaliáveis e a sequência pedagógica para acelerar a autoria; não são conteúdo clínico aprovado e não devem ser usados em coorte ou rotina hospitalar antes da revisão humana.

## 3. Runtime entregue

`packages/curriculum/src/learning-runtime.ts` agora materializa:

- `b07DiagnosticDraftPack`, com 120 itens internos e preflight próprio;
- `evaluateDiagnosticAttempt`, que calcula perfil por tema, recomenda módulos e não produz nota global, aprovação ou reprovação;
- `evaluateModuleAttempt`, separando modo formativo objetivo de conclusão com resposta aberta aguardando correção humana;
- domínio digital, objetivo crítico, erro crítico, remediação somente do objetivo afetado e retenção em três janelas;
- `buildPersonalizedCurriculumPath`, com estados disponível, pré-requisito bloqueado, remediação, retenção pendente e concluído;
- `preflightCurriculumDrafts`, verificando contagem do blueprint, campos mínimos, gabarito/rubrica, fronteira pública e bloqueio de publicação.

O fluxo não transforma resultado digital em autorização de procedimento, nível de supervisão, autonomia ou competência psicomotora. Respostas abertas não recebem nota automática inventada: ficam em `AGUARDA_CORRECAO_HUMANA`.

A integração vertical do estado digital foi materializada depois do preflight puro: `curriculum_runtime_states` persiste a avaliação por participante, escopo e módulo com versionamento; o caso de uso da aplicação valida a entrada e grava o resultado; a API expõe leitura pública segura e avaliação interna com autorização `MODERATE_CONTENT`; a web consome apenas a projeção permitida. O diagnóstico B-07 continua interno/formativo e não é publicado como atividade de participante nesta etapa.

## 4. Fronteira pública e seed

`toParticipantActivityFromDraft` e `toParticipantActivityFromDiagnosticDraft` publicam somente título, enunciado, alternativas e modo de seleção. Fontes, localizadores, gabaritos, rubricas, criticidade, blueprint e metadados de autoria ficam internos.

`createCurriculumContentSeed`, `createDiagnosticContentSeed` e `createM02ContentSeed` produzem atividade e versões em `RASCUNHO` nesta etapa. Nenhum seed desta camada promove atividade ou conteúdo para `PUBLICADO`; a promoção futura exige o workflow editorial, revisão clínica, aprovação humana e transição autorizada.

## 5. Evidência TDD executada

| Verificação | Resultado |
|---|---|
| `pnpm vitest run packages/curriculum/src/learning-runtime.test.ts tests/integration/curriculum-catalog.test.ts` | **15 testes passaram** |
| `pnpm --filter @cvg/curriculum typecheck` | **PASS** |
| `pnpm verify` | **PASS**; 58 arquivos passaram, 9 foram ignorados; 258 testes passaram, 9 foram ignorados; cobertura 85,95% statements, 81,02% branches, 86,89% functions e 86,80% lines |
| `pnpm build` | **PASS** nos 12 workspaces executáveis |
| `pnpm test:e2e` | **PASS** em 5 cenários Chromium sintéticos; o quinto verifica estado de runtime e ausência de campos internos |
| `CVG_RUN_LIVE_DB_TESTS=true ... pnpm test:integration` | **PASS** em 17 testes, 1 skip de configuração; inclui persistência/versionamento do runtime e migração 0009 |
| testes de aplicação/persistência/API/contratos | **PASS**; casos de uso, repositório, contratos, projeções públicas e rotas de leitura/avaliação cobertos |
| `pnpm db:migrate` | **PASS**; migração `0009_nappy_nightcrawler.sql` aplicada ao PostgreSQL local do CVG |
| `pnpm lint`, `pnpm format:check`, gates documentais e `git diff --check` | **PASS** |
| pré-voo de 24 packs + B-07 | **PASS** técnico; publicação clínica `PENDENTE` |
| casos de segurança | módulos desconhecidos, item duplicado, escolha desconhecida, HTML e resposta aberta sem correção automática rejeitados |

## 6. Gaps que permanecem

1. M03–M24 ainda precisam de autoria clínica específica, revisão de divergências e aprovação; templates parametrizados não substituem conteúdo validado.
2. O diagnóstico B-07 tem estrutura e 120 posições, mas ainda precisa de redação clínica autoral, gabarito revisado e ensaio com respostas sintéticas.
3. A integração persistida/API/web do runtime está coberta no recorte digital, mas ainda falta RLS contextual, E2E navegador→API real e a jornada completa de prova, contestação, dashboards e aplicação longitudinal.
4. Não há autorização para aplicar a grade ao hospital, medir transferência real ou afirmar melhora de capacidade clínica.

Por esses gaps, o item 3 alcança **95/100 no score técnico/documental**, mas continua ativo no gate clínico. O próximo incremento deve produzir/revisar o banco autoral, executar o pré-voo de M02/B-07, fechar RLS/E2E real quando aplicável e registrar a revisão de Ricardo sem publicar automaticamente.
