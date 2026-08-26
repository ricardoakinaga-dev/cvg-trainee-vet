# Auditoria E2E real browser → web → API → PostgreSQL

**Data:** 2026-08-26
**Escopo:** extensão executável de `LIVE-056`
**Commit verificado:** `16caccc82ffc519b60a68e1a02850d40909737e1`
**Decisão:** `CONDITIONAL PASS / COMPLETED_WITH_GAPS`
**Release:** não autorizado

## 1. Objetivo

Provar, em um ambiente local descartável e somente com dados sintéticos, que o
navegador atravessa a aplicação web, o proxy Next, a API real e o PostgreSQL
real para aceitar um convite, consumir uma atividade publicada, iniciar uma
tentativa, salvar uma resposta e submetê-la. A prova também deve observar o
estado após uma nova sessão de navegador, consultar a persistência por uma
conexão administrativa separada e limpar somente os artefatos criados pela
fixture.

O resultado não representa produção, piloto, aprovação clínica, competência
prática, disponibilidade de Qdrant/IA ou evidência de que o diagnóstico
formativo já deriva o assignment no produto.

## 2. Ambiente e reprodutibilidade

- Código: commit `16caccc82ffc519b60a68e1a02850d40909737e1`.
- Comando executado: `CVG_RUN_REAL_E2E=true npm exec --yes
  --package=node@22.22.0 --package=pnpm@10.33.0 -- pnpm test:e2e
  --workers=1`.
- O wrapper executou o build dos 12 workspaces e a suíte Playwright em modo
  serial, com `chromium`.
- Banco: `cvg_gauntlet_20260826`, PostgreSQL `16.15`, migrations `51/51`
  aplicadas no banco descartável usado pela rodada live.
- API: `127.0.0.1:3101`; web/proxy: `127.0.0.1:3100`; fixture loopback:
  `127.0.0.1:3102`.
- A API usou role app sintética sem `SUPERUSER`/`BYPASSRLS`/`CREATEROLE`; o
  fixture/oracle usou uma conexão administrativa de teste separada. Nenhuma
  credencial foi registrada neste documento.
- `QDRANT_ENABLED=false` e `AI_ENABLED=false` foram flags explícitas da
  rodada; essas integrações não participam da decisão educacional.
- Não foram usados pacientes, tutores, prontuários, fotos, PDFs, fontes de
  terceiros ou dados clínicos reais.

## 3. O que foi observado

O cenário `real-runtime` contém dois testes reais; os outros 32 testes da
suíte completa são cenários sintéticos de contrato/UI. O resultado final foi
`34 passed (26,7s)`, com XML `test-results/playwright.xml` em
`tests="34" failures="0" skipped="0" errors="0"` e
`test-results/.last-run.json` com `status="passed"`.

### 3.1 Health e proxy

O navegador requisitou `GET /health/dependencies` pela origem web
`127.0.0.1:3100`. A resposta observada foi HTTP 200, envelope de sucesso com
`status: READY`, `postgres: UP`, `qdrant: DISABLED` e `ai: DISABLED`; a UI
renderizou o marcador operacional sem expor senha, chave, URL PostgreSQL ou
campos internos.

### 3.2 Participante e atividade

O fixture criou conteúdo editorial sintético e executou, pelos casos de uso de
authoring, revisão, verificação da projeção, autorização clínica sintética e
publicação. A atividade foi então materializada a partir da versão publicada;
o navegador confirmou o item exato pelo `itemId` e a projeção não continha
`sourceRefs`, `rubric` ou `participantText`.

O assignment curricular e o vínculo de atividade foram pré-provisionados pela
conexão administrativa para tornar explícita a pré-condição consumida pelo
participante. Isso cobre o consumo de um assignment válido, mas não cobre o
fluxo de produto diagnóstico → assignment nem a autorização/RLS do papel que
criaria esse assignment; essa limitação permanece em `JOURNEY-056`.

### 3.3 Tentativa e persistência

