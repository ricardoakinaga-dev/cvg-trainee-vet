# CVG Trainee Vet — Plano Executivo Premium / State of the Art / Triplo AAA

**Revisão:** 2026-09-06
**Versão:** AAA-PLAN v1.0
**Status:** `IN_PROGRESS` — execução técnica local bounded autorizada; metas
operacionais, produção, publicação clínica e piloto continuam sob G0 humano
**Produto:** Sistema CVG de Treinamento Veterinário
**Fonte de verdade do produto:** `BRIEFING/09.PROJETO_CVG_TREINAMENTO`
**Roadmap operacional:** [0301_roadmap.md](0301_roadmap.md)
**Backlog executável:** [0302_backlog_master.md](0302_backlog_master.md)

## 1. Decisão executiva

O CVG deve evoluir para uma plataforma premium de desenvolvimento clínico
digital contínuo, com confiança clínica, rigor de engenharia, experiência
superior e operação observável. “State of the Art” e “Triplo AAA” são a barra
interna de qualidade deste programa; não são uma certificação externa nem
autorizam, por si só, uso clínico, piloto ou declaração de competência prática.

O caminho aprovado por este plano é incremental:

1. eliminar defeitos de integridade, autorização e rastreabilidade;
2. provar uma jornada vertical real do navegador ao PostgreSQL;
3. fechar autoria, revisão clínica e conteúdo aprovado;
4. elevar experiência, aprendizagem adaptativa e governança;
5. demonstrar operação, recuperação, segurança e release reproduzível;
6. executar piloto controlado somente após os gates humanos e operacionais.

Não está autorizado neste plano: rewrite, microserviços sem dor observada,
dados clínicos reais no repositório, uso de IA para decidir estado/nota/
publicação/competência, deploy produtivo, contratação de fornecedor ou claim
de competência prática.

## 2. O que significa Triplo AAA

### A — Assurance clínico-pedagógico

O programa ensina e mede progressão digital com conteúdo autoral, revisão
humana, avaliação determinística e métricas de aprendizagem. O sistema nunca
converte atividade digital em competência prática automaticamente.

### A — Assurance de engenharia e segurança

O sistema preserva estado transacional no PostgreSQL, aplica autorização
server-side deny-by-default, usa RLS como defesa adicional, mantém contratos
strict, testa invariantes críticas e possui recuperação verificável.

### A — Assurance de experiência e operação

O participante encontra fluxos claros, acessíveis e responsivos; a equipe
encontra autoria e operação auditáveis; incidentes são detectáveis,
diagnosticáveis, recuperáveis e mensuráveis.

## 3. Baseline factual

O baseline não é uma promessa de release:

- HEAD auditado: `3490203038b52425a83e05989d47f1391de2949e`;
- `main` alinhado ao tracking local de `origin/main`; durante esta rodada
  apareceram alterações externas ao escopo em `.gitignore`,
  `apps/web/app/globals.css` e `apps/web/public/`, preservadas sem integração
  ao plano;
- monorepo com API, web, worker e pacotes de domínio, aplicação, contratos,
  persistência, integrações, observabilidade e UI;
- 54 migrations no worktree atual, com `0051_diagnostic_sessions` como base da
  jornada e as correções forward-only `0052`/`0053` sob validação;
- `pnpm verify` local passou com 800 testes PASS, 42 SKIPPED e cobertura global
  de 84,45% statements, 80,18% branches, 87,30% functions e 85,19% lines;
- build dos 12 workspaces passou;
- E2E sintético final passou 43/43 após a revalidação visual; o baseline anterior
  havia passado 39/39 no build visual isolado; após o gate local de
  `AAA-106`, o E2E focado de operations/authoring em `next start` passou 11/11;
  o Round 6 repetiu a regressão completa em `39/39` e a suíte visual em `6/6`;
  o proxy server-side foi implementado com teste focal `11/11`, foco de
  autorização `12/12` e a revalidação pós-proxy repetiu `41/41` com upstream
  local que exige cookie, incluindo o rail visual e o stress de 195px;
- contratos passaram 95/95, worker 37/37 e migrations 54/54;
- `pnpm test:integration:live` foi tentado e encerrou exit 2 por ausência de
  `CVG_TEST_DATABASE_URL`;
