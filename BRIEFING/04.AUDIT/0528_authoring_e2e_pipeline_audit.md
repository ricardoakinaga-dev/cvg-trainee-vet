# Auditoria AUTHORING-E2E-PIPELINE-001 — fixture autoral no E2E real

**Data:** 2026-08-24

**Escopo:** fixture sintética de teste, publicação editorial, materialização de
atividade e jornada participante navegador → web → API → PostgreSQL.

**Classificação:** IMPLEMENTADO LOCALMENTE COM EVIDÊNCIA DE CÓDIGO; E2E REAL
PENDENTE POR AMBIENTE.

**Não é:** aprovação clínica, publicação de B-07/M02, prova de competência
prática, evidência de produção ou execução do workflow remoto.

## 1. Gap que motivou a fatia

O fixture anterior inseria `learning_activities`,
`learning_activity_items` e `content_versions` diretamente como publicados.
Isso exercitava a jornada participante, mas não demonstrava que uma atividade
consumida no E2E nasceu do pipeline autoral. O contrato do teste agora exige a
origem interna `authoring-publication-v1` e um slug materializado
`authoring-<hash>`.

## 2. Implementação

- `scripts/real-e2e-fixture-server.mjs` cria somente registros sintéticos de
  conta, convite, versão editorial em `EM_REVISAO_CLINICA` e
  `content_editorial_records`;
- a revisão usa `reviewAuthoringContent` com autor e revisor sintéticos
  distintos, seguida de `VERIFICAR_PROJECAO`, `AUTORIZAR_PUBLICACAO` e
  `PUBLICAR` por `advanceContent`;
- a atividade e o item são descobertos após a materialização por
  `scopeId + moduleId + sessionId`; não há `insert` direto de atividade ou item
  no fixture;
- a atribuição participante é criada somente depois da atividade publicada e
  do item materializado serem conferidos;
- o cleanup remove tentativa, idempotência, sessão, convite, atribuição,
  projeção, outbox, revisão, editorial, versão e contas sintéticas, inclusive
  quando o seed falha parcialmente;
- `tests/e2e/real-runtime.spec.ts` verifica a proveniência do fixture antes de
  iniciar a navegação e mantém as asserções de boundary público.

## 3. TDD e verificações executadas

- RED definido no contrato E2E: o fixture anterior não possuía `source` nem
  `activitySlug` de publicação autoral e criava a atividade diretamente;
- GREEN estrutural: `node --check`, Prettier, ESLint e `tsc -b` passaram;
- imports compilados de `@cvg/application` e `@cvg/persistence` expõem todas as
  funções usadas pelo fixture;
- suíte unitária sob Node `22.22.0`: 117 arquivos, 572 testes aprovados;
- Playwright com `CVG_RUN_REAL_E2E=true`: os dois cenários reais foram
  descobertos;
- `git diff --check` passou.

## 4. Evidência ainda ausente

O E2E real não foi executado nesta sessão. Não havia
`CVG_TEST_DATABASE_URL` nem `CVG_REAL_E2E_DATABASE_URL`; o PostgreSQL local
aceitava conexão apenas com um banco/schema de outro sistema, que não foi
alterado. O `pnpm` também não está disponível no `PATH`; o runtime Node 22
descartável foi usado apenas para validar a suíte unitária e não substitui o
workflow oficial.

Portanto, permanecem sem observação atual:

- seed editorial → materializador → assignment em PostgreSQL com RLS;
- navegador → web → API consumindo a atividade materializada;
- cleanup após tentativa persistida;
- execução no mesmo SHA pelo workflow remoto e artefatos de release.

## 5. Segurança e limites

Todos os textos, IDs, e-mails e referências são sintéticos e internos ao
fixture. O revisor recebe capability clínica somente no caso de teste; isso
não autoriza conteúdo clínico real nem altera o gate humano de publicação. IA,
Qdrant, gabarito e fontes externas não participam da criação da atividade
participante.

O slice fica `COMPLETED_WITH_GAPS` no backlog. A próxima ação é executar o
workflow/E2E em banco descartável autorizado, com Node/pnpm do contrato, e
registrar o resultado sem converter ausência de execução em PASS.