O teste registrou, pela origem web, método, rota, status e `x-request-id` UUID
de cada resposta, exigindo que `meta.request_id` correspondesse ao header:

| Chamada | Resultado observado |
| --- | --- |
| `POST /api/v1/invitations/accept` | `200`, sessão ativa |
| `GET /api/v1/learning-path` | `200`, atividade `DISPONIVEL` |
| `GET /api/v1/activities/:activityId` | `200`, item sintético exato |
| `POST /api/v1/attempts` | `201`, `EM_ANDAMENTO`, versão 1 |
| `POST /api/v1/attempts/:attemptId/answers` | `200`, `SALVA`, versão 2 |
| `POST /api/v1/attempts/:attemptId/submit` | `200`, `SUBMETIDA`, versão 3 |

Depois da submissão, um novo contexto Playwright recebeu somente os cookies da
sessão, abriu a web novamente e consultou `GET /api/v1/learning-path`. A
atividade voltou com o mesmo `attemptId`, status `SUBMETIDA` e versão 3.

Antes do cleanup, o endpoint de evidência do fixture consultou PostgreSQL pela
conexão administrativa separada e confirmou, para o `attemptId` observado:

- tentativa do participante/atividade correta em `SUBMETIDA`, versão mínima 3
  e `submitted_at` preenchido;
- exatamente uma resposta para o `itemId` publicado e para o texto sintético
  esperado;
- duas chaves de idempotência da tentativa (início/replay) e uma da resposta;
- eventos outbox `answer.saved.v1` e `attempt.submitted.v1`;
- auditoria com `ATTEMPT_STARTED`, `ANSWER_SAVED` e `ATTEMPT_SUBMITTED`.

## 4. Cleanup e integridade da evidência

O fixture expõe `/shutdown` somente em loopback. O teste chama esse endpoint
explicitamente; o processo só responde `cleaned: true` depois de verificar que
contas, convite/sessão, learning assignment, activity assignment, tentativa,
resposta, idempotências, itens, atividade, decisões editoriais, registro,
versão de conteúdo e outbox do fixture foram removidos. Entradas de auditoria
não são apagadas, respeitando o trigger append-only.

Após a execução no SHA acima, uma consulta PostgreSQL independente ao banco
confirmou zero registros restantes para os marcadores sintéticos de contas,
atividade, assignments, registro editorial e tentativa; o arquivo
`/tmp/cvg-real-e2e-fixture.json` estava ausente e não havia processo residual
de fixture, API ou Next.

## 5. Correções de qualidade encontradas no loop

O loop encontrou e corrigiu problemas do próprio harness: heading ambíguo,
label divergente, ausência da FK de `learning_assignment`, preenchimento
apagado por re-render assíncrono após iniciar a tentativa, cleanup que tentava
remover auditoria append-only, ausência de shutdown explícito e ausência de
oracle de cleanup. O teste agora aguarda a confirmação visual de início,
confirma o valor do campo controlado, valida cada resposta HTTP, usa o item
exato, consulta persistência e deixa a auditoria imutável.

## 6. Gaps remanescentes e conclusão

O caminho local browser → web/proxy → API → PostgreSQL está observado e passa
no recorte acima. Isso não fecha:

1. assignment produzido pelo fluxo diagnóstico real, cenário negativo
   browser cross-scope e matriz completa de autorização no navegador;
2. ACL/owners/grants least privilege produtivos, deployment e workflow remoto
   same-SHA;
3. carga, concorrência em escala, múltiplas réplicas, failover, restore,
   collector, retenção e traces distribuídos;
4. provider/MFA/entrega externa, teste de usuário e operação produtiva;
5. autoria e aprovação clínica de B-07/M02, piloto, publicação clínica ou
   qualquer claim de competência prática.

Portanto, `LIVE-056` recebe evidência adicional local e sintética em
`COMPLETED_WITH_GAPS`. A próxima fatia continua bloqueada pela decisão humana
de `JOURNEY-056` entre sessão diagnóstica pública própria (recomendada) e
atividade especial; nenhum release é autorizado.