- não há evidência atual suficiente de banco live autorizado, E2E real da
  jornada diagnóstica completa, workflow remoto same-SHA, operação produtiva,
  failover, carga, collector/retention ou gate clínico.

Delta da execução atual: `AAA-101`–`AAA-106` receberam implementação local
bounded com testes focais; `0052` agora preserva a leitura de respostas de
sessões finalizadas, attempts/answers usam lock por chave e conflitos CAS
nomeados, os limites de rotação foram restaurados nos contratos, a cascata de
contraste do cartão de privacidade foi corrigida, o shell interno de operations
e authoring passou a aguardar autorização server-side e o proxy passou a
proteger as rotas antes do render. A evidência live PostgreSQL/RLS, E2E real,
workflow remoto same-SHA e auditoria independente continuam necessários. A
crítica fresh curta do Round 7 retornou `PASS` sem severidade e a regressão
visual do Round 8 foi corrigida; a próxima ação é formalizar as rodadas e,
enquanto `AAA-001` e o banco autorizado não chegam, executar a fatia local
`AAA-200/201` foram então congelados no contrato
`0561_aaa_vertical_journey_contract.md`; uma crítica independente encontrou um
P1 de projeção/proveniência, corrigido em RED/GREEN, com focal pós-correção
`25/25` e foco ampliado `108/108`. A releitura posterior retornou `REVISE` e
não foi registrada como PASS. A regra determinística, replay, CAS, proveniência
e projeção sem internals estão fechados localmente com gaps. `AAA-205` também foi consolidado no contrato
`0562_aaa_recovery_resilience_contract.md`, cobrindo os estados e retries já
existentes sem duplicar a autoridade da API. A próxima prova de jornada é
`AAA-202`, que só pode usar PostgreSQL/RLS live em ambiente autorizado; sem
isso, `AAA-203` ou `AAA-204` são as próximas fatias locais possíveis.

Nota de referência do estado atual: **61/100 no programa geral** e
**78/100 na construção técnica local**. Conteúdo clínico, piloto e competência
prática permanecem em **0/100 de prontidão comprovada**.

## 4. Alvos mensuráveis da barra AAA

Os alvos abaixo são propostos para aprovação de Ricardo antes da execução.
Enquanto não aprovados, são `PROPOSED`, não evidência nem requisito publicado.

| Código | Alvo de qualidade | Evidência mínima de aceite |
| --- | --- | --- |
| AAA-Q01 | Zero P0/P1 de segurança, integridade ou clínica abertos | auditoria independente e reexecução atual |
| AAA-Q02 | Cobertura global ≥80% e cobertura de decisão completa nas invariantes críticas | coverage + matriz de decisões |
| AAA-Q03 | Cada jornada crítica comprovada no boundary correto | browser/API/PostgreSQL/RLS quando aplicável |
| AAA-Q04 | Nenhum dado, fonte, gabarito ou campo interno atravessa a fronteira pública | exposure scan + testes negativos + revisão manual |
| AAA-Q05 | WCAG 2.2 AA nos fluxos críticos | axe, teclado, foco, contraste e revisão manual |
| AAA-Q06 | Build reproduzível no mesmo SHA | CI remoto, artefatos, SBOM e traceability |
| AAA-Q07 | SLOs, alertas, logs redigidos, métricas e traces operacionais | ambiente descartável/controle operacional autorizado |
| AAA-Q08 | Backup, restore, rollback e recuperação exercitados | runbook executado com RPO/RTO registrados |
| AAA-Q09 | 100% do conteúdo publicado aprovado pelo fluxo clínico definido | revisão item a item e decisão humana registrada |
| AAA-Q10 | IA/Qdrant derivados, limitados, desligáveis e nunca decisórios | evals de exposição, injection, groundedness e fallback |
| AAA-Q11 | Piloto mede aprendizagem digital sem declarar competência prática | protocolo, autoridade, métricas e auditoria |

Metas de disponibilidade, latência, RPO/RTO, volume de participantes e
cadência de revisão devem ser calibradas em `AAA-001`; não serão inventadas no
código nem assumidas a partir de defaults.

## 5. Frentes executivas

