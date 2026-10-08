# Decisões de destravamento — rodada de prontidão de 2026-10-07

- Responsável: Ricardo; respostas explícitas recebidas nesta sessão.
- Registro: 2026-10-08T01:31:15Z (relógio UTC do executor).
- Base: HEAD `07532c2c949477489ed5c63362abd7ec97d1f5ad`, quatro commits locais
  anteriores e worktree PROD-IMPL-20261007.

## Git e H-REMOTE — AUTORIZADOS

Resposta: **“Autorizo tudo”** à pergunta que descreveu commit revisado em `main`,
push dos quatro commits anteriores mais a rodada, execução de `quality` e
`security` e, somente após ambos verdes no mesmo SHA, `release` com publicação
das quatro imagens no GHCR. Os dois primeiros workflows são disparados por push;
`release` é manual. Registrar URLs, SHA e conclusões reais, sem inferir sucesso.
O deploy na VPS é uma etapa posterior.

## AAA-001 — D1–D7 APROVADOS COM ATUALIZAÇÕES

Resposta: **“Aprovo pacote atualizado”**.

| Decisão | Valor aprovado |
|---|---|
| D1 | AAA-Q01–Q11 como barra interna; manter pisos atuais 90/85/90/90 e demais gates, sem reduzir para 80% |
| D2 | API p95 <1,5 s; web LCP <2,5 s; disponibilidade mensal 99,5% em horário comercial; 5xx <1%; estouro abre incidente P1 e congela piloto |
| D3 | RPO ≤1 h / RTO ≤4 h (RNF-015/D-107); medição real antes do piloto; a proposta histórica de 24 h não foi aceita |
| D4 | Até 50 participantes, 5 escopos, 3 autores concorrentes; carga sintética 3× (150 sessões), novo dimensionamento acima disso |
| D5 | Uma coorte, M02 + B-07 formativos, oito semanas, digital; aborto por P0, exposição de dado/gabarito, perda de integridade ou sinal clínico imprevisto |
| D6 | CI/homologação sintéticos, segredos fora do Git, papéis migration/app/admin separados; produção mantém gates e owners/grants dedicados |
| D7 | CI do candidato atual em `main` → revisão clínica → homologação/readiness → piloto após gates; substitui a branch antiga proposta em setembro |

A resposta encerra a pendência de decisão AAA-001, mas não comprova SLO,
recuperação, conteúdo clínico, readiness ou autorização de início do piloto.
Agenda/horário comercial, coorte nominal e segundo contato de alertas precisam
ser definidos antes do piloto. Produção aberta e claim de competência prática
continuam fora do aceite.

## REM-06 — BOUNDARY APROVADO

Resposta: **“Aprovo boundary proposto”**. Manter `activityId`/`idempotencyKey`
públicos; carregar modalidade, versões aprovadas e congeladas, itens, histórico
e elegibilidade de fontes internas persistidas server-side. Preservar o fluxo
formativo; negar somativo sem contexto obrigatório. Autoriza detalhar PRD/SPEC
das fontes e contratos, não declarar a somativa nativa concluída. Ver
`2026-10-02-rem06-summative-eligibility.md`.

## H-CONTENT — REVISÃO ABERTA, APROVAÇÃO PENDENTE

Resposta: **“Iniciar M02 depois B-07”**. Pacote interno aberto em
`docs/clinical/review-m02-b07-2026-10-08.md`. Ricardo revisará os itens por versão.
O catálogo e o hold de publicação permanecem fechados até a aprovação clínica
específica, registrada no fluxo autorizado.

## Homologação — VPS DEDICADA

Resposta literal: **“vou usar uma vps dedicada”**. Esta é a topologia escolhida;
DigitalOcean não foi selecionada. Provedor, região, máquina, capacidade, DNS,
acesso administrativo, destino de backup externo e canal de alertas ainda não
foram informados. Checklist de entrada em
`docs/operations/homologation-vps.md`. Não há contratação nem acesso remoto à
VPS nesta decisão.