| Frente | Resultado de negócio | Resultado técnico |
| --- | --- | --- |
| F0 — Governança | decisões e evidências confiáveis | control plane sincronizado e quality bar aprovado |
| F1 — Trust core | ninguém altera estado fora da política | RLS, constraints, idempotência, sessões e auditoria provados |
| F2 — Jornada | participante sabe o próximo passo | diagnóstico → assignment → atividade → feedback real |
| F3 — Conteúdo | conteúdo autoral confiável | autoria, revisão, versionamento, publicação e retirada |
| F4 — Pessoas | facilitador/coordenação enxergam o necessário | UX por papel, privacidade e analytics agregados |
| F5 — Aprendizagem | prática adaptativa explicável | mastery digital, retrieval, remediação e retenção |
| F6 — Plataforma | operar sem improviso | observabilidade, CI, performance, DR, rollback e runbooks |
| F7 — IA segura | acelerar autoria sem perder controle | adapters, evals, Qdrant reconstruível e human-in-the-loop |
| F8 — Piloto | aprender com risco controlado | readiness, baseline, piloto, auditoria e decisão de expansão |

## 6. Gates executivos

| Gate | Libera | Não libera |
| --- | --- | --- |
| G0 — Plano aprovado | execução de `AAA-100` em diante | deploy ou publicação clínica |
| G1 — Trust core | jornada técnica real | conteúdo clínico publicado |
| G2 — Jornada vertical | validação de produto em ambiente autorizado | claim de competência |
| G3 — Conteúdo clínico | publicação interna do conteúdo aprovado | uso autônomo de IA |
| G4 — Release readiness | piloto controlado | produção aberta |
| G5 — Pilot exit | decisão de manter, corrigir ou expandir | certificação clínica automática |
| G6 — AAA audit | declaração interna de barra atingida | qualquer claim não sustentado por evidência |

Um gate falha quando existe gap P0/P1, evidência ausente, dado não governado,
defeito de autorização, conteúdo sem revisão ou divergência no control plane.

## 7. Critical path

```text
AAA-000/001
  → AAA-100..107 (integridade, segurança e estado)
  → AAA-200..205 (jornada vertical real)
  → AAA-300..305 (autoria e conteúdo clínico)
  → AAA-600..607 (operação e release)
  → AAA-800..805 (piloto e auditoria AAA)
```

As frentes UX, aprendizagem e IA podem avançar em paralelo somente quando
seus contratos dependentes estiverem congelados e não houver colisão com
migrations, contratos públicos ou control plane.

## 8. Limites humanos e de segurança

- Ricardo aprova a barra de qualidade, as metas operacionais e o escopo do
  piloto.
- Ricardo revisa protocolos e conteúdo clínico antes da publicação.
- Ambiente produtivo, secrets, grants/owners, provider/MFA, workflow remoto e
  participantes reais exigem autoridade específica e não são presumidos.
- Fixtures, seeds, testes, logs e UI usam apenas dados sintéticos e conteúdo
  interno permitido.
- Uma decisão humana não transforma um teste sintético em evidência produtiva.

## 9. Definition of Done do programa

O programa só pode ser declarado AAA quando:

1. todos os P0/P1 críticos estão `COMPLETED` com evidência corrente;
2. G0–G6 possuem decisão e artefato verificáveis;
3. as jornadas críticas passaram no boundary real correspondente;
4. conteúdo clínico foi revisado e publicado pelo fluxo autorizado;
5. segurança, privacidade, acessibilidade, observabilidade e recuperação
   possuem provas atuais;
6. state, log, backlog, roadmap, traceability e auditorias apontam para o
   mesmo estado;
7. um auditor independente consegue reproduzir o veredito sem depender desta
   conversa.

A rodada técnica corrente foi registrada como `REVISE`; a evidência visual
permanece bounded e ainda exige crítica independente same-SHA. O próximo passo
de controle é Ricardo revisar `AAA-001`: barra AAA, metas operacionais e
autoridade de ambientes, além de disponibilizar `CVG_TEST_DATABASE_URL` em
ambiente descartável autorizado. Sem isso continuam proibidos live autorizado,
deploy, produção, publicação clínica, participantes reais e piloto.
